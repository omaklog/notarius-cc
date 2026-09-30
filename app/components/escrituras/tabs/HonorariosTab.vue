<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { HonorariosPartida, HonorariosPago, HonorariosCuenta } from '~/types/honorarios'
import { useHonorarios } from '~/composables/useHonorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'
import HonorariosKpisBar from '~/components/honorarios/HonorariosKpisBar.vue'
import HonorariosPartidasTable from '~/components/honorarios/HonorariosPartidasTable.vue'
import HonorariosPagosTable from '~/components/honorarios/HonorariosPagosTable.vue'
import HonorariosCfdiCard from '~/components/honorarios/HonorariosCfdiCard.vue'
import HonorariosPartidaModal from '~/components/honorarios/modal/HonorariosPartidaModal.vue'
import HonorariosPagoModal from '~/components/honorarios/modal/HonorariosPagoModal.vue'
import HojaLiquidacionModal from '~/components/honorarios/modal/HojaLiquidacionModal.vue'
import HonorariosCfdiModal from '~/components/honorarios/modal/HonorariosCfdiModal.vue'
import RedactarNotificacionModal from '~/components/notificaciones/modal/RedactarNotificacionModal.vue'
import { useNotificaciones } from '~/composables/useNotificaciones'
import { useSupabaseClient } from '#imports'


const props = withDefaults(
  defineProps<{
    escrituraId: string
    estatusEscritura?: string
    readOnly?: boolean
  }>(),
  {
    readOnly: false,
    estatusEscritura: 'borrador',
  }
)

const emit = defineEmits<{
  (e: 'status-change'): void
}>()

const {
  cuenta,
  partidas,
  pagos,
  ordenesPagoTerceros,
  cargando,
  error,
  hojaLiquidacion,
  cargarCuenta,
  guardarPartida,
  eliminarPartida,
  registrarPago,
  actualizarCfdi,
} = useHonorarios(props.escrituraId)

const { formatearMoneda } = useHonorariosCalculos()

// Modales
const modalPartidaVisible = ref(false)
const partidaEnEdicion = ref<HonorariosPartida | null>(null)

const modalPagoVisible = ref(false)
const modalLiquidacionVisible = ref(false)
const modalCfdiVisible = ref(false)

// Modal simple de visualización de recibo
const modalReciboVisible = ref(false)
const reciboSeleccionado = ref<HonorariosPago | null>(null)

// Notificaciones contextuales al compareciente
const modalNotificarVisible = ref(false)
const plantillaCodigoANotificar = ref('PAGO_LIQUIDADO_WHATSAPP')
const variablesNotificar = ref<Record<string, any>>({})
const comparecienteANotificar = ref<{ id?: string; nombre: string; contacto: string; canal?: any } | undefined>()

let plantillas = ref<any[]>([])
try {
  const notifComposable = useNotificaciones()
  plantillas = notifComposable.plantillas
  if (notifComposable.cargarPlantillas) {
    notifComposable.cargarPlantillas()
  }
} catch {
  // Test unitario sin plugin de notificaciones
}

async function onNotificarPago(pago: HonorariosPago) {
  plantillaCodigoANotificar.value = 'PAGO_LIQUIDADO_WHATSAPP'
  variablesNotificar.value = {
    monto: formatearMoneda(pago.monto),
    folio_tramite: pago.folio_recibo,
    concepto: pago.concepto || 'Honorarios Notariales',
  }

  try {
    const supabase = useSupabaseClient()
    const q = supabase.from?.('escritura_comparecientes')
    if (q?.select) {
      const { data } = await q
        .select('compareciente_id, comparecientes (id, nombre, email, telefono)')
        .eq('escritura_id', props.escrituraId)
        .limit(1)

      if (data && data.length > 0 && (data[0] as any).comparecientes) {
        const c = (data[0] as any).comparecientes
        comparecienteANotificar.value = {
          id: c.id,
          nombre: c.nombre,
          contacto: c.telefono || c.email || '',
          canal: c.telefono ? 'whatsapp' : 'correo',
        }
      } else {
        comparecienteANotificar.value = undefined
      }
    }
  } catch {
    comparecienteANotificar.value = undefined
  }

  modalNotificarVisible.value = true
}

// Feedback
const snackbar = ref(false)

const snackbarTexto = ref('')
const snackbarColor = ref('success')

function notificar(msg: string, color = 'success') {
  snackbarTexto.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

onMounted(() => {
  cargarCuenta()
})

const puedeEditar = computed(() => {
  if (props.readOnly) return false
  if (props.estatusEscritura === 'anulada') return false
  return true
})

// Partidas handlers
function onNuevaPartida() {
  partidaEnEdicion.value = null
  modalPartidaVisible.value = true
}

function onEditarPartida(p: HonorariosPartida) {
  partidaEnEdicion.value = p
  modalPartidaVisible.value = true
}

async function onGuardarPartida(pData: Partial<HonorariosPartida>) {
  const ok = await guardarPartida(pData)
  if (ok) {
    notificar('Partida de cotización guardada exitosamente')
    emit('status-change')
  } else {
    notificar(error.value || 'Error al guardar la partida', 'error')
  }
}

async function onEliminarPartida(pId: string) {
  const ok = await eliminarPartida(pId)
  if (ok) {
    notificar('Partida eliminada')
    emit('status-change')
  } else {
    notificar(error.value || 'Error al eliminar la partida', 'error')
  }
}

// Pagos handlers
function onNuevoPago() {
  modalPagoVisible.value = true
}

async function onGuardarPago(pData: Partial<HonorariosPago>) {
  const ok = await registrarPago(pData)
  if (ok) {
    notificar('Pago / anticipo asentado correctamente')
    emit('status-change')
  } else {
    notificar(error.value || 'Error al asentar el pago', 'error')
  }
}

function onVerRecibo(pago: HonorariosPago) {
  reciboSeleccionado.value = pago
  modalReciboVisible.value = true
}

// CFDI handlers
function onEditarCfdi() {
  modalCfdiVisible.value = true
}

async function onGuardarCfdi(datos: Partial<HonorariosCuenta>) {
  const ok = await actualizarCfdi(datos)
  if (ok) {
    notificar('Datos fiscales de facturación actualizados')
  } else {
    notificar(error.value || 'Error al actualizar facturación', 'error')
  }
}
</script>

<template>
  <div class="honorarios-tab">
    <!-- Estado de carga -->
    <div v-if="cargando && !cuenta" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <div class="text-caption text-medium-emphasis mt-2">Cargando cuenta de honorarios...</div>
    </div>

    <div v-else-if="cuenta">
      <!-- Barra superior de KPIs financieros -->
      <HonorariosKpisBar
        :total-cotizado-notaria="hojaLiquidacion?.honorarios?.total_notaria || 0"
        :total-derechos-terceros="hojaLiquidacion?.terceros?.total_derechos || 0"
        :gran-total-tramite="hojaLiquidacion?.balance?.gran_total_tramite || 0"
        :total-pagado="hojaLiquidacion?.balance?.total_recibido || 0"
        :saldo-pendiente="hojaLiquidacion?.balance?.saldo_neto_pendiente || 0"
        :estatus="cuenta.estatus"
        @ver-hoja-liquidacion="modalLiquidacionVisible = true"
      />

      <!-- Bloque A: Partidas Libres de Honorarios -->
      <HonorariosPartidasTable
        :partidas="partidas"
        :puede-editar="puedeEditar"
        @agregar-partida="onNuevaPartida"
        @editar-partida="onEditarPartida"
        @eliminar-partida="onEliminarPartida"
      />

      <!-- Bloque B: Registro de Pagos y Anticipos -->
      <HonorariosPagosTable
        :pagos="pagos"
        :puede-registrar="puedeEditar"
        @registrar-pago="onNuevoPago"
        @ver-recibo="onVerRecibo"
        @notificar-pago="onNotificarPago"
      />

      <!-- Sección Fiscal CFDI 4.0 -->
      <HonorariosCfdiCard
        :cuenta="cuenta"
        :puede-editar="puedeEditar"
        @editar="onEditarCfdi"
      />
    </div>

    <!-- Modales -->
    <HonorariosPartidaModal
      v-model="modalPartidaVisible"
      :partida-a-editar="partidaEnEdicion"
      @guardar="onGuardarPartida"
    />

    <HonorariosPagoModal
      v-model="modalPagoVisible"
      :saldo-pendiente="hojaLiquidacion?.balance?.saldo_neto_pendiente ?? cuenta?.saldo_pendiente"
      @guardar="onGuardarPago"
    />

    <HojaLiquidacionModal
      v-model="modalLiquidacionVisible"
      :hoja-liquidacion="hojaLiquidacion"
    />

    <HonorariosCfdiModal
      v-model="modalCfdiVisible"
      :cuenta="cuenta"
      @guardar="onGuardarCfdi"
    />

    <!-- Modal Notificar Pago al Compareciente -->
    <RedactarNotificacionModal
      v-model="modalNotificarVisible"
      :plantillas="plantillas"
      :escritura-id-preseleccionada="escrituraId"
      :compareciente-preseleccionado="comparecienteANotificar"
      :plantilla-preseleccionada-codigo="plantillaCodigoANotificar"
      :variables-precalculadas="variablesNotificar"
      @enviado="notificar('Aviso de pago despachado al compareciente con éxito')"
    />


    <!-- Modal Recibo de Cobro -->
    <v-dialog v-model="modalReciboVisible" max-width="500">
      <v-card v-if="reciboSeleccionado" class="rounded-lg">
        <v-toolbar color="primary" density="compact" dark class="px-4">
          <v-icon icon="mdi-receipt" class="mr-2" />
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            Recibo de Cobro Notarial
          </v-toolbar-title>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" size="small" @click="modalReciboVisible = false" />
        </v-toolbar>
        <v-card-text class="pa-5">
          <div class="text-center mb-4">
            <div class="text-caption text-medium-emphasis">FOLIO OFICIAL DE RECIBO</div>
            <div class="text-h5 font-weight-bold text-primary font-weight-mono">
              {{ reciboSeleccionado.folio_recibo }}
            </div>
            <v-chip color="success" size="small" variant="tonal" class="mt-1 font-weight-bold">
              PAGADO Y VALIDADO EN CAJA
            </v-chip>
          </div>
          <v-divider class="my-3" />
          <div class="d-flex justify-space-between text-body-2 mb-2">
            <span class="text-medium-emphasis">Fecha:</span>
            <strong>{{ reciboSeleccionado.fecha_pago }}</strong>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-2">
            <span class="text-medium-emphasis">Método:</span>
            <span class="text-capitalize">{{ reciboSeleccionado.metodo_pago.replace('_', ' ') }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-2">
            <span class="text-medium-emphasis">Referencia:</span>
            <span class="font-weight-mono">{{ reciboSeleccionado.referencia_bancaria || '—' }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-2">
            <span class="text-medium-emphasis">Concepto:</span>
            <span>{{ reciboSeleccionado.concepto }}</span>
          </div>
          <v-divider class="my-3" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-subtitle-2 font-weight-bold">Importe Recibido:</span>
            <span class="text-h5 font-weight-bold text-success font-weight-mono">
              {{ formatearMoneda(reciboSeleccionado.monto) }}
            </span>
          </div>
        </v-card-text>
        <v-divider />
        <v-card-actions class="pa-4 bg-surface">
          <v-spacer />
          <v-btn variant="text" @click="modalReciboVisible = false">Cerrar</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-printer" @click="modalReciboVisible = false">
            Imprimir Recibo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="bottom right">
      {{ snackbarTexto }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
