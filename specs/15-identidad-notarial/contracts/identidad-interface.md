# Contracts: 15-identidad-notarial (Interfaz y Contratos de Servicio)

**Feature**: `15-identidad-notarial`  
**Status**: Ready for Implementation

---

## 1. Composable: `useConfiguracionNotarial`

```typescript
export interface UseConfiguracionNotarialReturn {
  // Estado Reactivo
  configuracion: Ref<ConfiguracionNotarial | null>
  cargando: Ref<boolean>
  guardando: Ref<boolean>
  subiendoActivo: Ref<boolean>
  error: Ref<string | null>

  // Propiedades Computadas de Conveniencia
  nombreNotariaCompleto: ComputedRef<string> // Ej. "Notaría Pública No. 44 del Estado de México"
  titularCompleto: ComputedRef<string>       // Ej. "Lic. Fernando Notario Titular"
  domicilioCompleto: ComputedRef<string>     // Ej. "Av. Hidalgo 102, Col. Centro, Toluca, C.P. 50000"
  logotipoUrl: ComputedRef<string | null>
  selloNotarialUrl: ComputedRef<string | null>

  // Acciones
  cargarConfiguracion: (forzar?: boolean) => Promise<ConfiguracionNotarial | null>
  guardarConfiguracion: (payload: ActualizarConfiguracionPayload) => Promise<boolean>
  subirActivoGrafico: (file: File, tipo: 'logotipo' | 'sello') => Promise<string | null>
  eliminarActivoGrafico: (tipo: 'logotipo' | 'sello') => Promise<boolean>
  interpoladorLeyenda: (plantilla: string, variables: Record<string, string | number>) => string
}
```

---

## 2. Componentes UI

### 2.1 Vista Principal: `app/pages/administracion-general/identidad-notarial.vue`
- **Ruta**: `/administracion-general/identidad-notarial`
- **Permisos requeridos**: `administracion:acceso` (Middleware `require-admin`).
- **Secciones internas (Tabs / Cards Stitch Notarial)**:
  1. *Ficha Notarial y Fe Pública* (`numero_notaria`, `entidad_federativa`, `municipio`, `distrito_judicial`, `notario_titular_nombre`, `notario_titular_titulo`, `patente_fiat_numero`, `patente_fiat_fecha`, `notario_suplente_nombre`, `regimen_asociacion`).
  2. *Domicilio y Canales de Contacto* (`calle`, `num_ext`, `num_int`, `colonia`, `codigo_postal`, `telefonos`, `correo`, `sitio_web`).
  3. *Identidad Visual y Sellos Notariales* (Carga/previsualización de `logotipo` y `sello de autorizar`).
  4. *Leyendas Oficiales y Certificaciones* (`leyenda_encabezado`, `leyenda_lema`, `leyenda_cierre_volumen`).

### 2.2 Integración en Encabezado Institucional: `app/components/layout/AppNavbar.vue`
- Se sustituye el título o texto estático por `nombreNotariaCompleto`.
- Se muestra el `logotipoUrl` si existe, o el icono por defecto.

### 2.3 Integración en Reporte de Índice por Volumen: `app/components/reportes/indices/ReporteIndiceVolumenImprimible.vue`
- Inyecta `logotipoUrl` en el membrete superior.
- Sustituye el texto estático de certificación al calce por el resultado de:
  `interpoladorLeyenda(configuracion.leyenda_cierre_volumen, { ... })`.
