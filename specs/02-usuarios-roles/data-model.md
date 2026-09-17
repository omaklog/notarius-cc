# Data Model: Usuarios, roles y permisos

Reutiliza la convención de auditoría (`id uuid default gen_random_uuid()`,
`created_at`, `updated_at` vía el trigger `public.set_updated_at()`) y la
extensión `pgcrypto` ya habilitadas por `01-infra-supabase`. Este feature
reemplaza la tabla `roles_usuario` de ese mismo feature (ver research.md
#1) — no queda ninguna tabla de roles estática después de esta migración.

## Tabla: `permisos`

Catálogo de acciones posibles por módulo de negocio (spec, sección 4 del
input original).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `modulo` | `text not null` | p. ej. `escrituras`, `pld`, `administracion` |
| `accion` | `text not null` | p. ej. `ver`, `crear`, `editar`, `eliminar`, `anular`, `reasignar_responsable`, `levantar_bloqueo`, `marcar_presentado`, `modificar_monto_pactado`, `acceso` |
| `descripcion` | `text not null` | Texto legible para el editor de permisos |
| `requiere_alcance` | `boolean not null default true` | `false` para módulos no ligados a una escritura (`notificaciones`, `reportes`, `administracion`) |
| unique | `(modulo, accion)` | Un mismo par módulo/acción no se repite |
| `created_at`/`updated_at` | auditoría estándar | |

**Estabilidad**: una vez que un rol referencia un permiso, ese par
`(modulo, accion)` no se renombra — solo se agregan permisos nuevos (ver
contracts/).

## Tabla: `roles`

Roles dinámicos, editables por un Administrador (FR-004).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `nombre` | `text not null unique` | |
| `descripcion` | `text` | |
| `es_sistema` | `boolean not null default false` | `true` en Administrador/Auxiliar/Gestor (seed) — bloquea `DELETE` (trigger, FR-010), no bloquea editar sus permisos |
| `created_at`/`updated_at` | auditoría estándar | |

**Salvaguarda (trigger `BEFORE DELETE`)**: rechaza el borrado si
`es_sistema = true`, o si existe al menos un `profiles.rol_id` activo
apuntando a este rol (FR-009/FR-010).

## Tabla: `rol_permisos`

Asignación de permisos a un rol, con su alcance (FR-005).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `rol_id` | `uuid not null references roles(id) on delete cascade` | |
| `permiso_id` | `uuid not null references permisos(id) on delete cascade` | |
| `alcance` | `text check (alcance in ('propias','todas'))` | `null` cuando `permisos.requiere_alcance = false` |
| unique | `(rol_id, permiso_id)` | Un rol no tiene el mismo permiso dos veces |
| `created_at`/`updated_at` | auditoría estándar | |

**Salvaguarda (trigger `BEFORE DELETE`/`BEFORE UPDATE`)**: si la fila
afectada es el único `rol_permisos` restante con
`permiso.modulo='administracion' and permiso.accion='acceso'` y con al
menos un usuario activo asignado a ese rol, rechaza el cambio (FR-016,
vía 1 de 3).

## Tabla: `profiles`

Perfil de cada usuario autenticado, 1:1 con `auth.users` (FR-006).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `uuid pk references auth.users(id) on delete cascade` | Poblado por el trigger `handle_new_user` (research.md #6), no por el cliente |
| `nombre_completo` | `text not null` | |
| `rol_id` | `uuid not null references roles(id)` | |
| `activo` | `boolean not null default true` | |
| `created_at`/`updated_at` | auditoría estándar | |

**Salvaguarda (trigger `BEFORE UPDATE`)**: si el cambio reasigna `rol_id`
a un rol sin `administracion.acceso`, o pone `activo = false`, y este
perfil es el único usuario activo con ese permiso, rechaza el cambio
(FR-016, vías 2 y 3 de 3 — cierra el hueco de la Clarification sobre
desactivación).

## Tabla: `audit_log`

Bitácora inmutable, append-only (Clarification, FR-017) — ver research.md
#3 para la decisión de una tabla genérica en vez de una por entidad.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `uuid pk default gen_random_uuid()` | |
| `entidad` | `text not null` | `'roles'` \| `'rol_permisos'` \| `'profiles'` |
| `entidad_id` | `uuid not null` | |
| `accion` | `text not null` | `'insert'` \| `'update'` \| `'delete'` |
| `datos_anteriores` | `jsonb` | `null` en `insert` |
| `datos_nuevos` | `jsonb` | `null` en `delete` |
| `changed_by` | `uuid references auth.users(id)` | |
| `changed_at` | `timestamptz not null default now()` | |

**Regla**: sin `UPDATE`/`DELETE` permitidos vía RLS (política solo de
`INSERT`, generada por el trigger genérico, y `SELECT` para
`administracion.acceso`) — ninguna fila de esta tabla se modifica ni se
elimina nunca.

## Función: `fn_has_permiso(p_modulo, p_accion, p_escritura_id default null)`

Ver research.md #8. Retorna `boolean`; resuelve el permiso del usuario
autenticado (`auth.uid()`) leyendo `profiles` → `rol_permisos` →
`permisos` en vivo (sin cache), y si el permiso requiere alcance y es
`'propias'`, exige que `p_escritura_id` corresponda a una escritura cuyo
`responsable_id` sea el usuario autenticado.

**Consumida por**: toda política RLS de tablas de negocio de módulos
futuros (Escrituras, Comparecientes, Cumplimiento PLD, etc.), sustituyendo
`'modulo'`/`'accion'` por el par correspondiente del catálogo — nunca una
condición de rol hardcodeada (ver contracts/).

## Función: `fn_mis_permisos()`

Hallazgo de implementación: `permisos`/`roles`/`rol_permisos` son de solo
`administracion.acceso` vía RLS, por lo que un usuario normal no puede
leerlas directamente para saber "qué puedo hacer". `fn_mis_permisos()`
(`security definer`, sin argumentos) retorna las filas
`(modulo, accion, alcance)` del usuario autenticado — es la única forma en
que el frontend arma el espejo reactivo de `useAuth().hasPermiso()` sin
tocar esas tablas directamente. La aplicación real de cada permiso sigue
viviendo en `fn_has_permiso()`.

## Configuración inicial (seed)

`seed.sql` inserta, en orden: el catálogo completo de `permisos` (tabla de
la sección 4 del input original), los 3 roles (`es_sistema = true`), y las
filas de `rol_permisos` correspondientes a la configuración de
Administrador/Auxiliar/Gestor documentada en `spec.md` → Assumptions.
