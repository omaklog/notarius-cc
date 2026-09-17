<template>
  <div class="predio-colindancias-form">
    <div class="d-flex align-center justify-space-between mb-3 flex-wrap gap-2">
      <div>
        <div class="text-subtitle-2 font-weight-bold text-grey-darken-4 d-flex align-center">
          <v-icon icon="mdi-compass-outline" size="20" class="mr-1.5 text-primary" />
          <span>Medidas y Colindancias del Predio</span>
        </div>
        <div class="text-caption text-grey-darken-1">
          Captura opcional de linderos por rumbo cardinal para la redacción notarial.
        </div>
      </div>

      <div v-if="editable" class="d-flex align-center gap-2">
        <v-btn
          v-if="coordenadasPoligono && coordenadasPoligono.length >= 3"
          variant="tonal"
          color="primary"
          size="small"
          density="comfortable"
          prepend-icon="mdi-auto-fix"
          class="text-capitalize font-weight-medium"
          @click="generarDesdePoligono"
        >
          Generar desde Polígono
        </v-btn>

        <v-btn
          variant="elevated"
          color="primary"
          size="small"
          density="comfortable"
          prepend-icon="mdi-plus"
          class="text-capitalize"
          @click="agregarColindanciaManual"
        >
          + Agregar Lindero
        </v-btn>
      </div>
    </div>

    <!-- Lista de Colindancias -->
    <div v-if="colindanciasLocales.length > 0" class="d-flex flex-column gap-2">
      <v-card
        v-for="(item, idx) in colindanciasLocales"
        :key="idx"
        variant="outlined"
        class="pa-3 rounded-lg bg-grey-lighten-5 border-grey-lighten-2"
      >
        <v-row density="comfortable" align="center">
          <!-- Selector de Orientación -->
          <v-col cols="12" sm="3">
            <v-select
              v-model="item.orientacion"
              :items="ORIENTACIONES"
              label="Orientación"
              density="compact"
              variant="outlined"
              hide-details
              :disabled="!editable"
              @update:model-value="notificarCambio"
            />
          </v-col>

          <!-- Distancia en Metros -->
          <v-col cols="12" sm="3">
            <v-text-field
              v-model.number="item.distancia_m"
              label="Medida (metros)"
              type="number"
              step="0.01"
              density="compact"
              variant="outlined"
              suffix="m"
              hide-details
              :disabled="!editable"
              @update:model-value="notificarCambio"
            />
          </v-col>

          <!-- Texto Libre: Colinda con -->
          <v-col cols="10" sm="5">
            <v-text-field
              v-model="item.colinda_con"
              label="Colinda con..."
              placeholder="Ej: Con Lote 4, Calle Hidalgo, etc."
              density="compact"
              variant="outlined"
              hide-details
              :disabled="!editable"
              @update:model-value="notificarCambio"
            />
          </v-col>

          <!-- Botón Eliminar -->
          <v-col cols="2" sm="1" class="text-right">
            <v-btn
              v-if="editable"
              icon
              variant="text"
              color="error"
              size="small"
              @click="eliminarColindancia(idx)"
            >
              <v-icon icon="mdi-trash-can-outline" size="18" />
            </v-btn>
          </v-col>
        </v-row>
      </v-card>
    </div>

    <div
      v-else
      class="pa-4 text-center rounded-lg border border-dashed border-grey-lighten-2 bg-grey-lighten-5 text-caption text-grey-darken-1"
    >
      <v-icon icon="mdi-map-marker-distance" size="28" class="mb-1 text-grey" />
      <div>No se han registrado linderos ni colindancias para este predio.</div>
      <div v-if="coordenadasPoligono && coordenadasPoligono.length >= 3" class="mt-1">
        Puedes pulsar <strong>"Generar desde Polígono"</strong> para calcular automáticamente los lados del terreno.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ColindanciaItem, OrientacionColindancia } from '~/types/predios'
import { calcularDistanciaMetros, determinarOrientacionAproximada } from '~/utils/geometriaUtils'

const ORIENTACIONES: OrientacionColindancia[] = [
  'Norte',
  'Sur',
  'Este',
  'Oeste',
  'Oriente',
  'Poniente',
  'Noreste',
  'Noroeste',
  'Sureste',
  'Suroeste'
]

const props = withDefaults(
  defineProps<{
    modelValue?: ColindanciaItem[]
    coordenadasPoligono?: [number, number][]
    editable?: boolean
  }>(),
  {
    modelValue: () => [],
    coordenadasPoligono: () => [],
    editable: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [val: ColindanciaItem[]]
  change: [val: ColindanciaItem[]]
}>()

const colindanciasLocales = ref<ColindanciaItem[]>([])

watch(
  () => props.modelValue,
  (nuevo) => {
    colindanciasLocales.value = nuevo ? [...nuevo] : []
  },
  { immediate: true, deep: true }
)

function notificarCambio() {
  emit('update:modelValue', [...colindanciasLocales.value])
  emit('change', [...colindanciasLocales.value])
}

function agregarColindanciaManual() {
  colindanciasLocales.value.push({
    orientacion: 'Norte',
    distancia_m: null,
    colinda_con: ''
  })
  notificarCambio()
}

function eliminarColindancia(idx: number) {
  colindanciasLocales.value.splice(idx, 1)
  notificarCambio()
}

/**
 * Calcula automáticamente un lindero por cada lado del polígono
 */
function generarDesdePoligono() {
  if (!props.coordenadasPoligono || props.coordenadasPoligono.length < 3) return

  let coords = [...props.coordenadasPoligono]
  // Asegurar anillo cerrado para iterar lados
  const primero = coords[0]
  const ultimo = coords[coords.length - 1]
  if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
    coords.push([...primero])
  }

  const generadas: ColindanciaItem[] = []

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]

    const dist = calcularDistanciaMetros(p1, p2)
    const orient = determinarOrientacionAproximada(p1, p2)

    generadas.push({
      orientacion: orient,
      distancia_m: dist,
      colinda_con: ''
    })
  }

  colindanciasLocales.value = generadas
  notificarCambio()
}
</script>

<style scoped>
.predio-colindancias-form {
  font-family: inherit;
}
</style>
