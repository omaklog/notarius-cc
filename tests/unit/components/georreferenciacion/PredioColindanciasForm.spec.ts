import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PredioColindanciasForm from '~/components/georreferenciacion/PredioColindanciasForm.vue'
import { createTestVuetify } from '../../test-utils'

describe('PredioColindanciasForm Component', () => {
  const vuetify = createTestVuetify()

  it('muestra mensaje cuando no hay linderos registrados', () => {
    const wrapper = mount(PredioColindanciasForm, {
      props: {
        modelValue: [],
        editable: true
      },
      global: { plugins: [vuetify] }
    })

    expect(wrapper.text()).toContain('No se han registrado linderos ni colindancias')
  })

  it('permite agregar un lindero manual al pulsar el botón', async () => {
    const wrapper = mount(PredioColindanciasForm, {
      props: {
        modelValue: [],
        editable: true
      },
      global: { plugins: [vuetify] }
    })

    const btnAgregar = wrapper.findAll('button').find((b) => b.text().includes('Agregar Lindero'))
    expect(btnAgregar).toBeDefined()
    await btnAgregar!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue')![0][0] as any[]
    expect(emitted).toHaveLength(1)
    expect(emitted[0].orientacion).toBe('Norte')
  })

  it('calcula y genera linderos a partir de las coordenadas del polígono', async () => {
    // Polígono de 4 esquinas en CDMX
    const coords: [number, number][] = [
      [-99.1332, 19.4326],
      [-99.1330, 19.4326],
      [-99.1330, 19.4328],
      [-99.1332, 19.4328],
      [-99.1332, 19.4326]
    ]

    const wrapper = mount(PredioColindanciasForm, {
      props: {
        modelValue: [],
        coordenadasPoligono: coords,
        editable: true
      },
      global: { plugins: [vuetify] }
    })

    const btnGenerar = wrapper.findAll('button').find((b) => b.text().includes('Generar desde Polígono'))
    expect(btnGenerar).toBeDefined()
    await btnGenerar!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue')![0][0] as any[]
    expect(emitted).toHaveLength(4)
    expect(emitted[0].distancia_m).toBeGreaterThan(0)
  })
})
