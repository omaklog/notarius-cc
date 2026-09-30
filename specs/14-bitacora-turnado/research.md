# Research: 14-bitacora-turnado (Bitácora de Turnado y Cadena de Custodia: Redactor ↔ Gestor)

**Feature**: `14-bitacora-turnado` | **Date**: 2026-09-25

---

## 1. Contexto Notarial y Desafío Operativo

En la práctica notarial mexicana, la vida de una escritura pública involucra un flujo continuo e iterativo entre dos actores internos fundamentales:
1. **El Abogado Redactor**: Responsable de la integración jurídica, redacción del instrumento, cumplimiento formal y solventación de observaciones de fondo o forma.
2. **El Gestor Notarial**: Responsable de la tramitación externa ante dependencias públicas (Registro Público de la Propiedad, Direcciones de Catastro, SEDETUS, dependencias fiscales locales).

### El Problema de la "Estafeta Perdida":
- Cuando un trámite se ingresa a una dependencia, la responsabilidad operativa es del gestor.
- Si la dependencia formula una **prevención registral, suspensión u observación técnica**, el gestor debe devolver el expediente al redactor para que aclare, modifique o subsane el instrumento. Durante este lapso, la gestión externa está en pausa por causa jurídica imputable a redacción.
- Una vez subsanado, el redactor reingresa/turna de nuevo al gestor.
- Finalmente, al obtener la salida favorable de un trámite (ej. Certificado de Libertad de Gravamen), el gestor devuelve el documento al redactor para que continúe la redacción o turne el siguiente trámite (ej. traslado de dominio).

**Objetivo de la Feature**: Implementar una bitácora inmutable de turnado y cadena de custodia que registre de forma transparente y con sellado de tiempo **quién tiene en sus manos el expediente o trámite en cada momento**, cuánto tiempo duró en cada custodia y el motivo de cada transferencia.

---

## 2. Decisiones Arquitectónicas y de Datos

### Decisión 1: Registro Atómico e Inmutable en PostgreSQL
- **Enfoque**: Crear la tabla `public.bitacora_turnado_tramites` con una función almacenada `security definer` (`public.fn_turnar_tramite(...)`).
- **Justificación**:
  - Garantiza atomicidad: la inserción del evento en la bitácora histórica y la actualización de los campos de estado en `public.tramites_escritura` (`custodia_actual_rol`, `custodio_actual_id`, `fecha_inicio_custodia_actual`, `detenido_por_solventacion`) ocurren dentro de la misma transacción.
  - Inmutabilidad estricta: políticas de RLS prohíben `UPDATE` y `DELETE` sobre la bitácora para garantizar la cadena de no repudio notarial.

### Decisión 2: Tipología de Eventos de Turnado
Se establecen 5 tipos de eventos estandarizados:
1. `turnado_a_gestor`: Asignación inicial o entrega de expediente del redactor al gestor para iniciar gestión externa.
2. `devuelto_a_redactor_prevencion`: Devolución del gestor al redactor por prevención oficial, requerimiento de aclaración o documento faltante. Exige motivo obligatorio y fecha límite.
3. `solventado_reingresado`: Entrega del redactor al gestor tras subsanar la prevención, listo para reingreso a ventanilla.
4. `tramite_concluido_entregado`: Entrega formal del gestor al redactor con el documento o constancia final obtenida de la dependencia.
5. `reasignacion_administrativa`: Cambio de gestor o redactor custodio por ausencia, redistribución de carga o instrucción del Notario Titular.

### Decisión 3: Cómputo Automático de Horas en Custodia
- Al registrar un nuevo movimiento, el sistema calcula automáticamente la diferencia entre la fecha/hora actual (`now()`) y el inicio de la custodia anterior (`fecha_inicio_custodia_actual`).
- Esto permite responder métricas clave como:
  - ¿Cuántos días hábiles tardó el redactor en solventar la prevención?
  - ¿Cuántos días tardó el gestor en concluir la gestión en el Registro Público?
  - ¿Quién detuvo más tiempo el expediente?

### Decisión 4: Ergonomía Visual Stitch Notarial (§8 Constitución)
- En la tabla de trámites: Componente badge `CustodiaTramiteBadge.vue` que despliega el avatar del custodio, su rol (`Redactor` o `Gestor`), y un semáforo de estado:
  - 🔵 **Azul Notarial (`#1B3A5F`)**: En gestión externa activa en manos del Gestor.
  - 🟠 **Ámbar / Warning (`#B45309`)**: Detenido por solventación en manos del Redactor.
  - 🟢 **Verde Notarial (`#2F6F4E`)**: Concluido y devuelto al Redactor.
- Componente `BitacoraTurnadoTimeline.vue`: Despliegue cronológico ordenado con tarjetas de evento, motivos destacados, documentos vinculados y tiempo acumulado.

---

## 3. Matriz de Compatibilidad y Principio de Pestañas (§3 Constitución)

- `TramitesTab.vue` (en `app/components/escrituras/tabs/`) mantendrá intacto su contrato:
  - Props: `escrituraId: string`, `estatus: string`.
  - Emits: `@status-change`.
- La bitácora se integrará limpiamente como un diálogo/drawer (`BitacoraTurnadoDrawer.vue`) y una acción contextual en las filas de trámites, sin romper ninguna consulta ni dependencia previa.
