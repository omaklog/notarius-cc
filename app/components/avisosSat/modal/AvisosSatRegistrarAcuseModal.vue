<template>
  <v-dialog v-model="dialogVisible" max-width="560px" persistent>
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-2">
        <v-icon class="mr-2">mdi-check-decagram-outline</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Registrar Acuse Oficial de Aceptación SAT
        </v-toolbar-title>
        <v-btn icon="mdi-close" variant="text" size="small" @click="dialogVisible = false" />
      </v-toolbar>

      <v-card-text class="pa-4">
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
          icon="mdi-shield-check"
        >
          Capture los datos del comprobante oficial emitido por el portal SPPLD del SAT tras la carga exitosa del archivo XML.
        </v-alert>

        <v-form ref="formRef" v-model="valido" @submit.prevent="guardar">
          <v-text-field
            v-model="folioAcuse"
            label="Folio Oficial de Aceptación SAT *"
            placeholder="Ej. SAT-SPPLD-2026-98124"
            prepend-inner-icon="mdi-ticket-confirmation-outline"
            density="compact"
            variant="outlined"
            :rules="[v => !!v || 'El folio de aceptación es obligatorio']"
            class="mb-3 font-mono"
          />

          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="fechaPresentacion"
                label="Fecha de Presentación *"
                type="date"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-calendar"
                :rules="[v => !!v || 'La fecha es obligatoria']"
                class="mb-3"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="horaPresentacion"
                label="Hora de Presentación"
                type="time"
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-clock-outline"
                class="mb-3"
              />
            </v-col>
          </v-row>

          <v-file-input
            v-model="archivoPdf"
            label="Adjuntar Acuse Oficial (PDF emitido por el SAT)"
            accept="application/pdf"
            prepend-inner-icon="mdi-file-pdf-box"
            density="compact"
            variant="outlined"
            show-size
            class="mb-3"
          />

          <v-textarea
            v-model="notas"
            label="Observaciones o Referencias Internas"
            density="compact"
            variant="outlined"
            rows="2"
            auto-grow
            placeholder="Opcional: Detalles del envío o acuse..."
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
          prepend-icon="mdi-check"
          :loading="guardando"
          :disabled="!valido || !folioAcuse"
          @click="guardar"
        >
          Guardar Acuse Oficial
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  avisoId?: string;
  folioInicial?: string;
  guardando?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'guardado', payload: {
    folioAcuse: string;
    fechaPresentacion: string;
    archivoPdf?: File;
    notas?: string;
  }): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const formRef = ref<any>(null);
const valido = ref(false);

const folioAcuse = ref('');
const fechaPresentacion = ref(new Date().toISOString().slice(0, 10));
const horaPresentacion = ref(new Date().toTimeString().slice(0, 5));
const archivoPdf = ref<File | null>(null);
const notas = ref('');

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      folioAcuse.value = props.folioInicial || '';
      fechaPresentacion.value = new Date().toISOString().slice(0, 10);
      horaPresentacion.value = new Date().toTimeString().slice(0, 5);
      archivoPdf.value = null;
      notas.value = '';
    }
  }
);

function guardar() {
  if (!folioAcuse.value) return;

  const fechaHoraCompleta = `${fechaPresentacion.value} ${horaPresentacion.value || '12:00'}:00`;

  emit('guardado', {
    folioAcuse: folioAcuse.value.trim(),
    fechaPresentacion: fechaHoraCompleta,
    archivoPdf: archivoPdf.value || undefined,
    notas: notas.value?.trim(),
  });
}
</script>
