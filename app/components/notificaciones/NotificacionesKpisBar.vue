<template>
  <v-row density="comfortable" class="mb-4">
    <!-- 1. Total Enviados -->
    <v-col cols="12" sm="6" lg="3">
      <v-card variant="outlined" class="rounded-xl pa-4 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Total Enviados (Mes)</span>
          <div class="pa-1 rounded bg-primary-lighten-5">
            <v-icon size="18" color="primary">mdi-send</v-icon>
          </div>
        </div>
        <div class="text-h5 font-weight-bold text-primary mt-1">
          {{ formattedTotalEnviados }}
        </div>
        <div class="text-caption text-grey mt-1">
          Avisos registrados en bitácora
        </div>
      </v-card>
    </v-col>

    <!-- 2. Tasa de Entrega -->
    <v-col cols="12" sm="6" lg="3">
      <v-card variant="outlined" class="rounded-xl pa-4 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Tasa de Entrega</span>
          <div class="pa-1 rounded bg-green-lighten-5">
            <v-icon size="18" color="success">mdi-email-check-outline</v-icon>
          </div>
        </div>
        <div class="text-h5 font-weight-bold text-primary mt-1">
          {{ kpis?.tasa_entrega_porcentaje ?? 100 }}%
        </div>
        <v-progress-linear
          :model-value="kpis?.tasa_entrega_porcentaje ?? 100"
          color="success"
          height="4"
          rounded
          class="mt-2"
        />
        <div class="text-caption text-grey mt-1">
          Efectividad de recepción en comparecientes
        </div>
      </v-card>
    </v-col>

    <!-- 3. Canal WhatsApp -->
    <v-col cols="12" sm="6" lg="3">
      <v-card variant="outlined" class="rounded-xl pa-4 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Canal WhatsApp</span>
          <div class="pa-1 rounded bg-green-lighten-5">
            <v-icon size="18" color="success">mdi-whatsapp</v-icon>
          </div>
        </div>
        <div class="text-h5 font-weight-bold text-primary mt-1">
          {{ formattedWhatsApp }}
        </div>
        <div class="text-caption text-grey mt-1">
          WhatsApp Web & Enlace directo
        </div>
      </v-card>
    </v-col>

    <!-- 4. Fallidos / Por Reintentar -->
    <v-col cols="12" sm="6" lg="3">
      <v-card variant="outlined" class="rounded-xl pa-4 h-100 bg-surface border">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption text-grey-darken-1">Fallidos / Por Reintentar</span>
          <div class="pa-1 rounded bg-red-lighten-5">
            <v-icon size="18" color="error">mdi-alert-circle-outline</v-icon>
          </div>
        </div>
        <div class="d-flex align-center justify-space-between mt-1">
          <span class="text-h5 font-weight-bold text-error">
            {{ formattedFallidos }}
          </span>
          <v-chip
            v-if="(kpis?.total_fallidos || 0) > 0"
            size="x-small"
            color="error"
            variant="tonal"
            class="font-weight-medium"
          >
            Acción Requerida
          </v-chip>
        </div>
        <div class="text-caption text-grey mt-1">
          Requiere verificar datos de contacto
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NotificacionesKpis } from '~/types/notificaciones'

const props = defineProps<{
  kpis?: NotificacionesKpis | null
}>()

const formattedTotalEnviados = computed(() => {
  return (props.kpis?.total_enviados_mes ?? 0).toLocaleString('es-MX')
})

const formattedWhatsApp = computed(() => {
  return (props.kpis?.total_whatsapp ?? 0).toLocaleString('es-MX')
})

const formattedFallidos = computed(() => {
  return (props.kpis?.total_fallidos ?? 0).toLocaleString('es-MX')
})
</script>
