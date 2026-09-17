// Protege las páginas de Administración General: redirige si el usuario
// autenticado no tiene el permiso administracion.acceso (spec 02-usuarios-roles
// FR-002/FR-015). El middleware global (auth.global.ts) ya garantiza que el
// perfil/permisos estén cargados antes de que este corra.
export default defineNuxtRouteMiddleware(() => {
  const { hasPermiso } = useAuth()

  if (!hasPermiso('administracion', 'acceso')) {
    return navigateTo('/')
  }
})
