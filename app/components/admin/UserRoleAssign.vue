<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const supabase = useSupabaseClient()
const roles = ref<{ id: string; nombre: string }[]>([])
const loading = ref(true)

onMounted(async () => {
  const { data } = await supabase.from('roles').select('id, nombre').order('nombre')
  roles.value = data ?? []
  loading.value = false
})
</script>

<template>
  <v-select
    :model-value="props.modelValue"
    :items="roles"
    item-title="nombre"
    item-value="id"
    label="Rol"
    :loading="loading"
    variant="outlined"
    density="comfortable"
    @update:model-value="(value) => emit('update:modelValue', value)"
  />
</template>
