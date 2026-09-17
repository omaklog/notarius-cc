<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ExpedienteItemConsolidado } from "~/types/expedientes";
import { useExpedienteDocumentos } from "~/composables/useExpedienteDocumentos";

const props = defineProps<{
  modelValue: boolean;
  documento: ExpedienteItemConsolidado | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "asentar-cotejo", documentoId: string): void;
}>();

const { obtenerUrlFirmada } = useExpedienteDocumentos();

const urlFirmada = ref<string>("");
const loading = ref(false);
const zoomLevel = ref(100);

const esPdf = computed(() => {
  if (!props.documento) return false;
  return (
    props.documento.mime_type === "application/pdf" ||
    props.documento.archivo_nombre?.toLowerCase().endsWith(".pdf")
  );
});

async function cargarUrl(): Promise<void> {
  if (!props.documento) {
    urlFirmada.value = "";
    return;
  }

  loading.value = true;
  try {
    urlFirmada.value = await obtenerUrlFirmada(props.documento.archivo_path, 120);
  } catch (err) {
    console.error("No se pudo obtener URL firmada para visor:", err);
    urlFirmada.value = "";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.documento,
  () => {
    zoomLevel.value = 100;
    if (props.modelValue) {
      cargarUrl();
    }
  },
  { immediate: true }
);

watch(
  () => props.modelValue,
  (val) => {
    if (val && !urlFirmada.value) {
      cargarUrl();
    }
  }
);

function zoomIn(): void {
  if (zoomLevel.value < 200) zoomLevel.value += 25;
}

function zoomOut(): void {
  if (zoomLevel.value > 50) zoomLevel.value -= 25;
}

function zoomReset(): void {
  zoomLevel.value = 100;
}

function handleDownload(): void {
  if (urlFirmada.value) {
    window.open(urlFirmada.value, "_blank");
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="bg-white">
      <!-- Barra superior de título y controles -->
      <v-card-title class="pa-4 bg-grey-lighten-4 border-b d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center ga-3">
          <v-icon color="#1B3A5F" size="24">
            {{ esPdf ? 'mdi-file-pdf-box' : 'mdi-file-image-outline' }}
          </v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold" style="color: #1B3A5F;">
              {{ documento?.archivo_nombre || 'Visor de Documento Notarial' }}
            </div>
            <div class="text-caption text-medium-emphasis d-flex align-center ga-2">
              <span class="text-capitalize">{{ documento?.categoria?.replace(/_/g, ' ') }}</span>
              <span>•</span>
              <span>{{ documento?.origen_documento === 'compareciente' ? 'Compareciente: ' + (documento.compareciente_nombre || 'KYC') : 'Instrumento Notarial' }}</span>
            </div>
          </div>
        </div>

        <div class="d-flex align-center ga-2">
          <!-- Controles de zoom si es imagen -->
          <template v-if="!esPdf">
            <v-btn icon="mdi-magnify-minus-outline" variant="text" density="compact" @click="zoomOut" />
            <span class="text-caption font-weight-medium">{{ zoomLevel }}%</span>
            <v-btn icon="mdi-magnify-plus-outline" variant="text" density="compact" @click="zoomIn" />
            <v-btn icon="mdi-refresh" variant="text" density="compact" title="Restablecer zoom" @click="zoomReset" />
          </template>

          <v-btn
            variant="tonal"
            color="#1B3A5F"
            size="small"
            prepend-icon="mdi-download"
            :disabled="!urlFirmada"
            @click="handleDownload"
          >
            Descargar
          </v-btn>

          <v-btn icon="mdi-close" variant="text" size="small" @click="emit('update:modelValue', false)" />
        </div>
      </v-card-title>

      <!-- Panel de fe notarial de cotejo si está cotejado -->
      <div
        v-if="documento?.cotejado_contra_original"
        class="pa-3 border-b d-flex align-center justify-space-between flex-wrap ga-2"
        style="background: #F4E8D6;"
      >
        <div class="d-flex align-center ga-2">
          <v-icon color="#A9762E" size="22">mdi-seal</v-icon>
          <div>
            <div class="text-caption font-weight-bold" style="color: #5C3E14;">
              DOCUMENTO COTEJADO CONTRA {{ (documento.tipo_documento_exhibido || 'ORIGINAL').toUpperCase() }} EXHIBIDO
            </div>
            <div class="text-caption" style="color: #5C3E14;">
              Fe Notarial por {{ documento.cotejador_nombre || 'Abogado Cotejador' }} el {{ documento.fecha_cotejo ? new Date(documento.fecha_cotejo).toLocaleDateString('es-MX') : 'Fecha registrada' }}
            </div>
          </div>
        </div>
      </div>
      <div
        v-else
        class="pa-3 border-b d-flex align-center justify-space-between flex-wrap ga-2 bg-grey-lighten-4"
      >
        <div class="text-caption text-medium-emphasis d-flex align-center ga-1">
          <v-icon size="16" color="grey">mdi-file-outline</v-icon>
          <span>Documento registrado como copia digital simple (sin fe de cotejo aún).</span>
        </div>
        <v-btn
          v-if="documento"
          size="x-small"
          variant="tonal"
          color="#A9762E"
          prepend-icon="mdi-stamp"
          @click="emit('asentar-cotejo', documento.documento_id)"
        >
          Asentar Fe de Cotejo
        </v-btn>
      </div>

      <!-- Cuerpo del visor -->
      <v-card-text class="pa-4 d-flex justify-center align-center" style="min-height: 500px; max-height: 75vh; overflow: auto; background: #F0F2F4;">
        <v-progress-circular v-if="loading" indeterminate color="#1B3A5F" />

        <div v-else-if="!urlFirmada" class="text-center pa-8 text-medium-emphasis">
          <v-icon size="48" color="grey" class="mb-2">mdi-file-alert-outline</v-icon>
          <div class="text-body-2">No se pudo cargar la vista previa del archivo.</div>
          <div class="text-caption">Verifica los permisos de storage o intenta descargarlo directamente.</div>
        </div>

        <iframe
          v-else-if="esPdf"
          :src="urlFirmada"
          width="100%"
          height="600px"
          style="border: none; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
        />

        <div v-else class="text-center">
          <img
            :src="urlFirmada"
            :alt="documento?.archivo_nombre"
            :style="{ width: zoomLevel + '%', maxWidth: 'none', transition: 'width 0.2s' }"
            style="border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          />
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
