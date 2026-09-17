-- Infraestructura base compartida por todas las tablas de este feature y de
-- módulos futuros: extensión para generar UUIDs, esquema reservado para
-- Cumplimiento PLD/UIF (spec 01-infra-supabase FR-014), y el trigger de
-- auditoría reutilizado por toda tabla (data-model.md).

create extension if not exists pgcrypto;

create schema if not exists pld;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.fn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

