<script setup lang="ts">
import { computed } from 'vue'
import type { HonorariosPago, MetodoPagoHonorarios } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

const props = withDefaults(
  defineProps<{
    pagos: HonorariosPago[]
    puedeRegistrar?: boolean
    cargando?: boolean
  }>(),
  {
    puedeRegistrar: true,
    cargando: false,
  }
)

const emit = defineEmits<{
  (e: 'registrarPago'): void
  (e: 'verRecibo', pago: HonorariosPago): void
  (e: 'notificarPago', pago: HonorariosPago): void
}>()


const { formatearMoneda, redondear, evaluarAlertaEfectivo } = useHonorariosCalculos()

const totalCobrado = computed(() => {
  let sum = 0
  for (const p of props.pagos) {
    sum += redondear(p.monto || 0)
  }
  return redondear(sum)
})

const alertaEfectivo = computed(() => evaluarAlertaEfectivo(props.pagos))

const metodoConfig: Record<MetodoPagoHonorarios, { label: string; icon: string; color: string }> = {
  transferencia_spei: { label: 'Transferencia SPEI', icon: 'mdi-bank-transfer', color: 'primary' },
  tarjeta_credito_debito: { label: 'Tarjeta (TPV)', icon: 'mdi-credit-card-outline', color: 'secondary' },
  cheque: { label: 'Cheque', icon: 'mdi-checkbook', color: 'teal' },
  efectivo: { label: 'Efectivo', icon: 'mdi-cash', color: 'warning' },
}
</script>

<template>
  <v-card variant="outlined" class="rounded-lg mb-4">
    <div class="d-flex flex-wrap align-center justify-space-between pa-4 border-b">
      <div>
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-cash-register" color="primary" />
          <h3 class="text-subtitle-1 font-weight-bold text-high-emphasis">
            Registro de Pagos y Anticipos Recibidos
          </h3>
        </div>
        <p class="text-caption text-medium-emphasis mb-0">
          Entradas y abonos del cliente aplicados a la cuenta integral del instrumento notarial.
        </p>
      </div>

      <v-btn
        v-if="puedeRegistrar"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-plus"
        class="text-capitalize font-weight-medium"
        @click="emit('registrarPago')"
      >
        Registrar Pago / Anticipo
      </v-btn>
    </div>

    <!-- Banner si se detecta alerta en cobros en efectivo -->
    <v-alert
      v-if="alertaEfectivo.tieneEfectivo && alertaEfectivo.superaAlerta"
      type="warning"
      variant="tonal"
      density="compact"
      class="mx-4 mt-3 mb-1 text-caption"
      icon="mdi-shield-alert-outline"
    >
      {{ alertaEfectivo.mensaje }}
    </v-alert>

    <!-- Tabla de pagos -->
    <v-table density="comfortable" hover class="honorarios-pagos-table">
      <thead>
        <tr class="bg-surface-variant">
          <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 140px;">Folio Recibo</th>
          <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 120px;">Fecha</th>
          <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 160px;">Método</th>
          <th class="text-left font-weight-bold text-caption text-uppercase">Referencia Bancaria</th>
          <th class="text-left font-weight-bold text-caption text-uppercase">Concepto / Detalle</th>
          <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 150px;">Monto Cobrado</th>
          <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 110px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="pagos.length === 0">
          <td colspan="7" class="text-center py-6 text-body-2 text-medium-emphasis">
            <v-icon icon="mdi-cash-multiple" size="32" class="d-block mx-auto mb-1 opacity-50" />
            No hay pagos ni anticipos registrados para esta cuenta.
          </td>
        </tr>

        <tr v-for="pago in pagos" :key="pago.id || pago.folio_recibo">
          <!-- Folio Recibo -->
          <td class="text-body-2 font-weight-bold text-primary font-weight-mono">
            {{ pago.folio_recibo }}
          </td>

          <!-- Fecha -->
          <td class="text-body-2 text-medium-emphasis">
            {{ pago.fecha_pago }}
          </td>

          <!-- Método -->
          <td>
            <v-chip
              size="small"
              variant="tonal"
              :color="metodoConfig[pago.metodo_pago]?.color || 'default'"
              class="font-weight-medium"
            >
              <v-icon start size="14" :icon="metodoConfig[pago.metodo_pago]?.icon || 'mdi-cash'" />
              {{ metodoConfig[pago.metodo_pago]?.label || pago.metodo_pago }}
            </v-chip>
          </td>

          <!-- Referencia -->
          <td class="text-body-2 font-weight-mono text-medium-emphasis">
            {{ pago.referencia_bancaria || '—' }}
          </td>

          <!-- Concepto -->
          <td class="text-body-2 text-high-emphasis">
            <div>{{ pago.concepto }}</div>
            <small v-if="pago.notas" class="text-caption text-medium-emphasis">{{ pago.notas }}</small>
          </td>

          <!-- Monto Cobrado -->
          <td class="text-right text-body-2 font-weight-bold text-success font-weight-mono">
            {{ formatearMoneda(pago.monto) }}
          </td>

          <!-- Acciones: Recibo y Notificar -->
          <td class="text-center">
            <div class="d-flex align-center justify-center ga-1">
              <v-btn
                icon="mdi-receipt-outline"
                variant="text"
                size="small"
                color="primary"
                title="Ver recibo de cobro"
                @click="emit('verRecibo', pago)"
              />
              <v-btn
                icon="mdi-bell-outline"
                variant="text"
                size="small"
                color="success"
                title="Notificar Pago al Cliente"
                @click="emit('notificarPago', pago)"
              />
            </div>
          </td>
        </tr>

      </tbody>
    </v-table>

    <v-divider />

    <!-- Total de pagos recibidos -->
    <div class="pa-4 bg-surface-variant d-flex justify-space-between align-center">
      <span class="text-body-2 text-medium-emphasis">
        Total de cobros asentados: <strong>{{ pagos.length }}</strong>
      </span>
      <div class="text-body-2">
        <span class="text-medium-emphasis mr-2">Total Pagos Recibidos:</span>
        <span class="text-subtitle-1 font-weight-bold text-success font-weight-mono">
          {{ formatearMoneda(totalCobrado) }}
        </span>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
