import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calcularValorAnualUma,
  calcularValorMensualUma,
  useUmaHistorico,
} from '@/composables/useUmaHistorico'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

const mockFrom = vi.fn((table: string) => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
  }),
}))

const mockFetch = vi.fn()
;(globalThis as any).$fetch = mockFetch

describe('useUmaHistorico', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSelect.mockReturnValue({
      order: mockOrder.mockResolvedValue({
        data: [
          {
            id: 'uma-2025',
            valor: 113.14,
            fecha_inicio_vigencia: '2025-02-01',
            fecha_fin_vigencia: null,
            fuente: 'DOF / INEGI',
            notas: null,
          },
          {
            id: 'uma-2024',
            valor: 108.57,
            fecha_inicio_vigencia: '2024-02-01',
            fecha_fin_vigencia: '2025-01-31',
            fuente: 'DOF / INEGI',
            notas: null,
          },
        ],
        error: null,
      }),
    })

    mockInsert.mockReturnValue({
      select: vi.fn(() => ({
        single: mockSingle.mockResolvedValue({
          data: {
            id: 'uma-2026',
            valor: 117.31,
            fecha_inicio_vigencia: '2026-02-01',
            fecha_fin_vigencia: null,
            fuente: 'INEGI Oficial',
            notas: 'Publicación DOF 10/01/2026',
          },
          error: null,
        }),
      })),
    })

    mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'uma-2025', valor: 113.14 },
            error: null,
          }),
        })),
      }),
    })
  })

  it('calcula los valores mensual y anual basados en el multiplicador legal de 30.4 días', () => {
    // 108.57 * 30.4 = 3300.528 -> 3300.53
    expect(calcularValorMensualUma(108.57)).toBe(3300.53)
    // 108.57 * 30.4 * 12 = 39606.336 -> 39606.34
    expect(calcularValorAnualUma(108.57)).toBe(39606.34)
  })

  it('detecta correctamente si se requiere actualización para el año en curso', async () => {
    const { umas, requiereActualizacionAnioActual, cargarHistorialUmas } = useUmaHistorico()

    // Inicialmente sin datos
    expect(requiereActualizacionAnioActual.value).toBe(true)

    // Cargamos datos con solo 2024 y 2025 (suponiendo año actual 2026)
    await cargarHistorialUmas()
    expect(umas.value.length).toBe(2)
    // Como el año actual (2026) no está en los registros
    expect(requiereActualizacionAnioActual.value).toBe(true)

    // Si agregamos registro para 2026
    umas.value.unshift({
      id: 'uma-2026',
      valor: 117.31,
      fecha_inicio_vigencia: '2026-02-01',
      fecha_fin_vigencia: null,
    })
    expect(requiereActualizacionAnioActual.value).toBe(false)
  })

  it('valida datos obligatorios al guardar una UMA', async () => {
    const { guardarUma } = useUmaHistorico()

    const resErrorValor = await guardarUma({ valor: 0, fecha_inicio_vigencia: '2026-02-01' })
    expect(resErrorValor.ok).toBe(false)
    expect(resErrorValor.error).toContain('mayor a 0')

    const resErrorFecha = await guardarUma({ valor: 117.31, fecha_inicio_vigencia: '' })
    expect(resErrorFecha.ok).toBe(false)
    expect(resErrorFecha.error).toContain('fecha de inicio de vigencia')
  })

  it('permite guardar un nuevo registro de UMA cerrando la vigencia anterior', async () => {
    const { cargarHistorialUmas, guardarUma } = useUmaHistorico()
    await cargarHistorialUmas()

    const res = await guardarUma({
      valor: 117.31,
      fecha_inicio_vigencia: '2026-02-01',
      fuente: 'INEGI Oficial',
      notas: 'Publicación DOF 10/01/2026',
    })

    expect(res.ok).toBe(true)
    expect(mockInsert).toHaveBeenCalled()
    // Se debió actualizar el registro previo para cerrar la vigencia al 2026-01-31
    expect(mockUpdate).toHaveBeenCalledWith({ fecha_fin_vigencia: '2026-01-31' })
  })

  it('permite confirmar y ratificar el valor actual para el ejercicio en curso', async () => {
    const { cargarHistorialUmas, confirmarValorActualParaAnio } = useUmaHistorico()
    await cargarHistorialUmas()

    const res = await confirmarValorActualParaAnio(2026)
    expect(res.ok).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 113.14,
        fecha_inicio_vigencia: '2026-02-01',
        notas: expect.stringContaining('Ratificado sin cambios para el ejercicio fiscal 2026'),
      }),
    )
  })

  it('consulta el endpoint de INEGI e integra la respuesta', async () => {
    const { consultarInegi } = useUmaHistorico()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      valor: 117.31,
      anio: 2026,
      fechaVigenciaSugerida: '2026-02-01',
      fuente: 'INEGI Oficial',
    })

    const res = await consultarInegi()
    expect(res.ok).toBe(true)
    expect(res.valor).toBe(117.31)
  })
})
