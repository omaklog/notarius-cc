import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'
import { useLayoutPreferencesStore } from '@/stores/layoutPreferences.store'
import { createTestVuetify } from '../../test-utils'

function mockMatchMedia(prefersDark = false) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

function mountThemeToggle() {
  const vuetify = createTestVuetify()
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(ThemeToggle, {
    global: {
      plugins: [vuetify, pinia],
    },
  })
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    mockMatchMedia(false)
  })

  it('calls toggleTheme on the store when clicked', async () => {
    const wrapper = mountThemeToggle()
    const store = useLayoutPreferencesStore()

    expect(store.theme).toBe('notariaLight')
    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')
    expect(store.theme).toBe('notariaDark')
  })

  it('shows the moon icon in light theme and the sun icon in dark theme', async () => {
    const wrapper = mountThemeToggle()

    expect(wrapper.findComponent({ name: 'VIcon' }).props('icon')).toBe('mdi-moon-waning-crescent')

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')

    expect(wrapper.findComponent({ name: 'VIcon' }).props('icon')).toBe('mdi-white-balance-sunny')
  })
})
