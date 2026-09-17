---

description: "Task list template for feature implementation"
---

# Tasks: Infraestructura Supabase (entorno local)

**Input**: Design documents from `/specs/01-infra-supabase/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: NO incluidas — `research.md` #5 decide explícitamente no introducir un framework de pruebas automatizadas nuevo para infraestructura/SQL (constitution.md solo fija Vitest+Vue Test Utils para el frontend). La validación es manual vía `quickstart.md`; las tareas de verificación abajo referencian esa guía en vez de un archivo de test.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Infraestructura agregada al mismo repo Nuxt existente (ver `plan.md` → Project Structure):
- Infraestructura Supabase: `supabase/{config.toml,migrations,seed.sql,functions}`
- Variables de entorno: `.env.example` (raíz del repo)
- Documentación: `README.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fijar la herramienta (CLI) y escafoldar la infraestructura base que este feature necesita

- [X] T001 [P] Agregar `supabase` (paquete npm oficial de la CLI, versión exacta fijada) como devDependency en `package.json`, más scripts `db:start`, `db:stop`, `db:reset`, `db:functions:serve` (research.md #1, FR-004)
- [X] T002 [P] Ejecutar `npx supabase init` para escafoldar `supabase/` en la raíz del repo (`config.toml`, `migrations/`, `seed.sql`, `functions/`)
- [X] T003 [P] Crear `.env.example` en la raíz del repo documentando `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` y placeholders de proveedores externos futuros (Notificaciones), sin valores reales (FR-010)
- [X] T004 [P] Agregar entradas a `.gitignore` para `.env.local`, `supabase/.branches/` y `supabase/.temp/` (nunca versionar secretos ni estado local generado) — ya cubierto por el `.gitignore` raíz existente (`.env*`) y el `supabase/.gitignore` generado por la CLI (`.branches`, `.temp`); verificado, sin cambios necesarios

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura base que TODAS las historias de usuario necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede avanzar hasta completar esta fase

- [X] T005 Configurar/verificar `supabase/config.toml` para que los puertos coincidan con `spec.md` §4 (API gateway 54321, Postgres 54322, Studio 54323, Inbucket 54324) (depende de T002) — los defaults generados por `supabase init` ya coinciden exactamente, sin cambios necesarios
- [X] T006 [P] Crear migración `supabase/migrations/20260727000000_init_extensions.sql`: habilitar `pgcrypto`, crear el esquema `pld` (vacío, reservado), y definir la función/trigger reutilizable `set_updated_at()` de la convención de auditoría (data-model.md) (depende de T002)

**Checkpoint**: Fundación lista — las historias de usuario pueden comenzar

---

## Phase 3: User Story 1 - Levantar el entorno local completo con un solo comando (Priority: P1) 🎯 MVP

**Goal**: `npx supabase start` deja disponible el stack completo (Postgres, Auth, PostgREST, Realtime, Storage, gateway, Studio, Inbucket, runtime de Edge Functions) sin pasos manuales, con datos persistentes entre reinicios normales.

**Independent Test**: En una máquina limpia, ejecutar el comando de arranque documentado y verificar que cada servicio responde en su puerto documentado, que Studio carga, y que los datos sobreviven a un `stop`/`start` sin `db reset`.

### Implementation for User Story 1

- [X] T007 [US1] Ejecutar y verificar que `npx supabase start` levanta el stack completo sin errores ni pasos manuales adicionales, per `quickstart.md` → "Levantar el entorno" (depende de T005, T006) — verificado: gateway/Postgres/Studio/Mailpit responden (200/307/200/200), REST API responde con `anon` key
- [X] T008 [P] [US1] Crear función stub `supabase/functions/notificar-evento/index.ts` que responde explícitamente "no implementado" (research.md #6) — verificado, responde 501
- [X] T009 [P] [US1] Crear función stub `supabase/functions/consultar-listas-pld/index.ts` que responde explícitamente "no implementado" (research.md #6) — verificado, responde 501
- [X] T010 [US1] Documentar en `README.md` los comandos de arranque/parada, la versión de la CLI fijada y los puertos del stack (FR-004, spec §4) (depende de T001, T007)
- [X] T011 [US1] Verificar persistencia de datos entre `supabase stop` + `supabase start` sin `db reset`, per `quickstart.md` → "Levantar el entorno" (depende de T007) — verificado con tabla de prueba: el dato sobrevive al ciclo stop/start

**Checkpoint**: User Story 1 funcional y probable de forma independiente (MVP de la infraestructura)

---

## Phase 4: User Story 2 - Reconstruir el esquema y catálogos base de forma reproducible (Priority: P2)

**Goal**: `supabase db reset` reconstruye el esquema únicamente desde migraciones versionadas y deja poblados los catálogos base de `constitution.md`.

**Independent Test**: Con el stack corriendo, ejecutar `supabase db reset` y verificar que los 4 catálogos base quedan poblados y que ninguna tabla de negocio carece de política RLS.

### Implementation for User Story 2

- [X] T012 [US2] Crear migración `supabase/migrations/20260727000100_catalogos_base.sql`: tablas `tipos_acto_notarial`, `roles_compareciente`, `roles_usuario`, `uma_historico` con columnas de auditoría, trigger `set_updated_at`, y políticas RLS (lectura `authenticated`, escritura `service_role`) per `data-model.md` (depende de T006)
- [X] T013 [US2] Poblar `supabase/seed.sql` con los valores base de los 4 catálogos (roles de usuario y compareciente de `constitution.md` §3/§7, subconjunto representativo de tipos de acto, UMA vigente placeholder) per research.md #3 (depende de T012)
- [X] T014 [US2] Verificar que `npx supabase db reset` reconstruye el esquema solo desde `supabase/migrations/` y siembra los catálogos desde `seed.sql`, per `quickstart.md` → "Reconstruir esquema + catálogos" (depende de T012, T013) — verificado: los 5+4+5 registros y la UMA quedan poblados, esquema `pld` existe
- [X] T015 [US2] Verificar que cero tablas de negocio carecen de política RLS, vía la consulta de `pg_policies` de `quickstart.md` → "Verificar RLS" (depende de T012) — verificado: la consulta devuelve 0 filas

**Checkpoint**: User Story 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Almacenamiento de archivos con buckets predefinidos y seguros (Priority: P3)

**Goal**: Los 3 buckets de Storage requeridos existen con su nivel de acceso correcto desde el primer `db reset`, sin crearlos manualmente.

**Independent Test**: Tras reconstruir el entorno, verificar que existen exactamente los 3 buckets esperados y que cada uno respeta su nivel de acceso (privado o público de solo lectura).

### Implementation for User Story 3

- [X] T016 [US3] Crear migración `supabase/migrations/20260727000200_storage_buckets.sql`: crear los buckets `expedientes` (privado), `evidencias-pld` (privado) y `logos-notaria` (público de solo lectura) más sus políticas de acceso en `storage.objects` per `data-model.md`/`contracts/supabase-infra-contract.md` (depende de Foundational)
- [X] T017 [US3] Verificar que los 3 buckets existen con su nivel de acceso correcto tras `supabase db reset`, per `quickstart.md` → "Buckets de Storage" (depende de T016) — verificado vía `storage.buckets` (2 privados, 1 público)
- [X] T018 [US3] Verificar que `logos-notaria` permite lectura pública sin autenticación y que `expedientes`/`evidencias-pld` la rechazan sin autenticación, per `quickstart.md` → "Buckets de Storage" (depende de T016) — verificado vía Storage REST API: lectura pública de `logos-notaria` OK; escritura a `logos-notaria` y lectura/escritura a `expedientes` como `anon` rechazadas por RLS

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones transversales que cubren SC-001 a SC-006 del spec

- [X] T019 [P] Documentar en `README.md` una sección "Backend local (Supabase)": prerrequisitos, comandos, puertos, la regla de "cambios de esquema solo vía migración", y enlace a `quickstart.md`/`contracts/supabase-infra-contract.md`, para que specs de módulos futuros la sigan
- [X] T020 Ejecutar `quickstart.md` completo (los 3 escenarios + verificación de RLS + variables de entorno) y corregir hallazgos — ejecutado end-to-end (start/stop/reset, catálogos, esquema `pld`, buckets + niveles de acceso, cero tablas sin RLS, Edge Functions stub, `.env.example`/`.gitignore`); un hallazgo real encontrado y corregido durante la validación: conflicto de puertos con el stack de otro proyecto local (`control-contable`), resuelto deteniéndolo temporalmente y restaurándolo al terminar — comportamiento de error claro ante conflicto de puertos, tal como anticipa el edge case de `spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup (T002) — BLOQUEA todas las historias
- **User Stories (Phase 3-5)**: dependen de Foundational
  - US1 (P1) no depende de US2/US3
  - US2 (P2) depende de la migración de extensiones/esquema de Foundational (T006), no de US1
  - US3 (P3) depende solo de Foundational, no de US1/US2 — usa un archivo de migración propio
  - Cada historia es probable de forma independiente una vez completada Foundational
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas

### Within Each User Story

- Migración antes que seed (US2: T012 antes que T013)
- Migración antes que verificación manual (US2/US3: crear antes de verificar)
- Cada historia completa antes de pasar a la siguiente prioridad (si se sigue el orden MVP)

### Parallel Opportunities

- T001-T004 (Setup) en paralelo — archivos distintos
- T005-T006 (Foundational): T006 en paralelo con T005 (archivos distintos); ambas dependen solo de T002
- T008, T009 (Edge Functions stub de US1) en paralelo entre sí — archivos distintos
- US2 y US3 pueden desarrollarse en paralelo entre sí una vez completada Foundational (tocan archivos de migración distintos)

---

## Parallel Example: User Story 1

```bash
# Lanzar en paralelo los stubs de Edge Functions de la Historia 1:
Task: "Crear función stub notificar-evento en supabase/functions/notificar-evento/index.ts"
Task: "Crear función stub consultar-listas-pld en supabase/functions/consultar-listas-pld/index.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (crítico — bloquea todas las historias)
3. Completar Fase 3: User Story 1
4. **DETENER Y VALIDAR**: probar User Story 1 de forma independiente (`quickstart.md`, sección "Levantar el entorno")
5. Con esto ya se puede empezar a diseñar el esquema de cualquier módulo de negocio sobre un backend local funcional

### Incremental Delivery

1. Setup + Foundational → fundación lista
2. Agregar US1 → validar → demo (MVP: stack local arriba)
3. Agregar US2 (esquema + catálogos reproducibles) → validar → demo
4. Agregar US3 (buckets de Storage) → validar → demo
5. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Sin tareas de test dedicadas — verificar cada historia siguiendo `quickstart.md`
- Commitear después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de mismo archivo simultáneo, dependencias cruzadas entre historias que rompan su independencia
