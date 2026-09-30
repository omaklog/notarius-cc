import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockFetch = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({
    rpc: mockRpc,
  })),
}))

// Mock global fetch
;(globalThis as any).fetch = mockFetch

// Mock getQuery from h3
vi.mock('h3', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    getQuery: vi.fn((event: any) => event._query || {}),
  }
})

const handlerModule = await import('@/../server/api/uma/consultar-inegi.get')
const handler = handlerModule.default

function createMockEvent(query: any = {}) {
  return {
    node: {
      req: {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
      },
    },
    context: {},
    _query: query,
  } as any
}

describe('server/api/uma/consultar-inegi.get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: true, error: null })
  })

  it('lanza error 403 si el usuario no tiene permiso de administración', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })
    const event = createMockEvent()

    await expect(handler(event)).rejects.toThrowError('No tienes permiso para consultar o administrar la UMA.')
  })

  it('retorna resultado exitoso cuando se utiliza el modo simulación', async () => {
    const event = createMockEvent({ simular: 'true' })
    const res = await handler(event)

    expect(res.ok).toBe(true)
    expect(res.valor).toBe(117.31)
    expect(res.anio).toBe(new Date().getFullYear())
    expect(res.fechaVigenciaSugerida).toBe(`${new Date().getFullYear()}-02-01`)
  })

  it('retorna resultado exitoso cuando el servicio INEGI responde estructuradamente', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        Series: [
          {
            OBSERVATIONS: [
              {
                TIME_PERIOD: '2026/01',
                OBS_VALUE: '117.31',
              },
            ],
          },
        ],
      }),
    })

    const event = createMockEvent()
    const res = await handler(event)

    expect(res.ok).toBe(true)
    expect(res.valor).toBe(117.31)
    expect(res.anio).toBe(2026)
    expect(res.fechaVigenciaSugerida).toBe('2026-02-01')
  })

  it('retorna objeto de fallback amigable con fuentes oficiales cuando INEGI falla o no responde', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection timed out'))

    const event = createMockEvent()
    const res = await handler(event)

    expect(res.ok).toBe(false)
    expect(res.error).toContain('No se pudo establecer conexión')
    expect(res.fuentesOficiales).toBeDefined()
    expect(res.fuentesOficiales?.length).toBeGreaterThan(0)
    expect(res.fuentesOficiales?.[0].url).toContain('inegi.org.mx')
  })
})
