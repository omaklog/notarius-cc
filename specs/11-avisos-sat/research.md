# Research: 11-avisos-sat (Avisos SAT / UIF - Prevención de Lavado de Dinero SPPLD)

**Feature**: `11-avisos-sat`  
**Date**: 2026-09-17  
**Status**: Completed

---

## 1. Marco Jurídico y Normativo (LFPIORPI)

En el régimen mexicano de prevención de lavado de dinero, los Notarios Públicos (Fedatarios Públicos) realizan Actividades Vulnerables conforme al **Artículo 17 Fracción XII de la LFPIORPI**:

1. **Actos Objeto de Aviso**:
   - Transmisión o constitución de derechos reales sobre inmuebles (compraventas, donaciones, permutas, adjudicaciones).
   - Otorgamiento de poderes para actos de administración o dominio con carácter irrevocable.
   - Constitución de personas morales, modificación patrimonial, aumentos o disminuciones de capital, fusión o escisión.
   - Constitución o modificación de fideicomisos traslativos de dominio o de garantía.
   - Contratos de mutuo, créditos o préstamos (garantizados o no).

2. **Obligaciones y Umbrales en UMA**:
   - **Identificación**: Integrar expediente KYC (cotejo en listas LPB, OFAC, ONU, 69-B, identificación oficial, comprobante, beneficiario controlador).
   - **Aviso ante la SHCP/SAT**: Si el monto de la operación (o la acumulación en 6 meses con el mismo cliente) excede el umbral fijado en UMA (e.g., 16,050 UMA en inmuebles).
   - **Plazo de Presentación**: A más tardar el **día 17 del mes calendario inmediato posterior** al de la fecha de celebración del acto.
   - **Prórroga por RFC (RMF y CFF)**: Conforme al sexto dígito numérico del RFC del fedatario:
     - 1 y 2: +1 día hábil
     - 3 y 4: +2 días hábiles
     - 5 y 6: +3 días hábiles
     - 7 y 8: +4 días hábiles
     - 9 y 0: +5 días hábiles

3. **Tipos de Avisos**:
   - **Aviso Ordinario Mensual**: Relación de actos que superaron el umbral en el mes.
   - **Informe en Ceros**: Obligatorio cuando en el mes concluido la notaría no formalizó ningún acto sujeto a aviso. Su omisión genera sanciones idénticas a la omisión de aviso ordinario.
   - **Aviso de 24 Horas**: Obligación perentoria e improrrogable ante coincidencias confirmadas en la **Lista de Personas Bloqueadas (LPB)** o indicios fundados de procedencia ilícita, inclusive si la operación no llegó a protocolizarse.
   - **Aviso Modificatorio / Complementario**: Para subsanar o rectificar un aviso ya aceptado, referenciando su folio de acuse anterior.

---

## 2. Estructura del Archivo XML para el Portal SPPLD (SAT / UIF)

El portal SPPLD recibe archivos `.xml` estructurados según el esquema XSD de la UIF para "Fedatarios Públicos" (Fracción XII).

### Estructura Jerárquica del XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<archivo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <sujeto_obligado>
    <clave_sujeto_obligado>FED-09-0142</clave_sujeto_obligado>
    <rfc>NOT750812AB3</rfc>
    <numero_notaria>142</numero_notaria>
    <entidad_federativa>09</entidad_federativa>
  </sujeto_obligado>
  <aviso>
    <referencia_aviso>AVS-2026-08-0042</referencia_aviso>
    <prioridad>1</prioridad>
    <operacion>
      <fecha_operacion>20260814</fecha_operacion>
      <tipo_acto>1201</tipo_acto>
      <numero_instrumento>45892</numero_instrumento>
      <volumen_o_libro>120</volumen_o_libro>
      <personas>
        <persona rol="1" tipo="F">
          <nombre>JUAN</nombre>
          <apellido_paterno>PEREZ</apellido_paterno>
          <apellido_materno>HERNANDEZ</apellido_materno>
          <rfc>PEHJ800101AA1</rfc>
          <curp>PEHJ800101HDFRRN09</curp>
        </persona>
        <persona rol="2" tipo="F">
          <nombre>MARIA</nombre>
          <apellido_paterno>GONZALEZ</apellido_paterno>
          <apellido_materno>LOPEZ</apellido_materno>
          <rfc>GOLM850515BB2</rfc>
          <curp>GOLM850515MDFPZ01</curp>
        </persona>
      </personas>
      <bien_operacion>
        <tipo_bien>inmueble</tipo_bien>
        <descripcion>CASA HABITACION EN CONDOMINIO</descripcion>
        <calle>AV. REFORMA</calle>
        <numero_exterior>505</numero_exterior>
        <codigo_postal>06500</codigo_postal>
        <entidad_federativa>09</entidad_federativa>
      </bien_operacion>
      <liquidacion>
        <monto_operacion>3500000.00</monto_operacion>
        <forma_pago>03</forma_pago>
        <institucion_bancaria>BBVA MEXICO</institucion_bancaria>
        <clave_rastreo>SPEI20260814BBVA001</clave_rastreo>
      </liquidacion>
    </operacion>
  </aviso>
</archivo>
```

---

## 3. Generación de Cédula de Aviso en PDF (jsPDF)

Para satisfacer la decisión del usuario (**Q1: 1 A, también con opción de PDF**), se diseña la utilidad `app/utils/pdfCedulaAvisoSat.ts` basada en `jsPDF`:
- Dimensiones: Hoja membretada Carta (Letter) con márgenes institucionales (20 mm).
- Colores institucionales notariado: Azul Marino `#1B3A5F` y Dorado `#A9762E`.
- Secciones:
  1. Membrete oficial: Notaría Pública, Notario Titular, RFC y Dirección.
  2. Dictamen Legal PLD: Acto jurídico, fundamento Art. 17 Fracc. XII LFPIORPI, valor de UMA a la fecha del acto, monto en pesos y veces UMA.
  3. Cuadro de Sujetos Obligados y Comparecientes: Otorgantes, adquirentes, apoderados y beneficiarios controladores con RFC, CURP y domicilio.
  4. Identificación del Objeto o Inmueble: Ubicación geográfica, folio real catastral o datos corporativos.
  5. Desglose de Medios de Pago y Liquidación: Verificación de instrumentos bancarios y certificación de cumplimiento del tope de efectivo (Art. 32 LFPIORPI).
  6. Control de Presentación y Acuse: Folio de acuse SAT, fecha de presentación y firma/sello del Oficial de Cumplimiento.

---

## 4. Algoritmo de Fechas y Prórrogas por RFC

Para satisfacer la decisión del usuario (**Q3: 3 A**), el composable `useAvisosSatCalculos.ts` implementa:
1. `obtenerFechaLimiteBase(fechaActo: string): Date`:
   - Mes del acto + 1, día 17.
   - Si cae en sábado o domingo, se corre al lunes siguiente.
2. `calcularDiasProrrogaRfc(rfcNotario: string): number`:
   - Extrae el 6º dígito del RFC (e.g. `NOTP750812` -> posición de dígito numérico).
   - Mapeo RMF:
     - 1, 2: +1 día hábil
     - 3, 4: +2 días hábiles
     - 5, 6: +3 días hábiles
     - 7, 8: +4 días hábiles
     - 9, 0: +5 días hábiles
3. `calcularFechaLimiteEfectiva(fechaActo: string, rfcNotario: string): Date`:
   - Aplica los días hábiles a la fecha base.
4. `obtenerSemaforoVencimiento(fechaLimite: Date): { diasRestantes: number, color: string, etiqueta: string }`.

---

## 5. Decisiones de Arquitectura y Persistencia

1. **Aislamiento Contable y Normativo**:
   - `avisos_sat` se relaciona directamente con `escrituras` (1:N, permitiendo aviso inicial y modificatorios).
   - Para informes en ceros mensuales, `escritura_id` es `NULL` y se vincula a nivel periodo (`periodo_anio`, `periodo_mes`).
2. **Historial y Evidencia Documental**:
   - Los acuses oficiales emitidos por el portal SPPLD del SAT en formato PDF se almacenan en el bucket existente `expedientes` de Supabase Storage con ruta estructurada: `avisos_sat/{anio}/{mes}/acuse_{id}.pdf`.
   - Se crea la tabla de auditoría `avisos_sat_bitacora` para satisfacer el requisito de conservación de 10 años que impone la LFPIORPI.
