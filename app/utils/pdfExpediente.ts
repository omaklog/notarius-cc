/**
 * Utilería para generación de carátula notarial foliada e índice consolidado de expedientes en PDF.
 */

export interface DocumentoParaCaratula {
  nombre: string;
  categoria: string;
  origen?: string;
  compareciente?: string | null;
  cotejado: boolean;
  tipo_exhibido?: string | null;
  cotejado_por?: string | null;
  fecha_cotejo?: string | null;
}

export interface DatosCaratulaExpediente {
  escrituraNumero: string | number;
  actoJuridico: string;
  notarioTitular?: string;
  fechaEmision: string;
  documentos: DocumentoParaCaratula[];
}

/**
 * Genera el documento HTML formateado para la carátula formal e índice foliado del expediente
 * listo para renderizar, imprimir a PDF o integrar al consolidado notarial.
 */
export function generarHtmlCaratulaExpediente(datos: DatosCaratulaExpediente): string {
  const filas = datos.documentos.map((doc, idx) => {
    const estadoCotejo = doc.cotejado
      ? `<span style="color: #2F6F4E; font-weight: bold;">✔ COTEJADO (${(doc.tipo_exhibido || "ORIGINAL").toUpperCase()})</span>`
      : `<span style="color: #A9762E;">COPIA SIMPLE</span>`;
    
    const detalleCotejo = doc.cotejado && doc.cotejado_por
      ? `<br><small style="color: #5B6472;">Fe por: ${doc.cotejado_por} (${doc.fecha_cotejo ? new Date(doc.fecha_cotejo).toLocaleDateString("es-MX") : "S/F"})</small>`
      : "";

    return `
      <tr style="border-bottom: 1px solid #E2E6EC;">
        <td style="padding: 10px 8px; text-align: center; font-family: monospace; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px 8px;">
          <strong style="color: #1B3A5F;">${doc.nombre}</strong>
          ${detalleCotejo}
        </td>
        <td style="padding: 10px 8px; text-transform: capitalize; color: #5B6472;">${doc.categoria}</td>
        <td style="padding: 10px 8px;">${doc.compareciente ? "Compareciente: " + doc.compareciente : "Instrumento Notarial"}</td>
        <td style="padding: 10px 8px; font-size: 12px;">${estadoCotejo}</td>
      </tr>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Carátula de Expediente — Escritura ${datos.escrituraNumero}</title>
  <style>
    @page { size: letter; margin: 20mm; }
    body { font-family: "IBM Plex Sans", -apple-system, sans-serif; color: #1C222B; margin: 0; padding: 24px; background: #FFF; }
    .header { border-bottom: 3px solid #1B3A5F; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .titulo-notaria { color: #1B3A5F; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .subtitulo { color: #A9762E; font-size: 14px; font-weight: 600; }
    .metadatos { background: #F8FAFC; border: 1px solid #CBD2DC; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
    .metadatos-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th { background: #F0F2F4; color: #1B3A5F; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #CBD2DC; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #CBD2DC; text-align: center; font-size: 11px; color: #5B6472; }
    .sello-fe { display: inline-block; border: 2px solid #A9762E; border-radius: 4px; padding: 8px 16px; color: #A9762E; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="titulo-notaria">Notaría Pública No. 42</div>
      <div class="subtitulo">Lic. Notario Titular · Ciudad de México</div>
    </div>
    <div style="text-align: right; font-size: 13px; color: #5B6472;">
      <div>EXPEDIENTE NOTARIAL DIGITAL</div>
      <div><strong>Escritura No. ${datos.escrituraNumero}</strong></div>
    </div>
  </div>

  <div class="metadatos">
    <div class="metadatos-grid">
      <div><strong>Acto Jurídico:</strong> ${datos.actoJuridico}</div>
      <div><strong>Fecha de Emisión:</strong> ${datos.fechaEmision}</div>
      <div><strong>Total de Documentos:</strong> ${datos.documentos.length} fojas/piezas</div>
      <div><strong>Custodia:</strong> Archivo Notarial Digital (Art. 17 LFPIORPI)</div>
    </div>
  </div>

  <h3 style="color: #1B3A5F; margin-bottom: 8px;">Inventario e Índice Foliado de Documentos</h3>
  <p style="font-size: 12px; color: #5B6472; margin-top: 0;">Relación de constancias, títulos e identificaciones integradas al apéndice del instrumento.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Documento</th>
        <th style="width: 120px;">Categoría</th>
        <th style="width: 180px;">Origen / Titular</th>
        <th style="width: 140px;">Fe de Cotejo</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <div style="text-align: center; margin-top: 40px;">
    <div class="sello-fe">FE PÚBLICA DE COTEJO NOTARIAL CONFORME A DERECHO</div>
    <div style="margin-top: 24px; font-size: 12px; color: #5B6472;">
      Doy Fe que los documentos descritos corresponden fielmente a los originales y copias tenidas a la vista.
    </div>
  </div>

  <div class="footer">
    Sistema de Administración Notarial · Notaría Pública No. 42 · Conservación obligatoria por 10 años conforme a la legislación notarial mexicana.
  </div>
</body>
</html>
  `.trim();
}
