import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificacionesKpisBar from '../../../../app/components/notificaciones/NotificacionesKpisBar.vue'
import { createTestVuetify } from '../../test-utils'
import type { NotificacionesKpis } from '~/types/notificaciones'

describe('NotificacionesKpisBar', () => {
  const vuetify = createTestVuetify()

  const mockKpis: NotificacionesKpis = {
    total_enviados_mes: 1842,
    tasa_entrega_porcentaje: 98,
    total_whatsapp: 1290,
    total_correo: 500,
    total_sms: 52,
    total_fallidos: 18,
    pendientes_reintento: 18,
  }

  it('despliega los valores de las 4 tarjetas de KPIs correctamente', () => {
    const wrapper = mount(NotificacionesKpisBar, {
      global: { plugins: [vuetify] },
      props: { kpis: mockKpis },
    })

    const text = wrapper.text()
    expect(text).toContain('1,842')
    expect(text).toContain('98%')
    expect(text).toContain('1,290')
    expect(text).toContain('18')
    expect(text).toContain('Total Enviados (Mes)')
    expect(text).toContain('Tasa de Entrega')
    expect(text).toContain('Canal WhatsApp')
    expect(text).toContain('Fallidos / Por Reintentar')
  })

  it('muestra badge de Acción Requerida cuando hay fallidos', () => {
    const wrapper = mount(NotificacionesKpisBar, {
      global: { plugins: [vuetify] },
      props: { kpis: mockKpis },
    })

    expect(wrapper.text()).toContain('Acción Requerida')
  })
})
