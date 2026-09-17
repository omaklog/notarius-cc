export type CategoriaDocumental =
  | "inmueble"
  | "compareciente"
  | "fiscal"
  | "interno";

export type TipoDocumentoExhibido =
  | "original"
  | "copia_certificada"
  | "copia_simple";

export type TipoDescargaExpediente =
  | "individual"
  | "zip_seleccion"
  | "pdf_compilado";

export type SemaforoExpediente = "verde" | "amarillo" | "rojo";

export interface TipoDocumentoNotarial {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaDocumental;
  descripcion?: string | null;
  requiere_cotejo_fisico: boolean;
  activo: boolean;
  created_at?: string;
}

export interface RequisitoDocumentalActo {
  id: string;
  acto_juridico_id: string;
  tipo_documento_id: string;
  tipo_documento_codigo?: string;
  tipo_documento_nombre?: string;
  categoria?: CategoriaDocumental;
  obligatorio: boolean;
  requiere_cotejo_fisico: boolean;
  rol_compareciente?: string | null;
  orden: number;
  activo: boolean;
  created_at?: string;
}

export interface RequisitoExpedienteEvaluado {
  tipo_documento_id: string;
  tipo_documento_codigo: string;
  tipo_documento_nombre: string;
  categoria: CategoriaDocumental;
  obligatorio: boolean;
  requiere_cotejo_fisico: boolean;
  rol_compareciente?: string | null;
  estado: "cargado" | "pendiente" | "dispensado";
  documento_id?: string | null;
  archivo_nombre?: string | null;
  archivo_path?: string | null;
  cotejado_contra_original: boolean;
  tipo_documento_exhibido?: TipoDocumentoExhibido | null;
  cotejado_por_id?: string | null;
  cotejado_por_nombre?: string | null;
  fecha_cotejo?: string | null;
  dispensado_por_id?: string | null;
  dispensado_por_nombre?: string | null;
  motivo_dispensa?: string | null;
}

export interface EvaluacionExpedienteResumen {
  escritura_id: string;
  total_requisitos: number;
  total_cumplidos: number;
  total_obligatorios: number;
  obligatorios_cumplidos: number;
  obligatorios_faltantes: string[];
  titulos_o_poderes_sin_cotejo: string[];
  semaforo: SemaforoExpediente;
  permite_protocolizar: boolean;
  requisitos: RequisitoExpedienteEvaluado[];
}

export interface ExpedienteItemConsolidado {
  documento_id: string;
  entidad_tipo: "escritura" | "compareciente";
  entidad_id: string;
  tipo_documento_id?: string | null;
  tipo_documento_codigo?: string | null;
  tipo_documento_nombre?: string | null;
  categoria: CategoriaDocumental;
  lado?: "anverso" | "reverso" | "completo" | null;
  archivo_nombre: string;
  archivo_path: string;
  mime_type: string;
  size_bytes?: number | null;
  cotejado_contra_original: boolean;
  tipo_documento_exhibido?: TipoDocumentoExhibido | null;
  cotejado_por?: string | null;
  cotejador_nombre?: string | null;
  fecha_cotejo?: string | null;
  notas_cotejo?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
  escritura_id: string;
  origen_documento: "escritura" | "compareciente";
  compareciente_id?: string | null;
  compareciente_nombre?: string | null;
}

export interface ExpedienteDispensa {
  id: string;
  escritura_id: string;
  tipo_documento_id: string;
  tipo_documento_nombre?: string;
  motivo: string;
  dispensado_por: string;
  dispensador_nombre?: string;
  created_at: string;
}

export interface ExpedienteDescargaLog {
  id: string;
  escritura_id: string;
  usuario_id: string;
  tipo_descarga: TipoDescargaExpediente;
  documentos_ids?: string[];
  total_documentos: number;
  bytes_estimados?: number | null;
  metadata?: Record<string, any>;
  created_at: string;
}
