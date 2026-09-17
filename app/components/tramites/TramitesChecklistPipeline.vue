<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { PasoEscrituraItem } from '~/types/tramites'
import { useTramites } from '~/composables/useTramites'
import { formatearMonedaMXN } from '~/utils/ordenesPagoUtils'

const props = withDefaults(
  defineProps<{
    escrituraId: string
    readOnly?: boolean
  }>(),
  {
    readOnly: false,
  }
)

const emit = defineEmits<{
  (
    e: 'abrir-orden-pago',
    data: { pasoId: number; dependenciaClave: number; concepto: string }
  ): void
  (e: 'actualizado'): void
}>()

const {
  pasosEscritura,
  cargando,
  cargarPasosEscritura,
  togglePasoEscritura,
} = useTramites()

const actualizandoPaso = ref<number | null>(null)

onMounted(async () => {
  await cargarPasosEscritura(props.escrituraId)
})

const totalPasos = computed(() => pasosEscritura.value.length)
const pasosCompletados = computed(
  () => pasosEscritura.value.filter((p) => p.completado).length
)
const porcentajeAvance = computed(() => {
  if (totalPasos.value === 0) return 0
  return Math.round((pasosCompletados.value / totalPasos.value) * 100)
})

function getDependenciaColor(clave: number): string {
  switch (clave) {
    case 0:
      return 'primary' // Notaría / Interno (#1B3A5F)
    case 1:
      return 'success' // Catastro Estatal
    case 2:
      return 'teal' // Catastro Municipal
    case 3:
      return 'deep-purple' // Registro Público
    case 4:
      return 'amber-darken-3' // Control Interno / Entrega
    default:
      return 'blue-grey'
  }
}

function getDependenciaNombre(clave: number): string {
  switch (clave) {
    case 0:
      return 'Notaría / Gestión Interna'
    case 1:
      return 'Catastro Estatal'
    case 2:
      return 'Catastro Municipal'
    case 3:
      return 'Registro Público (R.P.P.)'
    case 4:
      return 'Control Interno y Entrega'
    default:
      return 'Oficial'
  }
}

async function onCheckChange(item: PasoEscrituraItem) {
  if (props.readOnly) return
  actualizandoPaso.value = item.paso_id
  try {
    const nuevoEstado = !item.completado
    await togglePasoEscritura(
      props.escrituraId,
      item.paso_id,
      nuevoEstado,
      item.orden_pago_id,
      item.notas
    )
    emit('actualizado')
  } finally {
    actualizandoPaso.value = null
  }
}

function solicitarOrdenPago(item: PasoEscrituraItem) {
  emit('abrir-orden-pago', {
    pasoId: item.paso_id,
    dependenciaClave: item.dependencia_clave,
    concepto: item.paso_nombre,
  })
}
</script>

<template>
  <v-card variant="outlined" class="mb-4 rounded-lg bg-surface">
    <v-card-title class="pa-4 d-flex align-center justify-space-between flex-wrap gap-2 bg-grey-lighten-4">
      <div class="d-flex align-center">
        <v-icon icon="mdi-format-list-checks" color="primary" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold text-primary">
          Pipeline y Checklist de Gestoría Notarial (17 Pasos)
        </span>
      </div>
      <div class="d-flex align-center gap-3">
        <span class="text-caption font-weight-bold text-medium-emphasis">
          {{ pasosCompletados }} de {{ totalPasos }} pasos completados ({{ porcentajeAvance }}%)
        </span>
        <div style="width: 140px">
          <v-progress-linear
            :model-value="porcentajeAvance"
            color="success"
            height="8"
            rounded
          />
        </div>
      </div>
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-4">
      <div v-if="cargando && pasosEscritura.length === 0" class="text-center pa-4 text-grey">
        <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
        Cargando checklist de pasos...
      </div>

      <div v-else class="checklist-grid">
        <v-card
          v-for="item in pasosEscritura"
          :key="item.paso_id"
          variant="outlined"
          :class="[
            'pa-3 paso-card transition-swing',
            item.completado ? 'paso-completado bg-green-lighten-5' : 'bg-white',
          ]"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center flex-grow-1 mr-2">
              <v-checkbox-btn
                :model-value="item.completado"
                :disabled="readOnly || actualizandoPaso === item.paso_id"
                color="success"
                density="compact"
                class="mr-2"
                @update:model-value="() => onCheckChange(item)"
              />
              <div>
                <div class="d-flex align-center gap-2 mb-1">
                  <span class="text-caption font-weight-bold text-grey-darken-1">
                    #{{ item.paso_orden }}
                  </span>
                  <span
                    :class="[
                      'font-weight-bold text-body-2',
                      item.completado ? 'text-decoration-line-through text-medium-emphasis' : 'text-primary',
                    ]"
                  >
                    {{ item.paso_nombre }}
                  </span>
                </div>
                <div class="d-flex align-center gap-1">
                  <v-chip
                    size="x-small"
                    :color="getDependenciaColor(item.dependencia_clave)"
                    variant="tonal"
                    class="font-weight-medium"
                  >
                    {{ getDependenciaNombre(item.dependencia_clave) }}
                  </v-chip>
                  <span
                    v-if="item.fecha_completado"
                    class="text-caption text-grey ml-1"
                  >
                    · Concluido el {{ new Date(item.fecha_completado).toLocaleDateString('es-MX') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Botón o Chip si Genera Orden de Pago -->
            <div v-if="item.genera_orden_pago" class="d-flex align-center">
              <v-chip
                v-if="item.orden_pago_id"
                size="small"
                color="info"
                variant="flat"
                prepend-icon="mdi-cash-check"
              >
                {{ item.orden_pago_folio }} · {{ formatearMonedaMXN(item.orden_pago_monto) }}
              </v-chip>
              <v-btn
                v-else-if="!readOnly"
                size="x-small"
                color="amber-darken-3"
                variant="outlined"
                prepend-icon="mdi-cash-plus"
                @click="solicitarOrdenPago(item)"
              >
                Crear O.P.
              </v-btn>
            </div>
          </div>
        </v-card>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.checklist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.paso-card {
  border-radius: 8px;
  border-left: 4px solid #1b3a5f !important;
}
.paso-completado {
  border-left-color: #2e7d32 !important;
}
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
</style>
