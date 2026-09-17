import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useOrdenesPago } from '~/composables/useOrdenesPago'

const mockFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

describe('useOrdenesPago', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarDependencias obtiene catálogo de dependencias oficiales', async () => {
    const mockDeps = [
      { id: 'dep-1', sigla: 'RPP', nombre: 'Registro Público', portal_web: 'https://rpp.cdmx.gob.mx' },
      { id: 'dep-2', sigla: 'TESORERIA', nombre: 'Tesorería CDMX', portal_web: null },
    ]

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockDeps, error: null }),
        }),
      }),
    })

    const { cargarDependencias, dependencias } = useOrdenesPago()
    await cargarDependencias()

    expect(dependencias.value).toEqual(mockDeps)
  })

  it('cargarOrdenes carga órdenes y calcula el resumen financiero reactivo', async () => {
    const now = new Date()
    const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const mockOrders = [
      {
        id: 'ord-1',
        folio: 'ORD-2026-0001',
        escritura_id: 'esc-1',
        dependencia_id: 'dep-1',
        concepto: 'Derechos RPP',
        monto: 15000,
        estado: 'pagado',
        fecha_emision_linea: '2026-09-01',
        fecha_vencimiento_linea: '2026-09-20',
      },
      {
        id: 'ord-2',
        folio: 'ORD-2026-0002',
        escritura_id: 'esc-1',
        dependencia_id: 'dep-2',
        concepto: 'ISAI',
        monto: 25000,
        estado: 'pendiente',
        fecha_emision_linea: '2026-09-10',
        fecha_vencimiento_linea: hoy, // vence hoy -> semaforo rojo
      },
      {
        id: 'ord-3',
        folio: 'ORD-2026-0003',
        escritura_id: 'esc-1',
        dependencia_id: 'dep-1',
        concepto: 'Cancelada',
        monto: 5000,
        estado: 'cancelado',
        fecha_emision_linea: '2026-09-05',
      },
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_ordenes_pago_resumen') {
        const queryObj: any = {
          select: () => queryObj,
          eq: () => queryObj,
          gte: () => queryObj,
          lte: () => queryObj,
          order: () => Promise.resolve({ data: mockOrders, error: null }),
        }
        return queryObj
      }
      return {}
    })

    const { cargarOrdenes, ordenes, resumenFinanciero } = useOrdenesPago('esc-1')
    await cargarOrdenes()

    expect(ordenes.value.length).toBe(3)
    // Resumen financiero excluye canceladas
    expect(resumenFinanciero.value.total_ordenes).toBe(2)
    expect(resumenFinanciero.value.total_monto).toBe(40000)
    expect(resumenFinanciero.value.monto_pagado).toBe(15000)
    expect(resumenFinanciero.value.monto_pendiente).toBe(25000)
    expect(resumenFinanciero.value.ordenes_vencidas).toBe(1) // ord-2 vence hoy
  })

  it('guardarOrden inserta una nueva orden con campos sanitizados', async () => {
    let insertedPayload: any = null
    const newRecord = {
      id: 'ord-new',
      folio: 'ORD-2026-0004',
      escritura_id: 'esc-1',
      dependencia_id: 'dep-1',
      concepto: 'Certificado de Libertad de Gravámenes',
      monto: 2400,
      linea_captura: 'LC-999',
      fecha_emision_linea: '2026-09-16',
      quien_cubre: 'adquirente',
      estado: 'pendiente',
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ordenes_pago') {
        return {
          insert: (p: any) => {
            insertedPayload = p
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newRecord, error: null }),
              }),
            }
          },
        }
      }
      if (table === 'v_ordenes_pago_resumen') {
        const queryObj: any = {
          select: () => queryObj,
          eq: () => queryObj,
          order: () => Promise.resolve({ data: [newRecord], error: null }),
        }
        return queryObj
      }
      return {}
    })

    const { guardarOrden } = useOrdenesPago('esc-1')
    const res = await guardarOrden({
      escritura_id: 'esc-1',
      dependencia_id: 'dep-1',
      concepto: 'Certificado de Libertad de Gravámenes',
      monto: 2400,
      linea_captura: 'LC-999',
      fecha_emision_linea: '2026-09-16',
      quien_cubre: 'adquirente',
    })

    expect(insertedPayload).toBeDefined()
    expect(insertedPayload.monto).toBe(2400)
    expect(res.id).toBe('ord-new')
  })

  it('liquidarOrden asienta método de pago, folio bancario y estatus pagado', async () => {
    let updatePayload: any = null

    mockFrom.mockImplementation((table: string) => {
      if (table === 'ordenes_pago') {
        return {
          update: (p: any) => {
            updatePayload = p
            return {
              eq: () => Promise.resolve({ data: null, error: null }),
            }
          },
        }
      }
      if (table === 'v_ordenes_pago_resumen') {
        const queryObj: any = {
          select: () => queryObj,
          eq: () => queryObj,
          order: () => Promise.resolve({ data: [], error: null }),
        }
        return queryObj
      }
      return {}
    })

    const { liquidarOrden } = useOrdenesPago('esc-1')
    await liquidarOrden(
      {
        orden_pago_id: 'ord-1',
        metodo_pago: 'transferencia_spei',
        folio_autorizacion_bancaria: 'SPEI-2026-888',
        fecha_pago: '2026-09-16',
      },
      'doc-uuid-123'
    )

    expect(updatePayload).toBeDefined()
    expect(updatePayload.estado).toBe('pagado')
    expect(updatePayload.metodo_pago).toBe('transferencia_spei')
    expect(updatePayload.folio_autorizacion_bancaria).toBe('SPEI-2026-888')
    expect(updatePayload.comprobante_documento_id).toBe('doc-uuid-123')
  })

  it('cancelarOrden requiere un motivo no vacío y actualiza a cancelado', async () => {
    const { cancelarOrden } = useOrdenesPago('esc-1')

    await expect(cancelarOrden('ord-1', '')).rejects.toThrow('El motivo de cancelación es obligatorio')
    await expect(cancelarOrden('ord-1', '   ')).rejects.toThrow('El motivo de cancelación es obligatorio')

    let updatePayload: any = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'ordenes_pago') {
        return {
          update: (p: any) => {
            updatePayload = p
            return {
              eq: () => Promise.resolve({ data: null, error: null }),
            }
          },
        }
      }
      if (table === 'v_ordenes_pago_resumen') {
        const queryObj: any = {
          select: () => queryObj,
          eq: () => queryObj,
          order: () => Promise.resolve({ data: [], error: null }),
        }
        return queryObj
      }
      return {}
    })

    await cancelarOrden('ord-1', 'Error en la captura de la línea')
    expect(updatePayload.estado).toBe('cancelado')
    expect(updatePayload.motivo_cancelacion).toBe('Error en la captura de la línea')
  })
})
