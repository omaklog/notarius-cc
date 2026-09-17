import { describe, it, expect, vi, beforeEach } from 'vitest'
import { usePredios } from '~/composables/usePredios'

const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    storage: {
      from: mockStorageFrom
    }
  })
}))

describe('usePredios Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarPredios obtiene la lista de predios y asigna el primero como activo', async () => {
    const fakePredios = [
      {
        id: 'pred-1',
        escritura_id: 'esc-123',
        etiqueta: 'Lote 1',
        superficie_terreno_m2: 250,
        geometria: { type: 'Polygon', coordinates: [[[-99.1, 19.4], [-99.1, 19.5], [-99.2, 19.5], [-99.1, 19.4]]] },
        colindancias: []
      }
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: fakePredios, error: null })
        })
      })
    })

    const { predios, predioActivo, cargarPredios } = usePredios()
    const res = await cargarPredios('esc-123')

    expect(res).toHaveLength(1)
    expect(predios.value).toHaveLength(1)
    expect(predioActivo.value?.id).toBe('pred-1')
  })

  it('crearPredioVacio genera una plantilla con etiqueta secuencial', () => {
    const { crearPredioVacio, predios } = usePredios()
    predios.value = []

    const p1 = crearPredioVacio('esc-123')
    expect(p1.etiqueta).toBe('Predio Principal')

    predios.value = [p1 as any]
    const p2 = crearPredioVacio('esc-123')
    expect(p2.etiqueta).toBe('Lote 2')
  })

  it('guardarPredio inserta un nuevo predio calculando automáticamente superficie y centroide', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'pred-nuevo',
        escritura_id: 'esc-123',
        etiqueta: 'Lote Principal',
        superficie_terreno_m2: 300,
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-99.1332, 19.4326],
              [-99.1330, 19.4326],
              [-99.1330, 19.4328],
              [-99.1332, 19.4328],
              [-99.1332, 19.4326]
            ]
          ]
        }
      },
      error: null
    })

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })

    const { guardarPredio } = usePredios()
    const guardado = await guardarPredio({
      escritura_id: 'esc-123',
      etiqueta: 'Lote Principal',
      geometria: {
        type: 'Polygon',
        coordinates: [
          [
            [-99.1332, 19.4326],
            [-99.1330, 19.4326],
            [-99.1330, 19.4328],
            [-99.1332, 19.4328],
            [-99.1332, 19.4326]
          ]
        ]
      }
    })

    expect(guardado).toBeDefined()
    expect(guardado?.id).toBe('pred-nuevo')
  })

  it('eliminarPredio borra el registro de la base de datos y de la lista reactiva', async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    })

    const { predios, predioActivo, eliminarPredio } = usePredios()
    predios.value = [
      { id: 'p-1', etiqueta: 'Lote 1' } as any,
      { id: 'p-2', etiqueta: 'Lote 2' } as any
    ]
    predioActivo.value = predios.value[0]

    const ok = await eliminarPredio('p-1')
    expect(ok).toBe(true)
    expect(predios.value).toHaveLength(1)
    expect(predioActivo.value?.id).toBe('p-2')
  })
})
