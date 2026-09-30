import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HonorariosPartidasTable from '@/components/honorarios/HonorariosPartidasTable.vue'
import { createTestVuetify } from '../../test-utils'
import type { HonorariosPartida } from '~/types/honorarios'

describe('HonorariosPartidasTable', () => {
  const vuetify = createTestVuetify()

  it('muestra mensaje cuando no hay partidas', () => {
    const wrapper = mount(HonorariosPartidasTable, {
      props: { partidas: [] },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('No hay partidas cotizadas en esta cuenta')
  })

  it('renderiza las partidas y los totales correctamente', () => {
    const partidas: HonorariosPartida[] = [
      {
        id: 'p-1',
        concepto: 'Honorarios por protocolización',
        monto: 25000,
        aplica_iva: true,
        tasa_iva: 0.16,
        es_descuento: false,
        orden: 0,
      },
      {
        id: 'p-2',
        concepto: 'Cotejo y certificaciones',
        monto: 3000,
        aplica_iva: false,
        tasa_iva: 0,
        es_descuento: false,
        orden: 1,
      },
    ]

    const wrapper = mount(HonorariosPartidasTable, {
      props: { partidas, puedeEditar: true },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('Honorarios por protocolización')
    expect(wrapper.text()).toContain('Cotejo y certificaciones')
    expect(wrapper.text()).toContain('$ 25,000.00 MXN')
    expect(wrapper.text()).toContain('$ 3,000.00 MXN')
    // IVA: 25,000 * 0.16 = 4,000
    expect(wrapper.text()).toContain('$ 4,000.00 MXN')
    // Total notaría: 25,000 + 3,000 + 4,000 = 32,000
    expect(wrapper.text()).toContain('$ 32,000.00 MXN')
  })

  it('emite agregarPartida al hacer clic en el botón', async () => {
    const wrapper = mount(HonorariosPartidasTable, {
      props: { partidas: [], puedeEditar: true },
      global: { plugins: [vuetify] },
    })

    const btn = wrapper.find('button')
    await btn.trigger('click')

    expect(wrapper.emitted('agregarPartida')).toBeTruthy()
  })
})
