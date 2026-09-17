import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUser, mockClient } = vi.hoisted(() => {
  return {
    mockUser: { value: null as { sub: string } | null },
    mockClient: {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      rpc: vi.fn(),
    },
  }
})

vi.mock('#imports', () => ({
  useSupabaseClient: () => mockClient,
  useSupabaseUser: () => mockUser,
}))

const { useAuth } = await import('@/composables/useAuth')

function mockRpcResults({
  perfil,
  permisos = { data: [], error: null },
}: {
  perfil: { data: unknown[] | null; error: unknown }
  permisos?: { data: unknown; error: unknown }
}) {
  mockClient.rpc.mockImplementation((fn: string) => {
    if (fn === 'fn_mi_perfil') return Promise.resolve(perfil)
    if (fn === 'fn_mis_permisos') return Promise.resolve(permisos)
    return Promise.resolve({ data: null, error: null })
  })
}

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUser.value = null
    vi.clearAllMocks()
  })

  it('has no user and denies every permission before a session exists', () => {
    const { user, hasPermiso } = useAuth()

    expect(user.value).toBeNull()
    expect(hasPermiso('escrituras', 'ver')).toBe(false)
  })

  it('loads the profile and permission mirror once a session exists', async () => {
    mockUser.value = { sub: 'user-1' }
    mockRpcResults({
      perfil: {
        data: [
          {
            id: 'user-1',
            nombre_completo: 'Admin Test',
            rol_id: 'rol-1',
            rol_nombre: 'Administrador',
            activo: true,
          },
        ],
        error: null,
      },
      permisos: { data: [{ modulo: 'pld', accion: 'crear', alcance: 'todas' }], error: null },
    })

    const { user, hasPermiso, ensureProfileLoaded } = useAuth()
    await ensureProfileLoaded()

    expect(user.value).toEqual({ id: 'user-1', nombreCompleto: 'Admin Test', rolNombre: 'Administrador' })
    expect(hasPermiso('pld', 'crear')).toBe(true)
    expect(hasPermiso('pld', 'eliminar')).toBe(false)
  })

  it('resets the store when the profile cannot be loaded', async () => {
    mockUser.value = { sub: 'user-2' }
    mockRpcResults({ perfil: { data: [], error: null } })

    const { user, ensureProfileLoaded } = useAuth()
    await ensureProfileLoaded()

    expect(user.value).toBeNull()
  })

  it('login calls signInWithPassword and then loads the profile', async () => {
    mockUser.value = { sub: 'user-1' }
    mockRpcResults({
      perfil: {
        data: [
          {
            id: 'user-1',
            nombre_completo: 'Admin Test',
            rol_id: 'rol-1',
            rol_nombre: 'Administrador',
            activo: true,
          },
        ],
        error: null,
      },
    })

    const { login, user } = useAuth()
    await login('admin@example.com', 'secret')

    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'secret',
    })
    expect(user.value?.id).toBe('user-1')
  })

  it('logout calls signOut and clears the profile', async () => {
    mockUser.value = { sub: 'user-1' }
    mockRpcResults({
      perfil: {
        data: [
          {
            id: 'user-1',
            nombre_completo: 'Admin Test',
            rol_id: 'rol-1',
            rol_nombre: 'Administrador',
            activo: true,
          },
        ],
        error: null,
      },
    })

    const { login, logout, user } = useAuth()
    await login('admin@example.com', 'secret')
    expect(user.value).not.toBeNull()

    await logout()

    expect(mockClient.auth.signOut).toHaveBeenCalled()
    expect(user.value).toBeNull()
  })

  it('login loads profile using data.user.id even when supabaseUser is initially null', async () => {
    mockUser.value = null
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'user-explicit' } },
      error: null,
    })
    mockRpcResults({
      perfil: {
        data: [
          {
            id: 'user-explicit',
            nombre_completo: 'Explicit User',
            rol_id: 'rol-1',
            rol_nombre: 'Abogado',
            activo: true,
          },
        ],
        error: null,
      },
    })

    const { login, user } = useAuth()
    await login('abogado@example.com', 'secret')

    expect(user.value?.id).toBe('user-explicit')
  })

  it('login throws an error and signs out if user has no profile or is inactive', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'user-inactive' } },
      error: null,
    })
    mockRpcResults({ perfil: { data: [], error: null } })

    const { login } = useAuth()
    await expect(login('inactive@example.com', 'secret')).rejects.toThrow(
      'Tu cuenta no tiene un perfil asignado o se encuentra inactiva',
    )
    expect(mockClient.auth.signOut).toHaveBeenCalled()
  })
})
