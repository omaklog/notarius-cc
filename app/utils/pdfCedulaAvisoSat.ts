// ============================================================================
// app/utils/pdfCedulaAvisoSat.ts
// Generador institucional de la Cédula de Aviso SAT / UIF en PDF / HTML imprimible
// Conforme al Art. 17 Fracc. XII LFPIORPI para fedatarios públicos
// ============================================================================

export interface DatosNotariaMembrete {
  notarioTitular?: string;
  numeroNotaria?: string | number;
  entidadFederativa?: string;
  direccion?: string;
  telefono?: string;
}

export interface DatosCedulaAvisoSat {
  numeroInstrumento: string;
  libro?: string;
  fechaActo: string;
  actoJuridico: string;
  montoOperacionMxn: number;
  montoOperacionUma: number;
  umaVigente: number;
  calificacionAviso: string;
  fechaLimiteBase: string;
  diasProrrogaRfc: number;
  fechaLimiteEfectiva: string;
  estatusAviso: string;
  folioAcuseSat?: string | null;
  fechaPresentacionSat?: string | null;
  personas: Array<{
    rol: string;
    nombre: string;
    rfc?: string;
    curp?: string;
    beneficiarioControlador?: string;
  }>;
  inmueble?: {
    descripcion: string;
    ubicacion: string;
    folioReal?: string;
  };
  pago: {
    formaPago: string;
    institucionBancaria?: string;
    claveRastreo?: string;
    montoEfectivo?: number;
    cumpleTopeEfectivo: boolean;
  };
}

function formatMoneda(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '$ 0.00 MXN';
  return `$ ${Number(val).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MXN`;
}

/**
 * Genera el documento HTML institucional de la Cédula de Aviso SAT / UIF
 */
export function generarHtmlCedulaAvisoSat(
  datos: DatosCedulaAvisoSat,
  notaria: DatosNotariaMembrete = {}
): string {
  const titular = notaria.notarioTitular || 'Lic. Roberto Méndez';
  const numNotaria = notaria.numeroNotaria || '42';
  const entidad = notaria.entidadFederativa || 'Ciudad de México';
  const direccion = notaria.direccion || 'Av. Insurgentes Sur 1450, Piso 6, Col. Actipan, Benito Juárez, CDMX';

  const filasComparecientes = datos.personas && datos.personas.length > 0
    ? datos.personas.map((p, idx) => `
      <tr style="border-bottom: 1px solid #E2E6EC;">
        <td style="padding: 6px 8px; font-size: 11px; color: #5B6472; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-weight: bold; color: #1B3A5F;">${p.rol}</td>
        <td style="padding: 6px 8px; font-size: 11px; color: #1C222B;">
          ${p.nombre}
          ${p.beneficiarioControlador ? `<div style="font-size: 10px; color: #784D02;">Beneficiario Controlador: ${p.beneficiarioControlador}</div>` : ''}
        </td>
        <td style="padding: 6px 8px; font-size: 11px; font-family: monospace;">${p.rfc || 'NO REGISTRADO'}</td>
        <td style="padding: 6px 8px; font-size: 11px; font-family: monospace;">${p.curp || 'N/A'}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" style="padding: 10px; text-align: center; color: #5B6472; font-size: 11px;">Sin comparecientes registrados</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cédula de Aviso SAT / UIF — Instrumento ${datos.numeroInstrumento}</title>
  <style>
    @page { size: letter; margin: 15mm; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1C222B;
      background: #FFFFFF;
      margin: 0;
      padding: 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .header-table { width: 100%; border-bottom: 2px solid #1B3A5F; padding-bottom: 8px; margin-bottom: 14px; }
    .notary-title { font-size: 15px; font-weight: bold; color: #1B3A5F; text-transform: uppercase; }
    .notary-sub { font-size: 11px; color: #5B6472; }
    .doc-badge {
      background: #1B3A5F; color: #FFFFFF; padding: 4px 10px; border-radius: 4px;
      font-size: 11px; font-weight: bold; text-align: right; display: inline-block;
    }
    .section-title {
      font-size: 11px; font-weight: bold; color: #1B3A5F; background: #EEEDF1;
      padding: 5px 8px; margin-top: 12px; margin-bottom: 6px; border-left: 4px solid #A9762E;
      text-transform: uppercase;
    }
    .grid-2 { display: flex; gap: 12px; margin-bottom: 6px; }
    .grid-col { flex: 1; border: 1px solid #E2E6EC; border-radius: 4px; padding: 8px; font-size: 11px; }
    .grid-col strong { color: #1B3A5F; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { background: #F8FAFC; color: #1B3A5F; font-size: 11px; padding: 6px 8px; border-bottom: 1px solid #CBD2DC; text-align: left; }
    .badge-aviso {
      display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: bold; border-radius: 4px;
      background: #F4E8D6; color: #5C3E14; border: 1px solid #A9762E;
    }
    .badge-success { background: #D6EEDF; color: #14402A; border: 1px solid #2F6F4E; }
    .footer-note {
      font-size: 9.5px; color: #5B6472; text-align: justify; margin-top: 16px;
      border-top: 1px solid #E2E6EC; padding-top: 8px;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="notary-title">NOTARÍA PÚBLICA NÚMERO ${numNotaria}</div>
        <div class="notary-sub">${titular} · ${entidad}</div>
        <div class="notary-sub">${direccion}</div>
      </td>
      <td style="text-align: right;">
        <div class="doc-badge">CÉDULA DE CUMPLIMIENTO PLD</div>
        <div style="font-size: 10px; color: #5B6472; margin-top: 4px;">Art. 17 Fracc. XII LFPIORPI</div>
      </td>
    </tr>
  </table>

  <!-- Bloque I: Instrumento Notarial -->
  <div class="section-title">I. Datos del Instrumento Notarial</div>
  <div class="grid-2">
    <div class="grid-col">
      <div><strong>Instrumento Notarial:</strong> No. ${datos.numeroInstrumento}</div>
      <div><strong>Libro / Volumen:</strong> ${datos.libro || 'Ordinario'}</div>
      <div><strong>Fecha de Firma / Otorgamiento:</strong> ${datos.fechaActo}</div>
    </div>
    <div class="grid-col">
      <div><strong>Acto Jurídico Formalizado:</strong> ${datos.actoJuridico}</div>
      <div><strong>Actividad Vulnerable:</strong> SÍ (Art. 17 Fracc. XII LFPIORPI)</div>
      <div><strong>Calificación Legal:</strong> <span class="badge-aviso">${datos.calificacionAviso}</span></div>
    </div>
  </div>

  <!-- Bloque II: Cuantía y Umbrales en UMA -->
  <div class="section-title">II. Dictamen de Umbrales en UMA (Fecha del Acto)</div>
  <div class="grid-2">
    <div class="grid-col">
      <div><strong>Monto Total de Operación:</strong> <span style="font-family: monospace; font-weight: bold; color: #1B3A5F;">${formatMoneda(datos.montoOperacionMxn)}</span></div>
      <div><strong>Valor de la UMA Vigente a la Fecha:</strong> $ ${datos.umaVigente.toFixed(2)} MXN</div>
      <div><strong>Equivalente en UMAs:</strong> ${datos.montoOperacionUma.toLocaleString('es-MX', { minimumFractionDigits: 2 })} UMAs</div>
    </div>
    <div class="grid-col">
      <div><strong>Umbral Legal de Aviso:</strong> 16,050.00 UMAs</div>
      <div><strong>Condición Normativa:</strong> ${datos.montoOperacionUma >= 16050 ? '<span style="color: #A9762E; font-weight: bold;">SUPERADO (Obligación de Aviso Ordinario)</span>' : '<span style="color: #2F6F4E; font-weight: bold;">NO SUPERADO (Exento de Aviso)</span>'}</div>
      <div><strong>Plazo Legal (Día 17 + Prórroga):</strong> ${datos.fechaLimiteEfectiva} (+${datos.diasProrrogaRfc} días hábiles por RFC)</div>
    </div>
  </div>

  <!-- Bloque III: Comparecientes y Sujetos del Aviso -->
  <div class="section-title">III. Sujetos Obligados y Comparecientes</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th style="width: 120px;">Rol</th>
        <th>Nombre o Razón Social</th>
        <th style="width: 130px;">RFC</th>
        <th style="width: 150px;">CURP</th>
      </tr>
    </thead>
    <tbody>
      ${filasComparecientes}
    </tbody>
  </table>

  <!-- Bloque IV: Objeto / Inmueble -->
  ${datos.inmueble ? `
  <div class="section-title">IV. Identificación del Inmueble u Objeto de la Operación</div>
  <div class="grid-col" style="margin-bottom: 8px;">
    <div><strong>Descripción:</strong> ${datos.inmueble.descripcion}</div>
    <div><strong>Ubicación:</strong> ${datos.inmueble.ubicacion}</div>
    ${datos.inmueble.folioReal ? `<div><strong>Folio Real / Registro Público:</strong> ${datos.inmueble.folioReal}</div>` : ''}
  </div>` : ''}

  <!-- Bloque V: Liquidación y Control de Efectivo -->
  <div class="section-title">V. Liquidación y Cumplimiento de Topes de Efectivo (Art. 32 LFPIORPI)</div>
  <div class="grid-2">
    <div class="grid-col">
      <div><strong>Medio de Pago Principal:</strong> ${datos.pago.formaPago}</div>
      ${datos.pago.institucionBancaria ? `<div><strong>Institución Bancaria:</strong> ${datos.pago.institucionBancaria}</div>` : ''}
      ${datos.pago.claveRastreo ? `<div><strong>Clave de Rastreo SPEI / Folio:</strong> <span style="font-family: monospace;">${datos.pago.claveRastreo}</span></div>` : ''}
    </div>
    <div class="grid-col">
      <div><strong>Monto en Efectivo:</strong> ${formatMoneda(datos.pago.montoEfectivo || 0)}</div>
      <div><strong>Certificación de Tope Legal de Efectivo:</strong> ${datos.pago.cumpleTopeEfectivo ? '<span style="color: #2F6F4E; font-weight: bold;">CUMPLE (Dentro del límite legal de 8,025 UMAs)</span>' : '<span style="color: #B23A34; font-weight: bold;">EXCEDE LÍMITE LEGAL</span>'}</div>
    </div>
  </div>

  <!-- Bloque VI: Estatus de Presentación y Acuse SAT -->
  <div class="section-title">VI. Control de Presentación ante el Portal SPPLD (SAT)</div>
  <div class="grid-col" style="background: ${datos.estatusAviso === 'presentado' ? '#F4FBF7' : '#FFFDF9'}; border-color: ${datos.estatusAviso === 'presentado' ? '#2F6F4E' : '#A9762E'};">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div><strong>Estatus del Trámite:</strong> ${datos.estatusAviso === 'presentado' ? '<span class="badge-aviso badge-success">PRESENTADO ANTE EL SAT</span>' : '<span class="badge-aviso">PENDIENTE DE CARGA EN PORTAL</span>'}</div>
        ${datos.folioAcuseSat ? `<div><strong>Folio Oficial de Aceptación SAT:</strong> <span style="font-family: monospace; font-weight: bold; color: #1B3A5F;">${datos.folioAcuseSat}</span></div>` : ''}
        ${datos.fechaPresentacionSat ? `<div><strong>Fecha y Hora de Aceptación:</strong> ${datos.fechaPresentacionSat}</div>` : ''}
      </div>
      <div style="text-align: right;">
        <div style="font-size: 10px; color: #5B6472;">Fecha Límite Legal Efectiva:</div>
        <div style="font-size: 12px; font-weight: bold; color: #1B3A5F;">${datos.fechaLimiteEfectiva}</div>
      </div>
    </div>
  </div>

  <div class="footer-note">
    Constancia documental expedida en estricto cumplimiento al régimen de Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita (LFPIORPI). La información de este instrumento se conserva bajo resguardo legal y secreto profesional por el término mínimo de 10 años conforme al Artículo 18 de la citada Ley.
  </div>
</body>
</html>`;
}

/**
 * Dispara la impresión de la Cédula de Aviso en una ventana emergente para guardarla como PDF
 */
export function imprimirCedulaAvisoSat(
  datos: DatosCedulaAvisoSat,
  notaria?: DatosNotariaMembrete
): void {
  const html = generarHtmlCedulaAvisoSat(datos, notaria);
  if (typeof window === 'undefined') return;

  const ventana = window.open('', '_blank', 'width=900,height=800');
  if (!ventana) {
    alert('Por favor permita las ventanas emergentes para visualizar e imprimir la Cédula de Aviso SAT.');
    return;
  }

  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();

  ventana.onload = () => {
    ventana.focus();
    setTimeout(() => {
      ventana.print();
    }, 250);
  };
}

/**
 * Genera un Blob HTML imprimible
 */
export function generarBlobHtmlCedulaAvisoSat(
  datos: DatosCedulaAvisoSat,
  notaria: DatosNotariaMembrete = {}
): Blob {
  const html = generarHtmlCedulaAvisoSat(datos, notaria);
  return new Blob([html], { type: 'text/html;charset=utf-8' });
}
