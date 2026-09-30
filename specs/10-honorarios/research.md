# Research: 10-honorarios — Honorarios Notariales, Cotizaciones, Anticipos y Liquidación de Clientes

**Feature**: `10-honorarios`  
**Date**: 2026-09-17  
**Status**: Completed

---

## 1. Contexto y Objetivos

En el ejercicio de la función notarial en México, la retribución económica del Notario por su asesoría jurídica, redacción, dictaminación, fe pública y custodia de instrumentos se estructura a través de los **Honorarios Profesionales** y los **Gastos de Gestión Notarial** (copias certificadas, testimonios, certificaciones, archivo digital).

A diferencia de las **Órdenes de Pago** (`08-ordenes-pago`), que administran "dinero de paso" destinado al pago de derechos e impuestos a dependencias gubernamentales (RPP, Catastro, Tesorería/ISAI) y que son fiscalmente neutrales para la notaría, los honorarios y gastos propios constituyen **ingresos acumulables propios**, gravados en su mayoría con el 16% de IVA y sujetos a facturación CFDI.

El módulo `10-honorarios` implementa:
1. Cotización mediante partidas libres de conceptos propios con desglose de IVA (16%) y exenciones.
2. Separación contable estricta respecto a las órdenes de pago gubernamentales (Constitución §7).
3. Registro de pagos y anticipos del cliente (pago único o en parcialidades) que cubren integralmente el expediente.
4. Saldo pendiente en tiempo real y transiciones automáticas de estatus (`borrador`, `cotizado`, `anticipo_parcial`, `liquidado`, `cancelado`).
5. Generación de la **Hoja de Liquidación Consolidada**, uniendo en un solo estado de cuenta transparente los honorarios propios y las órdenes de pago de derechos.
6. Control administrativo de facturación CFDI (datos del receptor, registro de UUID, método SAT PUE/PPD) con modelo de datos normalizado y preparado para conexión futura a un PAC.
7. Maquetación Stitch ergonómica:
   - Pestaña `HonorariosTab.vue` en el detalle de la escritura (Stitch Screen ID: `612bb806035745b995e147c0c1808bda`).
   - Tablero consolidado global de cobranza `/honorarios` (Stitch Screen ID: `90171980400741849b0d3e3488715e75`).

---

## 2. Decisiones de Arquitectura e Implementación

### Decisión 1: Cotización con Partidas 100% Libres (Aprobado en Clarificación Q1 -> B)
- **Decisión**: La cuenta de honorarios de cada escritura permite agregar múltiples partidas libres (`honorarios_partidas`). Cada partida define `concepto` (texto libre), `monto` (decimal), `aplica_iva` (booleano), `tasa_iva` (0.16 por defecto), `es_descuento` (booleano) y un orden secuencial.
- **Razón**: Máxima flexibilidad operativa. Cada notaría y tipo de acto maneja conceptos variados (honorarios de fe pública, testimonios adicionales, copias certificadas, traslados, gastos de gestoría externa, certificaciones exentas).
- **Cálculo de Totales**:
  - `subtotal_gravado = SUM(monto WHERE aplica_iva = true AND es_descuento = false)`
  - `subtotal_exento = SUM(monto WHERE aplica_iva = false AND es_descuento = false)`
  - `descuento_total = SUM(monto WHERE es_descuento = true)`
  - `iva_total = (subtotal_gravado - descuento_gravado) * 0.16`
  - `total_cotizado = subtotal_gravado + subtotal_exento + iva_total - descuento_total`

---

### Decisión 2: Pago Único y Anticipos Integrales con Separación Contable Interna (Aprobado en Clarificación Q2)
- **Decisión**:
  - A nivel de base de datos, `honorarios_cuentas` y `honorarios_pagos` son independientes de `ordenes_pago`.
  - El cliente realiza pagos (ya sea en una sola exhibición "pago único", o en 2-3 exhibiciones de anticipos) que cubren el trámite notarial.
  - Los pagos registrados en la cuenta de la escritura abonan al saldo general.
  - La **Hoja de Liquidación Consolidada** combina en una sola vista:
    - **Sección A**: Honorarios y Gastos Notariales Propios (con desglose de IVA).
    - **Sección B**: Derechos e Impuestos Oficiales (provenientes de las órdenes de pago de la escritura en `ordenes_pago`).
    - **Balance General**: Gran Total del Trámite, Total de Pagos Recibidos y Saldo Neto Pendiente del Cliente.

---

### Decisión 3: Facturación CFDI Administrativa con Modelo Normalizado para PAC (Aprobado en Clarificación Q3 -> A extendida)
- **Decisión**:
  - En esta fase, el usuario registra los datos fiscales del cliente (RFC, Razón Social, Régimen Fiscal, Código Postal, Uso de CFDI), captura el folio fiscal UUID de 36 caracteres timbrado por la notaría y puede adjuntar los archivos PDF y XML al expediente digital.
  - El modelo de datos (`honorarios_cuentas`) incluye columnas normalizadas compatibles con el estándar Anexo 20 del SAT (`metodo_pago_sat` PUE/PPD, `forma_pago_sat` 01, 02, 03, 04, 28, etc., `fecha_timbrado`, `uuid_fiscal`), dejando la capa de servicios lista para que en una fase posterior se conecte el endpoint de timbrado en vivo vía PAC (Finkok, SW Sapience, etc.) sin migraciones de esquema destructivas.

---

### Decisión 4: Permisos Granulares y Auditoría (Constitución §7)
- **Decisión**:
  - Todo cambio en cotizaciones y pagos queda registrado en auditoría (`created_by`, `updated_by`, timestamps).
  - Usuarios con rol `Auxiliar` o `Administrador` pueden ver y capturar partidas iniciales y asentar pagos.
  - Una vez que la cotización tiene pagos asentados o pasa a estatus `cotizado`/`anticipo_parcial`/`liquidado`, la modificación de montos está protegida por el permiso `honorarios.modificar_monto`.

---

### Decisión 5: Maquetas e Integración Visual Stitch
- **Decisión**: La interfaz sigue fielmente las maquetas generadas con los tokens institucionales (`#1B3A5F`, `#A9762E`):
  - **Pestaña `HonorariosTab.vue`** (Stitch Screen `612bb806035745b995e147c0c1808bda`):
    - KPIs superiores del instrumento (Honorarios propios, Derechos terceros, Gran total, Total cobrado, Saldo pendiente).
    - Bloque A: Tabla de partidas libres con switch de IVA 16% y resumen de subtotales.
    - Bloque B: Tabla de pagos/anticipos con folio de recibo consecutivo y semáforo LFPIORPI para pagos en efectivo.
    - Modal de Hoja de Liquidación Consolidada para impresión y PDF.
    - Sección de Facturación CFDI con datos fiscales y registro de UUID.
  - **Tablero Global `/honorarios`** (Stitch Screen `90171980400741849b0d3e3488715e75`):
    - KPIs de cobranza del mes, cuentas por cobrar, efectividad de cobranza.
    - Filtros por estatus, abogado responsable, período y estado de CFDI.
    - Tabla interactiva con enlace a cada expediente.
