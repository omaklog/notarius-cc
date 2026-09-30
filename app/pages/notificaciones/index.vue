<template>
  <v-container fluid class="pa-6">
    <!-- Breadcrumb & Header Stitch Layout -->
    <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center ga-4 mb-5">
      <div>
        <nav class="text-caption text-grey mb-1 d-flex align-center ga-1">
          <span>Inicio</span>
          <v-icon size="14">mdi-chevron-right</v-icon>
          <span>Comunicación & Clientes</span>
          <v-icon size="14">mdi-chevron-right</v-icon>
          <span class="text-primary font-weight-medium">Notificaciones y Avisos</span>
        </nav>
        <h1 class="text-h4 font-weight-bold text-primary tracking-tight">
          Centro de Notificaciones y Avisos a Comparecientes
        </h1>
        <p class="text-body-2 text-grey-darken-1 mt-1" style="max-width: 800px;">
          Seguimiento de citatorios a firma, acuses de cotejo, recordatorios de pago y avisos de folio real por WhatsApp, SMS y Correo Electrónico.
        </p>
      </div>

      <!-- Botones de Acción Primaria -->
      <div class="d-flex align-center ga-3 shrink-0">
        <v-btn
          data-testid="btn-configurar-plantillas"
          variant="outlined"
          color="primary"
          class="rounded-lg text-none font-weight-medium"
          prepend-icon="mdi-tune"
          @click="modalPlantillasVisible = true"
        >
          Configurar Plantillas
          <v-chip size="x-small" variant="flat" color="surface-light" class="ml-2 font-monospace">
            12 oficiales
          </v-chip>
        </v-btn>

        <v-btn
          data-testid="btn-redactar-notificacion"
          color="primary"
          variant="flat"
          class="rounded-lg text-none font-weight-medium shadow-sm"
          prepend-icon="mdi-pencil-plus-outline"
          @click="modalRedactarVisible = true"
        >
          + Redactar Notificación
        </v-btn>
      </div>
    </div>

    <!-- 4 Tarjetas de Métricas Notariales (KPIs) -->
    <NotificacionesKpisBar :kpis="kpis" />

    <!-- 2 Columnas Operativas: Tabla de Bitácora + Visor de Mensaje -->
    <v-row density="comfortable" class="mt-2" style="min-height: 580px;">
      <!-- Columna Izquierda: Tabla interactiva -->
      <v-col cols="12" :lg="notificacionSeleccionada ? 7 : 12" class="d-flex flex-column">
        <NotificacionesTable
          :items="bitacora"
          :cargando="cargando"
          :selected-id="notificacionSeleccionada?.id"
          @select="onSelectNotificacion"
          @reenviar="onReenviar"
          @filtrar="onFiltrar"
        />
      </v-col>

      <!-- Columna Derecha: Visor Drawer de Mensaje Notarial -->
      <v-col v-if="notificacionSeleccionada" cols="12" lg="5" class="d-flex flex-column">
        <NotificacionesVisorDrawer
          :notificacion="notificacionSeleccionada"
          :enviando="enviando"
          @close="notificacionSeleccionada = null"
          @reenviar="onReenviar"
          @abrir-whatsapp="onAbrirWhatsApp"
        />
      </v-col>
    </v-row>

    <!-- Modales de Notificaciones -->
    <RedactarNotificacionModal
      v-if="modalRedactarVisible"
      v-model="modalRedactarVisible"
      :plantillas="plantillas"
      @enviado="onNotificacionEnviada"
    />

    <ConfigurarPlantillasModal
      v-if="modalPlantillasVisible"
      v-model="modalPlantillasVisible"
      :plantillas="plantillas"
      @actualizado="cargarPlantillas"
    />

    <!-- Feedback Snackbar / Toast -->
    <v-snackbar v-model="snackbarVisible" :color="snackbarColor" timeout="4000" location="top right">
      {{ snackbarMensaje }}
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbarVisible = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificaciones } from '~/composables/useNotificaciones'
import type {
  NotificacionBitacoraItem,
  CanalNotificacion,
} from '~/types/notificaciones'
import NotificacionesKpisBar from '~/components/notificaciones/NotificacionesKpisBar.vue'
import NotificacionesTable from '~/components/notificaciones/NotificacionesTable.vue'
import NotificacionesVisorDrawer from '~/components/notificaciones/NotificacionesVisorDrawer.vue'
import RedactarNotificacionModal from '~/components/notificaciones/modal/RedactarNotificacionModal.vue'
import ConfigurarPlantillasModal from '~/components/notificaciones/modal/ConfigurarPlantillasModal.vue'

definePageMeta({
  title: 'Notificaciones y Avisos',
  layout: 'default',
})

const {
  bitacora,
  plantillas,
  kpis,
  cargando,
  enviando,
  cargarBitacora,
  cargarPlantillas,
  cargarKpis,
  reenviarNotificacion,
} = useNotificaciones()

const notificacionSeleccionada = ref<NotificacionBitacoraItem | null>(null)
const modalRedactarVisible = ref(false)
const modalPlantillasVisible = ref(false)

const snackbarVisible = ref(false)
const snackbarMensaje = ref('')
const snackbarColor = ref('success')

function notificar(msg: string, color = 'success') {
  snackbarMensaje.value = msg
  snackbarColor.value = color
  snackbarVisible.value = true
}

onMounted(async () => {
  await Promise.all([
    cargarBitacora(),
    cargarPlantillas(),
    cargarKpis(),
  ])
  if (bitacora.value.length > 0) {
    notificacionSeleccionada.value = bitacora.value[0]
  }
})

function onSelectNotificacion(item: NotificacionBitacoraItem) {
  notificacionSeleccionada.value = item
}

async function onReenviar(itemOcanal?: NotificacionBitacoraItem | CanalNotificacion) {
  let targetItem = notificacionSeleccionada.value
  let canalAlternativo: CanalNotificacion | undefined

  if (typeof itemOcanal === 'object' && itemOcanal !== null) {
    targetItem = itemOcanal
    notificacionSeleccionada.value = itemOcanal
  } else if (typeof itemOcanal === 'string') {
    canalAlternativo = itemOcanal
  }

  if (!targetItem?.id) return

  const res = await reenviarNotificacion(targetItem.id, canalAlternativo)
  if (res.ok) {
    notificar('Notificación reenviada exitosamente.', 'success')
  } else {
    notificar(res.error || 'Error al reenviar notificación.', 'error')
  }
}

function onFiltrar(filtros: { canal: string; estatus: string; busqueda: string }) {
  cargarBitacora({
    canal: filtros.canal as any,
    estatus: filtros.estatus as any,
    busqueda: filtros.busqueda,
  })
}

function onAbrirWhatsApp(url: string) {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
  }
}

function onNotificacionEnviada() {
  notificar('Notificación despachada correctamente.', 'success')
  modalRedactarVisible.value = false
}

defineExpose({
  modalRedactarVisible,
  modalPlantillasVisible,
  notificacionSeleccionada,
})
</script>
