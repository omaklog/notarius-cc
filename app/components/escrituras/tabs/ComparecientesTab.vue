<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSupabaseClient } from '#imports'
import ComparecienteFisicaForm from '~/components/comparecientes/ComparecienteFisicaForm.vue'
import type { CatalogoItem, ComparecienteFisicaFormValues } from '~/components/comparecientes/ComparecienteFisicaForm.vue'
import ComparecienteSearchDialog from '~/components/comparecientes/ComparecienteSearchDialog.vue'
import type { RolOption } from '~/components/comparecientes/ComparecienteSearchDialog.vue'
import { useExpedienteDocumentos } from '~/composables/useExpedienteDocumentos'

const props = defineProps<{
  escrituraId: string
  actoJuridicoId?: string
  instrumentoNumero?: number | string
}>()

export interface EscrituraComparecienteRow {
  id: string
  compareciente_id: string
  nombre: string
  tipo_persona: string
  rfc?: string | null
  rol_id: string
  rol: string
  porcentaje_participacion: number | null
}

const supabase = useSupabaseClient()

const comparecientes = ref<EscrituraComparecienteRow[]>([])
const rolesDisponibles = ref<RolOption[]>([])
const actoJuridicoNombre = ref<string>('')
const loading = ref(true)
const loadingRoles = ref(false)
const errorMessage = ref<string | null>(null)
const asociando = ref(false)

// Modales
const showSearchDialog = ref(false)
const showCreateDialog = ref(false)

// Catálogos para el modal de alta rápida
const tiposIdentificacion = ref<CatalogoItem[]>([])
const regimenesPatrimoniales = ref<CatalogoItem[]>([])

const totalPorcentajeAsignado = computed(() => {
  return comparecientes.value.reduce((acc, curr) => acc + (Number(curr.porcentaje_participacion) || 0), 0)
})

async function cargarRoles(targetActoId: string): Promise<void> {
  loadingRoles.value = true
  const { data } = await supabase
    .from('acto_juridico_roles')
    .select('rol_compareciente_id, roles_compareciente(id, nombre, codigo, activo)')
    .eq('acto_juridico_id', targetActoId)

  if (data && Array.isArray(data)) {
    rolesDisponibles.value = data
      .map((item: any) => item.roles_compareciente)
      .filter((r: any) => r && r.activo !== false)
      .map((r: any) => ({
        id: r.id,
        nombre: r.nombre,
        codigo: r.codigo,
      }))
  }
  loadingRoles.value = false
}

async function cargarCatalogos(): Promise<void> {
  const [tiposRes, regimenesRes] = await Promise.all([
    supabase.from('tipos_identificacion_oficial').select('id, nombre, codigo').eq('activo', true).order('nombre'),
    supabase.from('regimenes_patrimoniales').select('id, nombre, codigo').eq('activo', true).order('nombre'),
  ])

  tiposIdentificacion.value = (tiposRes.data as CatalogoItem[]) ?? []
  regimenesPatrimoniales.value = (regimenesRes.data as CatalogoItem[]) ?? []
}

async function cargar(): Promise<void> {
  loading.value = true
  errorMessage.value = null

  let actoId = props.actoJuridicoId
  if (!actoId) {
    const query = supabase
      .from('escrituras')
      .select('acto_juridico_id, actos_juridicos(nombre)')
      .eq('id', props.escrituraId)
    const res = typeof (query as any)?.single === 'function' ? await (query as any).single() : await query
    const escData = res?.data
    const target = Array.isArray(escData) ? escData[0] : escData
    actoId = target?.acto_juridico_id
    if (target?.actos_juridicos) {
      actoJuridicoNombre.value = target.actos_juridicos.nombre
    }
  }

  if (actoId) {
    await cargarRoles(actoId)
  }

  const { data, error } = await supabase
    .from('escritura_comparecientes')
    .select(`
      id,
      compareciente_id,
      rol_id,
      porcentaje_participacion,
      comparecientes(id, nombre, tipo_persona, rfc),
      roles_compareciente(id, nombre)
    `)
    .eq('escritura_id', props.escrituraId)

  if (error) {
    errorMessage.value = `Error al cargar comparecientes: ${error.message}`
  } else {
    comparecientes.value = (data ?? []).map((row: any) => {
      const comp = row.comparecientes as { id: string; nombre: string; tipo_persona: string; rfc?: string } | null
      const rolRef = row.roles_compareciente as { id: string; nombre: string } | null
      return {
        id: row.id,
        compareciente_id: row.compareciente_id,
        nombre: comp?.nombre ?? '',
        tipo_persona: comp?.tipo_persona ?? 'fisica',
        rfc: comp?.rfc ?? null,
        rol_id: row.rol_id,
        rol: rolRef?.nombre ?? row.rol_id ?? '',
        porcentaje_participacion: row.porcentaje_participacion,
      }
    })
  }

  loading.value = false
}

async function asociarCompareciente(payload: {
  comparecienteId: string
  comparecienteNombre?: string
  rolId: string
  porcentaje: number | null
}): Promise<boolean> {
  asociando.value = true
  errorMessage.value = null

  try {
    const { error } = await supabase.rpc('fn_asociar_compareciente', {
      p_escritura_id: props.escrituraId,
      p_compareciente_id: payload.comparecienteId,
      p_nombre_nuevo: null,
      p_rol_id: payload.rolId,
      p_porcentaje: payload.porcentaje,
    })

    if (error) throw error

    await cargar()
    return true
  } catch (err: any) {
    errorMessage.value = err.message || 'Error al asociar compareciente a la escritura'
    return false
  } finally {
    asociando.value = false
  }
}

async function desvincularCompareciente(id: string): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('escritura_comparecientes').delete().eq('id', id)
  if (error) {
    errorMessage.value = `Error al desvincular compareciente: ${error.message}`
    return
  }
  await cargar()
}

async function handleAltaRapida(values: ComparecienteFisicaFormValues): Promise<void> {
  asociando.value = true
  errorMessage.value = null

  try {
    const { data: newId, error } = await supabase.rpc('fn_guardar_compareciente_fisica', {
      p_id: null,
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

    const idGuardado = (newId as string) || values.id
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

    showCreateDialog.value = false
    showSearchDialog.value = true
  } catch (err: any) {
    errorMessage.value = err.message || 'Error al dar de alta al compareciente'
  } finally {
    asociando.value = false
  }
}

function abrirAltaRapida(): void {
  showSearchDialog.value = false
  showCreateDialog.value = true
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
  await Promise.all([cargarCatalogos(), cargar()])
})

defineExpose({
  cargar,
  asociarCompareciente,
  desvincularCompareciente,
  rolesDisponibles,
  comparecientes,
})
</script>

<template>
  <div class="pa-2">
    <!-- Encabezado de la Sección -->
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
      <div>
        <div class="d-flex align-center">
          <h2 class="text-h6 font-weight-bold text-primary mr-3">
            Otorgantes y Comparecientes
          </h2>
          <v-chip
            v-if="totalPorcentajeAsignado > 0"
            size="small"
            :color="totalPorcentajeAsignado > 100 ? 'error' : 'secondary'"
            variant="tonal"
            class="font-weight-bold"
          >
            Alícuota Asignada: {{ totalPorcentajeAsignado.toFixed(2) }}%
          </v-chip>
        </div>
        <p class="text-caption text-medium-emphasis mb-0">
          Acreditación de partes otorgantes con filtro estricto de roles permitidos por el acto jurídico.
        </p>
      </div>

      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-account-search-outline"
        @click="showSearchDialog = true"
      >
        Vincular Compareciente
      </v-btn>
    </div>

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

    <!-- Lista de Comparecientes Vinculados -->
    <v-card variant="outlined" class="mb-4">
      <div v-if="loading" class="pa-6 text-center">
        <v-progress-circular indeterminate color="primary" size="32" class="mb-2" />
        <div class="text-caption text-medium-emphasis">Cargando comparecientes...</div>
      </div>

      <div v-else-if="comparecientes.length === 0" class="pa-8 text-center bg-surface">
        <v-icon icon="mdi-account-group-outline" size="48" color="medium-emphasis" class="mb-2" />
        <h3 class="text-subtitle-1 font-weight-bold mb-1">
          Sin comparecientes vinculados
        </h3>
        <p class="text-caption text-medium-emphasis mb-4">
          Esta escritura aún no tiene otorgantes registrados. Utilice el buscador para vincularlos desde el padrón notarial.
        </p>
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          prepend-icon="mdi-account-plus"
          @click="showSearchDialog = true"
        >
          Vincular primer compareciente
        </v-btn>
      </div>

      <v-table v-else density="comfortable" hover>
        <thead>
          <tr>
            <th>Compareciente</th>
            <th>Tipo</th>
            <th>RFC</th>
            <th>Rol en este Acto</th>
            <th>Alícuota / %</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in comparecientes" :key="c.id">
            <td>
              <div class="d-flex align-center py-2">
                <v-avatar
                  :color="c.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
                  variant="tonal"
                  size="32"
                  class="font-weight-bold text-caption mr-3"
                >
                  {{ getIniciales(c.nombre) }}
                </v-avatar>
                <div>
                  <div class="font-weight-medium text-body-2">{{ c.nombre }}</div>
                </div>
              </div>
            </td>
            <td>
              <v-chip
                :color="c.tipo_persona === 'fisica' ? 'primary' : 'secondary'"
                size="x-small"
                variant="tonal"
                class="font-weight-bold"
              >
                {{ c.tipo_persona === 'fisica' ? 'FÍSICA' : 'MORAL' }}
              </v-chip>
            </td>
            <td>
              <span v-if="c.rfc" style="font-family: monospace;" class="text-caption">
                {{ c.rfc }}
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td>
              <v-chip size="small" color="primary" variant="outlined" class="font-weight-medium">
                {{ c.rol }}
              </v-chip>
            </td>
            <td>
              <span v-if="c.porcentaje_participacion !== null" class="font-weight-bold text-body-2">
                {{ Number(c.porcentaje_participacion).toFixed(2) }}%
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td class="text-right">
              <v-btn
                icon="mdi-link-variant-off"
                size="small"
                variant="text"
                color="error"
                title="Desvincular compareciente"
                @click="desvincularCompareciente(c.id)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Modal de Búsqueda Predictiva y Asociación -->
    <ComparecienteSearchDialog
      v-model="showSearchDialog"
      :acto-juridico-nombre="actoJuridicoNombre"
      :instrumento-numero="instrumentoNumero"
      :roles-disponibles="rolesDisponibles"
      :loading="asociando"
      @select="asociarCompareciente"
      @open-crear="abrirAltaRapida"
    />

    <!-- Diálogo de Alta Rápida de Compareciente (si no existe en padrón) -->
    <v-dialog v-model="showCreateDialog" max-width="850" persistent scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="pa-4 bg-primary text-white d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-icon icon="mdi-account-plus" class="mr-2" />
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Alta Rápida de Compareciente en Padrón
              </div>
              <div class="text-caption text-white-50">
                Registro notarial inmediato de persona física para vinculación
              </div>
            </div>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            color="white"
            density="compact"
            @click="showCreateDialog = false"
          />
        </v-card-title>

        <v-card-text class="pa-6">
          <ComparecienteFisicaForm
            :tipos-identificacion="tiposIdentificacion"
            :regimenes-patrimoniales="regimenesPatrimoniales"
            :loading="asociando"
            @submit="handleAltaRapida"
            @cancel="showCreateDialog = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
