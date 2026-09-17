# Quickstart: Validar Escrituras

Guía para validar manualmente los escenarios de aceptación del spec una
vez implementado. Complementa (no sustituye) los tests de Vitest de
formularios/componentes de frontend.

## Prerrequisitos

- Backend local corriendo (`yarn db:start`) y reconstruido con la
  migración de este feature (`yarn db:reset`).
- Frontend corriendo (`yarn dev`).
- Al menos 2 usuarios de prueba con rol Administrador y Auxiliar (ver
  `02-usuarios-roles/quickstart.md` para crearlos vía invitación).

## Escenario 1 — Numeración atómica de instrumento (US1)

1. Como Administrador, registrar una escritura nueva sin capturar
   instrumento (el campo no debe ser editable en el formulario). Confirmar
   que recibe el instrumento `1` del año en curso.
2. Registrar una segunda escritura y confirmar que recibe el instrumento
   `2` del mismo año — nunca el `1` de nuevo.
3. Simular captura simultánea: disparar dos inserciones a la vez contra
   la API (dos pestañas, o dos llamadas `curl` casi simultáneas) y
   confirmar que ambas reciben instrumentos distintos y consecutivos, sin
   error ni duplicado.
4. Confirmar que el instrumento se muestra en el listado y en el detalle
   como `instrumento/año` (por ejemplo `1/2026`).

## Escenario 2 — Gate de protocolización (US2)

Con una escritura en borrador y al menos un compareciente asociado
(usando la pestaña Comparecientes del detalle):

1. Sin ninguna condición resuelta (Cumplimiento PLD, bloqueos y
   georreferenciación aún no tienen spec propio, así que se consideran
   satisfechas automáticamente — ver Assumptions de `spec.md`), pero con
   porcentajes de participación capturados que **no** sumen 100%: el
   botón "Protocolizar" debe estar deshabilitado con un tooltip que
   mencione específicamente el porcentaje.
2. Corregir los porcentajes para que sumen exactamente 100%: el botón
   debe habilitarse.
3. Protocolizar la escritura: confirmar que queda en estatus
   `protocolizada` y que sus campos ya no son editables (intentar editar
   `objeto`, por ejemplo, y confirmar que se rechaza).
4. Repetir el paso 1 (porcentajes que no suman 100%) pero llamando
   directamente al endpoint REST de Supabase (`update` sobre `escrituras`
   con la sesión del usuario) en vez de usar la interfaz — confirmar que
   la API también lo rechaza (FR-014).
5. Cuando el spec de Cumplimiento PLD/Georreferenciación exista en el
   futuro, repetir este escenario con esas condiciones deliberadamente
   incumplidas y confirmar que el gate empieza a bloquear por ellas sin
   requerir cambios a este feature (ver `contracts/escrituras-interface.md`).

## Escenario 3 — Anulación sin liberar el instrumento (US3)

1. Con la escritura protocolizada del Escenario 2, como Auxiliar (sin el
   permiso `escrituras.anular`), intentar anularla — confirmar que la
   opción no aparece o se rechaza.
2. Como Administrador, intentar anularla sin capturar un motivo —
   confirmar que se rechaza.
3. Anularla capturando un motivo — confirmar que queda en estatus
   `anulada`.
4. Registrar una escritura nueva y confirmar que su instrumento es el
   siguiente consecutivo disponible — nunca el de la escritura anulada en
   el paso 3.

## Escenario 4 — Listado y filtros (US4)

Con varias escrituras en distintos estatus, actos jurídicos, fechas y
responsables:

1. Filtrar por estatus (`borrador`/`protocolizada`/`anulada`) y confirmar
   que el listado se acota correctamente.
2. Filtrar por acto jurídico y confirmar lo mismo.
3. Como usuario con alcance `propias` sobre `escrituras.ver` (Auxiliar en
   la configuración inicial), confirmar que el listado solo muestra las
   escrituras de las que es responsable, sin necesidad de aplicar ningún
   filtro manual.

## Verificar la bitácora de auditoría (FR-013)

```sql
select entidad, entidad_id, accion, changed_by, changed_at
from public.audit_log
where entidad = 'escrituras'
order by changed_at desc
limit 20;
```

Confirmar que cada transición de estatus (protocolizar, anular) queda
registrada con sus valores antes/después.

## Verificar que el catálogo de actos jurídicos es editable

Como Administrador, en Administración General, crear/editar un acto
jurídico (`actos_juridicos`) y confirmar que el cambio se refleja de
inmediato en el selector de acto jurídico al registrar una escritura —
sin requerir una migración nueva (confirma research.md #1: evolución de
`tipos_acto_notarial`, no un catálogo estático paralelo).

## Criterio de "hecho" para este feature

Los 4 escenarios de arriba pasan, la bitácora de auditoría captura las
transiciones de estatus de forma inmutable, `yarn test` (Vitest) está en
verde para los componentes/formularios nuevos, y una revisión rápida
confirma que ninguna condición de autorización compara contra un nombre
de rol (mismo criterio que `02-usuarios-roles`).
