<template>
  <v-card variant="outlined" class="reportes-grafica-actos pa-4 rounded-lg bg-surface h-100">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0 d-flex align-center">
          <v-icon icon="mdi-chart-donut" color="primary" class="mr-2" size="20" />
          <span>Top 5 Actos Notariales</span>
        </h3>
        <p class="text-caption text-grey-darken-1 mb-0">
          Actos jurídicos con mayor demanda en el mes consultado.
        </p>
      </div>
      <v-chip size="small" color="secondary" variant="tonal" class="font-weight-medium">
        Top 5
      </v-chip>
    </div>

    <!-- Estado de Carga -->
    <div v-if="cargando" class="d-flex justify-center align-center pa-8">
      <v-progress-circular indeterminate color="primary" size="36" />
      <span class="ml-3 text-caption text-grey-darken-1">Cargando actos notariales...</span>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="!actos || actos.length === 0" class="text-center pa-8 border border-dashed rounded-lg bg-grey-lighten-5">
      <v-icon icon="mdi-file-document-outline" size="40" color="grey-darken-1" class="mb-2" />
      <div class="text-subtitle-2 text-grey-darken-2 font-weight-bold">Sin Datos de Actos Notariales</div>
      <div class="text-caption text-grey-darken-1">No hay actos registrados en el periodo seleccionado.</div>
    </div>

    <!-- Gráfico de Dona SVG y Leyenda -->
    <div v-else class="d-flex flex-column flex-md-row align-center justify-center ga-6 py-2">
      <!-- Dona SVG -->
      <div class="dona-wrapper position-relative text-center">
        <svg viewBox="0 0 160 160" width="160" height="160" class="dona-svg">
          <circle
            v-for="(seg, idx) in segmentosDona"
            :key="idx"
            cx="80"
            cy="80"
            r="60"
            fill="transparent"
            :stroke="seg.color"
            stroke-width="24"
            :stroke-dasharray="seg.dasharray"
            :stroke-dashoffset="seg.dashoffset"
            class="dona-segmento"
          />
        </svg>
        <!-- Centro de la dona -->
        <div class="dona-centro position-absolute">
          <div class="text-h6 font-weight-bold text-primary lh-1">{{ totalActos }}</div>
          <div class="text-caption text-grey-darken-1 font-weight-medium" style="font-size: 11px;">Actos</div>
        </div>
      </div>

      <!-- Leyenda de Actos -->
      <div class="flex-grow-1 w-100" style="max-width: 320px;">
        <div
          v-for="(item, idx) in actosConColores"
          :key="item.acto_id || idx"
          class="d-flex align-center justify-space-between mb-2 pa-1 rounded hover-bg"
        >
          <div class="d-flex align-center mr-2 text-truncate">
            <span class="color-dot mr-2 flex-shrink-0" :style="{ backgroundColor: item.color }" />
            <span class="text-caption font-weight-medium text-grey-darken-3 text-truncate" :title="item.nombre">
              {{ item.nombre }}
            </span>
          </div>
          <div class="text-caption font-weight-bold text-grey-darken-2 flex-shrink-0">
            {{ item.cantidad }}
            <span class="text-caption text-grey-darken-1 font-weight-regular">({{ item.porcentaje }}%)</span>
          </div>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ActoDemandaItem } from '~/types/reportes'

const props = withDefaults(
  defineProps<{
    actos: ActoDemandaItem[]
    cargando?: boolean
  }>(),
  {
    cargando: false,
  }
)

const PALETA_COLORES = [
  '#1B3A5F', // Azul Notarial Primario
  '#A9762E', // Bronce Acento
  '#2F6F4E', // Verde Protocolar
  '#5B8DC9', // Azul Claro
  '#C98A2C', // Ámbar Institucional
]

const totalActos = computed(() => {
  return props.actos.reduce((acc, curr) => acc + curr.cantidad, 0)
})

const actosConColores = computed(() => {
  return props.actos.map((item, index) => ({
    ...item,
    color: PALETA_COLORES[index % PALETA_COLORES.length],
  }))
})

// Cálculo de segmentos para la circunferencia de la dona (radio 60 -> circunferencia = 2 * pi * 60 ~= 376.99)
const CIRCUNFERENCIA = 2 * Math.PI * 60

const segmentosDona = computed(() => {
  if (totalActos.value === 0) return []

  let acumulado = 0
  return actosConColores.value.map((item) => {
    const fraccion = item.cantidad / totalActos.value
    const longitud = fraccion * CIRCUNFERENCIA
    const dasharray = `${longitud} ${CIRCUNFERENCIA - longitud}`
    const dashoffset = -acumulado
    acumulado += longitud

    return {
      color: item.color,
      dasharray,
      dashoffset,
    }
  })
})
</script>

<style scoped>
.dona-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}
.dona-svg {
  transform: rotate(-90deg);
}
.dona-segmento {
  transition: stroke-dashoffset 0.6s ease, stroke-dasharray 0.6s ease;
}
.dona-centro {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.hover-bg:hover {
  background-color: #f0f2f4;
}
.lh-1 {
  line-height: 1.1;
}
</style>
