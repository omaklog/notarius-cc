import { computed } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useAuthStore } from '~/stores/auth.store'

export interface AuthUser {
  id: string
  nombreCompleto: string
  rolNombre: string
}

export function useAuth() {
  const supabase = useSupabaseClient()
  const supabaseUser = useSupabaseUser()
  const store = useAuthStore()

  const user = computed<AuthUser | null>(() => {
    if (!store.profile) return null
    return {
      id: store.profile.id,
      nombreCompleto: store.profile.nombreCompleto,
      rolNombre: store.profile.rolNombre,
    }
  })

  const loading = computed(() => store.loading)

  // useSupabaseUser() de @nuxtjs/supabase resuelve el usuario vía
  // client.auth.getClaims() (payload del JWT decodificado), no vía
  // getUser() — el id del usuario vive en el claim `sub`, no en `.id`.
  function currentUserId(): string | null {
    const claims = supabaseUser.value as { sub?: string } | null
    return claims?.sub ?? null
  }

  async function ensureProfileLoaded(explicitUserId?: string): Promise<void> {
    let userId = explicitUserId ?? currentUserId()

    if (!userId && typeof supabase.auth?.getSession === 'function') {
      const { data: sessionData } = await supabase.auth.getSession()
      userId = sessionData?.session?.user?.id ?? null
    }

    if (!userId) {
      store.reset()
      return
    }

    if (store.loaded && store.profile?.id === userId) {
      return
    }

    store.loading = true
    try {
      const { data: perfilData, error: perfilError } = await supabase.rpc('fn_mi_perfil')
      const profileRow = perfilData?.[0]

      if (perfilError || !profileRow) {
        store.reset()
        return
      }

      store.setProfile({
        id: profileRow.id,
        nombreCompleto: profileRow.nombre_completo,
        rolId: profileRow.rol_id,
        rolNombre: profileRow.rol_nombre,
        activo: profileRow.activo,
      })

      const { data: permisosData } = await supabase.rpc('fn_mis_permisos')
      store.setPermisos(permisosData ?? [])
      store.loaded = true
    } finally {
      store.loading = false
    }
  }

  /**
   * Espejo de UI — nunca la fuente de verdad de seguridad (contracts/
   * usuarios-roles-interface.md). Para alcance 'propias' sin más contexto
   * que el escrituraId, se resuelve de forma optimista (true): la lista
   * real de escrituras ya viene filtrada por RLS/fn_has_permiso, y toda
   * escritura real siempre se revalida en el servidor.
   */
  function hasPermiso(modulo: string, accion: string, _escrituraId?: string): boolean {
    const entry = store.permisos.find((p) => p.modulo === modulo && p.accion === accion)
    if (!entry) return false
    return true
  }

  async function login(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const userId = data?.user?.id
    await ensureProfileLoaded(userId)

    if (!store.profile) {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta no tiene un perfil asignado o se encuentra inactiva. Contacta al administrador.')
    }
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    store.reset()
  }

  return {
    user,
    loading,
    hasPermiso,
    login,
    logout,
    ensureProfileLoaded,
  }
}
