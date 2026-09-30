<template>
  <div class="custodia-tramite-badge d-inline-flex align-center">
    <v-tooltip location="top" :text="tooltipTexto">
      <template #activator="{ props: tooltipProps }">
        <v-chip
          v-bind="tooltipProps"
          :color="chipColor"
          :variant="chipVariant"
          :size="compacto ? 'x-small' : 'small'"
          class="font-weight-medium px-2"
        >
          <v-icon start :icon="chipIcon" :size="compacto ? 12 : 14" />
          <span class="text-truncate" style="max-width: 220px;">
            {{ etiquetaTexto }}
          </span>
          <span v-if="horasEnCustodia != null && horasEnCustodia > 0" class="ml-1 opacity-80 text-caption">
            ({{ formatearTiempo(horasEnCustodia) }})
          </span>
        </v-chip>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TurnadoRolCustodio } from '~/types/turnado'

const props = withDefaults(
  defineProps<{
    rolCustodio?: TurnadoRolCustodio | string
    custodioNombre?: string
    detenidoPorSolventacion?: boolean
    horasEnCustodia?: number
    compacto?: boolean
  }>(),
  {
    rolCustodio: 'redactor',
    custodioNombre: 'Sin Asignar',
    detenidoPorSolventacion: false,
    horasEnCustodia: 0,
    compacto: false,
  }
)

const esSolventacion = computed(() => Boolean(props.detenidoPorSolventacion))
const esGestor = computed(() => props.rolCustodio === 'gestor')

const chipColor = computed(() => {
  if (esSolventacion.value) return 'warning'
  if (esGestor.value) return 'primary'
  return 'secondary'
})

const chipVariant = computed(() => {
  if (esSolventacion.value) return 'flat'
  return 'tonal'
})

const chipIcon = computed(() => {
  if (esSolventacion.value) return 'mdi-alert-circle-outline'
  if (esGestor.value) return 'mdi-briefcase-account-outline'
  return 'mdi-file-document-edit-outline'
})

const etiquetaTexto = computed(() => {
  const nombre = props.custodioNombre || 'Sin Asignar'
  if (esSolventacion.value) {
    return props.compacto ? `Solventando: ${nombre}` : `Detenido por Solventación: ${nombre}`
  }
  if (esGestor.value) {
    return props.compacto ? `Gestor: ${nombre}` : `En manos del Gestor: ${nombre}`
  }
  return props.compacto ? `Redactor: ${nombre}` : `En manos del Redactor: ${nombre}`
})

const tooltipTexto = computed(() => {
  const horas = props.horasEnCustodia || 0
  const tiempoDesc = formatearTiempo(horas)
  if (esSolventacion.value) {
    return `Trámite detenido para solventación jurídica a cargo de ${props.custodioNombre} (${tiempoDesc} transcurridos)`
  }
  if (esGestor.value) {
    return `Trámite en gestión externa activa ante dependencia por ${props.custodioNombre} (${tiempoDesc} transcurridos)`
  }
  return `Trámite en manos de redacción / integración notarial por ${props.custodioNombre} (${tiempoDesc} transcurridos)`
})

function formatearTiempo(horas: number): string {
  if (!horas || horas <= 0) return '0h'
  if (horas < 24) {
    return `${horas.toFixed(0)}h`
  }
  const dias = Math.floor(horas / 24)
  const restHoras = Math.round(horas % 24)
  return restHoras > 0 ? `${dias}d ${restHoras}h` : `${dias}d`
}
</script>

<style scoped>
.custodia-tramite-badge {
  line-height: 1;
}
</style>
