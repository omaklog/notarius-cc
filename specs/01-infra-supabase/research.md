# Research: Infraestructura Supabase (entorno local)

Sin `[NEEDS CLARIFICATION]` abiertos en `spec.md` — el input original ya
tomó las decisiones de mayor impacto (CLI vs. compose manual, puertos,
esquema `pld`). Este documento fija las decisiones técnicas concretas de
implementación derivadas de esas decisiones.

## 1. Fijar la versión de la CLI de Supabase

- **Decision**: Instalar la CLI como devDependency de npm (`supabase`,
  paquete oficial) con versión exacta fijada en `package.json`, en vez de
  depender de una instalación global (`brew install supabase/tap/supabase`
  u otra). Se invoca vía `npx supabase ...` o scripts de `package.json`
  (`yarn db:start`, `yarn db:reset`, etc.).
- **Rationale**: Satisface FR-004 (versión fijada en el repo) de forma
  verificable y reproducible: la versión exacta queda en `yarn.lock`, igual
  que el resto del stack de este proyecto (Nuxt, Vuetify). Evita el
  problema típico de "en mi máquina la CLI es una versión distinta a la
  tuya" que ocurre con instalaciones globales por sistema operativo.
  Confirmado disponible: el paquete `supabase` existe en el registro
  público de npm (última versión estable 2.110.0 al momento de este
  research; la versión exacta a fijar se decide en `/speckit-tasks` o al
  implementar, priorizando estabilidad sobre "latest").
- **Alternatives considered**: Instalación global de la CLI (vía Homebrew/
  binario) documentada solo en el README — rechazada como mecanismo
  principal porque no es verificable ni reproducible automáticamente (nada
  impide que dos máquinas tengan versiones distintas); se mantiene como
  alternativa de respaldo si el devDependency de npm da problemas en algún
  entorno.

## 2. Estructura de catálogos base mínimos

- **Decision**: Crear 4 tablas de catálogo mínimas en el esquema `public`
  (`tipos_acto_notarial`, `roles_compareciente`, `roles_usuario`,
  `uma_historico`), con solo las columnas necesarias para ser útiles como
  referencia (código, nombre/descripción, vigencia donde aplique, columnas
  de auditoría estándar) — ver `data-model.md`. Sembradas por
  `seed.sql` tras `supabase db reset`.
- **Rationale**: FR-007 exige que la reconstrucción del entorno deje los
  catálogos de `constitution.md` ya poblados. Modelarlos como tablas reales
  (no como enums/constantes hardcodeadas) permite que los módulos de
  negocio futuros (Escrituras, Comparecientes, Administración General) los
  extiendan vía foreign key sin rediseñar nada de este feature.
- **Alternatives considered**: Sembrar los catálogos como tipos `enum` de
  Postgres — rechazado porque `constitution.md` ya anticipa que UMA es
  histórico (`uma_historico`, con vigencia) y que el resto de catálogos
  puede crecer/editarse desde Administración General; un `enum` requeriría
  una migración de esquema para cada alta, mientras que una tabla permite
  altas vía datos (INSERT) sin migración nueva.

## 3. Valores concretos de seed (catálogos base)

- **Decision**: Poblar `seed.sql` con valores representativos y
  claramente documentados como punto de partida de desarrollo, no como
  catálogo oficial definitivo:
  - Roles de usuario: exactamente los 5 sugeridos en `constitution.md` §7
    (Notario, Abogado/Fedatario auxiliar, Asistente, Administrador,
    Oficial de cumplimiento PLD).
  - Roles de compareciente: otorgante, adquirente, apoderado, testigo
    (mencionados en `constitution.md` §3).
  - Tipos de acto notarial: un subconjunto representativo (p. ej.
    compraventa, donación, testamento, poder notarial, constitución de
    sociedad) suficiente para probar el flujo, no el catálogo completo
    del giro notarial.
  - UMA vigente: un valor y vigencia de ejemplo, marcado explícitamente en
    un comentario SQL como placeholder pendiente de actualización real por
    Administración General (`constitution.md` §6 exige actualización
    manual anual de este valor).
- **Rationale**: La curaduría definitiva de estos catálogos es
  responsabilidad de Administración General (spec futuro, ver
  `constitution.md` §8); este feature solo necesita que el entorno no
  quede vacío tras un reset, per la Assumption ya documentada en
  `spec.md`.
- **Alternatives considered**: Dejar los catálogos vacíos hasta que exista
  Administración General — rechazado porque rompe FR-007 y el criterio de
  aceptación de `spec.md` (el entorno debe ser "usable de inmediato" tras
  el reset).

## 4. Esquema `pld` separado

- **Decision**: Crear el esquema `pld` vacío (solo `CREATE SCHEMA IF NOT
  EXISTS pld;`) en la migración inicial, sin tablas todavía — el diseño de
  tablas de Cumplimiento PLD/UIF (`consulta_lista`, etc.) es responsabilidad
  de ese spec futuro.
- **Rationale**: FR-014 pide que el dominio PLD pueda aislarse para RLS y
  auditoría más estrictas. Reservar el esquema ahora evita que el futuro
  spec de Cumplimiento tenga que decidir esto de nuevo o migrar tablas ya
  creadas en `public` hacia `pld`.
- **Alternatives considered**: Esperar a crear el esquema `pld` hasta que
  exista el spec de Cumplimiento — rechazado porque es una decisión de
  aislamiento de datos ya tomada explícitamente en este spec (FR-014), y
  crearlo ahora es una operación de costo casi nulo.

## 5. Estrategia de pruebas para infraestructura

- **Decision**: No introducir un framework de pruebas automatizadas nuevo
  en este feature. La validación es manual, guiada por `quickstart.md`
  (arranque del stack, `db reset`, verificación de servicios/políticas
  RLS/buckets). Las políticas RLS se verifican consultando
  `pg_policies` desde Studio/`psql` como parte de esa validación manual.
- **Rationale**: `constitution.md` solo fija Vitest + Vue Test Utils para
  el frontend; no existe todavía una decisión de herramienta de pruebas
  para SQL/infraestructura. Introducir una sin que el proyecto la haya
  adoptado explícitamente sería una decisión de stack no autorizada por
  este feature.
- **Alternatives considered**: pgTAP (framework de pruebas SQL para
  Postgres) — evaluado y pospuesto; agregaría una dependencia y
  convención nueva sin que ningún otro módulo la necesite todavía. Se deja
  como recomendación futura si el número de políticas RLS/migraciones crece
  lo suficiente para justificar pruebas automatizadas de esquema.

## 6. Edge Functions: stub vs. implementación real

- **Decision**: Crear `supabase/functions/notificar-evento` y
  `supabase/functions/consultar-listas-pld` como funciones stub mínimas
  (responden con un estado "no implementado" explícito), no como
  implementaciones reales de negocio.
- **Rationale**: FR-001 exige que el runtime de Edge Functions esté
  disponible y sirva funciones como parte del stack; pero el "qué hacen"
  esas funciones (cotejo real de listas PLD, envío real de notificaciones)
  pertenece a los specs de Cumplimiento PLD y Notificaciones,
  respectivamente — ninguno de los dos existe todavía. Crear los stubs
  ahora deja la estructura de carpetas lista (coincide con el input
  original del usuario) sin inventar lógica de negocio que no ha sido
  especificada.
- **Alternatives considered**: No crear ninguna Edge Function todavía y
  solo documentar que el runtime existe — rechazado porque el criterio de
  aceptación de arranque del stack incluye el runtime de funciones, y un
  stub concreto es la forma más directa de probar que `supabase functions
  serve` funciona end-to-end.

## 7. Variables de entorno: ubicación y consumo

- **Decision**: `.env.example` y `.env.local` en la raíz del repo (mismo
  nivel que `package.json`), aunque este feature no conecta todavía el
  cliente Nuxt a Supabase (esa integración es de un feature futuro). Se
  documentan ahora para que el desarrollador tenga desde ya los valores
  que necesitará (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, más placeholders para
  proveedores externos futuros).
- **Rationale**: Es la ubicación convencional que herramientas Node/Nuxt
  ya esperan; documentarlas ahora evita que el feature de integración
  futuro tenga que re-descubrir qué variables existen.
- **Alternatives considered**: Colocar las variables dentro de
  `supabase/.env` — rechazado porque el consumidor real de estas variables
  es la aplicación completa (frontend + futuras Edge Functions), no solo
  la CLI de Supabase.
