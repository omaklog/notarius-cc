import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import EscrituraForm from '@/components/escrituras/EscrituraForm.vue'
import { createTestVuetify } from '../../test-utils'

const actosJuridicos = [
  { id: 'acto-1', nombre: 'Compraventa' },
  { id: 'acto-2', nombre: 'Testamento' },
]

function mountForm() {
  const vuetify = createTestVuetify()
  return mount(EscrituraForm, {
    props: { actosJuridicos },
    global: { plugins: [vuetify] },
  })
}

// wrapper.find('form').trigger('submit.prevent') es poco confiable en
// happy-dom para handleSubmit() de VeeValidate — se invoca onSubmit()
// expuesto directamente (mismo patrón ya usado en RoleForm.spec.ts).
describe('EscrituraForm', () => {
  it('no emite submit si faltan los campos obligatorios', async () => {
    const wrapper = mountForm()

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('emite submit con los valores capturados, incluyendo número de instrumento y volumen', async () => {
    const wrapper = mountForm()

    const select = wrapper.findComponent({ name: 'VSelect' })
    await select.setValue('acto-1')

    function fieldByLabel(label: string) {
      return wrapper
        .findAllComponents({ name: 'VTextField' })
        .find((field) => field.props('label') === label)!
    }

    await fieldByLabel('Número de escritura / Instrumento').setValue(48102)
    await fieldByLabel('Volumen').setValue(1)
    await fieldByLabel('Objeto').setValue('Compraventa de prueba')

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const values = emitted![0][0] as Record<string, unknown>
    expect(values.instrumento).toBe(48102)
    expect(values.volumen).toBe(1)
    expect(values.actoJuridicoId).toBe('acto-1')
    expect(values.objeto).toBe('Compraventa de prueba')
    expect(values.paginaInicial).toBeNull()
    expect(values.paginaFinal).toBeNull()
    expect(values.fechaCelebracion).toBeNull()
    expect(values.montoOperacion).toBeNull()
    expect(values.observaciones).toBeNull()
  })
})
