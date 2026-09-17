# Contracts: 07-tramites — Interfaces y Contratos de Trámites Notariales y Tarjetas de Gestoría

**Feature**: `07-tramites`  
**Date**: 2026-09-16  
**Status**: Ready

---

## 1. Tipos e Interfaces TypeScript (`app/types/tramites.ts`)

```typescript
export type FaseProcesal =
  | 'previo'
  | 'firma_otorgamiento'
  | 'posterior_fiscal'
  | 'inscripcion_definitiva'
  | 'entrega_cliente'

export type EstadoTramite =
  | 'solicitado'
  | 'en_proceso'
  | 'ingresado_dependencia'
  | 'prevenido_observado'
  | 'subsanado'
  | 'concluido_favorable'
  | 'rechazado_cancelado'

export type SemaforoTramite = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris'

export interface DependenciaOficial {
  id: string
  sigla: string
  nombre: string
  clave_numerica?: number | null
  direccion?: string | null
  portal_web?: string | null
  dias_habiles_compromiso: number
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface PasoTramite {
  id: number
  nombre: string
  orden: number
  dependencia_clave: number
  dependencia_id?: string | null
  genera_orden_pago: boolean
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface HistorialPasoEscritura {
  registro_id: string
  escritura_id: string
  paso_id: number
  paso_nombre: string
  paso_orden: number
  genera_orden_pago: boolean
  dependencia_clave: number
  dependencia_id?: string | null
  dependencia_sigla?: string | null
  dependencia_nombre?: string | null
  folio_volante?: string | null
  notas?: string | null
  fecha_registro: string
  completado_por?: string | null
  completado_por_nombre?: string | null
  orden_pago_id?: string | null
  orden_pago_folio?: string | null
  orden_pago_monto?: number | null
  orden_pago_estado?: string | null
  orden_pago_linea_captura?: string | null
}

export interface DependenciaTramiteCard {
  escritura_id: string
  dependencia_clave: number
  dependencia_id?: string | null
  dependencia_sigla: string
  dependencia_nombre: string
  dependencia_dias_habiles: number
  ultimo_paso_id: number
  ultimo_paso_nombre: string
  ultimo_folio_volante?: string | null
  ultimas_notas?: string | null
  ultima_fecha_registro: string
  ultimo_responsable_id?: string | null
  ultimo_responsable_nombre?: string | null
  ultima_orden_pago_id?: string | null
  ultimo_genera_orden_pago: boolean
  total_movimientos: number
  historial?: HistorialPasoEscritura[]
  expandido?: boolean
}

export interface PayloadAgregarPaso {
  escritura_id: string
  paso_id: number
  dependencia_clave: number
  dependencia_id?: string | null
  folio_volante?: string | null
  notas?: string | null
  fecha_registro?: string
  orden_pago_id?: string | null
}

export interface TramitePrevencion {
  id: string
  tramite_id: string
  folio_prevencion: string
  oficio_observacion?: string | null
  motivo_observacion: string
  registrador_nombre?: string | null
  fecha_notificacion: string
  fecha_limite_subsanacion: string
  subsanado: boolean
  fecha_subsanacion?: string | null
  folio_reingreso?: string | null
  documento_subsanacion_id?: string | null
  notas_subsanacion?: string | null
  created_at: string
}

export interface TramiteEscritura {
  id: string
  escritura_id: string
  tipo_tramite_id: string
  dependencia_id: string
  fase: FaseProcesal
  estado: EstadoTramite
  folio_dependencia?: string | null
  responsable_id?: string | null
  fecha_solicitud: string
  fecha_ingreso?: string | null
  fecha_limite_estimada?: string | null
  fecha_conclusion?: string | null
  orden_pago_id?: string | null
  documento_resultado_id?: string | null
  observaciones?: string | null
  motivo_cancelacion?: string | null
  created_at: string
  updated_at: string
}

export interface TramiteResumen extends TramiteEscritura {
  tipo_tramite_nombre?: string
  tipo_tramite_codigo?: string
  dependencia_sigla?: string
  dependencia_nombre?: string
  responsable_nombre?: string
  escritura_instrumento?: string | null
  escritura_expediente?: string | null
  acto_nombre?: string | null
  dias_habiles_restantes?: number
  semaforo?: SemaforoTramite
  prevenciones?: TramitePrevencion[]
}

export interface FiltrosTramites {
  busqueda?: string
  fase?: FaseProcesal | null
  dependencia_id?: string | null
  estado?: EstadoTramite | null
  responsable_id?: string | null
  semaforo?: SemaforoTramite | null
  fecha_desde?: string | null
  fecha_hasta?: string | null
}
```

---

## 2. Contrato del Composable `useTramites` (`app/composables/useTramites.ts`)

```typescript
export function useTramites() {
  return {
    // Estado reactivo
    tramites: Ref<TramiteResumen[]>,
    dependencias: Ref<DependenciaOficial[]>,
    pasosCatalogo: Ref<PasoTramite[]>,
    dependenciasCards: Ref<DependenciaTramiteCard[]>,
    historialCompleto: Ref<HistorialPasoEscritura[]>,
    cargando: Ref<boolean>,
    error: Ref<string | null>,

    // Métodos de catálogos
    cargarCatalogos: () => Promise<void>,
    obtenerPasosPorDependencia: (dependenciaClave: number) => PasoTramite[],

    // Métodos de Gestoría y Tarjetas de Dependencias
    cargarTarjetasDependencias: (escrituraId: string) => Promise<DependenciaTramiteCard[]>,
    cargarHistorialDependencia: (escrituraId: string, dependenciaClave: number) => Promise<HistorialPasoEscritura[]>,
    agregarPasoHistorial: (payload: PayloadAgregarPaso) => Promise<HistorialPasoEscritura>,
    iniciarGestionDependencia: (escrituraId: string, dependenciaClave: number, primerPasoId: number, notas?: string, folio?: string) => Promise<void>,

    // Operaciones del modelo de expedientes globales
    cargarTramitesEscritura: (escrituraId: string) => Promise<TramiteResumen[]>,
    cargarTodosTramites: (filtros?: FiltrosTramites) => Promise<TramiteResumen[]>,
    crearTramite: (payload: Partial<TramiteEscritura>) => Promise<TramiteEscritura>,
    actualizarTramite: (id: string, payload: Partial<TramiteEscritura>) => Promise<TramiteEscritura>,
    eliminarTramite: (id: string) => Promise<void>,
    cambiarEstadoTramite: (id: string, nuevoEstado: EstadoTramite, datosAdicionales?: Partial<TramiteEscritura>) => Promise<TramiteEscritura>,

    // Prevenciones
    registrarPrevencion: (tramiteId: string, prevencion: Partial<TramitePrevencion>) => Promise<TramitePrevencion>,
    subsanarPrevencion: (prevencionId: string, subsanacion: Partial<TramitePrevencion>) => Promise<TramitePrevencion>,

    // Utilerías de semáforo
    calcularSemaforo: (fechaLimite: string | null, estado: EstadoTramite) => { semaforo: SemaforoTramite; diasRestantes: number }
  }
}
```

---

## 3. Contratos de Componentes Vue

### 3.1. `TramitesDependenciasCards.vue`
- **Ubicación**: `app/components/tramites/TramitesDependenciasCards.vue`
- **Props**:
  - `escrituraId`: `string` (required)
  - `soloLectura`: `boolean` (optional, default false)
- **Events**:
  - `paso-agregado`: `(paso: HistorialPasoEscritura) => void`
  - `solicitar-orden-pago`: `(datos: { dependenciaId?: string; concepto?: string }) => void`
- **Comportamiento**:
  - Renderiza exclusivamente las tarjetas de dependencias activas con historial.
  - Botón superior `+ Iniciar Gestión en Dependencia` abre `TramiteNuevaDependenciaModal.vue`.
  - Cada tarjeta presenta layout a dos columnas:
    - Izquierda: Nombre de dependencia con ícono y caja de "Paso Actual / Último Movimiento" con chip de estado, fecha, folio y responsable.
    - Derecha: Botón `+ Agregar Paso` (menú desplegable de pasos filtrados) y botón `Historial Completo (N movimientos) [▲/▼]`.
  - Acordeón inline dentro de la misma tarjeta que despliega la línea de tiempo cronológica con todas las incidencias.

### 3.2. `TramitePasoModal.vue`
- **Ubicación**: `app/components/tramites/TramitePasoModal.vue`
- **Props**:
  - `modelValue`: `boolean` (control v-model)
  - `escrituraId`: `string` (required)
  - `dependencia`: `DependenciaOficial | { clave_numerica: number; nombre: string; id?: string }` (required)
  - `pasoPreseleccionado`: `PasoTramite | null` (optional)
- **Events**:
  - `update:modelValue`: `(val: boolean) => void`
  - `guardado`: `(paso: HistorialPasoEscritura) => void`
  - `abrir-orden-pago`: `(datos: { dependenciaId?: string; concepto?: string }) => void`
- **Campos**:
  - Selector de paso (filtrado por la dependencia).
  - Fecha del movimiento (precarga actual).
  - Folio oficial / volante / oficio de rechazo (opcional).
  - Notas u observaciones notariales.
  - Enlace contextual "+ Generar Orden de Pago de Derechos" si `genera_orden_pago === true`.

### 3.3. `TramiteNuevaDependenciaModal.vue`
- **Ubicación**: `app/components/tramites/TramiteNuevaDependenciaModal.vue`
- **Props**:
  - `modelValue`: `boolean`
  - `dependenciasDisponibles`: `DependenciaOficial[]` (aquellas que aún no están activas en la escritura)
- **Events**:
  - `update:modelValue`: `(val: boolean) => void`
  - `seleccionada`: `(dependencia: DependenciaOficial) => void`

### 3.4. `TramitesTab.vue` (Pestaña en la Escritura)
- **Ubicación**: `app/components/escrituras/tabs/TramitesTab.vue`
- **Props**:
  - `escrituraId`: `string` (required)
- **Estructura**:
  - Alerta de prevención de protocolización (si existen trámites previos pendientes en `tramites_escritura`).
  - Cabecera con título, buscador y botón superior `+ Iniciar Gestión en Dependencia`.
  - Instancia de `TramitesDependenciasCards.vue`.
  - Modales: `TramitePasoModal.vue`, `TramiteNuevaDependenciaModal.vue`, y enlace modal `OrdenPagoFormModal.vue`.
