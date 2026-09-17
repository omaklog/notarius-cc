<script setup lang="ts">
import { ref, watch } from "vue";
import type { TipoDocumentoExhibido } from "~/types/expedientes";
import { useExpedientes } from "~/composables/useExpedientes";

const props = defineProps<{
  modelValue: boolean;
  documentoId: string | null;
  documentoNombre?: string | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "cotejo-guardado"): void;
}>();

const { asentarCotejo } = useExpedientes();

const tipoExhibido = ref<TipoDocumentoExhibido>('original')
const notas = ref<string>('Documento original tenido a la vista en la notaría, concordando fielmente con el archivo digital.')
const guardando = ref(false);
const errorMsg = ref<string | null>(null);

const tiposOpciones = [
  {
    title: "Original exhibido físicamente",
    value: "original",
    subtitle: "Se tuvo a la vista el documento original con firmas u hologramas oficiales.",
  },
  {
    title: "Copia Certificada notarial/oficial",
    value: "copia_certificada",
    subtitle: "Copia certificada expedida por Notario Público o autoridad competente.",
  },
  {
    title: "Copia simple",
    value: "copia_simple",
    subtitle: "Documento digitalizado sin cotejo contra original físico.",
  },
];

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      tipoExhibido.value = "original";
      notas.value = "Documento original tenido a la vista en la notaría, concordando fielmente con el archivo digital.";
      errorMsg.value = null;
    }
  }
);

async function handleGuardarCotejo(): Promise<void> {
  if (!props.documentoId) return;

  guardando.value = true;
  errorMsg.value = null;

  try {
    await asentarCotejo(props.documentoId, tipoExhibido.value, notas.value);
    emit("cotejo-guardado");
    emit("update:modelValue", false);
  } catch (err: any) {
    errorMsg.value = err.message || "Error al asentar fe de cotejo notarial";
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="bg-white">
      <v-card-title class="pa-4 bg-grey-lighten-4 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-2">
          <v-avatar color="#A9762E" variant="tonal" size="36">
            <v-icon size="20" color="#A9762E">mdi-seal</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold" style="color: #1B3A5F;">
              Asentar Fe Notarial de Cotejo
            </div>
            <div class="text-caption text-medium-emphasis">
              Certificación notarial de documento exhibido físicamente
            </div>
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Alerta de responsabilidad notarial -->
        <v-alert
          variant="tonal"
          color="#A9762E"
          density="compact"
          icon="mdi-certificate-outline"
          class="mb-4"
        >
          <div class="text-caption">
            <strong>Fe Pública Notarial:</strong> Al marcar como <em>Original</em> o <em>Copia Certificada</em>, el sistema estampará tu usuario, fecha y hora de forma inmutable, satisfaciendo el requisito legal de cotejo.
          </div>
        </v-alert>

        <div v-if="documentoNombre" class="mb-4 pa-2 rounded bg-grey-lighten-4 text-caption d-flex align-center ga-2">
          <v-icon size="16" color="#1B3A5F">mdi-file-document-outline</v-icon>
          <span>Documento a certificar: <strong>{{ documentoNombre }}</strong></span>
        </div>

        <v-select
          v-model="tipoExhibido"
          :items="tiposOpciones"
          item-title="title"
          item-value="value"
          label="Tipo de Documento Exhibido en Notaría *"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps" :subtitle="item?.raw?.subtitle || ''" />
          </template>
        </v-select>

        <v-textarea
          v-model="notas"
          label="Notas y Observaciones del Cotejo"
          variant="outlined"
          rows="3"
          density="comfortable"
          placeholder="Anotaciones sobre sellos, folios o estado del documento físico..."
          class="mb-2"
        />

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-2"
          closable
          @click:close="errorMsg = null"
        >
          {{ errorMsg }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 d-flex justify-end ga-2">
        <v-btn
          variant="text"
          color="secondary"
          :disabled="guardando"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </v-btn>

        <v-btn
          color="#1B3A5F"
          variant="elevated"
          class="text-white font-weight-medium"
          :loading="guardando"
          prepend-icon="mdi-stamp"
          @click="handleGuardarCotejo"
        >
          Asentar Fe de Cotejo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
