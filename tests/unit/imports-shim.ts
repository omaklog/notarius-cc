// Aliased to "#imports" in vitest.config.ts. Nuxt resolves "#imports" to
// its real auto-import virtual module at build time; outside Nuxt (plain
// Vitest), this shim makes it a resolvable module so individual tests can
// vi.mock('#imports', ...) the specific composables they need (e.g.
// useSupabaseClient/useSupabaseUser in useAuth.spec.ts).
export function useSupabaseClient(): never {
  throw new Error('useSupabaseClient() was not mocked in this test — add vi.mock("#imports", ...)')
}

export function useSupabaseUser(): never {
  throw new Error('useSupabaseUser() was not mocked in this test — add vi.mock("#imports", ...)')
}

export function navigateTo(_to: string): Promise<void> {
  return Promise.resolve()
}

export function definePageMeta(): void {}
