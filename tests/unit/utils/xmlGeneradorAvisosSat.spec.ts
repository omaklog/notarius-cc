import { describe, it, expect } from 'vitest';
import {
  escaparXml,
  formatearFechaSat,
  generarXmlAvisoIndividual,
  generarXmlPaqueteConsolidado,
  generarXmlInformeCeros,
} from '../../../app/utils/xmlGeneradorAvisosSat';
import type { DatosAvisoNotariaXml, DatosOperacionAvisoXml } from '../../../app/types/avisosSat';

describe('xmlGeneradorAvisosSat', () => {
  const mockNotaria: DatosAvisoNotariaXml = {
    claveSujetoObligado: 'FED-09-0042',
    rfcNotario: 'MER750812AB1',
    numeroNotaria: '42',
    entidadFederativa: '09',
    nombreNotario: 'Lic. Roberto Méndez',
  };

  const mockOperacion: DatosOperacionAvisoXml = {
    escrituraId: 'esc-100',
    numeroInstrumento: '48102',
    volumenOLibro: '189',
    fechaOperacion: '2026-08-12',
    tipoActoSat: '1201',
    descripcionActo: 'Compraventa de Inmueble & Terreno',
    montoOperacionMxn: 3500000,
    formaPagoSat: '03',
    institucionBancaria: 'BBVA México',
    claveRastreo: 'SPEI202608124001',
    personas: [
      {
        rol: '1',
        tipoPersona: 'M',
        nombreRazonSocial: 'Valero & Hermanos S.A. de C.V.',
        rfc: 'VHE180412KJ9',
      },
      {
        rol: '2',
        tipoPersona: 'F',
        nombreRazonSocial: 'Mauricio',
        apellidoPaterno: 'Gómez',
        apellidoMaterno: 'Alcántara',
        rfc: 'GOAM820914P44',
        curp: 'GOAM820914HDFLR02',
      },
    ],
    inmueble: {
      tipoBien: 'inmueble',
      descripcion: 'Lote 14 Mz 3 Fracc Lomas Altas',
      calle: 'Av. Reforma',
      numeroExterior: '505',
      codigoPostal: '06500',
      municipio: 'Miguel Hidalgo',
      entidadFederativa: '09',
      folioReal: '982314-CDMX',
    },
  };

  describe('escaparXml', () => {
    it('escapa caracteres especiales XML correctamente', () => {
      expect(escaparXml('Valero & "Hermanos" <S.A.> \'C.V.\'')).toBe(
        'Valero &amp; &quot;Hermanos&quot; &lt;S.A.&gt; &apos;C.V.&apos;'
      );
    });

    it('maneja valores nulos o indefinidos', () => {
      expect(escaparXml(null)).toBe('');
      expect(escaparXml(undefined)).toBe('');
    });
  });

  describe('formatearFechaSat', () => {
    it('convierte fechas YYYY-MM-DD a YYYYMMDD', () => {
      expect(formatearFechaSat('2026-08-12')).toBe('20260812');
    });
  });

  describe('generarXmlAvisoIndividual', () => {
    it('construye XML estructurado con todos los campos de sujeto obligado, operación y comparecientes', () => {
      const { nombreArchivo, contenidoXml } = generarXmlAvisoIndividual(mockNotaria, mockOperacion);

      expect(nombreArchivo).toBe('SPPLD_NOTARIA_42_ESC_48102_20260812.xml');
      expect(contenidoXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(contenidoXml).toContain('<rfc>MER750812AB1</rfc>');
      expect(contenidoXml).toContain('<numero_notaria>42</numero_notaria>');
      expect(contenidoXml).toContain('<numero_instrumento>48102</numero_instrumento>');
      expect(contenidoXml).toContain('<monto_operacion>3500000.00</monto_operacion>');
      expect(contenidoXml).toContain('Valero &amp; Hermanos S.A. de C.V.');
      expect(contenidoXml).toContain('GOAM820914HDFLR02');
      expect(contenidoXml).toContain('<folio_real>982314-CDMX</folio_real>');
      expect(contenidoXml).toContain('<forma_pago>03</forma_pago>');
      expect(contenidoXml).toContain('<clave_rastreo>SPEI202608124001</clave_rastreo>');
    });
  });

  describe('generarXmlPaqueteConsolidado', () => {
    it('compila múltiples operaciones dentro de un único archivo XML consolidado', () => {
      const op2: DatosOperacionAvisoXml = {
        ...mockOperacion,
        numeroInstrumento: '48105',
        montoOperacionMxn: 14200000,
      };

      const { nombreArchivo, contenidoXml } = generarXmlPaqueteConsolidado(
        mockNotaria,
        [mockOperacion, op2],
        2026,
        8
      );

      expect(nombreArchivo).toBe('SPPLD_NOTARIA_42_CONSOLIDADO_2026_08.xml');
      expect(contenidoXml).toContain('periodo="202608"');
      expect(contenidoXml).toContain('<numero_instrumento>48102</numero_instrumento>');
      expect(contenidoXml).toContain('<numero_instrumento>48105</numero_instrumento>');
      expect(contenidoXml).toContain('<monto_operacion>14200000.00</monto_operacion>');
    });
  });

  describe('generarXmlInformeCeros', () => {
    it('genera archivo de declaración formal de informe en ceros con fundamento legal', () => {
      const { nombreArchivo, contenidoXml } = generarXmlInformeCeros(mockNotaria, 2026, 9);

      expect(nombreArchivo).toBe('SPPLD_NOTARIA_42_CEROS_2026_09.xml');
      expect(contenidoXml).toContain('<informe_ceros periodo="202609">');
      expect(contenidoXml).toContain('Artículo 17 Fracción XII de la LFPIORPI');
    });
  });
});
