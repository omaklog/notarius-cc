# Contract: Escrituras hacia otros módulos

Escrituras es la entidad raíz — todo módulo de negocio futuro
(Comparecientes, Cumplimiento PLD, Expedientes, Trámites, Avisos SAT/UIF,
Órdenes de pago, Honorarios, Georreferenciación) se relaciona a ella por
`escritura_id` y depende de lo que aquí se fija. Este documento es el
contrato que esos specs futuros pueden asumir sin necesidad de
re-especificarlo.

## `escritura_id` como ancla de alcance `propias`/`todas`

Cualquier tabla de un módulo futuro ligada a una escritura debe tener una
columna que resuelva a `escritura_id` (directa, o a través de
`compareciente_id`/`escritura_comparecientes` cuando el módulo cuelga de
un compareciente, como Cumplimiento PLD) y usar el mismo patrón de RLS ya
documentado en `02-usuarios-roles/contracts/usuarios-roles-interface.md`:

```sql
create policy "<tabla>_select" on public.<tabla>
  for select using (public.fn_has_permiso('<modulo>', 'ver', escritura_id));
```

`fn_has_permiso` ya resuelve `propias` consultando
`escrituras.responsable_id = auth.uid()` — ningún módulo futuro debe
reimplementar esa resolución por su cuenta.

## Tabla `comparecientes`: stub que se amplía, no se reemplaza

Este feature crea `public.comparecientes` con únicamente `id` y `nombre`
(ver `data-model.md`, Clarification de `spec.md` sesión 2026-07-28). El
futuro spec de Comparecientes:

- **DEBE** ampliarla vía `alter table public.comparecientes add column
  ...` (identificación, catálogos, cumplimiento PLD) — nunca recrearla ni
  cambiar el tipo/nombre de `id`, porque `escritura_comparecientes.
  compareciente_id` ya la referencia.
- **DEBE** diseñar su propio modelo de RLS/alcance para la ficha completa;
  la RLS mínima que este feature deja en `comparecientes` (solo alcance
  `todas`, sin `escritura_id` — ver `research.md` #6) es un placeholder,
  no un contrato a preservar.
- El alta/edición de un compareciente **en el contexto de una escritura**
  sigue pasando por `fn_asociar_compareciente()` (o su reemplazo, si el
  spec de Comparecientes decide sustituirla) — ningún módulo debe
  insertar directamente en `escritura_comparecientes` sin pasar por la
  validación de alcance que esa función centraliza.

## Nombres de tabla reservados para el gate de protocolización

`fn_validar_protocolizacion()` usa `to_regclass('public.<tabla>')` para
detectar si un módulo dependiente ya existe (mismo patrón que
`fn_has_permiso` usa para `escrituras`). Los specs futuros **deben** usar
estos nombres exactos para que el gate los detecte automáticamente, sin
requerir cambios a esta feature:

| Condición del gate | Nombre de tabla esperado | Spec futuro |
|---|---|---|
| Cumplimiento PLD resuelto por compareciente | `public.cumplimiento_pld` | Comparecientes / Cumplimiento PLD |
| Bloqueo activo sin resolver por compareciente | `public.compareciente_bloqueos` (o equivalente — a confirmar por ese spec) | Comparecientes / Cumplimiento PLD |
| Predio con polígono asociado a la escritura | `public.predios` | Georreferenciación |

Mientras esas tablas no existan, la condición correspondiente se omite
del arreglo que devuelve `fn_validar_protocolizacion()` (se considera
satisfecha) — ver `research.md` #4 y Assumptions de `spec.md`.

## Botón "Protocolizar": contrato de interfaz

Cualquier pantalla que muestre el botón de protocolizar debe llamar a la
RPC `fn_validar_protocolizacion(escritura_id)` para decidir si está
habilitado y qué tooltip mostrar — nunca duplicar esa lógica en el
frontend (FR-019). La transición real (`update escrituras set
estatus = 'protocolizada'`) se rechaza en el servidor con el mismo motivo
si se intenta igualmente (refuerzo real, FR-014) — el frontend solo la
usa para UX, no como única barrera.

## Pestañas del detalle de escritura: contrato de extensión

El detalle de una escritura (`app/pages/escrituras/[id].vue`) se organiza
como un componente de pestañas. Un módulo futuro que agregue su propia
pestaña (Comparecientes ya la tiene desde este feature; Cumplimiento PLD,
Expediente, Trámites, Avisos SAT/UIF, Órdenes de pago, Honorarios llegan
como placeholder "en construcción" desde este feature) debe:

- Reemplazar únicamente su placeholder correspondiente, sin modificar el
  resto de las pestañas.
- Ocultar su propia pestaña vía `useAuth().hasPermiso()` con su propio
  módulo (no reutilizar el permiso `escrituras.ver`) — cada módulo
  controla su propia visibilidad, igual que el drawer.
- La pestaña de Georreferenciación es la única condicionada además por un
  dato de negocio (`acto_juridico.tipo = 'traslativo'`), no solo por
  permiso — el spec de Georreferenciación hereda esa condición, no la
  redefine.

## Fuera de este contrato: reacomodo del drawer

`00-layout-shell` sigue teniendo entradas de drawer independientes para
los módulos listados arriba (apuntando a sus placeholders actuales). Este
feature **no** las retira ni las oculta — ese reacomodo (mover esos
módulos de "entrada de drawer" a "solo pestaña") es explícitamente un
feature futuro sobre `00-layout-shell` (Assumptions de `spec.md`), no
parte de este contrato.
