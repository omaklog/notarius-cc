<template>
  <div class="reporte-general-escrituras">
    <!-- Barra de Herramientas y Filtros -->
    <v-card variant="outlined" class="pa-4 mb-4 rounded-lg bg-surface">
      <div class="d-flex flex-column flex-md-row align-md-center justify-space-between ga-3">
        <!-- Buscador -->
        <div style="max-width: 400px; width: 100%;">
          <v-text-field
            :model-value="busqueda"
            density="compact"
            variant="outlined"
            placeholder="Buscar por instrumento, acto, redactor o volumen..."
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            :disabled="cargando"
            @update:model-value="onActualizarBusqueda"
          />
        </div>

        <!-- Filtros Rápidos de Estatus y Acciones -->
        <div class="d-flex align-center flex-wrap ga-2">
          <!-- Filtro de Estatus Notarial -->
          <v-btn-toggle
            :model-value="filtroEstatus"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            divided
            @update:model-value="onActualizarFiltroEstatus"
          >
            <v-btn value="todas" class="text-none text-caption font-weight-medium">
              Todas
            </v-btn>
            <v-btn value="borrador" class="text-none text-caption font-weight-medium">
              En Trámite
            </v-btn>
            <v-btn value="protocolizada" class="text-none text-caption font-weight-medium">
              Firmadas
            </v-btn>
            <v-btn value="anulada" class="text-none text-caption font-weight-medium">
              Canceladas
            </v-btn>
          </v-btn-toggle>

          <v-divider vertical class="mx-1 d-none d-sm-block" style="height: 28px;" />

          <!-- Botón Refrescar -->
          <v-btn
            icon="mdi-refresh"
            variant="tonal"
            density="compact"
            color="primary"
            :loading="cargando"
            title="Refrescar listado"
            @click="emit('refrescar')"
          />

          <!-- Botón Exportar CSV -->
          <v-btn
            color="primary"
            variant="flat"
            density="comfortable"
            prepend-icon="mdi-file-excel-outline"
            class="text-none font-weight-medium"
            :disabled="cargando || escrituras.length === 0"
            @click="emit('exportar-csv')"
          >
            Exportar a Excel (CSV)
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Resumen Métricas Rápidas -->
    <div class="d-flex align-center justify-space-between mb-3 px-1">
      <div class="text-caption text-grey-darken-1">
        Mostrando <strong>{{ escrituras.length }}</strong> escrituras registradas
      </div>
      <div class="d-flex align-center ga-3 text-caption">
        <span class="d-flex align-center">
          <v-icon icon="mdi-clipboard-clock-outline" size="14" color="warning" class="mr-1" />
          Trámites activos en gestoría: <strong>{{ totalTramitesAsignados }}</strong>
        </span>
        <span class="d-flex align-center">
          <v-icon icon="mdi-check-circle-outline" size="14" color="success" class="mr-1" />
          Trámites liberados: <strong>{{ totalTramitesLiberados }}</strong>
        </span>
      </div>
    </div>

    <!-- Tabla Principal de Escrituras -->
    <v-card variant="outlined" class="rounded-lg bg-surface overflow-hidden">
      <v-table hover density="comfortable">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 120px;">
              Instrumento
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 90px;">
              Volumen
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 140px;">
              Fecha Firma
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase">
              Acto Jurídico
            </th>
            <th class="text-left font-weight-bold text-caption text-uppercase">
              Abogado Redactor
            </th>
            <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 130px;">
              Estatus
            </th>
            <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 170px;">
              Gestoría (Asig / Lib)
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Estado Cargando -->
          <tr v-if="cargando">
            <td colspan="7" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="32" class="mr-2" />
              <span class="text-caption text-grey-darken-1">Cargando reporte de escrituras y gestoría...</span>
            </td>
          </tr>

          <!-- Estado Vacío -->
          <tr v-else-if="escrituras.length === 0">
            <td colspan="7" class="text-center py-8 text-grey-darken-1">
              <v-icon icon="mdi-file-search-outline" size="36" class="mb-2 text-grey-lighten-1 d-block mx-auto" />
              <div class="text-subtitle-2 font-weight-bold">No se encontraron escrituras</div>
              <div class="text-caption">Intente ajustando el filtro de estatus o el término de búsqueda.</div>
            </td>
          </tr>

          <!-- Lista de Escrituras -->
          <tr v-for="esc in escrituras" :key="esc.id" class="escritura-row">
            <td class="font-weight-bold text-primary">
              № {{ esc.instrumento }}
              <div class="text-caption text-grey-darken-1 font-weight-regular">
                Año {{ esc.anio }}
              </div>
            </td>
            <td>
              Vol. {{ esc.volumen }}
            </td>
            <td>
              <span v-if="esc.fecha_celebracion" class="text-body-2">
                {{ formatearFecha(esc.fecha_celebracion) }}
              </span>
              <span v-else class="text-caption text-grey-darken-1 font-italic">
                Pendiente de firma
              </span>
            </td>
            <td>
              <div class="font-weight-medium text-grey-darken-3">
                {{ esc.acto_nombre }}
              </div>
            </td>
            <td>
              <div class="d-flex align-center">
                <v-icon icon="mdi-account-outline" size="14" class="mr-1 text-grey-darken-1" />
                <span class="text-body-2 text-grey-darken-3">{{ esc.redactor_nombre }}</span>
              </div>
            </td>
            <td class="text-center">
              <v-chip
                :color="getColorEstatus(esc.estatus)"
                size="small"
                variant="tonal"
                class="font-weight-bold text-caption text-uppercase"
              >
                {{ getEtiquetaEstatus(esc.estatus) }}
              </v-chip>
            </td>
            <td class="text-center">
              <div class="d-flex align-center justify-center ga-2">
                <v-tooltip text="Trámites activos asignados al gestor" location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-chip
                      v-bind="tooltipProps"
                      size="x-small"
                      :color="esc.tramites_asignados > 0 ? 'warning' : 'grey-lighten-1'"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      <v-icon start icon="mdi-clock-outline" size="12" />
                      {{ esc.tramites_asignados }}
                    </v-chip>
                  </template>
                </v-tooltip>

                <span class="text-grey-darken-1">/</span>

                <v-tooltip text="Trámites concluidos y liberados" location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-chip
                      v-bind="tooltipProps"
                      size="x-small"
                      :color="esc.tramites_liberados > 0 ? 'success' : 'grey-lighten-1'"
                      variant="flat"
                      class="font-weight-bold"
                    >
                      <v-icon start icon="mdi-check" size="12" />
                      {{ esc.tramites_liberados }}
                    </v-chip>
                  </template>
                </v-tooltip>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReporteEscrituraGeneralItem } from '~/types/reportes'

const props = withDefaults(
  defineProps<{
    escrituras: ReporteEscrituraGeneralItem[]
    cargando?: boolean
    filtroEstatus?: string
    busqueda?: string
  }>(),
  {
    cargando: false,
    filtroEstatus: 'todas',
    busqueda: '',
  }
)

const emit = defineEmits<{
  (e: 'update:filtroEstatus', val: string): void
  (e: 'update:busqueda', val: string): void
  (e: 'exportar-csv'): void
  (e: 'refrescar'): void
}>()

const totalTramitesAsignados = computed(() => {
  return props.escrituras.reduce((acc, curr) => acc + (curr.tramites_asignados || 0), 0)
})

const totalTramitesLiberados = computed(() => {
  return props.escrituras.reduce((acc, curr) => acc + (curr.tramites_liberados || 0), 0)
})

function onActualizarBusqueda(val: string) {
  emit('update:busqueda', val || '')
}

function onActualizarFiltroEstatus(val: string) {
  emit('update:filtroEstatus', val || 'todas')
}

function getColorEstatus(estatus: string): string {
  switch (estatus) {
    case 'protocolizada':
      return 'success'
    case 'borrador':
      return 'warning'
    case 'anulada':
      return 'error'
    default:
      return 'grey-darken-1'
  }
}

function getEtiquetaEstatus(estatus: string): string {
  switch (estatus) {
    case 'protocolizada':
      return 'Firmada'
    case 'borrador':
      return 'En Trámite'
    case 'anulada':
      return 'Cancelada'
    default:
      return estatus
  }
}

function formatearFecha(fechaStr?: string): string {
  if (!fechaStr) return ''
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return fechaStr
}
</script>

<style scoped>
.escritura-row:hover {
  background-color: rgba(27, 58, 95, 0.03);
}
</style>
