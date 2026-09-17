# Implementation Plan: Layout principal (shell de la aplicación)

**Branch**: `00-layout-shell` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/00-layout-shell/spec.md`

## Summary

Construir el layout compartido de Nuxt (`layouts/default.vue`) que envuelve
todas las rutas de negocio: navbar superior, drawer lateral agrupado por
categorías (Operación, Cumplimiento, Finanzas, Ubicación, Sistema), área de
contenido con breadcrumb opcional, y alternancia de tema `notariaLight` /
`notariaDark`. El enfoque técnico es: Vuetify como capa de componentes
(`v-app-bar`, `v-navigation-drawer`, `v-main`), un store de Pinia para las
preferencias de shell (tema + estado del drawer) persistido en
`localStorage`, y un composable de configuración de navegación estático que
lee la lista de módulos de `constitution.md` §4. No hay backend involucrado:
todo el estado de este módulo es de cliente.

## Technical Context

**Language/Version**: TypeScript + Vue 3.5 (Composition API, `<script setup>`) sobre Nuxt 4.5

**Primary Dependencies**: Vuetify 3 (+ `vuetify-nuxt-module` o plugin manual), Pinia (+ `@pinia/nuxt`) — ninguno instalado aún en `package.json`, se agregan como parte de este feature (ver `quickstart.md`)

**Storage**: N/A (sin base de datos); preferencias de usuario en `localStorage` del navegador únicamente

**Testing**: Vitest + Vue Test Utils (per `constitution.md` — no instalados aún, se agregan en este feature)

**Target Platform**: Navegador web (desktop y mobile/tablet vía responsive), sin soporte offline

**Project Type**: Aplicación web Nuxt de un solo proyecto (frontend); no aplica estructura backend/frontend separada — Supabase se consume como servicio externo, no como "backend" propio del monorepo

**Performance Goals**: El shell (navbar + drawer + estructura de `v-main`) debe quedar interactivo sin esperar datos de negocio (logo/nombre de notaría se resuelven async); cambio de tema visible en <1s (SC-002)

**Constraints**: Cero colores hardcodeados fuera de los tokens Vuetify de `design-system.md` §7; contraste AA en ambos temas; drawer y menú de usuario 100% operables por teclado

**Scale/Scope**: ~12 módulos de negocio agrupados en 5 categorías de menú (ver spec FR-008), con expectativa de crecimiento futuro sin rediseño estructural

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra `.specify/memory/constitution.md` v1.2.1:

| Regla de la constitución | Aplica a este feature | Estado |
|---|---|---|
| Frontend: Vue 3 + Nuxt 3 + Vuetify | Sí — el shell es 100% Vuetify | ⚠️ Ver nota de versión abajo |
| Validación de formularios: Yup + VeeValidate | No — este módulo no tiene formularios (solo navbar/drawer) | N/A, no bloquea |
| Testing: Vitest + Vue Test Utils | Sí — se agregan tests de store/composables | ✅ Pass |
| Manejo de estado: Pinia | Sí — preferencias de tema/drawer viven en un store Pinia | ✅ Pass |
| Sin i18n / solo es-MX | Sí — todo el copy del shell va en español | ✅ Pass |
| Bronce reservado al "sello", nunca decorativo | Sí — el ítem activo del drawer usa `primary`, nunca `secondary`/bronce (spec FR-010) | ✅ Pass |
| Docker (dev local / producción) | No aplica al diseño del shell en sí | N/A |

**Nota de versión (no bloqueante, para research.md)**: la constitución dice
"Nuxt 3", pero el proyecto ya escafoldado usa `nuxt@^4.5.1`
(`package.json`). No es una violación de intención (mismo framework, misma
Composition API), pero sí una imprecisión de texto en la constitución. Se
documenta como hallazgo en `research.md` y se recomienda una enmienda PATCH
vía `/speckit-constitution` por separado — no se modifica la constitución
como parte de este plan.

**Resultado**: ningún gate bloquea el diseño. No se requiere entrada en
Complexity Tracking.

**Re-check post-Fase 1**: `data-model.md` y el contrato de
`useAppShell()` no introducen persistencia server-side, formularios, ni
colores fuera del tema — los gates de arriba se mantienen en ✅ Pass sin
cambios.

## Project Structure

### Documentation (this feature)

```text
specs/00-layout-shell/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/
│   └── layout-shell-interface.md   # Fase 1
└── tasks.md              # Fase 2 (/speckit-tasks, aún no generado)
```

### Source Code (repository root)

Proyecto Nuxt 4 de un solo módulo (sin split backend/frontend — `app/` ya es
el `srcDir` por convención de Nuxt 4).

```text
app/
├── app.vue                          # Root; se ajusta para usar <NuxtLayout>
├── layouts/
│   └── default.vue                  # El shell: AppNavbar + AppDrawer + v-main
├── components/
│   └── layout/
│       ├── AppNavbar.vue            # v-app-bar: logo, título, toggle tema, notif, avatar
│       ├── AppDrawer.vue            # v-navigation-drawer con grupos (v-list-group)
│       ├── ThemeToggle.vue          # Ícono sol/luna
│       ├── UserMenu.vue             # Avatar + menú (nombre, rol, cerrar sesión)
│       └── AppBreadcrumbs.vue       # Breadcrumb condicional bajo el navbar
├── composables/
│   ├── useNavItems.ts               # Config estática de grupos/módulos (constitution.md §4)
│   └── useAppShell.ts               # Contrato expuesto a otros módulos (ver contracts/)
├── stores/
│   └── layoutPreferences.store.ts   # Pinia: theme, drawerState — persistido en localStorage
└── plugins/
    └── vuetify.ts                   # Registro de Vuetify + temas notariaLight/notariaDark

tests/
└── unit/
    ├── stores/
    │   └── layoutPreferences.store.spec.ts
    ├── composables/
    │   └── useNavItems.spec.ts
    └── components/
        └── layout/
            ├── AppNavbar.spec.ts
            └── AppDrawer.spec.ts
```

**Structure Decision**: Un solo proyecto Nuxt (no hay separación
backend/frontend porque Supabase se consume como servicio externo, no como
código propio del repo). Todo el código del shell vive bajo
`app/{layouts,components/layout,composables,stores,plugins}`, siguiendo el
`srcDir` por defecto de Nuxt 4. Los tests van en `tests/unit/` en la raíz del
repo (fuera de `app/`), reflejando la misma subestructura por tipo
(`stores/`, `composables/`, `components/layout/`), para no mezclar código de
producción con specs de prueba dentro de `app/`.

## Complexity Tracking

*Sin violaciones que justificar — tabla omitida intencionalmente.*
