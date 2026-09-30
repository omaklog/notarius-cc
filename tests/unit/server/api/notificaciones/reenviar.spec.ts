import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()

const mockFrom = vi.fn((table: string) => {
  return {
    select: mockSelect,
    update: mockUpdate,
  }
})

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    readBody: vi.fn(async (event: any) => event._body),
  }
})

function createMockEvent(body: any) {
  return {
    node: {
      req: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
    },
    context: {},
    _body: body,
  } as any
}

describe('server/api/notificaciones/reenviar.post', () => {
  let handler: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-notario-123', email: 'notario@notaria.local' } },
      error: null,
    })

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'notif-uuid-456',
            canal: 'correo',
            destinatario_nombre: 'Mariana Silva',
            destinatario_contacto: 'mariana@example.com',
            asunto: 'Citatorio de firma',
            cuerpo_renderizado: 'Favor de acudir a firma.',
            intentos_envio: 1,
            estatus: 'fallido',
            archivos_adjuntos: [],
            metadata: {},
          },
          error: null,
        }),
      }),
    })

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const handlerModule = await import('../../../../../server/api/notificaciones/reenviar.post')
    handler = handlerModule.default
  })

  it('lanza 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Sin sesión') })
    const event = createMockEvent({ notificacion_id: 'notif-uuid-456' })

    await expect(handler(event)).rejects.toThrowError('No autorizado')
  })

  it('lanza 400 si falta notificacion_id', async () => {
    const event = createMockEvent({})

    await expect(handler(event)).rejects.toThrowError('Identificador de notificación no proporcionado')
  })

  it('reenvía exitosamente e incrementa intentos_envio', async () => {
    const event = createMockEvent({ notificacion_id: 'notif-uuid-456' })

    const response = await handler(event)

    expect(response.ok).toBe(true)
    expect(response.notificacion_id).toBe('notif-uuid-456')
    expect(response.intentos_envio).toBe(2)
    expect(response.estatus).toBe('entregado')
  })

  it('soporta cambio a canal alternativo en el reenvío', async () => {
    const event = createMockEvent({
      notificacion_id: 'notif-uuid-456',
      canal_alternativo: 'whatsapp',
    })

    const response = await handler(event)

    expect(response.ok).toBe(true)
    expect(response.whatsapp_web_url).toBeDefined()
  })
})
