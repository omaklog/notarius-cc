import { ref } from 'vue'
import { useSupabaseClient } from '#imports'
import type {
  DependenciaOficial,
  TipoTramiteNotarial,
  TramiteEscritura,
  TramiteResumen,
  TramitePrevencion,
  FiltrosTramites,
  EstadoTramite,
  PasoTramite,
  PasoEscrituraItem,
  HistorialPasoEscritura,
  DependenciaTramiteCard,
  PayloadAgregarPaso
} from '~/types/tramites'
import {
  calcularFechaLimiteDiasHabiles,
  calcularSemaforoTramite,
  type ResultadoSemaforo
} from '~/utils/diasHabiles'

/** Valida si una cadena cumple con la sintaxis estándar de UUID */
export function esUuidValido(val: any): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

/** Catálogo oficial canónico de las 6 dependencias autorizadas por el usuario */
export const DEPENDENCIAS_OFICIALES_DEFAULT: DependenciaOficial[] = [
  { id: 'dep-0', sigla: 'NOTARIA', nombre: 'Notaría / Gestión Interna', clave_numerica: 0, dias_habiles_compromiso: 5, activo: true },
  { id: 'dep-1', sigla: 'CATASTRO_EST', nombre: 'Dirección de Catastro Estatal', clave_numerica: 1, dias_habiles_compromiso: 10, activo: true },
  { id: 'dep-2', sigla: 'CATASTRO_MUN', nombre: 'Catastro y Tesorería Municipal', clave_numerica: 2, dias_habiles_compromiso: 7, activo: true },
  { id: 'dep-3', sigla: 'RPP', nombre: 'Registro Público de la Propiedad', clave_numerica: 3, dias_habiles_compromiso: 15, activo: true },
  { id: 'dep-4', sigla: 'CONTROL_INT', nombre: 'Control Interno y Entrega de Testimonio', clave_numerica: 4, dias_habiles_compromiso: 5, activo: true },
  { id: 'dep-5', sigla: 'INFONAVIT', nombre: 'INFONAVIT - Créditos y Titulación', clave_numerica: 5, dias_habiles_compromiso: 10, activo: true }
]

/** Catálogo oficial canónico de los 17 pasos asociados a las dependencias autorizadas */
export const PASOS_CATALOGO_DEFAULT: PasoTramite[] = [
  { id: 1, nombre: 'CAPTURA', orden: 1, dependencia_clave: 0, genera_orden_pago: false, activo: true, dependencia_sigla: 'NOTARIA', dependencia_nombre: 'Notaría / Gestión Interna' },
  { id: 2, nombre: 'ING. CAT. EST.', orden: 2, dependencia_clave: 1, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_EST', dependencia_nombre: 'Dirección de Catastro Estatal' },
  { id: 4, nombre: 'RECHAZO CAT. EST.', orden: 3, dependencia_clave: 1, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_EST', dependencia_nombre: 'Dirección de Catastro Estatal' },
  { id: 3, nombre: 'O.P. CAT. EST.', orden: 4, dependencia_clave: 1, genera_orden_pago: true, activo: true, dependencia_sigla: 'CATASTRO_EST', dependencia_nombre: 'Dirección de Catastro Estatal' },
  { id: 6, nombre: 'CORREGIR CED. EST.', orden: 5, dependencia_clave: 1, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_EST', dependencia_nombre: 'Dirección de Catastro Estatal' },
  { id: 5, nombre: 'CEDULA CAT. EST.', orden: 6, dependencia_clave: 1, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_EST', dependencia_nombre: 'Dirección de Catastro Estatal' },
  { id: 14, nombre: 'ING. TRAM. MUN.', orden: 7, dependencia_clave: 2, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_MUN', dependencia_nombre: 'Catastro y Tesorería Municipal' },
  { id: 15, nombre: 'RECHAZO MUNICIPAL', orden: 8, dependencia_clave: 2, genera_orden_pago: false, activo: true, dependencia_sigla: 'CATASTRO_MUN', dependencia_nombre: 'Catastro y Tesorería Municipal' },
  { id: 16, nombre: 'O.P. MUNICIPAL', orden: 9, dependencia_clave: 2, genera_orden_pago: true, activo: true, dependencia_sigla: 'CATASTRO_MUN', dependencia_nombre: 'Catastro y Tesorería Municipal' },
  { id: 7, nombre: 'PAGO T.D.', orden: 10, dependencia_clave: 0, genera_orden_pago: false, activo: true, dependencia_sigla: 'NOTARIA', dependencia_nombre: 'Notaría / Gestión Interna' },
  { id: 17, nombre: 'P.T. FIRMADO Y SELLADO', orden: 11, dependencia_clave: 0, genera_orden_pago: false, activo: true, dependencia_sigla: 'NOTARIA', dependencia_nombre: 'Notaría / Gestión Interna' },
  { id: 8, nombre: 'ORD. DE PAG. R.P.P.', orden: 12, dependencia_clave: 3, genera_orden_pago: true, activo: true, dependencia_sigla: 'RPP', dependencia_nombre: 'Registro Público de la Propiedad' },
  { id: 9, nombre: 'INGRESO A R.P.P.', orden: 13, dependencia_clave: 3, genera_orden_pago: false, activo: true, dependencia_sigla: 'RPP', dependencia_nombre: 'Registro Público de la Propiedad' },
  { id: 10, nombre: 'RECHAZO R.P.P.', orden: 14, dependencia_clave: 3, genera_orden_pago: false, activo: true, dependencia_sigla: 'RPP', dependencia_nombre: 'Registro Público de la Propiedad' },
  { id: 11, nombre: 'REINGRESO A R.P.P', orden: 15, dependencia_clave: 3, genera_orden_pago: false, activo: true, dependencia_sigla: 'RPP', dependencia_nombre: 'Registro Público de la Propiedad' },
  { id: 12, nombre: 'SALIDA DE R.P.P', orden: 16, dependencia_clave: 4, genera_orden_pago: false, activo: true, dependencia_sigla: 'CONTROL_INT', dependencia_nombre: 'Control Interno y Entrega de Testimonio' },
  { id: 13, nombre: '1ER TEST AL CLIENTE', orden: 17, dependencia_clave: 4, genera_orden_pago: false, activo: true, dependencia_sigla: 'CONTROL_INT', dependencia_nombre: 'Control Interno y Entrega de Testimonio' }
]

// Estado reactivo singleton compartido a nivel de módulo
const tramites = ref<TramiteResumen[]>([])
const dependencias = ref<DependenciaOficial[]>([...DEPENDENCIAS_OFICIALES_DEFAULT])
const tiposTramite = ref<TipoTramiteNotarial[]>([])
const pasosCatalogo = ref<PasoTramite[]>([...PASOS_CATALOGO_DEFAULT])
const pasosEscritura = ref<PasoEscrituraItem[]>([])
const dependenciasCards = ref<DependenciaTramiteCard[]>([])
const historialPorDependencia = ref<Record<number, HistorialPasoEscritura[]>>({})
const cargando = ref(false)
const error = ref<string | null>(null)

export function useTramites() {
  const supabase = useSupabaseClient()


  /**
   * Carga los catálogos maestros de dependencias y tipos de trámites
   */
  async function cargarCatalogos(): Promise<void> {
    cargando.value = true
    error.value = null

    try {
      const [resDeps, resTipos] = await Promise.all([
        supabase
          .from('cat_dependencias_oficiales')
          .select('*')
          .eq('activo', true)
          .order('nombre', { ascending: true }),
        supabase
          .from('cat_tipos_tramite_notarial')
          .select('*, dependencia:cat_dependencias_oficiales(*)')
          .eq('activo', true)
          .order('nombre', { ascending: true })
      ])

      if (resDeps.error) throw resDeps.error
      if (resTipos.error) throw resTipos.error

      const depsData = resDeps.data || []
      dependencias.value = depsData.length > 0
        ? (depsData as DependenciaOficial[])
        : [...DEPENDENCIAS_OFICIALES_DEFAULT]

      tiposTramite.value = (resTipos.data || []) as TipoTramiteNotarial[]
    } catch (err: any) {
      if (dependencias.value.length === 0) {
        dependencias.value = [...DEPENDENCIAS_OFICIALES_DEFAULT]
      }
      error.value = err.message || 'Error al cargar catálogos'
    } finally {
      cargando.value = false
    }
  }

  /**
   * Enriquece un registro de trámite con cálculo de semáforo en cliente
   */
  function enriquecerTramite(t: any): TramiteResumen {
    const sem = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado as EstadoTramite)

    return {
      ...t,
      tipo_tramite_nombre: t.cat_tipos_tramite_notarial?.nombre || t.tipo_tramite?.nombre || t.tipo_tramite_nombre,
      tipo_tramite_codigo: t.cat_tipos_tramite_notarial?.codigo || t.tipo_tramite?.codigo || t.tipo_tramite_codigo,
      dependencia_sigla: t.cat_dependencias_oficiales?.sigla || t.dependencia?.sigla || t.dependencia_sigla,
      dependencia_nombre: t.cat_dependencias_oficiales?.nombre || t.dependencia?.nombre || t.dependencia_nombre,
      responsable_nombre: t.usuarios?.nombre_completo || t.responsable?.nombre_completo || t.responsable_nombre,
      escritura_instrumento: t.escrituras?.instrumento || t.escritura_instrumento,
      escritura_expediente: t.escrituras?.expediente || t.escritura_expediente,
      acto_nombre: t.escrituras?.actos_juridicos?.nombre || t.acto_nombre,
      dias_habiles_restantes: sem.diasRestantes,
      semaforo: sem.semaforo,
      prevenciones: t.tramite_prevenciones || t.prevenciones || []
    }
  }

  /**
   * Consulta los trámites vinculados a una escritura específica
   */
  async function cargarTramitesEscritura(escrituraId: string): Promise<TramiteResumen[]> {
    cargando.value = true
    error.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('tramites_escritura')
        .select(`
          *,
          cat_tipos_tramite_notarial (*),
          cat_dependencias_oficiales (*),
          usuarios:responsable_id (id, nombre_completo),
          tramite_prevenciones (*)
        `)
        .eq('escritura_id', escrituraId)
        .order('created_at', { ascending: true })

      if (queryError) throw queryError

      const procesados = (data || []).map(enriquecerTramite)
      tramites.value = procesados
      return procesados
    } catch (err: any) {
      error.value = err.message || 'Error al cargar trámites de la escritura'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Consulta trámites consolidados para el tablero global
   */
  async function cargarTodosTramites(filtros?: FiltrosTramites): Promise<TramiteResumen[]> {
    cargando.value = true
    error.value = null

    try {
      let query = supabase
        .from('tramites_escritura')
        .select(`
          *,
          cat_tipos_tramite_notarial (*),
          cat_dependencias_oficiales (*),
          escrituras (id, instrumento, expediente, actos_juridicos (nombre)),
          usuarios:responsable_id (id, nombre_completo),
          tramite_prevenciones (*)
        `)
        .order('created_at', { ascending: false })

      if (filtros?.fase) {
        query = query.eq('fase', filtros.fase)
      }
      if (filtros?.dependencia_id) {
        query = query.eq('dependencia_id', filtros.dependencia_id)
      }
      if (filtros?.estado) {
        query = query.eq('estado', filtros.estado)
      }
      if (filtros?.responsable_id) {
        query = query.eq('responsable_id', filtros.responsable_id)
      }
      if (filtros?.fecha_desde) {
        query = query.gte('fecha_ingreso', filtros.fecha_desde)
      }
      if (filtros?.fecha_hasta) {
        query = query.lte('fecha_ingreso', filtros.fecha_hasta)
      }

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      let procesados = (data || []).map(enriquecerTramite)

      // Filtrado complementario en memoria para búsqueda de texto o semáforo
      if (filtros?.busqueda) {
        const q = filtros.busqueda.toLowerCase()
        procesados = procesados.filter((t) =>
          (t.folio_dependencia?.toLowerCase().includes(q)) ||
          (t.tipo_tramite_nombre?.toLowerCase().includes(q)) ||
          (t.dependencia_sigla?.toLowerCase().includes(q)) ||
          (t.escritura_instrumento?.toLowerCase().includes(q)) ||
          (t.escritura_expediente?.toLowerCase().includes(q)) ||
          (t.observaciones?.toLowerCase().includes(q))
        )
      }

      if (filtros?.semaforo) {
        procesados = procesados.filter((t) => t.semaforo === filtros.semaforo)
      }

      tramites.value = procesados
      return procesados
    } catch (err: any) {
      error.value = err.message || 'Error al consultar tablero de trámites'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Crea un nuevo trámite para una escritura
   */
  async function crearTramite(payload: Partial<TramiteEscritura>): Promise<TramiteEscritura> {
    cargando.value = true
    error.value = null

    try {
      const dataToInsert = { ...payload }

      // Si tiene fecha de ingreso pero no fecha límite, calcularla
      if (dataToInsert.fecha_ingreso && !dataToInsert.fecha_limite_estimada) {
        const tipo = tiposTramite.value.find((t) => t.id === dataToInsert.tipo_tramite_id)
        const dep = dependencias.value.find((d) => d.id === dataToInsert.dependencia_id)
        const dias = tipo?.dias_habiles_compromiso || dep?.dias_habiles_compromiso || 10
        dataToInsert.fecha_limite_estimada = calcularFechaLimiteDiasHabiles(dataToInsert.fecha_ingreso, dias)
      }

      const { data, error: insertError } = await supabase
        .from('tramites_escritura')
        .insert(dataToInsert)
        .select()
        .single()

      if (insertError) throw insertError
      return data as TramiteEscritura
    } catch (err: any) {
      error.value = err.message || 'Error al crear trámite notarial'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Actualiza los datos de un trámite existente
   */
  async function actualizarTramite(id: string, payload: Partial<TramiteEscritura>): Promise<TramiteEscritura> {
    cargando.value = true
    error.value = null

    try {
      const dataToUpdate = { ...payload }

      if (dataToUpdate.fecha_ingreso && !dataToUpdate.fecha_limite_estimada) {
        const tipo = tiposTramite.value.find((t) => t.id === dataToUpdate.tipo_tramite_id)
        const dep = dependencias.value.find((d) => d.id === dataToUpdate.dependencia_id)
        const dias = tipo?.dias_habiles_compromiso || dep?.dias_habiles_compromiso || 10
        dataToUpdate.fecha_limite_estimada = calcularFechaLimiteDiasHabiles(dataToUpdate.fecha_ingreso, dias)
      }

      const { data, error: updateError } = await supabase
        .from('tramites_escritura')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      return data as TramiteEscritura
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar trámite'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Cambia el estado procesal de un trámite
   */
  async function cambiarEstadoTramite(
    id: string,
    nuevoEstado: EstadoTramite,
    datosAdicionales?: Partial<TramiteEscritura>
  ): Promise<TramiteEscritura> {
    const payload: Partial<TramiteEscritura> = {
      estado: nuevoEstado,
      ...datosAdicionales
    }

    if (nuevoEstado === 'concluido_favorable' && !payload.fecha_conclusion) {
      const hoy = new Date()
      const yyyy = hoy.getFullYear()
      const mm = String(hoy.getMonth() + 1).padStart(2, '0')
      const dd = String(hoy.getDate()).padStart(2, '0')
      payload.fecha_conclusion = `${yyyy}-${mm}-${dd}`
    }

    return await actualizarTramite(id, payload)
  }

  /**
   * Elimina un trámite
   */
  async function eliminarTramite(id: string): Promise<void> {
    cargando.value = true
    error.value = null

    try {
      const { error: delError } = await supabase
        .from('tramites_escritura')
        .delete()
        .eq('id', id)

      if (delError) throw delError
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar trámite'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Asienta una prevención registral en el trámite
   */
  async function registrarPrevencion(
    tramiteId: string,
    prevencion: Partial<TramitePrevencion>
  ): Promise<TramitePrevencion> {
    cargando.value = true
    error.value = null

    try {
      const { data, error: prevError } = await supabase
        .from('tramite_prevenciones')
        .insert({
          ...prevencion,
          tramite_id: tramiteId
        })
        .select()
        .single()

      if (prevError) throw prevError

      // Actualizar estado del trámite a prevenido_observado
      await supabase
        .from('tramites_escritura')
        .update({ estado: 'prevenido_observado' })
        .eq('id', tramiteId)

      return data as TramitePrevencion
    } catch (err: any) {
      error.value = err.message || 'Error al asentar prevención registral'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Subgana y reingresa una prevención registral
   */
  async function subsanarPrevencion(
    prevencionId: string,
    tramiteId: string,
    subsanacion: Partial<TramitePrevencion>
  ): Promise<TramitePrevencion> {
    cargando.value = true
    error.value = null

    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error: updateError } = await supabase
        .from('tramite_prevenciones')
        .update({
          ...subsanacion,
          subsanado: true,
          fecha_subsanacion: subsanacion.fecha_subsanacion || hoy
        })
        .eq('id', prevencionId)
        .select()
        .single()

      if (updateError) throw updateError

      // Actualizar estado del trámite a subsanado
      await supabase
        .from('tramites_escritura')
        .update({
          estado: 'subsanado',
          folio_dependencia: subsanacion.folio_reingreso || undefined
        })
        .eq('id', tramiteId)

      return data as TramitePrevencion
    } catch (err: any) {
      error.value = err.message || 'Error al registrar subsanación'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Genera los trámites sugeridos por plantilla según el acto notarial
   */
  async function generarPlantillaTramites(escrituraId: string): Promise<number> {
    cargando.value = true
    error.value = null

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'fn_generar_tramites_plantilla_acto',
        { p_escritura_id: escrituraId }
      )

      if (rpcError) throw rpcError
      return (data || 0) as number
    } catch (err: any) {
      error.value = err.message || 'Error al generar trámites por plantilla'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Carga el catálogo maestro de pasos de gestoría
   */
  async function cargarPasosCatalogo(): Promise<PasoTramite[]> {
    cargando.value = true
    error.value = null

    try {
      if (dependencias.value.length === 0) {
        await cargarCatalogos().catch(() => {})
      }

      const { data, error: qError } = await supabase
        .from('cat_pasos_tramite')
        .select('*')
        .order('orden', { ascending: true })

      if (qError) {
        console.warn('Advertencia al consultar cat_pasos_tramite:', qError.message)
      }

      if (data && data.length > 0) {
        const list = data.map((p: any) => {
          const dep = dependencias.value.find(
            (d) => d.clave_numerica === p.dependencia_clave || (p.dependencia_id && d.id === p.dependencia_id)
          )
          const fallbackPaso = PASOS_CATALOGO_DEFAULT.find((def) => def.id === p.id)
          return {
            id: p.id,
            nombre: p.nombre,
            orden: p.orden,
            dependencia_clave: p.dependencia_clave,
            dependencia_id: p.dependencia_id || dep?.id || null,
            genera_orden_pago: !!p.genera_orden_pago,
            activo: p.activo ?? true,
            dependencia_sigla: dep?.sigla || fallbackPaso?.dependencia_sigla || '',
            dependencia_nombre: dep?.nombre || fallbackPaso?.dependencia_nombre || '',
            created_at: p.created_at,
            updated_at: p.updated_at
          }
        }) as PasoTramite[]

        pasosCatalogo.value = list
        return list
      }

      // Fallback oficial seguro si la base de datos aún no tiene registros
      pasosCatalogo.value = [...PASOS_CATALOGO_DEFAULT]
      return pasosCatalogo.value
    } catch (err: any) {
      if (pasosCatalogo.value.length === 0) {
        pasosCatalogo.value = [...PASOS_CATALOGO_DEFAULT]
      }
      return pasosCatalogo.value
    } finally {
      cargando.value = false
    }
  }

  /**
   * Carga y combina los pasos del catálogo con el avance registrado de una escritura
   */
  async function cargarPasosEscritura(escrituraId: string): Promise<PasoEscrituraItem[]> {
    cargando.value = true
    error.value = null

    try {
      // 1. Asegurar catálogo de pasos
      const pasos = await cargarPasosCatalogo()

      // 2. Consultar registros de la escritura
      const { data: registros, error: regError } = await supabase
        .from('tramite_pasos_escritura')
        .select('*, orden_pago:ordenes_pago(id, folio, monto, estado, linea_captura)')
        .eq('escritura_id', escrituraId)

      if (regError) {
        console.warn('Advertencia al consultar tramite_pasos_escritura:', regError.message)
      }

      const regMap = new Map<number, any>()
      for (const r of (registros || [])) {
        regMap.set(r.paso_id, r)
      }

      const resultado: PasoEscrituraItem[] = pasos.map((p) => {
        const reg = regMap.get(p.id)
        return {
          paso_id: p.id,
          paso_nombre: p.nombre,
          paso_orden: p.orden,
          dependencia_clave: p.dependencia_clave,
          genera_orden_pago: p.genera_orden_pago,
          dependencia_id: p.dependencia_id,
          dependencia_sigla: p.dependencia_sigla,
          dependencia_nombre: p.dependencia_nombre,
          registro_id: reg?.id || null,
          escritura_id: escrituraId,
          completado: !!reg?.completado,
          fecha_completado: reg?.fecha_completado || null,
          completado_por: reg?.completado_por || null,
          notas: reg?.notas || null,
          orden_pago_id: reg?.orden_pago_id || null,
          orden_pago_folio: reg?.orden_pago?.folio || null,
          orden_pago_monto: reg?.orden_pago?.monto ? Number(reg.orden_pago.monto) : null,
          orden_pago_estado: reg?.orden_pago?.estado || null,
          orden_pago_linea_captura: reg?.orden_pago?.linea_captura || null
        }
      })

      pasosEscritura.value = resultado
      return resultado
    } catch (err: any) {
      error.value = err.message || 'Error al cargar pasos de la escritura'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Marca o desmarca un paso en el checklist de la escritura (avance libre)
   */
  async function togglePasoEscritura(
    escrituraId: string,
    pasoId: number,
    completado: boolean,
    ordenPagoId?: string | null,
    notas?: string | null
  ): Promise<void> {
    try {
      const payload: any = {
        escritura_id: escrituraId,
        paso_id: pasoId,
        completado,
        fecha_completado: completado ? new Date().toISOString() : null,
        notas: notas || null
      }
      if (ordenPagoId !== undefined) {
        payload.orden_pago_id = ordenPagoId
      }

      const { error: upsertError } = await supabase
        .from('tramite_pasos_escritura')
        .upsert(payload, { onConflict: 'escritura_id,paso_id' })

      if (upsertError) throw upsertError

      await cargarPasosEscritura(escrituraId)
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar paso de la escritura'
      throw err
    }
  }

  /**
   * Guarda o actualiza un paso del catálogo maestro
   */
  async function guardarPasoCatalogo(paso: Partial<PasoTramite>): Promise<void> {
    cargando.value = true
    try {
      const payload: any = {
        nombre: paso.nombre?.trim(),
        orden: Number(paso.orden) || 1,
        dependencia_clave: paso.dependencia_clave ?? 0,
        dependencia_id: paso.dependencia_id || null,
        genera_orden_pago: !!paso.genera_orden_pago,
        activo: paso.activo ?? true
      }

      if (paso.id) {
        payload.id = paso.id
        const { error: upErr } = await supabase
          .from('cat_pasos_tramite')
          .upsert(payload)
        if (upErr) throw upErr
      } else {
        // Encontrar siguiente ID libre
        const { data: maxIdData } = await supabase
          .from('cat_pasos_tramite')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
        const nextId = ((maxIdData?.[0]?.id || 0) + 1)
        payload.id = nextId
        const { error: inErr } = await supabase
          .from('cat_pasos_tramite')
          .insert(payload)
        if (inErr) throw inErr
      }

      await cargarPasosCatalogo()
    } catch (err: any) {
      error.value = err.message || 'Error al guardar paso del catálogo'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Elimina un paso del catálogo
   */
  async function eliminarPasoCatalogo(pasoId: number): Promise<void> {
    try {
      const { error: delErr } = await supabase
        .from('cat_pasos_tramite')
        .delete()
        .eq('id', pasoId)

      if (delErr) throw delErr
      await cargarPasosCatalogo()
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar paso del catálogo'
      throw err
    }
  }

  /**
   * Reordena secuencialmente los pasos del catálogo
   */
  async function reordenarPasosCatalogo(lista: { id: number; orden: number }[]): Promise<void> {
    try {
      for (const item of lista) {
        await supabase
          .from('cat_pasos_tramite')
          .update({ orden: item.orden })
          .eq('id', item.id)
      }
      await cargarPasosCatalogo()
    } catch (err: any) {
      error.value = err.message || 'Error al reordenar pasos'
      throw err
    }
  }

  /**
   * Guarda o actualiza una dependencia oficial
   */
  async function guardarDependencia(dep: Partial<DependenciaOficial> & { clave_numerica?: number }): Promise<void> {
    try {
      const payload: any = {
        sigla: dep.sigla?.trim().toUpperCase(),
        nombre: dep.nombre?.trim(),
        direccion: dep.direccion?.trim() || null,
        portal_web: dep.portal_web?.trim() || null,
        dias_habiles_compromiso: Number(dep.dias_habiles_compromiso) || 10,
        activo: dep.activo ?? true
      }
      if (dep.clave_numerica !== undefined) {
        payload.clave_numerica = dep.clave_numerica
      }

      if (dep.id) {
        const { error: upErr } = await supabase
          .from('cat_dependencias_oficiales')
          .update(payload)
          .eq('id', dep.id)
        if (upErr) throw upErr
      } else {
        const { error: inErr } = await supabase
          .from('cat_dependencias_oficiales')
          .insert(payload)
        if (inErr) throw inErr
      }

      await cargarCatalogos()
    } catch (err: any) {
      error.value = err.message || 'Error al guardar dependencia oficial'
      throw err
    }
  }

  /**
   * Obtiene los pasos configurados exclusivamente para una dependencia
   */
  function obtenerPasosPorDependencia(dependenciaClave: number): PasoTramite[] {
    const fuente = pasosCatalogo.value.length > 0 ? pasosCatalogo.value : PASOS_CATALOGO_DEFAULT
    return fuente
      .filter((p) => Number(p.dependencia_clave) === Number(dependenciaClave) && p.activo !== false)
      .sort((a, b) => a.orden - b.orden)
  }

  /**
   * Carga las tarjetas por dependencia para una escritura (solo dependencias con movimientos registrados)
   */
  async function cargarTarjetasDependencias(escrituraId: string): Promise<DependenciaTramiteCard[]> {
    cargando.value = true
    error.value = null

    try {
      const tieneDepsSinUuid = dependencias.value.length === 0 || dependencias.value.some(d => !esUuidValido(d.id))
      if (tieneDepsSinUuid) {
        await cargarCatalogos().catch(() => {})
      }
      if (pasosCatalogo.value.length === 0) {
        await cargarPasosCatalogo().catch(() => {})
      }

      // Intentar primero con la vista v_tramite_dependencias_resumen
      const { data: resumenData, error: resumenErr } = await supabase
        .from('v_tramite_dependencias_resumen')
        .select('*')
        .eq('escritura_id', escrituraId)

      if (!resumenErr && resumenData && resumenData.length > 0) {
        const cards: DependenciaTramiteCard[] = resumenData.map((r: any) => {
          const depMeta = dependencias.value.find(
            (d) => d.clave_numerica === r.dependencia_clave || (esUuidValido(r.dependencia_id) && d.id === r.dependencia_id)
          )
          const validDepId = esUuidValido(r.dependencia_id) ? r.dependencia_id : (depMeta && esUuidValido(depMeta.id) ? depMeta.id : null)
          return {
            escritura_id: r.escritura_id,
            dependencia_clave: r.dependencia_clave,
            dependencia_id: validDepId,
            dependencia_sigla: r.dependencia_sigla || depMeta?.sigla || `DEP_${r.dependencia_clave}`,
            dependencia_nombre: r.dependencia_nombre || depMeta?.nombre || `Dependencia ${r.dependencia_clave}`,
            dependencia_dias_habiles: r.dependencia_dias_habiles || depMeta?.dias_habiles_compromiso || 10,
            ultimo_paso_id: r.ultimo_paso_id,
            ultimo_paso_nombre: r.ultimo_paso_nombre,
            ultimo_folio_volante: r.ultimo_folio_volante,
            ultimas_notas: r.ultimas_notas,
            ultima_fecha_registro: r.ultima_fecha_registro,
            ultimo_responsable_id: r.ultimo_responsable_id,
            ultimo_responsable_nombre: r.ultimo_responsable_nombre,
            ultima_orden_pago_id: r.ultima_orden_pago_id,
            ultimo_genera_orden_pago: !!r.ultimo_genera_orden_pago,
            total_movimientos: Number(r.total_movimientos) || 1,
            historial: historialPorDependencia.value[r.dependencia_clave] || [],
            expandido: false
          }
        })
        cards.sort((a, b) => a.dependencia_clave - b.dependencia_clave)
        dependenciasCards.value = cards
        return cards
      }

      // Fallback: consulta directa a tramite_pasos_escritura
      const { data: registros, error: regErr } = await supabase
        .from('tramite_pasos_escritura')
        .select(`
          *,
          cat_pasos_tramite (*),
          cat_dependencias_oficiales (*),
          profiles:completado_por (id, nombre_completo),
          ordenes_pago:orden_pago_id (id, folio, monto, estado, linea_captura)
        `)
        .eq('escritura_id', escrituraId)
        .order('fecha_registro', { ascending: false })

      if (regErr) throw regErr

      const agrupados = new Map<number, any[]>()
      for (const reg of (registros || [])) {
        const depClave = reg.dependencia_clave ?? reg.cat_pasos_tramite?.dependencia_clave ?? 0
        if (!agrupados.has(depClave)) {
          agrupados.set(depClave, [])
        }
        agrupados.get(depClave)!.push(reg)
      }

      const cards: DependenciaTramiteCard[] = []
      for (const [depClave, items] of agrupados.entries()) {
        const ultimo = items[0]
        const depMeta = dependencias.value.find(
          (d) => d.clave_numerica === depClave || (esUuidValido(ultimo.dependencia_id) && d.id === ultimo.dependencia_id)
        )
        const validDepId = esUuidValido(ultimo.dependencia_id) ? ultimo.dependencia_id : (depMeta && esUuidValido(depMeta.id) ? depMeta.id : null)
        const pasoMeta = pasosCatalogo.value.find((p) => p.id === ultimo.paso_id)

        cards.push({
          escritura_id: escrituraId,
          dependencia_clave: depClave,
          dependencia_id: validDepId,
          dependencia_sigla: depMeta?.sigla || ultimo.cat_dependencias_oficiales?.sigla || `DEP_${depClave}`,
          dependencia_nombre: depMeta?.nombre || ultimo.cat_dependencias_oficiales?.nombre || `Dependencia ${depClave}`,
          dependencia_dias_habiles: depMeta?.dias_habiles_compromiso || 10,
          ultimo_paso_id: ultimo.paso_id,
          ultimo_paso_nombre: pasoMeta?.nombre || ultimo.cat_pasos_tramite?.nombre || `Paso #${ultimo.paso_id}`,
          ultimo_folio_volante: ultimo.folio_volante || null,
          ultimas_notas: ultimo.notas || null,
          ultima_fecha_registro: ultimo.fecha_registro || ultimo.created_at,
          ultimo_responsable_id: ultimo.completado_por || null,
          ultimo_responsable_nombre: ultimo.profiles?.nombre_completo || null,
          ultima_orden_pago_id: ultimo.orden_pago_id || null,
          ultimo_genera_orden_pago: !!(pasoMeta?.genera_orden_pago ?? ultimo.cat_pasos_tramite?.genera_orden_pago),
          total_movimientos: items.length,
          historial: historialPorDependencia.value[depClave] || [],
          expandido: false
        })
      }

      cards.sort((a, b) => a.dependencia_clave - b.dependencia_clave)
      dependenciasCards.value = cards
      return cards
    } catch (err: any) {
      error.value = err.message || 'Error al cargar tarjetas de dependencias'
      return []
    } finally {
      cargando.value = false
    }
  }

  /**
   * Carga el historial cronológico completo de una dependencia para la escritura
   */
  async function cargarHistorialDependencia(
    escrituraId: string,
    dependenciaClave: number
  ): Promise<HistorialPasoEscritura[]> {
    try {
      // 1. Intentar vista v_tramite_pasos_historial
      const { data: histData, error: histErr } = await supabase
        .from('v_tramite_pasos_historial')
        .select('*')
        .eq('escritura_id', escrituraId)
        .eq('dependencia_clave', dependenciaClave)
        .order('fecha_registro', { ascending: false })

      if (!histErr && histData) {
        const resultado: HistorialPasoEscritura[] = histData.map((h: any) => ({
          registro_id: h.registro_id || h.id,
          escritura_id: h.escritura_id,
          paso_id: h.paso_id,
          paso_nombre: h.paso_nombre,
          paso_orden: h.paso_orden,
          genera_orden_pago: !!h.genera_orden_pago,
          dependencia_clave: h.dependencia_clave,
          dependencia_id: h.dependencia_id,
          dependencia_sigla: h.dependencia_sigla,
          dependencia_nombre: h.dependencia_nombre,
          folio_volante: h.folio_volante,
          notas: h.notas,
          fecha_registro: h.fecha_registro,
          completado: h.completado ?? true,
          completado_por: h.completado_por,
          completado_por_nombre: h.completado_por_nombre,
          orden_pago_id: h.orden_pago_id,
          orden_pago_folio: h.orden_pago_folio,
          orden_pago_monto: h.orden_pago_monto,
          orden_pago_estado: h.orden_pago_estado,
          orden_pago_linea_captura: h.orden_pago_linea_captura
        }))

        historialPorDependencia.value[dependenciaClave] = resultado

        const targetCard = dependenciasCards.value.find(
          (c) => c.dependencia_clave === dependenciaClave
        )
        if (targetCard) {
          targetCard.historial = resultado
          targetCard.total_movimientos = resultado.length
        }

        return resultado
      }

      // Fallback a tabla tramite_pasos_escritura
      const { data: rawData, error: rawErr } = await supabase
        .from('tramite_pasos_escritura')
        .select(`
          *,
          cat_pasos_tramite (*),
          cat_dependencias_oficiales (*),
          profiles:completado_por (id, nombre_completo),
          ordenes_pago:orden_pago_id (id, folio, monto, estado, linea_captura)
        `)
        .eq('escritura_id', escrituraId)
        .eq('dependencia_clave', dependenciaClave)
        .order('fecha_registro', { ascending: false })

      if (rawErr) throw rawErr

      const resultado: HistorialPasoEscritura[] = (rawData || []).map((r: any) => ({
        registro_id: r.id,
        escritura_id: r.escritura_id,
        paso_id: r.paso_id,
        paso_nombre: r.cat_pasos_tramite?.nombre || `Paso #${r.paso_id}`,
        paso_orden: r.cat_pasos_tramite?.orden || 1,
        genera_orden_pago: !!r.cat_pasos_tramite?.genera_orden_pago,
        dependencia_clave: r.dependencia_clave,
        dependencia_id: r.dependencia_id,
        dependencia_sigla: r.cat_dependencias_oficiales?.sigla,
        dependencia_nombre: r.cat_dependencias_oficiales?.nombre,
        folio_volante: r.folio_volante,
        notas: r.notas,
        fecha_registro: r.fecha_registro || r.created_at,
        completado: r.completado ?? true,
        completado_por: r.completado_por,
        completado_por_nombre: r.profiles?.nombre_completo,
        orden_pago_id: r.orden_pago_id,
        orden_pago_folio: r.ordenes_pago?.folio,
        orden_pago_monto: r.ordenes_pago?.monto ? Number(r.ordenes_pago.monto) : null,
        orden_pago_estado: r.ordenes_pago?.estado,
        orden_pago_linea_captura: r.ordenes_pago?.linea_captura
      }))

      historialPorDependencia.value[dependenciaClave] = resultado
      const targetCard = dependenciasCards.value.find(
        (c) => c.dependencia_clave === dependenciaClave
      )
      if (targetCard) {
        targetCard.historial = resultado
        targetCard.total_movimientos = resultado.length
      }

      return resultado
    } catch (err: any) {
      error.value = err.message || 'Error al cargar historial de la dependencia'
      return []
    }
  }

  /**
   * Agrega un nuevo paso a la bitácora histórica repetible de la escritura
   */
  async function agregarPasoHistorial(
    payload: PayloadAgregarPaso
  ): Promise<HistorialPasoEscritura> {
    cargando.value = true
    error.value = null

    try {
      let userId: string | null = null
      try {
        const { data: authData } = await supabase.auth.getUser()
        userId = authData?.user?.id || null
      } catch {
        // Entornos sin sesión activa
      }

      const pasoMeta = pasosCatalogo.value.find((p) => p.id === payload.paso_id)
      const depClave = payload.dependencia_clave ?? pasoMeta?.dependencia_clave ?? 0

      // Resolver dependencia_id garantizando sintaxis válida de UUID para evitar error 22P02
      let depId: string | null = null
      if (esUuidValido(payload.dependencia_id)) {
        depId = payload.dependencia_id
      } else if (esUuidValido(pasoMeta?.dependencia_id)) {
        depId = pasoMeta.dependencia_id
      } else {
        const foundDep = dependencias.value.find((d) => d.clave_numerica === depClave && esUuidValido(d.id))
        if (foundDep) {
          depId = foundDep.id
        }
      }

      const rowToInsert: any = {
        escritura_id: payload.escritura_id,
        paso_id: payload.paso_id,
        dependencia_clave: depClave,
        dependencia_id: depId,
        folio_volante: payload.folio_volante?.trim() || null,
        notas: payload.notas?.trim() || null,
        fecha_registro: payload.fecha_registro || new Date().toISOString(),
        completado: true,
        fecha_completado: payload.fecha_registro || new Date().toISOString(),
        completado_por: userId,
        orden_pago_id: payload.orden_pago_id || null
      }

      const { data: inserted, error: inErr } = await supabase
        .from('tramite_pasos_escritura')
        .insert(rowToInsert)
        .select('*')
        .single()

      if (inErr) throw inErr

      // Sincronización automática con tramites_escritura (para reflejar en Total Trámites y tabla procesal)
      const effectiveDepId = (inserted as any)?.dependencia_id || depId
      if (effectiveDepId && esUuidValido(effectiveDepId) && esUuidValido(payload.escritura_id)) {
        try {
          const { data: existencias } = await supabase
            .from('tramites_escritura')
            .select('id, estado, tipo_tramite_id, folio_dependencia')
            .eq('escritura_id', payload.escritura_id)
            .eq('dependencia_id', effectiveDepId)
            .limit(1)

          const pasoNombre = (pasoMeta?.nombre || '').toUpperCase()
          let nuevoEstado: EstadoTramite = 'en_proceso'
          let esConclusion = false

          if (pasoNombre.includes('RECHAZO') || pasoNombre.includes('OBSERVACION') || pasoNombre.includes('PREVENCION')) {
            nuevoEstado = 'prevenido_observado'
          } else if (
            pasoNombre.includes('CEDULA') ||
            pasoNombre.includes('1ER TEST') ||
            pasoNombre.includes('SALIDA') ||
            pasoNombre.includes('CONCLUIDO')
          ) {
            nuevoEstado = 'concluido_favorable'
            esConclusion = true
          } else if (pasoNombre.includes('ING.') || pasoNombre.includes('INGRESO') || pasoNombre.includes('REINGRESO')) {
            nuevoEstado = 'ingresado_dependencia'
          }

          const fechaIso = payload.fecha_registro ? payload.fecha_registro.split('T')[0] : new Date().toISOString().split('T')[0]

          if (existencias && existencias.length > 0) {
            const tr = existencias[0]
            const updatePayload: any = {
              estado: nuevoEstado,
              updated_at: new Date().toISOString()
            }
            if (payload.folio_volante?.trim()) {
              updatePayload.folio_dependencia = payload.folio_volante.trim()
            }
            if (payload.orden_pago_id) {
              updatePayload.orden_pago_id = payload.orden_pago_id
            }
            if (esConclusion) {
              updatePayload.fecha_conclusion = fechaIso
            }
            await supabase
              .from('tramites_escritura')
              .update(updatePayload)
              .eq('id', tr.id)
          } else {
            let tipoId: string | null = null
            let faseDefault: any = 'previo'
            let diasHabiles = 10

            const tipoMatch = tiposTramite.value.find((t) => t.dependencia_id === effectiveDepId)
            if (tipoMatch) {
              tipoId = tipoMatch.id
              faseDefault = tipoMatch.fase_default || 'previo'
              diasHabiles = tipoMatch.dias_habiles_compromiso || 10
            } else {
              const { data: tipoDb } = await supabase
                .from('cat_tipos_tramite_notarial')
                .select('id, fase_default, dias_habiles_compromiso')
                .eq('dependencia_id', effectiveDepId)
                .eq('activo', true)
                .limit(1)

              if (tipoDb && tipoDb.length > 0) {
                tipoId = tipoDb[0].id
                faseDefault = tipoDb[0].fase_default || 'previo'
                diasHabiles = tipoDb[0].dias_habiles_compromiso || 10
              }
            }

            if (tipoId) {
              const fechaLimite = calcularFechaLimiteDiasHabiles(fechaIso, diasHabiles)
              const nuevoTramitePayload: any = {
                escritura_id: payload.escritura_id,
                dependencia_id: effectiveDepId,
                tipo_tramite_id: tipoId,
                fase: faseDefault,
                estado: nuevoEstado,
                folio_dependencia: payload.folio_volante?.trim() || null,
                fecha_ingreso: fechaIso,
                fecha_limite_estimada: fechaLimite,
                responsable_id: userId,
                observaciones: payload.notas?.trim() || null,
                orden_pago_id: payload.orden_pago_id || null
              }
              if (esConclusion) {
                nuevoTramitePayload.fecha_conclusion = fechaIso
              }
              await supabase
                .from('tramites_escritura')
                .insert(nuevoTramitePayload)
            }
          }
        } catch (syncErr) {
          console.warn('Advertencia en sincronización de trámite formal:', syncErr)
        }
      }

      // Refrescar tarjetas, historial y trámites formales de la escritura
      await Promise.all([
        cargarTarjetasDependencias(payload.escritura_id),
        cargarHistorialDependencia(payload.escritura_id, depClave),
        cargarTramitesEscritura(payload.escritura_id).catch(() => [])
      ])

      return inserted as HistorialPasoEscritura
    } catch (err: any) {
      error.value = err.message || 'Error al agregar paso al historial'
      throw err
    } finally {
      cargando.value = false
    }
  }

  /**
   * Inicia la gestión de una nueva dependencia registrando su primer paso
   */
  async function iniciarGestionDependencia(
    escrituraId: string,
    dependenciaClave: number,
    primerPasoId: number,
    notas?: string,
    folio?: string,
    ordenPagoId?: string | null
  ): Promise<void> {
    await agregarPasoHistorial({
      escritura_id: escrituraId,
      paso_id: primerPasoId,
      dependencia_clave: dependenciaClave,
      notas,
      folio_volante: folio,
      orden_pago_id: ordenPagoId
    })
  }

  return {
    tramites,
    dependencias,
    tiposTramite,
    pasosCatalogo,
    pasosEscritura,
    dependenciasCards,
    historialPorDependencia,
    cargando,
    error,
    cargarCatalogos,
    cargarTramitesEscritura,
    cargarTodosTramites,
    crearTramite,
    actualizarTramite,
    eliminarTramite,
    cambiarEstadoTramite,
    registrarPrevencion,
    subsanarPrevencion,
    generarPlantillaTramites,
    cargarPasosCatalogo,
    cargarPasosEscritura,
    togglePasoEscritura,
    guardarPasoCatalogo,
    eliminarPasoCatalogo,
    reordenarPasosCatalogo,
    guardarDependencia,
    obtenerPasosPorDependencia,
    cargarTarjetasDependencias,
    cargarHistorialDependencia,
    agregarPasoHistorial,
    iniciarGestionDependencia,
    calcularSemaforo: calcularSemaforoTramite
  }
}
