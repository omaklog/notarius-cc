<template>
  <v-dialog v-model="dialogVisible" max-width="540px" persistent>
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-2">
        <v-icon class="mr-2">mdi-file-document-check-outline</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Declarar Informe Mensual en Ceros (SAT SPPLD)
        </v-toolbar-title>
        <v-btn icon="mdi-close" variant="text" size="small" @click="dialogVisible = false" />
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
          icon="mdi-shield-alert-outline"
        >
          <strong>Periodo {{ nombreMes }} {{ periodoAnio }}:</strong> Conforme a las Reglas de Carácter General de la LFPIORPI, si en el mes no se realizaron actos u operaciones que superen el umbral de aviso, debe presentarse el informe en ceros a más tardar el día 17 del mes siguiente.
        </v-alert>

        <v-form ref="formRef" v-model="valido" @submit.prevent="confirmar">
          <v-text-field
            v-model="folioAcuse"
            label="Folio de Aceptación Oficial SAT *"
            placeholder="Ej. SAT-CEROS-2026-10492"
            prepend-inner-icon="mdi-ticket-confirmation-outline"
            density="compact"
            variant="outlined"
            :rules="[v => !!v || 'El folio de acuse es obligatorio']"
            class="mb-3 font-mono"
          />

          <v-text-field
            v-model="fechaPresentacion"
            label="Fecha de Presentación *"
            type="date"
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-calendar"
            :rules="[v => !!v || 'La fecha de presentación es obligatoria']"
            class="mb-3"
          />

          <v-file-input
            v-model="archivoPdf"
            label="Adjuntar Comprobante SAT (PDF)"
            accept="application/pdf"
            prepend-inner-icon="mdi-file-pdf-box"
            density="compact"
            variant="outlined"
            show-size
            class="mb-2"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5">
        <v-spacer />
        <v-btn variant="plain" :disabled="guardando" @click="dialogVisible = false">
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-check-bold"
          :loading="guardando"
          :disabled="!valido || !folioAcuse"
          @click="confirmar"
        >
          Asentar Informe en Ceros
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  periodoAnio: number;
  periodoMes: number;
  guardando?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'declarar', payload: {
    folioAcuse: string;
    fechaPresentacion: string;
    archivoPdf?: File;
  }): void;
}>();

const formRef = ref<any>(null);
const valido = ref(false);
const folioAcuse = ref('');
const fechaPresentacion = ref(new Date().toISOString().slice(0, 10));
const archivoPdf = ref<File | null>(null);

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const nombreMes = computed(() => MESES[(props.periodoMes || 1) - 1] || 'Periodo');

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      folioAcuse.value = '';
      fechaPresentacion.value = new Date().toISOString().slice(0, 10);
      archivoPdf.value = null;
    }
  }
);

function confirmar() {
  if (!folioAcuse.value) return;

  emit('declarar', {
    folioAcuse: folioAcuse.value.trim(),
    fechaPresentacion: fechaPresentacion.value,
    archivoPdf: archivoPdf.value || undefined,
  });
}

defineExpose({
  nombreMes,
  folioAcuse,
  fechaPresentacion,
  confirmar,
});
</script>

<style scoped>
.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
