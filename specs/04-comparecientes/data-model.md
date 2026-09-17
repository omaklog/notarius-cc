# Data Model: 04-comparecientes (Catálogo Global y Fiscalización)

Este documento define el modelo relacional detallado, las restricciones de integridad y las políticas de seguridad (RLS) para el catálogo global de comparecientes.

---

## 1. Tipos y Catálogos Base

### Enum `public.tipo_persona_compareciente`

```sql
create type public.tipo_persona_compareciente as enum ('fisica', 'moral');
```

### Tabla `public.tipos_identificacion_oficial`

Catálogo estándar de documentos admisibles para acreditar identidad legal y configuración de lectura OCR.

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Identificador único |
| `codigo` | text | Unique, Not Null | Ej. `ine`, `pasaporte`, `cedula_profesional`, `cartilla`, `forma_migratoria` |
| `nombre` | text | Not Null | Ej. `Credencial para Votar (INE/IFE)`, `Pasaporte Mexicano` |
| `permite_ocr` | boolean | Not Null default false | Habilita el asistente de escaneo OCR multimodal |
| `requiere_reverso` | boolean | Not Null default false | Indica si el asistente solicita 2 caras (ej. INE) o 1 (ej. Pasaporte) |
| `activo` | boolean | Not Null default true | Control operativo y baja lógica |
| `created_at` | timestamptz | Not Null default now() | Auditoría |

### Tabla `public.regimenes_patrimoniales`

Catálogo notarial para regímenes de matrimonio en México.

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | Identificador único |
| `codigo` | text | Unique, Not Null | Ej. `sociedad_conyugal`, `separacion_bienes`, `sociedad_legal` |
| `nombre` | text | Not Null | Nombre legal completo |
| `activo` | boolean | Not Null default true | Control operativo |

---

## 2. Entidad Base: `public.comparecientes`

Evolución de la tabla stub existente mediante `ALTER TABLE`:

```sql
alter table public.comparecientes
  add column if not exists tipo_persona public.tipo_persona_compareciente not null default 'fisica',
  add column if not exists rfc text,
  add column if not exists email text,
  add column if not exists telefono text,
  add column if not exists activo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_by uuid references public.profiles(id);

create unique index if not exists comparecientes_rfc_unique_idx
  on public.comparecientes (rfc)
  where rfc is not null and rfc <> '';
```

---

## 3. Sub-Entidad: `public.compareciente_personas_fisicas`

Almacena los datos civiles y de identificación propios de personas físicas.

```sql
create table public.compareciente_personas_fisicas (
  compareciente_id uuid primary key references public.comparecientes(id) on delete cascade,
  nombres text not null,
  primer_apellido text not null,
  segundo_apellido text,
  curp text,
  fecha_nacimiento date,
  genero text check (genero in ('M', 'F', 'X')),
  pais_nacimiento text not null default 'México',
  nacionalidad text not null default 'Mexicana',
  estado_civil text not null check (estado_civil in ('soltero', 'casado', 'divorciado', 'viudo', 'union_libre')),
  regimen_patrimonial_id uuid references public.regimenes_patrimoniales(id) on delete restrict,
  ocupacion text,
  tipo_identificacion_id uuid references public.tipos_identificacion_oficial(id) on delete restrict,
  folio_identificacion text,
  vigencia_identificacion date,
  calle text,
  numero_exterior text,
  numero_interior text,
  colonia text,
  codigo_postal text,
  municipio text,
  entidad_federativa text,
  pais text not null default 'México',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists compareciente_pf_curp_unique_idx
  on public.compareciente_personas_fisicas (curp)
  where curp is not null and curp <> '';
```

**Constraint de Negocio**: Si `estado_civil = 'casado'`, `regimen_patrimonial_id` no puede ser nulo (validado mediante trigger).

---

## 4. Sub-Entidad: `public.compareciente_personas_morales`

Almacena la personalidad jurídica e instrumentos de personas morales.

```sql
create table public.compareciente_personas_morales (
  compareciente_id uuid primary key references public.comparecientes(id) on delete cascade,
  razon_social text not null,
  fecha_constitucion date,
  nacionalidad text not null default 'Mexicana',
  folio_mercantil text,
  instrumento_constitutivo text,
  fecha_instrumento date,
  notario_constitucion text,
  plaza_constitucion text,
  objeto_social text,
  calle text,
  numero_exterior text,
  numero_interior text,
  colonia text,
  codigo_postal text,
  municipio text,
  entidad_federativa text,
  pais text not null default 'México',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 5. Representantes Legales y Apoderados

```sql
create table public.compareciente_representantes (
  id uuid primary key default gen_random_uuid(),
  persona_moral_id uuid not null references public.comparecientes(id) on delete cascade,
  representante_fisica_id uuid not null references public.comparecientes(id) on delete restrict,
  tipo_facultades text not null,
  instrumento_poder text,
  fecha_poder date,
  notario_poder text,
  vigente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (persona_moral_id, representante_fisica_id, tipo_facultades)
);
```

---

## 6. Beneficiarios Controladores (Art. 32-B Quater CFF)

```sql
create table public.compareciente_beneficiarios_controladores (
  id uuid primary key default gen_random_uuid(),
  persona_moral_id uuid not null references public.comparecientes(id) on delete cascade,
  beneficiario_fisica_id uuid not null references public.comparecientes(id) on delete restrict,
  porcentaje_participacion numeric(5, 2) check (porcentaje_participacion > 0 and porcentaje_participacion <= 100),
  criterio_control text not null check (criterio_control in ('titularidad_acciones', 'derechos_voto', 'designacion_directores', 'control_de_hecho')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (persona_moral_id, beneficiario_fisica_id)
);
```

---

## 7. RLS y Autorización

Todas las tablas nuevas habilitan RLS:
- `SELECT`: Abierto a usuarios con `fn_has_permiso('comparecientes', 'ver')` (alcance `todas` para Gestor/Admin; alcance `propias` restringido a comparecientes vinculados a sus escrituras o en búsqueda general).
- `INSERT` / `UPDATE`: Usuarios con permiso `comparecientes.crear` o `comparecientes.editar`.
- `DELETE`: Exclusivo de usuarios con permiso `comparecientes.eliminar`, bloqueado si el compareciente tiene vínculos en `escritura_comparecientes`.

---

## 8. Repositorio Documental: `public.expediente_documentos`

Almacena metadatos y rutas de almacenamiento físico en Supabase Storage para identificaciones oficiales y documentos notariales.

```sql
create table public.expediente_documentos (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null check (entidad_tipo in ('compareciente', 'escritura')),
  entidad_id uuid not null,
  categoria text not null check (categoria in ('identificacion_oficial', 'comprobante_domicilio', 'acta_constitutiva', 'poder_notarial', 'otro')),
  lado text check (lado in ('anverso', 'reverso', 'completo')),
  archivo_nombre text not null,
  archivo_path text not null,
  mime_type text not null,
  size_bytes bigint,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists idx_expediente_docs_entidad 
  on public.expediente_documentos (entidad_tipo, entidad_id);
```

---

## 9. Vista Dinámica: `public.v_expediente_escritura`

Proyecta en tiempo real y sin duplicar archivos los documentos propios de una escritura junto con las identificaciones oficiales de sus comparecientes activos.

```sql
create or replace view public.v_expediente_escritura as
select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.created_at,
  e.id as escritura_id,
  'escritura' as origen_documento,
  null::uuid as compareciente_id,
  null::text as compareciente_nombre
from public.expediente_documentos d
join public.escrituras e on d.entidad_id = e.id and d.entidad_tipo = 'escritura'

union all

select 
  d.id as documento_id,
  d.entidad_tipo,
  d.entidad_id,
  d.categoria,
  d.lado,
  d.archivo_nombre,
  d.archivo_path,
  d.mime_type,
  d.size_bytes,
  d.created_at,
  ec.escritura_id,
  'compareciente' as origen_documento,
  c.id as compareciente_id,
  coalesce(trim(pf.nombres || ' ' || pf.primer_apellido || ' ' || coalesce(pf.segundo_apellido, '')), pm.razon_social) as compareciente_nombre
from public.expediente_documentos d
join public.comparecientes c on d.entidad_id = c.id and d.entidad_tipo = 'compareciente'
join public.escritura_comparecientes ec on ec.compareciente_id = c.id
left join public.compareciente_personas_fisicas pf on pf.compareciente_id = c.id
left join public.compareciente_personas_morales pm on pm.compareciente_id = c.id;
```

---

## 10. Especificación de Seeder Inicial

Configuración por defecto precargada para `public.tipos_identificacion_oficial`:

```sql
insert into public.tipos_identificacion_oficial (codigo, nombre, permite_ocr, requiere_reverso, activo) values
  ('ine', 'Credencial para Votar (INE/IFE)', true, true, true),
  ('pasaporte', 'Pasaporte Mexicano o Extranjero', true, false, true),
  ('cedula_profesional', 'Cédula Profesional', false, false, true),
  ('cartilla_militar', 'Cartilla del Servicio Militar Nacional', false, false, true),
  ('forma_migratoria', 'Forma Migratoria (FM2 / FM3 / Residencia)', false, false, true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  permite_ocr = excluded.permite_ocr,
  requiere_reverso = excluded.requiere_reverso,
  activo = excluded.activo;
```

