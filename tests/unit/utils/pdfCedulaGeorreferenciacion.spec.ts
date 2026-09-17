import { describe, it, expect } from 'vitest'
import {
  formatearMetros,
  generarHtmlCedulaGeorreferenciacion,
  type DatosReporteGeorreferenciacion
} from '~/utils/pdfCedulaGeorreferenciacion'

describe('pdfCedulaGeorreferenciacion utility', () => {
  it('formatearMetros da formato con dos decimales y separadores de miles', () => {
    expect(formatearMetros(1250.5)).toBe('1,250.50')
    expect(formatearMetros(null)).toBe('0.00')
    expect(formatearMetros(undefined)).toBe('0.00')
    expect(formatearMetros(0)).toBe('0.00')
  })

  it('generarHtmlCedulaGeorreferenciacion genera documento con metadatos completos, croquis y colindancias', () => {
    const datos: DatosReporteGeorreferenciacion = {
      instrumentoNumero: 48102,
      volumen: 210,
      actoJuridico: 'Compraventa de Inmueble',
      objeto: 'Enajenación de predio urbano',
      fechaCelebracion: '15/09/2026',
      notarioTitular: 'Lic. Notario Titular',
      numeroNotaria: 42,
      entidadFederativa: 'Ciudad de México',
      etiqueta: 'Lote 4B (Subdivisión)',
      descripcion: 'Acceso por calle principal frente a parque',
      superficieCalculadaM2: 450.75,
      superficieDeclaradaM2: 450.0,
      centroide: { lat: 19.4326, lng: -99.1332 },
      coordenadasPoligono: [
        [-99.1332, 19.4326],
        [-99.133, 19.4326],
        [-99.133, 19.4328],
        [-99.1332, 19.4328],
        [-99.1332, 19.4326]
      ],
      colindancias: [
        { orientacion: 'Norte', distancia_m: 25.5, colinda_con: 'Calle Juárez' },
        { orientacion: 'Sur', distancia_m: 25.5, colinda_con: 'Lote 5' },
        { orientacion: 'Este', distancia_m: 17.68, colinda_con: 'Propiedad Privada' },
        { orientacion: 'Oeste', distancia_m: 17.68, colinda_con: 'Avenida Hidalgo' }
      ],
      mapaCapturaUrl: 'data:image/jpeg;base64,mockMapaData',
      fotoFachadaUrl: 'https://storage.example.com/fachada.jpg',
      fechaEmision: '17 de septiembre de 2026'
    }

    const html = generarHtmlCedulaGeorreferenciacion(datos)

    // Validar encabezado
    expect(html).toContain('Notaría Pública No. 42')
    expect(html).toContain('Instrumento No. 48102')
    expect(html).toContain('Volumen: 210')
    expect(html).toContain('Compraventa de Inmueble')

    // Validar datos de lote y superficies
    expect(html).toContain('Lote 4B (Subdivisión)')
    expect(html).toContain('450.75 m²')
    expect(html).toContain('450.00 m²')
    expect(html).toContain('Lat: 19.432600, Lng: -99.133200')

    // Validar cuadro de colindancias y perímetro
    expect(html).toContain('Calle Juárez')
    expect(html).toContain('25.50 m')
    expect(html).toContain('Lote 5')
    expect(html).toContain('86.36 metros lineales') // 25.5 + 25.5 + 17.68 + 17.68

    // Validar imágenes de mapa y fachada
    expect(html).toContain('data:image/jpeg;base64,mockMapaData')
    expect(html).toContain('https://storage.example.com/fachada.jpg')

    // Validar descripción y certificación
    expect(html).toContain('Acceso por calle principal frente a parque')
    expect(html).toContain('CÉDULA CERTIFICADA')
  })
})
