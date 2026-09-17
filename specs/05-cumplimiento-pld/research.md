# Research & Technical Decisions: 05-cumplimiento-pld

**Feature**: Cumplimiento PLD / Prevención de Lavado de Dinero y Fiscalización Notarial
**Branch**: `05-cumplimiento-pld`
**Date**: 2026-09-15

---

## 1. Almacenamiento e Integridad de Evidencias Documentales

### Decisión
Crear un bucket privado en Supabase Storage denominado `pld-evidencias` con control de acceso RLS estricto (`authenticated` con políticas de lectura para personal notarial y de inserción para oficiales de cumplimiento / proyectistas). Cada archivo subido (captura de pantalla PNG/JPG o comprobante PDF) se identifica con una ruta determinista:
`{escritura_id}/{compareciente_id}/{lista_codigo}_{timestamp}.{ext}`
Al persistir en `pld_consultas`, se almacena el storage path, el nombre original, el tamaño y el hash criptográfico SHA-256 del archivo.

### Justificación
- Cumple rigurosamente con el Art. 18 Fracción IV de la LFPIORPI, que obliga a las notarías públicas a custodiar y conservar de manera íntegra las evidencias de identificación y verificación durante un plazo mínimo de 10 años.
- El hash SHA-256 garantiza que el archivo no ha sido alterado, otorgando valor probatorio pleno ante auditorías del SAT y visitas de inspección de la UIF.

### Alternativas Descartadas
- *Almacenar archivos como BLOB / bytea en Postgres*: Descartado por saturar la memoria y backups de la base de datos relacional.
- *Bucket público*: Descartado categóricamente debido a la privacidad de datos personales y la naturaleza sensible de la fiscalización KYC/PLD.

---

## 2. Motor de Cálculo de UMA y Clasificación Dinámica de Avisos

### Decisión
Implementar una arquitectura híbrida de cálculo:
1. **Frontend Reactivo (`usePldCalculations.ts`)**: Calcula en tiempo real las conversiones UMA, montos límite de efectivo y dictámenes de aviso conforme el proyectista teclea o ajusta cifras en la UI.
2. **Backend / Base de Datos Canónica (`fn_evaluar_pld_escritura(p_escritura_id uuid)`)**: Función SQL que consulta el catálogo histórico `public.uma_historico` cruzando contra `fecha_celebracion` de la escritura (`fecha_inicio_vigencia <= fecha_celebracion AND (fecha_fin_vigencia >= fecha_celebracion OR fecha_fin_vigencia IS NULL)`). Contrasta contra los umbrales configurados para el acto jurídico (`umbral_identificacion_uma`, `umbral_aviso_uma`, `limite_efectivo_uma`) y persiste en `pld_evaluaciones_escritura`.

### Justificación
- Garantiza retroalimentación inmediata en la UI (< 100ms) sin dependencias de red continuas, mientras asegura que el Gate de Protocolización en Postgres sea infalsificable y autónomo frente a manipulaciones en el cliente.
- Respeta las fechas de vigencia anual de la UMA (que cambia cada 1 de febrero en México conforme al INEGI), evitando aplicar la UMA actual a escrituras celebradas en ejercicios anteriores.

### Alternativas Descartadas
- *Cálculo exclusivo en frontend*: Inaceptable en fe pública notarial porque permitiría a un cliente alterar el resultado e invocar la protocolización saltándose la validación.
- *Microservicio externo*: Innecesario y añade latencia; Postgres maneja cálculos numéricos con precisión arbitraria (`numeric(14,2)`) de forma óptima.

---

## 3. Reutilización Asistida de Screening Vigente (< 90 Días)

### Decisión
Crear la función RPC `public.fn_obtener_screening_vigente(p_compareciente_id uuid, p_escritura_id uuid)` que busca si el compareciente posee consultas de listas con resultado `limpio` o falsos positivos debidamente documentados en cualquier instrumento de la notaría dentro de los últimos 90 días naturales (`created_at >= now() - interval '90 days'`).
Cuando el usuario acepta la sugerencia en la interfaz, se invoca `public.fn_importar_screening_pld(p_escritura_destino uuid, p_compareciente_id uuid, p_escritura_origen uuid)`, la cual vincula los registros a la nueva escritura preservando:
- El archivo de evidencia original en storage (sin duplicar bytes).
- La fecha y hora original en que se efectuó el cotejo en el portal.
- El método registrado como `reutilizado_asistido`.
- El usuario que ejecutó la importación deliberada.

### Justificación
- Respeta la decisión tomada en la Sesión de Clarificaciones 2026-09-15 (Opción B).
- Reduce drásticamente el tiempo administrativo ante clientes habituales (desarrolladores inmobiliarios, apoderados bancarios) sin violar el principio de trazabilidad notarial ni degradar la auditoría.

### Alternativas Descartadas
- *Reutilización automática transparente (silenciosa)*: Descartada en clarificaciones porque el oficial debe tener conocimiento explícito de la vigencia del dictamen que ampara el nuevo instrumento.
- *Duplicar físicamente las imágenes en el bucket*: Descartado por desperdicio de almacenamiento y redundancia de datos innecesaria.

---

## 4. Control de Restricción de Efectivo (Art. 32 LFPIORPI)

### Decisión
Enriquecer la entidad de evaluación de PLD (`pld_evaluaciones_escritura`) con:
- `monto_efectivo numeric(14,2) default 0.00`
- `veces_uma_efectivo numeric(12,2)`
- `limite_efectivo_uma numeric(12,2)`
- `excede_limite_efectivo boolean default false`
En actos traslativos de inmuebles el límite es **8,025 UMA**; en actos societarios, poderes y fideicomisos es **3,210 UMA**. Si `monto_efectivo > limite_efectivo_uma * valor_uma`, se activa bandera roja y el Gate de Protocolización bloquea el trámite.

### Justificación
- Incorporado tras la clarificación de Sesión 2026-09-15 (Opción A). La prohibición de liquidación en efectivo es el punto neurálgico del régimen sancionatorio de la LFPIORPI para los notarios.

---

## 5. Formalización de la Debida Diligencia PEP

### Decisión
La debida diligencia reforzada para Personas Políticamente Expuestas (PEPs directos o asimilados por parentesco hasta 2° grado o afinidad/socios comerciales) se gestiona en la tabla `public.pld_pep_diligencias`.
Requiere:
- Identificación del cargo público, periodo y dependencia.
- Vínculo (si es asimilado).
- Cuestionario de procedencia de los recursos económicos.
- Aprobación expresa en base de datos mediante la función `public.fn_aprobar_diligencia_pep(p_diligencia_id uuid, p_notas text)`, la cual valida a nivel de RLS/función que el usuario autenticado cuente con el rol `notario_titular` o `administrador`.

### Justificación
- Cumple con los estándares internacionales GAFI y la regulación nacional: las operaciones con PEPs no están prohibidas, pero exigen autorización del Notario Titular (alta dirección).

---

## 6. Sustitución Canónica del Gate de Protocolización

### Decisión
Reemplazar definitivamente el stub en `public.fn_validar_protocolizacion(p_escritura_id uuid)`. La función ahora valida de forma determinista:
1. **Comparecientes y Screening**:
   - Todo compareciente en `escritura_comparecientes` debe tener registradas las 4 listas obligatorias vigentes (< 90 días).
   - Ningún compareciente debe tener dictamen `coincidencia_bloqueante` activo en LPB o SAT 69-B.
2. **Diligencia PEP**:
   - Si algún compareciente tiene condición PEP, debe contar con su diligencia aprobada por el Notario Titular (`aprobado = true`).
3. **Control de Efectivo**:
   - Para actos clasificados como actividad vulnerable (`es_actividad_vulnerable = true`), el `monto_efectivo` no debe rebasar el límite legal en UMA.
4. **Beneficiario Controlador**:
   - Para personas morales en actos traslativos o actividades vulnerables, debe existir al menos un beneficiario controlador acreditado en su expediente KYC (conforme al Art. 32-B Quáter CFF).
5. **Actos No Vulnerables**:
   - Se exige el 100% de screening limpio de todos sus otorgantes, pero se omite la validación de umbrales UMA, avisos SAT y límites de efectivo.

### Justificación
- Cumple con el Principio de Protocolización Atómica Irreversible (Constitución §6) y elimina cualquier código provisional o suposición de tablas previas.
