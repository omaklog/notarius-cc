<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as yup from 'yup'
import { navigateTo } from '#imports'
import { useAuth } from '~/composables/useAuth'

// Página previa a la autenticación: no usa el shell de 00-layout-shell
// (navbar/drawer), que asume un usuario ya autenticado.
definePageMeta({ layout: false })

const { login } = useAuth()

const schema = toTypedSchema(
  yup.object({
    email: yup.string().required('El correo es obligatorio').email('Correo inválido'),
    password: yup.string().required('La contraseña es obligatoria'),
  }),
)

const { handleSubmit, defineField, errors } = useForm({
  validationSchema: schema,
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const submitting = ref(false)
const authError = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  submitting.value = true
  authError.value = null
  try {
    await login(values.email, values.password)
  } catch (err: any) {
    console.error('Error al iniciar sesión:', err)
    if (
      err?.code === 'invalid_credentials' ||
      err?.message === 'Invalid login credentials' ||
      err?.status === 400
    ) {
      authError.value = 'Correo o contraseña incorrectos.'
    } else if (err?.message) {
      authError.value = err.message
    } else {
      authError.value = 'Error al iniciar sesión. Inténtalo de nuevo.'
    }
    return
  } finally {
    submitting.value = false
  }

  try {
    await navigateTo('/')
  } catch (navError) {
    console.error('Error de navegación tras login:', navError)
    window.location.href = '/'
  }
})

defineExpose({ onSubmit })
</script>

<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
      <v-card width="360" variant="outlined" rounded="md">
        <v-card-title class="text-h6">Iniciar sesión</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="onSubmit">
            <v-text-field
              v-model="email"
              v-bind="emailAttrs"
              label="Correo"
              type="email"
              :error-messages="errors.email ? [errors.email] : []"
              variant="outlined"
              density="comfortable"
              class="mb-2"
              autocomplete="email"
            />
            <v-text-field
              v-model="password"
              v-bind="passwordAttrs"
              label="Contraseña"
              type="password"
              :error-messages="errors.password ? [errors.password] : []"
              variant="outlined"
              density="comfortable"
              autocomplete="current-password"
            />

            <v-alert v-if="authError" type="error" density="compact" class="mt-2" variant="tonal">
              {{ authError }}
            </v-alert>

            <v-btn type="submit" color="primary" block class="mt-4" :loading="submitting">
              Entrar
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>
