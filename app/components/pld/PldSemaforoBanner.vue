<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    estatusGlobal: 'aprobado' | 'bloqueado' | 'pendiente'
    motivosBloqueo?: string[]
    fechaDictamen?: string | null
  }>(),
  {
    estatusGlobal: 'pendiente',
    motivosBloqueo: () => [],
    fechaDictamen: null
  }
)

const emit = defineEmits<{
  'descargar-ficha': []
}>()

const config = computed(() => {
  if (props.estatusGlobal === 'aprobado') {
    return {
      bgClass: 'bg-[#EBF5EE] border-[#2F6F4E] text-[#1E4D34]',
      badgeClass: 'text-[#2F6F4E] bg-white border-[#2F6F4E]/30',
      badgeText: 'Dictamen Automatizado',
      title: 'ESTADO GLOBAL: VERIFICADO — CUMPLIMIENTO SATISFECHO',
      description: 'Todos los otorgantes verificados, debida diligencia PEP autorizada y límites de efectivo respetados conforme a LFPIORPI Art. 17 y Art. 32.',
      icon: 'mdi-shield-check',
      iconBg: 'bg-[#2F6F4E] text-white',
      btnBorder: 'border-[#2F6F4E]/40 text-[#1E4D34] hover:bg-emerald-50'
    }
  }

  if (props.estatusGlobal === 'bloqueado') {
    return {
      bgClass: 'bg-red-50 border-[#B23A34] text-red-900',
      badgeClass: 'text-[#B23A34] bg-white border-[#B23A34]/30 font-bold',
      badgeText: 'Bloqueo Protocolar LFPIORPI',
      title: 'ESTADO GLOBAL: BLOQUEADO — IMPEDIMENTO DETECTADO',
      description: props.motivosBloqueo.length > 0
        ? props.motivosBloqueo.join(' • ')
        : 'Existen inconsistencias críticas, coincidencias en listas o exceso en efectivo que impiden protocolizar.',
      icon: 'mdi-alert-octagon',
      iconBg: 'bg-[#B23A34] text-white',
      btnBorder: 'border-red-300 text-red-900 hover:bg-red-100/50'
    }
  }

  return {
    bgClass: 'bg-[#FBF7F0] border-[#A9762E] text-[#5C3E14]',
    badgeClass: 'text-[#A9762E] bg-white border-[#A9762E]/30',
    badgeText: 'Dictamen en Trámite',
    title: 'ESTADO GLOBAL: PENDIENTE DE REVISIÓN NOTARIAL',
    description: 'Faltan cotejos en listas oficiales o autorizaciones de debida diligencia para liberar el instrumento.',
    icon: 'mdi-clock-alert-outline',
    iconBg: 'bg-[#A9762E] text-white',
    btnBorder: 'border-[#A9762E]/40 text-[#5C3E14] hover:bg-amber-100/50'
  }
})

function formatFecha(iso: string | null | undefined): string {
  if (!iso) {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date())
  }
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
</script>

<template>
  <section
    class="border rounded-lg p-5 shadow-sm relative overflow-hidden transition-all duration-300"
    :class="config.bgClass"
  >
    <div class="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row relative z-10">
      <div class="flex items-center gap-4">
        <!-- Icono redondo notarial -->
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-md"
          :class="config.iconBg"
        >
          <v-icon :icon="config.icon" size="28" color="white" />
        </div>

        <div class="space-y-1">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span
              class="text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border shadow-2xs"
              :class="config.badgeClass"
            >
              {{ config.badgeText }}
            </span>
            <h2 class="text-sm font-bold uppercase tracking-tight font-sans">
              {{ config.title }}
            </h2>
          </div>
          <p class="text-xs opacity-90 leading-relaxed max-w-3xl">
            {{ config.description }}
          </p>
        </div>
      </div>

      <!-- Acciones y sello de tiempo -->
      <div class="flex items-center gap-3 self-end md:self-auto shrink-0">
        <div class="text-right hidden sm:block">
          <div class="text-[10px] font-mono opacity-70">Fecha de dictamen notarial:</div>
          <div class="text-xs font-mono font-semibold">{{ formatFecha(fechaDictamen) }}</div>
        </div>
        <v-btn
          variant="outlined"
          size="small"
          density="comfortable"
          class="text-xs font-semibold bg-white shadow-2xs"
          :class="config.btnBorder"
          prepend-icon="mdi-file-certificate-outline"
          @click="emit('descargar-ficha')"
        >
          Ficha PLD
        </v-btn>
      </div>
    </div>
  </section>
</template>
