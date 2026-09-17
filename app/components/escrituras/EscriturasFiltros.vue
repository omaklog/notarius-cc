<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface ActoJuridicoItem {
  id: string
  nombre: string
}

export interface ResponsableItem {
  id: string
  nombre_completo?: string
  nombre?: string
}

export interface EscriturasFiltrosValues {
  estatus: string | null
  actoJuridicoId: string | null
  fechaDesde: string | null
  fechaHasta: string | null
  responsableId: string | null
}

const props = withDefaults(
  defineProps<{
    actosJuridicos?: ActoJuridicoItem[]
    responsables?: ResponsableItem[]
    modelValue?: Partial<EscriturasFiltrosValues>
  }>(),
  {
    actosJuridicos: () => [],
    responsables: () => [],
    modelValue: () => ({}),
  },
)

const emit = defineEmits<{
  'update:modelValue': [values: EscriturasFiltrosValues]
  filter: [values: EscriturasFiltrosValues]
  change: [values: EscriturasFiltrosValues]
}>()

const ESTATUS_OPTIONS = [
  { value: 'borrador', title: 'Borrador' },
  { value: 'protocolizada', title: 'Protocolizada' },
  { value: 'anulada', title: 'Anulada' },
]

const estatus = ref<string | null>(props.modelValue.estatus ?? null)
const actoJuridicoId = ref<string | null>(props.modelValue.actoJuridicoId ?? null)
const fechaDesde = ref<string | null>(props.modelValue.fechaDesde ?? null)
const fechaHasta = ref<string | null>(props.modelValue.fechaHasta ?? null)
const responsableId = ref<string | null>(props.modelValue.responsableId ?? null)

const responsablesItems = computed(() =>
  props.responsables.map((r) => ({
    id: r.id,
    nombre: r.nombre_completo ?? r.nombre ?? r.id,
  })),
)

function getValues(): EscriturasFiltrosValues {
  return {
    estatus: estatus.value || null,
    actoJuridicoId: actoJuridicoId.value || null,
    fechaDesde: fechaDesde.value || null,
    fechaHasta: fechaHasta.value || null,
    responsableId: responsableId.value || null,
  }
}

function emitir(): void {
  const values = getValues()
  emit('update:modelValue', values)
  emit('filter', values)
  emit('change', values)
}

watch([estatus, actoJuridicoId, fechaDesde, fechaHasta, responsableId], () => {
  emitir()
})

function limpiar(): void {
  estatus.value = null
  actoJuridicoId.value = null
  fechaDesde.value = null
  fechaHasta.value = null
  responsableId.value = null
}

defineExpose({
  estatus,
  actoJuridicoId,
  fechaDesde,
  fechaHasta,
  responsableId,
  getValues,
  emitir,
  limpiar,
})
</script>

<template>
  <v-card variant="outlined" class="pa-4 mb-4">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-2 font-weight-bold">Filtros</div>
      <v-btn variant="text" size="small" @click="limpiar">
        Limpiar filtros
      </v-btn>
    </div>

    <v-row density="comfortable">
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="estatus"
          label="Estatus"
          :items="ESTATUS_OPTIONS"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="actoJuridicoId"
          label="Acto jurídico"
          :items="actosJuridicos"
          item-title="nombre"
          item-value="id"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>

      <v-col cols="12" sm="6" md="2">
        <v-text-field
          v-model="fechaDesde"
          label="Fecha desde"
          type="date"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>

      <v-col cols="12" sm="6" md="2">
        <v-text-field
          v-model="fechaHasta"
          label="Fecha hasta"
          type="date"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="responsableId"
          label="Responsable"
          :items="responsablesItems"
          item-title="nombre"
          item-value="id"
          variant="outlined"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
    </v-row>
  </v-card>
</template>
