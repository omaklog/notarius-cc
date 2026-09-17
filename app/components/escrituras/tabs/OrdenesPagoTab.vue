<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { OrdenPago, OrdenPagoFormData, LiquidarOrdenPagoData } from '~/types/ordenesPago'
import {
  formatearMonedaMXN,
  getSemaforoColor,
  getEstadoOrdenLabel,
  getEstadoOrdenColor,
  getQuienCubreLabel,
} from '~/utils/ordenesPagoUtils'
import { useOrdenesPago } from '~/composables/useOrdenesPago'
import OrdenPagoFormModal from '~/components/ordenesPago/OrdenPagoFormModal.vue'
import OrdenPagoLiquidarModal from '~/components/ordenesPago/OrdenPagoLiquidarModal.vue'

const props = withDefaults(
  defineProps<{
    escrituraId: string
    readOnly?: boolean
  }>(),
  {
    readOnly: false,
  }
)

const emit = defineEmits<{
  (e: 'actualizado'): void
}>()

const {
  ordenes,
  dependencias,
  cargando,
  resumenFinanciero,
  cargarDependencias,
  cargarOrdenes,
  guardarOrden,
  liquidarOrden,
  cancelarOrden,
} = useOrdenesPago(props.escrituraId)

// Estados locales de modales
const modalFormVisible = ref(false)
const modalLiquidarVisible = ref(false)
const ordenEnEdicion = ref<OrdenPago | null>(null)
const ordenALiquidar = ref<OrdenPago | null>(null)

// Modal de cancelación
const modalCancelarVisible = ref(false)
const ordenACancelar = ref<OrdenPago | null>(null)
const motivoCancelacion = ref('')
const cancelando = ref(false)
const errorCancelar = ref<string | null>(null)

// Filtro rápido en tabla
const busqueda = ref('')
const filtroEstado = ref<string>('todos')

// Feedback / Snackbars
const snackbarVisible = ref(false)
const snackbarMensaje = ref('')
const snackbarColor = ref('success')

function mostrarNotificacion(mensaje: string, color = 'success') {
  snackbarMensaje.value = mensaje
  snackbarColor.value = color
  snackbarVisible.value = true
}

onMounted(async () => {
  await Promise.all([cargarDependencias(), cargarOrdenes()])
})

// Lista filtrada en cliente
const ordenesFiltradas = computed(() => {
  return ordenes.value.filter((o) => {
    if (filtroEstado.value !== 'todos' && o.estado !== filtroEstado.value) {
      return false
    }
    if (busqueda.value.trim() !== '') {
      const term = busqueda.value.toLowerCase().trim()
      const matchFolio = o.folio.toLowerCase().includes(term)
      const matchConcepto = o.concepto.toLowerCase().includes(term)
      const matchLinea = o.linea_captura?.toLowerCase().includes(term) || false
      const matchDep = o.dependencia?.sigla?.toLowerCase().includes(term) || false
      if (!matchFolio && !matchConcepto && !matchLinea && !matchDep) return false
    }
    return true
  })
})

function abrirNuevaOrden() {
  ordenEnEdicion.value = null
  modalFormVisible.value = true
}

function abrirEditarOrden(orden: OrdenPago) {
  ordenEnEdicion.value = orden
  modalFormVisible.value = true
}

function abrirLiquidarOrden(orden: OrdenPago) {
  ordenALiquidar.value = orden
  modalLiquidarVisible.value = true
}

function abrirCancelarOrden(orden: OrdenPago) {
  ordenACancelar.value = orden
  motivoCancelacion.value = ''
  errorCancelar.value = null
  modalCancelarVisible.value = true
}

async function onGuardarOrden(data: OrdenPagoFormData, ordenId?: string) {
  try {
    await guardarOrden(data, ordenId)
    mostrarNotificacion(
      ordenId ? 'Orden de pago actualizada exitosamente' : 'Orden de pago registrada exitosamente'
    )
    emit('actualizado')
  } catch (err: any) {
    mostrarNotificacion(err.message || 'Error al guardar la orden', 'error')
  }
}

async function onLiquidarOrden(
  data: LiquidarOrdenPagoData,
  comprobanteDocId?: string | null
) {
  try {
    await liquidarOrden(data, comprobanteDocId)
    mostrarNotificacion('Pago bancario asentado y conciliado con éxito')
    emit('actualizado')
  } catch (err: any) {
    mostrarNotificacion(err.message || 'Error al liquidar la orden', 'error')
  }
}

async function confirmarCancelacion() {
  if (!ordenACancelar.value) return
  if (!motivoCancelacion.value.trim()) {
    errorCancelar.value = 'Debe indicar el motivo legal de cancelación'
    return
  }

  cancelando.value = true
  try {
    await cancelarOrden(ordenACancelar.value.id, motivoCancelacion.value)
    modalCancelarVisible.value = false
    mostrarNotificacion('Orden de pago cancelada correctamente', 'warning')
    emit('actualizado')
  } catch (err: any) {
    errorCancelar.value = err.message || 'Error al cancelar la orden'
  } finally {
    cancelando.value = false
  }
}
</script>

<template>
  <div class="ordenes-pago-tab">
    <!-- Tarjetas de Resumen Financiero y KPIs -->
    <v-row density="comfortable" class="mb-3">
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Total Derechos Oficiales</div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ formatearMonedaMXN(resumenFinanciero.total_monto) }}
          </div>
          <div class="text-caption text-grey">
            {{ resumenFinanciero.total_ordenes }} orden(es) activas
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Monto Pagado / Conciliado</div>
          <div class="text-h6 font-weight-bold text-success">
            {{ formatearMonedaMXN(resumenFinanciero.monto_pagado) }}
          </div>
          <div class="text-caption text-success">
            Fondos ejercidos a terceros
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Saldo Pendiente de Liquidar</div>
          <div
            :class="[
              'text-h6 font-weight-bold',
              resumenFinanciero.monto_pendiente > 0 ? 'text-amber-darken-3' : 'text-success',
            ]"
          >
            {{ formatearMonedaMXN(resumenFinanciero.monto_pendiente) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ resumenFinanciero.monto_pendiente > 0 ? 'Por transferir' : 'Al corriente' }}
          </div>
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Líneas por Vencer / Vencidas</div>
          <div
            :class="[
              'text-h6 font-weight-bold',
              resumenFinanciero.ordenes_vencidas > 0
                ? 'text-error'
                : resumenFinanciero.ordenes_por_vencer > 0
                ? 'text-warning'
                : 'text-grey',
            ]"
          >
            {{ resumenFinanciero.ordenes_vencidas + resumenFinanciero.ordenes_por_vencer }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ resumenFinanciero.ordenes_vencidas }} vencida(s) | {{ resumenFinanciero.ordenes_por_vencer }} urgente(s)
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Alerta Informativa No Bloqueante de Saldo Pendiente -->
    <v-alert
      v-if="resumenFinanciero.monto_pendiente > 0"
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mb-4 rounded-lg border-warning"
      icon="mdi-information-outline"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <div class="font-weight-bold text-subtitle-2">
            CONTROL DE DERECHOS A TERCEROS: SALDO PENDIENTE DE LIQUIDAR
          </div>
          <div class="text-body-2">
            Existen órdenes de derechos oficiales pendientes por un total de
            <strong>{{ formatearMonedaMXN(resumenFinanciero.monto_pendiente) }}</strong>.
            Esta condición no bloquea la protocolización del acto notarial, pero se recomienda liquidar oportunamente para evitar recargos o demoras en la calificación registral.
          </div>
        </div>
      </div>
    </v-alert>

    <v-alert
      v-else-if="resumenFinanciero.total_ordenes > 0"
      type="success"
      variant="tonal"
      density="compact"
      class="mb-4 rounded-lg"
      icon="mdi-check-decagram-outline"
    >
      <span class="text-caption font-weight-medium">
        Todos los derechos oficiales registrados para esta escritura se encuentran totalmente liquidados y conciliados.
      </span>
    </v-alert>

    <!-- Barra de Acciones y Filtros -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-4">
      <div class="d-flex align-center gap-2 flex-grow-1" style="max-width: 550px">
        <v-text-field
          v-model="busqueda"
          placeholder="Buscar por folio, línea de captura o concepto..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          hide-details
          clearable
        />
        <v-select
          v-model="filtroEstado"
          :items="[
            { title: 'Todos los estados', value: 'todos' },
            { title: 'Pendientes', value: 'pendiente' },
            { title: 'En Tesorería', value: 'en_tesoreria' },
            { title: 'Pagados', value: 'pagado' },
            { title: 'Cancelados', value: 'cancelado' },
          ]"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 180px"
        />
      </div>

      <div v-if="!readOnly" class="d-flex gap-2">
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          variant="elevated"
          @click="abrirNuevaOrden"
        >
          Nueva Orden de Pago
        </v-btn>
      </div>
    </div>

    <!-- Tabla de Órdenes de Pago -->
    <v-card variant="outlined" class="rounded-lg overflow-hidden">
      <v-table hover density="comfortable">
        <thead class="bg-grey-lighten-4">
          <tr>
            <th class="text-left font-weight-bold">Folio</th>
            <th class="text-left font-weight-bold">Dependencia</th>
            <th class="text-left font-weight-bold">Concepto</th>
            <th class="text-right font-weight-bold">Monto (MXN)</th>
            <th class="text-center font-weight-bold">Línea & Vigencia</th>
            <th class="text-left font-weight-bold">Quién Cubre</th>
            <th class="text-center font-weight-bold">Estado</th>
            <th v-if="!readOnly" class="text-center font-weight-bold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="8" class="text-center pa-6 text-grey">
              <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
              Cargando órdenes de pago...
            </td>
          </tr>
          <tr v-else-if="ordenesFiltradas.length === 0">
            <td colspan="8" class="text-center pa-6 text-grey">
              <v-icon icon="mdi-receipt-text-outline" size="36" class="mb-2 text-grey-lighten-1" />
              <div>No hay órdenes de pago registradas con los filtros seleccionados.</div>
            </td>
          </tr>
          <tr v-for="ord in ordenesFiltradas" :key="ord.id">
            <!-- Folio -->
            <td>
              <span class="font-weight-bold text-primary">{{ ord.folio }}</span>
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
                Trámite: {{ ord.tramite_folio }}
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
            <td v-if="!readOnly" class="text-center">
              <div class="d-flex align-center justify-center gap-1">
                <!-- Botón Liquidar (para órdenes pendientes) -->
                <v-btn
                  v-if="ord.estado === 'pendiente' || ord.estado === 'en_tesoreria'"
                  size="small"
                  color="success"
                  variant="flat"
                  prepend-icon="mdi-bank-transfer"
                  @click="abrirLiquidarOrden(ord)"
                >
                  Liquidar
                </v-btn>

                <!-- Menú de opciones adicionales -->
                <v-menu location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn icon="mdi-dots-vertical" size="small" variant="text" v-bind="menuProps" />
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      v-if="ord.estado !== 'cancelado'"
                      prepend-icon="mdi-pencil-outline"
                      title="Modificar Datos"
                      @click="abrirEditarOrden(ord)"
                    />
                    <v-list-item
                      v-if="ord.estado === 'pendiente' || ord.estado === 'en_tesoreria'"
                      prepend-icon="mdi-cancel"
                      title="Cancelar Orden"
                      class="text-error"
                      @click="abrirCancelarOrden(ord)"
                    />
                  </v-list>
                </v-menu>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Modales -->
    <OrdenPagoFormModal
      v-model="modalFormVisible"
      :escritura-id="escrituraId"
      :orden="ordenEnEdicion"
      :dependencias="dependencias"
      @saved="onGuardarOrden"
    />

    <OrdenPagoLiquidarModal
      v-model="modalLiquidarVisible"
      :escritura-id="escrituraId"
      :orden="ordenALiquidar"
      @liquidado="onLiquidarOrden"
    />

    <!-- Modal de Cancelación -->
    <v-dialog v-model="modalCancelarVisible" max-width="500px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-error text-white px-6 py-4 d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-alert-circle-outline" class="mr-2" />
            <span>Cancelar Orden {{ ordenACancelar?.folio }}</span>
          </div>
          <v-btn icon variant="text" size="small" color="white" @click="modalCancelarVisible = false">
            <v-icon icon="mdi-close" />
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-6">
          <p class="text-body-2 mb-4">
            Indique la justificación formal para cancelar esta orden de pago de derechos. La orden quedará archivada en auditoría con su motivo.
          </p>
          <v-alert
            v-if="errorCancelar"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            {{ errorCancelar }}
          </v-alert>
          <v-textarea
            v-model="motivoCancelacion"
            label="Motivo Legal de Cancelación *"
            placeholder="Ej. Error en la emisión de la línea de captura por la dependencia, revocación del trámite..."
            rows="3"
            variant="outlined"
            density="comfortable"
            :rules="[(v) => !!v.trim() || 'El motivo es obligatorio']"
          />
        </v-card-text>
        <v-card-actions class="pa-4 bg-grey-lighten-4 justify-end">
          <v-btn variant="text" @click="modalCancelarVisible = false">Cerrar</v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="cancelando"
            @click="confirmarCancelacion"
          >
            Confirmar Cancelación
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback Snackbar -->
    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="4000">
      {{ snackbarMensaje }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.metric-card {
  border-radius: 8px;
  background-color: #ffffff;
}
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
