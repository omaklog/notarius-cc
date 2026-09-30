<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg bg-surface">
      <!-- Encabezado del Modal con color según tipo de acción -->
      <v-toolbar :color="toolbarColor" density="comfortable" class="px-4">
        <v-icon :icon="toolbarIcon" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          {{ tituloModal }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" density="compact" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Subtítulo del Trámite -->
        <div v-if="tramiteNombre" class="d-flex align-center mb-4 text-caption text-grey-darken-2">
          <v-icon icon="mdi-file-document-outline" size="14" class="mr-1 text-primary" />
          <span>Trámite: <strong>{{ tramiteNombre }}</strong></span>
          <span v-if="custodioActualNombre" class="ml-2 text-grey-darken-1">
            (Custodio actual: {{ custodioActualNombre }})
          </span>
        </div>

        <!-- Alerta Contextual según Acción -->
        <v-alert
          :type="alertType"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
        >
          {{ alertMensaje }}
        </v-alert>

        <!-- Mensaje de Error si ocurre -->
        <v-alert
          v-if="errorLocal"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4 text-caption"
          closable
          @click:close="errorLocal = null"
        >
          {{ errorLocal }}
        </v-alert>

        <v-form ref="formRef" @submit.prevent="onConfirmar">
          <!-- 1. CASO TURNAR A GESTOR O RE-TURNAR TRAS SOLVENTAR -->
          <div v-if="tipoAccion === 'turnar' || tipoAccion === 'solventar'">
            <v-select
              v-model="destinatarioId"
              :items="listaGestores"
              item-title="nombre"
              item-value="id"
              label="Gestor Notarial Receptor *"
              placeholder="Seleccione el gestor responsable"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-briefcase-account"
              :rules="[v => !!v || 'Debe seleccionar un gestor notarial']"
              class="mb-3"
            />

            <v-textarea
              v-if="tipoAccion === 'solventar'"
              v-model="motivo"
              label="Detalle de la Solventación Realizada *"
              placeholder="Describa cómo se atendió la prevención o ajuste del instrumento..."
              rows="3"
              density="compact"
              variant="outlined"
              :rules="[v => !!v && v.trim().length > 0 || 'El motivo de solventación es obligatorio']"
              class="mb-3"
            />

            <v-textarea
              v-model="instrucciones"
              :label="tipoAccion === 'solventar' ? 'Instrucciones para Reingreso (Opcional)' : 'Instrucciones para el Gestor'"
              placeholder="Ej. Ingresar a ventanilla 3 del RPP con folio previo..."
              rows="2"
              density="compact"
              variant="outlined"
              class="mb-2"
            />
          </div>

          <!-- 2. CASO DEVOLVER POR PREVENCIÓN / OBSERVACIÓN -->
          <div v-else-if="tipoAccion === 'devolver'">
            <v-select
              v-model="destinatarioId"
              :items="listaRedactores"
              item-title="nombre"
              item-value="id"
              label="Abogado Redactor Responsable *"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-account-tie"
              :rules="[v => !!v || 'Debe seleccionar al abogado redactor']"
              class="mb-3"
            />

            <v-textarea
              v-model="motivo"
              label="Motivo Detallado de la Prevención / Observación *"
              placeholder="Describa puntualmente el requerimiento de la dependencia (ej. aclaración de medidas, documento faltante)..."
              rows="3"
              density="compact"
              variant="outlined"
              :rules="[v => !!v && v.trim().length > 0 || 'Debe ingresar el motivo de la prevención']"
              class="mb-3"
            />

            <v-row density="compact">
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="folioPrevencion"
                  label="Folio / Oficio de Prevención"
                  placeholder="Ej. PREV-2026-881"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                />
              </v-col>

              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="fechaLimite"
                  type="date"
                  label="Fecha Límite Legal para Subsanar"
                  density="compact"
                  variant="outlined"
                  class="mb-3"
                />
              </v-col>
            </v-row>
          </div>

          <!-- 3. CASO ENTREGAR TRÁMITE CONCLUIDO -->
          <div v-else-if="tipoAccion === 'concluir'">
            <v-select
              v-model="destinatarioId"
              :items="listaRedactores"
              item-title="nombre"
              item-value="id"
              label="Entregar al Abogado Redactor *"
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-account-check"
              :rules="[v => !!v || 'Debe seleccionar al redactor receptor']"
              class="mb-3"
            />

            <v-textarea
              v-model="motivo"
              label="Observaciones de Salida / Entrega"
              placeholder="Ej. Se entrega Certificado de Libertad de Gravamen en original y copia digital..."
              rows="2"
              density="compact"
              variant="outlined"
              class="mb-3"
            />
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5 d-flex justify-end ga-2">
        <v-btn
          variant="outlined"
          color="grey-darken-2"
          density="comfortable"
          class="text-none font-weight-medium"
          :disabled="turnando"
          @click="cerrar"
        >
          Cancelar
        </v-btn>

        <v-btn
          :color="botonColor"
          variant="flat"
          density="comfortable"
          :loading="turnando"
          prepend-icon="mdi-check-circle"
          class="text-none font-weight-bold"
          @click="onConfirmar"
        >
          {{ botonTexto }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTurnadoTramites } from '~/composables/useTurnadoTramites'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    tramiteId: string
    escrituraId: string
    tramiteNombre?: string
    accionInicial?: 'turnar' | 'devolver' | 'solventar' | 'concluir'
    redactorIdPredeterminado?: string
    gestorIdPredeterminado?: string
    custodioActualNombre?: string
  }>(),
  {
    accionInicial: 'turnar',
    tramiteNombre: '',
    custodioActualNombre: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'turnado-exitoso', eventoId: string): void
}>()

const {
  turnando,
  obtenerPersonalDisponible,
  turnarAlGestor,
  devolverPorPrevencion,
  solventarYReturnar,
  entregarConcluido,
} = useTurnadoTramites()

const tipoAccion = ref<'turnar' | 'devolver' | 'solventar' | 'concluir'>(props.accionInicial)
const destinatarioId = ref<string>('')
const motivo = ref<string>('')
const folioPrevencion = ref<string>('')
const fechaLimite = ref<string>('')
const instrucciones = ref<string>('')
const errorLocal = ref<string | null>(null)
const formRef = ref<any>(null)

const listaGestores = ref<Array<{ id: string; nombre: string }>>([])
const listaRedactores = ref<Array<{ id: string; nombre: string }>>([])

watch(
  () => props.modelValue,
  async (abierto) => {
    if (abierto) {
      tipoAccion.value = props.accionInicial
      motivo.value = ''
      folioPrevencion.value = ''
      fechaLimite.value = ''
      instrucciones.value = ''
      errorLocal.value = null

      const { gestores, redactores } = await obtenerPersonalDisponible()
      listaGestores.value = gestores
      listaRedactores.value = redactores

      if (tipoAccion.value === 'turnar' || tipoAccion.value === 'solventar') {
        destinatarioId.value = props.gestorIdPredeterminado || gestores[0]?.id || ''
      } else {
        destinatarioId.value = props.redactorIdPredeterminado || redactores[0]?.id || ''
      }
    }
  },
  { immediate: true }
)

const tituloModal = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
      return 'Turnar Trámite al Gestor Notarial'
    case 'devolver':
      return 'Devolver Trámite por Solventación / Prevención'
    case 'solventar':
      return 'Solventar Observación y Re-turnar al Gestor'
    case 'concluir':
      return 'Entregar Trámite Concluido al Redactor'
  }
})

const toolbarColor = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
      return 'primary'
    case 'devolver':
      return 'warning'
    case 'solventar':
      return 'primary'
    case 'concluir':
      return 'success'
  }
})

const toolbarIcon = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
      return 'mdi-arrow-right-bold-box-outline'
    case 'devolver':
      return 'mdi-alert-octagon-outline'
    case 'solventar':
      return 'mdi-check-decagram-outline'
    case 'concluir':
      return 'mdi-checkbox-marked-circle-outline'
  }
})

const alertType = computed(() => {
  return tipoAccion.value === 'devolver' ? 'warning' : 'info'
})

const alertMensaje = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
      return 'Al turnar el trámite, el gestor se convierte en el custodio formal del expediente ante la dependencia.'
    case 'devolver':
      return 'Esta acción transfiere la custodia al redactor y marca el trámite como "Detenido por Solventación". Exige motivo formal.'
    case 'solventar':
      return 'Confirme que las observaciones fueron atendidas para que el gestor reingrese el trámite a la dependencia.'
    case 'concluir':
      return 'El trámite finalizó exitosamente. La custodia del expediente se devuelve al redactor para la siguiente fase.'
  }
})

const botonColor = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
    case 'solventar':
      return 'primary'
    case 'devolver':
      return 'warning'
    case 'concluir':
      return 'success'
  }
})

const botonTexto = computed(() => {
  switch (tipoAccion.value) {
    case 'turnar':
      return 'Confirmar Turnado al Gestor'
    case 'devolver':
      return 'Devolver para Solventación'
    case 'solventar':
      return 'Marcar Solventado y Re-turnar'
    case 'concluir':
      return 'Confirmar Entrega Concluida'
  }
})

async function onConfirmar() {
  errorLocal.value = null
  const { valid } = await formRef.value?.validate() || { valid: true }
  if (!valid) return

  try {
    let eventoId = ''

    if (tipoAccion.value === 'turnar') {
      eventoId = await turnarAlGestor({
        escrituraId: props.escrituraId,
        tramiteId: props.tramiteId,
        gestorId: destinatarioId.value,
        instrucciones: instrucciones.value || undefined,
      })
    } else if (tipoAccion.value === 'devolver') {
      eventoId = await devolverPorPrevencion({
        escrituraId: props.escrituraId,
        tramiteId: props.tramiteId,
        redactorId: destinatarioId.value,
        motivo: motivo.value,
        folioPrevencion: folioPrevencion.value || undefined,
        fechaLimite: fechaLimite.value || undefined,
      })
    } else if (tipoAccion.value === 'solventar') {
      eventoId = await solventarYReturnar({
        escrituraId: props.escrituraId,
        tramiteId: props.tramiteId,
        gestorId: destinatarioId.value,
        motivo: motivo.value,
        instrucciones: instrucciones.value || undefined,
      })
    } else if (tipoAccion.value === 'concluir') {
      eventoId = await entregarConcluido({
        escrituraId: props.escrituraId,
        tramiteId: props.tramiteId,
        redactorId: destinatarioId.value,
        motivo: motivo.value || undefined,
      })
    }

    emit('turnado-exitoso', eventoId)
    cerrar()
  } catch (e: any) {
    errorLocal.value = e?.message || 'Error al procesar el turnado'
  }
}

function cerrar() {
  emit('update:modelValue', false)
}
</script>
