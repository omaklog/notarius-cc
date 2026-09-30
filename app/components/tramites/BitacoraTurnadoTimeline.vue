<template>
  <div class="bitacora-turnado-timeline">
    <!-- Estado Cargando -->
    <div v-if="cargando" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate color="primary" size="32" class="mr-3" />
      <span class="text-caption text-grey-darken-1">Cargando bitácora de turnado...</span>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="!eventos || eventos.length === 0" class="text-center py-8 border-dashed rounded-lg bg-surface">
      <v-icon icon="mdi-history" size="36" color="grey-lighten-1" class="mb-2" />
      <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">Sin movimientos de turnado</div>
      <div class="text-caption text-grey-darken-1">Aún no se han registrado transferencias de custodia para este trámite.</div>
    </div>

    <!-- Lista Cronológica / Timeline -->
    <v-timeline
      v-else
      density="compact"
      align="start"
      truncate-line="both"
      class="pa-2"
    >
      <v-timeline-item
        v-for="ev in eventos"
        :key="ev.id"
        :dot-color="getColorEvento(ev.tipo_evento)"
        :icon="getIconoEvento(ev.tipo_evento)"
        size="small"
        fill-dot
      >
        <v-card variant="outlined" class="pa-3 mb-2 rounded-lg bg-surface">
          <!-- Cabecera del Evento -->
          <div class="d-flex justify-space-between align-start flex-wrap ga-2 mb-1">
            <div class="d-flex align-center flex-wrap ga-2">
              <v-chip
                size="x-small"
                :color="getColorEvento(ev.tipo_evento)"
                variant="flat"
                class="font-weight-bold text-uppercase"
              >
                {{ getEtiquetaEvento(ev.tipo_evento) }}
              </v-chip>

              <span class="text-caption text-grey-darken-1">
                {{ formatearFechaHora(ev.created_at) }}
              </span>
            </div>

            <!-- Tiempo acumulado en la custodia previa -->
            <v-chip
              v-if="ev.tiempo_custodia_horas > 0"
              size="x-small"
              color="grey-darken-1"
              variant="tonal"
              class="font-weight-medium"
            >
              <v-icon start icon="mdi-clock-outline" size="12" />
              Estuvo {{ formatearHoras(ev.tiempo_custodia_horas) }} en custodia previa
            </v-chip>
          </div>

          <!-- Pase de Estafeta: De -> A -->
          <div class="text-caption text-grey-darken-3 my-2">
            <span class="font-weight-bold">De:</span>
            <span class="text-primary font-weight-medium ml-1">{{ ev.usuario_origen_nombre }}</span>
            <span class="text-grey-darken-1 text-uppercase text-caption font-italic"> ({{ ev.rol_origen }})</span>
            <v-icon icon="mdi-arrow-right" size="14" class="mx-2 text-grey-darken-2" />
            <span class="font-weight-bold">A:</span>
            <span class="text-primary font-weight-medium ml-1">{{ ev.usuario_destino_nombre }}</span>
            <span class="text-grey-darken-1 text-uppercase text-caption font-italic"> ({{ ev.rol_destino }})</span>
          </div>

          <!-- Motivo y Observaciones -->
          <div class="text-body-2 text-grey-darken-4 bg-grey-lighten-4 pa-2 rounded mb-2">
            <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">Motivo / Justificación:</div>
            {{ ev.motivo }}
          </div>

          <!-- Datos de Prevención si aplica -->
          <div v-if="ev.folio_prevencion || ev.fecha_limite_solventacion" class="d-flex align-center flex-wrap ga-3 text-caption text-error font-weight-medium">
            <span v-if="ev.folio_prevencion">
              <v-icon icon="mdi-file-alert-outline" size="14" class="mr-1" />
              Oficio/Folio: <strong>{{ ev.folio_prevencion }}</strong>
            </span>
            <span v-if="ev.fecha_limite_solventacion">
              <v-icon icon="mdi-calendar-clock" size="14" class="mr-1" />
              Límite para solventar: <strong>{{ formatearFecha(ev.fecha_limite_solventacion) }}</strong>
            </span>
          </div>

          <!-- Instrucciones Adicionales -->
          <div v-if="ev.instrucciones" class="text-caption text-grey-darken-2 mt-1">
            <v-icon icon="mdi-information-outline" size="12" class="mr-1" />
            <em>Instrucciones: {{ ev.instrucciones }}</em>
          </div>
        </v-card>
      </v-timeline-item>
    </v-timeline>
  </div>
</template>

<script setup lang="ts">
import type { TurnadoEventoItem, TurnadoTipoEvento } from '~/types/turnado'

withDefaults(
  defineProps<{
    eventos: TurnadoEventoItem[]
    cargando?: boolean
  }>(),
  {
    cargando: false,
  }
)

function getColorEvento(tipo: TurnadoTipoEvento): string {
  switch (tipo) {
    case 'turnado_a_gestor':
      return 'primary'
    case 'devuelto_a_redactor_prevencion':
      return 'warning'
    case 'solventado_reingresado':
      return 'teal-darken-2'
    case 'tramite_concluido_entregado':
      return 'success'
    case 'reasignacion_administrativa':
      return 'deep-purple'
    default:
      return 'grey-darken-1'
  }
}

function getIconoEvento(tipo: TurnadoTipoEvento): string {
  switch (tipo) {
    case 'turnado_a_gestor':
      return 'mdi-arrow-right-bold'
    case 'devuelto_a_redactor_prevencion':
      return 'mdi-alert-octagon'
    case 'solventado_reingresado':
      return 'mdi-check-decagram'
    case 'tramite_concluido_entregado':
      return 'mdi-checkbox-marked-circle'
    case 'reasignacion_administrativa':
      return 'mdi-account-switch'
    default:
      return 'mdi-circle-small'
  }
}

function getEtiquetaEvento(tipo: TurnadoTipoEvento): string {
  switch (tipo) {
    case 'turnado_a_gestor':
      return 'Turnado al Gestor'
    case 'devuelto_a_redactor_prevencion':
      return 'Devuelto por Prevención'
    case 'solventado_reingresado':
      return 'Solventado y Re-turnado'
    case 'tramite_concluido_entregado':
      return 'Concluido y Entregado'
    case 'reasignacion_administrativa':
      return 'Reasignación Administrativa'
    default:
      return tipo
  }
}

function formatearFechaHora(fechaStr: string): string {
  if (!fechaStr) return ''
  const d = new Date(fechaStr)
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatearFecha(fechaStr: string): string {
  if (!fechaStr) return ''
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return fechaStr
}

function formatearHoras(horas: number): string {
  if (horas < 24) {
    return `${horas.toFixed(1)} hrs`
  }
  const dias = Math.floor(horas / 24)
  const rest = Math.round(horas % 24)
  return rest > 0 ? `${dias}d ${rest}h` : `${dias}d`
}
</script>
