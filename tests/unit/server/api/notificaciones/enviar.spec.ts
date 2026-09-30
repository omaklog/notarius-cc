import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockInsert = vi.fn()
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

// Mock readBody from h3
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

describe('server/api/notificaciones/enviar.post', () => {
  let handler: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-notario-123', email: 'notario@notaria.local' } },
      error: null,
    })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockInsert.mockReturnValue({
      select: () => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'notif-uuid-123' },
          error: null,
        }),
      }),
    })

    const handlerModule = await import('../../../../../server/api/notificaciones/enviar.post')
    handler = handlerModule.default
  })

  it('lanza 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Sin sesión') })
    const event = createMockEvent({
      canal: 'whatsapp',
      destinatario_contacto: '5512345678',
      cuerpo: 'Hola mundo',
    })

    await expect(handler(event)).rejects.toThrowError('No autorizado')
  })

  it('lanza 400 si faltan campos obligatorios', async () => {
    const event = createMockEvent({
      canal: 'whatsapp',
      // sin contacto ni cuerpo
    })

    await expect(handler(event)).rejects.toThrowError('Campos obligatorios incompletos')
  })

  it('despacha exitosamente notificación por whatsapp y genera URL de WhatsApp Web', async () => {
    const payload = {
      canal: 'whatsapp',
      destinatario_nombre: 'Lic. Fernando Ortiz',
      destinatario_contacto: '5512345678',
      cuerpo: 'Estimado {{nombre_cliente}}, cita confirmada.',
      variables: { nombre_cliente: 'Lic. Fernando Ortiz' },
      archivos_adjuntos: [
        { nombre: 'aviso.pdf', url: 'https://storage.local/aviso.pdf' },
      ],
    }
    const event = createMockEvent(payload)

    const response = await handler(event)

    expect(response.ok).toBe(true)
    expect(response.estatus).toBe('enviado')
    expect(response.notificacion_id).toBe('notif-uuid-123')
    expect(response.whatsapp_native_url).toContain('whatsapp://send?')
    expect(response.whatsapp_native_url).toContain('525512345678')
    expect(response.whatsapp_web_url).toContain('https://web.whatsapp.com/send?')
    expect(response.whatsapp_web_url).toContain('525512345678')
    expect(mockInsert).toHaveBeenCalled()

  })

  it('despacha exitosamente notificación por correo con estatus entregado', async () => {
    const payload = {
      canal: 'correo',
      destinatario_nombre: 'Mariana Silva',
      destinatario_contacto: 'mariana@example.com',
      asunto: 'Testimonio listo',
      cuerpo: 'Su testimonio está listo para entrega.',
    }
    const event = createMockEvent(payload)

    const response = await handler(event)

    expect(response.ok).toBe(true)
    expect(response.estatus).toBe('entregado')
    expect(response.notificacion_id).toBe('notif-uuid-123')
  })
})
