<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { findActiveGroupLabel, useNavItems } from '~/composables/useNavItems'
import { useLayoutPreferencesStore } from '~/stores/layoutPreferences.store'
import { useAuth } from '~/composables/useAuth'

const { groups: allGroups } = useNavItems()
const { hasPermiso } = useAuth()
const route = useRoute()
const layoutPreferences = useLayoutPreferencesStore()
const display = useDisplay()

// Filtra ítems/grupos según el permiso del usuario autenticado (spec
// 02-usuarios-roles FR-015) — oculta un grupo completo si ningún ítem le
// queda visible.
const groups = computed(() =>
  allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermiso(item.permiso.modulo, item.permiso.accion)),
    }))
    .filter((group) => group.items.length > 0),
)

const isDesktop = computed(() => display.lgAndUp.value)
const isRail = computed(() => isDesktop.value && layoutPreferences.drawerMode === 'rail')
const isOpen = computed(() =>
  isDesktop.value ? true : layoutPreferences.drawerMode !== 'hidden',
)

function handleModelValueUpdate(value: boolean): void {
  // Solo el modo overlay de mobile/tablet puede cerrarse tocando fuera del drawer.
  if (!isDesktop.value) {
    layoutPreferences.setDrawerMode(value ? 'expanded' : 'hidden')
  }
}

const activeGroupLabel = computed(() => findActiveGroupLabel(groups.value, route.path))

const openGroups = ref<string[]>(activeGroupLabel.value ? [activeGroupLabel.value] : [])

watch(activeGroupLabel, (label) => {
  if (label && !openGroups.value.includes(label)) {
    openGroups.value.push(label)
  }
})
</script>

<template>
  <v-navigation-drawer
    :model-value="isOpen"
    :rail="isRail"
    :permanent="isDesktop"
    :temporary="!isDesktop"
    rail-width="72"
    width="280"
    @update:model-value="handleModelValueUpdate"
  >
    <v-list v-model:opened="openGroups">
      <v-list-group v-for="group in groups" :key="group.label" :value="group.label">
        <template #activator="{ props: activatorProps }">
          <v-list-item v-bind="activatorProps" :prepend-icon="group.icon" :title="group.label" />
        </template>

        <v-list-item
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.label"
          :active="item.to === route.path"
          color="primary"
        />
      </v-list-group>
    </v-list>
  </v-navigation-drawer>
</template>
