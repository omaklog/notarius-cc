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

      <!-- Botón GPS: Ubicación actual del dispositivo -->
      <v-btn
        icon
        size="small"
        variant="tonal"
        color="primary"
        title="Centrar en mi ubicación actual"
        :loading="obteniendoUbicacion"
        @click="obtenerUbicacionDispositivo"
      >
        <v-icon icon="mdi-crosshairs-gps" size="18" />
      </v-btn>

      <!-- Botón Centrar en el Predio trazado -->
      <v-btn
        v-if="vertices.length >= 3"
        icon
        size="small"
        variant="tonal"
        color="primary"
        title="Centrar mapa en el lote/predio"
        @click="centrarEnPredio"
      >
        <v-icon icon="mdi-crosshairs" size="18" />
      </v-btn>

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
        <span v-if="vertices.length >= 3 && !dibujando">
          <strong class="text-primary">{{ vertices.length }} vértices delimitados</strong> • Arrastra las esquinas para ajustar linderos
        </span>
        <span v-else-if="dibujando">
          Colocando esquinas ({{ vertices.length }} colocadas)... Puedes arrastrar cualquier punto para reposicionarlo antes de cerrar.
        </span>
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
const obteniendoUbicacion = ref(false)

// Coordenadas por defecto (Centro de México)
const CENTRO_DEFAULT: [number, number] = [19.432608, -99.133209] // CDMX [lat, lng]

function obtenerUbicacionDispositivo() {
  if (typeof window === 'undefined' || !navigator.geolocation) return

  obteniendoUbicacion.value = true

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      obteniendoUbicacion.value = false
      if (!mapInstance) return
      // No reubicar si ya el usuario comenzó a dibujar o ya hay un polígono dibujado
      if (vertices.value.length > 0) return

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      mapInstance.setView([lat, lng], 16)
    },
    (err) => {
      obteniendoUbicacion.value = false
      console.warn('Geolocalización no disponible o denegada:', err?.message)
    },
    { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
  )
}

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
    attribution: '&copy; OpenStreetMap contributors',
    crossOrigin: true
  })

  layerSatelite = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      crossOrigin: true
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

  // Si no hay polígono trazado aún, intentar centrar en la ubicación del dispositivo
  if (!props.modelValue || props.modelValue.length < 3) {
    obtenerUbicacionDispositivo()
  }
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
    tempPolylineLayer = null
  }

  markerLayers.forEach((m) => mapInstance.removeLayer(m))
  markerLayers = []

  const latlngs = vertices.value.map(([lng, lat]) => [lat, lng])

  if (latlngs.length > 1) {
    tempPolylineLayer = L.polyline(latlngs, {
      color: '#1B3A5F',
      weight: 3,
      dashArray: '5, 5'
    }).addTo(mapInstance)
  }

  // Icono arrastrable de vértice durante el trazo
  const vertexDrawingIcon = L.divIcon({
    className: 'vertex-marker-icon',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; background-color: #A9762E; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.6); cursor: grab;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

  vertices.value.forEach((coord, idx) => {
    const [lng, lat] = coord
    const marker = L.marker([lat, lng], {
      draggable: props.editable,
      icon: vertexDrawingIcon
    }).addTo(mapInstance)

    // Prevenir que el clic en el vértice agregue otro punto en el mapa
    marker.on('click', (e: any) => {
      L.DomEvent.stopPropagation(e)
    })

    // Actualizar coordenadas en tiempo real al arrastrar el vértice
    marker.on('drag', (e: any) => {
      const newLatLng = e.latlng
      const newLng = Math.round(newLatLng.lng * 1000000) / 1000000
      const newLat = Math.round(newLatLng.lat * 1000000) / 1000000

      vertices.value[idx] = [newLng, newLat]

      if (tempPolylineLayer) {
        tempPolylineLayer.setLatLngs(vertices.value.map(([g, t]) => [t, g]))
      }
    })

    markerLayers.push(marker)
  })
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

  // Marcadores arrastrables en cada vértice (excepto el duplicado de cierre si existe)
  const esCerrado =
    coords.length > 3 &&
    coords[0][0] === coords[coords.length - 1][0] &&
    coords[0][1] === coords[coords.length - 1][1]
  const n = esCerrado ? coords.length - 1 : coords.length

  const finalVertexIcon = L.divIcon({
    className: 'vertex-marker-icon',
    html: `<div style="width: 16px; height: 16px; border-radius: 50%; background-color: #1B3A5F; border: 2px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.6); cursor: grab;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  })

  for (let i = 0; i < n; i++) {
    const [lng, lat] = coords[i]
    const marker = L.marker([lat, lng], {
      draggable: props.editable,
      icon: finalVertexIcon
    }).addTo(mapInstance)

    marker.on('click', (e: any) => {
      L.DomEvent.stopPropagation(e)
    })

    marker.on('drag', (e: any) => {
      const newLatLng = e.latlng
      const newLng = Math.round(newLatLng.lng * 1000000) / 1000000
      const newLat = Math.round(newLatLng.lat * 1000000) / 1000000

      vertices.value[i] = [newLng, newLat]

      // Si es el primer vértice y el polígono es cerrado, sincronizar el último de cierre
      if (i === 0 && esCerrado) {
        vertices.value[vertices.value.length - 1] = [newLng, newLat]
      }

      polygonLayer.setLatLngs(vertices.value.map(([g, t]) => [t, g]))
      emit('update:modelValue', [...vertices.value])
      emit('change', [...vertices.value])
    })

    markerLayers.push(marker)
  }

  // Ajustar vista al polígono sin sobre-acercar en exceso (maxZoom: 17 para mantener calles visibles)
  try {
    mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [50, 50], maxZoom: 17 })
  } catch {
    // Si bounds es singular, ignorar
  }
}

function centrarEnPredio() {
  if (polygonLayer && mapInstance) {
    try {
      mapInstance.fitBounds(polygonLayer.getBounds(), { padding: [50, 50], maxZoom: 17 })
    } catch {
      // Si bounds es singular, ignorar
    }
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

function esperarCargaTiles(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!mapInstance) return resolve()

    let resuelto = false
    const terminar = () => {
      if (!resuelto) {
        resuelto = true
        resolve()
      }
    }

    const capa = capaActiva.value === 'satelite' ? layerSatelite : layerCalles
    if (capa) {
      if (typeof capa.isLoading === 'function' && !capa.isLoading()) {
        setTimeout(terminar, 100)
        return
      }

      if (typeof capa.once === 'function') {
        capa.once('load', () => {
          setTimeout(terminar, 80)
        })
      }
    }

    // Timeout máximo de seguridad
    setTimeout(terminar, 600)
  })
}

/**
 * Captura la vista actual del mapa (tiles, polígono trazado, marcadores y rosa de los vientos) en base64 para reportes PDF
 * @param configZoom Nivel de zoom deseado (17 por defecto, 18, 16, etc.) o 'actual' para capturar la vista de pantalla.
 */
async function capturarMapaBase64(configZoom: number | 'actual' = 17): Promise<string | null> {
  if (!mapContainer.value || !mapInstance) return null

  try {
    const width = mapContainer.value.clientWidth || 800
    const height = mapContainer.value.clientHeight || 480

    // Guardar vista previa interactiva del usuario
    const prevCenter = mapInstance.getCenter()
    const prevZoom = mapInstance.getZoom()

    let targetCenter = prevCenter
    let targetZoom = prevZoom

    if (configZoom === 'actual') {
      // Usar exactamente la perspectiva actual del mapa en pantalla
      targetCenter = prevCenter
      targetZoom = prevZoom
    } else if (typeof configZoom === 'number' && configZoom <= 5) {
      // Delta relativo (compatibilidad previa)
      targetCenter = (polygonLayer && typeof polygonLayer.getBounds === 'function')
        ? polygonLayer.getBounds().getCenter()
        : prevCenter
      targetZoom = Math.max(prevZoom - configZoom, 11)
    } else if (typeof configZoom === 'number') {
      // Zoom absoluto especificado (17 por defecto, 18, 16, etc.)
      if (polygonLayer && typeof polygonLayer.getBounds === 'function') {
        try {
          targetCenter = polygonLayer.getBounds().getCenter()
          let naturalFitZoom = 19
          if (typeof mapInstance.getBoundsZoom === 'function') {
            naturalFitZoom = mapInstance.getBoundsZoom(polygonLayer.getBounds(), false, [40, 40])
          }
          // Para predios muy extensos (e.g. ranchos rurales), no exceder el zoom natural que encuadra el polígono
          targetZoom = Math.min(configZoom, naturalFitZoom)
        } catch {
          targetCenter = prevCenter
          targetZoom = configZoom
        }
      } else {
        targetCenter = prevCenter
        targetZoom = configZoom
      }
    }

    const requiereCambioVista =
      targetZoom !== prevZoom ||
      Math.abs(targetCenter.lat - prevCenter.lat) > 0.000001 ||
      Math.abs(targetCenter.lng - prevCenter.lng) > 0.000001

    if (requiereCambioVista) {
      mapInstance.setView(targetCenter, targetZoom, { animate: false })
      await esperarCargaTiles()
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      if (requiereCambioVista) {
        mapInstance.setView(prevCenter, prevZoom, { animate: false })
      }
      return null
    }

    // Fondo cartográfico neutro
    ctx.fillStyle = '#e8ecef'
    ctx.fillRect(0, 0, width, height)

    // Dibujar tiles de Leaflet si están en el DOM
    const tileImages = mapContainer.value.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img')
    let tilesCopiados = 0

    tileImages.forEach((img) => {
      try {
        if (
          img.complete &&
          img.naturalWidth > 0 &&
          window.getComputedStyle(img).display !== 'none' &&
          window.getComputedStyle(img).opacity !== '0'
        ) {
          const rect = img.getBoundingClientRect()
          const containerRect = mapContainer.value!.getBoundingClientRect()
          const dx = rect.left - containerRect.left
          const dy = rect.top - containerRect.top
          ctx.drawImage(img, dx, dy, rect.width, rect.height)
          tilesCopiados++
        }
      } catch {
        // Silencioso si algún tile no permite export
      }
    })

    // Si no hubo tiles copiados o para complementar, trazar cuadrícula cartográfica tenue
    if (tilesCopiados === 0) {
      ctx.fillStyle = '#f4f6f8'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = '#d0d7de'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Dibujar otros predios de la misma escritura (subdivisiones) en gris tenue
    if (props.predios && props.predios.length > 0) {
      const otros = props.predios.filter(
        (p) => p.id && p.id !== props.predioActivoId && p.geometria?.coordinates?.[0]?.length >= 3
      )
      otros.forEach((p) => {
        const ring = p.geometria.coordinates[0]
        const pts = ring.map(([lng, lat]: [number, number]) =>
          mapInstance.latLngToContainerPoint([lat, lng])
        )
        if (pts.length >= 3) {
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y)
          }
          ctx.closePath()
          ctx.fillStyle = 'rgba(158, 158, 158, 0.25)'
          ctx.fill()
          ctx.strokeStyle = '#757575'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }
      })
    }

    // Dibujar el polígono delimitado del predio
    if (vertices.value && vertices.value.length >= 3) {
      const coords = [...vertices.value]
      const esCerrado =
        coords.length > 3 &&
        coords[0][0] === coords[coords.length - 1][0] &&
        coords[0][1] === coords[coords.length - 1][1]

      const puntos = coords.map(([lng, lat]) => {
        return mapInstance.latLngToContainerPoint([lat, lng])
      })

      ctx.beginPath()
      ctx.moveTo(puntos[0].x, puntos[0].y)
      for (let i = 1; i < puntos.length; i++) {
        ctx.lineTo(puntos[i].x, puntos[i].y)
      }
      ctx.closePath()

      // Relleno suave de polígono notarial
      ctx.fillStyle = 'rgba(169, 118, 46, 0.35)'
      ctx.fill()

      // Borde del polígono
      ctx.strokeStyle = '#1B3A5F'
      ctx.lineWidth = 3
      ctx.stroke()

      // Dibujar marcadores numerados en cada vértice
      const n = esCerrado ? puntos.length - 1 : puntos.length
      for (let i = 0; i < n; i++) {
        const pt = puntos[i]
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
        ctx.strokeStyle = '#1B3A5F'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.fillStyle = '#1B3A5F'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), pt.x, pt.y)
      }
    }

    // Rosa de los vientos (Indicador de Norte)
    const northX = width - 40
    const northY = 40
    ctx.beginPath()
    ctx.arc(northX, northY, 18, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()
    ctx.strokeStyle = '#1B3A5F'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#B23A34'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N ↑', northX, northY)

    // Obtener imagen en base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)

    // Restaurar vista interactiva previa del usuario
    if (requiereCambioVista && mapInstance) {
      mapInstance.setView(prevCenter, prevZoom, { animate: false })
    }

    return dataUrl
  } catch (e) {
    console.warn('Error al capturar mapa a canvas:', e)
    return null
  }
}

function redimensionarMapa() {
  nextTick(() => {
    if (mapInstance) {
      mapInstance.invalidateSize()
    }
  })
}

defineExpose({
  capturarMapaBase64,
  redimensionarMapa,
  obtenerUbicacionDispositivo,
  centrarEnPredio
})
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

:deep(.vertex-marker-icon) {
  background: transparent !important;
  border: none !important;
}
</style>
