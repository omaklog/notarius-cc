<template>
  <div class="tramites-dependencias-cards">
    <!-- Estado de Carga -->
    <div v-if="cargando && dependenciasCards.length === 0" class="d-flex justify-center align-center py-8">
      <v-progress-circular indeterminate color="primary" size="36" />
      <span class="ml-3 text-body-2 text-grey-darken-1 font-weight-medium">
        Cargando gestiones y dependencias...
      </span>
    </div>

    <!-- Estado Vacío: Sin dependencias activas -->
    <v-card
      v-else-if="dependenciasCards.length === 0"
      variant="outlined"
      class="text-center py-6 px-4 rounded-lg bg-surface border-dashed border-grey-lighten-2"
    >
      <v-avatar color="primary" variant="tonal" size="40" class="mb-2">
        <v-icon icon="mdi-office-building-cog" size="22" />
      </v-avatar>
      <div class="text-subtitle-2 font-weight-bold text-grey-darken-3">
        No se han iniciado gestiones para esta escritura
      </div>
      <div class="text-caption text-grey-darken-1 max-w-md mx-auto mt-1 mb-3">
        Organiza el seguimiento de ventanilla por dependencia oficial (Catastro, RPP, Tesorería) con control de volantes, plazos y rechazos.
      </div>
      <v-btn
        v-if="!soloLectura"
        color="primary"
        variant="flat"
        size="small"
        class="text-capitalize px-4"
        prepend-icon="mdi-bank-plus"
        @click="abrirNuevaDependenciaModal"
      >
        + Iniciar Gestión en Dependencia
      </v-btn>
    </v-card>

    <!-- Grid de Tarjetas por Dependencia Oficial (Diseño limpio a 2 columnas) -->
    <v-row v-else density="comfortable" class="mb-2">
      <v-col
        v-for="card in dependenciasCards"
        :key="card.dependencia_clave"
        cols="12"
        lg="6"
        class="mb-2"
      >
        <v-card
          variant="outlined"
          class="rounded-lg h-100 transition-all overflow-hidden border-grey-lighten-2 bg-surface"
          :class="{ 'border-primary shadow-sm': card.expandido }"
        >
          <div class="pa-4">
            <!-- Fila Superior: Identidad de Autoridad + Acciones -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center min-w-0 mr-2">
                <!-- Avatar Tonal Suave -->
                <v-avatar
                  :color="obtenerColorDependencia(card.dependencia_clave)"
                  variant="tonal"
                  size="36"
                  class="mr-3 flex-shrink-0"
                >
                  <v-icon :icon="obtenerIconoDependencia(card.dependencia_clave)" size="20" />
                </v-avatar>

                <div class="min-w-0">
                  <div class="d-flex align-center gap-1.5 flex-nowrap">
                    <span class="text-subtitle-2 font-weight-bold text-grey-darken-4 text-truncate" :title="card.dependencia_nombre">
                      {{ card.dependencia_nombre }}
                    </span>
                    <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium flex-shrink-0">
                      {{ card.dependencia_sigla }}
                    </v-chip>
                  </div>
                  <div class="text-caption text-grey-darken-1">
                    Compromiso legal: {{ card.dependencia_dias_habiles }} días hábiles
                  </div>
                </div>
              </div>

              <!-- Acciones compactas a la derecha -->
              <div class="d-flex align-center gap-1 flex-shrink-0">
                <!-- Menú Agregar Paso -->
                <v-menu v-if="!soloLectura" location="bottom end" transition="scale-transition">
                  <template #activator="{ props: menuProps }">
                    <v-btn
                      v-bind="menuProps"
                      color="primary"
                      variant="tonal"
                      size="small"
                      density="comfortable"
                      class="text-capitalize px-2.5"
                      prepend-icon="mdi-plus"
                    >
                      Agregar Paso
                    </v-btn>
                  </template>
                  <v-list density="compact" class="py-1 shadow-md rounded-lg min-w-56">
                    <v-list-subheader class="text-caption font-weight-bold text-uppercase text-grey-darken-1">
                      Pasos: {{ card.dependencia_sigla }}
                    </v-list-subheader>
                    <v-list-item
                      v-for="paso in obtenerPasosFiltrados(card.dependencia_clave)"
                      :key="paso.id"
                      link
                      @click="abrirCapturaPaso(card, paso)"
                    >
                      <template #prepend>
                        <v-icon
                          :icon="obtenerIconoPaso(paso.nombre)"
                          size="16"
                          :color="obtenerColorPaso(paso.nombre)"
                          class="mr-2"
                        />
                      </template>
                      <v-list-item-title class="text-body-2 font-weight-medium">
                        {{ paso.nombre }}
                      </v-list-item-title>
                      <template #append v-if="paso.genera_orden_pago">
                        <v-chip size="x-small" color="warning" variant="flat" class="text-2xs">
                          O.P.
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>
                </v-menu>

                <!-- Botón Historial con Conteo -->
                <v-btn
                  variant="outlined"
                  size="small"
                  density="comfortable"
                  color="grey-darken-2"
                  class="text-capitalize px-2"
                  :prepend-icon="card.expandido ? 'mdi-chevron-up' : 'mdi-history'"
                  @click="toggleHistorial(card)"
                >
                  Historial ({{ card.total_movimientos }})
                </v-btn>
              </div>
            </div>

            <!-- Fila Informativa de Estado Actual (Limpia y Equilibrada) -->
            <div class="d-flex align-center flex-wrap justify-space-between gap-2 py-2 px-3 rounded-lg bg-grey-lighten-5 border border-grey-lighten-3">
              <div class="d-flex align-center gap-2 flex-wrap">
                <span class="text-caption text-grey-darken-1 font-weight-medium">Paso Actual:</span>
                <v-chip
                  :color="obtenerColorPaso(card.ultimo_paso_nombre)"
                  size="small"
                  variant="tonal"
                  class="font-weight-bold"
                >
                  <v-icon :icon="obtenerIconoPaso(card.ultimo_paso_nombre)" start size="14" />
                  {{ card.ultimo_paso_nombre }}
                </v-chip>

                <span
                  v-if="card.ultimo_folio_volante"
                  class="text-caption text-grey-darken-3 font-mono bg-white px-2 py-0.5 rounded border border-grey-lighten-2"
                >
                  <v-icon icon="mdi-ticket-outline" size="12" class="mr-1 text-grey-darken-1" />
                  {{ card.ultimo_folio_volante }}
                </span>
              </div>

              <div class="d-flex align-center text-caption text-grey-darken-1 gap-2">
                <span v-if="card.ultimo_responsable_nombre" class="text-truncate d-none d-sm-inline" style="max-width: 130px;">
                  <v-icon icon="mdi-account-outline" size="12" class="mr-0.5" />
                  {{ card.ultimo_responsable_nombre }}
                </span>
                <span>
                  <v-icon icon="mdi-calendar-clock" size="12" class="mr-0.5" />
                  {{ formatearFecha(card.ultima_fecha_registro) }}
                </span>
              </div>
            </div>

            <!-- Notas del último movimiento si existen -->
            <div
              v-if="card.ultimas_notas"
              class="text-caption text-grey-darken-2 mt-2.5 px-3 py-2 rounded-lg bg-grey-lighten-5 border-s-4 border-primary text-truncate"
              :title="card.ultimas_notas"
            >
              <v-icon icon="mdi-comment-text-outline" size="13" class="mr-1 text-primary" />
              <strong class="text-grey-darken-3">Nota:</strong> {{ card.ultimas_notas }}
            </div>
          </div>

          <!-- Acordeón Desplegable del Historial -->
          <v-expand-transition>
            <div v-if="card.expandido" class="border-t bg-grey-lighten-5 px-5 py-4">
              <div class="d-flex align-center justify-space-between mb-3 px-1">
                <div class="text-caption font-weight-bold text-uppercase text-grey-darken-2 d-flex align-center">
                  <v-icon icon="mdi-timeline-clock-outline" size="16" class="mr-1.5 text-primary" />
                  Bitácora Cronológica Completa — {{ card.dependencia_nombre }}
                </div>
                <v-btn
                  variant="text"
                  density="compact"
                  size="x-small"
                  color="primary"
                  prepend-icon="mdi-refresh"
                  @click="recargarHistorial(card)"
                >
                  Actualizar
                </v-btn>
              </div>

              <!-- Listado de Movimientos Históricos -->
              <div v-if="!card.historial || card.historial.length === 0" class="text-center py-4 text-caption text-grey-darken-1">
                <v-progress-circular indeterminate size="18" color="primary" class="mr-2" />
                Cargando movimientos...
              </div>

              <div v-else class="historial-timeline position-relative pl-5 border-s-2 border-grey-lighten-2 ml-3 my-2">
                <div
                  v-for="(item, idx) in card.historial"
                  :key="item.registro_id || idx"
                  class="historial-item mb-4 position-relative"
                >
                  <!-- Punto en la línea de tiempo -->
                  <div
                    class="timeline-dot position-absolute rounded-circle"
                    :style="{ backgroundColor: obtenerHexPaso(item.paso_nombre) }"
                  />

                  <div class="bg-white pa-4 rounded-lg border border-grey-lighten-2 shadow-sm">
                    <!-- Encabezado del Hito: Paso, Estado y Fecha/Hora con márgenes holgados -->
                    <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
                      <div class="d-flex align-center gap-2 flex-wrap">
                        <span class="text-subtitle-2 font-weight-bold text-grey-darken-4">
                          {{ item.paso_nombre }}
                        </span>
                        <v-chip
                          v-if="idx === 0"
                          size="x-small"
                          color="primary"
                          variant="tonal"
                          class="text-2xs font-weight-bold"
                        >
                          ACTUAL
                        </v-chip>
                        <v-chip
                          v-if="item.genera_orden_pago"
                          size="x-small"
                          color="warning"
                          variant="tonal"
                          class="text-2xs font-weight-medium"
                        >
                          O.P.
                        </v-chip>
                      </div>

                      <div class="text-caption text-grey-darken-1 font-size-xs d-flex align-center">
                        <v-icon icon="mdi-calendar-clock" size="14" class="mr-1 text-grey" />
                        {{ formatearFechaHora(item.fecha_registro) }}
                      </div>
                    </div>

                    <!-- Datos complementarios del hito (Folio y Responsable) -->
                    <div v-if="item.folio_volante || item.completado_por_nombre" class="d-flex align-center flex-wrap gap-3 my-2 text-caption text-grey-darken-2">
                      <span v-if="item.folio_volante" class="font-mono bg-grey-lighten-4 px-2 py-0.5 rounded border border-grey-lighten-2 d-inline-flex align-center">
                        <v-icon icon="mdi-ticket-outline" size="13" class="mr-1 text-grey-darken-1" />
                        Folio: <strong class="ml-1">{{ item.folio_volante }}</strong>
                      </span>
                      <span v-if="item.completado_por_nombre" class="text-grey-darken-1 d-inline-flex align-center">
                        <v-icon icon="mdi-account-outline" size="13" class="mr-1 text-grey-darken-1" />
                        Registrado por: <strong class="ml-1 text-grey-darken-3">{{ item.completado_por_nombre }}</strong>
                      </span>
                    </div>

                    <!-- Notas / Comentarios del movimiento con padding generoso y acento visual -->
                    <div v-if="item.notas" class="text-caption text-grey-darken-3 mt-3 pa-3 rounded-lg bg-grey-lighten-5 border-s-4 border-primary">
                      <div class="d-flex align-center font-weight-bold text-grey-darken-2 mb-1">
                        <v-icon icon="mdi-comment-text-outline" size="14" color="primary" class="mr-1.5" />
                        Comentario / Observación:
                      </div>
                      <div class="text-body-2 text-grey-darken-4 pl-5 font-size-sm">
                        {{ item.notas }}
                      </div>
                    </div>

                    <!-- Orden de pago vinculada con márgenes limpios -->
                    <div
                      v-if="item.orden_pago_id || item.orden_pago_folio"
                      class="mt-3 d-flex align-center justify-space-between flex-wrap gap-2 text-caption bg-amber-lighten-5 px-3 py-2 rounded-lg border border-amber-lighten-2"
                    >
                      <div class="d-flex align-center gap-2">
                        <v-icon icon="mdi-receipt-text-check" color="amber-darken-3" size="16" />
                        <span class="font-weight-bold text-amber-darken-4">
                          Orden de Pago: {{ item.orden_pago_folio || 'Asignada' }}
                        </span>
                        <span v-if="item.orden_pago_monto" class="text-grey-darken-3 font-weight-medium">
                          (${{ Number(item.orden_pago_monto).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }})
                        </span>
                      </div>
                      <v-chip
                        size="x-small"
                        :color="item.orden_pago_estado === 'pagado' ? 'success' : 'warning'"
                        variant="flat"
                        class="text-2xs font-weight-bold"
                      >
                        {{ item.orden_pago_estado === 'pagado' ? 'Liquidada' : 'Pendiente de Pago' }}
                      </v-chip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </v-expand-transition>
        </v-card>
      </v-col>
    </v-row>

    <!-- Modal Compacto para Registrar Paso -->
    <TramitePasoModal
      v-if="mostrarPasoModal && dependenciaSeleccionadaParaPaso"
      v-model="mostrarPasoModal"
      :escritura-id="escrituraId"
      :dependencia="dependenciaSeleccionadaParaPaso"
      :paso-preseleccionado="pasoPreseleccionado"
      @guardado="alGuardarPaso"
      @abrir-orden-pago="alAbrirOrdenPago"
    />

    <!-- Modal para Iniciar Nueva Dependencia bajo demanda -->
    <TramiteNuevaDependenciaModal
      v-model="mostrarNuevaDepModal"
      :dependencias-disponibles="dependenciasNoIniciadas"
      @seleccionada="alSeleccionarNuevaDependencia"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type {
  DependenciaOficial,
  DependenciaTramiteCard,
  PasoTramite,
  HistorialPasoEscritura
} from '~/types/tramites'
import { useTramites } from '~/composables/useTramites'
import TramitePasoModal from './TramitePasoModal.vue'
import TramiteNuevaDependenciaModal from './TramiteNuevaDependenciaModal.vue'

const props = defineProps<{
  escrituraId: string
  soloLectura?: boolean
}>()

const emit = defineEmits<{
  (e: 'paso-agregado', paso: HistorialPasoEscritura): void
  (e: 'solicitar-orden-pago', datos: { dependenciaId?: string; concepto?: string; pasoId?: number }): void
}>()

const tramitesApi = useTramites()
const dependenciasCards = computed<DependenciaTramiteCard[]>(() => tramitesApi?.dependenciasCards?.value || [])
const dependencias = computed<DependenciaOficial[]>(() => tramitesApi?.dependencias?.value || [])
const cargando = computed(() => !!tramitesApi?.cargando?.value)

// Estados para modales
const mostrarPasoModal = ref<boolean>(false)
const mostrarNuevaDepModal = ref<boolean>(false)
const dependenciaSeleccionadaParaPaso = ref<any>(null)
const pasoPreseleccionado = ref<PasoTramite | null>(null)

// Dependencias disponibles en el catálogo que aún no tienen tarjeta activa en la escritura
const dependenciasNoIniciadas = computed<DependenciaOficial[]>(() => {
  const clavesIniciadas = new Set(dependenciasCards.value.map((c) => c.dependencia_clave))
  return dependencias.value.filter((d) => !clavesIniciadas.has(d.clave_numerica ?? 0))
})

onMounted(async () => {
  if (typeof tramitesApi?.cargarCatalogos === 'function') {
    await tramitesApi.cargarCatalogos().catch(() => {})
  }
  if (typeof tramitesApi?.cargarPasosCatalogo === 'function' && (tramitesApi?.pasosCatalogo?.value?.length ?? 0) === 0) {
    await tramitesApi.cargarPasosCatalogo().catch(() => {})
  }
  if (props.escrituraId && typeof tramitesApi?.cargarTarjetasDependencias === 'function') {
    await tramitesApi.cargarTarjetasDependencias(props.escrituraId).catch(() => {})
  }
})

function obtenerPasosFiltrados(depClave: number): PasoTramite[] {
  if (typeof tramitesApi?.obtenerPasosPorDependencia === 'function') {
    return tramitesApi.obtenerPasosPorDependencia(depClave) || []
  }
  return []
}

function abrirCapturaPaso(card: DependenciaTramiteCard, paso?: PasoTramite) {
  const depEncontrada = dependencias.value.find(
    (d) => d.clave_numerica === card.dependencia_clave || (card.dependencia_id && d.id === card.dependencia_id)
  )
  const idValido = (card.dependencia_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(card.dependencia_id))
    ? card.dependencia_id
    : (depEncontrada?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(depEncontrada.id) ? depEncontrada.id : null)

  dependenciaSeleccionadaParaPaso.value = {
    clave_numerica: card.dependencia_clave,
    nombre: card.dependencia_nombre || depEncontrada?.nombre || '',
    sigla: card.dependencia_sigla || depEncontrada?.sigla || '',
    id: idValido
  }
  pasoPreseleccionado.value = paso || null
  mostrarPasoModal.value = true
}

function abrirNuevaDependenciaModal() {
  mostrarNuevaDepModal.value = true
}

function alSeleccionarNuevaDependencia(dep: DependenciaOficial) {
  const esUuid = typeof dep.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dep.id)
  dependenciaSeleccionadaParaPaso.value = {
    clave_numerica: dep.clave_numerica ?? 0,
    nombre: dep.nombre,
    sigla: dep.sigla,
    id: esUuid ? dep.id : null
  }
  pasoPreseleccionado.value = null
  mostrarPasoModal.value = true
}

async function toggleHistorial(card: DependenciaTramiteCard) {
  card.expandido = !card.expandido
  if (card.expandido && (!card.historial || card.historial.length === 0)) {
    await recargarHistorial(card)
  }
}

async function recargarHistorial(card: DependenciaTramiteCard) {
  const hist = await tramitesApi.cargarHistorialDependencia(props.escrituraId, card.dependencia_clave)
  card.historial = hist
  card.total_movimientos = hist.length
}

async function alGuardarPaso(nuevoPaso: HistorialPasoEscritura) {
  if (props.escrituraId) {
    await tramitesApi.cargarTarjetasDependencias(props.escrituraId).catch(() => {})
  }
  emit('paso-agregado', nuevoPaso)
}

function alAbrirOrdenPago(datos: { dependenciaId?: string; concepto?: string; pasoId?: number }) {
  emit('solicitar-orden-pago', datos)
}

// Utilerías de Formateo y Estilo
function formatearFecha(iso?: string | null): string {
  if (!iso) return 'Sin fecha'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return String(iso)
  }
}

function formatearFechaHora(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(iso)
  }
}

function obtenerIconoDependencia(clave?: number | null): string {
  switch (clave) {
    case 1:
      return 'mdi-map-marker-path'
    case 2:
      return 'mdi-city-variant'
    case 3:
      return 'mdi-library-shelves'
    case 4:
      return 'mdi-folder-cog-outline'
    case 5:
      return 'mdi-home-city'
    default:
      return 'mdi-domain'
  }
}

function obtenerColorDependencia(clave?: number | null): string {
  switch (clave) {
    case 1:
      return 'success'
    case 2:
      return 'info'
    case 3:
      return 'primary'
    case 4:
      return 'warning'
    case 5:
      return 'deep-orange'
    default:
      return 'grey-darken-1'
  }
}

function obtenerColorPaso(nombre?: string | null): string {
  if (!nombre) return 'grey-darken-1'
  const n = nombre.toUpperCase()
  if (n.includes('RECHAZO')) return 'error'
  if (n.includes('CEDULA') || n.includes('1ER TEST') || n.includes('SALIDA') || n.includes('CONCLUIDO')) return 'success'
  if (n.includes('O.P.') || n.includes('PAGO') || n.includes('ORD.')) return 'warning'
  return 'primary'
}

function obtenerHexPaso(nombre?: string | null): string {
  if (!nombre) return '#74777F'
  const n = nombre.toUpperCase()
  if (n.includes('RECHAZO')) return '#B23A34'
  if (n.includes('CEDULA') || n.includes('1ER TEST') || n.includes('SALIDA') || n.includes('CONCLUIDO')) return '#2F6F4E'
  if (n.includes('O.P.') || n.includes('PAGO') || n.includes('ORD.')) return '#A9762E'
  return '#1B3A5F'
}

function obtenerIconoPaso(nombre?: string | null): string {
  if (!nombre) return 'mdi-circle-medium'
  const n = nombre.toUpperCase()
  if (n.includes('RECHAZO')) return 'mdi-alert-circle'
  if (n.includes('CEDULA') || n.includes('1ER TEST') || n.includes('SALIDA')) return 'mdi-check-decagram'
  if (n.includes('O.P.') || n.includes('ORD. DE PAG')) return 'mdi-cash-register'
  if (n.includes('ING.') || n.includes('INGRESO') || n.includes('REINGRESO')) return 'mdi-tray-arrow-down'
  return 'mdi-clock-outline'
}

defineExpose({
  recargar: () => tramitesApi.cargarTarjetasDependencias(props.escrituraId),
  abrirNuevaDependenciaModal
})
</script>

<style scoped>
.font-mono {
  font-family: monospace;
}
.text-2xs {
  font-size: 0.65rem !important;
  height: 18px !important;
}
.font-size-xs {
  font-size: 0.725rem !important;
}
.min-w-56 {
  min-width: 14rem;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  left: -27px;
  top: 18px;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
}
.font-size-sm {
  font-size: 0.825rem !important;
  line-height: 1.35;
}
</style>
