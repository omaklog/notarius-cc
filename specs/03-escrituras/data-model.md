# Data Model: Escrituras (entidad raíz)

Convenciones heredadas de `01-infra-supabase`/`02-usuarios-roles`: `uuid`
con `gen_random_uuid()` como llave primaria salvo donde se indique,
`timestamptz` en `created_at`/`updated_at` con el trigger `set_updated_at`
ya existente, RLS habilitada en toda tabla nueva, y ninguna política
condiciona por nombre de rol — todo pasa por `fn_has_permiso()`.

## Cambios a tablas existentes

### `public.actos_juridicos` (evolución de `public.tipos_acto_notarial`, ver research.md #1)

```sql
alter table public.tipos_acto_notarial rename to actos_juridicos;
alter table public.actos_juridicos drop column codigo;
alter table public.actos_juridicos add column descripcion text;
alter table public.actos_juridicos add column tipo public.tipo_acto_juridico;
-- backfill de las 5 filas ya sembradas, luego:
alter table public.actos_juridicos alter column tipo set not null;
alter table public.actos_juridicos add constraint actos_juridicos_nombre_key unique (nombre);
```

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | sin cambios |
| `nombre` | text | ahora única (antes solo `codigo` lo era) |
| `descripcion` | text | nueva, nullable |
| `tipo` | `tipo_acto_juridico` (enum: `traslativo`/`no_traslativo`) | nueva, not null |
| `activo` | boolean | sin cambios |
| `created_at`/`updated_at`/`created_by` | — | sin cambios |

**RLS**: `select` para `authenticated` (sin cambio); se reemplaza la
política de escritura por `fn_has_permiso('administracion', 'acceso')`
para `insert`/`update`/`delete` (antes solo `service_role`), habilitando
el CRUD real desde Administración General.

### `public.roles_compareciente` — se da de baja (research.md #2)

```sql
drop table public.roles_compareciente;
```

### `public.audit_log` — se agrega `'escrituras'` a las entidades auditables

```sql
alter table public.audit_log drop constraint audit_log_entidad_check;
alter table public.audit_log add constraint audit_log_entidad_check
  check (entidad in ('roles', 'rol_permisos', 'profiles', 'escrituras'));
```

## Tablas nuevas

### `public.tipo_acto_juridico` (enum, no una tabla)

```sql
create type public.tipo_acto_juridico as enum ('traslativo', 'no_traslativo');
```

Fijo a propósito (research.md/spec.md): de él depende si se muestra la
pestaña de Georreferenciación — no vive como catálogo editable, a
diferencia de `actos_juridicos` en sí.

### `public.instrumento_control`

| Columna | Tipo | Notas |
|---|---|---|
| `anio` | integer PK | año del instrumento |
| `ultimo_numero` | integer not null default 0 | último instrumento asignado ese año |

Sin RLS de usuario (solo se accede vía `fn_siguiente_instrumento`,
`security definer`); no se expone para lectura/escritura directa desde el
cliente.

### `public.comparecientes` (stub — ver research.md #6 y Clarifications de spec.md)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `nombre` | text not null | identidad mínima; el futuro spec de Comparecientes amplía esta tabla (`alter table`), no la reemplaza |
| `created_at` | timestamptz not null default now() | |

**RLS**: `select`/`all` restringido a quien tenga
`fn_has_permiso('comparecientes', accion)` con alcance `todas` (sin
`escritura_id` — ver research.md #6). La vía real de alta/edición
escopada por escritura es `fn_asociar_compareciente()`, no esta tabla
directamente.

### `public.escrituras`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `instrumento` | integer not null | capturado obligatoriamente por el cliente en el formulario de alta; no duplicable ni reutilizable (FR-002) |
| `anio` | integer not null | derivado de `now()` al crear (research.md #3) |
| `volumen` | integer not null | número de libro/tomo del protocolo físico (captura libre, ej. tomos alternos de pares y nones) |
| `pagina_inicial` | integer | opcional (solo índice de reportes) |
| `pagina_final` | integer | opcional |
| `acto_juridico_id` | uuid not null, FK → `actos_juridicos(id)` | de aquí se deriva `traslativo`/`no_traslativo` |
| `estatus` | text not null default `'borrador'`, check in (`borrador`,`protocolizada`,`anulada`) | máquina de estados, ver research.md #5 |
| `responsable_id` | uuid not null, FK → `profiles(id)` | por defecto quien crea; reasignar exige `escrituras.reasignar_responsable` |
| `fecha_celebracion` | date | opcional, puede capturarse después |
| `monto_operacion` | numeric(14,2) | pesos mexicanos (Assumptions de spec.md) |
| `objeto` | text not null | descripción breve del acto |
| `observaciones` | text | opcional |
| `motivo_anulacion` | text | obligatorio solo cuando `estatus = 'anulada'` (validado por trigger, no por `check`, porque depende del valor anterior) |
| `created_at`/`updated_at` | timestamptz | trigger `set_updated_at` existente |
| `created_by` | uuid not null, FK → `profiles(id)` | |

Constraint: `unique (instrumento)` / `unique (instrumento, anio)`.

**Triggers**:
- `trg_asignar_instrumento` (`before insert`): fija `anio` a partir de la fecha actual; respeta el `instrumento` ingresado por el cliente validando que no sea nulo, no negativo ni duplicado. Si viniera vacío, puede sugerir o autogenerar el siguiente consecutivo como fallback.
- `trg_validar_transicion_escritura` (`before update`): máquina de
  estados, inmutabilidad tras `protocolizada`, gate de protocolización,
  permiso de anulación, permiso de reasignar responsable (research.md
  #5).
- `audit_log_escrituras` (`after insert or update or delete`):
  `fn_audit_log_generic()` (research.md #7).

**RLS**: `select`/`insert`/`update`/`delete` vía `fn_has_permiso('escrituras',
accion, id)` — mismo patrón exacto que el ejemplo ya documentado en
`02-usuarios-roles/spec.md` sección 7, aplicado por primera vez a una
tabla real.

### `public.escritura_comparecientes`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `escritura_id` | uuid not null, FK → `escrituras(id)` on delete cascade | |
| `compareciente_id` | uuid not null, FK → `comparecientes(id)` | |
| `rol` | text not null, check in (`otorgante`,`adquirente`,`apoderado`,`representante_legal`,`testigo`) | enum fijo, no catálogo (research.md #2) |
| `porcentaje_participacion` | numeric(5,2), check (`> 0 and <= 100`) | nullable; genérico, no ligado a un rol específico |
| `created_at` | timestamptz not null default now() | |

Constraint: `unique (escritura_id, compareciente_id, rol)`.

**RLS**: `select`/`insert`/`update`/`delete` vía
`fn_has_permiso('comparecientes', accion, escritura_id)` — el alcance
`propias`/`todas` de Auxiliar/Gestor sobre comparecientes se resuelve
aquí, escopado por la escritura (research.md #6), no en la tabla
`comparecientes` en sí.

## Funciones

### `fn_siguiente_instrumento(p_anio integer) returns integer`

`security definer`. `insert ... on conflict (anio) do nothing` seguido de
`update ... set ultimo_numero = ultimo_numero + 1 where anio = p_anio
returning ultimo_numero` (research.md #3) — atómico bajo concurrencia.

### `fn_validar_protocolizacion(p_escritura_id uuid) returns text[]`

`security definer`. Devuelve un arreglo de mensajes (vacío si puede
protocolizarse) evaluando, para la escritura y sus
`escritura_comparecientes`:

1. Cumplimiento PLD resuelto por compareciente — si
   `to_regclass('public.cumplimiento_pld')` (nombre de tabla futuro,
   spec de Comparecientes/PLD) es `null`, esta condición se omite.
2. Sin bloqueos activos sin resolver por compareciente — mismo patrón de
   `to_regclass` sobre la tabla futura correspondiente.
3. Si `actos_juridicos.tipo = 'traslativo'` (evaluado contra el
   `acto_juridico_id` vigente de la escritura, no un valor congelado):
   existencia de un predio con polígono — `to_regclass('public.predios')`
   (nombre futuro, spec de Georreferenciación); si es `null`, se omite.
4. Suma de `porcentaje_participacion` de `escritura_comparecientes` para
   esa escritura: si `count(*) filter (where porcentaje_participacion is
   not null) > 0`, la suma debe ser exactamente `100`.

Se reutiliza (a) en el trigger `trg_validar_transicion_escritura` para el
rechazo real, y (b) expuesta como RPC para que la interfaz muestre el
tooltip específico sin intentar la transición (research.md #4).

### `fn_asociar_compareciente(p_escritura_id uuid, p_compareciente_id uuid, p_nombre_nuevo text, p_rol text, p_porcentaje numeric) returns uuid`

`security definer`. Valida
`fn_has_permiso('comparecientes', case when p_compareciente_id is null
then 'crear' else 'editar' end, p_escritura_id)`; si `p_compareciente_id`
es `null`, crea la fila mínima en `comparecientes` con `p_nombre_nuevo`;
luego hace `upsert` en `escritura_comparecientes` (`on conflict
(escritura_id, compareciente_id, rol)`); devuelve el `compareciente_id`
usado o creado (research.md #6).

## Diagrama de relaciones (alto nivel)

```text
profiles (02-usuarios-roles)
   ▲               ▲
   │ responsable_id│ created_by
   │               │
actos_juridicos ──► escrituras ──► escritura_comparecientes ──► comparecientes (stub)
                        │
                        └──► instrumento_control (vía fn_siguiente_instrumento, sin FK directa)
```
