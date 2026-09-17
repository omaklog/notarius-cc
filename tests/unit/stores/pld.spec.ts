import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test.png' }, error: null })
    }))
  }
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

const { usePldStore } = await import('@/stores/pld')

describe('usePldStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('carga el catálogo de listas de restricción activas', async () => {
    const mockListas = [
      { id: '1', codigo: 'lpb_uif', nombre: 'LPB', activo: true, orden: 1 },
      { id: '2', codigo: 'ofac_sdn', nombre: 'OFAC', activo: true, orden: 2 }
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockListas, error: null })
        })
      })
    })

    const store = usePldStore()
    const result = await store.cargarListasCatalogo()

    expect(result).toHaveLength(2)
    expect(store.listasCatalogo[0].codigo).toBe('lpb_uif')
  })

  it('detecta screening previo vigente vía RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: {
        encontrado: true,
        escritura_origen_id: 'esc-prev',
        instrumento: 10,
        fecha: '2026-09-01T00:00:00Z',
        dias_antiguedad: 14,
        dias_restantes: 76
      },
      error: null
    })

    const store = usePldStore()
    const screening = await store.buscarScreeningPrevio('comp-1', 'esc-act')

    expect(screening?.dias_antiguedad).toBe(14)
    expect(screening?.instrumento_numero).toBe(10)
    expect(store.screeningPrevioMap['comp-1']?.escritura_id).toBe('esc-prev')
  })

  it('sube evidencia a Storage en el bucket pld-evidencias', async () => {
    const store = usePldStore()
    const file = new File(['dummy-content'], 'captura_lpb.png', { type: 'image/png' })

    const res = await store.subirEvidencia(file, 'esc-1', 'comp-1', 'lpb_uif')

    expect(res.fileName).toBe('captura_lpb.png')
    expect(res.storagePath).toContain('pld-evidencias/esc-1/comp-1/lpb_uif_')
  })

  it('ejecuta evaluación canónica de la escritura vía RPC', async () => {
    const mockEval = {
      escritura_id: 'esc-1',
      uma_valor_aplicado: 113.14,
      veces_uma: 39773.73,
      calificacion_aviso: 'aviso_ordinario',
      estatus_global: 'aprobado'
    }

    mockSupabase.rpc.mockResolvedValue({ data: mockEval, error: null })

    const store = usePldStore()
    const res = await store.evaluarEscritura('esc-1')

    expect(res?.calificacion_aviso).toBe('aviso_ordinario')
    expect(store.evaluacionActual?.estatus_global).toBe('aprobado')
  })
})
