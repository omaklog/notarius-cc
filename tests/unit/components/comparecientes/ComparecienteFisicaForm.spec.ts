import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ComparecienteFisicaForm from '@/components/comparecientes/ComparecienteFisicaForm.vue'
import { createTestVuetify } from '../../test-utils'

const tiposIdentificacion = [
  { id: 'tipo-ine', nombre: 'Credencial para Votar (INE/IFE)' },
  { id: 'tipo-pasaporte', nombre: 'Pasaporte Oficial' },
]

const regimenesPatrimoniales = [
  { id: 'reg-sociedad', nombre: 'Sociedad Conyugal' },
  { id: 'reg-separacion', nombre: 'Separación de Bienes' },
]

function mountForm(props = {}) {
  const vuetify = createTestVuetify()
  return mount(ComparecienteFisicaForm, {
    props: {
      tiposIdentificacion,
      regimenesPatrimoniales,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('ComparecienteFisicaForm', () => {
  it('no emite submit si los campos requeridos están vacíos', async () => {
    const wrapper = mountForm()

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('no emite submit si el estado civil es casado pero no se seleccionó régimen patrimonial', async () => {
    const wrapper = mountForm({
      initialValues: {
        nombres: 'Roberto',
        primerApellido: 'Méndez',
        rfc: 'MELM8305281H0',
        curp: 'MELM830528HDFNNB05',
        fechaNacimiento: '1983-05-28',
        genero: 'M',
        nacionalidad: 'Mexicana',
        estadoCivil: 'casado',
        regimenPatrimonialId: null,
      },
    })

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('emite submit exitosamente con datos válidos para soltero', async () => {
    const wrapper = mountForm({
      initialValues: {
        nombres: 'María Elena',
        primerApellido: 'López',
        segundoApellido: 'Sosa',
        rfc: 'LOSM850101XYZ', // RFC válido de 13 caracteres
        curp: 'LOSM850101MDFPRR03', // CURP válida con dígito verificador 3
        fechaNacimiento: '1985-01-01',
        genero: 'F',
        nacionalidad: 'Mexicana',
        estadoCivil: 'soltero',
        ocupacion: 'Abogada',
      },
    })

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const values = emitted![0][0] as Record<string, unknown>
    expect(values.nombres).toBe('María Elena')
    expect(values.primerApellido).toBe('López')
    expect(values.rfc).toBe('LOSM850101XYZ')
    expect(values.curp).toBe('LOSM850101MDFPRR03')
    expect(values.estadoCivil).toBe('soltero')
    expect(values.regimenPatrimonialId).toBeNull()
  })

  it('emite submit cuando está casado y se proporciona régimen patrimonial', async () => {
    const wrapper = mountForm({
      initialValues: {
        nombres: 'Juan',
        primerApellido: 'Pérez',
        rfc: 'PEPJ8001019H1',
        curp: 'PEPJ800101HDFRRN03',
        fechaNacimiento: '1980-01-01',
        genero: 'M',
        nacionalidad: 'Mexicana',
        estadoCivil: 'casado',
        regimenPatrimonialId: 'reg-sociedad',
      },
    })

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const values = emitted![0][0] as Record<string, unknown>
    expect(values.estadoCivil).toBe('casado')
    expect(values.regimenPatrimonialId).toBe('reg-sociedad')
  })

  it('emite cancel al hacer clic en el botón Cancelar', async () => {
    const wrapper = mountForm()
    const cancelBtn = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Cancelar'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
