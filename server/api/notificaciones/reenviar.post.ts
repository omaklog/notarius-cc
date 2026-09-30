import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { CanalNotificacion, EstatusNotificacion } from '~/types/notificaciones'
import { getNotificacionProvider } from '../../utils/notificaciones/provider'
import { generarUrlWhatsAppWeb } from '../../../app/utils/interpoladorNotificaciones'

interface ReenviarBody {
  notificacion_id: string
  canal_alternativo?: CanalNotificacion
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ReenviarBody>(event)

  if (!body?.notificacion_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identificador de notificación no proporcionado.',
    })
  }

  const supabase = await serverSupabaseClient(event)
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado para reenviar notificaciones.',
    })
  }

  // Consultar la notificación original
  const { data: notificacion, error: fetchError } = await supabase
    .from('notificaciones_bitacora')
    .select('*')
    .eq('id', body.notificacion_id)
    .single()

  if (fetchError || !notificacion) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Notificación no encontrada en bitácora.',
    })
  }

  const canalFinal: CanalNotificacion = body.canal_alternativo || notificacion.canal
  const intentosActualizados = (notificacion.intentos_envio || 1) + 1

  let whatsappWebUrl: string | undefined
  if (canalFinal === 'whatsapp') {
    whatsappWebUrl = generarUrlWhatsAppWeb(
      notificacion.destinatario_contacto,
      notificacion.cuerpo_renderizado,
      notificacion.archivos_adjuntos || []
    )
  }

  // Despachar nuevamente
  const provider = getNotificacionProvider()
  const providerResult = await provider.enviar({
    canal: canalFinal,
    destinatarioNombre: notificacion.destinatario_nombre,
    destinatarioContacto: notificacion.destinatario_contacto,
    asunto: notificacion.asunto,
    cuerpo: notificacion.cuerpo_renderizado,
    archivosAdjuntos: notificacion.archivos_adjuntos,
  })

  const metadataActualizada = {
    ...(notificacion.metadata || {}),
    ...(providerResult.metadata || {}),
    ultimo_reenvio_at: new Date().toISOString(),
    reenviado_por: userData.user.id,
    whatsapp_web_url: whatsappWebUrl,
  }

  await supabase
    .from('notificaciones_bitacora')
    .update({
      canal: canalFinal,
      estatus: providerResult.estatus,
      intentos_envio: intentosActualizados,
      error_detalle: providerResult.error || null,
      metadata: metadataActualizada,
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.notificacion_id)

  return {
    ok: providerResult.ok,
    notificacion_id: notificacion.id,
    estatus: providerResult.estatus,
    intentos_envio: intentosActualizados,
    whatsapp_web_url: whatsappWebUrl,
    mensaje_proveedor: providerResult.mensajeProveedor,
    error: providerResult.error,
  }
})
