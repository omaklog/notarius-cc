# Research: 08-ordenes-pago — Órdenes de Pago de Derechos a Terceros, Líneas de Captura y Conciliación

**Feature**: `08-ordenes-pago`  
**Date**: 2026-09-16  
**Status**: Completed

---

## 1. Contexto y Objetivos

En el ejercicio de la fe pública notarial, el pago de derechos a terceros (derechos de inscripción RPP/RPC, Impuesto sobre Adquisición de Inmuebles - ISAI/ISABI, certificaciones catastrales, constancias de no adeudo de agua y predial, permisos federales) constituye un flujo financiero crítico denominado **"dinero de paso"**. 

El módulo `08-ordenes-pago` implementa la gestión formal de estos egresos gubernamentales vinculados a la escritura pública y articulados con el módulo `07-tramites`, respetando el mandato constitucional de separación contable (§7), el semáforo de vigencia de líneas de captura, la custodia de comprobantes bancarios y el diseño ergonómico generado en Stitch (Screen ID: `302bb93f49bf430d8fc2e28b73543efe`).

---

## 2. Decisiones de Arquitectura e Implementación

### Decisión 1: Separación Contable Estricta (Constitución §7)
- **Decisión**: La tabla `ordenes_pago` registrará únicamente los conceptos de derechos gubernamentales e impuestos a terceros. En ninguna circunstancia se mezclarán honorarios notariales o gastos de gestión interna en esta tabla.
- **Razón**: Cumplimiento del principio §7 de la Constitución. El dinero de paso es fiscalmente neutral para la notaría (no constituye ingreso acumulable para ISR ni base gravable de IVA propio), por lo que requiere trazabilidad contable 100% aislada de la facturación de honorarios.
- **Alternativas descartadas**: Modelo unificado de pagos con discriminación por tipo de cuenta (rechazado por riesgo de contaminación fiscal y confusión en auditorías del SAT).

---

### Decisión 2: Sincronización Bidireccional con Trámites Notariales
- **Decisión**: La entidad `ordenes_pago` contará con una columna referencial opcional `tramite_id uuid references tramites_escritura(id) on delete set null`. Al asentar una orden vinculada a un trámite, se sincroniza automáticamente `tramites_escritura.orden_pago_id`.
- **Razón**: Permite que el gestor visualice desde la pestaña `TramitesTab` si los derechos correspondientes a un volante están pagados o pendientes, y que el cajero en `OrdenesPagoTab` identifique inmediatamente a qué gestión oficial pertenece cada línea de captura.

---

### Decisión 3: Semáforo Dinámico de Vigencia de Líneas de Captura
- **Decisión**: El cálculo del semáforo de las líneas de captura evalúa la `fecha_vencimiento_linea` contra la fecha actual:
  - `verde`: Restan más de 3 días naturales para el vencimiento.
  - `amarillo`: Restan entre 1 y 3 días naturales (urgencia de pago).
  - `rojo`: La línea de captura venció o vence hoy y permanece en estatus `pendiente`.
  - `azul`: Orden liquidada en estatus `pagado`.
  - `gris`: Orden cancelada.
- **Razón**: Las tesorerías de las entidades federativas emiten líneas de captura con vigencia estricta. Una línea vencida anula la transacción en ventanilla bancaria y obliga a recalcular recargos y actualizar el formato oficial.

---

### Decisión 4: Regla de Protocolización No Bloqueante con Alerta Informativa
- **Decisión**:
  - En `fn_validar_protocolizacion`, las órdenes de pago de derechos pendientes **no bloquean la firma o protocolización** de la escritura.
  - En la interfaz (cabecera de la escritura y pestaña de órdenes), se despliega una **alerta informativa visible** en color ámbar si existen derechos pendientes de liquidar.
- **Razón**: Aprobado por el usuario en la sesión de clarificación (Opción C). La protocolización de actos solemnes (e.g. firma de escritura) comúnmente precede al entero del ISAI o a la presentación de testimonios en el RPP, por lo que bloquear la firma por derechos fiscales posteriores impediría el curso normal de la notaría.

---

### Decisión 5: Custodia de Comprobantes Bancarios en Supabase Storage
- **Decisión**: Los comprobantes de pago (PDF de transferencia SPEI con clave de rastreo, recibos de caja o comprobantes bancarios) se almacenan en el bucket `expedientes` bajo la subcarpeta `/escrituras/{escritura_id}/ordenes_pago/` y se vinculan a la tabla `expediente_documentos` para integración al expediente digital.
- **Razón**: Garantiza conservación probatoria obligatoria de 10 años conforme a la legislación notarial y a la Constitución (§5).

---

### Decisión 6: Interfaz de Usuario y Maqueta Stitch
- **Decisión**: La interfaz se implementará en apego exacto a la maqueta generada en Stitch (Screen ID: `302bb93f49bf430d8fc2e28b73543efe`):
  - **Pestaña `OrdenesPagoTab.vue` en Escritura**:
    - Tarjetas de resumen financiero (Total Derechos, Monto Pagado, Saldo Pendiente, Líneas por Vencer).
    - Alerta informativa en ámbar si hay saldo pendiente.
    - Tabla de órdenes de pago con líneas de captura, montos en MXN, procedencia de fondos y accesos a comprobantes.
    - Modales: `OrdenPagoFormModal.vue` (alta/edición) y `OrdenPagoLiquidarModal.vue` (asiento de pago bancario SPEI).
  - **Tablero Notarial `/ordenes-pago`**:
    - Vista global de tesorería y caja para supervisar todos los egresos de la notaría por dependencia y vigencia.
