<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useShellStateStore } from '~/composables/useAppShell'

const route = useRoute()
const shellState = useShellStateStore()

const hasMultipleLevels = computed(
  () => route.path.split('/').filter(Boolean).length > 1,
)

const visible = computed(() => hasMultipleLevels.value && shellState.breadcrumb.length > 0)

const items = computed(() =>
  shellState.breadcrumb.map((item) => ({
    title: item.label,
    to: item.to,
    disabled: !item.to,
  })),
)
</script>

<template>
  <v-breadcrumbs v-if="visible" :items="items" density="compact" />
</template>
