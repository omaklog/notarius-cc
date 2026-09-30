-- ============================================================
-- Migración: 20260815000000_identidad_notarial.sql
-- Feature: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)
-- ============================================================

-- 1. Tabla Singleton de Configuración Institucional Notarial
CREATE TABLE IF NOT EXISTS public.configuracion_notarial (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    singleton_guard BOOLEAN DEFAULT TRUE NOT NULL UNIQUE CHECK (singleton_guard),

    -- Datos de la Notaría y Fe Pública
    numero_notaria INTEGER NOT NULL DEFAULT 1,
    entidad_federativa TEXT NOT NULL DEFAULT 'Estado de México',
    municipio TEXT NOT NULL DEFAULT 'Toluca',
    distrito_judicial TEXT DEFAULT 'Distrito Judicial de Toluca',

    -- Titularidad y Suplencia
    notario_titular_nombre TEXT NOT NULL DEFAULT 'Lic. Notario Titular',
    notario_titular_titulo TEXT DEFAULT 'Licenciado en Derecho',
    patente_fiat_numero TEXT DEFAULT 'FIAT-001',
    patente_fiat_fecha DATE,
    notario_suplente_nombre TEXT DEFAULT '',
    regimen_asociacion TEXT DEFAULT '',

    -- Domicilio Oficial
    domicilio_calle TEXT DEFAULT '',
    domicilio_num_ext TEXT DEFAULT '',
    domicilio_num_int TEXT DEFAULT '',
    domicilio_colonia TEXT DEFAULT '',
    domicilio_codigo_postal TEXT DEFAULT '',

    -- Contacto
    telefono_principal TEXT DEFAULT '',
    telefono_secundario TEXT DEFAULT '',
    correo_contacto TEXT DEFAULT '',
    sitio_web TEXT DEFAULT '',

    -- Identidad Visual
    logotipo_url TEXT,
    sello_notarial_url TEXT,

    -- Leyendas y Parámetros Notariales
    leyenda_encabezado TEXT DEFAULT 'ESTADOS UNIDOS MEXICANOS — NOTARÍA PÚBLICA',
    leyenda_lema TEXT DEFAULT 'POR LA SEGURIDAD Y LA CERTEZA JURÍDICA',
    leyenda_cierre_volumen TEXT DEFAULT 'En la ciudad de {municipio}, {entidad}, a {fecha}, el suscrito Notario hace constar que el presente Volumen {numero_volumen} del Protocolo Ordinario a mi cargo queda debidamente cerrado, conteniendo un total de {escrituras_validas} escrituras válidamente autorizadas y {escrituras_canceladas} canceladas.',

    -- Auditoría
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 2. Habilitar RLS y Permisos en configuracion_notarial
ALTER TABLE public.configuracion_notarial ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracion_notarial TO authenticated, service_role;

DROP POLICY IF EXISTS "configuracion_notarial_select_policy" ON public.configuracion_notarial;
CREATE POLICY "configuracion_notarial_select_policy"
    ON public.configuracion_notarial
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "configuracion_notarial_write_policy" ON public.configuracion_notarial;
CREATE POLICY "configuracion_notarial_write_policy"
    ON public.configuracion_notarial
    FOR ALL
    TO authenticated
    USING (public.fn_has_permiso('administracion', 'acceso'))
    WITH CHECK (public.fn_has_permiso('administracion', 'acceso'));

-- 3. Sembrar Fila Singleton por Defecto
INSERT INTO public.configuracion_notarial (
    id,
    numero_notaria,
    entidad_federativa,
    municipio,
    distrito_judicial,
    notario_titular_nombre,
    notario_titular_titulo,
    patente_fiat_numero,
    patente_fiat_fecha,
    domicilio_calle,
    domicilio_num_ext,
    domicilio_colonia,
    domicilio_codigo_postal,
    telefono_principal,
    correo_contacto
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    44,
    'Estado de México',
    'Toluca',
    'Distrito Judicial de Toluca',
    'Lic. Fernando Notario Titular',
    'Licenciado en Derecho',
    'FIAT-2018-044',
    '2018-05-15',
    'Av. Hidalgo Poniente',
    '102',
    'Centro',
    '50000',
    '(722) 214-5500',
    'contacto@notaria44edomex.mx'
) ON CONFLICT (id) DO NOTHING;

-- 4. Aprovisionar Bucket en Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'notaria-identidad',
    'notaria-identidad',
    true,
    3145728, -- 3MB
    ARRAY['image/png', 'image/jpeg', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 3145728,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml']::text[];

-- 5. Políticas de Acceso a Storage
DROP POLICY IF EXISTS "notaria_identidad_public_read" ON storage.objects;
CREATE POLICY "notaria_identidad_public_read"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'notaria-identidad');

DROP POLICY IF EXISTS "notaria_identidad_admin_all" ON storage.objects;
CREATE POLICY "notaria_identidad_admin_all"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'notaria-identidad' AND public.fn_has_permiso('administracion', 'acceso'))
    WITH CHECK (bucket_id = 'notaria-identidad' AND public.fn_has_permiso('administracion', 'acceso'));

-- 6. Permisos del Catálogo
INSERT INTO public.permisos (modulo, accion, descripcion, requiere_alcance)
VALUES
  ('administracion', 'acceso', 'Acceso al módulo de Administración General', false),
  ('administracion', 'configuracion', 'Administrar identidad y configuración institucional notarial', false)
ON CONFLICT (modulo, accion) DO NOTHING;

-- 7. Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
