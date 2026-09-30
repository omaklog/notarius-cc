import type { ArchivoAdjuntoNotificacion, VariablesNotificacion } from '~/types/notificaciones'

/**
 * Reemplaza tokens {{variable}} en la plantilla con los valores del mapa variables.
 */
export function interpolarTexto(plantilla: string, variables: VariablesNotificacion = {}): string {
  if (!plantilla) return ''
  return plantilla.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_, key) => {
    const valor = variables[key]
    if (valor === undefined || valor === null) {
      return ''
    }
    return String(valor)
  })
}

/**
 * Limpia y normaliza el teléfono al estándar E.164 (asumiendo prefijo 52 para México en 10 dígitos).
 */
export function sanitizarTelefono(telefono: string): string {
  if (!telefono) return ''
  const soloNumeros = telefono.replace(/\D/g, '')
  if (soloNumeros.length === 10) {
    return `52${soloNumeros}`
  }
  return soloNumeros
}

/**
 * Agrega al texto del mensaje los enlaces a los archivos adjuntos.
 */
export function anexarAdjuntosAMensaje(
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  if (!archivosAdjuntos || archivosAdjuntos.length === 0) {
    return mensaje
  }
  const listaAdjuntos = archivosAdjuntos
    .map(adj => `📎 ${adj.nombre}: ${adj.url}`)
    .join('\n')
  return `${mensaje.trim()}\n\nArchivos adjuntos:\n${listaAdjuntos}`
}

/**
 * Genera la URL con protocolo nativo para la app de escritorio de WhatsApp (macOS/Windows).
 */
export function generarUrlWhatsAppNativo(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  const telLimpio = sanitizarTelefono(telefono)
  const textoFinal = anexarAdjuntosAMensaje(mensaje, archivosAdjuntos)
  return `whatsapp://send?phone=${telLimpio}&text=${encodeURIComponent(textoFinal)}`
}

/**
 * Genera la URL oficial de WhatsApp Web con el teléfono y mensaje precargados.
 */
export function generarUrlWhatsAppWeb(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  const telLimpio = sanitizarTelefono(telefono)
  const textoFinal = anexarAdjuntosAMensaje(mensaje, archivosAdjuntos)
  return `https://web.whatsapp.com/send?phone=${telLimpio}&text=${encodeURIComponent(textoFinal)}`
}

/**
 * Genera la URL de API de WhatsApp (fallback para dispositivos móviles).
 */
export function generarUrlWhatsAppApi(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  const telLimpio = sanitizarTelefono(telefono)
  const textoFinal = anexarAdjuntosAMensaje(mensaje, archivosAdjuntos)
  return `https://api.whatsapp.com/send?phone=${telLimpio}&text=${encodeURIComponent(textoFinal)}`
}

/**
 * Abre la app de escritorio de WhatsApp mediante su protocolo nativo (prioritario para macOS/Windows).
 */
export function abrirWhatsAppNativo(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  const url = generarUrlWhatsAppNativo(telefono, mensaje, archivosAdjuntos)
  if (typeof window !== 'undefined') {
    // En navegadores desktop, window.location.href o window.open dispara el protocolo nativo registrado en el SO
    window.location.href = url
  }
  return url
}

/**
 * Abre WhatsApp Web en una nueva pestaña del navegador.
 */
export function abrirWhatsAppWeb(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = []
): string {
  const url = generarUrlWhatsAppWeb(telefono, mensaje, archivosAdjuntos)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
  }
  return url
}

/**
 * Despacha el aviso por WhatsApp devolviendo tanto la URL nativa como la URL web de respaldo.
 * Si preferirNativo es true, invoca prioritariamente el protocolo desktop en macOS/Windows.
 */
export function despacharWhatsApp(
  telefono: string,
  mensaje: string,
  archivosAdjuntos: ArchivoAdjuntoNotificacion[] = [],
  preferirNativo: boolean = true
): { nativeUrl: string; webUrl: string } {
  const nativeUrl = generarUrlWhatsAppNativo(telefono, mensaje, archivosAdjuntos)
  const webUrl = generarUrlWhatsAppWeb(telefono, mensaje, archivosAdjuntos)
  if (preferirNativo && typeof window !== 'undefined') {
    window.location.href = nativeUrl
  }
  return { nativeUrl, webUrl }
}


/**
 * Extrae los nombres de variables presentes en una plantilla.
 */
export function extraerVariables(texto: string): string[] {
  if (!texto) return []
  const matches = texto.matchAll(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g)
  const variables = new Set<string>()
  for (const match of matches) {
    if (match[1]) {
      variables.add(match[1])
    }
  }
  return Array.from(variables)
}
