import type {
  EstadoOrdenPago,
  MetodoPagoDerechos,
  QuienCubrePago,
  SemaforoLineaCaptura,
} from '~/types/ordenesPago'

/**
 * Normaliza una fecha a medianoche (00:00:00.000) en hora local.
 */
function truncarFecha(d: Date): Date {
  const res = new Date(d)
  res.setHours(0, 0, 0, 0)
  return res
}

/**
 * Convierte un string YYYY-MM-DD o ISO a Date en medianoche local.
 */
function parseFechaLocal(fechaStr: string): Date {
  const parts = fechaStr.split('T')[0].split('-')
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const d = parseInt(parts[2], 10)
    return new Date(y, m, d, 0, 0, 0, 0)
  }
  return truncarFecha(new Date(fechaStr))
}

/**
 * Calcula el color del semáforo de vigencia y los días restantes de una línea de captura.
 */
export function calcularSemaforoLineaCaptura(
  estado: EstadoOrdenPago,
  fechaVencimiento?: string | null,
  fechaReferencia: Date = new Date()
): { semaforo: SemaforoLineaCaptura; diasRestantes: number | null; label: string } {
  if (estado === 'pagado') {
    return { semaforo: 'azul', diasRestantes: null, label: 'Pagado' }
  }

  if (estado === 'cancelado') {
    return { semaforo: 'gris', diasRestantes: null, label: 'Cancelado' }
  }

  if (!fechaVencimiento) {
    return { semaforo: 'gris', diasRestantes: null, label: 'Sin vigencia' }
  }

  const vDate = parseFechaLocal(fechaVencimiento)
  const rDate = truncarFecha(fechaReferencia)

  const diffMs = vDate.getTime() - rDate.getTime()
  const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diasRestantes < 0) {
    return {
      semaforo: 'rojo',
      diasRestantes,
      label: `Vencida (${Math.abs(diasRestantes)} d)`,
    }
  }

  if (diasRestantes === 0) {
    return {
      semaforo: 'rojo',
      diasRestantes: 0,
      label: 'Vence hoy',
    }
  }

  if (diasRestantes <= 3) {
    return {
      semaforo: 'amarillo',
      diasRestantes,
      label: `Vence en ${diasRestantes} d`,
    }
  }

  return {
    semaforo: 'verde',
    diasRestantes,
    label: `Vence en ${diasRestantes} d`,
  }
}

/**
 * Formato estándar de moneda MXN ($ 1,234.56).
 */
export function formatearMonedaMXN(monto: number | null | undefined): string {
  const num = typeof monto === 'number' && !isNaN(monto) ? monto : 0
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Mapeo visual de colores para semáforos de líneas de captura.
 */
export function getSemaforoColor(semaforo: SemaforoLineaCaptura): string {
  switch (semaforo) {
    case 'verde':
      return 'success'
    case 'amarillo':
      return 'warning'
    case 'rojo':
      return 'error'
    case 'azul':
      return 'info'
    case 'gris':
    default:
      return 'grey'
  }
}

/**
 * Etiquetas legibles para estados de orden de pago.
 */
export function getEstadoOrdenLabel(estado: EstadoOrdenPago): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'en_tesoreria':
      return 'En Tesorería'
    case 'pagado':
      return 'Pagado'
    case 'cancelado':
      return 'Cancelado'
    default:
      return estado
  }
}

/**
 * Colores Vuetify para estados de orden de pago.
 */
export function getEstadoOrdenColor(estado: EstadoOrdenPago): string {
  switch (estado) {
    case 'pendiente':
      return 'warning'
    case 'en_tesoreria':
      return 'purple'
    case 'pagado':
      return 'success'
    case 'cancelado':
      return 'grey-darken-1'
    default:
      return 'grey'
  }
}

/**
 * Etiquetas para métodos de pago de derechos.
 */
export function getMetodoPagoLabel(metodo?: MetodoPagoDerechos | null): string {
  switch (metodo) {
    case 'transferencia_spei':
      return 'Transferencia SPEI'
    case 'cheque_caja':
      return 'Cheque de Caja'
    case 'tarjeta_credito_debito':
      return 'Tarjeta de Débito/Crédito'
    case 'efectivo_ventanilla':
      return 'Efectivo en Ventanilla'
    case 'cargo_cuenta_notaria':
      return 'Cargo a Cuenta Notaría'
    default:
      return metodo || 'No especificado'
  }
}

/**
 * Etiquetas para procedencia de fondos (quién cubre).
 */
export function getQuienCubreLabel(quien?: QuienCubrePago | null): string {
  switch (quien) {
    case 'adquirente':
      return 'Adquirente / Comprador'
    case 'enajenante':
      return 'Enajenante / Vendedor'
    case 'notaria_fondo_revolvente':
      return 'Notaría (Fondo Revolvente)'
    case 'banco_acreedor':
      return 'Banco / Acreedor'
    case 'otro':
      return 'Otro'
    default:
      return quien || 'No especificado'
  }
}
