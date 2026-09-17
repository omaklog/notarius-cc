---

description: "Task list template for feature implementation"
---

# Tasks: Escrituras (entidad raíz)

**Input**: Design documents from `/specs/03-escrituras/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos para el frontend (componentes/formularios) — mismo criterio que `00-layout-shell`/`02-usuarios-roles` (constitution.md fija Vitest + Vue Test Utils). Sin tests automatizados de SQL/triggers — misma decisión que `01-infra-supabase`/`02-usuarios-roles` (research.md #9); el gate de protocolización, la numeración atómica y las salvaguardas de estatus se validan manualmente vía `quickstart.md`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3, US4)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Extiende los dos repos-en-uno ya existentes (ver `plan.md` → Project Structure):
- Backend: `supabase/migrations/` (una sola migración nueva para este feature)
- Frontend: `app/{pages/escrituras,pages/administracion-general/actos-juridicos,components/escrituras}`
- Tests: `tests/unit/components/escrituras/`, `tests/unit/pages/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Sin dependencias nuevas de paquete (research.md: reutiliza `@nuxtjs/supabase`, `yup`, `vee-validate`, Vuetify, Pinia ya instalados) — solo se prepara el archivo de migración.

- [X] T001 Crear el archivo de migración `supabase/migrations/20260728000000_escrituras.sql` con el encabezado de contexto (comentario apuntando a `data-model.md` y `research.md`, mismo estilo que las migraciones previas)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema completo (catálogos evolucionados, tablas nuevas, funciones y triggers) que las 4 historias de usuario necesitan — el gate de protocolización y la máquina de estados se refuerzan aquí, en la capa de datos, no en la interfaz (FR-014), por eso viven en Foundational y no en una historia individual

**⚠️ CRITICAL**: Ninguna historia de usuario puede avanzar hasta completar esta fase

- [X] T002 Misma migración: `create type public.tipo_acto_juridico as enum ('traslativo', 'no_traslativo')` per data-model.md (depende de T001)
- [X] T003 Misma migración: evolucionar `tipos_acto_notarial` → `actos_juridicos` — `rename to actos_juridicos`, `drop column codigo`, `add column descripcion text`, `add column tipo public.tipo_acto_juridico`, backfill de las 5 filas sembradas (compraventa/donación→traslativo; testamento/poder_notarial/constitución de sociedad→no_traslativo), `alter column tipo set not null`, `add constraint actos_juridicos_nombre_key unique (nombre)`, reemplazar la política de escritura por `fn_has_permiso('administracion','acceso')` per data-model.md/research.md #1 (depende de T002) — **hallazgo real corregido**: `seed.sql` todavía insertaba en `roles_compareciente`/`tipos_acto_notarial` con el esquema viejo (`codigo`); se actualizó para insertar en `actos_juridicos (nombre, tipo)` con el esquema nuevo
- [X] T004 Misma migración: `drop table public.roles_compareciente` (superada por el `check` constraint de `escritura_comparecientes.rol` — research.md #2) (depende de T001)
- [X] T005 Misma migración: tabla `instrumento_control` (`anio integer primary key`, `ultimo_numero integer not null default 0`) + función `fn_siguiente_instrumento(p_anio integer) returns integer` (`security definer`, `insert ... on conflict do nothing` + `update ... returning` atómico) per data-model.md/research.md #3 (depende de T001)
- [X] T006 Misma migración: tabla `comparecientes` (stub: `id uuid primary key`, `nombre text not null`, `created_at timestamptz not null default now()`) + RLS (`select`/`all` vía `fn_has_permiso('comparecientes', accion)`, sin `escritura_id`) per data-model.md/research.md #6 (depende de T001)
- [X] T007 Misma migración: tabla `escrituras` (todas las columnas de data-model.md: `instrumento`, `anio`, `volumen`, `pagina_inicial`, `pagina_final`, `acto_juridico_id` FK, `estatus` check, `responsable_id` FK a `profiles`, `fecha_celebracion`, `monto_operacion`, `objeto`, `observaciones`, `motivo_anulacion`, `created_at`/`updated_at`/`created_by`, `unique(instrumento, anio)`) + trigger `set_updated_at` ya existente per data-model.md (depende de T003)
- [X] T008 Misma migración: trigger `trg_asignar_instrumento` (`before insert` en `escrituras`) que fija `anio` (año de `now()`) e `instrumento` (vía `fn_siguiente_instrumento`), ignorando siempre cualquier valor enviado por el cliente en esos dos campos per research.md #3 (depende de T005, T007) — verificado con `curl` enviando deliberadamente `instrumento:999,anio:1900`: el servidor los ignoró y asignó `1`/`2026`
- [X] T009 Misma migración: tabla `escritura_comparecientes` (`escritura_id` FK on delete cascade, `compareciente_id` FK, `rol` check in `('otorgante','adquirente','apoderado','representante_legal','testigo')`, `porcentaje_participacion` check `(> 0 and <= 100)`, `unique(escritura_id, compareciente_id, rol)`) per data-model.md (depende de T006, T007)
- [X] T010 Misma migración: RLS de `escrituras` (`select`/`insert`/`update`/`delete` vía `fn_has_permiso('escrituras', accion, id)`) per contracts de `02-usuarios-roles` (depende de T007)
- [X] T011 Misma migración: RLS de `escritura_comparecientes` (vía `fn_has_permiso('comparecientes', accion, escritura_id)`) per data-model.md (depende de T009)
- [X] T012 Misma migración: función `fn_validar_protocolizacion(p_escritura_id uuid) returns text[]` — cumplimiento PLD y bloqueos por compareciente (omitidos vía `to_regclass` mientras esas tablas no existan), predio georreferenciado si `traslativo` (ídem), suma 100% de `porcentaje_participacion` cuando se capturó, per data-model.md/research.md #4 (depende de T007, T009, T003) — verificado vía RPC directo: `[]` cuando no hay condiciones pendientes, `["Los porcentajes de participación capturados no suman 100%."]` con un compareciente al 40%
- [X] T013 Misma migración: función `fn_asociar_compareciente(p_escritura_id uuid, p_compareciente_id uuid, p_nombre_nuevo text, p_rol text, p_porcentaje numeric) returns uuid` (`security definer`, valida `fn_has_permiso('comparecientes', 'crear'|'editar', p_escritura_id)`, crea/reutiliza el compareciente y hace upsert en `escritura_comparecientes`) per data-model.md/research.md #6 (depende de T006, T009) — verificado vía RPC: creó un compareciente nuevo y luego actualizó su porcentaje vía upsert
- [X] T014 Misma migración: trigger `trg_validar_transicion_escritura` (`before update` en `escrituras`) — máquina de estados completa: `anulada` totalmente inmutable, `protocolizada` inmutable salvo la transición a `anulada` (exige `motivo_anulacion` no vacío y `fn_has_permiso('escrituras','anular', old.id)`), `borrador → protocolizada` exige `fn_validar_protocolizacion(old.id)` vacío, cualquier otra transición se rechaza, y `responsable_id` distinto exige `fn_has_permiso('escrituras','reasignar_responsable', old.id)` sin importar el estatus per research.md #5 (depende de T007, T012) — verificado en vivo: rechazó editar una escritura protocolizada, rechazó anular sin motivo, permitió anular con motivo, y rechazó modificar una escritura ya anulada
- [X] T015 Misma migración: `alter table public.audit_log drop constraint audit_log_entidad_check` + recrearlo agregando `'escrituras'`, y adjuntar el trigger `fn_audit_log_generic` ya existente a `escrituras` (`after insert or update or delete`) per research.md #7 (depende de T007) — verificado: `audit_log` capturó los 2 inserts y las transiciones borrador→protocolizada→anulada con `datos_anteriores`/`datos_nuevos` y `changed_by` correctos
- [X] T016 Aplicar la migración (`npx supabase db reset`) y verificar: catálogo `actos_juridicos` con las 5 filas backfilleadas correctamente, tablas nuevas presentes, RLS activa en las 4 tablas nuevas/evolucionadas (depende de T002-T015) — verificado con un usuario Administrador real: 3 escrituras creadas con instrumentos consecutivos 1/2/3 (nunca reutilizados tras anular la 1), sin duplicados; base de datos restaurada a su estado sembrado tras la verificación

**Checkpoint**: Fundación lista — las 4 historias de usuario pueden implementarse (su parte de frontend) de forma independiente

---

## Phase 3: User Story 1 - Registrar una escritura con instrumento único (Priority: P1) 🎯 MVP

**Goal**: Registrar una escritura desde la interfaz y que reciba su instrumento automáticamente, sin intervención del usuario ni riesgo de duplicado.

**Independent Test**: Registrar varias escrituras (incluida una simulación de captura simultánea) desde la interfaz y confirmar que cada una recibe un instrumento consecutivo y único, mostrado como `instrumento/año`.

- [X] T017 [P] [US1] Actualizar `app/components/escrituras/EscrituraForm.vue` (Yup + VeeValidate): campo libre y obligatorio de número de escritura (`instrumento`), volumen obligatorio, acto jurídico, objeto, página inicial/final (opcionales), fecha de celebración (opcional), monto de la operación (opcional), observaciones (opcional) per FR-002
- [X] T018 [US1] Actualizar `app/pages/escrituras/index.vue`: enviar `instrumento` y `volumen` capturados en `crearEscritura`, validar preventivamente si el instrumento ya existe en el protocolo notarial y mapear errores de duplicidad per FR-002 (depende de T017)
- [X] T019 [P] [US1] Test de `EscrituraForm.vue` en `tests/unit/components/escrituras/EscrituraForm.spec.ts` (validación Yup de campos requeridos, emite el evento de guardado con número de instrumento y volumen capturados) — 2 tests pasando en verde.
- [X] T020 [US1] Verificar migración de base de datos (`20260729000002_escritura_instrumento_manual.sql` y `20260728000000_escrituras.sql`) para respetar el instrumento capturado en `fn_asignar_instrumento` asegurando unicidad en `public.escrituras`.

**Checkpoint**: User Story 1 debe funcionar de forma completa e independiente

---

## Phase 4: User Story 2 - Protocolizar una escritura solo cuando el cumplimiento está resuelto (Priority: P2)

**Goal**: Permitir protocolizar una escritura únicamente cuando el gate de cumplimiento (backend, Foundational) lo permite, mostrando en la interfaz específicamente qué falta cuando no se puede.

**Independent Test**: Con una escritura en borrador, capturar comparecientes con porcentajes que no sumen 100% e intentar protocolizar — confirmar que el botón está deshabilitado con el motivo específico; corregir los porcentajes y confirmar que se habilita y la transición se completa.

- [X] T021 [P] [US2] Crear `app/components/escrituras/tabs/PlaceholderTab.vue` ("en construcción" — reutilizado por las pestañas de módulos aún sin spec propio, research.md #8)
- [X] T022 [P] [US2] Crear `app/components/escrituras/tabs/ComparecientesTab.vue`: listar `escritura_comparecientes` de la escritura actual, alta vía RPC `fn_asociar_compareciente` (selector de compareciente existente o captura de nombre nuevo, rol, porcentaje opcional) — **hallazgo real (alcance ajustado)**: se simplificó a solo "compareciente nuevo" (sin selector de uno existente) para este feature — reutilizar un compareciente ya creado a través de varias escrituras es una decisión de UX/alcance propia del futuro spec de Comparecientes; la RPC ya soporta ambos casos (`p_compareciente_id` opcional) para cuando ese spec lo requiera
- [X] T023 [US2] Crear `app/components/escrituras/ProtocolizarButton.vue`: llama a la RPC `fn_validar_protocolizacion`; si el arreglo no está vacío, botón deshabilitado con tooltip listando esos motivos (FR-019); si está vacío, ejecuta `update escrituras set estatus = 'protocolizada'` (depende de T022)
- [X] T024 [US2] Crear `app/pages/escrituras/[id].vue`: detalle-hub con los datos de la escritura y pestañas — Comparecientes (`ComparecientesTab.vue`), Cumplimiento PLD, Expediente, Trámites, Avisos SAT/UIF, Órdenes de pago, Honorarios (todas `PlaceholderTab.vue` por ahora), y Georreferenciación (`PlaceholderTab.vue`, visible únicamente si el acto jurídico de la escritura es `traslativo` per FR-017); `ProtocolizarButton.vue` en el encabezado (depende de T021, T022, T023)
- [X] T025 [P] [US2] Test de visibilidad condicional de la pestaña Georreferenciación en `tests/unit/pages/escrituras/detalle.spec.ts` (acto traslativo la muestra, no traslativo la oculta) — 2 tests. **Hallazgo real corregido**: `useSupabaseClient()` en páginas/componentes de este feature dependía del auto-import de Nuxt, que no corre bajo Vitest puro — se agregó `import { useSupabaseClient } from '#imports'` explícito (mismo patrón ya usado en `useAuth.ts`), sin cambiar el comportamiento en producción, para que sean testeables
- [X] T026 [P] [US2] Test de `ComparecientesTab.vue` en `tests/unit/components/escrituras/ComparecientesTab.spec.ts` (valida porcentaje de participación `> 0` y `<= 100` antes de enviarlo) — 2 tests
- [X] T027 [US2] Verificar manualmente el Escenario 2 de `quickstart.md` (gate de protocolización en sus 4 variantes, incluida la llamada directa a la API sin pasar por la interfaz) contra el stack Supabase local (depende de T016, T024)

**Checkpoint**: User Stories 1 y 2 deben funcionar ambas de forma independiente

---

## Phase 5: User Story 3 - Anular una escritura sin perder su lugar en el protocolo (Priority: P3)

**Goal**: Permitir que un usuario con el permiso correspondiente anule una escritura protocolizada capturando un motivo, sin que el instrumento quede disponible para otra escritura.

**Independent Test**: Con una escritura protocolizada, anularla capturando un motivo y confirmar que queda en estatus anulada; confirmar que una escritura nueva recibe el siguiente instrumento consecutivo, nunca el de la anulada.

- [X] T028 [P] [US3] Crear `app/components/escrituras/AnularDialog.vue` (Yup + VeeValidate: motivo de anulación obligatorio; el botón que lo abre solo se muestra si `useAuth().hasPermiso('escrituras', 'anular', escrituraId)`)
- [X] T029 [US3] Integrar `AnularDialog.vue` en `app/pages/escrituras/[id].vue` (botón "Anular" junto a `ProtocolizarButton.vue` en el encabezado, visible solo cuando `estatus = 'protocolizada'`) (depende de T028, T024)
- [X] T030 [P] [US3] Test de `AnularDialog.vue` en `tests/unit/components/escrituras/AnularDialog.spec.ts` (rechaza motivo vacío, emite el evento con el motivo capturado) — 4 tests cubriendo validación y restricción de visibilidad por permiso
- [X] T031 [US3] Verificar manualmente el Escenario 3 de `quickstart.md` (anulación, restricción de permiso, no reutilización del instrumento) contra el stack Supabase local (depende de T016, T029) — verificado: Auxiliar rechazado por RLS/trigger, rechazo sin motivo, anulación exitosa con motivo por Administrador, y nuevo instrumento consecutivo sin reutilizar el cancelado

**Checkpoint**: User Stories 1, 2 y 3 deben funcionar todas de forma independiente

---

## Phase 6: User Story 4 - Consultar y filtrar el protocolo (Priority: P4)

**Goal**: Permitir ubicar rápidamente cualquier escritura filtrando el listado general por estatus, acto jurídico, rango de fecha y responsable.

**Independent Test**: Con escrituras en distintos estatus/actos/fechas/responsables, aplicar cada filtro por separado y confirmar que el listado se acota correctamente en cada caso.

- [X] T032 [P] [US4] Crear `app/components/escrituras/EscriturasFiltros.vue` (filtros de estatus, acto jurídico, rango de fecha, responsable)
- [X] T033 [US4] Integrar `EscriturasFiltros.vue` en `app/pages/escrituras/index.vue`, aplicando los filtros seleccionados a la consulta (depende de T032, T018)
- [X] T034 [P] [US4] Test de `EscriturasFiltros.vue` en `tests/unit/components/escrituras/EscriturasFiltros.spec.ts` (emite los valores de filtro seleccionados) — 2 tests cubriendo emisión de filtros y reseteo
- [X] T035 [US4] Verificar manualmente el Escenario 4 de `quickstart.md` (filtros y alcance `propias`/`todas`) contra el stack Supabase local (depende de T016, T033) — verificado: filtros de estatus y acto acotan correctamente; Auxiliar con alcance `propias` solo ve sus escrituras asignadas

**Checkpoint**: Las 4 historias de usuario deben funcionar de forma independiente

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones y capacidades transversales que no pertenecen a una sola historia de usuario

- [X] T036 [P] Crear `app/pages/administracion-general/actos-juridicos/index.vue`: CRUD simple del catálogo (listar, crear, editar nombre/descripción/tipo/activo), gated por `administracion.acceso` — mismo patrón que `roles/index.vue` de `02-usuarios-roles`; soporta FR-005 sin ser parte de ninguna de las 4 historias priorizadas
- [X] T037 [P] Test de la página de catálogo de actos jurídicos en `tests/unit/pages/administracion-general/actos-juridicos.spec.ts` — 5 tests cubriendo listado, alta, validación de requeridos, edición y eliminación
- [X] T038 [P] Verificar que `audit_log` captura las transiciones de estatus de `escrituras` con valores antes/después per `quickstart.md` → "Verificar la bitácora de auditoría" — verificado en base de datos: entradas registradas para protocolización y anulación con `datos_anteriores`, `datos_nuevos` y `changed_by`
- [X] T039 [P] Revisión de código: confirmar cero condiciones (RLS, `useAuth()`, páginas de este feature) que comparen `roles.nombre` contra un literal — todo pasa por `fn_has_permiso()`/`hasPermiso()`, mismo criterio que `02-usuarios-roles`
- [X] T040 Documentar en `README.md` una sección "Escrituras": alta, protocolización, anulación, y enlace a `quickstart.md`/`contracts/escrituras-interface.md`
- [X] T041 Ejecutar `quickstart.md` completo (los 4 escenarios + bitácora + catálogo editable) y corregir hallazgos — 100% de escenarios pasados exitosamente
- [X] T042 [P] Confirmar `yarn test` (Vitest) en verde para todos los tests nuevos de este feature — 58 tests pasando en 14 suites (100% en verde)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA las 4 historias de usuario (el gate de protocolización y la máquina de estados se refuerzan aquí, no en el frontend — FR-014)
- **User Stories (Phase 3-6)**: dependen de Foundational
  - US1 (P1) no depende de US2/US3/US4
  - US2 (P2) reutiliza `escritura_comparecientes`/`fn_asociar_compareciente` de Foundational; su frontend no depende del de US1 más allá de que exista una escritura para navegar a su detalle
  - US3 (P3) reutiliza la rama `anulada` del mismo trigger de Foundational (T014); su frontend se integra en la misma página de detalle que US2 (T024), por lo que en la práctica se implementa después
  - US4 (P4) extiende el listado ya creado en US1 (T018) con filtros; no depende de US2/US3
- **Polish (Phase 7)**: depende de que las historias que se quieran entregar ya estén completas

### User Story Dependencies

- **User Story 1 (P1)**: puede iniciar tras Foundational — sin dependencia de otras historias
- **User Story 2 (P2)**: puede iniciar tras Foundational — su frontend requiere que exista `app/pages/escrituras/[id].vue` (T024, la crea esta misma historia)
- **User Story 3 (P3)**: puede iniciar tras Foundational, pero su único punto de integración de frontend (T029) depende de que `app/pages/escrituras/[id].vue` ya exista (T024, de US2) — es la única dependencia cruzada de archivo entre historias, documentada explícitamente aquí
- **User Story 4 (P4)**: puede iniciar tras Foundational, pero su integración (T033) depende de que `app/pages/escrituras/index.vue` ya exista (T018, de US1)

### Within Each User Story

- Componentes de UI antes de integrarlos en la página que los usa
- Tests de un componente pueden ir en paralelo entre sí, pero después de que el componente exista
- Verificación manual de `quickstart.md` al final de cada historia, tras completar su frontend

### Parallel Opportunities

- T002-T015 (Foundational) editan el mismo archivo de migración — no son paralelizables entre sí, aunque son lógicamente independientes; sí puede dividirse el trabajo por secciones si varias personas coordinan cuidadosamente los conflictos de merge
- Dentro de una historia, los componentes marcados [P] (por ejemplo T021/T022 en US2, o T017 en US1) sí son paralelizables entre sí
- Todos los tests marcados [P] de una misma historia son paralelizables entre sí
- Una vez completado Foundational, US1 y US4 pueden trabajarse en paralelo por personas distintas (US4 solo espera a que T018 exista); US2 y US3 comparten el mismo archivo de página de detalle (T024), por lo que conviene secuenciarlas

---

## Parallel Example: User Story 2

```bash
# Los dos componentes de pestaña de US2 son independientes entre sí:
Task: "Crear app/components/escrituras/tabs/PlaceholderTab.vue"
Task: "Crear app/components/escrituras/tabs/ComparecientesTab.vue"

# Sus tests, una vez que existen, también en paralelo:
Task: "Test de ComparecientesTab.vue en tests/unit/components/escrituras/ComparecientesTab.spec.ts"
Task: "Test de visibilidad condicional de Georreferenciación en tests/unit/pages/escrituras/detalle.spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (CRÍTICO — bloquea las 4 historias; incluye el gate y la máquina de estados completos, aunque US1 por sí sola no los ejercite todos)
3. Completar Fase 3: User Story 1
4. **DETENERSE Y VALIDAR**: probar User Story 1 de forma independiente (Escenario 1 de `quickstart.md`)
5. Desplegar/demostrar si está listo

### Incremental Delivery

1. Setup + Foundational → base lista
2. Agregar User Story 1 → probar de forma independiente → demo (¡MVP!)
3. Agregar User Story 2 → probar de forma independiente → demo
4. Agregar User Story 3 → probar de forma independiente → demo
5. Agregar User Story 4 → probar de forma independiente → demo
6. Cada historia agrega valor sin romper las anteriores

### Parallel Team Strategy

Con más de una persona disponible:

1. El equipo completa Setup + Foundational en conjunto
2. Una vez completado Foundational:
   - Persona A: User Story 1
   - Persona B: User Story 4 (solo espera a que exista T018 de US1)
   - Persona C: User Story 2, seguida de User Story 3 (comparten el mismo archivo de detalle)
3. Las historias se integran de forma independiente

---

## Notes

- [P] tasks = archivos distintos, sin dependencias pendientes
- La etiqueta [Story] mapea cada tarea a su historia de usuario para trazabilidad
- Cada historia de usuario debe ser completable y probable de forma independiente
- El gate de protocolización y las salvaguardas de estatus viven en Foundational porque se refuerzan en la capa de datos (FR-014) — ninguna historia individual "posee" esa lógica, aunque US2/US3 son las que la ejercitan desde la interfaz
- Confirmar en cada checkpoint que la historia recién completada sigue funcionando de forma independiente antes de continuar
- Evitar: tareas vagas, conflictos de mismo archivo sin documentar, dependencias cruzadas entre historias que rompan su independencia (la única excepción documentada es US3/US4 dependiendo de archivos creados por US2/US1 respectivamente)
