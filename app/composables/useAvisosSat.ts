// ============================================================================
// app/composables/useAvisosSat.ts
// Composable principal de integración con Supabase y lógica de negocio para Avisos SAT / UIF
// ============================================================================

import { ref, unref, type MaybeRef } from 'vue';
import { useSupabaseClient } from '#imports';
import type {
  AvisoSatItem,
  KpisAvisosSatPeriodo,
  DictamenAvisoSat,
  DatosAvisoNotariaXml,
  DatosOperacionAvisoXml,
} from '~/types/avisosSat';
import { useAvisosSatCalculos } from '~/composables/useAvisosSatCalculos';
import {
  generarXmlAvisoIndividual,
  generarXmlPaqueteConsolidado,
  generarXmlInformeCeros,
  descargarArchivoXmlEnNavegador,
} from '~/utils/xmlGeneradorAvisosSat';
import {
  imprimirCedulaAvisoSat,
  type DatosCedulaAvisoSat,
} from '~/utils/pdfCedulaAvisoSat';

export function useAvisosSat(escrituraIdParam?: MaybeRef<string | undefined>) {
  const supabase = useSupabaseClient();
  const { evaluarObligacionAviso, calcularFechaLimiteSat } = useAvisosSatCalculos();

  const avisoActual = ref<AvisoSatItem | null>(null);
  const dictamenActual = ref<DictamenAvisoSat | null>(null);
  const avisosPeriodo = ref<AvisoSatItem[]>([]);
  const kpisPeriodo = ref<KpisAvisosSatPeriodo | null>(null);
  const cargando = ref(false);
  const guardando = ref(false);
  const error = ref<string | null>(null);

  const notariaDefecto: DatosAvisoNotariaXml = {
    claveSujetoObligado: 'FED-09-0042',
    rfcNotario: 'MER750812AB1',
    numeroNotaria: '42',
    entidadFederativa: '09',
    nombreNotario: 'Lic. Roberto Méndez',
  };

  /**
   * Carga el aviso SAT y dictamina la obligación para una escritura específica
   */
  async function cargarAvisoEscritura(idParam?: string): Promise<AvisoSatItem | null> {
    const id = idParam || unref(escrituraIdParam);
    if (!id) return null;

    cargando.value = true;
    error.value = null;

    try {
      // 1. Consultar si ya existe un registro de aviso en avisos_sat
      const { data: avisoExistente, error: errAviso } = await supabase
        .from('avisos_sat')
        .select('*')
        .eq('escritura_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errAviso) throw errAviso;

      // 2. Obtener datos de la escritura, comparecientes y screening PLD
      const { data: esc, error: errEsc } = await supabase
        .from('escrituras')
        .select(`
          id,
          instrumento,
          fecha_celebracion,
          monto_operacion,
          acto_juridico_id,
          actos_juridicos (
            nombre,
            es_actividad_vulnerable
          )
        `)
        .eq('id', id)
        .single();

      if (errEsc) throw errEsc;

      // 3. Revisar si hay coincidencias activas en Lista de Personas Bloqueadas (LPB)
      const { data: matchesLpb } = await supabase
        .from('pld_consultas')
        .select('id, resultado, pld_listas_catalogo!inner(codigo)')
        .eq('escritura_id', id)
        .eq('pld_listas_catalogo.codigo', 'lpb_uif')
        .eq('resultado', 'coincidencia_bloqueante');

      const tieneCoincidenciaLpb = (matchesLpb && matchesLpb.length > 0) || false;

      // 4. Obtener UMA vigente a la fecha del acto
      const fechaActo = esc.fecha_celebracion || (esc as any).fecha_firma || new Date().toISOString().slice(0, 10);
      const anioActo = parseInt(fechaActo.slice(0, 4), 10);
      const mesActo = parseInt(fechaActo.slice(5, 7), 10);
      const numeroInstrumentoStr = esc.instrumento ? String(esc.instrumento) : ((esc as any).numero_instrumento ? String((esc as any).numero_instrumento) : undefined);

      const { data: umaData } = await supabase
        .from('uma_historico')
        .select('valor')
        .lte('fecha_inicio_vigencia', fechaActo)
        .order('fecha_inicio_vigencia', { ascending: false })
        .limit(1)
        .maybeSingle();

      const umaVigente = Number(umaData?.valor || (umaData as any)?.valor_diario || 108.57);
      const esVulnerable = esc.actos_juridicos?.es_actividad_vulnerable ?? true;
      const montoMxn = Number(esc.monto_operacion ?? (esc as any).valor_operacion ?? 0);

      // 5. Dictaminar obligación
      const dictamen = evaluarObligacionAviso({
        esVulnerable,
        montoMxn,
        umaVigente,
        tieneCoincidenciaLpb,
      });

      dictamenActual.value = dictamen;

      if (avisoExistente) {
        avisoActual.value = {
          ...avisoExistente,
          numero_instrumento: numeroInstrumentoStr,
          fecha_acto: fechaActo,
          acto_juridico_nombre: esc.actos_juridicos?.nombre,
          es_actividad_vulnerable: esVulnerable,
        };
      } else {
        // Objeto reactivo en memoria listo para registrar
        avisoActual.value = {
          id: '',
          escritura_id: id,
          periodo_anio: anioActo,
          periodo_mes: mesActo,
          tipo_aviso: dictamen.tipo_aviso === 'exento' ? 'ordinario' : dictamen.tipo_aviso,
          estatus: 'pendiente',
          monto_operacion_mxn: montoMxn,
          monto_operacion_uma: dictamen.monto_uma,
          detalles_json: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          numero_instrumento: numeroInstrumentoStr,
          fecha_acto: fechaActo,
          acto_juridico_nombre: esc.actos_juridicos?.nombre,
          es_actividad_vulnerable: esVulnerable,
        };
      }

      return avisoActual.value;
    } catch (e: any) {
      error.value = e.message || 'Error al cargar aviso de la escritura';
      return null;
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Carga los avisos y KPIs del periodo fiscal mensual seleccionado
   */
  async function cargarAvisosPeriodo(anio: number, mes: number, rfcNotario: string = 'MER750812AB1'): Promise<void> {
    cargando.value = true;
    error.value = null;

    try {
      // 1. Consultar avisos existentes del periodo
      const { data: avisosData, error: errAvisos } = await supabase
        .from('v_avisos_sat_detalle')
        .select('*')
        .eq('periodo_anio', anio)
        .eq('periodo_mes', mes)
        .order('created_at', { ascending: false });

      if (errAvisos) throw errAvisos;

      avisosPeriodo.value = avisosData || [];

      // 2. Calcular KPIs del periodo
      const totalOperaciones = avisosPeriodo.value.length;
      const sujetasAviso = avisosPeriodo.value.filter(a => a.tipo_aviso === 'ordinario' || a.tipo_aviso === '24_horas').length;
      const presentados = avisosPeriodo.value.filter(a => a.estatus === 'presentado').length;
      const pendientes = avisosPeriodo.value.filter(a => a.estatus === 'pendiente' || a.estatus === 'xml_generado').length;
      const total24h = avisosPeriodo.value.filter(a => a.tipo_aviso === '24_horas').length;
      const montoTotalMxn = avisosPeriodo.value.reduce((sum, a) => sum + Number(a.monto_operacion_mxn || 0), 0);
      const montoTotalUma = avisosPeriodo.value.reduce((sum, a) => sum + Number(a.monto_operacion_uma || 0), 0);

      // Fecha representativa del acto en el mes para calcular la fecha límite
      const fechaRefActo = `${anio}-${String(mes).padStart(2, '0')}-15`;
      const limites = calcularFechaLimiteSat(fechaRefActo, rfcNotario);

      const tieneInformeCeros = avisosPeriodo.value.some(a => a.tipo_aviso === 'ceros' && a.estatus === 'presentado');

      kpisPeriodo.value = {
        periodo_anio: anio,
        periodo_mes: mes,
        total_operaciones_vulnerables: totalOperaciones,
        total_sujetas_aviso: sujetasAviso,
        total_presentados: presentados,
        total_pendientes: pendientes,
        total_avisos_24h: total24h,
        monto_total_reportable_mxn: montoTotalMxn,
        monto_total_reportable_uma: montoTotalUma,
        fecha_limite_base: limites.fecha_limite_base,
        dias_prorroga_rfc: limites.dias_prorroga_rfc,
        fecha_limite_efectiva: limites.fecha_limite_efectiva,
        dias_habiles_restantes: limites.dias_habiles_restantes,
        semaforo_urgencia: limites.semaforo_urgencia,
        requiere_informe_ceros: sujetasAviso === 0,
        informe_ceros_presentado: tieneInformeCeros,
      };
    } catch (e: any) {
      error.value = e.message || 'Error al consultar avisos del periodo';
    } finally {
      cargando.value = false;
    }
  }

  /**
   * Genera y descarga el layout XML individual para una escritura
   */
  async function generarXmlIndividualPorEscritura(escrituraId: string): Promise<{ nombreArchivo: string; contenidoXml: string }> {
    guardando.value = true;
    error.value = null;

    try {
      // Obtener datos detallados de escritura, comparecientes e inmuebles
      const { data: esc, error: errEsc } = await supabase
        .from('escrituras')
        .select(`
          id,
          instrumento,
          fecha_celebracion,
          monto_operacion,
          actos_juridicos ( nombre )
        `)
        .eq('id', escrituraId)
        .single();

      if (errEsc) throw errEsc;

      // Obtener comparecientes
      const { data: compData } = await supabase
        .from('escritura_comparecientes')
        .select(`
          rol,
          comparecientes (
            tipo_persona,
            nombre,
            apellido_paterno,
            apellido_materno,
            razon_social,
            rfc,
            curp
          )
        `)
        .eq('escritura_id', escrituraId);

      const personasXml: DatosOperacionAvisoXml['personas'] = (compData || []).map((c: any) => {
        const comp = c.comparecientes || {};
        const esMoral = comp.tipo_persona === 'moral';
        return {
          rol: c.rol === 'enajenante' || c.rol === 'vendedor' ? '1' : '2',
          tipoPersona: esMoral ? 'M' : 'F',
          nombreRazonSocial: esMoral ? (comp.razon_social || comp.nombre) : comp.nombre,
          apellidoPaterno: comp.apellido_paterno,
          apellidoMaterno: comp.apellido_materno,
          rfc: comp.rfc,
          curp: comp.curp,
        };
      });

      const fechaActo = esc.fecha_celebracion || (esc as any).fecha_firma || new Date().toISOString().slice(0, 10);
      const numeroInstrumentoVal = esc.instrumento ? String(esc.instrumento) : ((esc as any).numero_instrumento ? String((esc as any).numero_instrumento) : 'S/N');
      const montoOperacionVal = Number(esc.monto_operacion ?? (esc as any).valor_operacion ?? 0);

      const operacion: DatosOperacionAvisoXml = {
        escrituraId,
        numeroInstrumento: numeroInstrumentoVal,
        fechaOperacion: fechaActo,
        tipoActoSat: '1201',
        descripcionActo: esc.actos_juridicos?.nombre || 'Acto Notarial',
        montoOperacionMxn: montoOperacionVal,
        formaPagoSat: '03',
        personas: personasXml,
      };

      const resultado = generarXmlAvisoIndividual(notariaDefecto, operacion);

      // Actualizar o crear registro en avisos_sat
      const anio = parseInt(fechaActo.slice(0, 4), 10);
      const mes = parseInt(fechaActo.slice(5, 7), 10);

      const { data: avisoGuardado, error: errUpsert } = await supabase
        .from('avisos_sat')
        .upsert(
          {
            escritura_id: escrituraId,
            periodo_anio: anio,
            periodo_mes: mes,
            tipo_aviso: 'ordinario',
            estatus: 'xml_generado',
            archivo_xml_nombre: resultado.nombreArchivo,
            monto_operacion_mxn: operacion.montoOperacionMxn,
            monto_operacion_uma: dictamenActual.value?.monto_uma || 0,
            detalles_json: { layout_version: '2.4', fecha_generacion: new Date().toISOString() },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'escritura_id' }
        )
        .select()
        .single();

      if (!errUpsert && avisoGuardado) {
        avisoActual.value = {
          ...avisoActual.value,
          ...avisoGuardado,
        };
      }

      // Descargar en navegador
      descargarArchivoXmlEnNavegador(resultado.nombreArchivo, resultado.contenidoXml);

      return resultado;
    } catch (e: any) {
      error.value = e.message || 'Error al generar layout XML';
      throw e;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Genera y descarga el paquete mensual consolidado XML
   */
  async function generarPaqueteMensualConsolidado(anio: number, mes: number): Promise<{ nombreArchivo: string; contenidoXml: string }> {
    guardando.value = true;
    error.value = null;

    try {
      const { data: avisos, error: errAvisos } = await supabase
        .from('v_avisos_sat_detalle')
        .select('*')
        .eq('periodo_anio', anio)
        .eq('periodo_mes', mes)
        .eq('tipo_aviso', 'ordinario');

      if (errAvisos) throw errAvisos;

      const operaciones: DatosOperacionAvisoXml[] = (avisos || []).map((a: any) => ({
        escrituraId: a.escritura_id || a.id,
        numeroInstrumento: a.numero_instrumento || 'S/N',
        fechaOperacion: a.fecha_acto || `${anio}-${String(mes).padStart(2, '0')}-15`,
        tipoActoSat: '1201',
        descripcionActo: a.acto_juridico_nombre || 'Operación Notarial',
        montoOperacionMxn: Number(a.monto_operacion_mxn || 0),
        formaPagoSat: '03',
        personas: [],
      }));

      const resultado = generarXmlPaqueteConsolidado(notariaDefecto, operaciones, anio, mes);
      descargarArchivoXmlEnNavegador(resultado.nombreArchivo, resultado.contenidoXml);

      return resultado;
    } catch (e: any) {
      error.value = e.message || 'Error al compilar paquete consolidado XML';
      throw e;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Registra el acuse de aceptación oficial emitido por el portal SPPLD del SAT
   */
  async function registrarAcuseSat(
    avisoId: string,
    folioAcuse: string,
    fechaPresentacion: string,
    archivoPdf?: File
  ): Promise<AvisoSatItem> {
    guardando.value = true;
    error.value = null;

    try {
      let archivoPdfUrl: string | undefined = undefined;

      // Subir archivo PDF de acuse al bucket expedientes si se adjuntó
      if (archivoPdf) {
        const extension = archivoPdf.name.split('.').pop() || 'pdf';
        const rutaStorage = `avisos_sat/${new Date().getFullYear()}/${Date.now()}_acuse_${folioAcuse}.${extension}`;
        
        const { error: errUpload } = await supabase.storage
          .from('expedientes')
          .upload(rutaStorage, archivoPdf, { upsert: true });

        if (!errUpload) {
          archivoPdfUrl = rutaStorage;
        }
      }

      // Actualizar registro en avisos_sat
      const { data, error: errUpdate } = await supabase
        .from('avisos_sat')
        .update({
          folio_acuse_sat: folioAcuse,
          fecha_presentacion_sat: fechaPresentacion,
          archivo_acuse_pdf_url: archivoPdfUrl,
          estatus: 'presentado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', avisoId)
        .select()
        .single();

      if (errUpdate) throw errUpdate;

      if (avisoActual.value && avisoActual.value.id === avisoId) {
        avisoActual.value = {
          ...avisoActual.value,
          ...data,
        };
      }

      return data;
    } catch (e: any) {
      error.value = e.message || 'Error al registrar acuse SAT';
      throw e;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Declara formalmente el Informe en Ceros para un periodo mensual sin operaciones
   */
  async function declararInformeCeros(
    anio: number,
    mes: number,
    folioAcuse: string,
    fechaPresentacion: string,
    archivoPdf?: File
  ): Promise<AvisoSatItem> {
    guardando.value = true;
    error.value = null;

    try {
      let archivoPdfUrl: string | undefined = undefined;

      if (archivoPdf) {
        const rutaStorage = `avisos_sat/${anio}/ceros_${mes}_${Date.now()}.pdf`;
        const { error: errUpload } = await supabase.storage
          .from('expedientes')
          .upload(rutaStorage, archivoPdf, { upsert: true });
        if (!errUpload) {
          archivoPdfUrl = rutaStorage;
        }
      }

      const { data, error: errInsert } = await supabase
        .from('avisos_sat')
        .insert({
          escritura_id: null,
          periodo_anio: anio,
          periodo_mes: mes,
          tipo_aviso: 'ceros',
          estatus: 'presentado',
          folio_acuse_sat: folioAcuse,
          fecha_presentacion_sat: fechaPresentacion,
          archivo_acuse_pdf_url: archivoPdfUrl,
          monto_operacion_mxn: 0,
          monto_operacion_uma: 0,
          detalles_json: { declaracion: 'Informe en ceros Art. 17 Fracc. XII LFPIORPI' },
        })
        .select()
        .single();

      if (errInsert) throw errInsert;

      // Recargar KPIs y lista del periodo
      await cargarAvisosPeriodo(anio, mes);

      return data;
    } catch (e: any) {
      error.value = e.message || 'Error al declarar informe en ceros';
      throw e;
    } finally {
      guardando.value = false;
    }
  }

  /**
   * Abre la Cédula Institucional en PDF para imprimir o guardar
   */
  function emitirCedulaPdf(datos: DatosCedulaAvisoSat): void {
    imprimirCedulaAvisoSat(datos, notariaDefecto);
  }

  return {
    avisoActual,
    dictamenActual,
    avisosPeriodo,
    kpisPeriodo,
    cargando,
    guardando,
    error,
    cargarAvisoEscritura,
    cargarAvisosPeriodo,
    generarXmlIndividualPorEscritura,
    generarPaqueteMensualConsolidado,
    registrarAcuseSat,
    declararInformeCeros,
    emitirCedulaPdf,
  };
}
