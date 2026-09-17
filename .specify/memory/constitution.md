<!--
Sync Impact Report
==================
Version change: 1.2.1 → 1.3.0
Rationale: Adición (MINOR) del principio y lineamiento obligatorio de diseño previo
           con Stitch (MCP) al crear pantallas, optimizando la visualización,
           ergonomía y coherencia visual del frontend antes de su implementación.

Modified principles: N/A
Added sections:
  - 2. Stack tecnológico: inclusión de Stitch (MCP) para diseño y prototipado UI.
  - 7. Convenciones generales: principio obligatorio de diseño previo con Stitch.
  - 8. Diseño de interfaces y pantallas (Stitch): flujo, parámetros y criterios de visualización.
Removed sections: ninguna

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — sin cambios necesarios (evalúa la constitución dinámicamente).
  ✅ .specify/templates/spec-template.md — sin referencias desactualizadas.
  ✅ .specify/templates/tasks-template.md — sin referencias desactualizadas.

Follow-up TODOs (deferidos, no bloquean esta versión):
  - Proveedor de hosting para Docker en producción aún por definir.
-->

# Constitution — Sistema de Administración Notarial

## 1. Visión general

Sistema web para la administración integral de una notaría pública en México.
La **Escritura Pública** es la entidad raíz del sistema: todos los demás módulos
existen para soportar, documentar o dar seguimiento a lo que ocurre alrededor
de una escritura.

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + Nuxt 3 + Vuetify |
| Backend / datos | Supabase (Postgres + Auth + Storage + Edge Functions), Docker local |
| Prototipado y diseño UI | Stitch (MCP) — generación de pantallas a partir de parámetros y contexto |
| Mapas | Leaflet + Leaflet.draw sobre OpenStreetMap / capas INEGI (marco geoestadístico, catastro) |
| Notificaciones | Edge Functions + pg_cron (disparo de eventos) + proveedores externos (correo: Resend/SendGrid; WhatsApp/SMS: Twilio o WhatsApp Business API) |
| Autenticación / roles | Supabase Auth + RLS (Row Level Security) por rol |
| Validación de formularios | Yup (esquemas de validación) + VeeValidate (integración con formularios Vue 3) |
| Testing | Vitest (unitario/componentes) + Vue Test Utils |
| Manejo de estado | Pinia |

## 3. Modelo de entidades (alto nivel)

```
ESCRITURA PÚBLICA (raíz)
 ├── Comparecientes (N:M, con rol: otorgante, adquirente, apoderado, testigo...)
 │     └── Cumplimiento PLD/UIF (screening, riesgo, beneficiario controlador)
 ├── Expediente (documentos digitalizados)
 ├── Trámite(s)
 │     ├── Orden(es) de pago (derechos a terceros: RPP, Catastro, ISABI...)
 │     └── Aviso(s) SAT/UIF (mensual, en ceros, 24 horas)
 ├── Honorarios (cobro propio de la notaría; pagos parciales/saldo)
 ├── Predio / Traslativo de dominio → Georreferenciación (polígono, colindancias)
 └── Tipo de acto notarial (catálogo)

NOTIFICACIONES — servicio transversal orientado a eventos
 (correo / WhatsApp / SMS a clientes sobre pagos, avances de trámite, etc.)
```

## 4. Lista de módulos

1. **Escrituras** (raíz)
2. **Comparecientes** (personas físicas y morales)
3. **Cumplimiento PLD/UIF** (screening de listas, riesgo, beneficiario controlador)
4. **Expedientes** (documentos digitalizados)
5. **Trámites**
6. **Avisos SAT/UIF** (mensual, en ceros, 24 horas)
7. **Órdenes de pago** (derechos a terceros)
8. **Honorarios** (cobro de la notaría)
9. **Georreferenciación** (mapa, polígonos, colindancias)
10. **Notificaciones** (correo, WhatsApp, SMS — servicio transversal por eventos)
11. **Reportes**
12. **Administración general** (catálogos, datos de la notaría, UMA vigente)

## 5. Marco regulatorio — Cumplimiento PLD/UIF (LFPIORPI)

La fe pública notarial es actividad vulnerable conforme al Art. 17 LFPIORPI,
supervisada por SHCP/UIF y el SAT (portal SPPLD).

**Umbrales** (en UMA, no en pesos — valor vigente se gestiona en catálogo):
- Umbral de identificación: obliga a KYC del cliente.
- Umbral de aviso: obliga a reportar al SAT (a más tardar el día 17 del mes
  siguiente).

**Tipos de aviso:** normal (mensual), informe en ceros, aviso de 24 horas
(match en listas o sospecha, incluso si la operación no se consuma).

**Listas a cotejar por compareciente:**
- Lista de Personas Bloqueadas (UIF/SHCP)
- OFAC SDN
- Lista Consolidada ONU
- Sanciones UE (si aplica)
- SAT 69-B (empresas de operaciones simuladas)

**Distinción operativa clave:**
- Match en Lista de Personas Bloqueadas → bloquea la operación + aviso de 24h.
- Match como PEP (persona políticamente expuesta, incluye PEP asimiladas:
  cónyuge, familiares, vínculos patrimoniales) → no bloquea, exige diligencia
  reforzada documentada.

**Beneficiario controlador:** para personas morales/fideicomisos, verificar
registro ante SAT (Art. 32 Bis CFF) antes de firmar el instrumento definitivo.

**Conservación:** evidencia y expedientes se conservan 10 años.

### Estrategia de implementación (MVP → futuro)

- **Fase 1 (manual):** el sistema presenta checklist con links directos a los
  portales oficiales de cada lista. El usuario consulta manualmente, regresa
  y captura resultado + evidencia (captura de pantalla obligatoria) por cada
  lista. Sella automáticamente fecha/hora/usuario.
- **Fase 2 (futuro, opcional):** integración con proveedor RegTech vía API
  (p. ej. KYC Systems, Regcheq, Match PLD, ArmorAML — cotización directa con
  cada proveedor, sin precios públicos).
- **Diseño de datos preparado para ambas fases:** tabla `consulta_lista` con
  campo `metodo` (`manual` | `api_proveedor`) y `proveedor_id` opcional, de
  modo que agregar un proveedor en el futuro no requiera rediseñar el módulo
  ni las entidades que dependen de él (Comparecientes, Escrituras).

## 6. UMA (Unidad de Medida y Actualización)

- Vive en Administración General como tabla `uma_historico`: valor,
  fecha_inicio_vigencia, fecha_fin_vigencia, usuario, fecha_actualizacion.
- Actualización **manual** (no hay API oficial confiable): el usuario
  administrador la captura cada año (vigencia típica: 1 feb – 31 ene).
- Todo cálculo de umbral usa el valor de UMA **vigente a la fecha del acto**,
  no el más reciente, para permitir recálculos históricos correctos.
- Alerta bloqueante en el dashboard de Cumplimiento si, iniciado febrero, el
  valor del año no ha sido capturado.

## 7. Convenciones generales (a definir/ajustar en avance)

- Auditoría: todo cambio relevante en Escrituras, Comparecientes, Órdenes de
  pago y Honorarios debe quedar trazado (quién, cuándo, qué cambió).
- Consecutivos/folios: por definir por módulo (Escrituras, Trámites, Avisos).
- Roles y permisos: sistema dinámico, no fijo en código. Catálogo de permisos granular (módulo.acción) asignable a roles editables desde Administración General. Seed inicial de 3 roles (Administrador, Auxiliar, Gestor) con permisos y alcance (propias/todas las escrituras) predefinidos pero 100% ajustables después. Cada escritura tiene un responsable_id reasignable solo por quien tenga el permiso correspondiente — ver detalle completo en el spec de Usuarios, roles y permisos.
- Separación contable: Órdenes de pago (dinero de paso a terceros) y
  Honorarios (ingreso propio de la notaría) se modelan en tablas separadas.
- Diseño previo con Stitch: antes de codificar cualquier pantalla en el frontend, se debe solicitar el diseño a Stitch vía MCP con sus parámetros contextuales para optimizar la ergonomía y visualización de datos (ver Sección 8).
- Internacionalización: no se requiere soporte multi-idioma. La interfaz,
  los datos y la documentación son en español (México) únicamente; no se
  agrega capa de i18n.
- Entornos: Docker se usa tanto para el entorno de desarrollo local (incluye
  stack de Supabase vía su CLI) como para el despliegue en producción
  (contenedor(es) Docker; proveedor de hosting aún por definir).
- CI/CD: no se implementa por ahora. Despliegues manuales hasta que se
  decida lo contrario.

## 8. Diseño de interfaces y pantallas (Stitch)

Al crear o modificar pantallas e interfaces de usuario en el frontend, rigen las siguientes reglas de observancia obligatoria:

1. **Petición previa obligatoria a Stitch:** Antes de escribir o modificar código Vue 3 / Nuxt 3 para cualquier pantalla, vista o flujo de usuario principal, se DEBE (MUST) enviar una solicitud con los parámetros necesarios a la herramienta Stitch (mediante sus herramientas MCP como `generate_screen_from_text`, `create_project` o `edit_screens`).
2. **Parámetros contextuales requeridos:** La solicitud a Stitch debe incluir como mínimo:
   - Nombre y propósito operativo de la pantalla (ej. listado de escrituras, detalle con pestañas, formulario modal).
   - Rol o perfil de usuario destino (ej. Administrador, Abogado, Auxiliar).
   - Componentes clave esperados (tablas paginadas, filtros de búsqueda, formularios validados, botones de acción primaria/secundaria, alertas de estatus).
   - Lineamientos visuales y paleta del sistema (tema claro institucional: primario `#1B3A5F`, secundario `#A9762E`, fondos limpios y ergonomía notarial).
3. **Mejora de visualización y ergonomía:** El objetivo indispensable del diseño en Stitch es explorar y validar una presentación visual limpia, moderna y con alta legibilidad antes de programar, evitando interfaces sobrecargadas o componentes desalineados.
4. **Referencia de implementación:** El resultado generado en Stitch fungirá como la maqueta de referencia directa para la estructuración de componentes Vuetify, layout y comportamiento visual en la fase de implementación.

## 9. Próximos pasos

Documentar cada módulo con `spec.md` → `plan.md` → `tasks.md` siguiendo
spec-kit, en el orden: Comparecientes (incluye gate de Cumplimiento PLD) →
Escrituras → Expedientes → Trámites → Avisos SAT/UIF → Órdenes de pago →
Honorarios → Georreferenciación → Notificaciones → Reportes →
Administración general.

## 10. Gobernanza

- Esta constitución tiene precedencia sobre cualquier práctica de desarrollo
  ad hoc; cualquier plan (`plan.md`) o tarea que la contradiga debe justificar
  la desviación explícitamente o ser corregido.
- **Enmiendas:** cualquier cambio a este documento se hace vía
  `/speckit-constitution`, incrementando la versión según semver:
  - MAYOR: eliminación o redefinición incompatible de un módulo, sección
    regulatoria o pieza del stack ya establecida.
  - MENOR: adición de un módulo, sección o pieza del stack nueva.
  - PARCHE: aclaraciones, correcciones de redacción, ajustes no semánticos.
- Cada enmienda debe generar un "Sync Impact Report" (comentario HTML al
  inicio del archivo) indicando qué cambió y qué plantillas se revisaron.

**Version**: 1.3.0 | **Ratified**: 2026-07-27 | **Last Amended**: 2026-09-14
