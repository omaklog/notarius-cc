import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Profile {
  id: string
  nombreCompleto: string
  rolId: string
  rolNombre: string
  activo: boolean
}

export type Alcance = 'propias' | 'todas' | null

export interface PermisoEntry {
  modulo: string
  accion: string
  alcance: Alcance
}

export const useAuthStore = defineStore('auth', () => {
  const profile = ref<Profile | null>(null)
  const permisos = ref<PermisoEntry[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  function setProfile(value: Profile | null): void {
    profile.value = value
  }

  function setPermisos(value: PermisoEntry[]): void {
    permisos.value = value
  }

  function reset(): void {
    profile.value = null
    permisos.value = []
    loaded.value = false
  }

  return {
    profile,
    permisos,
    loading,
    loaded,
    setProfile,
    setPermisos,
    reset,
  }
})
