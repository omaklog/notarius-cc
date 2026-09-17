<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg shadow-xl">
      <!-- Encabezado Modal -->
      <v-card-item class="bg-primary text-white py-4 px-6">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar color="white" size="36" class="text-primary mr-3">
              <v-icon icon="mdi-file-document-edit-outline" size="20" />
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold leading-tight">
                Registrar Movimiento de Gestoría
              </div>
              <div class="text-caption text-blue-lighten-4">
                {{ dependencia?.nombre || 'Dependencia Oficial' }}
              </div>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            color="white"
            @click="cerrar"
          />
        </div>
      </v-card-item>

      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="guardar">
          <!-- Selector de Paso exclusivo de la Dependencia -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Paso de Gestoría Oficial *
            </label>
            <v-select
              v-model="pasoSeleccionadoId"
              :items="pasosDisponibles"
              item-title="nombre"
              item-value="id"
              placeholder="Seleccionar paso de esta autoridad..."
              variant="outlined"
              density="comfortable"
              :rules="[v => !!v || 'Debe seleccionar un paso']"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #append>
                    <v-chip
                      v-if="item?.raw?.genera_orden_pago"
                      size="x-small"
                      color="warning"
                      variant="flat"
                      class="font-weight-medium"
                    >
                      <v-icon icon="mdi-cash" start size="12" />
                      Genera O.P.
                    </v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </div>

          <!-- Fila de Fecha y Folio Oficial -->
          <v-row density="comfortable" class="mb-2">
            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Fecha del Movimiento *
              </label>
              <v-text-field
                v-model="fechaRegistro"
                type="date"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Fecha requerida']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Folio / Volante / No. Rechazo
              </label>
              <v-text-field
                v-model="folioVolante"
                placeholder="Ej. VOL-4412 o ENT-2026"
                prepend-inner-icon="mdi-ticket-outline"
                variant="outlined"
                density="comfortable"
                clearable
              />
            </v-col>
          </v-row>

          <!-- Notas u Observaciones -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Notas u Observaciones Notariales
            </label>
            <v-textarea
              v-model="notas"
              placeholder="Indicar causas de prevención/rechazo, requisitos solventados o folio de entrega..."
              variant="outlined"
              rows="3"
              density="comfortable"
              counter="500"
              maxlength="500"
            />
          </div>

          <!-- Banner de Orden de Pago si el paso lo amerita -->
          <v-slide-y-transition>
            <div
              v-if="pasoActualObj?.genera_orden_pago"
              class="mb-4 pa-3 rounded-lg border bg-amber-lighten-5 border-amber-lighten-2 d-flex align-center justify-space-between"
            >
              <div class="d-flex align-center mr-3">
                <v-icon icon="mdi-cash-register" color="amber-darken-3" class="mr-2" size="24" />
                <div>
                  <div class="text-subtitle-2 font-weight-bold text-amber-darken-4">
                    Paso Financiero de Derechos Oficiales
                  </div>
                  <div class="text-caption text-amber-darken-3">
                    Este paso habilita la expedición de una Orden de Pago para derechos de ventanilla.
                  </div>
                </div>
              </div>
              <v-btn
                color="amber-darken-3"
                variant="elevated"
                size="small"
                class="text-capitalize"
                prepend-icon="mdi-plus"
                @click="dispararOrdenPago"
              >
                Generar O.P.
              </v-btn>
            </div>
          </v-slide-y-transition>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end">
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="text-capitalize px-4"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          class="text-capitalize px-5"
          prepend-icon="mdi-check"
          :loading="guardando"
          :disabled="!pasoSeleccionadoId"
          @click="guardar"
        >
          Guardar Paso
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PasoTramite, HistorialPasoEscritura } from '~/types/tramites'
import { useTramites } from '~/composables/useTramites'

const props = defineProps<{
  modelValue: boolean
  escrituraId: string
  dependencia?: {
    clave_numerica: number
    nombre: string
    sigla?: string
    id?: string | null
  } | null
  pasoPreseleccionado?: PasoTramite | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'guardado', paso: HistorialPasoEscritura): void
  (e: 'abrir-orden-pago', payload: { dependenciaId?: string; concepto?: string; pasoId?: number }): void
}>()

const { obtenerPasosPorDependencia, agregarPasoHistorial, cargarPasosCatalogo, pasosCatalogo, dependencias } = useTramites()

const formRef = ref<any>(null)
const pasoSeleccionadoId = ref<number | null>(null)
const fechaRegistro = ref<string>(new Date().toISOString().split('T')[0])
const folioVolante = ref<string>('')
const notas = ref<string>('')
const guardando = ref<boolean>(false)

onMounted(async () => {
  if (pasosCatalogo.value.length === 0) {
    await cargarPasosCatalogo().catch(() => {})
  }
})

// Pasos filtrados exclusivamente para la dependencia de esta tarjeta
const pasosDisponibles = computed<PasoTramite[]>(() => {
  if (!props.dependencia) return []
  return obtenerPasosPorDependencia(props.dependencia.clave_numerica)
})

const pasoActualObj = computed<PasoTramite | undefined>(() => {
  return pasosDisponibles.value.find((p) => p.id === pasoSeleccionadoId.value)
})

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      fechaRegistro.value = new Date().toISOString().split('T')[0]
      folioVolante.value = ''
      notas.value = ''
      if (pasosCatalogo.value.length === 0) {
        await cargarPasosCatalogo().catch(() => {})
      }
      if (props.pasoPreseleccionado) {
        pasoSeleccionadoId.value = props.pasoPreseleccionado.id
      } else if (pasosDisponibles.value.length > 0) {
        pasoSeleccionadoId.value = pasosDisponibles.value[0].id
      } else {
        pasoSeleccionadoId.value = null
      }
    }
  },
  { immediate: true }
)

function cerrar() {
  emit('update:modelValue', false)
}

function obtenerDependenciaUuid(): string | null {
  if (props.dependencia?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(props.dependencia.id)) {
    return props.dependencia.id
  }
  const match = dependencias.value.find(
    (d) => d.clave_numerica === props.dependencia?.clave_numerica || d.nombre === props.dependencia?.nombre
  )
  if (match?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(match.id)) {
    return match.id
  }
  return null
}

function dispararOrdenPago() {
  const depId = obtenerDependenciaUuid()
  emit('abrir-orden-pago', {
    dependenciaId: depId || undefined,
    pasoId: pasoSeleccionadoId.value || undefined,
    concepto: pasoActualObj.value?.nombre
      ? `Pago de Derechos: ${pasoActualObj.value.nombre} (${props.dependencia?.nombre || 'Dependencia'})`
      : `Pago de Derechos ante ${props.dependencia?.nombre || 'Dependencia Oficial'}`
  })
}

async function guardar() {
  if (!pasoSeleccionadoId.value) return

  const depId = obtenerDependenciaUuid()
  guardando.value = true
  try {
    const res = await agregarPasoHistorial({
      escritura_id: props.escrituraId,
      paso_id: pasoSeleccionadoId.value,
      dependencia_clave: props.dependencia?.clave_numerica ?? 0,
      dependencia_id: depId,
      folio_volante: folioVolante.value.trim() || null,
      notas: notas.value.trim() || null,
      fecha_registro: new Date(fechaRegistro.value).toISOString()
    })

    emit('guardado', res)
    cerrar()
  } catch (err) {
    console.error('Error al guardar paso de gestoría:', err)
  } finally {
    guardando.value = false
  }
}
</script>
