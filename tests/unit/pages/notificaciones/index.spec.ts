import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

;(globalThis as any).definePageMeta = vi.fn()

const mockCargarBitacora = vi.fn()
const mockCargarPlantillas = vi.fn()
const mockCargarKpis = vi.fn()
const mockReenviar = vi.fn().mockResolvedValue({ ok: true })

vi.mock('~/composables/useNotificaciones', () => ({
  useNotificaciones: () => ({
    bitacora: ref([
      {
        id: 'n-1',
        canal: 'whatsapp',
        destinatario_nombre: 'Dr. Mauricio Gómez Alcántara',
        destinatario_contacto: '5541209912',
        asunto: 'Citatorio para Firma',
        cuerpo_renderizado: 'Su cita está lista.',
        estatus: 'leido',
        tipo_evento: 'cita_firma',
        intentos_envio: 1,
        archivos_adjuntos: [],
        metadata: {},
        created_at: '2026-09-22T10:45:00Z',
        updated_at: '2026-09-22T10:45:00Z',
        escrituras: { instrumento: 48102, anio: 2026 },
      },
    ]),
    plantillas: ref([]),
    kpis: ref({
      total_enviados_mes: 1842,
      tasa_entrega_porcentaje: 98,
      total_whatsapp: 1290,
      total_correo: 500,
      total_sms: 52,
      total_fallidos: 18,
      pendientes_reintento: 18,
    }),
    cargando: ref(false),
    enviando: ref(false),
    error: ref(null),
    cargarBitacora: mockCargarBitacora,
    cargarPlantillas: mockCargarPlantillas,
    cargarKpis: mockCargarKpis,
    reenviarNotificacion: mockReenviar,
  }),
}))

const NotificacionesIndexModule = await import('../../../../app/pages/notificaciones/index.vue')
const NotificacionesIndex = NotificacionesIndexModule.default

describe('pages/notificaciones/index.vue', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza la cabecera, métricas de KPIs y la bitácora', async () => {
    const wrapper = mount(NotificacionesIndex, {
      global: {
        plugins: [vuetify],
        stubs: {
          RedactarNotificacionModal: true,
          ConfigurarPlantillasModal: true,
        },
      },
    })

    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Centro de Notificaciones y Avisos a Comparecientes')
    expect(text).toContain('Total Enviados (Mes)')
    expect(text).toContain('Dr. Mauricio Gómez Alcántara')
    expect(text).toContain('+ Redactar Notificación')
    expect(text).toContain('Configurar Plantillas')
  })

  it('abre el modal de redacción al hacer clic en + Redactar Notificación', async () => {
    const wrapper = mount(NotificacionesIndex, {
      global: {
        plugins: [vuetify],
        stubs: {
          RedactarNotificacionModal: true,
          ConfigurarPlantillasModal: true,
        },
      },
    })

    await flushPromises()

    const btnRedactar = wrapper.find('[data-testid="btn-redactar-notificacion"]')
    expect(btnRedactar.exists()).toBe(true)

    await btnRedactar.trigger('click')
    expect(wrapper.vm.modalRedactarVisible).toBe(true)
  })
})
