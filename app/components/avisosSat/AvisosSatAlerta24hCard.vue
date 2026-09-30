<template>
  <v-alert
    v-if="tieneAlertas"
    type="error"
    variant="tonal"
    prominent
    class="mb-4 rounded-lg border border-error alerta-24h-card"
    icon="mdi-alert-octagon-outline"
  >
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3">
      <div>
        <div class="text-subtitle-1 font-weight-bold d-flex align-center flex-wrap ga-2">
          <span>ALERTA PERENTORIA: {{ totalAlertas }} Aviso{{ totalAlertas > 1 ? 's' : '' }} de 24 Horas Pendiente{{ totalAlertas > 1 ? 's' : '' }}</span>
          <v-chip color="error" size="small" variant="flat" class="font-weight-bold">
            <v-icon start size="14">mdi-timer-alert</v-icon>
            PLAZO FATAL 24H
          </v-chip>
        </div>
        <div class="text-body-2 mt-1 text-grey-darken-3">
          Conforme al Artículo 27 Bis de la LFPIORPI y Reglas de Carácter General, los actos celebrados con sujetos identificados en la <strong>Lista de Personas Bloqueadas (LPB)</strong> deben transmitirse a la UIF dentro de las <strong>24 horas naturales</strong> siguientes a su otorgamiento.
        </div>
      </div>
      <div class="d-flex ga-2 w-100 w-md-auto justify-end">
        <v-btn
          color="error"
          variant="elevated"
          size="small"
          prepend-icon="mdi-filter-variant"
          class="text-none font-weight-bold"
          @click="$emit('filtrar-24h')"
        >
          Filtrar Casos 24 Horas
        </v-btn>
      </div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AvisoSatItem } from '~/types/avisosSat';

const props = withDefaults(
  defineProps<{
    alertas?: number;
    operaciones?: AvisoSatItem[];
  }>(),
  {
    alertas: 0,
    operaciones: () => [],
  }
);

defineEmits<{
  (e: 'filtrar-24h'): void;
}>();

const totalAlertas = computed(() => {
  if (props.alertas && props.alertas > 0) return props.alertas;
  if (props.operaciones && props.operaciones.length > 0) {
    return props.operaciones.filter(o => o.tipo_aviso === '24_horas' && o.estatus !== 'presentado').length;
  }
  return 0;
});

const tieneAlertas = computed(() => totalAlertas.value > 0);
</script>

<style scoped>
.alerta-24h-card {
  border-left-width: 6px !important;
}
</style>
