/**
 * Instituciones a las que se deriva un informe situacional.
 *
 * Todo informe se deriva — no hay caso sin derivación. En la reunión del
 * 11/08/2026 quedó claro:
 *
 *   Charly:  "¿Todos los informes son derivados igual?"
 *   Luis:    "Todos hacen y todos por tema administrativo deberían llegar todos.
 *             No hay nadie que no tenga informe... si no, no se tomaría el caso."
 *   M. del C.: "Todos, todos, todos."
 *
 * Por eso los combos son obligatorios y no hay un "¿requiere derivar?".
 *
 * ORIGEN DE LOS DATOS
 *
 *   UPE    — 26 sedes. "UBICACION CON FOTOS DE LAS UPE Y COORDENADAS UTM",
 *            22/05/2026. Con la dirección de cada una, para el oficio.
 *   DEMUNA — 844 acreditadas, en `demunas.ts`. Registro DGNNA.
 *
 * PROVISIONAL: estos listados van a jalarse por API desde otro sistema. Hasta
 * entonces viven acá. Por eso el acceso pasa siempre por las funciones de este
 * módulo y nadie importa los arreglos directamente: cuando llegue la API, se
 * cambia el interior de estas funciones y las pantallas no se enteran.
 */

import { DEMUNAS } from './demunas';

export type TipoInstitucion = 'DEMUNA' | 'UPE';

export interface InstitucionDerivacion {
    codigo: string;
    nombre: string;
    tipo: TipoInstitucion;
    /** Región, distrito o jurisdicción que le corresponde. */
    jurisdiccion?: string;
    /** Dirección de la sede. Va en el oficio de derivación. */
    direccion?: string;
    /**
     * Solo DEMUNAs: si cuenta con acreditación vigente.
     *
     * Se muestra en el combo para que el educador sepa en qué condición está
     * la que elige. Los casos de riesgo de desprotección van a las
     * acreditadas, pero la no acreditada sigue siendo la que corresponde por
     * zona, así que se ofrece igual y se avisa.
     */
    acreditada?: boolean;
}

export const TIPOS_INSTITUCION: { valor: TipoInstitucion; etiqueta: string; descripcion: string }[] = [
    {
        valor: 'DEMUNA',
        etiqueta: 'DEMUNA',
        descripcion: 'Defensoría Municipal del Niño y del Adolescente',
    },
    {
        valor: 'UPE',
        etiqueta: 'UPE',
        descripcion: 'Unidad de Protección Especial',
    },
];

/** Las UPEs se declaran aquí; las 844 DEMUNAs viven en su propio archivo. */
export const UPES: InstitucionDerivacion[] = [
    // ── UPEs — listado oficial (22/05/2026) ─────────────────────────────────
    // Las cuatro de Lima y Callao van primero: son las de mayor uso para el
    // servicio, y el resto sigue por región en orden alfabético.
    { codigo: 'UPE-LIMA',  nombre: 'UPE Lima',              tipo: 'UPE', jurisdiccion: 'Lima Cercado',      direccion: 'Jr. Camaná N° 564-570 — Lima' },
    { codigo: 'UPE-LIM-E', nombre: 'UPE Lima Este',         tipo: 'UPE', jurisdiccion: 'Lima Este',         direccion: 'Av. La Mar N° 375-377 — Ate' },
    { codigo: 'UPE-LIM-N', nombre: 'UPE Lima Norte-Callao', tipo: 'UPE', jurisdiccion: 'Lima Norte y Callao', direccion: 'Av. Elmer Faucett 3970 — Callao' },
    { codigo: 'UPE-LIM-S', nombre: 'UPE Lima Sur',          tipo: 'UPE', jurisdiccion: 'Lima Sur',          direccion: 'Av. Víctor Castro Iglesias 1133 — San Juan de Miraflores' },

    { codigo: 'UPE-AMA', nombre: 'UPE Amazonas',      tipo: 'UPE', jurisdiccion: 'Amazonas',      direccion: 'Jr. Chincha Alta N° 569 — Chachapoyas' },
    { codigo: 'UPE-ANC', nombre: 'UPE Áncash',        tipo: 'UPE', jurisdiccion: 'Áncash',        direccion: 'Av. Confraternidad Internacional Oeste N° 169 — Huaraz' },
    { codigo: 'UPE-APU', nombre: 'UPE Apurímac',      tipo: 'UPE', jurisdiccion: 'Apurímac',      direccion: 'Jr. Junín 541 — Abancay' },
    { codigo: 'UPE-ARE', nombre: 'UPE Arequipa',      tipo: 'UPE', jurisdiccion: 'Arequipa',      direccion: 'Av. Jorge Chávez 808 — Arequipa' },
    { codigo: 'UPE-AYA', nombre: 'UPE Ayacucho',      tipo: 'UPE', jurisdiccion: 'Ayacucho',      direccion: 'Jr. Salazar Bondy N° 202 con calle Juan C. Scarsi — Huamanga' },
    { codigo: 'UPE-CAJ', nombre: 'UPE Cajamarca',     tipo: 'UPE', jurisdiccion: 'Cajamarca',     direccion: 'Jr. Los Cerezos 127, Urb. El Ingenio — Cajamarca' },
    { codigo: 'UPE-CUS', nombre: 'UPE Cusco',         tipo: 'UPE', jurisdiccion: 'Cusco',         direccion: 'Av. Garcilazo 703-D — Wanchaq, Cusco' },
    { codigo: 'UPE-HVC', nombre: 'UPE Huancavelica',  tipo: 'UPE', jurisdiccion: 'Huancavelica',  direccion: 'Jr. Pablo B. Solís, C.P. San Cristóbal, Mz. Q Lt. 17 — Huancavelica' },
    { codigo: 'UPE-HUC', nombre: 'UPE Huánuco',       tipo: 'UPE', jurisdiccion: 'Huánuco',       direccion: 'Calle Manco Inca N° 208, Urb. Paucarbamba — Huánuco' },
    { codigo: 'UPE-ICA', nombre: 'UPE Ica',           tipo: 'UPE', jurisdiccion: 'Ica',           direccion: 'Calle Los Alhelíes 152, Urb. San Isidro Mz. F3 Lt. 13 — Ica' },
    { codigo: 'UPE-JUN', nombre: 'UPE Junín',         tipo: 'UPE', jurisdiccion: 'Junín',         direccion: 'Jr. Nemesio Ráez N° 1782 y 1784 — Huancayo' },
    { codigo: 'UPE-LAL', nombre: 'UPE La Libertad',   tipo: 'UPE', jurisdiccion: 'La Libertad',   direccion: 'Calle Paraguay N° 309-313, Urb. El Recreo — Trujillo' },
    { codigo: 'UPE-LAM', nombre: 'UPE Lambayeque',    tipo: 'UPE', jurisdiccion: 'Lambayeque',    direccion: 'Calle Las Diamelas N° 487, Urb. Arturo Cabrejos Falla — Chiclayo' },
    { codigo: 'UPE-LOR', nombre: 'UPE Loreto',        tipo: 'UPE', jurisdiccion: 'Loreto',        direccion: 'Jr. 2 de Mayo 549 — Iquitos, Maynas' },
    { codigo: 'UPE-MDD', nombre: 'UPE Madre de Dios', tipo: 'UPE', jurisdiccion: 'Madre de Dios', direccion: 'Calle Pardo de Miguel, AA.HH. José Aldamiz, Mz. 10C Lt. 01 — Tambopata' },
    { codigo: 'UPE-MOQ', nombre: 'UPE Moquegua',      tipo: 'UPE', jurisdiccion: 'Moquegua',      direccion: 'Calle Hipólito Palao, C.P. Chen Chen Mz. R Lt. 17 — Moquegua' },
    { codigo: 'UPE-PIU', nombre: 'UPE Piura',         tipo: 'UPE', jurisdiccion: 'Piura',         direccion: 'Av. Los Cocos N° 376, Urb. Club Grau — Piura' },
    { codigo: 'UPE-PUN', nombre: 'UPE Puno',          tipo: 'UPE', jurisdiccion: 'Puno',          direccion: 'Jr. Bolognesi N° 190 esq. Jr. Zela N° 277 — Puno' },
    { codigo: 'UPE-SAM', nombre: 'UPE San Martín',    tipo: 'UPE', jurisdiccion: 'San Martín',    direccion: 'Jr. Túpac Amaru N° 311, Barrio Nueve de Abril — Tarapoto' },
    { codigo: 'UPE-TAC', nombre: 'UPE Tacna',         tipo: 'UPE', jurisdiccion: 'Tacna',         direccion: 'Urb. Santa Elena Mz. A Lt. 4 — Tacna' },
    { codigo: 'UPE-TUM', nombre: 'UPE Tumbes',        tipo: 'UPE', jurisdiccion: 'Tumbes',        direccion: 'Urb. Andrés Araujo Mz. 3 Lt. 05 (frente al parque El Avión) — Tumbes' },
    { codigo: 'UPE-UCA', nombre: 'UPE Ucayali',       tipo: 'UPE', jurisdiccion: 'Ucayali',       direccion: 'Jr. Óscar Zevallos N° 173 — Callería, Coronel Portillo' },
];

export const INSTITUCIONES: InstitucionDerivacion[] = [...UPES, ...DEMUNAS];

/**
 * Instituciones de un tipo.
 *
 * Las UPEs se ordenan como están declaradas —Lima primero, que es lo más
 * usado—. Las DEMUNAs vienen ya ordenadas por departamento, provincia y
 * distrito desde el registro; reordenarlas por nombre las mezclaría entre
 * regiones y haría imposible encontrar una recorriendo la lista.
 */
export const institucionesPorTipo = (tipo?: TipoInstitucion | ''): InstitucionDerivacion[] => {
    if (tipo === 'UPE') return UPES;
    if (tipo === 'DEMUNA') return DEMUNAS;
    return [];
};

/**
 * Filtra por texto sobre nombre y jurisdicción.
 *
 * Con 844 DEMUNAs, un combo sin búsqueda es inservible: el educador conoce su
 * distrito, no la posición en la lista.
 */
export const buscarInstituciones = (
    tipo: TipoInstitucion | '',
    texto: string,
): InstitucionDerivacion[] => {
    const lista = institucionesPorTipo(tipo);
    const q = normalizar(texto.trim());
    if (!q) return lista;
    // Sin tildes: quien escribe "ancash" o "huanuco" debe encontrarlas igual.
    return lista.filter(i =>
        normalizar(i.nombre).includes(q) ||
        normalizar(i.jurisdiccion || '').includes(q)
    );
};

export const nombreInstitucion = (codigo?: string | null): string =>
    INSTITUCIONES.find(i => i.codigo === codigo)?.nombre || '';

/**
 * Etiqueta principal de la institución en el combo.
 *
 * Las DEMUNAs se muestran con su nombre oficial tal cual —muchas tienen
 * nombre propio y varias son provinciales, no distritales—; su ubicación va
 * aparte, como detalle. Las UPEs llevan la región solo cuando el nombre no la
 * dice ya: "UPE Loreto · Loreto" repetía la misma palabra dos veces.
 */
export const etiquetaInstitucion = (i: InstitucionDerivacion): string => {
    if (i.tipo === 'DEMUNA' || !i.jurisdiccion) return i.nombre;

    const nombreNorm = normalizar(i.nombre);
    const extra = i.jurisdiccion
        .split('·')
        .map(p => p.trim())
        .filter(p => p && !nombreNorm.includes(normalizar(p)));

    return extra.length ? `${i.nombre} · ${extra.join(' · ')}` : i.nombre;
};

/** Sin tildes y en minúsculas, para comparar "Áncash" con "ancash". */
const normalizar = (s: string): string =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const buscarInstitucion = (codigo?: string | null): InstitucionDerivacion | undefined =>
    INSTITUCIONES.find(i => i.codigo === codigo);

/**
 * Segunda línea del combo: la ubicación.
 *
 * El estado de acreditación va aparte, en `insigniaInstitucion`, para poder
 * pintarlo de color.
 */
export const detalleInstitucion = (i: InstitucionDerivacion): string =>
    i.tipo === 'DEMUNA'
        ? (i.jurisdiccion || '')
        : (i.direccion || i.jurisdiccion || '');

/**
 * Estado de acreditación con color, después del ubigeo.
 *
 * Verde y rojo porque es una condición binaria que cambia a dónde puede
 * derivarse un caso de riesgo, y conviene verla sin leer.
 */
export const insigniaInstitucion = (
    i: InstitucionDerivacion,
): { texto: string; tono: 'success' | 'danger' } | undefined => {
    if (i.tipo !== 'DEMUNA' || i.acreditada === undefined) return undefined;
    return i.acreditada
        ? { texto: 'Acreditada', tono: 'success' }
        : { texto: 'No acreditada', tono: 'danger' };
};

/**
 * Frase de derivación para el texto del informe.
 *
 * Responde al problema que planteó María del Carmen: "En la última parte ahí
 * dice: se deriva a la DEMUNA tal. Si no lo colocamos, urgente nos llaman, nos
 * dicen: ¿a qué DEMUNA?". Con el combo, la frase se arma sola y no se olvida.
 */
export const fraseDerivacion = (codigo?: string | null): string => {
    const i = buscarInstitucion(codigo);
    if (!i) return '';
    // Aquí sí se antepone el tipo: en el combo sobra —ya se eligió DEMUNA o
    // UPE— pero en el texto del informe el nombre solo no se entiende. Los
    // nombres del registro vienen como "del Distrito de Islay" o
    // «"Uchi Jee" del Distrito de Imaza», que sin el tipo delante no dicen qué
    // institución es.
    const nombre = i.tipo === 'DEMUNA'
        ? `Defensoría Municipal de la Niña, Niño y Adolescente ${i.nombre}`
        : i.nombre;
    return `Se deriva el presente caso a la ${nombre}.`;
};
