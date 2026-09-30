import { describe, it, expect } from 'vitest';
import {
  generarHtmlCedulaAvisoSat,
  generarBlobHtmlCedulaAvisoSat,
  type DatosCedulaAvisoSat,
} from '../../../app/utils/pdfCedulaAvisoSat';

describe('pdfCedulaAvisoSat', () => {
  const mockDatos: DatosCedulaAvisoSat = {
    numeroInstrumento: '48102',
    libro: '189',
    fechaActo: '12 de Agosto de 2026',
    actoJuridico: 'Compraventa de Inmueble',
    montoOperacionMxn: 3500000,
    montoOperacionUma: 32237.26,
    umaVigente: 108.57,
    calificacionAviso: 'Sujeta a Aviso Ordinario SAT',
    fechaLimiteBase: '2026-09-17',
    diasProrrogaRfc: 3,
    fechaLimiteEfectiva: '2026-09-22',
    estatusAviso: 'presentado',
    folioAcuseSat: 'SAT-SPPLD-2026-98124',
    fechaPresentacionSat: '2026-08-20 14:30:00',
    personas: [
      {
        rol: 'Enajenante',
        nombre: 'Valero Desarrollos S.A. de C.V.',
        rfc: 'VDE180412KJ9',
        beneficiarioControlador: 'Lic. Roberto Gómez',
      },
      {
        rol: 'Adquirente',
        nombre: 'Dr. Mauricio Gómez Alcántara',
        rfc: 'GOAM820914P44',
        curp: 'GOAM820914HDFLR02',
      },
    ],
    inmueble: {
      descripcion: 'Casa habitación en condominio',
      ubicacion: 'Av. Reforma 505, Lomas Altas, CDMX',
      folioReal: '982314-CDMX',
    },
    pago: {
      formaPago: 'Transferencia electrónica SPEI',
      institucionBancaria: 'BBVA México -> Santander',
      claveRastreo: 'SPEI202608124001',
      montoEfectivo: 0,
      cumpleTopeEfectivo: true,
    },
  };

  it('generarHtmlCedulaAvisoSat genera documento HTML institucional con todas las secciones', () => {
    const html = generarHtmlCedulaAvisoSat(mockDatos, {
      notarioTitular: 'Lic. Roberto Méndez',
      numeroNotaria: '42',
      entidadFederativa: 'Ciudad de México',
    });

    expect(html).toContain('NOTARÍA PÚBLICA NÚMERO 42');
    expect(html).toContain('Lic. Roberto Méndez');
    expect(html).toContain('CÉDULA DE CUMPLIMIENTO PLD');
    expect(html).toContain('No. 48102');
    expect(html).toContain('Compraventa de Inmueble');
    expect(html).toContain('3,500,000.00 MXN');
    expect(html).toContain('Valero Desarrollos S.A. de C.V.');
    expect(html).toContain('SAT-SPPLD-2026-98124');
    expect(html).toContain('2026-09-22');
  });

  it('generarBlobHtmlCedulaAvisoSat genera un Blob imprimible válido', () => {
    const blob = generarBlobHtmlCedulaAvisoSat(mockDatos, {
      notarioTitular: 'Lic. Roberto Méndez',
      numeroNotaria: '42',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);
  });
});
