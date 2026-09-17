<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { usePldStore } from '~/stores/pld'
import { useSupabaseClient } from '#imports'
import type { PldResultadoConsulta } from '~/types/pld'

export interface ComparecienteItem {
  id: string
  compareciente_id: string
  nombre: string
  tipo_persona: 'fisica' | 'moral' | string
  rfc?: string | null
  rol: string
  porcentaje_participacion?: number | null
}

const props = withDefaults(
  defineProps<{
    escrituraId: string
    comparecientes: ComparecienteItem[]
    esNotarioTitularOAdmin?: boolean
  }>(),
  {
    esNotarioTitularOAdmin: false
  }
)

const emit = defineEmits<{
  'abrir-screening': [compareciente: ComparecienteItem]
  'abrir-pep': [compareciente: ComparecienteItem]
  'refrescar': []
}>()

const pldStore = usePldStore()
const supabase = useSupabaseClient()

// Mapa de beneficiarios controladores por persona moral ID
const beneficiariosControladoresMap = ref<Record<string, any[]>>({})
const loadingBeneficiarios = ref(false)

async function cargarBeneficiariosControladores(): Promise<void> {
  const morales = props.comparecientes.filter(c => c.tipo_persona === 'moral')
  if (morales.length === 0) return

  loadingBeneficiarios.value = true
  try {
    const moralIds = morales.map(m => m.compareciente_id)
    const { data } = await supabase
      .from('compareciente_beneficiarios_controladores')
      .select('*')
      .in('persona_moral_id', moralIds)

    const mapa: Record<string, any[]> = {}
    for (const b of (data || [])) {
      if (!mapa[b.persona_moral_id]) {
        mapa[b.persona_moral_id] = []
      }
      mapa[b.persona_moral_id].push(b)
    }
    beneficiariosControladoresMap.value = mapa
  } catch (e) {
    // Si la tabla no existe o error, continuar
  } finally {
    loadingBeneficiarios.value = false
  }
}

onMounted(async () => {
  if (props.escrituraId) {
    await pldStore.cargarListasCatalogo()
    await pldStore.cargarConsultasEscritura(props.escrituraId)
    await pldStore.cargarDiligenciasPep(props.escrituraId)
    await cargarBeneficiariosControladores()
  }
})

watch(() => props.escrituraId, async (id) => {
  if (id) {
    await pldStore.cargarConsultasEscritura(id)
    await pldStore.cargarDiligenciasPep(id)
    await cargarBeneficiariosControladores()
  }
})

watch(() => props.comparecientes, () => {
  cargarBeneficiariosControladores()
}, { deep: true })

// Helper para obtener dictamen de una lista para un compareciente
function getResultadoLista(comparecienteId: string, listaCodigo: string): PldResultadoConsulta | 'pendiente' {
  const compConsultas = pldStore.consultasMap[comparecienteId]
  if (!compConsultas) return 'pendiente'
  if (compConsultas[listaCodigo]) return compConsultas[listaCodigo].resultado
  if (listaCodigo === 'onu_consolidada' && compConsultas['onu_cs']) return compConsultas['onu_cs'].resultado
  if (listaCodigo === 'onu_cs' && compConsultas['onu_consolidada']) return compConsultas['onu_consolidada'].resultado
  return 'pendiente'
}

// Helper para identificar resultado coincidencia
function isCoincidencia(res: string | null | undefined): boolean {
  return res === 'coincidencia_bloqueante' || res === 'coincidencia'
}

// Determinar el estatus global del compareciente
function getEstatusCompareciente(c: ComparecienteItem): {
  tipo: 'verificado' | 'pep_aprobado' | 'pep_pendiente' | 'bloqueado' | 'pendiente'
  label: string
  color: string
  icon: string
} {
  const codigos = ['lpb_uif', 'ofac_sdn', 'onu_consolidada', 'sat_69b']

  // 1. Revisar si hay coincidencia bloqueante
  const hayBloqueo = codigos.some(cod => {
    const res = getResultadoLista(c.compareciente_id, cod)
    return res === 'coincidencia_bloqueante' || (res as string) === 'coincidencia'
  })
  if (hayBloqueo) {
    return {
      tipo: 'bloqueado',
      label: 'Bloqueado',
      color: '#B23A34',
      icon: 'mdi-alert-octagon'
    }
  }

  // 2. Revisar si faltan consultas
  const faltanConsultas = codigos.some(cod => getResultadoLista(c.compareciente_id, cod) === 'pendiente')
  if (faltanConsultas) {
    return {
      tipo: 'pendiente',
      label: 'Pendiente',
      color: '#6B7280',
      icon: 'mdi-clock-outline'
    }
  }

  // 3. Revisar condición PEP
  const diligencia = pldStore.diligenciasPepMap[c.compareciente_id]
  if (diligencia && (diligencia.condicion_pep === 'pep_directo' || diligencia.condicion_pep === 'pep_asimilado')) {
    if (diligencia.aprobado) {
      return {
        tipo: 'pep_aprobado',
        label: 'PEP Aprobado',
        color: '#1B3A5F',
        icon: 'mdi-shield-check'
      }
    } else {
      return {
        tipo: 'pep_pendiente',
        label: 'PEP Pendiente',
        color: '#C98A2C',
        icon: 'mdi-alert-circle'
      }
    }
  }

  // 4. Todo completo y limpio
  return {
    tipo: 'verificado',
    label: 'Verificado',
    color: '#2F6F4E',
    icon: 'mdi-check-circle'
  }
}

function getIniciales(nombre: string): string {
  if (!nombre) return 'C'
  const partes = nombre.trim().split(/\s+/)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase()
}

async function refrescar(): Promise<void> {
  await pldStore.cargarConsultasEscritura(props.escrituraId)
  await pldStore.cargarDiligenciasPep(props.escrituraId)
  await cargarBeneficiariosControladores()
  emit('refrescar')
}
</script>

<template>
  <div class="bg-white rounded-lg border border-[#CBD2DC] shadow-sm overflow-hidden">
    <!-- Cabecera de la Sección -->
    <div class="p-5 border-b border-[#CBD2DC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <h3 class="text-base font-bold text-[#1B3A5F] font-sans">
            Otorgantes y Screening de Listas de Restricción
          </h3>
          <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-[#F0F2F4] text-gray-700 border border-[#CBD2DC]">
            {{ comparecientes.length }} comparecientes
          </span>
        </div>
        <p class="text-xs text-gray-500 mt-0.5">
          Cotejo cruzado automatizado contra listas negras internacionales, SAT 69-B y padrón de Personas Políticamente Expuestas (PEP).
        </p>
      </div>

      <div class="flex items-center gap-2 self-start sm:self-auto">
        <v-btn
          variant="outlined"
          density="comfortable"
          size="small"
          prepend-icon="mdi-refresh"
          class="text-xs text-gray-700"
          @click="refrescar"
        >
          Re-ejecutar Cotejo
        </v-btn>
      </div>
    </div>

    <!-- Tabla Notarial -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-[#F8FAFC] border-b border-[#CBD2DC] text-[11px] font-bold text-gray-600 uppercase tracking-wider font-mono">
            <th class="py-3 px-4">Compareciente / Razón Social</th>
            <th class="py-3 px-3">Estatus PLD</th>
            <th class="py-3 px-3 text-center">LPB (UIF)</th>
            <th class="py-3 px-3 text-center">OFAC (SDN)</th>
            <th class="py-3 px-3 text-center">ONU</th>
            <th class="py-3 px-3 text-center">SAT 69-B</th>
            <th class="py-3 px-4">Condición PEP / Beneficiario</th>
            <th class="py-3 px-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#CBD2DC] text-xs">
          <tr v-if="comparecientes.length === 0">
            <td colspan="8" class="text-center py-8 text-gray-400">
              No hay comparecientes vinculados a esta escritura.
            </td>
          </tr>

          <tr
            v-for="c in comparecientes"
            :key="c.id"
            class="hover:bg-slate-50 transition-colors"
            :class="{ 'bg-amber-50/20': pldStore.diligenciasPepMap[c.compareciente_id] }"
          >
            <!-- 1. Compareciente / Razón Social -->
            <td class="py-4 px-4">
              <div class="flex items-start gap-3">
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 border"
                  :class="c.tipo_persona === 'moral' ? 'bg-blue-50 border-blue-200 text-[#1B3A5F]' : 'bg-slate-100 border-slate-300 text-slate-700'"
                >
                  <v-icon v-if="c.tipo_persona === 'moral'" icon="mdi-domain" size="14" />
                  <span v-else>{{ getIniciales(c.nombre) }}</span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-gray-900 text-xs">{{ c.nombre }}</span>
                    <span
                      v-if="pldStore.diligenciasPepMap[c.compareciente_id]"
                      class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono"
                    >
                      PEP
                    </span>
                  </div>
                  <div class="text-[11px] font-mono text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <span>RFC: <strong class="text-gray-900">{{ c.rfc || 'Sin RFC' }}</strong></span>
                    <span>•</span>
                    <span>{{ c.tipo_persona === 'moral' ? 'Persona Moral' : 'Persona Física' }}</span>
                  </div>
                  <div class="text-[10px] text-gray-500 mt-0.5">
                    Rol: <span class="font-semibold text-gray-800">{{ c.rol }}</span>
                    <span v-if="c.porcentaje_participacion"> ({{ c.porcentaje_participacion }}%)</span>
                  </div>
                </div>
              </div>
            </td>

            <!-- 2. Estatus PLD -->
            <td class="py-4 px-3">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                :class="[
                  getEstatusCompareciente(c).tipo === 'verificado'
                    ? 'bg-emerald-50 text-[#2F6F4E] border-emerald-200'
                    : getEstatusCompareciente(c).tipo === 'pep_aprobado'
                    ? 'bg-blue-50 text-[#1B3A5F] border-blue-200'
                    : getEstatusCompareciente(c).tipo === 'pep_pendiente'
                    ? 'bg-amber-50 text-[#C98A2C] border-amber-200'
                    : getEstatusCompareciente(c).tipo === 'bloqueado'
                    ? 'bg-red-50 text-[#B23A34] border-red-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                ]"
              >
                <v-icon :icon="getEstatusCompareciente(c).icon" size="13" />
                {{ getEstatusCompareciente(c).label }}
              </span>
            </td>

            <!-- 3. LPB (UIF) -->
            <td class="py-4 px-3 text-center">
              <span
                class="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded border"
                :class="[
                  getResultadoLista(c.compareciente_id, 'lpb_uif') === 'limpio'
                    ? 'text-[#2F6F4E] bg-emerald-50 border-emerald-200'
                    : getResultadoLista(c.compareciente_id, 'lpb_uif') === 'falso_positivo'
                    ? 'text-[#C98A2C] bg-amber-50 border-amber-200'
                    : isCoincidencia(getResultadoLista(c.compareciente_id, 'lpb_uif'))
                    ? 'text-[#B23A34] bg-red-50 border-red-200 font-bold'
                    : 'text-gray-400 bg-gray-50 border-gray-200'
                ]"
              >
                {{ getResultadoLista(c.compareciente_id, 'lpb_uif') === 'limpio' ? 'Limpio' :
                   getResultadoLista(c.compareciente_id, 'lpb_uif') === 'falso_positivo' ? 'Homonimia' :
                   isCoincidencia(getResultadoLista(c.compareciente_id, 'lpb_uif')) ? 'Bloqueo' : 'Pendiente' }}
              </span>
            </td>

            <!-- 4. OFAC (SDN) -->
            <td class="py-4 px-3 text-center">
              <span
                class="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded border"
                :class="[
                  getResultadoLista(c.compareciente_id, 'ofac_sdn') === 'limpio'
                    ? 'text-[#2F6F4E] bg-emerald-50 border-emerald-200'
                    : getResultadoLista(c.compareciente_id, 'ofac_sdn') === 'falso_positivo'
                    ? 'text-[#C98A2C] bg-amber-50 border-amber-200'
                    : isCoincidencia(getResultadoLista(c.compareciente_id, 'ofac_sdn'))
                    ? 'text-[#B23A34] bg-red-50 border-red-200 font-bold'
                    : 'text-gray-400 bg-gray-50 border-gray-200'
                ]"
              >
                {{ getResultadoLista(c.compareciente_id, 'ofac_sdn') === 'limpio' ? 'Limpio' :
                   getResultadoLista(c.compareciente_id, 'ofac_sdn') === 'falso_positivo' ? 'Homonimia' :
                   isCoincidencia(getResultadoLista(c.compareciente_id, 'ofac_sdn')) ? 'Bloqueo' : 'Pendiente' }}
              </span>
            </td>

            <!-- 5. ONU -->
            <td class="py-4 px-3 text-center">
              <span
                class="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded border"
                :class="[
                  getResultadoLista(c.compareciente_id, 'onu_consolidada') === 'limpio'
                    ? 'text-[#2F6F4E] bg-emerald-50 border-emerald-200'
                    : getResultadoLista(c.compareciente_id, 'onu_consolidada') === 'falso_positivo'
                    ? 'text-[#C98A2C] bg-amber-50 border-amber-200'
                    : isCoincidencia(getResultadoLista(c.compareciente_id, 'onu_consolidada'))
                    ? 'text-[#B23A34] bg-red-50 border-red-200 font-bold'
                    : 'text-gray-400 bg-gray-50 border-gray-200'
                ]"
              >
                {{ getResultadoLista(c.compareciente_id, 'onu_consolidada') === 'limpio' ? 'Limpio' :
                   getResultadoLista(c.compareciente_id, 'onu_consolidada') === 'falso_positivo' ? 'Homonimia' :
                   isCoincidencia(getResultadoLista(c.compareciente_id, 'onu_consolidada')) ? 'Bloqueo' : 'Pendiente' }}
              </span>
            </td>

            <!-- 6. SAT 69-B -->
            <td class="py-4 px-3 text-center">
              <span
                class="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded border"
                :class="[
                  getResultadoLista(c.compareciente_id, 'sat_69b') === 'limpio'
                    ? 'text-[#2F6F4E] bg-emerald-50 border-emerald-200'
                    : getResultadoLista(c.compareciente_id, 'sat_69b') === 'falso_positivo'
                    ? 'text-[#C98A2C] bg-amber-50 border-amber-200'
                    : isCoincidencia(getResultadoLista(c.compareciente_id, 'sat_69b'))
                    ? 'text-[#B23A34] bg-red-50 border-red-200 font-bold'
                    : 'text-gray-400 bg-gray-50 border-gray-200'
                ]"
              >
                {{ getResultadoLista(c.compareciente_id, 'sat_69b') === 'limpio' ? 'Limpio' :
                   getResultadoLista(c.compareciente_id, 'sat_69b') === 'falso_positivo' ? 'Homonimia' :
                   isCoincidencia(getResultadoLista(c.compareciente_id, 'sat_69b')) ? 'Bloqueo' : 'Pendiente' }}
              </span>
            </td>

            <!-- 7. Condición PEP / Beneficiario Controlador -->
            <td class="py-4 px-4">
              <!-- Caso Persona Moral: Beneficiario Controlador -->
              <div v-if="c.tipo_persona === 'moral'">
                <div v-if="beneficiariosControladoresMap[c.compareciente_id]?.length > 0" class="space-y-0.5">
                  <div class="text-[10px] uppercase font-mono text-gray-500 font-semibold">Beneficiario Controlador:</div>
                  <div class="font-medium text-gray-900 flex items-center gap-1">
                    <v-icon icon="mdi-account-check" color="#2F6F4E" size="14" />
                    {{ beneficiariosControladoresMap[c.compareciente_id][0].nombres }} {{ beneficiariosControladoresMap[c.compareciente_id][0].primer_apellido }}
                  </div>
                  <div class="text-[10px] text-[#2F6F4E] font-mono">Acreditado al 100% de acciones</div>
                </div>
                <div v-else class="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 leading-tight">
                  <div class="font-semibold flex items-center gap-1">
                    <v-icon icon="mdi-alert" color="#C98A2C" size="13" />
                    Sin Beneficiario Controlador
                  </div>
                  <div class="text-[10px] text-gray-600 mt-0.5">CFF Art. 32-B Quáter</div>
                </div>
              </div>

              <!-- Caso Persona Física: PEP -->
              <div v-else>
                <div v-if="pldStore.diligenciasPepMap[c.compareciente_id]" class="space-y-1">
                  <div class="text-xs font-semibold text-amber-900 flex items-center gap-1">
                    <v-icon icon="mdi-shield-account" color="#A9762E" size="15" />
                    {{ pldStore.diligenciasPepMap[c.compareciente_id].condicion_pep === 'pep_directo' ? 'PEP Directo' : 'PEP Asimilado' }}
                  </div>
                  <div
                    v-if="pldStore.diligenciasPepMap[c.compareciente_id].aprobado"
                    class="text-[11px] text-gray-800 bg-white border border-amber-200 rounded px-2 py-0.5 leading-tight"
                  >
                    Diligencia Reforzada Autorizada
                    <div class="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1">
                      <v-icon icon="mdi-lock" color="#2F6F4E" size="12" />
                      Notario Titular
                    </div>
                  </div>
                  <div
                    v-else
                    class="text-[10px] text-amber-800 bg-amber-100/60 rounded px-1.5 py-0.5 font-medium flex items-center gap-1"
                  >
                    <v-icon icon="mdi-clock-outline" size="12" />
                    Pendiente de Autorización
                  </div>
                </div>
                <div v-else class="text-gray-500">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                    <span class="font-medium text-xs">No PEP</span>
                  </div>
                  <div class="text-[10px] text-gray-400 mt-0.5">Diligencia Ordinaria</div>
                </div>
              </div>
            </td>

            <!-- 8. Acciones -->
            <td class="py-4 px-4 text-right whitespace-nowrap">
              <div class="flex items-center justify-end gap-1.5">
                <v-btn
                  variant="outlined"
                  size="small"
                  density="comfortable"
                  color="primary"
                  class="text-xs font-medium"
                  prepend-icon="mdi-folder-open-outline"
                  @click="emit('abrir-screening', c)"
                >
                  Expediente PLD
                </v-btn>

                <v-btn
                  v-if="pldStore.diligenciasPepMap[c.compareciente_id] && !pldStore.diligenciasPepMap[c.compareciente_id].aprobado"
                  variant="flat"
                  size="small"
                  density="comfortable"
                  color="secondary"
                  class="text-xs font-medium"
                  prepend-icon="mdi-shield-check"
                  @click="emit('abrir-pep', c)"
                >
                  Autorizar PEP
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pie de Tabla -->
    <div class="px-5 py-3 bg-[#F8FAFC] border-t border-[#CBD2DC] flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
      <div class="flex items-center gap-2">
        <v-icon icon="mdi-database-check" color="#2F6F4E" size="15" />
        <span>Listas confrontadas con servidor de cotejo en tiempo real (Base de datos UIF / DOF / OFAC / ONU)</span>
      </div>
      <div class="font-mono text-[10px]">
        Conservación mínima de 10 años • LFPIORPI
      </div>
    </div>
  </div>
</template>
