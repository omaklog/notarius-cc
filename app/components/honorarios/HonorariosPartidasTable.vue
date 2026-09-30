<script setup lang="ts">
import { computed } from 'vue'
import type { HonorariosPartida } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'

const props = withDefaults(
  defineProps<{
    partidas: HonorariosPartida[]
    puedeEditar?: boolean
    cargando?: boolean
  }>(),
  {
    puedeEditar: true,
    cargando: false,
  }
)

const emit = defineEmits<{
  (e: 'agregarPartida'): void
  (e: 'editarPartida', partida: HonorariosPartida): void
  (e: 'eliminarPartida', partidaId: string): void
}>()

const { formatearMoneda, calcularTotalesPartidas, redondear } = useHonorariosCalculos()

const totales = computed(() => calcularTotalesPartidas(props.partidas))

function getPartidaIva(p: HonorariosPartida): number {
  if (p.es_descuento || !p.aplica_iva) return 0
  return redondear((p.monto || 0) * 0.16)
}

function getPartidaTotal(p: HonorariosPartida): number {
  if (p.es_descuento) return redondear(p.monto || 0)
  return redondear((p.monto || 0) + getPartidaIva(p))
}
</script>

<template>
  <v-card variant="outlined" class="rounded-lg mb-4">
    <div class="d-flex flex-wrap align-center justify-space-between pa-4 border-b">
      <div>
        <div class="d-flex align-center ga-2">
          <v-icon icon="mdi-file-document-edit-outline" color="primary" />
          <h3 class="text-subtitle-1 font-weight-bold text-high-emphasis">
            Cotización de Honorarios y Gastos Notariales Propios
          </h3>
        </div>
        <p class="text-caption text-medium-emphasis mb-0">
          Servicios profesionales de fe pública, redacción, testimonios y gastos internos de la notaría.
        </p>
      </div>

      <v-btn
        v-if="puedeEditar"
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-plus"
        class="text-capitalize font-weight-medium"
        @click="emit('agregarPartida')"
      >
        Agregar Partida
      </v-btn>
    </div>

    <!-- Tabla de partidas -->
    <v-table density="comfortable" hover class="honorarios-table">
      <thead>
        <tr class="bg-surface-variant">
          <th class="text-left font-weight-bold text-caption text-uppercase">Concepto / Servicio</th>
          <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 140px;">Importe Base</th>
          <th class="text-center font-weight-bold text-caption text-uppercase" style="width: 130px;">IVA (16%)</th>
          <th class="text-right font-weight-bold text-caption text-uppercase" style="width: 160px;">Total Partida</th>
          <th v-if="puedeEditar" class="text-center font-weight-bold text-caption text-uppercase" style="width: 100px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="partidas.length === 0">
          <td :colspan="puedeEditar ? 5 : 4" class="text-center py-6 text-body-2 text-medium-emphasis">
            <v-icon icon="mdi-receipt-text-outline" size="32" class="d-block mx-auto mb-1 opacity-50" />
            No hay partidas cotizadas en esta cuenta. Presione "Agregar Partida" para iniciar el presupuesto.
          </td>
        </tr>

        <tr v-for="partida in partidas" :key="partida.id || partida.concepto">
          <!-- Concepto -->
          <td class="text-body-2 font-weight-medium">
            <div class="d-flex align-center ga-2">
              <v-chip
                v-if="partida.es_descuento"
                color="error"
                size="x-small"
                variant="tonal"
                class="font-weight-bold text-uppercase"
              >
                Descuento
              </v-chip>
              <span>{{ partida.concepto }}</span>
            </div>
          </td>

          <!-- Importe Base -->
          <td class="text-right text-body-2 font-weight-mono">
            {{ partida.es_descuento ? `-${formatearMoneda(partida.monto)}` : formatearMoneda(partida.monto) }}
          </td>

          <!-- IVA -->
          <td class="text-center">
            <v-chip
              v-if="!partida.es_descuento && partida.aplica_iva"
              color="secondary"
              size="x-small"
              variant="tonal"
              class="font-weight-medium"
            >
              +{{ formatearMoneda(getPartidaIva(partida)) }} (16%)
            </v-chip>
            <v-chip
              v-else-if="!partida.es_descuento"
              color="default"
              size="x-small"
              variant="outlined"
              class="font-weight-regular text-medium-emphasis"
            >
              Exento (0%)
            </v-chip>
            <span v-else class="text-caption text-medium-emphasis">—</span>
          </td>

          <!-- Total Partida -->
          <td class="text-right text-body-2 font-weight-bold font-weight-mono" :class="partida.es_descuento ? 'text-error' : 'text-high-emphasis'">
            {{ partida.es_descuento ? `-${formatearMoneda(getPartidaTotal(partida))}` : formatearMoneda(getPartidaTotal(partida)) }}
          </td>

          <!-- Acciones -->
          <td v-if="puedeEditar" class="text-center">
            <div class="d-flex justify-center ga-1">
              <v-btn
                icon="mdi-pencil"
                variant="text"
                size="x-small"
                color="medium-emphasis"
                title="Editar partida"
                @click="emit('editarPartida', partida)"
              />
              <v-btn
                v-if="partida.id"
                icon="mdi-delete-outline"
                variant="text"
                size="x-small"
                color="error"
                title="Eliminar partida"
                @click="emit('eliminarPartida', partida.id)"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-divider />

    <!-- Panel de subtotales y gran total de la notaría -->
    <div class="pa-4 bg-surface-variant d-flex flex-wrap justify-end">
      <div style="min-width: 280px; max-width: 360px;" class="text-body-2">
        <div class="d-flex justify-space-between mb-1">
          <span class="text-medium-emphasis">Subtotal Gravado (IVA 16%):</span>
          <span class="font-weight-medium">{{ formatearMoneda(totales.subtotal_gravado) }}</span>
        </div>
        <div class="d-flex justify-space-between mb-1">
          <span class="text-medium-emphasis">Subtotal Exento (0%):</span>
          <span class="font-weight-medium">{{ formatearMoneda(totales.subtotal_exento) }}</span>
        </div>
        <div v-if="totales.descuento_total > 0" class="d-flex justify-space-between mb-1 text-error">
          <span>Descuentos / Bonificaciones:</span>
          <span class="font-weight-medium">-{{ formatearMoneda(totales.descuento_total) }}</span>
        </div>
        <div class="d-flex justify-space-between mb-2">
          <span class="text-medium-emphasis">IVA Trasladado (16%):</span>
          <span class="font-weight-medium">{{ formatearMoneda(totales.iva_total) }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-space-between text-subtitle-1 font-weight-bold text-primary">
          <span>Total Notaría:</span>
          <span class="text-h6 font-weight-bold text-primary">{{ formatearMoneda(totales.total_cotizado) }}</span>
        </div>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
