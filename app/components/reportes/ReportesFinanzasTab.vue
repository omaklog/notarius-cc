<template>
  <div class="reportes-finanzas-tab">
    <!-- Encabezado y Acción -->
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div>
        <h3 class="text-subtitle-1 font-weight-bold text-grey-darken-4 mb-0 d-flex align-center">
          <v-icon icon="mdi-cash-multiple" color="primary" class="mr-2" size="22" />
          <span>Resumen Financiero y Control de Honorarios</span>
        </h3>
        <p class="text-caption text-grey-darken-1 mb-0">
          Auditoría de ingresos propios de la notaría y control de saldos por cobrar por escritura.
        </p>
      </div>

      <v-btn
        color="primary"
        variant="tonal"
        density="comfortable"
        prepend-icon="mdi-refresh"
        :loading="cargando"
        class="text-none font-weight-medium"
        @click="emit('refrescar')"
      >
        Actualizar Finanzas
      </v-btn>
    </div>

    <!-- Tarjetas de KPIs Financieros -->
    <v-row density="comfortable" class="mb-4">
      <!-- 1. Total Cobrado en el Periodo -->
      <v-col cols="12" sm="6">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Total Cobrado en Honorarios
            </span>
            <v-avatar color="success" variant="tonal" size="32">
              <v-icon icon="mdi-cash-check" color="success" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-success mb-1">
            {{ formatearMoneda(finanzas.total_cobrado_mes) }}
          </div>
          <div class="text-caption text-grey-darken-1">
            Ingresos netos por honorarios notariales registrados
          </div>
        </v-card>
      </v-col>

      <!-- 2. Saldo Pendiente por Cobrar -->
      <v-col cols="12" sm="6">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Saldo Pendiente de Cobranza
            </span>
            <v-avatar color="warning" variant="tonal" size="32">
              <v-icon icon="mdi-clock-alert-outline" color="warning" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-warning mb-1">
            {{ formatearMoneda(finanzas.total_saldo_pendiente) }}
          </div>
          <div class="text-caption text-grey-darken-1">
            Cuentas activas con liquidación o abono pendiente
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabla de Clientes con Saldos Pendientes -->
    <v-card variant="outlined" class="rounded-lg bg-surface overflow-hidden">
      <div class="pa-4 border-b d-flex align-center justify-space-between">
        <div>
          <div class="text-subtitle-2 font-weight-bold text-grey-darken-4">
            Cuentas por Cobrar por Instrumento
          </div>
          <div class="text-caption text-grey-darken-1">
            Detalle de clientes deudores y saldo pendiente por instrumento notarial.
          </div>
        </div>
        <v-chip size="small" color="primary" variant="tonal" class="font-weight-medium">
          {{ finanzas.cuentas_deudoras.length }} pendientes
        </v-chip>
      </div>

      <v-table hover density="comfortable">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 140px;">
              Instrumento
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase">
              Cliente / Otorgante
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase">
              Concepto
            </th>
            <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 130px;">
              Total Cuenta
            </th>
            <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 130px;">
              Pagado
            </th>
            <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 140px;">
              Saldo Pendiente
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Cargando -->
          <tr v-if="cargando">
            <td colspan="6" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="32" class="mr-2" />
              <span class="text-caption text-grey-darken-1">Cargando estado de finanzas y honorarios...</span>
            </td>
          </tr>

          <!-- Vacío -->
          <tr v-else-if="finanzas.cuentas_deudoras.length === 0">
            <td colspan="6" class="text-center py-8 text-grey-darken-1">
              <v-icon icon="mdi-check-all" size="36" class="mb-2 text-success d-block mx-auto" />
              <div class="text-subtitle-2 font-weight-bold">Al día en cobranza</div>
              <div class="text-caption">No se registran cuentas de honorarios con saldos vencidos ni pendientes.</div>
            </td>
          </tr>

          <!-- Lista de Deudores -->
          <tr v-for="c in finanzas.cuentas_deudoras" :key="c.cuenta_id">
            <td class="font-weight-bold text-primary">
              № {{ c.instrumento }}
            </td>
            <td>
              <div class="font-weight-medium text-grey-darken-3">{{ c.cliente_nombre }}</div>
            </td>
            <td>
              <div class="text-body-2 text-grey-darken-2">{{ c.concepto }}</div>
            </td>
            <td class="text-right font-weight-medium">
              {{ formatearMoneda(c.total) }}
            </td>
            <td class="text-right text-success font-weight-medium">
              {{ formatearMoneda(c.pagado) }}
            </td>
            <td class="text-right text-warning font-weight-bold">
              {{ formatearMoneda(c.saldo_pendiente) }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { ResumenFinancieroCobranza } from '~/types/reportes'

withDefaults(
  defineProps<{
    finanzas: ResumenFinancieroCobranza
    cargando?: boolean
  }>(),
  {
    cargando: false,
  }
)

const emit = defineEmits<{
  (e: 'refrescar'): void
}>()

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(valor || 0)
}
</script>
