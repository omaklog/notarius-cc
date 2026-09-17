# Implementation Plan: Infraestructura Supabase (entorno local)

**Branch**: `01-infra-supabase` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/01-infra-supabase/spec.md`

## Summary

Levantar el backend local del proyecto (Postgres, Auth, PostgREST, Realtime,
Storage, gateway, Studio, Inbucket y runtime de Edge Functions) usando la CLI
oficial de Supabase, orquestada como dependencia de desarrollo del propio
repo (no una instalación global suelta) para que su versión quede fijada y
sea reproducible. El enfoque técnico es: `supabase/` como carpeta de
infraestructura versionada (migraciones SQL, `seed.sql`, `config.toml`,
Edge Functions stub), catálogos base mínimos sembrados por migración +
seed, tres buckets de Storage provisionados desde el inicio, un esquema
`pld` reservado para Cumplimiento PLD/UIF, y `.env.example` documentando
todas las variables sin valores reales. No se integra aún el cliente de
Supabase en el frontend Nuxt (`@supabase/supabase-js` / `@nuxtjs/supabase`)
— esa integración pertenece a un feature futuro (p. ej. Autenticación).

## Technical Context

**Language/Version**: SQL (migraciones Postgres) + TypeScript sobre Deno (runtime de Edge Functions, gestionado por la CLI de Supabase)

**Primary Dependencies**: CLI de Supabase (paquete npm oficial `supabase`, fijado como devDependency en `package.json` para que la versión quede en `yarn.lock` — ver `research.md` #1), Docker (ya requerido por `constitution.md` §7 para el entorno de desarrollo local; orquestado internamente por la CLI, sin `docker-compose.yml` propio)

**Storage**: PostgreSQL (gestionado por el stack de Supabase, puerto 54322) + Supabase Storage (3 buckets sobre el mismo Postgres/volumen); datos persistidos en volúmenes Docker administrados por la CLI

**Testing**: Sin framework de pruebas automatizadas dedicado para este feature — `constitution.md` solo fija Vitest + Vue Test Utils para el frontend, no para infraestructura/SQL. Validación vía `quickstart.md` (arranque, reset, verificación manual de servicios/políticas/buckets). Ver `research.md` #5 para la alternativa considerada (pgTAP) y por qué se pospone.

**Target Platform**: Contenedores Docker locales (macOS/Linux/WSL) orquestados por la CLI de Supabase; sin despliegue a servidor en este feature

**Project Type**: Infraestructura de backend agregada al mismo repo Nuxt existente (no hay split backend/frontend como proyectos separados) — `supabase/` se agrega en la raíz del repo, junto a `app/`

**Performance Goals**: Arranque completo del stack y disponibilidad de todos los servicios en menos de 5 minutos en una máquina limpia con Docker ya instalado (SC-001); no aplican metas de throughput en este feature (no hay endpoints de negocio propios todavía)

**Constraints**: RLS activo desde la primera migración en toda tabla de negocio (sin excepciones); `service_role` key nunca expuesta al cliente Nuxt; puertos fijos documentados en `spec.md` §4 (Postgres 54322, gateway 54321, Studio 54323, Inbucket 54324); versión de la CLI fijada en el repo

**Scale/Scope**: Un entorno Supabase local por desarrollador; 4 tablas de catálogo mínimas sembradas (`tipos_acto_notarial`, `roles_compareciente`, `roles_usuario`, `uma_historico`), 1 esquema adicional reservado (`pld`, vacío por ahora), 3 buckets de Storage, 2 Edge Functions stub (sin lógica de negocio real)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.2.1:

| Regla de la constitución | Aplica a este feature | Estado |
|---|---|---|
| Backend/datos: Supabase (Postgres + Auth + Storage + Edge Functions), Docker local | Sí — es exactamente el alcance de este feature | ✅ Pass |
| Autenticación/roles: Supabase Auth + RLS por rol | Parcial — este feature habilita RLS y siembra el catálogo de roles; los flujos de login/sesión son de un futuro spec de Autenticación | ✅ Pass (infra), N/A (UX de auth) |
| Validación de formularios: Yup + VeeValidate | No — no hay formularios en infraestructura | N/A |
| Testing: Vitest + Vue Test Utils | No aplica directamente (es infraestructura SQL/Docker, no componentes Vue) | N/A, ver nota de Testing arriba |
| Manejo de estado: Pinia | No — no hay estado de cliente en este feature | N/A |
| Sin i18n / solo es-MX | Sí, copy de seed/documentación en español | ✅ Pass |
| Bronce reservado al "sello" | No aplica — no hay UI en este feature | N/A |
| Docker (dev local / producción) | Sí — este feature implementa exactamente el entorno de desarrollo local; producción queda fuera de alcance por diseño (spec §Assumptions) | ✅ Pass |
| CI/CD: no se implementa por ahora | Sí — este feature no agrega pipelines de CI | ✅ Pass |

**Resultado**: ningún gate bloquea el diseño. No se requiere entrada en
Complexity Tracking.

**Re-check post-Fase 1**: `data-model.md` (tablas de catálogo + esquema
`pld`) y `contracts/` (convención de nombres de vars/buckets/tablas) no
introducen UI, formularios, ni estado de cliente — los gates de arriba se
mantienen en ✅ Pass sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/01-infra-supabase/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── supabase-infra-contract.md   # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, aún no generado)
```

### Source Code (repository root)

Se agrega infraestructura de backend al mismo repo Nuxt ya existente (sin
carpetas `backend/`/`frontend/` separadas — Supabase se consume como
servicio externo vía Docker, no como código de aplicación propio).

```text
supabase/
├── config.toml                        # Puertos y config del stack local (spec.md §4)
├── migrations/
│   ├── 20260727000000_init_extensions.sql   # pgcrypto/uuid, esquema `pld`
│   └── 20260727000100_catalogos_base.sql    # 4 tablas de catálogo + RLS + storage buckets
├── seed.sql                           # Datos base: tipos de acto, roles, UMA vigente
└── functions/
    ├── notificar-evento/              # Stub — lógica real pertenece al spec de Notificaciones
    │   └── index.ts
    └── consultar-listas-pld/          # Stub — lógica real pertenece al spec de Cumplimiento PLD
        └── index.ts

.env.example                           # Documenta todas las vars sin valores reales
.env.local                             # Real, gitignored (no se versiona)

package.json                           # +devDependency "supabase" (CLI pinneada) y scripts db:*
```

**Structure Decision**: Infraestructura de Supabase vive en `supabase/` en la
raíz del repo (convención estándar de la CLI, requerida para que
`supabase start`/`db reset` la detecten automáticamente). La CLI se
consume como devDependency de npm (no instalación global) para que su
versión quede fijada en `yarn.lock` (FR-004). No se toca `app/` en este
feature — la integración del cliente Supabase en el frontend Nuxt es
alcance de un feature futuro.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida intencionalmente.*
