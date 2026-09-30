# Data Model: 10-honorarios — Honorarios Notariales, Cotizaciones, Anticipos y Liquidación de Clientes

**Feature**: `10-honorarios`  
**Date**: 2026-09-17  
**Status**: Ready

---

## 1. Diagrama Entidad-Relación

```
┌─────────────────────────────────┐
│           escrituras            │
├─────────────────────────────────┤
│ id (PK UUID)                    │1
│ instrumento                     │◀────────┐
│ objeto                          │         │
└─────────────────────────────────┘         │
                                            │ 1:1
┌───────────────────────────────────────────┴─────────────────────────────────────────┐
│                                 honorarios_cuentas                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ id (PK UUID)                                                                        │
│ escritura_id (FK UUID UNIQUE -> escrituras.id ON DELETE CASCADE)                    │
│ subtotal_gravado (NUMERIC(12,2) DEFAULT 0.00)                                       │
│ subtotal_exento (NUMERIC(12,2) DEFAULT 0.00)                                        │
│ descuento_total (NUMERIC(12,2) DEFAULT 0.00)                                        │
│ iva_total (NUMERIC(12,2) DEFAULT 0.00)                                               │
│ total_cotizado (NUMERIC(12,2) DEFAULT 0.00)                                         │
│ total_pagado (NUMERIC(12,2) DEFAULT 0.00)                                           │
│ saldo_pendiente (NUMERIC(12,2) DEFAULT 0.00)                                        │
│ estatus (TEXT: borrador | cotizado | anticipo_parcial | liquidado | cancelado)       │
│                                                                                     │
│ rfc_receptor (VARCHAR(13))                                                          │
│ razon_social_receptor (TEXT)                                                        │
│ regimen_fiscal_receptor (VARCHAR(10))                                               │
│ codigo_postal_fiscal (VARCHAR(5))                                                   │
│ uso_cfdi (VARCHAR(5))                                                               │
│ estatus_facturacion (TEXT: no_requerida | pendiente | facturada | cancelada)        │
│ uuid_fiscal (VARCHAR(36))                                                           │
│ fecha_timbrado (TIMESTAMPTZ)                                                        │
│ metodo_pago_sat (VARCHAR(5): PUE | PPD)                                             │
│ forma_pago_sat (VARCHAR(5))                                                         │
│ factura_pdf_id (FK UUID -> expediente_documentos.id)                                │
│ factura_xml_id (FK UUID -> expediente_documentos.id)                                │
│ created_by, updated_by (FK UUID -> auth.users.id)                                   │
│ created_at, updated_at (TIMESTAMPTZ)                                                │
└──────────────────┬───────────────────────────────────────────────┬──────────────────┘
                   │1                                              │1
                   │                                               │
                  N│                                              N│
┌──────────────────┴──────────────────────┐  ┌─────────────────────┴──────────────────┐
│          honorarios_partidas            │  │            honorarios_pagos            │
├─────────────────────────────────────────┤  ├────────────────────────────────────────┤
│ id (PK UUID)                            │  │ id (PK UUID)                           │
│ cuenta_id (FK UUID -> cuentas.id CASC.) │  │ cuenta_id (FK UUID -> cuentas.id CASC.)│
│ concepto (TEXT)                         │  │ folio_recibo (TEXT UNIQUE)             │
│ monto (NUMERIC(12,2) >= 0)              │  │ monto (NUMERIC(12,2) > 0)              │
│ aplica_iva (BOOLEAN DEFAULT TRUE)       │  │ fecha_pago (DATE DEFAULT CURRENT_DATE) │
│ tasa_iva (NUMERIC(4,2) DEFAULT 0.16)    │  │ metodo_pago (TEXT: spei|tarjeta|...)   │
│ es_descuento (BOOLEAN DEFAULT FALSE)    │  │ referencia_bancaria (TEXT)             │
│ orden (INTEGER DEFAULT 0)               │  │ concepto (TEXT)                        │
│ created_at (TIMESTAMPTZ)                │  │ recibido_por (FK UUID -> usuarios.id) │
└─────────────────────────────────────────┘  │ comprobante_documento_id (FK UUID)     │
                                             │ notas (TEXT)                           │
                                             │ created_at (TIMESTAMPTZ)               │
                                             └────────────────────────────────────────┘
```

---

## 2. Definición Detallada de Tablas

### 2.1. Tabla `public.honorarios_cuentas`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` | Identificador único de la cuenta |
| `escritura_id` | uuid | NOT NULL, UNIQUE, FK `escrituras.id` | Escritura pública matriz |
| `subtotal_gravado` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Suma de partidas gravadas con IVA |
| `subtotal_exento` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Suma de partidas exentas de IVA |
| `descuento_total` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Descuentos y bonificaciones aplicadas |
| `iva_total` | numeric(12,2) | NOT NULL DEFAULT 0.00 | IVA trasladado (16%) |
| `total_cotizado` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Importe total a cobrar por la notaría |
| `total_pagado` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Suma total de anticipos y pagos |
| `saldo_pendiente` | numeric(12,2) | NOT NULL DEFAULT 0.00 | Saldo pendiente por liquidar |
| `estatus` | text | NOT NULL DEFAULT `'borrador'` | `borrador`, `cotizado`, `anticipo_parcial`, `liquidado`, `cancelado` |
| `rfc_receptor` | varchar(13) | NULL | RFC del compareciente o empresa facturada |
| `razon_social_receptor` | text | NULL | Nombre fiscal del receptor |
| `regimen_fiscal_receptor` | varchar(10) | NULL | Clave de régimen fiscal SAT (ej. 601, 605) |
| `codigo_postal_fiscal` | varchar(5) | NULL | Código postal del domicilio fiscal |
| `uso_cfdi` | varchar(5) | NULL | Clave de uso CFDI (ej. G03, CP01) |
| `estatus_facturacion` | text | NOT NULL DEFAULT `'no_requerida'` | `no_requerida`, `pendiente`, `facturada`, `cancelada` |
| `uuid_fiscal` | varchar(36) | NULL | Folio fiscal SAT (UUID v4 estándar) |
| `fecha_timbrado` | timestamptz | NULL | Fecha y hora del timbrado fiscal |
| `metodo_pago_sat` | varchar(5) | NULL | `PUE` (Una sola exhibición) o `PPD` (Parcialidades) |
| `forma_pago_sat` | varchar(5) | NULL | Clave SAT: `01` (efectivo), `03` (SPEI), etc. |
| `factura_pdf_id` | uuid | NULL, FK `expediente_documentos.id` | Archivo de representación impresa PDF |
| `factura_xml_id` | uuid | NULL, FK `expediente_documentos.id` | Archivo XML CFDI 4.0 oficial |
| `created_by` | uuid | NULL, FK `auth.users.id` | Creador de la cotización |
| `updated_by` | uuid | NULL, FK `auth.users.id` | Último modificador |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` | Fecha de creación |
| `updated_at` | timestamptz | NOT NULL DEFAULT `now()` | Fecha de actualización |

---

### 2.2. Tabla `public.honorarios_partidas`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` | Identificador de partida |
| `cuenta_id` | uuid | NOT NULL, FK `honorarios_cuentas.id` ON DELETE CASCADE | Cuenta a la que pertenece |
| `concepto` | text | NOT NULL | Descripción libre del servicio o gasto |
| `monto` | numeric(12,2) | NOT NULL, CHECK (`monto >= 0`) | Importe unitario / subtotal |
| `aplica_iva` | boolean | NOT NULL DEFAULT TRUE | Indica si causa IVA 16% |
| `tasa_iva` | numeric(4,2) | NOT NULL DEFAULT 0.16 | Tasa de impuesto (0.16 o 0.00) |
| `es_descuento` | boolean | NOT NULL DEFAULT FALSE | Si es deducción a la cotización |
| `orden` | integer | NOT NULL DEFAULT 0 | Secuencia de presentación en pantalla |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` | Fecha de registro |

---

### 2.3. Tabla `public.honorarios_pagos`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | uuid | PK, DEFAULT `gen_random_uuid()` | Identificador único del pago |
| `cuenta_id` | uuid | NOT NULL, FK `honorarios_cuentas.id` ON DELETE CASCADE | Cuenta de honorarios receptora |
| `folio_recibo` | text | NOT NULL, UNIQUE | Consecutivo notarial (e.g. `REC-2026-0001`) |
| `monto` | numeric(12,2) | NOT NULL, CHECK (`monto > 0`) | Importe efectivamente cobrado |
| `fecha_pago` | date | NOT NULL DEFAULT `current_date` | Fecha en que se recibió el recurso |
| `metodo_pago` | text | NOT NULL | `transferencia_spei`, `tarjeta_credito_debito`, `cheque`, `efectivo` |
| `referencia_bancaria` | text | NULL | Clave de rastreo o autorización bancaria |
| `concepto` | text | NOT NULL DEFAULT `'Anticipo de gastos y honorarios'` | Concepto de cobro al cliente |
| `recibido_por` | uuid | NULL, FK `usuarios.id` | Cajero o funcionario que recibió el pago |
| `comprobante_documento_id` | uuid | NULL, FK `expediente_documentos.id` | Ficha de depósito o comprobante digital |
| `notas` | text | NULL | Observaciones de caja o tesorería |
| `created_at` | timestamptz | NOT NULL DEFAULT `now()` | Timestamp de registro |

---

## 3. Funciones y Triggers en Base de Datos

### 3.1. Recálculo Automático de Cuenta: `fn_recalcular_honorarios_cuenta`
Disparado tras cualquier `INSERT`, `UPDATE` o `DELETE` sobre `honorarios_partidas` u `honorarios_pagos`:
```sql
CREATE OR REPLACE FUNCTION public.fn_recalcular_honorarios_cuenta(p_cuenta_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gravado numeric(12,2) := 0;
  v_exento numeric(12,2) := 0;
  v_descuento numeric(12,2) := 0;
  v_iva numeric(12,2) := 0;
  v_total_cotizado numeric(12,2) := 0;
  v_total_pagado numeric(12,2) := 0;
  v_saldo numeric(12,2) := 0;
  v_estatus text;
BEGIN
  -- Sumar partidas gravadas y exentas (no descuentos)
  SELECT 
    COALESCE(SUM(CASE WHEN aplica_iva = true AND es_descuento = false THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN aplica_iva = false AND es_descuento = false THEN monto ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN es_descuento = true THEN monto ELSE 0 END), 0)
  INTO v_gravado, v_exento, v_descuento
  FROM public.honorarios_partidas
  WHERE cuenta_id = p_cuenta_id;

  -- Calcular IVA sobre gravado neto
  v_iva := ROUND(GREATEST(0, (v_gravado - v_descuento)) * 0.16, 2);
  v_total_cotizado := (v_gravado + v_exento + v_iva) - v_descuento;

  -- Sumar pagos efectuados
  SELECT COALESCE(SUM(monto), 0)
  INTO v_total_pagado
  FROM public.honorarios_pagos
  WHERE cuenta_id = p_cuenta_id;

  v_saldo := v_total_cotizado - v_total_pagado;

  -- Determinar estatus
  IF v_total_cotizado = 0 THEN
    v_estatus := 'borrador';
  ELSIF v_total_pagado = 0 THEN
    v_estatus := 'cotizado';
  ELSIF v_saldo <= 0 THEN
    v_estatus := 'liquidado';
  ELSE
    v_estatus := 'anticipo_parcial';
  END IF;

  -- Actualizar registro maestro
  UPDATE public.honorarios_cuentas
  SET 
    subtotal_gravado = v_gravado,
    subtotal_exento = v_exento,
    descuento_total = v_descuento,
    iva_total = v_iva,
    total_cotizado = v_total_cotizado,
    total_pagado = v_total_pagado,
    saldo_pendiente = v_saldo,
    estatus = v_estatus,
    updated_at = now()
  WHERE id = p_cuenta_id;
END;
$$;
```

### 3.2. Consecutivo de Recibos: `fn_siguiente_folio_recibo`
Genera el consecutivo institucional anual: `REC-YYYY-NNNN` (ej. `REC-2026-0001`).

---

## 4. Políticas RLS (Row Level Security)

1. **`honorarios_cuentas`**:
   - `SELECT`: Usuarios autenticados con permiso `honorarios.ver` (respetando alcance 'propias' vs 'todas').
   - `INSERT`: Usuarios con permiso `honorarios.crear`.
   - `UPDATE`: Usuarios con permiso `honorarios.editar` (o `honorarios.modificar_monto` si la cuenta ya tiene pagos).
   - `DELETE`: Usuarios con permiso `honorarios.eliminar`.

2. **`honorarios_partidas`**:
   - Hereda el control de acceso de la cuenta matriz vía `cuenta_id`.

3. **`honorarios_pagos`**:
   - `SELECT`: Quien puede ver la cuenta.
   - `INSERT`: Usuarios con permiso `honorarios.crear` o `honorarios.editar`.
   - `UPDATE`/`DELETE`: Restringido a `Administrador` para evitar alteración de cobros históricos.
