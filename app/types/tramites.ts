export type FaseProcesal =
  | 'previo'
  | 'firma_otorgamiento'
  | 'posterior_fiscal'
  | 'inscripcion_definitiva'
  | 'entrega_cliente'

export type EstadoTramite =
  | 'solicitado'
  | 'en_proceso'
  | 'ingresado_dependencia'
  | 'prevenido_observado'
  | 'subsanado'
  | 'concluido_favorable'
  | 'rechazado_cancelado'

export type SemaforoTramite = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris'

export interface DependenciaOficial {
  id: string
  sigla: string
  nombre: string
  clave_numerica?: number | null
  direccion?: string | null
  portal_web?: string | null
  dias_habiles_compromiso: number
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface TipoTramiteNotarial {
  id: string
  dependencia_id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  fase_default: FaseProcesal
  dias_habiles_compromiso: number
  requerido_protocolizacion: boolean
  activo: boolean
  dependencia?: DependenciaOficial
}

export interface TramitePrevencion {
  id: string
  tramite_id: string
  folio_prevencion: string
  oficio_observacion?: string | null
  motivo_observacion: string
  registrador_nombre?: string | null
  fecha_notificacion: string
  fecha_limite_subsanacion: string
  subsanado: boolean
  fecha_subsanacion?: string | null
  folio_reingreso?: string | null
  documento_subsanacion_id?: string | null
  notas_subsanacion?: string | null
  created_at?: string
  updated_at?: string
}

export interface TramiteEscritura {
  id: string
  escritura_id: string
  tipo_tramite_id: string
  dependencia_id: string
  fase: FaseProcesal
  estado: EstadoTramite
  folio_dependencia?: string | null
  responsable_id?: string | null
  fecha_solicitud: string
  fecha_ingreso?: string | null
  fecha_limite_estimada?: string | null
  fecha_conclusion?: string | null
  orden_pago_id?: string | null
  documento_resultado_id?: string | null
  observaciones?: string | null
  motivo_cancelacion?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface TramiteResumen extends TramiteEscritura {
  tipo_tramite_nombre?: string
  tipo_tramite_codigo?: string
  dependencia_sigla?: string
  dependencia_nombre?: string
  responsable_nombre?: string
  escritura_instrumento?: string | null
  escritura_expediente?: string | null
  acto_nombre?: string | null
  dias_habiles_restantes?: number
  semaforo?: SemaforoTramite
  prevenciones?: TramitePrevencion[]
}

export interface FiltrosTramites {
  busqueda?: string
  fase?: FaseProcesal | null
  dependencia_id?: string | null
  estado?: EstadoTramite | null
  responsable_id?: string | null
  semaforo?: SemaforoTramite | null
  fecha_desde?: string | null
  fecha_hasta?: string | null
}

export interface PasoTramite {
  id: number
  nombre: string
  orden: number
  dependencia_clave: number
  dependencia_id?: string | null
  genera_orden_pago: boolean
  activo: boolean
  dependencia_sigla?: string
  dependencia_nombre?: string
  created_at?: string
  updated_at?: string
}

export interface HistorialPasoEscritura {
  registro_id: string
  escritura_id: string
  paso_id: number
  paso_nombre: string
  paso_orden: number
  genera_orden_pago: boolean
  dependencia_clave: number
  dependencia_id?: string | null
  dependencia_sigla?: string | null
  dependencia_nombre?: string | null
  folio_volante?: string | null
  notas?: string | null
  fecha_registro: string
  completado?: boolean
  completado_por?: string | null
  completado_por_nombre?: string | null
  orden_pago_id?: string | null
  orden_pago_folio?: string | null
  orden_pago_monto?: number | null
  orden_pago_estado?: string | null
  orden_pago_linea_captura?: string | null
}

export interface DependenciaTramiteCard {
  escritura_id: string
  dependencia_clave: number
  dependencia_id?: string | null
  dependencia_sigla: string
  dependencia_nombre: string
  dependencia_dias_habiles: number
  ultimo_paso_id: number
  ultimo_paso_nombre: string
  ultimo_folio_volante?: string | null
  ultimas_notas?: string | null
  ultima_fecha_registro: string
  ultimo_responsable_id?: string | null
  ultimo_responsable_nombre?: string | null
  ultima_orden_pago_id?: string | null
  ultimo_genera_orden_pago: boolean
  total_movimientos: number
  historial?: HistorialPasoEscritura[]
  expandido?: boolean
}

export interface PayloadAgregarPaso {
  escritura_id: string
  paso_id: number
  dependencia_clave: number
  dependencia_id?: string | null
  folio_volante?: string | null
  notas?: string | null
  fecha_registro?: string
  orden_pago_id?: string | null
}

export interface PasoEscrituraItem {
  paso_id: number
  paso_nombre: string
  paso_orden: number
  dependencia_clave: number
  genera_orden_pago: boolean
  dependencia_id?: string | null
  dependencia_sigla?: string
  dependencia_nombre?: string
  registro_id?: string | null
  escritura_id?: string
  completado: boolean
  fecha_completado?: string | null
  completado_por?: string | null
  completado_por_nombre?: string | null
  notas?: string | null
  orden_pago_id?: string | null
  orden_pago_folio?: string | null
  orden_pago_monto?: number | null
  orden_pago_estado?: string | null
  orden_pago_linea_captura?: string | null
}
