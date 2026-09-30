<template>
  <v-dialog
    :model-value="modelValue"
    max-width="750"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg bg-surface">
      <!-- Barra Superior -->
      <v-toolbar color="primary" density="comfortable" class="px-4">
        <v-icon icon="mdi-history" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Bitácora y Cadena de Custodia
        </v-toolbar-title>
        <v-spacer />

        <v-btn
          icon="mdi-refresh"
          variant="text"
          color="white"
          density="compact"
          :loading="cargando"
          title="Refrescar bitácora"
          @click="cargar"
        />

        <v-btn icon="mdi-close" variant="text" color="white" density="compact" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Resumen del Trámite -->
        <div v-if="tramiteNombre" class="mb-4 pa-3 rounded bg-grey-lighten-4 d-flex justify-space-between align-center flex-wrap ga-2">
          <div>
            <div class="text-caption text-grey-darken-1">Trámite Notarial</div>
            <div class="text-subtitle-2 font-weight-bold text-grey-darken-4">{{ tramiteNombre }}</div>
          </div>
          <div v-if="custodioActualNombre" class="text-right">
            <div class="text-caption text-grey-darken-1">Custodio Actual</div>
            <div class="text-body-2 font-weight-bold text-primary">{{ custodioActualNombre }}</div>
          </div>
        </div>

        <!-- Timeline de Movimientos -->
        <BitacoraTurnadoTimeline
          :eventos="eventos"
          :cargando="cargando"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5 d-flex justify-end">
        <v-btn
          variant="outlined"
          color="grey-darken-2"
          class="text-none font-weight-medium"
          @click="cerrar"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useTurnadoTramites } from '~/composables/useTurnadoTramites'
import BitacoraTurnadoTimeline from '~/components/tramites/BitacoraTurnadoTimeline.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    tramiteId?: string
    escrituraId?: string
    tramiteNombre?: string
    custodioActualNombre?: string
  }>(),
  {
    tramiteNombre: '',
    custodioActualNombre: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const { eventos, cargando, cargarHistorial } = useTurnadoTramites()

async function cargar() {
  await cargarHistorial(props.tramiteId, props.escrituraId)
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      cargar()
    }
  },
  { immediate: true }
)

function cerrar() {
  emit('update:modelValue', false)
}
</script>
