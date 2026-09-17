import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ShellTheme = 'notariaLight' | 'notariaDark'
export type DrawerMode = 'expanded' | 'rail' | 'hidden'

const THEME_STORAGE_KEY = 'layout.theme'
const DRAWER_STORAGE_KEY = 'layout.drawerMode'
const DESKTOP_BREAKPOINT_QUERY = '(min-width: 1280px)'

function isShellTheme(value: unknown): value is ShellTheme {
  return value === 'notariaLight' || value === 'notariaDark'
}

function isDrawerMode(value: unknown): value is DrawerMode {
  return value === 'expanded' || value === 'rail' || value === 'hidden'
}

function getInitialTheme(): ShellTheme {
  if (typeof window === 'undefined') return 'notariaLight'

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (isShellTheme(stored)) return stored

  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'notariaDark'
  }

  return 'notariaLight'
}

function getInitialDrawerMode(): DrawerMode {
  if (typeof window === 'undefined') return 'expanded'

  const stored = window.localStorage.getItem(DRAWER_STORAGE_KEY)
  if (isDrawerMode(stored)) return stored

  const isDesktop = window.matchMedia?.(DESKTOP_BREAKPOINT_QUERY).matches ?? true
  return isDesktop ? 'expanded' : 'hidden'
}

export const useLayoutPreferencesStore = defineStore('layoutPreferences', () => {
  const theme = ref<ShellTheme>(getInitialTheme())
  const drawerMode = ref<DrawerMode>(getInitialDrawerMode())

  function toggleTheme(): void {
    theme.value = theme.value === 'notariaLight' ? 'notariaDark' : 'notariaLight'

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme.value)
    }
  }

  function setDrawerMode(mode: DrawerMode): void {
    drawerMode.value = mode

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DRAWER_STORAGE_KEY, mode)
    }
  }

  function toggleDrawer(isDesktop: boolean): void {
    if (isDesktop) {
      setDrawerMode(drawerMode.value === 'rail' ? 'expanded' : 'rail')
    } else {
      setDrawerMode(drawerMode.value === 'hidden' ? 'expanded' : 'hidden')
    }
  }

  /**
   * Nuxt/Pinia hydrate the store from the SSR payload (always the server's
   * window-less defaults) before any client code runs, silently discarding
   * whatever this store's own initializers computed. Call once on client
   * mount to re-apply the real localStorage/matchMedia-based preferences.
   */
  function initFromBrowser(): void {
    theme.value = getInitialTheme()
    drawerMode.value = getInitialDrawerMode()
  }

  return {
    theme,
    drawerMode,
    toggleTheme,
    setDrawerMode,
    toggleDrawer,
    initFromBrowser,
  }
})
