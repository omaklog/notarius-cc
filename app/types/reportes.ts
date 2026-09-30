export interface ResumenKpisMes {
  total_abiertas_mes: number
  total_firmadas_mes: number
  total_en_tramite: number
  total_canceladas: number
}

export interface RedactorCargaItem {
  redactor_id: string
  nombre: string
  cantidad_escrituras: number
  porcentaje: number
}

export interface ActoDemandaItem {
  acto_id: string
  nombre: string
  cantidad: number
  porcentaje: number
}

export interface ReporteEscrituraGeneralItem {
  id: string
  instrumento: number
  anio: number
  volumen: number
  fecha_celebracion: string | null
  acto_nombre: string
  redactor_nombre: string
  estatus: 'borrador' | 'protocolizada' | 'anulada'
  tramites_asignados: number
  tramites_liberados: number
}

export interface VolumenIndiceCard {
  volumen: number
  anio: number
  total_escrituras: number
  instrumento_desde: number
  instrumento_hasta: number
  escrituras_foliadas: number
  escrituras_pendientes: number
  foliado_completo: boolean
}

export interface ComparecienteIndiceResumen {
  rol: string
  nombre: string
}

export interface EscrituraIndiceItem {
  id: string
  instrumento: number
  volumen: number
  fecha_celebracion: string | null
  acto_nombre: string
  comparecientes_resumen: ComparecienteIndiceResumen[]
  pagina_inicial: number | null
  pagina_final: number | null
  estatus: 'borrador' | 'protocolizada' | 'anulada'
}

export interface FiltrosReportesPeriodo {
  mes: number // 1 a 12
  anio: number
}

export interface ActualizarFoliadoPayload {
  escritura_id: string
  pagina_inicial: number | null
  pagina_final: number | null
}

export interface ResumenFinancieroCobranza {
  total_cobrado_mes: number
  total_saldo_pendiente: number
  cuentas_deudoras: {
    escritura_id: string
    instrumento: number
    cliente_nombre: string
    monto_total: number
    monto_pagado: number
    saldo_pendiente: number
  }[]
}
