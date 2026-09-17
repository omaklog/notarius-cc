<template>
  <v-dialog
    :model-value="modelValue"
    max-width="580"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg shadow-xl">
      <!-- Encabezado Modal -->
      <v-card-item class="bg-primary text-white py-4 px-6">
        <div class="d-flex align-center justify-space-between">
          <div class="d-flex align-center gap-3">
            <v-avatar color="white" size="36" class="text-primary mr-3">
              <v-icon icon="mdi-bank-plus" size="20" />
            </v-avatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold leading-tight">
                Iniciar Gestión en Dependencia
              </div>
              <div class="text-caption text-blue-lighten-4">
                Habilita una nueva tarjeta de autoridad para registrar movimientos
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
        <div v-if="dependenciasDisponibles.length === 0" class="text-center py-6">
          <v-icon icon="mdi-check-all" size="48" color="success" class="mb-2" />
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-3">
            Todas las Dependencias Están Iniciadas
          </div>
          <div class="text-caption text-grey-darken-1 mt-1">
            Todas las autoridades oficiales configuradas en el catálogo ya cuentan con su tarjeta activa en este instrumento.
          </div>
        </div>

        <div v-else>
          <div class="text-caption font-weight-bold text-grey-darken-2 mb-3">
            Selecciona la Dependencia Gubernamental a Incorporar:
          </div>

          <v-list class="pa-0">
            <v-card
              v-for="dep in dependenciasDisponibles"
              :key="dep.id || dep.sigla"
              variant="outlined"
              class="mb-3 rounded-lg hover-elevate transition-all"
              link
              @click="seleccionar(dep)"
            >
              <v-card-item class="pa-3">
                <template #prepend>
                  <v-avatar :color="obtenerColorDependencia(dep.clave_numerica)" size="40" class="mr-3 text-white">
                    <v-icon :icon="obtenerIconoDependencia(dep.clave_numerica)" size="22" />
                  </v-avatar>
                </template>
                <v-card-title class="text-subtitle-2 font-weight-bold text-grey-darken-3">
                  {{ dep.nombre }}
                </v-card-title>
                <v-card-subtitle class="text-caption text-grey-darken-1 d-flex align-center gap-2 mt-1">
                  <v-chip size="x-small" color="primary" variant="outlined" class="font-weight-medium">
                    {{ dep.sigla }}
                  </v-chip>
                  <span class="text-caption ml-2">
                    <v-icon icon="mdi-clock-outline" size="13" class="mr-1" />
                    {{ dep.dias_habiles_compromiso }} días hábiles promedio
                  </span>
                </v-card-subtitle>
                <template #append>
                  <v-btn
                    icon="mdi-chevron-right"
                    variant="text"
                    color="grey-darken-1"
                    density="comfortable"
                  />
                </template>
              </v-card-item>
            </v-card>
          </v-list>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5 justify-end">
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="text-capitalize px-4"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { DependenciaOficial } from '~/types/tramites'

defineProps<{
  modelValue: boolean
  dependenciasDisponibles: DependenciaOficial[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'seleccionada', dep: DependenciaOficial): void
}>()

function cerrar() {
  emit('update:modelValue', false)
}

function seleccionar(dep: DependenciaOficial) {
  emit('seleccionada', dep)
  cerrar()
}

function obtenerIconoDependencia(clave?: number | null): string {
  switch (clave) {
    case 1:
      return 'mdi-map-marker-path'
    case 2:
      return 'mdi-city-variant'
    case 3:
      return 'mdi-library-shelves'
    case 4:
      return 'mdi-folder-cog-outline'
    case 5:
      return 'mdi-home-city'
    default:
      return 'mdi-domain'
  }
}

function obtenerColorDependencia(clave?: number | null): string {
  switch (clave) {
    case 1:
      return '#2F6F4E' // Verde catastro
    case 2:
      return '#0288D1' // Celeste municipal
    case 3:
      return '#1B3A5F' // Azul marino notarial RPP
    case 4:
      return '#A9762E' // Bronce control interno
    case 5:
      return '#E65100' // Naranja Infonavit
    default:
      return '#546E7A'
  }
}
</script>

<style scoped>
.hover-elevate:hover {
  border-color: #1B3A5F !important;
  background-color: #f8fafc;
  transform: translateY(-1px);
}
</style>
