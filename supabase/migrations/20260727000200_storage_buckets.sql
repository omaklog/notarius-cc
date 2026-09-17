-- Buckets de Storage iniciales (spec 01-infra-supabase FR-008/FR-009).
-- expedientes y evidencias-pld son privados (solo authenticated/service_role);
-- logos-notaria es público de solo lectura (ver data-model.md).

insert into
  storage.buckets (id, name, public)
values
  ('expedientes', 'expedientes', false),
  ('evidencias-pld', 'evidencias-pld', false),
  ('logos-notaria', 'logos-notaria', true)
on conflict (id) do nothing;

-- ============================================================
-- expedientes (privado)
-- ============================================================
create policy "expedientes_all_authenticated" on storage.objects for all to authenticated using (bucket_id = 'expedientes')
with
  check (bucket_id = 'expedientes');

-- ============================================================
-- evidencias-pld (privado)
-- ============================================================
create policy "evidencias_pld_all_authenticated" on storage.objects for all to authenticated using (bucket_id = 'evidencias-pld')
with
  check (bucket_id = 'evidencias-pld');

-- ============================================================
-- logos-notaria (público de solo lectura)
-- ============================================================
create policy "logos_notaria_select_public" on storage.objects for select to public using (bucket_id = 'logos-notaria');

create policy "logos_notaria_write_service_role" on storage.objects for all to service_role using (bucket_id = 'logos-notaria')
with
  check (bucket_id = 'logos-notaria');
