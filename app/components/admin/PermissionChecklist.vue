<script setup lang="ts">
import { computed } from 'vue'

export interface Permiso {
  id: string
  modulo: string
  accion: string
  descripcion: string
  requiere_alcance: boolean
}

export interface AsignacionPermiso {
  permiso_id: string
  alcance: 'propias' | 'todas' | null
}

const props = defineProps<{
  permisos: Permiso[]
  modelValue: AsignacionPermiso[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AsignacionPermiso[]]
}>()

const grupos = computed(() => {
  const porModulo = new Map<string, Permiso[]>()
  for (const permiso of props.permisos) {
    const lista = porModulo.get(permiso.modulo) ?? []
    lista.push(permiso)
    porModulo.set(permiso.modulo, lista)
  }
  return Array.from(porModulo.entries()).map(([modulo, items]) => ({ modulo, items }))
})

function asignacionDe(permisoId: string): AsignacionPermiso | undefined {
  return props.modelValue.find((a) => a.permiso_id === permisoId)
}

function estaAsignado(permisoId: string): boolean {
  return asignacionDe(permisoId) !== undefined
}

function alcanceDe(permisoId: string): 'propias' | 'todas' | null {
  return asignacionDe(permisoId)?.alcance ?? 'propias'
}

function toggle(permiso: Permiso, checked: boolean): void {
  const siguiente = props.modelValue.filter((a) => a.permiso_id !== permiso.id)
  if (checked) {
    siguiente.push({
      permiso_id: permiso.id,
      alcance: permiso.requiere_alcance ? 'propias' : null,
    })
  }
  emit('update:modelValue', siguiente)
}

function cambiarAlcance(permiso: Permiso, alcance: 'propias' | 'todas'): void {
  const siguiente = props.modelValue.map((a) =>
    a.permiso_id === permiso.id ? { ...a, alcance } : a,
  )
  emit('update:modelValue', siguiente)
}
</script>

<template>
  <div>
    <div v-for="grupo in grupos" :key="grupo.modulo" class="mb-4">
      <div class="text-subtitle-2 text-uppercase text-medium-emphasis mb-1">{{ grupo.modulo }}</div>
      <div v-for="permiso in grupo.items" :key="permiso.id" class="d-flex align-center ga-2 mb-1">
        <v-checkbox
          :model-value="estaAsignado(permiso.id)"
          :label="permiso.descripcion"
          density="compact"
          hide-details
          @update:model-value="(checked) => toggle(permiso, !!checked)"
        />
        <v-select
          v-if="permiso.requiere_alcance && estaAsignado(permiso.id)"
          :model-value="alcanceDe(permiso.id)"
          :items="[
            { title: 'Propias', value: 'propias' },
            { title: 'Todas', value: 'todas' },
          ]"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 160px"
          @update:model-value="(alcance) => cambiarAlcance(permiso, alcance)"
        />
      </div>
    </div>
  </div>
</template>
