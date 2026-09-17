# Feature Specification: Infraestructura Supabase (entorno local)

**Feature Branch**: N/A — sin hook de creación de rama configurado (`.specify/extensions.yml` no existe); esta feature se gestiona únicamente por directorio (`specs/01-infra-supabase`).

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Infraestructura Supabase (entorno local) — Módulo: 00-infra-supabase. Tipo: infraestructura transversal — base de todos los módulos de datos y autenticación. Levantar Supabase de forma local y reproducible como base de datos, autenticación, storage y funciones serverless del proyecto, usando la CLI oficial de Supabase (`supabase start`) en vez de un docker-compose manual. Incluye: stack local (Postgres, Auth, REST, Realtime, Storage, Studio, Edge Functions), convenciones de migraciones y seed data, variables de entorno, y buckets de Storage iniciales (expedientes, evidencias-pld, logos-notaria). RLS obligatorio desde la primera migración en toda tabla de negocio."

**Depende de**: `constitution.md` (stack tecnológico, catálogos base, convenciones de nombres, auditoría y gobernanza de diseño con Stitch).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Levantar el entorno local completo con un solo comando (Priority: P1)

Como desarrollador que se une al proyecto o retoma el trabajo tras actualizar
el repositorio, quiero poder levantar todo el backend local (base de datos,
autenticación, API, storage, panel de administración) con un solo comando,
para poder empezar a construir o probar cualquier módulo de negocio sin pasos
manuales ni configuración adicional.

**Why this priority**: Es la base absoluta — ningún otro módulo (Escrituras,
Comparecientes, Cumplimiento, etc.) puede desarrollarse ni probarse sin un
backend local funcional. Sin esto, el resto de los specs de negocio quedan
bloqueados.

**Independent Test**: En una máquina limpia (sin contenedores previos),
clonar el repositorio, ejecutar el comando de arranque documentado y
verificar que todos los servicios quedan disponibles en sus puertos
documentados, incluyendo el panel de administración.

**Acceptance Scenarios**:

1. **Given** un entorno limpio con Docker disponible, **When** el
   desarrollador ejecuta el comando de arranque documentado, **Then** el
   stack completo (base de datos, autenticación, API REST, tiempo real,
   storage, gateway, panel de administración, bandeja de correo simulada)
   queda disponible sin errores ni pasos manuales adicionales.
2. **Given** el stack ya está corriendo, **When** el desarrollador reinicia
   su máquina o reinicia los contenedores, **Then** los datos previamente
   creados siguen presentes (no se pierden por un simple reinicio).
3. **Given** el stack está corriendo, **When** el desarrollador abre el
   panel de administración local, **Then** puede ver y consultar las tablas,
   usuarios y el editor SQL sin configuración adicional.

---

### User Story 2 - Reconstruir el esquema y catálogos base de forma reproducible (Priority: P2)

Como desarrollador, quiero poder reconstruir el esquema de base de datos
completo desde archivos de migración versionados y tener los catálogos base
del sistema ya cargados, para que el entorno de cualquier persona del equipo
sea idéntico y utilizable de inmediato, sin depender de pasos manuales en el
panel de administración.

**Why this priority**: Garantiza que el esquema sea reproducible entre
máquinas y que el entorno local sea inmediatamente usable tras un reinicio
completo — depende de que el stack (User Story 1) ya esté disponible.

**Independent Test**: Con el stack corriendo, ejecutar el comando de
reconstrucción de base de datos y verificar que el esquema se recrea desde
los archivos de migración y que los catálogos base (tipos de acto notarial,
roles de compareciente, roles de usuario, valor inicial de UMA) quedan
poblados automáticamente.

**Acceptance Scenarios**:

1. **Given** el stack está corriendo, **When** el desarrollador ejecuta el
   comando de reconstrucción de base de datos, **Then** el esquema se
   reconstruye únicamente a partir de los archivos de migración versionados
   (no de cambios hechos a mano en el panel de administración).
2. **Given** la base de datos se acaba de reconstruir, **When** el
   desarrollador consulta los catálogos base, **Then** encuentra ya
   cargados los tipos de acto notarial, los roles de compareciente, los
   roles de usuario y un valor inicial de UMA vigente.
3. **Given** un desarrollador necesita cambiar el esquema, **When** hace el
   cambio siguiendo el flujo de migraciones documentado, **Then** ese cambio
   queda versionado y es reproducible por cualquier otro desarrollador que
   reconstruya su base de datos.

---

### User Story 3 - Almacenamiento de archivos con buckets predefinidos y seguros (Priority: P3)

Como desarrollador que empieza a construir un módulo que maneja archivos
(Expedientes, Cumplimiento PLD, branding institucional), quiero que los
espacios de almacenamiento ya existan con el nivel de acceso correcto desde
el primer arranque del entorno, para no tener que crear ni configurar buckets
manualmente antes de poder probar la subida de archivos.

**Why this priority**: Es un requisito de soporte para módulos futuros
(Expedientes, Cumplimiento PLD, Administración General) — no bloquea el
arranque básico del stack, pero debe existir antes de que esos módulos
empiecen a desarrollarse.

**Independent Test**: Tras reconstruir el entorno, verificar que existen
exactamente los espacios de almacenamiento esperados y que cada uno tiene el
nivel de acceso correcto (privado o público de solo lectura) sin necesidad de
crearlos manualmente.

**Acceptance Scenarios**:

1. **Given** el entorno se acaba de reconstruir, **When** el desarrollador
   revisa los espacios de almacenamiento disponibles, **Then** existen los
   tres espacios esperados: documentos de expedientes (privado), evidencias
   de cumplimiento PLD (privado) y logo institucional (público de solo
   lectura).
2. **Given** un espacio de almacenamiento es privado, **When** se intenta
   acceder a un archivo sin autenticación/autorización adecuada, **Then**
   el acceso se rechaza.
3. **Given** el espacio de logo institucional es público de solo lectura,
   **When** se solicita un archivo de ese espacio, **Then** se puede leer
   sin autenticación, pero no se puede escribir sin los permisos adecuados.

---

### Edge Cases

- ¿Qué pasa si un desarrollador edita el esquema directamente en el panel de
  administración sin crear una migración? → Ese cambio no queda versionado
  y se pierde en la siguiente reconstrucción del entorno; el flujo soportado
  es siempre migración → aplicar, nunca al revés.
- ¿Qué pasa si los puertos por defecto ya están en uso por otro proceso en
  la máquina del desarrollador? → El arranque del stack debe fallar con un
  mensaje claro señalando el conflicto, en vez de arrancar de forma parcial
  o silenciosa.
- ¿Qué pasa si falta una variable de entorno requerida al intentar conectar
  un módulo de negocio al backend? → La conexión debe fallar de forma clara
  y explícita, nunca degradar en un estado ambiguo o inconsistente.
- ¿Qué pasa si alguien intenta crear una tabla de negocio sin política de
  seguridad a nivel de fila? → No debe ser posible dejarla así ni siquiera
  temporalmente; toda tabla de negocio nace con su política desde la misma
  migración que la crea.
- ¿Qué pasa si se necesita agregar un nuevo espacio de almacenamiento más
  adelante (para un módulo futuro)? → Debe poder agregarse siguiendo el
  mismo mecanismo versionado, sin rediseñar el resto del entorno.

## Requirements *(mandatory)*

### Functional Requirements

**Arranque del entorno**

- **FR-001**: El sistema DEBE permitir levantar el stack local completo
  (base de datos, autenticación, API REST, tiempo real, storage, gateway
  único de entrada, panel de administración, bandeja de correo simulada y
  runtime de funciones serverless) con un único comando documentado, sin
  pasos manuales adicionales.
- **FR-002**: Cada servicio del stack DEBE quedar disponible en un puerto
  local fijo y documentado, con el gateway como único punto de entrada de
  API para el resto de la aplicación.
- **FR-003**: Los datos creados en el entorno local DEBEN persistir entre
  reinicios normales del stack; solo una acción explícita de reconstrucción
  de base de datos debe borrar los datos.
- **FR-004**: La versión de la herramienta usada para orquestar el stack
  DEBE quedar fijada/documentada en el repositorio, para evitar diferencias
  de comportamiento entre máquinas del equipo.

**Migraciones y datos base**

- **FR-005**: Todo cambio de esquema DEBE crearse como un archivo de
  migración SQL versionado; el esquema NO DEBE editarse directamente en el
  panel de administración sin su migración correspondiente.
- **FR-006**: El sistema DEBE poder reconstruir el esquema completo desde
  cero únicamente a partir de los archivos de migración versionados,
  produciendo un resultado idéntico en cualquier máquina.
- **FR-007**: La reconstrucción del entorno DEBE poblar automáticamente los
  catálogos base definidos en `constitution.md` (tipos de acto notarial,
  roles de compareciente, roles de usuario, valor inicial de UMA vigente),
  dejando el entorno inmediatamente utilizable.

**Almacenamiento de archivos**

- **FR-008**: El sistema DEBE crear, desde la reconstrucción inicial del
  entorno, tres espacios de almacenamiento con sus niveles de acceso
  correctos: documentos de expedientes (privado), evidencias de consultas
  de cumplimiento PLD (privado) y logo institucional (público de solo
  lectura).
- **FR-009**: Los espacios de almacenamiento privados NO DEBEN permitir
  lectura ni escritura sin autenticación/autorización adecuada; el espacio
  de logo institucional DEBE permitir lectura pública sin autenticación,
  pero no escritura.

**Variables de entorno**

- **FR-010**: El sistema DEBE documentar, en un archivo versionado sin
  valores reales, todas las variables de entorno necesarias para conectar
  cualquier módulo al backend local (incluyendo credenciales de
  proveedores externos que se integrarán en módulos futuros).
- **FR-011**: Las credenciales con privilegios elevados (rol de servicio)
  NUNCA DEBEN exponerse al cliente de la aplicación (Nuxt); su uso queda
  restringido a funciones serverless o procesos de servidor.

**Seguridad y convenciones de datos**

- **FR-012**: Ninguna tabla que contenga datos de negocio DEBE existir sin
  una política de seguridad a nivel de fila activa, desde la misma
  migración que la crea — sin excepciones temporales durante desarrollo.
- **FR-013**: Toda tabla de negocio DEBE seguir la convención de nombres y
  auditoría del proyecto: nombre en plural, identificador único
  autogenerado, y columnas estándar de auditoría (creación, última
  actualización, usuario que creó el registro).
- **FR-014**: Las tablas del dominio de Cumplimiento PLD/UIF DEBEN poder
  aislarse en un agrupamiento separado del resto de los datos de negocio,
  para permitir políticas de seguridad y auditoría más estrictas sin
  mezclarlas con el resto del sistema.

### Key Entities *(include if feature involves data)*

- **Catálogo de tipos de acto notarial**: lista base de tipos de acto
  (`constitution.md` §4/§8) necesaria para que cualquier módulo futuro que
  la referencie (Escrituras) tenga datos de partida en el entorno local.
- **Catálogo de roles de compareciente**: roles base con los que puede
  participar una persona en una escritura (otorgante, adquirente,
  apoderado, testigo, etc.), usados por el futuro módulo de Comparecientes.
- **Catálogo de roles de usuario**: roles base del sistema (Notario,
  Abogado/Fedatario auxiliar, Asistente, Administrador, Oficial de
  cumplimiento PLD), usados por autenticación/autorización.
- **UMA vigente**: valor inicial de la Unidad de Medida y Actualización con
  su vigencia, requerido por los cálculos de umbral de Cumplimiento
  PLD/UIF (`constitution.md` §6); el modelo completo de histórico de UMA es
  responsabilidad del futuro módulo de Administración General — este
  feature solo garantiza que exista un valor inicial sembrado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un desarrollador nuevo puede clonar el repositorio y tener el
  entorno backend local completo funcionando en menos de 5 minutos,
  siguiendo únicamente los comandos documentados.
- **SC-002**: El 100% de los cambios de esquema son reproducibles desde
  archivos de migración versionados — reconstruir el entorno en cualquier
  máquina produce un esquema idéntico.
- **SC-003**: El 100% de las tablas de negocio tienen una política de
  seguridad a nivel de fila activa en todo momento; cero tablas quedan sin
  una.
- **SC-004**: Los tres espacios de almacenamiento requeridos existen y
  tienen el nivel de acceso correcto inmediatamente después de cada
  reconstrucción del entorno, el 100% de las veces.
- **SC-005**: Un desarrollador puede identificar el propósito de cada
  variable de entorno requerida sin tener que preguntarle a otro miembro
  del equipo.
- **SC-006**: Los datos del entorno local persisten correctamente entre
  reinicios normales en el 100% de los casos, y solo se pierden ante una
  acción explícita de reconstrucción.

## Assumptions

- Los desarrolladores cuentan con Docker instalado y funcionando en su
  máquina; la instalación de Docker en sí queda fuera de alcance de este
  feature.
- Se adopta la herramienta de línea de comandos oficial de Supabase como
  mecanismo principal de orquestación (decisión ya tomada en el input de
  este feature); un archivo de orquestación manual propio queda documentado
  únicamente como referencia de respaldo, no como camino soportado activamente.
- El agrupamiento separado para Cumplimiento PLD/UIF (FR-014) se adopta como
  decisión firme de este feature, no como algo pendiente de decidir.
- Los valores concretos de los catálogos base (lista exacta de tipos de
  acto, roles, valor numérico y vigencia inicial de UMA) son datos de
  arranque representativos para desarrollo; su curaduría definitiva es
  responsabilidad del futuro módulo de Administración General y puede
  ajustarse sin rediseñar este feature.
- El diseño completo de tablas de cada módulo de negocio (Escrituras,
  Comparecientes, Cumplimiento PLD, etc.) NO es parte de este feature —
  este feature solo crea las tablas mínimas de catálogo necesarias para
  sembrar datos base, dejando el resto del modelo a cada spec de módulo.
- La estrategia de despliegue a producción (Supabase Cloud vs. self-host),
  CI/CD y respaldos quedan explícitamente fuera de alcance (specs futuros).
- Un único entorno Supabase local por desarrollador es suficiente; no se
  requiere soporte multi-entorno local simultáneo.
- Este módulo es estrictamente de infraestructura de backend (base de datos,
  RLS, Storage, Auth y Edge Functions) y no implementa pantallas de usuario
  en el frontend. Toda interfaz o consola visual que se construya a futuro
  para interactuar con este backend DEBERÁ apegarse a la regla constitucional
  de generación de pantallas previas con Stitch (MCP).
