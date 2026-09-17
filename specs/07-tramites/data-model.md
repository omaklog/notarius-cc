# Data Model: 07-tramites — Trámites Notariales, Fases Procesales, Dependencias y Bitácora Histórica

**Feature**: `07-tramites`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Diagrama Entidad-Relación

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│      cat_dependencias_oficiales      │        │          cat_pasos_tramite           │
├──────────────────────────────────────┤        ├──────────────────────────────────────┤
│ id (PK UUID)                         │1      N│ id (PK INTEGER)                      │
│ sigla (UNIQUE: NOTARIA, RPP...)      │◀───────│ dependencia_id (FK UUID)             │
│ nombre (TEXT)                        │        │ dependencia_clave (INT: 0..5)        │
│ clave_numerica (INT UNIQUE: 0..5)    │        │ nombre (TEXT: ING. CAT. EST., etc.)  │
│ dias_habiles_compromiso (INT DEFAULT)│        │ orden (INT: 1..17)                   │
│ activo (BOOLEAN DEFAULT TRUE)        │        │ genera_orden_pago (BOOLEAN DEFAULT F)│
│ portal_web (TEXT)                    │        │ activo (BOOLEAN DEFAULT TRUE)        │
└──────────────────┬───────────────────┘        └──────────────────┬───────────────────┘
                   │1                                              │1
                   │                                               │
                   │N                                              │N
┌──────────────────┴───────────────────────────────────────────────┴───────────────────┐
│                    tramite_pasos_escritura (Bitácora Histórica)                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ id (PK UUID gen_random_uuid())                                                       │
│ escritura_id (FK UUID -> escrituras.id ON DELETE CASCADE)                            │
│ paso_id (FK INT -> cat_pasos_tramite.id ON DELETE CASCADE)                           │
│ dependencia_clave (INT: 0..5)                                                        │
│ dependencia_id (FK UUID -> cat_dependencias_oficiales.id ON DELETE SET NULL)         │
│ folio_volante (TEXT NULL - número de ticket, volante o rechazo)                      │
│ notas (TEXT NULL - causas de prevención, requisitos faltantes o acuses)              │
│ orden_pago_id (FK UUID -> ordenes_pago.id ON DELETE SET NULL)                        │
│ completado_por (FK UUID -> profiles.id ON DELETE SET NULL)                           │
│ fecha_registro (TIMESTAMPTZ NOT NULL DEFAULT now())                                  │
│ created_at (TIMESTAMPTZ NOT NULL DEFAULT now())                                      │
│ updated_at (TIMESTAMPTZ NOT NULL DEFAULT now())                                      │
│ *Nota: Sin restricción UNIQUE(escritura_id, paso_id) para soportar eventos repetibles │
└──────────────────────────────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                    v_tramite_dependencias_resumen (Vista Agregada)                   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Provee para cada (escritura_id, dependencia_clave):                                  │
│ - Dependencia oficial (nombre, sigla, ícono, días compromiso)                        │
│ - Total de movimientos registrados en esa ventanilla                                 │
│ - Último paso alcanzado (paso_nombre, fecha_registro, folio_volante, notas, gestor)  │
│ - Estado consolidado (concluido, rechazo_pendiente, en_proceso)                      │
│ - Bandera de orden de pago asociada o pendiente                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Definición de Tablas y Esquemas

### 2.1. Tabla `cat_dependencias_oficiales`
Catálogo maestro de autoridades y oficinas donde se radican gestiones notariales.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | uuid | NOT NULL | Identificador único PK (`gen_random_uuid()`) |
| `sigla` | text | NOT NULL UNIQUE | Sigla oficial (`NOTARIA`, `CATASTRO_EST`, `CATASTRO_MUN`, `RPP`, `CONTROL_INT`, `INFONAVIT`) |
| `nombre` | text | NOT NULL | Nombre oficial descriptivo de la institución |
| `clave_numerica` | integer | NULL UNIQUE | Clave numérica de correspondencia (0=Notaría, 1=Catastro Est., 2=Catastro Mun., 3=RPP, 4=Control Int., 5=Infonavit) |
| `direccion` | text | NULL | Ubicación de la ventanilla física |
| `portal_web` | text | NULL | URL del portal oficial de consulta de folios |
| `dias_habiles_compromiso` | integer | NOT NULL DEFAULT 10 | Plazo legal/compromiso de respuesta |
| `activo` | boolean | NOT NULL DEFAULT true | Estatus vigente |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Fecha de alta |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Fecha de actualización |

### 2.2. Tabla `cat_pasos_tramite`
Catálogo maestro administrable de pasos del pipeline de gestoría.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | integer | NOT NULL | Identificador único numérico (1 a 17 en seeder base) |
| `nombre` | text | NOT NULL | Nombre formal del paso (e.g. `ING. CAT. EST.`, `RECHAZO R.P.P.`, `O.P. CAT. EST.`) |
| `orden` | integer | NOT NULL | Secuencia ordinal sugerida (1 a 17) |
| `dependencia_clave` | integer | NOT NULL | Clave numérica de la dependencia asignada (0..5) |
| `dependencia_id` | uuid | NULL | FK a `cat_dependencias_oficiales(id)` ON DELETE SET NULL |
| `genera_orden_pago` | boolean | NOT NULL DEFAULT false | Si el paso deriva en el registro de cobro/pago de derechos oficiales |
| `activo` | boolean | NOT NULL DEFAULT true | Permite deshabilitar pasos obsoletos sin romper historial |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Auditoría |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Auditoría |

### 2.3. Tabla `tramite_pasos_escritura` (Bitácora Histórica Cronológica)
Registra cada evento o movimiento procesal ocurrido en ventanilla para una escritura y autoridad.

| Columna | Tipo | Nulo | Descripción |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK identificador único del evento (`gen_random_uuid()`) |
| `escritura_id` | uuid | NOT NULL | FK a `escrituras(id)` ON DELETE CASCADE |
| `paso_id` | integer | NOT NULL | FK a `cat_pasos_tramite(id)` ON DELETE CASCADE |
| `dependencia_clave` | integer | NOT NULL | Clave de la dependencia asociada (para índices rápidos) |
| `dependencia_id` | uuid | NULL | FK a `cat_dependencias_oficiales(id)` ON DELETE SET NULL |
| `folio_volante` | text | NULL | Número oficial de volante, ticket de entrada o folio de rechazo |
| `notas` | text | NULL | Observaciones, requisitos faltantes o notas de subsanación |
| `orden_pago_id` | uuid | NULL | FK a `ordenes_pago(id)` ON DELETE SET NULL (enlace módulo 08) |
| `completado_por` | uuid | NULL | FK a `profiles(id)` del usuario que ejecutó o registró el evento |
| `fecha_registro` | timestamptz | NOT NULL DEFAULT now() | Fecha y hora en que ocurrió el movimiento de ventanilla |
| `created_at` | timestamptz | NOT NULL DEFAULT now() | Fecha de inserción en el sistema |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() | Fecha de última modificación |

> [!NOTE]
> **Sin restricción UNIQUE(escritura_id, paso_id)**: A diferencia de un checklist lineal que se llena una sola vez, la bitácora permite registrar `ING. CAT. EST.` $\to$ `RECHAZO CAT. EST.` $\to$ `ING. CAT. EST.` $\to$ etc., preservando la trazabilidad cronológica completa de la ventanilla.

---

## 3. Vistas de Base de Datos

### 3.1. Vista `v_tramite_pasos_historial`
Despliega todos los eventos históricos registrados cronológicamente por escritura y dependencia, listos para alimentar el acordeón desplegable:

```sql
create or replace view public.v_tramite_pasos_historial as
select
  tpe.id as registro_id,
  tpe.escritura_id,
  tpe.paso_id,
  cpt.nombre as paso_nombre,
  cpt.orden as paso_orden,
  cpt.genera_orden_pago,
  tpe.dependencia_clave,
  coalesce(tpe.dependencia_id, cdo.id) as dependencia_id,
  cdo.sigla as dependencia_sigla,
  cdo.nombre as dependencia_nombre,
  tpe.folio_volante,
  tpe.notas,
  tpe.fecha_registro,
  tpe.completado_por,
  u.nombre_completo as completado_por_nombre,
  tpe.orden_pago_id,
  op.folio as orden_pago_folio,
  op.monto as orden_pago_monto,
  op.estado as orden_pago_estado,
  op.linea_captura as orden_pago_linea_captura
from public.tramite_pasos_escritura tpe
join public.cat_pasos_tramite cpt on cpt.id = tpe.paso_id
left join public.cat_dependencias_oficiales cdo on (cdo.id = tpe.dependencia_id or cdo.clave_numerica = tpe.dependencia_clave)
left join public.profiles u on u.id = tpe.completado_por
left join public.ordenes_pago op on op.id = tpe.orden_pago_id
order by tpe.fecha_registro desc, tpe.created_at desc;
```

### 3.2. Vista `v_tramite_dependencias_resumen`
Determina para cada escritura las dependencias activas y el último paso alcanzado:

```sql
create or replace view public.v_tramite_dependencias_resumen as
with ranked_pasos as (
  select
    tpe.*,
    cpt.nombre as paso_nombre,
    cpt.genera_orden_pago,
    cdo.sigla as dep_sigla,
    cdo.nombre as dep_nombre,
    cdo.dias_habiles_compromiso as dep_dias_habiles,
    u.nombre_completo as responsable_nombre,
    row_number() over (
      partition by tpe.escritura_id, tpe.dependencia_clave 
      order by tpe.fecha_registro desc, tpe.created_at desc
    ) as rn
  from public.tramite_pasos_escritura tpe
  join public.cat_pasos_tramite cpt on cpt.id = tpe.paso_id
  left join public.cat_dependencias_oficiales cdo on (cdo.id = tpe.dependencia_id or cdo.clave_numerica = tpe.dependencia_clave)
  left join public.profiles u on u.id = tpe.completado_por
)
select
  escritura_id,
  dependencia_clave,
  dependencia_id,
  dep_sigla as dependencia_sigla,
  dep_nombre as dependencia_nombre,
  dep_dias_habiles as dependencia_dias_habiles,
  paso_id as ultimo_paso_id,
  paso_nombre as ultimo_paso_nombre,
  folio_volante as ultimo_folio_volante,
  notas as ultimas_notas,
  fecha_registro as ultima_fecha_registro,
  completado_por as ultimo_responsable_id,
  responsable_nombre as ultimo_responsable_nombre,
  orden_pago_id as ultima_orden_pago_id,
  genera_orden_pago as ultimo_genera_orden_pago,
  (select count(*)::int from public.tramite_pasos_escritura sub 
   where sub.escritura_id = ranked_pasos.escritura_id and sub.dependencia_clave = ranked_pasos.dependencia_clave) as total_movimientos
from ranked_pasos
where rn = 1;
```

---

## 4. Políticas de Seguridad (RLS)

- `cat_dependencias_oficiales`: Lectura pública (`anon`, `authenticated`); gestión por usuarios autenticados con rol de administrador.
- `cat_pasos_tramite`: Lectura pública (`anon`, `authenticated`); modificación restringida a `authenticated`.
- `tramite_pasos_escritura`:
  - `select`: permitido para usuarios autenticados.
  - `insert`, `update`, `delete`: permitido para usuarios autenticados.
- Grants explícitos a roles `authenticated`, `service_role` y lectura a `anon`.
