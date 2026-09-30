<template>
  <v-card variant="outlined" class="rounded-lg mb-4 bg-surface border">
    <v-card-item class="py-3 px-4 border-b bg-grey-lighten-5">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-file-document-outline</v-icon>
          <span class="text-subtitle-2 font-weight-bold text-primary">
            Cédula de Datos del Aviso (Estructura SPPLD / SAT)
          </span>
        </div>
        <v-chip size="small" variant="tonal" color="primary" class="font-weight-medium">
          Esquema Fedatarios Públicos v2.4
        </v-chip>
      </div>
    </v-card-item>

    <v-card-text class="pa-4">
      <!-- Sección A: Fedatario y Notaría -->
      <div class="mb-4">
        <div class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2 d-flex align-center">
          <v-icon size="16" class="mr-1 text-secondary">mdi-office-building-outline</v-icon>
          A. Sujeto Obligado y Fedatario Público
        </div>
        <v-row dense class="bg-grey-lighten-5 rounded pa-2 border">
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Notaría Pública:</div>
            <div class="text-body-2 font-weight-bold">Notaría No. {{ notaria.numeroNotaria }} ({{ notaria.entidadFederativa || 'CDMX' }})</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Titular Responsable:</div>
            <div class="text-body-2 font-weight-medium">{{ notaria.nombreNotario }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">RFC / Clave SAT:</div>
            <div class="text-body-2 font-mono text-primary font-weight-bold">{{ notaria.rfcNotario }} · {{ notaria.claveSujetoObligado }}</div>
          </v-col>
        </v-row>
      </div>

      <!-- Sección B: Comparecientes y Sujetos del Aviso -->
      <div class="mb-4">
        <div class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2 d-flex align-center">
          <v-icon size="16" class="mr-1 text-secondary">mdi-account-group-outline</v-icon>
          B. Sujetos del Aviso y Comparecientes
        </div>
        <v-table density="compact" class="border rounded text-body-2">
          <thead>
            <tr class="bg-grey-lighten-5">
              <th class="text-left font-weight-bold" style="width: 130px;">Rol</th>
              <th class="text-left font-weight-bold">Nombre / Razón Social</th>
              <th class="text-left font-weight-bold" style="width: 140px;">RFC</th>
              <th class="text-left font-weight-bold" style="width: 160px;">CURP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in personas" :key="idx">
              <td>
                <v-chip size="x-small" :color="p.rol === '1' || p.rol === 'Enajenante' ? 'amber-darken-3' : 'primary'" variant="tonal" class="font-weight-medium">
                  {{ p.rol === '1' || p.rol === 'Enajenante' ? 'Enajenante' : (p.rol === '2' || p.rol === 'Adquirente' ? 'Adquirente' : p.rol) }}
                </v-chip>
              </td>
              <td>
                <div class="font-weight-medium">{{ p.nombre }}</div>
                <div v-if="p.beneficiarioControlador" class="text-caption text-amber-darken-4">
                  <v-icon size="12">mdi-shield-account-outline</v-icon> Beneficiario Controlador: {{ p.beneficiarioControlador }}
                </div>
              </td>
              <td class="font-mono text-caption">{{ p.rfc || 'NO REGISTRADO' }}</td>
              <td class="font-mono text-caption">{{ p.curp || 'N/A' }}</td>
            </tr>
            <tr v-if="!personas || personas.length === 0">
              <td colspan="4" class="text-center py-2 text-caption text-grey">Sin comparecientes registrados</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <!-- Sección C: Objeto o Inmueble -->
      <div v-if="inmueble" class="mb-4">
        <div class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2 d-flex align-center">
          <v-icon size="16" class="mr-1 text-secondary">mdi-home-city-outline</v-icon>
          C. Identificación del Inmueble u Objeto
        </div>
        <v-row dense class="bg-grey-lighten-5 rounded pa-2 border">
          <v-col cols="12" sm="8">
            <div class="text-caption text-grey-darken-1">Descripción y Ubicación:</div>
            <div class="text-body-2 font-weight-medium">{{ inmueble.descripcion }} — {{ inmueble.ubicacion }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Folio Real / RPP:</div>
            <div class="text-body-2 font-mono font-weight-bold">{{ inmueble.folioReal || 'En trámite' }}</div>
          </v-col>
        </v-row>
      </div>

      <!-- Sección D: Liquidación y Control de Efectivo -->
      <div>
        <div class="text-caption font-weight-bold text-uppercase text-grey-darken-1 mb-2 d-flex align-center">
          <v-icon size="16" class="mr-1 text-secondary">mdi-cash-register</v-icon>
          D. Forma de Liquidación y Cumplimiento de Efectivo (Art. 32 LFPIORPI)
        </div>
        <v-row dense class="bg-grey-lighten-5 rounded pa-2 border">
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Medio de Pago Principal:</div>
            <div class="text-body-2 font-weight-medium">{{ pago.formaPago }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Institución / SPEI:</div>
            <div class="text-body-2 font-mono text-caption">{{ pago.claveRastreo || pago.institucionBancaria || 'Acreditado documentalmente' }}</div>
          </v-col>
          <v-col cols="12" sm="4">
            <div class="text-caption text-grey-darken-1">Control de Efectivo:</div>
            <div class="d-flex align-center mt-1">
              <v-icon size="16" color="success" class="mr-1">mdi-check-circle</v-icon>
              <span class="text-caption font-weight-bold text-success">
                Cumple tope legal (Art. 32)
              </span>
            </div>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface PersonaAviso {
  rol: string;
  nombre: string;
  rfc?: string;
  curp?: string;
  beneficiarioControlador?: string;
}

interface InmuebleAviso {
  descripcion: string;
  ubicacion: string;
  folioReal?: string;
}

interface PagoAviso {
  formaPago: string;
  institucionBancaria?: string;
  claveRastreo?: string;
  montoEfectivo?: number;
  cumpleTopeEfectivo?: boolean;
}

const props = withDefaults(
  defineProps<{
    notaria?: {
      numeroNotaria?: string | number;
      nombreNotario?: string;
      rfcNotario?: string;
      claveSujetoObligado?: string;
      entidadFederativa?: string;
    };
    personas?: PersonaAviso[];
    inmueble?: InmuebleAviso | null;
    pago?: PagoAviso;
  }>(),
  {
    notaria: () => ({
      numeroNotaria: '42',
      nombreNotario: 'Lic. Roberto Méndez',
      rfcNotario: 'MER750812AB1',
      claveSujetoObligado: 'FED-09-0042',
      entidadFederativa: 'CDMX',
    }),
    personas: () => [],
    inmueble: null,
    pago: () => ({
      formaPago: 'Transferencia electrónica SPEI',
      institucionBancaria: 'BBVA México',
      claveRastreo: 'SPEI202608124001',
      montoEfectivo: 0,
      cumpleTopeEfectivo: true,
    }),
  }
);
</script>
