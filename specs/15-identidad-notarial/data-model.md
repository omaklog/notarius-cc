# Data Model: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

**Feature**: `15-identidad-notarial`  
**Status**: Ready for Implementation

---

## 1. Esquema Relacional en PostgreSQL

```sql
-- Tabla Singleton de Configuración Institucional e Identidad Notarial
CREATE TABLE IF NOT EXISTS public.configuracion_notarial (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    singleton_guard BOOLEAN DEFAULT TRUE NOT NULL UNIQUE CHECK (singleton_guard),

    -- Datos Notariales y Fe Pública
    numero_notaria INTEGER NOT NULL DEFAULT 1,
    entidad_federativa TEXT NOT NULL DEFAULT 'Estado de México',
    municipio TEXT NOT NULL DEFAULT 'Toluca',
    distrito_judicial TEXT DEFAULT 'Distrito Judicial de Toluca',

    -- Titularidad y Suplencia
    notario_titular_nombre TEXT NOT NULL DEFAULT 'Lic. Notario Titular',
    notario_titular_titulo TEXT DEFAULT 'Licenciado en Derecho',
    patente_fiat_numero TEXT DEFAULT 'FIAT-001',
    patente_fiat_fecha DATE,
    notario_suplente_nombre TEXT,
    regimen_asociacion TEXT,

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

-- Políticas RLS
ALTER TABLE public.configuracion_notarial ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública / autenticada para todos los operadores de la notaría
CREATE POLICY "configuracion_notarial_select_policy"
ON public.configuracion_notarial
FOR SELECT
TO authenticated
USING (true);

-- 2. Modificación exclusiva para administradores y notario titular
CREATE POLICY "configuracion_notarial_write_policy"
ON public.configuracion_notarial
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.rol_id = r.id
        WHERE p.id = auth.uid()
        AND (r.nombre IN ('administrador', 'notario_titular') OR r.permisos ? 'administracion:acceso')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.roles r ON p.rol_id = r.id
        WHERE p.id = auth.uid()
        AND (r.nombre IN ('administrador', 'notario_titular') OR r.permisos ? 'administracion:acceso')
    )
);
```

---

## 2. Bucket de Storage: `notaria-identidad`

- **Nombre**: `notaria-identidad`
- **Público**: `true` (permite visualización de logotipos y membretes en reportes e impresiones de forma instantánea).
- **Límite de tamaño**: 3MB por archivo.
- **Tipos MIME permitidos**: `image/png`, `image/jpeg`, `image/svg+xml`.
- **Estructura de rutas**:
  - `logos/logotipo_principal.png` (o SVG)
  - `sellos/sello_autorizar.png`

---

## 3. Interfaces y Modelos TypeScript (`app/types/configuracion.ts`)

```typescript
export interface ConfiguracionNotarial {
  id: string
  numero_notaria: number
  entidad_federativa: string
  municipio: string
  distrito_judicial?: string | null

  notario_titular_nombre: string
  notario_titular_titulo?: string | null
  patente_fiat_numero?: string | null
  patente_fiat_fecha?: string | null
  notario_suplente_nombre?: string | null
  regimen_asociacion?: string | null

  domicilio_calle?: string | null
  domicilio_num_ext?: string | null
  domicilio_num_int?: string | null
  domicilio_colonia?: string | null
  domicilio_codigo_postal?: string | null

  telefono_principal?: string | null
  telefono_secundario?: string | null
  correo_contacto?: string | null
  sitio_web?: string | null

  logotipo_url?: string | null
  sello_notarial_url?: string | null

  leyenda_encabezado?: string | null
  leyenda_lema?: string | null
  leyenda_cierre_volumen?: string | null

  updated_at?: string
  updated_by?: string | null
}

export type ActualizarConfiguracionPayload = Partial<Omit<ConfiguracionNotarial, 'id' | 'updated_at' | 'updated_by'>>
```
