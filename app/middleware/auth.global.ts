// El redirect a /login sin sesión ya lo maneja el middleware "global-auth"
// interno de @nuxtjs/supabase (redirectOptions en nuxt.config.ts). Este
// middleware solo mantiene sincronizado el perfil/permisos del usuario
// autenticado en app/stores/auth.store.ts.
export default defineNuxtRouteMiddleware(async () => {
  const { ensureProfileLoaded } = useAuth()
  await ensureProfileLoaded()
})
