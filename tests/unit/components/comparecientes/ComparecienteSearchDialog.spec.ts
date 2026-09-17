import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComparecienteSearchDialog from '@/components/comparecientes/ComparecienteSearchDialog.vue'
import { createTestVuetify } from '../../test-utils'

const mockResultados = [
  {
    id: 'comp-1',
    tipo_persona: 'fisica',
    rfc: 'GAVF780412MN8',
    identificador_secundario: 'GAVF780412HDFRRN01',
    nombre_completo: 'Fernando Garza Villarreal',
    activo: true,
  },
]

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    rpc: mockRpc,
  }),
}))

const rolesDisponibles = [
  { id: 'rol-1', nombre: 'Adquirente' },
  { id: 'rol-2', nombre: 'Enajenante' },
]

function mountDialog(props = {}) {
  const vuetify = createTestVuetify()
  return mount(ComparecienteSearchDialog, {
    props: {
      modelValue: true,
      actoJuridicoNombre: 'Compraventa',
      instrumentoNumero: 48102,
      rolesDisponibles,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('ComparecienteSearchDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: mockResultados, error: null })
  })

  it('busca comparecientes vía RPC fn_buscar_comparecientes al escribir en el buscador', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const searchInput = wrapper.findComponent({ name: 'VTextField' })
    await searchInput.setValue('Garza')
    await flushPromises()

    expect(mockRpc).toHaveBeenCalledWith('fn_buscar_comparecientes', {
      p_query: 'Garza',
      p_limite: 10,
    })
  })

  it('selecciona un compareciente y emite select con rol y alícuota', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.resultados = mockResultados
    vm.seleccionarCompareciente(mockResultados[0])
    vm.rolId = 'rol-1'
    vm.porcentaje = 50
    await flushPromises()

    vm.confirmarVinculacion()
    await flushPromises()

    const emitted = wrapper.emitted('select')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({
      comparecienteId: 'comp-1',
      comparecienteNombre: 'Fernando Garza Villarreal',
      rolId: 'rol-1',
      porcentaje: 50,
    })
  })

  it('emite open-crear cuando se pulsa el enlace de dar de alta en padrón', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const btnAlta = wrapper.findAllComponents({ name: 'VBtn' }).find((b) => b.text().includes('Dar de alta en padrón'))
    expect(btnAlta).toBeDefined()
    await btnAlta!.trigger('click')

    expect(wrapper.emitted('open-crear')).toBeTruthy()
  })

  it('oculta y anula la alícuota cuando el rol seleccionado es Enajenante', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const vm = wrapper.vm as any
    vm.resultados = mockResultados
    vm.seleccionarCompareciente(mockResultados[0])
    vm.rolId = 'rol-2' // 'Enajenante'
    vm.porcentaje = 50
    await flushPromises()

    expect(vm.esAdquirente).toBe(false)
    expect(vm.porcentaje).toBeNull()

    vm.confirmarVinculacion()
    await flushPromises()

    const emitted = wrapper.emitted('select')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({
      comparecienteId: 'comp-1',
      comparecienteNombre: 'Fernando Garza Villarreal',
      rolId: 'rol-2',
      porcentaje: null,
    })
  })
})
