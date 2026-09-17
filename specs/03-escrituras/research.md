# Research: Escrituras (entidad raíz)

Este documento resuelve las decisiones técnicas necesarias para el diseño
de `data-model.md` y `contracts/`, derivadas de inspeccionar el esquema
real ya existente (`01-infra-supabase`, `02-usuarios-roles`) en vez de
asumirlo — cada hallazgo real se documenta con su decisión y alternativas
consideradas, siguiendo el mismo formato usado en
`02-usuarios-roles/research.md`.

## 1. `tipos_acto_notarial` (01-infra-supabase) se evoluciona a `actos_juridicos`, no se duplica

**Hallazgo**: `01-infra-supabase` ya creó `public.tipos_acto_notarial`
(`codigo`, `nombre`, `activo`) como catálogo estático — RLS solo permite
`select` a `authenticated`; escribir requiere `service_role` (sin panel de
administración). El comentario de esa migración ya anticipaba esto:
"su curaduría final es responsabilidad del futuro módulo de Administración
General". El spec de entrada de esta feature define un catálogo
`actos_juridicos` (`nombre` único, `descripcion`, `tipo`
`traslativo`/`no_traslativo`, `activo`) administrado con CRUD estándar
desde Administración General — es el mismo concepto, con el esquema que
le faltaba para ser realmente editable y para derivar el tipo de acto.

**Decision**: Evolucionar la tabla existente en vez de crear una paralela:
`alter table public.tipos_acto_notarial rename to actos_juridicos`, quitar
`codigo` (nada la referencia todavía como llave estable — este es el
primer feature que realmente consume este catálogo, vía FK por `id`, no
por `codigo`), agregar `descripcion text` y
`tipo public.tipo_acto_juridico not null`, backfillear `tipo` para las 5
filas ya sembradas (`compraventa`→traslativo, `donacion`→traslativo,
`testamento`→no_traslativo, `poder_notarial`→no_traslativo,
`constitucion_sociedad`→no_traslativo), y reemplazar la política
`_all_service_role` por una gated con `fn_has_permiso('administracion',
'acceso')` para que el CRUD real sea posible desde la interfaz.

**Alternatives considered**:
- Crear `actos_juridicos` como tabla nueva y dejar `tipos_acto_notarial`
  huérfana → duplica la fuente de verdad del mismo concepto y obliga a
  re-sembrar datos ya existentes; rechazada.
- Mantener `codigo` como columna adicional (no unique) por compatibilidad
  → sin ningún consumidor real de `codigo` todavía, es complejidad sin
  beneficio; rechazada.

## 2. `roles_compareciente` (01-infra-supabase) se da de baja — se usa un CHECK constraint fijo, no un catálogo editable

**Hallazgo**: `01-infra-supabase` también sembró `public.roles_compareciente`
(catálogo estático de rol: otorgante/adquirente/apoderado/testigo, mismas
restricciones de escritura que `tipos_acto_notarial` tenía). El spec de
entrada de esta feature, en cambio, especifica literalmente
`escritura_comparecientes.rol` como un `check (rol in ('otorgante',
'adquirente', 'apoderado', 'representante_legal', 'testigo'))` — un valor
fijo en el esquema, no una FK a un catálogo editable — y agrega
`representante_legal`, que `roles_compareciente` no tiene.

**Decision**: Usar el `check` constraint tal como lo especifica el spec de
entrada (no es ambiguo, es una decisión ya tomada ahí) y dar de baja
`roles_compareciente` (`drop table`) por quedar superada y sin ningún
consumidor — mismo tratamiento que `02-usuarios-roles` le dio a
`roles_usuario` cuando quedó superada por el sistema de roles dinámicos.

**Alternatives considered**:
- Migrar `roles_compareciente` a una FK real desde
  `escritura_comparecientes.rol_id` → contradice el spec de entrada, que
  ya fijó esto como un enum de esquema, no un catálogo editable;
  rechazada.
- Dejar `roles_compareciente` sin usar "por si acaso" → tabla huérfana sin
  ningún propósito, ruido en el esquema; rechazada (mismo criterio que la
  baja de `roles_usuario`).

## 3. Numeración de instrumento: contador server-side, ignorando cualquier valor enviado por el cliente

**Decision**: Tabla `instrumento_control(anio integer primary key,
ultimo_numero integer not null default 0)`. Una función
`fn_siguiente_instrumento(p_anio) returns integer` hace
`insert ... on conflict (anio) do nothing` seguido de
`update ... set ultimo_numero = ultimo_numero + 1 where anio = p_anio
returning ultimo_numero` — el `UPDATE` con `WHERE` sobre la llave primaria
toma el lock de fila necesario para serializar a los llamantes
concurrentes (equivalente a `SELECT ... FOR UPDATE` pero en una sola
sentencia, sin round-trip adicional). Un trigger `BEFORE INSERT` en
`escrituras` calcula `anio` como el año de `now()` (nunca el que envíe el
cliente, y no se deriva de `fecha_celebracion` porque esta puede
capturarse después — el año de apertura del protocolo es el de creación
del registro, no el de celebración del acto) y siempre sobreescribe
`instrumento` con `fn_siguiente_instrumento(anio)`, ignorando cualquier
valor que el cliente haya enviado en ese campo. Esto cierra por completo
cualquier vector de carrera o manipulación desde el cliente (FR-002).

**Alternatives considered**:
- Secuencia nativa de Postgres (`serial`/`sequence`) por año → requeriría
  una secuencia por año creada dinámicamente (o una sola secuencia global,
  que no resetea por año); la tabla de control explícita es más simple de
  auditar/consultar (`select * from instrumento_control`) y es la que ya
  recomendaba el spec de entrada.
- Calcular el siguiente número con `select max(instrumento)+1 from
  escrituras where anio=...` dentro de la transacción → sujeto a
  condición de carrera real bajo aislamiento `read committed` (dos
  transacciones pueden leer el mismo `max` antes de que ninguna haga
  commit); rechazada explícitamente por el spec de entrada (FR-002).

## 4. Gate de protocolización: función que devuelve la lista de motivos faltantes, reutilizada por el trigger y por la interfaz

**Decision**: `fn_validar_protocolizacion(p_escritura_id uuid) returns
text[]` — arreglo de mensajes en español, uno por cada condición
incumplida (vacío si puede protocolizarse). La reutiliza:
(a) un trigger `BEFORE UPDATE` en `escrituras` que, cuando
`new.estatus = 'protocolizada'`, exige que el arreglo esté vacío o
rechaza con esos mismos mensajes unidos (refuerzo real en la capa de
datos, FR-014); y (b) una función RPC expuesta a la interfaz para que el
botón "Protocolizar" muestre el tooltip específico sin necesidad de
intentar la transición (FR-019, evita que el usuario tenga que adivinar).
Las condiciones que dependen de módulos aún inexistentes (Cumplimiento
PLD/bloqueos, Georreferenciación) usan el mismo patrón de
`to_regclass('public.<tabla_futura>') is null` ya usado en
`fn_has_permiso` — mientras esas tablas no existan, esa condición
particular no aparece en el arreglo (se considera satisfecha).

**Alternatives considered**:
- Un trigger que solo devuelva `true`/`false` (sin detalle) → no cumple
  FR-011/FR-019 (mensaje específico); rechazada.
- Duplicar la lógica de validación en el frontend y en un trigger
  separado → viola FR-014 (el frontend nunca es la única barrera) y
  duplica la fuente de verdad; rechazada. Una sola función SQL,
  consumida por ambos, evita la duplicación.

## 5. Máquina de estados e inmutabilidad: un solo trigger `BEFORE UPDATE`

**Decision**: Un trigger `fn_validar_transicion_escritura()` centraliza
las reglas de transición:
- `old.estatus = 'anulada'` → cualquier `UPDATE` se rechaza (estado
  terminal, sin excepción).
- `old.estatus = 'protocolizada'` y `new.estatus = 'protocolizada'` (un
  intento de editar campos manteniendo el mismo estatus) → se rechaza
  (inmutable salvo la transición a anulada — edge case ya documentado en
  spec.md).
- `old.estatus = 'protocolizada'` y `new.estatus = 'anulada'` → se
  permite solo si ningún otro campo cambió salvo `motivo_anulacion`/
  `updated_at`, `motivo_anulacion` no es vacío, y
  `fn_has_permiso('escrituras', 'anular', old.id)` es verdadero.
- `old.estatus = 'borrador'` y `new.estatus = 'borrador'` → edición libre
  (sin restricción adicional de este trigger; la restringe la política
  RLS de `editar` normal).
- `old.estatus = 'borrador'` y `new.estatus = 'protocolizada'` → requiere
  `fn_validar_protocolizacion(old.id)` vacío (sección 4).
- Cualquier otra combinación (p. ej. `borrador → anulada` directo) → se
  rechaza; no es una transición válida de la máquina de estados.

Adicionalmente, si `new.responsable_id <> old.responsable_id`, se exige
`fn_has_permiso('escrituras', 'reasignar_responsable', old.id)` sin
importar el estatus — es un permiso distinto de `editar` (FR-015), y una
comprobación de columna específica encaja mejor en un trigger que en la
política RLS genérica de `update` (que ya exige `editar`).

## 6. La tabla `comparecientes` (stub) no tiene alcance propio — el alcance vive en `escritura_comparecientes`

**Hallazgo**: El catálogo de permisos ya sembrado en `02-usuarios-roles`
incluye el módulo `comparecientes` (`ver`/`crear`/`editar`/`eliminar`,
`requiere_alcance = true`, con Auxiliar en `propias`). Pero un registro
identidad "compareciente" (solo `id` + `nombre`, sin ficha completa
todavía) no tiene un concepto natural de "propio" hasta que se asocia a
una escritura — `fn_has_permiso` exige un `p_escritura_id` no nulo para
resolver alcance `propias`, que no existe al crear la identidad mínima
por sí sola.

**Decision**: La tabla `comparecientes` (stub) se manipula únicamente a
través de una función `security definer`,
`fn_asociar_compareciente(p_escritura_id, p_compareciente_id_o_null,
p_nombre_si_nuevo, p_rol, p_porcentaje)`, que primero valida
`fn_has_permiso('comparecientes', 'crear'|'editar', p_escritura_id)`
(correctamente escopado por la escritura a la que se está asociando) y
solo entonces crea/reutiliza la fila en `comparecientes` e inserta/actualiza
la fila en `escritura_comparecientes`. La tabla `comparecientes` en sí
mantiene RLS mínima (`select`/`all` solo para quien tenga
`comparecientes.ver`/`crear`/`editar` con alcance `todas`, sin
`escritura_id`), consistente con ser un stub temporal — el futuro spec de
Comparecientes es responsable de diseñar el modelo de alcance definitivo
para la ficha completa.

**Alternatives considered**:
- Exponer `comparecientes` con RLS totalmente abierta a cualquier
  `authenticated` → viola FR-014 (el catálogo de permisos existe
  precisamente para esto); rechazada.
- Resolver el alcance de `comparecientes` de forma genérica (sin
  `escritura_id`) usando alguna otra heurística → no hay una heurística
  razonable sin las tablas del futuro spec de Comparecientes; se prefiere
  la función `security definer` explícita, acotada a esta feature.

## 7. Auditoría: extender `audit_log`, no crear una bitácora paralela

**Decision**: `alter table public.audit_log drop constraint
audit_log_entidad_check`, volver a crear el mismo `check` agregando
`'escrituras'`, y adjuntar el trigger genérico ya existente
(`fn_audit_log_generic`) a `escrituras` (`after insert or update or
delete`) — igual que ya está adjunto a `roles`/`rol_permisos`/`profiles`.
Cubre FR-013 (toda transición de estatus queda auditada, quién/cuándo/de
qué estatus a cuál) sin construir un mecanismo de auditoría nuevo.

## 8. Frontend: solo se reemplaza el placeholder de `/escrituras`; el resto del drawer no se toca

**Hallazgo**: `useNavItems.ts` (de `00-layout-shell`) ya tiene entradas de
drawer independientes para Comparecientes, Expedientes, Trámites,
Cumplimiento PLD/UIF, Avisos SAT/UIF, Órdenes de pago, Honorarios y
Georreferenciación — cada una apuntando hoy a una página placeholder "en
construcción". Esto choca en apariencia con FR-017 (esos módulos deben
vivir como pestañas del detalle de una escritura, no como entradas de
drawer), pero el spec de esta feature ya lo señala explícitamente como
**fuera de alcance** (ver Assumptions de `spec.md`): ese reacomodo del
drawer es trabajo de un feature futuro sobre `00-layout-shell`.

**Decision**: Esta feature reemplaza únicamente el placeholder de
`/escrituras` con las páginas reales (listado + detalle con pestañas). El
resto de las entradas del drawer permanece intacto, apuntando a sus
placeholders actuales, hasta que ese feature futuro las retire. Dentro
del detalle de una escritura, las pestañas hacia Cumplimiento PLD,
Expediente, Trámites, Avisos SAT/UIF, Órdenes de pago y Honorarios
también muestran un placeholder "en construcción" (mismo componente ya
usado para las páginas de drawer sin implementar) — la única pestaña con
contenido funcional en esta feature es Comparecientes (alta con
rol/porcentaje, usando la función de la sección 6), porque las User
Stories 2 y 4 de este spec dependen de ella directamente.

## 9. Testing: mismo enfoque que features previas

**Decision**: Vitest + Vue Test Utils para composables/componentes de
frontend (validación de formularios, filtros del listado, visibilidad
condicional de la pestaña Georreferenciación) — igual que
`00-layout-shell` y `02-usuarios-roles`. Sin framework de pruebas SQL
dedicado — igual que `01-infra-supabase`/`02-usuarios-roles`; el gate de
protocolización, la numeración atómica y las salvaguardas de estatus se
validan manualmente vía `quickstart.md` con usuarios/escrituras reales
contra el stack Supabase local.
