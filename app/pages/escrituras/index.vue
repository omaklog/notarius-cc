<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSupabaseClient } from '#imports'
import EscrituraForm from '~/components/escrituras/EscrituraForm.vue'
import type { ActoJuridicoOption, EscrituraFormValues } from '~/components/escrituras/EscrituraForm.vue'
import EscriturasFiltros from '~/components/escrituras/EscriturasFiltros.vue'
import type { EscriturasFiltrosValues, ResponsableItem } from '~/components/escrituras/EscriturasFiltros.vue'
import { useAuth } from '~/composables/useAuth'

interface EscrituraRow {
  id: string
  instrumento: number
  anio: number
  volumen: number | null
  fecha_celebracion: string | null
  estatus: string
  objeto: string
  acto_juridico_nombre: string
  acto_juridico_tipo: string
}

const supabase = useSupabaseClient()
const { user } = useAuth()

const escrituras = ref<EscrituraRow[]>([])
const actosJuridicos = ref<ActoJuridicoOption[]>([])
const responsables = ref<ResponsableItem[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const errorMessage = ref<string | null>(null)

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return 'Sin fecha'
  const partes = fecha.split('-')
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
  return fecha
}

const filtros = ref<EscriturasFiltrosValues>({
  estatus: null,
  actoJuridicoId: null,
  fechaDesde: null,
  fechaHasta: null,
  responsableId: null,
})

const estatusColor: Record<string, string> = {
  borrador: 'warning',
  protocolizada: 'success',
  anulada: 'error',
}

const totalCount = computed(() => escrituras.value.length)
const protocolizadasCount = computed(() => escrituras.value.filter(e => e.estatus === 'protocolizada').length)
const borradoresCount = computed(() => escrituras.value.filter(e => e.estatus === 'borrador').length)
const anuladasCount = computed(() => escrituras.value.filter(e => e.estatus === 'anulada').length)

async function cargarEscrituras(): Promise<void> {
  loading.value = true
  let query = supabase
    .from('escrituras')
    .select('id, instrumento, anio, volumen, fecha_celebracion, estatus, objeto, actos_juridicos(nombre, tipo)')
    .order('created_at', { ascending: false })

  if (filtros.value.estatus) {
    query = query.eq('estatus', filtros.value.estatus)
  }
  if (filtros.value.actoJuridicoId) {
    query = query.eq('acto_juridico_id', filtros.value.actoJuridicoId)
  }
  if (filtros.value.responsableId) {
    query = query.eq('responsable_id', filtros.value.responsableId)
  }
  if (filtros.value.fechaDesde) {
    query = query.gte('fecha_celebracion', filtros.value.fechaDesde)
  }
  if (filtros.value.fechaHasta) {
    query = query.lte('fecha_celebracion', filtros.value.fechaHasta)
  }

  const { data } = await query

  escrituras.value = (data ?? []).map((row: any) => {
    const acto = row.actos_juridicos as unknown as { nombre: string; tipo: string } | null
    return {
      id: row.id,
      instrumento: row.instrumento,
      anio: row.anio,
      volumen: row.volumen ?? null,
      fecha_celebracion: row.fecha_celebracion ?? null,
      estatus: row.estatus,
      objeto: row.objeto,
      acto_juridico_nombre: acto?.nombre ?? '',
      acto_juridico_tipo: acto?.tipo ?? '',
    }
  })
  loading.value = false
}

async function cargarActosJuridicos(): Promise<void> {
  const { data } = await supabase
    .from('actos_juridicos')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre')
  actosJuridicos.value = data ?? []
}

async function cargarResponsables(): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre_completo')
    .eq('activo', true)
    .order('nombre_completo')
  responsables.value = data ?? []
}

function onFiltrar(nuevosFiltros: EscriturasFiltrosValues): void {
  filtros.value = nuevosFiltros
  cargarEscrituras()
}

onMounted(() => {
  cargarEscrituras()
  cargarActosJuridicos()
  cargarResponsables()
})

async function crearEscritura(values: EscrituraFormValues): Promise<void> {
  errorMessage.value = null
  if (!user.value) return

  // Validar si el número de instrumento ya existe
  const { data: existente } = await supabase
    .from('escrituras')
    .select('id')
    .eq('instrumento', values.instrumento)
    .maybeSingle()

  if (existente) {
    errorMessage.value = `El número de escritura / instrumento ${values.instrumento} ya existe en el protocolo notarial.`
    return
  }

  const { error } = await supabase.from('escrituras').insert({
    instrumento: values.instrumento,
    volumen: values.volumen,
    acto_juridico_id: values.actoJuridicoId,
    objeto: values.objeto,
    pagina_inicial: values.paginaInicial,
    pagina_final: values.paginaFinal,
    fecha_celebracion: values.fechaCelebracion,
    monto_operacion: values.montoOperacion,
    observaciones: values.observaciones,
    responsable_id: user.value.id,
    created_by: user.value.id,
  })

  if (error) {
    if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
      errorMessage.value = `El número de instrumento ${values.instrumento} ya se encuentra registrado en el protocolo notarial.`
    } else {
      errorMessage.value = error.message
    }
    return
  }

  showCreateDialog.value = false
  await cargarEscrituras()
}
</script>

<template>
  <div>
    <!-- Header Notarial -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
      <div>
        <h1 class="text-h5 font-weight-bold text-primary">Protocolo Notarial — Escrituras</h1>
        <p class="text-body-2 text-medium-emphasis">
          Libro de Protocolo Ordinario · Control centralizado de instrumentos y archivo notarial
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" elevation="1" @click="showCreateDialog = true">
        Registrar escritura
      </v-btn>
    </div>

    <!-- Tarjetas de Métricas Rápidas (KPIs) -->
    <v-row density="comfortable" class="mb-4">
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="py-2 px-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">Total Registradas</div>
          <div class="text-h6 font-weight-bold text-primary">{{ totalCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="py-2 px-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">Protocolizadas</div>
          <div class="text-h6 font-weight-bold text-success">{{ protocolizadasCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="py-2 px-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">En Borrador</div>
          <div class="text-h6 font-weight-bold text-warning">{{ borradoresCount }}</div>
        </v-card>
      </v-col>
      <v-col cols="6" sm="3">
        <v-card variant="outlined" class="py-2 px-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">Anuladas</div>
          <div class="text-h6 font-weight-bold text-error">{{ anuladasCount }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
      closable
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <EscriturasFiltros
      :actos-juridicos="actosJuridicos"
      :responsables="responsables"
      @filter="onFiltrar"
    />

    <v-card variant="outlined" class="mt-4">
      <v-list v-if="!loading && escrituras.length > 0" lines="two">
        <v-list-item
          v-for="escritura in escrituras"
          :key="escritura.id"
          :to="`/escrituras/${escritura.id}`"
          class="px-4 py-3 border-b"
        >
          <template #prepend>
            <v-avatar color="primary" variant="tonal" class="font-weight-bold mr-3" rounded="lg">
              <v-icon icon="mdi-file-document-outline" size="22" />
            </v-avatar>
          </template>

          <template #title>
            <div class="d-flex align-center flex-wrap ga-2 font-weight-bold text-primary mb-1">
              <span>Instrumento: {{ escritura.instrumento }} — Volumen: {{ escritura.volumen ?? '—' }}</span>
              <span class="text-medium-emphasis font-weight-regular">— {{ escritura.objeto }}</span>
            </div>
          </template>

          <template #subtitle>
            <div class="d-flex align-center flex-wrap ga-2 text-caption text-medium-emphasis">
              <span class="d-flex align-center">
                <v-icon icon="mdi-calendar-blank-outline" size="14" class="mr-1 text-secondary" />
                Fecha de celebración: <strong class="ml-1 text-high-emphasis">{{ formatFecha(escritura.fecha_celebracion) }}</strong>
              </span>
              <span>•</span>
              <span class="d-flex align-center">
                <v-icon icon="mdi-gavel" size="14" class="mr-1 text-secondary" />
                Acto jurídico: <strong class="ml-1 text-high-emphasis">{{ escritura.acto_juridico_nombre }}</strong>
              </span>
              <v-chip size="x-small" variant="tonal" :color="escritura.acto_juridico_tipo === 'traslativo' ? 'secondary' : 'default'">
                {{ escritura.acto_juridico_tipo === 'traslativo' ? 'Traslativo' : 'No traslativo' }}
              </v-chip>
            </div>
          </template>

          <template #append>
            <div class="d-flex align-center ga-3">
              <v-chip :color="estatusColor[escritura.estatus]" size="small" variant="flat" class="text-capitalize font-weight-medium">
                {{ escritura.estatus }}
              </v-chip>
              <v-btn icon="mdi-chevron-right" variant="text" size="small" density="comfortable" />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <div v-else-if="!loading" class="text-body-2 text-medium-emphasis text-center py-12">
        <v-icon icon="mdi-file-search-outline" size="48" class="mb-2 text-disabled" /><br />
        No se encontraron escrituras con los filtros seleccionados.
      </div>

      <div v-else class="d-flex justify-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </v-card>

    <v-dialog v-model="showCreateDialog" max-width="680" persistent scrollable>
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between pt-4 px-6 pb-2 border-b">
          <div class="d-flex align-center ga-2">
            <v-icon icon="mdi-file-document-plus-outline" color="primary" />
            <span class="text-h6 font-weight-bold text-primary">Registrar escritura</span>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            density="comfortable"
            @click="showCreateDialog = false"
          />
        </v-card-title>
        <v-card-text class="pa-6">
          <EscrituraForm :actos-juridicos="actosJuridicos" @submit="crearEscritura">
            <template #actions>
              <div class="d-flex justify-end ga-2 mt-4 pt-3 border-t">
                <v-btn variant="text" @click="showCreateDialog = false">
                  Cancelar
                </v-btn>
                <v-btn type="submit" color="primary" prepend-icon="mdi-content-save">
                  Guardar
                </v-btn>
              </div>
            </template>
          </EscrituraForm>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
