import type { CanalNotificacion, EstatusNotificacion, ArchivoAdjuntoNotificacion } from '~/types/notificaciones'

export interface NotificacionProviderInput {
  canal: CanalNotificacion
  destinatarioNombre: string
  destinatarioContacto: string
  asunto?: string
  cuerpo: string
  archivosAdjuntos?: ArchivoAdjuntoNotificacion[]
}

export interface NotificacionProviderResult {
  ok: boolean
  estatus: EstatusNotificacion
  mensajeProveedor: string
  idExterno?: string
  metadata?: Record<string, any>
  error?: string
}

export interface NotificacionProvider {
  enviar(input: NotificacionProviderInput): Promise<NotificacionProviderResult>
}

export class MockNotificacionProvider implements NotificacionProvider {
  async enviar(input: NotificacionProviderInput): Promise<NotificacionProviderResult> {
    // Simulación de validaciones básicas de canal y contacto
    if (!input.destinatarioContacto || input.destinatarioContacto.includes('invalido')) {
      return {
        ok: false,
        estatus: 'fallido',
        mensajeProveedor: 'Error de entrega: Destinatario o contacto inválido.',
        error: 'El destinatario no cuenta con un número o buzón válido.',
      }
    }

    const timestamp = new Date().toISOString()
    const idExterno = `mock-msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // WhatsApp Web se marca inicialmente como 'enviado' para que el usuario abra la ventana
    // Correo y SMS simulados se marcan como 'entregado'
    const estatus: EstatusNotificacion = input.canal === 'whatsapp' ? 'enviado' : 'entregado'

    return {
      ok: true,
      estatus,
      mensajeProveedor: `Mensaje despachado exitosamente mediante proveedor simulado (${input.canal}).`,
      idExterno,
      metadata: {
        proveedor: 'mock-provider',
        timestamp,
        canal: input.canal,
        adjuntos_contados: input.archivosAdjuntos?.length ?? 0,
      },
    }
  }
}

let activeProvider: NotificacionProvider = new MockNotificacionProvider()

export function setNotificacionProvider(provider: NotificacionProvider) {
  activeProvider = provider
}

export function getNotificacionProvider(): NotificacionProvider {
  return activeProvider
}
