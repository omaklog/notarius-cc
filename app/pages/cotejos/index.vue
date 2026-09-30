<template>
  <div class="pa-6 max-w-7xl mx-auto">
    <!-- Breadcrumbs -->
    <v-breadcrumbs
      :items="breadcrumbs"
      density="compact"
      class="pa-0 mb-4 text-caption"
    >
      <template #divider>
        <v-icon icon="mdi-chevron-right" size="14" />
      </template>
    </v-breadcrumbs>

    <!-- Header Institucional -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <v-icon icon="mdi-book-check-outline" size="32" color="primary" />
          <h1 class="text-h4 font-weight-bold text-primary">
            Libro de Cotejos y Certificaciones
          </h1>
        </div>
        <p class="text-subtitle-1 text-grey-darken-1 mb-0">
          Control cronológico y compulsa de documentos originales exhibidos conforme a la Ley del Notariado.
        </p>
      </div>

      <!-- Botonera Superior -->
      <div class="d-flex align-center gap-2 flex-wrap">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-book-plus-multiple-outline"
          class="font-weight-medium"
          @click="abrirModalApertura"
        >
          Nuevo Libro
        </v-btn>

        <v-btn
          v-if="libroActivo && libroActivo.estatus === 'abierto'"
          variant="outlined"
          color="error"
          prepend-icon="mdi-book-lock-outline"
          class="font-weight-medium"
          @click="abrirModalCierre"
        >
          Cerrar Tomo
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-bold px-5"
          prepend-icon="mdi-plus-circle"
          :disabled="!libroActivo || libroActivo.estatus !== 'abierto'"
          @click="abrirModalRegistro"
        >
          + Nuevo Cotejo
        </v-btn>
      </div>
    </div>

    <!-- Banner del Libro Activo con Barra de Progreso de Folios -->
    <v-card v-if="libroActivo" elevation="0" variant="outlined" class="mb-6 rounded-lg bg-surface">
      <v-card-text class="pa-5">
        <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-3">
          <div class="d-flex align-center gap-3">
            <v-avatar color="primary" rounded="lg" size="48">
              <v-icon icon="mdi-book-open-page-variant" color="white" size="28" />
            </v-avatar>
            <div>
              <div class="d-flex align-center gap-2">
                <h2 class="text-h6 font-weight-bold text-primary mb-0">
                  Libro de Cotejos No. {{ libroActivo.numero_libro }} · Ejercicio {{ libroActivo.anio }}
                </h2>
                <v-chip
                  size="small"
                  :color="libroActivo.estatus === 'abierto' ? 'success' : 'grey'"
                  variant="tonal"
                  class="font-weight-bold text-capitalize"
                >
                  {{ libroActivo.estatus }}
                </v-chip>
              </div>
              <span class="text-caption text-grey-darken-1">
                Aperturado el {{ formatearFechaSimple(libroActivo.fecha_apertura) }}
              </span>
            </div>
          </div>

          <div class="d-flex align-center gap-3">
            <div class="text-right">
              <span class="text-caption text-grey-darken-1 d-block">Asientos Utilizados</span>
              <span class="text-subtitle-2 font-weight-bold text-primary">
                {{ libroActivo.total_actas || 0 }} de {{ libroActivo.limite_actas }} actas ({{ porcentajeUsoLibro }}%)
              </span>
            </div>
            <v-chip
              v-if="libroActivo.estatus === 'abierto'"
              color="primary"
              variant="flat"
              class="text-white font-weight-bold"
            >
              Próxima Acta: #{{ proximaActaDisponible }}
            </v-chip>
          </div>
        </div>

        <v-progress-linear
          :model-value="porcentajeUsoLibro"
          color="primary"
          height="8"
          rounded
          bg-color="grey-lighten-3"
        />
      </v-card-text>
    </v-card>

    <v-alert
      v-else
      color="warning"
      variant="tonal"
      class="mb-6 rounded-lg"
      icon="mdi-alert-circle-outline"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-4">
        <div>
          <span class="font-weight-bold d-block">No hay libros de cotejo activos</span>
          <span class="text-caption">Aperture un nuevo libro o tomo para comenzar a registrar actas de cotejo fuera de protocolo.</span>
        </div>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-bold"
          size="small"
          prepend-icon="mdi-plus"
          @click="abrirModalApertura"
        >
          Aperturar Libro Inicial
        </v-btn>
      </div>
    </v-alert>

    <!-- Tarjetas de Métricas Operativas (KPIs) -->
    <v-row class="mb-6" density="comfortable">
      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="rounded-lg pa-4 bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Actas Hoy
            </span>
            <v-avatar color="primary" variant="tonal" size="32">
              <v-icon icon="mdi-calendar-today" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-primary mb-1">
            {{ metricas.actasHoy }}
          </div>
          <span class="text-caption text-grey-darken-1">
            Asentadas en la jornada actual
          </span>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="rounded-lg pa-4 bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Actas Autorizadas
            </span>
            <v-avatar color="success" variant="tonal" size="32">
              <v-icon icon="mdi-check-decagram-outline" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-success mb-1">
            {{ metricas.actasAutorizadasLibro }}
          </div>
          <span class="text-caption text-grey-darken-1">
            Con firma y sello oficial
          </span>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="rounded-lg pa-4 bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Tantos Expedidos
            </span>
            <v-avatar color="secondary" variant="tonal" size="32">
              <v-icon icon="mdi-content-copy" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-secondary mb-1">
            {{ metricas.totalTantosExpedidos }}
          </div>
          <span class="text-caption text-grey-darken-1">
            Copias cotejadas certificadas
          </span>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card elevation="0" variant="outlined" class="rounded-lg pa-4 bg-surface h-100">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-grey-darken-1 text-uppercase">
              Actas Inutilizadas
            </span>
            <v-avatar color="error" variant="tonal" size="32">
              <v-icon icon="mdi-cancel" size="18" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-bold text-error mb-1">
            {{ metricas.actasCanceladas }}
          </div>
          <span class="text-caption text-grey-darken-1">
            Canceladas con razón en libro
          </span>
        </v-card>
      </v-col>
    </v-row>

    <!-- Barra de Filtros y Búsqueda -->
    <v-card elevation="0" variant="outlined" class="mb-6 rounded-lg pa-4 bg-surface">
      <v-row density="comfortable" align="center">
        <v-col cols="12" md="4">
          <v-text-field
            v-model="filtros.busqueda"
            label="Buscar por solicitante, documento o folio..."
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            @update:model-value="aplicarFiltros"
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filtros.tipo_documento"
            :items="['todos', ...tiposDocumento]"
            label="Tipo de Documento"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="aplicarFiltros"
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filtros.estatus"
            :items="[
              { title: 'Todos los Estatus', value: 'todos' },
              { title: 'Autorizado', value: 'autorizado' },
              { title: 'Registrado', value: 'registrado' },
              { title: 'Entregado', value: 'entregado' },
              { title: 'Cancelado', value: 'cancelado' }
            ]"
            item-title="title"
            item-value="value"
            label="Estatus"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="aplicarFiltros"
          />
        </v-col>

        <v-col cols="12" md="2" class="text-right">
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-filter-remove-outline"
            @click="limpiarFiltros"
          >
            Limpiar
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <!-- Tabla de Actas de Cotejo -->
    <v-card elevation="0" variant="outlined" class="rounded-lg overflow-hidden">
      <v-table hover density="comfortable">
        <thead class="bg-grey-lighten-4">
          <tr>
            <th class="font-weight-bold text-primary">No. Acta</th>
            <th class="font-weight-bold text-primary">Fecha / Hora</th>
            <th class="font-weight-bold text-primary">Solicitante</th>
            <th class="font-weight-bold text-primary">Tipo Documento</th>
            <th class="font-weight-bold text-primary">Descripción Exhibido</th>
            <th class="font-weight-bold text-primary text-center">Fojas / Tantos</th>
            <th class="font-weight-bold text-primary text-center">Estatus</th>
            <th class="font-weight-bold text-primary text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="8" class="text-center py-6 text-grey">
              <v-progress-circular indeterminate color="primary" size="24" class="mr-2" />
              Cargando actas de cotejo...
            </td>
          </tr>
          <tr v-else-if="actas.length === 0">
            <td colspan="8" class="text-center py-8 text-grey">
              <v-icon icon="mdi-file-hidden" size="36" class="d-block mx-auto mb-2 text-grey-lighten-1" />
              No se encontraron actas de cotejo asentadas con los filtros seleccionados.
            </td>
          </tr>
          <tr v-for="acta in actas" :key="acta.id">
            <!-- Folio / No. Acta -->
            <td>
              <span class="font-weight-bold text-primary">
                #{{ acta.numero_acta }}
              </span>
              <span class="text-caption text-grey d-block">
                Libro {{ acta.libro?.numero_libro || 1 }}
              </span>
            </td>

            <!-- Fecha y hora -->
            <td class="text-no-wrap">
              {{ formatearFecha(acta.fecha_cotejo) }}
            </td>

            <!-- Solicitante -->
            <td>
              <span class="font-weight-medium d-block">{{ acta.solicitante_nombre }}</span>
              <span v-if="acta.solicitante_identificacion" class="text-caption text-grey">
                ID: {{ acta.solicitante_identificacion }}
              </span>
            </td>

            <!-- Tipo Documento -->
            <td>
              <v-chip size="small" variant="tonal" color="primary" class="font-weight-medium">
                {{ acta.tipo_documento }}
              </v-chip>
            </td>

            <!-- Descripción del Original -->
            <td>
              <div class="text-body-2 text-truncate" style="max-width: 280px;" :title="acta.documento_descripcion">
                {{ acta.documento_descripcion }}
              </div>
            </td>

            <!-- Fojas / Tantos -->
            <td class="text-center text-no-wrap">
              <span class="font-weight-medium">{{ acta.numero_hojas }} f.</span> /
              <span class="font-weight-medium text-secondary">{{ acta.numero_tantos }} t.</span>
            </td>

            <!-- Estatus -->
            <td class="text-center">
              <v-chip
                size="small"
                :color="colorEstatus(acta.estatus)"
                variant="tonal"
                class="font-weight-bold text-capitalize"
              >
                {{ acta.estatus }}
              </v-chip>
            </td>

            <!-- Acciones -->
            <td class="text-center text-no-wrap">
              <!-- Ver Detalle & Evidencias -->
              <v-tooltip text="Ver detalle y evidencias" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-eye-outline"
                    variant="text"
                    density="compact"
                    color="primary"
                    @click="verDetalle(acta)"
                  />
                </template>
              </v-tooltip>

              <!-- Imprimir Razón de Cotejo -->
              <v-tooltip text="Imprimir Razón Notarial" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-printer"
                    variant="text"
                    density="compact"
                    color="secondary"
                    :disabled="acta.estatus === 'cancelado'"
                    @click="imprimirRazon(acta)"
                  />
                </template>
              </v-tooltip>

              <!-- Cancelar Acta -->
              <v-tooltip text="Cancelar acta de cotejo" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    icon="mdi-cancel"
                    variant="text"
                    density="compact"
                    color="error"
                    :disabled="acta.estatus === 'cancelado'"
                    @click="iniciarCancelacion(acta)"
                  />
                </template>
              </v-tooltip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Modales Auxiliares -->
    <CotejoRegistroModal
      v-model="modalRegistro"
      :libro-activo="libroActivo"
      @creado="onActaCreada"
    />

    <CotejoRazonImprimible
      v-model="modalImpresion"
      :acta="actaSeleccionada"
    />

    <CotejoDetalleModal
      v-model="modalDetalle"
      :acta="actaSeleccionada"
      @imprimir="imprimirRazon"
      @actualizado="cargarActas(filtros)"
    />

    <LibroAperturaModal
      v-model="modalApertura"
      :siguiente-numero-sugerido="(libroActivo?.numero_libro || 0) + 1"
      @aperturado="onLibroAperturado"
    />

    <LibroCierreModal
      v-model="modalCierre"
      :libro="libroActivo"
      @cerrado="onLibroCerrado"
    />

    <!-- Diálogo de Confirmación de Cancelación Justificada -->
    <v-dialog v-model="modalCancelacion" max-width="500px" persistent>
      <v-card class="rounded-lg">
        <v-card-title class="bg-error text-white pa-4">
          <v-icon icon="mdi-alert-circle-outline" class="mr-2" />
          Cancelar Acta de Cotejo #{{ actaACancelar?.numero_acta }}
        </v-card-title>
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-4">
            Conforme a la Ley del Notariado, la anulación de un acta no elimina su número correlativo del libro oficial. Debe asentar la causa o motivo legal de inutilización.
          </p>
          <v-textarea
            v-model="motivoCancelacion"
            label="Motivo Legal de Cancelación *"
            variant="outlined"
            density="comfortable"
            rows="3"
            placeholder="Ej. Solicitante desiste de la certificación previo a su entrega..."
            :rules="[(v) => !!v?.trim() || 'El motivo es obligatorio']"
          />
        </v-card-text>
        <v-card-actions class="pa-4 justify-space-between">
          <v-btn variant="text" @click="modalCancelacion = false">
            Regresar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            :disabled="!motivoCancelacion.trim() || guardando"
            :loading="guardando"
            @click="confirmarCancelacion"
          >
            Inutilizar Acta
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { ActaCotejo, FiltrosCotejo } from '~/types/cotejos'
import { useCotejos } from '~/composables/useCotejos'
import CotejoRegistroModal from '~/components/cotejos/CotejoRegistroModal.vue'
import CotejoRazonImprimible from '~/components/cotejos/CotejoRazonImprimible.vue'
import CotejoDetalleModal from '~/components/cotejos/CotejoDetalleModal.vue'
import LibroAperturaModal from '~/components/cotejos/LibroAperturaModal.vue'
import LibroCierreModal from '~/components/cotejos/LibroCierreModal.vue'

const breadcrumbs = [
  { title: 'Inicio', to: '/' },
  { title: 'Operación Notarial', disabled: true },
  { title: 'Libro de Cotejos', disabled: true }
]

const {
  libros,
  libroActivo,
  actas,
  cargando,
  guardando,
  metricas,
  proximaActaDisponible,
  porcentajeUsoLibro,
  cargarLibros,
  cargarActas,
  cancelarActa
} = useCotejos()

const modalRegistro = ref(false)
const modalImpresion = ref(false)
const modalDetalle = ref(false)
const modalApertura = ref(false)
const modalCierre = ref(false)
const modalCancelacion = ref(false)

const actaSeleccionada = ref<ActaCotejo | null>(null)
const actaACancelar = ref<ActaCotejo | null>(null)
const motivoCancelacion = ref('')

const tiposDocumento = [
  'Título Profesional / Cédula Profesional',
  'Acta del Estado Civil (Nacimiento / Matrimonio)',
  'Identificación Oficial / INE / Pasaporte',
  'Poder Notarial / Acta Constitutiva',
  'Contrato Privado',
  'Constancia / Documento Fiscal / SAT',
  'Certificado de Estudios / Calificaciones',
  'Otro Documento Privado'
]

const filtros = reactive<FiltrosCotejo>({
  busqueda: '',
  tipo_documento: 'todos',
  estatus: 'todos'
})

onMounted(async () => {
  await cargarLibros()
  await cargarActas()
})

function aplicarFiltros() {
  cargarActas(filtros)
}

function limpiarFiltros() {
  filtros.busqueda = ''
  filtros.tipo_documento = 'todos'
  filtros.estatus = 'todos'
  cargarActas()
}

function abrirModalRegistro() {
  modalRegistro.value = true
}

function abrirModalApertura() {
  modalApertura.value = true
}

function abrirModalCierre() {
  modalCierre.value = true
}

function verDetalle(acta: ActaCotejo) {
  actaSeleccionada.value = acta
  modalDetalle.value = true
}

function imprimirRazon(acta: ActaCotejo) {
  actaSeleccionada.value = acta
  modalImpresion.value = true
}

function iniciarCancelacion(acta: ActaCotejo) {
  actaACancelar.value = acta
  motivoCancelacion.value = ''
  modalCancelacion.value = true
}

async function confirmarCancelacion() {
  if (!actaACancelar.value || !motivoCancelacion.value.trim()) return
  try {
    await cancelarActa(actaACancelar.value.id, motivoCancelacion.value)
    modalCancelacion.value = false
    actaACancelar.value = null
  } catch (err) {
    console.error('Error al cancelar acta:', err)
  }
}

function onActaCreada(_acta: ActaCotejo) {
  cargarActas(filtros)
}

async function onLibroAperturado() {
  await cargarLibros()
  await cargarActas(filtros)
}

async function onLibroCerrado() {
  await cargarLibros()
}

function colorEstatus(estatus: string) {
  switch (estatus) {
    case 'autorizado': return 'success'
    case 'entregado': return 'info'
    case 'cancelado': return 'error'
    default: return 'warning'
  }
}

function formatearFecha(fechaIso?: string | null): string {
  if (!fechaIso) return '—'
  return new Date(fechaIso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatearFechaSimple(fechaIso?: string | null): string {
  if (!fechaIso) return '—'
  return new Date(fechaIso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}
</script>
