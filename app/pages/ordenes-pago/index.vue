<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import type {
  OrdenPago,
  FiltrosOrdenesPago,
  LiquidarOrdenPagoData,
} from '~/types/ordenesPago'
import {
  formatearMonedaMXN,
  getSemaforoColor,
  getEstadoOrdenLabel,
  getEstadoOrdenColor,
  getQuienCubreLabel,
} from '~/utils/ordenesPagoUtils'
import { useOrdenesPago } from '~/composables/useOrdenesPago'
import OrdenesPagoFiltros from '~/components/ordenesPago/OrdenesPagoFiltros.vue'
import OrdenPagoLiquidarModal from '~/components/ordenesPago/OrdenPagoLiquidarModal.vue'

const router = useRouter()

const {
  ordenes,
  dependencias,
  cargando,
  resumenFinanciero,
  cargarDependencias,
  cargarOrdenes,
  liquidarOrden,
} = useOrdenesPago()

const filtros = ref<FiltrosOrdenesPago>({
  busqueda: '',
  dependencia_id: 'todas',
  estado: 'todos',
  vencimiento: 'todas',
  quien_cubre: 'todos',
})

// Modal de liquidación desde el tablero
const modalLiquidarVisible = ref(false)
const ordenALiquidar = ref<OrdenPago | null>(null)

// Notificaciones
const snackbarVisible = ref(false)
const snackbarMensaje = ref('')
const snackbarColor = ref('success')

function notificar(msg: string, color = 'success') {
  snackbarMensaje.value = msg
  snackbarColor.value = color
  snackbarVisible.value = true
}

onMounted(async () => {
  await Promise.all([cargarDependencias(), cargarOrdenes(filtros.value)])
})

async function onFiltrosChange(nuevosFiltros: FiltrosOrdenesPago) {
  filtros.value = { ...nuevosFiltros }
  await cargarOrdenes(filtros.value)
}

async function onResetFiltros() {
  filtros.value = {
    busqueda: '',
    dependencia_id: 'todas',
    estado: 'todos',
    vencimiento: 'todas',
    quien_cubre: 'todos',
  }
  await cargarOrdenes(filtros.value)
}

async function recargar() {
  await cargarOrdenes(filtros.value)
  notificar('Órdenes de pago actualizadas')
}

function abrirLiquidar(ord: OrdenPago) {
  ordenALiquidar.value = ord
  modalLiquidarVisible.value = true
}

async function onLiquidarConfirmado(data: LiquidarOrdenPagoData, comprobanteDocId?: string | null) {
  try {
    await liquidarOrden(data, comprobanteDocId)
    notificar('Liquidación bancaria registrada con éxito')
    await cargarOrdenes(filtros.value)
  } catch (err: any) {
    notificar(err.message || 'Error al liquidar', 'error')
  }
}

function irAEscritura(escrituraId: string) {
  router.push(`/escrituras/${escrituraId}`)
}

function exportarRelacion() {
  if (ordenes.value.length === 0) {
    notificar('No hay datos para exportar', 'warning')
    return
  }

  const cabeceras = [
    'Folio',
    'Instrumento',
    'Dependencia',
    'Concepto',
    'Monto',
    'Línea de Captura',
    'Vencimiento',
    'Quién Cubre',
    'Estado',
    'Método Pago',
    'Folio Banco/SPEI',
    'Fecha Pago',
  ]

  const filas = ordenes.value.map((o) => [
    o.folio,
    o.escritura_instrumento || 'Sin instrumento',
    o.dependencia?.sigla || '',
    `"${(o.concepto || '').replace(/"/g, '""')}"`,
    o.monto,
    o.linea_captura || '',
    o.fecha_vencimiento_linea || '',
    o.quien_cubre,
    o.estado,
    o.metodo_pago || '',
    o.folio_autorizacion_bancaria || '',
    o.fecha_pago || '',
  ])

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [cabeceras.join(','), ...filas.map((e) => e.join(','))].join('\n')

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `relacion_ordenes_pago_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  notificar('Relación de pagos descargada en CSV')
}
</script>

<template>
  <v-container fluid class="pa-6 ordenes-pago-page">
    <!-- Encabezado del Tablero -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-6">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">
          Control Notarial · Conciliación de Tesorería y Dinero de Paso
        </div>
        <h1 class="text-h4 font-weight-bold text-primary">
          Órdenes de Pago y Tesorería Notarial
        </h1>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-file-delimited-outline"
          @click="exportarRelacion"
        >
          Exportar Relación
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="recargar"
        >
          Actualizar
        </v-btn>
      </div>
    </div>

    <!-- Tarjetas Superiores de Indicadores (KPIs) -->
    <v-row density="comfortable" class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Total Derechos Oficiales</div>
              <div class="text-h5 font-weight-bold text-primary mt-1">
                {{ formatearMonedaMXN(resumenFinanciero.total_monto) }}
              </div>
            </div>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon icon="mdi-cash-register" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            {{ resumenFinanciero.total_ordenes }} orden(es) activas registradas
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Total Pagado / Conciliado</div>
              <div class="text-h5 font-weight-bold text-success mt-1">
                {{ formatearMonedaMXN(resumenFinanciero.monto_pagado) }}
              </div>
            </div>
            <v-avatar color="success" variant="tonal" size="44">
              <v-icon icon="mdi-check-decagram-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-success mt-2">
            Comprobantes bancarios emitidos
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Saldo Pendiente de Liquidar</div>
              <div
                :class="[
                  'text-h5 font-weight-bold mt-1',
                  resumenFinanciero.monto_pendiente > 0 ? 'text-amber-darken-3' : 'text-success',
                ]"
              >
                {{ formatearMonedaMXN(resumenFinanciero.monto_pendiente) }}
              </div>
            </div>
            <v-avatar color="warning" variant="tonal" size="44">
              <v-icon icon="mdi-clock-alert-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            Egresos gubernamentales en tránsito
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Vencimientos de Línea</div>
              <div
                :class="[
                  'text-h5 font-weight-bold mt-1',
                  resumenFinanciero.ordenes_vencidas > 0
                    ? 'text-error'
                    : resumenFinanciero.ordenes_por_vencer > 0
                    ? 'text-warning'
                    : 'text-grey',
                ]"
              >
                {{ resumenFinanciero.ordenes_vencidas + resumenFinanciero.ordenes_por_vencer }}
              </div>
            </div>
            <v-avatar
              :color="resumenFinanciero.ordenes_vencidas > 0 ? 'error' : 'warning'"
              variant="tonal"
              size="44"
            >
              <v-icon icon="mdi-barcode-scan" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            {{ resumenFinanciero.ordenes_vencidas }} vencida(s) · {{ resumenFinanciero.ordenes_por_vencer }} en riesgo (≤ 3d)
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Componente de Filtros -->
    <OrdenesPagoFiltros
      v-model="filtros"
      :dependencias="dependencias"
      @update:model-value="onFiltrosChange"
      @reset="onResetFiltros"
    />

    <!-- Tabla General Consolidada -->
    <v-card variant="outlined" class="rounded-lg overflow-hidden">
      <v-table hover density="comfortable">
        <thead class="bg-grey-lighten-4">
          <tr>
            <th class="text-left font-weight-bold">Folio</th>
            <th class="text-left font-weight-bold">Escritura</th>
            <th class="text-left font-weight-bold">Dependencia</th>
            <th class="text-left font-weight-bold">Concepto</th>
            <th class="text-right font-weight-bold">Monto (MXN)</th>
            <th class="text-center font-weight-bold">Línea & Vigencia</th>
            <th class="text-left font-weight-bold">Quién Cubre</th>
            <th class="text-center font-weight-bold">Estado</th>
            <th class="text-center font-weight-bold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="9" class="text-center pa-6 text-grey">
              <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
              Cargando órdenes de pago de la notaría...
            </td>
          </tr>
          <tr v-else-if="ordenes.length === 0">
            <td colspan="9" class="text-center pa-6 text-grey">
              <v-icon icon="mdi-receipt-text-outline" size="36" class="mb-2 text-grey-lighten-1" />
              <div>No se encontraron órdenes de pago con los criterios seleccionados.</div>
            </td>
          </tr>
          <tr v-for="ord in ordenes" :key="ord.id">
            <!-- Folio -->
            <td>
              <span class="font-weight-bold text-primary">{{ ord.folio }}</span>
            </td>

            <!-- Escritura -->
            <td>
              <v-btn
                variant="text"
                size="small"
                color="primary"
                class="pa-0 font-weight-bold text-decoration-underline"
                @click="irAEscritura(ord.escritura_id)"
              >
                {{ ord.escritura_instrumento ? `Inst. ${ord.escritura_instrumento}` : (ord.escritura_expediente || 'Ver Exp.') }}
              </v-btn>
            </td>

            <!-- Dependencia -->
            <td>
              <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold">
                {{ ord.dependencia?.sigla || 'GOB' }}
              </v-chip>
            </td>

            <!-- Concepto -->
            <td>
              <div class="font-weight-medium">{{ ord.concepto }}</div>
              <div v-if="ord.tramite_folio" class="text-caption text-grey">
                Volante: {{ ord.tramite_folio }}
              </div>
            </td>

            <!-- Monto -->
            <td class="text-right font-weight-bold">
              {{ formatearMonedaMXN(ord.monto) }}
            </td>

            <!-- Línea de Captura & Semáforo -->
            <td class="text-center">
              <div v-if="ord.linea_captura" class="mb-1">
                <code class="text-caption font-weight-bold">{{ ord.linea_captura }}</code>
              </div>
              <v-chip
                v-if="ord.semaforo"
                size="x-small"
                :color="getSemaforoColor(ord.semaforo)"
                variant="flat"
                class="font-weight-medium"
              >
                {{
                  ord.estado === 'pagado'
                    ? 'Pagado'
                    : ord.semaforo === 'rojo'
                    ? (ord.dias_restantes ?? 0) < 0 ? 'Vencida' : 'Vence hoy'
                    : ord.semaforo === 'amarillo'
                    ? `Vence en ${ord.dias_restantes} d`
                    : ord.semaforo === 'verde'
                    ? `Vence en ${ord.dias_restantes} d`
                    : 'Sin vigencia'
                }}
              </v-chip>
            </td>

            <!-- Quién Cubre -->
            <td>
              <span class="text-caption">{{ getQuienCubreLabel(ord.quien_cubre) }}</span>
            </td>

            <!-- Estado -->
            <td class="text-center">
              <v-chip
                size="small"
                :color="getEstadoOrdenColor(ord.estado)"
                variant="tonal"
                class="font-weight-medium"
              >
                {{ getEstadoOrdenLabel(ord.estado) }}
              </v-chip>
            </td>

            <!-- Acciones -->
            <td class="text-center">
              <div class="d-flex align-center justify-center gap-1">
                <v-btn
                  v-if="ord.estado === 'pendiente' || ord.estado === 'en_tesoreria'"
                  size="small"
                  color="success"
                  variant="flat"
                  prepend-icon="mdi-bank-transfer"
                  @click="abrirLiquidar(ord)"
                >
                  Liquidar
                </v-btn>
                <v-btn
                  icon="mdi-open-in-new"
                  size="small"
                  variant="text"
                  color="primary"
                  title="Abrir en Escritura"
                  @click="irAEscritura(ord.escritura_id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Modal de Liquidación Bancaria -->
    <OrdenPagoLiquidarModal
      v-if="ordenALiquidar"
      v-model="modalLiquidarVisible"
      :escritura-id="ordenALiquidar.escritura_id"
      :orden="ordenALiquidar"
      @liquidado="onLiquidarConfirmado"
    />

    <!-- Feedback Snackbar -->
    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="4000">
      {{ snackbarMensaje }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
