<template>
  <v-card
    v-if="notificacion"
    variant="outlined"
    class="rounded-xl border shadow-sm h-100 d-flex flex-column overflow-hidden bg-surface"
  >
    <!-- Encabezado del Visor -->
    <div class="pa-4 border-b bg-surface-light d-flex align-center justify-space-between">
      <div>
        <div class="d-flex align-center ga-2 mb-1">
          <v-chip size="x-small" color="secondary" variant="tonal" class="font-weight-bold">
            {{ etiquetaEvento(notificacion.tipo_evento) }}
          </v-chip>
          <span v-if="notificacion.escrituras?.instrumento" class="text-caption font-monospace text-grey-darken-1">
            Inst. #{{ notificacion.escrituras.instrumento }}
          </span>
        </div>
        <h3 class="text-subtitle-1 font-weight-bold text-primary">
          {{ notificacion.asunto || 'Aviso Notarial' }}
        </h3>
      </div>
      <div class="d-flex align-center ga-1">
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="grey-darken-1"
          @click="$emit('close')"
        />
      </div>
    </div>

    <!-- Contenido scrolleable -->
    <div class="pa-4 flex-grow-1 overflow-y-auto d-flex flex-column ga-4">
      <!-- Tarjeta del Destinatario -->
      <div class="pa-3 rounded-lg bg-surface border d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" size="36" class="text-white text-caption font-weight-bold">
            {{ iniciales(notificacion.destinatario_nombre) }}
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-bold text-primary">
              {{ notificacion.destinatario_nombre }}
            </div>
            <div class="text-caption text-grey-darken-1 d-flex align-center ga-1">
              <v-icon size="14" :color="colorCanal(notificacion.canal)">
                {{ iconoCanal(notificacion.canal) }}
              </v-icon>
              <span>{{ notificacion.destinatario_contacto }}</span>
            </div>
          </div>
        </div>
        <v-chip
          size="small"
          :color="colorEstatus(notificacion.estatus)"
          variant="tonal"
          class="font-weight-bold"
        >
          <v-icon start size="14">
            {{ iconoEstatus(notificacion.estatus) }}
          </v-icon>
          {{ etiquetaEstatus(notificacion.estatus) }}
        </v-chip>
      </div>

      <!-- Previsualización del Mensaje según Canal -->
      <div>
        <div class="text-caption text-grey font-weight-bold text-uppercase mb-2 d-flex align-center ga-1">
          <v-icon size="14">mdi-text-box-search-outline</v-icon>
          <span>Previsualización de Mensaje Saliente</span>
        </div>

        <!-- Vista WhatsApp Chat Bubble -->
        <div
          v-if="notificacion.canal === 'whatsapp'"
          class="whatsapp-bubble pa-4 rounded-lg border position-relative"
        >
          <div class="whatsapp-header border-b pb-2 mb-2">
            <div class="text-caption font-weight-bold text-primary">
              NOTARÍA PÚBLICA 42 DE LA CIUDAD DE MÉXICO
            </div>
            <div class="text-caption text-green-darken-3 font-italic">
              Protocolo Notarial Digital · Asistente Oficial
            </div>
          </div>

          <div class="text-body-2 text-pre-wrap text-grey-darken-3 mb-3">
            {{ notificacion.cuerpo_renderizado }}
          </div>

          <!-- Botón de apertura a WhatsApp Web si está disponible -->
          <div v-if="whatsappUrl" class="mt-3">
            <v-btn
              data-testid="btn-abrir-whatsapp-web"
              block
              color="success"
              variant="flat"
              size="small"
              class="rounded-lg text-none"
              prepend-icon="mdi-whatsapp"
              @click="$emit('abrir-whatsapp', whatsappUrl)"
            >
              Abrir Chat en WhatsApp Web
            </v-btn>
          </div>

          <div class="text-right text-caption text-grey mt-2">
            {{ formatearFechaHora(notificacion.created_at) }} · Enviado mediante enlace seguro
          </div>
        </div>

        <!-- Vista Correo Electrónico -->
        <div
          v-else-if="notificacion.canal === 'correo'"
          class="email-container pa-4 rounded-lg border bg-surface-light"
        >
          <div class="border-b pb-2 mb-3 text-caption">
            <div><strong>De:</strong> notificaciones@notaria42.com.mx</div>
            <div><strong>Para:</strong> {{ notificacion.destinatario_nombre }} &lt;{{ notificacion.destinatario_contacto }}&gt;</div>
            <div v-if="notificacion.asunto"><strong>Asunto:</strong> {{ notificacion.asunto }}</div>
          </div>
          <div class="text-body-2 text-pre-wrap text-grey-darken-3">
            {{ notificacion.cuerpo_renderizado }}
          </div>
        </div>

        <!-- Vista SMS -->
        <div
          v-else
          class="sms-container pa-3 rounded-lg border bg-grey-lighten-4"
        >
          <div class="text-caption text-grey mb-1">Mensaje de Texto SMS (160 caracteres estándar)</div>
          <div class="text-body-2 text-grey-darken-3">
            {{ notificacion.cuerpo_renderizado }}
          </div>
        </div>
      </div>

      <!-- Archivos Adjuntos -->
      <div v-if="notificacion.archivos_adjuntos && notificacion.archivos_adjuntos.length > 0">
        <div class="text-caption text-grey font-weight-bold text-uppercase mb-2 d-flex align-center ga-1">
          <v-icon size="14">mdi-paperclip</v-icon>
          <span>Archivos Adjuntos ({{ notificacion.archivos_adjuntos.length }})</span>
        </div>
        <div class="d-flex flex-column ga-2">
          <v-card
            v-for="(adjunto, index) in notificacion.archivos_adjuntos"
            :key="index"
            variant="outlined"
            class="pa-2 rounded-lg d-flex align-center justify-space-between bg-surface"
          >
            <div class="d-flex align-center ga-2 text-truncate mr-2">
              <v-icon color="primary" size="20">mdi-file-pdf-box</v-icon>
              <div class="text-truncate">
                <div class="text-body-2 font-weight-medium text-truncate">
                  {{ adjunto.nombre }}
                </div>
                <div v-if="adjunto.tamano_bytes" class="text-caption text-grey">
                  {{ (adjunto.tamano_bytes / 1024).toFixed(1) }} KB
                </div>
              </div>
            </div>
            <v-btn
              icon="mdi-download"
              size="small"
              variant="text"
              color="primary"
              :href="adjunto.url"
              target="_blank"
            />
          </v-card>
        </div>
      </div>

      <!-- Cadena de Custodia & Metadatos de Auditoría -->
      <div class="border-t pt-3">
        <div class="text-caption text-grey font-weight-bold text-uppercase mb-2">
          Cadena de Custodia & Auditoría
        </div>
        <div class="pa-3 rounded-lg bg-surface-light border text-caption text-grey-darken-2 d-flex flex-column ga-1 font-monospace">
          <div class="d-flex justify-space-between">
            <span class="text-grey">Intentos de Envío:</span>
            <span class="font-weight-bold">{{ notificacion.intentos_envio || 1 }}</span>
          </div>
          <div v-if="notificacion.error_detalle" class="d-flex justify-space-between text-error">
            <span>Motivo Falla:</span>
            <span class="text-truncate" style="max-width: 200px;">{{ notificacion.error_detalle }}</span>
          </div>
          <div class="d-flex justify-space-between">
            <span class="text-grey">Fecha Registro:</span>
            <span>{{ formatearFechaHora(notificacion.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer con Reenvío en 1 Clic -->
    <div class="pa-3 border-t bg-surface-light d-flex align-center justify-space-between ga-2">
      <!-- Selector de canal alternativo si falló -->
      <v-menu v-if="notificacion.estatus === 'fallido'">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            variant="outlined"
            size="small"
            color="primary"
            class="text-none"
            prepend-icon="mdi-swap-horizontal"
          >
            Cambiar Canal
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item
            v-if="notificacion.canal !== 'whatsapp'"
            title="Reenviar por WhatsApp"
            prepend-icon="mdi-whatsapp"
            @click="$emit('reenviar', 'whatsapp')"
          />
          <v-list-item
            v-if="notificacion.canal !== 'correo'"
            title="Reenviar por Correo"
            prepend-icon="mdi-email-outline"
            @click="$emit('reenviar', 'correo')"
          />
          <v-list-item
            v-if="notificacion.canal !== 'sms'"
            title="Reenviar por SMS"
            prepend-icon="mdi-message-text-outline"
            @click="$emit('reenviar', 'sms')"
          />
        </v-list>
      </v-menu>
      <div v-else class="text-caption text-grey d-flex align-center ga-1">
        <v-icon size="14" color="success">mdi-shield-check</v-icon>
        <span>Canal Oficial Certificado</span>
      </div>

      <v-btn
        data-testid="btn-visor-reenviar"
        color="primary"
        variant="flat"
        size="small"
        :loading="Boolean(enviando)"
        class="text-none font-weight-medium rounded-lg"
        prepend-icon="mdi-refresh"
        @click="$emit('reenviar')"
      >
        Reenviar en 1 Clic
      </v-btn>
    </div>
  </v-card>
  <v-card
    v-else
    variant="outlined"
    class="rounded-xl border pa-8 h-100 d-flex flex-column align-center justify-center text-center text-grey bg-surface"
  >
    <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-email-open-outline</v-icon>
    <div class="text-subtitle-1 font-weight-medium">Seleccione una Notificación</div>
    <div class="text-caption">Haga clic en cualquier renglón de la bitácora para previsualizar el mensaje y sus acuses.</div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  NotificacionBitacoraItem,
  CanalNotificacion,
  EstatusNotificacion,
  TipoEventoNotarial,
} from '~/types/notificaciones'
import { generarUrlWhatsAppWeb } from '~/utils/interpoladorNotificaciones'

const props = defineProps<{
  notificacion: NotificacionBitacoraItem | null
  enviando?: boolean
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'reenviar', canalAlternativo?: CanalNotificacion): void
  (e: 'abrir-whatsapp', url: string): void
}>()

const whatsappUrl = computed(() => {
  if (!props.notificacion) return ''
  if (props.notificacion.metadata?.whatsapp_web_url) {
    return props.notificacion.metadata.whatsapp_web_url
  }
  if (props.notificacion.canal === 'whatsapp') {
    return generarUrlWhatsAppWeb(
      props.notificacion.destinatario_contacto,
      props.notificacion.cuerpo_renderizado,
      props.notificacion.archivos_adjuntos || []
    )
  }
  return ''
})

function iniciales(nombre?: string): string {
  if (!nombre) return 'CL'
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()
}

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

function etiquetaEvento(tipo?: TipoEventoNotarial): string {
  switch (tipo) {
    case 'cita_firma': return 'Citatorio Firma'
    case 'tramite_avance': return 'Trámite RPP/Catastro'
    case 'orden_pago_emitida': return 'Orden de Pago'
    case 'pago_liquidado': return 'Acreditación Pago'
    case 'testimonio_listo': return 'Testimonio Listo'
    default: return 'Aviso Manual'
  }
}

function formatearFechaHora(fechaIso?: string): string {
  if (!fechaIso) return ''
  try {
    const d = new Date(fechaIso)
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return fechaIso
  }
}
</script>

<style scoped>
.whatsapp-bubble {
  background-color: #e7f0eb;
  border-color: #c5ded0;
}
.text-pre-wrap {
  white-space: pre-wrap;
}
</style>
