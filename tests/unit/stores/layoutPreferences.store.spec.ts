import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLayoutPreferencesStore } from '@/stores/layoutPreferences.store'

function mockMatchMedia({
  prefersDark = false,
  isDesktop = false,
}: { prefersDark?: boolean; isDesktop?: boolean } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (query === '(prefers-color-scheme: dark)' && prefersDark) ||
      (query === '(min-width: 1280px)' && isDesktop),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('layoutPreferences store — theme', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to notariaLight when there is no stored preference and the system prefers light', () => {
    mockMatchMedia({ prefersDark: false })
    const store = useLayoutPreferencesStore()

    expect(store.theme).toBe('notariaLight')
  })

  it('detects the initial theme via prefers-color-scheme when there is no stored preference', () => {
    mockMatchMedia({ prefersDark: true })
    const store = useLayoutPreferencesStore()

    expect(store.theme).toBe('notariaDark')
  })

  it('prefers a previously stored theme over prefers-color-scheme', () => {
    mockMatchMedia({ prefersDark: true })
    localStorage.setItem('layout.theme', 'notariaLight')
    const store = useLayoutPreferencesStore()

    expect(store.theme).toBe('notariaLight')
  })

  it('toggles between notariaLight and notariaDark', () => {
    mockMatchMedia()
    const store = useLayoutPreferencesStore()

    expect(store.theme).toBe('notariaLight')
    store.toggleTheme()
    expect(store.theme).toBe('notariaDark')
    store.toggleTheme()
    expect(store.theme).toBe('notariaLight')
  })

  it('persists the toggled theme to localStorage', () => {
    mockMatchMedia()
    const store = useLayoutPreferencesStore()

    store.toggleTheme()

    expect(localStorage.getItem('layout.theme')).toBe('notariaDark')
  })
})

describe('layoutPreferences store — drawerMode', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to expanded on desktop viewports when there is no stored preference', () => {
    mockMatchMedia({ isDesktop: true })
    const store = useLayoutPreferencesStore()

    expect(store.drawerMode).toBe('expanded')
  })

  it('defaults to hidden on mobile/tablet viewports when there is no stored preference', () => {
    mockMatchMedia({ isDesktop: false })
    const store = useLayoutPreferencesStore()

    expect(store.drawerMode).toBe('hidden')
  })

  it('sets the drawer mode and persists it to localStorage', () => {
    mockMatchMedia({ isDesktop: true })
    const store = useLayoutPreferencesStore()

    store.setDrawerMode('rail')

    expect(store.drawerMode).toBe('rail')
    expect(localStorage.getItem('layout.drawerMode')).toBe('rail')
  })

  it('restores a previously stored drawer mode over the breakpoint default', () => {
    mockMatchMedia({ isDesktop: true })
    localStorage.setItem('layout.drawerMode', 'rail')
    const store = useLayoutPreferencesStore()

    expect(store.drawerMode).toBe('rail')
  })
})
