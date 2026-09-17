<template>
  <div class="georreferenciacion-tab">
    <!-- Banner de Validación para Actos Traslativos (Regla G de Protocolización) -->
    <v-alert
      v-if="tieneGeorreferenciacionValida"
      type="success"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-check-decagram"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <strong>Requisito de Protocolización Cumplido:</strong>
          La escritura cuenta con delimitación geográfica poligonal válida.
        </div>
        <v-chip size="small" color="success" variant="flat" class="font-weight-medium">
          {{ predios.length }} {{ predios.length === 1 ? 'predio registrado' : 'predios registrados' }}
        </v-chip>
      </div>
    </v-alert>

    <v-alert
      v-else
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-alert-circle-outline"
    >
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <strong>Acto Traslativo de Dominio:</strong>
          Se requiere delimitar al menos un predio con geometría poligonal en el mapa para habilitar la protocolización de este instrumento.
        </div>
        <v-chip size="small" color="warning" variant="flat" class="font-weight-medium">
          Pendiente de Delimitar
        </v-chip>
      </div>
    </v-alert>

    <!-- Barra de Selección de Predios / Subdivisiones -->
    <v-card variant="outlined" class="pa-3 mb-4 rounded-lg bg-surface">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <!-- Selector de Lotes (Chips) -->
        <div class="d-flex align-center flex-wrap gap-2">
          <span class="text-caption font-weight-bold text-grey-darken-2 mr-1">
            <v-icon icon="mdi-home-city-outline" size="18" class="mr-1 text-primary" />
            Lotes / Predios:
          </span>

          <v-chip
            v-for="p in predios"
            :key="p.id || p.etiqueta"
            :color="predioActivo?.id === p.id && p.id ? 'primary' : 'default'"
            :variant="predioActivo?.id === p.id && p.id ? 'flat' : 'outlined'"
            filter
            class="font-weight-medium cursor-pointer"
            @click="alSeleccionarLote(p)"
          >
            <v-icon
              start
              :icon="tieneGeometriaCompleta(p) ? 'mdi-vector-polygon' : 'mdi-vector-polygon-variant'"
              size="16"
            />
            {{ p.etiqueta || 'Sin nombre' }}
            <span v-if="p.superficie_terreno_m2" class="text-caption ml-1 font-weight-regular opacity-80">
              ({{ formatearNumero(p.superficie_terreno_m2) }} m²)
            </span>
          </v-chip>

          <!-- Chip para predio nuevo borrador no guardado -->
          <v-chip
            v-if="predioActivo && !predioActivo.id"
            color="primary"
            variant="flat"
            class="font-weight-medium"
          >
            <v-icon start icon="mdi-plus" size="16" />
            {{ predioForm.etiqueta || 'Nuevo Predio' }} (Borrador)
          </v-chip>

          <v-btn
            v-if="!readOnly"
            variant="tonal"
            color="primary"
            size="small"
            prepend-icon="mdi-plus"
            class="text-capitalize font-weight-medium ml-1"
            :disabled="guardando || cargando"
            @click="agregarNuevoLote"
          >
            Agregar Lote / Subdivisión
          </v-btn>
        </div>

        <!-- Acciones Principales del Predio Activo -->
        <div v-if="predioActivo" class="d-flex align-center gap-2 flex-wrap">
          <!-- Botón Cédula Técnica Notarial PDF -->
          <v-btn
            color="secondary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-file-pdf-box"
            class="text-capitalize font-weight-bold"
            :loading="generandoPdf"
            :disabled="guardando || cargando"
            @click="abrirModalReportePdf"
          >
            Cédula PDF
          </v-btn>

          <!-- Botón Pantalla Completa -->
          <v-btn
            variant="outlined"
            color="primary"
            size="small"
            :prepend-icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            class="text-capitalize font-weight-medium"
            @click="toggleFullscreen"
          >
            {{ isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa' }}
          </v-btn>

          <v-btn
            v-if="!readOnly && predioActivo.id"
            variant="text"
            color="error"
            size="small"
            prepend-icon="mdi-trash-can-outline"
            class="text-capitalize"
            :disabled="guardando"
            @click="confirmarEliminarLote(predioActivo)"
          >
            Eliminar Lote
          </v-btn>

          <v-btn
            v-if="!readOnly"
            color="primary"
            variant="elevated"
            size="small"
            prepend-icon="mdi-content-save-outline"
            class="text-capitalize font-weight-bold"
            :loading="guardando"
            :disabled="guardando || cargando"
            @click="guardarPredioActual"
          >
            Guardar Predio
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Estado de Carga Inicial -->
    <div v-if="cargando" class="d-flex justify-center align-center pa-8">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="ml-3 text-body-2 text-grey-darken-1">Cargando información geográfica...</span>
    </div>

    <!-- Contenido Principal: Mapa + Panel de Datos -->
    <div v-else-if="predioActivo">
      <v-row density="comfortable">
        <!-- Columna Izquierda: Mapa Interactivo Leaflet -->
        <v-col cols="12" :lg="isFullscreen ? 8 : 8">
          <v-card variant="outlined" class="rounded-lg pa-3 bg-surface d-flex flex-column h-100">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-4 d-flex align-center">
                <v-icon icon="mdi-map-marker-radius-outline" size="20" class="mr-1.5 text-primary" />
                <span>Delimitación Poligonal del Terreno</span>
              </div>
            </div>

            <!-- Mapa montado bajo ClientOnly para evitar errores SSR de Leaflet -->
            <div class="flex-grow-1" :style="{ minHeight: isFullscreen ? '620px' : '500px' }">
              <ClientOnly>
                <PredioMapaLeaflet
                  ref="mapaRef"
                  v-model="coordenadasAnillo"
                  :predios="predios"
                  :predio-activo-id="predioActivo.id"
                  :editable="!readOnly"
                  @change="alModificarCoordenadas"
                />
                <template #fallback>
                  <v-sheet
                    :height="isFullscreen ? 620 : 500"
                    color="grey-lighten-4"
                    class="d-flex flex-column align-center justify-center rounded-lg border border-dashed border-grey-lighten-2"
                  >
                    <v-progress-circular indeterminate color="primary" size="36" class="mb-2" />
                    <span class="text-caption text-grey-darken-1">Cargando mapa interactivo...</span>
                  </v-sheet>
                </template>
              </ClientOnly>
            </div>

            <!-- Ficha Técnica Inferior de Superficie -->
            <v-sheet
              color="grey-lighten-5"
              class="pa-3 mt-3 rounded-lg border border-grey-lighten-2 d-flex align-center justify-space-between flex-wrap gap-2"
            >
              <div class="d-flex align-center gap-2">
                <v-icon icon="mdi-ruler-square" size="22" color="primary" />
                <div>
                  <div class="text-caption text-grey-darken-1">Superficie Terreno Calculada:</div>
                  <div class="text-subtitle-2 font-weight-bold text-grey-darken-4">
                    {{ predioForm.superficie_terreno_m2 ? formatearNumero(predioForm.superficie_terreno_m2) + ' m²' : '0.00 m²' }}
                    <span class="text-caption text-primary font-weight-regular ml-1">
                      (Cálculo aproximado satelital)
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="coordenadasAnillo.length >= 3" class="text-caption text-grey-darken-2">
                Polígono cerrado con orientación geográfica
              </div>
              <div v-else class="text-caption text-warning d-flex align-center">
                <v-icon icon="mdi-alert" size="16" class="mr-1" />
                Se requieren al menos 3 vértices para calcular el área
              </div>
            </v-sheet>
          </v-card>
        </v-col>

        <!-- Columna Derecha: Ficha Técnica, Fachada y Colindancias -->
        <v-col cols="12" :lg="isFullscreen ? 4 : 4">
          <div class="d-flex flex-column gap-3">
            <!-- Tarjeta: Datos Generales del Lote -->
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <div class="text-subtitle-2 font-weight-bold text-grey-darken-4 mb-3 d-flex align-center">
                <v-icon icon="mdi-information-outline" size="18" class="mr-1.5 text-primary" />
                <span>Datos del Lote / Fracción</span>
              </div>

              <v-text-field
                v-model="predioForm.etiqueta"
                label="Identificador / Etiqueta del Lote *"
                placeholder="Ej: Predio Principal, Lote 4B, Fracción Norte"
                variant="outlined"
                density="compact"
                class="mb-3"
                :disabled="readOnly"
                hide-details
              />

              <v-text-field
                v-model.number="predioForm.superficie_declarada_m2"
                label="Superficie Declarada en Título (m²)"
                placeholder="Ej: 250.00 (Opcional)"
                type="number"
                step="0.01"
                variant="outlined"
                density="compact"
                class="mb-3"
                :disabled="readOnly"
                hide-details
              />

              <v-textarea
                v-model="predioForm.descripcion"
                label="Descripción o Ubicación / Referencias"
                placeholder="Notas adicionales sobre el predio o acceso..."
                variant="outlined"
                density="compact"
                rows="2"
                :disabled="readOnly"
                hide-details
              />
            </v-card>

            <!-- Tarjeta: Testigo de Fachada (Storage expedientes) -->
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <PredioFachadaUpload
                :foto-url="predioForm.foto_fachada_url"
                :escritura-id="escrituraId"
                :predio-id="predioForm.id"
                :editable="!readOnly"
                @uploaded="alSubirFachada"
                @deleted="alEliminarFachada"
              />
            </v-card>

            <!-- Tarjeta: Medidas y Colindancias Orientadas -->
            <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
              <PredioColindanciasForm
                v-model="predioForm.colindancias"
                :coordenadas-poligono="coordenadasAnillo"
                :editable="!readOnly"
                @change="alModificarColindancias"
              />
            </v-card>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Estado Vacío: Si no hay predios ni lote activo -->
    <v-sheet
      v-else
      color="surface"
      class="pa-8 text-center rounded-lg border border-dashed border-grey-lighten-2 my-4"
    >
      <v-avatar color="primary" variant="tonal" size="64" class="mb-3">
        <v-icon icon="mdi-map-marker-plus-outline" size="36" color="primary" />
      </v-avatar>
      <div class="text-h6 font-weight-bold text-grey-darken-3 mb-1">
        Sin Predios Registrados
      </div>
      <div class="text-body-2 text-grey-darken-1 mb-4" style="max-width: 500px; margin: 0 auto;">
        Esta escritura no tiene inmuebles ni predios delimitados. Comienza registrando el predio principal o lote para trazar su polígono en el mapa.
      </div>
      <v-btn
        v-if="!readOnly"
        color="primary"
        variant="elevated"
        prepend-icon="mdi-plus"
        class="text-capitalize font-weight-bold"
        @click="agregarNuevoLote"
      >
        Agregar Predio Principal
      </v-btn>
    </v-sheet>

    <!-- Diálogo de Confirmación para Eliminar Lote -->
    <v-dialog v-model="dialogoEliminarVisible" max-width="450">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold pa-4 text-error d-flex align-center">
          <v-icon icon="mdi-alert-circle-outline" class="mr-2" />
          ¿Eliminar este lote?
        </v-card-title>
        <v-card-text class="pa-4 pt-0 text-body-2 text-grey-darken-2">
          ¿Estás seguro de que deseas eliminar el lote
          <strong>"{{ loteAEliminar?.etiqueta }}"</strong>?
          Se eliminará su delimitación geográfica, superficie y colindancias registradas.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-2"
            class="text-capitalize"
            :disabled="guardando"
            @click="dialogoEliminarVisible = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            variant="elevated"
            color="error"
            class="text-capitalize font-weight-bold"
            :loading="guardando"
            @click="ejecutarEliminarLote"
          >
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal de Previsualización e Impresión de Cédula PDF -->
    <v-dialog v-model="modalPdfVisible" max-width="920" scrollable>
      <v-card>
        <v-toolbar color="primary" density="compact" dark class="px-3">
          <v-icon icon="mdi-file-document-outline" class="mr-2" />
          <v-toolbar-title class="text-subtitle-2 font-weight-bold">
            Cédula Técnica Notarial de Georreferenciación — Vista Previa
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            variant="elevated"
            color="secondary"
            size="small"
            prepend-icon="mdi-printer"
            class="text-capitalize font-weight-bold mr-2"
            @click="imprimirCedulaPdf"
          >
            Imprimir / Descargar PDF
          </v-btn>
          <v-btn icon="mdi-close" size="small" variant="text" @click="modalPdfVisible = false" />
        </v-toolbar>
        <v-card-text class="pa-0" style="height: 75vh; background-color: #525659;">
          <iframe
            :srcdoc="htmlReportePdf"
            style="width: 100%; height: 100%; border: none; background: white;"
          />
        </v-card-text>
        <v-card-actions class="pa-3 bg-surface border-t">
          <span class="text-caption text-grey-darken-1 ml-2">
            La cédula técnica incorpora el croquis del polígono, medidas, colindancias y fotografía de fachada.
          </span>
          <v-spacer />
          <v-btn variant="text" color="grey-darken-2" class="text-capitalize" @click="modalPdfVisible = false">
            Cerrar
          </v-btn>
          <v-btn
            variant="elevated"
            color="primary"
            class="text-capitalize font-weight-bold"
            prepend-icon="mdi-printer"
            @click="imprimirCedulaPdf"
          >
            Imprimir / Descargar PDF
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de Feedback -->
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" :timeout="3500">
      {{ snackbar.texto }}
      <template #actions>
        <v-btn variant="text" color="white" @click="snackbar.visible = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useSupabaseClient } from '#imports'
import type { PredioItem, ColindanciaItem, GeoJSONPolygon } from '~/types/predios'
import { usePredios } from '~/composables/usePredios'
import { calcularAreaPoligonoM2, calcularCentroide } from '~/utils/geometriaUtils'
import { generarHtmlCedulaGeorreferenciacion } from '~/utils/pdfCedulaGeorreferenciacion'
import PredioMapaLeaflet from '~/components/georreferenciacion/PredioMapaLeaflet.vue'
import PredioColindanciasForm from '~/components/georreferenciacion/PredioColindanciasForm.vue'
import PredioFachadaUpload from '~/components/georreferenciacion/PredioFachadaUpload.vue'

const props = withDefaults(
  defineProps<{
    escrituraId: string
    actoJuridicoId?: string
    readOnly?: boolean
    isFullscreen?: boolean
  }>(),
  {
    readOnly: false,
    isFullscreen: false
  }
)

const emit = defineEmits<{
  'status-change': []
  'cambio-cumplimiento': []
  'abrir-fullscreen': []
  'cerrar-fullscreen': []
  'toggle-fullscreen': []
}>()

const supabase = useSupabaseClient()
const mapaRef = ref<any>(null)

const {
  predios,
  predioActivo,
  cargando,
  guardando,
  cargarPredios,
  seleccionarPredio,
  crearPredioVacio,
  guardarPredio,
  eliminarPredio
} = usePredios()

// Datos complementarios de la escritura para la Cédula Notarial
const datosEscritura = ref<any>(null)

// Formulario local del predio activo
const predioForm = ref<PredioItem>({
  id: '',
  escritura_id: props.escrituraId,
  etiqueta: 'Predio Principal',
  descripcion: null,
  superficie_terreno_m2: 0,
  superficie_declarada_m2: null,
  geometria: {
    type: 'Polygon',
    coordinates: [[]]
  },
  centroide: null,
  colindancias: [],
  foto_fachada_url: null,
  foto_fachada_storage_path: null
})

// Vértices del polígono actual (anillo exterior [[lng, lat], ...])
const coordenadasAnillo = ref<[number, number][]>([])

// Diálogo de eliminación
const dialogoEliminarVisible = ref(false)
const loteAEliminar = ref<PredioItem | null>(null)

// Modal de Cédula PDF
const modalPdfVisible = ref(false)
const generandoPdf = ref(false)
const htmlReportePdf = ref('')

// Feedback
const snackbar = ref({
  visible: false,
  texto: '',
  color: 'success'
})

function mostrarMensaje(texto: string, color = 'success') {
  snackbar.value = {
    visible: true,
    texto,
    color
  }
}

// Cargar predios y datos del instrumento al montar
onMounted(async () => {
  if (props.escrituraId) {
    cargarDatosEscritura()
    const lista = await cargarPredios(props.escrituraId)
    if (lista && lista.length > 0) {
      sincronizarFormularioConActivo(lista[0])
    } else {
      const nuevo = crearPredioVacio(props.escrituraId)
      seleccionarPredio(nuevo)
      sincronizarFormularioConActivo(nuevo)
    }
  }
})

async function cargarDatosEscritura() {
  if (!props.escrituraId) return
  try {
    const { data } = await supabase
      .from('escrituras')
      .select('instrumento, anio, volumen, fecha_celebracion, objeto, acto_juridico_id, actos_juridicos(nombre)')
      .eq('id', props.escrituraId)
      .maybeSingle()

    if (data) {
      datosEscritura.value = data
    }
  } catch (err) {
    console.warn('Error al cargar datos de escritura para reporte:', err)
  }
}

// Redimensionar el mapa cuando cambie el modo pantalla completa
watch(
  () => props.isFullscreen,
  () => {
    nextTick(() => {
      mapaRef.value?.redimensionarMapa?.()
    })
  }
)

function toggleFullscreen() {
  if (props.isFullscreen) {
    emit('cerrar-fullscreen')
  } else {
    emit('abrir-fullscreen')
  }
  emit('toggle-fullscreen')
}

// Observar cambio en predioActivo de usePredios
watch(
  () => predioActivo.value,
  (nuevo) => {
    if (nuevo) {
      sincronizarFormularioConActivo(nuevo)
    }
  },
  { deep: true }
)

function sincronizarFormularioConActivo(item: PredioItem) {
  predioForm.value = {
    id: item.id || '',
    escritura_id: item.escritura_id || props.escrituraId,
    etiqueta: item.etiqueta || 'Predio Principal',
    descripcion: item.descripcion ?? null,
    superficie_terreno_m2: item.superficie_terreno_m2 ?? 0,
    superficie_declarada_m2: item.superficie_declarada_m2 ?? null,
    geometria: item.geometria || {
      type: 'Polygon',
      coordinates: [[]]
    },
    centroide: item.centroide ?? null,
    colindancias: item.colindancias ? [...item.colindancias] : [],
    foto_fachada_url: item.foto_fachada_url ?? null,
    foto_fachada_storage_path: item.foto_fachada_storage_path ?? null
  }

  const ring = item.geometria?.coordinates?.[0] || []
  coordenadasAnillo.value = ring.map((c) => [c[0], c[1]] as [number, number])
}

// Validación de protocolo: tiene al menos un predio con geometría válida (>= 3 vértices)
const tieneGeorreferenciacionValida = computed(() => {
  return predios.value.some((p) => {
    const coords = p.geometria?.coordinates?.[0]
    return Array.isArray(coords) && coords.length >= 3
  })
})

function tieneGeometriaCompleta(item: PredioItem): boolean {
  const coords = item.geometria?.coordinates?.[0]
  return Array.isArray(coords) && coords.length >= 3
}

function alSeleccionarLote(p: PredioItem) {
  seleccionarPredio(p)
  sincronizarFormularioConActivo(p)
}

function agregarNuevoLote() {
  const nuevo = crearPredioVacio(props.escrituraId)
  seleccionarPredio(nuevo)
  sincronizarFormularioConActivo(nuevo)
}

function alModificarCoordenadas(coords: [number, number][]) {
  coordenadasAnillo.value = [...coords]

  // Actualizar geometría en predioForm
  predioForm.value.geometria = {
    type: 'Polygon',
    coordinates: [coords]
  }

  // Si tiene >= 3 vértices, auto-calcular superficie y centroide
  if (coords.length >= 3) {
    const area = calcularAreaPoligonoM2(coords)
    predioForm.value.superficie_terreno_m2 = area
    const centro = calcularCentroide(coords)
    predioForm.value.centroide = {
      type: 'Point',
      coordinates: centro
    }
  } else {
    predioForm.value.superficie_terreno_m2 = 0
    predioForm.value.centroide = null
  }
}

function alModificarColindancias(colindancias: ColindanciaItem[]) {
  predioForm.value.colindancias = [...colindancias]
}

function alSubirFachada(data: { url: string; path: string }) {
  predioForm.value.foto_fachada_url = data.url
  predioForm.value.foto_fachada_storage_path = data.path
  mostrarMensaje('Fotografía de fachada vinculada exitosamente')
}

function alEliminarFachada() {
  predioForm.value.foto_fachada_url = null
  predioForm.value.foto_fachada_storage_path = null
}

async function guardarPredioActual() {
  if (!predioForm.value.etiqueta.trim()) {
    mostrarMensaje('Por favor asigna un nombre o etiqueta al lote', 'error')
    return
  }

  const payload: Partial<PredioItem> & { escritura_id: string; geometria: GeoJSONPolygon } = {
    id: predioForm.value.id || undefined,
    escritura_id: props.escrituraId,
    etiqueta: predioForm.value.etiqueta.trim(),
    descripcion: predioForm.value.descripcion || null,
    superficie_terreno_m2: predioForm.value.superficie_terreno_m2 || null,
    superficie_declarada_m2: predioForm.value.superficie_declarada_m2 || null,
    geometria: {
      type: 'Polygon',
      coordinates: [coordenadasAnillo.value]
    },
    centroide: predioForm.value.centroide,
    colindancias: predioForm.value.colindancias || [],
    foto_fachada_url: predioForm.value.foto_fachada_url,
    foto_fachada_storage_path: predioForm.value.foto_fachada_storage_path
  }

  const guardado = await guardarPredio(payload)

  if (guardado) {
    sincronizarFormularioConActivo(guardado)
    mostrarMensaje('Predio guardado correctamente')
    // Notificar al Hub Notarial para revalidar el Gate de Protocolización
    emit('status-change')
    emit('cambio-cumplimiento')
  } else {
    mostrarMensaje('Error al guardar el predio', 'error')
  }
}

function confirmarEliminarLote(item: PredioItem) {
  loteAEliminar.value = item
  dialogoEliminarVisible.value = true
}

async function ejecutarEliminarLote() {
  if (!loteAEliminar.value) return

  if (loteAEliminar.value.id) {
    const ok = await eliminarPredio(loteAEliminar.value.id)
    if (ok) {
      mostrarMensaje('Lote eliminado correctamente')
      dialogoEliminarVisible.value = false
      loteAEliminar.value = null

      if (predios.value.length > 0) {
        alSeleccionarLote(predios.value[0])
      } else {
        const nuevo = crearPredioVacio(props.escrituraId)
        seleccionarPredio(nuevo)
        sincronizarFormularioConActivo(nuevo)
      }

      emit('status-change')
      emit('cambio-cumplimiento')
    } else {
      mostrarMensaje('Error al eliminar el lote', 'error')
    }
  } else {
    // Si era borrador sin guardar
    dialogoEliminarVisible.value = false
    loteAEliminar.value = null
    if (predios.value.length > 0) {
      alSeleccionarLote(predios.value[0])
    }
  }
}

// Generación de Reporte / Cédula Técnica Notarial PDF
async function abrirModalReportePdf() {
  generandoPdf.value = true

  try {
    // Capturar mapa base64
    let mapaBase64: string | null = null
    if (mapaRef.value?.capturarMapaBase64) {
      mapaBase64 = await mapaRef.value.capturarMapaBase64()
    }

    const acto = datosEscritura.value?.actos_juridicos?.nombre || 'Acto Traslativo de Dominio'

    htmlReportePdf.value = generarHtmlCedulaGeorreferenciacion({
      instrumentoNumero: datosEscritura.value?.instrumento || 'S/N',
      volumen: datosEscritura.value?.volumen || null,
      actoJuridico: acto,
      objeto: datosEscritura.value?.objeto || '',
      fechaCelebracion: datosEscritura.value?.fecha_celebracion || null,
      notarioTitular: 'Lic. Notario Titular',
      numeroNotaria: 42,
      entidadFederativa: 'Ciudad de México',
      etiqueta: predioForm.value.etiqueta || 'Predio Principal',
      descripcion: predioForm.value.descripcion || null,
      superficieCalculadaM2: predioForm.value.superficie_terreno_m2,
      superficieDeclaradaM2: predioForm.value.superficie_declarada_m2,
      centroide: predioForm.value.centroide?.coordinates
        ? { lng: predioForm.value.centroide.coordinates[0], lat: predioForm.value.centroide.coordinates[1] }
        : null,
      coordenadasPoligono: coordenadasAnillo.value,
      colindancias: predioForm.value.colindancias || [],
      mapaCapturaUrl: mapaBase64,
      fotoFachadaUrl: predioForm.value.foto_fachada_url
    })

    modalPdfVisible.value = true
  } catch (err: any) {
    mostrarMensaje('Error al generar la cédula técnica: ' + (err?.message || ''), 'error')
  } finally {
    generandoPdf.value = false
  }
}

function imprimirCedulaPdf() {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(htmlReportePdf.value)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 400)
  }
}

function formatearNumero(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00'
  return Number(val).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
</script>

<style scoped>
.georreferenciacion-tab {
  font-family: inherit;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
