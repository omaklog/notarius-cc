import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTurnadoTramites } from '@/composables/useTurnadoTramites'

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockUser = { value: { id: 'usr-123', email: 'test@notaria.com' } }

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
  useSupabaseUser: () => mockUser,
}))

function createQueryMock(data: any, error: any = null) {
  const p: any = Promise.resolve({ data, error })
  p.select = vi.fn().mockReturnValue(p)
  p.eq = vi.fn().mockReturnValue(p)
  p.order = vi.fn().mockReturnValue(p)
  p.insert = vi.fn().mockReturnValue(p)
  p.update = vi.fn().mockReturnValue(p)
  p.single = vi.fn().mockReturnValue(Promise.resolve({ data, error }))
  return p
}

describe('useTurnadoTramites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarHistorial consulta la bitácora y mapea los eventos', async () => {
    const mockData = [
      {
        id: 'evt-1',
        escritura_id: 'esc-1',
        tramite_id: 'tra-1',
        usuario_origen_id: 'usr-red',
        rol_origen: 'redactor',
        usuario_destino_id: 'usr-ges',
        rol_destino: 'gestor',
        tipo_evento: 'turnado_a_gestor',
        motivo: 'Ingreso a RPP',
        tiempo_custodia_horas: 0,
        created_at: '2026-09-25T10:00:00Z',
        usuario_origen: { id: 'usr-red', nombre_completo: 'Lic. Ana Redactora' },
        usuario_destino: { id: 'usr-ges', nombre_completo: 'Juan Gestor' },
      },
    ]

    mockFrom.mockReturnValue(createQueryMock(mockData))

    const { eventos, cargando, cargarHistorial } = useTurnadoTramites()
    await cargarHistorial('tra-1')

    expect(cargando.value).toBe(false)
    expect(eventos.value.length).toBe(1)
    expect(eventos.value[0].usuario_origen_nombre).toBe('Lic. Ana Redactora')
    expect(eventos.value[0].usuario_destino_nombre).toBe('Juan Gestor')
    expect(eventos.value[0].tipo_evento).toBe('turnado_a_gestor')
  })

  it('turnarAlGestor invoca la función RPC de turnado', async () => {
    mockRpc.mockResolvedValue({ data: 'evt-nuevo-1', error: null })
    mockFrom.mockReturnValue(createQueryMock([]))

    const { turnarAlGestor } = useTurnadoTramites()

    const res = await turnarAlGestor({
      escrituraId: 'esc-1',
      tramiteId: 'tra-1',
      gestorId: 'usr-ges',
      instrucciones: 'Revisar antecedentes',
    })

    expect(res).toBe('evt-nuevo-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_registrar_turnado', expect.objectContaining({
      p_escritura_id: 'esc-1',
      p_tramite_id: 'tra-1',
      p_usuario_destino_id: 'usr-ges',
      p_rol_destino: 'gestor',
      p_tipo_evento: 'turnado_a_gestor',
    }))
  })

  it('devolverPorPrevencion lanza error si el motivo está vacío', async () => {
    const { devolverPorPrevencion } = useTurnadoTramites()

    await expect(
      devolverPorPrevencion({
        escrituraId: 'esc-1',
        tramiteId: 'tra-1',
        redactorId: 'usr-red',
        motivo: '   ',
      })
    ).rejects.toThrow('El motivo de la prevención es obligatorio')
  })

  it('solventarYReturnar lanza error si el motivo está vacío', async () => {
    const { solventarYReturnar } = useTurnadoTramites()

    await expect(
      solventarYReturnar({
        escrituraId: 'esc-1',
        tramiteId: 'tra-1',
        gestorId: 'usr-ges',
        motivo: '',
      })
    ).rejects.toThrow('Debe especificar las medidas adoptadas')
  })
})
