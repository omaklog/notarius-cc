<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSupabaseClient } from '#imports'

export interface ComparecienteBusquedaResult {
  id: string
  tipo_persona: 'fisica' | 'moral'
  rfc: string
  identificador_secundario: string
  nombre_completo: string
  activo: boolean
}

export interface RolOption {
  id: string
  nombre: string
  codigo?: string
}

const ROLES_ADQUIRENTES_CODIGOS = new Set([
  'adquiriente',
  'adquirente',
  'donatario',
  'cesionario',
  'permutuario',
  'heredero',
  'herederos',
  'comprador_deudor',
  'adjudicatario',
])

function esRolAdquirente(rol: RolOption | undefined): boolean {
  if (!rol) return false
  if (rol.codigo && ROLES_ADQUIRENTES_CODIGOS.has(rol.codigo.toLowerCase())) {
    return true
  }
  const nombreLimpio = rol.nombre.toUpperCase()
  return (
    nombreLimpio.includes('ADQUIR') ||
    nombreLimpio.includes('DONATARIO') ||
    nombreLimpio.includes('CESIONARIO') ||
    nombreLimpio.includes('PERMUTUARIO') ||
    nombreLimpio.includes('HEREDER') ||
    nombreLimpio.includes('COMPRADOR') ||
    nombreLimpio.includes('ADJUDICAT')
  )
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    actoJuridicoNombre?: string
    instrumentoNumero?: number | string
    rolesDisponibles: RolOption[]
    loading?: boolean
  }>(),
  {
    modelValue: false,
    actoJuridicoNombre: '',
    instrumentoNumero: '',
    rolesDisponibles: () => [],
    loading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  select: [
    payload: {
      comparecienteId: string
      comparecienteNombre: string
      rolId: string
      porcentaje: number | null
    },
  ]
  'open-crear': []
}>()

const supabase = useSupabaseClient()

const busqueda = ref('')
const buscando = ref(false)
const resultados = ref<ComparecienteBusquedaResult[]>([])
const comparecienteSeleccionado = ref<ComparecienteBusquedaResult | null>(null)
const rolId = ref<string>('')
const porcentaje = ref<number | null>(null)
const errorSeleccion = ref<string | null>(null)

const rolSeleccionado = computed(() => {
  return props.rolesDisponibles.find((r) => r.id === rolId.value)
})

const esAdquirente = computed(() => {
  return esRolAdquirente(rolSeleccionado.value)
})

watch(rolId, () => {
  if (!esAdquirente.value) {
    porcentaje.value = null
  }
})

// Resetear estado al abrir el diálogo
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      busqueda.value = ''
      resultados.value = []
      comparecienteSeleccionado.value = null
      rolId.value = props.rolesDisponibles.length === 1 ? props.rolesDisponibles[0].id : ''
      porcentaje.value = null
      errorSeleccion.value = null
    }
  },
)

async function buscar(): Promise<void> {
  const query = busqueda.value.trim()
  if (query.length < 2) {
    resultados.value = []
    return
  }

  buscando.value = true
  errorSeleccion.value = null

  try {
    const { data, error } = await supabase.rpc('fn_buscar_comparecientes', {
      p_query: query,
      p_limite: 10,
    })

    if (error) throw error
    resultados.value = (data as ComparecienteBusquedaResult[]) ?? []
  } catch (err: any) {
    errorSeleccion.value = err.message || 'Error al buscar comparecientes'
  } finally {
    buscando.value = false
  }
}

function seleccionarCompareciente(item: ComparecienteBusquedaResult): void {
  comparecienteSeleccionado.value = item
  errorSeleccion.value = null
}

function confirmarVinculacion(): void {
  if (!comparecienteSeleccionado.value) {
    errorSeleccion.value = 'Debe seleccionar un compareciente del padrón'
    return
  }

  if (!rolId.value) {
    errorSeleccion.value = 'Debe seleccionar el rol del compareciente para este acto'
    return
  }

  const p = esAdquirente.value && porcentaje.value !== null && porcentaje.value !== undefined ? Number(porcentaje.value) : null
  if (p !== null && (p <= 0 || p > 100)) {
    errorSeleccion.value = 'El porcentaje de alícuota debe ser mayor a 0 y menor o igual a 100'
    return
  }

  emit('select', {
    comparecienteId: comparecienteSeleccionado.value.id,
    comparecienteNombre: comparecienteSeleccionado.value.nombre_completo,
    rolId: rolId.value,
    porcentaje: p,
  })

  emit('update:modelValue', false)
}

function getIniciales(nombre: string): string {
  if (!nombre) return 'C'
  const partes = nombre.trim().split(/\s+/)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase()
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" persistent scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card class="rounded-lg">
      <!-- Encabezado Notarial -->
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-account-plus" class="mr-2" />
          <div>
            <div class="text-subtitle-1 font-weight-bold">
              Vincular Compareciente a Escritura
            </div>
            <div v-if="actoJuridicoNombre || instrumentoNumero" class="text-caption text-white-50">
              <span v-if="actoJuridicoNombre">Acto: {{ actoJuridicoNombre }}</span>
              <span v-if="instrumentoNumero"> | Instrumento No. {{ instrumentoNumero }}</span>
            </div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          density="compact"
          @click="emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-card-text class="pa-6">
        <v-alert v-if="errorSeleccion" type="error" density="compact" variant="tonal" class="mb-4">
          {{ errorSeleccion }}
        </v-alert>

        <!-- Paso 1: Búsqueda Predictiva en Padrón -->
        <div class="mb-4">
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-magnify" color="primary" class="mr-2" size="small" />
            <span class="text-subtitle-2 font-weight-bold text-primary">
              1. Búsqueda en Padrón Notarial
            </span>
          </div>
          <v-divider class="mb-3" />

          <v-text-field
            v-model="busqueda"
            label="Buscar por RFC, CURP o Nombre / Razón Social..."
            prepend-inner-icon="mdi-account-search-outline"
            variant="outlined"
            density="compact"
            clearable
            :loading="buscando"
            placeholder="Ingrese al menos 2 caracteres..."
            @update:model-value="buscar"
          />

          <!-- Resultados de Búsqueda -->
          <div v-if="resultados.length > 0" class="border rounded mb-3 overflow-hidden">
            <v-list density="compact" class="pa-0">
              <v-list-item
                v-for="item in resultados"
                :key="item.id"
                :active="comparecienteSeleccionado?.id === item.id"
                color="primary"
                class="py-2 cursor-pointer border-b"
                @click="seleccionarCompareciente(item)"
              >
                <template #prepend>
                  <v-avatar
                    :color="item.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
                    variant="tonal"
                    size="36"
                    class="font-weight-bold text-caption mr-3"
                  >
                    {{ getIniciales(item.nombre_completo) }}
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium text-body-2">
                  {{ item.nombre_completo }}
                </v-list-item-title>

                <v-list-item-subtitle class="d-flex align-center ga-2 mt-1">
                  <v-chip
                    :color="item.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
                    size="x-small"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    {{ item.tipo_persona === 'fisica' ? 'FÍSICA' : 'MORAL' }}
                  </v-chip>
                  <span v-if="item.rfc" style="font-family: monospace;" class="text-caption">
                    RFC: {{ item.rfc }}
                  </span>
                  <span v-if="item.identificador_secundario" style="font-family: monospace;" class="text-caption text-medium-emphasis">
                    | {{ item.identificador_secundario }}
                  </span>
                </v-list-item-subtitle>

                <template #append>
                  <v-icon
                    v-if="comparecienteSeleccionado?.id === item.id"
                    icon="mdi-check-circle"
                    color="primary"
                  />
                  <v-btn
                    v-else
                    variant="text"
                    size="small"
                    color="primary"
                    @click.stop="seleccionarCompareciente(item)"
                  >
                    Seleccionar
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <div v-else-if="busqueda.length >= 2 && !buscando" class="text-center py-4 border rounded mb-3 bg-surface">
            <p class="text-caption text-medium-emphasis mb-0">
              No se encontraron comparecientes con el criterio "{{ busqueda }}"
            </p>
          </div>

          <!-- Acceso directo para registrar nuevo -->
          <div class="d-flex align-center justify-space-between text-caption px-1">
            <span class="text-medium-emphasis">¿El otorgante no está registrado en el padrón?</span>
            <v-btn
              variant="text"
              size="small"
              color="primary"
              prepend-icon="mdi-account-plus-outline"
              @click="emit('open-crear')"
            >
              + Dar de alta en padrón
            </v-btn>
          </div>
        </div>

        <!-- Paso 2: Rol en el Instrumento Notarial y Alícuota -->
        <div v-if="comparecienteSeleccionado" class="mt-4">
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-file-certificate-outline" color="primary" class="mr-2" size="small" />
            <span class="text-subtitle-2 font-weight-bold text-primary">
              2. Rol en el Instrumento Notarial y Alícuota
            </span>
          </div>
          <v-divider class="mb-3" />

          <!-- Card de compareciente seleccionado -->
          <v-card variant="tonal" color="primary" class="pa-3 mb-4">
            <div class="d-flex align-center">
              <v-icon icon="mdi-account-check" color="primary" class="mr-3" />
              <div>
                <div class="font-weight-bold text-body-2 text-primary">
                  {{ comparecienteSeleccionado.nombre_completo }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ comparecienteSeleccionado.tipo_persona === 'fisica' ? 'Persona Física' : 'Persona Moral' }}
                  <span v-if="comparecienteSeleccionado.rfc"> · RFC: {{ comparecienteSeleccionado.rfc }}</span>
                </div>
              </div>
            </div>
          </v-card>

          <v-row>
            <v-col cols="12" :md="esAdquirente ? 7 : 12">
              <v-select
                v-model="rolId"
                label="Rol Notarial en el Acto *"
                :items="rolesDisponibles"
                item-title="nombre"
                item-value="id"
                variant="outlined"
                density="compact"
                placeholder="Seleccione el rol permitido"
                :hint="rolesDisponibles.length > 0 ? 'Roles autorizados para este acto jurídico' : 'No hay roles configurados para este acto'"
                persistent-hint
              />
            </v-col>
            <v-col v-if="esAdquirente" cols="12" md="5">
              <v-text-field
                v-model.number="porcentaje"
                label="Alícuota / Porcentaje (%)"
                placeholder="Ej. 50.00"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                variant="outlined"
                density="compact"
                hint="Opcional para copropiedad o derechos indivisos"
                persistent-hint
              />
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Pie del Modal -->
      <v-divider />
      <v-card-actions class="pa-4 justify-end ga-2">
        <v-btn
          variant="text"
          color="secondary"
          :disabled="loading"
          @click="emit('update:modelValue', false)"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!comparecienteSeleccionado || !rolId"
          :loading="loading"
          prepend-icon="mdi-link-variant"
          @click="confirmarVinculacion"
        >
          Asociar a Escritura
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
