# Contract: Infraestructura Supabase hacia otros módulos

Este feature es infraestructura transversal — todos los módulos de negocio
futuros (Escrituras, Comparecientes, Cumplimiento PLD, Expedientes,
Notificaciones, Administración General, etc.) dependen de lo que aquí se
fija. Este documento es el contrato que esos specs futuros pueden asumir
sin necesidad de re-especificarlo.

## Regla dura: cambios de esquema solo vía migración

Ningún spec futuro debe modificar el esquema de base de datos directamente
en Studio. Todo cambio (agregar tabla, columna, política RLS, bucket) se
crea con `supabase migration new <descripcion>` y vive versionado en
`supabase/migrations/`. Un spec que necesite un cambio de esquema lo
declara en su propio `data-model.md` y genera su propia migración — no
edita las migraciones de este feature.

## Variables de entorno disponibles (`.env.example`)

Cualquier módulo que necesite conectarse al backend local puede asumir que
estas variables existen y están documentadas (valores reales solo en
`.env.local`, nunca versionado):

| Variable | Propósito | Dónde se usa |
|---|---|---|
| `SUPABASE_URL` | URL del gateway local (`http://localhost:54321`) | Cliente (frontend) y servidor |
| `SUPABASE_ANON_KEY` | Llave pública, respeta RLS | Cliente (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave con privilegios elevados, **bypassa RLS** | Solo Edge Functions / procesos de servidor — **nunca** en el cliente Nuxt |
| `SUPABASE_JWT_SECRET` | Verificación de JWT propia (si algún proceso de servidor lo requiere) | Servidor |

Variables de proveedores externos (`RESEND_API_KEY`, `TWILIO_*`, etc.) se
reservan como placeholders en `.env.example` para cuando el spec de
Notificaciones las necesite — este feature no las consume.

## Catálogos base (referenciables por FK desde módulos futuros)

Cada catálogo expone una columna `codigo` estable (texto), pensada como el
identificador que otros módulos referencian — no el `id` (uuid), que existe
solo por la convención de auditoría:

| Tabla | Columna estable | Ejemplo de valores ya sembrados |
|---|---|---|
| `tipos_acto_notarial` | `codigo` | `compraventa`, `donacion`, `testamento`, `poder_notarial`, `constitucion_sociedad` |
| `roles_compareciente` | `codigo` | `otorgante`, `adquirente`, `apoderado`, `testigo` |
| `roles_usuario` | `codigo` | `notario`, `abogado_auxiliar`, `asistente`, `administrador`, `oficial_cumplimiento` |
| `uma_historico` | N/A (histórico por fecha) | Ver `data-model.md` — el valor **vigente** se resuelve por rango de fechas, no por código |

**Estabilidad**: los valores de `codigo` ya sembrados no se renombran ni se
eliminan una vez que un módulo de negocio los referencia — solo se agregan
nuevos o se desactivan (`activo = false`) vía migración/seed adicional.

**Lo que un módulo NO debe hacer**: insertar sus propios valores de
catálogo directamente contra estas tablas desde su propia migración sin
coordinarlo — la fuente de verdad de estos catálogos, una vez exista
Administración General, es ese módulo.

## Buckets de Storage (nombres y nivel de acceso fijos)

| Bucket | Acceso | Quién lo usa |
|---|---|---|
| `expedientes` | Privado | Módulo Expedientes (futuro) |
| `evidencias-pld` | Privado | Módulo Cumplimiento PLD/UIF (futuro) |
| `logos-notaria` | Público de solo lectura | Módulo Administración General (futuro) y `00-layout-shell` (ya consume el placeholder) |

Un módulo futuro que necesite un bucket adicional lo agrega vía su propia
migración (política de Storage + creación del bucket), siguiendo el mismo
patrón de acceso (privado por defecto salvo justificación explícita).

## Esquema `pld` (reservado para Cumplimiento PLD/UIF)

El esquema existe vacío. El módulo de Cumplimiento PLD/UIF crea sus tablas
ahí (no en `public`) desde su propia migración, con sus propias políticas
RLS más estrictas.

## Edge Functions: stubs, no lógica real

`supabase/functions/notificar-evento` y
`supabase/functions/consultar-listas-pld` existen como funciones stub que
responden "no implementado". Los specs de Notificaciones y Cumplimiento
PLD, respectivamente, reemplazan el contenido de esas funciones con su
lógica real — no crean funciones nuevas con otro nombre para lo mismo.
