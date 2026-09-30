import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useNotificaciones } from '../../../app/composables/useNotificaciones'

const mockFrom = vi.fn()
const mockFetch = vi.fn()

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'notif/test.pdf' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://storage.local/notif/test.pdf' } }),
      }),
    },
  }),
}))

;(globalThis as any).$fetch = mockFetch

describe('useNotificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cargarBitacora carga lista de notificaciones con relaciones', async () => {
    const mockBitacoraData = [
      {
        id: 'n-1',
        canal: 'whatsapp',
        destinatario_nombre: 'Carlos Slim',
        destinatario_contacto: '5512345678',
        cuerpo_renderizado: 'Aviso de trámite',
        estatus: 'enviado',
        tipo_evento: 'tramite_avance',
        intentos_envio: 1,
        archivos_adjuntos: [],
        metadata: {},
        created_at: '2026-09-22T10:00:00Z',
        escrituras: { instrumento: 48102, anio: 2026 },
        comparecientes: { nombre: 'Carlos Slim' },
      },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockBitacoraData, error: null }),
      }),
    })

    const { cargarBitacora, bitacora } = useNotificaciones()
    await cargarBitacora()

    expect(bitacora.value.length).toBe(1)
    expect(bitacora.value[0].destinatario_nombre).toBe('Carlos Slim')
    expect(bitacora.value[0].canal).toBe('whatsapp')
  })

  it('cargarPlantillas carga el catálogo de plantillas', async () => {
    const mockPlantillas = [
      {
        id: 'p-1',
        codigo: 'CITA_FIRMA_WHATSAPP',
        nombre: 'Citatorio de Firma',
        canal: 'whatsapp',
        cuerpo: 'Hola {{nombre_cliente}}',
        variables_disponibles: ['nombre_cliente'],
        requiere_confirmacion: true,
        activo: true,
      },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockPlantillas, error: null }),
      }),
    })

    const { cargarPlantillas, plantillas } = useNotificaciones()
    await cargarPlantillas()

    expect(plantillas.value.length).toBe(1)
    expect(plantillas.value[0].codigo).toBe('CITA_FIRMA_WHATSAPP')
  })

  it('cargarKpis calcula adecuadamente las 4 métricas principales', async () => {
    const mockItems = [
      { canal: 'whatsapp', estatus: 'enviado' },
      { canal: 'whatsapp', estatus: 'entregado' },
      { canal: 'correo', estatus: 'entregado' },
      { canal: 'correo', estatus: 'fallido' },
    ]

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }),
    })

    const { cargarKpis, kpis } = useNotificaciones()
    await cargarKpis()

    expect(kpis.value.total_enviados_mes).toBe(4)
    expect(kpis.value.total_whatsapp).toBe(2)
    expect(kpis.value.total_correo).toBe(2)
    expect(kpis.value.total_fallidos).toBe(1)
    expect(kpis.value.tasa_entrega_porcentaje).toBe(75) // 3 exitosos / 4 totales = 75%
  })

  it('enviarNotificacion realiza llamada al endpoint y recarga bitácora', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      notificacion_id: 'n-new-1',
      estatus: 'enviado',
      whatsapp_web_url: 'https://web.whatsapp.com/send?phone=525512345678',
    })

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const { enviarNotificacion } = useNotificaciones()
    const res = await enviarNotificacion({
      canal: 'whatsapp',
      destinatario_nombre: 'Juan Pérez',
      destinatario_contacto: '5512345678',
      cuerpo: 'Mensaje de prueba',
    })

    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/notificaciones/enviar', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('reenviarNotificacion realiza llamada al endpoint y actualiza el contador', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      notificacion_id: 'n-1',
      estatus: 'entregado',
      intentos_envio: 2,
    })

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const { reenviarNotificacion } = useNotificaciones()
    const res = await reenviarNotificacion('n-1')

    expect(res.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/notificaciones/reenviar', expect.objectContaining({
      method: 'POST',
      body: { notificacion_id: 'n-1', canal_alternativo: undefined },
    }))
  })
})
