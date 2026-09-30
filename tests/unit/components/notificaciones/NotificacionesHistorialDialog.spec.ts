import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import NotificacionesHistorialDialog from '../../../../app/components/notificaciones/modal/NotificacionesHistorialDialog.vue'
import { createTestVuetify } from '../../test-utils'

const mockCargar = vi.fn()
const mockBitacora = ref([
  {
    id: 'n-esc-1',
    escritura_id: 'esc-101',
    canal: 'whatsapp',
    destinatario_nombre: 'Mariana Silva',
    destinatario_contacto: '5511223344',
    asunto: 'Citatorio para Firma',
    cuerpo_renderizado: 'Su cita para la firma está programada.',
    estatus: 'entregado',
    tipo_evento: 'cita_firma',
    intentos_envio: 1,
    archivos_adjuntos: [],
    metadata: {},
    created_at: '2026-09-22T11:00:00Z',
    updated_at: '2026-09-22T11:00:00Z',
    escrituras: { instrumento: 48102, anio: 2026 },
  },
])

vi.mock('~/composables/useNotificaciones', () => ({
  useNotificaciones: () => ({
    bitacora: mockBitacora,
    plantillas: ref([]),
    cargando: ref(false),
    enviando: ref(false),
    error: ref(null),
    cargarBitacora: mockCargar,
    cargarPlantillas: vi.fn(),
    reenviarNotificacion: vi.fn().mockResolvedValue({ ok: true }),
  }),
}))

describe('NotificacionesHistorialDialog', () => {
  const vuetify = createTestVuetify()

  it('muestra las notificaciones correspondientes a la escritura vinculada', async () => {
    const wrapper = mount(NotificacionesHistorialDialog, {
      global: {
        plugins: [vuetify],
        stubs: {
          RedactarNotificacionModal: true,
        },
      },
      props: {
        modelValue: true,
        escrituraId: 'esc-101',
        instrumento: 48102,
      },
      attachTo: document.body,
    })

    const bodyText = document.body.textContent || ''
    expect(bodyText).toContain('Avisos Notariales — Instrumento #48102')
    expect(bodyText).toContain('Mariana Silva')
    expect(bodyText).toContain('Citatorio para Firma')

    wrapper.unmount()
  })

  it('llama a cargarBitacora filtrando por la escrituraId al montarse', () => {
    const wrapper = mount(NotificacionesHistorialDialog, {
      global: {
        plugins: [vuetify],
        stubs: {
          RedactarNotificacionModal: true,
        },
      },
      props: {
        modelValue: true,
        escrituraId: 'esc-101',
        instrumento: 48102,
      },
      attachTo: document.body,
    })

    expect(mockCargar).toHaveBeenCalledWith(expect.objectContaining({
      escritura_id: 'esc-101',
    }))

    wrapper.unmount()
  })
})
