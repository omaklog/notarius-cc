<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePldStore } from '~/stores/pld'
import type { PldResultadoConsulta, PldCondicionPep, PldListaCatalogo } from '~/types/pld'

const props = defineProps<{
  modelValue: boolean
  escrituraId: string
  comparecienteId: string
  comparecienteNombre: string
  comparecienteRfc?: string | null
  comparecienteRol?: string | null
  comparecienteTipoPersona?: 'fisica' | 'moral' | string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  guardado: []
}>()

const pldStore = usePldStore()

// Estado reactivo por lista (código de lista -> estado)
interface ListaScreeningState {
  resultado: PldResultadoConsulta
  evidenciaStoragePath: string
  evidenciaNombreOriginal: string
  evidenciaSize: number
  evidenciaHash: string | null
  justificacionDescarte: string
  documentoContrastePath: string
  documentoContrasteNombre: string
  subiendoEvidencia: boolean
  subiendoContraste: boolean
}

const estadoListas = ref<Record<string, ListaScreeningState>>({})
const condicionPep = ref<PldCondicionPep>('no_pep')
const notasGenerales = ref('')
const guardando = ref(false)
const errorMessage = ref<string | null>(null)
const importandoPrevio = ref(false)

// Configuración estática / metadatos de las 4 listas
const LISTAS_CONFIG: Record<string, {
  orden: number
  nombre: string
  jurisdiccion: string
  badgeClass: string
  url: string
  urlLabel: string
}> = {
  lpb_uif: {
    orden: 1,
    nombre: 'Lista de Personas Bloqueadas (LPB — UIF / SHCP)',
    jurisdiccion: 'Federal',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    url: 'https://uif.gob.mx',
    urlLabel: 'Abrir portal oficial UIF'
  },
  ofac_sdn: {
    orden: 2,
    nombre: 'OFAC — Specially Designated Nationals List (SDN)',
    jurisdiccion: 'EE.UU.',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    url: 'https://sanctionssearch.ofac.treas.gov',
    urlLabel: 'Abrir buscador OFAC Treasury'
  },
  onu_consolidada: {
    orden: 3,
    nombre: 'ONU — Lista Consolidada del Consejo de Seguridad',
    jurisdiccion: 'Internacional',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    url: 'https://scsanctions.un.org/consolidated/',
    urlLabel: 'Abrir portal ONU Sanctions'
  },
  onu_cs: {
    orden: 3,
    nombre: 'ONU — Lista Consolidada del Consejo de Seguridad',
    jurisdiccion: 'Internacional',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    url: 'https://scsanctions.un.org/consolidated/',
    urlLabel: 'Abrir portal ONU Sanctions'
  },
  sat_69b: {
    orden: 4,
    nombre: 'SAT — Listado Definitivo Artículo 69-B (EFOS)',
    jurisdiccion: 'Fiscal',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    url: 'https://sat.gob.mx',
    urlLabel: 'Abrir portal SAT'
  }
}

// Lista ordenada de códigos de lista
const codigosListas = computed(() => {
  if (pldStore.listasCatalogo.length > 0) {
    return pldStore.listasCatalogo.map(l => l.codigo)
  }
  return ['lpb_uif', 'ofac_sdn', 'onu_consolidada', 'sat_69b']
})

// Inicializar el estado del modal cuando se abre o cambia de compareciente
async function inicializar(): Promise<void> {
  if (!props.modelValue || !props.comparecienteId) return
  errorMessage.value = null

  // Cargar catálogo si no existe
  if (pldStore.listasCatalogo.length === 0) {
    await pldStore.cargarListasCatalogo()
  }

  // Buscar si tiene screening previo vigente
  await pldStore.buscarScreeningPrevio(props.comparecienteId, props.escrituraId)

  // Cargar consultas existentes de este compareciente en la escritura
  const consultasCompareciente = pldStore.consultasMap[props.comparecienteId] || {}
  const diligenciaPep = pldStore.diligenciasPepMap[props.comparecienteId]

  if (diligenciaPep) {
    condicionPep.value = diligenciaPep.condicion_pep
  } else {
    condicionPep.value = 'no_pep'
  }

  const nuevoEstado: Record<string, ListaScreeningState> = {}

  for (const codigo of codigosListas.value) {
    const consulta = consultasCompareciente[codigo]
    nuevoEstado[codigo] = {
      resultado: consulta?.resultado || 'limpio',
      evidenciaStoragePath: consulta?.evidencia_storage_path || '',
      evidenciaNombreOriginal: consulta?.evidencia_nombre_original || '',
      evidenciaSize: consulta?.evidencia_size || 0,
      evidenciaHash: consulta?.evidencia_hash || null,
      justificacionDescarte: consulta?.justificacion_descarte || '',
      documentoContrastePath: consulta?.documento_contraste_path || '',
      documentoContrasteNombre: consulta?.documento_contraste_path ? 'comprobante_contraste.pdf' : '',
      subiendoEvidencia: false,
      subiendoContraste: false
    }
  }

  estadoListas.value = nuevoEstado
}

watch(() => props.modelValue, (val) => {
  if (val) inicializar()
})

watch(() => props.comparecienteId, () => {
  if (props.modelValue) inicializar()
})

const screeningPrevio = computed(() => {
  return pldStore.screeningPrevioMap[props.comparecienteId] || null
})

// Subir evidencia principal (captura de pantalla)
async function onFileSelected(codigoLista: string, event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const item = estadoListas.value[codigoLista]
  if (!item) return

  item.subiendoEvidencia = true
  errorMessage.value = null
  try {
    const res = await pldStore.subirEvidencia(file, props.escrituraId, props.comparecienteId, codigoLista)
    item.evidenciaStoragePath = res.storagePath
    item.evidenciaNombreOriginal = res.fileName
    item.evidenciaSize = res.size
    item.evidenciaHash = res.hash
  } catch (err: any) {
    errorMessage.value = `Error al subir captura de ${codigoLista}: ${err.message}`
  } finally {
    item.subiendoEvidencia = false
    target.value = ''
  }
}

// Subir documento de contraste para homonimia
async function onContrasteSelected(codigoLista: string, event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const item = estadoListas.value[codigoLista]
  if (!item) return

  item.subiendoContraste = true
  errorMessage.value = null
  try {
    const res = await pldStore.subirEvidencia(file, props.escrituraId, props.comparecienteId, `${codigoLista}_contraste`)
    item.documentoContrastePath = res.storagePath
    item.documentoContrasteNombre = res.fileName
  } catch (err: any) {
    errorMessage.value = `Error al subir documento de contraste: ${err.message}`
  } finally {
    item.subiendoContraste = false
    target.value = ''
  }
}

// Importar screening vigente
async function importarDictamenPrevio(): Promise<void> {
  if (!screeningPrevio.value) return
  importandoPrevio.value = true
  errorMessage.value = null
  try {
    await pldStore.importarScreeningPrevio(
      props.escrituraId,
      props.comparecienteId,
      screeningPrevio.value.escritura_id
    )
    emit('guardado')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMessage.value = `Error al importar dictamen previo: ${err.message}`
  } finally {
    importandoPrevio.value = false
  }
}

// Validar y guardar screening completo
async function guardarScreening(): Promise<void> {
  errorMessage.value = null

  // 1. Validar que las 4 listas tengan evidencia
  for (const codigo of codigosListas.value) {
    const item = estadoListas.value[codigo]
    if (!item?.evidenciaStoragePath) {
      errorMessage.value = `Es obligatorio adjuntar la captura de pantalla para: ${LISTAS_CONFIG[codigo]?.nombre || codigo}`
      return
    }

    // 2. Si es falso positivo, exigir justificación escrita y documento de contraste
    if (item.resultado === 'falso_positivo') {
      if (!item.justificacionDescarte.trim()) {
        errorMessage.value = `Debe ingresar la justificación analítica de descarte por homonimia para ${LISTAS_CONFIG[codigo]?.nombre || codigo}`
        return
      }
      if (!item.documentoContrastePath) {
        errorMessage.value = `Debe adjuntar el documento oficial de contraste (CURP, RFC o identificación) para descartar homonimia en ${LISTAS_CONFIG[codigo]?.nombre || codigo}`
        return
      }
    }
  }

  guardando.value = true
  try {
    // Buscar lista IDs en el catálogo
    for (const codigo of codigosListas.value) {
      const item = estadoListas.value[codigo]
      const listaCat = pldStore.listasCatalogo.find(l => l.codigo === codigo)
      const listaId = listaCat?.id || codigo

      await pldStore.guardarConsulta({
        escrituraId: props.escrituraId,
        comparecienteId: props.comparecienteId,
        listaId,
        resultado: item.resultado,
        evidenciaStoragePath: item.evidenciaStoragePath,
        evidenciaNombreOriginal: item.evidenciaNombreOriginal,
        evidenciaHash: item.evidenciaHash,
        evidenciaSize: item.evidenciaSize,
        justificacionDescarte: item.resultado === 'falso_positivo' ? item.justificacionDescarte : null,
        documentoContrastePath: item.resultado === 'falso_positivo' ? item.documentoContrastePath : null,
        notas: notasGenerales.value || null,
        metodo: 'manual'
      })
    }

    // Manejar condición PEP
    if (condicionPep.value !== 'no_pep') {
      await pldStore.registrarDiligenciaPep({
        escrituraId: props.escrituraId,
        comparecienteId: props.comparecienteId,
        condicionPep: condicionPep.value,
        cargoPublico: 'Cargo público declarado',
        dependencia: 'Dependencia oficial',
        origenFondosDeclarado: 'Ingresos por actividad profesional o cargo público'
      })
    }

    emit('guardado')
    emit('update:modelValue', false)
  } catch (err: any) {
    errorMessage.value = `Error al guardar screening PLD: ${err.message}`
  } finally {
    guardando.value = false
  }
}

function cerrar(): void {
  emit('update:modelValue', false)
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 KB'
  return `${(bytes / 1024).toFixed(0)} KB`
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="880px"
    persistent
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="overflow-hidden rounded-xl border border-[#CBD2DC] shadow-2xl">
      <!-- Cabecera Institucional Azul Marino (#1B3A5F) -->
      <div class="bg-[#1B3A5F] text-white px-6 py-4 border-b border-[#12283F] flex items-start justify-between">
        <div class="flex items-start gap-3.5 pr-4">
          <div class="w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
            <v-icon icon="mdi-shield-check" color="#F4E8D6" size="24" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-semibold tracking-tight text-white leading-tight font-sans">
                Cotejo en Listas Oficiales de Restricción — Prevención de Lavado de Dinero
              </h2>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#A9762E] text-white border border-[#A9762E]/60">
                LFPIORPI Art. 18
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs font-mono text-[#CBD2DC] flex-wrap">
              <span class="inline-flex items-center gap-1 text-white font-medium">
                <v-icon icon="mdi-account" color="#A9762E" size="14" />
                {{ comparecienteNombre }}
              </span>
              <span>•</span>
              <span class="text-[#F4E8D6]">RFC: <strong class="text-white">{{ comparecienteRfc || 'Sin RFC' }}</strong></span>
              <span v-if="comparecienteRol">•</span>
              <span v-if="comparecienteRol" class="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-white/90 text-[11px]">
                Rol: {{ comparecienteRol }}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0"
          title="Cerrar modal"
          @click="cerrar"
        >
          <v-icon icon="mdi-close" size="20" />
        </button>
      </div>

      <!-- Cuerpo con Scroll -->
      <v-card-text class="pa-6 space-y-5 bg-white max-h-[75vh]">
        <!-- Mensaje de Error General -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-3"
          @click:close="errorMessage = null"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- 1. Alerta de Importación Asistida (< 90 días) -->
        <div
          v-if="screeningPrevio"
          class="bg-[#FBF7F0] border-l-4 border-[#A9762E] border-y border-r border-[#E8DFC9] rounded-lg p-3.5 shadow-sm"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-start gap-2.5">
              <v-icon icon="mdi-history" color="#A9762E" size="22" class="shrink-0 mt-0.5" />
              <div class="text-xs text-[#5C3E14] leading-relaxed">
                <span class="font-semibold text-[#3D290D] block sm:inline">Cotejo previo vigente detectado:</span>
                Este compareciente fue consultado y verificado en el
                <span class="font-mono font-medium text-[#1B3A5F]">Instrumento {{ screeningPrevio.instrumento_numero }}</span>
                hace {{ screeningPrevio.dias_antiguedad }} días
                <span class="inline-block bg-[#EEDCC0] text-[#4A320F] px-1.5 py-0.5 rounded font-mono font-medium text-[11px] ml-0.5">
                  Vigente por {{ screeningPrevio.dias_restantes }} días más
                </span>.
              </div>
            </div>
            <button
              type="button"
              :disabled="importandoPrevio"
              class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1B3A5F] bg-white hover:bg-[#F4E8D6]/60 border border-[#A9762E]/70 rounded-md shadow-2xs hover:shadow transition-all shrink-0 cursor-pointer"
              @click="importarDictamenPrevio"
            >
              <v-icon icon="mdi-link-variant" color="#A9762E" size="16" />
              <span>{{ importandoPrevio ? 'Importando...' : 'Importar dictamen y evidencias previas' }}</span>
            </button>
          </div>
        </div>

        <!-- 2. Checklist de las 4 Listas Oficiales -->
        <div>
          <div class="flex items-center justify-between mb-2.5">
            <div class="flex items-center gap-2">
              <v-icon icon="mdi-format-list-checks" color="#1B3A5F" size="18" />
              <h3 class="text-xs font-bold text-[#1B3A5F] uppercase tracking-wider font-mono">
                Listas Oficiales Obligatorias (4 Fuentes de Confronta)
              </h3>
            </div>
            <span class="text-[11px] text-gray-500 font-mono">
              Art. 15 y 18 Reglas de Carácter General UIF
            </span>
          </div>

          <div class="space-y-3">
            <div
              v-for="codigo in codigosListas"
              :key="codigo"
              class="border rounded-lg p-3 transition-colors shadow-2xs"
              :class="[
                estadoListas[codigo]?.resultado === 'coincidencia'
                  ? 'border-red-400 bg-red-50/20'
                  : estadoListas[codigo]?.resultado === 'falso_positivo'
                  ? 'border-amber-400 bg-amber-50/20'
                  : 'border-[#B7E1C8] bg-[#FBFDFB]'
              ]"
            >
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <!-- Identificador de Lista y enlace externo -->
                <div class="flex items-start gap-2.5 min-w-[280px]">
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 border"
                    :class="[
                      estadoListas[codigo]?.resultado === 'coincidencia'
                        ? 'bg-red-100 text-red-700 border-red-300'
                        : 'bg-[#EBF5EE] text-[#2F6F4E] border-[#B7E1C8]'
                    ]"
                  >
                    {{ LISTAS_CONFIG[codigo]?.orden }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="text-xs font-bold text-[#1C222B]">
                        {{ LISTAS_CONFIG[codigo]?.nombre }}
                      </h4>
                      <span
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border"
                        :class="LISTAS_CONFIG[codigo]?.badgeClass"
                      >
                        {{ LISTAS_CONFIG[codigo]?.jurisdiccion }}
                      </span>
                    </div>
                    <a
                      :href="LISTAS_CONFIG[codigo]?.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 text-[11px] text-[#1B3A5F] hover:text-[#A9762E] hover:underline font-medium mt-0.5"
                    >
                      <span>{{ LISTAS_CONFIG[codigo]?.urlLabel }}</span>
                      <v-icon icon="mdi-open-in-new" size="12" />
                    </a>
                  </div>
                </div>

                <!-- Controles: Selector de Dictamen + Evidencia -->
                <div class="flex flex-wrap items-center gap-3 justify-end flex-1">
                  <!-- Selector de Dictamen -->
                  <div class="flex items-center gap-1.5">
                    <label class="text-[11px] font-mono text-gray-500">Dictamen:</label>
                    <div class="relative">
                      <select
                        v-if="estadoListas[codigo]"
                        v-model="estadoListas[codigo].resultado"
                        class="text-xs font-semibold bg-white border rounded-md pl-2.5 pr-7 py-1 shadow-2xs focus:outline-none appearance-none cursor-pointer"
                        :class="[
                          estadoListas[codigo].resultado === 'coincidencia_bloqueante' || estadoListas[codigo].resultado === 'coincidencia'
                            ? 'border-red-500 text-red-600'
                            : estadoListas[codigo].resultado === 'falso_positivo'
                            ? 'border-amber-500 text-amber-700'
                            : 'border-[#2F6F4E] text-[#2F6F4E]'
                        ]"
                      >
                        <option value="limpio">Limpio ✓</option>
                        <option value="coincidencia_bloqueante">
                          {{ codigo === 'sat_69b' ? 'Definitivo 69-B (Bloqueante)' : 'Coincidencia Bloqueante' }}
                        </option>
                        <option value="falso_positivo">Falso Positivo (Homonimia)</option>
                      </select>
                      <v-icon
                        icon="mdi-chevron-down"
                        size="16"
                        class="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500"
                      />
                    </div>
                  </div>

                  <!-- Evidencia Adjunta o Botón de Carga -->
                  <div v-if="estadoListas[codigo]?.evidenciaStoragePath" class="flex items-center gap-2 bg-white border border-[#CBD2DC] rounded-md px-2.5 py-1 text-xs">
                    <div class="w-6 h-6 rounded bg-[#F0F2F4] border border-[#CBD2DC] flex items-center justify-center text-[#1B3A5F] overflow-hidden shrink-0">
                      <v-icon icon="mdi-file-image-outline" size="15" />
                    </div>
                    <div class="leading-tight">
                      <div class="font-mono text-[11px] text-[#1C222B] font-medium truncate max-w-[150px]" :title="estadoListas[codigo]?.evidenciaNombreOriginal">
                        {{ estadoListas[codigo]?.evidenciaNombreOriginal || 'captura.png' }}
                      </div>
                      <div class="text-[10px] text-gray-400 font-mono">
                        {{ formatSize(estadoListas[codigo]?.evidenciaSize || 0) }}
                      </div>
                    </div>
                    <!-- Input oculto para reemplazar archivo -->
                    <label class="cursor-pointer text-gray-400 hover:text-[#1B3A5F] p-0.5 ml-1" title="Reemplazar archivo">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        class="hidden"
                        @change="onFileSelected(codigo, $event)"
                      >
                      <v-icon icon="mdi-sync" size="16" />
                    </label>
                  </div>

                  <!-- Botón para adjuntar cuando está pendiente -->
                  <label
                    v-else
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#1B3A5F] bg-white hover:bg-slate-50 border border-dashed border-[#1B3A5F]/40 rounded-md cursor-pointer shadow-2xs hover:border-[#1B3A5F] transition-all"
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      class="hidden"
                      @change="onFileSelected(codigo, $event)"
                    >
                    <v-icon :icon="estadoListas[codigo]?.subiendoEvidencia ? 'mdi-loading' : 'mdi-upload'" size="15" />
                    <span>{{ estadoListas[codigo]?.subiendoEvidencia ? 'Subiendo...' : 'Adjuntar Captura (Obligatoria)' }}</span>
                  </label>
                </div>
              </div>

              <!-- Alerta Bloqueante si hay Coincidencia -->
              <div
                v-if="estadoListas[codigo]?.resultado === 'coincidencia_bloqueante' || estadoListas[codigo]?.resultado === 'coincidencia'"
                class="mt-2.5 p-2 rounded bg-red-100/70 border border-red-300 text-xs text-red-800 flex items-start gap-2"
              >
                <v-icon icon="mdi-alert-octagon" color="error" size="18" class="shrink-0 mt-0.5" />
                <div>
                  <strong>¡ALERTA BLOQUEANTE NOTARIAL!</strong>
                  Se detectó coincidencia directa en {{ LISTAS_CONFIG[codigo]?.nombre }}. Conforme al Art. 18 de la LFPIORPI y Constitución §5/§6, este instrumento quedará bloqueado de forma estricta para protocolización hasta su aclaración legal.
                </div>
              </div>

              <!-- Sección Homonimia / Falso Positivo -->
              <div
                v-if="estadoListas[codigo]?.resultado === 'falso_positivo'"
                class="mt-2.5 pt-2.5 border-t border-amber-200 bg-amber-50/40 p-2.5 rounded-md space-y-2 text-xs"
              >
                <div class="flex items-center gap-1.5 text-amber-900 font-semibold font-mono text-[11px]">
                  <v-icon icon="mdi-file-check-outline" color="#A9762E" size="16" />
                  DESCARTE ANALÍTICO DE HOMONIMIA (REQUISITOS OBLIGATORIOS)
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <!-- Justificación Escrita -->
                  <div>
                    <label class="block text-[10px] font-mono text-gray-600 mb-1">
                      Justificación de descarte (CURP, segundo apellido, fecha nacimiento distinta): *
                    </label>
                    <textarea
                      v-model="estadoListas[codigo].justificacionDescarte"
                      rows="2"
                      placeholder="Indique los elementos documentales que descartan que se trate de la misma persona..."
                      class="w-full text-xs p-2 bg-white border border-amber-300 rounded focus:border-[#A9762E] focus:outline-none"
                    />
                  </div>

                  <!-- Documento de Contraste Adjunto -->
                  <div>
                    <label class="block text-[10px] font-mono text-gray-600 mb-1">
                      Comprobante oficial de contraste (CURP, INE, Constancia Situación Fiscal): *
                    </label>

                    <div v-if="estadoListas[codigo]?.documentoContrastePath" class="flex items-center gap-2 bg-white border border-amber-300 rounded p-1.5 text-xs">
                      <v-icon icon="mdi-file-document-check" color="#2F6F4E" size="16" />
                      <span class="truncate max-w-[160px] font-mono text-[11px]">{{ estadoListas[codigo]?.documentoContrasteNombre || 'comprobante_contraste.pdf' }}</span>
                      <label class="cursor-pointer text-gray-400 hover:text-[#1B3A5F] ml-auto p-0.5">
                        <input type="file" accept="image/*,application/pdf" class="hidden" @change="onContrasteSelected(codigo, $event)">
                        <v-icon icon="mdi-sync" size="14" />
                      </label>
                    </div>

                    <label
                      v-else
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-900 bg-white hover:bg-amber-100/50 border border-dashed border-amber-400 rounded cursor-pointer transition-all"
                    >
                      <input type="file" accept="image/*,application/pdf" class="hidden" @change="onContrasteSelected(codigo, $event)">
                      <v-icon :icon="estadoListas[codigo]?.subiendoContraste ? 'mdi-loading' : 'mdi-upload'" size="15" />
                      <span>{{ estadoListas[codigo]?.subiendoContraste ? 'Subiendo...' : 'Adjuntar Documento Oficial de Contraste' }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Calificación de Condición PEP -->
        <div class="bg-[#F8FAFC] border border-[#E2E6EC] rounded-lg p-3.5 space-y-2.5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <v-icon icon="mdi-bank" color="#1B3A5F" size="18" />
                <h4 class="text-xs font-bold text-[#1B3A5F] uppercase tracking-wider font-mono">
                  Calificación de Condición PEP (Persona Políticamente Expuesta)
                </h4>
              </div>
              <p class="text-xs text-gray-700 mt-1">
                ¿El compareciente desempeña o desempeñó cargo público relevante en el último año o es cónyuge/familiar hasta 2° grado?
              </p>
            </div>
            <span class="text-[10px] font-mono text-gray-400 bg-white px-2 py-0.5 rounded border border-[#E2E6EC] shrink-0">
              LFPIORPI Art. 18 Fracc. VI
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <label
              class="relative flex items-center p-2.5 rounded-lg border cursor-pointer shadow-2xs transition-all"
              :class="condicionPep === 'no_pep' ? 'border-2 border-[#1B3A5F] bg-white' : 'border-[#CBD2DC] bg-white hover:border-[#A9762E]'"
            >
              <input v-model="condicionPep" type="radio" value="no_pep" class="w-4 h-4 text-[#1B3A5F]">
              <div class="ml-2.5">
                <span class="block text-xs font-bold text-[#1B3A5F]">No PEP (Ordinario)</span>
                <span class="block text-[11px] text-gray-500">Debida diligencia estándar</span>
              </div>
            </label>

            <label
              class="relative flex items-center p-2.5 rounded-lg border cursor-pointer shadow-2xs transition-all"
              :class="condicionPep === 'pep_directo' ? 'border-2 border-[#1B3A5F] bg-white' : 'border-[#CBD2DC] bg-white hover:border-[#A9762E]'"
            >
              <input v-model="condicionPep" type="radio" value="pep_directo" class="w-4 h-4 text-[#1B3A5F]">
              <div class="ml-2.5">
                <span class="block text-xs font-semibold text-gray-800">PEP Directo</span>
                <span class="block text-[11px] text-gray-500">Requiere diligencia reforzada</span>
              </div>
            </label>

            <label
              class="relative flex items-center p-2.5 rounded-lg border cursor-pointer shadow-2xs transition-all"
              :class="condicionPep === 'pep_asimilado' ? 'border-2 border-[#1B3A5F] bg-white' : 'border-[#CBD2DC] bg-white hover:border-[#A9762E]'"
            >
              <input v-model="condicionPep" type="radio" value="pep_asimilado" class="w-4 h-4 text-[#1B3A5F]">
              <div class="ml-2.5">
                <span class="block text-xs font-semibold text-gray-800">PEP Asimilado</span>
                <span class="block text-[11px] text-gray-500">Familiar / Vínculo patrimonial</span>
              </div>
            </label>
          </div>
        </div>

        <!-- 4. Justificación y Notas del Oficial de Cumplimiento -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label for="pld_justificacion" class="text-xs font-bold text-[#1B3A5F] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <v-icon icon="mdi-note-edit-outline" color="#1B3A5F" size="16" />
              Justificación y Notas del Oficial de Cumplimiento / Dictaminador
            </label>
            <span class="text-[11px] font-mono text-gray-400">Asentado en bitácora protocolar</span>
          </div>
          <textarea
            id="pld_justificacion"
            v-model="notasGenerales"
            rows="2"
            class="w-full text-xs font-sans text-gray-800 bg-[#F8FAFC] border border-[#CBD2DC] rounded-lg p-3 focus:bg-white focus:border-[#1B3A5F] focus:outline-none transition-all leading-relaxed shadow-inner"
            placeholder="Ingrese precisiones del cotejo, homonimias descartadas o acuerdos de debida diligencia..."
          />
        </div>
      </v-card-text>

      <!-- Pie del Modal -->
      <div class="bg-[#F8FAFC] border-t border-[#E2E6EC] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Leyenda NOM-151 -->
        <div class="flex items-center gap-2 text-xs text-gray-500 max-w-md text-center sm:text-left">
          <v-icon icon="mdi-certificate-outline" color="#A9762E" size="20" class="shrink-0" />
          <p class="leading-tight text-[11px]">
            La captura de pantalla y metadatos de consulta quedan archivados con
            <strong class="text-gray-700 font-semibold">sello NOM-151</strong> por un plazo mínimo de 10 años conforme a la LFPIORPI.
          </p>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-xs font-semibold"
            @click="cerrar"
          >
            Cancelar
          </v-btn>

          <v-btn
            color="primary"
            class="text-xs font-semibold"
            :loading="guardando"
            @click="guardarScreening"
          >
            <template #prepend>
              <v-icon icon="mdi-shield-check" color="#F4E8D6" size="18" />
            </template>
            Certificar y Guardar Screening PLD
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>
