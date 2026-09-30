<script setup lang="ts">
import HonorariosTab from '~/components/escrituras/tabs/HonorariosTab.vue'

defineProps<{
  escrituraId: string
  estatusEscritura?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'status-change'): void
}>()
</script>

<template>
  <HonorariosTab
    :escritura-id="escrituraId"
    :estatus-escritura="estatusEscritura"
    :read-only="readOnly"
    @status-change="emit('status-change')"
  />
</template>
