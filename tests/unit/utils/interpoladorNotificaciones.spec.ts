import { describe, it, expect, vi } from 'vitest'
import {
  interpolarTexto,
  sanitizarTelefono,
  generarUrlWhatsAppNativo,
  generarUrlWhatsAppWeb,
  generarUrlWhatsAppApi,
  abrirWhatsAppNativo,
  abrirWhatsAppWeb,
  despacharWhatsApp,
  extraerVariables,
} from '../../../app/utils/interpoladorNotificaciones'

describe('interpoladorNotificaciones', () => {
  describe('interpolarTexto', () => {
    it('interpola variables correctamente en el texto', () => {
      const plantilla = 'Hola {{nombre_cliente}}, su escritura {{numero_instrumento}} está lista.'
      const variables = {
        nombre_cliente: 'Lic. Roberto Gómez',
        numero_instrumento: 48102,
      }
      const resultado = interpolarTexto(plantilla, variables)
      expect(resultado).toBe('Hola Lic. Roberto Gómez, su escritura 48102 está lista.')
    })

    it('maneja espacios dentro de las llaves {{ variable }}', () => {
      const plantilla = 'Cita para {{  fecha_cita  }} en {{ notaria }}.'
      const variables = {
        fecha_cita: '25 de Octubre a las 11:00 hrs',
        notaria: 'Notaría 42',
      }
      const resultado = interpolarTexto(plantilla, variables)
      expect(resultado).toBe('Cita para 25 de Octubre a las 11:00 hrs en Notaría 42.')
    })

    it('reemplaza variables faltantes por cadena vacía', () => {
      const plantilla = 'Hola {{nombre_cliente}}, folio: {{folio_tramite}}.'
      const variables = {
        nombre_cliente: 'Ana Morales',
      }
      const resultado = interpolarTexto(plantilla, variables)
      expect(resultado).toBe('Hola Ana Morales, folio: .')
    })

    it('devuelve cadena vacía si la plantilla es vacía o null/undefined', () => {
      expect(interpolarTexto('')).toBe('')
      expect(interpolarTexto(null as any)).toBe('')
    })
  })

  describe('sanitizarTelefono', () => {
    it('elimina espacios, guiones y caracteres no numéricos', () => {
      expect(sanitizarTelefono('+52 (55) 1234-5678')).toBe('525512345678')
    })

    it('agrega código de país 52 si tiene 10 dígitos (formato local mexicano)', () => {
      expect(sanitizarTelefono('5512345678')).toBe('525512345678')
    })

    it('mantiene prefijo internacional si ya tiene más de 10 dígitos', () => {
      expect(sanitizarTelefono('5215512345678')).toBe('5215512345678')
      expect(sanitizarTelefono('18001234567')).toBe('18001234567')
    })
  })

  describe('generarUrlWhatsAppNativo, Web y Api', () => {
    it('construye la URL de protocolo nativo whatsapp://send para app de escritorio', () => {
      const url = generarUrlWhatsAppNativo('5512345678', 'Aviso notarial macOS')
      expect(url).toContain('whatsapp://send?')
      expect(url).toContain('phone=525512345678')
      expect(url).toContain('text=Aviso%20notarial%20macOS')
    })

    it('construye la URL de WhatsApp Web correctamente', () => {
      const url = generarUrlWhatsAppWeb('5512345678', 'Aviso notarial importante')
      expect(url).toContain('https://web.whatsapp.com/send?')
      expect(url).toContain('phone=525512345678')
      expect(url).toContain('text=Aviso%20notarial%20importante')
    })

    it('anexa enlaces de archivos adjuntos al mensaje nativo y web', () => {
      const adjuntos = [
        { nombre: 'comprobante.pdf', url: 'https://storage.notaria.local/comprobante.pdf' },
      ]
      const urlNativa = generarUrlWhatsAppNativo('5512345678', 'Adjuntamos su documento.', adjuntos)
      expect(urlNativa).toContain('whatsapp://send?')
      expect(urlNativa).toContain('comprobante.pdf')
      expect(urlNativa).toContain('https%3A%2F%2Fstorage.notaria.local%2Fcomprobante.pdf')

      const urlWeb = generarUrlWhatsAppWeb('5512345678', 'Adjuntamos su documento.', adjuntos)
      expect(urlWeb).toContain('comprobante.pdf')
      expect(urlWeb).toContain('https%3A%2F%2Fstorage.notaria.local%2Fcomprobante.pdf')
    })

    it('genera la URL de fallback para API móvil', () => {
      const url = generarUrlWhatsAppApi('5512345678', 'Prueba móvil')
      expect(url).toContain('https://api.whatsapp.com/send?')
      expect(url).toContain('phone=525512345678')
    })
  })

  describe('abrirWhatsAppNativo y abrirWhatsAppWeb', () => {
    it('abre el protocolo nativo asignando window.location.href', () => {
      const mockWindow = { location: { href: '' } }
      vi.stubGlobal('window', mockWindow as any)

      const url = abrirWhatsAppNativo('5512345678', 'Mensaje desktop nativo')
      expect(mockWindow.location.href).toBe(url)
      expect(url).toContain('whatsapp://send?')

      vi.unstubAllGlobals()
    })

    it('abre una nueva ventana con la URL generada de WhatsApp Web', () => {
      const openSpy = vi.fn()
      vi.stubGlobal('window', { open: openSpy } as any)

      const url = abrirWhatsAppWeb('5512345678', 'Mensaje de prueba')
      expect(openSpy).toHaveBeenCalledWith(url, '_blank')

      vi.unstubAllGlobals()
    })

    it('despacharWhatsApp retorna nativeUrl y webUrl y asigna location.href si preferirNativo es true', () => {
      const mockWindow = { location: { href: '' } }
      vi.stubGlobal('window', mockWindow as any)

      const result = despacharWhatsApp('5512345678', 'Mensaje dual')
      expect(result.nativeUrl).toContain('whatsapp://send?')
      expect(result.webUrl).toContain('https://web.whatsapp.com/send?')
      expect(mockWindow.location.href).toBe(result.nativeUrl)

      vi.unstubAllGlobals()
    })
  })

  describe('extraerVariables', () => {
    it('extrae una lista única de variables contenidas en el texto', () => {
      const texto = 'Hola {{nombre}}, su pago por {{monto}} y folio {{folio}} de {{nombre}}.'
      const vars = extraerVariables(texto)
      expect(vars).toEqual(['nombre', 'monto', 'folio'])
    })
  })
})

