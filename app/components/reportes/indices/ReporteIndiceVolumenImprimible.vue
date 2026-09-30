<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="bg-grey-lighten-4 printable-dialog-card">
      <!-- Barra Superior de Control (Oculta al Imprimir) -->
      <v-toolbar color="primary" density="comfortable" class="no-print px-4">
        <v-btn icon="mdi-arrow-left" color="white" @click="cerrar" />
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Vista Previa de Impresión — Índice del Volumen {{ volumen }}
        </v-toolbar-title>
        <v-spacer />

        <v-btn
          color="amber-lighten-2"
          variant="flat"
          prepend-icon="mdi-printer"
          class="text-none font-weight-bold mr-2 text-primary"
          @click="imprimir"
        >
          Imprimir / Guardar PDF
        </v-btn>

        <v-btn
          color="white"
          variant="tonal"
          prepend-icon="mdi-file-excel-outline"
          class="text-none font-weight-medium mr-2"
          @click="emit('exportar-csv')"
        >
          Exportar CSV
        </v-btn>

        <v-btn icon="mdi-close" color="white" @click="cerrar" />
      </v-toolbar>

      <!-- Hoja Imprimible (Formato Canónico Notarial) -->
      <div class="pa-4 pa-md-8 d-flex justify-center printable-scroll-wrapper">
        <div class="hoja-notarial-indice bg-white pa-8 rounded elevation-2">
          <!-- Membrete Notarial -->
          <div class="membrete-notarial text-center pb-4 mb-4 border-b-2">
            <div v-if="logotipoUrl" class="mb-2">
              <img :src="logotipoUrl" alt="Logotipo Notaría" style="max-height: 70px; max-width: 220px; object-fit: contain;" />
            </div>
            <div v-if="configuracion?.leyenda_encabezado" class="notaria-encabezado text-caption font-weight-bold text-uppercase mb-1">
              {{ configuracion.leyenda_encabezado }}
            </div>
            <div class="notaria-titulo">{{ nombreNotariaOficial.toUpperCase() }}</div>
            <div class="notario-nombre">{{ titularOficial.toUpperCase() }}</div>
            <div class="notaria-subtitulo">{{ entidadOficial.toUpperCase() }} — ESTADOS UNIDOS MEXICANOS</div>
            <div v-if="configuracion?.leyenda_lema" class="notaria-lema font-italic text-caption mt-1">
              «{{ configuracion.leyenda_lema }}»
            </div>
            <div class="indice-titulo mt-3">ÍNDICE GENERAL DEL PROTOCOLO</div>
            <div class="indice-subtitulo text-uppercase">
              VOLUMEN: <strong>{{ volumen }}</strong> &nbsp;|&nbsp;
              AÑO: <strong>{{ anio }}</strong> &nbsp;|&nbsp;
              DEL INSTRUMENTO <strong>№ {{ instrumentoDesde }}</strong> AL <strong>№ {{ instrumentoHasta }}</strong>
            </div>
          </div>

          <!-- Tabla Reglamentaria de Instrumentos -->
          <table class="tabla-indice-oficial">
            <thead>
              <tr>
                <th style="width: 70px;">№ Inst.</th>
                <th style="width: 85px;">Fecha</th>
                <th style="width: 170px;">Acto Jurídico</th>
                <th>Partes y Comparecientes</th>
                <th style="width: 55px;" class="text-center">Fol. In.</th>
                <th style="width: 55px;" class="text-center">Fol. Fin</th>
                <th style="width: 120px;" class="text-center">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="esc in escrituras"
                :key="esc.id"
                :class="{ 'fila-cancelada': esc.estatus === 'anulada' }"
              >
                <!-- Número de Instrumento -->
                <td class="font-weight-bold text-center">
                  {{ esc.instrumento }}
                </td>

                <!-- Fecha Celebración -->
                <td class="text-center">
                  {{ esc.fecha_celebracion ? formatearFecha(esc.fecha_celebracion) : 'Pendiente' }}
                </td>

                <!-- Acto Jurídico -->
                <td class="font-weight-medium">
                  {{ esc.acto_nombre }}
                </td>

                <!-- Comparecientes con Rol Legal -->
                <td>
                  <div v-if="esc.comparecientes_resumen && esc.comparecientes_resumen.length > 0">
                    <span
                      v-for="(comp, idx) in esc.comparecientes_resumen"
                      :key="idx"
                      class="compareciente-item"
                    >
                      <strong>{{ comp.rol }}:</strong> {{ comp.nombre }}<span v-if="idx < esc.comparecientes_resumen.length - 1">; </span>
                    </span>
                  </div>
                  <span v-else class="text-caption text-grey-darken-1 font-italic">
                    Sin comparecientes registrados
                  </span>
                </td>

                <!-- Folio Inicial -->
                <td class="text-center font-weight-bold">
                  {{ esc.pagina_inicial ?? '-' }}
                </td>

                <!-- Folio Final -->
                <td class="text-center font-weight-bold">
                  {{ esc.pagina_final ?? '-' }}
                </td>

                <!-- Estatus Notarial / Observaciones -->
                <td class="text-center">
                  <span v-if="esc.estatus === 'anulada'" class="etiqueta-cancelada">
                    CANCELADA (NO PASÓ)
                  </span>
                  <span v-else-if="esc.estatus === 'protocolizada'" class="etiqueta-firmada">
                    FIRMADA
                  </span>
                  <span v-else class="etiqueta-tramite">
                    EN TRÁMITE
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Certificación Notarial de Cierre del Volumen -->
          <div class="certificacion-cierre mt-8 pt-4">
            <div class="certificacion-titulo font-weight-bold mb-2">
              CERTIFICACIÓN NOTARIAL DE CIERRE DEL VOLUMEN
            </div>
            <p v-if="textoCertificacion" class="certificacion-texto text-justify" style="white-space: pre-wrap;">
              {{ textoCertificacion }}
            </p>
            <p v-else class="certificacion-texto text-justify">
              EL SUSCRITO NOTARIO TITULAR DE LA {{ nombreNotariaOficial.toUpperCase() }} DEL {{ entidadOficial.toUpperCase() }}, HACE CONSTAR Y CERTIFICA:
              Que el presente volumen número <strong>{{ volumen }}</strong> del protocolo a mi cargo consta de un total de
              <strong>{{ escrituras.length }}</strong> instrumentos públicos notariales (del número <strong>{{ instrumentoDesde }}</strong> al
              <strong>{{ instrumentoHasta }}</strong>), habiéndose protocolizado debidamente <strong>{{ totalFirmadas }}</strong> escrituras,
              y quedando <strong>{{ totalCanceladas }}</strong> canceladas (no pasaron) con los folios y asientos salvaguardados de conformidad
              con la Ley del Notariado en vigor.
            </p>
            <p class="certificacion-fecha text-right mt-3 mb-8">
              A la fecha de expedición de este índice oficial: <strong>{{ fechaActualLarga }}</strong>.
            </p>

            <!-- Firmas y Sello Notarial -->
            <div class="d-flex justify-space-between align-end firmas-contenedor mt-6">
              <div class="sello-box text-center border-dashed pa-4">
                <img
                  v-if="selloNotarialUrl"
                  :src="selloNotarialUrl"
                  alt="Sello Notarial"
                  class="sello-imagen"
                  style="max-height: 85px; max-width: 85px; object-fit: contain;"
                />
                <div v-else class="sello-texto text-caption font-weight-bold text-grey-darken-1">
                  SELLO DE AUTORIZAR DE LA NOTARÍA
                </div>
              </div>

              <div class="firma-notario text-center" style="min-width: 280px;">
                <div class="linea-firma border-b mb-2" />
                <div class="font-weight-bold text-body-2">{{ titularOficial.toUpperCase() }}</div>
                <div class="text-caption text-grey-darken-2">{{ nombreNotariaOficial.toUpperCase() }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { EscrituraIndiceItem } from '~/types/reportes'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'

const {
  configuracion,
  nombreNotariaCompleto,
  titularCompleto,
  logotipoUrl,
  selloNotarialUrl,
  interpoladorLeyenda,
  cargarConfiguracion,
} = useConfiguracionNotarial()

onMounted(() => {
  cargarConfiguracion()
})

const nombreNotariaOficial = computed(() => {
  if (configuracion.value) {
    return nombreNotariaCompleto.value
  }
  return 'Notaría Pública Número 128'
})

const titularOficial = computed(() => {
  if (configuracion.value) {
    return titularCompleto.value
  }
  return 'Lic. Roberto Gómez Barrera'
})

const entidadOficial = computed(() => {
  if (configuracion.value?.entidad_federativa) {
    return configuracion.value.entidad_federativa
  }
  return 'Estado de Quintana Roo'
})

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    volumen: number | null
    anio?: number
    escrituras: EscrituraIndiceItem[]
  }>(),
  {
    anio: new Date().getFullYear(),
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'exportar-csv'): void
}>()

const instrumentoDesde = computed(() => {
  if (props.escrituras.length === 0) return 0
  return Math.min(...props.escrituras.map((e) => e.instrumento))
})

const instrumentoHasta = computed(() => {
  if (props.escrituras.length === 0) return 0
  return Math.max(...props.escrituras.map((e) => e.instrumento))
})

const totalFirmadas = computed(() => {
  return props.escrituras.filter((e) => e.estatus === 'protocolizada').length
})

const totalCanceladas = computed(() => {
  return props.escrituras.filter((e) => e.estatus === 'anulada').length
})

const fechaActualLarga = computed(() => {
  const d = new Date()
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  return d.toLocaleDateString('es-MX', opciones)
})

const textoCertificacion = computed(() => {
  if (!configuracion.value?.leyenda_cierre_volumen) return null

  const foliosTotales = props.escrituras.reduce((acc, e) => {
    const ini = Number(e.pagina_inicial) || 0
    const fin = Number(e.pagina_final) || ini
    return acc + (fin >= ini ? fin - ini + 1 : 0)
  }, 0)

  return interpoladorLeyenda(configuracion.value.leyenda_cierre_volumen, {
    numero_volumen: String(props.volumen ?? ''),
    escrituras_validas: String(totalFirmadas.value),
    escrituras_canceladas: String(totalCanceladas.value),
    folios_totales: String(foliosTotales),
    nombre_notario: titularOficial.value,
    fecha_cierre: fechaActualLarga.value,
    instrumento_desde: String(instrumentoDesde.value),
    instrumento_hasta: String(instrumentoHasta.value),
    total_instrumentos: String(props.escrituras.length),
  })
})

function imprimir() {
  window.print()
}

function cerrar() {
  emit('update:modelValue', false)
}

function formatearFecha(fechaStr?: string): string {
  if (!fechaStr) return ''
  const partes = fechaStr.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return fechaStr
}
</script>

<style scoped>
.printable-scroll-wrapper {
  overflow-y: auto;
  max-height: calc(100vh - 64px);
}

.hoja-notarial-indice {
  width: 100%;
  max-width: 950px;
  min-height: 1100px;
  color: #1a1a1a;
  font-family: 'Times New Roman', Times, serif;
}

.notaria-titulo {
  color: #1b3a5f;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 1px;
}

.notario-nombre {
  color: #a9762e;
  font-size: 14px;
  font-weight: 700;
  margin-top: 2px;
}

.notaria-subtitulo {
  color: #4a5568;
  font-size: 11px;
  font-weight: 600;
}

.indice-titulo {
  color: #1b3a5f;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.indice-subtitulo {
  font-size: 12px;
  color: #2d3748;
}

.tabla-indice-oficial {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
  font-size: 11px;
}

.tabla-indice-oficial th {
  background-color: #f1f4f8;
  color: #1b3a5f;
  font-weight: 700;
  border: 1px solid #cbd2dc;
  padding: 6px 8px;
  text-align: left;
}

.tabla-indice-oficial td {
  border: 1px solid #cbd2dc;
  padding: 6px 8px;
  vertical-align: top;
}

.fila-cancelada {
  background-color: #fff8f8;
}

.etiqueta-cancelada {
  color: #b71c1c;
  font-weight: 700;
  font-size: 10px;
}

.etiqueta-firmada {
  color: #1b5e20;
  font-weight: 700;
  font-size: 10px;
}

.etiqueta-tramite {
  color: #e65100;
  font-weight: 600;
  font-size: 10px;
}

.certificacion-cierre {
  border-top: 2px solid #1b3a5f;
}

.certificacion-titulo {
  color: #1b3a5f;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.certificacion-texto {
  font-size: 11.5px;
  line-height: 1.5;
}

.sello-box {
  width: 180px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed #718096;
}

.linea-firma {
  border-bottom: 1.5px solid #1a1a1a;
  width: 100%;
  margin-bottom: 6px;
}

/* Reglas Estrictas para Impresión Física o Guardado en PDF */
@media print {
  .no-print {
    display: none !important;
  }

  .printable-dialog-card {
    background-color: #ffffff !important;
  }

  .printable-scroll-wrapper {
    padding: 0 !important;
    overflow: visible !important;
  }

  .hoja-notarial-indice {
    max-width: 100% !important;
    width: 100% !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 10.5pt !important;
  }

  table {
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  .certificacion-cierre {
    page-break-inside: avoid;
  }
}
</style>
