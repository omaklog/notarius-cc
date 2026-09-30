<template>
  <v-card variant="outlined" class="rounded-lg bg-surface border">
    <!-- Barra superior de filtros y búsqueda -->
    <v-card-item class="py-3 px-4 border-b bg-grey-lighten-5">
      <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between ga-3">
        <!-- Filtros por Chips / Pestañas -->
        <v-chip-group v-model="filtroSeleccionado" mandatory color="primary">
          <v-chip value="todas" filter variant="tonal" size="small">
            Todas ({{ conteos.todas }})
          </v-chip>
          <v-chip value="pendientes" filter variant="tonal" color="amber-darken-3" size="small">
            Pendientes ({{ conteos.pendientes }})
          </v-chip>
          <v-chip value="presentadas" filter variant="tonal" color="success" size="small">
            Presentadas ({{ conteos.presentadas }})
          </v-chip>
          <v-chip value="24h" filter variant="tonal" color="error" size="small">
            Avisos 24h ({{ conteos.alertas24h }})
          </v-chip>
        </v-chip-group>

        <!-- Buscador contextual -->
        <div style="min-width: 280px; max-width: 360px;" class="w-100 w-md-auto">
          <v-text-field
            v-model="busqueda"
            placeholder="Buscar por instrumento, cliente o RFC..."
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </div>
      </div>
    </v-card-item>

    <!-- Tabla interactiva -->
    <v-table density="comfortable" class="text-body-2">
      <thead>
        <tr class="bg-grey-lighten-5">
          <th class="text-left font-weight-bold" style="width: 120px;">Instrumento</th>
          <th class="text-left font-weight-bold" style="width: 110px;">Fecha Firma</th>
          <th class="text-left font-weight-bold">Acto Jurídico</th>
          <th class="text-left font-weight-bold">Cliente / Comparecientes</th>
          <th class="text-right font-weight-bold" style="width: 140px;">Monto MXN</th>
          <th class="text-right font-weight-bold" style="width: 120px;">Monto UMAs</th>
          <th class="text-center font-weight-bold" style="width: 150px;">Estatus Aviso</th>
          <th class="text-left font-weight-bold" style="width: 160px;">Folio Acuse SAT</th>
          <th class="text-center font-weight-bold" style="width: 130px;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in operacionesFiltradas" :key="item.id">
          <td>
            <div class="d-flex align-center">
              <v-btn
                v-if="item.escritura_id"
                :to="`/escrituras/${item.escritura_id}?tab=avisos`"
                variant="text"
                density="compact"
                class="pa-0 font-weight-bold text-primary font-mono text-body-2"
              >
                #{{ item.numero_instrumento || 'S/N' }}
              </v-btn>
              <span v-else class="font-mono font-weight-bold">
                {{ item.tipo_aviso === 'ceros' ? 'INFORME CEROS' : 'S/N' }}
              </span>
            </div>
          </td>
          <td class="text-caption text-grey-darken-2">
            {{ item.fecha_acto || item.created_at?.slice(0, 10) }}
          </td>
          <td>
            <div class="font-weight-medium">{{ item.acto_juridico_nombre || 'Acto Notarial' }}</div>
            <div v-if="item.tipo_aviso === '24_horas'" class="text-caption text-error font-weight-bold">
              <v-icon size="12" color="error">mdi-alert-octagon</v-icon> Aviso 24 Horas
            </div>
          </td>
          <td>
            <div class="text-caption font-weight-medium text-truncate" style="max-width: 200px;">
              {{ item.cliente_principal || 'Partes del instrumento' }}
            </div>
          </td>
          <td class="text-right font-mono font-weight-medium">
            {{ formatearMonto(item.monto_operacion_mxn) }}
          </td>
          <td class="text-right font-mono text-caption text-grey-darken-3">
            {{ Number(item.monto_operacion_uma || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 }) }}
          </td>
          <td class="text-center">
            <v-chip
              size="x-small"
              :color="obtenerColorEstatus(item.estatus, item.tipo_aviso)"
              variant="tonal"
              class="font-weight-bold"
            >
              {{ obtenerEtiquetaEstatus(item.estatus, item.tipo_aviso) }}
            </v-chip>
          </td>
          <td>
            <div v-if="item.folio_acuse_sat" class="font-mono text-caption font-weight-bold text-primary text-truncate">
              {{ item.folio_acuse_sat }}
            </div>
            <span v-else class="text-caption text-grey">Sin acuse</span>
          </td>
          <td class="text-center">
            <div class="d-flex align-center justify-center ga-1">
              <v-btn
                v-if="item.escritura_id"
                icon="mdi-xml"
                variant="text"
                size="small"
                color="primary"
                title="Generar XML"
                @click="$emit('generar-xml', item.escritura_id)"
              />
              <v-btn
                v-if="item.escritura_id"
                icon="mdi-file-pdf-box"
                variant="text"
                size="small"
                color="primary"
                title="Cédula PDF"
                @click="$emit('emitir-pdf', item)"
              />
              <v-btn
                icon="mdi-check-decagram-outline"
                variant="text"
                size="small"
                :color="item.estatus === 'presentado' ? 'success' : 'amber-darken-3'"
                title="Registrar Acuse SAT"
                @click="$emit('registrar-acuse', item)"
              />
            </div>
          </td>
        </tr>

        <tr v-if="operacionesFiltradas.length === 0">
          <td colspan="9" class="text-center py-8 text-grey">
            <v-icon size="36" class="mb-2 text-grey-lighten-1">mdi-file-search-outline</v-icon>
            <div>No se encontraron avisos con el filtro seleccionado.</div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AvisoSatItem } from '~/types/avisosSat';

const props = withDefaults(
  defineProps<{
    operaciones?: AvisoSatItem[];
  }>(),
  {
    operaciones: () => [],
  }
);

defineEmits<{
  (e: 'generar-xml', escrituraId: string): void;
  (e: 'emitir-pdf', item: AvisoSatItem): void;
  (e: 'registrar-acuse', item: AvisoSatItem): void;
}>();

const filtroSeleccionado = ref<'todas' | 'pendientes' | 'presentadas' | '24h'>('todas');
const busqueda = ref('');

const conteos = computed(() => {
  const ops = props.operaciones || [];
  return {
    todas: ops.length,
    pendientes: ops.filter(o => o.estatus === 'pendiente' || o.estatus === 'xml_generado').length,
    presentadas: ops.filter(o => o.estatus === 'presentado').length,
    alertas24h: ops.filter(o => o.tipo_aviso === '24_horas').length,
  };
});

const operacionesFiltradas = computed(() => {
  let res = props.operaciones || [];

  // Filtro por pestaña
  if (filtroSeleccionado.value === 'pendientes') {
    res = res.filter(o => o.estatus === 'pendiente' || o.estatus === 'xml_generado');
  } else if (filtroSeleccionado.value === 'presentadas') {
    res = res.filter(o => o.estatus === 'presentado');
  } else if (filtroSeleccionado.value === '24h') {
    res = res.filter(o => o.tipo_aviso === '24_horas');
  }

  // Filtro por texto
  if (busqueda.value && busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase().trim();
    res = res.filter(o => {
      return (
        o.numero_instrumento?.toLowerCase().includes(q) ||
        o.cliente_principal?.toLowerCase().includes(q) ||
        o.acto_juridico_nombre?.toLowerCase().includes(q) ||
        o.folio_acuse_sat?.toLowerCase().includes(q)
      );
    });
  }

  return res;
});

function obtenerColorEstatus(estatus: string, tipoAviso?: string): string {
  if (tipoAviso === '24_horas') return 'error';
  if (estatus === 'presentado') return 'success';
  if (estatus === 'xml_generado') return 'primary';
  return 'amber-darken-3';
}

function obtenerEtiquetaEstatus(estatus: string, tipoAviso?: string): string {
  if (tipoAviso === '24_horas') return 'Aviso 24h';
  if (estatus === 'presentado') return 'Presentado';
  if (estatus === 'xml_generado') return 'XML Listo';
  return 'Pendiente';
}

function formatearMonto(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(val || 0);
}

defineExpose({
  filtroSeleccionado,
  setFiltro: (f: 'todas' | 'pendientes' | 'presentadas' | '24h') => {
    filtroSeleccionado.value = f;
  },
});
</script>

<style scoped>
.font-mono {
  font-family: 'IBM Plex Mono', monospace;
}
</style>
