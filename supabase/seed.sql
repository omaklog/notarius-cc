-- Datos base para que el entorno local sea usable de inmediato tras
-- `supabase db reset` (spec 01-infra-supabase FR-007). Valores
-- representativos de arranque, no el catálogo oficial definitivo — su
-- curaduría final es responsabilidad del futuro módulo de Administración
-- General (ver research.md #3 y la sección Assumptions de spec.md).

-- ============================================================
-- actos_juridicos (catálogo base provisto por la notaría)
-- ============================================================
insert into
  public.actos_juridicos (numero, nombre, tipo, es_actividad_vulnerable)
values
  (1, 'COMPRAVENTA', 'traslativo', true),
  (2, 'DONACION', 'traslativo', true),
  (3, 'PERMUTA', 'traslativo', true),
  (4, 'CESION DE DERECHOS', 'traslativo', true),
  (5, 'ADJ. TESTAMENTARIA', 'traslativo', true),
  (6, 'ADJ. INTESTAMENTARIA', 'traslativo', true),
  (7, 'COMPRAVENTA Y CREDITO', 'traslativo', true),
  (8, 'SOCIEDADES', 'no_traslativo', true),
  (9, 'PODERES', 'no_traslativo', true),
  (10, 'CERTIFICACIONES', 'no_traslativo', false),
  (11, 'FE DE HECHOS', 'no_traslativo', false),
  (12, 'CONVENIOS', 'no_traslativo', false),
  (13, 'TESTAMENTO', 'no_traslativo', false),
  (14, 'INFORMACION TESTIMONIAL', 'no_traslativo', false),
  (15, 'MUTUOS', 'no_traslativo', true),
  (16, 'COMPARECENCIA Y CERT.', 'no_traslativo', false),
  (17, 'APERTURA DE CREDITO', 'no_traslativo', true),
  (18, 'CANCELACION DE HIPOTECA', 'no_traslativo', false),
  (19, 'CONTRATO DE ARRENDAMIENTO', 'no_traslativo', false),
  (20, 'CAPITULACIONES MATRIMONIALES', 'no_traslativo', false),
  (21, 'ASOCIACION CIVIL', 'no_traslativo', true),
  (22, 'PROTOCOLIZACIONES', 'no_traslativo', true),
  (23, 'RESCISION DE CONTRATO', 'no_traslativo', false),
  (24, 'SUBDIVISIÓN', 'no_traslativo', false),
  (25, 'RECTIFICACION DE MEDIDAS', 'no_traslativo', false),
  (26, 'DACION EN PAGO', 'traslativo', true),
  (27, 'DIV. DE COP. O DISOLUCION', 'traslativo', true),
  (28, 'ADJUDICACION', 'traslativo', true),
  (29, 'DISOLUCION DE MANCOMUNIDAD', 'no_traslativo', false),
  (30, 'CONDOMINIO', 'no_traslativo', false),
  (31, 'CANCELACION DE RESERVA DE USUFRUCTO', 'no_traslativo', false),
  (32, 'FUSION', 'no_traslativo', true),
  (33, 'REVOCACION DE PODER', 'no_traslativo', false),
  (34, 'CONSTITUCION DE SERVIDUMBRE', 'no_traslativo', true),
  (35, 'SUCESIÓN TESTAMENTARIA', 'no_traslativo', false),
  (36, 'RECONOCIMIENTO DE ADEUDO', 'no_traslativo', true),
  (37, 'CANCELACION DE RESERVA DE DOMINIO', 'no_traslativo', false)
on conflict (nombre) do update set
  numero = excluded.numero,
  tipo = excluded.tipo,
  es_actividad_vulnerable = excluded.es_actividad_vulnerable;

-- ============================================================
-- roles_compareciente (catálogo base notarial)
-- ============================================================
insert into
  public.roles_compareciente (codigo, nombre)
values
  ('adquiriente', 'ADQUIRIENTE'),
  ('enajenante', 'ENAJENANTE'),
  ('donatario', 'DONATARIO'),
  ('donante', 'DONANTE'),
  ('permutante', 'PERMUTANTE'),
  ('permutuario', 'PERMUTUARIO'),
  ('cedente', 'CEDENTE'),
  ('cesionario', 'CESIONARIO'),
  ('albacea', 'ALBACEA'),
  ('herederos', 'HEREDEROS'),
  ('heredero', 'HEREDERO'),
  ('vendedor', 'VENDEDOR'),
  ('comprador_deudor', 'COMPRADOR/DEUDOR'),
  ('acreedor', 'ACREEDOR'),
  ('deudor', 'DEUDOR'),
  ('compareciente', 'COMPARECIENTE'),
  ('poderdante', 'PODERDANTE'),
  ('apoderado', 'APODERADO'),
  ('testador', 'TESTADOR'),
  ('mutuante', 'MUTUANTE'),
  ('mutuatario', 'MUTUATARIO'),
  ('arrendatario', 'ARRENDATARIO'),
  ('arrendador', 'ARRENDADOR'),
  ('asociado', 'ASOCIADO'),
  ('extinto', 'EXTINTO'),
  ('propietario', 'PROPIETARIO'),
  ('testigo', 'TESTIGO'),
  ('representante_legal', 'REPRESENTANTE LEGAL'),
  ('otorgante', 'OTORGANTE')
on conflict (codigo) do update set
  nombre = excluded.nombre;

-- ============================================================
-- acto_juridico_roles (matriz relacional de roles permitidos por acto)
-- ============================================================
with pares (acto_num, rol_cod) as (
  values
    (1, 'adquiriente'),
    (1, 'enajenante'),
    (2, 'donatario'),
    (2, 'donante'),
    (3, 'permutante'),
    (3, 'permutuario'),
    (4, 'cedente'),
    (4, 'cesionario'),
    (5, 'albacea'),
    (5, 'herederos'),
    (5, 'extinto'),
    (6, 'albacea'),
    (6, 'herederos'),
    (7, 'vendedor'),
    (7, 'comprador_deudor'),
    (7, 'acreedor'),
    (7, 'deudor'),
    (8, 'compareciente'),
    (9, 'poderdante'),
    (9, 'apoderado'),
    (10, 'compareciente'),
    (11, 'compareciente'),
    (12, 'compareciente'),
    (13, 'testador'),
    (13, 'heredero'),
    (14, 'compareciente'),
    (15, 'mutuante'),
    (15, 'mutuatario'),
    (16, 'compareciente'),
    (17, 'acreedor'),
    (17, 'deudor'),
    (18, 'acreedor'),
    (18, 'deudor'),
    (19, 'arrendatario'),
    (19, 'arrendador'),
    (20, 'compareciente'),
    (21, 'asociado'),
    (22, 'compareciente'),
    (23, 'compareciente'),
    (24, 'compareciente'),
    (25, 'compareciente'),
    (26, 'cedente'),
    (26, 'cesionario'),
    (27, 'compareciente'),
    (28, 'enajenante'),
    (28, 'adquiriente'),
    (29, 'propietario'),
    (31, 'compareciente'),
    (37, 'compareciente')
)
insert into public.acto_juridico_roles (acto_juridico_id, rol_compareciente_id)
select aj.id, rc.id
from pares p
join public.actos_juridicos aj on aj.numero = p.acto_num
join public.roles_compareciente rc on rc.codigo = p.rol_cod
on conflict (acto_juridico_id, rol_compareciente_id) do nothing;


-- ============================================================
-- uma_historico (constitution.md §6)
-- PLACEHOLDER: valor y vigencia de ejemplo para desarrollo. El valor
-- oficial vigente debe cargarse manualmente por Administración General
-- cuando ese módulo exista (actualización anual, sin API oficial confiable).
-- ============================================================
insert into
  public.uma_historico (valor, fecha_inicio_vigencia, fecha_fin_vigencia)
values
  (108.57, '2025-02-01', null);

-- ============================================================
-- permisos (catálogo completo — spec 02-usuarios-roles, sección 4 del input)
-- ============================================================
insert into
  public.permisos (modulo, accion, descripcion, requiere_alcance)
values
  ('escrituras', 'ver', 'Ver escrituras', true),
  ('escrituras', 'crear', 'Crear escrituras', true),
  ('escrituras', 'editar', 'Editar escrituras', true),
  ('escrituras', 'eliminar', 'Eliminar escrituras', true),
  ('escrituras', 'anular', 'Anular escrituras', true),
  (
    'escrituras',
    'reasignar_responsable',
    'Reasignar el responsable de una escritura',
    true
  ),
  ('comparecientes', 'ver', 'Ver comparecientes', true),
  ('comparecientes', 'crear', 'Crear comparecientes', true),
  ('comparecientes', 'editar', 'Editar comparecientes', true),
  ('comparecientes', 'eliminar', 'Eliminar comparecientes', true),
  ('pld', 'ver', 'Ver registros de Cumplimiento PLD', true),
  ('pld', 'crear', 'Crear registros de Cumplimiento PLD', true),
  ('pld', 'editar', 'Editar registros de Cumplimiento PLD', true),
  ('pld', 'eliminar', 'Eliminar registros de Cumplimiento PLD', true),
  ('pld', 'levantar_bloqueo', 'Levantar un bloqueo de Cumplimiento PLD', true),
  ('expedientes', 'ver', 'Ver expedientes', true),
  ('expedientes', 'crear', 'Crear expedientes', true),
  ('expedientes', 'editar', 'Editar expedientes', true),
  ('expedientes', 'eliminar', 'Eliminar expedientes', true),
  ('tramites', 'ver', 'Ver trámites', true),
  ('tramites', 'crear', 'Crear trámites', true),
  ('tramites', 'editar', 'Editar trámites', true),
  ('tramites', 'eliminar', 'Eliminar trámites', true),
  ('avisos_sat', 'ver', 'Ver avisos SAT/UIF', true),
  ('avisos_sat', 'crear', 'Crear avisos SAT/UIF', true),
  ('avisos_sat', 'editar', 'Editar avisos SAT/UIF', true),
  ('avisos_sat', 'eliminar', 'Eliminar avisos SAT/UIF', true),
  (
    'avisos_sat',
    'marcar_presentado',
    'Marcar un aviso SAT/UIF como presentado',
    true
  ),
  ('ordenes_pago', 'ver', 'Ver órdenes de pago', true),
  ('ordenes_pago', 'crear', 'Crear órdenes de pago', true),
  ('ordenes_pago', 'editar', 'Editar órdenes de pago', true),
  ('ordenes_pago', 'eliminar', 'Eliminar órdenes de pago', true),
  ('honorarios', 'ver', 'Ver honorarios', true),
  ('honorarios', 'crear', 'Crear honorarios', true),
  ('honorarios', 'editar', 'Editar honorarios', true),
  ('honorarios', 'eliminar', 'Eliminar honorarios', true),
  (
    'honorarios',
    'modificar_monto_pactado',
    'Modificar el monto pactado de honorarios',
    true
  ),
  ('georreferenciacion', 'ver', 'Ver georreferenciación', true),
  ('georreferenciacion', 'crear', 'Crear georreferenciación', true),
  ('georreferenciacion', 'editar', 'Editar georreferenciación', true),
  ('georreferenciacion', 'eliminar', 'Eliminar georreferenciación', true),
  ('notificaciones', 'ver', 'Ver notificaciones', false),
  ('notificaciones', 'reenviar', 'Reenviar notificaciones', false),
  (
    'notificaciones',
    'configurar_plantillas',
    'Configurar plantillas de notificaciones',
    false
  ),
  ('reportes', 'ver_operativos', 'Ver reportes operativos', false),
  ('reportes', 'ver_financieros', 'Ver reportes financieros', false),
  ('administracion', 'acceso', 'Acceso a Administración General', false);

-- ============================================================
-- roles (configuración inicial — 100% editable después, spec Assumptions)
-- ============================================================
insert into
  public.roles (
    nombre,
    descripcion,
    es_sistema,
    es_predeterminado_invitacion
  )
values
  (
    'Administrador',
    'Acceso completo al sistema, incluida Administración General',
    true,
    false
  ),
  (
    'Auxiliar',
    'Trabaja principalmente sobre sus propias escrituras',
    true,
    true
  ),
  (
    'Gestor',
    'Visibilidad y gestión operativa cruzada entre escrituras',
    true,
    false
  );

-- ============================================================
-- rol_permisos (asignación inicial por rol, spec.md → Assumptions)
-- ============================================================
with
  rp (rol_nombre, modulo, accion, alcance) as (
    values
      -- Administrador: todo el catálogo, alcance 'todas' donde aplica
      ('Administrador', 'escrituras', 'ver', 'todas'),
      ('Administrador', 'escrituras', 'crear', 'todas'),
      ('Administrador', 'escrituras', 'editar', 'todas'),
      ('Administrador', 'escrituras', 'eliminar', 'todas'),
      ('Administrador', 'escrituras', 'anular', 'todas'),
      (
        'Administrador',
        'escrituras',
        'reasignar_responsable',
        'todas'
      ),
      ('Administrador', 'comparecientes', 'ver', 'todas'),
      ('Administrador', 'comparecientes', 'crear', 'todas'),
      ('Administrador', 'comparecientes', 'editar', 'todas'),
      ('Administrador', 'comparecientes', 'eliminar', 'todas'),
      ('Administrador', 'pld', 'ver', 'todas'),
      ('Administrador', 'pld', 'crear', 'todas'),
      ('Administrador', 'pld', 'editar', 'todas'),
      ('Administrador', 'pld', 'eliminar', 'todas'),
      ('Administrador', 'pld', 'levantar_bloqueo', 'todas'),
      ('Administrador', 'expedientes', 'ver', 'todas'),
      ('Administrador', 'expedientes', 'crear', 'todas'),
      ('Administrador', 'expedientes', 'editar', 'todas'),
      ('Administrador', 'expedientes', 'eliminar', 'todas'),
      ('Administrador', 'tramites', 'ver', 'todas'),
      ('Administrador', 'tramites', 'crear', 'todas'),
      ('Administrador', 'tramites', 'editar', 'todas'),
      ('Administrador', 'tramites', 'eliminar', 'todas'),
      ('Administrador', 'avisos_sat', 'ver', 'todas'),
      ('Administrador', 'avisos_sat', 'crear', 'todas'),
      ('Administrador', 'avisos_sat', 'editar', 'todas'),
      ('Administrador', 'avisos_sat', 'eliminar', 'todas'),
      (
        'Administrador',
        'avisos_sat',
        'marcar_presentado',
        'todas'
      ),
      ('Administrador', 'ordenes_pago', 'ver', 'todas'),
      ('Administrador', 'ordenes_pago', 'crear', 'todas'),
      ('Administrador', 'ordenes_pago', 'editar', 'todas'),
      ('Administrador', 'ordenes_pago', 'eliminar', 'todas'),
      ('Administrador', 'honorarios', 'ver', 'todas'),
      ('Administrador', 'honorarios', 'crear', 'todas'),
      ('Administrador', 'honorarios', 'editar', 'todas'),
      ('Administrador', 'honorarios', 'eliminar', 'todas'),
      (
        'Administrador',
        'honorarios',
        'modificar_monto_pactado',
        'todas'
      ),
      ('Administrador', 'georreferenciacion', 'ver', 'todas'),
      ('Administrador', 'georreferenciacion', 'crear', 'todas'),
      ('Administrador', 'georreferenciacion', 'editar', 'todas'),
      ('Administrador', 'georreferenciacion', 'eliminar', 'todas'),
      ('Administrador', 'notificaciones', 'ver', null),
      ('Administrador', 'notificaciones', 'reenviar', null),
      (
        'Administrador',
        'notificaciones',
        'configurar_plantillas',
        null
      ),
      ('Administrador', 'reportes', 'ver_operativos', null),
      ('Administrador', 'reportes', 'ver_financieros', null),
      ('Administrador', 'administracion', 'acceso', null),
      -- Auxiliar
      ('Auxiliar', 'escrituras', 'ver', 'propias'),
      ('Auxiliar', 'escrituras', 'crear', 'propias'),
      ('Auxiliar', 'escrituras', 'editar', 'propias'),
      ('Auxiliar', 'comparecientes', 'ver', 'propias'),
      ('Auxiliar', 'comparecientes', 'crear', 'propias'),
      ('Auxiliar', 'comparecientes', 'editar', 'propias'),
      ('Auxiliar', 'comparecientes', 'eliminar', 'propias'),
      ('Auxiliar', 'pld', 'ver', 'todas'),
      ('Auxiliar', 'pld', 'crear', 'todas'),
      ('Auxiliar', 'expedientes', 'ver', 'propias'),
      ('Auxiliar', 'expedientes', 'crear', 'propias'),
      ('Auxiliar', 'expedientes', 'editar', 'propias'),
      ('Auxiliar', 'expedientes', 'eliminar', 'propias'),
      ('Auxiliar', 'tramites', 'ver', 'propias'),
      ('Auxiliar', 'tramites', 'crear', 'propias'),
      ('Auxiliar', 'tramites', 'editar', 'propias'),
      ('Auxiliar', 'tramites', 'eliminar', 'propias'),
      ('Auxiliar', 'avisos_sat', 'ver', 'propias'),
      ('Auxiliar', 'avisos_sat', 'crear', 'propias'),
      ('Auxiliar', 'avisos_sat', 'editar', 'propias'),
      ('Auxiliar', 'ordenes_pago', 'ver', 'propias'),
      ('Auxiliar', 'ordenes_pago', 'crear', 'propias'),
      ('Auxiliar', 'ordenes_pago', 'editar', 'propias'),
      ('Auxiliar', 'ordenes_pago', 'eliminar', 'propias'),
      ('Auxiliar', 'honorarios', 'ver', 'propias'),
      ('Auxiliar', 'georreferenciacion', 'ver', 'todas'),
      ('Auxiliar', 'georreferenciacion', 'crear', 'todas'),
      ('Auxiliar', 'georreferenciacion', 'editar', 'todas'),
      ('Auxiliar', 'georreferenciacion', 'eliminar', 'todas'),
      -- Gestor
      ('Gestor', 'escrituras', 'ver', 'todas'),
      ('Gestor', 'comparecientes', 'ver', 'todas'),
      ('Gestor', 'pld', 'ver', 'todas'),
      ('Gestor', 'pld', 'crear', 'todas'),
      ('Gestor', 'expedientes', 'ver', 'todas'),
      ('Gestor', 'tramites', 'ver', 'todas'),
      ('Gestor', 'tramites', 'crear', 'todas'),
      ('Gestor', 'tramites', 'editar', 'todas'),
      ('Gestor', 'tramites', 'eliminar', 'todas'),
      ('Gestor', 'avisos_sat', 'ver', 'todas'),
      ('Gestor', 'ordenes_pago', 'ver', 'todas'),
      ('Gestor', 'honorarios', 'ver', 'todas'),
      ('Gestor', 'georreferenciacion', 'ver', 'todas'),
      ('Gestor', 'georreferenciacion', 'crear', 'todas'),
      ('Gestor', 'georreferenciacion', 'editar', 'todas'),
      ('Gestor', 'georreferenciacion', 'eliminar', 'todas'),
      ('Gestor', 'notificaciones', 'ver', null),
      ('Gestor', 'notificaciones', 'reenviar', null),
      ('Gestor', 'reportes', 'ver_operativos', null)
  )
insert into
  public.rol_permisos (rol_id, permiso_id, alcance)
select r.id, p.id, rp.alcance
from rp
  join public.roles r on r.nombre = rp.rol_nombre
  join public.permisos p on p.modulo = rp.modulo
  and p.accion = rp.accion;

-- ============================================================
-- Usuario Administrador inicial para desarrollo local
-- Email: admin@notaria.local
-- Contraseña: Password123!
-- ============================================================
do $$
declare
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_rol_admin_id uuid;
begin
  select id into v_rol_admin_id from public.roles where nombre = 'Administrador';

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@notaria.local',
    extensions.crypt('Password123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Administrador General"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update set
    encrypted_password = extensions.crypt('Password123!', extensions.gen_salt('bf')),
    email = 'admin@notaria.local',
    raw_user_meta_data = '{"full_name":"Administrador General"}'::jsonb,
    updated_at = now();

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_admin_id,
    v_admin_id::text,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@notaria.local'),
    'email',
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do update set
    identity_data = jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@notaria.local'),
    updated_at = now();

  -- Asegura que el perfil tenga asignado el rol Administrador y se encuentre activo
  insert into public.profiles (id, nombre_completo, rol_id, activo)
  values (v_admin_id, 'Administrador General', v_rol_admin_id, true)
  on conflict (id) do update set
    rol_id = v_rol_admin_id,
    nombre_completo = 'Administrador General',
    activo = true,
    updated_at = now();
end;
$$;

-- ============================================================
-- tipos_identificacion_oficial (catálogo y configuración OCR)
-- ============================================================
insert into public.tipos_identificacion_oficial (codigo, nombre, permite_ocr, requiere_reverso, activo)
values
  ('ine', 'Credencial para Votar (INE/IFE)', true, true, true),
  ('pasaporte', 'Pasaporte Oficial', true, false, true),
  ('cedula_profesional', 'Cédula Profesional', false, false, true),
  ('cartilla_militar', 'Cartilla del Servicio Militar', false, false, true),
  ('forma_migratoria', 'Documento Migratorio / Residencia', false, false, true)
on conflict (codigo) do update set
  nombre = excluded.nombre,
  permite_ocr = excluded.permite_ocr,
  requiere_reverso = excluded.requiere_reverso,
  activo = excluded.activo;

-- ============================================================
-- Comparecientes representativos para desarrollo local (04-comparecientes)
-- ============================================================
do $$
declare
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_pf1_id uuid := 'c1000000-0000-0000-0000-000000000001';
  v_pf2_id uuid := 'c1000000-0000-0000-0000-000000000002';
  v_pf3_id uuid := 'c1000000-0000-0000-0000-000000000003';
  v_pm1_id uuid := 'c2000000-0000-0000-0000-000000000001';
  v_pm2_id uuid := 'c2000000-0000-0000-0000-000000000002';
  v_reg_sociedad uuid;
  v_reg_separacion uuid;
  v_tipo_ine uuid;
begin
  select id into v_reg_sociedad from public.regimenes_patrimoniales where codigo = 'sociedad_conyugal';
  select id into v_reg_separacion from public.regimenes_patrimoniales where codigo = 'separacion_bienes';
  select id into v_tipo_ine from public.tipos_identificacion_oficial where codigo = 'ine';

  -- 1. Roberto Carlos Mendoza Sánchez
  insert into public.comparecientes (id, tipo_persona, nombre, rfc, email, telefono, activo, created_by)
  values (v_pf1_id, 'fisica', 'Roberto Carlos Mendoza Sánchez', 'MESR800101AB1', 'roberto.mendoza@example.com', '5511223344', true, v_admin_id)
  on conflict (id) do update set nombre = excluded.nombre, rfc = excluded.rfc, email = excluded.email;

  insert into public.compareciente_personas_fisicas (
    compareciente_id, nombres, primer_apellido, segundo_apellido,
    curp, fecha_nacimiento, genero, nacionalidad,
    estado_civil, regimen_patrimonial_id, ocupacion,
    tipo_identificacion_id, folio_identificacion,
    calle, numero_exterior, colonia, codigo_postal, municipio, entidad_federativa
  ) values (
    v_pf1_id, 'Roberto Carlos', 'Mendoza', 'Sánchez',
    'MESR800101HDFNRB02', '1980-01-01', 'M', 'Mexicana',
    'casado', v_reg_sociedad, 'Empresario Inmobiliario',
    v_tipo_ine, '0123456789012',
    'Av. Hidalgo', '100', 'Centro', '06000', 'Cuauhtémoc', 'Ciudad de México'
  )
  on conflict (compareciente_id) do update set
    nombres = excluded.nombres,
    curp = excluded.curp;

  -- 2. Fernando Garza Villarreal
  insert into public.comparecientes (id, tipo_persona, nombre, rfc, email, telefono, activo, created_by)
  values (v_pf2_id, 'fisica', 'Fernando Garza Villarreal', 'GAVF780412MN8', 'fernando.garza@example.com', '5552804491', true, v_admin_id)
  on conflict (id) do update set nombre = excluded.nombre, rfc = excluded.rfc, email = excluded.email;

  insert into public.compareciente_personas_fisicas (
    compareciente_id, nombres, primer_apellido, segundo_apellido,
    curp, fecha_nacimiento, genero, nacionalidad,
    estado_civil, regimen_patrimonial_id, ocupacion,
    tipo_identificacion_id, folio_identificacion,
    calle, numero_exterior, colonia, codigo_postal, municipio, entidad_federativa
  ) values (
    v_pf2_id, 'Fernando', 'Garza', 'Villarreal',
    'GAVF780412HDFRRN01', '1978-04-12', 'M', 'Mexicana',
    'soltero', null, 'Arquitecto',
    v_tipo_ine, 'IDMEX1948201948',
    'Av. Horacio', '1420', 'Polanco', '11560', 'Miguel Hidalgo', 'Ciudad de México'
  )
  on conflict (compareciente_id) do update set
    nombres = excluded.nombres,
    curp = excluded.curp;

  -- 3. María Elena López Sosa
  insert into public.comparecientes (id, tipo_persona, nombre, rfc, email, telefono, activo, created_by)
  values (v_pf3_id, 'fisica', 'María Elena López Sosa', 'LOSM850101XYZ', 'elena.lopez@example.com', '5599887766', true, v_admin_id)
  on conflict (id) do update set nombre = excluded.nombre, rfc = excluded.rfc, email = excluded.email;

  insert into public.compareciente_personas_fisicas (
    compareciente_id, nombres, primer_apellido, segundo_apellido,
    curp, fecha_nacimiento, genero, nacionalidad,
    estado_civil, regimen_patrimonial_id, ocupacion,
    tipo_identificacion_id, folio_identificacion,
    calle, numero_exterior, colonia, codigo_postal, municipio, entidad_federativa
  ) values (
    v_pf3_id, 'María Elena', 'López', 'Sosa',
    'LOSM850101MDFPRR03', '1985-01-01', 'F', 'Mexicana',
    'casado', v_reg_separacion, 'Abogada Fiscalista',
    v_tipo_ine, 'IDMEX8839102911',
    'Insurgentes Sur', '1602', 'Crédito Constructor', '03940', 'Benito Juárez', 'Ciudad de México'
  )
  on conflict (compareciente_id) do update set
    nombres = excluded.nombres,
    curp = excluded.curp;

  -- 4. Desarrollos Urbanos del Bajío SA de CV
  insert into public.comparecientes (id, tipo_persona, nombre, rfc, email, telefono, activo, created_by)
  values (v_pm1_id, 'moral', 'Desarrollos Urbanos del Bajío SA de CV', 'DUB150320AB2', 'contacto@bajio-urban.mx', '4421234567', true, v_admin_id)
  on conflict (id) do update set nombre = excluded.nombre, rfc = excluded.rfc, email = excluded.email;

  insert into public.compareciente_personas_morales (
    compareciente_id, razon_social, fecha_constitucion, nacionalidad,
    folio_mercantil, instrumento_constitutivo, fecha_instrumento,
    notario_constitucion, plaza_constitucion, objeto_social,
    calle, numero_exterior, colonia, codigo_postal, municipio, entidad_federativa
  ) values (
    v_pm1_id, 'Desarrollos Urbanos del Bajío SA de CV', '2015-03-20', 'Mexicana',
    'FME-987654', 'Escritura 45,210', '2015-03-20',
    'Lic. Alejandro Morales, Notario 12', 'Querétaro',
    'Desarrollo, edificación, comercialización y administración de bienes raíces.',
    'Bernardo Quintana', '500', 'Álamos', '76160', 'Querétaro', 'Querétaro'
  )
  on conflict (compareciente_id) do update set
    razon_social = excluded.razon_social,
    folio_mercantil = excluded.folio_mercantil;

  insert into public.compareciente_representantes (
    persona_moral_id, representante_fisica_id, tipo_facultades, instrumento_poder, fecha_poder, notario_poder, vigente
  ) values (
    v_pm1_id, v_pf1_id, 'Poder General para Actos de Dominio y Administración', 'Escritura 45,210', '2015-03-20', 'Notaría 12 Querétaro', true
  )
  on conflict (persona_moral_id, representante_fisica_id, tipo_facultades) do update set vigente = true;

  insert into public.compareciente_beneficiarios_controladores (
    persona_moral_id, beneficiario_fisica_id, porcentaje_participacion, criterio_control, observaciones
  ) values (
    v_pm1_id, v_pf1_id, 60.00, 'titularidad_acciones', 'Accionista mayoritario con el 60% del capital social según libro de socios'
  )
  on conflict (persona_moral_id, beneficiario_fisica_id) do update set porcentaje_participacion = 60.00;

  -- 5. Inmobiliaria Altavista SA de CV
  insert into public.comparecientes (id, tipo_persona, nombre, rfc, email, telefono, activo, created_by)
  values (v_pm2_id, 'moral', 'Inmobiliaria Altavista SA de CV', 'IAL100520AB1', 'contacto@altavista.mx', '5598765432', true, v_admin_id)
  on conflict (id) do update set nombre = excluded.nombre, rfc = excluded.rfc, email = excluded.email;

  insert into public.compareciente_personas_morales (
    compareciente_id, razon_social, fecha_constitucion, nacionalidad,
    folio_mercantil, instrumento_constitutivo, fecha_instrumento,
    notario_constitucion, plaza_constitucion, objeto_social,
    calle, numero_exterior, colonia, codigo_postal, municipio, entidad_federativa
  ) values (
    v_pm2_id, 'Inmobiliaria Altavista SA de CV', '2010-05-20', 'Mexicana',
    'FME-98412-CDMX', 'Escritura 12,048', '2010-05-20',
    'Lic. Fernando Ortiz, Notaría 18', 'Ciudad de México',
    'Compra, venta y arrendamiento de inmuebles habitacionales y comerciales.',
    'Paseo de la Reforma', '222', 'Juárez', '06600', 'Cuauhtémoc', 'Ciudad de México'
  )
  on conflict (compareciente_id) do update set
    razon_social = excluded.razon_social,
    folio_mercantil = excluded.folio_mercantil;

  insert into public.compareciente_representantes (
    persona_moral_id, representante_fisica_id, tipo_facultades, instrumento_poder, fecha_poder, notario_poder, vigente
  ) values (
    v_pm2_id, v_pf2_id, 'Poder General para Actos de Dominio', 'Escritura 12,048', '2010-05-20', 'Notaría 18 CDMX', true
  )
  on conflict (persona_moral_id, representante_fisica_id, tipo_facultades) do update set vigente = true;

  insert into public.compareciente_beneficiarios_controladores (
    persona_moral_id, beneficiario_fisica_id, porcentaje_participacion, criterio_control, observaciones
  ) values (
    v_pm2_id, v_pf2_id, 100.00, 'titularidad_acciones', 'Titular del 100% de las acciones ordinarias de la sociedad'
  )
  on conflict (persona_moral_id, beneficiario_fisica_id) do update set porcentaje_participacion = 100.00;
end;
$$;

-- ============================================================
-- cat_dependencias_oficiales (catálogo base y seeder de gestoría)
-- ============================================================
insert into public.cat_dependencias_oficiales (sigla, nombre, clave_numerica, dias_habiles_compromiso, activo)
values
  ('NOTARIA', 'Notaría / Gestión Interna', 0, 5, true),
  ('CATASTRO_EST', 'Dirección de Catastro Estatal', 1, 10, true),
  ('CATASTRO_MUN', 'Catastro y Tesorería Municipal', 2, 7, true),
  ('RPP', 'Registro Público de la Propiedad', 3, 15, true),
  ('CONTROL_INT', 'Control Interno y Entrega de Testimonio', 4, 5, true),
  ('INFONAVIT', 'INFONAVIT - Créditos y Titulación', 5, 10, true)
on conflict (sigla) do update set
  nombre = excluded.nombre,
  clave_numerica = excluded.clave_numerica,
  dias_habiles_compromiso = excluded.dias_habiles_compromiso,
  direccion = null,
  portal_web = null,
  activo = true;

-- Eliminar cualquier dependencia no autorizada por el usuario
delete from public.cat_dependencias_oficiales
where sigla not in ('NOTARIA', 'CATASTRO_EST', 'CATASTRO_MUN', 'RPP', 'CONTROL_INT', 'INFONAVIT');

-- Limpiar direcciones ficticias
update public.cat_dependencias_oficiales
set direccion = null, portal_web = null;

-- ============================================================
-- cat_pasos_tramite (seeder oficial de los 17 pasos del pipeline de gestoría)
-- ============================================================
insert into public.cat_pasos_tramite (id, nombre, orden, dependencia_clave, genera_orden_pago, activo)
values
  (1, 'CAPTURA', 1, 0, false, true),
  (2, 'ING. CAT. EST.', 2, 1, false, true),
  (4, 'RECHAZO CAT. EST.', 3, 1, false, true),
  (3, 'O.P. CAT. EST.', 4, 1, true, true),
  (6, 'CORREGIR CED. EST.', 5, 1, false, true),
  (5, 'CEDULA CAT. EST.', 6, 1, false, true),
  (14, 'ING. TRAM. MUN.', 7, 2, false, true),
  (15, 'RECHAZO MUNICIPAL', 8, 2, false, true),
  (16, 'O.P. MUNICIPAL', 9, 2, true, true),
  (7, 'PAGO T.D.', 10, 0, false, true),
  (17, 'P.T. FIRMADO Y SELLADO', 11, 0, false, true),
  (8, 'ORD. DE PAG. R.P.P.', 12, 3, true, true),
  (9, 'INGRESO A R.P.P.', 13, 3, false, true),
  (10, 'RECHAZO R.P.P.', 14, 3, false, true),
  (11, 'REINGRESO A R.P.P', 15, 3, false, true),
  (12, 'SALIDA DE R.P.P', 16, 4, false, true),
  (13, '1ER TEST AL CLIENTE', 17, 4, false, true)
on conflict (id) do update set
  nombre = excluded.nombre,
  orden = excluded.orden,
  dependencia_clave = excluded.dependencia_clave,
  genera_orden_pago = excluded.genera_orden_pago,
  activo = excluded.activo;

-- Enlazar dependencia_id en cat_pasos_tramite con su UUID correspondiente
update public.cat_pasos_tramite cpt
set dependencia_id = cdo.id
from public.cat_dependencias_oficiales cdo
where cdo.clave_numerica = cpt.dependencia_clave;

