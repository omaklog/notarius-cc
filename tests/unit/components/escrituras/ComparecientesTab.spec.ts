import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

const { mockRpc, mockSelect } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'escritura_comparecientes') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'ec-1',
                    compareciente_id: 'comp-1',
                    rol_id: 'rol-1',
                    porcentaje_participacion: 50,
                    comparecientes: { id: 'comp-1', nombre: 'Fernando Garza', tipo_persona: 'fisica', rfc: 'GAVF780412MN8' },
                    roles_compareciente: { id: 'rol-1', nombre: 'Adquirente' },
                  },
                ],
                error: null,
              }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }
      }
      if (table === 'acto_juridico_roles') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [
                  {
                    rol_compareciente_id: 'rol-1',
                    roles_compareciente: { id: 'rol-1', nombre: 'Adquirente', activo: true },
                  },
                ],
                error: null,
              }),
          }),
        }
      }
      if (table === 'escrituras') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ acto_juridico_id: 'acto-1', actos_juridicos: { nombre: 'Compraventa' } }],
                error: null,
              }),
          }),
        }
      }
      if (table === 'tipos_identificacion_oficial' || table === 'regimenes_patrimoniales') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }
    },
    rpc: mockRpc,
  }),
}))

const ComparecientesTab = (await import('@/components/escrituras/tabs/ComparecientesTab.vue')).default

function mountTab() {
  const vuetify = createTestVuetify()
  return mount(ComparecientesTab, {
    props: { escrituraId: 'escritura-1', actoJuridicoId: 'acto-1' },
    global: { plugins: [vuetify] },
  })
}

describe('ComparecientesTab', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockRpc.mockResolvedValue({ data: 'compareciente-1', error: null })
  })

  it('monta la pestaña y muestra los comparecientes asociados', async () => {
    const wrapper = mountTab()
    await flushPromises()

    expect(wrapper.text()).toContain('Otorgantes y Comparecientes')
    expect(wrapper.text()).toContain('Fernando Garza')
    expect(wrapper.text()).toContain('Adquirente')
    expect(wrapper.text()).toContain('50.00%')
  })

  it('llama a fn_asociar_compareciente al vincular un compareciente', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const vm = wrapper.vm as any
    const ok = await vm.asociarCompareciente({
      comparecienteId: 'comp-1',
      comparecienteNombre: 'Fernando Garza',
      rolId: 'rol-1',
      porcentaje: 50,
    })
    await flushPromises()

    expect(ok).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('fn_asociar_compareciente', {
      p_escritura_id: 'escritura-1',
      p_compareciente_id: 'comp-1',
      p_nombre_nuevo: null,
      p_rol_id: 'rol-1',
      p_porcentaje: 50,
    })
  })

  it('carga los roles asociados al acto jurídico de la escritura', async () => {
    const wrapper = mountTab()
    await flushPromises()

    const vm = wrapper.vm as any
    expect(vm.rolesDisponibles).toBeDefined()
    expect(vm.rolesDisponibles.length).toBeGreaterThan(0)
  })
})
