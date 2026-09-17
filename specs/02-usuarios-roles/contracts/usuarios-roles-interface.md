# Contract: Usuarios, roles y permisos hacia otros módulos

Este feature es infraestructura transversal — todo módulo de negocio
futuro (Escrituras, Comparecientes, Cumplimiento PLD, Expedientes,
Trámites, Avisos SAT, Órdenes de pago, Honorarios, Georreferenciación,
Notificaciones, Reportes, Administración General) depende de lo que aquí
se fija para su propia autorización. Este documento es el contrato que
esos specs futuros pueden asumir sin necesidad de re-especificarlo.

## Regla dura: nunca condicionar por nombre de rol

Ninguna política RLS, componente de frontend, o Edge Function debe
comprobar `rol.nombre = 'Administrador'` (o cualquier otro nombre de rol)
directamente. Toda comprobación de autorización pasa por
`public.fn_has_permiso(modulo, accion, escritura_id?)` (backend) o por
`useAuth().hasPermiso(modulo, accion, escrituraId?)` (frontend) — nunca
por otro camino. Esto es lo que permite que los roles sigan siendo
100% reconfigurables sin tocar código.

## Patrón de política RLS para módulos futuros

Cada spec de módulo de negocio declara, en su propio `data-model.md`, sus
propios permisos en el catálogo (sección "Módulo" de `permisos`, ya
sembrado por este feature con el módulo `escrituras`/`comparecientes`/
`pld`/etc. — ver `constitution.md` §4) y replica este patrón sobre su
propia tabla:

```sql
alter table public.<tabla> enable row level security;

create policy "<tabla>_select" on public.<tabla>
  for select using (public.fn_has_permiso('<modulo>', 'ver', escritura_id));

create policy "<tabla>_insert" on public.<tabla>
  for insert with check (public.fn_has_permiso('<modulo>', 'crear', escritura_id));

create policy "<tabla>_update" on public.<tabla>
  for update using (public.fn_has_permiso('<modulo>', 'editar', escritura_id));

create policy "<tabla>_delete" on public.<tabla>
  for delete using (public.fn_has_permiso('<modulo>', 'eliminar', escritura_id));
```

Si la tabla no está ligada a una escritura, se omite el tercer argumento
(el catálogo ya marca `requiere_alcance = false` para esos módulos).

## Catálogo de permisos: estabilidad

Los valores de `permisos.modulo`/`permisos.accion` ya sembrados (ver
`data-model.md` → Configuración inicial) no se renombran ni se eliminan
una vez que un rol o una política los referencia — un módulo nuevo
**agrega** filas al catálogo vía su propia migración, nunca edita las
filas de otro módulo. `escrituras.responsable_id` (el concepto de
"responsable") es el ancla de todo alcance `'propias'`; cualquier tabla
ligada a una escritura debe poder resolver su `escritura_id` para
consultarlo.

## Contrato de frontend: `useAuth()`

```ts
interface AuthApi {
  readonly user: Readonly<Ref<{ id: string; nombreCompleto: string } | null>>
  readonly loading: Readonly<Ref<boolean>>

  // Espejo reactivo de UI — NUNCA la fuente de verdad de seguridad.
  // Toda escritura real se revalida en el servidor vía RLS/fn_has_permiso.
  hasPermiso(modulo: string, accion: string, escrituraId?: string): boolean

  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
}

function useAuth(): AuthApi
```

- **Estabilidad**: `hasPermiso` es la única forma en que un módulo de
  negocio debe decidir si muestra u oculta una acción en su interfaz.
  Ningún módulo debe leer `rol_permisos`/`profiles` directamente — ni
  siquiera puede: esas tablas son de solo `administracion.acceso` vía RLS.
  El espejo de permisos que alimenta `hasPermiso()` se obtiene llamando a
  `fn_mis_permisos()` (RPC `security definer`, ver `data-model.md`), nunca
  consultando esas tablas de forma directa.
- **No expone**: gestión de roles/permisos (crear rol, editar
  `rol_permisos`, invitar usuarios) — eso vive solo en las pantallas de
  Administración General de este feature, para mantener una única fuente
  de verdad de esa configuración (mismo principio que
  `00-layout-shell/contracts/` con el tema/drawer).

## Integración con el drawer de `00-layout-shell`

`useNavItems()` (de `00-layout-shell`) gana un campo `permiso: { modulo;
accion }` por cada `NavItem`. `AppDrawer.vue` filtra ítems/grupos vía
`useAuth().hasPermiso()` antes de renderizarlos (ver research.md #4). El
contrato `useAppShell()` de `00-layout-shell` no cambia — ningún módulo
debe esperar que el filtrado por permiso se exponga ahí.

## Bitácora de auditoría: solo lectura para consumidores

`audit_log` es de solo `INSERT` (por trigger) y `SELECT` (para
`administracion.acceso`) — ningún módulo debe escribir en ella
directamente ni asumir que puede editar/borrar una entrada. Un módulo
futuro que necesite su propia auditoría puede reutilizar la misma tabla
(agregando su `entidad` al `check`) en vez de crear una tabla de
historial nueva.
