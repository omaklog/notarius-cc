<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white pa-4">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-book-plus-outline" class="mr-2" />
          <span class="text-h6 font-weight-bold">Nuevo Cotejo de Documentos</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="compact"
          color="white"
          :disabled="guardando"
          @click="cerrar"
        />
      </v-card-title>

      <v-card-text class="pa-4 pt-5">
        <!-- Banner de Libro Activo y Folio Consecutivo -->
        <v-alert
          v-if="libroActivo"
          color="primary"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          icon="mdi-numeric"
        >
          <div class="d-flex align-center justify-space-between flex-wrap">
            <div>
              <span class="font-weight-bold">Libro de Cotejos No. {{ libroActivo.numero_libro }} ({{ libroActivo.anio }})</span>
              <span class="text-caption d-block text-medium-emphasis">
                Capacidad: {{ libroActivo.total_actas || 0 }} de {{ libroActivo.limite_actas }} actas asentadas
              </span>
            </div>
            <v-chip color="primary" variant="flat" class="text-white font-weight-bold">
              Próxima Acta: #{{ (libroActivo.total_actas || 0) + 1 }}
            </v-chip>
          </div>
        </v-alert>

        <v-alert
          v-else
          color="error"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          icon="mdi-alert-circle-outline"
        >
          No existe ningún libro de cotejos abierto. Debe aperturar un nuevo tomo antes de registrar actas.
        </v-alert>

        <v-form ref="formRef" v-model="formValido" @submit.prevent="guardar">
          <v-row density="comfortable">
            <!-- Solicitante -->
            <v-col cols="12" sm="7">
              <v-text-field
                v-model="formulario.solicitante_nombre"
                label="Nombre del Solicitante *"
                placeholder="Ej. Ing. Carlos Mendoza Silva"
                variant="outlined"
                density="comfortable"
                :rules="[
                  (v) => !!v?.trim() || 'El nombre del solicitante es obligatorio',
                  (v) => (v?.trim().length >= 3) || 'Mínimo 3 caracteres'
                ]"
                prepend-inner-icon="mdi-account-outline"
                required
              />
            </v-col>

            <!-- Identificación oficial del solicitante -->
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="formulario.solicitante_identificacion"
                label="Identificación Oficial"
                placeholder="INE / Pasaporte / Folio"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-card-account-details-outline"
              />
            </v-col>

            <!-- Tipo de Documento -->
            <v-col cols="12">
              <v-combobox
                v-model="formulario.tipo_documento"
                :items="catalogoTipos"
                label="Tipo de Documento Exhibido *"
                placeholder="Seleccione o escriba el tipo"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v?.trim() || 'El tipo de documento es obligatorio']"
                prepend-inner-icon="mdi-file-certificate-outline"
                required
              />
            </v-col>

            <!-- Descripción exhaustiva del documento -->
            <v-col cols="12">
              <v-textarea
                v-model="formulario.documento_descripcion"
                label="Descripción Exhaustiva del Original Tenido a la Vista *"
                placeholder="Detalle entidad o autoridad emisora, fecha de expedición, sellos visibles, folios o claves de registro..."
                variant="outlined"
                density="comfortable"
                rows="3"
                :rules="[
                  (v) => !!v?.trim() || 'La descripción del original es obligatoria',
                  (v) => (v?.trim().length >= 10) || 'Mínimo 10 caracteres'
                ]"
                prepend-inner-icon="mdi-text-box-outline"
                required
              />
            </v-col>

            <!-- Fojas Útiles -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formulario.numero_hojas"
                label="Número de Fojas Útiles *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => v >= 1 || 'Debe ser al menos 1 foja']"
                prepend-inner-icon="mdi-file-multiple-outline"
                required
              />
            </v-col>

            <!-- Tantos Certificados -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="formulario.numero_tantos"
                label="Tantos Expedidos *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => v >= 1 || 'Debe ser al menos 1 tanto']"
                prepend-inner-icon="mdi-content-copy"
                required
              />
            </v-col>

            <!-- Observaciones adicionales -->
            <v-col cols="12">
              <v-textarea
                v-model="formulario.observaciones"
                label="Observaciones al calce (Opcional)"
                placeholder="Anotaciones notariales, condiciones particulares del original, etc."
                variant="outlined"
                density="comfortable"
                rows="2"
                prepend-inner-icon="mdi-comment-text-outline"
              />
            </v-col>

            <!-- Archivo de evidencia original (Opcional) -->
            <v-col cols="12">
              <v-file-input
                v-model="archivoSeleccionado"
                label="Adjuntar Original Digitalizado (PDF o Imagen, opcional)"
                variant="outlined"
                density="comfortable"
                accept="application/pdf,image/png,image/jpeg"
                prepend-inner-icon="mdi-paperclip"
                show-size
                clearable
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 d-flex justify-space-between">
        <v-btn
          variant="text"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white px-6 font-weight-bold"
          :loading="guardando"
          :disabled="!formValido || !libroActivo || guardando"
          @click="guardar"
        >
          <v-icon icon="mdi-check-circle-outline" class="mr-2" />
          Registrar y Autorizar Cotejo
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { LibroCotejo, ActaCotejo } from '~/types/cotejos'
import { useCotejos } from '~/composables/useCotejos'

const props = defineProps<{
  modelValue: boolean
  libroActivo: LibroCotejo | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'creado', acta: ActaCotejo): void
}>()

const { registrarActa, subirDocumentoCotejo, guardando } = useCotejos()

const formRef = ref<any>(null)
const formValido = ref(false)
const archivoSeleccionado = ref<File | null>(null)

const catalogoTipos = [
  'Título Profesional / Cédula Profesional',
  'Acta del Estado Civil (Nacimiento / Matrimonio)',
  'Identificación Oficial / INE / Pasaporte',
  'Poder Notarial / Acta Constitutiva',
  'Contrato Privado',
  'Constancia / Documento Fiscal / SAT',
  'Certificado de Estudios / Calificaciones',
  'Póliza de Fianza / Seguro',
  'Otro Documento Privado'
]

const formularioInicial = {
  solicitante_nombre: '',
  solicitante_identificacion: '',
  tipo_documento: '',
  documento_descripcion: '',
  numero_hojas: 1,
  numero_tantos: 1,
  observaciones: ''
}

const formulario = reactive({ ...formularioInicial })

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      Object.assign(formulario, formularioInicial)
      archivoSeleccionado.value = null
      formValido.value = false
    }
  }
)

function cerrar() {
  emit('update:modelValue', false)
}

async function guardar() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid || !props.libroActivo) return

  try {
    const payload = {
      libro_id: props.libroActivo.id,
      solicitante_nombre: formulario.solicitante_nombre,
      solicitante_identificacion: formulario.solicitante_identificacion || null,
      tipo_documento: formulario.tipo_documento,
      documento_descripcion: formulario.documento_descripcion,
      numero_hojas: Number(formulario.numero_hojas) || 1,
      numero_tantos: Number(formulario.numero_tantos) || 1,
      observaciones: formulario.observaciones || null,
      estatus: 'autorizado' as const
    }

    const actaCreada = await registrarActa(payload)

    // Si seleccionó archivo, subirlo a Storage
    if (archivoSeleccionado.value && actaCreada.id) {
      try {
        await subirDocumentoCotejo(actaCreada.id, props.libroActivo.id, archivoSeleccionado.value, 'original')
      } catch (err) {
        console.error('Error al subir archivo adjunto:', err)
      }
    }

    emit('creado', actaCreada)
    cerrar()
  } catch (error) {
    console.error('Error al registrar cotejo:', error)
  }
}
</script>
