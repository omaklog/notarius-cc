# Research: Usuarios, roles y permisos

Sin `[NEEDS CLARIFICATION]` abiertos en `spec.md` (resueltos en
`/speckit-clarify`: profundidad de la bitácora, permiso que gobierna la
gestión de usuarios, y el hueco de desactivar al último administrador).
Este documento fija las decisiones técnicas concretas de implementación.

## 1. Reconciliar con el catálogo estático `roles_usuario` de `01-infra-supabase`

- **Decision**: La migración de este feature hace `drop table if exists
  public.roles_usuario;` antes de crear el modelo dinámico. Nada más en
  el repo referencia esa tabla todavía (ningún FK apunta a ella), por lo
  que eliminarla es segura.
- **Rationale**: `spec.md` (Assumptions) ya establece que el catálogo
  dinámico es la única fuente de verdad del rol de un usuario; mantener
  `roles_usuario` sin uso sería una tabla muerta que confundiría a
  cualquier spec futuro sobre cuál es el catálogo de roles real.
- **Alternatives considered**: Dejar `roles_usuario` como referencia
  histórica sin usarla — rechazado, viola la guía de no dejar código/
  esquema muerto; Migrar sus filas hacia la tabla `roles` nueva —
  rechazado, los nombres/códigos no coinciden 1:1 con el seed de este
  feature (Administrador/Auxiliar/Gestor vs. Notario/Abogado auxiliar/
  Asistente/Administrador/Oficial de cumplimiento) y no hay datos reales
  que preservar (la tabla nunca se usó).

## 2. Integración de Supabase Auth en Nuxt

- **Decision**: Usar el módulo oficial `@nuxtjs/supabase` (confirmado
  disponible en el registro de npm, última versión estable 2.0.9) en vez
  de integrar `@supabase/supabase-js` a mano. El módulo expone
  `useSupabaseClient()`/`useSupabaseUser()` auto-importados, maneja la
  sesión (cookies SSR-safe) y se integra de forma nativa con el
  middleware de rutas de Nuxt.
- **Rationale**: Mismo razonamiento que la elección de la CLI de
  Supabase en `01-infra-supabase` — el módulo oficial resuelve SSR,
  refresco de sesión y tipado de forma probada, en vez de reimplementar
  ese manejo de cookies/sesión a mano.
- **Alternatives considered**: `@supabase/supabase-js` directo con un
  plugin propio de Nuxt — más control, pero reimplementa manejo de sesión
  SSR que el módulo oficial ya resuelve; se descarta salvo que el módulo
  oficial dé problemas de compatibilidad con Nuxt 4.5.

## 3. Diseño de la bitácora de auditoría (append-only)

- **Decision**: Una única tabla genérica `public.audit_log` (no una
  tabla de historial por entidad), con columnas `entidad` (`'roles'` |
  `'rol_permisos'` | `'profiles'`), `entidad_id`, `accion` (`'insert'` |
  `'update'` | `'delete'`), `datos_anteriores`/`datos_nuevos` (`jsonb`),
  `changed_by`, `changed_at`. Poblada por un único trigger genérico
  reutilizado en las tres tablas (`roles`, `rol_permisos`,
  `profiles.rol_id`), no por tres triggers distintos con lógica
  duplicada.
- **Rationale**: La Clarification de `/speckit-clarify` exige historial
  completo e inmutable con valores antes/después, sin pantalla de
  consulta obligatoria en este feature. Una tabla genérica con `jsonb` es
  extensible (otro módulo futuro puede reusarla para su propia auditoría
  sin una migración de esquema nueva) y evita triplicar la misma lógica
  de trigger.
- **Alternatives considered**: Una tabla de historial por entidad
  (`roles_historico`, `rol_permisos_historico`, etc.) — rechazado, más
  esquema y triggers para el mismo resultado, sin beneficio dado que
  ninguna consulta de este feature necesita un esquema fuertemente
  tipado por tabla (solo "quién, cuándo, antes/después").

## 4. Filtrado del drawer de `00-layout-shell` por permiso

- **Decision**: Extender `NavItem` (en `useNavItems.ts`) con un campo
  `permiso: { modulo: string; accion: string }`. `AppDrawer.vue` filtra
  cada `NavItem` (y oculta un `NavGroup` completo si ningún ítem le
  queda) llamando a `useAuth().hasPermiso(modulo, accion)` de forma
  reactiva. `useAppShell()` (contrato de `00-layout-shell`) no cambia —
  el filtrado vive dentro de `AppDrawer.vue`, no se agrega al contrato
  público del shell.
- **Rationale**: `00-layout-shell/contracts/layout-shell-interface.md`
  ya fija que otros módulos no deben tocar el estado interno del shell
  directamente; filtrar dentro del propio `AppDrawer.vue` (que ya
  consume `useNavItems()`) respeta esa regla sin necesitar tocar el
  contrato. Reutilizar la lista estática de grupos/módulos evita
  duplicar la taxonomía de navegación en dos lugares.
- **Alternatives considered**: Mover la lista de navegación a la base de
  datos (tabla `nav_items`) para que el permiso viva ahí — rechazado
  como sobre-ingeniería para este feature; la estructura de navegación
  sigue siendo configuración estática de producto (decisión ya tomada en
  `00-layout-shell/research.md` #4), solo se le agrega la anotación de
  qué permiso la habilita.

## 5. Mecanismo de las salvaguardas (FR-009, FR-010, FR-016)

- **Decision**: Triggers `BEFORE DELETE`/`BEFORE UPDATE` en Postgres, no
  políticas RLS, para las tres salvaguardas: (a) no eliminar un rol con
  usuarios activos asignados, (b) no eliminar un rol `es_sistema`, (c) no
  dejar la notaría sin ningún usuario activo con `administracion.acceso`
  (ya sea por reasignar rol, quitar el permiso, o desactivar la cuenta).
  Cada trigger levanta una excepción con un mensaje explícito que el
  frontend traduce a un error de validación legible.
- **Rationale**: Estas son invariantes de negocio sobre la operación de
  escritura completa (¿cuántos usuarios quedarían con este permiso
  después de este cambio?), no reglas de visibilidad por fila — un
  trigger que se ejecuta una vez por sentencia es el mecanismo correcto;
  expresarlo como política RLS sería forzado y menos legible.
- **Alternatives considered**: Validar estas reglas solo en el frontend
  antes de enviar la petición — rechazado, viola FR-014 (todo se refuerza
  en la capa de datos, nunca solo en la interfaz).

## 6. Alta de perfil al invitar un usuario

- **Decision**: Trigger `handle_new_user` en `auth.users` (`AFTER
  INSERT`) que crea la fila correspondiente en `public.profiles` con
  `activo = true` y un `rol_id` por defecto (el primer rol `es_sistema`
  sin acceso administrativo, es decir `Auxiliar`, salvo que la invitación
  especifique otro rol).
- **Rationale**: Patrón estándar de Supabase para mantener `profiles`
  sincronizado 1:1 con `auth.users` sin depender de que el frontend haga
  un segundo insert por separado (que podría fallar o quedar
  inconsistente).
- **Alternatives considered**: Crear el perfil manualmente desde la ruta
  de servidor de invitación, en la misma petición — rechazado, duplica
  la responsabilidad del trigger y arriesga un perfil huérfano si la
  segunda escritura falla.

## 7. Invitar usuarios sin exponer la `service_role` key

- **Decision**: Ruta de servidor de Nuxt (`server/api/admin/invite-user.
  post.ts`) que usa la `service_role` key vía `runtimeConfig` (solo
  servidor) para llamar al Admin API de Supabase Auth
  (`inviteUserByEmail`), verificando primero que quien llama tiene
  `administracion.acceso` (Clarification #2).
- **Rationale**: `01-infra-supabase/contracts/supabase-infra-contract.md`
  ya fija que la `service_role` key nunca se expone al cliente Nuxt —
  una ruta de servidor de Nitro (ya parte del mismo proceso Nuxt) es más
  simple que una Edge Function dedicada para esta única acción
  administrativa, y no requiere `supabase functions serve` en desarrollo.
- **Alternatives considered**: Edge Function dedicada
  (`supabase/functions/invitar-usuario`) — descartada por ahora; se
  reconsiderará si en el futuro se necesita que la invitación dispare
  lógica adicional fuera del alcance de Nuxt (p. ej. proveedores externos
  de correo gestionados desde Supabase).

## 8. Función de autorización (`fn_has_permiso`)

- **Decision**: Función `security definer` en `public`, consultada desde
  cada política RLS (`using (public.fn_has_permiso('modulo','accion',
  escritura_id))`), que resuelve el alcance leyendo `rol_permisos` en
  vivo (sin cache) — igual al patrón del input original del feature.
  Ningún permiso se codifica en el JWT ni se cachea del lado del cliente
  más allá de un espejo reactivo en el store de Pinia usado solo para
  la interfaz (nunca como fuente de verdad de seguridad).
- **Rationale**: Satisface FR-007 (cambios inmediatos sin re-login) y la
  restricción de "nunca solo en la interfaz" (FR-014) al mismo tiempo —
  la interfaz puede reaccionar rápido usando el espejo en Pinia, pero
  cualquier escritura real siempre se revalida contra la tabla en el
  momento, vía RLS.
- **Alternatives considered**: Cachear los permisos como claim custom del
  JWT (vía `auth.hook.custom_access_token` de Supabase) — rechazado
  explícitamente por la Clarification/NFR original (un claim cacheado no
  se actualiza hasta que el token refresca, violando "reconfiguración en
  caliente").

## 9. Validación de formularios (primer uso real de Yup + VeeValidate)

- **Decision**: Un esquema Yup por formulario (login, alta/edición de
  rol, invitar usuario), usado vía `useForm`/`useField` de VeeValidate,
  siguiendo el patrón estándar de esa librería — sin introducir un
  wrapper propio todavía (YAGNI hasta que haya suficientes formularios
  para justificar una abstracción compartida).
- **Rationale**: `constitution.md` ya fija esta combinación; este es
  simplemente el primer feature que efectivamente la usa, así que no hay
  alternativa que evaluar — solo el patrón de uso concreto.

## 10. Testing

- **Decision**: Vitest + Vue Test Utils para `useAuth()` (mockeando
  `useSupabaseClient()`/`useSupabaseUser()`), `AppDrawer.vue` (filtrado
  por permiso, extendiendo los tests ya existentes de
  `00-layout-shell`), y los componentes de `components/admin/`. Sin
  framework de pruebas SQL nuevo — misma decisión que
  `01-infra-supabase/research.md` #5; las salvaguardas/triggers y
  `fn_has_permiso` se validan manualmente vía `quickstart.md`.
- **Rationale**: Consistencia con las dos features anteriores; no hay
  justificación nueva para introducir pgTAP u otra herramienta de
  pruebas de base de datos solo para este feature.
