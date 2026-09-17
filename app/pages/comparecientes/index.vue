<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSupabaseClient } from '#imports'
import ComparecienteFisicaForm from '~/components/comparecientes/ComparecienteFisicaForm.vue'
import type { CatalogoItem, ComparecienteFisicaFormValues } from '~/components/comparecientes/ComparecienteFisicaForm.vue'
import ComparecienteMoralForm from '~/components/comparecientes/ComparecienteMoralForm.vue'
import type { ComparecienteMoralFormValues } from '~/components/comparecientes/ComparecienteMoralForm.vue'
import type { PersonaFisicaOption } from '~/components/comparecientes/RepresentantesSection.vue'

interface PersonaFisicaRel {
  nombres: string
  primer_apellido: string
  segundo_apellido: string | null
  curp: string | null
  fecha_nacimiento: string | null
  genero: 'M' | 'F' | 'X' | null
  nacionalidad: string | null
  estado_civil: 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'union_libre' | null
  regimen_patrimonial_id: string | null
  ocupacion: string | null
  tipo_identificacion_id: string | null
  folio_identificacion: string | null
  vigencia_identificacion: string | null
  calle: string | null
  numero_exterior: string | null
  numero_interior: string | null
  colonia: string | null
  codigo_postal: string | null
  municipio: string | null
  entidad_federativa: string | null
}

interface PersonaMoralRel {
  razon_social: string
  fecha_constitucion: string | null
  nacionalidad: string | null
  folio_mercantil: string | null
  instrumento_constitutivo: string | null
  fecha_instrumento: string | null
  notario_constitucion: string | null
  plaza_constitucion: string | null
  objeto_social: string | null
  calle: string | null
  numero_exterior: string | null
  numero_interior: string | null
  colonia: string | null
  codigo_postal: string | null
  municipio: string | null
  entidad_federativa: string | null
}

export interface ComparecienteRow {
  id: string
  nombre: string
  tipo_persona: 'fisica' | 'moral'
  rfc: string | null
  email: string | null
  telefono: string | null
  activo: boolean
  created_at: string
  identificador_secundario?: string
  compareciente_personas_fisicas?: PersonaFisicaRel | null
  compareciente_personas_morales?: PersonaMoralRel | null
}

const supabase = useSupabaseClient()

const comparecientes = ref<ComparecienteRow[]>([])
const loading = ref(true)
const busqueda = ref('')
const filtroTipo = ref<'todas' | 'fisica' | 'moral'>('todas')

// Catálogos
const tiposIdentificacion = ref<CatalogoItem[]>([])
const regimenesPatrimoniales = ref<CatalogoItem[]>([])

// Modal de registro / edición
const showDialog = ref(false)
const tipoPersonaModal = ref<'fisica' | 'moral'>('fisica')
const editingCompareciente = ref<Partial<ComparecienteFisicaFormValues> | null>(null)
const editingComparecienteMoral = ref<Partial<ComparecienteMoralFormValues> | null>(null)
const personasFisicasCatalogo = ref<PersonaFisicaOption[]>([])
const guardando = ref(false)
const formError = ref<string | null>(null)

// Notificaciones
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showFeedback(text: string, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

const tableHeaders = [
  { title: 'Compareciente', key: 'nombre', sortable: true },
  { title: 'Tipo', key: 'tipo_persona', sortable: true },
  { title: 'RFC', key: 'rfc', sortable: true },
  { title: 'CURP / Folio', key: 'identificador_secundario', sortable: false },
  { title: 'Contacto', key: 'contacto', sortable: false },
  { title: 'Estatus', key: 'activo', sortable: true },
  { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' as const },
]

async function cargarCatalogos(): Promise<void> {
  const [tiposRes, regimenesRes] = await Promise.all([
    supabase.from('tipos_identificacion_oficial').select('id, nombre, codigo').eq('activo', true).order('nombre'),
    supabase.from('regimenes_patrimoniales').select('id, nombre, codigo').eq('activo', true).order('nombre'),
  ])

  tiposIdentificacion.value = (tiposRes.data as CatalogoItem[]) ?? []
  regimenesPatrimoniales.value = (regimenesRes.data as CatalogoItem[]) ?? []
}

async function cargarPersonasFisicasCatalogo(): Promise<void> {
  const { data } = await supabase
    .from('comparecientes')
    .select('id, nombre, rfc')
    .eq('tipo_persona', 'fisica')
    .eq('activo', true)
    .order('nombre')
  personasFisicasCatalogo.value = (data as PersonaFisicaOption[]) ?? []
}

async function cargarComparecientes(): Promise<void> {
  loading.value = true
  let query = supabase
    .from('comparecientes')
    .select(`
      id,
      nombre,
      tipo_persona,
      rfc,
      email,
      telefono,
      activo,
      created_at,
      compareciente_personas_fisicas (
        nombres,
        primer_apellido,
        segundo_apellido,
        curp,
        fecha_nacimiento,
        genero,
        nacionalidad,
        estado_civil,
        regimen_patrimonial_id,
        ocupacion,
        tipo_identificacion_id,
        folio_identificacion,
        vigencia_identificacion,
        calle,
        numero_exterior,
        numero_interior,
        colonia,
        codigo_postal,
        municipio,
        entidad_federativa
      ),
      compareciente_personas_morales (
        razon_social,
        fecha_constitucion,
        nacionalidad,
        folio_mercantil,
        instrumento_constitutivo,
        fecha_instrumento,
        notario_constitucion,
        plaza_constitucion,
        objeto_social,
        calle,
        numero_exterior,
        numero_interior,
        colonia,
        codigo_postal,
        municipio,
        entidad_federativa
      )
    `)
    .order('nombre', { ascending: true })

  if (filtroTipo.value !== 'todas') {
    query = query.eq('tipo_persona', filtroTipo.value)
  }

  if (busqueda.value.trim()) {
    const term = busqueda.value.trim()
    query = query.or(`nombre.ilike.%${term}%,rfc.ilike.%${term}%`)
  }

  const { data, error } = await query
  loading.value = false

  if (error) {
    showFeedback(`Error al cargar comparecientes: ${error.message}`, 'error')
    return
  }

  comparecientes.value = (data ?? []).map((row: any) => {
    const pf = Array.isArray(row.compareciente_personas_fisicas)
      ? row.compareciente_personas_fisicas[0]
      : row.compareciente_personas_fisicas
    const pm = Array.isArray(row.compareciente_personas_morales)
      ? row.compareciente_personas_morales[0]
      : row.compareciente_personas_morales

    const identificador = row.tipo_persona === 'fisica' ? (pf?.curp ?? '—') : (pm?.folio_mercantil ?? '—')

    return {
      ...row,
      identificador_secundario: identificador,
      compareciente_personas_fisicas: pf,
      compareciente_personas_morales: pm,
    }
  })
}

// Estadísticas de cabecera
const totalCount = computed(() => comparecientes.value.length)
const fisicasCount = computed(() => comparecientes.value.filter((c) => c.tipo_persona === 'fisica').length)
const moralesCount = computed(() => comparecientes.value.filter((c) => c.tipo_persona === 'moral').length)

async function abrirCrear(): Promise<void> {
  editingCompareciente.value = null
  editingComparecienteMoral.value = null
  tipoPersonaModal.value = 'fisica'
  formError.value = null
  await cargarPersonasFisicasCatalogo()
  showDialog.value = true
}

async function abrirEditar(row: ComparecienteRow): Promise<void> {
  await cargarPersonasFisicasCatalogo()

  if (row.tipo_persona === 'fisica') {
    tipoPersonaModal.value = 'fisica'
    const pf = row.compareciente_personas_fisicas
    editingComparecienteMoral.value = null
    editingCompareciente.value = {
      id: row.id,
      nombres: pf?.nombres ?? row.nombre,
      primerApellido: pf?.primer_apellido ?? '',
      segundoApellido: pf?.segundo_apellido ?? null,
      rfc: row.rfc ?? '',
      curp: pf?.curp ?? '',
      fechaNacimiento: pf?.fecha_nacimiento ?? '',
      genero: pf?.genero ?? 'M',
      nacionalidad: pf?.nacionalidad ?? 'Mexicana',
      estadoCivil: pf?.estado_civil ?? 'soltero',
      regimenPatrimonialId: pf?.regimen_patrimonial_id ?? null,
      ocupacion: pf?.ocupacion ?? null,
      tipoIdentificacionId: pf?.tipo_identificacion_id ?? null,
      folioIdentificacion: pf?.folio_identificacion ?? null,
      vigenciaIdentificacion: pf?.vigencia_identificacion ?? null,
      calle: pf?.calle ?? null,
      numeroExterior: pf?.numero_exterior ?? null,
      numeroInterior: pf?.numero_interior ?? null,
      colonia: pf?.colonia ?? null,
      codigoPostal: pf?.codigo_postal ?? null,
      municipio: pf?.municipio ?? null,
      entidadFederativa: pf?.entidad_federativa ?? null,
      email: row.email ?? null,
      telefono: row.telefono ?? null,
    }
    formError.value = null
    showDialog.value = true
  } else {
    tipoPersonaModal.value = 'moral'
    const pm = row.compareciente_personas_morales
    editingCompareciente.value = null

    // Cargar apoderados y beneficiarios
    const [repsRes, bcsRes] = await Promise.all([
      supabase
        .from('compareciente_representantes')
        .select(`
          id,
          representante_fisica_id,
          tipo_facultades,
          instrumento_poder,
          fecha_poder,
          notario_poder,
          vigente,
          representante:comparecientes!representante_fisica_id(nombre)
        `)
        .eq('persona_moral_id', row.id),
      supabase
        .from('compareciente_beneficiarios_controladores')
        .select(`
          id,
          beneficiario_fisica_id,
          porcentaje_participacion,
          criterio_control,
          observaciones,
          beneficiario:comparecientes!beneficiario_fisica_id(nombre)
        `)
        .eq('persona_moral_id', row.id),
    ])

    const mappedReps = (repsRes.data ?? []).map((r: any) => ({
      id: r.id,
      representanteFisicaId: r.representante_fisica_id,
      representanteNombre: r.representante?.nombre ?? '',
      tipoFacultades: r.tipo_facultades,
      instrumentoPoder: r.instrumento_poder,
      fechaPoder: r.fecha_poder,
      notarioPoder: r.notario_poder,
      vigente: r.vigente,
    }))

    const mappedBcs = (bcsRes.data ?? []).map((b: any) => ({
      id: b.id,
      beneficiarioFisicaId: b.beneficiario_fisica_id,
      beneficiarioNombre: b.beneficiario?.nombre ?? '',
      porcentajeParticipacion: Number(b.porcentaje_participacion),
      criterioControl: b.criterio_control,
      observaciones: b.observaciones,
    }))

    editingComparecienteMoral.value = {
      id: row.id,
      razonSocial: pm?.razon_social ?? row.nombre,
      rfc: row.rfc ?? '',
      fechaConstitucion: pm?.fecha_constitucion ?? null,
      nacionalidad: pm?.nacionalidad ?? 'Mexicana',
      folioMercantil: pm?.folio_mercantil ?? null,
      instrumentoConstitutivo: pm?.instrumento_constitutivo ?? null,
      fechaInstrumento: pm?.fecha_instrumento ?? null,
      notarioConstitucion: pm?.notario_constitucion ?? null,
      plazaConstitucion: pm?.plaza_constitucion ?? null,
      objetoSocial: pm?.objeto_social ?? null,
      calle: pm?.calle ?? null,
      numeroExterior: pm?.numero_exterior ?? null,
      numeroInterior: pm?.numero_interior ?? null,
      colonia: pm?.colonia ?? null,
      codigoPostal: pm?.codigo_postal ?? null,
      municipio: pm?.municipio ?? null,
      entidadFederativa: pm?.entidad_federativa ?? null,
      email: row.email ?? null,
      telefono: row.telefono ?? null,
      representantes: mappedReps,
      beneficiariosControladores: mappedBcs,
    }
    formError.value = null
    showDialog.value = true
  }
}

async function handleGuardarFisica(values: ComparecienteFisicaFormValues): Promise<void> {
  guardando.value = true
  formError.value = null

  try {
    const { data: comparecienteId, error } = await supabase.rpc('fn_guardar_compareciente_fisica', {
      p_id: values.id || null,
      p_nombres: values.nombres,
      p_primer_apellido: values.primerApellido,
      p_segundo_apellido: values.segundoApellido || null,
      p_rfc: values.rfc,
      p_curp: values.curp,
      p_fecha_nacimiento: values.fechaNacimiento,
      p_genero: values.genero,
      p_nacionalidad: values.nacionalidad,
      p_estado_civil: values.estadoCivil,
      p_regimen_patrimonial_id: values.regimenPatrimonialId || null,
      p_ocupacion: values.ocupacion || null,
      p_tipo_identificacion_id: values.tipoIdentificacionId || null,
      p_folio_identificacion: values.folioIdentificacion || null,
      p_vigencia_identificacion: values.vigenciaIdentificacion || null,
      p_calle: values.calle || null,
      p_numero_exterior: values.numeroExterior || null,
      p_numero_interior: values.numeroInterior || null,
      p_colonia: values.colonia || null,
      p_codigo_postal: values.codigoPostal || null,
      p_municipio: values.municipio || null,
      p_entidad_federativa: values.entidadFederativa || null,
      p_email: values.email || null,
      p_telefono: values.telefono || null,
    })

    if (error) throw error

    const idGuardado = (comparecienteId as string) || values.id
    if (idGuardado && values.documentosAdjuntos) {
      const { subirDocumento } = useExpedienteDocumentos()
      if (values.documentosAdjuntos.anverso) {
        await subirDocumento({
          entidadTipo: 'compareciente',
          entidadId: idGuardado,
          categoria: 'identificacion_oficial',
          lado: 'anverso',
          archivo: values.documentosAdjuntos.anverso,
          nombreArchivo: values.documentosAdjuntos.anverso.name || 'identificacion_anverso.jpg',
          metadata: { tipo_identificacion_id: values.tipoIdentificacionId },
        })
      }
      if (values.documentosAdjuntos.reverso) {
        await subirDocumento({
          entidadTipo: 'compareciente',
          entidadId: idGuardado,
          categoria: 'identificacion_oficial',
          lado: 'reverso',
          archivo: values.documentosAdjuntos.reverso,
          nombreArchivo: values.documentosAdjuntos.reverso.name || 'identificacion_reverso.jpg',
          metadata: { tipo_identificacion_id: values.tipoIdentificacionId },
        })
      }
    }

    showFeedback('Compareciente persona física guardado correctamente')
    showDialog.value = false
    await cargarComparecientes()
  } catch (err: any) {
    formError.value = err.message || 'Error al guardar compareciente'
  } finally {
    guardando.value = false
  }
}

async function handleGuardarMoral(values: ComparecienteMoralFormValues): Promise<void> {
  guardando.value = true
  formError.value = null

  try {
    const { data: moralId, error } = await supabase.rpc('fn_guardar_compareciente_moral', {
      p_id: values.id || null,
      p_razon_social: values.razonSocial,
      p_rfc: values.rfc,
      p_fecha_constitucion: values.fechaConstitucion || null,
      p_nacionalidad: values.nacionalidad,
      p_folio_mercantil: values.folioMercantil || null,
      p_instrumento_constitutivo: values.instrumentoConstitutivo || null,
      p_fecha_instrumento: values.fechaInstrumento || null,
      p_notario_constitucion: values.notarioConstitucion || null,
      p_plaza_constitucion: values.plazaConstitucion || null,
      p_objeto_social: values.objetoSocial || null,
      p_calle: values.calle || null,
      p_numero_exterior: values.numeroExterior || null,
      p_numero_interior: values.numeroInterior || null,
      p_colonia: values.colonia || null,
      p_codigo_postal: values.codigoPostal || null,
      p_municipio: values.municipio || null,
      p_entidad_federativa: values.entidadFederativa || null,
      p_email: values.email || null,
      p_telefono: values.telefono || null,
    })

    if (error) throw error

    const personaMoralId = moralId || values.id
    if (personaMoralId) {
      // Sincronizar representantes
      await supabase.from('compareciente_representantes').delete().eq('persona_moral_id', personaMoralId)
      if (values.representantes && values.representantes.length > 0) {
        const rowsToInsert = values.representantes.map((r) => ({
          persona_moral_id: personaMoralId,
          representante_fisica_id: r.representanteFisicaId,
          tipo_facultades: r.tipoFacultades,
          instrumento_poder: r.instrumentoPoder || null,
          fecha_poder: r.fechaPoder || null,
          notario_poder: r.notarioPoder || null,
          vigente: r.vigente,
        }))
        await supabase.from('compareciente_representantes').insert(rowsToInsert)
      }

      // Sincronizar beneficiarios controladores
      await supabase
        .from('compareciente_beneficiarios_controladores')
        .delete()
        .eq('persona_moral_id', personaMoralId)
      if (values.beneficiariosControladores && values.beneficiariosControladores.length > 0) {
        const bcRowsToInsert = values.beneficiariosControladores.map((b) => ({
          persona_moral_id: personaMoralId,
          beneficiario_fisica_id: b.beneficiarioFisicaId,
          porcentaje_participacion: b.porcentajeParticipacion,
          criterio_control: b.criterioControl,
          observaciones: b.observaciones || null,
        }))
        await supabase.from('compareciente_beneficiarios_controladores').insert(bcRowsToInsert)
      }
    }

    showFeedback('Compareciente persona moral guardado correctamente')
    showDialog.value = false
    await cargarComparecientes()
  } catch (err: any) {
    formError.value = err.message || 'Error al guardar persona moral'
  } finally {
    guardando.value = false
  }
}

function getIniciales(nombre: string): string {
  if (!nombre) return 'C'
  const partes = nombre.trim().split(/\s+/)
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  }
  return nombre.substring(0, 2).toUpperCase()
}

onMounted(async () => {
  await Promise.all([cargarCatalogos(), cargarComparecientes()])
})
</script>

<template>
  <v-container fluid class="pa-6">
    <!-- Encabezado de Página -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-6 ga-4">
      <div>
        <h1 class="text-h5 font-weight-bold text-primary mb-1">
          Directorio de Comparecientes
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Padrón de otorgantes, adquirentes y representantes legales con cotejo de identidad y expedientes PLD/UIF.
        </p>
      </div>

      <div class="d-flex align-center ga-3">
        <v-btn
          color="primary"
          prepend-icon="mdi-account-plus-outline"
          variant="elevated"
          @click="abrirCrear"
        >
          Registrar Compareciente
        </v-btn>
      </div>
    </div>

    <!-- Tarjetas Métricas Rápidas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">TOTAL EN PADRÓN</div>
              <div class="text-h5 font-weight-bold mt-1">{{ totalCount }}</div>
            </div>
            <v-avatar color="primary" variant="tonal" rounded="lg">
              <v-icon icon="mdi-account-group-outline" />
            </v-avatar>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">PERSONAS FÍSICAS</div>
              <div class="text-h5 font-weight-bold text-primary mt-1">{{ fisicasCount }}</div>
            </div>
            <v-avatar color="primary" variant="tonal" rounded="lg">
              <v-icon icon="mdi-account-outline" />
            </v-avatar>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card variant="outlined" class="pa-4 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-medium-emphasis">PERSONAS MORALES</div>
              <div class="text-h5 font-weight-bold text-secondary mt-1">{{ moralesCount }}</div>
            </div>
            <v-avatar color="secondary" variant="tonal" rounded="lg">
              <v-icon icon="mdi-domain" />
            </v-avatar>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Barra Operativa: Filtros y Búsqueda -->
    <v-card variant="outlined" class="pa-4 mb-6 bg-surface">
      <v-row align="center">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="busqueda"
            label="Buscar por RFC, CURP o Nombre / Razón Social..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
            @update:model-value="cargarComparecientes"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-btn-toggle
            v-model="filtroTipo"
            mandatory
            density="compact"
            color="primary"
            variant="outlined"
            @update:model-value="cargarComparecientes"
          >
            <v-btn value="todas">Todas</v-btn>
            <v-btn value="fisica">Físicas</v-btn>
            <v-btn value="moral">Morales</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="12" md="2" class="text-right">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            density="comfortable"
            title="Recargar padrón"
            @click="cargarComparecientes"
          />
        </v-col>
      </v-row>
    </v-card>

    <!-- Tabla de Comparecientes -->
    <v-card variant="outlined">
      <v-data-table
        :headers="tableHeaders"
        :items="comparecientes"
        :loading="loading"
        no-data-text="No se encontraron comparecientes registrados"
        hover
      >
        <!-- Columna Compareciente -->
        <template #item.nombre="{ item }">
          <div class="d-flex align-center py-2">
            <v-avatar
              :color="item.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
              variant="tonal"
              size="36"
              class="mr-3 font-weight-bold text-caption"
            >
              {{ getIniciales(item.nombre) }}
            </v-avatar>
            <div>
              <div class="font-weight-medium text-body-2">
                {{ item.nombre }}
              </div>
              <div v-if="item.email" class="text-caption text-medium-emphasis">
                {{ item.email }}
              </div>
            </div>
          </div>
        </template>

        <!-- Columna Tipo -->
        <template #item.tipo_persona="{ item }">
          <v-chip
            :color="item.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
            size="small"
            variant="tonal"
            class="font-weight-bold text-uppercase"
          >
            {{ item.tipo_persona === 'fisica' ? 'Física' : 'Moral' }}
          </v-chip>
        </template>

        <!-- Columna RFC -->
        <template #item.rfc="{ item }">
          <span v-if="item.rfc" class="font-weight-medium" style="font-family: monospace;">
            {{ item.rfc }}
          </span>
          <span v-else class="text-medium-emphasis">—</span>
        </template>

        <!-- Columna CURP / Folio -->
        <template #item.identificador_secundario="{ item }">
          <span v-if="item.identificador_secundario" style="font-family: monospace;" class="text-caption">
            {{ item.identificador_secundario }}
          </span>
          <span v-else class="text-medium-emphasis">—</span>
        </template>

        <!-- Columna Contacto -->
        <template #item.contacto="{ item }">
          <div class="text-caption">
            <div v-if="item.telefono" class="d-flex align-center">
              <v-icon icon="mdi-phone" size="x-small" class="mr-1 text-medium-emphasis" />
              {{ item.telefono }}
            </div>
            <div v-if="!item.telefono && !item.email" class="text-medium-emphasis">—</div>
          </div>
        </template>

        <!-- Columna Estatus -->
        <template #item.activo="{ item }">
          <v-chip
            :color="item.activo ? 'success' : 'grey'"
            size="x-small"
            variant="flat"
          >
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </v-chip>
        </template>

        <!-- Columna Acciones -->
        <template #item.acciones="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn
              icon="mdi-eye-outline"
              size="small"
              variant="text"
              color="primary"
              title="Ver Ficha 360°"
              :to="`/comparecientes/${item.id}`"
            />
            <v-btn
              icon="mdi-pencil-outline"
              size="small"
              variant="text"
              color="primary"
              title="Editar"
              @click="abrirEditar(item)"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo Modal de Registro / Edición -->
    <v-dialog v-model="showDialog" max-width="900" persistent scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-account-details-outline" class="mr-2" />
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ editingCompareciente ? 'Editar Compareciente' : 'Registro de Compareciente en Padrón Notarial' }}
              </div>
              <div class="text-caption text-white-50">
                Acreditación de personalidad y capacidad jurídica conforme a la Ley del Notariado
              </div>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            density="compact"
            :disabled="guardando"
            @click="showDialog = false"
          />
        </v-card-title>

        <!-- Selector de Tipo de Persona en Creación -->
        <div v-if="!editingCompareciente && !editingComparecienteMoral" class="px-6 pt-4 pb-0 bg-surface">
          <v-btn-toggle
            v-model="tipoPersonaModal"
            mandatory
            color="primary"
            variant="outlined"
            density="compact"
          >
            <v-btn value="fisica" prepend-icon="mdi-account">Persona Física</v-btn>
            <v-btn value="moral" prepend-icon="mdi-domain">Persona Moral</v-btn>
          </v-btn-toggle>
        </div>

        <v-card-text class="pa-6">
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            closable
            class="mb-4"
            @click:close="formError = null"
          >
            {{ formError }}
          </v-alert>

          <!-- Formulario Persona Física -->
          <ComparecienteFisicaForm
            v-if="tipoPersonaModal === 'fisica'"
            :initial-values="editingCompareciente ?? undefined"
            :tipos-identificacion="tiposIdentificacion"
            :regimenes-patrimoniales="regimenesPatrimoniales"
            :loading="guardando"
            @submit="handleGuardarFisica"
            @cancel="showDialog = false"
          />

          <!-- Formulario Persona Moral -->
          <ComparecienteMoralForm
            v-else
            :initial-values="editingComparecienteMoral ?? undefined"
            :personas-fisicas="personasFisicasCatalogo"
            :loading="guardando"
            @submit="handleGuardarMoral"
            @cancel="showDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Snackbar de Feedback -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="bottom end">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>
