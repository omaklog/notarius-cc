// ============================================================================
// app/types/avisosSat.ts
// Definición de tipos e interfaces para el módulo de Avisos SAT / UIF (LFPIORPI)
// ============================================================================

export type TipoAvisoSat = 'ordinario' | 'ceros' | '24_horas' | 'modificatorio';

export type EstatusAvisoSat = 'pendiente' | 'xml_generado' | 'presentado' | 'extemporaneo';

export interface AvisoSatItem {
  id: string;
  escritura_id?: string | null;
  periodo_anio: number;
  periodo_mes: number;
  tipo_aviso: TipoAvisoSat;
  estatus: EstatusAvisoSat;
  folio_acuse_sat?: string | null;
  fecha_presentacion_sat?: string | null;
  archivo_xml_nombre?: string | null;
  archivo_xml_url?: string | null;
  archivo_acuse_pdf_url?: string | null;
  monto_operacion_mxn: number;
  monto_operacion_uma: number;
  detalles_json: Record<string, any>;
  aviso_previo_id?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;

  // Propiedades hidratadas para UI
  numero_instrumento?: string;
  fecha_acto?: string;
  acto_juridico_nombre?: string;
  es_actividad_vulnerable?: boolean;
  cliente_principal?: string;
  responsable_nombre?: string;
}

export interface AvisoSatBitacoraItem {
  id: string;
  aviso_id: string;
  evento: 'creacion' | 'xml_generado' | 'pdf_descargado' | 'acuse_registrado' | 'ceros_declarado' | 'modificado';
  detalles: Record<string, any>;
  created_by?: string | null;
  created_at: string;
}

export interface DictamenAvisoSat {
  requiere_aviso: boolean;
  tipo_aviso: 'ordinario' | '24_horas' | 'ceros' | 'exento';
  monto_mxn: number;
  monto_uma: number;
  uma_vigente: number;
  umbral_aviso_uma: number;
  excede_umbral: boolean;
  es_actividad_vulnerable: boolean;
  tiene_coincidencia_lpb: boolean;
  fundamento_legal: string;
  mensaje_diagnostico: string;
}

export interface FechaLimiteSatResult {
  fecha_limite_base: string;        // YYYY-MM-DD (día 17 del mes siguiente o siguiente día hábil)
  dias_prorroga_rfc: number;        // 1 a 5 días hábiles según sexto dígito de RFC
  fecha_limite_efectiva: string;    // YYYY-MM-DD
  dias_habiles_restantes: number;   // Días hábiles respecto a hoy
  semaforo_urgencia: 'verde' | 'amarillo' | 'rojo';
  texto_tiempo_restante: string;    // e.g. "Quedan 8 días hábiles", "Vence hoy", "Vencido hace 2 días"
}

export interface KpisAvisosSatPeriodo {
  periodo_anio: number;
  periodo_mes: number;
  total_operaciones_vulnerables: number;
  total_sujetas_aviso: number;
  total_presentados: number;
  total_pendientes: number;
  total_avisos_24h: number;
  monto_total_reportable_mxn: number;
  monto_total_reportable_uma: number;
  fecha_limite_base: string;
  dias_prorroga_rfc: number;
  fecha_limite_efectiva: string;
  dias_habiles_restantes: number;
  semaforo_urgencia: 'verde' | 'amarillo' | 'rojo';
  requiere_informe_ceros: boolean;
  informe_ceros_presentado: boolean;
}

export interface DatosAvisoNotariaXml {
  claveSujetoObligado: string;
  rfcNotario: string;
  numeroNotaria: string;
  entidadFederativa: string;
  nombreNotario: string;
}

export interface DatosOperacionAvisoXml {
  escrituraId: string;
  numeroInstrumento: string;
  volumenOLibro?: string;
  fechaOperacion: string; // YYYY-MM-DD
  tipoActoSat: string;    // e.g. "1201"
  descripcionActo: string;
  montoOperacionMxn: number;
  formaPagoSat: string;   // e.g. "03" Transferencia
  institucionBancaria?: string;
  claveRastreo?: string;
  montoEfectivo?: number;
  
  // Comparecientes
  personas: Array<{
    rol: '1' | '2' | '3' | '4'; // 1 Otorgante, 2 Adquirente, 3 Apoderado, 4 Beneficiario Controlador
    tipoPersona: 'F' | 'M';
    nombreRazonSocial: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    rfc?: string;
    curp?: string;
    fechaNacimientoOConstitucion?: string;
  }>;

  // Inmueble (si aplica)
  inmueble?: {
    tipoBien: string;
    descripcion: string;
    calle?: string;
    numeroExterior?: string;
    colonia?: string;
    codigoPostal?: string;
    municipio?: string;
    entidadFederativa?: string;
    folioReal?: string;
  };
}
