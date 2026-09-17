/**
 * Utilería para generación y empaquetado de archivos ZIP de expedientes notariales.
 * Implementación pura en TypeScript compatible con navegadores y Node.js (PKZip standard).
 */

export interface ArchivoParaZip {
  path: string;
  data: Uint8Array | string;
}

export interface OpcionesDescargaZip {
  escrituraNumero?: string | number;
  archivos: Array<{
    nombre: string;
    categoria: string;
    origen?: string;
    compareciente?: string | null;
    cotejado?: boolean;
    data: Uint8Array | string;
  }>;
}

/**
 * Tabla precomputada CRC-32 para checksum estándar de ZIP
 */
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

export function calcularCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Genera un archivo ZIP binario con la lista de archivos proporcionada
 */
export function crearArchivoZip(archivos: ArchivoParaZip[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileHeaders: Uint8Array[] = [];
  const centralDirectoryHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const archivo of archivos) {
    const rawData = typeof archivo.data === "string" 
      ? encoder.encode(archivo.data) 
      : archivo.data;

    const rawPath = encoder.encode(archivo.path.replace(/\\/g, "/"));
    const crc = calcularCrc32(rawData);
    const size = rawData.length;

    // Local file header (30 bytes + path length)
    const localHeader = new Uint8Array(30 + rawPath.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true);         // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
    localView.setUint16(8, 0, true);          // Compression method (0 = Stored)
    localView.setUint16(10, 0, true);         // File last mod time
    localView.setUint16(12, 0, true);         // File last mod date
    localView.setUint32(14, crc, true);       // CRC-32
    localView.setUint32(18, size, true);      // Compressed size
    localView.setUint32(22, size, true);      // Uncompressed size
    localView.setUint16(26, rawPath.length, true); // File name length
    localView.setUint16(28, 0, true);         // Extra field length
    localHeader.set(rawPath, 30);

    // Central directory header (46 bytes + path length)
    const cdHeader = new Uint8Array(46 + rawPath.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true);    // Central directory header signature
    cdView.setUint16(4, 20, true);            // Version made by
    cdView.setUint16(6, 20, true);            // Version needed to extract
    cdView.setUint16(8, 0x0800, true);        // UTF-8 flag
    cdView.setUint16(10, 0, true);            // Compression method
    cdView.setUint16(12, 0, true);            // File last mod time
    cdView.setUint16(14, 0, true);            // File last mod date
    cdView.setUint32(16, crc, true);          // CRC-32
    cdView.setUint32(20, size, true);         // Compressed size
    cdView.setUint32(24, size, true);         // Uncompressed size
    cdView.setUint16(28, rawPath.length, true); // File name length
    cdView.setUint16(30, 0, true);            // Extra field length
    cdView.setUint16(32, 0, true);            // File comment length
    cdView.setUint16(34, 0, true);            // Disk number start
    cdView.setUint16(36, 0, true);            // Internal file attributes
    cdView.setUint32(38, 0, true);            // External file attributes
    cdView.setUint32(42, offset, true);       // Relative offset of local header
    cdHeader.set(rawPath, 46);

    fileHeaders.push(localHeader, rawData);
    centralDirectoryHeaders.push(cdHeader);

    offset += localHeader.length + rawData.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cdh of centralDirectoryHeaders) {
    cdSize += cdh.length;
  }

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true);     // EOCD signature
  eocdView.setUint16(4, 0, true);              // Number of this disk
  eocdView.setUint16(6, 0, true);              // Disk where central directory starts
  eocdView.setUint16(8, archivos.length, true); // Number of central directory records on this disk
  eocdView.setUint16(10, archivos.length, true);// Total number of central directory records
  eocdView.setUint32(12, cdSize, true);        // Size of central directory
  eocdView.setUint32(16, cdOffset, true);      // Offset of start of central directory
  eocdView.setUint16(20, 0, true);             // Comment length

  const totalLength = offset + cdSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const part of fileHeaders) {
    result.set(part, pos);
    pos += part.length;
  }

  for (const part of centralDirectoryHeaders) {
    result.set(part, pos);
    pos += part.length;
  }

  result.set(eocd, pos);
  return result;
}

/**
 * Organiza los documentos de un expediente en una estructura canónica por carpetas
 * e incluye el manifiesto de auditoría en JSON y texto legible.
 */
export function estructurarExpedienteParaZip(opciones: OpcionesDescargaZip): Uint8Array {
  const archivosParaZip: ArchivoParaZip[] = [];
  const categoriasMap: Record<string, string> = {
    inmueble: "01_Inmueble_Objeto",
    compareciente: "02_Comparecientes_KYC",
    fiscal: "03_Fiscales_Pagos",
    interno: "04_Internos_Tramite",
  };

  const inventario: Array<{
    archivo: string;
    categoria: string;
    origen?: string;
    compareciente?: string | null;
    cotejado: boolean;
  }> = [];

  for (const doc of opciones.archivos) {
    const carpeta = categoriasMap[doc.categoria] || "04_Internos_Tramite";
    const rutaEnZip = `${carpeta}/${doc.nombre}`;

    archivosParaZip.push({
      path: rutaEnZip,
      data: doc.data,
    });

    inventario.push({
      archivo: rutaEnZip,
      categoria: doc.categoria,
      origen: doc.origen,
      compareciente: doc.compareciente,
      cotejado: !!doc.cotejado,
    });
  }

  // 1. Manifiesto JSON
  const manifiestoJson = JSON.stringify({
    sistema: "Notaría Pública No. 42 — Sistema Notarial Notarius",
    escritura_numero: opciones.escrituraNumero || "N/A",
    fecha_empaque: new Date().toISOString(),
    total_documentos: inventario.length,
    documentos: inventario,
  }, null, 2);

  archivosParaZip.push({
    path: "manifiesto_expediente.json",
    data: manifiestoJson,
  });

  // 2. Manifiesto TXT formal
  const manifiestoTxt = [
    "==================================================================",
    "          NOTARÍA PÚBLICA NO. 42 — EXPEDIENTE DIGITAL",
    "==================================================================",
    `Escritura: ${opciones.escrituraNumero || "S/N"}`,
    `Fecha de empaquetado: ${new Date().toLocaleString("es-MX")}`,
    `Total de documentos integrados: ${inventario.length}`,
    "------------------------------------------------------------------",
    "ÍNDICE DE DOCUMENTOS Y FE DE COTEJO NOTARIAL:",
    ...inventario.map((item, idx) => 
      `${idx + 1}. [${item.cotejado ? "COTEJADO CONTRA ORIGINAL" : "COPIA SIMPLE"}] ${item.archivo} (${item.compareciente ? "Compareciente: " + item.compareciente : "Instrumento"})`
    ),
    "==================================================================",
    "Cotejo y conservación conforme al Art. 17 LFPIORPI y Ley Notarial.",
    "==================================================================",
  ].join("\n");

  archivosParaZip.push({
    path: "manifiesto_expediente.txt",
    data: manifiestoTxt,
  });

  return crearArchivoZip(archivosParaZip);
}
