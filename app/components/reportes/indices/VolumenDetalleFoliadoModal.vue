<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1200"
    scrollable
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg bg-surface">
      <!-- Encabezado del Diálogo -->
      <v-toolbar color="primary" density="comfortable" class="px-4">
        <v-icon icon="mdi-book-open-page-variant" class="mr-3" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Foliado del Protocolo — Volumen {{ volumen }}
        </v-toolbar-title>
        <v-spacer />

        <!-- Botones de Acción Rápida -->
        <v-btn
          color="white"
          variant="tonal"
          density="comfortable"
          prepend-icon="mdi-printer"
          class="mr-2 text-none font-weight-medium"
          :disabled="cargando || escrituras.length === 0"
          @click="emit('imprimir-indice')"
        >
          Imprimir Índice Oficial
        </v-btn>

        <v-btn
          color="white"
          variant="text"
          density="comfortable"
          prepend-icon="mdi-file-excel-outline"
          class="mr-2 text-none font-weight-medium"
          :disabled="cargando || escrituras.length === 0"
          @click="emit('exportar-csv')"
        >
          Exportar CSV
        </v-btn>

        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          density="compact"
          @click="cerrar"
        />
      </v-toolbar>

      <v-card-text class="pa-4">
        <!-- Banner Informativo -->
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
          icon="mdi-information-outline"
        >
          <div class="text-caption">
            Capture o actualice las páginas de inicio y fin para cada instrumento del volumen.
            Recuerde que las escrituras canceladas (No Pasó) conservan su foliado en el libro según la Ley del Notariado.
          </div>
        </v-alert>

        <!-- Mensaje de Error General si existe -->
        <v-alert
          v-if="errorEdicion"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
          @click:close="errorEdicion = null"
        >
          {{ errorEdicion }}
        </v-alert>

        <!-- Estado Cargando -->
        <div v-if="cargando" class="d-flex justify-center align-center py-10">
          <v-progress-circular indeterminate color="primary" size="36" class="mr-3" />
          <span class="text-caption text-grey-darken-1">Cargando instrumentos del volumen {{ volumen }}...</span>
        </div>

        <!-- Tabla de Escrituras y Foliado -->
        <v-table v-else hover density="comfortable">
          <thead>
            <tr class="bg-grey-lighten-4">
              <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 100px;">
                Instrumento
              </th>
              <th class="text-left font-weight-bold text-caption text-uppercase" style="width: 130px;">
                Fecha Firma
              </th>
              <th class="text-left font-weight-bold text-caption text-uppercase">
                Acto Jurídico
              </th>
              <th class="text-left font-weight-bold text-caption text-uppercase" style="min-width: 220px;">
                Comparecientes y Rol
              </th>
              <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 110px;">
                Estatus
              </th>
              <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 130px;">
                Pág. Inicial
              </th>
              <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 130px;">
                Pág. Final
              </th>
              <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 100px;">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="esc in escriturasLocal"
              :key="esc.id"
              :class="{ 'bg-red-lighten-5': esc.errorFoliado, 'bg-amber-lighten-5': esc.estatus === 'anulada' }"
            >
              <!-- Instrumento -->
              <td class="font-weight-bold text-primary">
                № {{ esc.instrumento }}
              </td>

              <!-- Fecha Celebración -->
              <td>
                <span v-if="esc.fecha_celebracion" class="text-body-2">
                  {{ formatearFecha(esc.fecha_celebracion) }}
                </span>
                <span v-else class="text-caption text-grey-darken-1 font-italic">
                  Pendiente
                </span>
              </td>

              <!-- Acto Jurídico -->
              <td>
                <div class="font-weight-medium text-grey-darken-3">
                  {{ esc.acto_nombre }}
                </div>
              </td>

              <!-- Comparecientes -->
              <td>
                <div v-if="esc.comparecientes_resumen && esc.comparecientes_resumen.length > 0" class="text-caption">
                  <div
                    v-for="(comp, cIdx) in esc.comparecientes_resumen"
                    :key="cIdx"
                    class="d-flex align-baseline ga-1 mb-1"
                  >
                    <span class="text-grey-darken-2 font-weight-bold">{{ comp.rol }}:</span>
                    <span class="text-grey-darken-3">{{ comp.nombre }}</span>
                  </div>
                </div>
                <div v-else class="text-caption text-grey-darken-1 font-italic">
                  Sin comparecientes registrados
                </div>
              </td>

              <!-- Estatus -->
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="getColorEstatus(esc.estatus)"
                  variant="tonal"
                  class="font-weight-bold text-uppercase"
                >
                  {{ esc.estatus === 'anulada' ? 'Cancelada' : esc.estatus === 'protocolizada' ? 'Firmada' : 'Trámite' }}
                </v-chip>
              </td>

              <!-- Input Página Inicial -->
              <td>
                <v-text-field
                  v-model.number="esc.pagina_inicial"
                  type="number"
                  min="1"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="width: 100px; margin: 0 auto;"
                  :error="esc.errorFoliado"
                  :disabled="guardando"
                  placeholder="Inicio"
                  @update:model-value="validarFila(esc)"
                />
              </td>

              <!-- Input Página Final -->
              <td>
                <v-text-field
                  v-model.number="esc.pagina_final"
                  type="number"
                  min="1"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="width: 100px; margin: 0 auto;"
                  :error="esc.errorFoliado"
                  :disabled="guardando"
                  placeholder="Fin"
                  @update:model-value="validarFila(esc)"
                />
              </td>

              <!-- Acción Guardar -->
              <td class="text-center">
                <v-btn
                  icon="mdi-content-save-outline"
                  variant="tonal"
                  size="small"
                  color="primary"
                  :loading="guardando && guardandoId === esc.id"
                  :disabled="esc.errorFoliado || guardando"
                  title="Guardar foliado"
                  @click="onGuardarFoliado(esc)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-grey-lighten-5 d-flex justify-space-between">
        <div class="text-caption text-grey-darken-1">
          Total escrituras: <strong>{{ escrituras.length }}</strong> |
          Foliadas completas: <strong>{{ foliadasContador }}</strong>
        </div>
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
import { ref, computed, watch } from 'vue'
import type { EscrituraIndiceItem } from '~/types/reportes'

interface EscrituraEdicion extends EscrituraIndiceItem {
  errorFoliado?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    volumen: number | null
    escrituras: EscrituraIndiceItem[]
    cargando?: boolean
    guardando?: boolean
  }>(),
  {
    cargando: false,
    guardando: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'guardar-foliado', payload: { escrituraId: string; paginaInicial: number | null; paginaFinal: number | null }): void
  (e: 'imprimir-indice'): void
  (e: 'exportar-csv'): void
}>()

const escriturasLocal = ref<EscrituraEdicion[]>([])
const guardandoId = ref<string | null>(null)
const errorEdicion = ref<string | null>(null)

watch(
  () => props.escrituras,
  (nuevas) => {
    escriturasLocal.value = nuevas.map((e) => ({
      ...e,
      errorFoliado: false,
    }))
  },
  { immediate: true, deep: true }
)

const foliadasContador = computed(() => {
  return escriturasLocal.value.filter(
    (e) => e.pagina_inicial != null && e.pagina_final != null && !e.errorFoliado
  ).length
})

function validarFila(esc: EscrituraEdicion) {
  if (esc.pagina_inicial != null && esc.pagina_final != null) {
    if (esc.pagina_final < esc.pagina_inicial) {
      esc.errorFoliado = true
      errorEdicion.value = `En la escritura № ${esc.instrumento}, la página final (${esc.pagina_final}) no puede ser menor a la inicial (${esc.pagina_inicial}).`
      return
    }
  }
  esc.errorFoliado = false
  errorEdicion.value = null
}

function onGuardarFoliado(esc: EscrituraEdicion) {
  validarFila(esc)
  if (esc.errorFoliado) return

  guardandoId.value = esc.id
  emit('guardar-foliado', {
    escrituraId: esc.id,
    paginaInicial: esc.pagina_inicial ?? null,
    paginaFinal: esc.pagina_final ?? null,
  })
}

function cerrar() {
  emit('update:modelValue', false)
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

function formatearFecha(fechaStr?: string): string {
  if (!fechaStr) return ''
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return fechaStr
}
</script>
