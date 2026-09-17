<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/yup'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as yup from 'yup'
import { validarCurp } from '~/composables/useCurpValidator'
import { validarRfc } from '~/composables/useRfcValidator'

import IdentificacionOcrAssistant, { type OcrResultPayload } from './IdentificacionOcrAssistant.vue'

export interface CatalogoItem {
  id: string
  nombre: string
  codigo?: string
}

export interface DocumentosAdjuntos {
  anverso?: File
  reverso?: File
  anversoBase64?: string
  reversoBase64?: string
}

export interface ComparecienteFisicaFormValues {
  id?: string
  nombres: string
  primerApellido: string
  segundoApellido: string | null
  rfc: string
  curp: string
  fechaNacimiento: string
  genero: 'M' | 'F' | 'X'
  nacionalidad: string
  estadoCivil: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_libre'
  regimenPatrimonialId: string | null
  ocupacion: string | null
  tipoIdentificacionId: string | null
  folioIdentificacion: string | null
  vigenciaIdentificacion: string | null
  calle: string | null
  numeroExterior: string | null
  numeroInterior: string | null
  colonia: string | null
  codigoPostal: string | null
  municipio: string | null
  entidadFederativa: string | null
  email: string | null
  telefono: string | null
  documentosAdjuntos?: DocumentosAdjuntos | null
}

const props = withDefaults(
  defineProps<{
    initialValues?: Partial<ComparecienteFisicaFormValues>
    tiposIdentificacion?: CatalogoItem[]
    regimenesPatrimoniales?: CatalogoItem[]
    loading?: boolean
  }>(),
  {
    initialValues: () => ({}),
    tiposIdentificacion: () => [],
    regimenesPatrimoniales: () => [],
    loading: false,
  },
)

const emit = defineEmits<{
  submit: [values: ComparecienteFisicaFormValues]
  cancel: []
}>()

const ESTADOS_CIVILES = [
  { title: 'Soltero(a)', value: 'soltero' },
  { title: 'Casado(a)', value: 'casado' },
  { title: 'Divorciado(a)', value: 'divorciado' },
  { title: 'Viudo(a)', value: 'viudo' },
  { title: 'Unión Libre', value: 'union_libre' },
]

const GENEROS = [
  { title: 'Masculino (H)', value: 'M' },
  { title: 'Femenino (M)', value: 'F' },
  { title: 'No binario / Otro (X)', value: 'X' },
]

const schema = toTypedSchema(
  yup.object({
    nombres: yup.string().trim().required('Los nombres son obligatorios'),
    primerApellido: yup.string().trim().required('El primer apellido es obligatorio'),
    segundoApellido: yup.string().trim().nullable().optional(),
    rfc: yup
      .string()
      .trim()
      .required('El RFC es obligatorio')
      .test('rfc-valido', 'RFC de Persona Física inválido o no conforme al SAT', (val) => {
        if (!val) return false
        const res = validarRfc(val)
        return res.isValid && res.tipoPersona === 'fisica'
      }),
    curp: yup
      .string()
      .trim()
      .required('La CURP es obligatoria')
      .test('curp-valida', 'CURP inválida según algoritmo oficial RENAPO', (val) => {
        if (!val) return false
        const res = validarCurp(val)
        return res.isValid
      }),
    fechaNacimiento: yup.string().required('La fecha de nacimiento es obligatoria'),
    genero: yup.string().oneOf(['M', 'F', 'X']).required('El género es obligatorio'),
    nacionalidad: yup.string().trim().required('La nacionalidad es obligatoria'),
    estadoCivil: yup
      .string()
      .oneOf(['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'])
      .required('El estado civil es obligatorio'),
    regimenPatrimonialId: yup
      .string()
      .nullable()
      .when('estadoCivil', {
        is: 'casado',
        then: (schema) => schema.required('El régimen patrimonial es obligatorio cuando el estado civil es casado'),
        otherwise: (schema) => schema.nullable().optional(),
      }),
    ocupacion: yup.string().trim().nullable().optional(),
    tipoIdentificacionId: yup.string().nullable().optional(),
    folioIdentificacion: yup.string().trim().nullable().optional(),
    vigenciaIdentificacion: yup.string().nullable().optional(),
    calle: yup.string().trim().nullable().optional(),
    numeroExterior: yup.string().trim().nullable().optional(),
    numeroInterior: yup.string().trim().nullable().optional(),
    colonia: yup.string().trim().nullable().optional(),
    codigoPostal: yup.string().trim().nullable().optional(),
    municipio: yup.string().trim().nullable().optional(),
    entidadFederativa: yup.string().trim().nullable().optional(),
    email: yup.string().trim().email('Correo electrónico no válido').nullable().optional(),
    telefono: yup.string().trim().nullable().optional(),
  }),
)

function getDefaults(): ComparecienteFisicaFormValues {
  return {
    id: props.initialValues?.id,
    nombres: props.initialValues?.nombres ?? '',
    primerApellido: props.initialValues?.primerApellido ?? '',
    segundoApellido: props.initialValues?.segundoApellido ?? null,
    rfc: props.initialValues?.rfc ?? '',
    curp: props.initialValues?.curp ?? '',
    fechaNacimiento: props.initialValues?.fechaNacimiento ?? '',
    genero: props.initialValues?.genero ?? 'M',
    nacionalidad: props.initialValues?.nacionalidad ?? 'Mexicana',
    estadoCivil: props.initialValues?.estadoCivil ?? 'soltero',
    regimenPatrimonialId: props.initialValues?.regimenPatrimonialId ?? null,
    ocupacion: props.initialValues?.ocupacion ?? null,
    tipoIdentificacionId: props.initialValues?.tipoIdentificacionId ?? null,
    folioIdentificacion: props.initialValues?.folioIdentificacion ?? null,
    vigenciaIdentificacion: props.initialValues?.vigenciaIdentificacion ?? null,
    calle: props.initialValues?.calle ?? null,
    numeroExterior: props.initialValues?.numeroExterior ?? null,
    numeroInterior: props.initialValues?.numeroInterior ?? null,
    colonia: props.initialValues?.colonia ?? null,
    codigoPostal: props.initialValues?.codigoPostal ?? null,
    municipio: props.initialValues?.municipio ?? null,
    entidadFederativa: props.initialValues?.entidadFederativa ?? null,
    email: props.initialValues?.email ?? null,
    telefono: props.initialValues?.telefono ?? null,
  }
}

const { handleSubmit, defineField, errors, setValues, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: getDefaults(),
})

const [nombres, nombresAttrs] = defineField('nombres')
const [primerApellido, primerApellidoAttrs] = defineField('primerApellido')
const [segundoApellido, segundoApellidoAttrs] = defineField('segundoApellido')
const [rfc, rfcAttrs] = defineField('rfc')
const [curp, curpAttrs] = defineField('curp')
const [fechaNacimiento, fechaNacimientoAttrs] = defineField('fechaNacimiento')
const [genero, generoAttrs] = defineField('genero')
const [nacionalidad, nacionalidadAttrs] = defineField('nacionalidad')
const [estadoCivil, estadoCivilAttrs] = defineField('estadoCivil')
const [regimenPatrimonialId, regimenPatrimonialIdAttrs] = defineField('regimenPatrimonialId')
const [ocupacion, ocupacionAttrs] = defineField('ocupacion')
const [tipoIdentificacionId, tipoIdentificacionIdAttrs] = defineField('tipoIdentificacionId')
const [folioIdentificacion, folioIdentificacionAttrs] = defineField('folioIdentificacion')
const [vigenciaIdentificacion, vigenciaIdentificacionAttrs] = defineField('vigenciaIdentificacion')
const [calle, calleAttrs] = defineField('calle')
const [numeroExterior, numeroExteriorAttrs] = defineField('numeroExterior')
const [numeroInterior, numeroInteriorAttrs] = defineField('numeroInterior')
const [colonia, coloniaAttrs] = defineField('colonia')
const [codigoPostal, codigoPostalAttrs] = defineField('codigoPostal')
const [municipio, municipioAttrs] = defineField('municipio')
const [entidadFederativa, entidadFederativaAttrs] = defineField('entidadFederativa')
const [email, emailAttrs] = defineField('email')
const [telefono, telefonoAttrs] = defineField('telefono')

// Validaciones reactivas visuales
const rfcStatus = computed(() => {
  if (!rfc.value) return null
  return validarRfc(rfc.value)
})

const curpStatus = computed(() => {
  if (!curp.value) return null
  return validarCurp(curp.value)
})

// Auto-completado de fecha de nacimiento y género al ingresar CURP válida
watch(curp, (nuevoCurp) => {
  if (!nuevoCurp) return
  const curpValidada = validarCurp(nuevoCurp)
  if (curpValidada.isValid) {
    if (curpValidada.fechaNacimiento && !fechaNacimiento.value) {
      setFieldValue('fechaNacimiento', curpValidada.fechaNacimiento)
    }
    if (curpValidada.genero && !genero.value) {
      setFieldValue('genero', curpValidada.genero)
    }
  }
})

// Reseteo de régimen patrimonial si deja de ser casado
watch(estadoCivil, (nuevoEstado) => {
  if (nuevoEstado !== 'casado' && regimenPatrimonialId.value) {
    setFieldValue('regimenPatrimonialId', null)
  }
})

watch(
  () => props.initialValues,
  () => {
    setValues(getDefaults())
  },
  { deep: true },
)

const mostrarAsistenteOcr = ref(!props.initialValues?.id)
const documentosAdjuntos = ref<DocumentosAdjuntos | null>(null)
const ocrExitosoNotificacion = ref(false)

function onOcrCompletado(payload: OcrResultPayload) {
  const d = payload.datos
  if (d.nombres) setFieldValue('nombres', d.nombres)
  if (d.primer_apellido) setFieldValue('primerApellido', d.primer_apellido)
  if (d.segundo_apellido) setFieldValue('segundoApellido', d.segundo_apellido)
  if (d.curp) setFieldValue('curp', d.curp)
  if (d.rfc) setFieldValue('rfc', d.rfc)
  if (d.clave_elector) setFieldValue('folioIdentificacion', d.clave_elector)
  if (d.vigencia) setFieldValue('vigenciaIdentificacion', d.vigencia)
  if (d.fecha_nacimiento) setFieldValue('fechaNacimiento', d.fecha_nacimiento)
  if (d.genero) setFieldValue('genero', d.genero)

  if (d.domicilio) {
    if (d.domicilio.calle) setFieldValue('calle', d.domicilio.calle)
    if (d.domicilio.numero_exterior) setFieldValue('numeroExterior', d.domicilio.numero_exterior)
    if (d.domicilio.numero_interior) setFieldValue('numeroInterior', d.domicilio.numero_interior)
    if (d.domicilio.colonia) setFieldValue('colonia', d.domicilio.colonia)
    if (d.domicilio.codigo_postal) setFieldValue('codigoPostal', d.domicilio.codigo_postal)
    if (d.domicilio.municipio) setFieldValue('municipio', d.domicilio.municipio)
    if (d.domicilio.entidad_federativa) setFieldValue('entidadFederativa', d.domicilio.entidad_federativa)
  }

  const tipoIne = props.tiposIdentificacion.find((t) => t.codigo === 'ine')
  if (tipoIne) {
    setFieldValue('tipoIdentificacionId', tipoIne.id)
  }

  documentosAdjuntos.value = {
    anverso: payload.anversoFile,
    reverso: payload.reversoFile,
    anversoBase64: payload.anversoBase64,
    reversoBase64: payload.reversoBase64,
  }

  mostrarAsistenteOcr.value = false
  ocrExitosoNotificacion.value = true
}

const onSubmit = handleSubmit((values) => {
  emit('submit', {
    ...values,
    id: props.initialValues?.id,
    rfc: values.rfc ? values.rfc.trim().toUpperCase() : '',
    curp: values.curp ? values.curp.trim().toUpperCase() : '',
    documentosAdjuntos: documentosAdjuntos.value,
  } as ComparecienteFisicaFormValues)
})

defineExpose({ onSubmit })
</script>

<template>
  <div class="compareciente-fisica-wrapper">
    <!-- Asistente OCR-First para captura guiada de identificación -->
    <div v-if="mostrarAsistenteOcr" class="mb-5">
      <IdentificacionOcrAssistant
        :tipo-identificacion="'ine'"
        :requiere-reverso="true"
        @ocr-completado="onOcrCompletado"
        @omitir-manual="mostrarAsistenteOcr = false"
      />
    </div>

    <!-- Barra de estado o acceso rápido al asistente OCR si está plegado -->
    <div v-else class="d-flex align-center justify-space-between pa-3 mb-4 rounded bg-grey-lighten-4 border">
      <div class="d-flex align-center">
        <v-icon color="#1B3A5F" class="mr-2">mdi-camera-outline</v-icon>
        <span class="text-caption font-weight-medium">
          {{ documentosAdjuntos ? 'Identificación digitalizada con OCR' : 'Captura manual directa' }}
        </span>
        <v-chip v-if="documentosAdjuntos" size="x-small" color="success" class="ml-2">
          Imágenes adjuntas
        </v-chip>
      </div>
      <v-btn
        variant="text"
        color="#1B3A5F"
        size="small"
        density="compact"
        prepend-icon="mdi-scanner"
        @click="mostrarAsistenteOcr = true"
      >
        {{ documentosAdjuntos ? 'Volver a escanear' : 'Escanear credencial con OCR' }}
      </v-btn>
    </div>

    <v-alert
      v-if="ocrExitosoNotificacion"
      type="success"
      variant="tonal"
      density="compact"
      closable
      class="mb-4"
      @click:close="ocrExitosoNotificacion = false"
    >
      Datos extraídos exitosamente de la credencial oficial. Revise y complete los campos requeridos.
    </v-alert>

    <v-form @submit.prevent="onSubmit">
      <!-- Sección 1: Datos Personales y Filiación -->
      <div class="mb-4">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-account" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">1. Datos Personales y Filiación</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="nombres"
            v-bind="nombresAttrs"
            label="Nombres *"
            variant="outlined"
            density="compact"
            :error-messages="errors.nombres ? [errors.nombres] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="primerApellido"
            v-bind="primerApellidoAttrs"
            label="Primer Apellido *"
            variant="outlined"
            density="compact"
            :error-messages="errors.primerApellido ? [errors.primerApellido] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="segundoApellido"
            v-bind="segundoApellidoAttrs"
            label="Segundo Apellido"
            variant="outlined"
            density="compact"
            :error-messages="errors.segundoApellido ? [errors.segundoApellido] : []"
          />
        </v-col>

        <v-col cols="12" md="4">
          <v-text-field
            v-model="fechaNacimiento"
            v-bind="fechaNacimientoAttrs"
            label="Fecha de Nacimiento *"
            type="date"
            variant="outlined"
            density="compact"
            :error-messages="errors.fechaNacimiento ? [errors.fechaNacimiento] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="genero"
            v-bind="generoAttrs"
            label="Género *"
            :items="GENEROS"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            :error-messages="errors.genero ? [errors.genero] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="nacionalidad"
            v-bind="nacionalidadAttrs"
            label="Nacionalidad *"
            variant="outlined"
            density="compact"
            :error-messages="errors.nacionalidad ? [errors.nacionalidad] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 2: Identificación Oficial y Fiscal -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-card-account-details-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">2. Identificación Oficial y Poblacional</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="rfc"
            v-bind="rfcAttrs"
            label="RFC (13 caracteres con homoclave) *"
            variant="outlined"
            density="compact"
            maxlength="13"
            style="font-family: monospace;"
            :error-messages="errors.rfc ? [errors.rfc] : []"
            @update:model-value="rfc = $event?.toUpperCase()"
          >
            <template #append-inner>
              <v-chip
                v-if="rfcStatus?.isValid && rfcStatus.tipoPersona === 'fisica'"
                color="success"
                size="x-small"
                variant="flat"
                class="font-weight-bold"
              >
                SAT Válido
              </v-chip>
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" md="6">
          <v-text-field
            v-model="curp"
            v-bind="curpAttrs"
            label="CURP (18 caracteres) *"
            variant="outlined"
            density="compact"
            maxlength="18"
            style="font-family: monospace;"
            :error-messages="errors.curp ? [errors.curp] : []"
            @update:model-value="curp = $event?.toUpperCase()"
          >
            <template #append-inner>
              <v-chip
                v-if="curpStatus?.isValid"
                color="success"
                size="x-small"
                variant="flat"
                class="font-weight-bold"
              >
                RENAPO Válido
              </v-chip>
            </template>
          </v-text-field>
        </v-col>

        <v-col cols="12" md="4">
          <v-select
            v-model="tipoIdentificacionId"
            v-bind="tipoIdentificacionIdAttrs"
            label="Tipo de Identificación"
            :items="tiposIdentificacion"
            item-title="nombre"
            item-value="id"
            variant="outlined"
            density="compact"
            clearable
            :error-messages="errors.tipoIdentificacionId ? [errors.tipoIdentificacionId] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="folioIdentificacion"
            v-bind="folioIdentificacionAttrs"
            label="Folio / Clave de Elector"
            variant="outlined"
            density="compact"
            :error-messages="errors.folioIdentificacion ? [errors.folioIdentificacion] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="vigenciaIdentificacion"
            v-bind="vigenciaIdentificacionAttrs"
            label="Vigencia / Vencimiento"
            type="date"
            variant="outlined"
            density="compact"
            :error-messages="errors.vigenciaIdentificacion ? [errors.vigenciaIdentificacion] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 3: Estado Civil y Régimen Matrimonial -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-ring" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">3. Estado Civil y Régimen Matrimonial</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="6">
          <v-select
            v-model="estadoCivil"
            v-bind="estadoCivilAttrs"
            label="Estado Civil *"
            :items="ESTADOS_CIVILES"
            item-title="title"
            item-value="value"
            variant="outlined"
            density="compact"
            :error-messages="errors.estadoCivil ? [errors.estadoCivil] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-if="estadoCivil === 'casado'"
            v-model="regimenPatrimonialId"
            v-bind="regimenPatrimonialIdAttrs"
            label="Régimen Patrimonial Matrimonial *"
            :items="regimenesPatrimoniales"
            item-title="nombre"
            item-value="id"
            variant="outlined"
            density="compact"
            :error-messages="errors.regimenPatrimonialId ? [errors.regimenPatrimonialId] : []"
            hint="Obligatorio para casados en actos traslativos de dominio conforme al Código Civil"
            persistent-hint
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 4: Ocupación y Domicilio Notarial -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-map-marker-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">4. Ocupación y Domicilio</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12">
          <v-text-field
            v-model="ocupacion"
            v-bind="ocupacionAttrs"
            label="Ocupación o Actividad Principal"
            variant="outlined"
            density="compact"
            :error-messages="errors.ocupacion ? [errors.ocupacion] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="calle"
            v-bind="calleAttrs"
            label="Calle"
            variant="outlined"
            density="compact"
            :error-messages="errors.calle ? [errors.calle] : []"
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="numeroExterior"
            v-bind="numeroExteriorAttrs"
            label="No. Exterior"
            variant="outlined"
            density="compact"
            :error-messages="errors.numeroExterior ? [errors.numeroExterior] : []"
          />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field
            v-model="numeroInterior"
            v-bind="numeroInteriorAttrs"
            label="No. Interior"
            variant="outlined"
            density="compact"
            :error-messages="errors.numeroInterior ? [errors.numeroInterior] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="codigoPostal"
            v-bind="codigoPostalAttrs"
            label="Código Postal"
            variant="outlined"
            density="compact"
            maxlength="5"
            :error-messages="errors.codigoPostal ? [errors.codigoPostal] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="colonia"
            v-bind="coloniaAttrs"
            label="Colonia"
            variant="outlined"
            density="compact"
            :error-messages="errors.colonia ? [errors.colonia] : []"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="municipio"
            v-bind="municipioAttrs"
            label="Municipio o Alcaldía"
            variant="outlined"
            density="compact"
            :error-messages="errors.municipio ? [errors.municipio] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="entidadFederativa"
            v-bind="entidadFederativaAttrs"
            label="Entidad Federativa / Estado"
            variant="outlined"
            density="compact"
            :error-messages="errors.entidadFederativa ? [errors.entidadFederativa] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Sección 5: Contacto -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-phone-outline" color="primary" class="mr-2" size="small" />
        <span class="text-subtitle-2 font-weight-bold text-primary">5. Canales de Contacto</span>
      </div>
      <v-divider class="mb-3" />

      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="email"
            v-bind="emailAttrs"
            label="Correo Electrónico"
            type="email"
            variant="outlined"
            density="compact"
            :error-messages="errors.email ? [errors.email] : []"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="telefono"
            v-bind="telefonoAttrs"
            label="Teléfono de Contacto"
            variant="outlined"
            density="compact"
            :error-messages="errors.telefono ? [errors.telefono] : []"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Acciones del Formulario -->
    <v-divider class="my-4" />
    <div class="d-flex justify-end ga-3">
      <v-btn
        variant="text"
        color="secondary"
        :disabled="loading"
        @click="emit('cancel')"
      >
        Cancelar
      </v-btn>
      <v-btn
        type="submit"
        color="primary"
        variant="elevated"
        :loading="loading"
        prepend-icon="mdi-content-save"
      >
        Guardar Compareciente
      </v-btn>
    </div>
  </v-form>
  </div>
</template>
