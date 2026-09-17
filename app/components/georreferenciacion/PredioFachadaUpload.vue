<template>
  <div class="predio-fachada-upload">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-2 font-weight-bold text-grey-darken-4 d-flex align-center">
        <v-icon icon="mdi-camera-outline" size="20" class="mr-1.5 text-primary" />
        <span>Fotografía de Fachada y Acceso</span>
      </div>

      <v-chip size="x-small" color="secondary" variant="tonal" class="font-weight-medium">
        Expediente Digital
      </v-chip>
    </div>

    <!-- Si ya cuenta con fotografía cargada -->
    <div v-if="fotoUrl" class="position-relative border border-grey-lighten-2 rounded-lg overflow-hidden bg-grey-lighten-4">
      <v-img
        :src="fotoUrl"
        height="180"
        cover
        class="align-end"
      >
        <div class="d-flex align-center justify-space-between w-100 pa-2 bg-gradient-dark text-white">
          <span class="text-caption font-weight-medium text-truncate">
            Testigo de Fachada Registrado
          </span>
          <div class="d-flex align-center gap-1">
            <v-btn
              icon
              size="x-small"
              variant="flat"
              color="white"
              class="text-grey-darken-4"
              :href="fotoUrl"
              target="_blank"
            >
              <v-icon icon="mdi-eye-outline" size="16" />
            </v-btn>
            <v-btn
              v-if="editable"
              icon
              size="x-small"
              variant="flat"
              color="error"
              @click="removerFoto"
            >
              <v-icon icon="mdi-trash-can-outline" size="16" />
            </v-btn>
          </div>
        </div>
      </v-img>
    </div>

    <!-- Dropzone / Selector de Archivo -->
    <div
      v-else
      class="upload-dropzone border border-dashed border-grey-lighten-1 rounded-lg pa-4 text-center bg-grey-lighten-5 cursor-pointer"
      :class="{ 'opacity-60': subiendo }"
      @click="abrirSelector"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="d-none"
        @change="alSeleccionarArchivo"
      />

      <v-progress-circular
        v-if="subiendo"
        indeterminate
        color="primary"
        size="32"
        class="my-2"
      />

      <div v-else>
        <v-avatar color="primary" variant="tonal" size="42" class="mb-2">
          <v-icon icon="mdi-camera-plus-outline" size="22" color="primary" />
        </v-avatar>
        <div class="text-body-2 font-weight-bold text-grey-darken-3">
          Subir Fotografía de Fachada
        </div>
        <div class="text-caption text-grey-darken-1 mt-0.5">
          JPG, PNG o WEBP • Se vincula automáticamente al expediente digital
        </div>
      </div>
    </div>

    <v-alert v-if="errorSubida" type="error" density="compact" variant="tonal" class="mt-2 text-caption">
      {{ errorSubida }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePredios } from '~/composables/usePredios'

const props = withDefaults(
  defineProps<{
    fotoUrl?: string | null
    escrituraId: string
    predioId?: string | null
    editable?: boolean
  }>(),
  {
    fotoUrl: null,
    predioId: null,
    editable: true
  }
)

const emit = defineEmits<{
  uploaded: [data: { url: string; path: string }]
  deleted: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const subiendo = ref(false)
const errorSubida = ref<string | null>(null)

const { subirFotoFachada } = usePredios()

function abrirSelector() {
  if (!props.editable || subiendo.value) return
  fileInput.value?.click()
}

async function alSeleccionarArchivo(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  subiendo.value = true
  errorSubida.value = null

  try {
    const res = await subirFotoFachada(props.escrituraId, props.predioId || '', file)
    if (res) {
      emit('uploaded', res)
    } else {
      throw new Error('No se pudo completar la subida de la imagen')
    }
  } catch (err: any) {
    errorSubida.value = err.message || 'Error al procesar la fotografía'
  } finally {
    subiendo.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function removerFoto() {
  emit('deleted')
}
</script>

<style scoped>
.predio-fachada-upload {
  font-family: inherit;
}

.upload-dropzone:hover {
  background-color: #f0f4f8 !important;
  border-color: #1b3a5f !important;
}

.bg-gradient-dark {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75), transparent);
}
</style>
