import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import { createTestVuetify } from '../../test-utils'
import CotejoRazonImprimible from '~/components/cotejos/CotejoRazonImprimible.vue'

const mockActa = {
  id: 'acta-test-1',
  libro_id: 'libro-1',
  numero_acta: 42,
  anio: 2026,
  fecha_cotejo: new Date().toISOString(),
  solicitante_nombre: 'Ing. Carlos Mendoza Silva',
  solicitante_identificacion: 'INE 0924081928491',
  tipo_documento: 'Título Profesional',
  documento_descripcion: 'Título Profesional de Médico Cirujano UNAM',
  numero_hojas: 2,
  numero_tantos: 3,
  observaciones: 'Original con sellos nítidos',
  estatus: 'autorizado',
  libro: {
    numero_libro: 14,
    anio: 2026
  }
}

vi.mock('~/composables/useConfiguracionNotarial', () => ({
  useConfiguracionNotarial: () => ({
    nombreNotariaCompleto: computed(() => 'Notaría Pública No. 44 del Estado de México'),
    titularCompleto: computed(() => 'Lic. Fernando Notario Titular'),
    domicilioCompleto: computed(() => 'Av. Hidalgo Poniente 102, Col. Centro, Toluca'),
    logotipoUrl: computed(() => 'https://example.com/logo.png'),
    selloNotarialUrl: computed(() => 'https://example.com/sello.png'),
    configuracion: computed(() => ({
      entidad_federativa: 'Estado de México',
      municipio: 'Toluca'
    }))
  })
}))

vi.mock('~/composables/useCotejos', () => ({
  useCotejos: () => ({
    generarTextoRazonCotejo: vi.fn().mockImplementation((acta) => {
      return `EL SUSCRITO NOTARIO HACE CONSTAR QUE LAS 2 FOJAS ÚTILES CONCUERDAN CON EL ORIGINAL DE ${acta.solicitante_nombre.toUpperCase()} EN ACTA ${acta.numero_acta}. DOY FE.`
    })
  })
}))

describe('CotejoRazonImprimible.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  beforeEach(() => {
    vi.clearAllMocks()
    vuetify = createTestVuetify()
    window.print = vi.fn()
  })

  it('renderiza el membrete oficial con datos dinámicos de identidad notarial', async () => {
    const wrapper = mount(CotejoRazonImprimible, {
      props: {
        modelValue: true,
        acta: mockActa as any
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Notaría Pública No. 44 del Estado de México')
    expect(wrapper.text()).toContain('Lic. Fernando Notario Titular')
    expect(wrapper.text()).toContain('Av. Hidalgo Poniente 102')
    expect(wrapper.text()).toContain('#42')
    expect(wrapper.text()).toContain('Libro 14 · 2026')
  })

  it('despliega el texto de la razón notarial jurídica en formato Hoja Carta', async () => {
    const wrapper = mount(CotejoRazonImprimible, {
      props: {
        modelValue: true,
        acta: mockActa as any
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('EL SUSCRITO NOTARIO HACE CONSTAR')
    expect(wrapper.text()).toContain('ING. CARLOS MENDOZA SILVA')
    expect(wrapper.text()).toContain('ACTA 42')
    expect(wrapper.text()).toContain('DOY FE')
    expect(wrapper.text()).toContain('Original con sellos nítidos')
  })

  it('permite alternar al formato de Etiqueta Adhesiva', async () => {
    const wrapper = mount(CotejoRazonImprimible, {
      props: {
        modelValue: true,
        acta: mockActa as any
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    // Cambiar formato a etiqueta
    ;(wrapper.vm as any).formato = 'etiqueta'
    await flushPromises()

    expect(wrapper.find('.etiqueta-adhesiva').exists()).toBe(true)
    expect(wrapper.text()).toContain('ACTA #42 · LIBRO 14')
  })

  it('ejecuta window.print al pulsar imprimir', async () => {
    const printSpy = vi.spyOn(window, 'print')

    const wrapper = mount(CotejoRazonImprimible, {
      props: {
        modelValue: true,
        acta: mockActa as any
      },
      global: {
        plugins: [vuetify],
        stubs: {
          'v-dialog': {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    ;(wrapper.vm as any).imprimir()
    expect(printSpy).toHaveBeenCalled()
  })
})
