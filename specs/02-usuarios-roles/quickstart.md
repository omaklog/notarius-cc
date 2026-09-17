# Quickstart: Validar usuarios, roles y permisos

Guía para validar manualmente los escenarios de aceptación del spec una
vez implementado. Complementa (no sustituye) los tests de Vitest de
`useAuth()`/`AppDrawer`/componentes de administración.

## Prerrequisitos

- Backend local de `01-infra-supabase` corriendo (`yarn db:start`) y
  reconstruido con la migración de este feature (`yarn db:reset`).
- Frontend corriendo (`yarn dev`).
- Al menos 3 usuarios de prueba creados vía invitación (uno por rol
  seed: Administrador, Auxiliar, Gestor) y, si es posible, un par de
  escrituras de prueba con distinto `responsable_id` (puede simularse
  con datos mínimos si el módulo de Escrituras aún no existe).

## Escenario 1 — Acceso seguro según mi rol (US1)

1. Iniciar sesión como el usuario Administrador. Confirmar que el drawer
   muestra Administración General y que todas las acciones del catálogo
   funcionan.
2. Iniciar sesión como el usuario Auxiliar. Confirmar:
   - El drawer **no** muestra Administración General.
   - No puede editar comparecientes/expediente/trámites/órdenes de pago
     de una escritura de la que no es responsable (rechazado).
   - Sí puede dar de alta un registro de Cumplimiento PLD y editar
     Georreferenciación de cualquier escritura.
   - No puede editar/eliminar un registro de PLD ni modificar
     Honorarios más allá de consultarlos.
3. Iniciar sesión como el usuario Gestor. Confirmar que puede crear/
   editar/eliminar un Trámite de cualquier escritura sin ser su
   responsable.
4. Repetir el paso 2 (acción rechazada) pero llamando directamente al
   endpoint REST de Supabase (con la sesión del Auxiliar) en vez de usar
   la interfaz — confirmar que la API también la rechaza (FR-014,
   SC-003).

## Escenario 2 — Un Administrador reconfigura roles y permisos (US2)

1. Como Administrador, ir a Administración General → Roles → crear un
   rol nuevo (nombre + descripción). Confirmar que aparece de inmediato
   en la lista y en el selector de asignación de rol de un usuario.
2. Editar los permisos de ese rol nuevo: marcar un permiso con alcance,
   asignar el rol a un usuario de prueba. Sin recargar sesión, confirmar
   que ese usuario ya está limitado exactamente a esos permisos.
3. Cambiar el alcance de un permiso existente de `propias` a `todas`
   para un rol con usuarios activos. Confirmar que el cambio se refleja
   de inmediato para esos usuarios (sin que vuelvan a iniciar sesión).
4. Intentar eliminar un rol `es_sistema` (Administrador/Auxiliar/Gestor)
   — debe rechazarse, pero su editor de permisos debe seguir editable.
5. Eliminar el rol creado en el paso 1 (sin usuarios asignados) — debe
   permitirse.

## Escenario 3 — El sistema nunca se queda sin quien lo administre (US3)

Con un único usuario activo con `administracion.acceso`:

1. Intentar reasignarle un rol sin ese permiso — debe rechazarse.
2. Intentar quitarle el permiso `administracion.acceso` a su rol actual
   (si es el único rol con ese permiso) — debe rechazarse.
3. Intentar desactivar su cuenta (`activo = false`) — debe rechazarse
   (cierra el hueco de la Clarification).
4. Intentar eliminar un rol con usuarios activos asignados (cualquier
   rol, sea `es_sistema` o no) — debe rechazarse.

## Verificar la bitácora de auditoría (FR-017)

```sql
select entidad, entidad_id, accion, changed_by, changed_at
from public.audit_log
order by changed_at desc
limit 20;
```

Confirmar que los cambios de los Escenarios 2 y 3 (incluidos los
intentos rechazados que sí llegaron a aplicarse, como el paso 1 de
Escenario 2) aparecen con sus valores antes/después. Confirmar que no
existe forma de hacer `UPDATE`/`DELETE` sobre esta tabla (RLS de solo
`INSERT`/`SELECT`).

## Verificar que ninguna comprobación usa el nombre del rol

Revisión de código (no ejecutable): confirmar que ninguna política RLS
de este feature, ni `useAuth()`, ni las páginas de administración,
comparan `roles.nombre` contra un literal — todo pasa por
`fn_has_permiso()` / `hasPermiso()`.

## Criterio de "hecho" para este feature

Los 3 escenarios de arriba pasan, la bitácora de auditoría captura los
cambios de forma inmutable, `yarn test` (Vitest) está en verde para
`useAuth()`/`AppDrawer`/componentes de administración, y una revisión
rápida confirma cero condiciones hardcodeadas contra un nombre de rol.
