# Implementation Plan: Escrituras (entidad raíz)

**Branch**: `03-escrituras` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/03-escrituras/spec.md`

## Summary

La Escritura Pública, identificada por su instrumento (numeración
atómica, server-side, nunca reutilizada), como entidad raíz del sistema:
máquina de estados `borrador → protocolizada → anulada` con un gate de
protocolización reforzado en Postgres (cumplimiento PLD, bloqueos y
georreferenciación cuando aplican — auto-satisfechos mientras esos
módulos no tengan spec propio; suma 100% de participación cuando se
captura), inmutabilidad total una vez protocolizada, y un detalle en
pestañas que sirve de hub para todos los módulos de negocio futuros.
Evoluciona dos catálogos ya sembrados por `01-infra-supabase`
(`tipos_acto_notarial` → `actos_juridicos`, editable; `roles_compareciente`
se da de baja a favor de un enum fijo) y crea una tabla `comparecientes`
mínima (Clarification, sesión 2026-07-28) para que la asociación
escritura-compareciente tenga una FK real desde el inicio, sin esperar al
spec de Comparecientes.

## Technical Context

**Language/Version**: TypeScript + Vue 3.5 (Composition API) sobre Nuxt 4.5 (frontend); SQL + plpgsql (migraciones, triggers y funciones de dominio) sobre Postgres 17 (backend) — mismo stack que `00-layout-shell`, `01-infra-supabase` y `02-usuarios-roles`.

**Primary Dependencies**: `@nuxtjs/supabase` + `yup`/`vee-validate` (ya fijados y en uso desde `02-usuarios-roles`), reutiliza Vuetify/Pinia ya presentes; no se agrega ninguna dependencia nueva de frontend. Backend: solo SQL/plpgsql nativo de Postgres, sin extensiones nuevas.

**Storage**: PostgreSQL (Supabase, mismo stack local). Tablas nuevas: `escrituras`, `escritura_comparecientes`, `comparecientes` (stub), `instrumento_control`. Evoluciona `tipos_acto_notarial` → `actos_juridicos` (rename + columnas nuevas). Da de baja `roles_compareciente` (superada). Extiende `audit_log` con la entidad `'escrituras'`. Ver `research.md` y `data-model.md`.

**Testing**: Vitest + Vue Test Utils para formularios/componentes de frontend (alta de escritura, pestañas condicionales, filtros del listado) — mismo enfoque que `00-layout-shell`/`02-usuarios-roles`. Sin framework de pruebas SQL dedicado — misma decisión que `01-infra-supabase`/`02-usuarios-roles`; el gate de protocolización, la numeración atómica bajo concurrencia y las reglas de inmutabilidad se validan manualmente vía `quickstart.md` contra el stack Supabase local (research.md #9).

**Target Platform**: Navegador web (frontend) + backend local Supabase vía Docker (mismo entorno de features previas).

**Project Type**: Aplicación web Nuxt de un solo proyecto — extiende `app/` y `supabase/migrations/` del mismo repo; no hay split backend/frontend como proyectos separados.

**Performance Goals**: Sin metas de throughput adicionales a las ya fijadas por `02-usuarios-roles` (RLS evaluada por fila); la asignación de instrumento usa un `UPDATE ... RETURNING` sobre una fila indexada por año (`instrumento_control`), sin necesidad de caché ni mecanismos adicionales para el volumen esperado (una notaría, cientos/miles de escrituras).

**Constraints**: El instrumento y su año nunca se calculan ni se aceptan del cliente — siempre asignados por un trigger server-side (FR-002); un instrumento nunca se reutiliza, ni siquiera al anular (FR-003, sin excepciones); una escritura protocolizada es inmutable salvo la transición a anulada; el gate de protocolización y las restricciones de anulación se refuerzan en la capa de datos, nunca solo en la interfaz (FR-014); ninguna condición de autorización compara contra un nombre de rol — todo pasa por `fn_has_permiso()` ya existente (regla dura heredada de `02-usuarios-roles`).

**Scale/Scope**: 1 entidad raíz nueva (`escrituras`) + 1 tabla puente (`escritura_comparecientes`) + 1 tabla stub (`comparecientes`) + 1 tabla de control (`instrumento_control`), evolución de 1 catálogo existente (`actos_juridicos`), baja de 1 tabla huérfana (`roles_compareciente`), 3 funciones de dominio nuevas (`fn_siguiente_instrumento`, `fn_validar_protocolizacion`, `fn_asociar_compareciente`), 2 triggers nuevos sobre `escrituras` + 1 adjuntado a la auditoría genérica ya existente. Reemplaza el placeholder `/escrituras` del drawer con páginas reales; el resto del drawer no se toca (fuera de alcance, ver Assumptions de `spec.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.2.1:

| Regla de la constitución | Aplica a este feature | Estado |
|---|---|---|
| Frontend: Vue 3 + Nuxt 3 + Vuetify | Sí — listado, alta, detalle en pestañas | ✅ Pass |
| Validación de formularios: Yup + VeeValidate | Sí — alta/edición de escritura, alta de compareciente en pestaña | ✅ Pass |
| Testing: Vitest + Vue Test Utils | Sí — componentes/formularios de frontend | ✅ Pass |
| Manejo de estado: Pinia | No requiere store nuevo — el estado de una escritura vive en la página/composable de la sesión de edición, sin necesidad de estado global compartido | N/A |
| Backend/datos: Supabase (Postgres + Auth + Storage + Edge Functions), Docker local | Sí — nuevas tablas/funciones/triggers sobre el stack ya existente | ✅ Pass |
| Autenticación/roles: Supabase Auth + RLS por rol | Sí — reutiliza `fn_has_permiso()` y el catálogo `escrituras`/`comparecientes` ya sembrado en `02-usuarios-roles`, sin crear ningún permiso nuevo | ✅ Pass |
| Modelo de entidades: Escritura Pública como raíz (§1, §3) | Sí — es exactamente el propósito de este feature | ✅ Pass |
| Auditoría de Escrituras (§7) | Sí — toda transición de estatus queda trazada vía `audit_log` | ✅ Pass |
| Consecutivos/folios por definir por módulo (§7) | Sí — este feature fija la numeración de instrumento (research.md #3) | ✅ Pass (resuelve un pendiente explícito de la constitución) |
| Sin i18n / solo es-MX | Sí, todo el copy nuevo en español | ✅ Pass |
| Bronce reservado al "sello" | Aplica como restricción — ninguna pantalla nueva debe usar el color bronce de forma decorativa | ✅ Pass (a verificar en implementación) |
| Orden de módulos sugerido en §8 (Comparecientes antes que Escrituras) | Este feature invierte ese orden | ⚠️ Desviación documentada — ver Complexity Tracking |
| Docker (dev local / producción) | No aplica directamente — ya cubierto por `01-infra-supabase` | N/A |
| CI/CD: no se implementa por ahora | Sí — este feature no agrega pipelines | ✅ Pass |

**Resultado**: un solo gate requiere justificación explícita (orden de
construcción de módulos) — ver Complexity Tracking. Ningún otro gate
bloquea el diseño.

**Re-check post-Fase 1**: `data-model.md` (evolución de
`actos_juridicos`, baja de `roles_compareciente`, tablas
`escrituras`/`escritura_comparecientes`/`comparecientes`/
`instrumento_control`, funciones `fn_siguiente_instrumento`/
`fn_validar_protocolizacion`/`fn_asociar_compareciente`) y `contracts/`
(contrato hacia módulos futuros, nombres de tabla reservados para el
gate) no introducen dependencias nuevas de stack ni violan ninguna otra
regla — los gates de arriba se mantienen sin cambios, salvo la
desviación ya documentada.

## Project Structure

### Documentation (this feature)

```text
specs/03-escrituras/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── escrituras-interface.md   # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, aún no generado)
```

### Source Code (repository root)

Extiende los mismos dos repos-en-uno ya existentes (`app/`,
`supabase/`); no se crea ninguna carpeta de proyecto nueva.

```text
supabase/
└── migrations/
    └── 20260728000000_escrituras.sql
        # tipo_acto_juridico (enum), instrumento_control, comparecientes (stub),
        # escrituras, escritura_comparecientes
        # rename tipos_acto_notarial -> actos_juridicos (+ columnas nuevas)
        # drop roles_compareciente (superada, research.md #2)
        # fn_siguiente_instrumento, fn_validar_protocolizacion,
        # fn_asociar_compareciente
        # triggers: asignar instrumento, validar transición de estatus,
        # audit_log_escrituras (adjunta fn_audit_log_generic ya existente)
        # alter audit_log_entidad_check (+ 'escrituras')

app/
├── pages/
│   └── escrituras/
│       ├── index.vue                  # listado + filtros (US4) + alta (dialog, US1)
│       └── [id].vue                   # detalle-hub con pestañas (US2/US3)
├── components/
│   └── escrituras/
│       ├── EscrituraForm.vue          # alta/edición (Yup + VeeValidate) — sin campo instrumento
│       ├── EscriturasFiltros.vue      # filtros de estatus/acto/fecha/responsable
│       ├── ProtocolizarButton.vue     # llama a fn_validar_protocolizacion para el tooltip
│       ├── AnularDialog.vue           # captura de motivo obligatorio
│       └── tabs/
│           ├── ComparecientesTab.vue  # alta/edición de escritura_comparecientes (rol + %)
│           └── PlaceholderTab.vue     # "en construcción" — reutilizado por el resto de pestañas
└── middleware/
    # sin middleware nuevo — reutiliza auth.global.ts ya existente de 02-usuarios-roles

# Modificaciones a features previos (no archivos nuevos):
# app/pages/administracion-general/... → nueva sección de catálogo actos_juridicos (CRUD)
#   (mismo patrón ya usado para roles/permisos en 02-usuarios-roles)
```

**Structure Decision**: Un solo proyecto Nuxt + Supabase (sin split). El
backend de este feature vive en una sola migración nueva dentro de
`supabase/migrations/`; el frontend extiende `app/` con las páginas/
componentes de este feature bajo `escrituras/`, y agrega una sección de
catálogo (`actos_juridicos`) a Administración General (ya existente
desde `02-usuarios-roles`). El placeholder de `/escrituras` en el drawer
(`useNavItems.ts`, de `00-layout-shell`) no requiere modificación — ya
apunta a `/escrituras`, que esta feature reemplaza con contenido real;
el resto de las entradas de drawer (Comparecientes, Expedientes, etc.)
permanecen intactas (research.md #8, fuera de alcance).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Orden de construcción invertido: `constitution.md` §8 sugiere Comparecientes antes que Escrituras; este feature construye Escrituras primero y crea un stub de `comparecientes` | El usuario, dueño del producto, priorizó especificar y construir Escrituras ahora — es la entidad raíz de la que depende literalmente todo lo demás, y un stub mínimo (`id`+`nombre`) desbloquea el modelo de datos real sin esperar al spec completo de Comparecientes (Clarification, sesión 2026-07-28) | Esperar al spec de Comparecientes antes de tocar Escrituras habría bloqueado este feature por completo sin necesidad — el stub es aditivo (`alter table`, nunca `drop`/recreate) y no le quita ningún grado de libertad al futuro spec de Comparecientes para diseñar su propio modelo de alcance/PLD |
