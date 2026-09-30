<template>
  <div class="reportes-kpis-bar mb-6">
    <!-- Barra de Selección de Periodo (Mes y Año) -->
    <v-card variant="outlined" class="pa-4 mb-4 rounded-lg bg-surface">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3">
        <div class="d-flex align-center">
          <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
            <v-icon icon="mdi-chart-timeline-variant" color="primary" size="24" />
          </v-avatar>
          <div>
            <h2 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0">
              Periodo de Operación Notarial
            </h2>
            <p class="text-caption text-grey-darken-1 mb-0">
              Seleccione el mes y año para auditar la productividad, gestoría e índices.
            </p>
          </div>
        </div>

        <div class="d-flex align-center ga-2 flex-wrap">
          <!-- Selector de Mes -->
          <v-select
            v-model="mesSeleccionado"
            :items="meses"
            item-title="nombre"
            item-value="valor"
            label="Mes"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 160px;"
            :disabled="cargando"
            @update:model-value="onCambioPeriodo"
          />

          <!-- Selector de Año -->
          <v-select
            v-model="anioSeleccionado"
            :items="anios"
            label="Año"
            density="compact"
            variant="outlined"
            hide-details
            style="min-width: 110px;"
            :disabled="cargando"
            @update:model-value="onCambioPeriodo"
          />

          <v-btn
            color="primary"
            variant="tonal"
            density="comfortable"
            prepend-icon="mdi-refresh"
            :loading="cargando"
            class="text-none font-weight-medium"
            @click="onRefrescar"
          >
            Actualizar
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Tarjetas de KPIs del Mes -->
    <v-row density="comfortable">
      <!-- 1. Abiertas en el Mes -->
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="kpi-card pa-4 rounded-lg bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Abiertas en el Mes
            </span>
            <v-avatar color="primary" variant="tonal" size="32">
              <v-icon icon="mdi-folder-plus-outline" color="primary" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary mb-1">
            {{ kpis.total_abiertas_mes }}
          </div>
          <div class="text-caption text-grey-darken-1 d-flex align-center">
            <v-icon icon="mdi-calendar-month-outline" size="14" class="mr-1 text-primary" />
            <span>Radicadas en {{ nombreMesActual }} {{ anioSeleccionado }}</span>
          </div>
        </v-card>
      </v-col>

      <!-- 2. Firmadas en el Mes -->
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="kpi-card pa-4 rounded-lg bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Firmadas en el Mes
            </span>
            <v-avatar color="success" variant="tonal" size="32">
              <v-icon icon="mdi-check-decagram" color="success" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-success mb-1">
            {{ kpis.total_firmadas_mes }}
          </div>
          <div class="text-caption text-grey-darken-1 d-flex align-center">
            <v-icon icon="mdi-file-sign" size="14" class="mr-1 text-success" />
            <span>Protocolizadas formalmente</span>
          </div>
        </v-card>
      </v-col>

      <!-- 3. En Trámite / Proceso -->
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="kpi-card pa-4 rounded-lg bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              En Trámite Activo
            </span>
            <v-avatar color="warning" variant="tonal" size="32">
              <v-icon icon="mdi-progress-clock" color="warning" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-warning mb-1">
            {{ kpis.total_en_tramite }}
          </div>
          <div class="text-caption text-grey-darken-1 d-flex align-center">
            <v-icon icon="mdi-clipboard-text-clock-outline" size="14" class="mr-1 text-warning" />
            <span>En integración o firma pendiente</span>
          </div>
        </v-card>
      </v-col>

      <!-- 4. Canceladas -->
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="kpi-card pa-4 rounded-lg bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Canceladas
            </span>
            <v-avatar color="error" variant="tonal" size="32">
              <v-icon icon="mdi-close-circle-outline" color="error" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-error mb-1">
            {{ kpis.total_canceladas }}
          </div>
          <div class="text-caption text-grey-darken-1 d-flex align-center">
            <v-icon icon="mdi-alert-circle-outline" size="14" class="mr-1 text-error" />
            <span>Razón de No Pasó / Anuladas</span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ResumenKpisMes } from '~/types/reportes'

const props = withDefaults(
  defineProps<{
    kpis: ResumenKpisMes
    mes: number
    anio: number
    cargando?: boolean
  }>(),
  {
    cargando: false,
  }
)

const emit = defineEmits<{
  (e: 'cambio-periodo', payload: { mes: number; anio: number }): void
  (e: 'refrescar'): void
}>()

const mesSeleccionado = ref(props.mes)
const anioSeleccionado = ref(props.anio)

const meses = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
]

const anioActual = new Date().getFullYear()
const anios = Array.from({ length: 6 }, (_, i) => anioActual - 2 + i)

const nombreMesActual = computed(() => {
  const m = meses.find((item) => item.valor === mesSeleccionado.value)
  return m ? m.nombre : 'Mes'
})

function onCambioPeriodo() {
  emit('cambio-periodo', {
    mes: mesSeleccionado.value,
    anio: anioSeleccionado.value,
  })
}

function onRefrescar() {
  emit('refrescar')
}
</script>

<style scoped>
.kpi-card {
  border-color: #cbd2dc;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(27, 58, 95, 0.08);
}
</style>
