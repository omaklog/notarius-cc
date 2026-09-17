<template>
  <div class="predio-mapa-wrapper position-relative">
    <!-- Barra superior de búsqueda y controles de mapa -->
    <div class="map-controls-bar d-flex align-center gap-2 mb-2 flex-wrap">
      <!-- Buscador de ubicación -->
      <v-text-field
        v-model="busquedaTexto"
        placeholder="Buscar calle, colonia, municipio o CP en México..."
        prepend-inner-icon="mdi-magnify"
        density="compact"
        variant="outlined"
        hide-details
        class="flex-grow-1"
        style="min-width: 250px;"
        :loading="buscando"
        @keyup.enter="buscarUbicacion"
      >
        <template #append-inner>
          <v-btn
            size="x-small"
            color="primary"
            variant="text"
            class="font-weight-bold text-capitalize"
            :disabled="!busquedaTexto.trim() || buscando"
            @click="buscarUbicacion"
          >
            Buscar
          </v-btn>
        </template>
      </v-text-field>

      <!-- Selector de Capa (Calles / Satélite) -->
      <v-btn-toggle v-model="capaActiva" mandatory density="compact" color="primary">
        <v-btn value="calles" size="small" prepend-icon="mdi-map">
          Calles
        </v-btn>
        <v-btn value="satelite" size="small" prepend-icon="mdi-satellite-variant">
          Satélite
        </v-btn>
      </v-btn-toggle>

      <!-- Controles de dibujo si es editable -->
      <div v-if="editable" class="d-flex align-center gap-2">
        <v-btn
          v-if="!dibujando && vertices.length === 0"
          color="primary"
          variant="elevated"
          size="small"
          prepend-icon="mdi-vector-polygon"
          class="text-capitalize font-weight-bold"
          @click="iniciarDibujo"
        >
          Trazar Polígono
        </v-btn>

        <v-btn
          v-else-if="dibujando"
          color="success"
          variant="elevated"
          size="small"
          prepend-icon="mdi-check"
          class="text-capitalize font-weight-bold"
          :disabled="vertices.length < 3"
          @click="finalizarDibujo"
        >
          Cerrar Polígono ({{ vertices.length }} pts)
        </v-btn>

        <v-btn
          v-if="vertices.length > 0"
          color="error"
          variant="tonal"
          size="small"
          prepend-icon="mdi-trash-can-outline"
          class="text-capitalize"
          @click="limpiarTrazo"
        >
          Borrar Polígono
        </v-btn>
      </div>
    </div>

    <!-- Menú desplegable con resultados de búsqueda -->
    <v-card
      v-if="resultadosBusqueda.length > 0"
      class="resultados-busqueda-card position-absolute elevation-4 rounded-lg bg-white"
      style="z-index: 1000; width: calc(100% - 20px); max-height: 200px; overflow-y: auto;"
    >
      <v-list density="compact">
        <v-list-item
          v-for="(r, idx) in resultadosBusqueda"
          :key="idx"
          link
          @click="seleccionarResultado(r)"
        >
          <template #prepend>
            <v-icon icon="mdi-map-marker-outline" color="primary" size="18" class="mr-2" />
          </template>
          <v-list-item-title class="text-caption font-weight-medium text-grey-darken-3">
            {{ r.display_name }}
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Contenedor del Mapa Leaflet -->
    <div
      ref="mapContainer"
      class="mapa-leaflet-canvas rounded-lg border border-grey-lighten-2 shadow-xs position-relative"
      style="height: 460px; width: 100%; background-color: #e5e3df;"
    >
      <!-- Indicador flotante en modo dibujo -->
      <div
        v-if="dibujando"
        class="position-absolute bg-primary text-white text-caption px-3 py-1.5 rounded-pill elevation-3 d-flex align-center"
        style="top: 12px; left: 60px; z-index: 800;"
      >
        <v-icon icon="mdi-cursor-default-click" size="16" class="mr-1.5" />
        Haz clic en el mapa para colocar los vértices del terreno
      </div>
    </div>

    <div class="d-flex align-center justify-space-between text-caption text-grey-darken-1 mt-1.5 px-1">
      <div>
        <span v-if="vertices.length >= 3">
          <strong class="text-primary">{{ vertices.length }} vértices delimitados</strong> • Arrastra las esquinas para ajustar
        </span>
        <span v-else-if="dibujando">Colocando puntos... Haz clic para agregar esquinas.</span>
        <span v-else>Sin polígono trazado aún. Presiona "Trazar Polígono" para comenzar.</span>
      </div>
      <div class="font-size-xs text-grey">OpenStreetMap &copy; Esri World Imagery</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { PredioItem, ResultadoBusquedaGeografica } from '~/types/predios'

const props = withDefaults(
  defineProps<{
    modelValue?: [number, number][] // Anillo exterior: [[lng, lat], [lng, lat], ...]
    predios?: PredioItem[]
    predioActivoId?: string | null
    editable?: boolean
  }>(),
  {
    modelValue: () => [],
    predios: () => [],
    predioActivoId: null,
    editable: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [coords: [number, number][]]
  change: [coords: [number, number][]]
}>()

const mapContainer = ref<HTMLElement | null>(null)
let mapInstance: any = null
let L: any = null

let layerCalles: any = null
let layerSatelite: any = null

let polygonLayer: any = null
let tempPolylineLayer: any = null
let markerLayers: any[] = []
let otrosPrediosLayers: any[] = []

const capaActiva = ref<'calles' | 'satelite'>('calles')
const busquedaTexto = ref('')
const buscando = ref(false)
const resultadosBusqueda = ref<ResultadoBusquedaGeografica[]>([])

const dibujando = ref(false)
// Vértices locales: [[lng, lat], ...]
const vertices = ref<[number, number][]>([])

// Coordenadas por defecto (Centro de México)
const CENTRO_DEFAULT: [number, number] = [19.432608, -99.133209] // CDMX [lat, lng]

onMounted(async () => {
  if (typeof window === 'undefined') return

  try {
    L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')

    // Corregir rutas de iconos por defecto de Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    })

    inicializarMapa()
  } catch (err) {
    console.warn('No se pudo inicializar Leaflet en este entorno:', err)
  }
})

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

function inicializarMapa() {
  if (!mapContainer.value || !L) return

  layerCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  })

  layerSatelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  )

  mapInstance = L.map(mapContainer.value, {
    center: CENTRO_DEFAULT,
    zoom: 15,
    layers: [layerCalles],
    attributionControl: false
  })

  // Escuchar clics en el mapa para trazar vértices
  mapInstance.on('click', (e: any) => {
    if (!dibujando.value || !props.editable) return
    const lng = Math.round(e.latlng.lng * 1000000) / 1000000
    const lat = Math.round(e.latlng.lat * 1000000) / 1000000
    agregarVertice([lng, lat])
  })

  sincronizarModelo()
  renderizarOtrosPredios()
}

// Cambiar entre capa calles y satélite
watch(capaActiva, (nuevaCapa) => {
  if (!mapInstance || !layerCalles || !layerSatelite) return
  if (nuevaCapa === 'satelite') {
    mapInstance.removeLayer(layerCalles)
    mapInstance.addLayer(layerSatelite)
  } else {
    mapInstance.removeLayer(layerSatelite)
    mapInstance.addLayer(layerCalles)
  }
})

// Sincronizar cuando cambie el modelo externo
watch(
  () => props.modelValue,
  (nuevasCoords) => {
    if (dibujando.value) return
    sincronizarModelo()
  },
  { deep: true }
)

// Sincronizar otros predios de la escritura
watch(
  () => props.predios,
  () => {
    renderizarOtrosPredios()
  },
  { deep: true }
)

function sincronizarModelo() {
  if (!mapInstance || !L) return

  limpiarCapasDibujo()

  if (props.modelValue && props.modelValue.length >= 3) {
    vertices.value = [...props.modelValue]
    dibujarPoligonoFinal(vertices.value)
  } else {
    vertices.value = []
  }
}

function iniciarDibujo() {
  dibujando.value = true
  limpiarCapasDibujo()
  vertices.value = []
}

function agregarVertice(coord: [number, number]) {
  vertices.value.push(coord)
  actualizarCapaTemporal()
}

function actualizarCapaTemporal() {
  if (!mapInstance || !L) return

  if (tempPolylineLayer) {
    mapInstance.removeLayer(tempPolylineLayer)
  }

  const latlngs = vertices.value.map(([lng, lat]) => [lat, lng])

  tempPolylineLayer = L.polyline(latlngs, {
    color: '#1B3A5F',
    weight: 3,
    dashArray: '5, 5'
  }).addTo(mapInstance)

  // Crear marcador para el nuevo vértice
  const ultimo = vertices.value[vertices.value.length - 1]
  const idx = vertices.value.length - 1

  const marker = L.circleMarker([ultimo[1], ultimo[0]], {
    radius: 6,
    fillColor: '#A9762E',
    color: '#ffffff',
    weight: 2,
    fillOpacity: 1
  }).addTo(mapInstance)

  markerLayers.push(marker)
}

function finalizarDibujo() {
  if (vertices.value.length < 3) return
  dibujando.value = false

  if (tempPolylineLayer && mapInstance) {
    mapInstance.removeLayer(tempPolylineLayer)
    tempPolylineLayer = null
  }

  // Cerrar polígono asegurando que el último punto cierre con el primero
  const coords = [...vertices.value]
  const primero = coords[0]
  const ultimo = coords[coords.length - 1]
  if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
    coords.push([...primero])
  }

  vertices.value = coords
  dibujarPoligonoFinal(vertices.value)

  emit('update:modelValue', vertices.value)
  emit('change', vertices.value)
}

function limpiarTrazo() {
  dibujando.value = false
  vertices.value = []
  limpiarCapasDibujo()
  emit('update:modelValue', [])
  emit('change', [])
}

function limpiarCapasDibujo() {
  if (!mapInstance) return

  if (polygonLayer) {
    mapInstance.removeLayer(polygonLayer)
    polygonLayer = null
  }

  if (tempPolylineLayer) {
    mapInstance.removeLayer(tempPolylineLayer)
    tempPolylineLayer = null
  }

  markerLayers.forEach((m) => mapInstance.removeLayer(m))
  markerLayers = []
}

function dibujarPoligonoFinal(coords: [number, number][]) {
  if (!mapInstance || !L || coords.length < 3) return

  limpiarCapasDibujo()

  const latlngs = coords.map(([lng, lat]) => [lat, lng])

  polygonLayer = L.polygon(latlngs, {
    color: '#1B3A5F',
    weight: 3,
    fillColor: '#A9762E',
    fillOpacity: 0.35
  }).addTo(mapInstance)

  // Marcadores arrastrables en cada vértice (excepto el duplicado de cierre)
  const n = coords.length > 3 && coords[0][0] === coords[coords.length - 1][0] ? coords.length - 1 : coords.length

  for (let i = 0; i < n; i++) {
    const [lng, lat] = coords[i]
    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      fillColor: '#1B3A5F',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(mapInstance)

    markerLayers.push(marker)
  }

  // Ajustar vista al polígono
  try {
    mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [30, 30] })
  } catch {
    // Si bounds es singular, ignorar
  }
}

// Renderizar polígonos de otros predios de la misma escritura
function renderizarOtrosPredios() {
  if (!mapInstance || !L) return

  otrosPrediosLayers.forEach((l) => mapInstance.removeLayer(l))
  otrosPrediosLayers = []

  const otros = props.predios.filter((p) => p.id && p.id !== props.predioActivoId && p.geometria?.coordinates?.[0]?.length >= 3)

  otros.forEach((p) => {
    const ring = p.geometria.coordinates[0]
    const latlngs = ring.map(([lng, lat]) => [lat, lng])

    const poly = L.polygon(latlngs, {
      color: '#757575',
      weight: 2,
      dashArray: '4, 4',
      fillColor: '#9e9e9e',
      fillOpacity: 0.2
    }).addTo(mapInstance)

    poly.bindTooltip(p.etiqueta, { permanent: false, direction: 'center' })
    otrosPrediosLayers.push(poly)
  })
}

// Buscador Geográfico mediante Nominatim OSM
async function buscarUbicacion() {
  const query = busquedaTexto.value.trim()
  if (!query) return

  buscando.value = true
  resultadosBusqueda.value = []

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=mx&limit=5`
    )
    if (!res.ok) throw new Error('Error al consultar Nominatim')
    const data = await res.json()
    resultadosBusqueda.value = data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }))
  } catch (err) {
    console.warn('Error en geocodificación:', err)
  } finally {
    buscando.value = false
  }
}

function seleccionarResultado(r: ResultadoBusquedaGeografica) {
  resultadosBusqueda.value = []
  busquedaTexto.value = r.display_name

  if (mapInstance) {
    mapInstance.setView([r.lat, r.lon], 17)
  }
}
</script>

<style scoped>
.predio-mapa-wrapper {
  font-family: inherit;
}

.mapa-leaflet-canvas {
  z-index: 1;
}

.resultados-busqueda-card {
  top: 48px;
  left: 0;
}
</style>
