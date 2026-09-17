<script setup lang="ts">
import { useRouter } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient } from '#imports'
import ComparecientesTab from '~/components/escrituras/tabs/ComparecientesTab.vue'
import ExpedienteTab from '~/components/escrituras/tabs/ExpedienteTab.vue'
import PldTab from '~/components/escrituras/tabs/PldTab.vue'
import TramitesTab from '~/components/escrituras/tabs/TramitesTab.vue'
import OrdenesPagoTab from '~/components/escrituras/tabs/OrdenesPagoTab.vue'
import PlaceholderTab from '~/components/escrituras/tabs/PlaceholderTab.vue'
import GeorreferenciacionTab from '~/components/escrituras/tabs/GeorreferenciacionTab.vue'
import ProtocolizarButton from '~/components/escrituras/ProtocolizarButton.vue'
import AnularDialog from '~/components/escrituras/AnularDialog.vue'

const route = useRoute()
const router = useRouter()
const escrituraId = route.params.id as string
const supabase = useSupabaseClient()

interface EscrituraDetalle {
  instrumento: number
  anio: number
  volumen: number | null
  fechaCelebracion: string | null
  objeto: string
  estatus: string
  actoJuridicoId: string
  actoJuridicoNombre: string
  actoJuridicoTipo: string
}

const escritura = ref<EscrituraDetalle | null>(null)
const loading = ref(true)
const tab = ref('comparecientes')

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return 'Sin fecha'
  const partes = fecha.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return fecha
}

async function cargar(): Promise<void> {
  loading.value = true
  const { data } = await supabase
    .from('escrituras')
    .select('instrumento, anio, volumen, fecha_celebracion, objeto, estatus, acto_juridico_id, actos_juridicos(nombre, tipo)')
    .eq('id', escrituraId)
    .single()

  if (data) {
    const acto = data.actos_juridicos as unknown as { nombre: string; tipo: string } | null
    escritura.value = {
      instrumento: data.instrumento,
      anio: data.anio,
      volumen: data.volumen ?? null,
      fechaCelebracion: data.fecha_celebracion ?? null,
      objeto: data.objeto,
      estatus: data.estatus,
      actoJuridicoId: data.acto_juridico_id,
      actoJuridicoNombre: acto?.nombre ?? '',
      actoJuridicoTipo: acto?.tipo ?? '',
    }
  }
  loading.value = false
}

onMounted(cargar)

const esTraslativo = computed(() => escritura.value?.actoJuridicoTipo === 'traslativo')
const esBorrador = computed(() => escritura.value?.estatus === 'borrador')
const esProtocolizada = computed(() => escritura.value?.estatus === 'protocolizada')

const estatusColor: Record<string, string> = {
  borrador: 'warning',
  protocolizada: 'success',
  anulada: 'error',
}

function volver(): void {
  router.push('/escrituras')
}

const protocolizarBtnRef = ref<any>(null)

async function onProtocolizada(): Promise<void> {
  await cargar()
}

async function onCambioCumplimiento(): Promise<void> {
  if (protocolizarBtnRef.value?.validar) {
    await protocolizarBtnRef.value.validar()
  }
}

// Abrir automáticamente en pantalla completa al pulsar la pestaña de Georreferenciación
const fullscreenGeo = ref(false)

watch(tab, (nuevoTab) => {
  if (nuevoTab === 'georreferenciacion' && esTraslativo.value) {
    fullscreenGeo.value = true
  }
})
</script>

<template>
  <div v-if="!loading && escritura">
    <!-- Breadcrumb & Back navigation -->
    <div class="d-flex align-center mb-3">
      <v-btn
        variant="text"
        density="compact"
        prepend-icon="mdi-arrow-left"
        class="text-body-2 text-primary font-weight-medium px-1"
        @click="volver"
      >
        Volver a Escrituras
      </v-btn>
    </div>

    <!-- Encabezado Institucional del Instrumento -->
    <v-card variant="outlined" class="pa-4 mb-4">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3">
        <div>
          <div class="d-flex align-center flex-wrap ga-3 mb-1">
            <h1 class="text-h5 font-weight-bold text-primary">
              Instrumento: {{ escritura.instrumento }} — Volumen: {{ escritura.volumen ?? '—' }}
            </h1>
            <v-chip
              :color="estatusColor[escritura.estatus]"
              size="small"
              variant="flat"
              class="text-capitalize font-weight-medium"
            >
              {{ escritura.estatus }}
            </v-chip>
          </div>
          <p class="text-body-1 font-weight-medium text-high-emphasis mb-2">
            {{ escritura.objeto }}
          </p>
          <div class="d-flex flex-wrap align-center ga-3 text-body-2 text-medium-emphasis">
            <span class="d-flex align-center">
              <v-icon icon="mdi-calendar-blank-outline" size="16" class="mr-1 text-secondary" />
              Fecha de celebración: <strong class="ml-1 text-high-emphasis">{{ formatFecha(escritura.fechaCelebracion) }}</strong>
            </span>
            <span>•</span>
            <span class="d-flex align-center">
              <v-icon icon="mdi-gavel" size="16" class="mr-1 text-secondary" />
              Acto jurídico: <strong class="ml-1 text-high-emphasis">{{ escritura.actoJuridicoNombre }}</strong>
            </span>
            <v-chip size="small" variant="tonal" :color="esTraslativo ? 'secondary' : 'default'">
              {{ esTraslativo ? 'Traslativo' : 'No traslativo' }}
            </v-chip>
          </div>
        </div>

        <div class="d-flex align-center ga-2">
          <ProtocolizarButton ref="protocolizarBtnRef" v-if="esBorrador" :escritura-id="escrituraId" @protocolizada="onProtocolizada" />
          <AnularDialog v-if="esProtocolizada" :escritura-id="escrituraId" @anulada="cargar" />
        </div>
      </div>
    </v-card>

    <!-- Pestañas del Hub Notarial -->
    <v-card variant="outlined">
      <v-tabs v-model="tab" bg-color="surface" color="primary" show-arrows>
        <v-tab value="comparecientes" prepend-icon="mdi-account-group-outline">Comparecientes</v-tab>
        <v-tab value="pld" prepend-icon="mdi-shield-check-outline">Cumplimiento PLD</v-tab>
        <v-tab value="expediente" prepend-icon="mdi-folder-outline">Expediente</v-tab>
        <v-tab value="tramites" prepend-icon="mdi-file-tree-outline">Trámites</v-tab>
        <v-tab value="avisos" prepend-icon="mdi-email-alert-outline">Avisos SAT/UIF</v-tab>
        <v-tab value="ordenes" prepend-icon="mdi-cash-multiple">Órdenes de pago</v-tab>
        <v-tab value="honorarios" prepend-icon="mdi-calculator-variant-outline">Honorarios</v-tab>
        <v-tab v-if="esTraslativo" value="georreferenciacion" prepend-icon="mdi-map-marker-outline">Georreferenciación</v-tab>
      </v-tabs>

      <v-divider />

      <v-card-text class="pa-4">
        <v-window v-model="tab">
          <v-window-item value="comparecientes">
            <ComparecientesTab :escritura-id="escrituraId" :acto-juridico-id="escritura.actoJuridicoId" />
          </v-window-item>
          <v-window-item value="pld">
            <PldTab
              :escritura-id="escrituraId"
              :acto-juridico-id="escritura.actoJuridicoId"
              :instrumento-numero="escritura.instrumento"
              @cambio-cumplimiento="onCambioCumplimiento"
            />
          </v-window-item>
          <v-window-item value="expediente">
            <ExpedienteTab :escritura-id="escrituraId" />
          </v-window-item>
          <v-window-item value="tramites">
            <TramitesTab :escritura-id="escrituraId" :acto-juridico-id="escritura?.actoJuridicoId" />
          </v-window-item>
          <v-window-item value="avisos">
            <PlaceholderTab />
          </v-window-item>
          <v-window-item value="ordenes">
            <OrdenesPagoTab :escritura-id="escrituraId" />
          </v-window-item>
          <v-window-item value="honorarios">
            <PlaceholderTab />
          </v-window-item>
          <v-window-item v-if="esTraslativo" value="georreferenciacion">
            <GeorreferenciacionTab
              :escritura-id="escrituraId"
              :acto-juridico-id="escritura.actoJuridicoId"
              :is-fullscreen="false"
              @status-change="onCambioCumplimiento"
              @abrir-fullscreen="fullscreenGeo = true"
            />
          </v-window-item>
        </v-window>
      </v-card-text>
    </v-card>

    <!-- Modal de Pantalla Completa para Georreferenciación -->
    <v-dialog
      v-if="esTraslativo"
      v-model="fullscreenGeo"
      fullscreen
      transition="dialog-bottom-transition"
      :scrim="false"
    >
      <v-card class="d-flex flex-column h-100 bg-grey-lighten-4">
        <!-- Barra de herramientas superior -->
        <v-toolbar color="primary" density="compact" dark class="px-3">
          <v-icon icon="mdi-map-marker-radius" class="mr-2" />
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            Delimitación Geográfica e Inmuebles — Instrumento {{ escritura.instrumento }}
            <span v-if="escritura.actoJuridicoNombre" class="text-caption font-weight-regular ml-2 opacity-90">
              ({{ escritura.actoJuridicoNombre }})
            </span>
          </v-toolbar-title>
          <v-spacer />
          <v-btn
            variant="tonal"
            color="white"
            size="small"
            prepend-icon="mdi-fullscreen-exit"
            class="text-capitalize font-weight-medium mr-2"
            @click="fullscreenGeo = false"
          >
            Salir de Pantalla Completa
          </v-btn>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            color="white"
            @click="fullscreenGeo = false"
          />
        </v-toolbar>

        <!-- Contenido de Georreferenciación en Pantalla Completa -->
        <v-card-text class="pa-4 flex-grow-1 overflow-y-auto">
          <GeorreferenciacionTab
            :escritura-id="escrituraId"
            :acto-juridico-id="escritura.actoJuridicoId"
            :is-fullscreen="true"
            @status-change="onCambioCumplimiento"
            @cerrar-fullscreen="fullscreenGeo = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
