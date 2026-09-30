<script setup lang="ts">
import type { HojaLiquidacionConsolidada } from '~/types/honorarios'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'
import { imprimirHojaLiquidacion } from '~/utils/pdfHojaLiquidacion'

const props = defineProps<{
  modelValue: boolean
  hojaLiquidacion: HojaLiquidacionConsolidada | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { formatearMoneda } = useHonorariosCalculos()

function cerrar() {
  emit('update:modelValue', false)
}

function onImprimir() {
  if (!props.hojaLiquidacion) return
  imprimirHojaLiquidacion(props.hojaLiquidacion)
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="850" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="hojaLiquidacion" class="rounded-lg">
      <v-toolbar color="primary" density="compact" dark class="px-4">
        <v-icon icon="mdi-file-table-outline" class="mr-2" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Hoja de Liquidación Consolidada — Instrumento {{ hojaLiquidacion.instrumento_numero }}
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="cerrar" />
      </v-toolbar>

      <v-card-text class="pa-5">
        <!-- Encabezado de la liquidación -->
        <div class="d-flex flex-wrap justify-space-between align-center mb-4 pa-3 rounded bg-surface-variant border">
          <div>
            <div class="text-subtitle-2 font-weight-bold text-primary">
              Acto: {{ hojaLiquidacion.acto_juridico || 'Acto Notarial' }}
            </div>
            <div class="text-caption text-high-emphasis">
              {{ hojaLiquidacion.objeto }}
            </div>
          </div>
          <div class="text-right">
            <span class="text-caption text-medium-emphasis">Fecha de emisión:</span>
            <div class="text-body-2 font-weight-medium">{{ hojaLiquidacion.fecha_emision }}</div>
          </div>
        </div>

        <!-- Bloque A: Honorarios Notariales Propios -->
        <div class="mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon icon="mdi-briefcase-account-outline" size="18" color="primary" />
            <h4 class="text-subtitle-2 font-weight-bold text-uppercase text-primary">
              A. Honorarios y Gastos Notariales Propios
            </h4>
          </div>

          <v-table density="compact" class="border rounded mb-2">
            <thead>
              <tr class="bg-surface-variant">
                <th class="text-left font-weight-bold text-caption">Concepto</th>
                <th class="text-right font-weight-bold text-caption" style="width: 140px;">Importe Base</th>
                <th class="text-center font-weight-bold text-caption" style="width: 120px;">IVA (16%)</th>
                <th class="text-right font-weight-bold text-caption" style="width: 150px;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="hojaLiquidacion.honorarios.partidas.length === 0">
                <td colspan="4" class="text-center py-3 text-caption text-medium-emphasis">
                  Sin partidas de honorarios registradas
                </td>
              </tr>
              <tr v-for="p in hojaLiquidacion.honorarios.partidas" :key="p.id || p.concepto">
                <td class="text-body-2 font-weight-medium">
                  <span v-if="p.es_descuento" class="text-error font-weight-bold">[Descuento] </span>
                  {{ p.concepto }}
                </td>
                <td class="text-right font-weight-mono text-body-2">
                  {{ p.es_descuento ? `-${formatearMoneda(p.monto)}` : formatearMoneda(p.monto) }}
                </td>
                <td class="text-center text-caption text-medium-emphasis">
                  {{ !p.es_descuento && p.aplica_iva ? formatearMoneda(p.monto * 0.16) : 'Exento' }}
                </td>
                <td class="text-right font-weight-mono text-body-2 font-weight-bold" :class="p.es_descuento ? 'text-error' : 'text-primary'">
                  {{ p.es_descuento ? `-${formatearMoneda(p.monto)}` : formatearMoneda(p.aplica_iva ? p.monto * 1.16 : p.monto) }}
                </td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-flex justify-end text-body-2 font-weight-bold">
            <span class="text-medium-emphasis mr-2">Total Honorarios & Gastos:</span>
            <span class="text-primary font-weight-mono">{{ formatearMoneda(hojaLiquidacion.honorarios.total_notaria) }}</span>
          </div>
        </div>

        <!-- Bloque B: Derechos de Terceros (Órdenes de Pago) -->
        <div class="mb-4">
          <div class="d-flex align-center ga-2 mb-2">
            <v-icon icon="mdi-bank-outline" size="18" color="primary" />
            <h4 class="text-subtitle-2 font-weight-bold text-uppercase text-primary">
              B. Derechos e Impuestos a Terceros (Órdenes de Pago)
            </h4>
          </div>

          <v-table density="compact" class="border rounded mb-2">
            <thead>
              <tr class="bg-surface-variant">
                <th class="text-left font-weight-bold text-caption" style="width: 130px;">Folio</th>
                <th class="text-left font-weight-bold text-caption" style="width: 140px;">Dependencia</th>
                <th class="text-left font-weight-bold text-caption">Concepto</th>
                <th class="text-center font-weight-bold text-caption" style="width: 100px;">Estatus</th>
                <th class="text-right font-weight-bold text-caption" style="width: 140px;">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="hojaLiquidacion.terceros.ordenes.length === 0">
                <td colspan="5" class="text-center py-3 text-caption text-medium-emphasis">
                  Sin órdenes de pago de derechos registradas
                </td>
              </tr>
              <tr v-for="o in hojaLiquidacion.terceros.ordenes" :key="o.folio">
                <td class="font-weight-mono text-body-2 text-primary font-weight-bold">{{ o.folio }}</td>
                <td class="text-body-2 text-medium-emphasis">{{ o.dependencia }}</td>
                <td class="text-body-2">{{ o.concepto }}</td>
                <td class="text-center">
                  <v-chip size="x-small" :color="o.estado === 'pagado' ? 'success' : 'warning'" variant="tonal">
                    {{ o.estado }}
                  </v-chip>
                </td>
                <td class="text-right font-weight-mono text-body-2 font-weight-bold">{{ formatearMoneda(o.monto) }}</td>
              </tr>
            </tbody>
          </v-table>

          <div class="d-flex justify-end text-body-2 font-weight-bold">
            <span class="text-medium-emphasis mr-2">Total Derechos a Terceros:</span>
            <span class="font-weight-mono">{{ formatearMoneda(hojaLiquidacion.terceros.total_derechos) }}</span>
          </div>
        </div>

        <!-- Bloque C: Resumen General y Estado de Cuenta -->
        <v-card variant="tonal" color="primary" class="pa-4 rounded-lg">
          <h4 class="text-subtitle-2 font-weight-bold text-uppercase mb-3">
            C. Resumen General y Estado de Cuenta
          </h4>
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span>Total Notaría (A):</span>
            <span class="font-weight-mono font-weight-medium">{{ formatearMoneda(hojaLiquidacion.honorarios.total_notaria) }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span>Total Derechos a Terceros (B):</span>
            <span class="font-weight-mono font-weight-medium">{{ formatearMoneda(hojaLiquidacion.terceros.total_derechos) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between text-subtitle-2 font-weight-bold text-high-emphasis mb-1">
            <span>Gran Total del Trámite (A + B):</span>
            <span class="font-weight-mono">{{ formatearMoneda(hojaLiquidacion.balance.gran_total_tramite) }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2 text-success font-weight-bold mb-1">
            <span>Menos Anticipos y Pagos Recibidos:</span>
            <span class="font-weight-mono">-{{ formatearMoneda(hojaLiquidacion.balance.total_recibido) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center text-subtitle-1 font-weight-bold">
            <span>SALDO PENDIENTE DE LIQUIDACIÓN:</span>
            <span class="text-h6 font-weight-bold font-weight-mono" :class="hojaLiquidacion.balance.saldo_neto_pendiente <= 0 ? 'text-success' : 'text-primary'">
              {{ formatearMoneda(hojaLiquidacion.balance.saldo_neto_pendiente) }}
            </span>
          </div>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 bg-surface">
        <v-spacer />
        <v-btn variant="text" class="text-capitalize" @click="cerrar">
          Cerrar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-printer"
          class="text-capitalize px-4 font-weight-medium"
          @click="onImprimir"
        >
          Imprimir / Descargar PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
