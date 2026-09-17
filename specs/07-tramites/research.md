# Research: 07-tramites — Trámites Notariales, Fases Procesales, Dependencias RPP/Catastro y Tarjetas de Gestoría

**Feature**: `07-tramites`  
**Date**: 2026-09-16  
**Status**: Completed

---

## 1. Contexto y Objetivos

El módulo de Trámites Notariales es el núcleo de seguimiento adjetivo del sistema notarial mexicano. Toda escritura pública (especialmente traslativas de dominio o corporativas) interactúa con diversas dependencias oficiales (Catastro Estatal, Catastro Municipal, Registro Público de la Propiedad y del Comercio - RPPyC, INFONAVIT, Mesa de Control Interno) a lo largo de fases procesales bien definidas (`previo`, `firma_otorgamiento`, `posterior_fiscal`, `inscripcion_definitiva`, `entrega_cliente`).

La gestoría de ventanilla gubernamental no es un proceso lineal de casillas únicas o "checklist plano"; es una **sucesión cronológica y repetible de eventos de ventanilla** (por ejemplo: un ingreso inicial ante Catastro puede recibir una nota de prevención/rechazo técnico por inconsistencia en colindancias, requerir una aclaración, un reingreso, la liquidación de derechos mediante Orden de Pago, y finalmente la emisión de la Cédula Catastral).

El objetivo de esta investigación es diseñar una arquitectura de datos y componentes UI ergonómica, resiliente y 100% fiel a la práctica notarial mexicana y a la Constitución del Sistema (§1, §3, §4, §7, §8).

---

## 2. Decisiones de Arquitectura e Implementación

### Decisión 1: Catálogos Maestros y Estructura Relacional Normalizada
- **Decisión**: Mantener dos catálogos administrables con seed oficial:
  - `cat_dependencias_oficiales`: Siglas (`NOTARIA`, `CATASTRO_EST`, `CATASTRO_MUN`, `RPP`, `CONTROL_INT`, `INFONAVIT`), `clave_numerica` (0 a 5), nombre oficial, tiempo de respuesta en días hábiles compromiso y portal oficial.
  - `cat_pasos_tramite`: Los 17 pasos predeterminados del pipeline de gestoría con `id`, `nombre`, `orden` (1..17), `dependencia_clave`, enlace foráneo a `cat_dependencias_oficiales(id)`, bandera `genera_orden_pago` y estatus activo.
- **Razón**: Estandariza la nomenclatura y tiempos en toda la notaría, permitiendo que la administración configure nuevos pasos o modifique el orden sin romper la integridad referencial.
- **Alternativas descartadas**: Texto libre en cada registro (descartado por causar dispersión en reportes y anular filtros unificados).

---

### Decisión 2: Bitácora Histórica Repetible vs Checklist Fijo Único
- **Decisión**: En la tabla `tramite_pasos_escritura`, **eliminar la restricción `unique(escritura_id, paso_id)`**. La tabla opera como una **bitácora de eventos históricos cronológicos**:
  - Permite registrar múltiples veces el mismo paso en diferentes momentos (e.g. `ING. CAT. EST.` en fecha 1, `RECHAZO CAT. EST.` en fecha 2, nuevo `ING. CAT. EST.` en fecha 3).
  - Cada evento registra: `id (UUID)`, `escritura_id`, `paso_id`, `dependencia_clave`, `folio_volante` (ticket/acuse de ventanilla o número de rechazo), `notas` (causas de la prevención o detalles de subsanación), `fecha_registro` (timestamptz), `completado_por` (usuario de `public.profiles`), y `orden_pago_id` (enlace opcional a módulo 08).
  - El "Paso Actual / Último Movimiento" de una dependencia se determina mediante el registro más reciente (`ORDER BY fecha_registro DESC, created_at DESC LIMIT 1`).
- **Razón**: En la ventanilla gubernamental real, los trámites son rechazados y reingresados frecuentemente. Un checklist estático con restricción única borraba o sobrescribía el historial previo, perdiendo trazabilidad de rechazos previos y tiempos de respuesta.
- **Alternativas descartadas**: Sobrescribir el mismo registro con cada cambio de estado (rechazado: destruye la evidencia para reclamos a gestores o dependencias).

---

### Decisión 3: Estructura de Tarjetas (Cards) por Dependencia a Dos Columnas con Acordeón Inline
- **Decisión**: Organizar la sección de gestoría en `TramitesTab.vue` en tarjetas delimitadas por dependencia oficial, con una retícula a dos columnas:
  - **Columna Izquierda (Identidad y Estado)**:
    - Encabezado: Nombre oficial de la dependencia con ícono institucional representativo.
    - Segundo elemento: **Paso Actual / Último Movimiento** destacado con chip de estatus (verde para favorable/concluido, ámbar para trámite en curso, rojo para rechazo/prevención), fecha del evento, gestor asignado y folio oficial de volante.
  - **Columna Derecha (Acciones Rápidas)**:
    - Botón primario: `+ Agregar Paso` con menú contextual que despliega exclusivamente las opciones válidas para esa autoridad.
    - Botón secundario: `Historial Completo` con contador de movimientos y flecha indicadora de expansión.
  - **Acordeón Inline (Expansión Vertical)**: Al pulsar "Historial Completo", la tarjeta se expande verticalmente hacia abajo revelando la línea de tiempo completa con todos los pasos históricos registrados para esa dependencia, permitiendo abrir múltiples dependencias a la vez para comparar tiempos.
- **Razón**: Proporciona máxima claridad ejecutiva de un vistazo (columna izquierda = situación actual; columna derecha = acciones inmediatas) y permite auditar el historial sin saltar a otra pantalla ni perder el contexto de la escritura.
- **Alternativas descartadas**: Modal emergente para ver el historial (rechazado: impide comparar el avance de Catastro con RPP de forma simultánea).

---

### Decisión 4: Menú Filtrado de Opciones Exclusivas por Dependencia
- **Decisión**: Al pulsar `+ Agregar Paso` en la tarjeta de una dependencia, el selector/menú despliega **únicamente** los pasos configurados para la `dependencia_clave` de esa tarjeta (ej. en Catastro Estatal: *Ingreso, Rechazo, O.P., Corregir Cédula, Cédula Catastral*; en RPP: *O.P., Ingreso a RPP, Rechazo RPP, Reingreso a RPP*).
- **Razón**: Previene errores humanos de captura donde un auxiliar asigne accidentalmente un paso de Catastro a la tarjeta del Registro Público.
- **Alternativas descartadas**: Mostrar los 17 pasos en todas las tarjetas (rechazado: genera confusión operativa y datos incongruentes).

---

### Decisión 5: Despliegue Bajo Demanda con Botón Superior "+ Iniciar Gestión en Dependencia"
- **Decisión**:
  - En la pestaña de la escritura se despliegan **únicamente las tarjetas de las dependencias que tienen al menos un movimiento registrado** en esa escritura.
  - En la parte superior de la sección se ubica el botón destacado `+ Iniciar Gestión en Dependencia`.
  - Al presionarlo, se abre un diálogo que lista las dependencias oficiales aún no iniciadas (e.g. Catastro Estatal, Catastro Municipal, RPP, INFONAVIT, Control Interno). Al seleccionar una, se habilita inmediatamente su tarjeta solicitando el primer paso.
- **Razón**: En actos notariales simples (e.g. Testamentos, Fe de hechos o Poderes), no existen trámites ante Catastro ni RPP; mostrar 5 tarjetas vacías sobrecargaba la pantalla con ruido visual innecesario.
- **Alternativas descartadas**: Mostrar siempre las 6 dependencias fijas en blanco (rechazado: viola el principio de minimalismo y saturación visual).

---

### Decisión 6: Modal Breve de Confirmación y Enlace con Órdenes de Pago
- **Decisión**: Al seleccionar un paso a agregar, se abre un diálogo compacto (`TramitePasoModal.vue`):
  - Precarga la fecha y hora actuales (modificable si el gestor registra un evento del día anterior).
  - Campo de folio oficial / volante / oficio de rechazo.
  - Área de notas u observaciones notariales (motivos del rechazo o requisitos pendientes).
  - Si el paso tiene `genera_orden_pago = true` (pasos 3 `O.P. CAT. EST.`, 8 `ORD. DE PAG. R.P.P.`, 16 `O.P. MUNICIPAL`), la interfaz presenta un switch o enlace destacado `+ Generar Orden de Pago de Derechos` que abre directamente el modal de captura de Órdenes de Pago (Módulo 08), precargando la dependencia y la escritura.
- **Razón**: Asegura que el registro de incidencias sea ágil (< 10 segundos) y crea la articulación natural entre gestoría externa y tesorería notarial.

---

### Decisión 7: Cálculo de Plazos en Días Hábiles y Semáforo Tri-color
- **Decisión**: Mantener el cálculo de días hábiles mediante `fn_calcular_dias_habiles` en PostgreSQL y la utilería isomórfica `diasHabiles.ts` en TypeScript para respuesta reactiva inmediata.
- **Semáforo**:
  - `verde`: Restan > 3 días hábiles.
  - `amarillo`: Restan 1 a 3 días hábiles.
  - `rojo`: Vencido o en estado de prevención/rechazo.
  - `azul / gris`: Concluido o entregado.

---

### Decisión 8: Gate de Protocolización Condicional Estricto (`fn_validar_protocolizacion` Sección J)
- **Decisión**: Mantener la regla: Si la escritura posee trámites en fase `previo` sin concluir ni cancelar, la protocolización queda ESTRICTAMENTE BLOQUEADA; si no tiene trámites previos registrados, pasa libremente.

---

### Decisión 9: Cumplimiento de Diseño Stitch (MCP)
- **Decisión**: La interfaz visual se basa en los diseños validados en Stitch:
  - Screen ID: `bcd2e7c2f8d64eba94af5ad90d70111b` (Tarjetas por Dependencia a 2 columnas con acordeón desplegado y modal compacto).
  - Screen ID: `7af07297dc544b15bcd8f922ae5109f8` (Tablero global y pipeline de trámites).
  - Proyecto Stitch: `2333330112401314472`.
- **Razón**: Apego estricto a §8 de la Constitución del Sistema Notarial.
