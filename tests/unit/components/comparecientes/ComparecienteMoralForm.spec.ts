import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ComparecienteMoralForm from '@/components/comparecientes/ComparecienteMoralForm.vue'
import { createTestVuetify } from '../../test-utils'

const personasFisicas = [
  { id: 'pf-1', nombre: 'Lic. Fernando Garza Villarreal', rfc: 'GAVF780412MN8' },
  { id: 'pf-2', nombre: 'María Elena López Sosa', rfc: 'LOSM850101XYZ' },
]

function mountForm(props = {}) {
  const vuetify = createTestVuetify()
  return mount(ComparecienteMoralForm, {
    props: {
      personasFisicas,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('ComparecienteMoralForm', () => {
  it('no emite submit si la razón social o el RFC están vacíos', async () => {
    const wrapper = mountForm()

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('no emite submit si el RFC no cumple estructura de persona moral (12 caracteres)', async () => {
    const wrapper = mountForm({
      initialValues: {
        razonSocial: 'Inmobiliaria Altavista SA de CV',
        rfc: 'INVALIDO_RFC',
        nacionalidad: 'Mexicana',
      },
    })

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('emite submit exitosamente con datos válidos de persona moral', async () => {
    const wrapper = mountForm({
      initialValues: {
        razonSocial: 'Inmobiliaria Altavista SA de CV',
        rfc: 'DUB150320AB2', // RFC válido de 12 posiciones
        fechaConstitucion: '2015-03-20',
        nacionalidad: 'Mexicana',
        folioMercantil: 'FME-12345',
        instrumentoConstitutivo: 'Escritura 12,048',
        notarioConstitucion: 'Lic. Roberto Méndez',
        plazaConstitucion: 'Ciudad de México',
        representantes: [
          {
            representanteFisicaId: 'pf-1',
            representanteNombre: 'Lic. Fernando Garza Villarreal',
            tipoFacultades: 'Poder General para Actos de Dominio',
            vigente: true,
          },
        ],
        beneficiariosControladores: [
          {
            beneficiarioFisicaId: 'pf-1',
            beneficiarioNombre: 'Lic. Fernando Garza Villarreal',
            porcentajeParticipacion: 60,
            criterioControl: 'titularidad_acciones',
          },
        ],
      },
    })

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toBeTruthy()
    const values = emitted![0][0] as Record<string, unknown>
    expect(values.razonSocial).toBe('Inmobiliaria Altavista SA de CV')
    expect(values.rfc).toBe('DUB150320AB2')
    expect(values.folioMercantil).toBe('FME-12345')
    expect((values.representantes as any[]).length).toBe(1)
    expect((values.beneficiariosControladores as any[]).length).toBe(1)
  })

  it('emite cancel al presionar el botón Cancelar', async () => {
    const wrapper = mountForm()
    const cancelBtn = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Cancelar'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn!.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })
})
