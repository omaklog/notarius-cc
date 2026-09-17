<template>
  <v-card variant="outlined" class="mb-4 pa-4 timeline-card bg-surface">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="d-flex align-center gap-2">
        <v-icon color="primary" icon="mdi-progress-clock" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold text-primary">
          Ciclo Procesal del Instrumento Notarial
        </span>
      </div>
      <span class="text-caption text-medium-emphasis">
        5 fases normativas de fe pública
      </span>
    </div>

    <!-- Stepper / Pipeline horizontal -->
    <v-row density="comfortable" class="timeline-stepper">
      <v-col
        v-for="(fase, idx) in fasesProcesales"
        :key="fase.key"
        cols="12"
        sm="6"
        md=""
        class="d-flex"
      >
        <v-card
          variant="flat"
          :class="[
            'flex-grow-1 pa-3 fase-card cursor-pointer transition-swing',
            faseSeleccionada === fase.key ? 'fase-activa' : '',
            obtenerClaseEstado(fase.key)
          ]"
          @click="seleccionarFase(fase.key)"
        >
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-caption font-weight-bold fase-numero">
              {{ idx + 1 }}. {{ fase.titulo }}
            </span>
            <v-icon :icon="obtenerIconoEstado(fase.key)" size="18" />
          </div>

          <div class="text-caption text-truncate mb-2 text-medium-emphasis">
            {{ fase.subtitulo }}
          </div>

          <div class="d-flex align-center justify-space-between">
            <v-chip
              size="x-small"
              :color="obtenerColorChip(fase.key)"
              variant="tonal"
              class="font-weight-medium"
            >
              {{ obtenerResumenFase(fase.key) }}
            </v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FaseProcesal, TramiteResumen } from '~/types/tramites'

const props = defineProps<{
  tramites: TramiteResumen[]
  faseSeleccionada?: FaseProcesal | null
}>()

const emit = defineEmits<{
  (e: 'update:faseSeleccionada', fase: FaseProcesal | null): void
}>()

const fasesProcesales: Array<{ key: FaseProcesal; titulo: string; subtitulo: string }> = [
  { key: 'previo', titulo: 'Previo a Firma', subtitulo: 'CLG, avalúo, permisos' },
  { key: 'firma_otorgamiento', titulo: 'Firma y Otorgamiento', subtitulo: '2do aviso y certificación' },
  { key: 'posterior_fiscal', titulo: 'Posterior / Fiscal', subtitulo: 'Pago de ISAI e ISR' },
  { key: 'inscripcion_definitiva', titulo: 'Inscripción RPP', subtitulo: 'Testimonio con volante' },
  { key: 'entrega_cliente', titulo: 'Entrega Cliente', subtitulo: 'Archivo y liquidación' }
]

function tramitesPorFase(faseKey: FaseProcesal): TramiteResumen[] {
  return props.tramites.filter((t) => t.fase === faseKey)
}

function obtenerResumenFase(faseKey: FaseProcesal): string {
  const lista = tramitesPorFase(faseKey)
  if (lista.length === 0) return 'Sin trámites'
  const concluidos = lista.filter((t) => t.estado === 'concluido_favorable').length
  return `${concluidos}/${lista.length} concluidos`
}

function obtenerClaseEstado(faseKey: FaseProcesal): string {
  const lista = tramitesPorFase(faseKey)
  if (lista.length === 0) return 'fase-vacia'
  const tieneObservados = lista.some((t) => t.estado === 'prevenido_observado')
  if (tieneObservados) return 'fase-alerta'
  const todosConcluidos = lista.every((t) => t.estado === 'concluido_favorable' || t.estado === 'rechazado_cancelado')
  if (todosConcluidos) return 'fase-completada'
  return 'fase-en-proceso'
}

function obtenerIconoEstado(faseKey: FaseProcesal): string {
  const lista = tramitesPorFase(faseKey)
  if (lista.length === 0) return 'mdi-minus'
  const tieneObservados = lista.some((t) => t.estado === 'prevenido_observado')
  if (tieneObservados) return 'mdi-alert-circle-outline'
  const todosConcluidos = lista.every((t) => t.estado === 'concluido_favorable' || t.estado === 'rechazado_cancelado')
  if (todosConcluidos) return 'mdi-check-circle-outline'
  return 'mdi-clock-outline'
}

function obtenerColorChip(faseKey: FaseProcesal): string {
  const lista = tramitesPorFase(faseKey)
  if (lista.length === 0) return 'grey'
  const tieneObservados = lista.some((t) => t.estado === 'prevenido_observado')
  if (tieneObservados) return 'error'
  const todosConcluidos = lista.every((t) => t.estado === 'concluido_favorable' || t.estado === 'rechazado_cancelado')
  if (todosConcluidos) return 'success'
  return 'primary'
}

function seleccionarFase(faseKey: FaseProcesal) {
  if (props.faseSeleccionada === faseKey) {
    emit('update:faseSeleccionada', null)
  } else {
    emit('update:faseSeleccionada', faseKey)
  }
}
</script>

<style scoped>
.timeline-card {
  border-radius: 8px;
  background-color: #faf9fc;
}

.fase-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  background: #ffffff;
}

.fase-card:hover {
  border-color: #1b3a5f;
  box-shadow: 0 2px 4px rgba(27, 58, 95, 0.08);
}

.fase-activa {
  border: 2px solid #1b3a5f !important;
  background-color: rgba(27, 58, 95, 0.04) !important;
}

.fase-completada {
  border-left: 3px solid #2f6f4e;
}

.fase-en-proceso {
  border-left: 3px solid #1b3a5f;
}

.fase-alerta {
  border-left: 3px solid #b23a34;
}

.fase-vacia {
  opacity: 0.8;
}
</style>
