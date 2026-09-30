<script setup lang="ts">
import { ref, computed } from 'vue'
import type { HonorariosPago, MetodoPagoHonorarios } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

const props = defineProps<{
  modelValue: boolean
  saldoPendiente?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'guardar', pago: Partial<HonorariosPago>): void
}>()

const { formatearMoneda, redondear } = useHonorariosCalculos()

const monto = ref<number | ''>('')
const fechaPago = ref(new Date().toISOString().substring(0, 10))
const metodoPago = ref<MetodoPagoHonorarios>('transferencia_spei')
const referenciaBancaria = ref('')
const concepto = ref('Anticipo de honorarios y gastos notariales')
const notas = ref('')
const valid = ref(false)

const metodosOptions = [
  { value: 'transferencia_spei', title: 'Transferencia Electrónica (SPEI)' },
  { value: 'tarjeta_credito_debito', title: 'Tarjeta de Débito / Crédito (TPV)' },
  { value: 'cheque', title: 'Cheque Nominativo / Cheque de Caja' },
  { value: 'efectivo', title: 'Efectivo en Ventanilla' },
]

const montoNum = computed(() => (typeof monto.value === 'number' ? monto.value : 0))

const esEfectivo = computed(() => metodoPago.value === 'efectivo')

function rellenarSaldoTotal() {
  if (props.saldoPendiente && props.saldoPendiente > 0) {
    monto.value = redondear(props.saldoPendiente)
    concepto.value = 'Liquidación total de honorarios y gastos'
  }
}

function cerrar() {
  emit('update:modelValue', false)
}

function onGuardar() {
  if (montoNum.value <= 0) return

  emit('guardar', {
    monto: redondear(montoNum.value),
    fecha_pago: fechaPago.value,
    metodo_pago: metodoPago.value,
    referencia_bancaria: referenciaBancaria.value.trim() || null,
    concepto: concepto.value.trim() || 'Pago de honorarios y gastos',
    notas: notas.value.trim() || null,
  })

  cerrar()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="600" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" dark class="px-4">
        <v-icon icon="mdi-cash-plus" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Registrar Pago / Anticipo
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-5">
        <v-form v-model="valid" @submit.prevent="onGuardar">
          <!-- Saldo Pendiente Guía -->
          <div v-if="saldoPendiente !== undefined && saldoPendiente > 0" class="d-flex align-center justify-space-between pa-3 mb-4 rounded bg-surface-variant border">
            <div>
              <span class="text-caption text-medium-emphasis">Saldo Pendiente de la Cuenta:</span>
              <div class="text-subtitle-2 font-weight-bold text-primary">
                {{ formatearMoneda(saldoPendiente) }}
              </div>
            </div>
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              prepend-icon="mdi-cash-check"
              class="text-capitalize"
              @click="rellenarSaldoTotal"
            >
              Liquidar Saldo Total
            </v-btn>
          </div>

          <v-row dense>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model.number="monto"
                label="Monto del Pago (MXN) *"
                prefix="$"
                type="number"
                min="0.01"
                step="0.01"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => (v !== '' && v !== null && v > 0) || 'El monto debe ser mayor a cero']"
                autofocus
              />
            </v-col>
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="fechaPago"
                label="Fecha de Pago *"
                type="date"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'La fecha es requerida']"
              />
            </v-col>
          </v-row>

          <v-select
            v-model="metodoPago"
            :items="metodosOptions"
            item-title="title"
            item-value="value"
            label="Método de Pago *"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <!-- Alerta de control de efectivo LFPIORPI -->
          <v-alert
            v-if="esEfectivo"
            type="warning"
            variant="tonal"
            density="compact"
            icon="mdi-alert-circle-outline"
            class="mb-4 text-caption"
          >
            <strong>Control LFPIORPI Art. 32:</strong> Verifique que los cobros en efectivo acumulados para esta operación no excedan el límite antilavado permitido para compraventas y fe pública.
          </v-alert>

          <v-text-field
            v-model="referenciaBancaria"
            :label="esEfectivo ? 'Folio interno / Comprobante de caja' : 'Referencia Bancaria / Clave de Rastreo SPEI'"
            placeholder="Ej. BBVA-8491203, Auth TPV 99312..."
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-text-field
            v-model="concepto"
            label="Concepto del cobro *"
            placeholder="Ej. Pago único total de escrituración, Anticipo 50%..."
            variant="outlined"
            density="comfortable"
            :rules="[(v) => !!v?.trim() || 'El concepto es requerido']"
            class="mb-3"
          />

          <v-textarea
            v-model="notas"
            label="Observaciones o notas adicionales"
            rows="2"
            variant="outlined"
            density="comfortable"
            auto-grow
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-surface">
        <v-spacer />
        <v-btn variant="text" class="text-capitalize" @click="cerrar">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-capitalize px-4 font-weight-medium"
          :disabled="!valid"
          @click="onGuardar"
        >
          Confirmar Pago
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
