export type CanalNotificacion = 'correo' | 'whatsapp' | 'sms'

export type EstatusNotificacion = 'pendiente' | 'enviado' | 'entregado' | 'leido' | 'fallido'

export type TipoEventoNotarial =
  | 'tramite_avance'
  | 'pago_liquidado'
  | 'orden_pago_emitida'
  | 'cita_firma'
  | 'testimonio_listo'
  | 'manual'

export interface VariablesNotificacion {
  nombre_cliente?: string
  numero_instrumento?: string | number
  acto?: string
  dependencia?: string
  folio_tramite?: string
  monto?: string | number
  fecha_cita?: string
  notaria?: string
  [key: string]: any
}

export interface PlantillaNotificacion {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  canal: CanalNotificacion
  asunto?: string | null
  cuerpo: string
  variables_disponibles: string[]
  requiere_confirmacion: boolean
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface ArchivoAdjuntoNotificacion {
  nombre: string
  url: string
  tamano_bytes?: number
  tipo_mime?: string
}

export interface NotificacionBitacoraItem {
  id: string
  plantilla_id?: string | null
  escritura_id?: string | null
  compareciente_id?: string | null
  canal: CanalNotificacion
  destinatario_nombre: string
  destinatario_contacto: string
  asunto?: string | null
  cuerpo_renderizado: string
  estatus: EstatusNotificacion
  tipo_evento: TipoEventoNotarial
  intentos_envio: number
  error_detalle?: string | null
  archivos_adjuntos?: ArchivoAdjuntoNotificacion[]
  metadata: Record<string, any>
  creado_por?: string | null
  created_at: string
  updated_at: string
  // Relaciones hidratadas
  escrituras?: {
    instrumento: number
    anio?: number
  } | null
  comparecientes?: {
    nombre: string
  } | null
}

export interface NotificacionesKpis {
  total_enviados_mes: number
  tasa_entrega_porcentaje: number
  total_whatsapp: number
  total_correo: number
  total_sms: number
  total_fallidos: number
  pendientes_reintento: number
}

export interface FiltrosNotificaciones {
  canal?: CanalNotificacion | 'todos'
  estatus?: EstatusNotificacion | 'todos'
  busqueda?: string
  escritura_id?: string
  fecha_inicio?: string
  fecha_fin?: string
}

export interface PayloadEnviarNotificacion {
  plantilla_id?: string
  escritura_id?: string
  compareciente_id?: string
  canal: CanalNotificacion
  destinatario_nombre: string
  destinatario_contacto: string
  asunto?: string
  cuerpo: string
  tipo_evento?: TipoEventoNotarial
  variables?: VariablesNotificacion
  archivos_adjuntos?: ArchivoAdjuntoNotificacion[]
}

export interface ResultadoDespachoNotificacion {
  ok: boolean
  notificacion_id?: string
  estatus: EstatusNotificacion
  mensaje_proveedor?: string
  whatsapp_native_url?: string
  whatsapp_web_url?: string
  error?: string
}

export interface ComparecienteOpcionNotificacion {
  id: string
  nombre: string
  telefono?: string | null
  email?: string | null
  tipo_persona?: string
}

export interface EscrituraOpcionNotificacion {
  id: string
  instrumento: number
  anio?: number
  tipo_acto?: string | null
  estado?: string | null
}

