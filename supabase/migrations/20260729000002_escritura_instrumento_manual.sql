-- Migración: Permitir captura manual y libre de instrumento y volumen en escrituras
create or replace function public.fn_asignar_instrumento () returns trigger language plpgsql as $$
begin
  new.anio := coalesce(new.anio, extract(year from now())::integer);
  if new.instrumento is null or new.instrumento <= 0 then
    new.instrumento := public.fn_siguiente_instrumento(new.anio);
  end if;
  return new;
end;
$$;

-- Asegurar restricción de unicidad global de instrumento en escrituras
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'escrituras_instrumento_key'
  ) then
    alter table public.escrituras add constraint escrituras_instrumento_key unique (instrumento);
  end if;
exception
  when others then null;
end;
$$;

notify pgrst, 'reload schema';
