/**
 * Nombres y plazos de las fases del servicio (RDE 069-2021).
 *
 * Espejo de services/intervencion-service-py/src/domain/fases.py. Está
 * duplicado a propósito: son solo etiquetas para pintar, y hacer una llamada
 * de red para rotular un chip no compensa. Lo que NUNCA se calcula aquí es en
 * qué fase va un caso ni si está vencida — eso viene del backend.
 */

export type Fase = 'I' | 'II' | 'III' | 'EGRESADO';

export const NOMBRE_FASE: Record<string, string> = {
    I:        'Contacto e Integración',
    II:       'Desarrollo e Intervención para la Restitución de Derechos',
    III:      'Seguimiento y Egreso',
    EGRESADO: 'Egresado del servicio',
};

/** Para chips y tablas, donde el nombre oficial no entra. */
export const NOMBRE_CORTO_FASE: Record<string, string> = {
    I:        'Contacto e Integración',
    II:       'Restitución de Derechos',
    III:      'Seguimiento y Egreso',
    EGRESADO: 'Egresado',
};

export const PLAZO_MESES_FASE: Record<string, number> = { I: 3, II: 15, III: 6 };

/** Plazo total del servicio: 3 + 15 + 6. */
export const PLAZO_TOTAL_MESES = 24;

/** 'II' → 'Fase II: Restitución de Derechos' */
export const etiquetaFase = (fase?: string | null): string => {
    if (!fase) return 'Sin fase';
    if (fase === 'EGRESADO') return 'Egresado';
    return `Fase ${fase}: ${NOMBRE_CORTO_FASE[fase] || fase}`;
};

/**
 * Etiqueta tolerante a los datos anteriores a la migración 013.
 *
 * Hasta entonces la columna guardaba 'CONTACTO_INICIAL' hardcodeado en todas
 * las filas, así que el Resumen del Caso llegó a imprimir "Fase
 * CONTACTO_INICIAL" bajo el título FASE ACTUAL. Se traduce a Fase I, que es
 * lo que ese valor significaba.
 */
export const normalizarFase = (fase?: string | null): Fase => {
    if (!fase) return 'I';
    const f = String(fase).toUpperCase();
    if (f === 'I' || f === 'II' || f === 'III' || f === 'EGRESADO') return f as Fase;
    return 'I';
};
