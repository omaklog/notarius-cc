# Contracts: 16-libro-cotejos (Contratos de Servicio y Componentes)

**Feature**: `16-libro-cotejos`  
**Status**: Ready for Implementation

---

## 1. Composable Central: `useCotejos`

**Ubicación**: `app/composables/useCotejos.ts`

```typescript
import type { Ref, ComputedRef } from 'vue'
import type {
  LibroCotejo,
  ActaCotejo,
  RegistrarActaCotejoPayload,
  FiltrosCotejo,
  MetricasCotejo
} from '~/types/cotejos'

export interface UseCotejosReturn {
  // Estado Reactivo
  libros: Ref<LibroCotejo[]>
  libroActivo: Ref<LibroCotejo | null>
  actas: Ref<ActaCotejo[]>
  cargando: Ref<boolean>
  guardando: Ref<boolean>
  subiendoArchivo: Ref<boolean>
  error: Ref<string | null>

  // Métricas Computadas
  metricas: ComputedRef<MetricasCotejo>
  proximaActaDisponible: ComputedRef<number>
  porcentajeUsoLibro: ComputedRef<number>

  // Operaciones de Libros
  cargarLibros: () => Promise<LibroCotejo[]>
  cargarLibroActivo: () => Promise<LibroCotejo | null>
  abrirNuevoLibro: (numeroLibro: number, anio: number, limiteActas?: number) => Promise<LibroCotejo>
  cerrarLibro: (libroId: string, textoClausura?: string) => Promise<boolean>

  // Operaciones de Actas
  cargarActas: (filtros?: FiltrosCotejo) => Promise<ActaCotejo[]>
  obtenerActaPorId: (id: string) => Promise<ActaCotejo | null>
  registrarActa: (payload: RegistrarActaCotejoPayload) => Promise<ActaCotejo>
  actualizarEstatusActa: (id: string, estatus: ActaCotejo['estatus']) => Promise<boolean>
  cancelarActa: (id: string, motivo: string) => Promise<boolean>

  // Evidencias Documentales en Supabase Storage
  subirDocumentoCotejo: (actaId: string, libroId: string, file: File, tipo: 'original' | 'certificada') => Promise<string | null>

  // Fórmulas Notariales Dinámicas
  generarTextoRazonCotejo: (acta: ActaCotejo) => string
  generarTextoClausuraLibro: (libro: LibroCotejo) => string
}
```

---

## 2. Contratos de Componentes UI

### 2.1 Vista Principal: `app/pages/cotejos/index.vue`
- **Ruta**: `/cotejos`
- **Permisos requeridos**: `cotejos:ver` (Middleware de autenticación y permisos).
- **Layout y Secciones (Diseño Stitch Notarial)**:
  1. *Header Institucional*: Título del módulo, subtítulo explicativo, badge del libro activo con barra de progreso de actas (`X de Y actas`) y próxima acta consecutiva.
  2. *Botonera de Acciones*:
     - Primario: `+ Nuevo Cotejo` (`color="primary" variant="flat" class="text-white"`).
     - Secundario: `Libros / Cierre de Tomo` (`variant="outlined"`).
  3. *Tarjetas de Métricas (KPIs)*:
     - Actas Registradas Hoy.
     - Actas Autorizadas del Libro.
     - Total Tantos Expedidos.
     - Actas Canceladas / Inutilizadas.
  4. *Barra de Búsqueda y Filtros*:
     - Input texto para solicitante o documento exhibido.
     - Selector de tipo de documento (catálogo frecuente).
     - Selector de estatus (Todos, Registrado, Autorizado, Entregado, Cancelado).
  5. *Tabla de Actas*:
     - Columnas: No. Acta, Fecha/Hora, Solicitante & Identificación, Tipo de Documento, Descripción del Original, Fojas / Tantos, Estatus, Acciones.
     - Acciones por fila: Ver Detalle, Imprimir Razón de Cotejo, Adjuntar/Ver Evidencias, Cancelar Acta.

---

### 2.2 Modal de Captura Ágil: `app/components/cotejos/CotejoRegistroModal.vue`
- **Props**:
  - `modelValue: boolean`
  - `libroActivo: LibroCotejo | null`
- **Emits**:
  - `update:modelValue: (val: boolean) => void`
  - `creado: (acta: ActaCotejo) => void`
- **Campos validados (Yup / VeeValidate)**:
  - `solicitante_nombre`: Requerido, mín 3 caracteres.
  - `solicitante_identificacion`: Opcional/Recomendado (INE, Pasaporte, Cédula).
  - `tipo_documento`: Requerido (selector con opción de escritura libre).
  - `documento_descripcion`: Requerido, mín 10 caracteres (detallar institución emisora, fechas, números de folio o registro).
  - `numero_hojas`: Entero >= 1 (por defecto 1).
  - `numero_tantos`: Entero >= 1 (por defecto 1).
  - `observaciones`: Texto opcional.
  - `archivo_original`: Input de archivo opcional para subida inmediata al guardar.

---

### 2.3 Razón Notarial Imprimible: `app/components/cotejos/CotejoRazonImprimible.vue`
- **Props**:
  - `acta: ActaCotejo`
  - `formato?: 'hoja_completa' | 'etiqueta'` (por defecto `'hoja_completa'`)
- **Dependencias**:
  - Consume [`useConfiguracionNotarial.ts`](file:///Users/cosmic-chimps/IdeaProjects/pruebas%20de%20concepto/notarius-cc/app/composables/useConfiguracionNotarial.ts) para membrete oficial, logotipo institucional y facsímil del Sello de Autorizar.
- **Estilos de Impresión (`@media print`)**:
  - Oculta completamente barra superior, menús, botones y modales.
  - Centra el documento en tamaño carta con márgenes notariales canónicos (2.5 cm).
  - Tipografía formal sobria y sello notarial nítido al pie.

---

### 2.4 Modal de Cierre de Libro: `app/components/cotejos/LibroCierreModal.vue`
- **Props**:
  - `modelValue: boolean`
  - `libro: LibroCotejo`
- **Emits**:
  - `update:modelValue: (val: boolean) => void`
  - `cerrado: (libro: LibroCotejo) => void`
- **Comportamiento**:
  - Calcula automáticamente el balance de actas autorizadas y canceladas.
  - Previsualiza el Acta Solemne de Clausura de Tomo.
  - Confirma con advertencia irreversible de bloqueo de asientos posteriores.
