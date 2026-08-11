/**
 * Traducción de los códigos del SEC 2026 a texto legible.
 *
 * Estos mapas vivían dentro de `ResumenCaso.tsx`. Se sacaron acá porque el
 * Informe Situacional necesita imprimir lo mismo ("2do. Año de secundaria" y no
 * el código "9"), y dos copias del mismo catálogo se desincronizan sola.
 *
 * Cada mapa acepta las dos formas en que llega el dato: el código suelto ('3')
 * y la etiqueta completa que guardan algunas fichas antiguas ('3: Primaria
 * Incompleta'). Por eso las claves están repetidas.
 *
 * Fuente: Diccionario_de_datos_SEC_2026.md
 */

export const TIPO_DOC_MAP: Record<string, string> = {
    '1': 'DNI',
    '2': 'SIN_DOC',
    '3': 'PARTIDA_NACIMIENTO',
    '4': 'CE',
    'DNI': 'DNI',
    'SIN_DOC': 'Sin Documento',
    'PARTIDA_NACIMIENTO': 'Partida de Nacimiento',
    'CE': 'Carné de Extranjería',
};

export const SEXO_MAP: Record<string, string> = {
    '1': 'Hombre',
    '2': 'Mujer',
    'HOMBRE': 'Hombre',
    'MUJER': 'Mujer',
};

export const TIPO_DISCAPACIDAD_MAP: Record<string, string> = {
    '1': 'Motriz o física',
    '2': 'Sensorial',
    '3': 'Cognitivo-intelectual',
    '4': 'Psicosocial o psíquica',
    '5': 'Otros (especificar)',
    '1: Motriz o física': 'Motriz o física',
    '2: Sensorial': 'Sensorial',
    '3: Cognitivo-intelectual': 'Cognitivo-intelectual',
    '4: Psicosocial o psíquica': 'Psicosocial o psíquica',
    '5: Otros (especificar)': 'Otros (especificar)',
};

export const MODALIDAD_ESTUDIO_MAP: Record<string, string> = {
    '1': 'Básica / Regular (EBR)',
    '2': 'Alternativa (EBA)',
    '3': 'Especial (EBE)',
    '4': 'Superior Técnica',
    '5': 'Superior Universitaria',
    '6': 'CETPRO',
    '1: Básica / regular': 'Básica / Regular (EBR)',
    '2: Alternativa (EBA)': 'Alternativa (EBA)',
    '3: Especial': 'Especial (EBE)',
    '4: Superior Técnica': 'Superior Técnica',
    '5: Superior Universitaria': 'Superior Universitaria',
    '6: CETPRO': 'CETPRO',
    'EBR': 'Básica / Regular (EBR)',
    'EBA': 'Alternativa (EBA)',
    'EBE': 'Especial (EBE)',
};

export const GRADO_ESTUDIO_MAP: Record<string, string> = {
    '1': 'Inicial',
    '2': '1ro primaria',
    '3': '2do primaria',
    '4': '3ro primaria',
    '5': '4to primaria',
    '6': '5to primaria',
    '7': '6to primaria',
    '8': '1ro secundaria',
    '9': '2do secundaria',
    '10': '3ro secundaria',
    '11': '4to secundaria',
    '12': '5to secundaria',
    '13': 'Ciclo I (EBA)',
    '14': 'Ciclo II (EBA)',
    '15': 'Ciclo III (EBA)',
    '16': 'Ciclo IV (EBA)',
    '17': 'Ciclo V (EBA)',
    '18': 'Ciclo VI (EBA)',
    '19': 'Ciclo VII (EBA)',
    '20': 'Ciclo VIII (EBA)',
    '21': 'Ciclo IX (EBA)',
    '22': 'Ciclo X (EBA)',
    '99': 'No aplica / No sabe',
    '1: Inicial': 'Inicial',
    '2: 1ro prim': '1ro primaria',
    '3: 2do prim': '2do primaria',
    '4: 3ro prim': '3ro primaria',
    '5: 4to prim': '4to primaria',
    '6: 5to prim': '5to primaria',
    '7: 6to prim': '6to primaria',
    '8: 1ro sec': '1ro secundaria',
    '9: 2do sec': '2do secundaria',
    '10: 3ro sec': '3ro secundaria',
    '11: 4to sec': '4to secundaria',
    '12: 5to sec': '5to secundaria',
    '13: Ciclo I': 'Ciclo I (EBA)',
    '14: Ciclo II': 'Ciclo II (EBA)',
    '15: Ciclo III': 'Ciclo III (EBA)',
    '16: Ciclo IV': 'Ciclo IV (EBA)',
    '17: Ciclo V': 'Ciclo V (EBA)',
    '18: Ciclo VI': 'Ciclo VI (EBA)',
    '19: Ciclo VII': 'Ciclo VII (EBA)',
    '20: Ciclo VIII': 'Ciclo VIII (EBA)',
    '21: Ciclo IX': 'Ciclo IX (EBA)',
    '22: Ciclo X': 'Ciclo X (EBA)',
    '99: No aplica / No sabe': 'No aplica / No sabe',
};

/**
 * Ítem 65 del diccionario (`NIV_EDU`).
 *
 * Los códigos 3 a 8 estaban invertidos respecto al catálogo oficial: el 3 se
 * mostraba como "Primaria Completa" cuando el diccionario dice que 3 es
 * *Incompleta*, y así hasta el 8. Además faltaban el 9, 10 y 11, que salían en
 * pantalla como el número pelado. Corregido contra el diccionario.
 */
export const NIVEL_EDUCATIVO_MAP: Record<string, string> = {
    '1': 'Sin nivel',
    '2': 'Inicial',
    '3': 'Primaria Incompleta',
    '4': 'Primaria Completa',
    '5': 'Secundaria Incompleta',
    '6': 'Secundaria Completa',
    '7': 'Superior No Univ. Incompleta',
    '8': 'Superior No Univ. Completa',
    '9': 'Superior Univ. Incompleto',
    '10': 'Superior Univ. Completo',
    '11': 'Básica Especial',
    '1: Sin nivel': 'Sin nivel',
    '2: Inicial': 'Inicial',
    '3: Primaria Incompleta': 'Primaria Incompleta',
    '4: Primaria Completa': 'Primaria Completa',
    '5: Secundaria Incompleta': 'Secundaria Incompleta',
    '6: Secundaria Completa': 'Secundaria Completa',
    '7: Superior No Universitaria Incompleta': 'Superior No Univ. Incompleta',
    '8: Superior No Universitaria Completa': 'Superior No Univ. Completa',
    '9: Superior Universitario Incompleto': 'Superior Univ. Incompleto',
    '10: Superior Universitario Completo': 'Superior Univ. Completo',
    '11: Básica Especial': 'Básica Especial',
};

/**
 * "Grado de instrucción" tal como lo escribe el educador en el informe:
 * "2do. Año de secundaria", "3er. grado de primaria", "Inicial 5 años".
 *
 * Se arma con el grado cuando existe —es el dato más preciso— y se cae al
 * nivel educativo cuando no. Si no hay ninguno de los dos, devuelve cadena
 * vacía para que el formulario muestre el campo en blanco y no un "---" que
 * después habría que borrar a mano en el Word.
 */
export const gradoInstruccion = (nna: any): string => {
    const grado = GRADO_ESTUDIO_MAP[String(nna?.gradoEstudio ?? '')] ?? '';
    if (grado && grado !== 'No aplica / No sabe') return grado;
    return NIVEL_EDUCATIVO_MAP[String(nna?.nivelEducativo ?? '')] ?? '';
};

/** "Lima - Ate", como en el modelo de informe. Omite lo que falte. */
export const lugarNacimiento = (nna: any): string =>
    [nna?.departamentoNac, nna?.distritoNac].filter(Boolean).join(' - ');
