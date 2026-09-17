import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

const mockActos = [
  {
    id: 'acto-1',
    nombre: 'Compraventa',
    descripcion: 'Traslativo de dominio',
    tipo: 'traslativo',
    activo: true,
  },
  {
    id: 'acto-2',
    nombre: 'Poder notarial',
    descripcion: 'Mandato legal',
    tipo: 'no_traslativo',
    activo: false,
  },
]

const { mockInsert, mockUpdate, mockDelete, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'actos_juridicos') {
        return {
          select: () => ({
            order: mockSelect,
          }),
          insert: mockInsert,
          update: (payload: unknown) => ({
            eq: (col: string, val: unknown) => mockUpdate(payload, col, val),
          }),
          delete: () => ({
            eq: (col: string, val: unknown) => mockDelete(col, val),
          }),
        }
      }
      throw new Error(`Tabla no mockeada: ${table}`)
    },
  }),
}))

// definePageMeta es un macro de compilación de Nuxt, se define en globalThis para Vitest puro
;(globalThis as any).definePageMeta = vi.fn()

const ActosJuridicosPage = (await import('@/pages/administracion-general/actos-juridicos/index.vue')).default

function mountPage() {
  const vuetify = createTestVuetify()
  return mount(ActosJuridicosPage, {
    global: { plugins: [vuetify] },
  })
}

describe('Administración General - Catálogo de Actos Jurídicos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockResolvedValue({ data: [...mockActos], error: null })
    mockInsert.mockResolvedValue({ error: null })
    mockUpdate.mockResolvedValue({ error: null })
    mockDelete.mockResolvedValue({ error: null })
  })

  it('carga y muestra la lista de actos jurídicos', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Compraventa')
    expect(wrapper.text()).toContain('Poder notarial')
    expect(wrapper.text()).toContain('Traslativo')
    expect(wrapper.text()).toContain('No traslativo')
  })

  it('permite abrir el formulario de creación y guardar un nuevo acto', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.abrirCrear()
    expect(vm.showDialog).toBe(true)

    vm.formNombre = 'Testamento Público Abierto'
    vm.formTipo = 'no_traslativo'
    vm.formDescripcion = 'Disposición testamentaria'
    vm.formActivo = true

    await vm.guardar()
    await flushPromises()

    expect(mockInsert).toHaveBeenCalledWith({
      nombre: 'Testamento Público Abierto',
      descripcion: 'Disposición testamentaria',
      tipo: 'no_traslativo',
      activo: true,
      es_actividad_vulnerable: false,
    })
    expect(vm.showDialog).toBe(false)
  })

  it('rechaza guardar si el nombre está vacío', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.abrirCrear()
    vm.formNombre = '   '

    await vm.guardar()
    await flushPromises()

    expect(mockInsert).not.toHaveBeenCalled()
    expect(vm.formError).toContain('obligatorio')
  })

  it('permite editar un acto jurídico existente', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.abrirEditar(mockActos[0])
    expect(vm.showDialog).toBe(true)
    expect(vm.formNombre).toBe('Compraventa')

    vm.formNombre = 'Compraventa con reserva de dominio'
    await vm.guardar()
    await flushPromises()

    expect(mockUpdate).toHaveBeenCalledWith(
      {
        nombre: 'Compraventa con reserva de dominio',
        descripcion: 'Traslativo de dominio',
        tipo: 'traslativo',
        activo: true,
        es_actividad_vulnerable: false,
      },
      'id',
      'acto-1',
    )
  })

  it('permite eliminar un acto jurídico', async () => {
    const wrapper = mountPage()
    await flushPromises()

    const vm = wrapper.vm as any
    await vm.eliminar(mockActos[1])
    await flushPromises()

    expect(mockDelete).toHaveBeenCalledWith('id', 'acto-2')
  })
})
