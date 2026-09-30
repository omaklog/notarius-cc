<template>
  <v-dialog
    :model-value="modelValue"
    max-width="840"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="rounded-xl border shadow-lg bg-surface">
      <!-- Header -->
      <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-2">
          <v-icon size="22">mdi-pencil-box-multiple-outline</v-icon>
          <span class="text-h6 font-weight-bold">Redactar Notificación Notarial</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          color="white"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-card-text class="pa-5">
        <v-form ref="formRef" @submit.prevent="enviar(true)">
          <!-- 1. Plantilla Notarial Base -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Plantilla Notarial Base (Opcional)
            </label>
            <v-select
              v-model="plantillaSeleccionadaId"
              :items="opcionesPlantillas"
              item-title="nombre"
              item-value="id"
              placeholder="Seleccione una plantilla o redacte mensaje libre..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-file-document-outline"
              @update:model-value="onSeleccionarPlantilla"
            />
          </div>

          <!-- 2. Canal de Transmisión -->
          <div class="mb-4">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Canal de Transmisión
            </label>
            <v-btn-toggle
              v-model="form.canal"
              mandatory
              color="primary"
              variant="outlined"
              density="compact"
              class="w-100 rounded-lg"
            >
              <v-btn value="whatsapp" class="flex-1 text-none">
                <v-icon start color="success" size="18">mdi-whatsapp</v-icon>
                WhatsApp (Desktop / Web)
              </v-btn>
              <v-btn value="correo" class="flex-1 text-none">
                <v-icon start color="primary" size="18">mdi-email-outline</v-icon>
                Correo Electrónico
              </v-btn>
              <v-btn value="sms" class="flex-1 text-none">
                <v-icon start color="grey-darken-1" size="18">mdi-message-text-outline</v-icon>
                SMS
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- 3. Selección y Autocompletado de Compareciente / Cliente -->
          <div v-if="!props.comparecientePreseleccionado" class="mb-3">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Buscar Compareciente / Cliente Registrado (Opcional)
            </label>
            <v-autocomplete
              v-model="comparecienteSeleccionado"
              :items="listaComparecientes"
              :loading="buscandoComparecientes"
              item-title="nombre"
              return-object
              placeholder="Buscar por nombre del cliente..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-account-search-outline"
              @update:model-value="onSeleccionarCompareciente"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item
                  v-bind="itemProps"
                  :title="item.raw.nombre"
                  :subtitle="item.raw.telefono ? `📞 ${item.raw.telefono} ${item.raw.email ? '| ✉️ ' + item.raw.email : ''}` : (item.raw.email ? `✉️ ${item.raw.email}` : 'Sin datos de contacto')"
                />
              </template>
            </v-autocomplete>
          </div>

          <!-- Selector de Escrituras Activas del Cliente (si se encontraron y no hay una fija) -->
          <div v-if="!props.escrituraIdPreseleccionada && escriturasAsociadas.length > 0" class="mb-3">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Vincular a Escritura Activa del Cliente
            </label>
            <v-select
              v-model="form.escritura_id"
              :items="escriturasAsociadas"
              item-title="label"
              item-value="id"
              placeholder="Seleccionar escritura para asociar el aviso..."
              variant="outlined"
              density="compact"
              clearable
              hide-details
              prepend-inner-icon="mdi-file-certificate-outline"
            />
          </div>

          <!-- 4. Destinatario y Contacto -->
          <v-row density="compact" class="mb-2">
            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Destinatario (Nombre Completo) *
              </label>
              <v-text-field
                v-model="form.destinatario_nombre"
                placeholder="Ej. Dr. Mauricio Gómez Alcántara"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="[v => !!v || 'El nombre es obligatorio']"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
                Contacto ({{ form.canal === 'correo' ? 'Correo Electrónico' : 'Teléfono Celular' }}) *
              </label>
              <v-text-field
                v-model="form.destinatario_contacto"
                :placeholder="form.canal === 'correo' ? 'cliente@dominio.com' : '5512345678 (10 dígitos)'"
                variant="outlined"
                density="compact"
                hide-details="auto"
                :rules="[v => !!v || 'El contacto es obligatorio']"
              />
            </v-col>
          </v-row>

          <!-- 5. Asunto (si aplica) -->
          <div v-if="form.canal === 'correo' || form.asunto" class="mb-3">
            <label class="text-caption font-weight-bold text-grey-darken-2 d-block mb-1">
              Asunto del Mensaje
            </label>
            <v-text-field
              v-model="form.asunto"
              placeholder="Asunto formal de la comunicación..."
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <!-- 6. Cuerpo del Mensaje -->
          <div class="mb-3">
            <div class="d-flex justify-space-between align-center mb-1">
              <label class="text-caption font-weight-bold text-grey-darken-2">
                Cuerpo del Mensaje *
              </label>
              <span v-if="form.canal === 'sms'" class="text-caption font-monospace text-grey">
                {{ form.cuerpo.length }}/160 caracteres
              </span>
            </div>
            <v-textarea
              v-model="form.cuerpo"
              rows="4"
              variant="outlined"
              density="compact"
              hide-details="auto"
              placeholder="Escriba el texto del aviso notarial..."
              :rules="[v => !!v || 'El mensaje no puede estar vacío']"
            />
          </div>

          <!-- 7. Subida de Archivos Adjuntos Locales -->
          <div class="mb-4">
            <div class="d-flex justify-space-between align-center mb-1">
              <label class="text-caption font-weight-bold text-grey-darken-2">
                Archivos Adjuntos (PDFs, Cédulas, Comprobantes de Pago)
              </label>
              <span class="text-caption text-grey">Subidos a almacenamiento seguro</span>
            </div>

            <v-file-input
              v-model="archivosSeleccionados"
              multiple
              variant="outlined"
              density="compact"
              prepend-icon=""
              prepend-inner-icon="mdi-paperclip"
              placeholder="Seleccionar archivos desde la computadora..."
              chips
              show-size
              hide-details
              :loading="subiendoArchivos"
              @update:model-value="onArchivosCargados"
            />

            <!-- Lista de archivos ya procesados -->
            <div v-if="form.archivos_adjuntos && form.archivos_adjuntos.length > 0" class="mt-2 d-flex flex-wrap ga-2">
              <v-chip
                v-for="(adjunto, idx) in form.archivos_adjuntos"
                :key="idx"
                closable
                size="small"
                color="primary"
                variant="outlined"
                @click:close="removerAdjunto(idx)"
              >
                <v-icon start size="14">mdi-file-check-outline</v-icon>
                {{ adjunto.nombre }}
              </v-chip>
            </div>
          </div>

          <!-- 8. Previsualización y Advertencia de WhatsApp Desktop / Web -->
          <v-alert
            v-if="form.canal === 'whatsapp'"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-whatsapp"
            class="rounded-lg text-caption mb-2"
          >
            Al pulsar <strong>Despachar y Abrir WhatsApp Desktop</strong>, el sistema abrirá prioritariamente la aplicación instalada en su Mac / Windows (<code>whatsapp://send</code>). También puede pulsar <strong>WhatsApp Web</strong> si prefiere gestionarlo en el navegador.
          </v-alert>

          <!-- Error Alert si ocurre -->
          <v-alert
            v-if="errorDespacho"
            type="error"
            variant="tonal"
            density="compact"
            class="rounded-lg text-caption mb-2"
          >
            {{ errorDespacho }}
          </v-alert>
        </v-form>
      </v-card-text>

      <!-- Footer Actions -->
      <v-card-actions class="pa-4 bg-surface-light border-t d-flex justify-space-between">
        <v-btn
          variant="text"
          color="grey-darken-1"
          class="text-none"
          @click="$emit('update:modelValue', false)"
        >
          Cancelar
        </v-btn>

        <div v-if="form.canal === 'whatsapp'" class="d-flex ga-2">
          <v-btn
            variant="outlined"
            color="success"
            class="text-none font-weight-medium"
            :loading="Boolean(enviando || subiendoArchivos)"
            prepend-icon="mdi-web"
            @click="enviar(false)"
          >
            WhatsApp Web
          </v-btn>
          <v-btn
            color="success"
            variant="flat"
            class="text-none font-weight-medium px-4"
            :loading="Boolean(enviando || subiendoArchivos)"
            prepend-icon="mdi-whatsapp"
            @click="enviar(true)"
          >
            Despachar y Abrir WhatsApp Desktop
          </v-btn>
        </div>

        <v-btn
          v-else
          color="primary"
          variant="flat"
          class="text-none font-weight-medium px-4"
          :loading="Boolean(enviando || subiendoArchivos)"
          :prepend-icon="form.canal === 'correo' ? 'mdi-email-send-outline' : 'mdi-send'"
          @click="enviar()"
        >
          Despachar Notificación
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useNotificaciones } from '~/composables/useNotificaciones'
import { useSupabaseClient } from '#imports'
import { interpolarTexto } from '~/utils/interpoladorNotificaciones'
import type {
  PlantillaNotificacion,
  CanalNotificacion,
  ArchivoAdjuntoNotificacion,
  PayloadEnviarNotificacion,
  ComparecienteOpcionNotificacion,
} from '~/types/notificaciones'

const props = defineProps<{
  modelValue: boolean
  plantillas?: PlantillaNotificacion[]
  escrituraIdPreseleccionada?: string
  comparecientePreseleccionado?: {
    id?: string
    nombre: string
    contacto: string
    canal?: CanalNotificacion
  }
  plantillaPreseleccionadaCodigo?: string
  variablesPrecalculadas?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'enviado'): void
}>()

const { enviarNotificacion, subirArchivoAdjunto, enviando } = useNotificaciones()

let supabase: any = null
try {
  supabase = useSupabaseClient()
} catch {
  // Entornos de prueba o SSR sin cliente Supabase
}

const formRef = ref<any>(null)
const plantillaSeleccionadaId = ref<string | null>(null)
const archivosSeleccionados = ref<File[]>([])
const subiendoArchivos = ref(false)
const errorDespacho = ref<string | null>(null)

const listaComparecientes = ref<ComparecienteOpcionNotificacion[]>([])
const buscandoComparecientes = ref(false)
const comparecienteSeleccionado = ref<ComparecienteOpcionNotificacion | null>(null)
const escriturasAsociadas = ref<{ id: string; label: string }[]>([])

const form = reactive<PayloadEnviarNotificacion>({
  canal: 'whatsapp',
  destinatario_nombre: '',
  destinatario_contacto: '',
  asunto: '',
  cuerpo: '',
  escritura_id: props.escrituraIdPreseleccionada,
  compareciente_id: props.comparecientePreseleccionado?.id,
  archivos_adjuntos: [],
  variables: {},
})

const opcionesPlantillas = computed(() => {
  return props.plantillas || []
})

async function cargarCatalogoComparecientes() {
  if (!supabase) return
  buscandoComparecientes.value = true
  try {
    const q = supabase.from?.('comparecientes')
    if (!q?.select) {
      buscandoComparecientes.value = false
      return
    }

    let qSelect = q.select('id, nombre, email, telefono, tipo_persona')
    if (qSelect?.order) {
      qSelect = qSelect.order('nombre', { ascending: true })
    }
    if (qSelect?.limit) {
      qSelect = qSelect.limit(100)
    }

    const { data, error } = await qSelect

    if (!error && data) {
      listaComparecientes.value = data
    }
  } catch (err) {
    console.error('Error cargando catálogo de comparecientes:', err)
  } finally {
    buscandoComparecientes.value = false
  }
}

async function cargarEscriturasDeCompareciente(comparecienteId: string) {
  if (!supabase || !comparecienteId) return
  try {
    const q = supabase.from?.('escritura_comparecientes')
    if (!q?.select) return

    let qSelect = q.select(`
        escritura_id,
        escrituras (
          id,
          instrumento,
          anio,
          estatus
        )
      `)
    if (qSelect?.eq) {
      qSelect = qSelect.eq('compareciente_id', comparecienteId)
    }

    const { data, error } = await qSelect

    if (!error && data) {
      const items: { id: string; label: string }[] = []
      for (const row of data as any[]) {
        const esc = row.escrituras
        if (esc) {
          items.push({
            id: esc.id,
            label: `Escritura #${esc.instrumento} (${esc.anio || new Date().getFullYear()}) - ${esc.estatus || 'En proceso'}`,
          })
        }
      }
      escriturasAsociadas.value = items
      if (items.length === 1 && !form.escritura_id) {
        form.escritura_id = items[0].id
      }
    }
  } catch (err) {
    console.error('Error cargando escrituras del compareciente:', err)
  }
}



function onSeleccionarCompareciente(cliente: ComparecienteOpcionNotificacion | null) {
  if (!cliente) {
    escriturasAsociadas.value = []
    return
  }
  form.compareciente_id = cliente.id
  form.destinatario_nombre = cliente.nombre
  if (form.canal === 'correo') {
    form.destinatario_contacto = cliente.email || cliente.telefono || ''
  } else {
    form.destinatario_contacto = cliente.telefono || cliente.email || ''
  }
  cargarEscriturasDeCompareciente(cliente.id)
}

function onSeleccionarPlantilla(plantillaId: string | null) {
  if (!plantillaId) return
  const p = props.plantillas?.find(item => item.id === plantillaId)
  if (p) {
    form.plantilla_id = p.id
    form.canal = p.canal
    form.asunto = p.asunto || ''
    form.cuerpo = p.cuerpo

    if (form.variables && Object.keys(form.variables).length > 0) {
      form.cuerpo = interpolarTexto(p.cuerpo, form.variables)
    }
  }
}

function aplicarPreselecciones() {
  if (props.escrituraIdPreseleccionada) {
    form.escritura_id = props.escrituraIdPreseleccionada
  }

  if (props.comparecientePreseleccionado) {
    form.destinatario_nombre = props.comparecientePreseleccionado.nombre
    form.destinatario_contacto = props.comparecientePreseleccionado.contacto
    if (props.comparecientePreseleccionado.id) {
      form.compareciente_id = props.comparecientePreseleccionado.id
    }
    if (props.comparecientePreseleccionado.canal) {
      form.canal = props.comparecientePreseleccionado.canal
    }
  }

  if (props.plantillaPreseleccionadaCodigo && props.plantillas) {
    const p = props.plantillas.find(item => item.codigo === props.plantillaPreseleccionadaCodigo)
    if (p) {
      plantillaSeleccionadaId.value = p.id
      form.plantilla_id = p.id
      form.canal = p.canal
      form.asunto = p.asunto || ''
      form.cuerpo = p.cuerpo
    }
  }

  if (props.variablesPrecalculadas) {
    form.variables = { ...(form.variables || {}), ...props.variablesPrecalculadas }
    if (form.cuerpo) {
      form.cuerpo = interpolarTexto(form.cuerpo, form.variables)
    }
  }
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      errorDespacho.value = null
      cargarCatalogoComparecientes()
      aplicarPreselecciones()
    }
  },
  { immediate: true }
)

watch(
  () => props.comparecientePreseleccionado,
  (val) => {
    if (val) {
      form.destinatario_nombre = val.nombre
      form.destinatario_contacto = val.contacto
      if (val.id) form.compareciente_id = val.id
      if (val.canal) form.canal = val.canal
    }
  }
)

onMounted(() => {
  if (props.modelValue) {
    cargarCatalogoComparecientes()
    aplicarPreselecciones()
  }
})

async function onArchivosCargados(files: File | File[]) {
  const lista = Array.isArray(files) ? files : files ? [files] : []
  if (lista.length === 0) return

  subiendoArchivos.value = true
  try {
    for (const f of lista) {
      const subido = await subirArchivoAdjunto(f)
      if (!form.archivos_adjuntos) form.archivos_adjuntos = []
      form.archivos_adjuntos.push(subido)
    }
  } finally {
    subiendoArchivos.value = false
    archivosSeleccionados.value = []
  }
}

function removerAdjunto(idx: number) {
  form.archivos_adjuntos?.splice(idx, 1)
}

async function enviar(preferirNativo: boolean = true) {
  errorDespacho.value = null
  if (formRef.value) {
    const valid = await formRef.value.validate()
    if (!valid.valid && !form.destinatario_contacto) return
  }

  const res = await enviarNotificacion({
    ...form,
  })

  if (res.ok) {
    if (form.canal === 'whatsapp' && typeof window !== 'undefined') {
      if (!preferirNativo && res.whatsapp_web_url) {
        window.open(res.whatsapp_web_url, '_blank')
      } else if (preferirNativo && res.whatsapp_native_url) {
        window.location.href = res.whatsapp_native_url
      }
    }
    emit('enviado')
    emit('update:modelValue', false)
  } else {
    errorDespacho.value = res.error || 'Error al despachar notificación.'
  }
}

defineExpose({
  form,
  enviar,
  onSeleccionarCompareciente,
  cargarEscriturasDeCompareciente,
  escriturasAsociadas,
  listaComparecientes,
})
</script>

