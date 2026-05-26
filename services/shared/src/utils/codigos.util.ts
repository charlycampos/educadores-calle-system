/**
 * Generador de códigos únicos del sistema SEC.
 * Formato: TIPO-AAAA-NNNN (ej: CAS-2026-0001, F03-2026-0042)
 *
 * La generación del número correlativo se delega al repositorio
 * que consulta el último código en Oracle. Este util solo
 * formatea el resultado.
 */

export type TipoCodigo =
  | 'CAS'   // Caso
  | 'F03'   // Ficha de Inscripción
  | 'F04'   // Diagnóstico Social
  | 'F06'   // Ficha de Derivación
  | 'F07'   // Plan de Taller
  | 'F08'   // Evaluación de Taller
  | 'F12'   // Seguimiento Familiar
  | 'F13'   // Egreso
  | 'PII'   // Plan de Intervención Individual
  | 'INF'   // Informe de Cierre
  | 'TRAS'; // Traslado

/**
 * Formatea un código con el correlativo dado.
 * @param tipo  Prefijo del código
 * @param correlativo Número obtenido del repositorio
 * @param anio  Año (por defecto el actual)
 */
export const formatearCodigo = (
  tipo: TipoCodigo,
  correlativo: number,
  anio: number = new Date().getFullYear(),
): string => {
  const num = correlativo.toString().padStart(4, '0');
  return `${tipo}-${anio}-${num}`;
};

/**
 * Extrae el número correlativo de un código existente.
 * 'CAS-2026-0042' → 42
 */
export const extraerCorrelativo = (codigo: string): number => {
  const partes = codigo.split('-');
  if (partes.length !== 3) return 0;
  return parseInt(partes[2], 10) || 0;
};
