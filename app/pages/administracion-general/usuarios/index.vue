<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UserRoleAssign from '~/components/admin/UserRoleAssign.vue'

definePageMeta({ middleware: 'require-admin' })

interface UsuarioRow {
  id: string
  nombre_completo: string
  activo: boolean
  rol_id: string
}

const supabase = useSupabaseClient()
const usuarios = ref<UsuarioRow[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)

const showInviteDialog = ref(false)
const inviteEmail = ref('')
const inviteNombre = ref('')
const inviting = ref(false)

async function cargarUsuarios(): Promise<void> {
  loading.value = true
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre_completo, activo, rol_id')
    .order('nombre_completo')

  usuarios.value = data ?? []
  loading.value = false
}

onMounted(cargarUsuarios)

async function invitar(): Promise<void> {
  inviting.value = true
  errorMessage.value = null
  try {
    await $fetch('/api/admin/invite-user', {
      method: 'POST',
      body: { email: inviteEmail.value, nombreCompleto: inviteNombre.value || undefined },
    })
    showInviteDialog.value = false
    inviteEmail.value = ''
    inviteNombre.value = ''
    await cargarUsuarios()
  } catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    errorMessage.value = err?.data?.statusMessage ?? 'No se pudo invitar al usuario.'
  } finally {
    inviting.value = false
  }
}

async function cambiarRol(usuario: UsuarioRow, rolId: string): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('profiles').update({ rol_id: rolId }).eq('id', usuario.id)
  if (error) {
    errorMessage.value = error.message
    return
  }
  await cargarUsuarios()
}

async function cambiarActivo(usuario: UsuarioRow, activo: boolean): Promise<void> {
  errorMessage.value = null
  const { error } = await supabase.from('profiles').update({ activo }).eq('id', usuario.id)
  if (error) {
    errorMessage.value = error.message
    return
  }
  await cargarUsuarios()
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Usuarios</h1>
      <v-btn color="primary" @click="showInviteDialog = true">Invitar usuario</v-btn>
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

    <v-list v-if="!loading">
      <v-list-item v-for="usuario in usuarios" :key="usuario.id" :title="usuario.nombre_completo">
        <template #append>
          <div class="d-flex align-center ga-2" style="width: 320px">
            <UserRoleAssign
              :model-value="usuario.rol_id"
              @update:model-value="(rolId) => cambiarRol(usuario, rolId)"
            />
            <v-switch
              :model-value="usuario.activo"
              label="Activo"
              density="compact"
              hide-details
              @update:model-value="(activo) => cambiarActivo(usuario, !!activo)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="showInviteDialog" max-width="480">
      <v-card color="surface" elevation="8" rounded="lg">
        <v-card-title>Invitar usuario</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="inviteEmail"
            label="Correo"
            type="email"
            variant="outlined"
            density="comfortable"
            class="mb-2"
          />
          <v-text-field
            v-model="inviteNombre"
            label="Nombre completo (opcional)"
            variant="outlined"
            density="comfortable"
          />
          <v-btn color="primary" class="mt-2" :loading="inviting" @click="invitar">Enviar invitación</v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
