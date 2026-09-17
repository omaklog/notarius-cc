# Quickstart: Validar la infraestructura Supabase local

Guía para validar manualmente los escenarios de aceptación del spec una vez
implementado. No hay suite de pruebas automatizada para este feature (ver
`research.md` #5) — esta es la verificación end-to-end de referencia.

## Prerrequisitos

- Docker instalado y corriendo.
- Dependencias del repo instaladas (`yarn install`), incluyendo la CLI de
  Supabase fijada como devDependency (ver `research.md` #1).

## Levantar el entorno (User Story 1)

```bash
npx supabase start
```

Verificar en la salida del comando que cada servicio queda disponible en su
puerto documentado (`spec.md` §4 / `plan.md`):

- API gateway: `http://localhost:54321`
- Postgres: `localhost:54322`
- Studio: `http://localhost:54323`
- Inbucket: `http://localhost:54324`

Abrir `http://localhost:54323` y confirmar que Studio carga sin
configuración adicional (tablas, editor SQL, sección de Authentication
visibles).

**Persistencia**: reiniciar los contenedores (`npx supabase stop` seguido
de `npx supabase start`, sin `db reset`) y confirmar que cualquier dato de
prueba insertado previamente sigue presente.

## Reconstruir esquema + catálogos (User Story 2)

```bash
npx supabase db reset
```

Validar en Studio → SQL Editor (o `psql`) que:

```sql
select codigo, nombre from public.tipos_acto_notarial;
select codigo, nombre from public.roles_compareciente;
select codigo, nombre from public.roles_usuario;
select valor, fecha_inicio_vigencia, fecha_fin_vigencia from public.uma_historico;
```

...devuelven los valores sembrados por `seed.sql` (ver `data-model.md`).

Confirmar también que el esquema `pld` existe (vacío):

```sql
select schema_name from information_schema.schemata where schema_name = 'pld';
```

## Buckets de Storage (User Story 3)

En Studio → Storage, o vía la API REST del gateway, confirmar que existen
exactamente estos 3 buckets tras el reset:

- `expedientes` (privado)
- `evidencias-pld` (privado)
- `logos-notaria` (público de solo lectura)

Confirmar que un archivo subido a `logos-notaria` es accesible por URL
pública sin autenticación, y que un intento equivalente contra
`expedientes` sin sesión autenticada es rechazado.

## Verificar RLS (cero tablas sin política)

```sql
select tablename
from pg_tables
where schemaname in ('public', 'pld')
  and tablename not in (
    select tablename from pg_policies where schemaname in ('public', 'pld')
  );
```

Debe devolver **cero filas** — cualquier tabla listada aquí es un hallazgo
que bloquea el criterio de aceptación de `spec.md`.

## Edge Functions (stub)

```bash
npx supabase functions serve
```

Invocar `notificar-evento` y `consultar-listas-pld` (vía `curl` al puerto
que reporte el comando) y confirmar que ambas responden con su estado
"no implementado" documentado, sin error de arranque del runtime.

## Variables de entorno

Confirmar que `.env.example` existe, está versionado, y documenta (sin
valores reales) `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` y los placeholders de
proveedores externos futuros. Confirmar que `.env.local` (con valores
reales, generados por `supabase start`) está en `.gitignore` y no aparece
en `git status`.

## Criterio de "hecho" para este feature

Todos los pasos de arriba se completan sin errores, la consulta de
políticas RLS devuelve cero filas, y una revisión rápida de
`supabase/migrations/` confirma que el esquema completo es reconstruible
únicamente desde ahí (sin pasos manuales adicionales documentados fuera de
`db reset`).
