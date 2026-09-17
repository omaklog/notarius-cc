import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

const mockComparecientes = [
  {
    id: 'comp-1',
    nombre: 'Fernando Garza Villarreal',
    tipo_persona: 'fisica',
    rfc: 'GAVF780412MN8',
    email: 'fernando.garza@example.com',
    telefono: '5512345678',
    activo: true,
    created_at: '2026-07-29T10:00:00Z',
    compareciente_personas_fisicas: {
      nombres: 'Fernando',
      primer_apellido: 'Garza',
      segundo_apellido: 'Villarreal',
      curp: 'GAVF780412HDFRRN01',
      fecha_nacimiento: '1978-04-12',
      genero: 'M',
      nacionalidad: 'Mexicana',
      estado_civil: 'soltero',
      regimen_patrimonial_id: null,
      ocupacion: 'Arquitecto',
    },
    compareciente_personas_morales: null,
  },
  {
    id: 'comp-2',
    nombre: 'Inmobiliaria Altavista SA de CV',
    tipo_persona: 'moral',
    rfc: 'IAL100520AB1',
    email: 'contacto@altavista.mx',
    telefono: '5598765432',
    activo: true,
    created_at: '2026-07-29T11:00:00Z',
    compareciente_personas_fisicas: null,
    compareciente_personas_morales: {
      razon_social: 'Inmobiliaria Altavista SA de CV',
      folio_mercantil: 'FM-98412-CDMX',
    },
  },
]

const { mockRpc, mockSelectComparecientes, mockSelectTipos, mockSelectRegimenes } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSelectComparecientes: vi.fn(),
  mockSelectTipos: vi.fn(),
  mockSelectRegimenes: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'comparecientes') {
        return {
          select: () => {
            const chain: any = {
              order: () => mockSelectComparecientes(),
              eq: () => chain,
              or: () => chain,
            }
            return chain
          },
        }
      }
      if (table === 'tipos_identificacion_oficial') {
        return {
          select: () => ({
            eq: () => ({
              order: mockSelectTipos,
            }),
          }),
        }
      }
      if (table === 'regimenes_patrimoniales') {
        return {
          select: () => ({
            eq: () => ({
              order: mockSelectRegimenes,
            }),
          }),
        }
      }
      if (table === 'compareciente_representantes') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          insert: () => Promise.resolve({ data: [], error: null }),
        }
      }
      if (table === 'compareciente_beneficiarios_controladores') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          insert: () => Promise.resolve({ data: [], error: null }),
        }
      }
      throw new Error(`Tabla no mockeada: ${table}`)
    },
    rpc: mockRpc,
  }),
}))

;(globalThis as any).definePageMeta = vi.fn()

const ComparecientesIndex = (await import('@/pages/comparecientes/index.vue')).default

function mountPage() {
  const vuetify = createTestVuetify()
  return mount(ComparecientesIndex, {
    global: {
      plugins: [vuetify],
      stubs: {
        'router-link': true,
      },
    },
  })
}

describe('Directorio de Comparecientes (index.vue)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectComparecientes.mockResolvedValue({ data: mockComparecientes, error: null })
    mockSelectTipos.mockResolvedValue({
      data: [{ id: 'tipo-ine', nombre: 'INE', codigo: 'ine' }],
      error: null,
    })
    mockSelectRegimenes.mockResolvedValue({
      data: [{ id: 'reg-sociedad', nombre: 'Sociedad Conyugal', codigo: 'sociedad_conyugal' }],
      error: null,
    })
  })

  it('monta la vista y carga la lista de comparecientes', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(mockSelectComparecientes).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Directorio de Comparecientes')
    expect(wrapper.text()).toContain('Fernando Garza Villarreal')
    expect(wrapper.text()).toContain('Inmobiliaria Altavista SA de CV')
    expect(wrapper.text()).toContain('GAVF780412MN8')
  })

  it('calcula las métricas de personas físicas y morales', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const cards = wrapper.findAll('.v-card')
    expect(wrapper.text()).toContain('TOTAL EN PADRÓN')
    expect(wrapper.text()).toContain('PERSONAS FÍSICAS')
    expect(wrapper.text()).toContain('PERSONAS MORALES')
  })

  it('abre el diálogo al hacer clic en Registrar Compareciente', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const btnRegistrar = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Registrar Compareciente'))
    expect(btnRegistrar).toBeDefined()
    await btnRegistrar!.trigger('click')
    await flushPromises()

    const dialog = wrapper.findComponent({ name: 'VDialog' })
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('modelValue')).toBe(true)
  })

  it('abre el modal en modo moral al hacer clic en editar persona moral', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    await vm.abrirEditar(mockComparecientes[1])
    await flushPromises()

    expect(vm.tipoPersonaModal).toBe('moral')
    expect(vm.showDialog).toBe(true)
    expect(vm.editingComparecienteMoral).toBeTruthy()
    expect(vm.editingComparecienteMoral.razonSocial).toBe('Inmobiliaria Altavista SA de CV')
  })
})
