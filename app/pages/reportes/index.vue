<template>
  <div class="reportes-page pa-4 pa-md-6">
    <!-- Encabezado Institucional de la Página -->
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div class="d-flex align-center">
        <v-avatar color="primary" size="48" class="mr-3 elevation-1">
          <v-icon icon="mdi-chart-box-outline" color="white" size="28" />
        </v-avatar>
        <div>
          <h1 class="text-h5 font-weight-bold text-grey-darken-4 mb-0">
            Centro de Reportes Notariales
          </h1>
          <p class="text-body-2 text-grey-darken-1 mb-0">
            Métricas de operación, auditoría de gestoría, índices del protocolo y control financiero.
          </p>
        </div>
      </div>
    </div>

    <!-- Navegación por Pestañas Principales -->
    <v-card variant="outlined" class="rounded-lg mb-6 bg-surface">
      <v-tabs
        v-model="tabActiva"
        color="primary"
        align-tabs="start"
        density="comfortable"
        show-arrows
      >
        <v-tab value="dashboard" class="text-none font-weight-medium">
          <v-icon start icon="mdi-view-dashboard-outline" />
          Dashboard Ejecutivo
        </v-tab>

        <v-tab value="general" class="text-none font-weight-medium">
          <v-icon start icon="mdi-table-large" />
          Reporte General de Escrituras
        </v-tab>

        <v-tab value="indices" class="text-none font-weight-medium">
          <v-icon start icon="mdi-book-open-page-variant-outline" />
          Índices por Volumen
        </v-tab>

        <!-- Pestaña Condicional de Finanzas (§4 RLS y Permisos) -->
        <v-tab
          v-if="puedeVerFinanzas"
          value="finanzas"
          class="text-none font-weight-medium"
        >
          <v-icon start icon="mdi-cash-multiple" />
          Finanzas y Honorarios
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Contenido de las Pestañas -->
    <v-window v-model="tabActiva">
      <!-- 1. PESTAÑA DASHBOARD EJECUTIVO -->
      <v-window-item value="dashboard">
        <!-- Barra de Periodo y Tarjetas de KPIs -->
        <ReportesKpisBar
          :kpis="kpisMes"
          :mes="periodo.mes"
          :anio="periodo.anio"
          :cargando="cargando"
          @cambio-periodo="onCambioPeriodo"
          @refrescar="cargarDashboard"
        />

        <!-- Gráficas del Mes: Redactores y Actos -->
        <v-row density="comfortable">
          <v-col cols="12" md="6">
            <ReportesGraficaRedactores
              :redactores="cargaRedactores"
              :cargando="cargando"
            />
          </v-col>

          <v-col cols="12" md="6">
            <ReportesGraficaActosTop
              :actos="topActos"
              :cargando="cargando"
            />
          </v-col>
        </v-row>
      </v-window-item>

      <!-- 2. PESTAÑA REPORTE GENERAL DE ESCRITURAS -->
      <v-window-item value="general">
        <ReporteGeneralEscriturasTable
          :escrituras="escriturasFiltradasGeneral"
          :cargando="cargandoGeneral"
          :filtro-estatus="filtroEstatusGeneral"
          :busqueda="busquedaGeneral"
          @update:filtro-estatus="filtroEstatusGeneral = $event"
          @update:busqueda="busquedaGeneral = $event"
          @exportar-csv="exportarReporteGeneralCSV"
          @refrescar="cargarReporteGeneral"
        />
      </v-window-item>

      <!-- 3. PESTAÑA ÍNDICES POR VOLUMEN -->
      <v-window-item value="indices">
        <VolumenesCardsGrid
          :volumenes="volumenes"
          :cargando="cargandoVolumenes"
          :volumen-seleccionado-id="volumenActivo"
          @seleccionar-volumen="onAbrirVolumen"
        />

        <!-- Modal de Captura de Foliado por Volumen -->
        <VolumenDetalleFoliadoModal
          v-model="modalFoliadoVisible"
          :volumen="volumenActivo"
          :escrituras="escriturasDelVolumen"
          :cargando="cargandoDetalleVolumen"
          :guardando="guardandoFoliado"
          @guardar-foliado="onGuardarFoliado"
          @imprimir-indice="modalImpresionVisible = true"
          @exportar-csv="onExportarIndiceCSV"
        />

        <!-- Vista Imprimible Oficial del Índice Notarial -->
        <ReporteIndiceVolumenImprimible
          v-model="modalImpresionVisible"
          :volumen="volumenActivo"
          :anio="periodo.anio"
          :escrituras="escriturasDelVolumen"
          @exportar-csv="onExportarIndiceCSV"
        />
      </v-window-item>

      <!-- 4. PESTAÑA FINANZAS (PROTEGIDA) -->
      <v-window-item v-if="puedeVerFinanzas" value="finanzas">
        <ReportesFinanzasTab
          :finanzas="finanzas"
          :cargando="cargandoFinanzas"
          @refrescar="cargarFinanzas"
        />
      </v-window-item>
    </v-window>

    <!-- Notificación Snackbar -->
    <v-snackbar
      v-model="snackbarVisible"
      :color="snackbarColor"
      location="top right"
      :timeout="3500"
    >
      {{ snackbarMensaje }}
      <template #actions>
        <v-btn variant="text" color="white" @click="snackbarVisible = false">
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReportesNotariales } from '~/composables/useReportesNotariales'
import { useAuth } from '~/composables/useAuth'

import ReportesKpisBar from '~/components/reportes/ReportesKpisBar.vue'
import ReportesGraficaRedactores from '~/components/reportes/ReportesGraficaRedactores.vue'
import ReportesGraficaActosTop from '~/components/reportes/ReportesGraficaActosTop.vue'
import ReporteGeneralEscriturasTable from '~/components/reportes/ReporteGeneralEscriturasTable.vue'
import VolumenesCardsGrid from '~/components/reportes/indices/VolumenesCardsGrid.vue'
import VolumenDetalleFoliadoModal from '~/components/reportes/indices/VolumenDetalleFoliadoModal.vue'
import ReporteIndiceVolumenImprimible from '~/components/reportes/indices/ReporteIndiceVolumenImprimible.vue'
import ReportesFinanzasTab from '~/components/reportes/ReportesFinanzasTab.vue'

const { hasPermiso } = useAuth()
const puedeVerFinanzas = computed(() => hasPermiso('reportes', 'ver_financieros'))

const {
  periodo,
  cargando,
  kpisMes,
  cargaRedactores,
  topActos,
  escriturasGeneral,
  escriturasFiltradasGeneral,
  filtroEstatusGeneral,
  busquedaGeneral,
  cargandoGeneral,
  volumenes,
  volumenActivo,
  escriturasDelVolumen,
  cargandoVolumenes,
  cargandoDetalleVolumen,
  guardandoFoliado,
  finanzas,
  cargandoFinanzas,
  cambiarPeriodo,
  cargarDashboard,
  cargarReporteGeneral,
  exportarReporteGeneralCSV,
  cargarVolumenes,
  seleccionarVolumen,
  actualizarFoliadoEscritura,
  exportarIndiceVolumenCSV,
  cargarFinanzas,
} = useReportesNotariales()

const tabActiva = ref('dashboard')
const modalFoliadoVisible = ref(false)
const modalImpresionVisible = ref(false)

const snackbarVisible = ref(false)
const snackbarMensaje = ref('')
const snackbarColor = ref('success')

function notificar(msg: string, color = 'success') {
  snackbarMensaje.value = msg
  snackbarColor.value = color
  snackbarVisible.value = true
}

async function onCambioPeriodo(payload: { mes: number; anio: number }) {
  await cambiarPeriodo(payload.mes, payload.anio)
}

async function onAbrirVolumen(vol: number) {
  modalFoliadoVisible.value = true
  await seleccionarVolumen(vol)
}

async function onGuardarFoliado(payload: {
  escrituraId: string
  paginaInicial: number | null
  paginaFinal: number | null
}) {
  try {
    await actualizarFoliadoEscritura(payload.escrituraId, payload.paginaInicial, payload.paginaFinal)
    notificar('Foliado actualizado correctamente')
  } catch (e: any) {
    notificar(e.message || 'Error al actualizar foliado', 'error')
  }
}

function onExportarIndiceCSV() {
  if (volumenActivo.value !== null) {
    exportarIndiceVolumenCSV(volumenActivo.value)
    notificar(`Índice del Volumen ${volumenActivo.value} exportado con éxito`)
  }
}

onMounted(async () => {
  await Promise.all([
    cargarDashboard(),
    cargarReporteGeneral(),
    cargarVolumenes(),
    puedeVerFinanzas.value ? cargarFinanzas() : Promise.resolve(),
  ])
})
</script>

<style scoped>
.reportes-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
