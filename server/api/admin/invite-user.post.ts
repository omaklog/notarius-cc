import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'

interface InviteUserBody {
  email: string
  nombreCompleto?: string
  rolId?: string
}

// service_role solo se usa aquí, del lado servidor — nunca llega al cliente
// (01-infra-supabase/contracts/supabase-infra-contract.md).
export default defineEventHandler(async (event) => {
  const body = await readBody<InviteUserBody>(event)

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: 'El correo es obligatorio.' })
  }

  // Verifica que quien llama tiene administracion.acceso — nunca una
  // comprobación de rol por nombre (contracts/usuarios-roles-interface.md).
  const callerClient = await serverSupabaseClient(event)
  const { data: puedeInvitar, error: permisoError } = await callerClient.rpc('fn_has_permiso', {
    p_modulo: 'administracion',
    p_accion: 'acceso',
  })

  if (permisoError || !puedeInvitar) {
    throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para invitar usuarios.' })
  }

  const adminClient = serverSupabaseServiceRole(event)

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
    data: body.nombreCompleto ? { full_name: body.nombreCompleto } : undefined,
  })

  if (error || !data.user) {
    throw createError({ statusCode: 400, statusMessage: error?.message ?? 'No se pudo invitar al usuario.' })
  }

  if (body.rolId) {
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ rol_id: body.rolId })
      .eq('id', data.user.id)

    if (updateError) {
      throw createError({ statusCode: 400, statusMessage: updateError.message })
    }
  }

  return { id: data.user.id, email: data.user.email }
})
