<script setup lang="ts">
import { ref, watch } from 'vue'

export interface PersonaFisicaOption {
  id: string
  nombre: string
  rfc?: string | null
}

export interface RepresentanteItem {
  id?: string
  representanteFisicaId: string
  representanteNombre?: string
  tipoFacultades: string
  instrumentoPoder?: string | null
  fechaPoder?: string | null
  notarioPoder?: string | null
  vigente: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: RepresentanteItem[]
    personasFisicas?: PersonaFisicaOption[]
    disabled?: boolean
  }>(),
  {
    modelValue: () => [],
    personasFisicas: () => [],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [items: RepresentanteItem[]]
}>()

const showAddDialog = ref(false)

// Formulario de nuevo representante
const formFisicaId = ref('')
const formTipoFacultades = ref('Poder General para Actos de Dominio')
const formInstrumento = ref('')
const formFechaPoder = ref('')
const formNotario = ref('')
const formVigente = ref(true)
const formError = ref<string | null>(null)

const FACULTADES_PREDEFINIDAS = [
  'Poder General para Actos de Dominio',
  'Poder General para Actos de Administración',
  'Poder General para Pleitos y Cobranzas',
  'Poder Especial para Escrituración',
  'Poder Cambiario / Suscripción de Títulos',
]

function abrirDialogo(): void {
  formFisicaId.value = ''
  formTipoFacultades.value = 'Poder General para Actos de Dominio'
  formInstrumento.value = ''
  formFechaPoder.value = ''
  formNotario.value = ''
  formVigente.value = true
  formError.value = null
  showAddDialog.value = true
}

function agregarRepresentante(): void {
  if (!formFisicaId.value) {
    formError.value = 'Debe seleccionar una persona física del padrón'
    return
  }
  if (!formTipoFacultades.value.trim()) {
    formError.value = 'Debe especificar el tipo de facultades'
    return
  }

  // Verificar si ya existe esa persona con las mismas facultades
  const yaExiste = props.modelValue.some(
    (r) => r.representanteFisicaId === formFisicaId.value && r.tipoFacultades === formTipoFacultades.value,
  )
  if (yaExiste) {
    formError.value = 'Esta persona ya tiene asignado este tipo de facultad en la sociedad'
    return
  }

  const persona = props.personasFisicas.find((p) => p.id === formFisicaId.value)
  const nuevo: RepresentanteItem = {
    representanteFisicaId: formFisicaId.value,
    representanteNombre: persona?.nombre ?? 'Persona Física',
    tipoFacultades: formTipoFacultades.value.trim(),
    instrumentoPoder: formInstrumento.value.trim() || null,
    fechaPoder: formFechaPoder.value || null,
    notarioPoder: formNotario.value.trim() || null,
    vigente: formVigente.value,
  }

  emit('update:modelValue', [...props.modelValue, nuevo])
  showAddDialog.value = false
}

function eliminarRepresentante(index: number): void {
  const copia = [...props.modelValue]
  copia.splice(index, 1)
  emit('update:modelValue', copia)
}
</script>

<template>
  <div class="mb-4">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center">
        <v-icon icon="mdi-account-tie-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">
          Representantes Legales y Apoderados
        </span>
      </div>
      <v-btn
        size="small"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-account-plus"
        :disabled="disabled"
        @click="abrirDialogo"
      >
        Vincular Apoderado
      </v-btn>
    </div>
    <v-divider class="mb-3" />

    <!-- Lista de Representantes -->
    <div v-if="modelValue.length === 0" class="pa-4 bg-surface rounded text-center border">
      <p class="text-caption text-medium-emphasis mb-0">
        No se han vinculado representantes ni apoderados legales a esta persona moral.
      </p>
    </div>

    <v-table v-else density="compact" class="border rounded">
      <thead>
        <tr>
          <th>Apoderado / Representante</th>
          <th>Tipo de Facultades</th>
          <th>Instrumento / Notaría</th>
          <th>Vigente</th>
          <th class="text-right">Acción</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in modelValue" :key="idx">
          <td class="font-weight-medium">
            {{ item.representanteNombre || item.representanteFisicaId }}
          </td>
          <td>
            <v-chip size="x-small" color="primary" variant="outlined">
              {{ item.tipoFacultades }}
            </v-chip>
          </td>
          <td class="text-caption">
            <span v-if="item.instrumentoPoder">Doc: {{ item.instrumentoPoder }}</span>
            <span v-if="item.notarioPoder"> ({{ item.notarioPoder }})</span>
            <span v-if="!item.instrumentoPoder && !item.notarioPoder" class="text-medium-emphasis">—</span>
          </td>
          <td>
            <v-chip :color="item.vigente ? 'success' : 'grey'" size="x-small" variant="flat">
              {{ item.vigente ? 'Sí' : 'No' }}
            </v-chip>
          </td>
          <td class="text-right">
            <v-btn
              icon="mdi-delete-outline"
              size="x-small"
              color="error"
              variant="text"
              :disabled="disabled"
              title="Quitar apoderado"
              @click="eliminarRepresentante(idx)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <!-- Modal para Agregar Representante -->
    <v-dialog v-model="showAddDialog" max-width="560">
      <v-card>
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center">
          <v-icon icon="mdi-account-tie" class="mr-2" />
          <span class="text-subtitle-1 font-weight-bold">Vincular Apoderado Legal</span>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-alert v-if="formError" type="error" density="compact" variant="tonal" class="mb-3">
            {{ formError }}
          </v-alert>

          <v-select
            v-model="formFisicaId"
            label="Persona Física del Padrón *"
            :items="personasFisicas"
            item-title="nombre"
            item-value="id"
            variant="outlined"
            density="compact"
            class="mb-3"
            no-data-text="No hay personas físicas disponibles"
          />

          <v-combobox
            v-model="formTipoFacultades"
            label="Tipo de Facultades *"
            :items="FACULTADES_PREDEFINIDAS"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formInstrumento"
                label="Instrumento de Poder (No. Escritura)"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formFechaPoder"
                label="Fecha del Poder"
                type="date"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="formNotario"
            label="Notario / Fedatario del Poder"
            placeholder="Ej. Lic. Fernando Ortiz, Notario 18 CDMX"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-switch
            v-model="formVigente"
            label="Poder Notarial Vigente"
            color="primary"
            density="compact"
            hide-details
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 justify-end ga-2">
          <v-btn variant="text" @click="showAddDialog = false">Cancelar</v-btn>
          <v-btn color="primary" variant="elevated" @click="agregarRepresentante">
            Vincular
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
