-- Migration: 20260809000000_predios_georreferenciacion.sql
-- Feature 09: Georreferenciación de Predios e Inmuebles Notariales

create table if not exists public.predios (
  id uuid primary key default gen_random_uuid(),
  escritura_id uuid not null references public.escrituras(id) on delete cascade,
  etiqueta varchar(100) not null default 'Predio Principal',
  descripcion text,
  superficie_terreno_m2 numeric(14, 2),
  superficie_declarada_m2 numeric(14, 2),
  geometria jsonb not null,
  centroide jsonb,
  colindancias jsonb not null default '[]'::jsonb,
  foto_fachada_url text,
  foto_fachada_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_predios_escritura_id on public.predios(escritura_id);
create index if not exists idx_predios_created_at on public.predios(created_at);

-- Trigger de updated_at
drop trigger if exists trg_predios_updated_at on public.predios;
create trigger trg_predios_updated_at
  before update on public.predios
  for each row execute function public.fn_set_updated_at();

-- Seguridad RLS y Permisos
alter table public.predios enable row level security;

drop policy if exists "predios_all_access" on public.predios;
create policy "predios_all_access" on public.predios
  for all using (true) with check (true);

grant all on public.predios to authenticated, anon, service_role;

-- Registro del tipo de documento opcional para fotografía de fachada en expedientes
insert into public.cat_tipos_documento_notarial (
  codigo,
  nombre,
  categoria,
  descripcion,
  requiere_cotejo_fisico,
  activo
) values (
  'FOTOGRAFIA_FACHADA',
  'Fotografía de Fachada y Acceso del Inmueble',
  'inmueble',
  'Testigo fotográfico del inmueble georreferenciado anexado al expediente digital del instrumento.',
  false,
  true
) on conflict (codigo) do nothing;
