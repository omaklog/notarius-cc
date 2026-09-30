# Data Model: 16-libro-cotejos (Libro de Cotejos y Certificaciones Fuera de Protocolo)

**Feature**: `16-libro-cotejos`  
**Status**: Ready for Implementation

---

## 1. Esquema Relacional en PostgreSQL

```sql
-- 1. Tabla de Libros de Cotejo (Tomos Notariales)
CREATE TABLE IF NOT EXISTS public.libros_cotejo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_libro INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ,
    limite_actas INTEGER NOT NULL DEFAULT 200 CHECK (limite_actas > 0),
    total_actas INTEGER NOT NULL DEFAULT 0 CHECK (total_actas >= 0),
    estatus TEXT NOT NULL DEFAULT 'abierto' CHECK (estatus IN ('abierto', 'cerrado')),
    acta_clausura_texto TEXT,
    notas TEXT,
    cerrado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_libro_anio UNIQUE (numero_libro, anio)
);

-- 2. Tabla de Actas de Cotejo
CREATE TABLE IF NOT EXISTS public.actas_cotejo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libro_id UUID NOT NULL REFERENCES public.libros_cotejo(id) ON DELETE RESTRICT,
    numero_acta INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    fecha_cotejo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Solicitante
    solicitante_nombre TEXT NOT NULL,
    solicitante_identificacion TEXT,
    solicitante_compareciente_id UUID REFERENCES public.comparecientes(id) ON DELETE SET NULL,
    
    -- Documento exhibido
    tipo_documento TEXT NOT NULL,
    documento_descripcion TEXT NOT NULL,
    numero_hojas INTEGER NOT NULL DEFAULT 1 CHECK (numero_hojas >= 1),
    numero_tantos INTEGER NOT NULL DEFAULT 1 CHECK (numero_tantos >= 1),
    
    -- Evidencias en Storage
    archivo_original_url TEXT,
    archivo_copia_certificada_url TEXT,
    
    -- Notas y Estatus Notarial
    observaciones TEXT,
    estatus TEXT NOT NULL DEFAULT 'autorizado' CHECK (estatus IN ('registrado', 'autorizado', 'entregado', 'cancelado')),
    motivo_cancelacion TEXT,
    cancelado_en TIMESTAMPTZ,
    cancelado_por UUID REFERENCES public.profiles(id),
    notario_actuante TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unq_acta_por_libro UNIQUE (libro_id, numero_acta)
);

-- Índices de consulta frecuente
CREATE INDEX IF NOT EXISTS idx_actas_cotejo_libro ON public.actas_cotejo(libro_id, numero_acta DESC);
CREATE INDEX IF NOT EXISTS idx_actas_cotejo_fecha ON public.actas_cotejo(fecha_cotejo DESC);
CREATE INDEX IF NOT EXISTS idx_actas_cotejo_solicitante ON public.actas_cotejo(solicitante_nombre);
```

---

## 2. Procedimiento Almacenado Atómico de Registro Consecutivo

```sql
CREATE OR REPLACE FUNCTION public.fn_registrar_acta_cotejo(
    p_libro_id UUID,
    p_solicitante_nombre TEXT,
    p_solicitante_identificacion TEXT,
    p_solicitante_compareciente_id UUID,
    p_tipo_documento TEXT,
    p_documento_descripcion TEXT,
    p_numero_hojas INTEGER,
    p_numero_tantos INTEGER,
    p_observaciones TEXT,
    p_notario_actuante TEXT,
    p_estatus TEXT DEFAULT 'autorizado'
)
RETURNS public.actas_cotejo
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_libro public.libros_cotejo%ROWTYPE;
    v_siguiente_acta INTEGER;
    v_nueva_acta public.actas_cotejo%ROWTYPE;
BEGIN
    -- 1. Bloqueo de fila exclusivo sobre el libro para evitar condiciones de carrera
    SELECT * INTO v_libro
    FROM public.libros_cotejo
    WHERE id = p_libro_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El libro de cotejos especificado no existe';
    END IF;

    IF v_libro.estatus = 'cerrado' THEN
        RAISE EXCEPTION 'El libro de cotejos %/% se encuentra formalmente cerrado', v_libro.numero_libro, v_libro.anio;
    END IF;

    -- 2. Calcular número correlativo estricto
    v_siguiente_acta := v_libro.total_actas + 1;

    -- 3. Insertar el acta
    INSERT INTO public.actas_cotejo (
        libro_id,
        numero_acta,
        anio,
        solicitante_nombre,
        solicitante_identificacion,
        solicitante_compareciente_id,
        tipo_documento,
        documento_descripcion,
        numero_hojas,
        numero_tantos,
        observaciones,
        notario_actuante,
        estatus,
        created_by
    ) VALUES (
        p_libro_id,
        v_siguiente_acta,
        v_libro.anio,
        TRIM(p_solicitante_nombre),
        p_solicitante_identificacion,
        p_solicitante_compareciente_id,
        TRIM(p_tipo_documento),
        TRIM(p_documento_descripcion),
        GREATEST(COALESCE(p_numero_hojas, 1), 1),
        GREATEST(COALESCE(p_numero_tantos, 1), 1),
        p_observaciones,
        p_notario_actuante,
        COALESCE(p_estatus, 'autorizado'),
        auth.uid()
    ) RETURNING * INTO v_nueva_acta;

    -- 4. Incrementar total de actas del libro
    UPDATE public.libros_cotejo
    SET total_actas = v_siguiente_acta,
        updated_at = NOW()
    WHERE id = p_libro_id;

    RETURN v_nueva_acta;
END;
$$;
```

---

## 3. Storage Bucket: `cotejos-documentos`

- **ID / Nombre**: `cotejos-documentos`
- **Público**: `false` (resguardo privado con acceso notarial autenticado).
- **Límite de tamaño**: 15MB por archivo (`15728640` bytes).
- **MIME Types autorizados**: `application/pdf`, `image/png`, `image/jpeg`.
- **Estructura jerárquica de carpetas**:
  - `{libro_id}/{acta_id}/original_{hash}.{pdf|png|jpg}`
  - `{libro_id}/{acta_id}/certificada_{hash}.{pdf|png|jpg}`

---

## 4. Políticas de Seguridad (RLS) y Catálogo de Permisos

```sql
-- Habilitar RLS
ALTER TABLE public.libros_cotejo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_cotejo ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.libros_cotejo TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actas_cotejo TO authenticated, service_role;

-- Políticas de Libros
CREATE POLICY "libros_cotejo_select" ON public.libros_cotejo
    FOR SELECT TO authenticated USING (public.fn_has_permiso('cotejos', 'ver'));

CREATE POLICY "libros_cotejo_insert" ON public.libros_cotejo
    FOR INSERT TO authenticated WITH CHECK (public.fn_has_permiso('cotejos', 'crear'));

CREATE POLICY "libros_cotejo_update" ON public.libros_cotejo
    FOR UPDATE TO authenticated
    USING (public.fn_has_permiso('cotejos', 'cerrar_libro') OR public.fn_has_permiso('cotejos', 'crear'))
    WITH CHECK (public.fn_has_permiso('cotejos', 'cerrar_libro') OR public.fn_has_permiso('cotejos', 'crear'));

-- Políticas de Actas
CREATE POLICY "actas_cotejo_select" ON public.actas_cotejo
    FOR SELECT TO authenticated USING (public.fn_has_permiso('cotejos', 'ver'));

CREATE POLICY "actas_cotejo_insert" ON public.actas_cotejo
    FOR INSERT TO authenticated WITH CHECK (public.fn_has_permiso('cotejos', 'crear'));

CREATE POLICY "actas_cotejo_update" ON public.actas_cotejo
    FOR UPDATE TO authenticated
    USING (public.fn_has_permiso('cotejos', 'autorizar') OR public.fn_has_permiso('cotejos', 'cancelar'))
    WITH CHECK (public.fn_has_permiso('cotejos', 'autorizar') OR public.fn_has_permiso('cotejos', 'cancelar'));

-- Catálogo de Permisos
INSERT INTO public.permisos (modulo, accion, descripcion, requiere_alcance)
VALUES
    ('cotejos', 'ver', 'Consultar libros y actas de cotejo fuera de protocolo', false),
    ('cotejos', 'crear', 'Registrar actas de cotejo y aperturar nuevos libros', false),
    ('cotejos', 'autorizar', 'Autorizar y emitir razones notariales de cotejo', false),
    ('cotejos', 'cancelar', 'Cancelar e inutilizar formalmente actas de cotejo', false),
    ('cotejos', 'cerrar_libro', 'Emitir acta de clausura y cierre de libros de cotejo', false)
ON CONFLICT (modulo, accion) DO NOTHING;
```

---

## 5. DTOs e Interfaces TypeScript (`app/types/cotejos.ts`)

```typescript
export type EstatusLibro = 'abierto' | 'cerrado'
export type EstatusActaCotejo = 'registrado' | 'autorizado' | 'entregado' | 'cancelado'

export interface LibroCotejo {
  id: string
  numero_libro: number
  anio: number
  fecha_apertura: string
  fecha_cierre?: string | null
  limite_actas: number
  total_actas: number
  estatus: EstatusLibro
  acta_clausura_texto?: string | null
  notas?: string | null
  cerrado_por?: string | null
  created_at?: string
  created_by?: string | null
  updated_at?: string
}

export interface ActaCotejo {
  id: string
  libro_id: string
  numero_acta: number
  anio: number
  fecha_cotejo: string
  solicitante_nombre: string
  solicitante_identificacion?: string | null
  solicitante_compareciente_id?: string | null
  tipo_documento: string
  documento_descripcion: string
  numero_hojas: number
  numero_tantos: number
  archivo_original_url?: string | null
  archivo_copia_certificada_url?: string | null
  observaciones?: string | null
  estatus: EstatusActaCotejo
  motivo_cancelacion?: string | null
  cancelado_en?: string | null
  cancelado_por?: string | null
  notario_actuante?: string | null
  created_at?: string
  created_by?: string | null
  updated_at?: string

  // Objeto anidado de relación
  libro?: LibroCotejo | null
}

export interface RegistrarActaCotejoPayload {
  libro_id: string
  solicitante_nombre: string
  solicitante_identificacion?: string | null
  solicitante_compareciente_id?: string | null
  tipo_documento: string
  documento_descripcion: string
  numero_hojas: number
  numero_tantos: number
  observaciones?: string | null
  notario_actuante?: string | null
  estatus?: EstatusActaCotejo
}

export interface CancelarActaCotejoPayload {
  acta_id: string
  motivo_cancelacion: string
}

export interface CerrarLibroPayload {
  libro_id: string
  acta_clausura_texto?: string
}

export interface FiltrosCotejo {
  busqueda?: string
  libro_id?: string
  tipo_documento?: string
  estatus?: EstatusActaCotejo | 'todos'
  fecha_desde?: string
  fecha_hasta?: string
}

export interface MetricasCotejo {
  actasHoy: number
  actasAutorizadasLibro: number
  totalTantosExpedidos: number
  actasCanceladas: number
}
```
