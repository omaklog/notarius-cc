<script setup lang="ts">
import { ref, watch } from "vue";
import { useExpedientes } from "~/composables/useExpedientes";

const props = defineProps<{
  modelValue: boolean;
  escrituraId: string;
  requisitosFaltantes: Array<{
    tipo_documento_id: string;
    tipo_documento_nombre: string;
  }>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "dispensa-guardada"): void;
}>();

const { registrarDispensa } = useExpedientes();

const tipoSeleccionado = ref<string>(props.requisitosFaltantes?.[0]?.tipo_documento_id || "");
const motivo = ref<string>("");
const guardando = ref(false);
const errorMsg = ref<string | null>(null);

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      tipoSeleccionado.value = props.requisitosFaltantes[0]?.tipo_documento_id || "";
      motivo.value = "";
      errorMsg.value = null;
    }
  }
);

async function handleAutorizarDispensa(): Promise<void> {
  if (!props.escrituraId || !tipoSeleccionado.value || !motivo.value.trim()) {
    errorMsg.value = "Debes seleccionar un requisito y redactar el motivo fundado.";
    return;
  }

  guardando.value = true;
  errorMsg.value = null;

  try {
    await registrarDispensa(props.escrituraId, tipoSeleccionado.value, motivo.value.trim());
    emit("dispensa-guardada");
    emit("update:modelValue", false);
  } catch (err: any) {
    errorMsg.value = err.message || "Error al registrar la dispensa notarial";
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="580px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="bg-white">
      <v-card-title class="pa-4 bg-grey-lighten-4 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-2">
          <v-avatar color="#A9762E" variant="tonal" size="36">
            <v-icon size="20" color="#A9762E">mdi-shield-edit</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold" style="color: #1B3A5F;">
              Autorizar Dispensa Notarial
            </div>
            <div class="text-caption text-medium-emphasis">
              Excepción fundada a requisito documental obligatorio
            </div>
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="emit('update:modelValue', false)" />
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert
          variant="tonal"
          color="#A9762E"
          density="compact"
          icon="mdi-alert-circle-outline"
          class="mb-4"
        >
          <div class="text-caption">
            <strong>Facultad Notarial:</strong> La dispensa permite protocolizar ante la falta justificada de un requisito (ej. boleta en trámite oficial o trámite con fianza). Se estampará tu usuario, fecha y justificación en la bitácora de auditoría.
          </div>
        </v-alert>

        <v-select
          v-model="tipoSeleccionado"
          :items="requisitosFaltantes"
          item-title="tipo_documento_nombre"
          item-value="tipo_documento_id"
          label="Documento a Dispensar *"
          variant="outlined"
          density="comfortable"
          class="mb-3"
        />

        <v-textarea
          v-model="motivo"
          label="Motivo Fundado de la Dispensa *"
          variant="outlined"
          rows="4"
          density="comfortable"
          placeholder="Fundamente las razones jurídicas u operativas por las que se autoriza continuar el trámite sin este documento..."
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
          color="#A9762E"
          variant="elevated"
          class="text-white font-weight-medium"
          :loading="guardando"
          prepend-icon="mdi-check-bold"
          @click="handleAutorizarDispensa"
        >
          Autorizar Dispensa
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
