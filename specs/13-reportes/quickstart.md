# Quickstart: 13-reportes (Panel Ejecutivo, Reportes Operativos e Índices Notariales por Volumen)

Guía rápida para validar el flujo completo del Centro de Reportes Notariales.

---

## 1. Acceso y Permisos
1. Iniciar sesión con un usuario con permiso `reportes:ver_operativos` (o rol Administrador / Notario Titular).
2. En la barra de navegación lateral, localizar el grupo **"Sistema"** y hacer clic en **"Reportes"** (`/reportes`).

---

## 2. Validación del Dashboard Ejecutivo del Mes
1. Al cargar la página, se muestra la pestaña principal **"Dashboard Ejecutivo"**.
2. Verificar las 4 tarjetas de KPIs del mes en curso:
   - *Escrituras Abiertas en el Mes*
   - *Escrituras Firmadas en el Mes*
   - *Escrituras en Trámite*
   - *Escrituras Canceladas*
3. Observar la gráfica de **Carga por Redactor**:
   - Cada barra representa a un abogado redactor con el número de escrituras asignadas en el mes.
4. Observar la gráfica de **Top 5 de Actos Jurídicos**:
   - Muestra los 5 actos con más demanda (ej. Compraventa, Donación, etc.) con sus porcentajes.
5. Utilizar el selector de mes y año para cambiar el periodo y verificar que todos los datos y gráficas se actualizan reactivamente.

---

## 3. Validación del Reporte General de Escrituras y Gestoría
1. Cambiar a la pestaña **"Reporte General de Escrituras"**.
2. Probar los filtros rápidos de estatus: *Todas*, *Firmadas*, *En Trámite*, *Canceladas*.
3. Utilizar el campo de búsqueda para localizar un instrumento por número o nombre de compareciente.
4. En las columnas de gestoría, constatar los indicadores de trámites:
   - *Trámites Asignados al Gestor*
   - *Trámites Liberados / Concluidos*
5. Hacer clic en **"Exportar a Excel (CSV)"** y verificar que se descargue el archivo con codificación UTF-8.

---

## 4. Validación de Índices Notariales por Volumen y Foliado
1. Cambiar a la pestaña **"Índices por Volumen"**.
2. Constatar la cuadrícula de **Cards de Volúmenes**:
   - Cada card indica el número de volumen, año, rango de escrituras comprendidas y el semáforo:
     - Badge verde: *Foliado Completo (N/N)*.
     - Badge ámbar: *Foliado Pendiente (X sin foliar)*.
3. Hacer clic en un card de volumen para abrir su detalle.
4. En la tabla de escrituras del volumen:
   - Modificar o capturar la `Página Inicial` y `Página Final` de una escritura.
   - Comprobar que al guardar se actualiza la base de datos y se recalcula el semáforo del card.
   - Probar ingresar una página final menor que la inicial y verificar que el validador emite la alerta preventiva.
5. Hacer clic en **"Imprimir Índice Oficial del Volumen"**:
   - Verificar la vista previa formal con membrete notarial, No. Instrumento, Volumen, Fecha, Acto Jurídico, Comparecientes con rol, Páginas Inicial y Final, Observaciones (Firmada / Cancelada) y la leyenda de Certificación Notarial al calce.
   - Comprobar que al presionar "Imprimir" se abre el diálogo nativo de impresión (`window.print()`) listo para PDF o papel.
