# Feature Specification: Usuarios, roles y permisos

**Feature Branch**: N/A — sin hook de creación de rama configurado (`.specify/extensions.yml` no existe); esta feature se gestiona únicamente por directorio (`specs/02-usuarios-roles`).

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Sistema de autenticación (Supabase Auth) y autorización dinámica: en vez de roles fijos codificados con permisos hardcodeados, el sistema expone un catálogo de permisos granular y una tabla de roles editables, para que un Administrador pueda crear roles nuevos y ajustar qué puede hacer cada uno sin cambiar código. Se conservan 3 roles como configuración inicial (seed), no como límite del sistema: Administrador, Auxiliar, Gestor. El alcance de cada permiso (propias vs. todas las escrituras) es configurable por rol. Toda regla de autorización se refuerza a nivel de base de datos (RLS), nunca solo en la interfaz."

**Depende de**: `01-infra-supabase` (RLS, convenciones de esquema y auditoría), `00-layout-shell` (visibilidad de módulos en el drawer según permisos del usuario), `constitution.md` §8 (diseño previo obligatorio de pantallas con Stitch vía MCP).

## Clarifications

### Session 2026-07-27

- Q: FR-017 requires tracking who/when/what changed for roles, role-permissions, and user role assignments. Given the notary/PLD compliance context, how deep should this audit trail be? → A: Full immutable history — append-only log capturing before/after values for every change to roles, role-permissions, and user role assignments, queryable later; no browsable history screen is required by this feature.
- Q: The permission catalog (section 4) has no module for managing users themselves (invite, deactivate, assign role) — only a blanket `administracion.acceso`. What should gate user management actions? → A: Reuse `administracion.acceso` — no new dedicated permission; managing users is part of the same Administración General access, never a hardcoded check against a role name.
- Q: FR-016 blocks reassigning the last admin-access user's role or removing their permission, so the system never has zero admins. Should it also block simply deactivating that same last admin user? → A: Yes — deactivating the last user with `administracion.acceso` is blocked the same way as reassigning their role or removing their permission, since it has the identical effect.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso seguro según mi rol (Priority: P1)

Como usuario invitado al sistema (con un rol ya asignado por un
Administrador), quiero iniciar sesión con mi correo y contraseña y ver/
poder hacer únicamente lo que mi rol permite — en el menú de navegación y
al intentar cualquier acción — para trabajar sin exponerme (ni exponer al
sistema) a acciones que no me corresponden.

**Why this priority**: Es la base absoluta de todo el sistema — sin
autenticación y sin que el control de acceso realmente se cumpla (no solo
en la interfaz, sino también si alguien intenta forzar una acción por
fuera de ella), ningún otro módulo de negocio puede considerarse seguro
para operar, sin importar cuántos roles configurables existan.

**Independent Test**: Con los 3 roles de arranque (Administrador, Auxiliar,
Gestor) ya sembrados, iniciar sesión como cada uno y verificar que: (a) el
menú de navegación solo muestra lo que su rol permite, (b) las acciones
permitidas funcionan, y (c) las acciones no permitidas se rechazan aunque
se intenten de forma directa (no solo ocultando el botón).

**Acceptance Scenarios**:

1. **Given** un usuario con rol Auxiliar que no es responsable de una
   escritura, **When** intenta editar los comparecientes, el expediente,
   los trámites o las órdenes de pago de esa escritura, **Then** el
   sistema rechaza la acción.
2. **Given** el mismo usuario Auxiliar, **When** intenta dar de alta un
   registro de Cumplimiento PLD o editar Georreferenciación de cualquier
   escritura (no solo las propias), **Then** el sistema lo permite (estos
   dos módulos tienen alcance "todas" en la configuración inicial).
3. **Given** un usuario con rol Auxiliar o Gestor, **When** intenta
   editar o eliminar un registro de Cumplimiento PLD, o modificar
   Honorarios más allá de consultarlos, **Then** el sistema rechaza la
   acción (reservada al rol Administrador en la configuración inicial).
4. **Given** un usuario con rol Gestor, **When** crea, edita o elimina un
   Trámite de cualquier escritura sin ser su responsable, **Then** el
   sistema lo permite (único módulo de negocio con alcance "todas" pleno
   para ese rol en la configuración inicial).
5. **Given** un usuario cuyo rol no incluye acceso a Administración
   General, **When** ve el menú de navegación, **Then** esa sección no
   aparece.

---

### User Story 2 - Un Administrador reconfigura roles y permisos sin ayuda técnica (Priority: P2)

Como Administrador, quiero crear roles nuevos, ajustar qué puede hacer
cada rol (con qué alcance) y asignar un rol a cada usuario, todo desde la
interfaz de Administración General, para adaptar el control de acceso a
cómo se organiza mi notaría sin depender de que alguien cambie código.

**Why this priority**: Es la razón de ser de este feature frente a un
esquema de roles fijos — pero solo tiene sentido una vez que la
autorización base (User Story 1) ya funciona de forma confiable con los
roles de arranque.

**Independent Test**: Como Administrador, crear un rol nuevo, asignarle un
subconjunto de permisos con su alcance, asignarlo a un usuario de prueba,
y verificar que ese usuario queda inmediatamente limitado a exactamente
esos permisos — sin haber tocado ninguna migración ni código.

**Acceptance Scenarios**:

1. **Given** un Administrador en la sección de roles de Administración
   General, **When** crea un rol nuevo con nombre y descripción,
   **Then** el rol queda disponible de inmediato para asignarse a
   usuarios.
2. **Given** un rol existente, **When** el Administrador marca o
   desmarca permisos del catálogo (agrupados por módulo y acción) y, para
   los que lo requieren, elige el alcance ("propias" o "todas"),
   **Then** esos cambios se reflejan de inmediato para todo usuario con
   ese rol, sin requerir que vuelva a iniciar sesión.
3. **Given** un usuario existente, **When** el Administrador le asigna un
   rol distinto desde una lista que refleja los roles actuales del
   sistema (no una lista fija), **Then** el usuario queda sujeto a los
   permisos del nuevo rol de inmediato.
4. **Given** un rol marcado como parte de la configuración inicial del
   sistema (Administrador, Auxiliar, Gestor), **When** el Administrador
   intenta eliminarlo, **Then** el sistema lo impide, aunque sí le permite
   editar sus permisos.
5. **Given** un rol creado por el propio Administrador (no parte de la
   configuración inicial) sin usuarios asignados, **When** intenta
   eliminarlo, **Then** el sistema lo permite.

---

### User Story 3 - El sistema nunca se queda sin quien lo administre (Priority: P3)

Como Administrador, quiero que el sistema me impida dejar la notaría sin
nadie que pueda administrarla — por accidente, al reconfigurar roles o
quitarle acceso a alguien — para no quedar bloqueado fuera de mi propio
sistema.

**Why this priority**: Es una salvaguarda de continuidad, no una
funcionalidad de uso diario — depende de que la configuración dinámica
(User Story 2) ya exista, y protege contra el peor caso de esa misma
flexibilidad (un error de configuración que bloquee el acceso
administrativo).

**Independent Test**: Con un solo usuario activo con acceso administrativo,
intentar quitarle ese acceso por cualquiera de las tres vías posibles
(reasignarle otro rol, remover el permiso de administración de su rol si
es el único con ese permiso, o desactivar su cuenta) y verificar que el
sistema lo bloquea en los tres casos con una explicación clara.

**Acceptance Scenarios**:

1. **Given** un único usuario activo con acceso a Administración General,
   **When** se intenta reasignarle un rol sin ese acceso, quitarle ese
   permiso a su rol actual (si es el último rol con ese permiso), o
   desactivar su cuenta, **Then** el sistema rechaza la acción en los tres
   casos.
2. **Given** un rol con usuarios activos asignados, **When** se intenta
   eliminar ese rol, **Then** el sistema lo rechaza sin importar si es un
   rol de la configuración inicial o uno creado después.

---

### Edge Cases

- ¿Qué pasa si a un usuario le cambian el rol (o le desactivan permisos)
  mientras tiene una sesión abierta? → El siguiente intento de acción ya
  refleja el cambio; no depende de que vuelva a iniciar sesión (ver NFR de
  reconfiguración en caliente).
- ¿Qué pasa si se desactiva la cuenta de un usuario (`activo = false`)
  mientras tiene sesión abierta? → Sus próximas acciones quedan
  rechazadas, aunque su sesión técnica no se cierre de forma forzada de
  inmediato.
- ¿Qué pasa si alguien intenta realizar una acción directamente (sin pasar
  por la interfaz) que su rol no permite? → Se rechaza igual — la regla
  vive en la capa de datos, no solo en lo que la interfaz muestra u oculta.
- ¿Qué pasa si un permiso no aplica el concepto de "propias vs. todas"
  (p. ej. Notificaciones, Reportes, Administración general)? → El alcance
  no aplica para ese permiso; solo importa si el rol lo tiene o no.
- ¿Qué pasa si dos Administradores editan el mismo rol al mismo tiempo? →
  Fuera de alcance de este feature resolver conflictos de edición
  concurrente; el último cambio guardado es el que aplica.

## Requirements *(mandatory)*

### Functional Requirements

**Autenticación**

- **FR-001**: El sistema DEBE autenticar usuarios mediante correo y
  contraseña.
- **FR-002**: El sistema NO DEBE permitir que un usuario se autoregistre;
  las cuentas se crean únicamente por invitación de un usuario con el
  permiso `administracion.acceso` (no una comprobación fija contra el
  nombre del rol "Administrador" — gestionar usuarios es parte del mismo
  acceso a Administración General, sujeto al mismo permiso del catálogo
  que el resto de esa sección).

**Catálogo de permisos y roles dinámicos**

- **FR-003**: El sistema DEBE mantener un catálogo de permisos agrupado
  por módulo de negocio y acción (ver constitution.md §4 para los módulos),
  donde cada permiso indica si el concepto "propias vs. todas las
  escrituras" le aplica o no.
- **FR-004**: El sistema DEBE permitir crear, ver y (para roles que no son
  de la configuración inicial) eliminar roles sin requerir cambios de
  código ni migraciones nuevas.
- **FR-005**: El sistema DEBE permitir asignar o quitar, para cualquier
  rol, cualquier permiso del catálogo, y —cuando ese permiso lo requiera—
  elegir su alcance ("propias" o "todas las escrituras").
- **FR-006**: El sistema DEBE permitir asignar a cada usuario un rol de
  entre los roles existentes en ese momento (no una lista fija de roles
  codificada).
- **FR-007**: El sistema DEBE reflejar cualquier cambio de permisos o de
  alcance de un rol de inmediato para todos los usuarios que lo tengan
  asignado, sin requerir que cierren y vuelvan a iniciar sesión.
- **FR-008**: El sistema DEBE traer, como configuración inicial (no como
  límite), tres roles — Administrador, Auxiliar y Gestor — con los
  permisos y alcances descritos en la sección de Assumptions, totalmente
  editables después desde la interfaz.
- **FR-009**: El sistema DEBE impedir eliminar un rol que tenga usuarios
  activos asignados, sin importar si es un rol de la configuración
  inicial o uno creado después.
- **FR-010**: El sistema DEBE impedir eliminar los roles marcados como
  parte de la configuración inicial del sistema, aunque sí debe permitir
  editar sus permisos.

**Propiedad ("responsable") y alcance**

- **FR-011**: El sistema DEBE asociar cada escritura a un usuario
  responsable, asignado por defecto a quien la crea.
- **FR-012**: El sistema DEBE restringir el cambio de responsable de una
  escritura únicamente a usuarios cuyo rol tenga el permiso
  correspondiente (en la configuración inicial, solo Administrador).
- **FR-013**: Para los permisos con alcance "propias", el sistema DEBE
  limitar la acción a las escrituras donde el usuario es el responsable;
  para alcance "todas", DEBE permitir la acción sobre cualquier escritura.

**Cumplimiento y refuerzo de reglas**

- **FR-014**: Toda regla de autorización DEBE reforzarse en la capa de
  datos (no solo ocultando opciones en la interfaz), de modo que una
  acción no permitida se rechace aunque se intente sin pasar por la
  interfaz.
- **FR-015**: El sistema DEBE ocultar del menú de navegación cualquier
  sección para la que el usuario no tenga el permiso correspondiente
  (p. ej. Administración General si no tiene `administracion.acceso`).
- **FR-016**: El sistema DEBE impedir que la notaría quede sin ningún
  usuario activo con acceso a Administración General — ya sea
  reasignando el rol de ese usuario, quitándole ese permiso a su rol si
  es el único que lo tiene, o desactivando la cuenta de ese usuario
  (`activo = false`) cuando es el último con ese acceso. Las tres vías
  producen el mismo resultado (cero administradores activos) y deben
  bloquearse por igual.

**Auditoría**

- **FR-017**: El sistema DEBE mantener un historial completo e inmutable
  (no solo el último estado) de todo cambio en roles, en los permisos
  asignados a un rol (incluyendo su alcance), y en el rol asignado a un
  usuario — registrando quién, cuándo, y los valores antes/después de
  cada cambio. Este feature no requiere construir una pantalla para
  consultar ese historial; solo que quede capturado y sea consultable
  después.

**Diseño de interfaz con Stitch**

- **FR-018**: El diseño visual y flujo de interfaz de las pantallas de este módulo (inicio de sesión `/login`, gestión de usuarios `/administracion-general/usuarios` y administración de roles con matriz de permisos `/administracion-general/roles`) DEBE generarse previamente mediante solicitudes con parámetros contextuales a Stitch (MCP) antes de su codificación en Vuetify, optimizando la visualización, la densidad de controles y la ergonomía de administración de permisos.

### Key Entities *(include if feature involves data)*

- **Usuario / Perfil**: identidad autenticada de una persona que usa el
  sistema; tiene un rol asignado y un estado activo/inactivo.
- **Rol**: agrupación de permisos con nombre, con o sin la marca de "parte
  de la configuración inicial" (que lo protege de eliminación, no de
  edición).
- **Permiso**: una acción posible sobre un módulo de negocio (p. ej.
  "escrituras.editar"), con una indicación de si el concepto de alcance
  aplica.
- **Asignación de permiso a rol**: la relación entre un rol y un permiso,
  con su alcance ("propias"/"todas") cuando aplica.
- **Escritura (referencia)**: entidad raíz del sistema (definida por su
  propio spec futuro) de la que este feature solo necesita el concepto de
  "responsable", para resolver el alcance "propias" de cada permiso.
- **Bitácora de cambios (audit log)**: registro histórico e inmutable de
  cada cambio a roles, a los permisos/alcance asignados a un rol, y al rol
  de un usuario — quién, cuándo, y los valores antes/después. No se borra
  ni se sobreescribe; solo se agregan entradas nuevas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Administrador puede crear un rol, configurar sus
  permisos y alcance, y asignarlo a un usuario, completamente desde la
  interfaz, sin ninguna intervención de desarrollo.
- **SC-002**: El 100% de los cambios de permisos o alcance de un rol se
  reflejan para sus usuarios sin que necesiten volver a iniciar sesión.
- **SC-003**: El 100% de las acciones bloqueadas por el rol de un usuario
  se rechazan también cuando se intentan directamente (no solo cuando la
  interfaz las oculta).
- **SC-004**: El sistema nunca permite llegar a un estado con cero
  usuarios activos con acceso a Administración General.
- **SC-005**: El 100% de los cambios a roles, permisos de rol, o rol de un
  usuario quedan en un historial inmutable y consultable (quién, cuándo,
  valores antes/después) — ninguno se pierde ni se sobreescribe.
- **SC-006**: Con la configuración inicial de roles, el 100% de los
  escenarios de aceptación de las 3 historias de usuario se cumplen sin
  ajustar nada manualmente.
- **SC-007**: El 100% de las vistas del módulo (`/login`, `/administracion-general/usuarios`, `/administracion-general/roles`) cuentan con un diseño de referencia generado por Stitch que valida la jerarquía visual, la ergonomía de checklists y la disposición de formularios antes de su codificación en Vuetify.

## Assumptions

- **Configuración inicial de roles y permisos** (sembrada, 100% editable
  después):
  - **Administrador**: todos los permisos del catálogo con alcance
    "todas" donde aplica; único rol con acceso a Administración General,
    con la capacidad de anular escrituras y reasignar su responsable, y
    con permisos completos sobre Cumplimiento PLD y Honorarios.
  - **Auxiliar**: alcance "propias" en Escrituras (sin anular ni
    reasignar responsable), Comparecientes, Expedientes, Trámites y
    Órdenes de pago; alcance "todas" en Cumplimiento PLD (solo
    ver/crear) y en Georreferenciación (control total); solo lectura en
    Honorarios.
  - **Gestor**: alcance "todas" en Escrituras, Comparecientes,
    Cumplimiento PLD (solo ver/crear), Expedientes, Avisos SAT, Órdenes
    de pago, Honorarios (todo solo lectura) y Georreferenciación (control
    total); único rol de negocio con control total ("todas") sobre
    Trámites sin ser responsable de la escritura; acceso de lectura a
    Notificaciones y a reportes operativos.
  - Ningún rol de la configuración inicial distinto de Administrador
    tiene acceso a Administración General, ni puede editar/eliminar
    registros de Cumplimiento PLD, ni modificar Honorarios más allá de
    consultarlos.
- El flujo exacto de invitación (vigencia del enlace, cambio de
  contraseña obligatorio en el primer ingreso) sigue el comportamiento
  estándar de autenticación por invitación; no se detalla más allá de
  "sin autoregistro" porque no cambia el alcance de este feature.
- Este feature no incluye autenticación multifactor ni inicio de sesión
  con proveedores externos (Google, etc.) — se asume email + contraseña
  únicamente para esta versión.
- El diseño detallado de la tabla `escrituras` y de las tablas de
  Comparecientes, Cumplimiento PLD, Expedientes, etc., pertenece a sus
  propios specs futuros; este feature solo exige que esas tablas
  incorporen el concepto de "responsable" y consulten el mecanismo de
  autorización que aquí se define — no las diseña.
- El catálogo dinámico de roles/permisos que aquí se define es la única
  fuente de verdad del rol de un usuario. El catálogo estático de roles
  de usuario sembrado como parte de `01-infra-supabase` queda superado
  por este modelo dinámico una vez implementado (a reconciliar en el
  plan técnico de este feature, no en este documento).
- `constitution.md` §7 sugiere una lista de roles distinta (Notario,
  Abogado/Fedatario auxiliar, Asistente, Administrador, Oficial de
  cumplimiento) a la configuración inicial de este feature (Administrador,
  Auxiliar, Gestor). Como el modelo pasa a ser dinámico, esa lista deja de
  ser prescriptiva; se recomienda una enmienda de la constitución
  (`/speckit-constitution`) para reflejarlo, por separado de este spec.
- No se resuelven conflictos de edición concurrente sobre el mismo rol
  (dos Administradores editando a la vez); se asume uso de baja
  concurrencia sobre esta pantalla administrativa.
