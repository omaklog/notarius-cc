import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { VApp } from 'vuetify/components'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import { createTestPinia, createTestRouter, createTestVuetify } from '../../test-utils'

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({ rpc: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  useSupabaseUser: () => ({ value: null }),
}))

async function mountNavbar() {
  const vuetify = createTestVuetify()
  const pinia = createTestPinia()
  const router = await createTestRouter('/')

  const appWrapper = mount(
    {
      components: { VApp, AppNavbar },
      template: '<v-app><AppNavbar /></v-app>',
    },
    {
      global: {
        plugins: [vuetify, pinia, router],
      },
    },
  )

  return appWrapper.findComponent(AppNavbar)
}

describe('AppNavbar', () => {
  it('shows a placeholder logo/name when branding is null', async () => {
    const wrapper = await mountNavbar()

    const brandingLogo = wrapper
      .findAllComponents({ name: 'VAvatar' })
      .find((avatar) => avatar.props('image'))
    expect(brandingLogo).toBeUndefined()
    expect(wrapper.find('.mdi-domain').exists()).toBe(true)
    expect(wrapper.text()).toContain('Sistema Notarial')
  })

  it('emits toggle-menu when the hamburger button is clicked', async () => {
    const wrapper = await mountNavbar()

    await wrapper.findComponent({ name: 'VAppBarNavIcon' }).trigger('click')

    expect(wrapper.emitted('toggle-menu')).toBeTruthy()
  })
})
