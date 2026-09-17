# Data Model: Infraestructura Supabase (entorno local)

Este feature no modela el dominio de negocio (Escrituras, Comparecientes,
etc.) — solo las tablas mínimas de catálogo necesarias para que el entorno
local quede sembrado y utilizable (spec FR-007), más los recursos de
Storage y el esquema reservado para Cumplimiento PLD/UIF.

## Convención de auditoría (aplica a toda tabla de este feature)

Por FR-013 / `constitution.md` §7, toda tabla incluye:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Requiere la extensión `pgcrypto` o `pgcrypto`/`uuid-ossp` habilitada en la migración inicial |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | Actualizada por trigger `set_updated_at` (definido una sola vez, reutilizado por todas las tablas) |
| `created_by` | `uuid references auth.users(id)` | Nullable — el seed inicial no tiene un usuario autenticado real que lo cree |

## Tabla: `tipos_acto_notarial`

Catálogo base de tipos de acto (`constitution.md` §4/§8), referenciado a
futuro por el módulo de Escrituras.

| Campo | Tipo | Reglas |
|---|---|---|
| `codigo` | `text unique not null` | Identificador corto estable (p. ej. `compraventa`) — lo que los módulos futuros usan para referenciar, no `id` |
| `nombre` | `text not null` | Nombre legible (p. ej. "Compraventa") |
| `activo` | `boolean not null default true` | Permite desactivar sin borrar (histórico de escrituras ya creadas no debe romperse) |

**RLS**: lectura pública para cualquier usuario autenticado (`select` para
`authenticated`); escritura restringida a `service_role` (la administración
de catálogos es de Administración General, spec futuro).

## Tabla: `roles_compareciente`

Catálogo de roles con los que una persona participa en una escritura
(`constitution.md` §3).

| Campo | Tipo | Reglas |
|---|---|---|
| `codigo` | `text unique not null` | p. ej. `otorgante`, `adquirente`, `apoderado`, `testigo` |
| `nombre` | `text not null` | Nombre legible |
| `activo` | `boolean not null default true` | |

**RLS**: igual que `tipos_acto_notarial` (lectura autenticada, escritura
`service_role`).

## Tabla: `roles_usuario`

Catálogo de roles del sistema (`constitution.md` §7), usado por
autenticación/autorización futura.

| Campo | Tipo | Reglas |
|---|---|---|
| `codigo` | `text unique not null` | p. ej. `notario`, `abogado_auxiliar`, `asistente`, `administrador`, `oficial_cumplimiento` |
| `nombre` | `text not null` | Nombre legible |
| `activo` | `boolean not null default true` | |

**RLS**: lectura autenticada, escritura `service_role`.

## Tabla: `uma_historico`

Histórico de valores de la UMA (`constitution.md` §6) — este feature solo
siembra un valor inicial de arranque; el módulo de Administración General
es responsable de la carga anual real y de cualquier campo adicional que
requiera.

| Campo | Tipo | Reglas |
|---|---|---|
| `valor` | `numeric(10,2) not null` | Valor en pesos MXN |
| `fecha_inicio_vigencia` | `date not null` | |
| `fecha_fin_vigencia` | `date` | Nullable — el valor vigente actual no tiene fin todavía |

**Regla de negocio (documentada, no exigida por RLS)**: los rangos de
vigencia no deben solaparse; la validación de esa regla es responsabilidad
del módulo de Administración General cuando implemente la carga anual.

**RLS**: lectura autenticada, escritura `service_role`.

## Esquema `pld` (reservado)

Se crea el esquema (`create schema if not exists pld;`) sin tablas. El
diseño de `consulta_lista` y demás tablas de Cumplimiento PLD/UIF
pertenece a ese spec futuro; este feature solo garantiza que el esquema
exista para que ese módulo no tenga que decidir el aislamiento de datos
desde cero.

## Recursos de Storage (no son tablas, pero son parte de los "datos" que este feature provisiona)

| Bucket | Acceso | Uso previsto |
|---|---|---|
| `expedientes` | Privado | Documentos digitalizados por escritura (módulo Expedientes, futuro) |
| `evidencias-pld` | Privado | Capturas de pantalla de consultas a listas (módulo Cumplimiento PLD, futuro) |
| `logos-notaria` | Público de solo lectura | Logo institucional (navbar, reportes — ya consumido como placeholder por `00-layout-shell`) |

Las políticas de Storage siguen el mismo principio que las tablas: los
buckets privados solo son legibles/escribibles por `authenticated`/
`service_role` según corresponda; `logos-notaria` permite `select` público
sin autenticación, pero `insert`/`update`/`delete` solo para
`service_role`.
