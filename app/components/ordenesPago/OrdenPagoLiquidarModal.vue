<script setup lang="ts">
import { ref, watch } from 'vue'
import type { OrdenPago, MetodoPagoDerechos } from '~/types/ordenesPago'
import { formatearMonedaMXN } from '~/utils/ordenesPagoUtils'
import { useExpedienteDocumentos } from '~/composables/useExpedienteDocumentos'

const props = defineProps<{
  modelValue: boolean
  orden: OrdenPago | null
  escrituraId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (
    e: 'liquidado',
    data: {
      orden_pago_id: string
      metodo_pago: MetodoPagoDerechos
      folio_autorizacion_bancaria: string
      fecha_pago: string
      observaciones?: string | null
    },
    comprobanteDocId?: string | null
  ): void
}>()

const { subirDocumento } = useExpedienteDocumentos()

const metodoPago = ref<MetodoPagoDerechos>('transferencia_spei')
const folioAutorizacion = ref<string>('')
const fechaPago = ref<string>(new Date().toISOString().slice(0, 10))
const observaciones = ref<string>('')
const archivoComprobante = ref<File | null>(null)
const liquidando = ref(false)
const errorMsg = ref<string | null>(null)

const opcionesMetodo = [
  { title: 'Transferencia SPEI (Interbancaria)', value: 'transferencia_spei' },
  { title: 'Cheque de Caja', value: 'cheque_caja' },
  { title: 'Tarjeta de Débito / Crédito', value: 'tarjeta_credito_debito' },
  { title: 'Efectivo en Ventanilla Bancaria / Recaudadora', value: 'efectivo_ventanilla' },
  { title: 'Cargo Directo a Cuenta Notaría', value: 'cargo_cuenta_notaria' },
]

function inicializar() {
  metodoPago.value = 'transferencia_spei'
  folioAutorizacion.value = ''
  fechaPago.value = new Date().toISOString().slice(0, 10)
  observaciones.value = ''
  archivoComprobante.value = null
  errorMsg.value = null
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) inicializar()
  }
)

function cerrar() {
  emit('update:modelValue', false)
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target?.files && target.files[0]) {
    archivoComprobante.value = target.files[0]
  }
}

async function confirmarLiquidacion() {
  if (!props.orden) return
  if (!folioAutorizacion.value || folioAutorizacion.value.trim() === '') {
    errorMsg.value = 'La clave de rastreo SPEI o folio de autorización es obligatoria'
    return
  }

  liquidando.value = true
  errorMsg.value = null

  try {
    let comprobanteDocId: string | null = null

    // Si se adjuntó archivo, subirlo a Supabase Storage y registrar en expediente_documentos
    if (archivoComprobante.value) {
      try {
        const docSubido = await subirDocumento({
          entidadTipo: 'escritura',
          entidadId: props.escrituraId,
          categoria: 'comprobante_pago',
          archivo: archivoComprobante.value,
          nombreArchivo: archivoComprobante.value.name,
          metadata: {
            orden_pago_id: props.orden.id,
            orden_folio: props.orden.folio,
            metodo_pago: metodoPago.value,
            folio_autorizacion: folioAutorizacion.value.trim(),
          },
        })
        comprobanteDocId = docSubido.id
      } catch (err: any) {
        console.warn('Aviso: no se pudo guardar el archivo en storage:', err.message)
      }
    }

    emit(
      'liquidado',
      {
        orden_pago_id: props.orden.id,
        metodo_pago: metodoPago.value,
        folio_autorizacion_bancaria: folioAutorizacion.value.trim(),
        fecha_pago: fechaPago.value || new Date().toISOString().slice(0, 10),
        observaciones: observaciones.value ? observaciones.value.trim() : null,
      },
      comprobanteDocId
    )

    cerrar()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al asentar la liquidación bancaria'
  } finally {
    liquidando.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    persistent
    @update:model-value="cerrar"
  >
    <v-card v-if="orden" class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-success text-white px-6 py-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-bank-transfer" class="mr-3" />
          <span class="text-h6 font-weight-bold">
            Asentar Pago Bancario — {{ orden.folio }}
          </span>
        </div>
        <v-btn icon variant="text" size="small" color="white" @click="cerrar">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Resumen de la Orden a Liquidar -->
        <v-card variant="outlined" color="primary" class="mb-4 pa-3 bg-blue-grey-lighten-5">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-subtitle-2 font-weight-bold text-primary">
              {{ orden.concepto }}
            </span>
            <span class="text-h6 font-weight-bold text-primary">
              {{ formatearMonedaMXN(orden.monto) }}
            </span>
          </div>
          <div class="text-caption text-medium-emphasis">
            Dependencia: <strong>{{ orden.dependencia?.nombre || orden.dependencia?.sigla || 'Oficial' }}</strong>
            <span v-if="orden.linea_captura" class="ml-2">
              | Línea: <code class="font-weight-bold">{{ orden.linea_captura }}</code>
            </span>
          </div>
        </v-card>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
          @click:close="errorMsg = null"
        >
          {{ errorMsg }}
        </v-alert>

        <v-row density="comfortable">
          <!-- Método de Pago -->
          <v-col cols="12">
            <v-select
              v-model="metodoPago"
              :items="opcionesMetodo"
              label="Método de Pago Bancario *"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-credit-card-outline"
              required
            />
          </v-col>

          <!-- Clave de Rastreo SPEI / Folio Bancario -->
          <v-col cols="12" sm="7">
            <v-text-field
              v-model="folioAutorizacion"
              label="Clave de Rastreo SPEI / Folio de Autorización *"
              placeholder="Ej. 20260916000491823 o folio bancario"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-numeric"
              :rules="[(v) => !!v || 'La clave o folio bancario es obligatoria']"
              required
            />
          </v-col>

          <!-- Fecha de Pago -->
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="fechaPago"
              label="Fecha de Pago *"
              type="date"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-calendar-check"
              required
            />
          </v-col>

          <!-- Comprobante Bancario en PDF o Imagen -->
          <v-col cols="12">
            <v-file-input
              label="Comprobante Bancario Oficial (PDF o Imagen)"
              accept=".pdf,image/*"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-file-upload-outline"
              prepend-icon=""
              show-size
              hint="Se guardará con validez probatoria en el expediente digital"
              persistent-hint
              @change="onFileChange"
            />
          </v-col>

          <!-- Observaciones / Comentarios de Tesorería -->
          <v-col cols="12">
            <v-textarea
              v-model="observaciones"
              label="Notas de Tesorería / Conciliación"
              placeholder="Cuenta origen, referencia de ventanilla o detalles de caja..."
              rows="2"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-comment-text-outline"
              hide-details="auto"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
        <v-btn variant="text" color="grey-darken-1" @click="cerrar">
          Cancelar
        </v-btn>
        <v-btn
          color="success"
          variant="elevated"
          :loading="liquidando"
          prepend-icon="mdi-check-circle"
          @click="confirmarLiquidacion"
        >
          Confirmar Liquidación
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
