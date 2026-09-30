<script setup lang="ts">
import type { EstatusCuentaHonorarios } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

const props = defineProps<{
  totalCotizadoNotaria: number
  totalDerechosTerceros: number
  granTotalTramite: number
  totalPagado: number
  saldoPendiente: number
  estatus: EstatusCuentaHonorarios
}>()

const emit = defineEmits<{
  (e: 'verHojaLiquidacion'): void
}>()

const { formatearMoneda } = useHonorariosCalculos()

const estatusConfig: Record<EstatusCuentaHonorarios, { label: string; color: string; icon: string }> = {
  borrador: { label: 'Borrador', color: 'default', icon: 'mdi-pencil-outline' },
  cotizado: { label: 'Cotizado', color: 'primary', icon: 'mdi-file-document-outline' },
  anticipo_parcial: { label: 'Anticipo Parcial', color: 'warning', icon: 'mdi-cash-clock' },
  liquidado: { label: 'Liquidado al 100%', color: 'success', icon: 'mdi-check-circle-outline' },
  cancelado: { label: 'Cancelado', color: 'error', icon: 'mdi-cancel' },
}
</script>

<template>
  <div class="mb-4">
    <div class="d-flex flex-wrap justify-space-between align-center mb-3">
      <div class="d-flex align-center ga-2">
        <h2 class="text-subtitle-1 font-weight-bold text-primary">
          Resumen Financiero del Instrumento
        </h2>
        <v-chip
          size="small"
          :color="estatusConfig[estatus]?.color || 'default'"
          variant="flat"
          class="text-capitalize font-weight-medium"
        >
          <v-icon start size="14" :icon="estatusConfig[estatus]?.icon || 'mdi-circle'" />
          {{ estatusConfig[estatus]?.label || estatus }}
        </v-chip>
      </div>

      <v-btn
        color="secondary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-file-table-outline"
        class="text-capitalize font-weight-bold"
        @click="emit('verHojaLiquidacion')"
      >
        Generar Hoja de Liquidación (PDF)
      </v-btn>
    </div>

    <!-- Grid de 5 tarjetas KPI -->
    <v-row density="comfortable">
      <!-- 1. Honorarios Propios -->
      <v-col cols="12" sm="6" md="2">
        <v-card variant="outlined" class="pa-3 rounded-lg h-100 bg-surface">
          <div class="text-caption text-medium-emphasis mb-1">Honorarios Notaría</div>
          <div class="text-subtitle-2 font-weight-bold text-primary font-weight-mono">
            {{ formatearMoneda(totalCotizadoNotaria) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">Con IVA (16%)</div>
        </v-card>
      </v-col>

      <!-- 2. Derechos Terceros -->
      <v-col cols="12" sm="6" md="2">
        <v-card variant="outlined" class="pa-3 rounded-lg h-100 bg-surface">
          <div class="text-caption text-medium-emphasis mb-1">Derechos a Terceros</div>
          <div class="text-subtitle-2 font-weight-bold text-secondary font-weight-mono">
            {{ formatearMoneda(totalDerechosTerceros) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">RPP, Catastro, ISAI</div>
        </v-card>
      </v-col>

      <!-- 3. Gran Total Integral -->
      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="primary" class="pa-3 rounded-lg h-100">
          <div class="text-caption font-weight-medium mb-1">Gran Total del Trámite</div>
          <div class="text-h6 font-weight-bold font-weight-mono">
            {{ formatearMoneda(granTotalTramite) }}
          </div>
          <div class="text-caption opacity-90 mt-1">Costo total para el cliente</div>
        </v-card>
      </v-col>

      <!-- 4. Total Recibido -->
      <v-col cols="12" sm="6" md="2">
        <v-card variant="outlined" class="pa-3 rounded-lg h-100 bg-surface">
          <div class="text-caption text-medium-emphasis mb-1">Pagos Recibidos</div>
          <div class="text-subtitle-2 font-weight-bold text-success font-weight-mono">
            {{ formatearMoneda(totalPagado) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">Anticipos aplicados</div>
        </v-card>
      </v-col>

      <!-- 5. Saldo Neto Pendiente -->
      <v-col cols="12" sm="12" md="3">
        <v-card
          variant="outlined"
          class="pa-3 rounded-lg h-100"
          :class="saldoPendiente <= 0 ? 'bg-green-lighten-5 border-success' : 'bg-amber-lighten-5 border-warning'"
        >
          <div class="text-caption text-medium-emphasis mb-1">Saldo Neto por Cobrar</div>
          <div
            class="text-h6 font-weight-bold font-weight-mono"
            :class="saldoPendiente <= 0 ? 'text-success' : 'text-primary'"
          >
            {{ formatearMoneda(saldoPendiente) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ saldoPendiente <= 0 ? 'Cuenta completamente liquidada' : 'Saldo pendiente por liquidar' }}
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
