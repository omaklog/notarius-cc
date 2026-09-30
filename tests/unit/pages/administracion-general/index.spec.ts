import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestVuetify } from '../../test-utils'

;(globalThis as any).definePageMeta = vi.fn()

const AdminIndexModule = await import('@/pages/administracion-general/index.vue')
const AdminIndex = AdminIndexModule.default

describe('administracion-general/index.vue', () => {
  const vuetify = createTestVuetify()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza el panel de administración con la tarjeta de Valores y Vigencias de la UMA', async () => {
    const wrapper = mount(AdminIndex, {
      global: {
        plugins: [vuetify],
        stubs: {
          NuxtLink: {
            template: '<a><slot /></a>',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Panel de Administración General')
    expect(wrapper.text()).toContain('Identidad Notarial y Fe Pública')
    expect(wrapper.text()).toContain('Valores y Vigencias de la UMA')
    expect(wrapper.text()).toContain('Histórico, vigencias y actualización de la Unidad de Medida y Actualización (UMA)')
  })
})
