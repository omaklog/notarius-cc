// ============================================================================
// app/utils/xmlGeneradorAvisosSat.ts
// Generador y compilador de archivos XML para el portal SPPLD (SAT / UIF)
// Conforme al esquema oficial de Fedatarios Públicos (Art. 17 Fracc. XII LFPIORPI)
// ============================================================================

import type { DatosAvisoNotariaXml, DatosOperacionAvisoXml } from '~/types/avisosSat';

/**
 * Escapa caracteres especiales para garantizar XML bien formado y seguro
 */
export function escaparXml(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const str = String(valor);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Formatea una fecha YYYY-MM-DD a YYYYMMDD para el layout SAT
 */
export function formatearFechaSat(fecha: string): string {
  if (!fecha) return '';
  return fecha.replace(/[-/]/g, '').slice(0, 8);
}

/**
 * Genera el XML de una operación individual ante el portal SPPLD
 */
export function generarXmlAvisoIndividual(
  notaria: DatosAvisoNotariaXml,
  operacion: DatosOperacionAvisoXml,
  prioridad: '1' | '2' | '3' = '1'
): { nombreArchivo: string; contenidoXml: string } {
  const fechaSat = formatearFechaSat(operacion.fechaOperacion);
  const referenciaAviso = `AVS-${notaria.numeroNotaria}-${operacion.numeroInstrumento}-${fechaSat}`;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<archivo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
  
  // Sujeto Obligado (Fedatario Público / Notaría)
  xml += `  <sujeto_obligado>\n`;
  xml += `    <clave_sujeto_obligado>${escaparXml(notaria.claveSujetoObligado || `NOT-${notaria.numeroNotaria}`)}</clave_sujeto_obligado>\n`;
  xml += `    <rfc>${escaparXml(notaria.rfcNotario)}</rfc>\n`;
  xml += `    <numero_notaria>${escaparXml(notaria.numeroNotaria)}</numero_notaria>\n`;
  xml += `    <entidad_federativa>${escaparXml(notaria.entidadFederativa || '09')}</entidad_federativa>\n`;
  xml += `    <nombre_notario>${escaparXml(notaria.nombreNotario)}</nombre_notario>\n`;
  xml += `  </sujeto_obligado>\n`;

  // Aviso y Operación
  xml += `  <aviso>\n`;
  xml += `    <referencia_aviso>${escaparXml(referenciaAviso)}</referencia_aviso>\n`;
  xml += `    <prioridad>${prioridad}</prioridad>\n`;
  xml += `    <operacion>\n`;
  xml += `      <fecha_operacion>${fechaSat}</fecha_operacion>\n`;
  xml += `      <tipo_acto>${escaparXml(operacion.tipoActoSat || '1201')}</tipo_acto>\n`;
  xml += `      <descripcion_acto>${escaparXml(operacion.descripcionActo)}</descripcion_acto>\n`;
  xml += `      <numero_instrumento>${escaparXml(operacion.numeroInstrumento)}</numero_instrumento>\n`;
  if (operacion.volumenOLibro) {
    xml += `      <volumen_o_libro>${escaparXml(operacion.volumenOLibro)}</volumen_o_libro>\n`;
  }

  // Comparecientes y Sujetos del Aviso
  xml += `      <personas>\n`;
  for (const p of operacion.personas || []) {
    xml += `        <persona rol="${p.rol}" tipo="${p.tipoPersona}">\n`;
    xml += `          <nombre_razon_social>${escaparXml(p.nombreRazonSocial)}</nombre_razon_social>\n`;
    if (p.apellidoPaterno) {
      xml += `          <apellido_paterno>${escaparXml(p.apellidoPaterno)}</apellido_paterno>\n`;
    }
    if (p.apellidoMaterno) {
      xml += `          <apellido_materno>${escaparXml(p.apellidoMaterno)}</apellido_materno>\n`;
    }
    if (p.rfc) {
      xml += `          <rfc>${escaparXml(p.rfc)}</rfc>\n`;
    }
    if (p.curp) {
      xml += `          <curp>${escaparXml(p.curp)}</curp>\n`;
    }
    if (p.fechaNacimientoOConstitucion) {
      xml += `          <fecha_nacimiento_constitucion>${formatearFechaSat(p.fechaNacimientoOConstitucion)}</fecha_nacimiento_constitucion>\n`;
    }
    xml += `        </persona>\n`;
  }
  xml += `      </personas>\n`;

  // Datos del Bien (si aplica)
  if (operacion.inmueble) {
    xml += `      <bien_operacion>\n`;
    xml += `        <tipo_bien>${escaparXml(operacion.inmueble.tipoBien || 'inmueble')}</tipo_bien>\n`;
    xml += `        <descripcion>${escaparXml(operacion.inmueble.descripcion)}</descripcion>\n`;
    if (operacion.inmueble.calle) {
      xml += `        <calle>${escaparXml(operacion.inmueble.calle)}</calle>\n`;
    }
    if (operacion.inmueble.numeroExterior) {
      xml += `        <numero_exterior>${escaparXml(operacion.inmueble.numeroExterior)}</numero_exterior>\n`;
    }
    if (operacion.inmueble.colonia) {
      xml += `        <colonia>${escaparXml(operacion.inmueble.colonia)}</colonia>\n`;
    }
    if (operacion.inmueble.codigoPostal) {
      xml += `        <codigo_postal>${escaparXml(operacion.inmueble.codigoPostal)}</codigo_postal>\n`;
    }
    if (operacion.inmueble.municipio) {
      xml += `        <municipio>${escaparXml(operacion.inmueble.municipio)}</municipio>\n`;
    }
    if (operacion.inmueble.entidadFederativa) {
      xml += `        <entidad_federativa>${escaparXml(operacion.inmueble.entidadFederativa)}</entidad_federativa>\n`;
    }
    if (operacion.inmueble.folioReal) {
      xml += `        <folio_real>${escaparXml(operacion.inmueble.folioReal)}</folio_real>\n`;
    }
    xml += `      </bien_operacion>\n`;
  }

  // Liquidación y Medio de Pago
  xml += `      <liquidacion>\n`;
  xml += `        <monto_operacion>${operacion.montoOperacionMxn.toFixed(2)}</monto_operacion>\n`;
  xml += `        <forma_pago>${escaparXml(operacion.formaPagoSat || '03')}</forma_pago>\n`;
  if (operacion.institucionBancaria) {
    xml += `        <institucion_bancaria>${escaparXml(operacion.institucionBancaria)}</institucion_bancaria>\n`;
  }
  if (operacion.claveRastreo) {
    xml += `        <clave_rastreo>${escaparXml(operacion.claveRastreo)}</clave_rastreo>\n`;
  }
  if (operacion.montoEfectivo !== undefined) {
    xml += `        <monto_efectivo>${operacion.montoEfectivo.toFixed(2)}</monto_efectivo>\n`;
  }
  xml += `      </liquidacion>\n`;

  xml += `    </operacion>\n`;
  xml += `  </aviso>\n`;
  xml += `</archivo>`;

  const nombreArchivo = `SPPLD_NOTARIA_${notaria.numeroNotaria}_ESC_${operacion.numeroInstrumento}_${fechaSat}.xml`;
  return { nombreArchivo, contenidoXml: xml };
}

/**
 * Genera el archivo XML compilado para carga masiva mensual de todas las operaciones reportables
 */
export function generarXmlPaqueteConsolidado(
  notaria: DatosAvisoNotariaXml,
  operaciones: DatosOperacionAvisoXml[],
  periodoAnio: number,
  periodoMes: number
): { nombreArchivo: string; contenidoXml: string } {
  const mesStr = String(periodoMes).padStart(2, '0');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<archivo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" periodo="${periodoAnio}${mesStr}">\n`;
  
  // Sujeto Obligado
  xml += `  <sujeto_obligado>\n`;
  xml += `    <clave_sujeto_obligado>${escaparXml(notaria.claveSujetoObligado || `NOT-${notaria.numeroNotaria}`)}</clave_sujeto_obligado>\n`;
  xml += `    <rfc>${escaparXml(notaria.rfcNotario)}</rfc>\n`;
  xml += `    <numero_notaria>${escaparXml(notaria.numeroNotaria)}</numero_notaria>\n`;
  xml += `    <entidad_federativa>${escaparXml(notaria.entidadFederativa || '09')}</entidad_federativa>\n`;
  xml += `    <nombre_notario>${escaparXml(notaria.nombreNotario)}</nombre_notario>\n`;
  xml += `  </sujeto_obligado>\n`;

  // Compilación de avisos
  for (const operacion of operaciones) {
    const fechaSat = formatearFechaSat(operacion.fechaOperacion);
    const referencia = `AVS-${notaria.numeroNotaria}-${operacion.numeroInstrumento}-${fechaSat}`;
    xml += `  <aviso>\n`;
    xml += `    <referencia_aviso>${escaparXml(referencia)}</referencia_aviso>\n`;
    xml += `    <prioridad>1</prioridad>\n`;
    xml += `    <operacion>\n`;
    xml += `      <fecha_operacion>${fechaSat}</fecha_operacion>\n`;
    xml += `      <tipo_acto>${escaparXml(operacion.tipoActoSat || '1201')}</tipo_acto>\n`;
    xml += `      <descripcion_acto>${escaparXml(operacion.descripcionActo)}</descripcion_acto>\n`;
    xml += `      <numero_instrumento>${escaparXml(operacion.numeroInstrumento)}</numero_instrumento>\n`;

    xml += `      <personas>\n`;
    for (const p of operacion.personas || []) {
      xml += `        <persona rol="${p.rol}" tipo="${p.tipoPersona}">\n`;
      xml += `          <nombre_razon_social>${escaparXml(p.nombreRazonSocial)}</nombre_razon_social>\n`;
      if (p.rfc) xml += `          <rfc>${escaparXml(p.rfc)}</rfc>\n`;
      if (p.curp) xml += `          <curp>${escaparXml(p.curp)}</curp>\n`;
      xml += `        </persona>\n`;
    }
    xml += `      </personas>\n`;

    if (operacion.inmueble) {
      xml += `      <bien_operacion>\n`;
      xml += `        <tipo_bien>${escaparXml(operacion.inmueble.tipoBien || 'inmueble')}</tipo_bien>\n`;
      xml += `        <descripcion>${escaparXml(operacion.inmueble.descripcion)}</descripcion>\n`;
      if (operacion.inmueble.folioReal) xml += `        <folio_real>${escaparXml(operacion.inmueble.folioReal)}</folio_real>\n`;
      xml += `      </bien_operacion>\n`;
    }

    xml += `      <liquidacion>\n`;
    xml += `        <monto_operacion>${operacion.montoOperacionMxn.toFixed(2)}</monto_operacion>\n`;
    xml += `        <forma_pago>${escaparXml(operacion.formaPagoSat || '03')}</forma_pago>\n`;
    if (operacion.claveRastreo) xml += `        <clave_rastreo>${escaparXml(operacion.claveRastreo)}</clave_rastreo>\n`;
    xml += `      </liquidacion>\n`;

    xml += `    </operacion>\n`;
    xml += `  </aviso>\n`;
  }

  xml += `</archivo>`;

  const nombreArchivo = `SPPLD_NOTARIA_${notaria.numeroNotaria}_CONSOLIDADO_${periodoAnio}_${mesStr}.xml`;
  return { nombreArchivo, contenidoXml: xml };
}

/**
 * Genera el XML de la declaración de Informe en Ceros
 */
export function generarXmlInformeCeros(
  notaria: DatosAvisoNotariaXml,
  periodoAnio: number,
  periodoMes: number
): { nombreArchivo: string; contenidoXml: string } {
  const mesStr = String(periodoMes).padStart(2, '0');
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<archivo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
  xml += `  <sujeto_obligado>\n`;
  xml += `    <clave_sujeto_obligado>${escaparXml(notaria.claveSujetoObligado || `NOT-${notaria.numeroNotaria}`)}</clave_sujeto_obligado>\n`;
  xml += `    <rfc>${escaparXml(notaria.rfcNotario)}</rfc>\n`;
  xml += `    <numero_notaria>${escaparXml(notaria.numeroNotaria)}</numero_notaria>\n`;
  xml += `    <entidad_federativa>${escaparXml(notaria.entidadFederativa || '09')}</entidad_federativa>\n`;
  xml += `    <nombre_notario>${escaparXml(notaria.nombreNotario)}</nombre_notario>\n`;
  xml += `  </sujeto_obligado>\n`;
  xml += `  <informe_ceros periodo="${periodoAnio}${mesStr}">\n`;
  xml += `    <declaracion>En el periodo que se reporta no se celebraron actos u operaciones objeto de aviso en términos del Artículo 17 Fracción XII de la LFPIORPI.</declaracion>\n`;
  xml += `  </informe_ceros>\n`;
  xml += `</archivo>`;

  const nombreArchivo = `SPPLD_NOTARIA_${notaria.numeroNotaria}_CEROS_${periodoAnio}_${mesStr}.xml`;
  return { nombreArchivo, contenidoXml: xml };
}

/**
 * Descarga en el navegador el archivo XML generado
 */
export function descargarArchivoXmlEnNavegador(nombreArchivo: string, contenidoXml: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([contenidoXml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
