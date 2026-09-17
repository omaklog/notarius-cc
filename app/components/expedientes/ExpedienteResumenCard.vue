<script setup lang="ts">
import { computed } from "vue";
import type { EvaluacionExpedienteResumen } from "~/types/expedientes";

const props = defineProps<{
  evaluacion: EvaluacionExpedienteResumen | null;
  loading?: boolean;
  seleccionadosCount?: number;
}>();

const emit = defineEmits<{
  (e: "subir-documento"): void;
  (e: "descargar-zip"): void;
  (e: "compilar-pdf"): void;
  (e: "solicitar-dispensa"): void;
  (e: "actualizar"): void;
}>();

const totalRequisitos = computed(() => props.evaluacion?.total_requisitos || 0);
const totalCumplidos = computed(() => props.evaluacion?.total_cumplidos || 0);
const totalObligatorios = computed(() => props.evaluacion?.total_obligatorios || 0);
const obligatoriosCumplidos = computed(() => props.evaluacion?.obligatorios_cumplidos || 0);

const porcentaje = computed(() => {
  if (totalRequisitos.value === 0) return 100;
  return Math.round((totalCumplidos.value / totalRequisitos.value) * 100);
});

const semaforo = computed(() => props.evaluacion?.semaforo || "verde");

const semaforoConfig = computed(() => {
  switch (semaforo.value) {
    case "rojo":
      return {
        color: "#B23A34",
        bg: "#FADBD8",
        icon: "mdi-alert-circle",
        titulo: "Expediente Incompleto",
        mensaje: `Faltan ${props.evaluacion?.obligatorios_faltantes.length || 0} requisitos obligatorios para autorizar protocolización.`,
      };
    case "amarillo":
      return {
        color: "#A9762E",
        bg: "#F4E8D6",
        icon: "mdi-alert",
        titulo: "Integración Parcial",
        mensaje: props.evaluacion?.titulos_o_poderes_sin_cotejo.length
          ? "Documentos críticos pendientes de cotejo físico notarial."
          : "Obligatorios completos. Faltan documentos opcionales complementarios.",
      };
    case "verde":
    default:
      return {
        color: "#2F6F4E",
        bg: "#D6EEDF",
        icon: "mdi-check-decagram",
        titulo: "Expediente Completo",
        mensaje: "Requisitos documentales y cotejos conformes para firma y protocolización.",
      };
  }
});
</script>

<template>
  <v-card variant="outlined" class="mb-4 bg-white pa-4">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <!-- Indicador principal de semáforo -->
      <div class="d-flex align-center ga-3">
        <v-avatar :color="semaforoConfig.color" variant="flat" size="44">
          <v-icon color="white" size="24">{{ semaforoConfig.icon }}</v-icon>
        </v-avatar>
        <div>
          <div class="d-flex align-center ga-2">
            <span class="text-subtitle-1 font-weight-bold" :style="{ color: semaforoConfig.color }">
              {{ semaforoConfig.titulo }}
            </span>
            <v-chip size="x-small" :color="semaforoConfig.color" variant="tonal" class="font-weight-medium">
              {{ porcentaje }}% Integrado
            </v-chip>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ semaforoConfig.mensaje }}
          </div>
        </div>
      </div>

      <!-- Barra de acciones rápidas -->
      <div class="d-flex flex-wrap align-center ga-2">
        <v-btn
          variant="outlined"
          color="#1B3A5F"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="emit('actualizar')"
        >
          Actualizar
        </v-btn>

        <v-btn
          v-if="evaluacion && !evaluacion.permite_protocolizar"
          variant="tonal"
          color="#A9762E"
          size="small"
          prepend-icon="mdi-shield-edit"
          @click="emit('solicitar-dispensa')"
        >
          Dispensa Notarial
        </v-btn>

        <v-btn
          variant="outlined"
          color="#1B3A5F"
          size="small"
          prepend-icon="mdi-folder-zip-outline"
          :disabled="!totalCumplidos"
          @click="emit('descargar-zip')"
        >
          Descargar (.ZIP)
          <v-badge
            v-if="seleccionadosCount && seleccionadosCount > 0"
            :content="seleccionadosCount"
            color="#A9762E"
            inline
            class="ml-1"
          />
        </v-btn>

        <v-btn
          variant="outlined"
          color="#1B3A5F"
          size="small"
          prepend-icon="mdi-file-pdf-box"
          :disabled="!totalCumplidos"
          @click="emit('compilar-pdf')"
        >
          Compilar (.PDF)
        </v-btn>

        <v-btn
          color="#1B3A5F"
          variant="elevated"
          size="small"
          class="text-white font-weight-medium"
          prepend-icon="mdi-plus"
          @click="emit('subir-documento')"
        >
          Adjuntar Documento
        </v-btn>
      </div>
    </div>

    <!-- Progreso y métricas -->
    <v-progress-linear
      :model-value="porcentaje"
      :color="semaforoConfig.color"
      height="8"
      rounded
      class="mb-3"
    />

    <v-row density="compact">
      <v-col cols="12" sm="4">
        <div class="d-flex align-center ga-2 pa-2 rounded bg-grey-lighten-4">
          <v-icon size="20" color="#1B3A5F">mdi-file-document-check</v-icon>
          <div>
            <div class="text-caption font-weight-medium text-medium-emphasis">Requisitos Cumplidos</div>
            <div class="text-body-2 font-weight-bold" style="color: #1B3A5F;">
              {{ totalCumplidos }} de {{ totalRequisitos }} totales
            </div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" sm="4">
        <div class="d-flex align-center ga-2 pa-2 rounded bg-grey-lighten-4">
          <v-icon size="20" color="#A9762E">mdi-check-all</v-icon>
          <div>
            <div class="text-caption font-weight-medium text-medium-emphasis">Obligatorios Cubiertos</div>
            <div class="text-body-2 font-weight-bold" style="color: #A9762E;">
              {{ obligatoriosCumplidos }} de {{ totalObligatorios }} obligatorios
            </div>
          </div>
        </div>
      </v-col>

      <v-col cols="12" sm="4">
        <div class="d-flex align-center ga-2 pa-2 rounded bg-grey-lighten-4">
          <v-icon size="20" :color="evaluacion?.permite_protocolizar ? '#2F6F4E' : '#B23A34'">
            {{ evaluacion?.permite_protocolizar ? 'mdi-shield-check' : 'mdi-shield-lock' }}
          </v-icon>
          <div>
            <div class="text-caption font-weight-medium text-medium-emphasis">Gate de Protocolización</div>
            <div
              class="text-body-2 font-weight-bold"
              :style="{ color: evaluacion?.permite_protocolizar ? '#2F6F4E' : '#B23A34' }"
            >
              {{ evaluacion?.permite_protocolizar ? 'Habilitada' : 'Bloqueada' }}
            </div>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
