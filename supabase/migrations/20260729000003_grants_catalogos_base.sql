-- Asegura que los catálogos públicos sean legibles por anon, authenticated y service_role
GRANT SELECT ON public.actos_juridicos TO anon, authenticated, service_role;
GRANT SELECT ON public.roles_compareciente TO anon, authenticated, service_role;
GRANT SELECT ON public.acto_juridico_roles TO anon, authenticated, service_role;

-- Política de lectura para usuarios anónimos en catálogo de actos jurídicos si aún no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'actos_juridicos' AND policyname = 'actos_juridicos_select_anon'
  ) THEN
    CREATE POLICY "actos_juridicos_select_anon" ON public.actos_juridicos FOR SELECT TO anon USING (activo = true);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
