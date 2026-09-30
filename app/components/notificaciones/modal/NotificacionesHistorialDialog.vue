<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl border shadow-lg bg-surface d-flex flex-column" style="max-height: 85vh;">
      <!-- Header -->
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between shrink-0">
        <div class="d-flex align-center ga-2">
          <v-icon size="22">mdi-bell-ring-outline</v-icon>
          <span class="text-h6 font-weight-bold">
            Avisos Notariales — Instrumento #{{ instrumento }}
          </span>
        </div>
        <div class="d-flex align-center ga-2">
          <v-btn
            color="secondary"
            variant="flat"
            size="small"
            class="text-none font-weight-medium rounded-lg"
            prepend-icon="mdi-pencil-plus-outline"
            @click="modalRedactarVisible = true"
          >
            + Redactar Aviso
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            color="white"
            @click="$emit('update:modelValue', false)"
          />
        </div>
      </v-card-title>

      <!-- Contenido: Lista / Tabla de notificaciones de la escritura -->
      <div class="pa-4 flex-grow-1 overflow-y-auto">
        <div v-if="cargando" class="text-center py-8 text-grey">
          <v-progress-circular indeterminate color="primary" class="mr-2" size="24" />
          Cargando avisos del instrumento...
        </div>

        <div v-else-if="bitacora.length === 0" class="text-center py-8 text-grey">
          <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-email-outline</v-icon>
          <div class="text-subtitle-1 font-weight-medium">Sin avisos registrados</div>
          <div class="text-caption">No se han emitido notificaciones para esta escritura aún.</div>
        </div>

        <v-table v-else density="comfortable" class="notificaciones-escritura-table border rounded-lg">
          <thead>
            <tr class="bg-surface-light text-caption text-uppercase text-grey-darken-2">
              <th class="text-left font-weight-bold">Fecha</th>
              <th class="text-left font-weight-bold">Destinatario</th>
              <th class="text-left font-weight-bold">Canal</th>
              <th class="text-left font-weight-bold">Asunto / Resumen</th>
              <th class="text-left font-weight-bold">Estatus</th>
              <th class="text-right font-weight-bold">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in bitacora" :key="item.id">
              <td class="text-caption font-monospace text-grey-darken-1">
                {{ formatearFecha(item.created_at) }}
              </td>
              <td>
                <div class="font-weight-medium text-body-2">{{ item.destinatario_nombre }}</div>
                <div class="text-caption text-grey">{{ item.destinatario_contacto }}</div>
              </td>
              <td>
                <div class="d-flex align-center ga-1 text-caption font-weight-medium">
                  <v-icon size="14" :color="item.canal === 'whatsapp' ? 'success' : 'primary'">
                    {{ item.canal === 'whatsapp' ? 'mdi-whatsapp' : 'mdi-email-outline' }}
                  </v-icon>
                  <span class="text-capitalize">{{ item.canal }}</span>
                </div>
              </td>
              <td>
                <div class="text-body-2 font-weight-medium text-truncate" style="max-width: 220px;">
                  {{ item.asunto || item.cuerpo_renderizado }}
                </div>
                <div v-if="item.archivos_adjuntos && item.archivos_adjuntos.length > 0" class="text-caption text-primary">
                  📎 {{ item.archivos_adjuntos.length }} archivo(s) adjunto(s)
                </div>
              </td>
              <td>
                <v-chip
                  size="x-small"
                  :color="colorEstatus(item.estatus)"
                  variant="tonal"
                  class="font-weight-medium text-capitalize"
                >
                  {{ item.estatus }}
                </v-chip>
              </td>
              <td class="text-right">
                <v-btn
                  icon="mdi-refresh"
                  variant="text"
                  size="small"
                  :loading="Boolean(enviando)"
                  color="grey-darken-1"
                  title="Reenviar"
                  @click="onReenviar(item.id)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <!-- Footer -->
      <v-card-actions class="pa-4 bg-surface-light border-t d-flex justify-end shrink-0">
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="text-none"
          @click="$emit('update:modelValue', false)"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal de redacción rápida dentro del contexto de la escritura -->
    <RedactarNotificacionModal
      v-if="modalRedactarVisible"
      v-model="modalRedactarVisible"
      :plantillas="plantillas"
      :escritura-id-preseleccionada="escrituraId"
      @enviado="onNotificacionEnviada"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificaciones } from '~/composables/useNotificaciones'
import type { EstatusNotificacion } from '~/types/notificaciones'
import RedactarNotificacionModal from '~/components/notificaciones/modal/RedactarNotificacionModal.vue'

const props = defineProps<{
  modelValue: boolean
  escrituraId: string
  instrumento?: number | string
}>()

defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const {
  bitacora,
  plantillas,
  cargando,
  enviando,
  cargarBitacora,
  cargarPlantillas,
  reenviarNotificacion,
} = useNotificaciones()

const modalRedactarVisible = ref(false)

onMounted(async () => {
  await Promise.all([
    cargarBitacora({ escritura_id: props.escrituraId }),
    cargarPlantillas(),
  ])
})

async function onReenviar(id: string) {
  await reenviarNotificacion(id)
}

function onNotificacionEnviada() {
  modalRedactarVisible.value = false
  cargarBitacora({ escritura_id: props.escrituraId })
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
