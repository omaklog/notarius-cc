import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificacionesVisorDrawer from '../../../../app/components/notificaciones/NotificacionesVisorDrawer.vue'
import { createTestVuetify } from '../../test-utils'
import type { NotificacionBitacoraItem } from '~/types/notificaciones'

describe('NotificacionesVisorDrawer', () => {
  const vuetify = createTestVuetify()

  const mockItem: NotificacionBitacoraItem = {
    id: 'notif-1',
    canal: 'whatsapp',
    destinatario_nombre: 'Dr. Mauricio Gómez Alcántara',
    destinatario_contacto: '5541209912',
    asunto: 'Citatorio para Firma',
    cuerpo_renderizado: 'Su cita para la firma de la escritura #48102 está confirmada.',
    estatus: 'leido',
    tipo_evento: 'cita_firma',
    intentos_envio: 1,
    archivos_adjuntos: [
      {
        nombre: 'citatorio.pdf',
        url: 'https://storage.notaria.local/citatorio.pdf',
        tamano_bytes: 1048576,
        tipo_mime: 'application/pdf',
      },
    ],
    metadata: {
      mensaje_proveedor: 'Despachado exitosamente',
      whatsapp_web_url: 'https://web.whatsapp.com/send?phone=525541209912',
    },
    created_at: '2026-09-22T10:45:00Z',
    updated_at: '2026-09-22T10:48:00Z',
    escrituras: { instrumento: 48102, anio: 2026 },
  }

  it('muestra datos del destinatario, mensaje renderizado y archivos adjuntos', () => {
    const wrapper = mount(NotificacionesVisorDrawer, {
      global: { plugins: [vuetify] },
      props: {
        notificacion: mockItem,
        enviando: false,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Dr. Mauricio Gómez Alcántara')
    expect(text).toContain('5541209912')
    expect(text).toContain('Su cita para la firma de la escritura #48102 está confirmada.')
    expect(text).toContain('citatorio.pdf')
    expect(text).toContain('Inst. #48102')
  })

  it('emite evento reenviar al pulsar el botón principal', async () => {
    const wrapper = mount(NotificacionesVisorDrawer, {
      global: { plugins: [vuetify] },
      props: {
        notificacion: mockItem,
        enviando: false,
      },
    })

    const btnReenviar = wrapper.find('[data-testid="btn-visor-reenviar"]')
    expect(btnReenviar.exists()).toBe(true)

    await btnReenviar.trigger('click')
    expect(wrapper.emitted('reenviar')).toBeTruthy()
  })

  it('emite abrir-whatsapp si la notificación tiene url de WhatsApp Web', async () => {
    const wrapper = mount(NotificacionesVisorDrawer, {
      global: { plugins: [vuetify] },
      props: {
        notificacion: mockItem,
        enviando: false,
      },
    })

    const btnWa = wrapper.find('[data-testid="btn-abrir-whatsapp-web"]')
    expect(btnWa.exists()).toBe(true)

    await btnWa.trigger('click')
    expect(wrapper.emitted('abrir-whatsapp')).toBeTruthy()
  })
})
