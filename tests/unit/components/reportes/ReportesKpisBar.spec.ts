import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportesKpisBar from '@/components/reportes/ReportesKpisBar.vue'
import { createTestVuetify } from '../../test-utils'
import type { ResumenKpisMes } from '~/types/reportes'

describe('ReportesKpisBar', () => {
  const vuetify = createTestVuetify()

  const mockKpis: ResumenKpisMes = {
    total_abiertas_mes: 42,
    total_firmadas_mes: 35,
    total_en_tramite: 18,
    total_canceladas: 3,
  }

  it('muestra las 4 tarjetas de KPIs con sus valores numéricos', () => {
    const wrapper = mount(ReportesKpisBar, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
        mes: 9,
        anio: 2026,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('42')
    expect(text).toContain('35')
    expect(text).toContain('18')
    expect(text).toContain('3')
    expect(text).toContain('Abiertas en el Mes')
    expect(text).toContain('Firmadas en el Mes')
    expect(text).toContain('En Trámite Activo')
    expect(text).toContain('Canceladas')
  })

  it('emite refrescar al hacer click en el botón de actualización', async () => {
    const wrapper = mount(ReportesKpisBar, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
        mes: 9,
        anio: 2026,
      },
    })

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Actualizar'))
    expect(btn).toBeDefined()
    await btn?.trigger('click')

    expect(wrapper.emitted('refrescar')).toBeTruthy()
  })

  it('emite cambio-periodo al invocar onCambioPeriodo', async () => {
    const wrapper = mount(ReportesKpisBar, {
      global: { plugins: [vuetify] },
      props: {
        kpis: mockKpis,
        mes: 9,
        anio: 2026,
      },
    })

    const vm = wrapper.vm as any
    vm.onCambioPeriodo()

    expect(wrapper.emitted('cambio-periodo')).toBeTruthy()
    expect(wrapper.emitted('cambio-periodo')?.[0]).toEqual([{ mes: 9, anio: 2026 }])
  })
})
