import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportesGraficaRedactores from '@/components/reportes/ReportesGraficaRedactores.vue'
import ReportesGraficaActosTop from '@/components/reportes/ReportesGraficaActosTop.vue'
import { createTestVuetify } from '../../test-utils'
import type { RedactorCargaItem, ActoDemandaItem } from '~/types/reportes'

describe('ReportesGraficas SVG', () => {
  const vuetify = createTestVuetify()

  describe('ReportesGraficaRedactores', () => {
    const mockRedactores: RedactorCargaItem[] = [
      { redactor_id: 'r1', nombre: 'Lic. Ana Ruiz', cantidad_escrituras: 12, porcentaje: 60 },
      { redactor_id: 'r2', nombre: 'Lic. Carlos Mena', cantidad_escrituras: 8, porcentaje: 40 },
    ]

    it('renderiza la lista de redactores y sus barras SVG', () => {
      const wrapper = mount(ReportesGraficaRedactores, {
        global: { plugins: [vuetify] },
        props: {
          redactores: mockRedactores,
          cargando: false,
        },
      })

      const text = wrapper.text()
      expect(text).toContain('Lic. Ana Ruiz')
      expect(text).toContain('12 escrituras')
      expect(text).toContain('(60%)')
      expect(text).toContain('Lic. Carlos Mena')
      expect(text).toContain('8 escrituras')
      expect(text).toContain('(40%)')

      const rects = wrapper.findAll('svg rect')
      expect(rects.length).toBe(2)
    })

    it('muestra estado vacío si la lista de redactores está vacía', () => {
      const wrapper = mount(ReportesGraficaRedactores, {
        global: { plugins: [vuetify] },
        props: {
          redactores: [],
          cargando: false,
        },
      })

      expect(wrapper.text()).toContain('Sin Asignaciones en el Periodo')
    })
  })

  describe('ReportesGraficaActosTop', () => {
    const mockActos: ActoDemandaItem[] = [
      { acto_id: 'a1', nombre: 'Compraventa', cantidad: 20, porcentaje: 50 },
      { acto_id: 'a2', nombre: 'Poder Notarial', cantidad: 10, porcentaje: 25 },
      { acto_id: 'a3', nombre: 'Testamento', cantidad: 10, porcentaje: 25 },
    ]

    it('renderiza el gráfico de dona y los segmentos SVG', () => {
      const wrapper = mount(ReportesGraficaActosTop, {
        global: { plugins: [vuetify] },
        props: {
          actos: mockActos,
          cargando: false,
        },
      })

      const text = wrapper.text()
      expect(text).toContain('Compraventa')
      expect(text).toContain('50%')
      expect(text).toContain('Poder Notarial')
      expect(text).toContain('Testamento')
      expect(text).toContain('40') // total de actos en el centro

      const circles = wrapper.findAll('svg.dona-svg circle')
      expect(circles.length).toBe(3)
    })

    it('muestra estado vacío si no hay actos en el periodo', () => {
      const wrapper = mount(ReportesGraficaActosTop, {
        global: { plugins: [vuetify] },
        props: {
          actos: [],
          cargando: false,
        },
      })

      expect(wrapper.text()).toContain('Sin Datos de Actos Notariales')
    })
  })
})
