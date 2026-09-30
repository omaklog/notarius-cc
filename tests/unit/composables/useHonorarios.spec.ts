import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useHonorarios } from '~/composables/useHonorarios'

const mockFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

describe('useHonorarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarCuenta carga la cuenta de honorarios, partidas y pagos', async () => {
    const mockCuenta = {
      id: 'cuenta-1',
      escritura_id: 'esc-101',
      subtotal_gravado: 20000,
      subtotal_exento: 0,
      descuento_total: 0,
      iva_total: 3200,
      total_cotizado: 23200,
      total_pagado: 10000,
      saldo_pendiente: 13200,
      estatus: 'anticipo_parcial',
    }

    const mockPartidas = [
      {
        id: 'p-1',
        cuenta_id: 'cuenta-1',
        concepto: 'Honorarios notariales',
        monto: 20000,
        aplica_iva: true,
        tasa_iva: 0.16,
        es_descuento: false,
        orden: 0,
      },
    ]

    const mockPagos = [
      {
        id: 'pago-1',
        cuenta_id: 'cuenta-1',
        folio_recibo: 'REC-2026-0001',
        monto: 10000,
        fecha_pago: '2026-09-17',
        metodo_pago: 'transferencia_spei',
        concepto: 'Anticipo 50%',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'honorarios_cuentas') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: mockCuenta, error: null }),
            }),
          }),
        }
      }
      if (table === 'escrituras') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { instrumento: 48102, objeto: 'Compraventa', actos_juridicos: { nombre: 'Compraventa' } }, error: null }),
            }),
          }),
        }
      }
      if (table === 'honorarios_partidas') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockPartidas, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'honorarios_pagos') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: () => Promise.resolve({ data: mockPagos, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'ordenes_pago') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }
      }
      return {
        select: () => Promise.resolve({ data: null, error: null }),
      }
    })

    const { cargarCuenta, cuenta, partidas, pagos } = useHonorarios('esc-101')
    await cargarCuenta()

    expect(cuenta.value?.id).toBe('cuenta-1')
    expect(partidas.value.length).toBe(1)
    expect(pagos.value.length).toBe(1)
  })

  it('cargarKpis calcula correctamente los totales para el tablero', async () => {
    const mockCuentas = [
      {
        total_cotizado: 50000,
        total_pagado: 50000,
        saldo_pendiente: 0,
        estatus: 'liquidado',
      },
      {
        total_cotizado: 30000,
        total_pagado: 10000,
        saldo_pendiente: 20000,
        estatus: 'anticipo_parcial',
      },
    ]

    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ data: mockCuentas, error: null }),
    })

    const { cargarKpis, kpis } = useHonorarios()
    await cargarKpis()

    expect(kpis.value.total_cotizado_acumulado).toBe(80000)
    expect(kpis.value.total_cobrado_mes).toBe(60000)
    expect(kpis.value.saldo_total_pendiente).toBe(20000)
    expect(kpis.value.cuentas_liquidadas).toBe(1)
    expect(kpis.value.cuentas_activas).toBe(2)
    expect(kpis.value.porcentaje_efectividad).toBe(75) // 60,000 / 80,000 = 75%
  })
})
