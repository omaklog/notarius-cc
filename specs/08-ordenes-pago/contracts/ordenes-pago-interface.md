# Contracts: 08-ordenes-pago — Interfaces y Contratos de Órdenes de Pago y Conciliación

**Feature**: `08-ordenes-pago`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Tipos e Interfaces TypeScript (`app/types/ordenesPago.ts`)

```typescript
export type EstadoOrdenPago =
  | 'pendiente'
  | 'en_tesoreria'
  | 'pagado'
  | 'cancelado'

export type MetodoPagoDerechos =
  | 'transferencia_spei'
  | 'cheque_caja'
  | 'tarjeta_credito_debito'
  | 'efectivo_ventanilla'
  | 'cargo_cuenta_notaria'

export type QuienCubrePago =
  | 'adquirente'
  | 'enajenante'
  | 'notaria_fondo_revolvente'
  | 'banco_acreedor'
  | 'otro'

export type SemaforoLineaCaptura = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris'

export interface DependenciaOficialLite {
  id: string
  sigla: string
  nombre: string
  portal_web?: string | null
}

export interface OrdenPago {
  id: string
  folio: string
  escritura_id: string
  tramite_id?: string | null
  dependencia_id: string
  concepto: string
  monto: number
  linea_captura?: string | null
  fecha_emision_linea: string
  fecha_vencimiento_linea?: string | null
  estado: EstadoOrdenPago
  metodo_pago?: MetodoPagoDerechos | null
  folio_autorizacion_bancaria?: string | null
  fecha_pago?: string | null
  pagado_por?: string | null
  comprobante_documento_id?: string | null
  quien_cubre: QuienCubrePago
  observaciones?: string | null
  motivo_cancelacion?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Joins y campos calculados
  dependencia?: DependenciaOficialLite
  tramite_folio?: string | null
  escritura_instrumento?: string | null
  escritura_expediente?: string | null
  dias_restantes?: number | null
  semaforo?: SemaforoLineaCaptura
}

export interface ResumenFinancieroDerechos {
  total_ordenes: number
  total_monto: number
  monto_pagado: number
  monto_pendiente: number
  ordenes_por_vencer: number
  ordenes_vencidas: number
}

export interface OrdenPagoFormData {
  escritura_id: string
  tramite_id?: string | null
  dependencia_id: string
  concepto: string
  monto: number
  linea_captura?: string | null
  fecha_emision_linea: string
  fecha_vencimiento_linea?: string | null
  quien_cubre: QuienCubrePago
  observaciones?: string | null
}

export interface LiquidarOrdenPagoData {
  orden_pago_id: string
  metodo_pago: MetodoPagoDerechos
  folio_autorizacion_bancaria: string
  fecha_pago: string
  comprobante_archivo?: File | null
  observaciones?: string | null
}

export interface FiltrosOrdenesPago {
  busqueda?: string
  estado?: EstadoOrdenPago | 'todos'
  dependencia_id?: string | 'todas'
  quien_cubre?: QuienCubrePago | 'todos'
  vencimiento?: 'todas' | 'vencidas' | 'por_vencer_3_dias' | 'vigentes'
  fecha_desde?: string
  fecha_hasta?: string
}
```

---

## 2. Helpers Isomórficos (`app/utils/ordenesPagoUtils.ts`)

```typescript
import type { EstadoOrdenPago, SemaforoLineaCaptura } from '~/types/ordenesPago'

/**
 * Calcula el color del semáforo de vigencia de una línea de captura.
 */
export function calcularSemaforoLineaCaptura(
  estado: EstadoOrdenPago,
  fechaVencimiento?: string | null,
  fechaReferencia: Date = new Date()
): { semaforo: SemaforoLineaCaptura; diasRestantes: number | null; label: string }

/**
 * Formato estándar de moneda MXN ($ 1,234.56).
 */
export function formatearMonedaMXN(monto: number): string
```

---

## 3. Contrato del Composable `useOrdenesPago` (`app/composables/useOrdenesPago.ts`)

```typescript
export function useOrdenesPago(escrituraId?: MaybeRef<string | undefined>) {
  // Estado reactivo
  const ordenes = ref<OrdenPago[]>([])
  const dependencias = ref<DependenciaOficialLite[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // Resumen financiero computado
  const resumenFinanciero = computed<ResumenFinancieroDerechos>(() => ...)

  // Operaciones
  async function cargarDependencias(): Promise<void>
  async function cargarOrdenes(filtros?: FiltrosOrdenesPago): Promise<void>
  async function guardarOrden(data: OrdenPagoFormData, ordenId?: string): Promise<OrdenPago>
  async function liquidarOrden(data: LiquidarOrdenPagoData): Promise<void>
  async function cancelarOrden(ordenId: string, motivo: string): Promise<void>
  async function consultarOrdenPorId(ordenId: string): Promise<OrdenPago | null>

  return {
    ordenes,
    dependencias,
    loading,
    saving,
    error,
    resumenFinanciero,
    cargarDependencias,
    cargarOrdenes,
    guardarOrden,
    liquidarOrden,
    cancelarOrden,
    consultarOrdenPorId,
  }
}
```

---

## 4. Contrato de Componentes UI

### 4.1. `OrdenesPagoTab.vue`
- **Props**:
  - `escrituraId: string` (Obligatorio)
  - `readOnly?: boolean` (Default: false)
- **Emits**:
  - `actualizado: () => void`
- **Slots**:
  - Ninguno.
- **Responsabilidad**:
  - Despliega las tarjetas de resumen financiero (Total Derechos, Pagado, Pendiente, Por Vencer).
  - Muestra alerta ámbar informativa si hay saldo pendiente de liquidar (sin bloquear protocolización).
  - Lista en tabla interactiva las órdenes de pago con líneas de captura y acciones (liquidar, editar, cancelar, ver comprobante).
  - Incluye botón "+ Registrar Orden de Pago" que abre `OrdenPagoFormModal.vue`.

### 4.2. `OrdenPagoFormModal.vue`
- **Props**:
  - `modelValue: boolean` (v-model para visibilidad)
  - `escrituraId: string` (Obligatorio)
  - `orden?: OrdenPago | null` (Para modo edición)
  - `tramitePreseleccionadoId?: string | null` (Opcional, si se abre desde la pestaña de trámites)
- **Emits**:
  - `update:modelValue: (val: boolean) => void`
  - `saved: (orden: OrdenPago) => void`

### 4.3. `OrdenPagoLiquidarModal.vue`
- **Props**:
  - `modelValue: boolean`
  - `orden: OrdenPago` (Obligatorio)
- **Emits**:
  - `update:modelValue: (val: boolean) => void`
  - `liquidado: () => void`

### 4.4. `OrdenesPagoFiltros.vue`
- **Props**:
  - `modelValue: FiltrosOrdenesPago`
  - `dependencias: DependenciaOficialLite[]`
- **Emits**:
  - `update:modelValue: (filtros: FiltrosOrdenesPago) => void`
  - `reset: () => void`
