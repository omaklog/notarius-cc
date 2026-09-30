export type EstatusLibro = 'abierto' | 'cerrado'
export type EstatusActaCotejo = 'registrado' | 'autorizado' | 'entregado' | 'cancelado'

export interface LibroCotejo {
  id: string
  numero_libro: number
  anio: number
  fecha_apertura: string
  fecha_cierre?: string | null
  limite_actas: number
  total_actas: number
  estatus: EstatusLibro
  acta_clausura_texto?: string | null
  notas?: string | null
  cerrado_por?: string | null
  created_at?: string
  created_by?: string | null
  updated_at?: string
}

export interface ActaCotejo {
  id: string
  libro_id: string
  numero_acta: number
  anio: number
  fecha_cotejo: string
  solicitante_nombre: string
  solicitante_identificacion?: string | null
  solicitante_compareciente_id?: string | null
  tipo_documento: string
  documento_descripcion: string
  numero_hojas: number
  numero_tantos: number
  archivo_original_url?: string | null
  archivo_copia_certificada_url?: string | null
  observaciones?: string | null
  estatus: EstatusActaCotejo
  motivo_cancelacion?: string | null
  cancelado_en?: string | null
  cancelado_por?: string | null
  notario_actuante?: string | null
  created_at?: string
  created_by?: string | null
  updated_at?: string

  // Objeto anidado de relación
  libro?: LibroCotejo | null
}

export interface RegistrarActaCotejoPayload {
  libro_id: string
  solicitante_nombre: string
  solicitante_identificacion?: string | null
  solicitante_compareciente_id?: string | null
  tipo_documento: string
  documento_descripcion: string
  numero_hojas: number
  numero_tantos: number
  observaciones?: string | null
  notario_actuante?: string | null
  estatus?: EstatusActaCotejo
}

export interface CancelarActaCotejoPayload {
  acta_id: string
  motivo_cancelacion: string
}

export interface CerrarLibroPayload {
  libro_id: string
  acta_clausura_texto?: string
}

export interface FiltrosCotejo {
  busqueda?: string
  libro_id?: string
  tipo_documento?: string
  estatus?: EstatusActaCotejo | 'todos'
  fecha_desde?: string
  fecha_hasta?: string
}

export interface MetricasCotejo {
  actasHoy: number
  actasAutorizadasLibro: number
  totalTantosExpedidos: number
  actasCanceladas: number
}
