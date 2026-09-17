<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white pa-4">
        <div class="d-flex align-center gap-2">
          <v-icon :icon="esEdicion ? 'mdi-file-document-edit-outline' : 'mdi-file-plus-outline'" class="mr-2" />
          <span>{{ esEdicion ? 'Editar Trámite Notarial' : 'Registrar Nuevo Trámite / Volante' }}</span>
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
        <v-form ref="formRef" v-model="formValido" @submit.prevent="guardar">
          <v-row density="comfortable">
            <!-- Dependencia -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formulario.dependencia_id"
                :items="dependencias"
                item-title="nombre"
                item-value="id"
                label="Dependencia Oficial *"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'La dependencia es requerida']"
                @update:model-value="onDependenciaChange"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :subtitle="item?.raw?.sigla || ''" />
                </template>
              </v-select>
            </v-col>

            <!-- Tipo de Trámite -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formulario.tipo_tramite_id"
                :items="tiposFiltrados"
                item-title="nombre"
                item-value="id"
                label="Tipo de Trámite *"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'El tipo de trámite es requerido']"
                @update:model-value="onTipoTramiteChange"
              />
            </v-col>

            <!-- Fase Procesal -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formulario.fase"
                :items="fasesDisponibles"
                item-title="titulo"
                item-value="value"
                label="Fase Procesal *"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'La fase procesal es requerida']"
              />
            </v-col>

            <!-- Estado -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formulario.estado"
                :items="estadosDisponibles"
                item-title="titulo"
                item-value="value"
                label="Estado del Trámite *"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'El estado es requerido']"
              />
            </v-col>

            <!-- Folio Oficial / Volante -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formulario.folio_dependencia"
                label="Folio Oficial / No. Volante"
                placeholder="Ej. VOL-2026-98124"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-barcode-scan"
              />
            </v-col>

            <!-- Fecha de Ingreso -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formulario.fecha_ingreso"
                type="date"
                label="Fecha de Ingreso / Radicación"
                variant="outlined"
                density="comfortable"
                @update:model-value="calcularFechaLimite"
              />
            </v-col>

            <!-- Fecha Límite Estimada (Días Hábiles) -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formulario.fecha_limite_estimada"
                type="date"
                label="Fecha Límite Estimada (Término Legal)"
                variant="outlined"
                density="comfortable"
                hint="Calculada en días hábiles (excluyendo fines de semana)"
                persistent-hint
              />
            </v-col>

            <!-- Fecha de Conclusión (si concluyó) -->
            <v-col v-if="formulario.estado === 'concluido_favorable'" cols="12" sm="6">
              <v-text-field
                v-model="formulario.fecha_conclusion"
                type="date"
                label="Fecha de Conclusión Favorable"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Enlace Orden de Pago (Opcional - Módulo 08) -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formulario.orden_pago_id"
                label="ID de Orden de Pago de Derechos (Opcional)"
                placeholder="Módulo 08 - Derechos a Terceros"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-cash-check"
              />
            </v-col>

            <!-- Observaciones -->
            <v-col cols="12">
              <v-textarea
                v-model="formulario.observaciones"
                label="Observaciones y Notas de Gestoría"
                rows="2"
                variant="outlined"
                density="comfortable"
                auto-grow
              />
            </v-col>

            <!-- Motivo de cancelación si aplica -->
            <v-col v-if="formulario.estado === 'rechazado_cancelado'" cols="12">
              <v-textarea
                v-model="formulario.motivo_cancelacion"
                label="Motivo de Cancelación / Rechazo *"
                rows="2"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => !!v || 'Debe justificar la cancelación']"
              />
            </v-col>
          </v-row>
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
          color="primary"
          variant="flat"
          :loading="guardando"
          @click="guardar"
        >
          {{ esEdicion ? 'Actualizar Trámite' : 'Guardar Trámite' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTramites } from '~/composables/useTramites'
import { calcularFechaLimiteDiasHabiles } from '~/utils/diasHabiles'
import type {
  FaseProcesal,
  EstadoTramite,
  TramiteResumen,
  TramiteEscritura
} from '~/types/tramites'

const props = defineProps<{
  modelValue: boolean
  escrituraId: string
  tramite?: TramiteResumen | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const { dependencias, tiposTramite, cargarCatalogos, crearTramite, actualizarTramite } = useTramites()

const formRef = ref<any>(null)
const formValido = ref(false)
const guardando = ref(false)
const errorMsg = ref<string | null>(null)

const esEdicion = computed(() => !!props.tramite?.id)

const formulario = ref<Partial<TramiteEscritura>>({
  escritura_id: props.escrituraId,
  dependencia_id: '',
  tipo_tramite_id: '',
  fase: 'previo',
  estado: 'solicitado',
  folio_dependencia: '',
  fecha_ingreso: '',
  fecha_limite_estimada: '',
  fecha_conclusion: '',
  orden_pago_id: '',
  observaciones: '',
  motivo_cancelacion: ''
})

const fasesDisponibles = [
  { value: 'previo', titulo: '1. Previo a la Firma' },
  { value: 'firma_otorgamiento', titulo: '2. Firma y Otorgamiento' },
  { value: 'posterior_fiscal', titulo: '3. Posterior / Fiscal (Impuestos)' },
  { value: 'inscripcion_definitiva', titulo: '4. Inscripción Registral Definitiva' },
  { value: 'entrega_cliente', titulo: '5. Entrega al Cliente y Cierre' }
]

const estadosDisponibles = [
  { value: 'solicitado', titulo: 'Solicitado' },
  { value: 'en_proceso', titulo: 'En Proceso' },
  { value: 'ingresado_dependencia', titulo: 'Ingresado a Dependencia' },
  { value: 'prevenido_observado', titulo: 'Prevenido / Observado' },
  { value: 'subsanado', titulo: 'Subsanado' },
  { value: 'concluido_favorable', titulo: 'Concluido Favorable' },
  { value: 'rechazado_cancelado', titulo: 'Rechazado / Cancelado' }
]

const tiposFiltrados = computed(() => {
  if (!formulario.value.dependencia_id) return tiposTramite.value
  return tiposTramite.value.filter((t) => t.dependencia_id === formulario.value.dependencia_id)
})

watch(
  () => props.modelValue,
  async (abierto) => {
    if (abierto) {
      errorMsg.value = null
      if (dependencias.value.length === 0 || tiposTramite.value.length === 0) {
        await cargarCatalogos()
      }

      if (props.tramite) {
        formulario.value = {
          ...props.tramite,
          escritura_id: props.escrituraId
        }
      } else {
        formulario.value = {
          escritura_id: props.escrituraId,
          dependencia_id: dependencias.value[0]?.id || '',
          tipo_tramite_id: '',
          fase: 'previo',
          estado: 'solicitado',
          folio_dependencia: '',
          fecha_ingreso: '',
          fecha_limite_estimada: '',
          fecha_conclusion: '',
          orden_pago_id: '',
          observaciones: '',
          motivo_cancelacion: ''
        }
        if (tiposFiltrados.value.length > 0) {
          formulario.value.tipo_tramite_id = tiposFiltrados.value[0].id
          formulario.value.fase = tiposFiltrados.value[0].fase_default
        }
      }
    }
  }
)

function onDependenciaChange() {
  if (tiposFiltrados.value.length > 0) {
    formulario.value.tipo_tramite_id = tiposFiltrados.value[0].id
    formulario.value.fase = tiposFiltrados.value[0].fase_default
  } else {
    formulario.value.tipo_tramite_id = ''
  }
  calcularFechaLimite()
}

function onTipoTramiteChange() {
  const tipo = tiposTramite.value.find((t) => t.id === formulario.value.tipo_tramite_id)
  if (tipo) {
    formulario.value.fase = tipo.fase_default
    if (!formulario.value.dependencia_id) {
      formulario.value.dependencia_id = tipo.dependencia_id
    }
  }
  calcularFechaLimite()
}

function calcularFechaLimite() {
  if (!formulario.value.fecha_ingreso) return
  const tipo = tiposTramite.value.find((t) => t.id === formulario.value.tipo_tramite_id)
  const dep = dependencias.value.find((d) => d.id === formulario.value.dependencia_id)
  const dias = tipo?.dias_habiles_compromiso || dep?.dias_habiles_compromiso || 10
  formulario.value.fecha_limite_estimada = calcularFechaLimiteDiasHabiles(
    formulario.value.fecha_ingreso,
    dias
  )
}

function cerrar() {
  emit('update:modelValue', false)
}

async function guardar() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }

  guardando.value = true
  errorMsg.value = null

  try {
    const payload: Partial<TramiteEscritura> = {
      ...formulario.value,
      escritura_id: props.escrituraId
    }

    if (esEdicion.value && props.tramite?.id) {
      await actualizarTramite(props.tramite.id, payload)
    } else {
      await crearTramite(payload)
    }

    emit('saved')
    cerrar()
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al procesar trámite'
  } finally {
    guardando.value = false
  }
}
</script>
