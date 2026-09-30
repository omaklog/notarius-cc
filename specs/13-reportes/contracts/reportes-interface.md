# Interface Contract: Composable `useReportesNotariales` y Servicios de Reportería

## 1. Contrato del Composable `useReportesNotariales`

```typescript
export function useReportesNotariales() {
  // Estado Reactivo del Dashboard
  const periodo = ref<{ mes: number; anio: number }>({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear()
  })
  
  const cargando = ref<boolean>(false)
  const kpisMes = ref<ResumenKpisMes>({
    total_abiertas_mes: 0,
    total_firmadas_mes: 0,
    total_en_tramite: 0,
    total_canceladas: 0
  })
  
  const cargaRedactores = ref<RedactorCargaItem[]>([])
  const topActos = ref<ActoDemandaItem[]>([])
  
  // Estado Reactivo del Reporte General de Escrituras
  const escriturasGeneral = ref<ReporteEscrituraGeneralItem[]>([])
  const filtroEstatusGeneral = ref<string>('todas')
  const busquedaGeneral = ref<string>('')
  
  // Estado Reactivo de Índices por Volumen
  const volumenes = ref<VolumenIndiceCard[]>([])
  const volumenActivo = ref<number | null>(null)
  const escriturasDelVolumen = ref<EscrituraIndiceItem[]>([])
  const guardandoFoliado = ref<boolean>(false)

  // Métodos del Dashboard
  function cambiarPeriodo(mes: number, anio: number): Promise<void>
  function cargarDashboard(): Promise<void>

  // Métodos del Reporte General
  function cargarReporteGeneral(): Promise<void>
  function exportarReporteGeneralCSV(): void

  // Métodos de Índices por Volumen
  function cargarVolumenes(): Promise<void>
  function seleccionarVolumen(volumen: number): Promise<void>
  function actualizarFoliadoEscritura(escrituraId: string, paginaInicial: number | null, paginaFinal: number | null): Promise<boolean>
  function exportarIndiceVolumenCSV(volumen: number): void

  return {
    periodo,
    cargando,
    kpisMes,
    cargaRedactores,
    topActos,
    escriturasGeneral,
    filtroEstatusGeneral,
    busquedaGeneral,
    volumenes,
    volumenActivo,
    escriturasDelVolumen,
    guardandoFoliado,
    cambiarPeriodo,
    cargarDashboard,
    cargarReporteGeneral,
    exportarReporteGeneralCSV,
    cargarVolumenes,
    seleccionarVolumen,
    actualizarFoliadoEscritura,
    exportarIndiceVolumenCSV
  }
}
```

## 2. Métodos de Exportación e Impresión

### Generación de CSV
- Nombre de archivo: `Reporte_General_Escrituras_[ANIO]_[MES].csv` y `Indice_Protocolo_Volumen_[VOLUMEN]_[ANIO].csv`.
- Encabezados claros, delimitados por comas, codificación UTF-8 con BOM para apertura nativa en Microsoft Excel y Numbers.

### Plantilla Imprimible HTML / CSS
- Componente `ReporteIndiceVolumenImprimible.vue`:
  - Contenedor con ancho optimizado para tamaño carta / oficio.
  - Ocultamiento de la UI de la aplicación al activarse `@media print`.
  - Invocación de `window.print()` con opción de cierre automático del modal tras disparar la impresión.
