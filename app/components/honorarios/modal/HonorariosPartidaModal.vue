<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { HonorariosPartida } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

const props = defineProps<{
  modelValue: boolean
  partidaAEditar?: HonorariosPartida | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'guardar', partida: Partial<HonorariosPartida>): void
}>()

const { formatearMoneda, redondear } = useHonorariosCalculos()

const concepto = ref('')
const monto = ref<number | ''>('')
const aplicaIva = ref(true)
const esDescuento = ref(false)
const valid = ref(false)

watch(
  () => props.partidaAEditar,
  (nueva) => {
    if (nueva) {
      concepto.value = nueva.concepto
      monto.value = nueva.monto
      aplicaIva.value = nueva.aplica_iva
      esDescuento.value = nueva.es_descuento || false
    } else {
      concepto.value = ''
      monto.value = ''
      aplicaIva.value = true
      esDescuento.value = false
    }
  },
  { immediate: true }
)

const montoNum = computed(() => (typeof monto.value === 'number' ? monto.value : 0))

const ivaCalculado = computed(() => {
  if (esDescuento.value || !aplicaIva.value) return 0
  return redondear(montoNum.value * 0.16)
})

const totalPartida = computed(() => {
  if (esDescuento.value) return redondear(montoNum.value)
  return redondear(montoNum.value + ivaCalculado.value)
})

function cerrar() {
  emit('update:modelValue', false)
}

function onGuardar() {
  if (!concepto.value.trim() || montoNum.value < 0) return

  emit('guardar', {
    id: props.partidaAEditar?.id,
    concepto: concepto.value.trim(),
    monto: redondear(montoNum.value),
    aplica_iva: esDescuento.value ? false : aplicaIva.value,
    tasa_iva: esDescuento.value || !aplicaIva.value ? 0 : 0.16,
    es_descuento: esDescuento.value,
  })

  cerrar()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="600" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" dark class="px-4">
        <v-icon icon="mdi-receipt-text-outline" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          {{ partidaAEditar ? 'Editar Partida de Cobro' : 'Agregar Partida de Cotización' }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-5">
        <v-form v-model="valid" @submit.prevent="onGuardar">
          <v-text-field
            v-model="concepto"
            label="Concepto del cobro / servicio *"
            placeholder="Ej. Honorarios profesionales por protocolización, Testimonios, Copias..."
            variant="outlined"
            density="comfortable"
            :rules="[(v) => !!v?.trim() || 'El concepto es requerido']"
            class="mb-3"
            autofocus
          />

          <v-row dense>
            <v-col cols="12" sm="7">
              <v-text-field
                v-model.number="monto"
                label="Importe (MXN) *"
                prefix="$"
                type="number"
                min="0"
                step="0.01"
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) => (v !== '' && v !== null && v >= 0) || 'Ingrese un importe válido mayor o igual a cero',
                ]"
              />
            </v-col>
            <v-col cols="12" sm="5" class="d-flex align-center">
              <v-switch
                v-if="!esDescuento"
                v-model="aplicaIva"
                color="secondary"
                label="Causa IVA (16%)"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <v-checkbox
            v-model="esDescuento"
            color="error"
            label="Esta partida es un descuento o bonificación comercial"
            density="compact"
            hide-details
            class="mt-1"
          />

          <!-- Previsualización del cálculo -->
          <v-card variant="tonal" :color="esDescuento ? 'error' : 'secondary'" class="pa-3 mt-4 rounded-md">
            <div class="d-flex justify-space-between text-caption text-medium-emphasis">
              <span>Importe Base:</span>
              <strong class="text-high-emphasis">{{ formatearMoneda(montoNum) }}</strong>
            </div>
            <div v-if="!esDescuento && aplicaIva" class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
              <span>IVA Trasladado (16%):</span>
              <strong class="text-high-emphasis">{{ formatearMoneda(ivaCalculado) }}</strong>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between text-body-2 font-weight-bold">
              <span>{{ esDescuento ? 'Total Deducible:' : 'Total de Partida:' }}</span>
              <span class="text-h6 font-weight-bold">
                {{ esDescuento ? `-${formatearMoneda(totalPartida)}` : formatearMoneda(totalPartida) }}
              </span>
            </div>
          </v-card>
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
          {{ partidaAEditar ? 'Actualizar Partida' : 'Guardar Partida' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
