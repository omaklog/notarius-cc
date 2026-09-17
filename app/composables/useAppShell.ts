import { defineStore } from 'pinia'
import { getCurrentInstance, onUnmounted, readonly, ref, toRef } from 'vue'
import type { Ref } from 'vue'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'
import type { ShellTheme } from '~/stores/layoutPreferences.store'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface NotariaBranding {
  logoUrl: string | null
  shortName: string | null
}

export interface AppShellApi {
  setBreadcrumb(items: BreadcrumbItem[]): void
  readonly branding: Readonly<Ref<NotariaBranding>>
  readonly activeTheme: Readonly<Ref<ShellTheme>>
}

/**
 * Internal state backing useAppShell() (breadcrumb + branding stub).
 * Not part of the public contract — business modules must go through
 * useAppShell(), never import this store directly.
 */
export const useShellStateStore = defineStore('shellState', () => {
  const breadcrumb = ref<BreadcrumbItem[]>([])
  const branding = ref<NotariaBranding>({ logoUrl: null, shortName: null })

  return { breadcrumb, branding }
})

export function useAppShell(): AppShellApi {
  const shellState = useShellStateStore()
  const layoutPreferences = useLayoutPreferencesStore()

  function setBreadcrumb(items: BreadcrumbItem[]): void {
    shellState.breadcrumb = items

    if (getCurrentInstance()) {
      onUnmounted(() => {
        shellState.breadcrumb = []
      })
    }
  }

  return {
    setBreadcrumb,
    branding: readonly(toRef(shellState, 'branding')),
    activeTheme: readonly(toRef(layoutPreferences, 'theme')),
  }
}
