export type EstatusCuentaHonorarios =
  | 'borrador'
  | 'cotizado'
  | 'anticipo_parcial'
  | 'liquidado'
  | 'cancelado'

export type EstatusFacturacion =
  | 'no_requerida'
  | 'pendiente'
  | 'facturada'
  | 'cancelada'

export type MetodoPagoHonorarios =
  | 'transferencia_spei'
  | 'tarjeta_credito_debito'
  | 'cheque'
  | 'efectivo'

export type MetodoPagoSAT = 'PUE' | 'PPD'

export interface HonorariosPartida {
  id?: string
  cuenta_id?: string
  concepto: string
  monto: number
  aplica_iva: boolean
  tasa_iva: number
  es_descuento: boolean
  orden: number
  created_at?: string
}

export interface HonorariosPago {
  id: string
  cuenta_id: string
  folio_recibo: string
  monto: number
  fecha_pago: string
  metodo_pago: MetodoPagoHonorarios
  referencia_bancaria?: string | null
  concepto: string
  recibido_por?: string | null
  recibido_por_nombre?: string | null
  comprobante_documento_id?: string | null
  notas?: string | null
  created_at?: string
}

export interface HonorariosCuenta {
  id: string
  escritura_id: string
  subtotal_gravado: number
  subtotal_exento: number
  descuento_total: number
  iva_total: number
  total_cotizado: number
  total_pagado: number
  saldo_pendiente: number
  estatus: EstatusCuentaHonorarios

  // Datos Fiscales CFDI 4.0
  rfc_receptor?: string | null
  razon_social_receptor?: string | null
  regimen_fiscal_receptor?: string | null
  codigo_postal_fiscal?: string | null
  uso_cfdi?: string | null
  estatus_facturacion: EstatusFacturacion
  uuid_fiscal?: string | null
  fecha_timbrado?: string | null
  metodo_pago_sat?: MetodoPagoSAT | null
  forma_pago_sat?: string | null
  factura_pdf_id?: string | null
  factura_xml_id?: string | null

  // Relaciones
  partidas?: HonorariosPartida[]
  pagos?: HonorariosPago[]

  // Auditoría
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface ResumenLiquidacionTerceros {
  total_derechos: number
  total_pagado_derechos: number
  saldo_derechos: number
  ordenes: Array<{
    id?: string
    folio: string
    dependencia: string
    concepto: string
    monto: number
    estado: string
  }>
}

export interface HojaLiquidacionConsolidada {
  escritura_id: string
  instrumento_numero: number | string
  objeto: string
  acto_juridico: string
  fecha_emision: string

  // Sección A: Notaría
  honorarios: {
    subtotal_gravado: number
    subtotal_exento: number
    descuento_total: number
    iva_total: number
    total_notaria: number
    partidas: HonorariosPartida[]
  }

  // Sección B: Derechos de Terceros (Órdenes de Pago)
  terceros: ResumenLiquidacionTerceros

  // Balance General
  balance: {
    gran_total_tramite: number
    total_recibido: number
    saldo_neto_pendiente: number
    estatus_general: 'pendiente' | 'liquidado'
  }
}

export interface HonorariosKpis {
  total_cobrado_mes: number
  saldo_total_pendiente: number
  total_cotizado_acumulado: number
  cuentas_liquidadas: number
  cuentas_activas: number
  porcentaje_efectividad: number
}
