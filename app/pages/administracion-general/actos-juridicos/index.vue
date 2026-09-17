<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSupabaseClient } from '#imports'

definePageMeta({ middleware: 'require-admin' })

export interface ActoJuridicoRow {
  id: string
  nombre: string
  descripcion: string | null
  tipo: 'traslativo' | 'no_traslativo'
  activo: boolean
  es_actividad_vulnerable: boolean
}

const supabase = useSupabaseClient()

const actos = ref<ActoJuridicoRow[]>([])
const loading = ref(true)
const showDialog = ref(false)
const editingActo = ref<ActoJuridicoRow | null>(null)
const errorMessage = ref<string | null>(null)
const formError = ref<string | null>(null)
const guardando = ref(false)

const TIPOS = [
  { value: 'traslativo', title: 'Traslativo' },
  { value: 'no_traslativo', title: 'No traslativo' },
]

const formNombre = ref('')
const formDescripcion = ref('')
const formTipo = ref<'traslativo' | 'no_traslativo'>('no_traslativo')
const formActivo = ref(true)
const formEsActividadVulnerable = ref(false)

const showRolesDialog = ref(false)
const configuringActo = ref<ActoJuridicoRow | null>(null)
const rolesCatalogo = ref<{ id: string; nombre: string; codigo: string }[]>([])
const rolesSeleccionados = ref<string[]>([])
const guardandoRoles = ref(false)
const nuevoRolNombre = ref('')
const creandoNuevoRol = ref(false)
const rolesError = ref<string | null>(null)

async function cargarRolesCatalogo(): Promise<void> {
  const { data } = await supabase
    .from('roles_compareciente')
    .select('id, nombre, codigo')
    .eq('activo', true)
    .order('nombre')
  rolesCatalogo.value = data ?? []
}

async function abrirConfigurarRoles(acto: ActoJuridicoRow): Promise<void> {
  configuringActo.value = acto
  rolesError.value = null
  showRolesDialog.value = true
  nuevoRolNombre.value = ''

  await cargarRolesCatalogo()

  const { data } = await supabase
    .from('acto_juridico_roles')
    .select('rol_compareciente_id')
    .eq('acto_juridico_id', acto.id)

  rolesSeleccionados.value = (data ?? []).map((r: any) => r.rol_compareciente_id)
}

async function crearYAgregarRol(): Promise<void> {
  if (!nuevoRolNombre.value.trim()) return
  creandoNuevoRol.value = true
  rolesError.value = null

  const nombreLimpio = nuevoRolNombre.value.trim().toUpperCase()
  const codigoLimpio = nombreLimpio.toLowerCase().replace(/[^a-z0-9]/g, '_')

  const { data, error } = await supabase
    .from('roles_compareciente')
    .insert({
      nombre: nombreLimpio,
      codigo: codigoLimpio,
      activo: true,
    })
    .select('id, nombre, codigo')
    .single()

  creandoNuevoRol.value = false

  if (error) {
    rolesError.value = error.message
    return
  }

  if (data) {
    rolesCatalogo.value.push(data)
    rolesSeleccionados.value.push(data.id)
    nuevoRolNombre.value = ''
  }
}

async function guardarRolesActo(): Promise<void> {
  if (!configuringActo.value) return
  guardandoRoles.value = true
  rolesError.value = null

  const actoId = configuringActo.value.id

  // Obtener roles actuales en base de datos para este acto
  const { data: actuales } = await supabase
    .from('acto_juridico_roles')
    .select('rol_compareciente_id')
    .eq('acto_juridico_id', actoId)

  const actualesIds = new Set((actuales ?? []).map((r: any) => r.rol_compareciente_id))
  const seleccionadosSet = new Set(rolesSeleccionados.value)

  // Roles a agregar
  const paraAgregar = rolesSeleccionados.value
    .filter((id) => !actualesIds.has(id))
    .map((rolId) => ({
      acto_juridico_id: actoId,
      rol_compareciente_id: rolId,
    }))

  // Roles a remover
  const paraRemover = [...actualesIds].filter((id) => !seleccionadosSet.has(id))

  if (paraAgregar.length > 0) {
    const { error: insertError } = await supabase
      .from('acto_juridico_roles')
      .insert(paraAgregar)
    if (insertError) {
      rolesError.value = insertError.message
      guardandoRoles.value = false
      return
    }
  }

  if (paraRemover.length > 0) {
    for (const rolId of paraRemover) {
      await supabase
        .from('acto_juridico_roles')
        .delete()
        .eq('acto_juridico_id', actoId)
        .eq('rol_compareciente_id', rolId)
    }
  }

  guardandoRoles.value = false
  showRolesDialog.value = false
}

async function cargarActos(): Promise<void> {
  loading.value = true
  errorMessage.value = null
  const { data, error } = await supabase
    .from('actos_juridicos')
    .select('id, nombre, descripcion, tipo, activo, es_actividad_vulnerable')
    .order('nombre')

  if (error) {
    errorMessage.value = error.message
  } else {
    actos.value = data ?? []
  }
  loading.value = false
}

onMounted(cargarActos)

function abrirCrear(): void {
  editingActo.value = null
  formNombre.value = ''
  formDescripcion.value = ''
  formTipo.value = 'no_traslativo'
  formActivo.value = true
  formEsActividadVulnerable.value = false
  formError.value = null
  showDialog.value = true
}

function abrirEditar(acto: ActoJuridicoRow): void {
  editingActo.value = acto
  formNombre.value = acto.nombre
  formDescripcion.value = acto.descripcion ?? ''
  formTipo.value = acto.tipo
  formActivo.value = acto.activo
  formEsActividadVulnerable.value = acto.es_actividad_vulnerable ?? false
  formError.value = null
  showDialog.value = true
}

async function guardar(): Promise<void> {
  formError.value = null
  if (!formNombre.value.trim()) {
    formError.value = 'El nombre del acto jurídico es obligatorio'
    return
  }

  guardando.value = true

  const payload = {
    nombre: formNombre.value.trim(),
    descripcion: formDescripcion.value.trim() || null,
    tipo: formTipo.value,
    activo: formActivo.value,
    es_actividad_vulnerable: formEsActividadVulnerable.value,
  }

  if (editingActo.value) {
    const { error } = await supabase
      .from('actos_juridicos')
      .update(payload)
      .eq('id', editingActo.value.id)

    guardando.value = false
    if (error) {
      formError.value = error.message
      return
    }
  } else {
    const { error } = await supabase
      .from('actos_juridicos')
      .insert(payload)

    guardando.value = false
    if (error) {
      formError.value = error.message
      return
    }
  }

  showDialog.value = false
  await cargarActos()
}

async function eliminar(acto: ActoJuridicoRow): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase
    .from('actos_juridicos')
    .delete()
    .eq('id', acto.id)

  if (error) {
    errorMessage.value = error.message
    return
  }
  await cargarActos()
}

defineExpose({
  actos,
  loading,
  showDialog,
  editingActo,
  formNombre,
  formDescripcion,
  formTipo,
  formActivo,
  abrirCrear,
  abrirEditar,
  guardar,
  eliminar,
  cargarActos,
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h5">Catálogo de Actos Jurídicos</h1>
        <p class="text-body-2 text-medium-emphasis">
          Administración de tipos de actos notariales y su clasificación traslativa/no traslativa.
        </p>
      </div>
      <v-btn color="primary" @click="abrirCrear">
        Nuevo acto
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

    <v-card variant="outlined">
      <v-list v-if="!loading && actos.length > 0">
        <v-list-item
          v-for="acto in actos"
          :key="acto.id"
          :title="acto.nombre"
          :subtitle="acto.descripcion || 'Sin descripción'"
        >
          <template #append>
            <div class="d-flex align-center ga-2">
              <v-chip
                :color="acto.tipo === 'traslativo' ? 'info' : 'default'"
                size="small"
                variant="tonal"
              >
                {{ acto.tipo === 'traslativo' ? 'Traslativo' : 'No traslativo' }}
              </v-chip>

              <v-chip
                v-if="acto.es_actividad_vulnerable"
                color="warning"
                size="small"
                variant="tonal"
                prepend-icon="mdi-shield-alert-outline"
              >
                Vulnerable (PLD)
              </v-chip>

              <v-chip
                :color="acto.activo ? 'success' : 'error'"
                size="small"
                variant="flat"
              >
                {{ acto.activo ? 'Activo' : 'Inactivo' }}
              </v-chip>

              <v-btn
                icon="mdi-account-multiple-check-outline"
                variant="text"
                size="small"
                :aria-label="`Roles de ${acto.nombre}`"
                title="Configurar roles permitidos"
                @click="abrirConfigurarRoles(acto)"
              />

              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                :aria-label="`Editar ${acto.nombre}`"
                @click="abrirEditar(acto)"
              />

              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                :aria-label="`Eliminar ${acto.nombre}`"
                @click="eliminar(acto)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>

      <div v-else-if="!loading" class="text-body-2 text-medium-emphasis text-center py-8">
        No hay actos jurídicos registrados.
      </div>
    </v-card>

    <v-dialog v-model="showDialog" max-width="500" persistent>
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title>
          {{ editingActo ? 'Editar acto jurídico' : 'Nuevo acto jurídico' }}
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="formError = null"
          >
            {{ formError }}
          </v-alert>

          <v-form @submit.prevent="guardar">
            <v-text-field
              v-model="formNombre"
              label="Nombre del acto jurídico"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              autofocus
            />

            <v-select
              v-model="formTipo"
              label="Tipo de acto"
              :items="TIPOS"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="comfortable"
              class="mb-2"
            />

            <v-textarea
              v-model="formDescripcion"
              label="Descripción (opcional)"
              variant="outlined"
              density="comfortable"
              rows="2"
              class="mb-2"
            />

            <v-switch
              v-model="formActivo"
              label="Activo"
              color="primary"
              hide-details
              density="compact"
              class="mb-2"
            />

            <v-switch
              v-model="formEsActividadVulnerable"
              label="Actividad Vulnerable (LFPIORPI Art. 17)"
              color="warning"
              hide-details
              density="compact"
              class="mb-2"
            />

            <div class="d-flex justify-end ga-2 mt-4">
              <v-btn variant="text" :disabled="guardando" @click="showDialog = false">
                Cancelar
              </v-btn>
              <v-btn type="submit" color="primary" :loading="guardando">
                Guardar
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Diálogo de asignación de roles de compareciente permitidos -->
    <v-dialog v-model="showRolesDialog" max-width="600" persistent>
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Roles permitidos: {{ configuringActo?.nombre }}</span>
          <v-chip size="small" variant="tonal" color="primary">
            {{ rolesSeleccionados.length }} seleccionados
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="rolesError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
            closable
            @click:close="rolesError = null"
          >
            {{ rolesError }}
          </v-alert>

          <p class="text-body-2 text-medium-emphasis mb-3">
            Selecciona los tipos de comparecientes que podrán registrarse en una escritura con este acto jurídico:
          </p>

          <v-divider class="mb-3" />

          <!-- Listado de roles con checkboxes -->
          <div style="max-height: 280px; overflow-y: auto;" class="pr-2 mb-3">
            <div v-for="rol in rolesCatalogo" :key="rol.id" class="d-flex align-center py-1">
              <v-checkbox
                v-model="rolesSeleccionados"
                :value="rol.id"
                :label="rol.nombre"
                density="compact"
                hide-details
                color="primary"
              />
            </div>
            <div v-if="rolesCatalogo.length === 0" class="text-caption text-medium-emphasis py-4 text-center">
              No hay roles en el catálogo general.
            </div>
          </div>

          <v-divider class="mb-3" />

          <!-- Formulario rápido para crear un nuevo rol -->
          <div class="d-flex align-center ga-2 mb-2">
            <v-text-field
              v-model="nuevoRolNombre"
              label="Crear nuevo rol de compareciente"
              placeholder="Ej. GARANTE HIPOTECARIO"
              variant="outlined"
              density="compact"
              hide-details
              @keydown.enter.prevent="crearYAgregarRol"
            />
            <v-btn
              color="secondary"
              variant="tonal"
              density="comfortable"
              :loading="creandoNuevoRol"
              @click="crearYAgregarRol"
            >
              Agregar
            </v-btn>
          </div>

          <div class="d-flex justify-end ga-2 mt-4">
            <v-btn variant="text" :disabled="guardandoRoles" @click="showRolesDialog = false">
              Cancelar
            </v-btn>
            <v-btn color="primary" :loading="guardandoRoles" @click="guardarRolesActo">
              Guardar configuración
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
