import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { usePldCalculations } from '@/composables/usePldCalculations'

describe('usePldCalculations', () => {
  it('omite umbrales y clasifica como exento si el acto no es actividad vulnerable', () => {
    const { vecesUma, requiereIdentificacion, requiereAvisoSat, excedeLimiteEfectivo, calificacionAviso } = usePldCalculations({
      montoOperacion: 10_000_000,
      montoEfectivo: 5_000_000,
      valorUma: 113.14,
      esActividadVulnerable: false,
      umbralIdentificacionUma: 8025,
      umbralAvisoUma: 16050,
      limiteEfectivoUma: 8025
    })

    expect(vecesUma.value).toBe(88386.07)
    expect(requiereIdentificacion.value).toBe(false)
    expect(requiereAvisoSat.value).toBe(false)
    expect(excedeLimiteEfectivo.value).toBe(false)
    expect(calificacionAviso.value).toBe('exento')
  })

  it('determina identificacion obligatoria si supera umbral de identificacion en acto vulnerable', () => {
    // 1,000,000 / 113.14 = 8,838.61 UMA (supera 8,025 pero no 16,050)
    const { vecesUma, requiereIdentificacion, requiereAvisoSat, calificacionAviso } = usePldCalculations({
      montoOperacion: 1_000_000,
      montoEfectivo: 100_000,
      valorUma: 113.14,
      esActividadVulnerable: true,
      umbralIdentificacionUma: 8025,
      umbralAvisoUma: 16050,
      limiteEfectivoUma: 8025
    })

    expect(vecesUma.value).toBe(8838.61)
    expect(requiereIdentificacion.value).toBe(true)
    expect(requiereAvisoSat.value).toBe(false)
    expect(calificacionAviso.value).toBe('identificacion')
  })

  it('determina aviso ordinario SAT si supera umbral de aviso mensual', () => {
    // 4,500,000 / 113.14 = 39,773.73 UMA (supera 16,050)
    const { vecesUma, requiereAvisoSat, calificacionAviso } = usePldCalculations({
      montoOperacion: 4_500_000,
      montoEfectivo: 200_000,
      valorUma: 113.14,
      esActividadVulnerable: true,
      umbralIdentificacionUma: 8025,
      umbralAvisoUma: 16050,
      limiteEfectivoUma: 8025
    })

    expect(vecesUma.value).toBe(39773.73)
    expect(requiereAvisoSat.value).toBe(true)
    expect(calificacionAviso.value).toBe('aviso_ordinario')
  })

  it('controla el límite de efectivo conforme al Art. 32 LFPIORPI', () => {
    const montoEfectivo = ref(500_000)
    const { vecesUmaEfectivo, excedeLimiteEfectivo, limiteEfectivoMoneda } = usePldCalculations({
      montoOperacion: 4_500_000,
      montoEfectivo,
      valorUma: 113.14,
      esActividadVulnerable: true,
      limiteEfectivoUma: 8025
    })

    // 8025 * 113.14 = 907,948.50 MXN
    expect(limiteEfectivoMoneda.value).toBe(907948.50)
    expect(vecesUmaEfectivo.value).toBe(4419.30)
    expect(excedeLimiteEfectivo.value).toBe(false)

    // Aumentar efectivo por encima del tope legal
    montoEfectivo.value = 1_000_000
    expect(vecesUmaEfectivo.value).toBe(8838.61)
    expect(excedeLimiteEfectivo.value).toBe(true)
  })

  it('formatea montos y valores UMA con precisión notarial', () => {
    const { formatearMoneda, formatearUma } = usePldCalculations({
      montoOperacion: 1000,
      montoEfectivo: 0,
      valorUma: 113.14,
      esActividadVulnerable: false
    })

    expect(formatearMoneda(4500000)).toMatch(/\$4,500,000\.00/)
    expect(formatearUma(39773.73)).toContain('39,773.73 UMA')
  })
})
