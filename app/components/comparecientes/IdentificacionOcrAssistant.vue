<script setup lang="ts">
import { ref, computed } from 'vue'

export interface OcrExtractedData {
  nombres: string | null
  primer_apellido: string | null
  segundo_apellido: string | null
  curp: string | null
  rfc: string | null
  clave_elector: string | null
  vigencia: string | null
  fecha_nacimiento: string | null
  genero: 'M' | 'F' | 'X' | null
  domicilio: {
    calle: string | null
    numero_exterior: string | null
    numero_interior: string | null
    colonia: string | null
    codigo_postal: string | null
    municipio: string | null
    entidad_federativa: string | null
  }
}

export interface OcrResultPayload {
  datos: OcrExtractedData
  anversoBase64: string
  reversoBase64?: string
  anversoFile?: File
  reversoFile?: File
}

const props = withDefaults(
  defineProps<{
    tipoIdentificacion?: string
    requiereReverso?: boolean
  }>(),
  {
    tipoIdentificacion: 'ine',
    requiereReverso: true,
  }
)

const emit = defineEmits<{
  (e: 'ocr-completado', payload: OcrResultPayload): void
  (e: 'omitir-manual'): void
  (e: 'cancelar'): void
}>()

const anversoFile = ref<File | null>(null)
const anversoPreview = ref<string | null>(null)
const reversoFile = ref<File | null>(null)
const reversoPreview = ref<string | null>(null)

const procesando = ref(false)
const errorMensaje = ref<string | null>(null)

const fileInputAnverso = ref<HTMLInputElement | null>(null)
const fileInputReverso = ref<HTMLInputElement | null>(null)

const puedeEscanear = computed(() => {
  if (!anversoFile.value) return false
  if (props.requiereReverso && !reversoFile.value) return false
  return true
})

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

function handleAnversoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    anversoFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      anversoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function handleReversoChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    reversoFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      reversoPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function limpiarAnverso() {
  anversoFile.value = null
  anversoPreview.value = null
  if (fileInputAnverso.value) fileInputAnverso.value.value = ''
}

function limpiarReverso() {
  reversoFile.value = null
  reversoPreview.value = null
  if (fileInputReverso.value) fileInputReverso.value.value = ''
}

async function procesarOcr() {
  if (!anversoFile.value) return

  procesando.value = true
  errorMensaje.value = null

  try {
    const anversoB64 = await fileToBase64(anversoFile.value)
    let reversoB64: string | undefined

    if (reversoFile.value) {
      reversoB64 = await fileToBase64(reversoFile.value)
    }

    const response = await $fetch<any>('/api/ocr/identificacion', {
      method: 'POST',
      body: {
        tipo_identificacion: props.tipoIdentificacion,
        anverso_base64: anversoB64,
        reverso_base64: reversoB64,
      },
    })

    if (!response.exito || !response.datos) {
      throw new Error(response.error || 'No se pudieron extraer datos legibles de la identificación.')
    }

    emit('ocr-completado', {
      datos: response.datos,
      anversoBase64: anversoB64,
      reversoBase64: reversoB64,
      anversoFile: anversoFile.value,
      reversoFile: reversoFile.value || undefined,
    })
  } catch (err: any) {
    errorMensaje.value = err.data?.statusMessage || err.message || 'Error al conectar con el motor de visión OCR'
  } finally {
    procesando.value = false
  }
}
</script>

<template>
  <v-card class="ocr-assistant-card bg-white" rounded="lg" variant="outlined">
    <!-- Header del Asistente -->
    <v-card-item class="bg-grey-lighten-4 py-3">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-avatar color="#1B3A5F" size="36" class="mr-3 text-white">
            <v-icon size="20">mdi-scanner</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
              Asistente de Captura con Identificación Oficial
            </div>
            <div class="text-caption text-medium-emphasis">
              Cargue la identificación para pre-llenar los datos del compareciente de forma automática.
            </div>
          </div>
        </div>

        <v-chip size="small" color="#1B3A5F" variant="tonal" class="font-weight-medium">
          {{ requiereReverso ? 'Requiere 2 Caras' : '1 Cara' }}
        </v-chip>
      </div>
    </v-card-item>

    <v-divider />

    <v-card-text class="pa-4">
      <v-alert
        v-if="errorMensaje"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mb-4"
        @click:close="errorMensaje = null"
      >
        {{ errorMensaje }}
      </v-alert>

      <v-row density="compact">
        <!-- Zona Anverso -->
        <v-col cols="12" :md="requiereReverso ? 6 : 12">
          <div class="text-caption font-weight-bold text-uppercase mb-2 text-medium-emphasis">
            1. Anverso / Frente (Datos y Fotografía) *
          </div>

          <div
            v-if="!anversoPreview"
            class="dropzone-box d-flex flex-column align-center justify-center pa-6 text-center"
            @click="fileInputAnverso?.click()"
          >
            <v-icon size="40" color="#1B3A5F" class="mb-2">mdi-card-account-details-outline</v-icon>
            <div class="text-body-2 font-weight-medium mb-1">
              Seleccionar o arrastrar fotografía frontal
            </div>
            <div class="text-caption text-medium-emphasis">JPG, PNG o WEBP (máx. 10MB)</div>
            <input
              ref="fileInputAnverso"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="d-none"
              @change="handleAnversoChange"
            />
          </div>

          <v-card v-else variant="outlined" rounded="md" class="preview-card position-relative">
            <v-img :src="anversoPreview" height="170" cover class="bg-grey-lighten-3" />
            <div class="d-flex align-center justify-space-between pa-2 bg-white">
              <span class="text-caption text-truncate font-weight-medium">
                {{ anversoFile?.name }}
              </span>
              <v-btn
                icon="mdi-delete-outline"
                size="x-small"
                variant="text"
                color="error"
                @click="limpiarAnverso"
              />
            </div>
          </v-card>
        </v-col>

        <!-- Zona Reverso -->
        <v-col v-if="requiereReverso" cols="12" md="6">
          <div class="text-caption font-weight-bold text-uppercase mb-2 text-medium-emphasis">
            2. Reverso / Código CIC y Código de Barras *
          </div>

          <div
            v-if="!reversoPreview"
            class="dropzone-box d-flex flex-column align-center justify-center pa-6 text-center"
            @click="fileInputReverso?.click()"
          >
            <v-icon size="40" color="#A9762E" class="mb-2">mdi-barcode-scan</v-icon>
            <div class="text-body-2 font-weight-medium mb-1">
              Seleccionar o arrastrar reverso de la credencial
            </div>
            <div class="text-caption text-medium-emphasis">Requerido para verificación electoral</div>
            <input
              ref="fileInputReverso"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="d-none"
              @change="handleReversoChange"
            />
          </div>

          <v-card v-else variant="outlined" rounded="md" class="preview-card position-relative">
            <v-img :src="reversoPreview" height="170" cover class="bg-grey-lighten-3" />
            <div class="d-flex align-center justify-space-between pa-2 bg-white">
              <span class="text-caption text-truncate font-weight-medium">
                {{ reversoFile?.name }}
              </span>
              <v-btn
                icon="mdi-delete-outline"
                size="x-small"
                variant="text"
                color="error"
                @click="limpiarReverso"
              />
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Estado de carga OCR -->
      <div v-if="procesando" class="mt-4 text-center">
        <v-progress-linear indeterminate color="#1B3A5F" class="mb-2" rounded />
        <span class="text-caption font-weight-medium" style="color: #1b3a5f">
          Extrayendo nombres, CURP, RFC y domicilio mediante Visión Multimodal...
        </span>
      </div>
    </v-card-text>

    <v-divider />

    <!-- Acciones -->
    <v-card-actions class="pa-4 d-flex align-center justify-space-between">
      <v-btn
        variant="text"
        color="grey-darken-2"
        density="compact"
        class="text-caption text-decoration-underline"
        @click="emit('omitir-manual')"
      >
        Omitir escaneo y capturar datos manualmente
      </v-btn>

      <div class="d-flex align-center gap-2">
        <v-btn
          color="#1B3A5F"
          class="text-white font-weight-medium px-4"
          prepend-icon="mdi-text-box-search-outline"
          :disabled="!puedeEscanear || procesando"
          :loading="procesando"
          @click="procesarOcr"
        >
          Escanear y Pre-llenar
        </v-btn>
      </div>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.dropzone-box {
  border: 2px dashed #cbd2dc;
  border-radius: 8px;
  background-color: #fafbfc;
  cursor: pointer;
  min-height: 170px;
  transition: all 0.2s ease-in-out;
}

.dropzone-box:hover {
  border-color: #1b3a5f;
  background-color: #f0f4f9;
}

.preview-card {
  border: 1px solid #cbd2dc;
}
</style>
