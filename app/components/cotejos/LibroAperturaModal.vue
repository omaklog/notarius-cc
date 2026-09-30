<template>
  <v-dialog
    :model-value="modelValue"
    max-width="550px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-card-title class="d-flex align-center justify-space-between bg-primary text-white pa-4">
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-book-plus-multiple-outline" class="mr-2" />
          <span class="text-h6 font-weight-bold">Apertura de Nuevo Libro de Cotejos</span>
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
        <v-form ref="formRef" v-model="formValido" @submit.prevent="guardar">
          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="numeroLibro"
                label="Número de Libro / Tomo *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => v >= 1 || 'Debe ser un número positivo']"
                required
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="anio"
                label="Año de Ejercicio *"
                type="number"
                min="2020"
                variant="outlined"
                density="comfortable"
                :rules="[(v) => v >= 2020 || 'Año no válido']"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-text-field
                v-model.number="limiteActas"
                label="Límite Reglamentario de Actas *"
                type="number"
                min="10"
                variant="outlined"
                density="comfortable"
                hint="Habitualmente 200 o 500 actas conforme a la Ley del Notariado local."
                persistent-hint
                :rules="[(v) => v >= 10 || 'Mínimo 10 actas']"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="notas"
                label="Notas o Razón de Apertura (Opcional)"
                placeholder="Razón administrativa de apertura de tomo..."
                variant="outlined"
                density="comfortable"
                rows="2"
              />
            </v-col>
          </v-row>
        </v-form>
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
          color="primary"
          variant="flat"
          class="text-white font-weight-bold px-6"
          :loading="guardando"
          :disabled="!formValido || guardando"
          @click="guardar"
        >
          <v-icon icon="mdi-check" class="mr-2" />
          Aperturar Libro
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCotejos } from '~/composables/useCotejos'

const props = defineProps<{
  modelValue: boolean
  siguienteNumeroSugerido?: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'aperturado'): void
}>()

const { abrirNuevoLibro, guardando } = useCotejos()

const formRef = ref<any>(null)
const formValido = ref(false)

const numeroLibro = ref(1)
const anio = ref(new Date().getFullYear())
const limiteActas = ref(200)
const notas = ref('')

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      numeroLibro.value = props.siguienteNumeroSugerido || 1
      anio.value = new Date().getFullYear()
      limiteActas.value = 200
      notas.value = ''
    }
  }
)

function cerrar() {
  emit('update:modelValue', false)
}

async function guardar() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    await abrirNuevoLibro(numeroLibro.value, anio.value, limiteActas.value, notas.value)
    emit('aperturado')
    cerrar()
  } catch (err) {
    console.error('Error al aperturar libro:', err)
  }
}
</script>
