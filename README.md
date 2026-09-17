# Sistema de Administración Notarial

Nuxt 4 + Vuetify 4 + Pinia. Ver `.specify/memory/constitution.md` para el
stack y los módulos del sistema, y `design-system.md` para tokens de color,
tipografía y espaciado.

## Backend local (Supabase) (`specs/01-infra-supabase`)

Base de datos, autenticación, storage y Edge Functions corren localmente vía
Docker, orquestados por la CLI de Supabase. La CLI **no** se instala global —
vive pinneada como devDependency en `package.json` (`supabase@2.110.0`) para
que la versión quede fijada en `yarn.lock` y sea igual en cualquier máquina.

### Prerrequisitos

- Docker instalado y corriendo.
- `yarn install` (instala la CLI pinneada junto con el resto de dependencias).

### Comandos

```bash
yarn db:start           # levanta el stack completo (equivalente a `npx supabase start`)
yarn db:stop            # detiene los contenedores (los datos persisten)
yarn db:reset           # reconstruye el esquema desde migrations/ y siembra seed.sql
yarn db:functions:serve # sirve las Edge Functions localmente con hot reload
```

### Puertos del stack local

| Servicio | Puerto |
|---|---|
| API gateway (Kong) — único punto de entrada | `54321` |
| PostgreSQL | `54322` |
| Studio (UI de administración) | `54323` |
| Mailpit/Inbucket (bandeja de correo simulada) | `54324` |

Si el arranque falla por puerto ya asignado, es porque otro proyecto Supabase
local ya está corriendo en esta máquina (`docker ps` para identificarlo,
`supabase stop` desde ese otro proyecto para liberar los puertos).

### Estructura y convenciones

- `supabase/migrations/` — todo cambio de esquema (tablas, columnas,
  políticas RLS, buckets) se crea aquí, versionado. **Nunca** se edita el
  esquema directamente en Studio sin su migración correspondiente — ver la
  regla dura en `specs/01-infra-supabase/contracts/supabase-infra-contract.md`.
- `supabase/seed.sql` — catálogos base (`constitution.md`) recargados en
  cada `db reset`.
- `supabase/functions/` — Edge Functions (Deno); las que aún no tienen spec
  de negocio propio (`notificar-evento`, `consultar-listas-pld`) son stubs
  que responden `501 not_implemented`.
- Variables de entorno: copiar `.env.example` a `.env` (nunca versionado —
  `.gitignore` ya excluye `.env`/`.env.*` salvo `.env.example`) y llenar
  con los valores que imprime `yarn db:start`. **Nota de corrección**: la
  documentación original de este feature decía `.env.local`, pero Nuxt
  solo carga `.env` automáticamente (no `.env.local`, a diferencia de
  convenciones de otras herramientas como Vite/Next.js) — corregido al
  implementar `02-usuarios-roles`, primer feature que realmente conecta
  el cliente Nuxt a Supabase.

Ver `specs/01-infra-supabase/quickstart.md` para la guía completa de
validación manual (arranque, reset, buckets, políticas RLS).

## Layout shell (`specs/00-layout-shell`)

El armazón visual compartido por todas las rutas (navbar + drawer + área de
contenido) vive en:

- `app/layouts/default.vue` — ensambla `AppNavbar` + `AppDrawer` +
  `AppBreadcrumbs` + `v-main`, y sincroniza el tema Pinia → Vuetify.
- `app/components/layout/` — `AppNavbar`, `AppDrawer`, `AppBreadcrumbs`,
  `ThemeToggle`, `UserMenu`.
- `app/composables/useNavItems.ts` — configuración estática de los 5 grupos
  del drawer (Operación, Cumplimiento, Finanzas, Ubicación, Sistema), derivada
  de `constitution.md` §4.
- `app/composables/useAppShell.ts` — único punto de contacto que otros
  módulos deben usar para integrarse con el shell (`setBreadcrumb`,
  `branding`, `activeTheme`). Ver `specs/00-layout-shell/contracts/`.
- `app/stores/layoutPreferences.store.ts` — tema y estado del drawer,
  persistidos en `localStorage` (`layout.theme`, `layout.drawerMode`).

### Temas y tipografía

Los temas Vuetify (`notariaLight` / `notariaDark`) y el link de Google Fonts
(Libre Caslon Display, IBM Plex Sans, IBM Plex Mono) se configuran en
`nuxt.config.ts` → `vuetify.vuetifyOptions`, tomados tal cual de
`design-system.md` §3 y §7. No agregar colores fuera de esos temas en
componentes (`design-system.md` §2, regla del bronce).

### Notas de implementación

- El drawer usa `useDisplay().lgAndUp` de Vuetify (breakpoint `lg` = 1280px)
  para decidir `permanent`/`rail` (desktop) vs. `temporary` (mobile/tablet).
- Nuxt/Pinia hidratan el store con el estado por defecto renderizado en el
  servidor (sin `window`) antes de que corra cualquier código de cliente;
  `layoutPreferences.initFromBrowser()` se llama en `onMounted` de
  `default.vue` para recalcular tema/drawer reales desde
  `localStorage`/`prefers-color-scheme` una vez montada la app.

## Usuarios, roles y permisos (`specs/02-usuarios-roles`)

Autenticación (Supabase Auth, email + contraseña) y autorización dinámica:
en vez de roles fijos codificados, un catálogo de permisos (`permisos`) y
roles editables (`roles`/`rol_permisos`) que un Administrador reconfigura
desde la interfaz, sin cambios de código. Toda regla se refuerza a nivel de
base de datos con RLS a través de una única función,
`fn_has_permiso(modulo, accion, escritura_id)` — ninguna política, página
o composable compara nunca `roles.nombre` contra un literal.

### Iniciar sesión

- `app/pages/login.vue` (`/login`) — no requiere registro público; solo un
  Administrador crea usuarios (botón "Invitar usuario" en
  `/administracion-general/usuarios`).
- **Usuario administrador predeterminado (desarrollo local sembrado en `supabase/seed.sql`)**:
  - **Correo**: `admin@notaria.local`
  - **Contraseña**: `Password123!`
- Tras iniciar sesión, `app/composables/useAuth.ts` carga el perfil
  (`fn_mi_perfil()`) y los permisos (`fn_mis_permisos()`) del usuario vía
  RPC — necesarias porque `profiles`/`roles` están protegidas por RLS
  admin-only, así que un usuario no-admin no puede leer su propio rol por
  una consulta directa.

### Administrar roles y usuarios

Sección "Administración general" del drawer (solo visible con el permiso
`administracion.acceso`, protegida además por el middleware
`app/middleware/require-admin.ts`):

- `/administracion-general/roles` — listado de roles con conteo de
  usuarios, crear rol, eliminar rol no-sistema sin usuarios activos.
- `/administracion-general/roles/[id]` — editor de nombre/descripción y
  checklist de permisos agrupado por módulo, con selector de alcance
  (`propias`/`todas`) cuando el permiso lo requiere.
- `/administracion-general/usuarios` — listado de usuarios, invitar
  (`server/api/admin/invite-user.post.ts`, usa `service_role` solo del
  lado servidor), asignar rol, activar/desactivar cuenta.

### Salvaguardas (nunca cero administradores)

Tres triggers en `supabase/migrations/20260727010100_salvaguardas_roles.sql`
impiden que la notaría quede sin ningún usuario activo con
`administracion.acceso` — bloquean reasignar el rol del último admin,
quitarle ese permiso a su único rol, o desactivar su cuenta — y que se
elimine un rol `es_sistema` o con usuarios activos asignados. Cada rechazo
se muestra en la interfaz con un mensaje legible.

### Auditoría

Todo cambio en `roles`, `rol_permisos` y `profiles` queda registrado en
`audit_log` (quién, cuándo, valores antes/después), vía el trigger
genérico `fn_audit_log_generic()`. La tabla es de solo `insert` (por ese
trigger, `security definer`) y `select` (admin) — ni `authenticated` ni
`service_role` tienen permiso de escritura directa, ni siquiera
`service_role` (que por defecto ignora RLS): el `GRANT` base se revocó
explícitamente para que la bitácora sea verdaderamente inmutable.

Ver `specs/02-usuarios-roles/quickstart.md` para los 3 escenarios de
validación manual, y `contracts/usuarios-roles-interface.md` para el
contrato completo (catálogo de permisos, seed de roles, patrón de RLS).

## Escrituras (`specs/03-escrituras`)

La **Escritura Pública** como entidad raíz del sistema notarial: punto de
anclaje para todos los módulos de negocio (Comparecientes, Cumplimiento PLD,
Expedientes, Trámites, Avisos SAT/UIF, Órdenes de pago, Honorarios,
Georreferenciación).

### Numeración atómica e inmutabilidad

- **Asignación server-side**: El instrumento se asigna de forma centralizada
  mediante trigger Postgres (`trg_asignar_instrumento`) y la función
  `fn_siguiente_instrumento(anio)` sobre `instrumento_control`. El número
  nunca se acepta ni se calcula en el cliente (FR-002).
- **No reutilización**: Un número de instrumento jamás se reutiliza, ni
  siquiera si la escritura es anulada (FR-003). Se presenta siempre como
  `instrumento/año` (ej. `1/2026`).
- **Inmutabilidad**: Al transicionar a `protocolizada`, los datos de la
  escritura quedan fijos en la capa de datos; la única transición posterior
  admitida es a `anulada`.

### Flujo de estados y gate de protocolización

- Máquina de estados estricta en base de datos (`trg_validar_transicion_escritura`):
  `borrador → protocolizada → anulada`.
- **Gate de protocolización**: Antes de protocolizar, `fn_validar_protocolizacion`
  evalúa que:
  - Los porcentajes de participación de los comparecientes capturados sumen
    exactamente 100%.
  - Si el acto jurídico es `traslativo`, exista predio georreferenciado
    (auto-satisfecho mientras no exista el spec de Georreferenciación).
  - Cumplimiento PLD y bloqueos resueltos por compareciente
    (auto-satisfechos mientras no exista el spec de PLD).
- En la interfaz, `ProtocolizarButton.vue` muestra un tooltip con las causas
  específicas que bloquean la protocolización si la lista devuelta por la RPC
  no está vacía (FR-019).

### Anulación

- `AnularDialog.vue`: Visible únicamente cuando la escritura está
  protocolizada y el usuario cuenta con el permiso `escrituras.anular`
  (Administrador).
- Requiere capturar obligatoriamente un motivo de anulación no vacío (reforzado
  por trigger y validado por Yup/VeeValidate).
- Todas las transiciones de estatus quedan registradas en `public.audit_log`.

### Detalle-hub y filtros

- `/escrituras/[id]` — Detalle en pestañas: Comparecientes
  (`ComparecientesTab.vue`), Georreferenciación (visible únicamente si el acto
  es `traslativo` per FR-017), y placeholders "en construcción" para módulos
  futuros.
- `/escrituras` — Listado con filtros (`EscriturasFiltros.vue`) por estatus,
  acto jurídico, rango de fecha y responsable. Para usuarios con alcance
  `propias` (Auxiliar), la RLS filtra automáticamente solo sus escrituras
  asignadas.
- `/administracion-general/actos-juridicos` — Catálogo administrable de actos
  jurídicos (nombre, descripción, clasificación traslativo/no traslativo, activo).

Ver [quickstart.md](specs/03-escrituras/quickstart.md) para los escenarios de
validación manual y [contracts/escrituras-interface.md](specs/03-escrituras/contracts/escrituras-interface.md)
para el contrato con módulos dependientes futuros.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Tests

```bash
yarn test # vitest run
```

Ver `specs/00-layout-shell/quickstart.md` para el checklist de validación
manual (tema, responsive/rail, accesibilidad por teclado) además de los
tests automatizados.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
