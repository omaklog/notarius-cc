import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createTestVuetify } from '../../test-utils'
import PldComparecientesTable from '@/components/pld/PldComparecientesTable.vue'
import { usePldStore } from '@/stores/pld'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'bc-1',
            persona_moral_id: 'comp-moral',
            nombres: 'Roberto',
            primer_apellido: 'Gómez',
            porcentaje_participacion: 100
          }
        ],
        error: null
      })
    }))
  })),
  rpc: vi.fn()
}

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockSupabase
}))

describe('PldComparecientesTable.vue', () => {
  let vuetify: ReturnType<typeof createTestVuetify>

  const mockComparecientes = [
    {
      id: 'ec-1',
      compareciente_id: 'comp-1',
      nombre: 'Juan Manuel Morales Domínguez',
      tipo_persona: 'fisica',
      rfc: 'MODJ800101XYZ',
      rol: 'Enajenante',
      porcentaje_participacion: 100
    },
    {
      id: 'ec-2',
      compareciente_id: 'comp-moral',
      nombre: 'Desarrolladora Urbana del Bajío S.A. de C.V.',
      tipo_persona: 'moral',
      rfc: 'DUB120304ABC',
      rol: 'Adquirente',
      porcentaje_participacion: 50
    },
    {
      id: 'ec-3',
      compareciente_id: 'comp-pep',
      nombre: 'Fernando Garza Villalobos',
      tipo_persona: 'fisica',
      rfc: 'GAVF750912MN1',
      rol: 'Adquirente',
      porcentaje_participacion: 50
    }
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vuetify = createTestVuetify()
    vi.clearAllMocks()
  })

  it('renderiza la lista de comparecientes con sus roles y RFCs', async () => {
    const store = usePldStore()
    store.consultasMap['comp-1'] = {
      lpb_uif: { id: 'c1', resultado: 'limpio' } as any,
      ofac_sdn: { id: 'c2', resultado: 'limpio' } as any,
      onu_cs: { id: 'c3', resultado: 'limpio' } as any,
      sat_69b: { id: 'c4', resultado: 'limpio' } as any
    }

    const wrapper = mount(PldComparecientesTable, {
      props: {
        escrituraId: 'esc-123',
        comparecientes: mockComparecientes
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Juan Manuel Morales Domínguez')
    expect(wrapper.text()).toContain('MODJ800101XYZ')
    expect(wrapper.text()).toContain('Desarrolladora Urbana del Bajío S.A. de C.V.')
    expect(wrapper.text()).toContain('DUB120304ABC')
    expect(wrapper.text()).toContain('Fernando Garza Villalobos')
  })

  it('muestra acreditación de Beneficiario Controlador para personas morales', async () => {
    const wrapper = mount(PldComparecientesTable, {
      props: {
        escrituraId: 'esc-123',
        comparecientes: mockComparecientes
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Beneficiario Controlador:')
    expect(wrapper.text()).toContain('Roberto Gómez')
    expect(wrapper.text()).toContain('Acreditado al 100% de acciones')
  })

  it('emite abrir-screening al pulsar Expediente PLD', async () => {
    const wrapper = mount(PldComparecientesTable, {
      props: {
        escrituraId: 'esc-123',
        comparecientes: mockComparecientes
      },
      global: {
        plugins: [vuetify]
      }
    })

    await flushPromises()

    const btnExpediente = wrapper.findAll('button').find(b => b.text().includes('Expediente PLD'))
    expect(btnExpediente).toBeDefined()
    await btnExpediente!.trigger('click')

    expect(wrapper.emitted('abrir-screening')).toBeTruthy()
    expect(wrapper.emitted('abrir-screening')![0][0]).toEqual(mockComparecientes[0])
  })
})
