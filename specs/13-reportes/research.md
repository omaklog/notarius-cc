# Research & Technical Decisions: 13-reportes (Panel Ejecutivo, Reportes Operativos, Reporte General de Escrituras e Índices Notariales)

## 1. Arquitectura de Visualización y Gráficas en Nuxt 3

### Contexto
El usuario requiere visualizaciones del mes en curso:
1. Balance de carga por redactor (escrituras asignadas).
2. Top 5 de actos jurídicos con mayor demanda.
3. Resumen de KPIs en tarjetas dinámicas.

### Alternativas Evaluadas
- **Opción A (Librería Externa: Chart.js / ApexCharts)**:
  - *Pros*: Muchas plantillas prediseñadas.
  - *Contras*: Requiere dependencias pesadas, problemas de hidratación SSR en Nuxt 3 (necesita `ClientOnly`), y en Vitest / happy-dom requiere mocks complejos de `HTMLCanvasElement` y `getContext('2d')` que suelen causar fragilidad en las pruebas.
- **Opción B (Componentes SVG Nativos y Reactivos con Vuetify - RECOMENDADA)**:
  - *Pros*:
    - Cero dependencias adicionales en `package.json`.
    - Totalmente reactivos y fluidos bajo Vue 3 y Nuxt 3 SSR.
    - Se apegan al 100% a la paleta institucional de Notarius (`#1B3A5F`, `#A9762E`, tonos neutros).
    - 100% testeables en Vitest con `@vue/test-utils` y `happy-dom` sin advertencias de canvas.
    - Muy livianos (< 5 KB), rápidos y renderizables en reportes impresos.
  - *Decisión*: Implementar componentes de visualización nativos basados en SVG (`ReportesGraficaRedactores.vue` y `ReportesGraficaActosTop.vue`).

---

## 2. Gestión y Persistencia del Foliado de Índices por Volumen

### Contexto
La Ley del Notariado exige formar los libros de índices por cada **Volumen** del protocolo. El usuario solicita una vista de **Cards de Volúmenes** con indicador de si todas las escrituras tienen `pagina_inicial` y `pagina_final`, detalle del volumen para capturar/actualizar páginas, y reporte oficial imprimible.

### Hallazgo Clave en Base de Datos
En la migración fundacional `supabase/migrations/20260728000000_escrituras.sql`, la tabla `public.escrituras` ya cuenta con:
```sql
volumen integer not null,
pagina_inicial integer,
pagina_final integer,
fecha_celebracion date,
estatus text,
```
- *Implicación*: **No se requiere ninguna migración destructiva ni columnas adicionales en Postgres**.
- Los datos se leen y actualizan directamente en `public.escrituras` mediante los permisos ya existentes (`escrituras:ver`, `escrituras:editar`, `reportes:ver_operativos`).

### Reglas de Validación de Foliado Notarial
1. `pagina_inicial` y `pagina_final` deben ser enteros positivos (> 0).
2. `pagina_final >= pagina_inicial`.
3. Si un instrumento tiene `estatus = 'anulada'`, conserva sus folios asignados para que el libro no tenga saltos en el protocolo, rotulado con "CANCELADA / NO PASÓ".
4. Semáforo de Completitud del Volumen:
   - `completo`: `total_escrituras > 0 && escrituras_sin_foliar === 0` (Badge Verde: *Foliado Completo*).
   - `pendiente`: `escrituras_sin_foliar > 0` (Badge Ámbar: *X de N sin foliar*).

---

## 3. Modelo del Reporte Imprimible del Índice de Volumen

### Estructura Canónica del Índice Notarial
Conforme al Artículo 95 y relativos de la Ley del Notariado:
1. **Encabezado**:
   - Denominación oficial: *"NOTARÍA PÚBLICA NÚMERO [X] - [ENTIDAD]"*.
   - Notario Titular: *"Lic. [Nombre Titular]"*.
   - Identificación del Libro: *"ÍNDICE GENERAL DEL PROTOCOLO ORDINARIO — VOLUMEN [N]"*.
2. **Cuerpo Tabular**:
   - `No. Instrumento`: Número consecutivo.
   - `Volumen`: Número de volumen.
   - `Fecha`: Fecha de otorgamiento / celebración (formato DD/MM/AAAA).
   - `Acto(s) Jurídico(s)`: Nombre formal del acto notarial.
   - `Partes / Comparecientes`: Agrupados con su carácter legal formal (ej. *Enajenante: Carlos Slim; Adquirente: Grupo Carso S.A. de C.V.*).
   - `Páginas`: Folio / Página Inicial y Final (ej. *Págs. 1 a 14*).
   - `Estatus / Observaciones`: *FIRMADA*, *CANCELADA (NO PASÓ)*, *PENDIENTE*.
3. **Certificación Notarial de Cierre**:
   - Leyenda formal al calce: *"El suscrito Notario hace constar que el presente índice corresponde al Volumen N, que comprende los instrumentos del No. A al No. B... Doy Fe."*
   - Espacio reglamentario para **Firma del Notario Titular** y **Sello de Autorizar**.

### Estrategia de Impresión N Veces
- Integración de hoja de estilos `@media print` y visualizador de impresión con `window.print()`.
- Se omiten márgenes del navegador, headers web y elementos de navegación.
- Compatible con exportación a PDF limpio a través del diálogo nativo del sistema operativo en macOS, Windows y Linux.

---

## 4. Auditoría de Seguridad y Permisos RLS

- Rutas y módulos en `useNavItems.ts`:
  - `/reportes` utiliza el permiso `reportes:ver_operativos`.
  - La sección financiera utiliza el permiso `reportes:ver_financieros`.
- Los datos se consultan vía cliente Supabase autenticado con RLS activo:
  - Solo los roles autorizados (Notario, Administrador) pueden consultar agregaciones contables de honorarios.
  - Los roles operativos (Redactores, Gestores, Auxiliares) tienen acceso a los tableros de escrituras, redactores, trámites e índices del protocolo.
