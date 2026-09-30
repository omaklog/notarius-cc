<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabaseClient } from '#imports'
import { useHonorariosCalculos } from '~/composables/useHonorariosCalculos'
import { useHonorarios } from '~/composables/useHonorarios'
import type { EstatusCuentaHonorarios } from '~/types/honorarios'

const router = useRouter()
const supabase = useSupabaseClient()
const { formatearMoneda } = useHonorariosCalculos()
const { kpis, cargarKpis } = useHonorarios()

const cargando = ref(false)
const cuentas = ref<any[]>([])

// Filtros
const busqueda = ref('')
const filtroEstatus = ref<string>('todos')
const filtroCfdi = ref<string>('todos')

const estatusOptions = [
  { value: 'todos', title: 'Todos los estatus' },
  { value: 'cotizado', title: 'Cotizado' },
  { value: 'anticipo_parcial', title: 'Anticipo Parcial' },
  { value: 'liquidado', title: 'Liquidado' },
  { value: 'borrador', title: 'Borrador' },
]

const cfdiOptions = [
  { value: 'todos', title: 'CFDI: Todos' },
  { value: 'facturada', title: 'Facturada' },
  { value: 'pendiente', title: 'Pendiente' },
]

async function cargarCuentas() {
  cargando.value = true
  try {
    const { data, error } = await supabase
      .from('v_honorarios_cuentas_resumen')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    cuentas.value = data || []
  } catch (err: any) {
    console.error('Error al cargar cuentas de honorarios:', err)
  } finally {
    cargando.value = false
  }
}

onMounted(async () => {
  await Promise.all([cargarKpis(), cargarCuentas()])
})

const cuentasFiltradas = computed(() => {
  let list = cuentas.value

  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase().trim()
    list = list.filter(
      (c) =>
        String(c.escritura_instrumento).toLowerCase().includes(q) ||
        (c.escritura_objeto && c.escritura_objeto.toLowerCase().includes(q)) ||
        (c.acto_nombre && c.acto_nombre.toLowerCase().includes(q)) ||
        (c.razon_social_receptor && c.razon_social_receptor.toLowerCase().includes(q)) ||
        (c.rfc_receptor && c.rfc_receptor.toLowerCase().includes(q))
    )
  }

  if (filtroEstatus.value !== 'todos') {
    list = list.filter((c) => c.estatus === filtroEstatus.value)
  }

  if (filtroCfdi.value !== 'todos') {
    list = list.filter((c) => c.estatus_facturacion === filtroCfdi.value)
  }

  return list
})

function irAEscritura(escrituraId: string) {
  router.push(`/escrituras/${escrituraId}?tab=honorarios`)
}

const estatusColor: Record<string, string> = {
  borrador: 'default',
  cotizado: 'primary',
  anticipo_parcial: 'warning',
  liquidado: 'success',
  cancelado: 'error',
}
</script>

<template>
  <div class="honorarios-page pa-4">
    <!-- Breadcrumbs -->
    <v-breadcrumbs
      :items="[
        { title: 'Inicio', to: '/' },
        { title: 'Finanzas', disabled: true },
        { title: 'Honorarios Notariales', disabled: true },
      ]"
      density="compact"
      class="px-0 mb-2"
    />

    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-primary">
          Honorarios Notariales y Cobranza
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Control consolidado de cuentas arancelarias, anticipos, saldos pendientes de escrituras y estatus de timbrado CFDI.
        </p>
      </div>

      <div class="d-flex align-center ga-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          size="small"
          class="text-capitalize"
          :loading="cargando"
          @click="cargarCuentas"
        >
          Actualizar
        </v-btn>
      </div>
    </div>

    <!-- 4 Tarjetas KPI -->
    <v-row dense class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="text-caption text-medium-emphasis">Total Cobrado en el Mes</div>
          <div class="text-h6 font-weight-bold text-success font-weight-mono mt-1">
            {{ formatearMoneda(kpis.total_cobrado_mes) }}
          </div>
          <div class="d-flex align-center text-caption text-success mt-1">
            <v-icon icon="mdi-trending-up" size="14" class="mr-1" />
            Flujo ingresado en caja
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="text-caption text-medium-emphasis">Cuentas por Cobrar / Saldo Total</div>
          <div class="text-h6 font-weight-bold text-primary font-weight-mono mt-1">
            {{ formatearMoneda(kpis.saldo_total_pendiente) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            En {{ kpis.cuentas_activas }} cuentas activas
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="outlined" class="pa-4 rounded-lg bg-surface">
          <div class="text-caption text-medium-emphasis">Total Cotizado Acumulado</div>
          <div class="text-h6 font-weight-bold text-high-emphasis font-weight-mono mt-1">
            {{ formatearMoneda(kpis.total_cotizado_acumulado) }}
          </div>
          <div class="text-caption text-medium-emphasis mt-1">Presupuestos aprobados</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card variant="tonal" color="primary" class="pa-4 rounded-lg">
          <div class="text-caption font-weight-medium">Efectividad de Cobranza</div>
          <div class="text-h6 font-weight-bold font-weight-mono mt-1">
            {{ kpis.porcentaje_efectividad }}%
          </div>
          <div class="text-caption opacity-90 mt-1">
            {{ kpis.cuentas_liquidadas }} de {{ kpis.cuentas_activas }} liquidadas
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-card variant="outlined" class="pa-4 rounded-lg mb-4 bg-surface">
      <v-row dense align="center">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="busqueda"
            placeholder="Buscar por No. de instrumento, acto, cliente o RFC..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filtroEstatus"
            :items="estatusOptions"
            item-title="title"
            item-value="value"
            label="Estatus"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="filtroCfdi"
            :items="cfdiOptions"
            item-title="title"
            item-value="value"
            label="Facturación"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Tabla de Cuentas -->
    <v-card variant="outlined" class="rounded-lg">
      <v-table density="comfortable" hover>
        <thead>
          <tr class="bg-surface-variant">
            <th class="text-left font-weight-bold text-caption text-uppercase">Instrumento</th>
            <th class="text-left font-weight-bold text-caption text-uppercase">Acto Jurídico</th>
            <th class="text-left font-weight-bold text-caption text-uppercase">Cliente / Receptor</th>
            <th class="text-right font-weight-bold text-caption text-uppercase">Total Cotizado</th>
            <th class="text-right font-weight-bold text-caption text-uppercase">Total Cobrado</th>
            <th class="text-right font-weight-bold text-caption text-uppercase">Saldo Pendiente</th>
            <th class="text-center font-weight-bold text-caption text-uppercase">Estatus</th>
            <th class="text-center font-weight-bold text-caption text-uppercase">CFDI</th>
            <th class="text-center font-weight-bold text-caption text-uppercase">Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="9" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" size="32" />
            </td>
          </tr>
          <tr v-else-if="cuentasFiltradas.length === 0">
            <td colspan="9" class="text-center py-8 text-medium-emphasis">
              No se encontraron cuentas de honorarios con los filtros especificados.
            </td>
          </tr>
          <tr v-for="c in cuentasFiltradas" :key="c.id">
            <!-- Instrumento -->
            <td>
              <a
                href="#"
                class="font-weight-bold text-primary text-decoration-none font-weight-mono"
                @click.prevent="irAEscritura(c.escritura_id)"
              >
                {{ c.escritura_instrumento }}
              </a>
              <div class="text-caption text-medium-emphasis font-weight-mono">
                {{ c.escritura_expediente }}
              </div>
            </td>

            <!-- Acto -->
            <td>
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ c.acto_nombre || 'Acto Notarial' }}
              </v-chip>
            </td>

            <!-- Cliente / Receptor -->
            <td>
              <div class="text-body-2 font-weight-medium">
                {{ c.razon_social_receptor || 'Consumidor Final' }}
              </div>
              <small v-if="c.rfc_receptor" class="font-weight-mono text-caption text-medium-emphasis">
                {{ c.rfc_receptor }}
              </small>
            </td>

            <!-- Total Cotizado -->
            <td class="text-right font-weight-mono text-body-2">
              {{ formatearMoneda(c.total_cotizado) }}
            </td>

            <!-- Total Cobrado -->
            <td class="text-right font-weight-mono text-body-2 text-success">
              {{ formatearMoneda(c.total_pagado) }}
            </td>

            <!-- Saldo Pendiente -->
            <td class="text-right font-weight-mono text-body-2 font-weight-bold" :class="Number(c.saldo_pendiente) <= 0 ? 'text-success' : 'text-primary'">
              {{ formatearMoneda(c.saldo_pendiente) }}
            </td>

            <!-- Estatus -->
            <td class="text-center">
              <v-chip
                size="small"
                :color="estatusColor[c.estatus] || 'default'"
                variant="flat"
                class="text-capitalize font-weight-medium"
              >
                {{ c.estatus.replace('_', ' ') }}
              </v-chip>
            </td>

            <!-- CFDI -->
            <td class="text-center">
              <v-chip
                size="x-small"
                :color="c.estatus_facturacion === 'facturada' ? 'success' : 'default'"
                variant="tonal"
              >
                {{ c.estatus_facturacion }}
              </v-chip>
            </td>

            <!-- Acción -->
            <td class="text-center">
              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                size="small"
                color="primary"
                title="Ver cuenta de la escritura"
                @click="irAEscritura(c.escritura_id)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </div>
</template>

<style scoped>
.font-weight-mono {
  font-family: 'IBM Plex Mono', monospace, sans-serif;
}
</style>
