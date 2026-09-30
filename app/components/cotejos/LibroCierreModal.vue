<template>
  <v-dialog
    :model-value="modelValue"
    max-width="650px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-error text-white pa-4">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-book-lock-outline" class="mr-2" />
          <span class="text-h6 font-weight-bold">Clausura y Cierre Formal de Libro de Cotejos</span>
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

      <v-card-text class="pa-5">
        <v-alert
          color="warning"
          variant="tonal"
          density="comfortable"
          icon="mdi-alert-octagon-outline"
          class="mb-4"
        >
          <strong>Atención:</strong> Esta acción es irreversible. Al clausurar el libro, ningún auxiliar ni usuario podrá asentar nuevas actas de cotejo en este tomo.
        </v-alert>

        <div v-if="libro" class="mb-4">
          <div class="border pa-3 rounded bg-grey-lighten-4 mb-4">
            <div class="text-subtitle-2 font-weight-bold text-primary mb-1">
              Libro No. {{ libro.numero_libro }} · Ejercicio Notarial {{ libro.anio }}
            </div>
            <div class="d-flex gap-4 text-body-2">
              <span><strong>Total Asientos:</strong> {{ libro.total_actas || 0 }} actas</span>
              <span><strong>Límite:</strong> {{ libro.limite_actas }} actas</span>
            </div>
          </div>

          <!-- Acta solemne de clausura generada -->
          <v-textarea
            v-model="textoClausura"
            label="Fórmula Solemne de Clausura (Acta de Cierre) *"
            variant="outlined"
            density="comfortable"
            rows="6"
            class="text-caption font-mono"
            hint="Puede personalizar los términos de la certificación de cierre antes de firmar."
            persistent-hint
          />
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 justify-space-between">
        <v-btn
          variant="text"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          class="font-weight-bold px-6"
          :loading="guardando"
          :disabled="guardando || !libro"
          @click="ejecutarCierre"
        >
          <v-icon icon="mdi-lock" class="mr-2" />
          Confirmar y Clausurar Libro
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LibroCotejo } from '~/types/cotejos'
import { useCotejos } from '~/composables/useCotejos'

const props = defineProps<{
  modelValue: boolean
  libro: LibroCotejo | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cerrado'): void
}>()

const { cerrarLibro, generarTextoClausuraLibro, guardando } = useCotejos()

const textoClausura = ref('')

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto && props.libro) {
      textoClausura.value = generarTextoClausuraLibro(props.libro)
    }
  }
)

function cerrar() {
  emit('update:modelValue', false)
}

async function ejecutarCierre() {
  if (!props.libro) return
  try {
    await cerrarLibro(props.libro.id, textoClausura.value)
    emit('cerrado')
    cerrar()
  } catch (err) {
    console.error('Error al cerrar libro:', err)
  }
}
</script>
