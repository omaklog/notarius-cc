<template>
  <v-card variant="outlined" class="reportes-grafica-redactores pa-4 rounded-lg bg-surface h-100">
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0 d-flex align-center">
          <v-icon icon="mdi-account-tie-outline" color="primary" class="mr-2" size="20" />
          <span>Carga de Trabajo por Redactor</span>
        </h3>
        <p class="text-caption text-grey-darken-1 mb-0">
          Escrituras asignadas en el mes seleccionado (Balance de equipo).
        </p>
      </div>
      <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
        {{ totalEscrituras }} {{ totalEscrituras === 1 ? 'escritura' : 'escrituras' }}
      </v-chip>
    </div>

    <!-- Estado de Carga -->
    <div v-if="cargando" class="d-flex justify-center align-center pa-8">
      <v-progress-circular indeterminate color="primary" size="36" />
      <span class="ml-3 text-caption text-grey-darken-1">Cargando distribución de redactores...</span>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="!redactores || redactores.length === 0" class="text-center pa-8 border border-dashed rounded-lg bg-grey-lighten-5">
      <v-icon icon="mdi-account-search-outline" size="40" color="grey-darken-1" class="mb-2" />
      <div class="text-subtitle-2 text-grey-darken-2 font-weight-bold">Sin Asignaciones en el Periodo</div>
      <div class="text-caption text-grey-darken-1">No se abrieron escrituras asignadas a redactores en este mes.</div>
    </div>

    <!-- Gráfica de Barras Horizontales SVG y Lista -->
    <div v-else class="grafica-contenedor">
      <div v-for="(item, idx) in redactores" :key="item.redactor_id || idx" class="mb-4 redactor-row">
        <div class="d-flex justify-space-between align-center mb-1">
          <span class="text-caption font-weight-bold text-grey-darken-3 text-truncate" style="max-width: 65%;">
            {{ item.nombre }}
          </span>
          <span class="text-caption text-grey-darken-2 font-weight-medium">
            <strong>{{ item.cantidad_escrituras }}</strong> {{ item.cantidad_escrituras === 1 ? 'escritura' : 'escrituras' }}
            <span class="text-primary font-weight-bold ml-1">({{ item.porcentaje }}%)</span>
          </span>
        </div>

        <!-- Barra SVG con Animación -->
        <svg width="100%" height="16" class="rounded barra-svg" style="background-color: #E8ECF0;">
          <rect
            x="0"
            y="0"
            :width="calcularAnchoPorcentaje(item.cantidad_escrituras) + '%'"
            height="16"
            rx="4"
            fill="#1B3A5F"
            class="barra-progreso"
          />
        </svg>
      </div>

      <!-- Resumen en Pie de Tarjeta -->
      <v-divider class="my-3" />
      <div class="d-flex justify-space-between text-caption text-grey-darken-1">
        <span>Redactores activos: <strong>{{ redactores.length }}</strong></span>
        <span>Promedio por redactor: <strong>{{ promedioPorRedactor }}</strong></span>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RedactorCargaItem } from '~/types/reportes'

const props = withDefaults(
  defineProps<{
    redactores: RedactorCargaItem[]
    cargando?: boolean
  }>(),
  {
    cargando: false,
  }
)

const totalEscrituras = computed(() => {
  return props.redactores.reduce((acc, curr) => acc + curr.cantidad_escrituras, 0)
})

const maxCantidad = computed(() => {
  if (props.redactores.length === 0) return 1
  return Math.max(...props.redactores.map((r) => r.cantidad_escrituras), 1)
})

function calcularAnchoPorcentaje(cantidad: number): number {
  if (maxCantidad.value === 0) return 0
  return Math.min(100, Math.max(5, (cantidad / maxCantidad.value) * 100))
}

const promedioPorRedactor = computed(() => {
  if (props.redactores.length === 0) return '0.0'
  return (totalEscrituras.value / props.redactores.length).toFixed(1)
})
</script>

<style scoped>
.barra-svg {
  display: block;
}
.barra-progreso {
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.redactor-row:hover .barra-progreso {
  fill: #2a486e;
}
</style>
