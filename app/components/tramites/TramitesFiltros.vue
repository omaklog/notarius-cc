<template>
  <v-card variant="outlined" class="mb-4 pa-4 bg-surface rounded-lg">
    <v-row density="comfortable" align="center">
      <!-- Búsqueda General -->
      <v-col cols="12" md="4">
        <v-text-field
          v-model="filtrosLocales.busqueda"
          label="Buscar trámite..."
          placeholder="No. instrumento, volante, dependencia o acto..."
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
          :items="dependencias"
          item-title="sigla"
          item-value="id"
          label="Dependencia"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Fase Procesal -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filtrosLocales.fase"
          :items="fases"
          item-title="label"
          item-value="value"
          label="Fase Procesal"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Semáforo de Plazos -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filtrosLocales.semaforo"
          :items="semaforos"
          item-title="label"
          item-value="value"
          label="Semáforo"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          @update:model-value="emitirCambio"
        />
      </v-col>

      <!-- Estado -->
      <v-col cols="12" sm="6" md="2">
        <div class="d-flex align-center gap-2">
          <v-select
            v-model="filtrosLocales.estado"
            :items="estados"
            item-title="label"
            item-value="value"
            label="Estado"
            variant="outlined"
            density="compact"
            hide-details
            clearable
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

<script setup lang="ts">
import { ref, watch } from 'vue'
import type {
  DependenciaOficial,
  FiltrosTramites,
  FaseProcesal,
  EstadoTramite,
  SemaforoTramite
} from '~/types/tramites'

const props = defineProps<{
  modelValue: FiltrosTramites
  dependencias: DependenciaOficial[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', filtros: FiltrosTramites): void
  (e: 'limpiar'): void
}>()

const filtrosLocales = ref<FiltrosTramites>({ ...props.modelValue })

watch(
  () => props.modelValue,
  (val) => {
    filtrosLocales.value = { ...val }
  },
  { deep: true }
)

const fases: Array<{ value: FaseProcesal; label: string }> = [
  { value: 'previo', label: '1. Previos a Firma' },
  { value: 'firma_otorgamiento', label: '2. Firma y Otorgamiento' },
  { value: 'posterior_fiscal', label: '3. Posterior / Impuestos' },
  { value: 'inscripcion_definitiva', label: '4. Inscripción RPP/RPC' },
  { value: 'entrega_cliente', label: '5. Entrega Cliente' }
]

const semaforos: Array<{ value: SemaforoTramite; label: string }> = [
  { value: 'rojo', label: 'Rojo (Vencido / Prevenido)' },
  { value: 'amarillo', label: 'Amarillo (1-3 días)' },
  { value: 'verde', label: 'Verde (> 3 días)' },
  { value: 'azul', label: 'Azul (Concluido)' },
  { value: 'gris', label: 'Gris (Cancelado / Sin ingreso)' }
]

const estados: Array<{ value: EstadoTramite; label: string }> = [
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'ingresado_dependencia', label: 'Ingresado' },
  { value: 'prevenido_observado', label: 'Prevenido' },
  { value: 'subsanado', label: 'Subsanado' },
  { value: 'concluido_favorable', label: 'Concluido' },
  { value: 'rechazado_cancelado', label: 'Cancelado' }
]

function emitirCambio() {
  emit('update:modelValue', { ...filtrosLocales.value })
}

function limpiarFiltros() {
  filtrosLocales.value = {
    busqueda: '',
    dependencia_id: null,
    fase: null,
    estado: null,
    semaforo: null
  }
  emitirCambio()
  emit('limpiar')
}
</script>
