# Contrato de Interfaz: Feature 09 — Georreferenciación

## 1. Tipos de Dominio (`app/types/predios.ts`)

```typescript
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
  coordinates: number[][][] // [[[lng, lat], [lng, lat], ...]]
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
  created_at: string
  updated_at: string
}
```

## 2. Contrato del Composable `usePredios`

```typescript
export interface UsePrediosReturn {
  predios: Ref<PredioItem[]>
  predioActivo: Ref<PredioItem | null>
  cargando: Ref<boolean>
  guardando: Ref<boolean>
  error: Ref<string | null>
  cargarPredios: (escrituraId: string) => Promise<PredioItem[]>
  seleccionarPredio: (predio: PredioItem | null) => void
  crearPredioVacio: (escrituraId: string, etiqueta?: string) => PredioItem
  guardarPredio: (predio: Partial<PredioItem> & { escritura_id: string; geometria: GeoJSONPolygon }) => Promise<PredioItem | null>
  eliminarPredio: (predioId: string) => Promise<boolean>
  subirFotoFachada: (escrituraId: string, predioId: string, file: File) => Promise<{ url: string; path: string } | null>
}
```

## 3. Contrato del Tab `GeorreferenciacionTab.vue`

```typescript
// Props
const props = defineProps<{
  escrituraId: string
  actoJuridicoId?: string
}>()

// Emits
const emit = defineEmits<{
  'status-change': []
}>()
```
