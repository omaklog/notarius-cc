<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  OrdenPago,
  OrdenPagoFormData,
  DependenciaOficialLite,
  QuienCubrePago,
} from '~/types/ordenesPago'

const props = defineProps<{
  modelValue: boolean
  escrituraId: string
  orden?: OrdenPago | null
  tramitePreseleccionadoId?: string | null
  dependencias?: DependenciaOficialLite[]
  dependenciaIdPreseleccionada?: string | null
  conceptoPreseleccionado?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved', data: OrdenPagoFormData, ordenId?: string): void
}>()

const formRef = ref<any>(null)
const esValido = ref(false)
const guardando = ref(false)

// Campos del formulario
const dependenciaId = ref<string>('')
const concepto = ref<string>('')
const monto = ref<number | string>('')
const lineaCaptura = ref<string>('')
const fechaEmision = ref<string>('')
const fechaVencimiento = ref<string>('')
const quienCubre = ref<QuienCubrePago>('adquirente')
const tramiteId = ref<string | null>(null)
const observaciones = ref<string>('')

const esEdicion = computed(() => !!props.orden?.id)

const opcionesQuienCubre = [
  { title: 'Adquirente / Comprador', value: 'adquirente' },
  { title: 'Enajenante / Vendedor', value: 'enajenante' },
  { title: 'Notaría (Fondo Revolvente)', value: 'notaria_fondo_revolvente' },
  { title: 'Banco / Acreedor', value: 'banco_acreedor' },
  { title: 'Otro', value: 'otro' },
]

function inicializarFormulario() {
  if (props.orden) {
    dependenciaId.value = props.orden.dependencia_id || ''
    concepto.value = props.orden.concepto || ''
    monto.value = props.orden.monto
    lineaCaptura.value = props.orden.linea_captura || ''
    fechaEmision.value = props.orden.fecha_emision_linea || new Date().toISOString().slice(0, 10)
    fechaVencimiento.value = props.orden.fecha_vencimiento_linea || ''
    quienCubre.value = props.orden.quien_cubre || 'adquirente'
    tramiteId.value = props.orden.tramite_id || null
    observaciones.value = props.orden.observaciones || ''
  } else {
    if (props.dependenciaIdPreseleccionada) {
      const match = props.dependencias?.find((d) => d.id === props.dependenciaIdPreseleccionada)
      dependenciaId.value = match ? match.id : props.dependenciaIdPreseleccionada
    } else {
      dependenciaId.value = props.dependencias?.[0]?.id || ''
    }
    concepto.value = props.conceptoPreseleccionado || ''
    monto.value = ''
    lineaCaptura.value = ''
    fechaEmision.value = new Date().toISOString().slice(0, 10)
    fechaVencimiento.value = ''
    quienCubre.value = 'adquirente'
    tramiteId.value = props.tramitePreseleccionadoId || null
    observaciones.value = ''
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) inicializarFormulario()
  },
  { immediate: true }
)

watch(
  () => props.dependencias,
  (nuevasDeps) => {
    if (props.modelValue && !props.orden && nuevasDeps?.length) {
      if (props.dependenciaIdPreseleccionada && nuevasDeps.some((d) => d.id === props.dependenciaIdPreseleccionada)) {
        dependenciaId.value = props.dependenciaIdPreseleccionada
      } else if (!dependenciaId.value) {
        dependenciaId.value = nuevasDeps[0].id
      }
    }
  },
  { deep: true }
)

watch(
  () => props.dependenciaIdPreseleccionada,
  (nuevaDepId) => {
    if (props.modelValue && !props.orden && nuevaDepId) {
      dependenciaId.value = nuevaDepId
    }
  }
)

watch(
  () => props.conceptoPreseleccionado,
  (nuevoConcepto) => {
    if (props.modelValue && !props.orden && nuevoConcepto !== undefined) {
      concepto.value = nuevoConcepto || ''
    }
  }
)

function cerrar() {
  try {
    formRef.value?.resetValidation?.()
  } catch {}
  emit('update:modelValue', false)
}

async function guardar() {
  if (!dependenciaId.value) return
  if (!concepto.value || concepto.value.trim() === '') return
  const numMonto = Number(monto.value)
  if (isNaN(numMonto) || numMonto < 0) return

  guardando.value = true
  try {
    const payload: OrdenPagoFormData = {
      escritura_id: props.escrituraId,
      tramite_id: tramiteId.value || null,
      dependencia_id: dependenciaId.value,
      concepto: concepto.value.trim(),
      monto: numMonto,
      linea_captura: lineaCaptura.value ? lineaCaptura.value.trim() : null,
      fecha_emision_linea: fechaEmision.value || new Date().toISOString().slice(0, 10),
      fecha_vencimiento_linea: fechaVencimiento.value || null,
      quien_cubre: quienCubre.value,
      observaciones: observaciones.value ? observaciones.value.trim() : null,
    }

    emit('saved', payload, props.orden?.id)
    cerrar()
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    :persistent="guardando"
    @update:model-value="cerrar"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white px-6 py-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-receipt-text-outline" class="mr-3" />
          <span class="text-h6 font-weight-bold">
            {{ esEdicion ? `Modificar Orden ${orden?.folio || ''}` : 'Registrar Orden de Pago de Derechos' }}
          </span>
        </div>
        <v-btn icon variant="text" size="small" color="white" @click="cerrar">
          <v-icon icon="mdi-close" />
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="formRef" v-model="esValido" @submit.prevent="guardar">
          <v-row density="comfortable">
            <!-- Dependencia Receptora -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="dependenciaId"
                :items="dependencias || []"
                item-title="nombre"
                item-value="id"
                label="Dependencia Receptora *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-office-building"
                :rules="[(v) => !!v || 'La dependencia es obligatoria']"
                required
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :subtitle="item?.raw?.sigla || ''" />
                </template>
              </v-select>
            </v-col>

            <!-- Procedencia de Fondos -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="quienCubre"
                :items="opcionesQuienCubre"
                label="Quién Cubre los Derechos *"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-account-cash"
                required
              />
            </v-col>

            <!-- Concepto -->
            <v-col cols="12">
              <v-text-field
                v-model="concepto"
                label="Concepto Oficial de los Derechos *"
                placeholder="Ej. Derechos de Inscripción RPP, Impuesto ISAI, Avalúo Catastral..."
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-format-list-bulleted"
                :rules="[(v) => !!v || 'El concepto es obligatorio']"
                required
              />
            </v-col>

            <!-- Monto -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="monto"
                label="Monto Oficial (MXN) *"
                type="number"
                step="0.01"
                min="0"
                prefix="$"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-currency-usd"
                :rules="[
                  (v) => (v !== '' && v !== null) || 'El monto es obligatorio',
                  (v) => Number(v) >= 0 || 'El monto no puede ser negativo',
                ]"
                required
              />
            </v-col>

            <!-- Línea de Captura -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="lineaCaptura"
                label="Línea de Captura Oficial"
                placeholder="Código de barras / línea numérica"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-barcode-scan"
                hint="Línea emitida por la Tesorería o RPP"
                persistent-hint
              />
            </v-col>

            <!-- Fecha de Emisión -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fechaEmision"
                label="Fecha de Emisión de la Línea"
                type="date"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar-start"
              />
            </v-col>

            <!-- Fecha de Vencimiento -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fechaVencimiento"
                label="Fecha de Vencimiento de la Línea"
                type="date"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-calendar-clock"
                hint="Fecha límite para liquidar sin recargos"
                persistent-hint
              />
            </v-col>

            <!-- Observaciones -->
            <v-col cols="12">
              <v-textarea
                v-model="observaciones"
                label="Observaciones o Notas Internas"
                placeholder="Comentarios adicionales para tesorería..."
                rows="2"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-note-text-outline"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
        <v-btn variant="text" color="grey-darken-1" @click="cerrar">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="guardando"
          :disabled="!esValido"
          prepend-icon="mdi-content-save"
          @click="guardar"
        >
          {{ esEdicion ? 'Actualizar Orden' : 'Guardar Orden' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
