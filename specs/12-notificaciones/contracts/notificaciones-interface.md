# Contract: 12-notificaciones (Sistema Notarial de Notificaciones Multicanal y Avisos a Comparecientes)

## 1. Definiciones TypeScript (`app/types/notificaciones.ts`)

```typescript
export type CanalNotificacion = 'correo' | 'whatsapp' | 'sms'

export type EstatusNotificacion = 'pendiente' | 'enviado' | 'entregado' | 'leido' | 'fallido'

export type TipoEventoNotarial = 
  | 'tramite_avance' 
  | 'pago_liquidado' 
  | 'orden_pago_emitida' 
  | 'cita_firma' 
  | 'testimonio_listo' 
  | 'manual'

export interface VariablesNotificacion {
  nombre_cliente?: string
  numero_instrumento?: string | number
  acto?: string
  dependencia?: string
  folio_tramite?: string
  monto?: string | number
  fecha_cita?: string
  notaria?: string
  [key: string]: any
}

export interface PlantillaNotificacion {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  canal: CanalNotificacion
  asunto?: string | null
  cuerpo: string
  variables_disponibles: string[]
  requiere_confirmacion: boolean
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface ArchivoAdjuntoNotificacion {
  nombre: string
  url: string
  tamano_bytes?: number
  tipo_mime?: string
}

export interface NotificacionBitacoraItem {
  id: string
  plantilla_id?: string | null
  escritura_id?: string | null
  compareciente_id?: string | null
  canal: CanalNotificacion
  destinatario_nombre: string
  destinatario_contacto: string
  asunto?: string | null
  cuerpo_renderizado: string
  estatus: EstatusNotificacion
  tipo_evento: TipoEventoNotarial
  intentos_envio: number
  error_detalle?: string | null
  archivos_adjuntos?: ArchivoAdjuntoNotificacion[]
  metadata: Record<string, any>
  creado_por?: string | null
  created_at: string
  updated_at: string
  // Hydrated joins opcionales
  escrituras?: {
    instrumento: number
    anio: number
  } | null
  comparecientes?: {
    nombre: string
  } | null
}

export interface NotificacionesKpis {
  total_enviados_mes: number
  tasa_entrega_porcentaje: number
  total_whatsapp: number
  total_correo: number
  total_sms: number
  total_fallidos: number
  pendientes_reintento: number
}

export interface FiltrosNotificaciones {
  canal?: CanalNotificacion | 'todos'
  estatus?: EstatusNotificacion | 'todos'
  busqueda?: string
  escritura_id?: string
  fecha_inicio?: string
  fecha_fin?: string
}

export interface PayloadEnviarNotificacion {
  plantilla_id?: string
  escritura_id?: string
  compareciente_id?: string
  canal: CanalNotificacion
  destinatario_nombre: string
  destinatario_contacto: string
  asunto?: string
  cuerpo: string
  tipo_evento?: TipoEventoNotarial
  variables?: VariablesNotificacion
  archivos_adjuntos?: ArchivoAdjuntoNotificacion[]
}

export interface ResultadoDespachoNotificacion {
  ok: boolean
  notificacion_id?: string
  estatus: EstatusNotificacion
  mensaje_proveedor?: string
  whatsapp_native_url?: string
  whatsapp_web_url?: string
  error?: string
}

```

---

## 2. Contrato de la API del Servidor Nuxt (`server/api/notificaciones/`)

### 2.1 `POST /api/notificaciones/enviar`
Despacha un mensaje a través del proveedor configurado (o simulado en pruebas) y asienta el registro en `notificaciones_bitacora`.

- **Headers**: `Authorization: Bearer <token>`
- **Permiso requerido**: `notificaciones.reenviar`
- **Request Body**: `PayloadEnviarNotificacion`
- **Response Success (200 OK)**:
  ```json
  {
    "ok": true,
    "notificacion_id": "b9c8d1e2-...",
    "estatus": "entregado",
    "mensaje_proveedor": "Mensaje entregado exitosamente (Mock Provider)"
  }
  ```

### 2.2 `POST /api/notificaciones/reenviar`
Reintenta el envío de una notificación previamente fallida o solicitada.

- **Request Body**:
  ```json
  {
    "notificacion_id": "b9c8d1e2-...",
    "canal_alternativo": "whatsapp"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "ok": true,
    "notificacion_id": "b9c8d1e2-...",
    "estatus": "entregado",
    "intentos_envio": 2
  }
  ```

---

## 3. Contrato del Composable `useNotificaciones.ts`

```typescript
export function useNotificaciones() {
  const bitacora = ref<NotificacionBitacoraItem[]>([])
  const plantillas = ref<PlantillaNotificacion[]>([])
  const kpis = ref<NotificacionesKpis | null>(null)
  const cargando = ref(false)
  const enviando = ref(false)
  const error = ref<string | null>(null)

  function cargarBitacora(filtros?: FiltrosNotificaciones): Promise<void>
  function cargarPlantillas(): Promise<void>
  function cargarKpis(): Promise<void>
  function enviarNotificacion(payload: PayloadEnviarNotificacion): Promise<ResultadoDespachoNotificacion>
  function reenviarNotificacion(id: string, canalAlternativo?: CanalNotificacion): Promise<ResultadoDespachoNotificacion>
  function guardarPlantilla(plantilla: Partial<PlantillaNotificacion>): Promise<{ ok: boolean; error?: string }>

  return {
    bitacora,
    plantillas,
    kpis,
    cargando,
    enviando,
    error,
    cargarBitacora,
    cargarPlantillas,
    cargarKpis,
    enviarNotificacion,
    reenviarNotificacion,
    guardarPlantilla,
  }
}
```
