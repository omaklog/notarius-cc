<template>
  <v-card
    variant="outlined"
    class="rounded-lg mb-4 pa-4 border"
    :class="bannerBgClass"
  >
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3">
      <div class="d-flex align-start ga-3">
        <v-avatar :color="kpis?.semaforo_urgencia || 'amber-darken-3'" size="44" rounded="lg" variant="tonal">
          <v-icon size="26">mdi-calendar-alert</v-icon>
        </v-avatar>
        <div>
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-subtitle-1 font-weight-bold" :class="bannerTextoClass">
              Vencimiento Legal Inteligente — {{ mesNombre }} {{ kpis?.periodo_anio }}
            </span>
            <v-chip
              size="small"
              :color="kpis?.semaforo_urgencia || 'amber-darken-3'"
              variant="flat"
              class="font-weight-bold"
            >
              {{ textoDiasRestantes }}
            </v-chip>
          </div>

          <div class="text-body-2 text-grey-darken-3 mt-1">
            <strong>Base legal:</strong> Día 17 ({{ kpis?.fecha_limite_base }}) &nbsp;|&nbsp; 
            <strong>Prórroga 6° dígito RFC:</strong> +{{ kpis?.dias_prorroga_rfc || 3 }} días hábiles &nbsp;|&nbsp;
            <strong>Fecha Límite Efectiva:</strong> <span class="font-weight-bold text-primary">{{ kpis?.fecha_limite_efectiva }}</span>
          </div>

          <div class="text-caption text-grey-darken-1 mt-1">
            Portal SPPLD SAT en operación. Evite sanciones de 200 a 2,000 UMAs conforme al Artículo 53 de la LFPIORPI.
          </div>
        </div>
      </div>

      <div class="d-flex align-center ga-2 w-100 w-md-auto justify-end">
        <v-btn
          href="https://sppld.sat.gob.mx"
          target="_blank"
          variant="outlined"
          color="primary"
          size="small"
          append-icon="mdi-open-in-new"
          class="text-none font-weight-medium bg-surface"
        >
          Portal SPPLD SAT
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { KpisAvisosSatPeriodo } from '~/types/avisosSat';

const props = defineProps<{
  kpis?: KpisAvisosSatPeriodo | null;
}>();

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const mesNombre = computed(() => {
  if (!props.kpis || !props.kpis.periodo_mes) return '';
  return nombresMeses[props.kpis.periodo_mes - 1] || '';
});

const textoDiasRestantes = computed(() => {
  const dias = props.kpis?.dias_habiles_restantes ?? 0;
  if (dias > 5) return `Quedan ${dias} días hábiles`;
  if (dias > 1) return `Próximo a vencer (${dias} días)`;
  if (dias === 1) return 'Vence mañana';
  if (dias === 0) return 'Vence hoy';
  return `Vencido hace ${Math.abs(dias)} días`;
});

const bannerBgClass = computed(() => {
  if (props.kpis?.semaforo_urgencia === 'rojo') return 'bg-red-lighten-5 border-error';
  if (props.kpis?.semaforo_urgencia === 'amarillo') return 'bg-amber-lighten-5 border-amber-darken-2';
  return 'bg-green-lighten-5 border-success';
});

const bannerTextoClass = computed(() => {
  if (props.kpis?.semaforo_urgencia === 'rojo') return 'text-error';
  if (props.kpis?.semaforo_urgencia === 'amarillo') return 'text-amber-darken-4';
  return 'text-green-darken-4';
});
</script>
