<script setup lang="ts">
import { computed } from 'vue'
import type { HonorariosCuenta, EstatusFacturacion } from '~/types/honorarios'

const props = withDefaults(
  defineProps<{
    cuenta: HonorariosCuenta | null
    puedeEditar?: boolean
  }>(),
  {
    puedeEditar: true,
  }
)

const emit = defineEmits<{
  (e: 'editar'): void
}>()

const estatus = computed<EstatusFacturacion>(() => props.cuenta?.estatus_facturacion || 'no_requerida')

const estatusBadgeConfig: Record<EstatusFacturacion, { label: string; color: string; icon: string }> = {
  facturada: { label: 'Timbrado ante SAT (CFDI 4.0)', color: 'success', icon: 'mdi-check-decagram' },
  pendiente: { label: 'Factura Solicitada / Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  no_requerida: { label: 'Sin Requerimiento Fiscal', color: 'default', icon: 'mdi-minus-circle-outline' },
  cancelada: { label: 'Factura Cancelada', color: 'error', icon: 'mdi-cancel' },
}

const tieneUuid = computed(() => !!props.cuenta?.uuid_fiscal)

function copiarUuid() {
  if (props.cuenta?.uuid_fiscal) {
    navigator.clipboard.writeText(props.cuenta.uuid_fiscal)
  }
}
</script>

<template>
  <v-card variant="outlined" class="rounded-lg mb-4">
    <div class="d-flex flex-wrap align-center justify-space-between pa-4 border-b">
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-xml" color="primary" />
        <h3 class="text-subtitle-1 font-weight-bold text-high-emphasis">
          Facturación Electrónica CFDI 4.0
        </h3>
        <v-chip
          size="small"
          :color="estatusBadgeConfig[estatus]?.color || 'default'"
          variant="tonal"
          class="font-weight-medium ml-2"
        >
          <v-icon start size="14" :icon="estatusBadgeConfig[estatus]?.icon || 'mdi-help-circle'" />
          {{ estatusBadgeConfig[estatus]?.label || estatus }}
        </v-chip>
      </div>

      <v-btn
        v-if="puedeEditar"
        variant="tonal"
        color="primary"
        size="small"
        prepend-icon="mdi-pencil-outline"
        class="text-capitalize"
        @click="emit('editar')"
      >
        Editar Datos Fiscales
      </v-btn>
    </div>

    <v-card-text class="pa-4">
      <div v-if="tieneUuid" class="mb-3 pa-3 rounded bg-surface-variant border d-flex flex-wrap align-center justify-space-between ga-2">
        <div>
          <span class="text-caption text-medium-emphasis">Folio Fiscal SAT (UUID):</span>
          <div class="text-body-2 font-weight-bold font-weight-mono text-primary d-flex align-center ga-2">
            {{ cuenta?.uuid_fiscal }}
            <v-btn
              icon="mdi-content-copy"
              variant="text"
              size="x-small"
              color="primary"
              title="Copiar UUID"
              @click="copiarUuid"
            />
          </div>
          <div v-if="cuenta?.fecha_timbrado" class="text-caption text-medium-emphasis">
            Fecha de timbrado: {{ new Date(cuenta.fecha_timbrado).toLocaleString('es-MX') }}
          </div>
        </div>
      </div>

      <v-row density="comfortable">
        <v-col cols="12" sm="4">
          <span class="text-caption text-medium-emphasis d-block">RFC Receptor:</span>
          <strong class="text-body-2 font-weight-mono">{{ cuenta?.rfc_receptor || 'No especificado' }}</strong>
        </v-col>
        <v-col cols="12" sm="5">
          <span class="text-caption text-medium-emphasis d-block">Razón Social:</span>
          <span class="text-body-2">{{ cuenta?.razon_social_receptor || 'No especificado' }}</span>
        </v-col>
        <v-col cols="12" sm="3">
          <span class="text-caption text-medium-emphasis d-block">Uso CFDI / Método:</span>
          <span class="text-body-2 font-weight-mono">
            {{ cuenta?.uso_cfdi || 'G03' }} · {{ cuenta?.metodo_pago_sat || 'PUE' }}
          </span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
