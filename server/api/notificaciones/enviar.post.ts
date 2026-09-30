import { createError, defineEventHandler, readBody } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { PayloadEnviarNotificacion, ResultadoDespachoNotificacion } from '~/types/notificaciones'
import { getNotificacionProvider } from '../../utils/notificaciones/provider'
import { interpolarTexto, generarUrlWhatsAppWeb, generarUrlWhatsAppNativo } from '../../../app/utils/interpoladorNotificaciones'

export default defineEventHandler(async (event): Promise<ResultadoDespachoNotificacion> => {
  const body = await readBody<PayloadEnviarNotificacion>(event)

  if (!body?.canal || !body?.destinatario_contacto || !body?.cuerpo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Campos obligatorios incompletos: canal, destinatario_contacto y cuerpo son requeridos.',
    })
  }

  const supabase = await serverSupabaseClient(event)
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autorizado para enviar notificaciones.',
    })
  }

  // Interpolar texto del cuerpo y asunto
  const cuerpoRenderizado = interpolarTexto(body.cuerpo, body.variables || {})
  const asuntoRenderizado = body.asunto ? interpolarTexto(body.asunto, body.variables || {}) : undefined

  // Generar URLs de WhatsApp (protocolo nativo de escritorio y fallback web) si el canal es WhatsApp
  let whatsappWebUrl: string | undefined
  let whatsappNativeUrl: string | undefined
  if (body.canal === 'whatsapp') {
    whatsappNativeUrl = generarUrlWhatsAppNativo(
      body.destinatario_contacto,
      cuerpoRenderizado,
      body.archivos_adjuntos || []
    )
    whatsappWebUrl = generarUrlWhatsAppWeb(
      body.destinatario_contacto,
      cuerpoRenderizado,
      body.archivos_adjuntos || []
    )
  }


  // Despachar mediante proveedor de mensajería (Mock o Real)
  const provider = getNotificacionProvider()
  const providerResult = await provider.enviar({
    canal: body.canal,
    destinatarioNombre: body.destinatario_nombre || 'Cliente',
    destinatarioContacto: body.destinatario_contacto,
    asunto: asuntoRenderizado,
    cuerpo: cuerpoRenderizado,
    archivosAdjuntos: body.archivos_adjuntos,
  })

  // Registrar en la bitácora de notificaciones
  const metadata = {
    ...(providerResult.metadata || {}),
    mensaje_proveedor: providerResult.mensajeProveedor,
    whatsapp_native_url: whatsappNativeUrl,
    whatsapp_web_url: whatsappWebUrl,
    variables_aplicadas: body.variables || {},
  }

  const { data: bitacoraData, error: bitacoraError } = await supabase
    .from('notificaciones_bitacora')
    .insert({
      plantilla_id: body.plantilla_id || null,
      escritura_id: body.escritura_id || null,
      compareciente_id: body.compareciente_id || null,
      canal: body.canal,
      destinatario_nombre: body.destinatario_nombre || 'Cliente',
      destinatario_contacto: body.destinatario_contacto,
      asunto: asuntoRenderizado || null,
      cuerpo_renderizado: cuerpoRenderizado,
      estatus: providerResult.estatus,
      tipo_evento: body.tipo_evento || 'manual',
      intentos_envio: 1,
      error_detalle: providerResult.error || null,
      archivos_adjuntos: body.archivos_adjuntos || [],
      metadata,
      creado_por: userData.user.id,
    })
    .select('id')
    .single()

  if (bitacoraError && !providerResult.ok) {
    throw createError({
      statusCode: 500,
      statusMessage: bitacoraError.message || 'Error al asentar bitácora de notificación.',
    })
  }

  return {
    ok: providerResult.ok,
    notificacion_id: bitacoraData?.id,
    estatus: providerResult.estatus,
    mensaje_proveedor: providerResult.mensajeProveedor,
    whatsapp_native_url: whatsappNativeUrl,
    whatsapp_web_url: whatsappWebUrl,
    error: providerResult.error,
  }
})

