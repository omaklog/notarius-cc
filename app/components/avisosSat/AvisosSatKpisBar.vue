<template>
  <v-row dense class="mb-4">
    <!-- 1. Operaciones Vulnerables -->
    <v-col cols="12" sm="6" md="2">
      <v-card variant="outlined" class="rounded-lg pa-3 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Operaciones Vulnerables</span>
          <v-icon size="18" color="primary">mdi-gavel</v-icon>
        </div>
        <div class="text-h6 font-weight-bold text-grey-darken-3">
          {{ kpis?.total_operaciones_vulnerables || 0 }}
        </div>
        <div class="text-caption text-grey">Escrituras del periodo</div>
      </v-card>
    </v-col>

    <!-- 2. Sujetas a Aviso SAT -->
    <v-col cols="12" sm="6" md="2">
      <v-card variant="outlined" class="rounded-lg pa-3 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Sujetas a Aviso SAT</span>
          <v-icon size="18" color="amber-darken-3">mdi-flag-outline</v-icon>
        </div>
        <div class="text-h6 font-weight-bold text-amber-darken-3">
          {{ kpis?.total_sujetas_aviso || 0 }}
        </div>
        <div class="text-caption text-grey">> 16,050 UMAs</div>
      </v-card>
    </v-col>

    <!-- 3. Avisos Presentados -->
    <v-col cols="12" sm="6" md="3">
      <v-card variant="outlined" class="rounded-lg pa-3 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Avisos Presentados</span>
          <v-icon size="18" color="success">mdi-check-decagram</v-icon>
        </div>
        <div class="d-flex align-baseline ga-2">
          <span class="text-h6 font-weight-bold text-success">
            {{ kpis?.total_presentados || 0 }}
          </span>
          <span class="text-caption text-grey">
            ({{ porcentajePresentados }}%)
          </span>
        </div>
        <v-progress-linear
          :model-value="porcentajePresentados"
          color="success"
          height="4"
          rounded
          class="mt-1"
        />
      </v-card>
    </v-col>

    <!-- 4. Avisos Pendientes -->
    <v-col cols="12" sm="6" md="2">
      <v-card variant="outlined" class="rounded-lg pa-3 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Avisos Pendientes</span>
          <v-icon size="18" :color="(kpis?.total_pendientes || 0) > 0 ? 'amber-darken-4' : 'grey'">
            mdi-clock-alert-outline
          </v-icon>
        </div>
        <div class="text-h6 font-weight-bold" :class="(kpis?.total_pendientes || 0) > 0 ? 'text-amber-darken-4' : 'text-grey'">
          {{ kpis?.total_pendientes || 0 }}
        </div>
        <div class="text-caption text-grey">Por timbrar / cargar</div>
      </v-card>
    </v-col>

    <!-- 5. Monto Total Reportable -->
    <v-col cols="12" md="3">
      <v-card variant="outlined" class="rounded-lg pa-3 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Monto Total Reportable</span>
          <v-icon size="18" color="primary">mdi-currency-usd</v-icon>
        </div>
        <div class="text-subtitle-1 font-mono font-weight-bold text-primary text-truncate">
          {{ formatearMonto(kpis?.monto_total_reportable_mxn || 0) }}
        </div>
        <div class="text-caption font-mono text-grey">
          {{ (kpis?.monto_total_reportable_uma || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 }) }} UMAs aprox.
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { KpisAvisosSatPeriodo } from '~/types/avisosSat';

const props = defineProps<{
  kpis?: KpisAvisosSatPeriodo | null;
}>();

const porcentajePresentados = computed(() => {
  if (!props.kpis || !props.kpis.total_sujetas_aviso) return 0;
  return Math.round((props.kpis.total_presentados / props.kpis.total_sujetas_aviso) * 100);
});

function formatearMonto(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(val || 0);
}
</script>
