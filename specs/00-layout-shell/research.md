# Research: Layout principal (shell de la aplicación)

Sin `[NEEDS CLARIFICATION]` abiertos en `spec.md`, pero el Technical Context
del plan trae decisiones de integración concretas que vale la pena dejar
documentadas (y una discrepancia de versión detectada al leer el repo real).

## 1. Discrepancia Nuxt 3 (constitución) vs Nuxt 4 (repo escafoldado)

- **Decision**: Construir sobre Nuxt 4 (`nuxt@^4.5.1`), que ya está instalado
  en `package.json` y fue el resultado de `nuxi init` para este proyecto.
- **Rationale**: Nuxt 4 es la versión activa soportada por el equipo Nuxt;
  mantiene la misma Composition API y convenciones de `layouts/`/`pages/`
  que Nuxt 3 (el cambio principal es `srcDir` default a `app/`, que el
  proyecto ya refleja: existe `app/app.vue`). No hay beneficio en downgradear
  a Nuxt 3 solo para calzar con el texto de la constitución.
- **Alternatives considered**: Downgrade a Nuxt 3 — rechazado: perdería
  actualizaciones/soporte sin ganar nada, y el proyecto ya arrancó en Nuxt 4.
- **Follow-up (fuera de este plan)**: correr `/speckit-constitution` para
  corregir "Nuxt 3" → "Nuxt 4" (bump PATCH, aclaración de versión).

## 2. Integración de Vuetify con Nuxt 4

- **Decision**: Usar el módulo oficial `vuetify-nuxt-module` (en vez de
  registrar Vuetify a mano vía plugin) para obtener auto-import de
  componentes, tree-shaking, y soporte de SSR sin configuración manual de
  `transpile`.
- **Rationale**: Es el camino recomendado por Vuetify para proyectos Nuxt;
  reduce boilerplate de plugin y evita errores comunes de hidratación SSR con
  Vuetify + Nuxt.
- **Alternatives considered**: Plugin manual (`plugins/vuetify.ts` +
  `vite-plugin-vuetify`) — más control fino, pero más código a mantener sin
  necesidad real para este feature. Se deja como alternativa si el módulo
  oficial da problemas de compatibilidad con Nuxt 4.5.
- **Config de temas**: los objetos `notariaLight`/`notariaDark` de
  `design-system.md` §7 se pasan tal cual a la opción `vuetify.theme.themes`
  del módulo.

## 3. Persistencia de preferencias (tema + estado del drawer)

- **Decision**: Store de Pinia (`layoutPreferences.store.ts`) que lee/escribe
  directo a `localStorage` (sin plugin de persistencia adicional tipo
  `pinia-plugin-persistedstate`, dado que solo son 2 valores simples).
- **Rationale**: Agregar una dependencia extra para persistir 2 claves
  (`theme`, `drawerState`) es más complejidad de la que resuelve; un
  `watch()` simple sobre el store hacia `localStorage.setItem` es suficiente
  y más fácil de testear con Vitest sin mockear un plugin externo.
- **Alternatives considered**: `pinia-plugin-persistedstate` — descartado
  por ahora (YAGNI); reconsiderar si más adelante el store crece a más claves
  persistidas y justifica la dependencia.
- **Detección inicial de tema**: si no hay valor guardado, se usa
  `window.matchMedia('(prefers-color-scheme: dark)')` como default (spec
  User Story 2, escenario 1), solo en el cliente (guard `import.meta.client`
  para evitar mismatch de SSR).

## 4. Configuración de navegación (grupos/módulos del drawer)

- **Decision**: Array estático tipado en `composables/useNavItems.ts`,
  derivado 1:1 de `constitution.md` §4, sin fuente de datos remota.
- **Rationale**: La lista de módulos y su agrupación es una decisión de
  producto ya fijada en la constitución, no un dato de negocio que cambie en
  runtime; un composable que retorna un array constante es suficiente y no
  requiere store ni fetch.
- **Alternatives considered**: Persistir la config de navegación en Supabase
  para permitir personalización por rol/notaría — rechazado para este MVP
  (over-engineering); revisar si en el futuro se requiere navegación
  condicionada por rol.

## 5. Testing del shell

- **Decision**: Vitest + `@vue/test-utils` para: (a) lógica del store
  (`layoutPreferences.store.spec.ts`), (b) el composable de navegación
  (`useNavItems.spec.ts`), y (c) render/interacción básica de
  `AppNavbar`/`AppDrawer` (toggle de tema dispara el store correcto, click en
  ítem del drawer resalta el activo).
- **Rationale**: Cubre exactamente los criterios de aceptación medibles del
  spec (SC-002, SC-004) sin necesitar un runner E2E todavía.
- **Alternatives considered**: Playwright/Cypress para probar el resize
  real de viewport (User Story 3) — pospuesto: la constitución aún no fija
  una herramienta E2E; se deja fuera de este feature y se decide cuando haya
  una necesidad transversal más amplia que justifique agregarla.
