import { describe, it, expect } from 'vitest'
import {
  calcularDistanciaMetros,
  calcularAreaPoligonoM2,
  calcularCentroide,
  determinarOrientacionAproximada
} from '~/utils/geometriaUtils'

describe('geometriaUtils', () => {
  describe('calcularDistanciaMetros', () => {
    it('calcula la distancia entre dos puntos idénticos como 0', () => {
      const p: [number, number] = [-99.1332, 19.4326]
      expect(calcularDistanciaMetros(p, p)).toBe(0)
    })

    it('calcula una distancia positiva razonable entre dos puntos distintos', () => {
      const p1: [number, number] = [-99.1332, 19.4326]
      const p2: [number, number] = [-99.1332, 19.4336] // ~111 metros al norte
      const d = calcularDistanciaMetros(p1, p2)
      expect(d).toBeGreaterThan(100)
      expect(d).toBeLessThan(120)
    })
  })

  describe('calcularAreaPoligonoM2', () => {
    it('retorna 0 si el arreglo tiene menos de 3 puntos', () => {
      expect(calcularAreaPoligonoM2([])).toBe(0)
      expect(calcularAreaPoligonoM2([[-99.1, 19.4]])).toBe(0)
      expect(calcularAreaPoligonoM2([[-99.1, 19.4], [-99.2, 19.4]])).toBe(0)
    })

    it('calcula correctamente el área aproximada de un terreno rectangular en CDMX', () => {
      // Coordenadas de un predio de ~20m de frente x ~15m de fondo (aproximadamente 300 m2)
      // En latitud 19.43, 1 segundo de latitud ~ 30.8m, 1 segundo de longitud ~ 29.1m
      // 0.00018 grados lat ~ 20m, 0.00014 grados lon ~ 15m
      const lon0 = -99.1332
      const lat0 = 19.4326
      const dLat = 0.00018
      const dLon = 0.00014

      const poligono: [number, number][] = [
        [lon0, lat0],
        [lon0 + dLon, lat0],
        [lon0 + dLon, lat0 + dLat],
        [lon0, lat0 + dLat],
        [lon0, lat0] // Cerrado
      ]

      const area = calcularAreaPoligonoM2(poligono)
      expect(area).toBeGreaterThan(250)
      expect(area).toBeLessThan(350)
    })
  })

  describe('calcularCentroide', () => {
    it('retorna el centroide aritmético del polígono', () => {
      const poligono: [number, number][] = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0]
      ]
      const centroide = calcularCentroide(poligono)
      expect(centroide[0]).toBe(5)
      expect(centroide[1]).toBe(5)
    })
  })

  describe('determinarOrientacionAproximada', () => {
    it('determina Norte para un vector que se desplaza hacia arriba', () => {
      const p1: [number, number] = [-99.1, 19.4]
      const p2: [number, number] = [-99.1, 19.5]
      expect(determinarOrientacionAproximada(p1, p2)).toBe('Norte')
    })

    it('determina Sur para un vector que se desplaza hacia abajo', () => {
      const p1: [number, number] = [-99.1, 19.5]
      const p2: [number, number] = [-99.1, 19.4]
      expect(determinarOrientacionAproximada(p1, p2)).toBe('Sur')
    })

    it('determina Este para un vector que se desplaza hacia la derecha', () => {
      const p1: [number, number] = [-99.2, 19.4]
      const p2: [number, number] = [-99.1, 19.4]
      expect(determinarOrientacionAproximada(p1, p2)).toBe('Este')
    })

    it('determina Oeste para un vector que se desplaza hacia la izquierda', () => {
      const p1: [number, number] = [-99.1, 19.4]
      const p2: [number, number] = [-99.2, 19.4]
      expect(determinarOrientacionAproximada(p1, p2)).toBe('Oeste')
    })
  })
})
