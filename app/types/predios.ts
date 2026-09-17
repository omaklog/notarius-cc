export type OrientacionColindancia =
  | 'Norte'
  | 'Sur'
  | 'Este'
  | 'Oeste'
  | 'Oriente'
  | 'Poniente'
  | 'Noreste'
  | 'Noroeste'
  | 'Sureste'
  | 'Suroeste'

export interface ColindanciaItem {
  id?: string
  orientacion: OrientacionColindancia
  distancia_m?: number | null
  colinda_con: string
}

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][] // Array of rings, each ring is array of [lng, lat]
}

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface PredioItem {
  id: string
  escritura_id: string
  etiqueta: string
  descripcion: string | null
  superficie_terreno_m2: number | null
  superficie_declarada_m2: number | null
  geometria: GeoJSONPolygon
  centroide: GeoJSONPoint | null
  colindancias: ColindanciaItem[]
  foto_fachada_url: string | null
  foto_fachada_storage_path: string | null
  created_at?: string
  updated_at?: string
}

export interface ResultadoBusquedaGeografica {
  display_name: string
  lat: number
  lon: number
  boundingbox?: [string, string, string, string]
}
