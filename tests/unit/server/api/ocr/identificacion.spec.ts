import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFetch = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}))

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({
    geminiApiKey: 'test-api-key',
  }),
}))

// Mock global $fetch
;(globalThis as any).$fetch = mockFetch

const handlerModule = await import('@/../server/api/ocr/identificacion.post')
const handler = handlerModule.default

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

// Mock readBody from h3
vi.mock('h3', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    readBody: vi.fn(async (event: any) => event._body),
  }
})

describe('server/api/ocr/identificacion.post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'notario@notaria.local' } },
      error: null,
    })
  })

  it('lanza error 400 si falta el anverso de la identificación', async () => {
    const event = createMockEvent({ tipo_identificacion: 'ine' })

    await expect(handler(event)).rejects.toThrowError(
      /La imagen frontal o anverso de la identificación es obligatoria/
    )
  })

  it('lanza error 401 si no hay usuario autenticado', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Token expirado'),
    })

    const event = createMockEvent({
      anverso_base64: 'data:image/jpeg;base64,sampleanverso',
    })

    await expect(handler(event)).rejects.toThrowError(/Sesión no autorizada/)
  })

  it('procesa correctamente la imagen con Gemini y retorna el JSON tipado', async () => {
    const geminiPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  nombres: 'GUSTAVO',
                  primer_apellido: 'MADERO',
                  segundo_apellido: 'HERNANDEZ',
                  curp: 'MAHG800101HDFRRG03',
                  rfc: 'MAHG800101AB3',
                  clave_elector: 'MAHG80010109H300',
                  vigencia: '2028',
                  fecha_nacimiento: '1980-01-01',
                  genero: 'M',
                  domicilio: {
                    calle: 'AV FRANCISCO I MADERO',
                    numero_exterior: '50',
                    numero_interior: null,
                    colonia: 'CENTRO',
                    codigo_postal: '06000',
                    municipio: 'CUAUHTEMOC',
                    entidad_federativa: 'CIUDAD DE MEXICO',
                  },
                }),
              },
            ],
          },
        },
      ],
    }

    mockFetch.mockResolvedValue(geminiPayload)

    const event = createMockEvent({
      tipo_identificacion: 'ine',
      anverso_base64: 'data:image/jpeg;base64,sampleanverso',
      reverso_base64: 'data:image/jpeg;base64,samplereverso',
    })

    const response = await handler(event)

    expect(response.exito).toBe(true)
    expect(response.tipo_identificacion).toBe('ine')
    expect(response.datos.nombres).toBe('GUSTAVO')
    expect(response.datos.primer_apellido).toBe('MADERO')
    expect(response.datos.curp).toBe('MAHG800101HDFRRG03')
    expect(response.datos.rfc).toBe('MAHG800101AB3')
    expect(response.datos.clave_elector).toBe('MAHG80010109H300')
    expect(response.datos.domicilio.calle).toBe('AV FRANCISCO I MADERO')
    expect(response.datos.domicilio.codigo_postal).toBe('06000')

    // Verificar que $fetch fue llamado con la URL de Gemini
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('captura errores de la API de Gemini y retorna status 502', async () => {
    mockFetch.mockRejectedValue(new Error('Quota exceeded or connection error'))

    const event = createMockEvent({
      tipo_identificacion: 'ine',
      anverso_base64: 'data:image/jpeg;base64,sampleanverso',
    })

    await expect(handler(event)).rejects.toThrowError(/Error al procesar reconocimiento OCR/)
  })
})
