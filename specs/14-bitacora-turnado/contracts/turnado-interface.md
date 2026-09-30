# Interface Contract: Composable `useTurnadoTramites` y Servicios de Cadena de Custodia

**Feature**: `14-bitacora-turnado` | **Date**: 2026-09-25

---

## 1. Contrato del Composable `useTurnadoTramites`

```typescript
import type { Ref } from 'vue'
import type {
  TurnadoEventoItem,
  CustodiaActualResumen,
  TurnarTramitePayload,
} from '~/types/turnado'

export interface UseTurnadoTramitesReturn {
  // Estado reactivo
  eventos: Ref<TurnadoEventoItem[]>
  custodiaActual: Ref<CustodiaActualResumen | null>
  cargando: Ref<boolean>
  turnando: Ref<boolean>
  error: Ref<string | null>

  // Métodos de lectura
  cargarHistorial: (tramiteId?: string, escrituraId?: string) => Promise<void>
  obtenerPersonalDisponible: () => Promise<{
    gestores: Array<{ id: string; nombre: string; email: string }>
    redactores: Array<{ id: string; nombre: string; email: string }>
  }>

  // Métodos de acción de custodia
  turnarAlGestor: (payload: {
    escrituraId: string
    tramiteId: string
    gestorId: string
    instrucciones?: string
  }) => Promise<string>

  devolverPorPrevencion: (payload: {
    escrituraId: string
    tramiteId: string
    redactorId: string
    motivo: string
    folioPrevencion?: string
    fechaLimite?: string
    instrucciones?: string
  }) => Promise<string>

  solventarYReturnar: (payload: {
    escrituraId: string
    tramiteId: string
    gestorId: string
    motivo: string
    instrucciones?: string
  }) => Promise<string>

  entregarConcluido: (payload: {
    escrituraId: string
    tramiteId: string
    redactorId: string
    motivo?: string
  }) => Promise<string>
}
```

---

## 2. Contratos de Componentes UI

### 2.1 `CustodiaTramiteBadge.vue`
- **Props**:
  - `rolCustodio`: `'redactor' | 'gestor' | 'notario'`
  - `custodioNombre`: `string`
  - `detenidoPorSolventacion`: `boolean`
  - `horasEnCustodia`: `number`
  - `compacto?`: `boolean`
- **Comportamiento**:
  - Renderiza badge con semáforo notarial:
    - 🔵 Gestor en activo: fondo azul suave, texto azul marino institucional (`#1B3A5F`).
    - 🟠 Redactor en solventación: fondo ámbar, icono de alerta (`mdi-alert-circle-outline`).
    - 🟢 Concluido / entregado: fondo verde suave.

### 2.2 `TurnadoTramiteModal.vue`
- **Props**:
  - `modelValue`: `boolean`
  - `tramiteId`: `string`
  - `escrituraId`: `string`
  - `accionInicial`: `'turnar' | 'devolver' | 'solventar' | 'concluir'`
  - `custodioActualNombre?`: `string`
  - `redactorIdPredeterminado?`: `string`
  - `gestorIdPredeterminado?`: `string`
- **Emits**:
  - `update:modelValue`: `(val: boolean) => void`
  - `turnado-exitoso`: `(eventoId: string) => void`

### 2.3 `BitacoraTurnadoTimeline.vue`
- **Props**:
  - `eventos`: `TurnadoEventoItem[]`
  - `cargando`: `boolean`
- **Comportamiento**:
  - Timeline visual cronológico con tarjetas de evento, badges de emisor/receptor, motivos y duración en cada mano.
