<template>
  <div class="tramites-tab">
    <!-- Barra de Métricas y KPIs de la Escritura -->
    <v-row density="comfortable" class="mb-3">
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Total Trámites</div>
          <div class="text-h6 font-weight-bold text-primary">{{ tramites.length }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">En Trámite</div>
          <div class="text-h6 font-weight-bold text-info">{{ conteoEnTramite }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Concluidos</div>
          <div class="text-h6 font-weight-bold text-success">{{ conteoConcluidos }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="pa-3 text-center metric-card">
          <div class="text-caption text-medium-emphasis">Prevenidos / Urgentes</div>
          <div :class="['text-h6 font-weight-bold', conteoPrevenidos > 0 ? 'text-error' : 'text-grey']">
            {{ conteoPrevenidos }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Gestoría y Trámites por Dependencia Oficial -->
    <div class="mb-6">
      <div class="d-flex align-center justify-space-between w-100 mb-3 flex-wrap gap-2">
        <div class="mr-3">
          <div class="text-subtitle-1 font-weight-bold text-grey-darken-4 d-flex align-center">
            <v-icon icon="mdi-office-building-cog" color="primary" size="22" class="mr-2" />
            <span>Gestoría y Trámites ante Dependencias Oficiales</span>
          </div>
          <div class="text-caption text-grey-darken-1">
            Seguimiento procesal de volantes, ingresos, prevención de rechazos y obtención de cédulas oficiales por autoridad.
          </div>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          density="comfortable"
          class="text-capitalize px-4 ml-auto flex-shrink-0"
          prepend-icon="mdi-bank-plus"
          @click="abrirIniciarNuevaDependencia"
        >
          + Iniciar Gestión en Dependencia
        </v-btn>
      </div>

      <TramitesDependenciasCards
        ref="dependenciasCardsRef"
        :escritura-id="escrituraId"
        @solicitar-orden-pago="onSolicitarOrdenPago"
        @paso-agregado="onPasoAgregado"
      />
    </div>

    <!-- Pipeline Visual de Fases Procesales -->
    <TramitesTimeline
      :tramites="tramites"
      v-model:fase-seleccionada="faseFiltro"
    />

    <!-- Barra de Herramientas y Filtro de Fases -->
    <v-card variant="outlined" class="mb-4 pa-3 bg-surface rounded-lg">
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div class="d-flex align-center gap-2">
          <v-btn-toggle
            v-model="faseFiltro"
            mandatory="false"
            density="compact"
            color="primary"
            variant="outlined"
          >
            <v-btn :value="null" size="small">Todos</v-btn>
            <v-btn value="previo" size="small">Previos</v-btn>
            <v-btn value="firma_otorgamiento" size="small">Firma</v-btn>
            <v-btn value="posterior_fiscal" size="small">Posterior</v-btn>
            <v-btn value="inscripcion_definitiva" size="small">Inscripción</v-btn>
            <v-btn value="entrega_cliente" size="small">Entrega</v-btn>
          </v-btn-toggle>

          <v-chip v-if="faseFiltro" size="small" closable @click:close="faseFiltro = null">
            Filtro activo
          </v-chip>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            v-if="tramites.length === 0"
            color="secondary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-magic-staff"
            :loading="generandoPlantilla"
            @click="generarPlantilla"
          >
            Sugerir Trámites por Acto
          </v-btn>

          <v-btn
            color="primary"
            variant="flat"
            size="small"
            prepend-icon="mdi-plus"
            @click="abrirNuevoTramite"
          >
            Registrar Volante / Trámite
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Tabla Detallada de Trámites -->
    <v-card variant="outlined" class="rounded-lg">
      <v-data-table
        :headers="headers"
        :items="tramitesFiltrados"
        :loading="cargando"
        density="comfortable"
        hover
        no-data-text="No hay trámites registrados para esta escritura."
      >
        <!-- Columna Folio / Volante -->
        <template #item.folio_dependencia="{ item }">
          <div class="d-flex align-center">
            <v-icon
              :icon="item.folio_dependencia ? 'mdi-barcode-scan' : 'mdi-file-outline'"
              size="18"
              class="mr-2 text-medium-emphasis"
            />
            <div>
              <div class="font-weight-medium text-body-2">
                {{ item.folio_dependencia || 'Sin volante' }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatFecha(item.fecha_ingreso || item.fecha_solicitud) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Columna Trámite y Fase -->
        <template #item.tipo_tramite_nombre="{ item }">
          <div>
            <div class="font-weight-bold text-body-2 text-primary">
              {{ item.tipo_tramite_nombre || 'Trámite Notarial' }}
            </div>
            <div class="d-flex align-center gap-1 mt-1">
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ labelFase(item.fase) }}
              </v-chip>
              <v-chip
                v-if="item.fase === 'previo' && item.estado !== 'concluido_favorable'"
                size="x-small"
                color="warning"
                variant="flat"
              >
                Requerido previo
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Columna Dependencia -->
        <template #item.dependencia_sigla="{ item }">
          <div>
            <span class="font-weight-medium">{{ item.dependencia_sigla || 'Dependencia' }}</span>
            <div v-if="item.cat_dependencias_oficiales?.portal_web" class="text-caption">
              <a
                :href="item.cat_dependencias_oficiales.portal_web"
                target="_blank"
                rel="noopener"
                class="text-decoration-none text-primary"
              >
                Portal oficial <v-icon icon="mdi-open-in-new" size="12" />
              </a>
            </div>
          </div>
        </template>

        <!-- Columna Semáforo de Plazos -->
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
              Límite: {{ formatFecha(item.fecha_limite_estimada) }}
            </div>
          </div>
        </template>

        <!-- Columna Estado -->
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

        <!-- Columna Orden de Pago (Módulo 08) -->
        <template #item.orden_pago_id="{ item }">
          <v-chip
            v-if="item.orden_pago_id"
            color="success"
            size="x-small"
            variant="outlined"
            prepend-icon="mdi-cash-check"
          >
            Derechos Pagados
          </v-chip>
          <span v-else class="text-caption text-medium-emphasis">
            Sin orden vinculada
          </span>
        </template>

        <!-- Columna Acciones -->
        <template #item.acciones="{ item }">
          <div class="d-flex align-center justify-end gap-1">
            <!-- Marcar Concluido si está en proceso o ingresado -->
            <v-tooltip text="Marcar Concluido Favorable" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-if="item.estado !== 'concluido_favorable'"
                  v-bind="tooltipProps"
                  icon="mdi-check"
                  variant="text"
                  size="small"
                  color="success"
                  @click="marcarConcluido(item)"
                />
              </template>
            </v-tooltip>

            <!-- Gestionar Prevención -->
            <v-tooltip :text="item.estado === 'prevenido_observado' ? 'Subsanar Prevención' : 'Registrar Prevención'" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  :icon="item.estado === 'prevenido_observado' ? 'mdi-check-decagram' : 'mdi-alert-circle-outline'"
                  variant="text"
                  size="small"
                  :color="item.estado === 'prevenido_observado' ? 'primary' : 'warning'"
                  @click="abrirPrevencion(item)"
                />
              </template>
            </v-tooltip>

            <!-- Editar -->
            <v-tooltip text="Editar trámite y volante" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  @click="abrirEditarTramite(item)"
                />
              </template>
            </v-tooltip>

            <!-- Eliminar -->
            <v-tooltip text="Eliminar trámite" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmarEliminar(item)"
                />
              </template>
            </v-tooltip>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modales -->
    <TramiteFormModal
      v-model="dialogoFormulario"
      :escritura-id="escrituraId"
      :tramite="tramiteSeleccionado"
      @saved="onTramiteGuardado"
    />

    <TramitePrevencionModal
      v-model="dialogoPrevencion"
      :tramite="tramiteSeleccionado"
      @saved="onTramiteGuardado"
    />

    <OrdenPagoFormModal
      v-model="dialogoOrdenPago"
      :escritura-id="escrituraId"
      :dependencias="dependenciasParaOrdenPago"
      :dependencia-id-preseleccionada="ordenPagoPreseleccionada?.dependenciaId"
      :concepto-preseleccionado="ordenPagoPreseleccionada?.concepto"
      @saved="onOrdenPagoGuardada"
    />

    <!-- Diálogo de Confirmación de Eliminación -->
    <v-dialog v-model="dialogoEliminar" max-width="450px">
      <v-card>
        <v-card-title class="text-h6 text-error pa-4">
          ¿Eliminar Trámite Notarial?
        </v-card-title>
        <v-card-text class="pa-4 pt-0">
          Se eliminará el trámite <strong>{{ tramiteAEliminar?.tipo_tramite_nombre }}</strong> y su historial asociado. Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" color="grey" @click="dialogoEliminar = false">
            Cancelar
          </v-btn>
          <v-btn color="error" variant="flat" :loading="eliminando" @click="ejecutarEliminar">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useTramites } from '~/composables/useTramites'
import { useOrdenesPago } from '~/composables/useOrdenesPago'
import { calcularSemaforoTramite } from '~/utils/diasHabiles'
import TramitesDependenciasCards from '~/components/tramites/TramitesDependenciasCards.vue'
import TramitesTimeline from '~/components/tramites/TramitesTimeline.vue'
import TramiteFormModal from '~/components/tramites/TramiteFormModal.vue'
import TramitePrevencionModal from '~/components/tramites/TramitePrevencionModal.vue'
import OrdenPagoFormModal from '~/components/ordenesPago/OrdenPagoFormModal.vue'
import type {
  FaseProcesal,
  EstadoTramite,
  TramiteResumen
} from '~/types/tramites'

const props = defineProps<{
  escrituraId: string
  actoJuridicoId?: string
}>()

const {
  tramites,
  cargando,
  cargarTramitesEscritura,
  cambiarEstadoTramite,
  eliminarTramite,
  generarPlantillaTramites
} = useTramites()

const faseFiltro = ref<FaseProcesal | null>(null)
const dialogoFormulario = ref(false)
const dialogoPrevencion = ref(false)
const dialogoEliminar = ref(false)
const generandoPlantilla = ref(false)
const eliminando = ref(false)
const tramiteSeleccionado = ref<TramiteResumen | null>(null)
const tramiteAEliminar = ref<TramiteResumen | null>(null)

const headers = [
  { title: 'Folio / Volante', key: 'folio_dependencia', width: '180px' },
  { title: 'Trámite y Fase', key: 'tipo_tramite_nombre', minWidth: '220px' },
  { title: 'Dependencia', key: 'dependencia_sigla', width: '150px' },
  { title: 'Semáforo y Plazo', key: 'semaforo', width: '160px' },
  { title: 'Estado', key: 'estado', width: '140px' },
  { title: 'Derechos', key: 'orden_pago_id', width: '130px' },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const, width: '160px' }
]

const conteoEnTramite = computed(() => {
  return tramites.value.filter(
    (t) => t.estado === 'en_proceso' || t.estado === 'ingresado_dependencia' || t.estado === 'solicitado'
  ).length
})

const conteoConcluidos = computed(() => {
  return tramites.value.filter((t) => t.estado === 'concluido_favorable').length
})

const conteoPrevenidos = computed(() => {
  return tramites.value.filter(
    (t) => t.estado === 'prevenido_observado' || t.semaforo === 'rojo'
  ).length
})

const tramitesFiltrados = computed(() => {
  let lista = tramites.value
  if (faseFiltro.value) {
    lista = lista.filter((t) => t.fase === faseFiltro.value)
  }

  return lista.map((t) => {
    const sem = calcularSemaforoTramite(t.fecha_limite_estimada, t.estado)
    return {
      ...t,
      semaforoColor: sem.color,
      semaforoEtiqueta: sem.etiqueta
    }
  })
})

const { dependencias: dependenciasOrdenPago, cargarDependencias: cargarDepsOP } = useOrdenesPago()
const { togglePasoEscritura, dependencias: dependenciasTramites } = useTramites()
const dialogoOrdenPago = ref(false)
const pasoActivoParaOP = ref<number | null>(null)
const ordenPagoPreseleccionada = ref<{
  dependenciaId?: string
  concepto?: string
  pasoId?: number
} | null>(null)
const dependenciasCardsRef = ref<any>(null)

const dependenciasParaOrdenPago = computed(() => {
  if (dependenciasOrdenPago.value && dependenciasOrdenPago.value.length > 0) {
    return dependenciasOrdenPago.value
  }
  return dependenciasTramites.value || []
})

watch(dialogoOrdenPago, (abierto) => {
  if (!abierto) {
    ordenPagoPreseleccionada.value = null
    pasoActivoParaOP.value = null
  }
})

function abrirIniciarNuevaDependencia() {
  dependenciasCardsRef.value?.abrirNuevaDependenciaModal()
}

function onSolicitarOrdenPago(datos: { dependenciaId?: string; concepto?: string; pasoId?: number }) {
  ordenPagoPreseleccionada.value = datos
  if (datos.pasoId) {
    pasoActivoParaOP.value = datos.pasoId
  }
  dialogoOrdenPago.value = true
}

async function onPasoAgregado() {
  await Promise.all([
    cargarTramites(),
    dependenciasCardsRef.value?.recargar?.()
  ])
}

function onAbrirOrdenPagoPaso(data: { pasoId: number; dependenciaClave: number; concepto: string; dependenciaId?: string }) {
  pasoActivoParaOP.value = data.pasoId
  let depId = data.dependenciaId
  if (!depId) {
    const depMatch = dependenciasTramites.value.find((d) => d.clave_numerica === data.dependenciaClave)
    depId = depMatch?.id
  }
  ordenPagoPreseleccionada.value = {
    dependenciaId: depId,
    concepto: data.concepto,
    pasoId: data.pasoId
  }
  dialogoOrdenPago.value = true
}

async function onOrdenPagoGuardada(data: any, ordenId?: string) {
  if (pasoActivoParaOP.value && ordenId) {
    await togglePasoEscritura(props.escrituraId, pasoActivoParaOP.value, true, ordenId)
  }
  ordenPagoPreseleccionada.value = null
  pasoActivoParaOP.value = null
  await Promise.all([
    cargarTramites(),
    dependenciasCardsRef.value?.recargar?.()
  ])
}

onMounted(async () => {
  await Promise.all([
    cargarTramites(),
    cargarDepsOP(),
    dependenciasCardsRef.value?.recargar?.()
  ])
})

async function cargarTramites() {
  if (props.escrituraId) {
    await cargarTramitesEscritura(props.escrituraId)
  }
}

function abrirNuevoTramite() {
  tramiteSeleccionado.value = null
  dialogoFormulario.value = true
}

function abrirEditarTramite(tramite: TramiteResumen) {
  tramiteSeleccionado.value = tramite
  dialogoFormulario.value = true
}

function abrirPrevencion(tramite: TramiteResumen) {
  tramiteSeleccionado.value = tramite
  dialogoPrevencion.value = true
}

async function marcarConcluido(tramite: TramiteResumen) {
  await cambiarEstadoTramite(tramite.id, 'concluido_favorable')
  await cargarTramites()
}

function confirmarEliminar(tramite: TramiteResumen) {
  tramiteAEliminar.value = tramite
  dialogoEliminar.value = true
}

async function ejecutarEliminar() {
  if (!tramiteAEliminar.value?.id) return
  eliminando.value = true
  try {
    await eliminarTramite(tramiteAEliminar.value.id)
    dialogoEliminar.value = false
    await cargarTramites()
  } finally {
    eliminando.value = false
  }
}

async function generarPlantilla() {
  generandoPlantilla.value = true
  try {
    await generarPlantillaTramites(props.escrituraId)
    await cargarTramites()
  } finally {
    generandoPlantilla.value = false
  }
}

async function onTramiteGuardado() {
  await Promise.all([
    cargarTramites(),
    dependenciasCardsRef.value?.recargar?.()
  ])
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
.metric-card {
  border-radius: 8px;
  background-color: #faf9fc;
}

.border-warning {
  border: 1px solid #c98a2c !important;
}
</style>
