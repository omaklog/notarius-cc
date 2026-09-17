import { flushPromises, mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnularDialog from '@/components/escrituras/AnularDialog.vue'
import { useAuthStore } from '@/stores/auth.store'
import { createTestPinia, createTestVuetify } from '../../test-utils'

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
  useSupabaseUser: () => ({ value: null }),
}))

function mountDialog(pinia = createTestPinia()) {
  const vuetify = createTestVuetify()
  setActivePinia(pinia)
  return mount(AnularDialog, {
    props: { escrituraId: 'escritura-1' },
    global: { plugins: [vuetify, pinia] },
  })
}

// Invocamos onSubmit() directamente expuesto por el componente
// (mismo patrón validado en EscrituraForm.spec.ts y RoleForm.spec.ts).
describe('AnularDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza motivo vacío', async () => {
    const wrapper = mountDialog()

    await (wrapper.vm as unknown as { onSubmit: () => Promise<void> }).onSubmit()
    await flushPromises()

    expect(wrapper.emitted('anular')).toBeFalsy()
  })

  it('emite el evento con el motivo capturado', async () => {
    const wrapper = mountDialog()

    const vm = wrapper.vm as unknown as { setMotivo: (val: string) => void; onSubmit: () => Promise<void> }
    vm.setMotivo('Escritura revocada por mutuo acuerdo entre las partes')

    await vm.onSubmit()
    await flushPromises()

    const emitted = wrapper.emitted('anular')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe('Escritura revocada por mutuo acuerdo entre las partes')
  })

  it('muestra el botón cuando el usuario tiene permiso escrituras.anular', () => {
    const pinia = createTestPinia()
    setActivePinia(pinia)
    useAuthStore().setPermisos([{ modulo: 'escrituras', accion: 'anular', alcance: 'todas' }])

    const wrapper = mountDialog(pinia)
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toContain('Anular')
  })

  it('oculta el botón cuando el usuario no tiene permiso escrituras.anular', () => {
    const pinia = createTestPinia()
    setActivePinia(pinia)
    useAuthStore().setPermisos([{ modulo: 'escrituras', accion: 'ver', alcance: 'todas' }])

    const wrapper = mountDialog(pinia)
    expect(wrapper.find('button').exists()).toBe(false)
  })
})

