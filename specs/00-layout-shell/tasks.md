---

description: "Task list template for feature implementation"
---

# Tasks: Layout principal (shell de la aplicación)

**Input**: Design documents from `/specs/00-layout-shell/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluidos — `plan.md` ya define una carpeta `tests/unit/` como parte de la estructura del feature (alineado con `constitution.md`, que fija Vitest + Vue Test Utils como herramienta de testing del proyecto).

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Rutas de archivo exactas en cada descripción

## Path Conventions

Proyecto Nuxt 4 de un solo módulo (ver `plan.md` → Project Structure):
- Código de producción: `app/{layouts,components/layout,composables,stores,plugins}`
- Tests: `tests/unit/{stores,composables,components/layout}`
- Config: `nuxt.config.ts`, `vitest.config.ts` en la raíz del repo

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar dependencias y herramientas que este feature necesita y que hoy no existen en `package.json`

- [X] T001 Instalar dependencias de runtime: `vuetify`, `vuetify-nuxt-module`, `pinia`, `@pinia/nuxt`, `@mdi/font` en `package.json`
- [X] T002 [P] Instalar dependencias de testing: `vitest`, `@vue/test-utils`, `happy-dom` en `package.json` (devDependencies)
- [X] T003 [P] Configurar `vitest.config.ts` en la raíz (entorno `happy-dom`, alias de Nuxt/`app/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura base que TODAS las historias de usuario necesitan

**⚠️ CRITICAL**: Ninguna historia de usuario puede avanzar hasta completar esta fase

- [X] T004 Registrar módulos `vuetify-nuxt-module` y `@pinia/nuxt` en `nuxt.config.ts`, incluyendo el link de Google Fonts de `design-system.md` §3
- [X] T005 Definir los temas `notariaLight`/`notariaDark` (colores de `design-system.md` §7) en la opción `vuetify.theme` de `nuxt.config.ts`
- [X] T006 [P] Crear store Pinia `layoutPreferences` con estado inicial `{ theme, drawerMode }` (sin lógica de persistencia todavía) en `app/stores/layoutPreferences.store.ts`
- [X] T007 [P] Crear esqueleto del composable `useAppShell()` (`setBreadcrumb`, `branding` stub, `activeTheme`) per `contracts/layout-shell-interface.md` en `app/composables/useAppShell.ts`
- [X] T008 Crear `app/layouts/default.vue` esqueleto (estructura `v-app` > `v-app-bar` / `v-navigation-drawer` / `v-main` con `<slot />`, sin lógica de negocio aún)
- [X] T009 Ajustar `app/app.vue` para envolver la app en `<NuxtLayout><NuxtPage /></NuxtLayout>`

**Checkpoint**: Fundación lista — las historias de usuario pueden comenzar

---

## Phase 3: User Story 1 - Navegar entre módulos con un shell consistente (Priority: P1) 🎯 MVP

**Goal**: Un mismo navbar + drawer agrupado + área de contenido se renderiza en cualquier ruta, con el grupo/ítem activo resaltado y placeholder de branding mientras Administración General no exista.

**Independent Test**: Visitar 2+ rutas distintas y verificar que ambas cargan dentro del mismo navbar/drawer, sin duplicar layout, con el grupo correcto expandido y el ítem activo resaltado.

### Tests for User Story 1

- [X] T010 [P] [US1] Test de `useNavItems()` (grupos/ítems esperados según `constitution.md` §4) en `tests/unit/composables/useNavItems.spec.ts`
- [X] T011 [P] [US1] Test de `AppDrawer` (grupo de la ruta activa expandido por defecto, ítem activo resaltado en `primary`) en `tests/unit/components/layout/AppDrawer.spec.ts`
- [X] T012 [P] [US1] Test de `AppNavbar` (muestra placeholder de logo/nombre cuando `branding` es `null`) en `tests/unit/components/layout/AppNavbar.spec.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Crear composable `useNavItems()` con los 5 grupos (Operación, Cumplimiento, Finanzas, Ubicación, Sistema) y sus módulos, per `data-model.md` → NavItem/NavGroup, en `app/composables/useNavItems.ts`
- [X] T014 [US1] Implementar `AppDrawer.vue`: `v-navigation-drawer` + `v-list-group` por cada `NavGroup` de `useNavItems()`, expandir el grupo de la ruta activa, resaltar el ítem activo con `primary` (nunca `secondary`/bronce) (depende de T013)
- [X] T015 [US1] Implementar `AppNavbar.vue`: `v-app-bar` con botón de menú (hamburguesa), logo/nombre desde `useAppShell().branding` con placeholder si es `null`, título truncado con ellipsis en pantallas angostas (depende de T007)
- [X] T016 [US1] Implementar `UserMenu.vue`: avatar circular 36px (foto o iniciales) que abre menú con nombre, rol y "Cerrar sesión" (acción stub — el módulo de Autenticación no existe aún), e integrarlo en `AppNavbar.vue` en `app/components/layout/UserMenu.vue` (depende de T015)
- [X] T017 [US1] Reservar el slot visual del ícono de notificaciones (campana + badge, sin lógica) dentro de `AppNavbar.vue` (depende de T015)
- [X] T018 [US1] Implementar `AppBreadcrumbs.vue`, leyendo la jerarquía de `useAppShell().setBreadcrumb()`, visible solo cuando la ruta activa tiene más de un nivel, en `app/components/layout/AppBreadcrumbs.vue` (depende de T007)
- [X] T019 [US1] Completar `app/layouts/default.vue` integrando `AppNavbar` + `AppDrawer` + `AppBreadcrumbs` + `v-main` con padding 24px desktop / 16px mobile (depende de T014, T015, T018)
- [X] T020 [US1] Implementar el valor stub de `useAppShell().branding` (placeholder de logo/nombre hasta que exista Administración General) en `app/composables/useAppShell.ts` (depende de T007)

**Checkpoint**: User Story 1 funcional y probable de forma independiente (MVP del shell)

---

## Phase 4: User Story 2 - Cambiar entre tema claro y oscuro (Priority: P2)

**Goal**: El usuario alterna tema desde el navbar; la preferencia se detecta inicialmente por `prefers-color-scheme` y se recuerda entre sesiones.

**Independent Test**: Abrir la app, alternar el ícono sol/luna, verificar que toda la UI cambia sin recargar, y que al recargar el navegador se conserva la última elección.

### Tests for User Story 2

- [X] T021 [P] [US2] Test del store `layoutPreferences`: detección inicial vía `prefers-color-scheme` y acción `toggleTheme()` en `tests/unit/stores/layoutPreferences.store.spec.ts`
- [X] T022 [P] [US2] Test de `ThemeToggle` (dispara la acción correcta del store y refleja el tema activo) en `tests/unit/components/layout/ThemeToggle.spec.ts`

### Implementation for User Story 2

- [X] T023 [US2] Extender el store `layoutPreferences`: acción `toggleTheme()`, detección inicial con `window.matchMedia('(prefers-color-scheme: dark)')` (guard `import.meta.client`), persistencia en `localStorage['layout.theme']` en `app/stores/layoutPreferences.store.ts` (depende de T006)
- [X] T024 [US2] Implementar `ThemeToggle.vue` (ícono sol/luna) conectado al store, integrado en `AppNavbar.vue` en `app/components/layout/ThemeToggle.vue` (depende de T023, T015)
- [X] T025 [US2] Conectar `useAppShell().activeTheme` (solo lectura) al store en `app/composables/useAppShell.ts` (depende de T023, T007)
- [X] T026 [US2] Aplicar el tema activo del store a `useTheme()` de Vuetify para que el cambio se refleje sin recargar la página (depende de T023)

**Checkpoint**: User Story 1 y 2 funcionan de forma independiente

---

## Phase 5: User Story 3 - Usar el shell en mobile y en modo compacto (Priority: P3)

**Goal**: El drawer se comporta como overlay en mobile/tablet (<1280px) y soporta modo rail (72px, solo íconos) en desktop; el estado elegido se recuerda.

**Independent Test**: Redimensionar el viewport por debajo y por encima de 1280px y alternar el modo rail en desktop, verificando que el drawer se comporta correctamente en cada caso y que el estado persiste al recargar.

### Tests for User Story 3

- [X] T027 [P] [US3] Test del store `layoutPreferences`: acción `setDrawerMode()` y persistencia en `tests/unit/stores/layoutPreferences.store.spec.ts` (amplía el archivo de T021)
- [X] T028 [P] [US3] Test de `AppDrawer` en modo rail (desktop) y modo overlay (mobile) según breakpoint en `tests/unit/components/layout/AppDrawer.spec.ts` (amplía el archivo de T011)

### Implementation for User Story 3

- [X] T029 [US3] Extender el store `layoutPreferences`: acción `setDrawerMode()`, persistencia en `localStorage['layout.drawerMode']`, default según breakpoint inicial en `app/stores/layoutPreferences.store.ts` (depende de T023)
- [X] T030 [US3] Extender `AppDrawer.vue` para alternar `permanent`/`rail` en desktop (≥1280px) y `temporary`/overlay en <1280px usando `useDisplay()` de Vuetify, conectado al store (depende de T014, T029)
- [X] T031 [US3] Conectar el botón de menú (hamburguesa) de `AppNavbar.vue` a la acción de drawer correspondiente según el breakpoint actual (depende de T015, T030)

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones transversales que cubren SC-005 y SC-006 del spec

- [X] T032 [P] Revisar accesibilidad por teclado: foco visible en `AppDrawer` y `UserMenu` (SC-006)
- [X] T033 [P] Revisar que no haya colores hardcodeados fuera de los tokens de Vuetify en `app/components/layout/**` (SC-005)
- [X] T034 Ejecutar `quickstart.md` completo (validación manual de los 5 escenarios + `yarn vitest run`) y corregir hallazgos
- [X] T035 [P] Documentar en `README.md` cómo levantar el shell (fuentes, temas, variables) para futuros desarrolladores

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **User Stories (Phase 3-5)**: dependen de Foundational
  - US1 (P1) no depende de US2/US3
  - US2 (P2) reutiliza el store creado en Foundational (T006) y `AppNavbar` de US1 (T015) para integrar `ThemeToggle`
  - US3 (P3) reutiliza el store (T006/T023) y `AppDrawer` de US1 (T014) para agregar el modo rail/responsive
  - Aun con esa reutilización de archivos, cada historia es probable de forma independiente sin requerir que las otras estén "terminadas" — solo que Foundational y (para US2/US3) los archivos base de US1 existan
- **Polish (Phase 6)**: depende de que las historias que se quieran entregar estén completas

### Within Each User Story

- Tests antes que implementación
- Store/composables antes que componentes que los consumen
- Componentes base (`AppNavbar`, `AppDrawer`) antes que su integración en `layouts/default.vue`

### Parallel Opportunities

- T001-T003 (Setup) en paralelo
- T006, T007 (Foundational) en paralelo entre sí (archivos distintos); T004-T005, T008-T009 tienen dependencias de orden dentro de la fase
- Tests marcados [P] dentro de cada historia pueden correr en paralelo
- US2 y US3 pueden desarrollarse en paralelo entre sí una vez completada US1 (ambas tocan `layoutPreferences.store.ts` en secuencia propia, pero no dependen una de la otra)

---

## Parallel Example: User Story 1

```bash
# Lanzar juntos los tests de la Historia 1:
Task: "Test de useNavItems() en tests/unit/composables/useNavItems.spec.ts"
Task: "Test de AppDrawer en tests/unit/components/layout/AppDrawer.spec.ts"
Task: "Test de AppNavbar en tests/unit/components/layout/AppNavbar.spec.ts"

# Lanzar en paralelo la creación de composables base:
Task: "Crear useNavItems() en app/composables/useNavItems.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 solamente)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (crítico — bloquea todas las historias)
3. Completar Fase 3: User Story 1
4. **DETENER Y VALIDAR**: probar User Story 1 de forma independiente (ver `quickstart.md`, escenarios 1-2)
5. Con esto ya se puede montar cualquier módulo de negocio dentro del shell

### Incremental Delivery

1. Setup + Foundational → fundación lista
2. Agregar US1 → validar → demo (MVP del shell)
3. Agregar US2 (tema) → validar → demo
4. Agregar US3 (responsive/rail) → validar → demo
5. Cada historia agrega valor sin romper las anteriores

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes
- Verificar que los tests fallen antes de implementar
- Commitear después de cada tarea o grupo lógico
- Detenerse en cada checkpoint para validar la historia de forma independiente
- Evitar: tareas vagas, conflictos de mismo archivo simultáneo, dependencias cruzadas entre historias que rompan su independencia
