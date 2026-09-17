# Feature Specification: Escrituras (entidad raíz)

**Feature Branch**: N/A — sin hook de creación de rama configurado (`.specify/extensions.yml` no existe); esta feature se gestiona únicamente por directorio (`specs/03-escrituras`).

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "La Escritura Pública (identificada por su instrumento) es la entidad central del sistema. Debe registrar acto jurídico, fecha de celebración, ubicación en el protocolo físico (libro/páginas) y responsable; garantizar numeración de instrumento consecutiva y no reutilizable (ni siquiera al anular); servir de hub con pestañas para todos los módulos relacionados (Comparecientes, Cumplimiento PLD, Expediente, Trámites, Avisos SAT/UIF, Órdenes de pago, Honorarios, Georreferenciación); y bloquear el avance a protocolizada si el cumplimiento PLD de los comparecientes no está resuelto, si hay un bloqueo activo, si el acto es traslativo sin predio georreferenciado, o si los porcentajes de participación capturados no suman 100%."

**Depende de**: `02-usuarios-roles` (permisos, `responsable_id`, `fn_has_permiso`), `01-infra-supabase` (convenciones de esquema y auditoría), `constitution.md` §8 (diseño previo obligatorio de pantallas con Stitch vía MCP).

**Referenciado por**: todos los módulos de negocio futuros — Comparecientes, Cumplimiento PLD, Expedientes, Trámites, Avisos SAT/UIF, Órdenes de pago, Honorarios, Georreferenciación — que se relacionarán a Escrituras por `escritura_id` y se definirán en sus propios specs.

## Clarifications

### Session 2026-09-15

- Q: ¿Cómo debe estructurarse la captura y validación de los campos 'número de escritura / instrumento' y 'volumen' al registrar una escritura? → A: Captura completamente libre de edición tanto en 'número de instrumento' como en 'volumen', sin sobreescritura automática por trigger. Dado que la notaría opera con numeración consecutiva histórica desde el inicio de operaciones del notario y frecuentemente gestiona tomos alternos (por ejemplo, un tomo para instrumentos pares y otro para nones, o tomos consecutivos simultáneos), el operador debe tener ambos campos editables en el formulario. La regla de validación del sistema consiste únicamente en verificar que el número de instrumento ingresado no exista ya registrado previamente en la base de datos (unicidad de instrumento, no reutilizable incluso si estuviera anulado).

### Session 2026-09-14

- Q: ¿Cómo debe capturarse y asignarse el número de escritura (instrumento) al registrar una nueva escritura en el sistema? → A: Captura manual obligatoria por el usuario en el formulario. En la práctica notarial los redactores y auxiliares capturan escrituras según la asignación previa de folios en el protocolo físico, por lo que el momento de captura en el sistema no siempre coincide con el orden correlativo cronológico. El sistema debe solicitar el campo "número de escritura" (entero positivo), validar su unicidad en el año y rechazar duplicados o números previamente registrados o anulados.
- Q: ¿Cómo debe condicionarse la visibilidad y validación del porcentaje de participación según el rol del compareciente? → A: Exclusivo para Adquirente. El campo de porcentaje de participación solo debe mostrarse y ser capturable cuando el rol seleccionado es "Adquirente" (para el resto de los roles permanece oculto y se almacena como null). En la validación del gate de protocolización, la regla de suma del 100% evalúa exclusivamente los porcentajes de los comparecientes con rol adquirente cuando al menos uno lo tenga capturado.
- Q: ¿Cómo debe comportarse la captura ágil con teclado (tecla Enter), la persistencia y la visualización de comparecientes según su calidad en el acto (enajenantes vs adquirentes)? → A: Enter guarda y reubica foco en Nombre + Diferenciación visual de partes. Al presionar Enter en el formulario, se guarda el compareciente, se limpian los campos y se posiciona automáticamente el foco nuevamente en el campo "Nombre del compareciente" para captura continua rápida. En la interfaz, las partes deben presentarse agrupadas o diferenciadas visualmente mediante marcos, contenedores o fondos cromáticos contrastantes que distingan con claridad a quienes enajenan (otorgantes/vendedores) de quienes adquieren (adquirentes/compradores).

### Session 2026-07-28

- Q: `escritura_comparecientes` requiere una FK real a `public.comparecientes(id)`, pero el módulo Comparecientes no tiene spec propio todavía (la constitución preveía construirlo antes que Escrituras). ¿Cómo debe resolver este feature esa dependencia hacia adelante? → A: Crear en este feature una tabla `comparecientes` mínima/placeholder (solo `id` + `nombre`, sin PLD ni catálogos), suficiente para que `escritura_comparecientes` tenga su FK real; el spec futuro de Comparecientes la ampliará con `ALTER TABLE`, no la recreará.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar una escritura con instrumento único (Priority: P1)

Como responsable de instrumentar actos en la notaría, quiero registrar una
escritura nueva capturando libremente su número de escritura (instrumento) y volumen
asignados en el protocolo físico (incluyendo tomos alternos para pares y nones o tomos simultáneos),
y que el sistema valide que el instrumento no esté duplicado ni haya sido utilizado
previamente, para llevar un control confiable alineado fielmente con los libros físicos.

**Why this priority**: Es el punto de entrada absoluto del sistema — sin
una escritura registrada con un instrumento confiable no existe nada
sobre lo cual operar el resto de los módulos de negocio.

**Independent Test**: Registrar escrituras con números de instrumento y volúmenes asignados
manualmente, intentar registrar un número duplicado o reutilizar el de una
escritura anulada, y confirmar que el sistema acepta números válidos no
utilizados y rechaza cualquier intento de duplicación en los registros.

**Acceptance Scenarios**:

1. **Given** un número de instrumento válido que no ha sido utilizado previamente,
   **When** un usuario con permiso registra la escritura con ese número y su volumen,
   **Then** el sistema la guarda exitosamente en estatus borrador respetando ambos valores.
2. **Given** un número de instrumento que ya existe en el protocolo notarial (o fue anulado previamente),
   **When** se intenta registrar una nueva escritura con dicho número,
   **Then** el sistema rechaza la operación e indica claramente que el número ya está en uso o no puede reutilizarse.
3. **Given** una escritura ya registrada, **When** su instrumento se
   muestra en cualquier parte de la interfaz, **Then** aparece siempre
   como `instrumento/año` (por ejemplo, `12,048/2026`).

---

### User Story 2 - Protocolizar una escritura solo cuando el cumplimiento está resuelto (Priority: P2)

Como responsable de una escritura, quiero poder protocolizarla únicamente
cuando todas las condiciones de cumplimiento están satisfechas —
identificación de comparecientes resuelta, sin bloqueos activos,
georreferenciación cuando aplica, y participación que sume 100% cuando se
capturó — para no formalizar un acto que después represente un riesgo
legal o regulatorio para la notaría.

**Why this priority**: Es la razón de ser del control central del
sistema — sin este bloqueo, Escrituras sería solo un registro pasivo, y
el cumplimiento regulatorio es el objetivo principal de todo el sistema.

**Independent Test**: Con una escritura en borrador, intentar
protocolizarla en distintos escenarios de incumplimiento (uno a la vez) y
confirmar que cada uno la bloquea con un mensaje que indica
específicamente qué falta; luego resolver todas las condiciones y
confirmar que la transición sí se permite.

**Acceptance Scenarios**:

1. **Given** una escritura en borrador con un compareciente cuyo
   cumplimiento PLD no está resuelto, **When** se intenta protocolizar,
   **Then** el sistema rechaza la acción indicando esa causa específica.
2. **Given** una escritura en borrador con un compareciente que tiene un
   bloqueo activo sin resolver, **When** se intenta protocolizar,
   **Then** el sistema rechaza la acción.
3. **Given** una escritura de un acto jurídico traslativo sin un predio
   georreferenciado asociado, **When** se intenta protocolizar, **Then**
   el sistema rechaza la acción.
4. **Given** una escritura con porcentajes de participación capturados
   que no suman exactamente 100%, **When** se intenta protocolizar,
   **Then** el sistema rechaza la acción.
5. **Given** una escritura que cumple las cuatro condiciones anteriores,
   **When** se intenta protocolizar, **Then** el sistema permite la
   transición y la escritura queda en estatus protocolizada.
6. **Given** cualquiera de los rechazos anteriores, **When** se intenta
   la misma transición sin pasar por la interfaz (llamando directamente
   a la capa de datos), **Then** el sistema la rechaza igual.
7. **Given** un operador capturando comparecientes en el formulario de la escritura,
   **When** presiona Enter en el último campo activo (o en porcentaje si es adquirente),
   **Then** el sistema guarda el compareciente en la lista, limpia los campos del formulario y reubica automáticamente el foco en el campo "Nombre del compareciente" para continuar la captura sin interrupción.
8. **Given** una escritura con otorgantes y adquirentes asociados,
   **When** el usuario visualiza la pestaña de Comparecientes,
   **Then** el sistema presenta secciones enmarcadas y con fondos cromáticos diferenciados para las partes que enajenan frente a las partes que adquieren, mostrando en estas últimas el resumen y porcentaje de alícuotas.

---

### User Story 3 - Anular una escritura sin perder su lugar en el protocolo (Priority: P3)

Como Administrador, quiero anular una escritura protocolizada por error o
por un motivo legal, dejando registrado el motivo, sin que su número de
instrumento quede disponible para ninguna otra escritura, para mantener
la integridad histórica del protocolo.

**Why this priority**: Es una salvaguarda de excepción, no una operación
diaria — solo tiene sentido una vez que existen escrituras protocolizadas
(User Story 2) sobre una numeración confiable (User Story 1).

**Independent Test**: Con una escritura protocolizada, anularla capturando
un motivo y confirmar que (a) queda en estatus anulada, (b) su
instrumento nunca vuelve a asignarse, y (c) un usuario sin el permiso
correspondiente no puede realizar la anulación.

**Acceptance Scenarios**:

1. **Given** una escritura protocolizada, **When** un usuario con el
   permiso de anulación intenta anularla sin capturar un motivo,
   **Then** el sistema rechaza la acción.
2. **Given** la misma escritura, **When** la anula capturando un motivo,
   **Then** queda en estatus anulada y su instrumento nunca vuelve a
   asignarse a otra escritura.
3. **Given** un usuario sin el permiso de anulación, **When** intenta
   anular una escritura, **Then** el sistema rechaza la acción.

---

### User Story 4 - Consultar y filtrar el protocolo (Priority: P4)

Como usuario con acceso a Escrituras, quiero ver el listado general con
filtros por estatus, acto jurídico, rango de fecha y responsable, para
ubicar rápidamente cualquier escritura sin recorrer todo el protocolo.

**Why this priority**: Mejora la operación diaria pero no es
indispensable para que el resto del sistema funcione — con los datos ya
capturados en las historias anteriores, la notaría podría operar
consultando registro por registro si tuviera que.

**Independent Test**: Con varias escrituras en distintos estatus, actos
jurídicos, fechas y responsables, aplicar cada filtro por separado y
confirmar que el listado se acota correctamente en cada caso.

**Acceptance Scenarios**:

1. **Given** escrituras en distintos estatus, **When** se filtra por uno
   específico, **Then** solo se muestran las que están en ese estatus.
2. **Given** escrituras de distintos actos jurídicos, **When** se filtra
   por uno de ellos, **Then** solo se muestran las de ese acto.
3. **Given** un usuario cuyo permiso sobre escrituras tiene alcance
   "propias", **When** consulta el listado, **Then** solo ve las
   escrituras de las que es responsable.

---

### Edge Cases

- ¿Qué pasa si dos usuarios intentan protocolizar la misma escritura al
  mismo tiempo? → El resultado observable debe ser una sola transición
  efectiva; el sistema nunca debe quedar en un estado inconsistente ni
  aplicar la transición dos veces.
- ¿Qué pasa si se intenta editar una escritura ya protocolizada (fuera de
  anularla)? → No se permite; una vez protocolizada, sus datos quedan
  fijos salvo la transición a anulada (ver Assumptions).
- ¿Qué pasa si el tipo del acto jurídico (traslativo/no traslativo)
  cambia en el catálogo después de que la escritura ya existe? → La
  escritura sigue el tipo vigente del acto jurídico seleccionado en el
  momento en que se evalúa la transición a protocolizada, no un valor
  capturado por separado y congelado desde el alta.
- ¿Qué pasa si ningún compareciente tiene un porcentaje de participación
  capturado? → La regla de "debe sumar 100%" no aplica; solo se activa
  cuando al menos un compareciente lo tiene capturado.
- ¿Qué pasa si se intenta eliminar (no anular) una escritura? → Solo se
  permite mientras está en estatus borrador; una escritura protocolizada
  o anulada nunca se elimina, únicamente se anula (ver Assumptions).
- ¿Qué pasa con las condiciones del gate que dependen de módulos que aún
  no tienen su propio spec (Cumplimiento PLD, Georreferenciación, Avisos
  SAT/UIF)? → Mientras esos módulos no existan, la condición
  correspondiente se considera satisfecha automáticamente (no bloquea la
  protocolización); se vuelve exigente en cuanto ese módulo se
  implemente (ver Assumptions).
- ¿Qué pasa con la asociación a un compareciente, si el módulo
  Comparecientes tampoco tiene spec propio todavía? → A diferencia de las
  condiciones anteriores, este feature sí crea una tabla `comparecientes`
  mínima (solo identificador y nombre) para que la asociación
  escritura-compareciente sea real desde el inicio, no simulada (ver
  Clarifications y Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Numeración e identidad del instrumento**

- **FR-001**: El sistema DEBE garantizar que ninguna escritura reciba un
  número de instrumento duplicado en los registros del notario (unicidad del
  número de instrumento en el protocolo notarial).
- **FR-002**: El sistema DEBE proporcionar campos de captura libre y obligatoria
  para el número de escritura (instrumento) y el volumen en el formulario de alta,
  permitiendo registrar instrumentos conforme a la asignación física de folios
  (incluyendo el manejo de tomos alternos para pares y nones o tomos simultáneos).
  El sistema DEBE validar de forma centralizada que el número de instrumento no
  exista ya en los registros de la notaría.
- **FR-003**: El sistema NUNCA DEBE permitir reutilizar un número de
  instrumento ya registrado, incluso si la escritura correspondiente
  se anula posteriormente — sin excepciones.
- **FR-004**: El sistema DEBE mostrar el instrumento de forma consistente
  como `instrumento/año` en toda la interfaz.

**Registro y datos de la escritura**

- **FR-005**: El sistema DEBE permitir registrar una escritura en estatus
  borrador capturando: número de escritura (instrumento obligatorio, entero positivo),
  volumen (obligatorio, entero positivo), acto jurídico (de un catálogo administrado en
  Administración General, del cual se deriva si es traslativo o no), objeto,
  ubicación en el protocolo físico (páginas opcionales), y responsable —
  asignado por defecto a quien la registra. La fecha de celebración y monto
  de la operación pueden capturarse en un momento posterior.
- **FR-006**: El sistema DEBE permitir asociar comparecientes a una
  escritura con un rol (otorgante, adquirente, apoderado, representante
  legal, testigo). El campo de porcentaje de participación DEBE
  solicitarse y mostrarse únicamente cuando el rol seleccionado sea
  `adquirente`; para el resto de los roles permanece oculto y se
  almacena como `null`.
- **FR-007**: El sistema DEBE exigir que, cuando al menos un adquirente
  de una escritura tenga un porcentaje de participación capturado, la suma
  de todos los porcentajes capturados en los comparecientes con rol
  `adquirente` sea exactamente 100% antes de permitir protocolizarla.
- **FR-008**: El sistema DEBE permitir eliminar por completo una
  escritura únicamente mientras está en estatus borrador; nunca cuando
  está protocolizada o anulada.

**Máquina de estados**

- **FR-009**: El sistema DEBE restringir las transiciones de estatus de
  una escritura a `borrador → protocolizada → anulada`, sin permitir
  ninguna transición de regreso.
- **FR-010**: El sistema DEBE bloquear la transición a protocolizada a
  menos que se cumplan, para todos los comparecientes asociados a la
  escritura: cumplimiento PLD resuelto, ausencia de bloqueos activos sin
  resolver, existencia de un predio georreferenciado cuando el acto
  jurídico es traslativo, y la regla de suma 100% de participación en
  adquirentes (FR-007) cuando aplique.
- **FR-011**: Cuando alguna condición del gate de protocolización no se
  cumpla, el sistema DEBE indicar específicamente cuál falta, no un
  mensaje genérico de rechazo.
- **FR-012**: El sistema DEBE restringir la transición a anulada a
  usuarios con el permiso correspondiente, y DEBE exigir que se capture
  un motivo de anulación no vacío.
- **FR-013**: El sistema DEBE registrar toda transición de estatus de una
  escritura de forma auditable (quién, cuándo, de qué estatus a cuál).

**Cumplimiento y control de acceso**

- **FR-014**: El gate de protocolización y las restricciones de anulación
  DEBEN reforzarse en la capa de datos, de modo que un intento de
  transición no permitida se rechace aunque se realice sin pasar por la
  interfaz.
- **FR-015**: El sistema DEBE restringir la reasignación del responsable
  de una escritura y la anulación a usuarios cuyo rol tenga el permiso
  correspondiente del catálogo de permisos existente, sin definir una
  matriz de permisos nueva ni separada de la ya establecida.
- **FR-016**: Para los permisos sobre escrituras con alcance "propias",
  el sistema DEBE limitar la acción a las escrituras donde el usuario es
  el responsable; para alcance "todas", DEBE permitir la acción sobre
  cualquier escritura — reutilizando el mismo mecanismo de alcance ya
  existente para el resto de los módulos de negocio.

**Presentación**

- **FR-017**: El sistema DEBE presentar el detalle de una escritura como
  un punto central (hub) con pestañas hacia sus módulos relacionados,
  mostrando la pestaña de georreferenciación únicamente cuando el acto
  jurídico de la escritura es traslativo. Ninguno de esos módulos
  relacionados DEBE aparecer como entrada independiente del menú de
  navegación lateral — solo Escrituras aparece ahí como punto de
  entrada.
- **FR-018**: El sistema DEBE permitir consultar el listado general de
  escrituras filtrando por estatus, acto jurídico, rango de fecha y
  responsable.
- **FR-019**: El sistema DEBE indicar, cuando la acción de protocolizar
  no está disponible para una escritura, específicamente qué condición
  falta (consistente con FR-011), sin requerir que el usuario lo intente
  para descubrirlo.

**Diseño de interfaz con Stitch**

- **FR-020**: El diseño visual y la distribución de información de las pantallas de este módulo (listado de escrituras `/escrituras` con filtros y chips de estatus, hub de detalle `/escrituras/[id]` con barra de acciones, pestañas y banner de cumplimiento PLD, diálogo modal de anulación, formulario de registro de instrumento, y pestaña de comparecientes con captura ágil continua y marcos diferenciados de enajenantes vs adquirentes [Stitch Screen ID `2e64c48905c64aca82513624580bf432`]) DEBEN ser generados previamente enviando una solicitud con los parámetros requeridos a Stitch (MCP) antes de su implementación en Vuetify, asegurando que la jerarquía visual de datos críticos notariales sea óptima.
- **FR-021**: El sistema DEBE ofrecer un flujo de captura continua ágil en el formulario de comparecientes, de tal forma que al presionar la tecla Enter en el último campo activo (o en porcentaje de participación cuando aplique) se guarde el registro, se restablezca el formulario y se posicione automáticamente el foco del cursor en el campo de nombre del compareciente sin requerir interacción con el ratón.
- **FR-022**: La interfaz del módulo de comparecientes DEBE diferenciar visualmente a los comparecientes según su calidad en el acto (quienes enajenan derechos —ej. otorgantes— frente a quienes los adquieren —adquirentes—), mediante marcos, contenedores con fondo diferenciado y distintivos visuales claros, permitiendo identificar inmediatamente las partes de la operación y el desglose acumulado de sus alícuotas.

### Key Entities *(include if feature involves data)*

- **Escritura**: entidad raíz del sistema; representa un acto jurídico
  formalizado, identificado por su instrumento (único e irrepetible por
  año), con un estatus (borrador/protocolizada/anulada), un acto
  jurídico, un responsable, y los datos de ubicación en el protocolo
  físico.
- **Acto jurídico (catálogo)**: tipo de acto que puede formalizarse
  (compraventa, testamento, poder, etc.), con un tipo fijo (traslativo o
  no traslativo) del que depende si aplica georreferenciación.
- **Compareciente**: identidad mínima (persona física o moral) que
  participa en una o más escrituras. Este feature crea únicamente su
  representación mínima (identificador y nombre); su ficha completa,
  identificación, y datos de cumplimiento PLD se definen en el spec
  futuro de Comparecientes, que amplía esta misma tabla en vez de
  reemplazarla.
- **Compareciente de escritura**: la relación entre una escritura y un
  compareciente, con un rol dentro de esa escritura y, opcionalmente, un
  porcentaje de participación.
- **Contador de instrumento**: mecanismo interno que garantiza la
  numeración consecutiva y única del instrumento por año.
- **Referencias externas (pendientes de spec propio)**: estatus de
  cumplimiento PLD y bloqueos de un compareciente, predio
  georreferenciado, y aviso SAT/UIF por umbral de monto — cada una es una
  condición del gate de protocolización, pero su modelo de datos y
  comportamiento detallado se definen en sus propios specs futuros (a
  diferencia de Compareciente, ninguna de estas requiere una tabla creada
  por este feature, porque la relación de dependencia va en sentido
  contrario: esos módulos futuros apuntarán hacia Escrituras/Comparecientes,
  no al revés).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ninguna escritura registrada recibe jamás un instrumento
  duplicado o repetido, incluso bajo captura simultánea por múltiples
  usuarios (verificado en el 100% de los casos probados).
- **SC-002**: El 100% de los intentos de protocolizar una escritura que
  no cumple alguna condición del gate son rechazados, tanto desde la
  interfaz como fuera de ella.
- **SC-003**: Un usuario puede identificar, únicamente a partir del
  mensaje mostrado por el sistema, qué condición falta para protocolizar
  una escritura, sin necesidad de ayuda externa.
- **SC-004**: Ningún instrumento de una escritura anulada vuelve a
  aparecer disponible para una escritura nueva, en el 100% de los casos.
- **SC-005**: Cero escrituras quedan protocolizadas con porcentajes de
  participación capturados que no sumen 100%.
- **SC-006**: El 100% de las vistas del módulo de escrituras (listado, detalle por pestañas y modales) se basan en una referencia visual previa generada por Stitch, garantizando legibilidad y consistencia de controles antes de su codificación en Vuetify.

## Assumptions

- El monto de la operación (`monto_operacion`) se captura en pesos
  mexicanos, consistente con el marco regulatorio (LFPIORPI) referenciado
  para el cumplimiento PLD.
- Una escritura protocolizada no admite edición de sus datos; solo
  mientras está en estatus borrador es editable. La única transición
  posterior permitida es a anulada.
- El catálogo de actos jurídicos (nombre, descripción, tipo,
  activo/inactivo) se administra desde Administración General, sujeto al
  mismo permiso ya usado para gestionar esa sección — no se crea un
  permiso nuevo y separado para este catálogo.
- Este feature crea una tabla `comparecientes` mínima (identificador y
  nombre únicamente) para que `escritura_comparecientes` tenga una FK
  real desde el inicio, en vez de depender de un tipo de dato genérico o
  de diferir la asociación de comparecientes por completo. El futuro
  spec de Comparecientes amplía esta tabla (`ALTER TABLE`) con
  identificación, catálogos y cumplimiento PLD — no la recrea ni rompe
  su FK existente (Clarification, sesión 2026-07-28).
- Mientras los specs de Cumplimiento PLD, Georreferenciación y Avisos
  SAT/UIF no existan, las condiciones del gate de protocolización que
  dependen de ellos se consideran satisfechas automáticamente (no
  bloquean), replicando el mismo patrón ya usado en `fn_has_permiso`
  (`02-usuarios-roles`) para módulos aún inexistentes — se vuelven
  exigentes en cuanto esos módulos se implementen, sin requerir cambios a
  este feature. A diferencia de Comparecientes, estos módulos no
  requieren una tabla creada por este feature: la relación de dependencia
  va en sentido contrario (ver Key Entities).
- Las páginas del protocolo físico (inicial/final) son opcionales al
  capturar y no son requisito para protocolizar; su propósito es
  exclusivamente de índice para reportes futuros.
- Los permisos `escrituras.reasignar_responsable` y `escrituras.anular`
  siguen la matriz de configuración inicial ya definida en
  `02-usuarios-roles` (únicamente Administrador) — no se redefinen aquí
  para no duplicar esa fuente de verdad.
- El módulo `00-layout-shell` deberá ajustarse en un feature posterior
  para reflejar que los módulos ligados a una escritura viven como
  pestañas del detalle, no como entradas propias del drawer — fuera de
  alcance de este feature.
