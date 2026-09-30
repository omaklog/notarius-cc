# Research: 15-identidad-notarial (Identidad Notarial, Fe Pública y Configuración Institucional)

**Feature**: `15-identidad-notarial`  
**Status**: Completed  
**Goal**: Investigar y resolver decisiones arquitectónicas para la persistencia singleton, almacenamiento de activos de identidad visual y consumo reactivo en toda la notaría.

---

## 1. Decisiones Arquitectónicas

### 1.1 Patrón Singleton para la Configuración Notarial en PostgreSQL
- **Pregunta**: ¿Cómo garantizar a nivel de esquema que exista exactamente un único registro institucional activo y evitar filas duplicadas?
- **Opciones analizadas**:
  1. *Tabla clave-valor genérica (`key`, `value`)*: Muy flexible pero pierde tipado relacional, requiere deserialización JSON y dificulta validaciones de integridad referencial.
  2. *Tabla relacional con constraint singleton (`id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid`, `singleton_guard BOOLEAN DEFAULT TRUE UNIQUE CHECK (singleton_guard)`)*:
     - Ventajas: Tipado fuerte en Postgres, validaciones `NOT NULL` en campos jurídicamente obligatorios, queries simples con `.single()` en Supabase.
     - Operaciones idempotentes vía `UPSERT` (`ON CONFLICT (id) DO UPDATE`).
- **Decisión**: Se adopta la **Opción 2** con tabla relacional singleton `public.configuracion_notarial`.

### 1.2 Almacenamiento Seguro de Activos Gráficos (Logotipo y Sello de Autorizar)
- **Pregunta**: ¿Dónde y cómo almacenar el logotipo institucional y el facsímil del Sello Notarial de Autorizar?
- **Opciones analizadas**:
  1. *Base64 embebido en la base de datos*: Aumenta drásticamente el peso de la fila singleton y sobrecarga los queries de configuración.
  2. *Bucket dedicado en Supabase Storage (`notaria-identidad`)*:
     - Almacenamiento optimizado de blobs.
     - URLs permanentes o firmadas accesibles para renderizado HTML y generación de PDFs/impresión.
     - Políticas RLS: lectura pública/autenticada y escritura únicamente para administradores.
- **Decisión**: **Opción 2**: Bucket `notaria-identidad` en Supabase Storage con carpetas `logos/` y `sellos/`.

### 1.3 Caché en Memoria y Reactividad en Frontend
- **Pregunta**: Dado que los componentes de navegación (`AppNavbar.vue`), expedientes, carátulas y reportes consultan los datos de la notaría, ¿cómo evitar peticiones repetitivas a Supabase en cada navegación?
- **Decisión**:
  - `useConfiguracionNotarial.ts` mantiene un `ref<ConfiguracionNotarial | null>` a nivel de módulo (singleton en cliente).
  - Si los datos ya fueron cargados, se reutilizan de inmediato.
  - El método `guardarConfiguracion` actualiza la base de datos e inmediatamente actualiza la variable reactiva global, provocando re-renderizado automático en todos los componentes montados sin recargar la página.

### 1.4 Interpolación Dinámica de Leyendas Oficiales
- **Pregunta**: ¿Cómo permitir al Notario personalizar fórmulas legales complejas (como la certificación de cierre de tomos del protocolo) inyectando datos variables?
- **Decisión**:
  - Implementar un motor liviano de interpolación tipográfica de tags: `{numero_notaria}`, `{notario_titular}`, `{entidad}`, `{municipio}`, `{distrito}`, `{numero_volumen}`, `{escrituras_validas}`, `{escrituras_canceladas}`, `{folios_totales}`, `{fecha}`.
  - Si una variable no está disponible en el contexto, se conserva o se reemplaza por un espacio en blanco seguro.

---

## 2. Paleta de Tokens Stitch Notarial (§8 Constitución)

- **Azul Notarial Primario**: `#1B3A5F` (títulos, encabezados de ficha, botones principales).
- **Bronce Notarial**: `#A9762E` (sellos, distintivos de fe pública y patentes).
- **Fondo de Contenedores**: `#FFFFFF` y `#F8FAFC`.
- **Bordes y Delimitadores**: `rgba(27, 58, 95, 0.12)`.
