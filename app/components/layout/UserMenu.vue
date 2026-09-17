<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { user, logout } = useAuth()

const displayName = computed(() => user.value?.nombreCompleto ?? 'Usuario')
const displayRole = computed(() => user.value?.rolNombre ?? '')

const initials = computed(() =>
  displayName.value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(''),
)

async function handleLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <v-menu>
    <template #activator="{ props: activatorProps }">
      <button
        v-bind="activatorProps"
        type="button"
        class="user-menu-activator"
        :aria-label="`Menú de usuario: ${displayName}`"
      >
        <v-avatar size="36" color="primary">
          <span class="text-body-2">{{ initials }}</span>
        </v-avatar>
      </button>
    </template>

    <v-list>
      <v-list-item :title="displayName" :subtitle="displayRole" />
      <v-divider />
      <v-list-item title="Cerrar sesión" prepend-icon="mdi-logout" @click="handleLogout" />
    </v-list>
  </v-menu>
</template>

<style scoped>
.user-menu-activator {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  line-height: 0;
}

.user-menu-activator:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
