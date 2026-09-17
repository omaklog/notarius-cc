<script setup lang="ts">
import { onMounted, ref } from 'vue'
import RoleForm from '~/components/admin/RoleForm.vue'

definePageMeta({ middleware: 'require-admin' })

interface RoleRow {
  id: string
  nombre: string
  descripcion: string | null
  es_sistema: boolean
  usuarios_count: number
}

const supabase = useSupabaseClient()
const roles = ref<RoleRow[]>([])
const loading = ref(true)
const showCreateDialog = ref(false)
const errorMessage = ref<string | null>(null)

async function cargarRoles(): Promise<void> {
  loading.value = true
  const { data } = await supabase
    .from('roles')
    .select('id, nombre, descripcion, es_sistema, profiles(count)')
    .order('nombre')

  roles.value = (data ?? []).map((row: any) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    es_sistema: row.es_sistema,
    usuarios_count: row.profiles?.[0]?.count ?? 0,
  }))
  loading.value = false
}

onMounted(cargarRoles)

async function crearRol(values: { nombre: string; descripcion: string | null }): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('roles').insert(values)
  if (error) {
    errorMessage.value = error.message
    return
  }
  showCreateDialog.value = false
  await cargarRoles()
}

async function eliminarRol(rol: RoleRow): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('roles').delete().eq('id', rol.id)
  if (error) {
    errorMessage.value = error.message
    return
  }
  await cargarRoles()
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Roles</h1>
      <v-btn color="primary" @click="showCreateDialog = true">Crear rol</v-btn>
    </div>

    <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4" closable @click:close="errorMessage = null">
      {{ errorMessage }}
    </v-alert>

    <v-list v-if="!loading">
      <v-list-item
        v-for="rol in roles"
        :key="rol.id"
        :to="`/administracion-general/roles/${rol.id}`"
        :title="rol.nombre"
        :subtitle="`${rol.usuarios_count} usuario(s)${rol.es_sistema ? ' · rol del sistema' : ''}`"
      >
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            :disabled="rol.es_sistema || rol.usuarios_count > 0"
            :aria-label="`Eliminar ${rol.nombre}`"
            @click.prevent.stop="eliminarRol(rol)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="showCreateDialog" max-width="480">
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title>Crear rol</v-card-title>
        <v-card-text>
          <RoleForm @submit="crearRol">
            <template #actions>
              <v-btn type="submit" color="primary" class="mt-2">Guardar</v-btn>
            </template>
          </RoleForm>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
