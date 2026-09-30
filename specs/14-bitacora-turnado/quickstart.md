# Quickstart: 14-bitacora-turnado (Bitácora de Turnado y Cadena de Custodia: Redactor ↔ Gestor)

Guía paso a paso para validar la cadena de custodia y la bitácora de transferencias de trámites.

---

## 1. Validación del Turnado Inicial al Gestor (User Story 1 - MVP)
1. Iniciar sesión con un usuario con rol **Abogado Redactor** o **Administrador**.
2. Navegar a una escritura en proceso (`/escrituras/[id]`) y abrir la pestaña **"Trámites"**.
3. En la tarjeta o fila de un trámite que se encuentre en redacción, ubicar el botón de acción **"Turnar al Gestor"**.
4. En el modal emergente:
   - Seleccionar al **Gestor Notarial** destinatario.
   - Ingresar instrucciones: *"Ingresar al Registro Público para obtención de Certificado de Libertad de Gravamen"*.
   - Confirmar el turnado.
5. **Verificación**:
   - El badge del trámite cambia inmediatamente a 🔵 *"En manos del Gestor: [Nombre Gestor]"*.
   - Se fija la fecha y hora de inicio de custodia del gestor.

---

## 2. Validación de Devolución por Solventación (User Story 2)
1. Desde la perspectiva del **Gestor Notarial**, en la misma fila del trámite en custodia, presionar **"Devolver al Redactor por Solventación"**.
2. En el modal:
   - Capturar el motivo de prevención: *"Prevención RPP: discrepancia en la superficie del predio respecto al antecedente de propiedad"*.
   - Ingresar el folio de oficio de prevención y fecha límite legal de atención.
   - Confirmar la devolución.
3. **Verificación**:
   - El semáforo del trámite cambia a 🟠 *"Detenido por Solventación — En manos del Redactor: [Nombre Redactor]"*.
   - Se registra el tiempo exacto que el trámite estuvo en manos del gestor antes de ser devuelto.

---

## 3. Validación de Solventación y Re-turnado (User Story 2)
1. Como **Abogado Redactor**, acceder al trámite detenido por solventación.
2. Hacer clic en **"Solventar y Re-turnar al Gestor"**.
3. Capturar la justificación: *"Se aclara superficie con base en plano catastral protocolizado y se anexa nota complementaria"*.
4. Confirmar.
5. **Verificación**:
   - La custodia regresa al Gestor 🔵.
   - El indicador de detenido por solventación se desactiva.
   - Se asienta el tiempo que tardó el redactor en solventar la prevención.

---

## 4. Validación de Entrega de Trámite Concluido (User Story 3)
1. Como **Gestor Notarial**, una vez obtenida la salida de la dependencia, hacer clic en **"Entregar Trámite Concluido"**.
2. Confirmar la entrega formal del certificado o testimonio al Redactor.
3. **Verificación**:
   - El trámite pasa a estatus concluido y se transfiere la custodia del expediente al Redactor para redactar o turnar el siguiente acto.

---

## 5. Validación de la Bitácora Cronológica y Filtros (User Story 4)
1. En el trámite, hacer clic en **"Ver Bitácora de Turnado"**.
2. Se despliega el **Timeline** con todos los movimientos ordenados cronológicamente:
   - Turnado inicial (Redactor → Gestor).
   - Devolución por prevención (Gestor → Redactor) con el motivo visible.
   - Solventación y reingreso (Redactor → Gestor).
   - Entrega final (Gestor → Redactor).
   - Tiempos acumulados en días y horas en cada etapa.
3. Ir al listado general de trámites en `/tramites`.
4. Utilizar el filtro de **"Custodia Actual"** (*En manos del Gestor*, *En manos del Redactor*, *Todos*) y verificar el filtrado preciso de los instrumentos.
