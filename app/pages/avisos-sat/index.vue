<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAvisosSat } from '~/composables/useAvisosSat';
import type { AvisoSatItem } from '~/types/avisosSat';
import type { DatosCedulaAvisoSat } from '~/utils/pdfCedulaAvisoSat';
import AvisosSatAlerta24hCard from '~/components/avisosSat/AvisosSatAlerta24hCard.vue';
import AvisosSatPeriodoBanner from '~/components/avisosSat/AvisosSatPeriodoBanner.vue';
import AvisosSatKpisBar from '~/components/avisosSat/AvisosSatKpisBar.vue';
import AvisosSatOperacionesTable from '~/components/avisosSat/AvisosSatOperacionesTable.vue';
import AvisosSatRegistrarAcuseModal from '~/components/avisosSat/modal/AvisosSatRegistrarAcuseModal.vue';
import AvisosSatXmlPreviewModal from '~/components/avisosSat/modal/AvisosSatXmlPreviewModal.vue';
import AvisosSatDeclararCerosModal from '~/components/avisosSat/modal/AvisosSatDeclararCerosModal.vue';

const hoy = new Date();
const periodoAnio = ref(hoy.getFullYear());
const periodoMes = ref(hoy.getMonth() + 1);

const {
  avisosPeriodo,
  kpisPeriodo,
  cargando,
  guardando,
  cargarAvisosPeriodo,
  generarXmlIndividualPorEscritura,
  generarPaqueteMensualConsolidado,
  registrarAcuseSat,
  declararInformeCeros,
  emitirCedulaPdf,
} = useAvisosSat();

// Referencia a la tabla para filtrar remotamente
const tablaOperacionesRef = ref<any>(null);

// Modales
const modalAcuseVisible = ref(false);
const avisoSeleccionado = ref<AvisoSatItem | null>(null);

const modalXmlVisible = ref(false);
const xmlData = ref({ nombreArchivo: '', contenidoXml: '' });

const modalCerosVisible = ref(false);

// Notificaciones Toast / Snackbar
const snackbarVisible = ref(false);
const snackbarMensaje = ref('');
const snackbarColor = ref('success');

function notificar(msg: string, color = 'success') {
  snackbarMensaje.value = msg;
  snackbarColor.value = color;
  snackbarVisible.value = true;
}

const MESES = [
  { value: 1, title: '01 - Enero' },
  { value: 2, title: '02 - Febrero' },
  { value: 3, title: '03 - Marzo' },
  { value: 4, title: '04 - Abril' },
  { value: 5, title: '05 - Mayo' },
  { value: 6, title: '06 - Junio' },
  { value: 7, title: '07 - Julio' },
  { value: 8, title: '08 - Agosto' },
  { value: 9, title: '09 - Septiembre' },
  { value: 10, title: '10 - Octubre' },
  { value: 11, title: '11 - Noviembre' },
  { value: 12, title: '12 - Diciembre' },
];

const ANIOS = [
  hoy.getFullYear() - 2,
  hoy.getFullYear() - 1,
  hoy.getFullYear(),
  hoy.getFullYear() + 1,
];

async function refrescarPeriodo() {
  await cargarAvisosPeriodo(periodoAnio.value, periodoMes.value);
}

watch([periodoAnio, periodoMes], () => {
  refrescarPeriodo();
});

onMounted(() => {
  refrescarPeriodo();
});

function onFiltrar24h() {
  if (tablaOperacionesRef.value?.setFiltro) {
    tablaOperacionesRef.value.setFiltro('24h');
  }
}

async function onGenerarPaqueteMensual() {
  try {
    const res = await generarPaqueteMensualConsolidado(periodoAnio.value, periodoMes.value);
    xmlData.value = res;
    modalXmlVisible.value = true;
    notificar(`Paquete mensual consolidado generado exitosamente (${res.nombreArchivo})`);
    await refrescarPeriodo();
  } catch (err: any) {
    notificar(err.message || 'Error al compilar el paquete mensual consolidado', 'error');
  }
}

async function onGenerarXmlIndividual(escrituraId: string) {
  try {
    const res = await generarXmlIndividualPorEscritura(escrituraId);
    xmlData.value = res;
    modalXmlVisible.value = true;
    notificar(`Layout XML generado exitosamente (${res.nombreArchivo})`);
    await refrescarPeriodo();
  } catch (err: any) {
    notificar(err.message || 'Error al generar el layout XML', 'error');
  }
}

function onEmitirPdf(item: AvisoSatItem) {
  const datosCedula: DatosCedulaAvisoSat = {
    numeroInstrumento: item.numero_instrumento || 'S/N',
    fechaFirma: item.fecha_acto || new Date().toISOString().slice(0, 10),
    actoJuridico: item.acto_juridico_nombre || 'Acto Notarial',
    clientePrincipal: item.cliente_principal || 'No especificado',
    comparecientes: [],
    valorOperacionMxn: item.monto_operacion_mxn || 0,
    valorOperacionUma: item.monto_operacion_uma || 0,
    tipoAviso: item.tipo_aviso,
    estatusAviso: item.estatus,
    folioAcuseSat: item.folio_acuse_sat,
    fechaPresentacionSat: item.fecha_presentacion_sat,
  };

  emitirCedulaPdf(datosCedula);
}

function onAbrirRegistrarAcuse(item: AvisoSatItem) {
  avisoSeleccionado.value = item;
  modalAcuseVisible.value = true;
}

async function onAcuseGuardado(payload: {
  folioAcuse: string;
  fechaPresentacion: string;
  horaPresentacion?: string;
  archivoPdf?: File;
  notas?: string;
}) {
  if (!avisoSeleccionado.value?.id) {
    notificar('No se pudo identificar el registro de aviso para el acuse', 'error');
    return;
  }

  try {
    await registrarAcuseSat(
      avisoSeleccionado.value.id,
      payload.folioAcuse,
      payload.fechaPresentacion,
      payload.archivoPdf
    );
    modalAcuseVisible.value = false;
    notificar(`Acuse SAT registrado correctamente (Folio: ${payload.folioAcuse})`);
    await refrescarPeriodo();
  } catch (err: any) {
    notificar(err.message || 'Error al registrar el acuse del SAT', 'error');
  }
}

async function onDeclararCeros(payload: {
  folioAcuse: string;
  fechaPresentacion: string;
  archivoPdf?: File;
}) {
  try {
    await declararInformeCeros(
      periodoAnio.value,
      periodoMes.value,
      payload.folioAcuse,
      payload.fechaPresentacion,
      payload.archivoPdf
    );
    modalCerosVisible.value = false;
    notificar(`Informe en Ceros registrado formalmente (Folio: ${payload.folioAcuse})`);
    await refrescarPeriodo();
  } catch (err: any) {
    notificar(err.message || 'Error al registrar el informe en ceros', 'error');
  }
}
</script>

<template>
  <div class="avisos-sat-page pa-4">
    <!-- Breadcrumbs -->
    <v-breadcrumbs
      :items="[
        { title: 'Inicio', href: '/' },
        { title: 'Cumplimiento', disabled: true },
        { title: 'Avisos SAT / UIF', disabled: true },
      ]"
      density="compact"
      class="pa-0 mb-3 text-caption"
    />

    <!-- Encabezado Principal y Selector de Periodo Fiscal -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-grey-darken-4 d-flex align-center ga-2">
          <v-icon color="primary" size="28">mdi-shield-account-outline</v-icon>
          Avisos SAT / UIF — SPPLD
        </h1>
        <p class="text-caption text-grey-darken-1 mb-0">
          Prevención de Lavado de Dinero · Actividades Vulnerables conforme al Art. 17 Fracción XII LFPIORPI
        </p>
      </div>

      <!-- Controles de Periodo y Acciones Globales -->
      <div class="d-flex align-center flex-wrap ga-2 w-100 w-md-auto justify-end">
        <!-- Selector Mes -->
        <div style="width: 170px;">
          <v-select
            v-model="periodoMes"
            :items="MESES"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-calendar-month"
            hide-details
          />
        </div>

        <!-- Selector Año -->
        <div style="width: 110px;">
          <v-select
            v-model="periodoAnio"
            :items="ANIOS"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <!-- Botón Refrescar -->
        <v-btn
          icon="mdi-refresh"
          variant="outlined"
          color="grey-darken-1"
          density="comfortable"
          :loading="cargando"
          @click="refrescarPeriodo"
        />

        <!-- Declarar Informe en Ceros -->
        <v-btn
          variant="outlined"
          color="amber-darken-3"
          prepend-icon="mdi-file-document-outline"
          class="text-none font-weight-medium"
          @click="modalCerosVisible = true"
        >
          Informe en Ceros
        </v-btn>

        <!-- Generar Paquete Mensual XML Consolidado -->
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-package-down"
          class="text-none font-weight-bold shadow-sm"
          :loading="guardando"
          :disabled="avisosPeriodo.length === 0"
          @click="onGenerarPaqueteMensual"
        >
          Paquete Mensual XML
        </v-btn>
      </div>
    </div>

    <!-- Alerta Crítica Perentoria de 24 Horas (si existen casos en LPB) -->
    <AvisosSatAlerta24hCard
      :alertas="kpisPeriodo?.total_avisos_24h"
      :operaciones="avisosPeriodo"
      @filtrar-24h="onFiltrar24h"
    />

    <!-- Banner de Vencimiento Legal Inteligente -->
    <AvisosSatPeriodoBanner :kpis="kpisPeriodo" />

    <!-- Barra de KPIs y Métricas del Periodo -->
    <AvisosSatKpisBar :kpis="kpisPeriodo" />

    <!-- Tabla Reactiva de Operaciones y Avisos del Periodo -->
    <AvisosSatOperacionesTable
      ref="tablaOperacionesRef"
      :operaciones="avisosPeriodo"
      @generar-xml="onGenerarXmlIndividual"
      @emitir-pdf="onEmitirPdf"
      @registrar-acuse="onAbrirRegistrarAcuse"
    />

    <!-- Modal para Registrar Acuse Oficial de Aceptación SAT -->
    <AvisosSatRegistrarAcuseModal
      v-model="modalAcuseVisible"
      :aviso-id="avisoSeleccionado?.id"
      :folio-inicial="avisoSeleccionado?.folio_acuse_sat"
      :guardando="guardando"
      @guardado="onAcuseGuardado"
    />

    <!-- Modal para Previsualizar y Copiar/Descargar Layout XML -->
    <AvisosSatXmlPreviewModal
      v-model="modalXmlVisible"
      :nombre-archivo="xmlData.nombreArchivo"
      :contenido-xml="xmlData.contenidoXml"
    />

    <!-- Modal para Declarar Informe en Ceros -->
    <AvisosSatDeclararCerosModal
      v-model="modalCerosVisible"
      :periodo-anio="periodoAnio"
      :periodo-mes="periodoMes"
      :guardando="guardando"
      @declarar="onDeclararCeros"
    />

    <!-- Toast / Notificaciones Snackbar -->
    <v-snackbar
      v-model="snackbarVisible"
      :color="snackbarColor"
      timeout="4000"
      location="bottom right"
    >
      <div class="d-flex align-center ga-2">
        <v-icon>{{ snackbarColor === 'error' ? 'mdi-alert-circle' : 'mdi-check-circle' }}</v-icon>
        <span>{{ snackbarMensaje }}</span>
      </div>
    </v-snackbar>
  </div>
</template>

<style scoped>
.avisos-sat-page {
  max-width: 1440px;
  margin: 0 auto;
}
</style>
