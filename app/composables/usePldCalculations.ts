import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { PldCalificacionAviso } from '~/types/pld'

export interface PldCalculationParams {
  montoOperacion: MaybeRefOrGetter<number | null | undefined>
  montoEfectivo: MaybeRefOrGetter<number | null | undefined>
  valorUma: MaybeRefOrGetter<number | null | undefined>
  esActividadVulnerable: MaybeRefOrGetter<boolean | null | undefined>
  umbralIdentificacionUma?: MaybeRefOrGetter<number | null | undefined>
  umbralAvisoUma?: MaybeRefOrGetter<number | null | undefined>
  limiteEfectivoUma?: MaybeRefOrGetter<number | null | undefined>
}

export function usePldCalculations(params: PldCalculationParams) {
  const montoOp = computed(() => Number(toValue(params.montoOperacion)) || 0)
  const montoEf = computed(() => Number(toValue(params.montoEfectivo)) || 0)
  const uma = computed(() => {
    const val = Number(toValue(params.valorUma))
    return val > 0 ? val : 113.14 // UMA de referencia 2026
  })
  const esVulnerable = computed(() => Boolean(toValue(params.esActividadVulnerable)))
  const umbralIdent = computed(() => {
    const val = toValue(params.umbralIdentificacionUma)
    return val != null ? Number(val) : null
  })
  const umbralAviso = computed(() => {
    const val = toValue(params.umbralAvisoUma)
    return val != null ? Number(val) : null
  })
  const limiteEf = computed(() => {
    const val = toValue(params.limiteEfectivoUma)
    return val != null ? Number(val) : null
  })

  const vecesUma = computed(() => {
    if (uma.value <= 0) return 0
    return Math.round((montoOp.value / uma.value) * 100) / 100
  })

  const vecesUmaEfectivo = computed(() => {
    if (uma.value <= 0) return 0
    return Math.round((montoEf.value / uma.value) * 100) / 100
  })

  const requiereIdentificacion = computed(() => {
    if (!esVulnerable.value || umbralIdent.value == null) return false
    return vecesUma.value >= umbralIdent.value
  })

  const requiereAvisoSat = computed(() => {
    if (!esVulnerable.value || umbralAviso.value == null) return false
    return vecesUma.value >= umbralAviso.value
  })

  const excedeLimiteEfectivo = computed(() => {
    if (!esVulnerable.value || limiteEf.value == null) return false
    return vecesUmaEfectivo.value > limiteEf.value
  })

  const limiteEfectivoMoneda = computed(() => {
    if (limiteEf.value == null) return 0
    return Math.round(limiteEf.value * uma.value * 100) / 100
  })

  const calificacionAviso = computed<PldCalificacionAviso>(() => {
    if (!esVulnerable.value) return 'exento'
    if (requiereAvisoSat.value) return 'aviso_ordinario'
    if (requiereIdentificacion.value) return 'identificacion'
    return 'exento'
  })

  const formatearMoneda = (val: number | null | undefined): string => {
    const n = Number(val) || 0
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n)
  }

  const formatearUma = (val: number | null | undefined): string => {
    const n = Number(val) || 0
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n) + ' UMA'
  }

  return {
    montoOp,
    montoEf,
    uma,
    esVulnerable,
    vecesUma,
    vecesUmaEfectivo,
    requiereIdentificacion,
    requiereAvisoSat,
    excedeLimiteEfectivo,
    limiteEfectivoMoneda,
    calificacionAviso,
    formatearMoneda,
    formatearUma
  }
}
