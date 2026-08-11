/**
 * Traducción del vínculo familiar con el NNA.
 *
 * La columna NNA_FAMILIAR.PARENTESCO guarda el CÓDIGO del catálogo
 * OPCIONES_VINCULO_TUTOR_2026 (ver mapeo_combos_sec_2026.md), no el texto.
 * Sin esta traducción el Formato 11 imprimiría "1" en la columna Parentesco.
 *
 * Los registros antiguos pueden traer el texto directo ("Madre", "Padre"),
 * por eso si el valor no es un código conocido se devuelve tal cual.
 */

const VINCULO_TUTOR: Record<string, string> = {
    '1': 'Padre/Madre',
    '2': 'Tío/a',
    '3': 'Abuelo/a',
    '4': 'Hermano/a',
    '5': 'Otro familiar',
    '6': 'Otro no familiar',
};

/** Etiqueta corta, pensada para la impresión del F11. */
export const etiquetaParentesco = (valor?: string | null): string => {
    if (valor === null || valor === undefined) return '';
    const clave = String(valor).trim();
    if (!clave) return '';
    return VINCULO_TUTOR[clave] ?? clave;
};
