<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useSupabaseClient } from '#imports'

definePageMeta({ middleware: 'require-admin' })

export interface TipoIdentificacionRow {
  id: string
  codigo: string
  nombre: string
  permite_ocr: boolean
  requiere_reverso: boolean
  activo: boolean
  created_at: string
}

const supabase = useSupabaseClient()

const items = ref<TipoIdentificacionRow[]>([])
const loading = ref(true)
const searchQuery = ref('')
const filterStatus = ref<'todos' | 'activos' | 'inactivos'>('todos')
const showDialog = ref(false)
const editingItem = ref<TipoIdentificacionRow | null>(null)
const guardando = ref(false)
const errorMessage = ref<string | null>(null)
const formError = ref<string | null>(null)

// Form fields
const formCodigo = ref('')
const formNombre = ref('')
const formPermiteOcr = ref(false)
const formRequiereReverso = ref(false)
const formActivo = ref(true)

const headers = [
  { title: 'Código', key: 'codigo', sortable: true, width: '140px' },
  { title: 'Nombre Oficial', key: 'nombre', sortable: true },
  { title: 'Permite OCR', key: 'permite_ocr', sortable: true, width: '150px' },
  { title: 'Requiere Reverso', key: 'requiere_reverso', sortable: true, width: '160px' },
  { title: 'Estatus', key: 'activo', sortable: true, width: '120px' },
  { title: 'Acciones', key: 'acciones', sortable: false, width: '120px', align: 'end' as const },
]

const itemsFiltrados = computed(() => {
  return items.value.filter((item) => {
    const matchesSearch =
      !searchQuery.value ||
      item.nombre.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus =
      filterStatus.value === 'todos' ||
      (filterStatus.value === 'activos' && item.activo) ||
      (filterStatus.value === 'inactivos' && !item.activo)

    return matchesSearch && matchesStatus
  })
})

async function cargarDatos(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  try {
    const { data, error } = await supabase
      .from('tipos_identificacion_oficial')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) throw error
    items.value = (data as TipoIdentificacionRow[]) ?? []
  } catch (err: any) {
    errorMessage.value = err.message || 'Error al cargar tipos de identificación'
  } finally {
    loading.value = false
  }
}

function abrirNuevo(): void {
  editingItem.value = null
  formCodigo.value = ''
  formNombre.value = ''
  formPermiteOcr.value = false
  formRequiereReverso.value = false
  formActivo.value = true
  formError.value = null
  showDialog.value = true
}

function abrirEditar(item: TipoIdentificacionRow): void {
  editingItem.value = item
  formCodigo.value = item.codigo
  formNombre.value = item.nombre
  formPermiteOcr.value = item.permite_ocr
  formRequiereReverso.value = item.requiere_reverso
  formActivo.value = item.activo
  formError.value = null
  showDialog.value = true
}

async function toggleOcrDirecto(item: TipoIdentificacionRow, nuevoValor: boolean): Promise<void> {
  try {
    const updatePayload: Partial<TipoIdentificacionRow> = { permite_ocr: nuevoValor }
    if (!nuevoValor) {
      updatePayload.requiere_reverso = false
    }

    const { error } = await supabase
      .from('tipos_identificacion_oficial')
      .update(updatePayload)
      .eq('id', item.id)

    if (error) throw error
    item.permite_ocr = nuevoValor
    if (!nuevoValor) item.requiere_reverso = false
  } catch (err: any) {
    errorMessage.value = err.message || 'No fue posible actualizar la configuración OCR'
  }
}

async function toggleReversoDirecto(item: TipoIdentificacionRow, nuevoValor: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('tipos_identificacion_oficial')
      .update({ requiere_reverso: nuevoValor })
      .eq('id', item.id)

    if (error) throw error
    item.requiere_reverso = nuevoValor
  } catch (err: any) {
    errorMessage.value = err.message || 'No fue posible actualizar el requerimiento de reverso'
  }
}

async function guardar(): Promise<void> {
  formError.value = null
  const nombreLimpio = formNombre.value.trim()
  const codigoLimpio = formCodigo.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

  if (!nombreLimpio) {
    formError.value = 'El nombre oficial es obligatorio'
    return
  }

  if (!codigoLimpio) {
    formError.value = 'El código identificador es obligatorio'
    return
  }

  guardando.value = true
  try {
    if (editingItem.value) {
      const { error } = await supabase
        .from('tipos_identificacion_oficial')
        .update({
          nombre: nombreLimpio,
          permite_ocr: formPermiteOcr.value,
          requiere_reverso: formPermiteOcr.value ? formRequiereReverso.value : false,
          activo: formActivo.value,
        })
        .eq('id', editingItem.value.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('tipos_identificacion_oficial')
        .insert({
          codigo: codigoLimpio,
          nombre: nombreLimpio,
          permite_ocr: formPermiteOcr.value,
          requiere_reverso: formPermiteOcr.value ? formRequiereReverso.value : false,
          activo: formActivo.value,
        })

      if (error) throw error
    }

    showDialog.value = false
    await cargarDatos()
  } catch (err: any) {
    formError.value = err.message || 'Error al guardar el tipo de identificación'
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  cargarDatos()
})
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Header y Breadcrumb -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">
          Inicio &gt; Administración General &gt; Catálogos &gt; Tipos de Identificación
        </div>
        <h1 class="text-h5 font-weight-bold" style="color: #1b3a5f">
          Catálogo de Tipos de Identificación Oficial
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Configuración paramétrica de documentos de identidad válidos para la fe pública notarial y reglas de lectura OCR.
        </p>
      </div>

      <v-btn
        color="#1B3A5F"
        class="text-white font-weight-medium mt-2 mt-sm-0"
        prepend-icon="mdi-plus"
        elevation="1"
        @click="abrirNuevo"
      >
        Nuevo Tipo
      </v-btn>
    </div>

    <!-- Alerta de error -->
    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="errorMessage = null"
    >
      {{ errorMessage }}
    </v-alert>

    <!-- Filtros y Búsqueda -->
    <v-card variant="outlined" class="mb-4 bg-white" rounded="lg">
      <v-card-text class="py-3">
        <v-row density="compact" align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              placeholder="Buscar por código o nombre..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              hide-details
              clearable
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn-toggle
              v-model="filterStatus"
              mandatory
              density="compact"
              color="#1B3A5F"
              variant="outlined"
            >
              <v-btn value="todos">Todos</v-btn>
              <v-btn value="activos">Activos</v-btn>
              <v-btn value="inactivos">Inactivos</v-btn>
            </v-btn-toggle>
          </v-col>
          <v-col cols="12" md="2" class="text-right">
            <v-btn
              variant="text"
              density="compact"
              prepend-icon="mdi-refresh"
              :loading="loading"
              @click="cargarDatos"
            >
              Recargar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Tabla Principal -->
    <v-card variant="outlined" class="bg-white" rounded="lg">
      <v-data-table
        :headers="headers"
        :items="itemsFiltrados"
        :loading="loading"
        density="comfortable"
        no-data-text="No hay tipos de identificación registrados"
        loading-text="Cargando catálogo..."
      >
        <template #item.codigo="{ item }">
          <v-chip
            size="small"
            variant="tonal"
            color="#1B3A5F"
            class="font-weight-bold"
            style="font-family: monospace"
          >
            {{ item.codigo }}
          </v-chip>
        </template>

        <template #item.nombre="{ item }">
          <div class="font-weight-medium">{{ item.nombre }}</div>
        </template>

        <template #item.permite_ocr="{ item }">
          <v-switch
            :model-value="item.permite_ocr"
            color="#1B3A5F"
            density="compact"
            hide-details
            @update:model-value="(val) => toggleOcrDirecto(item, !!val)"
          >
            <template #label>
              <span class="text-caption font-weight-medium">
                {{ item.permite_ocr ? 'Habilitado' : 'Manual' }}
              </span>
            </template>
          </v-switch>
        </template>

        <template #item.requiere_reverso="{ item }">
          <v-switch
            :model-value="item.requiere_reverso"
            :disabled="!item.permite_ocr"
            color="#A9762E"
            density="compact"
            hide-details
            @update:model-value="(val) => toggleReversoDirecto(item, !!val)"
          >
            <template #label>
              <span class="text-caption font-weight-medium">
                {{ item.requiere_reverso ? '2 caras' : '1 cara' }}
              </span>
            </template>
          </v-switch>
        </template>

        <template #item.activo="{ item }">
          <v-chip
            size="small"
            :color="item.activo ? 'success' : 'grey'"
            variant="tonal"
            class="font-weight-medium"
          >
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </template>

        <template #item.acciones="{ item }">
          <v-btn
            icon="mdi-pencil-outline"
            size="small"
            variant="text"
            color="#1B3A5F"
            @click="abrirEditar(item)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal de Edición / Alta -->
    <v-dialog v-model="showDialog" max-width="560px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4 d-flex align-center justify-space-between bg-grey-lighten-4">
          <span class="text-subtitle-1 font-weight-bold" style="color: #1b3a5f">
            {{ editingItem ? 'Editar Tipo de Identificación' : 'Nuevo Tipo de Identificación' }}
          </span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ formError }}
          </v-alert>

          <v-row density="compact">
            <v-col cols="12" sm="5">
              <v-text-field
                v-model="formCodigo"
                label="Código Identificador *"
                placeholder="ej. ine, pasaporte"
                density="compact"
                variant="outlined"
                :disabled="!!editingItem"
                hint="Identificador único en minúsculas"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="7">
              <v-text-field
                v-model="formNombre"
                label="Nombre Oficial *"
                placeholder="ej. Credencial para Votar (INE)"
                density="compact"
                variant="outlined"
              />
            </v-col>

            <v-col cols="12" class="mt-3">
              <v-card variant="tonal" color="primary" class="pa-3" rounded="md">
                <div class="text-subtitle-2 font-weight-bold mb-2" style="color: #1b3a5f">
                  Reglas del Asistente OCR
                </div>

                <v-switch
                  v-model="formPermiteOcr"
                  label="Permitir Extracción OCR con Visión Multimodal"
                  color="#1B3A5F"
                  density="compact"
                  hide-details
                  class="mb-2"
                />
                <p class="text-caption text-medium-emphasis mb-3 ml-8">
                  Habilita el escaneo automatizado para pre-llenar los datos de compareciente.
                </p>

                <v-switch
                  v-model="formRequiereReverso"
                  :disabled="!formPermiteOcr"
                  label="Requiere Fotografía de Reverso Obligatoria"
                  color="#A9762E"
                  density="compact"
                  hide-details
                />
                <p class="text-caption text-medium-emphasis mb-0 ml-8">
                  Solicita anverso y reverso (necesario para credenciales INE/IFE).
                </p>
              </v-card>
            </v-col>

            <v-col cols="12" class="mt-2">
              <v-switch
                v-model="formActivo"
                label="Documento Activo en la Notaría"
                color="success"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            variant="text"
            color="grey-darken-1"
            :disabled="guardando"
            @click="showDialog = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="#1B3A5F"
            class="text-white px-5"
            :loading="guardando"
            @click="guardar"
          >
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
