# Implementation Plan: Usuarios, roles y permisos

**Branch**: `02-usuarios-roles` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/02-usuarios-roles/spec.md`

## Summary

Autenticación (Supabase Auth, correo + contraseña, sin autoregistro) y
autorización dinámica: un catálogo de permisos (`modulo.accion`) y roles
editables (`roles` + `rol_permisos`, con alcance `propias`/`todas` por
permiso), reforzados en Postgres vía RLS a través de una única función de
autorización (`fn_has_permiso`) — nunca condiciones de rol hardcodeadas.
Incluye 3 roles seed (Administrador, Auxiliar, Gestor), una bitácora de
auditoría inmutable (append-only) para cambios de roles/permisos/
asignaciones, salvaguardas para nunca quedar sin acceso administrativo, y
la integración correspondiente en el frontend: login, pantallas de
administración de roles/usuarios dentro de Administración General, y
filtrado del drawer de `00-layout-shell` según los permisos del usuario
autenticado. Esta feature reemplaza el catálogo estático `roles_usuario`
sembrado por `01-infra-supabase` (ver research.md #1).

## Technical Context

**Language/Version**: TypeScript + Vue 3.5 (Composition API) sobre Nuxt 4.5 (frontend); SQL + plpgsql (migraciones y función de autorización) sobre Postgres 17 (backend) — mismo stack que `00-layout-shell` y `01-infra-supabase`.

**Primary Dependencies**: `@nuxtjs/supabase` (módulo oficial Nuxt para Supabase Auth + cliente tipado, no instalado aún — ver research.md #2), `yup` + `vee-validate` (ya fijados por `constitution.md` para validación de formularios; primer feature que realmente los usa — login, alta de rol, editor de permisos), reutiliza Vuetify/Pinia ya presentes de `00-layout-shell` y la CLI de Supabase ya pinneada en `01-infra-supabase`.

**Storage**: PostgreSQL (Supabase, mismo stack local de `01-infra-supabase`) — tablas nuevas `roles`, `permisos`, `rol_permisos`, `profiles`, y una bitácora de auditoría genérica `audit_log`; se elimina la tabla `roles_usuario` sembrada por `01-infra-supabase` (superada, ver research.md #1).

**Testing**: Vitest + Vue Test Utils para composables/componentes de frontend (`useAuth`, `RoleEditor`, filtrado del drawer), per `constitution.md`. Sin framework de pruebas SQL dedicado — misma decisión que `01-infra-supabase` (research.md #7 de ese feature); la función de autorización y las salvaguardas se validan manualmente vía `quickstart.md`.

**Target Platform**: Navegador web (frontend) + backend local Supabase vía Docker (mismo entorno de `01-infra-supabase`).

**Project Type**: Aplicación web Nuxt de un solo proyecto — extiende `app/` (frontend, ya existente desde `00-layout-shell`) y `supabase/migrations/` (backend, ya existente desde `01-infra-supabase`) del mismo repo; no hay split backend/frontend como proyectos separados.

**Performance Goals**: La función de autorización se evalúa por fila en cada política RLS; para el volumen esperado de una notaría (decenas de usuarios, cientos/miles de escrituras) esto no requiere caché adicional — se limita a los índices obligatorios sobre las tablas de unión (ver data-model.md). Sin metas de throughput adicionales.

**Constraints**: Ninguna política RLS ni comprobación de autorización puede condicionar por nombre de rol — todo pasa por el catálogo de permisos vía `fn_has_permiso` (spec, sección 7 del input original); los permisos no deben cachearse en el JWT (deben reflejarse sin cerrar sesión, FR-007); la bitácora de auditoría es append-only, nunca se actualiza ni se borra (Clarification, FR-017); las tres vías de dejar la notaría sin acceso administrativo deben bloquearse por igual (FR-016); la `service_role` key nunca se expone al cliente (regla ya fijada por `01-infra-supabase`) — invitar usuarios requiere una ruta de servidor.

**Scale/Scope**: 3 roles seed, ~12 módulos de negocio × acciones del catálogo (≈50 permisos), 1 función de autorización central, 1 tabla de auditoría genérica, integración con el drawer ya existente de `00-layout-shell` (filtrado por permiso) y reemplazo del catálogo estático de roles de `01-infra-supabase`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.2.1:

| Regla de la constitución | Aplica a este feature | Estado |
|---|---|---|
| Frontend: Vue 3 + Nuxt 3 + Vuetify | Sí — login y pantallas de administración de roles/usuarios | ✅ Pass (misma nota de versión Nuxt 4 ya documentada en `00-layout-shell/research.md`) |
| Validación de formularios: Yup + VeeValidate | Sí — primer feature que los usa realmente (login, alta de rol, editor de permisos) | ✅ Pass |
| Testing: Vitest + Vue Test Utils | Sí — composables/componentes de frontend | ✅ Pass |
| Manejo de estado: Pinia | Sí — store de sesión/perfil/permisos del usuario autenticado | ✅ Pass |
| Backend/datos: Supabase (Postgres + Auth + Storage + Edge Functions), Docker local | Sí — Supabase Auth + nuevas tablas RLS sobre el stack de `01-infra-supabase` | ✅ Pass |
| Autenticación/roles: Supabase Auth + RLS por rol | Sí — es el propósito central de este feature (con roles dinámicos en vez de fijos) | ✅ Pass |
| Sin i18n / solo es-MX | Sí, todo el copy nuevo en español | ✅ Pass |
| Bronce reservado al "sello" | Sí aplica como restricción — ninguna pantalla nueva (login, roles, usuarios) debe usar el color bronce de forma decorativa | ✅ Pass (a verificar en implementación, igual que `00-layout-shell`) |
| Docker (dev local / producción) | No aplica directamente — ya cubierto por `01-infra-supabase` | N/A |
| CI/CD: no se implementa por ahora | Sí — este feature no agrega pipelines | ✅ Pass |

**Resultado**: ningún gate bloquea el diseño. No se requiere entrada en
Complexity Tracking.

**Re-check post-Fase 1**: `data-model.md` (tablas `roles`/`permisos`/
`rol_permisos`/`profiles`/`audit_log`, función `fn_has_permiso`, triggers
de salvaguarda) y `contracts/` (contrato de `useAuth()` hacia otros
módulos, y el contrato de integración con el drawer de `00-layout-shell`)
no introducen dependencias nuevas de stack ni violan ninguna regla — los
gates de arriba se mantienen en ✅ Pass sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/02-usuarios-roles/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── usuarios-roles-interface.md   # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, aún no generado)
```

### Source Code (repository root)

Extiende ambos repos-en-uno ya existentes (`app/` de `00-layout-shell`,
`supabase/` de `01-infra-supabase`); no se crea ninguna carpeta de
proyecto nueva.

```text
supabase/
├── migrations/
│   └── 20260727010000_usuarios_roles_permisos.sql
│       # roles, permisos, rol_permisos, profiles, audit_log
│       # fn_has_permiso(), trigger genérico de auditoría,
│       # triggers de salvaguarda (rol con usuarios, último admin),
│       # trigger handle_new_user (auth.users → profiles),
│       # DROP de public.roles_usuario (superada, research.md #1)
└── seed.sql                           # + catálogo de permisos y rol_permisos seed (Administrador/Auxiliar/Gestor)

app/
├── middleware/
│   └── auth.global.ts                 # redirige a /login si no hay sesión; carga el perfil/permisos
├── pages/
│   ├── login.vue                      # formulario correo + contraseña (Yup + VeeValidate)
│   └── administracion-general/
│       ├── roles/
│       │   ├── index.vue              # listado de roles + conteo de usuarios
│       │   └── [id].vue                # editor de permisos por rol (checklist + alcance)
│       └── usuarios/
│           └── index.vue               # listado de usuarios, invitar, asignar rol
├── composables/
│   └── useAuth.ts                     # sesión, perfil, hasPermiso(modulo, accion, escrituraId?)
├── stores/
│   └── auth.store.ts                  # Pinia: session, profile, permissions map, loading
├── components/
│   └── admin/
│       ├── RoleForm.vue               # crear/editar nombre+descripción de un rol
│       ├── PermissionChecklist.vue    # checklist agrupado por módulo/acción + selector de alcance
│       └── UserRoleAssign.vue         # asignar rol a un usuario desde la lista dinámica
└── server/
    └── api/
        └── admin/
            └── invite-user.post.ts    # invita usuario vía Supabase Admin API (service_role, solo servidor)

# Modificaciones a 00-layout-shell (integración, no archivos nuevos):
# app/composables/useNavItems.ts  → cada NavItem gana un permiso requerido (modulo.accion)
# app/components/layout/AppDrawer.vue → filtra grupos/ítems vía useAuth().hasPermiso()
```

**Structure Decision**: Un solo proyecto Nuxt + Supabase (sin split). El
backend de este feature vive en una migración nueva dentro de
`supabase/migrations/` (mismo mecanismo que `01-infra-supabase`); el
frontend extiende `app/` con las páginas/composable/store de este
feature y modifica dos archivos existentes de `00-layout-shell`
(`useNavItems.ts`, `AppDrawer.vue`) para filtrar el menú por permiso —
son las únicas modificaciones a código de un feature previo, y quedan
documentadas explícitamente aquí porque `00-layout-shell/contracts/` no
anticipó filtrado por permisos (ver research.md #4).

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida intencionalmente.*
