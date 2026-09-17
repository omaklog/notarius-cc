<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePldStore } from '~/stores/pld'
import { useAuthStore } from '~/stores/auth.store'
import type { PldCondicionPep, PldPepDiligencia } from '~/types/pld'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    escrituraId: string
    comparecienteId: string
    comparecienteNombre: string
    comparecienteRfc?: string | null
    esNotarioTitularOAdmin?: boolean
  }>(),
  {
    esNotarioTitularOAdmin: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  guardado: []
  aprobado: []
}>()

const pldStore = usePldStore()
const authStore = useAuthStore()

const condicionPep = ref<PldCondicionPep>('pep_directo')
const cargoPublico = ref('')
const dependencia = ref('')
const periodo = ref('')
const tipoVinculo = ref('')
const origenFondos = ref('')
const documentoSoportePath = ref<string | null>(null)
const documentoSoporteNombre = ref<string | null>(null)
const subiendoSoporte = ref(false)

const notasAprobacion = ref('')
const guardando = ref(false)
const aprobando = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

// Diligencia actual de este compareciente
const diligenciaActual = computed<PldPepDiligencia | undefined>(() => {
  return pldStore.diligenciasPepMap[props.comparecienteId]
})

// Verificar si el usuario actual es Notario Titular o Administrador
const puedeAprobar = computed(() => {
  if (props.esNotarioTitularOAdmin) return true
  const rol = authStore.profile?.rolNombre?.toLowerCase() || ''
  return rol.includes('notario') || rol.includes('titular') || rol.includes('admin')
})

function cargarDatos(): void {
  errorMessage.value = null
  successMessage.value = null
  const d = diligenciaActual.value
  if (d) {
    condicionPep.value = d.condicion_pep
    cargoPublico.value = d.cargo_publico || ''
    dependencia.value = d.dependencia || ''
    periodo.value = d.periodo || ''
    tipoVinculo.value = d.tipo_vinculo || ''
    origenFondos.value = d.origen_fondos_declarado || ''
    documentoSoportePath.value = d.documento_soporte_path || null
    documentoSoporteNombre.value = d.documento_soporte_path ? 'soporte_patrimonial.pdf' : null
    notasAprobacion.value = d.notas_aprobacion || ''
  } else {
    condicionPep.value = 'pep_directo'
    cargoPublico.value = ''
    dependencia.value = ''
    periodo.value = ''
    tipoVinculo.value = ''
    origenFondos.value = ''
    documentoSoportePath.value = null
    documentoSoporteNombre.value = null
    notasAprobacion.value = ''
  }
}

watch(() => props.modelValue, (val) => {
  if (val) cargarDatos()
})

watch(() => props.comparecienteId, () => {
  if (props.modelValue) cargarDatos()
})

// Subir documento de soporte patrimonial
async function onSoporteSelected(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  subiendoSoporte.value = true
  errorMessage.value = null
  try {
    const res = await pldStore.subirEvidencia(file, props.escrituraId, props.comparecienteId, 'pep_soporte')
    documentoSoportePath.value = res.storagePath
    documentoSoporteNombre.value = res.fileName
  } catch (err: any) {
    errorMessage.value = `Error al subir documento de soporte: ${err.message}`
  } finally {
    subiendoSoporte.value = false
    target.value = ''
  }
}

// Guardar cuestionario de procedencia de fondos
async function guardarCuestionario(): Promise<void> {
  if (!cargoPublico.value.trim() || !dependencia.value.trim()) {
    errorMessage.value = 'Debe indicar el cargo público y la dependencia oficial del compareciente PEP'
    return
  }
  if (!origenFondos.value.trim()) {
    errorMessage.value = 'Debe detallar el origen y procedencia declarada de los recursos'
    return
  }

  guardando.value = true
  errorMessage.value = null
  try {
    await pldStore.registrarDiligenciaPep({
      escrituraId: props.escrituraId,
      comparecienteId: props.comparecienteId,
      condicionPep: condicionPep.value === 'pep_asimilado' ? 'pep_asimilado' : 'pep_directo',
      cargoPublico: cargoPublico.value,
      dependencia: dependencia.value,
      periodo: periodo.value || undefined,
      tipoVinculo: tipoVinculo.value || undefined,
      origenFondosDeclarado: origenFondos.value,
      documentoSoportePath: documentoSoportePath.value || undefined
    })

    // Reevaluar escritura en backend
    await pldStore.evaluarEscritura(props.escrituraId)
    successMessage.value = 'Cuestionario de debida diligencia registrado con éxito.'
    emit('guardado')
  } catch (err: any) {
    errorMessage.value = `Error al registrar cuestionario PEP: ${err.message}`
  } finally {
    guardando.value = false
  }
}

// Autorizar formalmente la excepción por el Notario Titular
async function autorizarExcepcion(): Promise<void> {
  // Asegurar que el cuestionario esté guardado primero
  if (!diligenciaActual.value?.id) {
    await guardarCuestionario()
  }

  const dId = diligenciaActual.value?.id
  if (!dId) {
    errorMessage.value = 'Debe registrar primero el cuestionario de procedencia de fondos antes de autorizar.'
    return
  }

  aprobando.value = true
  errorMessage.value = null
  try {
    await pldStore.aprobarDiligenciaPep(
      dId,
      props.comparecienteId,
      notasAprobacion.value || 'Diligencia reforzada analizada y autorizada conforme al marco notarial LFPIORPI.'
    )

    // Reevaluar escritura en backend
    await pldStore.evaluarEscritura(props.escrituraId)
    successMessage.value = 'Debida diligencia autorizada por Notario Titular. Compareciente habilitado.'
    emit('aprobado')
    emit('guardado')
    setTimeout(() => {
      emit('update:modelValue', false)
    }, 1200)
  } catch (err: any) {
    errorMessage.value = `Error al autorizar debida diligencia: ${err.message}`
  } finally {
    aprobando.value = false
  }
}

function cerrar(): void {
  emit('update:modelValue', false)
}

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="820px"
    persistent
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="overflow-hidden rounded-xl border border-[#CBD2DC] shadow-2xl">
      <!-- Cabecera Institucional Azul Marino (#1B3A5F) -->
      <div class="bg-[#1B3A5F] text-white px-6 py-4 border-b border-[#12283F] flex items-start justify-between">
        <div class="flex items-start gap-3.5 pr-4">
          <div class="w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
            <v-icon icon="mdi-shield-account" color="#F4E8D6" size="24" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-semibold tracking-tight text-white leading-tight font-sans">
                Debida Diligencia Reforzada — Persona Políticamente Expuesta (PEP)
              </h2>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#A9762E] text-white border border-[#A9762E]/60">
                LFPIORPI Art. 18 Fracc. VI
              </span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs font-mono text-[#CBD2DC] flex-wrap">
              <span class="inline-flex items-center gap-1 text-white font-medium">
                <v-icon icon="mdi-account" color="#A9762E" size="14" />
                {{ comparecienteNombre }}
              </span>
              <span>•</span>
              <span class="text-[#F4E8D6]">RFC: <strong class="text-white">{{ comparecienteRfc || 'Sin RFC' }}</strong></span>
              <span>•</span>
              <span class="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px]">
                {{ condicionPep === 'pep_directo' ? 'PEP Directo' : 'PEP Asimilado' }}
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
        <!-- Mensajes de feedback -->
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

        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          density="compact"
          closable
          class="mb-3"
          @click:close="successMessage = null"
        >
          {{ successMessage }}
        </v-alert>

        <!-- Banner Explicativo de Diligencia Reforzada -->
        <div class="bg-[#FBF7F0] border-l-4 border-[#A9762E] p-3.5 rounded-r-lg text-xs text-[#5C3E14] leading-relaxed">
          <div class="flex items-start gap-2.5">
            <v-icon icon="mdi-information" color="#A9762E" size="20" class="shrink-0 mt-0.5" />
            <div>
              <strong>Régimen Notarial de Debida Diligencia Reforzada:</strong>
              Conforme a los estándares del GAFI y las Disposiciones de Carácter General de la LFPIORPI, la intervención de un compareciente PEP exige identificar con precisión el origen de los recursos y obtener la aprobación deliberada del <strong>Notario Titular</strong> para protocolizar el instrumento.
            </div>
          </div>
        </div>

        <!-- 1. Cuestionario de Datos del Cargo y Vínculo -->
        <div class="bg-[#F8FAFC] border border-[#E2E6EC] rounded-lg p-4 space-y-4">
          <div class="flex items-center gap-2">
            <v-icon icon="mdi-card-account-details-outline" color="#1B3A5F" size="18" />
            <h3 class="text-xs font-bold text-[#1B3A5F] uppercase tracking-wider font-mono">
              1. Identificación del Cargo o Calidad de PEP
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Condición PEP:
              </label>
              <select
                v-model="condicionPep"
                class="w-full text-xs font-medium bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              >
                <option value="pep_directo">PEP Directo (Funcionario público en funciones o último año)</option>
                <option value="pep_asimilado">PEP Asimilado (Cónyuge, pariente consanguíneo o socio)</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Cargo Público Relevante: *
              </label>
              <input
                v-model="cargoPublico"
                type="text"
                placeholder="Ej. Subsecretario de Administración, Director General..."
                class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              >
            </div>

            <div>
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Dependencia o Entidad Pública: *
              </label>
              <input
                v-model="dependencia"
                type="text"
                placeholder="Ej. Secretaría de Hacienda, Gobierno del Estado..."
                class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              >
            </div>

            <div>
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Periodo de Gestión / Ejercicio:
              </label>
              <input
                v-model="periodo"
                type="text"
                placeholder="Ej. 2024 - 2026, Concluido Oct/2025..."
                class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              >
            </div>

            <div v-if="condicionPep === 'pep_asimilado'" class="sm:col-span-2">
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Tipo de Vínculo con el Funcionario PEP:
              </label>
              <input
                v-model="tipoVinculo"
                type="text"
                placeholder="Ej. Cónyuge, Hijo(a), Hermano(a), Apoderado general..."
                class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              >
            </div>
          </div>
        </div>

        <!-- 2. Origen y Procedencia de los Fondos Declarado -->
        <div class="bg-[#F8FAFC] border border-[#E2E6EC] rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <v-icon icon="mdi-cash-check" color="#1B3A5F" size="18" />
              <h3 class="text-xs font-bold text-[#1B3A5F] uppercase tracking-wider font-mono">
                2. Declaración de Origen y Procedencia de Fondos
              </h3>
            </div>
            <span class="text-[10px] font-mono text-gray-400">Requisito UIF</span>
          </div>

          <div>
            <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
              Descripción del origen lícito de los recursos aplicados a la operación: *
            </label>
            <textarea
              v-model="origenFondos"
              rows="3"
              placeholder="Detalle si los fondos provienen de sueldos y salarios, ahorros bancarios, créditos hipotecarios o liquidación patrimonial..."
              class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2.5 focus:border-[#1B3A5F] focus:outline-none leading-relaxed"
            />
          </div>

          <!-- Documento de Soporte Patrimonial -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-200">
            <div>
              <div class="text-[11px] font-mono font-semibold text-gray-700">Comprobante de Soporte Patrimonial:</div>
              <div class="text-[10px] text-gray-500">Declaración patrimonial, estado de cuenta o constancia de percepciones.</div>
            </div>

            <div v-if="documentoSoportePath" class="flex items-center gap-2 bg-white border border-[#CBD2DC] rounded px-2.5 py-1 text-xs">
              <v-icon icon="mdi-file-pdf-box" color="#B23A34" size="18" />
              <span class="font-mono text-[11px] truncate max-w-[150px]">{{ documentoSoporteNombre || 'soporte.pdf' }}</span>
              <label class="cursor-pointer text-gray-400 hover:text-[#1B3A5F] ml-1 p-0.5">
                <input type="file" accept="image/*,application/pdf" class="hidden" @change="onSoporteSelected">
                <v-icon icon="mdi-sync" size="14" />
              </label>
            </div>

            <label
              v-else
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B3A5F] bg-white hover:bg-slate-50 border border-dashed border-[#1B3A5F]/40 rounded-md cursor-pointer transition-all shrink-0"
            >
              <input type="file" accept="image/*,application/pdf" class="hidden" @change="onSoporteSelected">
              <v-icon :icon="subiendoSoporte ? 'mdi-loading' : 'mdi-upload'" size="15" />
              <span>{{ subiendoSoporte ? 'Subiendo...' : 'Adjuntar Documento de Soporte' }}</span>
            </label>
          </div>
        </div>

        <!-- 3. Resolución y Sello Notarial -->
        <div
          class="rounded-lg p-4 space-y-3 border"
          :class="diligenciaActual?.aprobado ? 'bg-emerald-50/50 border-[#B7E1C8]' : 'bg-amber-50/30 border-amber-200'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <v-icon
                :icon="diligenciaActual?.aprobado ? 'mdi-seal-variant' : 'mdi-lock-clock'"
                :color="diligenciaActual?.aprobado ? '#2F6F4E' : '#A9762E'"
                size="18"
              />
              <h3 class="text-xs font-bold uppercase tracking-wider font-mono" :class="diligenciaActual?.aprobado ? 'text-[#2F6F4E]' : 'text-amber-900'">
                3. Dictamen y Autorización Notarial de Excepción
              </h3>
            </div>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border"
              :class="diligenciaActual?.aprobado ? 'bg-emerald-100 text-[#2F6F4E] border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'"
            >
              {{ diligenciaActual?.aprobado ? 'AUTORIZADO ✓' : 'PENDIENTE DE AUTORIZACIÓN' }}
            </span>
          </div>

          <!-- Caso Ya Aprobado -->
          <div v-if="diligenciaActual?.aprobado" class="space-y-1.5 text-xs text-gray-800 bg-white p-3 rounded border border-emerald-200">
            <div class="flex items-center gap-2 font-semibold text-[#2F6F4E]">
              <v-icon icon="mdi-check-decagram" size="16" color="#2F6F4E" />
              Diligencia reforzada debidamente autorizada por Notario Titular
            </div>
            <p class="text-gray-600 text-[11px] leading-relaxed">
              {{ diligenciaActual.notas_aprobacion || 'Sin notas adicionales.' }}
            </p>
            <div class="text-[10px] font-mono text-gray-400 pt-1 flex items-center gap-2">
              <span>Sello Notarial: {{ formatFecha(diligenciaActual.aprobado_at) }}</span>
              <span>•</span>
              <span>Auditoría inmutable registrada</span>
            </div>
          </div>

          <!-- Caso Pendiente de Aprobación -->
          <div v-else class="space-y-3">
            <div v-if="!puedeAprobar" class="p-2.5 rounded bg-amber-100 text-amber-900 text-xs flex items-start gap-2">
              <v-icon icon="mdi-account-lock" size="18" color="#A9762E" class="shrink-0 mt-0.5" />
              <div>
                <strong>Restricción de Perfil Notarial:</strong>
                Usted no cuenta con el rol de <em>Notario Titular</em> o <em>Administrador</em>. Puede completar y guardar el cuestionario de fondos, pero la autorización de la excepción debe ser firmada por el Notario Titular.
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-mono text-gray-700 font-semibold mb-1">
                Notas y Razonamiento de Autorización del Notario Titular:
              </label>
              <textarea
                v-model="notasAprobacion"
                :disabled="!puedeAprobar"
                rows="2"
                placeholder="Indique las consideraciones que justifican admitir la operación del compareciente PEP..."
                class="w-full text-xs bg-white border border-[#CBD2DC] rounded-md p-2 focus:border-[#1B3A5F] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Pie del Modal -->
      <div class="bg-[#F8FAFC] border-t border-[#E2E6EC] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Aviso Legal NOM-151 -->
        <div class="flex items-center gap-2 text-xs text-gray-500 max-w-sm text-center sm:text-left">
          <v-icon icon="mdi-shield-check-outline" color="#A9762E" size="18" class="shrink-0" />
          <p class="leading-tight text-[11px]">
            La aprobación de PEP queda sellada de forma inalterable para inspecciones UIF/SAT.
          </p>
        </div>

        <!-- Botones de Acción -->
        <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            class="text-xs font-semibold"
            @click="cerrar"
          >
            Cerrar
          </v-btn>

          <v-btn
            variant="outlined"
            color="primary"
            class="text-xs font-semibold"
            :loading="guardando"
            @click="guardarCuestionario"
          >
            Guardar Cuestionario
          </v-btn>

          <v-btn
            v-if="!diligenciaActual?.aprobado"
            color="secondary"
            class="text-xs font-semibold"
            :loading="aprobando"
            :disabled="!puedeAprobar"
            @click="autorizarExcepcion"
          >
            <template #prepend>
              <v-icon icon="mdi-shield-lock-outline" size="18" />
            </template>
            Autorizar Diligencia PEP
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>
