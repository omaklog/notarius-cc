import type {
  HonorariosPartida,
  HonorariosPago,
  EstatusCuentaHonorarios,
  HojaLiquidacionConsolidada,
  ResumenLiquidacionTerceros,
} from '~/types/honorarios'

export interface TotalesPartidasCalculados {
  subtotal_gravado: number
  subtotal_exento: number
  descuento_total: number
  iva_total: number
  total_cotizado: number
}

export interface SaldoYEstadoCalculados {
  total_pagado: number
  saldo_pendiente: number
  estatus: EstatusCuentaHonorarios
}

export interface AlertaEfectivoResult {
  totalEfectivo: number
  tieneEfectivo: boolean
  superaAlerta: boolean
  mensaje: string
}

export function useHonorariosCalculos() {
  /**
   * Redondeo financiero estricto a 2 decimales
   */
  function redondear(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100
  }

  /**
   * Formateador monetario para moneda nacional mexicana
   */
  function formatearMoneda(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return '$ 0.00 MXN'
    }
    const partes = redondear(valor).toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `$ ${partes} MXN`
  }

  /**
   * Calcula subtotales, IVA 16%, deducciones y total cotizado a partir de las partidas
   */
  function calcularTotalesPartidas(partidas: HonorariosPartida[] = []): TotalesPartidasCalculados {
    let subtotal_gravado = 0
    let subtotal_exento = 0
    let descuento_total = 0

    for (const p of partidas) {
      const monto = redondear(p.monto || 0)
      if (p.es_descuento) {
        descuento_total += monto
      } else if (p.aplica_iva) {
        subtotal_gravado += monto
      } else {
        subtotal_exento += monto
      }
    }

    subtotal_gravado = redondear(subtotal_gravado)
    subtotal_exento = redondear(subtotal_exento)
    descuento_total = redondear(descuento_total)

    // El descuento se aplica primero a la base gravada
    const baseGravableNeta = Math.max(0, subtotal_gravado - descuento_total)
    const iva_total = redondear(baseGravableNeta * 0.16)
    const total_cotizado = redondear((subtotal_gravado + subtotal_exento + iva_total) - descuento_total)

    return {
      subtotal_gravado,
      subtotal_exento,
      descuento_total,
      iva_total,
      total_cotizado: Math.max(0, total_cotizado),
    }
  }

  /**
   * Calcula el total pagado, saldo pendiente y transición de estatus
   */
  function calcularSaldoYEstado(totalCotizado: number, pagos: HonorariosPago[] = []): SaldoYEstadoCalculados {
    let total_pagado = 0
    for (const p of pagos) {
      total_pagado += redondear(p.monto || 0)
    }
    total_pagado = redondear(total_pagado)
    const saldo_pendiente = redondear(totalCotizado - total_pagado)

    let estatus: EstatusCuentaHonorarios = 'borrador'
    if (totalCotizado === 0) {
      estatus = 'borrador'
    } else if (total_pagado === 0) {
      estatus = 'cotizado'
    } else if (saldo_pendiente <= 0) {
      estatus = 'liquidado'
    } else {
      estatus = 'anticipo_parcial'
    }

    return {
      total_pagado,
      saldo_pendiente,
      estatus,
    }
  }

  /**
   * Genera el consolidado de liquidación uniendo honorarios propios y derechos a terceros
   */
  function consolidarHojaLiquidacion(params: {
    escrituraId: string
    instrumento: number | string
    objeto: string
    actoNombre: string
    partidas: HonorariosPartida[]
    pagos: HonorariosPago[]
    ordenesPago: Array<{
      id?: string
      folio: string
      dependencia: string
      concepto: string
      monto: number
      estado: string
    }>
  }): HojaLiquidacionConsolidada {
    const totalesPartidas = calcularTotalesPartidas(params.partidas)
    const saldoHonorarios = calcularSaldoYEstado(totalesPartidas.total_cotizado, params.pagos)

    // Resumen terceros
    let total_derechos = 0
    let total_pagado_derechos = 0
    for (const op of params.ordenesPago) {
      if (op.estado !== 'cancelado') {
        const monto = redondear(op.monto || 0)
        total_derechos += monto
        if (op.estado === 'pagado') {
          total_pagado_derechos += monto
        }
      }
    }
    total_derechos = redondear(total_derechos)
    total_pagado_derechos = redondear(total_pagado_derechos)
    const saldo_derechos = redondear(total_derechos - total_pagado_derechos)

    const terceros: ResumenLiquidacionTerceros = {
      total_derechos,
      total_pagado_derechos,
      saldo_derechos,
      ordenes: params.ordenesPago,
    }

    const gran_total_tramite = redondear(totalesPartidas.total_cotizado + total_derechos)
    const total_recibido = saldoHonorarios.total_pagado
    const saldo_neto_pendiente = redondear(gran_total_tramite - total_recibido)

    return {
      escritura_id: params.escrituraId,
      instrumento_numero: params.instrumento,
      objeto: params.objeto,
      acto_juridico: params.actoNombre,
      fecha_emision: new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      honorarios: {
        ...totalesPartidas,
        total_notaria: totalesPartidas.total_cotizado,
        partidas: params.partidas,
      },
      terceros,
      balance: {
        gran_total_tramite,
        total_recibido,
        saldo_neto_pendiente,
        estatus_general: saldo_neto_pendiente <= 0 ? 'liquidado' : 'pendiente',
      },
    }
  }

  /**
   * Evalúa si hay pagos en efectivo y si se aproxima a umbrales relevantes de LFPIORPI
   * Límite legal LFPIORPI Art. 32 para inmuebles: 8,025 UMA (~$871,000 MXN en 2026).
   * Alerta preventiva en notaría ante recepción de efectivo > $100,000 MXN.
   */
  function evaluarAlertaEfectivo(pagos: HonorariosPago[] = []): AlertaEfectivoResult {
    let totalEfectivo = 0
    for (const p of pagos) {
      if (p.metodo_pago === 'efectivo') {
        totalEfectivo += redondear(p.monto || 0)
      }
    }
    totalEfectivo = redondear(totalEfectivo)
    const UMBRAL_ALERTA_PREVENTIVA = 100000 // $100,000 MXN
    const UMBRAL_LFPIORPI_ESTRICTO = 871000 // ~$871,000 MXN

    if (totalEfectivo === 0) {
      return {
        totalEfectivo: 0,
        tieneEfectivo: false,
        superaAlerta: false,
        mensaje: 'Sin pagos en efectivo registrados. Flujo 100% bancarizado.',
      }
    }

    if (totalEfectivo >= UMBRAL_LFPIORPI_ESTRICTO) {
      return {
        totalEfectivo,
        tieneEfectivo: true,
        superaAlerta: true,
        mensaje: `ALERTA CRÍTICA: Cobros en efectivo acumulados (${formatearMoneda(totalEfectivo)}) exceden el umbral máximo de efectivo LFPIORPI Art. 32. Requiere revisión de cumplimiento antilavado.`,
      }
    }

    if (totalEfectivo >= UMBRAL_ALERTA_PREVENTIVA) {
      return {
        totalEfectivo,
        tieneEfectivo: true,
        superaAlerta: true,
        mensaje: `Aviso preventivo: Cobros en efectivo acumulados (${formatearMoneda(totalEfectivo)}) superan los $100,000 MXN. Verifique el expediente de identificación del cliente.`,
      }
    }

    return {
      totalEfectivo,
      tieneEfectivo: true,
      superaAlerta: false,
      mensaje: `Pagos en efectivo acumulados: ${formatearMoneda(totalEfectivo)}. Dentro de límites operativos normales.`,
    }
  }

  return {
    redondear,
    formatearMoneda,
    calcularTotalesPartidas,
    calcularSaldoYEstado,
    consolidarHojaLiquidacion,
    evaluarAlertaEfectivo,
  }
}
