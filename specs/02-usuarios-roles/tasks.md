---

description: "Task list template for feature implementation"
---

# Tasks: Usuarios, roles y permisos

**Input**: Design documents from `/specs/02-usuarios-roles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos para el frontend (composables/componentes) — mismo criterio que `00-layout-shell` (constitution.md fija Vitest + Vue Test Utils). Sin tests automatizados de SQL/triggers — misma decisión que `01-infra-supabase` (research.md #10); las salvaguardas y RLS se validan manualmente vía `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Extiende los dos repos-en-uno ya existentes (ver `plan.md` → Project Structure):
- Backend: `supabase/migrations/`, `supabase/seed.sql` (ya existentes desde `01-infra-supabase`)
- Frontend: `app/{pages,composables,stores,middleware,components/admin,components/layout}`, `server/api/admin/`
- Tests: `tests/unit/{composables,components/admin,components/layout}`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar las dependencias nuevas y registrar el módulo de Supabase Auth en Nuxt

- [X] T001 [P] Agregar `@nuxtjs/supabase`, `yup`, `vee-validate` como dependencies en `package.json` (research.md #2, #9) — se agregó también `@vee-validate/yup` (adaptador `toTypedSchema`, necesario para usar un schema Yup con VeeValidate, no anticipado en el research original)
- [X] T002 Registrar el módulo `@nuxtjs/supabase` en `nuxt.config.ts`: `redirectOptions` (login = `/login`, callback = `/confirm`) (depende de T001) — verificado que los defaults del módulo ya leen `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (el `.env.example` de `01-infra-supabase`) sin config adicional, y que la `service_role` key vive en `runtimeConfig` privado, nunca en `runtimeConfig.public`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos, función de autorización y sesión de cliente que TODAS las historias de usuario necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede avanzar hasta completar esta fase

- [X] T003 Crear migración `supabase/migrations/20260727010000_usuarios_roles_permisos.sql`: tabla `permisos` (`modulo`, `accion`, `descripcion`, `requiere_alcance`, unique `(modulo, accion)`) + RLS (select/insert/update/delete solo con `fn_has_permiso('administracion','acceso')` — ver T007) per `data-model.md`
- [X] T004 Misma migración: tablas `roles` (incluye `es_sistema boolean`, `es_predeterminado_invitacion boolean not null default false`) y `rol_permisos` (`rol_id`, `permiso_id`, `alcance check in ('propias','todas')`, unique `(rol_id, permiso_id)`) + RLS (mismo criterio que `permisos`) per `data-model.md` (depende de T003)
- [X] T005 Misma migración: tabla `profiles` (`id references auth.users(id)`, `nombre_completo`, `rol_id`, `activo`) + RLS (select de la propia fila o con `administracion.acceso`; insert/update/delete solo `administracion.acceso` o el trigger `handle_new_user`) per `data-model.md` (depende de T004)
- [X] T006 Misma migración: tabla `audit_log` (`entidad`, `entidad_id`, `accion`, `datos_anteriores`, `datos_nuevos`, `changed_by`, `changed_at`) + RLS (solo `insert` vía trigger y `select` con `administracion.acceso`, sin `update`/`delete`) + trigger genérico de auditoría adjuntado a `roles`, `rol_permisos` y `profiles` per `data-model.md`/research.md #3 (depende de T004, T005) — verificado: capturó insert/update de `profiles` con valores antes/después
- [X] T007 Misma migración: función `public.fn_has_permiso(p_modulo, p_accion, p_escritura_id default null)` (`security definer`, lee `profiles`→`rol_permisos`→`permisos` en vivo) per `data-model.md`/research.md #8 (depende de T003, T004, T005) — verificado con usuarios reales Administrador/Auxiliar vía REST API. **Hallazgo real corregido**: RLS por sí sola no basta — Postgres exige el GRANT base incluso para `service_role` (bypassa RLS, no los GRANTs); se agregó `ALTER DEFAULT PRIVILEGES` (hacia adelante) y GRANTs retroactivos para las tablas de catálogo de `01-infra-supabase`, que tenían el mismo bug latente sin haber sido ejercitado con una sesión autenticada real
- [X] T008 Misma migración: trigger `handle_new_user` en `auth.users` (`after insert`) que crea la fila en `profiles` usando el rol con `es_predeterminado_invitacion = true` per research.md #6 (depende de T005) — verificado: usuario nuevo queda con rol `Auxiliar`
- [X] T009 Misma migración: `drop table if exists public.roles_usuario;` (reemplazada por el modelo dinámico) per research.md #1 (depende de T004)
- [X] T010 [P] Poblar `supabase/seed.sql` con el catálogo completo de `permisos` (tabla de la sección 4 del input de `spec.md`) (depende de T003) — 47 permisos sembrados
- [X] T011 Poblar `supabase/seed.sql` con los 3 roles (`Administrador`/`Auxiliar` con `es_predeterminado_invitacion = true`/`Gestor`, todos `es_sistema = true`) y sus filas de `rol_permisos` con alcance, según `spec.md` → Assumptions (depende de T004, T010) — verificado: Administrador 47, Auxiliar 29, Gestor 19 filas de `rol_permisos`
- [X] T012 Crear store Pinia `app/stores/auth.store.ts`: `session`, `profile`, mapa de permisos (`modulo.accion` → alcance), `loading` (depende de T002)
- [X] T013 Crear composable `app/composables/useAuth.ts` per `contracts/usuarios-roles-interface.md` (`user`, `loading`, `hasPermiso()`, `login()`, `logout()`), consumiendo `useSupabaseClient()`/`useSupabaseUser()` y el store de T012 (depende de T012) — agrega `fn_mis_permisos()` (RPC, ver T007) como hallazgo necesario: `permisos`/`rol_permisos` son admin-only vía RLS, un usuario normal no puede leerlas directamente para armar su propio espejo de permisos
- [X] T014 Crear `app/middleware/auth.global.ts`: carga perfil/permisos al navegar (depende de T013) — el redirect a `/login` sin sesión ya lo provee el middleware `global-auth` interno de `@nuxtjs/supabase`, no se duplica. **Hallazgo real corregido**: Nuxt solo carga `.env` automáticamente, no `.env.local` (a diferencia de Vite/Next.js) — corregida la documentación de `01-infra-supabase` en `README.md` (era el primer feature en depender de que las env vars realmente se carguen en Nuxt)

**Checkpoint**: Fundación lista — las historias de usuario pueden comenzar

---

## Phase 3: User Story 1 - Acceso seguro según mi rol (Priority: P1) 🎯 MVP

**Goal**: Un usuario invitado inicia sesión y ve/puede hacer únicamente lo que su rol permite, tanto en el menú de navegación como al intentar cualquier acción (incluso llamando a la API directamente).

**Independent Test**: Con los 3 roles seed ya sembrados, iniciar sesión como cada uno y verificar el drawer, las acciones permitidas, y el rechazo de acciones no permitidas incluso fuera de la interfaz.

### Tests for User Story 1

- [X] T015 [P] [US1] Test de `useAuth()` (login/logout, `hasPermiso()` reactivo ante cambios del store) en `tests/unit/composables/useAuth.spec.ts` — 5 tests, incluyendo el mock de `#imports` (`useSupabaseClient`/`useSupabaseUser` no son auto-import fuera de Nuxt) vía `tests/unit/imports-shim.ts`
- [X] T016 [P] [US1] Test de `AppDrawer` filtrando grupos/ítems según `hasPermiso()` (extiende `tests/unit/components/layout/AppDrawer.spec.ts` de `00-layout-shell`) en el mismo archivo — 3 tests nuevos (oculta ítems, oculta grupo completo, sin permisos = sin grupos)

### Implementation for User Story 1

- [X] T017 [US1] Implementar `app/pages/login.vue`: formulario correo + contraseña con Yup + VeeValidate (`@vee-validate/yup` — dependencia adicional no listada en T001, agregada al implementar), llama a `useAuth().login()` (depende de T013) — verificado en navegador con usuario real
- [X] T018 [US1] Extender `app/composables/useNavItems.ts` (de `00-layout-shell`): agregar `permiso: { modulo, accion }` a cada `NavItem` per research.md #4 (depende de T010)
- [X] T019 [US1] Extender `app/components/layout/AppDrawer.vue` (de `00-layout-shell`): filtrar grupos/ítems vía `useAuth().hasPermiso()`, ocultando un grupo completo si ningún ítem le queda (depende de T018, T013) — verificado en navegador: Administrador ve 5 grupos, Auxiliar ve 4 (Sistema oculto por completo)
- [X] T020 [US1] Verificar que una acción no permitida se rechaza también al llamarla directamente contra la API (no solo cuando la interfaz la oculta), per `quickstart.md` → Escenario 1, paso 4 (depende de T003-T011) — verificado: Auxiliar recibe 403 al intentar `INSERT` en `roles` vía REST directo

**Hallazgos reales corregidos durante esta fase** (más allá de los ya anotados en Foundational):
- `useSupabaseUser()` de `@nuxtjs/supabase` resuelve el usuario vía `getClaims()` (payload JWT), no `getUser()` — el id vive en el claim `sub`, no en `.id`; rompía silenciosamente la carga del perfil (`invalid input syntax for type uuid: "undefined"`).
- Se necesitó una segunda función `fn_mi_perfil()` (mismo patrón que `fn_mis_permisos`) porque `roles` es admin-only vía RLS y un join/embed directo desde `profiles` no puede resolver el nombre del rol para un usuario normal.
- `@supabase/ssr` importa nombres (`parse`/`serialize`) de `cookie` que esbuild no detecta correctamente en este toolchain, rompiendo la hidratación del cliente por completo; corregido con `app/shims/cookie-esm-shim.mjs` (reimplementación mínima RFC 6265, sin interop CJS/ESM de por medio) aliasado en `nuxt.config.ts`.
- `UserMenu.vue` (de `00-layout-shell`) seguía mostrando el stub "Usuario Demo" con logout no-op — actualizado para usar `useAuth()` real (nombre, rol, logout), mismo patrón que la integración de `AppDrawer`/`useNavItems`.

**Checkpoint**: User Story 1 funcional y probable de forma independiente (MVP: acceso autenticado y autorizado)

---

## Phase 4: User Story 2 - Un Administrador reconfigura roles y permisos sin ayuda técnica (Priority: P2)

**Goal**: Un Administrador crea roles, edita sus permisos/alcance, y asigna roles a usuarios, todo desde Administración General.

**Independent Test**: Crear un rol, asignarle permisos con alcance, asignarlo a un usuario de prueba, y verificar que queda limitado exactamente a esos permisos sin tocar código ni migraciones.

### Tests for User Story 2

- [X] T021 [P] [US2] Test de `PermissionChecklist.vue` (marca/desmarca permisos, selector de alcance solo cuando `requiere_alcance`) en `tests/unit/components/admin/PermissionChecklist.spec.ts` — 5 tests
- [X] T022 [P] [US2] Test de `RoleForm.vue` (validación Yup del nombre/descripción, emite el evento de guardado) en `tests/unit/components/admin/RoleForm.spec.ts` — 3 tests. **Hallazgo**: `trigger('submit.prevent')` sobre el `<form>` no dispara `handleSubmit` de VeeValidate de forma confiable en happy-dom; se expone `onSubmit` vía `defineExpose` y el test lo invoca directamente (verificado que el comportamiento es idéntico a un submit real)

### Implementation for User Story 2

- [X] T023 [P] [US2] Crear `app/components/admin/RoleForm.vue`: formulario nombre + descripción (Yup + VeeValidate) para crear/editar un rol
- [X] T024 [P] [US2] Crear `app/components/admin/PermissionChecklist.vue`: checklist agrupado por módulo/acción del catálogo de `permisos`, con selector de alcance (`propias`/`todas`) cuando `requiere_alcance`
- [X] T025 [US2] Crear `app/components/admin/UserRoleAssign.vue`: selector de rol para un usuario, poblado desde la lista dinámica de `roles` (depende de T011)
- [X] T026 [US2] Crear `app/pages/administracion-general/roles/index.vue`: listado de roles con conteo de usuarios asignados, botón crear (usa `RoleForm.vue`), eliminar rol no-sistema sin usuarios (depende de T023)
- [X] T027 [US2] Crear `app/pages/administracion-general/roles/[id].vue`: editor de permisos de un rol usando `PermissionChecklist.vue`; edición de permisos habilitada también para roles `es_sistema` (depende de T024, T026)
- [X] T028 [US2] Crear `server/api/admin/invite-user.post.ts`: invita usuario vía Supabase Admin API (`service_role` desde `runtimeConfig`, nunca al cliente), verificando `fn_has_permiso('administracion','acceso')` del llamante antes de invitar (depende de T002, T007)
- [X] T029 [US2] Crear `app/pages/administracion-general/usuarios/index.vue`: listado de usuarios, invitar (llama a T028), asignar rol (usa `UserRoleAssign.vue`) (depende de T025, T028)
- [X] T030 [US2] Crear `app/middleware/require-admin.ts` (redirige si no hay `administracion.acceso`) y aplicarlo vía `definePageMeta` en `roles/index.vue`, `roles/[id].vue` y `usuarios/index.vue` (depende de T013, T026, T027, T029)

**Verificación real (T025-T030)**: probado en el navegador con un usuario Administrador y un usuario Gestor reales (creados vía Admin API y confirmados por email), contra el stack Supabase local:
- Crear rol nuevo ("Rol de Prueba QA") → aparece de inmediato en el listado y en el selector de asignación de rol.
- Marcar un permiso con `requiere_alcance=true` en el editor → aparece el selector de alcance (`propias` por defecto); "Guardar permisos" persiste correctamente en `rol_permisos` (verificado por consulta directa a la base).
- Invitar usuario desde `usuarios/index.vue` → crea el usuario en `auth.users` vía `service_role`, con el rol predeterminado de invitación (`Auxiliar`, por `es_predeterminado_invitacion`); reasignar su rol a "Gestor" vía el selector se refleja de inmediato en `profiles.rol_id`.
- El middleware `require-admin` redirige correctamente a `/` a un usuario sin `administracion.acceso` (probado con el usuario Gestor) al intentar acceder a `/administracion-general/roles`.
- **Hallazgo real (no de la app)**: durante la verificación, el servidor de desarrollo (`yarn dev`) quedó en un estado atascado tras múltiples recargas HMR — las peticiones a `/api/admin/invite-user` no llegaban al servidor (0 peticiones de red, sin logs, sin errores) aunque la UI se comportaba como si hubiera tenido éxito. Se resolvió reiniciando el proceso `yarn dev` limpiamente; no era un bug de la aplicación.
- **Hallazgo real confirmado (positivo)**: al intentar eliminar por completo (hard-delete) un usuario de prueba con historial en `audit_log`, la API de Supabase Admin lo rechazó con `23503 audit_log_changed_by_fkey` — confirma que la bitácora de auditoría (FR-017) efectivamente impide perder trazabilidad incluso si un usuario es eliminado del sistema de autenticación.

**Checkpoint**: User Story 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - El sistema nunca se queda sin quien lo administre (Priority: P3)

**Goal**: El sistema bloquea las tres formas de dejar la notaría sin ningún usuario con acceso administrativo, y protege los roles con usuarios asignados de ser eliminados.

**Independent Test**: Con un único usuario activo con acceso administrativo, intentar las 3 vías de quitárselo (reasignar rol, quitar el permiso, desactivar la cuenta) y confirmar que las 3 se rechazan; intentar eliminar un rol con usuarios asignados y confirmar que se rechaza.

### Implementation for User Story 3

- [X] T031 [US3] Crear migración `supabase/migrations/20260727010100_salvaguardas_roles.sql`: trigger `before delete` en `roles` que rechaza si `es_sistema = true` o si tiene usuarios activos asignados (FR-009/FR-010) (depende de T004, T005)
- [X] T032 [US3] Misma migración: trigger `before delete`/`before update` en `rol_permisos` que rechaza remover `administracion.acceso` si es el último rol con ese permiso y tiene usuarios activos (FR-016, vía 1) (depende de T031)
- [X] T033 [US3] Misma migración: trigger `before update` en `profiles` que rechaza reasignar `rol_id` a un rol sin `administracion.acceso`, o desactivar (`activo = false`), cuando el usuario es el último con ese acceso (FR-016, vías 2 y 3) (depende de T032)
- [X] T034 [US3] Mostrar en `roles/index.vue` y `usuarios/index.vue` el mensaje de error de la salvaguarda de forma legible cuando una acción es rechazada (depende de T026, T029, T033)
- [X] T035 [US3] Verificar los 4 escenarios de salvaguarda (reasignar, quitar permiso, desactivar, eliminar rol con usuarios) per `quickstart.md` → Escenario 3 (depende de T033, T034)

**Hallazgo real (diseño ajustado)**: `T032` se especificó como un trigger `before delete` en `rol_permisos`, pero `roles/[id].vue` (T027) guardaba permisos con un patrón "borrar todo → reinsertar todo", lo que dispararía el trigger de "quitar `administracion.acceso`" incluso cuando el permiso se deja marcado (falso positivo). Se corrigió `guardarPermisos()` para calcular un diff real: solo se hace `delete` de los `permiso_id` que efectivamente se desmarcaron, y un `upsert` (`onConflict: 'rol_id,permiso_id'`) del resto — así el trigger de salvaguarda solo se dispara ante una remoción real.

**Verificación real (T031-T035)**: ejecutada directamente contra Postgres local (`docker exec ... psql`) con un único usuario Administrador activo, y también en el navegador (usuario real, sesión real):
- Reasignar el rol del único admin activo a uno sin `administracion.acceso` → rechazado (`fn_bloquear_dejar_sin_admin`).
- Quitar `administracion.acceso` al único rol que lo otorga → rechazado (`fn_bloquear_remover_ultimo_admin_permiso`).
- Desactivar (`activo=false`) al único admin activo → rechazado tanto por SQL directo como desde `usuarios/index.vue` en el navegador (el mensaje de la salvaguarda se ve legible en un `v-alert` rojo: "No se puede aplicar este cambio: dejaría a la notaría sin ningún usuario activo con acceso administrativo.").
- Eliminar un rol con usuarios activos asignados → rechazado tanto para un rol `es_sistema` (Administrador) como para un rol no-sistema creado ad hoc con un único admin asignado (confirma FR-009 "sin importar si es de la configuración inicial o creado después").
- Verificado también el camino positivo: con un segundo usuario administrador activo, reasignar/desactivar al primero se permite sin error.
- Base de datos restaurada a su estado sembrado (`npx supabase db reset`) después de cada verificación; no quedan usuarios ni roles de prueba.

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones transversales que cubren SC-001 a SC-006 del spec

- [X] T036 [P] Verificar que la bitácora `audit_log` captura los cambios de US2/US3 con valores antes/después y que la tabla es de solo `insert`/`select`, per `quickstart.md` → "Verificar la bitácora de auditoría" (depende de T006)
- [X] T037 [P] Revisión de código: confirmar cero condiciones (RLS, `useAuth()`, páginas de administración) que comparen `roles.nombre` contra un literal — todo pasa por `fn_has_permiso()`/`hasPermiso()` (contracts/usuarios-roles-interface.md, regla dura)
- [X] T038 [P] Documentar en `README.md` una sección "Usuarios, roles y permisos": cómo iniciar sesión, cómo administrar roles/usuarios, y enlace a `quickstart.md`/`contracts/usuarios-roles-interface.md`
- [X] T039 Ejecutar `quickstart.md` completo (los 3 escenarios + bitácora + revisión de nombre de rol) y corregir hallazgos
- [X] T040 [P] Confirmar `yarn test` (Vitest) en verde para todos los tests nuevos de este feature

**Verificación real (T036-T040)**:
- **T036**: `update public.roles set descripcion=...` vía `psql` directo →
  `audit_log` capturó `datos_anteriores`/`datos_nuevos` con el valor
  exacto antes/después. `select polname, polcmd from pg_policy where
  polrelid='public.audit_log'::regclass` → una sola política, `select`
  (`r`) para admin; ninguna de `insert`/`update`/`delete`.
  **Hallazgo real (corregido)**: pese a la política RLS de solo-lectura,
  el `GRANT` base heredado del `ALTER DEFAULT PRIVILEGES` de
  `01-infra-supabase` seguía dando `INSERT`/`UPDATE`/`DELETE` a
  `authenticated` y `service_role` a nivel de tabla — y `service_role`
  tiene `rolbypassrls = true`, por lo que ignora RLS por completo. Un uso
  indebido (o un bug futuro) de la clave `service_role` podría haber
  alterado o borrado la bitácora directamente. Se añadió un `revoke
  insert, update, delete, truncate on public.audit_log from
  authenticated, service_role` a la migración de salvaguardas. Verificado
  con `curl` directo a PostgREST usando la clave `service_role`: tanto
  `POST` (insert) como `DELETE` ahora devuelven `42501 permission denied`;
  el trigger `fn_audit_log_generic` (dueño `postgres`, `security
  definer`) sigue funcionando con normalidad.
- **T037**: `grep -rn "Administrador\|Auxiliar\|Gestor" app/ server/` y
  `grep -rn "nombre\s*=\s*'" supabase/migrations/*.sql` → cero
  coincidencias fuera de `seed.sql` (que sí necesita los nombres para
  poblar el catálogo inicial). Ninguna política RLS, `useAuth()`, ni
  página de administración compara contra un nombre de rol.
- **T038**: sección añadida a `README.md` (login, administración de
  roles/usuarios, salvaguardas, auditoría, enlaces a `quickstart.md` y al
  contrato).
- **T039**: Escenario 1 (US1) y Escenario 2 (US2) verificados durante
  T001-T030; Escenario 3 (US3) verificado en T031-T035; bitácora
  verificada en T036; revisión de nombre de rol en T037. Base de datos
  restaurada a su estado sembrado tras cada verificación
  (`npx supabase db reset`).
- **T040**: `npx vitest run` → **8 archivos, 41/41 tests en verde**.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-5)**: dependen de Foundational
  - US1 (P1) no depende de US2/US3
  - US2 (P2) reutiliza el store/composable de auth de Foundational (T012/T013) y el catálogo de roles sembrado (T011); no depende de que US1 esté "terminada", solo de que Foundational exista
  - US3 (P3) depende de las tablas `roles`/`rol_permisos`/`profiles` de Foundational (T004/T005), y sus tareas de UI (T034) reutilizan páginas creadas en US2 (T026/T029) — es la única historia con una dependencia de archivo cruzada con otra historia, documentada explícitamente
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas

### Within Each User Story

- Tests antes que implementación (US1, US2)
- Migración/esquema antes que UI que lo consume
- Componentes reutilizables (`RoleForm`, `PermissionChecklist`, `UserRoleAssign`) antes que las páginas que los ensamblan

### Parallel Opportunities

- T001 (Setup) puede iniciarse de inmediato
- T010 (Foundational, seed de `permisos`) en paralelo con T005/T006 (archivos distintos... nota: T003-T009 comparten el mismo archivo de migración y por lo tanto son secuenciales entre sí; T010 edita `seed.sql`, un archivo distinto, por lo que sí puede avanzar en paralelo una vez exista T003)
- T015, T016 (tests de US1) en paralelo entre sí
- T021, T022 (tests de US2) en paralelo entre sí; T023, T024 (componentes de US2) en paralelo entre sí
- US2 y US3 pueden desarrollarse en paralelo una vez completada Foundational (migraciones en archivos distintos), aunque T034 (US3) toca páginas creadas por US2 y debe esperarlas

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de la Historia 1:
Task: "Test de useAuth() en tests/unit/composables/useAuth.spec.ts"
Task: "Test de AppDrawer filtrando por permiso en tests/unit/components/layout/AppDrawer.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (crítico — esquema, `fn_has_permiso`, sesión de cliente)
3. Completar Fase 3: User Story 1
4. **DETENER Y VALIDAR**: probar User Story 1 de forma independiente (`quickstart.md`, Escenario 1)
5. Con esto ya hay autenticación y autorización funcionando de extremo a extremo con los 3 roles seed, lista para que cualquier módulo de negocio futuro construya sus propias políticas RLS sobre `fn_has_permiso()`

### Incremental Delivery

1. Setup + Foundational → fundación lista (esquema, auth, sesión)
2. Agregar US1 → validar → demo (MVP: login + autorización real, sin UI de administración todavía)
3. Agregar US2 (administración dinámica de roles) → validar → demo
4. Agregar US3 (salvaguardas de continuidad) → validar → demo
5. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Verificar que los tests fallen antes de implementar
- Commitear después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de mismo archivo simultáneo, dependencias cruzadas entre historias que rompan su independencia (la única excepción documentada es T034, que depende de páginas de US2 por ser una mejora de UX sobre ellas)
