import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificacionesTable from '../../../../app/components/notificaciones/NotificacionesTable.vue'
import { createTestVuetify } from '../../test-utils'
import type { NotificacionBitacoraItem } from '~/types/notificaciones'

describe('NotificacionesTable', () => {
  const vuetify = createTestVuetify()

  const mockItems: NotificacionBitacoraItem[] = [
    {
      id: 'notif-1',
      canal: 'whatsapp',
      destinatario_nombre: 'Dr. Mauricio Gómez',
      destinatario_contacto: '5541209912',
      asunto: 'Citatorio para Firma',
      cuerpo_renderizado: 'Su cita para la firma está lista.',
      estatus: 'leido',
      tipo_evento: 'cita_firma',
      intentos_envio: 1,
      archivos_adjuntos: [],
      metadata: {},
      created_at: '2026-09-22T10:45:00Z',
      updated_at: '2026-09-22T10:45:00Z',
      escrituras: { instrumento: 48102, anio: 2026 },
    },
    {
      id: 'notif-2',
      canal: 'correo',
      destinatario_nombre: 'Ing. Fernando Tapia',
      destinatario_contacto: 'ftapia@example.com',
      asunto: 'Prevención Documental',
      cuerpo_renderizado: 'Falta constancia de situación fiscal.',
      estatus: 'fallido',
      tipo_evento: 'manual',
      intentos_envio: 1,
      archivos_adjuntos: [],
      metadata: {},
      created_at: '2026-09-21T18:15:00Z',
      updated_at: '2026-09-21T18:15:00Z',
      escrituras: { instrumento: 48098, anio: 2026 },
    },
  ]

  it('renderiza la lista de notificaciones con sus comparecientes e instrumentos', () => {
    const wrapper = mount(NotificacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        items: mockItems,
        cargando: false,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('Dr. Mauricio Gómez')
    expect(text).toContain('#48102')
    expect(text).toContain('Ing. Fernando Tapia')
    expect(text).toContain('#48098')
  })

  it('emite evento select al hacer clic en un renglón', async () => {
    const wrapper = mount(NotificacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        items: mockItems,
        cargando: false,
      },
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)

    await rows[0].trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toEqual(mockItems[0])
  })

  it('emite evento reenviar al accionar el botón de reenvío', async () => {
    const wrapper = mount(NotificacionesTable, {
      global: { plugins: [vuetify] },
      props: {
        items: mockItems,
        cargando: false,
      },
    })

    const btnReenviar = wrapper.find('[data-testid="btn-reenviar-notif-2"]')
    expect(btnReenviar.exists()).toBe(true)

    await btnReenviar.trigger('click')
    expect(wrapper.emitted('reenviar')).toBeTruthy()
    expect(wrapper.emitted('reenviar')![0][0]).toEqual(mockItems[1])
  })
})
