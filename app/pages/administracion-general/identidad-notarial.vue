<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useConfiguracionNotarial } from '~/composables/useConfiguracionNotarial'
import type { ActualizarConfiguracionPayload } from '~/types/configuracion'

definePageMeta({ middleware: 'require-admin' })

const {
  configuracion,
  cargando,
  guardando,
  subiendoActivo,
  error: composableError,
  nombreNotariaCompleto,
  titularCompleto,
  domicilioCompleto,
  cargarConfiguracion,
  guardarConfiguracion,
  subirActivoGrafico,
  eliminarActivoGrafico,
  interpoladorLeyenda
} = useConfiguracionNotarial()

const activeTab = ref(0)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')
const formError = ref<string | null>(null)

// Formulario reactivo
const form = reactive<ActualizarConfiguracionPayload>({
  numero_notaria: 1,
  entidad_federativa: '',
  municipio: '',
  distrito_judicial: '',
  notario_titular_titulo: 'Lic.',
  notario_titular_nombre: '',
  patente_fiat_numero: '',
  patente_fiat_fecha: '',
  notario_suplente_nombre: '',
  regimen_asociacion: 'Titular Único',

  domicilio_calle: '',
  domicilio_num_ext: '',
  domicilio_num_int: '',
  domicilio_colonia: '',
  domicilio_codigo_postal: '',

  telefono_principal: '',
  telefono_secundario: '',
  correo_contacto: '',
  sitio_web: '',

  leyenda_encabezado: '',
  leyenda_lema: '',
  leyenda_cierre_volumen: '',
})

// Variables para carga de activos gráficos
const selectedLogoFile = ref<File | null>(null)
const logoPreviewUrl = ref<string | null>(null)

const selectedSelloFile = ref<File | null>(null)
const selloPreviewUrl = ref<string | null>(null)

const confirmDeleteDialog = ref(false)
const deleteTipo = ref<'logotipo' | 'sello'>('logotipo')

// Catálogo de regímenes de asociación
const opcionesRegimen = [
  'Titular Único',
  'Asociación Notarial',
  'Convenio de Suplencia',
  'Notaría Asociada'
]

// Lista de variables interactivas para leyendas
const tagsVariables = [
  { tag: '{numero_volumen}', label: 'Núm. Volumen' },
  { tag: '{escrituras_validas}', label: 'Escrituras Válidas' },
  { tag: '{escrituras_canceladas}', label: 'Escrituras Canceladas' },
  { tag: '{folios_totales}', label: 'Folios Totales' },
  { tag: '{nombre_notario}', label: 'Nombre Notario' },
  { tag: '{numero_notaria}', label: 'Núm. Notaría' },
  { tag: '{entidad}', label: 'Entidad' },
  { tag: '{municipio}', label: 'Municipio' },
  { tag: '{fecha_cierre}', label: 'Fecha Cierre' }
]

function notificar(msg: string, color = 'success') {
  snackbarText.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function sincronizarFormulario() {
  const conf = configuracion.value
  if (!conf) return

  form.numero_notaria = conf.numero_notaria ?? 1
  form.entidad_federativa = conf.entidad_federativa ?? ''
  form.municipio = conf.municipio ?? ''
  form.distrito_judicial = conf.distrito_judicial ?? ''
  form.notario_titular_titulo = conf.notario_titular_titulo ?? 'Lic.'
  form.notario_titular_nombre = conf.notario_titular_nombre ?? ''
  form.patente_fiat_numero = conf.patente_fiat_numero ?? ''
  form.patente_fiat_fecha = conf.patente_fiat_fecha ?? ''
  form.notario_suplente_nombre = conf.notario_suplente_nombre ?? ''
  form.regimen_asociacion = conf.regimen_asociacion ?? 'Titular Único'

  form.domicilio_calle = conf.domicilio_calle ?? ''
  form.domicilio_num_ext = conf.domicilio_num_ext ?? ''
  form.domicilio_num_int = conf.domicilio_num_int ?? ''
  form.domicilio_colonia = conf.domicilio_colonia ?? ''
  form.domicilio_codigo_postal = conf.domicilio_codigo_postal ?? ''

  form.telefono_principal = conf.telefono_principal ?? ''
  form.telefono_secundario = conf.telefono_secundario ?? ''
  form.correo_contacto = conf.correo_contacto ?? ''
  form.sitio_web = conf.sitio_web ?? ''

  form.leyenda_encabezado = conf.leyenda_encabezado ?? ''
  form.leyenda_lema = conf.leyenda_lema ?? ''
  form.leyenda_cierre_volumen = conf.leyenda_cierre_volumen ?? ''
}

onMounted(async () => {
  await cargarConfiguracion()
  sincronizarFormulario()
})

async function handleGuardar() {
  formError.value = null

  if (!form.numero_notaria || form.numero_notaria <= 0) {
    formError.value = 'El número de notaría debe ser un entero positivo mayor a cero.'
    notificar(formError.value, 'error')
    return
  }
  if (!form.entidad_federativa?.trim()) {
    formError.value = 'La entidad federativa es obligatoria.'
    notificar(formError.value, 'error')
    return
  }
  if (!form.municipio?.trim()) {
    formError.value = 'El municipio es obligatorio.'
    notificar(formError.value, 'error')
    return
  }
  if (!form.notario_titular_nombre?.trim()) {
    formError.value = 'El nombre del notario titular es obligatorio.'
    notificar(formError.value, 'error')
    return
  }

  try {
    await guardarConfiguracion(form)
    notificar('Configuración notarial actualizada exitosamente')
  } catch (e: any) {
    formError.value = e?.message || 'Error al guardar la configuración'
    notificar(formError.value, 'error')
  }
}

// Manejadores para activos gráficos
function onLogoSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    notificar('Solo se permiten archivos PNG, JPG o SVG.', 'warning')
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    notificar('El archivo excede el límite máximo de 3MB.', 'warning')
    return
  }

  selectedLogoFile.value = file
  logoPreviewUrl.value = URL.createObjectURL(file)
}

async function handleSubirLogo() {
  if (!selectedLogoFile.value) return
  try {
    await subirActivoGrafico(selectedLogoFile.value, 'logotipo')
    selectedLogoFile.value = null
    logoPreviewUrl.value = null
    notificar('Logotipo institucional cargado correctamente')
  } catch (e: any) {
    notificar(e?.message || 'Error al subir logotipo', 'error')
  }
}

function onSelloSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const allowed = ['image/png', 'image/jpeg', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    notificar('Solo se permiten archivos PNG, JPG o SVG.', 'warning')
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    notificar('El archivo excede el límite máximo de 3MB.', 'warning')
    return
  }

  selectedSelloFile.value = file
  selloPreviewUrl.value = URL.createObjectURL(file)
}

async function handleSubirSello() {
  if (!selectedSelloFile.value) return
  try {
    await subirActivoGrafico(selectedSelloFile.value, 'sello')
    selectedSelloFile.value = null
    selloPreviewUrl.value = null
    notificar('Facsímil del sello notarial cargado correctamente')
  } catch (e: any) {
    notificar(e?.message || 'Error al subir sello', 'error')
  }
}

function confirmarEliminarActivo(tipo: 'logotipo' | 'sello') {
  deleteTipo.value = tipo
  confirmDeleteDialog.value = true
}

async function ejecutarEliminarActivo() {
  try {
    await eliminarActivoGrafico(deleteTipo.value)
    confirmDeleteDialog.value = false
    if (deleteTipo.value === 'logotipo') {
      selectedLogoFile.value = null
      logoPreviewUrl.value = null
    } else {
      selectedSelloFile.value = null
      selloPreviewUrl.value = null
    }
    notificar(`${deleteTipo.value === 'logotipo' ? 'Logotipo' : 'Sello'} eliminado con éxito`)
  } catch (e: any) {
    notificar(e?.message || 'Error al eliminar activo gráfico', 'error')
  }
}

// Inserción interactiva de tags
function insertarTag(tag: string) {
  if (!form.leyenda_cierre_volumen) {
    form.leyenda_cierre_volumen = tag
  } else {
    form.leyenda_cierre_volumen += ` ${tag}`
  }
}

// Previsualización de fórmula interpolada
const vistaPreviaInterpolada = computed(() => {
  if (!form.leyenda_cierre_volumen) return 'No se ha configurado ninguna leyenda de cierre.'
  return interpoladorLeyenda(form.leyenda_cierre_volumen, {
    numero_volumen: '42',
    escrituras_validas: '15',
    escrituras_canceladas: '1',
    folios_totales: '200',
    nombre_notario: form.notario_titular_nombre || 'Notario Titular',
    fecha_cierre: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  })
})
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Encabezado Stitch Notarial -->
    <div class="d-flex flex-column flex-md-row justify-space-between align-md-center mb-6">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">
          Inicio &gt; Administración General &gt; Identidad Notarial
        </div>
        <div class="d-flex align-center">
          <v-avatar color="#1B3A5F" size="40" rounded="md" class="mr-3">
            <v-icon color="white" size="24">mdi-scale-balance</v-icon>
          </v-avatar>
          <div>
            <h1 class="text-h5 font-weight-bold" style="color: #1B3A5F">
              Identidad Notarial y Fe Pública
            </h1>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Configuración oficial de fe pública, titularidad, identidad gráfica, sellos de autorizar y leyendas reglamentarias.
            </p>
          </div>
        </div>
      </div>

      <div class="mt-4 mt-md-0 d-flex align-center gap-2">
        <v-btn
          variant="outlined"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="cargando"
          @click="sincronizarFormulario"
        >
          Revertir
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-medium"
          prepend-icon="mdi-content-save"
          :loading="guardando"
          @click="handleGuardar"
        >
          Guardar Cambios
        </v-btn>
      </div>
    </div>

    <!-- Banner informativo de la Notaría -->
    <v-card
      variant="outlined"
      class="mb-6 bg-white"
      rounded="lg"
      style="border-left: 4px solid #A9762E !important"
    >
      <v-card-text class="pa-4 d-flex flex-column flex-sm-row align-sm-center justify-space-between">
        <div class="d-flex align-center mb-2 mb-sm-0">
          <v-icon color="#A9762E" size="28" class="mr-3">mdi-office-building-cog-outline</v-icon>
          <div>
            <div class="text-subtitle-1 font-weight-bold" style="color: #1B3A5F">
              {{ nombreNotariaCompleto }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Titular: <strong>{{ titularCompleto }}</strong> | {{ form.regimen_asociacion || 'Titular Único' }}
            </div>
          </div>
        </div>
        <div class="text-caption text-right text-medium-emphasis">
          <span v-if="domicilioCompleto">
            <v-icon size="14" class="mr-1">mdi-map-marker</v-icon>{{ domicilioCompleto }}
          </span>
          <span v-else class="text-amber-darken-2">
            <v-icon size="14" class="mr-1">mdi-alert-circle-outline</v-icon>Domicilio fiscal pendiente
          </span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Error alert si existe -->
    <v-alert
      v-if="formError || composableError"
      type="error"
      variant="tonal"
      closable
      class="mb-6"
      @click:close="formError = null"
    >
      {{ formError || composableError }}
    </v-alert>

    <!-- Pestañas de configuración -->
    <v-card variant="outlined" rounded="lg" class="bg-white">
      <v-tabs
        v-model="activeTab"
        bg-color="#F8FAFC"
        color="#1B3A5F"
        slider-color="#A9762E"
      >
        <v-tab :value="0" prepend-icon="mdi-card-bulleted-outline">
          Ficha Notarial y Fe Pública
        </v-tab>
        <v-tab :value="1" prepend-icon="mdi-map-marker-outline">
          Domicilio y Contacto
        </v-tab>
        <v-tab :value="2" prepend-icon="mdi-image-outline">
          Identidad Visual y Sellos
        </v-tab>
        <v-tab :value="3" prepend-icon="mdi-text-box-edit-outline">
          Leyendas y Fórmulas
        </v-tab>
      </v-tabs>

      <v-divider />

      <v-window v-model="activeTab" class="pa-6">
        <!-- TAB 0: Ficha Notarial y Fe Pública -->
        <v-window-item :value="0">
          <div class="text-subtitle-1 font-weight-bold mb-1" style="color: #1B3A5F">
            Datos de Actuación y Fe Pública
          </div>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Identificación oficial de la patente notarial, circunscripción territorial y notario titular.
          </p>

          <v-row density="comfortable">
            <v-col cols="12" sm="4">
              <v-text-field
                v-model.number="form.numero_notaria"
                label="Número de Notaría *"
                type="number"
                min="1"
                variant="outlined"
                density="comfortable"
                prefix="No."
                hint="Identificador numérico asignado por la autoridad estatal"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.entidad_federativa"
                label="Entidad Federativa *"
                variant="outlined"
                density="comfortable"
                hint="Ej. Estado de México, Ciudad de México, Jalisco"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.municipio"
                label="Municipio / Alcaldía *"
                variant="outlined"
                density="comfortable"
                hint="Municipio sede de la notaría"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.distrito_judicial"
                label="Distrito Judicial / Notarial"
                variant="outlined"
                density="comfortable"
                hint="Circunscripción judicial de adscripción"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-select
                v-model="form.regimen_asociacion"
                :items="opcionesRegimen"
                label="Régimen de Actuación"
                variant="outlined"
                density="comfortable"
                hint="Modalidad jurídica de ejercicio de la función notarial"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" class="mt-4">
              <v-divider class="mb-4" />
              <div class="text-subtitle-2 font-weight-bold mb-3" style="color: #1B3A5F">
                Titularidad y Suplencia Notarial
              </div>
            </v-col>

            <v-col cols="12" sm="3">
              <v-text-field
                v-model="form.notario_titular_titulo"
                label="Título Profesional"
                variant="outlined"
                density="comfortable"
                hint="Ej. Lic., Dr., Mtro."
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="9">
              <v-text-field
                v-model="form.notario_titular_nombre"
                label="Nombre Completo del Notario Titular *"
                variant="outlined"
                density="comfortable"
                hint="Nombre oficial con el que autoriza los instrumentos públicos"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.patente_fiat_numero"
                label="Número de Patente / Fíat"
                variant="outlined"
                density="comfortable"
                hint="Registro oficial del fíat notarial"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.patente_fiat_fecha"
                label="Fecha de Otorgamiento de Fíat"
                type="date"
                variant="outlined"
                density="comfortable"
                hint="Fecha de expedición por el Ejecutivo Estatal"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="form.notario_suplente_nombre"
                label="Notario Suplente o Asociado"
                variant="outlined"
                density="comfortable"
                hint="En caso de convenio o asociación vigente"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 1: Domicilio y Contacto -->
        <v-window-item :value="1">
          <div class="text-subtitle-1 font-weight-bold mb-1" style="color: #1B3A5F">
            Domicilio Fiscal y Canales de Contacto
          </div>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Ubicación física para atención a comparecientes y datos de notificación institucional.
          </p>

          <v-row density="comfortable">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.domicilio_calle"
                label="Calle o Avenida"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="3">
              <v-text-field
                v-model="form.domicilio_num_ext"
                label="No. Exterior"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="3">
              <v-text-field
                v-model="form.domicilio_num_int"
                label="No. Interior / Suite"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.domicilio_colonia"
                label="Colonia / Fraccionamiento"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.domicilio_codigo_postal"
                label="Código Postal"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" class="mt-4">
              <v-divider class="mb-4" />
              <div class="text-subtitle-2 font-weight-bold mb-3" style="color: #1B3A5F">
                Canales de Atención Ciudadana
              </div>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.telefono_principal"
                label="Teléfono Principal de Notaría"
                prepend-inner-icon="mdi-phone"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.telefono_secundario"
                label="Teléfono Secundario / Directo"
                prepend-inner-icon="mdi-phone-outline"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.correo_contacto"
                label="Correo Institucional"
                type="email"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                density="comfortable"
                hint="Utilizado para avisos automáticos y contacto con partes"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.sitio_web"
                label="Sitio Web Institucional"
                type="url"
                prepend-inner-icon="mdi-web"
                variant="outlined"
                density="comfortable"
                hint="Portal informativo oficial de la notaría"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 2: Identidad Visual y Sellos -->
        <v-window-item :value="2">
          <div class="text-subtitle-1 font-weight-bold mb-1" style="color: #1B3A5F">
            Identidad Visual y Sellado Notarial Oficial
          </div>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Logotipo institucional para membretes y facsímil del Sello Notarial de Autorizar para carátulas y reportes oficiales.
          </p>

          <v-row>
            <!-- Card Logotipo -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" rounded="lg" class="pa-4 h-100 d-flex flex-column">
                <div class="d-flex align-center mb-3">
                  <v-avatar color="#1B3A5F" size="36" rounded="sm" class="mr-3">
                    <v-icon color="white" size="20">mdi-image-filter-hdr</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold" style="color: #1B3A5F">
                      Logotipo Institucional
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Visible en membretes, reportes y barra superior.
                    </div>
                  </div>
                </div>

                <!-- Preview del Logotipo -->
                <div
                  class="d-flex flex-column align-center justify-center pa-6 rounded-lg mb-4 flex-grow-1"
                  style="background-color: #F8FAFC; border: 2px dashed #CBD5E1; min-height: 180px;"
                >
                  <template v-if="logoPreviewUrl || configuracion?.logotipo_url">
                    <img
                      :src="logoPreviewUrl || configuracion?.logotipo_url || ''"
                      alt="Logotipo Notarial"
                      class="mb-3"
                      style="max-height: 120px; max-width: 100%; object-fit: contain;"
                    >
                    <div class="text-caption text-medium-emphasis text-center">
                      {{ logoPreviewUrl ? 'Archivo seleccionado pendiente de confirmación' : 'Logotipo oficial activo' }}
                    </div>
                  </template>
                  <template v-else>
                    <v-icon size="48" color="#94A3B8" class="mb-2">mdi-image-outline</v-icon>
                    <div class="text-caption text-medium-emphasis text-center">
                      No se ha cargado logotipo institucional.
                    </div>
                  </template>
                </div>

                <!-- Botones y Selección de Archivo -->
                <div>
                  <input
                    id="input-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    class="d-none"
                    @change="onLogoSelected"
                  >

                  <div class="d-flex gap-2 flex-wrap">
                    <v-btn
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-upload"
                      size="small"
                      @click="() => ($el.querySelector('#input-logo') as HTMLInputElement)?.click()"
                    >
                      Seleccionar Archivo
                    </v-btn>

                    <v-btn
                      v-if="selectedLogoFile"
                      color="primary"
                      variant="flat"
                      class="text-white font-weight-medium"
                      prepend-icon="mdi-cloud-upload"
                      size="small"
                      :loading="subiendoActivo"
                      @click="handleSubirLogo"
                    >
                      Subir Logotipo
                    </v-btn>

                    <v-btn
                      v-if="configuracion?.logotipo_url"
                      variant="text"
                      color="error"
                      prepend-icon="mdi-trash-can-outline"
                      size="small"
                      @click="confirmarEliminarActivo('logotipo')"
                    >
                      Eliminar
                    </v-btn>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-2">
                    Formatos: PNG, JPG, SVG. Máximo 3MB.
                  </div>
                </div>
              </v-card>
            </v-col>

            <!-- Card Sello Notarial -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" rounded="lg" class="pa-4 h-100 d-flex flex-column">
                <div class="d-flex align-center mb-3">
                  <v-avatar color="#A9762E" size="36" rounded="sm" class="mr-3">
                    <v-icon color="white" size="20">mdi-seal-variant</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-subtitle-2 font-weight-bold" style="color: #1B3A5F">
                      Facsímil del Sello de Autorizar
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Sello oficial con el Escudo Nacional para sellado digital.
                    </div>
                  </div>
                </div>

                <!-- Preview del Sello -->
                <div
                  class="d-flex flex-column align-center justify-center pa-6 rounded-lg mb-4 flex-grow-1"
                  style="background-color: #F8FAFC; border: 2px dashed #CBD5E1; min-height: 180px;"
                >
                  <template v-if="selloPreviewUrl || configuracion?.sello_notarial_url">
                    <img
                      :src="selloPreviewUrl || configuracion?.sello_notarial_url || ''"
                      alt="Sello Notarial"
                      class="mb-3 rounded-circle"
                      style="max-height: 120px; max-width: 120px; object-fit: contain; background: white; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);"
                    >
                    <div class="text-caption text-medium-emphasis text-center">
                      {{ selloPreviewUrl ? 'Archivo seleccionado pendiente de confirmación' : 'Facsímil de autorizar activo' }}
                    </div>
                  </template>
                  <template v-else>
                    <v-icon size="48" color="#94A3B8" class="mb-2">mdi-seal</v-icon>
                    <div class="text-caption text-medium-emphasis text-center">
                      No se ha registrado el sello de autorizar.
                    </div>
                  </template>
                </div>

                <!-- Botones y Selección de Archivo -->
                <div>
                  <input
                    id="input-sello"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    class="d-none"
                    @change="onSelloSelected"
                  >

                  <div class="d-flex gap-2 flex-wrap">
                    <v-btn
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-upload"
                      size="small"
                      @click="() => ($el.querySelector('#input-sello') as HTMLInputElement)?.click()"
                    >
                      Seleccionar Archivo
                    </v-btn>

                    <v-btn
                      v-if="selectedSelloFile"
                      color="primary"
                      variant="flat"
                      class="text-white font-weight-medium"
                      prepend-icon="mdi-cloud-upload"
                      size="small"
                      :loading="subiendoActivo"
                      @click="handleSubirSello"
                    >
                      Subir Sello
                    </v-btn>

                    <v-btn
                      v-if="configuracion?.sello_notarial_url"
                      variant="text"
                      color="error"
                      prepend-icon="mdi-trash-can-outline"
                      size="small"
                      @click="confirmarEliminarActivo('sello')"
                    >
                      Eliminar
                    </v-btn>
                  </div>
                  <div class="text-caption text-medium-emphasis mt-2">
                    Formatos: PNG transparente recomendado. Máximo 3MB.
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- TAB 3: Leyendas y Fórmulas -->
        <v-window-item :value="3">
          <div class="text-subtitle-1 font-weight-bold mb-1" style="color: #1B3A5F">
            Leyendas Oficiales y Fórmulas Reglamentarias
          </div>
          <p class="text-body-2 text-medium-emphasis mb-6">
            Textos de fe pública impresos en carátulas, certificaciones de volúmenes e informes notariales.
          </p>

          <v-row density="comfortable">
            <v-col cols="12">
              <v-text-field
                v-model="form.leyenda_encabezado"
                label="Membrete Superior Oficial"
                variant="outlined"
                density="comfortable"
                hint="Texto de encabezado impreso en documentos y cédulas notariales"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" class="mt-3">
              <v-text-field
                v-model="form.leyenda_lema"
                label="Lema Institucional / Fe Pública"
                variant="outlined"
                density="comfortable"
                hint="Ej. 'En testimonio de verdad', 'La fe pública al servicio de la legalidad'"
                persistent-hint
              />
            </v-col>

            <v-col cols="12" class="mt-4">
              <v-divider class="mb-4" />
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-subtitle-2 font-weight-bold" style="color: #1B3A5F">
                  Fórmula Solemne de Certificación de Cierre de Volumen
                </div>
                <div class="text-caption text-medium-emphasis">
                  Haga clic en una variable para insertarla en la plantilla
                </div>
              </div>

              <!-- Tags interactivos -->
              <div class="d-flex flex-wrap gap-1 mb-3">
                <v-chip
                  v-for="item in tagsVariables"
                  :key="item.tag"
                  size="small"
                  variant="outlined"
                  color="#1B3A5F"
                  class="cursor-pointer"
                  @click="insertarTag(item.tag)"
                >
                  <v-icon start size="14">mdi-code-brackets</v-icon>
                  {{ item.label }}
                </v-chip>
              </div>

              <v-textarea
                v-model="form.leyenda_cierre_volumen"
                label="Plantilla de Certificación de Cierre de Tomo *"
                rows="5"
                variant="outlined"
                density="comfortable"
                hint="Texto oficial con variables dinámicas que se sustituyen al generar el reporte del índice"
                persistent-hint
              />
            </v-col>

            <!-- Previsualización en vivo interpolada -->
            <v-col cols="12" class="mt-4">
              <v-card
                variant="tonal"
                color="#1B3A5F"
                rounded="lg"
                class="pa-4 bg-slate-50"
              >
                <div class="d-flex align-center mb-2">
                  <v-icon color="#A9762E" size="18" class="mr-2">mdi-eye-outline</v-icon>
                  <div class="text-caption font-weight-bold text-uppercase" style="letter-spacing: 0.5px">
                    Previsualización en Vivo de la Fórmula (Datos de Muestra)
                  </div>
                </div>
                <p class="text-body-2 mb-0 font-italic text-slate-800" style="white-space: pre-wrap; line-height: 1.6;">
                  {{ vistaPreviaInterpolada }}
                </p>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>

      <v-divider />

      <!-- Barra de acciones inferior -->
      <v-card-actions class="pa-4 bg-grey-lighten-5 d-flex justify-end">
        <v-btn
          color="primary"
          variant="flat"
          class="text-white font-weight-bold"
          prepend-icon="mdi-content-save"
          :loading="guardando"
          @click="handleGuardar"
        >
          Guardar Configuración Notarial
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal de confirmación para eliminar activo -->
    <v-dialog v-model="confirmDeleteDialog" max-width="440">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pa-4 text-error d-flex align-center">
          <v-icon color="error" class="mr-2">mdi-alert</v-icon>
          Eliminar {{ deleteTipo === 'logotipo' ? 'Logotipo' : 'Sello Notarial' }}
        </v-card-title>
        <v-card-text class="pa-4 text-body-2">
          ¿Está seguro de que desea desvincular y eliminar el {{ deleteTipo === 'logotipo' ? 'logotipo oficial' : 'sello notarial de autorizar' }}? Esta acción no se puede revertir.
        </v-card-text>
        <v-card-actions class="pa-4 d-flex justify-end">
          <v-btn variant="text" @click="confirmDeleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" class="text-white font-weight-medium" :loading="guardando" @click="ejecutarEliminarActivo">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar de notificaciones -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="4000"
      location="bottom end"
      rounded="lg"
    >
      {{ snackbarText }}
      <template #actions>
        <v-btn variant="text" size="small" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
