export type EstadoOrdenPago =
  | 'pendiente'
  | 'en_tesoreria'
  | 'pagado'
  | 'cancelado'

export type MetodoPagoDerechos =
  | 'transferencia_spei'
  | 'cheque_caja'
  | 'tarjeta_credito_debito'
  | 'efectivo_ventanilla'
  | 'cargo_cuenta_notaria'

export type QuienCubrePago =
  | 'adquirente'
  | 'enajenante'
  | 'notaria_fondo_revolvente'
  | 'banco_acreedor'
  | 'otro'

export type SemaforoLineaCaptura = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris'

export interface DependenciaOficialLite {
  id: string
  sigla: string
  nombre: string
  portal_web?: string | null
}

export interface OrdenPago {
  id: string
  folio: string
  escritura_id: string
  tramite_id?: string | null
  dependencia_id: string
  concepto: string
  monto: number
  linea_captura?: string | null
  fecha_emision_linea: string
  fecha_vencimiento_linea?: string | null
  estado: EstadoOrdenPago
  metodo_pago?: MetodoPagoDerechos | null
  folio_autorizacion_bancaria?: string | null
  fecha_pago?: string | null
  pagado_por?: string | null
  comprobante_documento_id?: string | null
  quien_cubre: QuienCubrePago
  observaciones?: string | null
  motivo_cancelacion?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Joins y campos calculados
  dependencia?: DependenciaOficialLite
  tramite_folio?: string | null
  escritura_instrumento?: string | null
  escritura_expediente?: string | null
  dias_restantes?: number | null
  semaforo?: SemaforoLineaCaptura
}

export interface ResumenFinancieroDerechos {
  total_ordenes: number
  total_monto: number
  monto_pagado: number
  monto_pendiente: number
  ordenes_por_vencer: number
  ordenes_vencidas: number
}

export interface OrdenPagoFormData {
  escritura_id: string
  tramite_id?: string | null
  dependencia_id: string
  concepto: string
  monto: number
  linea_captura?: string | null
  fecha_emision_linea: string
  fecha_vencimiento_linea?: string | null
  quien_cubre: QuienCubrePago
  observaciones?: string | null
}

export interface LiquidarOrdenPagoData {
  orden_pago_id: string
  metodo_pago: MetodoPagoDerechos
  folio_autorizacion_bancaria: string
  fecha_pago: string
  comprobante_archivo?: File | null
  observaciones?: string | null
}

export interface FiltrosOrdenesPago {
  busqueda?: string
  estado?: EstadoOrdenPago | 'todos'
  dependencia_id?: string | 'todas'
  quien_cubre?: QuienCubrePago | 'todos'
  vencimiento?: 'todas' | 'vencidas' | 'por_vencer_3_dias' | 'vigentes'
  fecha_desde?: string
  fecha_hasta?: string
}
