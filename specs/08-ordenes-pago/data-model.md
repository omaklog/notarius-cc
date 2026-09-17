# Data Model: 08-ordenes-pago — Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación

**Feature**: `08-ordenes-pago`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Diagrama Entidad-Relación

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│           escrituras            │           │   cat_dependencias_oficiales    │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ id (PK UUID)                    │1         1│ id (PK UUID)                    │
│ instrumento                     │◀──┐   ┌──▶│ sigla (RPP, SACMEX, TESORERIA)  │
│ expediente                      │   │   │   │ nombre                          │
└─────────────────────────────────┘   │   │   └─────────────────────────────────┘
                                      │   │
┌─────────────────────────────────┐   │   │
│       tramites_escritura        │   │   │
├─────────────────────────────────┤   │   │
│ id (PK UUID)                    │1  │   │
│ escritura_id (FK)               │   │   │
│ orden_pago_id (FK opcional)     │◀┐ │   │
└─────────────────────────────────┘ │ │   │
                                    │ │   │
                                   N│N│  N│
┌───────────────────────────────────┴─┴───┴─────────────────────────────────────┐
│                                ordenes_pago                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│ id (PK UUID)                                                                  │
│ folio (TEXT UNIQUE - e.g. ORD-2026-0001)                                      │
│ escritura_id (FK UUID -> escrituras.id ON DELETE CASCADE)                     │
│ tramite_id (FK UUID -> tramites_escritura.id ON DELETE SET NULL)              │
│ dependencia_id (FK UUID -> cat_dependencias_oficiales.id)                     │
│ concepto (TEXT)                                                               │
│ monto (NUMERIC(12,2) >= 0)                                                    │
│ linea_captura (TEXT)                                                          │
│ fecha_emision_linea (DATE DEFAULT CURRENT_DATE)                                │
│ fecha_vencimiento_linea (DATE)                                                │
│ estado (TEXT: pendiente | en_tesoreria | pagado | cancelado)                  │
│ metodo_pago (TEXT: transferencia_spei | cheque_caja | tarjeta... | ...)       │
│ folio_autorizacion_bancaria (TEXT - clave de rastreo SPEI / autorización)     │
│ fecha_pago (DATE)                                                             │
│ pagado_por (FK UUID -> usuarios.id)                                           │
│ comprobante_documento_id (FK UUID -> expediente_documentos.id)                │
│ quien_cubre (TEXT: adquirente | enajenante | notaria_fondo_revolvente | banco)│
│ observaciones (TEXT)                                                          │
│ motivo_cancelacion (TEXT)                                                     │
│ created_by (FK UUID -> auth.users.id)                                         │
│ created_at, updated_at (TIMESTAMPTZ)                                          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Definición de Tablas y Atributos

### 2.1. Tabla `public.ordenes_pago`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` | Identificador universal único |
| `folio` | text | UNIQUE, NOT NULL | Folio administrativo (e.g. `ORD-2026-0001`) |
| `escritura_id` | uuid | NOT NULL, FK `escrituras.id` | Escritura matriz a la que pertenece |
| `tramite_id` | uuid | NULL, FK `tramites_escritura.id` | Trámite oficial asociado (opcional) |
| `dependencia_id` | uuid | NOT NULL, FK `cat_dependencias_oficiales.id` | Dependencia gubernamental receptora |
| `concepto` | text | NOT NULL | Concepto legal del derecho o impuesto |
| `monto` | numeric(12,2) | NOT NULL, CHECK (`monto >= 0`) | Importe en moneda nacional (MXN) |
| `linea_captura` | text | NULL | Cadena o código de línea de captura |
| `fecha_emision_linea` | date | NOT NULL DEFAULT `current_date` | Fecha de expedición del formato de cobro |
| `fecha_vencimiento_linea` | date | NULL | Fecha de caducidad oficial de la línea |
| `estado` | text | NOT NULL DEFAULT `'pendiente'` | `pendiente`, `en_tesoreria`, `pagado`, `cancelado` |
| `metodo_pago` | text | NULL | `transferencia_spei`, `cheque_caja`, `tarjeta_credito_debito`, `efectivo_ventanilla` |
| `folio_autorizacion_bancaria` | text | NULL | Clave de rastreo SPEI o folio bancario |
| `fecha_pago` | date | NULL | Fecha de liquidación efectiva |
| `pagado_por` | uuid | NULL, FK `usuarios.id` | Usuario responsable de asentar el pago |
| `comprobante_documento_id` | uuid | NULL, FK `expediente_documentos.id` | Recibo o acuse bancario en expediente |
| `quien_cubre` | text | NOT NULL DEFAULT `'adquirente'` | `adquirente`, `enajenante`, `notaria_fondo_revolvente`, `banco_acreedor`, `otro` |
| `observaciones` | text | NULL | Comentarios y notas de caja |
| `motivo_cancelacion` | text | NULL | Justificación en caso de cancelación |
| `created_by` | uuid | NULL, FK `auth.users.id` | Auditoría de creación |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` | Auditoría |
| `updated_at` | timestamptz | NOT NULL DEFAULT `now()` | Auditoría |

---

## 3. Triggers y Funciones

### 3.1. Sincronización Automática con Trámites (`fn_tr_orden_pago_sync_tramite`)
Al insertar o actualizar una orden de pago con `tramite_id`:
1. Si `tramites_escritura.orden_pago_id` es nulo o diferente, se actualiza para vincular la orden.
2. Si la orden pasa a `cancelado`, desvincula el `orden_pago_id` del trámite si correspondía a esta orden.

### 3.2. Generador Consecutivo de Folio (`fn_tr_orden_pago_folio`)
Genera automáticamente el folio con formato `ORD-YYYY-NNNN` mediante secuencia anual independiente si no se provee al insertar.

### 3.3. Vista Consolidada `public.v_ordenes_pago_resumen`
Proporciona para cada orden:
- Datos de la escritura (`instrumento`, `expediente`, `acto_nombre`).
- Datos de la dependencia (`dependencia_sigla`, `dependencia_nombre`, `portal_web`).
- Días de vigencia restantes: `(t.fecha_vencimiento_linea - current_date)`.
- Semáforo de línea de captura:
  - `azul`: `estado = 'pagado'`.
  - `gris`: `estado = 'cancelado'` o `fecha_vencimiento_linea is null`.
  - `rojo`: `fecha_vencimiento_linea <= current_date` (vencida o vence hoy sin pagar).
  - `amarillo`: Días restantes entre 1 y 3.
  - `verde`: Días restantes > 3.
- Información de conciliación bancaria y procedencia de fondos.
