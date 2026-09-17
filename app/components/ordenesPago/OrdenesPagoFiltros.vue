<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { FiltrosOrdenesPago, DependenciaOficialLite } from '~/types/ordenesPago'

const props = defineProps<{
  modelValue: FiltrosOrdenesPago
  dependencias?: DependenciaOficialLite[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: FiltrosOrdenesPago): void
  (e: 'reset'): void
}>()

const filtrosLocales = reactive<FiltrosOrdenesPago>({
  busqueda: props.modelValue.busqueda || '',
  dependencia_id: props.modelValue.dependencia_id || 'todas',
  estado: props.modelValue.estado || 'todos',
  vencimiento: props.modelValue.vencimiento || 'todas',
  quien_cubre: props.modelValue.quien_cubre || 'todos',
})

watch(
  () => props.modelValue,
  (val) => {
    filtrosLocales.busqueda = val.busqueda || ''
    filtrosLocales.dependencia_id = val.dependencia_id || 'todas'
    filtrosLocales.estado = val.estado || 'todos'
    filtrosLocales.vencimiento = val.vencimiento || 'todas'
    filtrosLocales.quien_cubre = val.quien_cubre || 'todos'
  },
  { deep: true }
)

function emitirCambio() {
  emit('update:modelValue', { ...filtrosLocales })
}

function limpiarFiltros() {
  filtrosLocales.busqueda = ''
  filtrosLocales.dependencia_id = 'todas'
  filtrosLocales.estado = 'todos'
  filtrosLocales.vencimiento = 'todas'
  filtrosLocales.quien_cubre = 'todos'
  emit('reset')
  emitirCambio()
}
</script>

<template>
  <v-card variant="outlined" class="mb-4 pa-4 bg-surface rounded-lg">
    <v-row density="comfortable" align="center">
      <!-- Búsqueda General -->
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filtrosLocales.busqueda"
          label="Buscar orden de pago..."
          placeholder="Folio, línea de captura, concepto, escritura..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Dependencia -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filtrosLocales.dependencia_id"
          :items="[
            { title: 'Todas las dependencias', value: 'todas' },
            ...(dependencias || []).map((d) => ({ title: `${d.sigla} - ${d.nombre}`, value: d.id })),
          ]"
          label="Dependencia"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Estado Financiero -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filtrosLocales.estado"
          :items="[
            { title: 'Todos los estados', value: 'todos' },
            { title: 'Pendientes', value: 'pendiente' },
            { title: 'En Tesorería', value: 'en_tesoreria' },
            { title: 'Pagados', value: 'pagado' },
            { title: 'Cancelados', value: 'cancelado' },
          ]"
          label="Estado"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Semáforo de Vigencia -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filtrosLocales.vencimiento"
          :items="[
            { title: 'Cualquier vigencia', value: 'todas' },
            { title: 'Líneas Vencidas (Rojo)', value: 'vencidas' },
            { title: 'Por Vencer ≤ 3 días (Amarillo)', value: 'por_vencer_3_dias' },
            { title: 'Vigentes > 3 días (Verde)', value: 'vigentes' },
          ]"
          label="Vigencia Línea"
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Procedencia de Fondos -->
      <v-col cols="12" sm="6" md="3">
        <div class="d-flex align-center gap-2">
          <v-select
            v-model="filtrosLocales.quien_cubre"
            :items="[
              { title: 'Todos los orígenes', value: 'todos' },
              { title: 'Adquirente', value: 'adquirente' },
              { title: 'Enajenante', value: 'enajenante' },
              { title: 'Notaría (Revolvente)', value: 'notaria_fondo_revolvente' },
              { title: 'Banco / Acreedor', value: 'banco_acreedor' },
            ]"
            label="Quién Cubre"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="emitirCambio"
          />
          <v-btn
            icon="mdi-filter-off-outline"
            variant="text"
            density="compact"
            title="Limpiar Filtros"
            @click="limpiarFiltros"
          />
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>
