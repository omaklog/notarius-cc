<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePldCalculations } from '~/composables/usePldCalculations'
import { usePldStore } from '~/stores/pld'

const props = withDefaults(
  defineProps<{
    escrituraId: string
    montoOperacion?: number | null
    montoEfectivo?: number | null
    esActividadVulnerable?: boolean
    fraccionArt17?: string | null
    umbralIdentificacionUma?: number | null
    umbralAvisoUma?: number | null
    limiteEfectivoUma?: number | null
    valorUma?: number | null
    fechaCelebracion?: string | null
  }>(),
  {
    montoOperacion: 0,
    montoEfectivo: 0,
    esActividadVulnerable: true,
    fraccionArt17: 'Fracc. V (Inmuebles)',
    umbralIdentificacionUma: 8025,
    umbralAvisoUma: 16050,
    limiteEfectivoUma: 8025,
    valorUma: 113.14,
    fechaCelebracion: null
  }
)

const emit = defineEmits<{
  'update:montoEfectivo': [monto: number]
  guardado: []
}>()

const pldStore = usePldStore()

// Estado local para edición de monto en efectivo
const editandoEfectivo = ref(false)
const inputMontoEfectivo = ref<number>(props.montoEfectivo || 0)
const guardandoEfectivo = ref(false)

watch(() => props.montoEfectivo, (val) => {
  inputMontoEfectivo.value = val || 0
})

// Uso del composable de cálculo reactivo
const calc = usePldCalculations({
  montoOperacion: () => props.montoOperacion,
  montoEfectivo: () => inputMontoEfectivo.value,
  valorUma: () => props.valorUma,
  esActividadVulnerable: () => props.esActividadVulnerable,
  umbralIdentificacionUma: () => props.umbralIdentificacionUma,
  umbralAvisoUma: () => props.umbralAvisoUma,
  limiteEfectivoUma: () => props.limiteEfectivoUma
})

// Porcentaje de uso del límite de efectivo
const porcentajeEfectivo = computed(() => {
  if (!calc.limiteEfectivoMoneda.value || calc.limiteEfectivoMoneda.value <= 0) return 0
  const pct = (calc.montoEf.value / calc.limiteEfectivoMoneda.value) * 100
  return Math.min(Math.round(pct * 100) / 100, 100)
})

// Margen disponible en efectivo (o exceso si rebasado)
const margenDisponible = computed(() => {
  const diff = calc.limiteEfectivoMoneda.value - calc.montoEf.value
  return diff
})

const anioUma = computed(() => {
  if (props.fechaCelebracion) {
    const y = new Date(props.fechaCelebracion).getFullYear()
    if (!isNaN(y)) return y
  }
  return new Date().getFullYear()
})

async function guardarCambioEfectivo(): Promise<void> {
  guardandoEfectivo.value = true
  try {
    const nuevoMonto = Number(inputMontoEfectivo.value) || 0
    await pldStore.guardarMontoEfectivo(props.escrituraId, nuevoMonto)
    emit('update:montoEfectivo', nuevoMonto)
    emit('guardado')
    editandoEfectivo.value = false
  } catch (err) {
    // Error capturado en store
  } finally {
    guardandoEfectivo.value = false
  }
}

function cancelarEdicion(): void {
  inputMontoEfectivo.value = props.montoEfectivo || 0
  editandoEfectivo.value = false
}
</script>

<template>
  <section class="grid grid-cols-1 md:grid-cols-3 gap-5">
    <!-- Tarjeta 1: Cálculo Económico LFPIORPI -->
    <div class="bg-white rounded-lg border border-[#CBD2DC] p-5 shadow-sm flex flex-col justify-between">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">
            Base Económica
          </span>
          <v-icon icon="mdi-calculator-variant-outline" color="#1B3A5F" size="18" />
        </div>
        <h3 class="text-sm font-bold text-gray-900">Cálculo Económico LFPIORPI</h3>

        <div class="space-y-2 pt-1">
          <div class="flex justify-between items-baseline text-xs pb-1 border-b border-gray-100">
            <span class="text-gray-500">Monto de Operación:</span>
            <span class="font-semibold text-gray-900 text-sm font-mono">
              {{ calc.formatearMoneda(calc.montoOp.value) }}
            </span>
          </div>
          <div class="flex justify-between items-center text-xs pb-1 border-b border-gray-100">
            <span class="text-gray-500">UMA Vigente ({{ anioUma }}):</span>
            <span class="font-mono text-gray-600">
              {{ calc.formatearMoneda(calc.uma.value) }}/día
            </span>
          </div>
          <div class="flex justify-between items-baseline text-xs pt-1">
            <span class="text-gray-500 font-medium">Equivalente Total:</span>
            <span class="font-mono font-bold text-[#1B3A5F] text-base">
              {{ calc.formatearUma(calc.vecesUma.value) }}
            </span>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-500 flex items-center gap-1.5">
        <v-icon icon="mdi-information-outline" size="14" color="grey" />
        <span>
          {{ esActividadVulnerable ? `Actividad vulnerable: Art. 17 ${fraccionArt17}` : 'Actividad NO vulnerable (Screening universal aplicable)' }}
        </span>
      </div>
    </div>

    <!-- Tarjeta 2: Dictamen de Avisos SAT / UIF -->
    <div class="bg-white rounded-lg border border-[#CBD2DC] p-5 shadow-sm flex flex-col justify-between">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">
            Fiscalización SAT / UIF
          </span>
          <v-icon icon="mdi-alert-decagram-outline" color="#A9762E" size="18" />
        </div>
        <h3 class="text-sm font-bold text-gray-900">Dictamen de Avisos SAT / UIF</h3>

        <div class="space-y-2 pt-1 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">Umbral Identificación ({{ umbralIdentificacionUma }} UMA):</span>
            <span
              class="font-mono font-semibold flex items-center gap-1"
              :class="calc.requiereIdentificacion.value ? 'text-[#2F6F4E]' : 'text-gray-500'"
            >
              <v-icon
                :icon="calc.requiereIdentificacion.value ? 'mdi-check-circle' : 'mdi-minus-circle-outline'"
                size="14"
              />
              {{ calc.requiereIdentificacion.value ? 'Rebasado' : 'No Rebasado' }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-500">Umbral Aviso Mensual ({{ umbralAvisoUma }} UMA):</span>
            <span
              class="font-mono font-semibold flex items-center gap-1"
              :class="calc.requiereAvisoSat.value ? 'text-[#A9762E]' : 'text-gray-500'"
            >
              <v-icon
                :icon="calc.requiereAvisoSat.value ? 'mdi-alert' : 'mdi-minus-circle-outline'"
                size="14"
              />
              {{ calc.requiereAvisoSat.value ? 'Rebasado' : 'No Rebasado' }}
            </span>
          </div>

          <!-- Badge Bronce Institucional -->
          <div
            v-if="calc.requiereAvisoSat.value"
            class="mt-2 bg-[#FBF7F0] border border-[#A9762E]/40 rounded p-2 text-[11px] text-[#5C3E14] leading-tight flex items-start gap-1.5"
          >
            <v-icon icon="mdi-calendar-clock" color="#A9762E" size="16" class="shrink-0 mt-0.5" />
            <span>
              <strong>Sujeto a Aviso Ordinario SAT:</strong> a más tardar el día 17 del mes siguiente a la protocolización.
            </span>
          </div>
          <div
            v-else
            class="mt-2 bg-[#F8FAFC] border border-gray-200 rounded p-2 text-[11px] text-gray-600 leading-tight flex items-start gap-1.5"
          >
            <v-icon icon="mdi-check" color="#2F6F4E" size="16" class="shrink-0 mt-0.5" />
            <span>Operación exenta de aviso ordinario mensual al SAT.</span>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-500 flex justify-between items-center">
        <span>Portal SPPLD</span>
        <span class="font-mono font-medium text-[#A9762E]">
          {{ calc.requiereAvisoSat.value ? 'Aviso Tipo 05' : 'Sin Aviso' }}
        </span>
      </div>
    </div>

    <!-- Tarjeta 3: Control de Efectivo (Art. 32 LFPIORPI) -->
    <div
      class="rounded-lg border p-5 shadow-sm flex flex-col justify-between transition-colors"
      :class="calc.excedeLimiteEfectivo.value ? 'border-red-400 bg-red-50/20' : 'bg-white border-[#CBD2DC]'"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-500 font-mono">
            Art. 32 LFPIORPI
          </span>
          <v-icon
            :icon="calc.excedeLimiteEfectivo.value ? 'mdi-alert-octagon' : 'mdi-cash-multiple'"
            :color="calc.excedeLimiteEfectivo.value ? '#B23A34' : '#2F6F4E'"
            size="18"
          />
        </div>

        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900">Control de Efectivo (Restricción)</h3>
          <button
            v-if="!editandoEfectivo"
            type="button"
            class="text-[11px] text-[#1B3A5F] hover:underline font-mono flex items-center gap-0.5"
            @click="editandoEfectivo = true"
          >
            <v-icon icon="mdi-pencil-outline" size="13" />
            Editar
          </button>
        </div>

        <!-- Modo Edición Rápida -->
        <div v-if="editandoEfectivo" class="space-y-2 pt-1">
          <label class="block text-[11px] font-mono text-gray-600">
            Monto liquidado en Efectivo (MXN):
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model.number="inputMontoEfectivo"
              type="number"
              min="0"
              step="1000"
              class="w-full text-xs font-mono p-1.5 border border-[#1B3A5F] rounded focus:outline-none"
            >
            <v-btn
              size="x-small"
              color="primary"
              :loading="guardandoEfectivo"
              @click="guardarCambioEfectivo"
            >
              Guardar
            </v-btn>
            <v-btn
              size="x-small"
              variant="text"
              @click="cancelarEdicion"
            >
              ✕
            </v-btn>
          </div>
        </div>

        <!-- Modo Lectura -->
        <div v-else class="space-y-2 pt-1 text-xs">
          <div class="flex justify-between items-baseline">
            <span class="text-gray-500">Monto liquidado en Efectivo:</span>
            <span class="font-mono font-semibold text-gray-900 text-sm">
              {{ calc.formatearMoneda(calc.montoEf.value) }}
            </span>
          </div>
          <div class="text-[11px] text-gray-500 font-mono text-right">
            ({{ calc.formatearUma(calc.vecesUmaEfectivo.value) }} liquidado)
          </div>

          <div class="flex justify-between items-baseline pt-1 border-t border-gray-100">
            <span class="text-gray-500">Límite Legal Máximo ({{ limiteEfectivoUma }} UMA):</span>
            <span class="font-mono font-medium text-gray-700">
              {{ calc.formatearMoneda(calc.limiteEfectivoMoneda.value) }}
            </span>
          </div>

          <!-- Barra de Uso de Efectivo -->
          <div class="pt-1">
            <div class="flex justify-between text-[10px] text-gray-500 mb-1 font-mono">
              <span>Margen utilizado: {{ porcentajeEfectivo }}%</span>
              <span
                :class="calc.excedeLimiteEfectivo.value ? 'text-red-700 font-bold' : 'text-[#2F6F4E] font-semibold'"
              >
                {{ calc.excedeLimiteEfectivo.value
                  ? `Exceso: ${calc.formatearMoneda(Math.abs(margenDisponible))}`
                  : `Disponible: ${calc.formatearMoneda(margenDisponible)}`
                }}
              </span>
            </div>
            <div class="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :class="calc.excedeLimiteEfectivo.value ? 'bg-[#B23A34]' : 'bg-[#2F6F4E]'"
                :style="{ width: `${porcentajeEfectivo}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Badge de Estatus de Efectivo -->
      <div class="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
        <span
          v-if="calc.excedeLimiteEfectivo.value"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300"
        >
          <v-icon icon="mdi-alert-octagon" size="15" color="error" />
          Excede Tope de Efectivo (Bloqueante)
        </span>
        <span
          v-else
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#2F6F4E] border border-emerald-200"
        >
          <v-icon icon="mdi-check-circle" size="15" color="#2F6F4E" />
          Cumple Límite de Efectivo
        </span>
        <span class="text-[10px] font-mono text-gray-400">
          Art. 32 Fracc. I
        </span>
      </div>
    </div>
  </section>
</template>
