/**
 * Utilería para la generación e impresión de la Cédula Técnica Notarial de Georreferenciación y Delimitación Poligonal en PDF.
 * Diseño optimizado para hoja membretada notarial en una sola página.
 */

export interface DatosColindanciaReporte {
  orientacion: string
  distancia_m?: number | null
  colinda_con: string
}

export interface DatosReporteGeorreferenciacion {
  instrumentoNumero: number | string
  volumen?: number | string | null
  actoJuridico: string
  objeto?: string
  fechaCelebracion?: string | null
  notarioTitular?: string
  numeroNotaria?: string | number
  entidadFederativa?: string

  // Datos del predio
  etiqueta: string
  descripcion?: string | null
  superficieCalculadaM2: number | null
  superficieDeclaradaM2?: number | null
  centroide?: { lat: number; lng: number } | null
  coordenadasPoligono: [number, number][]
  colindancias: DatosColindanciaReporte[]
  mapaCapturaUrl?: string | null
  fotoFachadaUrl?: string | null
  fechaEmision?: string
}

export function formatearMetros(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00'
  return Number(val).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Genera el documento HTML profesional para la Cédula Técnica Notarial
 */
export function generarHtmlCedulaGeorreferenciacion(datos: DatosReporteGeorreferenciacion): string {
  const fechaHoy = datos.fechaEmision || new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Calcular perímetro total si hay distancias
  const perimetroTotal = datos.colindancias.reduce((acc, c) => acc + (c.distancia_m || 0), 0)

  // Filas compactas de colindancias
  const filasColindancias = datos.colindancias.length > 0
    ? datos.colindancias.map((col, idx) => `
      <tr style="border-bottom: 1px solid #E2E6EC;">
        <td style="padding: 5px 6px; text-align: center; font-weight: bold; color: #1B3A5F; font-size: 10px;">Lado ${idx + 1}</td>
        <td style="padding: 5px 6px; font-weight: 600; color: #A9762E; font-size: 10.5px;">${col.orientacion}</td>
        <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-size: 10.5px; white-space: nowrap;">
          ${col.distancia_m ? formatearMetros(col.distancia_m) + ' m' : '—'}
        </td>
        <td style="padding: 5px 6px; color: #1C222B; font-size: 10px;">${col.colinda_con || 'Sin especificar'}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="4" style="padding: 8px; text-align: center; color: #5B6472; font-style: italic; font-size: 10px;">
          No se registraron linderos específicos para este predio.
        </td>
      </tr>
    `

  // Coordenadas de centroide formateadas
  const centroideTexto = datos.centroide
    ? `Lat: ${datos.centroide.lat.toFixed(6)}, Lng: ${datos.centroide.lng.toFixed(6)}`
    : 'No determinado'

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cédula Técnica de Georreferenciación — Instrumento ${datos.instrumentoNumero}</title>
  <style>
    @page {
      size: letter;
      margin: 10mm 14mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1C222B;
      margin: 0;
      padding: 14px 18px;
      background: #FFFFFF;
      font-size: 11px;
      line-height: 1.35;
    }
    @media print {
      body {
        padding: 0 !important;
      }
    }
    .header {
      border-bottom: 2px solid #1B3A5F;
      padding-bottom: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .titulo-notaria {
      color: #1B3A5F;
      font-size: 16px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .subtitulo-notaria {
      color: #A9762E;
      font-size: 11.5px;
      font-weight: 600;
      margin-top: 1px;
    }
    .folio-box {
      text-align: right;
      font-size: 10.5px;
      color: #5B6472;
      line-height: 1.25;
    }
    .folio-box strong {
      font-size: 13px;
      color: #1B3A5F;
      display: block;
    }
    .cedula-badge {
      background: #1B3A5F;
      color: #FFFFFF;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      margin-bottom: 10px;
    }
    .top-columns-grid {
      display: grid;
      grid-template-columns: 44% 56%;
      gap: 12px;
      margin-bottom: 12px;
      align-items: stretch;
    }
    .info-card {
      background: #F8FAFC;
      border: 1px solid #CBD2DC;
      border-radius: 5px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .info-card h4 {
      margin: 0 0 6px 0;
      color: #1B3A5F;
      font-size: 11px;
      text-transform: uppercase;
      border-bottom: 1px solid #E2E6EC;
      padding-bottom: 3px;
      font-weight: 700;
    }
    .campo {
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .campo-label {
      color: #5B6472;
      font-weight: 500;
      font-size: 10.5px;
    }
    .campo-valor {
      font-weight: 600;
      color: #1C222B;
      text-align: right;
      font-size: 11px;
    }
    .campo-descripcion {
      margin-top: 6px;
      border-top: 1px dashed #CBD2DC;
      padding-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    th {
      background: #F0F2F4;
      color: #1B3A5F;
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
      border-bottom: 1.5px solid #CBD2DC;
      text-transform: uppercase;
      font-size: 9.5px;
    }
    .perimetro-box {
      background: #F0F4F8;
      border: 1px solid #CBD2DC;
      padding: 4px 8px;
      border-radius: 4px;
      margin-top: 6px;
      font-size: 10.5px;
      display: flex;
      justify-content: space-between;
      font-weight: 600;
    }
    .visuales-grid {
      display: grid;
      grid-template-columns: ${datos.fotoFachadaUrl ? '1.25fr 1fr' : '1fr'};
      gap: 12px;
      margin-bottom: 10px;
    }
    .visual-box {
      border: 1px solid #CBD2DC;
      border-radius: 5px;
      padding: 8px;
      background: #F8FAFC;
      text-align: center;
    }
    .visual-title {
      font-size: 10.5px;
      font-weight: bold;
      color: #1B3A5F;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .visual-img {
      max-width: 100%;
      height: 250px;
      object-fit: contain;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #E2E6EC;
    }
    .footer-fe {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #CBD2DC;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5px;
      color: #5B6472;
    }
    .sello-recuadro {
      border: 1.5px solid #A9762E;
      border-radius: 4px;
      padding: 6px 12px;
      color: #A9762E;
      font-weight: bold;
      font-size: 9.5px;
      text-align: center;
      line-height: 1.25;
    }
  </style>
</head>
<body>
  <!-- Encabezado Notarial Compacto -->
  <div class="header">
    <div>
      <div class="titulo-notaria">Notaría Pública No. ${datos.numeroNotaria || 42}</div>
      <div class="subtitulo-notaria">${datos.notarioTitular || 'Lic. Notario Titular'} · ${datos.entidadFederativa || 'Ciudad de México'}</div>
    </div>
    <div class="folio-box">
      <div style="text-transform: uppercase; font-weight: 600; color: #A9762E;">Expediente Notarial Digital</div>
      <strong>Instrumento No. ${datos.instrumentoNumero}</strong>
      <div>Acto: ${datos.actoJuridico}${datos.volumen ? ' · Volumen: ' + datos.volumen : ''}</div>
    </div>
  </div>

  <div class="cedula-badge">
    Cédula Técnica de Georreferenciación y Delimitación Inmobiliaria
  </div>

  <!-- Fila Superior Dividida: Identificación del Inmueble (Izq) | Medidas y Colindancias (Der) -->
  <div class="top-columns-grid">
    <!-- Columna Izquierda: Identificación del Inmueble -->
    <div class="info-card">
      <div>
        <h4>Identificación del Inmueble</h4>
        <div class="campo">
          <span class="campo-label">Lote / Identificador:</span>
          <span class="campo-valor" style="color: #1B3A5F; font-size: 11.5px;">${datos.etiqueta}</span>
        </div>
        <div class="campo">
          <span class="campo-label">Superficie Terreno Calculada:</span>
          <span class="campo-valor" style="color: #2F6F4E;">
            ${datos.superficieCalculadaM2 ? formatearMetros(datos.superficieCalculadaM2) + ' m²' : '0.00 m²'}
            <small style="color: #5B6472; display: block; font-weight: normal; font-size: 9px;">(Aprox. satelital WGS84)</small>
          </span>
        </div>
        <div class="campo">
          <span class="campo-label">Superficie Declarada en Título:</span>
          <span class="campo-valor">
            ${datos.superficieDeclaradaM2 ? formatearMetros(datos.superficieDeclaradaM2) + ' m²' : 'No declarada'}
          </span>
        </div>
        <div class="campo">
          <span class="campo-label">Centroide Geográfico:</span>
          <span class="campo-valor" style="font-size: 9.5px;">${centroideTexto}</span>
        </div>
      </div>

      <!-- Descripción y Referencias de Ubicación integradas en la tarjeta -->
      <div class="campo-descripcion">
        <span class="campo-label" style="display: block; font-size: 9.5px; margin-bottom: 2px;">Descripción y Referencias:</span>
        <div style="font-size: 10px; color: #1C222B;">
          ${datos.descripcion || 'Acceso por calle principal frente a parque'}
        </div>
      </div>
    </div>

    <!-- Columna Derecha: Medidas y Colindancias -->
    <div class="info-card">
      <div>
        <h4>Medidas y Colindancias Orientadas</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 52px; text-align: center;">Tramo</th>
              <th style="width: 80px;">Rumbo</th>
              <th style="width: 75px; text-align: right;">Distancia</th>
              <th>Colindancia</th>
            </tr>
          </thead>
          <tbody>
            ${filasColindancias}
          </tbody>
        </table>
      </div>

      <div class="perimetro-box">
        <span>Perímetro Total Calculado:</span>
        <span style="font-family: monospace; font-size: 11px;">${formatearMetros(perimetroTotal)} metros lineales</span>
      </div>
    </div>
  </div>

  <!-- Sección Visual: Captura del Mapa y Fotografía de Fachada Lado a Lado -->
  <div class="visuales-grid">
    <div class="visual-box">
      <div class="visual-title">Plano Geográfico y Delimitación Poligonal</div>
      ${datos.mapaCapturaUrl
        ? `<img src="${datos.mapaCapturaUrl}" class="visual-img" alt="Delimitación de Polígono" />`
        : `<div class="visual-img" style="display:flex;align-items:center;justify-content:center;color:#5B6472;">Plano geométrico trazado (${datos.coordenadasPoligono.length} vértices)</div>`
      }
      <div style="font-size: 9px; color: #5B6472; margin-top: 3px;">
        Proyección cartográfica sobre elipsoide WGS84 · OpenStreetMap / Esri World Imagery
      </div>
    </div>

    ${datos.fotoFachadaUrl ? `
    <div class="visual-box">
      <div class="visual-title">Fotografía de Fachada y Acceso</div>
      <img src="${datos.fotoFachadaUrl}" class="visual-img" alt="Fotografía de Fachada" />
      <div style="font-size: 9px; color: #5B6472; margin-top: 3px;">
        Constancia testimonial incorporada al Expediente Notarial Digital
      </div>
    </div>
    ` : ''}
  </div>

  <!-- Pie y Fe Notarial -->
  <div class="footer-fe">
    <div>
      <div>Emisión de Cédula: <strong>${fechaHoy}</strong></div>
      <div>Sistema Integral de Gestión Notarial · notarius-cc</div>
      <div>Este documento integra formalmente el apéndice de la escritura correspondiente.</div>
    </div>
    <div class="sello-recuadro">
      CÉDULA CERTIFICADA<br>
      NOTARÍA PÚBLICA No. ${datos.numeroNotaria || 42}<br>
      COTEJO Y CONSTANCIA GEOGRÁFICA
    </div>
  </div>
</body>
</html>
  `
}
