import type { OrientacionColindancia } from '~/types/predios'

const RADIO_TIERRA_METROS = 6378137 // Radio medio WGS84

/**
 * Convierte grados sexagesimales a radianes
 */
function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180
}

/**
 * Convierte radianes a grados sexagesimales
 */
function aGrados(radianes: number): number {
  return (radianes * 180) / Math.PI
}

/**
 * Calcula la distancia en metros entre dos coordenadas [longitud, latitud] usando la fórmula de Haversine
 */
export function calcularDistanciaMetros(p1: [number, number], p2: [number, number]): number {
  const [lon1, lat1] = p1
  const [lon2, lat2] = p2

  const dLat = aRadianes(lat2 - lat1)
  const dLon = aRadianes(lon2 - lon1)

  const rLat1 = aRadianes(lat1)
  const rLat2 = aRadianes(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Math.round(RADIO_TIERRA_METROS * c * 100) / 100
}

/**
 * Calcula el área en metros cuadrados de un polígono cerrado [longitud, latitud][]
 * Proyecta las coordenadas a un plano métrico local centrado en el predio y aplica la fórmula de Gauss (Shoelace)
 */
export function calcularAreaPoligonoM2(coordenadas: [number, number][]): number {
  if (!coordenadas || coordenadas.length < 3) return 0

  // Asegurar que el anillo esté cerrado o no duplique el último si coincide con el primero
  let puntos = [...coordenadas]
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]

  if (primero[0] === ultimo[0] && primero[1] === ultimo[1]) {
    puntos.pop()
  }

  if (puntos.length < 3) return 0

  // Centroide de referencia para la proyección métrica local
  const latCentro = puntos.reduce((acc, p) => acc + p[1], 0) / puntos.length
  const lonCentro = puntos.reduce((acc, p) => acc + p[0], 0) / puntos.length

  const latCentroRad = aRadianes(latCentro)
  const factorLon = Math.cos(latCentroRad) * (Math.PI / 180) * RADIO_TIERRA_METROS
  const factorLat = (Math.PI / 180) * RADIO_TIERRA_METROS

  // Convertir coordenadas geográficas a metros locales (X, Y)
  const puntosMetros = puntos.map(([lon, lat]) => [
    (lon - lonCentro) * factorLon,
    (lat - latCentro) * factorLat
  ])

  // Fórmula de Gauss (Shoelace)
  let area = 0
  const n = puntosMetros.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += puntosMetros[i][0] * puntosMetros[j][1]
    area -= puntosMetros[j][0] * puntosMetros[i][1]
  }

  const areaTotal = Math.abs(area) / 2
  return Math.round(areaTotal * 100) / 100
}

/**
 * Calcula el centroide de un polígono [longitud, latitud]
 */
export function calcularCentroide(coordenadas: [number, number][]): [number, number] {
  if (!coordenadas || coordenadas.length === 0) return [0, 0]

  const puntos = coordenadas.slice(0, coordenadas.length > 3 && coordenadas[0][0] === coordenadas[coordenadas.length - 1][0] ? coordenadas.length - 1 : coordenadas.length)
  const sumLon = puntos.reduce((acc, p) => acc + p[0], 0)
  const sumLat = puntos.reduce((acc, p) => acc + p[1], 0)

  return [
    Math.round((sumLon / puntos.length) * 1000000) / 1000000,
    Math.round((sumLat / puntos.length) * 1000000) / 1000000
  ]
}

/**
 * Determina la orientación aproximada del vector formado por p1 -> p2 (rumbo cardinal)
 */
export function determinarOrientacionAproximada(
  p1: [number, number],
  p2: [number, number]
): OrientacionColindancia {
  const [lon1, lat1] = p1
  const [lon2, lat2] = p2

  const dLon = lon2 - lon1
  const dLat = lat2 - lat1

  // Ángulo en grados respecto al Norte (sentido horario: 0=Norte, 90=Este, 180=Sur, 270=Oeste)
  let rumbo = aGrados(Math.atan2(dLon, dLat))
  if (rumbo < 0) rumbo += 360

  if (rumbo >= 337.5 || rumbo < 22.5) return 'Norte'
  if (rumbo >= 22.5 && rumbo < 67.5) return 'Noreste'
  if (rumbo >= 67.5 && rumbo < 112.5) return 'Este'
  if (rumbo >= 112.5 && rumbo < 157.5) return 'Sureste'
  if (rumbo >= 157.5 && rumbo < 202.5) return 'Sur'
  if (rumbo >= 202.5 && rumbo < 247.5) return 'Suroeste'
  if (rumbo >= 247.5 && rumbo < 292.5) return 'Oeste'
  return 'Noroeste'
}
