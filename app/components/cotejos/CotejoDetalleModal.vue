<template>
  <v-dialog
    :model-value="modelValue"
    max-width="750px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white pa-4">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-file-find-outline" class="mr-2" />
          <span class="text-h6 font-weight-bold">
            Detalle del Acta de Cotejo #{{ acta?.numero_acta }}
          </span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="compact"
          color="white"
          @click="cerrar"
        />
      </v-card-title>

      <v-card-text v-if="acta" class="pa-5">
        <!-- Estatus y libro -->
        <div class="d-flex align-center justify-space-between flex-wrap border-b pb-4 mb-4">
          <div>
            <span class="text-caption text-grey-darken-1 d-block text-uppercase">Libro Asignado</span>
            <span class="text-subtitle-1 font-weight-bold text-primary">
              Libro No. {{ acta.libro?.numero_libro || 1 }} (Ejercicio {{ acta.anio }})
            </span>
          </div>
          <div>
            <span class="text-caption text-grey-darken-1 d-block text-uppercase text-right">Estatus Oficial</span>
            <v-chip :color="colorEstatus(acta.estatus)" variant="tonal" class="font-weight-bold text-capitalize">
              {{ acta.estatus }}
            </v-chip>
          </div>
        </div>

        <v-row density="comfortable">
          <!-- Solicitante -->
          <v-col cols="12" sm="6">
            <div class="bg-grey-lighten-4 pa-3 rounded">
              <span class="text-caption text-grey-darken-2 d-block font-weight-bold">Solicitante</span>
              <span class="text-body-1 font-weight-medium">{{ acta.solicitante_nombre }}</span>
              <span v-if="acta.solicitante_identificacion" class="text-caption text-medium-emphasis d-block">
                ID: {{ acta.solicitante_identificacion }}
              </span>
            </div>
          </v-col>

          <!-- Fecha y Notario -->
          <v-col cols="12" sm="6">
            <div class="bg-grey-lighten-4 pa-3 rounded">
              <span class="text-caption text-grey-darken-2 d-block font-weight-bold">Fecha de Asiento</span>
              <span class="text-body-1 font-weight-medium">{{ formatearFecha(acta.fecha_cotejo) }}</span>
              <span class="text-caption text-medium-emphasis d-block">
                Autorizó: {{ acta.notario_actuante || 'Notario Titular' }}
              </span>
            </div>
          </v-col>

          <!-- Documento Exhibido -->
          <v-col cols="12">
            <div class="border pa-3 rounded">
              <span class="text-caption text-primary font-weight-bold text-uppercase d-block mb-1">
                Documento Original Tenido a la Vista
              </span>
              <div class="text-subtitle-2 font-weight-bold mb-1">
                Tipo: {{ acta.tipo_documento }}
              </div>
              <p class="text-body-2 mb-2 text-justify">
                {{ acta.documento_descripcion }}
              </p>
              <div class="d-flex gap-4">
                <v-chip size="small" variant="outlined" color="primary">
                  <v-icon icon="mdi-file-outline" start />
                  {{ acta.numero_hojas }} {{ acta.numero_hojas === 1 ? 'Foja útil' : 'Fojas útiles' }}
                </v-chip>
                <v-chip size="small" variant="outlined" color="secondary">
                  <v-icon icon="mdi-content-copy" start />
                  {{ acta.numero_tantos }} {{ acta.numero_tantos === 1 ? 'Tanto expedido' : 'Tantos expedidos' }}
                </v-chip>
              </div>
            </div>
          </v-col>

          <!-- Observaciones o motivo de cancelación -->
          <v-col v-if="acta.observaciones || acta.motivo_cancelacion" cols="12">
            <v-alert
              v-if="acta.motivo_cancelacion"
              color="error"
              variant="tonal"
              density="comfortable"
              icon="mdi-cancel"
              class="mb-2"
            >
              <strong>Motivo de Cancelación Legal:</strong> {{ acta.motivo_cancelacion }}
              <div v-if="acta.cancelado_en" class="text-caption mt-1">
                Inutilizada el {{ formatearFecha(acta.cancelado_en) }}
              </div>
            </v-alert>

            <div v-if="acta.observaciones" class="bg-grey-lighten-4 pa-3 rounded text-body-2">
              <strong>Observaciones al calce:</strong> {{ acta.observaciones }}
            </div>
          </v-col>
        </v-row>

        <!-- SECCIÓN DE EVIDENCIAS EN STORAGE -->
        <v-divider class="my-4" />
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="d-flex align-center gap-2">
            <v-icon icon="mdi-cloud-upload-outline" color="primary" />
            <h3 class="text-subtitle-1 font-weight-bold text-primary mb-0">
              Evidencias Digitalizadas (Supabase Storage)
            </h3>
          </div>
        </div>

        <v-row density="comfortable">
          <!-- Documento Original Digitalizado -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-3 rounded">
              <span class="text-caption font-weight-bold d-block mb-2">Original Digitalizado</span>
              <div v-if="acta.archivo_original_url" class="d-flex align-center justify-space-between">
                <v-chip color="success" size="small" variant="tonal">
                  <v-icon icon="mdi-check" start />
                  Cargado
                </v-chip>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="primary"
                  :href="acta.archivo_original_url"
                  target="_blank"
                  prepend-icon="mdi-open-in-new"
                >
                  Ver Archivo
                </v-btn>
              </div>
              <div v-else class="text-caption text-grey">
                Sin archivo adjunto
              </div>

              <!-- Input para cargar -->
              <v-file-input
                v-model="archivoOriginalSubir"
                density="compact"
                variant="underlined"
                label="Reemplazar / Adjuntar"
                class="mt-2"
                accept="application/pdf,image/png,image/jpeg"
                hide-details
                :loading="subiendoArchivo"
                @update:model-value="subirArchivo('original')"
              />
            </v-card>
          </v-col>

          <!-- Copia Certificada Emitida -->
          <v-col cols="12" sm="6">
            <v-card variant="outlined" class="pa-3 rounded">
              <span class="text-caption font-weight-bold d-block mb-2">Copia Certificada con Sello</span>
              <div v-if="acta.archivo_copia_certificada_url" class="d-flex align-center justify-space-between">
                <v-chip color="success" size="small" variant="tonal">
                  <v-icon icon="mdi-check" start />
                  Cargado
                </v-chip>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="secondary"
                  :href="acta.archivo_copia_certificada_url"
                  target="_blank"
                  prepend-icon="mdi-open-in-new"
                >
                  Ver Archivo
                </v-btn>
              </div>
              <div v-else class="text-caption text-grey">
                Sin archivo adjunto
              </div>

              <!-- Input para cargar -->
              <v-file-input
                v-model="archivoCertificadaSubir"
                density="compact"
                variant="underlined"
                label="Reemplazar / Adjuntar"
                class="mt-2"
                accept="application/pdf,image/png,image/jpeg"
                hide-details
                :loading="subiendoArchivo"
                @update:model-value="subirArchivo('certificada')"
              />
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 justify-space-between">
        <v-btn variant="text" @click="cerrar">
          Cerrar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-bold"
          prepend-icon="mdi-printer"
          @click="$emit('imprimir', acta!)"
        >
          Imprimir Razón de Cotejo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ActaCotejo } from '~/types/cotejos'
import { useCotejos } from '~/composables/useCotejos'

const props = defineProps<{
  modelValue: boolean
  acta: ActaCotejo | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'imprimir', acta: ActaCotejo): void
  (e: 'actualizado'): void
}>()

const { subirDocumentoCotejo, subiendoArchivo } = useCotejos()

const archivoOriginalSubir = ref<File | null>(null)
const archivoCertificadaSubir = ref<File | null>(null)

function cerrar() {
  emit('update:modelValue', false)
}

function colorEstatus(estatus: string) {
  switch (estatus) {
    case 'autorizado': return 'success'
    case 'entregado': return 'info'
    case 'cancelado': return 'error'
    default: return 'warning'
  }
}

function formatearFecha(fechaIso?: string | null): string {
  if (!fechaIso) return '—'
  return new Date(fechaIso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function subirArchivo(tipo: 'original' | 'certificada') {
  const file = tipo === 'original' ? archivoOriginalSubir.value : archivoCertificadaSubir.value
  if (!file || !props.acta) return

  try {
    const url = await subirDocumentoCotejo(props.acta.id, props.acta.libro_id, file, tipo)
    if (url) {
      if (tipo === 'original') {
        props.acta.archivo_original_url = url
        archivoOriginalSubir.value = null
      } else {
        props.acta.archivo_copia_certificada_url = url
        archivoCertificadaSubir.value = null
      }
      emit('actualizado')
    }
  } catch (err) {
    console.error('Error al subir archivo:', err)
  }
}
</script>
