<template>
  <v-container fluid class="pa-6 tramites-page">
    <!-- Encabezado del Módulo -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-6">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">
          Operación Notarial · Despacho y Gestoría Externa
        </div>
        <h1 class="text-h4 font-weight-bold text-primary">
          Trámites Notariales y Términos Oficiales
        </h1>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="recargar"
        >
          Actualizar
        </v-btn>
      </div>
    </div>

    <!-- Barra de Tarjetas KPIs / Semáforo de Términos -->
    <v-row density="comfortable" class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card
          variant="outlined"
          class="pa-4 kpi-card cursor-pointer transition-swing"
          :class="{ 'kpi-seleccionado': filtros.semaforo === null && !filtros.estado }"
          @click="filtrarPorSemaforo(null)"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Total de Trámites</div>
              <div class="text-h4 font-weight-bold text-primary mt-1">{{ tramites.length }}</div>
            </div>
            <v-avatar color="primary" variant="tonal" size="44">
              <v-icon icon="mdi-clipboard-text-multiple-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-medium-emphasis mt-2">
            Gestiones activas en la notaría
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          variant="outlined"
          class="pa-4 kpi-card cursor-pointer transition-swing"
          :class="{ 'kpi-seleccionado': filtros.semaforo === 'verde' }"
          @click="filtrarPorSemaforo('verde')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">En Plazo Normal</div>
              <div class="text-h4 font-weight-bold text-success mt-1">{{ conteoVerde }}</div>
            </div>
            <v-avatar color="success" variant="tonal" size="44">
              <v-icon icon="mdi-check-circle-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-success mt-2">
            > 3 días hábiles restantes
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          variant="outlined"
          class="pa-4 kpi-card cursor-pointer transition-swing"
          :class="{ 'kpi-seleccionado': filtros.semaforo === 'amarillo' }"
          @click="filtrarPorSemaforo('amarillo')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Próximos a Vencer</div>
              <div class="text-h4 font-weight-bold text-warning mt-1">{{ conteoAmarillo }}</div>
            </div>
            <v-avatar color="warning" variant="tonal" size="44">
              <v-icon icon="mdi-clock-alert-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-warning mt-2">
            1 a 3 días hábiles restantes
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          variant="outlined"
          class="pa-4 kpi-card cursor-pointer transition-swing"
          :class="{ 'kpi-seleccionado': filtros.semaforo === 'rojo' }"
          @click="filtrarPorSemaforo('rojo')"
        >
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">Vencidos / Prevenidos</div>
              <div class="text-h4 font-weight-bold text-error mt-1">{{ conteoRojo }}</div>
            </div>
            <v-avatar color="error" variant="tonal" size="44">
              <v-icon icon="mdi-alert-octagon-outline" size="24" />
            </v-avatar>
          </div>
          <div class="text-caption text-error mt-2">
            Atención prioritaria inmediata
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Componente de Filtros -->
    <TramitesFiltros
      v-model="filtros"
      :dependencias="dependencias"
      @update:model-value="aplicarFiltros"
      @limpiar="recargar"
    />

    <!-- Tabla General de Trámites -->
    <v-card variant="outlined" class="rounded-lg">
      <v-data-table
        :headers="headers"
        :items="tramitesFiltrados"
        :loading="cargando"
        density="comfortable"
        hover
        no-data-text="No se encontraron trámites notariales con los filtros seleccionados."
      >
        <!-- Instrumento / Expediente -->
        <template #item.escritura="{ item }">
          <nuxt-link
            :to="`/escrituras/${item.escritura_id}`"
            class="text-decoration-none"
          >
            <div class="font-weight-bold text-primary">
              Instrumento {{ item.escritura_instrumento || 'S/N' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Exp: {{ item.escritura_expediente || 'S/E' }} · {{ item.acto_nombre || 'Acto notarial' }}
            </div>
          </nuxt-link>
        </template>

        <!-- Volante / Folio -->
        <template #item.folio_dependencia="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="item.folio_dependencia ? 'mdi-barcode-scan' : 'mdi-file-outline'"
              size="18"
              class="mr-2 text-medium-emphasis"
            />
            <div>
              <span class="font-weight-medium text-body-2">
                {{ item.folio_dependencia || 'Sin volante' }}
              </span>
              <div class="text-caption text-medium-emphasis">
                Ingreso: {{ formatFecha(item.fecha_ingreso || item.fecha_solicitud) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Trámite y Fase -->
        <template #item.tipo_tramite_nombre="{ item }">
          <div>
            <div class="font-weight-bold text-body-2">
              {{ item.tipo_tramite_nombre || 'Trámite Notarial' }}
            </div>
            <v-chip size="x-small" variant="tonal" color="primary" class="mt-1">
              {{ labelFase(item.fase) }}
            </v-chip>
          </div>
        </template>

        <!-- Dependencia -->
        <template #item.dependencia_sigla="{ item }">
          <v-chip size="small" variant="outlined" color="primary" class="font-weight-medium">
            {{ item.dependencia_sigla || 'Dependencia' }}
          </v-chip>
        </template>

        <!-- Semáforo y Plazo -->
        <template #item.semaforo="{ item }">
          <div>
            <v-chip
              :color="item.semaforoColor"
              size="small"
              variant="flat"
              class="font-weight-medium"
            >
              <v-icon
                start
                size="14"
                :icon="iconoSegunSemaforo(item.semaforo)"
              />
              {{ item.semaforoEtiqueta }}
            </v-chip>
            <div v-if="item.fecha_limite_estimada" class="text-caption text-medium-emphasis mt-1">
              Término: {{ formatFecha(item.fecha_limite_estimada) }}
            </div>
          </div>
        </template>

        <!-- Estado -->
        <template #item.estado="{ item }">
          <v-chip
            :color="colorSegunEstado(item.estado)"
            size="small"
            variant="tonal"
            class="font-weight-medium"
          >
            {{ labelEstado(item.estado) }}
          </v-chip>
        </template>

        <!-- Gestor Asignado -->
        <template #item.responsable_nombre="{ item }">
          <span class="text-caption font-weight-medium">
            {{ item.responsable_nombre || 'Sin gestor asignado' }}
          </span>
        </template>

        <!-- Acciones -->
        <template #item.acciones="{ item }">
          <div class="d-flex align-center justify-end">
            <v-btn
              :to="`/escrituras/${item.escritura_id}`"
              variant="text"
              size="small"
              color="primary"
              prepend-icon="mdi-open-in-new"
            >
              Ver Escritura
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTramites } from '~/composables/useTramites'
import { calcularSemaforoTramite } from '~/utils/diasHabiles'
import TramitesFiltros from '~/components/tramites/TramitesFiltros.vue'
import type {
  FiltrosTramites,
  FaseProcesal,
  EstadoTramite,
  SemaforoTramite
} from '~/types/tramites'

const {
  tramites,
  dependencias,
  cargando,
  cargarCatalogos,
  cargarTodosTramites
} = useTramites()

const filtros = ref<FiltrosTramites>({
  busqueda: '',
  dependencia_id: null,
  fase: null,
  estado: null,
  semaforo: null
})

const headers = [
  { title: 'Instrumento Notarial', key: 'escritura', minWidth: '180px' },
  { title: 'Folio / Volante', key: 'folio_dependencia', width: '170px' },
  { title: 'Trámite y Fase', key: 'tipo_tramite_nombre', minWidth: '220px' },
  { title: 'Dependencia', key: 'dependencia_sigla', width: '130px' },
  { title: 'Semáforo y Plazo', key: 'semaforo', width: '160px' },
  { title: 'Estado', key: 'estado', width: '140px' },
  { title: 'Gestor', key: 'responsable_nombre', width: '160px' },
  { title: 'Acción', key: 'acciones', sortable: false, align: 'end' as const, width: '130px' }
]

const conteoVerde = computed(() => {
  return tramites.value.filter((t) => {
    const s = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado).semaforo
    return s === 'verde'
  }).length
})

const conteoAmarillo = computed(() => {
  return tramites.value.filter((t) => {
    const s = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado).semaforo
    return s === 'amarillo'
  }).length
})

const conteoRojo = computed(() => {
  return tramites.value.filter((t) => {
    const s = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado).semaforo
    return s === 'rojo'
  }).length
})

const tramitesFiltrados = computed(() => {
  return tramites.value.map((t) => {
    const sem = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado)
    return {
      ...t,
      semaforoColor: sem.color,
      semaforoEtiqueta: sem.etiqueta
    }
  })
})

onMounted(async () => {
  await Promise.all([cargarCatalogos(), cargarTodosTramites()])
})

async function aplicarFiltros() {
  await cargarTodosTramites(filtros.value)
}

async function recargar() {
  await cargarTodosTramites(filtros.value)
}

function filtrarPorSemaforo(sem: SemaforoTramite | null) {
  filtros.value.semaforo = sem
  aplicarFiltros()
}

function labelFase(fase: FaseProcesal): string {
  const mapa: Record<FaseProcesal, string> = {
    previo: 'Previo',
    firma_otorgamiento: 'Firma',
    posterior_fiscal: 'Posterior',
    inscripcion_definitiva: 'Inscripción',
    entrega_cliente: 'Entrega'
  }
  return mapa[fase] || fase
}

function labelEstado(estado: EstadoTramite): string {
  const mapa: Record<EstadoTramite, string> = {
    solicitado: 'Solicitado',
    en_proceso: 'En Proceso',
    ingresado_dependencia: 'Ingresado',
    prevenido_observado: 'Prevenido',
    subsanado: 'Subsanado',
    concluido_favorable: 'Concluido',
    rechazado_cancelado: 'Cancelado'
  }
  return mapa[estado] || estado
}

function colorSegunEstado(estado: EstadoTramite): string {
  const mapa: Record<EstadoTramite, string> = {
    solicitado: 'grey',
    en_proceso: 'info',
    ingresado_dependencia: 'primary',
    prevenido_observado: 'error',
    subsanado: 'warning',
    concluido_favorable: 'success',
    rechazado_cancelado: 'grey'
  }
  return mapa[estado] || 'grey'
}

function iconoSegunSemaforo(semaforo?: string): string {
  if (semaforo === 'azul' || semaforo === 'verde') return 'mdi-check-circle'
  if (semaforo === 'amarillo') return 'mdi-clock-alert-outline'
  if (semaforo === 'rojo') return 'mdi-alert-circle'
  return 'mdi-circle-outline'
}

function formatFecha(fecha?: string | null): string {
  if (!fecha) return ''
  const partes = fecha.split('T')[0].split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return fecha
}
</script>

<style scoped>
.tramites-page {
  background-color: #f0f2f4;
  min-height: 100vh;
}

.kpi-card {
  border-radius: 8px;
  background-color: #ffffff;
}

.kpi-card:hover {
  border-color: #1b3a5f;
  box-shadow: 0 4px 12px rgba(27, 58, 95, 0.08);
}

.kpi-seleccionado {
  border: 2px solid #1b3a5f !important;
  background-color: rgba(27, 58, 95, 0.03) !important;
}
</style>
