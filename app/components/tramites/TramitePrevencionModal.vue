<template>
  <v-dialog
    :model-value="modelValue"
    max-width="650px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title
        :class="[
          'd-flex align-center justify-space-between pa-4 text-white',
          esSubsanacion ? 'bg-primary' : 'bg-error'
        ]"
      >
        <div class="d-flex align-center gap-2">
          <v-icon
            :icon="esSubsanacion ? 'mdi-check-decagram-outline' : 'mdi-alert-octagon-outline'"
            class="mr-2"
          />
          <span>{{ esSubsanacion ? 'Subsanar Prevención Registral' : 'Registrar Prevención / Suspensión Oficial' }}</span>
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
        <!-- Info del trámite -->
        <v-alert
          variant="tonal"
          :color="esSubsanacion ? 'primary' : 'error'"
          density="compact"
          class="mb-4"
        >
          <div class="font-weight-bold">
            {{ tramite?.tipo_tramite_nombre || 'Trámite Notarial' }}
          </div>
          <div class="text-caption">
            Dependencia: {{ tramite?.dependencia_sigla }} · Folio Actual: {{ tramite?.folio_dependencia || 'Sin volante' }}
          </div>
        </v-alert>

        <v-form ref="formRef" v-model="formValido" @submit.prevent="guardar">
          <!-- Modo Subsanación -->
          <template v-if="esSubsanacion">
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioSubsanar.folio_reingreso"
                  label="Folio Oficial de Reingreso *"
                  placeholder="Ej. REING-2026-0812"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-barcode-scan"
                  :rules="[(v) => !!v || 'El folio de reingreso es requerido']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioSubsanar.fecha_subsanacion"
                  type="date"
                  label="Fecha de Reingreso Formal *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'La fecha es requerida']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="formularioSubsanar.notas_subsanacion"
                  label="Términos de la Subsanación / Escrito Aclaratorio *"
                  placeholder="Explique cómo se solventaron las causas de la suspensión..."
                  rows="3"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'Debe describir la subsanación']"
                />
              </v-col>
            </v-row>
          </template>

          <!-- Modo Registrar Prevención -->
          <template v-else>
            <v-row density="comfortable">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioPrevencion.folio_prevencion"
                  label="Folio / No. de Prevención *"
                  placeholder="Ej. PREV-RPP-4501"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'El folio de prevención es requerido']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioPrevencion.registrador_nombre"
                  label="Nombre del Registrador / Calificador"
                  placeholder="Ej. Lic. Carlos Valenzuela"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioPrevencion.fecha_notificacion"
                  type="date"
                  label="Fecha de Notificación *"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'La fecha de notificación es requerida']"
                />
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="formularioPrevencion.fecha_limite_subsanacion"
                  type="date"
                  label="Fecha Límite Legal para Subsanar *"
                  variant="outlined"
                  density="comfortable"
                  hint="Término fatal legal establecido por la autoridad"
                  persistent-hint
                  :rules="[(v) => !!v || 'La fecha límite de subsanación es requerida']"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="formularioPrevencion.motivo_observacion"
                  label="Motivo u Observación Registral *"
                  placeholder="Describa la observación fundada del registrador o dependencia..."
                  rows="3"
                  variant="outlined"
                  density="comfortable"
                  :rules="[(v) => !!v || 'El motivo de prevención es requerido']"
                />
              </v-col>
            </v-row>
          </template>
        </v-form>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
          closable
        >
          {{ errorMsg }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          color="grey"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          :color="esSubsanacion ? 'primary' : 'error'"
          variant="flat"
          :loading="guardando"
          @click="guardar"
        >
          {{ esSubsanacion ? 'Registrar Reingreso' : 'Asentar Prevención' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTramites } from '~/composables/useTramites'
import type { TramiteResumen, TramitePrevencion } from '~/types/tramites'

const props = defineProps<{
  modelValue: boolean
  tramite: TramiteResumen | null
  prevencion?: TramitePrevencion | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const { registrarPrevencion, subsanarPrevencion } = useTramites()

const formRef = ref<any>(null)
const formValido = ref(false)
const guardando = ref(false)
const errorMsg = ref<string | null>(null)

const esSubsanacion = computed(() => {
  return props.tramite?.estado === 'prevenido_observado' || !!props.prevencion
})

const hoyIso = new Date().toISOString().split('T')[0]

const formularioPrevencion = ref<Partial<TramitePrevencion>>({
  folio_prevencion: '',
  registrador_nombre: '',
  fecha_notificacion: hoyIso,
  fecha_limite_subsanacion: '',
  motivo_observacion: ''
})

const formularioSubsanar = ref<{
  folio_reingreso: string
  fecha_subsanacion: string
  notas_subsanacion: string
}>({
  folio_reingreso: '',
  fecha_subsanacion: hoyIso,
  notas_subsanacion: ''
})

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      errorMsg.value = null
      formularioPrevencion.value = {
        folio_prevencion: '',
        registrador_nombre: '',
        fecha_notificacion: new Date().toISOString().split('T')[0],
        fecha_limite_subsanacion: '',
        motivo_observacion: ''
      }
      formularioSubsanar.value = {
        folio_reingreso: '',
        fecha_subsanacion: new Date().toISOString().split('T')[0],
        notas_subsanacion: ''
      }
    }
  }
)

function cerrar() {
  emit('update:modelValue', false)
}

async function guardar() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  if (!props.tramite?.id) {
    errorMsg.value = 'No se ha seleccionado un trámite válido'
    return
  }

  guardando.value = true
  errorMsg.value = null

  try {
    if (esSubsanacion.value) {
      const prevId = props.prevencion?.id || props.tramite.prevenciones?.[0]?.id
      if (!prevId) {
        throw new Error('No se encontró el identificador de la prevención a subsanar')
      }
      await subsanarPrevencion(prevId, props.tramite.id, formularioSubsanar.value)
    } else {
      await registrarPrevencion(props.tramite.id, formularioPrevencion.value)
    }

    emit('saved')
    cerrar()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al procesar la prevención registral'
  } finally {
    guardando.value = false
  }
}
</script>
