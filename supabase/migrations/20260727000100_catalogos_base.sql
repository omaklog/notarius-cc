-- Catálogos base de constitution.md (§3, §4, §6, §7), sembrados por
-- seed.sql. Usa la extensión pgcrypto y el trigger set_updated_at definidos
-- en 20260727000000_init_extensions.sql. Ver data-model.md para el detalle
-- de cada tabla y contracts/supabase-infra-contract.md para la estabilidad
-- de los valores de `codigo`.

-- ============================================================
-- tipos_acto_notarial
-- ============================================================
create table public.tipos_acto_notarial (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on public.tipos_acto_notarial
for each row
execute function public.set_updated_at ();

alter table public.tipos_acto_notarial enable row level security;

create policy "tipos_acto_notarial_select_authenticated" on public.tipos_acto_notarial for select to authenticated using (true);

create policy "tipos_acto_notarial_all_service_role" on public.tipos_acto_notarial for all to service_role using (true)
with
  check (true);

-- ============================================================
-- roles_compareciente
-- ============================================================
create table public.roles_compareciente (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on public.roles_compareciente
for each row
execute function public.set_updated_at ();

alter table public.roles_compareciente enable row level security;

create policy "roles_compareciente_select_authenticated" on public.roles_compareciente for select to authenticated using (true);

create policy "roles_compareciente_all_service_role" on public.roles_compareciente for all to service_role using (true)
with
  check (true);

-- ============================================================
-- roles_usuario
-- ============================================================
create table public.roles_usuario (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on public.roles_usuario
for each row
execute function public.set_updated_at ();

alter table public.roles_usuario enable row level security;

create policy "roles_usuario_select_authenticated" on public.roles_usuario for select to authenticated using (true);

create policy "roles_usuario_all_service_role" on public.roles_usuario for all to service_role using (true)
with
  check (true);

-- ============================================================
-- uma_historico
-- ============================================================
create table public.uma_historico (
  id uuid primary key default gen_random_uuid(),
  valor numeric(10, 2) not null,
  fecha_inicio_vigencia date not null,
  fecha_fin_vigencia date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on public.uma_historico
for each row
execute function public.set_updated_at ();

alter table public.uma_historico enable row level security;

create policy "uma_historico_select_authenticated" on public.uma_historico for select to authenticated using (true);

create policy "uma_historico_all_service_role" on public.uma_historico for all to service_role using (true)
with
  check (true);
