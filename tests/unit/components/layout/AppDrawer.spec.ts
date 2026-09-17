import { mount } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VApp } from 'vuetify/components'
import AppDrawer from '@/components/layout/AppDrawer.vue'
import { useLayoutPreferencesStore } from '@/stores/layoutPreferences.store'
import { useAuthStore } from '@/stores/auth.store'
import { createTestPinia, createTestRouter, createTestVuetify, setViewportWidth } from '../../test-utils'

vi.mock('#imports', () => ({
  useSupabaseClient: () => ({}),
  useSupabaseUser: () => ({ value: null }),
}))

function mockMatchMedia(isDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(min-width: 1280px)' && isDesktop,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const ALL_NAV_PERMISOS = [
  { modulo: 'escrituras', accion: 'ver', alcance: 'todas' },
  { modulo: 'comparecientes', accion: 'ver', alcance: 'todas' },
  { modulo: 'expedientes', accion: 'ver', alcance: 'todas' },
  { modulo: 'tramites', accion: 'ver', alcance: 'todas' },
  { modulo: 'pld', accion: 'ver', alcance: 'todas' },
  { modulo: 'avisos_sat', accion: 'ver', alcance: 'todas' },
  { modulo: 'ordenes_pago', accion: 'ver', alcance: 'todas' },
  { modulo: 'honorarios', accion: 'ver', alcance: 'todas' },
  { modulo: 'georreferenciacion', accion: 'ver', alcance: 'todas' },
  { modulo: 'notificaciones', accion: 'ver', alcance: null },
  { modulo: 'reportes', accion: 'ver_operativos', alcance: null },
  { modulo: 'administracion', accion: 'acceso', alcance: null },
]

async function mountDrawer(
  initialPath: string,
  { desktop = true, permisos = ALL_NAV_PERMISOS }: { desktop?: boolean; permisos?: typeof ALL_NAV_PERMISOS } = {},
) {
  localStorage.clear()
  mockMatchMedia(desktop)
  setViewportWidth(desktop ? 1400 : 375)

  const vuetify = createTestVuetify()
  const pinia = createTestPinia()
  setActivePinia(pinia)
  const router = await createTestRouter(initialPath)
  const store = useLayoutPreferencesStore()
  useAuthStore().setPermisos(permisos)

  // AppDrawer relies on Vuetify's layout injection, only available under <v-app>.
  const appWrapper = mount(
    {
      components: { VApp, AppDrawer },
      template: '<v-app><AppDrawer /></v-app>',
    },
    {
      global: {
        plugins: [vuetify, pinia, router],
      },
    },
  )

  return { wrapper: appWrapper.findComponent(AppDrawer), store }
}

describe('AppDrawer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('expands the group of the active route by default', async () => {
    const { wrapper } = await mountDrawer('/escrituras')

    const operacionGroup = wrapper
      .findAllComponents({ name: 'VListGroup' })
      .find((g) => g.props('value') === 'Operación')

    expect(operacionGroup?.props('modelValue') ?? operacionGroup?.vm.isOpen).toBeTruthy()
    expect(wrapper.text()).toContain('Escrituras')
  })

  it('highlights the active item with the primary color, never bronze/secondary', async () => {
    const { wrapper } = await mountDrawer('/escrituras')

    const activeItem = wrapper
      .findAllComponents({ name: 'VListItem' })
      .find((item) => item.props('title') === 'Escrituras')

    expect(activeItem?.props('active')).toBe(true)
    expect(activeItem?.props('color')).toBe('primary')
    expect(activeItem?.props('color')).not.toBe('secondary')
  })

  it('does not mark an inactive item as active', async () => {
    const { wrapper } = await mountDrawer('/escrituras')

    const inactiveItem = wrapper
      .findAllComponents({ name: 'VListItem' })
      .find((item) => item.props('title') === 'Honorarios')

    expect(inactiveItem?.props('active')).toBe(false)
  })

  it('behaves as permanent + rail on desktop when drawerMode is rail', async () => {
    const { wrapper, store } = await mountDrawer('/escrituras', { desktop: true })
    store.setDrawerMode('rail')
    await wrapper.vm.$nextTick()

    const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })

    expect(drawer.props('permanent')).toBe(true)
    expect(drawer.props('temporary')).toBe(false)
    expect(drawer.props('rail')).toBe(true)
  })

  it('behaves as temporary overlay on mobile, closed by default', async () => {
    const { wrapper } = await mountDrawer('/escrituras', { desktop: false })

    const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })

    expect(drawer.props('temporary')).toBe(true)
    expect(drawer.props('permanent')).toBe(false)
    expect(drawer.props('modelValue')).toBe(false)
  })

  it('opens the mobile overlay when drawerMode is expanded', async () => {
    const { wrapper, store } = await mountDrawer('/escrituras', { desktop: false })
    store.setDrawerMode('expanded')
    await wrapper.vm.$nextTick()

    const drawer = wrapper.findComponent({ name: 'VNavigationDrawer' })

    expect(drawer.props('modelValue')).toBe(true)
    expect(drawer.props('temporary')).toBe(true)
  })

  it('hides items the user has no permission for', async () => {
    const { wrapper } = await mountDrawer('/escrituras', {
      permisos: [{ modulo: 'escrituras', accion: 'ver', alcance: 'propias' }],
    })

    expect(wrapper.text()).toContain('Escrituras')
    expect(wrapper.text()).not.toContain('Honorarios')
    expect(wrapper.text()).not.toContain('Administración general')
  })

  it('hides an entire group when none of its items are permitted', async () => {
    const { wrapper } = await mountDrawer('/', {
      permisos: [{ modulo: 'escrituras', accion: 'ver', alcance: 'todas' }],
    })

    const groupLabels = wrapper.findAllComponents({ name: 'VListGroup' }).map((g) => g.props('value'))

    expect(groupLabels).toContain('Operación')
    expect(groupLabels).not.toContain('Sistema')
    expect(groupLabels).not.toContain('Finanzas')
  })

  it('shows nothing when the user has no permissions at all', async () => {
    const { wrapper } = await mountDrawer('/', { permisos: [] })

    expect(wrapper.findAllComponents({ name: 'VListGroup' })).toHaveLength(0)
  })
})
