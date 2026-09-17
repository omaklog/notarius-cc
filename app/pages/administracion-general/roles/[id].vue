<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import RoleForm from '~/components/admin/RoleForm.vue'
import PermissionChecklist from '~/components/admin/PermissionChecklist.vue'
import type { AsignacionPermiso, Permiso } from '~/components/admin/PermissionChecklist.vue'

definePageMeta({ middleware: 'require-admin' })

const route = useRoute()
const rolId = route.params.id as string
const supabase = useSupabaseClient()

const rol = ref<{ nombre: string; descripcion: string | null } | null>(null)
const permisos = ref<Permiso[]>([])
const asignaciones = ref<AsignacionPermiso[]>([])
const asignacionesOriginales = ref<AsignacionPermiso[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const savedMessage = ref<string | null>(null)

async function cargar(): Promise<void> {
  loading.value = true

  const [{ data: rolData }, { data: permisosData }, { data: rolPermisosData }] = await Promise.all([
    supabase.from('roles').select('nombre, descripcion').eq('id', rolId).single(),
    supabase.from('permisos').select('id, modulo, accion, descripcion, requiere_alcance').order('modulo'),
    supabase.from('rol_permisos').select('permiso_id, alcance').eq('rol_id', rolId),
  ])

  rol.value = rolData
  permisos.value = permisosData ?? []
  const cargados = (rolPermisosData ?? []).map((row) => ({
    permiso_id: row.permiso_id,
    alcance: row.alcance,
  }))
  asignaciones.value = cargados
  asignacionesOriginales.value = cargados
  loading.value = false
}

onMounted(cargar)

async function actualizarDatosRol(values: { nombre: string; descripcion: string | null }): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('roles').update(values).eq('id', rolId)
  if (error) {
    errorMessage.value = error.message
    return
  }
  savedMessage.value = 'Datos del rol actualizados.'
}

async function guardarPermisos(): Promise<void> {
  saving.value = true
  errorMessage.value = null
  savedMessage.value = null

  try {
    // Solo se elimina lo que realmente se quitó (no se hace delete-all):
    // la salvaguarda de US3 (trg_bloquear_remover_ultimo_admin_permiso)
    // se dispara por cada DELETE de rol_permisos, así que reinsertar un
    // permiso que se dejó marcado no debe pasar por un delete espurio.
    const idsActuales = new Set(asignaciones.value.map((a) => a.permiso_id))
    const idsAEliminar = asignacionesOriginales.value
      .filter((a) => !idsActuales.has(a.permiso_id))
      .map((a) => a.permiso_id)

    if (idsAEliminar.length > 0) {
      const { error: deleteError } = await supabase
        .from('rol_permisos')
        .delete()
        .eq('rol_id', rolId)
        .in('permiso_id', idsAEliminar)
      if (deleteError) throw deleteError
    }

    if (asignaciones.value.length > 0) {
      const { error: upsertError } = await supabase.from('rol_permisos').upsert(
        asignaciones.value.map((a) => ({
          rol_id: rolId,
          permiso_id: a.permiso_id,
          alcance: a.alcance,
        })),
        { onConflict: 'rol_id,permiso_id' },
      )
      if (upsertError) throw upsertError
    }

    asignacionesOriginales.value = asignaciones.value.map((a) => ({ ...a }))
    savedMessage.value = 'Permisos actualizados.'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'No se pudieron guardar los permisos.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="!loading && rol">
    <h1 class="text-h5 mb-4">Editar rol: {{ rol.nombre }}</h1>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
      {{ errorMessage }}
    </v-alert>
    <v-alert v-if="savedMessage" type="success" variant="tonal" density="compact" class="mb-4">
      {{ savedMessage }}
    </v-alert>

    <v-card variant="outlined" class="mb-6 pa-4">
      <RoleForm :nombre="rol.nombre" :descripcion="rol.descripcion" @submit="actualizarDatosRol">
        <template #actions>
          <v-btn type="submit" color="primary" class="mt-2">Guardar datos</v-btn>
        </template>
      </RoleForm>
    </v-card>

    <v-card variant="outlined" class="pa-4">
      <h2 class="text-subtitle-1 mb-2">Permisos</h2>
      <PermissionChecklist v-model="asignaciones" :permisos="permisos" />
      <v-btn color="primary" :loading="saving" @click="guardarPermisos">Guardar permisos</v-btn>
    </v-card>
  </div>
</template>
