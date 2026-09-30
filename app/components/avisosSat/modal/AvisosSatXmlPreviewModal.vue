<template>
  <v-dialog v-model="dialogVisible" max-width="800px">
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="compact" class="px-2">
        <v-icon class="mr-2">mdi-xml</v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Estructura del Layout XML (Portal SPPLD)
        </v-toolbar-title>
        <v-spacer />
        <v-btn
          variant="tonal"
          size="small"
          class="mr-2 text-none"
          prepend-icon="mdi-content-copy"
          @click="copiarAlPortapapeles"
        >
          {{ copiado ? '¡Copiado!' : 'Copiar XML' }}
        </v-btn>
        <v-btn
          color="amber-darken-3"
          variant="elevated"
          size="small"
          class="mr-2 text-none"
          prepend-icon="mdi-download"
          @click="descargar"
        >
          Descargar .xml
        </v-btn>
        <v-btn icon="mdi-close" variant="text" size="small" @click="dialogVisible = false" />
      </v-toolbar>

      <v-card-text class="pa-4 bg-grey-lighten-4">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-mono text-grey-darken-2 font-weight-bold">
            {{ nombreArchivo }}
          </span>
          <v-chip size="x-small" color="primary" variant="tonal">
            UTF-8 · XML Validado
          </v-chip>
        </div>

        <div
          class="border rounded pa-3 bg-grey-darken-4 text-grey-lighten-3 font-mono text-caption overflow-auto"
          style="max-height: 480px; white-space: pre-wrap; word-break: break-all; line-height: 1.5;"
        >
          {{ contenidoXml }}
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 bg-grey-lighten-5">
        <span class="text-caption text-grey">
          Archivo listo para subir en el Portal SPPLD (Módulo Fedatarios Públicos)
        </span>
        <v-spacer />
        <v-btn variant="plain" @click="dialogVisible = false">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  nombreArchivo?: string;
  contenidoXml?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'descargar'): void;
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const copiado = ref(false);

async function copiarAlPortapapeles() {
  if (!props.contenidoXml) return;
  try {
    await navigator.clipboard.writeText(props.contenidoXml);
    copiado.value = true;
    setTimeout(() => {
      copiado.value = false;
    }, 2000);
  } catch (e) {
    console.error('Error al copiar al portapapeles', e);
  }
}

function descargar() {
  emit('descargar');
}
</script>
