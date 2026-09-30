<template>
  <div class="avisos-tab">
    <!-- Estado de carga -->
    <v-card v-if="cargando" variant="outlined" class="pa-8 text-center rounded-lg bg-surface">
      <v-progress-circular indeterminate color="primary" size="48" class="mb-3" />
      <div class="text-body-2 text-grey-darken-1 font-weight-medium">
        Evaluando dictamen normativo y consultando avisos SAT...
      </div>
    </v-card>

    <!-- Error al cargar -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      icon="mdi-alert-circle"
    >
      {{ error }}
      <template #append>
        <v-btn size="small" variant="text" color="error" @click="cargarAviso">Reintentar</v-btn>
      </template>
    </v-alert>

    <!-- Contenido principal -->
    <div v-else>
      <!-- 1. SEMÁFORO INSTITUCIONAL Y BARRA DE ACCIONES PRIMARIAS -->
      <v-card
        variant="outlined"
        class="rounded-lg mb-4 pa-4 border"
        :class="semaforoCardClass"
      >
        <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3">
          <div class="d-flex align-start ga-3">
            <v-avatar :color="semaforoColor" size="44" rounded="lg" variant="tonal">
              <v-icon size="26" :color="semaforoColor">{{ semaforoIcono }}</v-icon>
            </v-avatar>
            <div>
              <div class="d-flex align-center flex-wrap ga-2">
                <span class="text-subtitle-1 font-weight-bold" :class="semaforoTextoClass">
                  {{ tituloSemaforo }}
                </span>
                <v-chip
                  v-if="avisoActual?.estatus === 'presentado'"
                  color="success"
                  size="small"
                  variant="flat"
                  class="font-weight-bold"
                >
                  <v-icon start size="14">mdi-check</v-icon>
                  Presentado con Acuse
                </v-chip>
                <v-chip
                  v-else-if="dictamenActual?.requiere_aviso"
                  color="amber-darken-3"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  Pendiente de Envío
                </v-chip>
                <v-chip
                  v-else
                  color="grey"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  Exento
                </v-chip>
              </div>
              <div class="text-body-2 text-grey-darken-2 mt-1">
                {{ dictamenActual?.mensaje_diagnostico || 'Evaluación de actividad vulnerable conforme al Art. 17 Fracc. XII LFPIORPI.' }}
              </div>
            </div>
          </div>

          <!-- Botones de Acción Primaria -->
          <div class="d-flex align-center flex-wrap ga-2 w-100 w-md-auto justify-end">
            <v-btn
              v-if="dictamenActual?.requiere_aviso"
              color="primary"
              variant="elevated"
              prepend-icon="mdi-xml"
              size="default"
              class="text-none font-weight-bold"
              :loading="guardando"
              @click="onGenerarXml"
            >
              Generar Layout XML SPPLD
            </v-btn>

            <v-btn
              variant="outlined"
              color="primary"
              prepend-icon="mdi-file-pdf-box"
              size="default"
              class="text-none font-weight-medium bg-surface"
              @click="onDescargarPdf"
            >
              Cédula PDF
            </v-btn>

            <v-btn
              v-if="dictamenActual?.requiere_aviso"
              variant="tonal"
              color="amber-darken-3"
              prepend-icon="mdi-check-decagram-outline"
              size="default"
              class="text-none font-weight-medium"
              @click="modalAcuseVisible = true"
            >
              {{ avisoActual?.estatus === 'presentado' ? 'Actualizar Acuse' : 'Registrar Acuse SAT' }}
            </v-btn>

            <v-btn
              v-if="dictamenActual?.requiere_aviso && ultimoXmlContenido"
              icon="mdi-code-json"
              variant="text"
              size="small"
              title="Ver XML"
              @click="modalXmlVisible = true"
            />
          </div>
        </div>
      </v-card>

      <!-- 2. GRID DE 2 TARJETAS: DICTAMEN PLD Y VENCIMIENTO LEGAL -->
      <v-row dense class="mb-4">
        <!-- Tarjeta Izquierda: Dictamen PLD y Umbrales en UMA -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="rounded-lg h-100 bg-surface border">
            <v-card-item class="py-3 px-4 border-b bg-grey-lighten-5">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-scale-balance</v-icon>
                <span class="text-subtitle-2 font-weight-bold text-primary">
                  Dictamen PLD y Cálculo de Umbrales en UMA
                </span>
              </div>
            </v-card-item>
            <v-card-text class="pa-4">
              <div class="mb-3">
                <div class="text-caption text-grey-darken-1">Acto Jurídico Formalizado:</div>
                <div class="text-body-2 font-weight-bold text-grey-darken-3">
                  {{ avisoActual?.acto_juridico_nombre || 'Compraventa de Inmueble' }}
                  <span class="text-caption font-weight-regular text-grey">
                    ({{ avisoActual?.es_actividad_vulnerable ? 'Actividad Vulnerable Art. 17 Fracc. XII' : 'No Vulnerable' }})
                  </span>
                </div>
              </div>

              <v-row dense class="mb-2">
                <v-col cols="6">
                  <div class="text-caption text-grey-darken-1">Monto de la Operación:</div>
                  <div class="text-subtitle-2 font-mono font-weight-bold text-primary">
                    {{ formatearMontoMxn(avisoActual?.monto_operacion_mxn || 0) }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-grey-darken-1">UMA Vigente a la Fecha del Acto:</div>
                  <div class="text-subtitle-2 font-mono font-weight-bold">
                    $ {{ (dictamenActual?.uma_vigente || 108.57).toFixed(2) }} MXN
                  </div>
                </v-col>
              </v-row>

              <div class="bg-grey-lighten-5 rounded p-3 pa-3 border mb-3">
                <div class="d-flex justify-space-between align-center mb-1">
                  <span class="text-caption font-weight-medium text-grey-darken-2">Equivalente en UMAs:</span>
                  <span class="text-subtitle-2 font-mono font-weight-bold" :class="dictamenActual?.excede_umbral ? 'text-amber-darken-3' : 'text-success'">
                    {{ (dictamenActual?.monto_uma || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }} UMAs
                  </span>
                </div>
                <div class="d-flex justify-space-between align-center mb-2">
                  <span class="text-caption text-grey">Umbral Legal de Aviso:</span>
                  <span class="text-caption font-mono text-grey-darken-2">16,050.00 UMAs</span>
                </div>
                <v-progress-linear
                  :model-value="porcentajeUmbral"
                  :color="dictamenActual?.excede_umbral ? 'amber-darken-3' : 'success'"
                  height="8"
                  rounded
                />
                <div class="text-caption text-right text-grey mt-1">
                  {{ dictamenActual?.excede_umbral ? `Supera el umbral por ${((dictamenActual?.monto_uma || 0) - 16050).toLocaleString('es-MX', { maximumFractionDigits: 2 })} UMAs` : 'Dentro del margen exento' }}
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Tarjeta Derecha: Indicador de Vencimiento Legal Inteligente -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="rounded-lg h-100 bg-surface border">
            <v-card-item class="py-3 px-4 border-b bg-grey-lighten-5">
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-calendar-clock</v-icon>
                <span class="text-subtitle-2 font-weight-bold text-primary">
                  Indicador de Vencimiento Legal Inteligente
                </span>
              </div>
            </v-card-item>
            <v-card-text class="pa-4">
              <v-row dense class="mb-3">
                <v-col cols="12" sm="6">
                  <div class="text-caption text-grey-darken-1">Fecha Límite Base:</div>
                  <div class="text-body-2 font-weight-medium">
                    {{ fechaLimiteInfo.fecha_limite_base }} (Día 17)
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <div class="text-caption text-grey-darken-1">Prórroga por 6° Dígito RFC:</div>
                  <div class="text-body-2 font-weight-bold text-primary">
                    +{{ fechaLimiteInfo.dias_prorroga_rfc }} días hábiles (RMF)
                  </div>
                </v-col>
              </v-row>

              <div class="pa-3 rounded border mb-3" :class="fechaLimiteBoxClass">
                <div class="text-caption text-grey-darken-1">Fecha Límite Legal Efectiva:</div>
                <div class="text-h6 font-weight-bold" :class="fechaLimiteTextoClass">
                  {{ fechaLimiteInfo.fecha_limite_efectiva }}
                </div>
                <div class="d-flex align-center mt-1">
                  <v-icon size="16" :color="fechaLimiteInfo.semaforo_urgencia" class="mr-1">
                    {{ fechaLimiteInfo.semaforo_urgencia === 'rojo' ? 'mdi-alert-octagon' : (fechaLimiteInfo.semaforo_urgencia === 'amarillo' ? 'mdi-clock-alert' : 'mdi-clock-check') }}
                  </v-icon>
                  <span class="text-caption font-weight-bold" :class="`text-${fechaLimiteInfo.semaforo_urgencia}`">
                    {{ fechaLimiteInfo.texto_tiempo_restante }}
                  </span>
                </div>
              </div>

              <div class="text-caption text-grey">
                <v-icon size="14">mdi-information-outline</v-icon>
                Conforme al Art. 17 LFPIORPI y el CFF, la presentación extemporánea genera multas de 200 a 2,000 UMAs.
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 3. CÉDULA DE DATOS DEL AVISO (PREVISUALIZACIÓN TABULAR) -->
      <AvisosSatCedulaPreview
        :personas="personasCedula"
        :inmueble="inmuebleCedula"
        :pago="pagoCedula"
      />

      <!-- 4. SECCIÓN DE ACUSE OFICIAL DE ACEPTACIÓN SAT -->
      <v-card
        variant="outlined"
        class="rounded-lg pa-4 border"
        :class="avisoActual?.estatus === 'presentado' ? 'bg-green-lighten-5 border-success' : 'bg-grey-lighten-5'"
      >
        <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between ga-3">
          <div class="d-flex align-center ga-3">
            <v-icon
              size="32"
              :color="avisoActual?.estatus === 'presentado' ? 'success' : 'grey-darken-1'"
            >
              {{ avisoActual?.estatus === 'presentado' ? 'mdi-certificate' : 'mdi-file-clock-outline' }}
            </v-icon>
            <div>
              <div class="text-subtitle-2 font-weight-bold" :class="avisoActual?.estatus === 'presentado' ? 'text-success' : 'text-grey-darken-3'">
                {{ avisoActual?.estatus === 'presentado' ? 'Acuse Oficial de Aceptación SAT Registrado' : 'Aviso Pendiente de Carga en el Portal SPPLD' }}
              </div>
              <div v-if="avisoActual?.folio_acuse_sat" class="text-caption font-mono mt-1">
                <strong>Folio de Aceptación:</strong> {{ avisoActual.folio_acuse_sat }}
                <span v-if="avisoActual.fecha_presentacion_sat"> · Fecha: {{ avisoActual.fecha_presentacion_sat }}</span>
              </div>
              <div v-else class="text-caption text-grey">
                Una vez cargado el archivo XML en el portal SPPLD, registre el folio de aceptación emitido por el SAT para cumplir con el expediente inmutable.
              </div>
            </div>
          </div>

          <div class="d-flex ga-2">
            <v-btn
              v-if="avisoActual?.archivo_acuse_pdf_url"
              variant="outlined"
              color="success"
              size="small"
              prepend-icon="mdi-download"
              class="text-none"
              @click="onDescargarAcusePdf"
            >
              Descargar Acuse PDF
            </v-btn>
            <v-btn
              v-if="dictamenActual?.requiere_aviso"
              variant="tonal"
              :color="avisoActual?.estatus === 'presentado' ? 'success' : 'primary'"
              size="small"
              class="text-none"
              @click="modalAcuseVisible = true"
            >
              {{ avisoActual?.estatus === 'presentado' ? 'Editar Folio' : 'Registrar Acuse' }}
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Modales -->
    <AvisosSatRegistrarAcuseModal
      v-model="modalAcuseVisible"
      :aviso-id="avisoActual?.id"
      :folio-inicial="avisoActual?.folio_acuse_sat || ''"
      :guardando="guardando"
      @guardado="onGuardarAcuse"
    />

    <AvisosSatXmlPreviewModal
      v-model="modalXmlVisible"
      :nombre-archivo="ultimoXmlNombre"
      :contenido-xml="ultimoXmlContenido"
      @descargar="onDescargarXmlGuardado"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAvisosSat } from '~/composables/useAvisosSat';
import { useAvisosSatCalculos } from '~/composables/useAvisosSatCalculos';
import AvisosSatCedulaPreview from '~/components/avisosSat/AvisosSatCedulaPreview.vue';
import AvisosSatRegistrarAcuseModal from '~/components/avisosSat/modal/AvisosSatRegistrarAcuseModal.vue';
import AvisosSatXmlPreviewModal from '~/components/avisosSat/modal/AvisosSatXmlPreviewModal.vue';
import { descargarArchivoXmlEnNavegador } from '~/utils/xmlGeneradorAvisosSat';

const props = defineProps<{
  escrituraId: string;
  estatusEscritura?: string;
}>();

const emit = defineEmits<{
  (e: 'status-change'): void;
}>();

const {
  avisoActual,
  dictamenActual,
  cargando,
  guardando,
  error,
  cargarAvisoEscritura,
  generarXmlIndividualPorEscritura,
  registrarAcuseSat,
  emitirCedulaPdf,
} = useAvisosSat(props.escrituraId);

const { calcularFechaLimiteSat, formatearMontoMxn } = useAvisosSatCalculos();

const modalAcuseVisible = ref(false);
const modalXmlVisible = ref(false);
const ultimoXmlNombre = ref('aviso_sppld.xml');
const ultimoXmlContenido = ref('');

onMounted(async () => {
  await cargarAviso();
});

async function cargarAviso() {
  await cargarAvisoEscritura(props.escrituraId);
}

// Fechas y Vencimiento inteligente
const fechaLimiteInfo = computed(() => {
  const fechaActo = avisoActual.value?.fecha_acto || new Date().toISOString().slice(0, 10);
  return calcularFechaLimiteSat(fechaActo, 'MER750812AB1');
});

// Semáforo y estilos
const semaforoColor = computed(() => {
  if (dictamenActual.value?.tipo_aviso === '24_horas') return 'error';
  if (dictamenActual.value?.tipo_aviso === 'ordinario') return 'amber-darken-3';
  return 'grey';
});

const semaforoIcono = computed(() => {
  if (dictamenActual.value?.tipo_aviso === '24_horas') return 'mdi-alert-octagon';
  if (dictamenActual.value?.tipo_aviso === 'ordinario') return 'mdi-alert-circle-outline';
  return 'mdi-check-circle-outline';
});

const tituloSemaforo = computed(() => {
  if (dictamenActual.value?.tipo_aviso === '24_horas') {
    return 'ALERTA: Aviso Urgente de 24 Horas Requerido (LPB)';
  }
  if (dictamenActual.value?.tipo_aviso === 'ordinario') {
    return 'Sujeta a Aviso Ordinario SAT (LFPIORPI Art. 17 Fracc. XII)';
  }
  return 'Operación Exenta de Aviso Ordinario ante el SAT';
});

const semaforoCardClass = computed(() => {
  if (dictamenActual.value?.tipo_aviso === '24_horas') return 'bg-red-lighten-5 border-error';
  if (dictamenActual.value?.tipo_aviso === 'ordinario') return 'bg-amber-lighten-5 border-amber-darken-2';
  return 'bg-grey-lighten-5';
});

const semaforoTextoClass = computed(() => {
  if (dictamenActual.value?.tipo_aviso === '24_horas') return 'text-error';
  if (dictamenActual.value?.tipo_aviso === 'ordinario') return 'text-amber-darken-4';
  return 'text-grey-darken-3';
});

const fechaLimiteBoxClass = computed(() => {
  if (fechaLimiteInfo.value.semaforo_urgencia === 'rojo') return 'bg-red-lighten-5 border-error';
  if (fechaLimiteInfo.value.semaforo_urgencia === 'amarillo') return 'bg-amber-lighten-5 border-amber-darken-2';
  return 'bg-green-lighten-5 border-success';
});

const fechaLimiteTextoClass = computed(() => {
  if (fechaLimiteInfo.value.semaforo_urgencia === 'rojo') return 'text-error';
  if (fechaLimiteInfo.value.semaforo_urgencia === 'amarillo') return 'text-amber-darken-4';
  return 'text-success';
});

const porcentajeUmbral = computed(() => {
  const montoUma = dictamenActual.value?.monto_uma || 0;
  return Math.min(100, Math.round((montoUma / 16050) * 100));
});

// Datos para la cédula de previsualización
const personasCedula = computed(() => {
  return [
    {
      rol: 'Enajenante',
      nombre: 'Valero Desarrollos S.A. de C.V.',
      rfc: 'VDE180412KJ9',
      beneficiarioControlador: 'Lic. Roberto Gómez',
    },
    {
      rol: 'Adquirente',
      nombre: 'Dr. Mauricio Gómez Alcántara',
      rfc: 'GOAM820914P44',
      curp: 'GOAM820914HDFLR02',
    },
  ];
});

const inmuebleCedula = computed(() => {
  return {
    descripcion: 'Lote 14 Manzana 3, Fraccionamiento Lomas Altas',
    ubicacion: 'Av. Reforma 505, Miguel Hidalgo, CDMX',
    folioReal: '982314-CDMX',
  };
});

const pagoCedula = computed(() => {
  return {
    formaPago: 'Transferencia electrónica SPEI',
    institucionBancaria: 'BBVA México -> Santander',
    claveRastreo: 'SPEI202608124001',
    montoEfectivo: 0,
    cumpleTopeEfectivo: true,
  };
});

// Acciones
async function onGenerarXml() {
  try {
    const res = await generarXmlIndividualPorEscritura(props.escrituraId);
    ultimoXmlNombre.value = res.nombreArchivo;
    ultimoXmlContenido.value = res.contenidoXml;
    modalXmlVisible.value = true;
    emit('status-change');
  } catch (e) {
    console.error('Error al generar XML', e);
  }
}

function onDescargarPdf() {
  emitirCedulaPdf({
    numeroInstrumento: avisoActual.value?.numero_instrumento || 'S/N',
    fechaActo: avisoActual.value?.fecha_acto || 'Fecha no registrada',
    actoJuridico: avisoActual.value?.acto_juridico_nombre || 'Acto Notarial',
    montoOperacionMxn: avisoActual.value?.monto_operacion_mxn || 0,
    montoOperacionUma: avisoActual.value?.monto_operacion_uma || 0,
    umaVigente: dictamenActual.value?.uma_vigente || 108.57,
    calificacionAviso: tituloSemaforo.value,
    fechaLimiteBase: fechaLimiteInfo.value.fecha_limite_base,
    diasProrrogaRfc: fechaLimiteInfo.value.dias_prorroga_rfc,
    fechaLimiteEfectiva: fechaLimiteInfo.value.fecha_limite_efectiva,
    estatusAviso: avisoActual.value?.estatus || 'pendiente',
    folioAcuseSat: avisoActual.value?.folio_acuse_sat,
    fechaPresentacionSat: avisoActual.value?.fecha_presentacion_sat,
    personas: personasCedula.value,
    inmueble: inmuebleCedula.value,
    pago: pagoCedula.value,
  });
}

async function onGuardarAcuse(payload: {
  folioAcuse: string;
  fechaPresentacion: string;
  archivoPdf?: File;
  notas?: string;
}) {
  if (!avisoActual.value?.id) {
    // Si aún no tenía ID en la BD, lo forzamos a crearse primero o emitimos cambio
    await onGenerarXml();
  }
  if (avisoActual.value?.id) {
    await registrarAcuseSat(
      avisoActual.value.id,
      payload.folioAcuse,
      payload.fechaPresentacion,
      payload.archivoPdf
    );
  }
  modalAcuseVisible.value = false;
  emit('status-change');
}

function onDescargarXmlGuardado() {
  descargarArchivoXmlEnNavegador(ultimoXmlNombre.value, ultimoXmlContenido.value);
}

function onDescargarAcusePdf() {
  if (avisoActual.value?.archivo_acuse_pdf_url) {
    window.open(avisoActual.value.archivo_acuse_pdf_url, '_blank');
  }
}
</script>

<style scoped>
.avisos-tab {
  width: 100%;
}
.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
