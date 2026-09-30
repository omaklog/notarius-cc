<template>
  <v-card variant="outlined" class="rounded-xl border shadow-sm flex-grow-1 d-flex flex-column overflow-hidden bg-surface">
    <!-- Header de la tabla y Filtros rápidos -->
    <div class="pa-4 border-b d-flex flex-wrap align-center justify-space-between ga-3 bg-surface-light">
      <div class="d-flex align-center ga-2">
        <v-icon color="primary" size="20">mdi-format-list-bulleted</v-icon>
        <span class="text-subtitle-2 font-weight-bold text-primary">
          Bitácora Oficial de Envíos y Acuses
        </span>
        <v-chip size="x-small" variant="tonal" color="primary" class="font-weight-medium">
          {{ items.length }} registros
        </v-chip>
      </div>

      <!-- Filtros rápidos de Canal y Estatus -->
      <div class="d-flex flex-wrap align-center ga-2">
        <v-btn-toggle
          v-model="filtroCanal"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
          class="rounded-lg"
          @update:model-value="onFiltroChange"
        >
          <v-btn value="todos" size="small">Todos</v-btn>
          <v-btn value="whatsapp" size="small">
            <v-icon start size="15" color="success">mdi-whatsapp</v-icon>
            WhatsApp
          </v-btn>
          <v-btn value="correo" size="small">
            <v-icon start size="15" color="primary">mdi-email-outline</v-icon>
            Correo
          </v-btn>
          <v-btn value="sms" size="small">
            <v-icon start size="15">mdi-message-text-outline</v-icon>
            SMS
          </v-btn>
        </v-btn-toggle>

        <v-select
          v-model="filtroEstatus"
          :items="opcionesEstatus"
          density="compact"
          variant="outlined"
          hide-details
          class="filtro-estatus-select"
          style="min-width: 140px;"
          @update:model-value="onFiltroChange"
        />
      </div>
    </div>

    <!-- Buscador -->
    <div class="px-4 py-2 border-b bg-surface">
      <v-text-field
        v-model="terminoBusqueda"
        prepend-inner-icon="mdi-magnify"
        placeholder="Buscar por compareciente, instrumento o contacto..."
        density="compact"
        variant="outlined"
        hide-details
        clearable
        @update:model-value="onFiltroChange"
      />
    </div>

    <!-- Tabla interactiva -->
    <v-table density="comfortable" hover class="notificaciones-table flex-grow-1 overflow-y-auto">
      <thead>
        <tr class="bg-surface-light text-caption text-uppercase text-grey-darken-2">
          <th class="text-left font-weight-bold" style="width: 110px;">Folio / Inst.</th>
          <th class="text-left font-weight-bold">Compareciente</th>
          <th class="text-left font-weight-bold">Notificación / Asunto</th>
          <th class="text-left font-weight-bold" style="width: 120px;">Envío</th>
          <th class="text-left font-weight-bold" style="width: 130px;">Estatus</th>
          <th class="text-right font-weight-bold" style="width: 100px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="cargando">
          <td colspan="6" class="text-center py-6 text-grey">
            <v-progress-circular indeterminate size="24" color="primary" class="mr-2" />
            Cargando bitácora de notificaciones...
          </td>
        </tr>
        <tr v-else-if="itemsFiltrados.length === 0">
          <td colspan="6" class="text-center py-6 text-grey">
            No se encontraron notificaciones que coincidan con los filtros aplicados.
          </td>
        </tr>
        <tr
          v-for="item in itemsFiltrados"
          :key="item.id"
          :class="[
            'cursor-pointer transition-colors',
            selectedId === item.id ? 'bg-blue-lighten-5 border-start-primary' : '',
            item.estatus === 'fallido' ? 'bg-red-lighten-5' : '',
          ]"
          @click="$emit('select', item)"
        >
          <!-- Folio / Instrumento -->
          <td class="font-weight-bold text-primary font-monospace">
            <template v-if="item.escrituras?.instrumento">
              #{{ item.escrituras.instrumento }}
            </template>
            <template v-else>
              <span class="text-grey font-weight-regular text-caption">S/I</span>
            </template>
          </td>

          <!-- Compareciente -->
          <td>
            <div class="font-weight-medium text-body-2">
              {{ item.destinatario_nombre }}
            </div>
            <div class="text-caption text-grey d-flex align-center ga-1">
              <v-icon size="13" :color="colorCanal(item.canal)">
                {{ iconoCanal(item.canal) }}
              </v-icon>
              <span>{{ item.destinatario_contacto }}</span>
            </div>
          </td>

          <!-- Notificación / Asunto -->
          <td>
            <div class="text-body-2 font-weight-medium text-truncate" style="max-width: 240px;">
              {{ item.asunto || item.cuerpo_renderizado }}
            </div>
            <div class="text-caption text-grey text-truncate" style="max-width: 240px;">
              {{ item.cuerpo_renderizado }}
            </div>
          </td>

          <!-- Fecha de Envío -->
          <td class="text-caption font-monospace text-grey-darken-1">
            {{ formatearFecha(item.created_at) }}
          </td>

          <!-- Estatus -->
          <td>
            <v-chip
              size="x-small"
              :color="colorEstatus(item.estatus)"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start size="12">
                {{ iconoEstatus(item.estatus) }}
              </v-icon>
              {{ etiquetaEstatus(item.estatus) }}
            </v-chip>
          </td>

          <!-- Acciones -->
          <td class="text-right" @click.stop>
            <v-tooltip text="Ver Detalle en Visor" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-eye-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  @click.stop="$emit('select', item)"
                />
              </template>
            </v-tooltip>

            <v-tooltip text="Reenviar Notificación" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :data-testid="`btn-reenviar-${item.id}`"
                  icon="mdi-refresh"
                  variant="text"
                  size="small"
                  :color="item.estatus === 'fallido' ? 'error' : 'grey-darken-1'"
                  @click.stop="$emit('reenviar', item)"
                />
              </template>
            </v-tooltip>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  NotificacionBitacoraItem,
  CanalNotificacion,
  EstatusNotificacion,
} from '~/types/notificaciones'

const props = defineProps<{
  items: NotificacionBitacoraItem[]
  cargando?: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', item: NotificacionBitacoraItem): void
  (e: 'reenviar', item: NotificacionBitacoraItem): void
  (e: 'filtrar', filtros: { canal: string; estatus: string; busqueda: string }): void
}>()

const filtroCanal = ref<CanalNotificacion | 'todos'>('todos')
const filtroEstatus = ref<EstatusNotificacion | 'todos'>('todos')
const terminoBusqueda = ref('')

const opcionesEstatus = [
  { title: 'Estatus: Todos', value: 'todos' },
  { title: 'Entregado', value: 'entregado' },
  { title: 'Enviado', value: 'enviado' },
  { title: 'Leído', value: 'leido' },
  { title: 'Fallido', value: 'fallido' },
  { title: 'Pendiente', value: 'pendiente' },
]

function onFiltroChange() {
  emit('filtrar', {
    canal: filtroCanal.value,
    estatus: filtroEstatus.value,
    busqueda: terminoBusqueda.value,
  })
}

const itemsFiltrados = computed(() => {
  return props.items.filter((item) => {
    if (filtroCanal.value !== 'todos' && item.canal !== filtroCanal.value) {
      return false
    }
    if (filtroEstatus.value !== 'todos' && item.estatus !== filtroEstatus.value) {
      return false
    }
    if (terminoBusqueda.value && terminoBusqueda.value.trim()) {
      const q = terminoBusqueda.value.toLowerCase().trim()
      const matchNombre = item.destinatario_nombre?.toLowerCase().includes(q)
      const matchContacto = item.destinatario_contacto?.toLowerCase().includes(q)
      const matchAsunto = item.asunto?.toLowerCase().includes(q)
      const matchCuerpo = item.cuerpo_renderizado?.toLowerCase().includes(q)
      const matchInst = item.escrituras?.instrumento?.toString().includes(q)
      if (!matchNombre && !matchContacto && !matchAsunto && !matchCuerpo && !matchInst) {
        return false
      }
    }
    return true
  })
})

function iconoCanal(canal: CanalNotificacion): string {
  switch (canal) {
    case 'whatsapp': return 'mdi-whatsapp'
    case 'correo': return 'mdi-email-outline'
    case 'sms': return 'mdi-message-text-outline'
    default: return 'mdi-send'
  }
}

function colorCanal(canal: CanalNotificacion): string {
  switch (canal) {
    case 'whatsapp': return 'success'
    case 'correo': return 'primary'
    case 'sms': return 'grey-darken-1'
    default: return 'grey'
  }
}

function iconoEstatus(estatus: EstatusNotificacion): string {
  switch (estatus) {
    case 'leido': return 'mdi-check-all'
    case 'entregado': return 'mdi-check'
    case 'enviado': return 'mdi-clock-outline'
    case 'fallido': return 'mdi-alert-circle-outline'
    case 'pendiente': return 'mdi-timer-sand'
    default: return 'mdi-help-circle-outline'
  }
}

function colorEstatus(estatus: EstatusNotificacion): string {
  switch (estatus) {
    case 'leido': return 'success'
    case 'entregado': return 'success'
    case 'enviado': return 'info'
    case 'fallido': return 'error'
    case 'pendiente': return 'warning'
    default: return 'grey'
  }
}

function etiquetaEstatus(estatus: EstatusNotificacion): string {
  switch (estatus) {
    case 'leido': return 'Leído'
    case 'entregado': return 'Entregado'
    case 'enviado': return 'Enviado'
    case 'fallido': return 'Fallido'
    case 'pendiente': return 'Pendiente'
    default: return estatus
  }
}

function formatearFecha(fechaIso: string): string {
  if (!fechaIso) return ''
  try {
    const d = new Date(fechaIso)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaIso
  }
}
</script>

<style scoped>
.border-start-primary {
  border-left: 4px solid rgb(var(--v-theme-primary)) !important;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
