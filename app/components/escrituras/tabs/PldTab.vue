<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSupabaseClient } from '#imports'
import { usePldStore } from '~/stores/pld'
import { useAuthStore } from '~/stores/auth.store'
import PldSemaforoBanner from '~/components/pld/PldSemaforoBanner.vue'
import PldUmbralesCard from '~/components/pld/PldUmbralesCard.vue'
import PldComparecientesTable, { type ComparecienteItem } from '~/components/pld/PldComparecientesTable.vue'
import PldScreeningModal from '~/components/pld/PldScreeningModal.vue'
import PldPepApprovalModal from '~/components/pld/PldPepApprovalModal.vue'

const props = defineProps<{
  escrituraId: string
  actoJuridicoId?: string
  instrumentoNumero?: number | string
}>()

const emit = defineEmits<{
  'cambio-cumplimiento': []
}>()

const supabase = useSupabaseClient()
const pldStore = usePldStore()
const authStore = useAuthStore()

const loading = ref(true)
const comparecientes = ref<ComparecienteItem[]>([])
const montoOperacion = ref<number>(0)
const montoEfectivo = ref<number>(0)
const fechaCelebracion = ref<string | null>(null)
const esActividadVulnerable = ref<boolean>(true)
const fraccionArt17 = ref<string>('Fracc. V (Inmuebles)')

// Modales
const showScreeningModal = ref(false)
const showPepModal = ref(false)
const selectedCompareciente = ref<ComparecienteItem | null>(null)

// Permiso de notario o admin
const esNotarioTitularOAdmin = computed(() => {
  const rol = authStore.profile?.rolNombre?.toLowerCase() || ''
  return rol.includes('notario') || rol.includes('titular') || rol.includes('admin')
})

async function cargarDatos(): Promise<void> {
  loading.value = true
  try {
    // 1. Cargar datos de la escritura y su acto jurídico
    const { data: escData } = await supabase
      .from('escrituras')
      .select('id, instrumento, fecha_celebracion, acto_juridico_id, actos_juridicos(nombre, tipo, es_actividad_vulnerable, fraccion_art17)')
      .eq('id', props.escrituraId)
      .single()

    if (escData) {
      fechaCelebracion.value = escData.fecha_celebracion
      const acto = escData.actos_juridicos as any
      if (acto) {
        esActividadVulnerable.value = acto.es_actividad_vulnerable ?? true
        fraccionArt17.value = acto.fraccion_art17 ? `Fracc. ${acto.fraccion_art17}` : 'Fracc. V (Inmuebles)'
      }
    }

    // 2. Cargar comparecientes de la escritura
    const { data: compData } = await supabase
      .from('escritura_comparecientes')
      .select(`
        id,
        compareciente_id,
        rol_id,
        porcentaje_participacion,
        comparecientes (
          id,
          nombre,
          tipo_persona,
          rfc
        ),
        roles_compareciente (
          id,
          nombre
        )
      `)
      .eq('escritura_id', props.escrituraId)

    if (compData) {
      comparecientes.value = compData.map((item: any) => ({
        id: item.id,
        compareciente_id: item.compareciente_id,
        nombre: item.comparecientes?.nombre || 'Sin nombre',
        tipo_persona: item.comparecientes?.tipo_persona || 'fisica',
        rfc: item.comparecientes?.rfc || null,
        rol: item.roles_compareciente?.nombre || 'Compareciente',
        porcentaje_participacion: item.porcentaje_participacion ?? null
      }))
    }

    // 3. Cargar datos PLD en el store
    await pldStore.cargarListasCatalogo()
    await pldStore.cargarConsultasEscritura(props.escrituraId)
    await pldStore.cargarDiligenciasPep(props.escrituraId)
    const evaluacion = await pldStore.cargarEvaluacionEscritura(props.escrituraId)

    if (evaluacion) {
      montoOperacion.value = Number(evaluacion.monto_operacion) || 0
      montoEfectivo.value = Number(evaluacion.monto_efectivo) || 0
    } else {
      // Si no existe evaluación, disparar cálculo inicial
      const nuevaEval = await pldStore.evaluarEscritura(props.escrituraId)
      if (nuevaEval) {
        montoOperacion.value = Number(nuevaEval.monto_operacion) || 0
        montoEfectivo.value = Number(nuevaEval.monto_efectivo) || 0
      }
    }
  } catch (err) {
    // Manejo de error
  } finally {
    loading.value = false
  }
}

onMounted(cargarDatos)

watch(() => props.escrituraId, () => {
  cargarDatos()
})

// Abrir modal de screening
function abrirScreening(c: ComparecienteItem): void {
  selectedCompareciente.value = c
  showScreeningModal.value = true
}

// Abrir modal de aprobación PEP
function abrirPep(c: ComparecienteItem): void {
  selectedCompareciente.value = c
  showPepModal.value = true
}

// Handler post guardado en cualquiera de los modales
async function onActualizado(): Promise<void> {
  await pldStore.cargarConsultasEscritura(props.escrituraId)
  await pldStore.cargarDiligenciasPep(props.escrituraId)
  await pldStore.evaluarEscritura(props.escrituraId)
  emit('cambio-cumplimiento')
}

// Descargar ficha resumen notarial
function descargarFicha(): void {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="loading" class="py-12 text-center text-gray-500">
      <v-progress-circular indeterminate color="primary" class="mb-2" />
      <div class="text-xs font-mono">Cargando expediente de cumplimiento PLD...</div>
    </div>

    <div v-else class="space-y-6">
      <!-- 1. Banner Superior de Semáforo Global -->
      <PldSemaforoBanner
        :estatus-global="pldStore.evaluacionActual?.estatus_global || 'pendiente'"
        :motivos-bloqueo="pldStore.evaluacionActual?.motivos_bloqueo || []"
        :fecha-dictamen="pldStore.evaluacionActual?.evaluado_at"
        @descargar-ficha="descargarFicha"
      />

      <!-- 2. Tarjetas de Análisis de Umbrales y Restricción de Efectivo -->
      <PldUmbralesCard
        :escritura-id="escrituraId"
        :monto-operacion="montoOperacion"
        :monto-efectivo="montoEfectivo"
        :es-actividad-vulnerable="esActividadVulnerable"
        :fraccion-art17="fraccionArt17"
        :valor-uma="pldStore.evaluacionActual?.uma_valor_aplicado || 113.14"
        :fecha-celebracion="fechaCelebracion"
        @update:monto-efectivo="montoEfectivo = $event; onActualizado()"
        @guardado="onActualizado"
      />

      <!-- 3. Tabla de Otorgantes y Screening -->
      <PldComparecientesTable
        :escritura-id="escrituraId"
        :comparecientes="comparecientes"
        :es-notario-titular-o-admin="esNotarioTitularOAdmin"
        @abrir-screening="abrirScreening"
        @abrir-pep="abrirPep"
        @refrescar="cargarDatos"
      />

      <!-- 4. Banner Institucional de Conservación Legal -->
      <div class="bg-[#F8FAFC] border border-[#CBD2DC] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-600">
        <div class="flex items-start gap-2.5">
          <v-icon icon="mdi-scale-balance" color="#1B3A5F" size="20" class="shrink-0 mt-0.5" />
          <div class="leading-relaxed">
            <strong class="text-gray-900">Marco de Fe Pública y Cumplimiento Normativo:</strong>
            Todas las consultas en listas de restricción, comprobantes y resoluciones de debida diligencia se integran al apéndice digital del instrumento y gozan de presunción de autenticidad bajo la Ley del Notariado y el Art. 18 de la LFPIORPI.
          </div>
        </div>
        <div class="font-mono text-[10px] text-gray-400 shrink-0">
          NOM-151 • Notaría 42
        </div>
      </div>
    </div>

    <!-- Modales Auxiliares -->
    <PldScreeningModal
      v-if="selectedCompareciente"
      v-model="showScreeningModal"
      :escritura-id="escrituraId"
      :compareciente-id="selectedCompareciente.compareciente_id"
      :compareciente-nombre="selectedCompareciente.nombre"
      :compareciente-rfc="selectedCompareciente.rfc"
      :compareciente-rol="selectedCompareciente.rol"
      :compareciente-tipo-persona="selectedCompareciente.tipo_persona"
      @guardado="onActualizado"
    />

    <PldPepApprovalModal
      v-if="selectedCompareciente"
      v-model="showPepModal"
      :escritura-id="escrituraId"
      :compareciente-id="selectedCompareciente.compareciente_id"
      :compareciente-nombre="selectedCompareciente.nombre"
      :compareciente-rfc="selectedCompareciente.rfc"
      :es-notario-titular-o-admin="esNotarioTitularOAdmin"
      @guardado="onActualizado"
      @aprobado="onActualizado"
    />
  </div>
</template>
