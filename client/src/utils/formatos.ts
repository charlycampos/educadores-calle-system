/**
 * Helpers de los formatos oficiales impresos (F03, F07, F08, F10, F11).
 *
 * Existen porque cada formato resolvía estas tres cosas por su cuenta y las
 * tres estaban mal en al menos un sitio:
 *
 * - El sexo se comparaba contra 'M' / 'F', pero el catálogo SEC guarda '1' y
 *   '2'. Las columnas H y M del F10 salían siempre vacías.
 * - La edad se calculaba restando años, sin mirar si el NNA ya cumplió: un
 *   niño que cumple en diciembre aparecía con un año de más casi todo el año.
 * - El "Dirigido a" comparaba contra un texto exacto ('Niños y niñas'), pero
 *   los talleres creados desde la ficha del NNA se guardan como 'NNA', así que
 *   nunca se marcaba ninguna casilla.
 */

/** true si el valor representa varón, en cualquiera de las formas que llegan. */
export const esHombre = (sexo: unknown): boolean => {
    const s = String(sexo ?? '').trim().toUpperCase();
    return s === '1' || s === 'M' || s === 'H' || s === 'HOMBRE' || s === 'MASCULINO';
};

/** true si el valor representa mujer. */
export const esMujer = (sexo: unknown): boolean => {
    const s = String(sexo ?? '').trim().toUpperCase();
    return s === '2' || s === 'F' || s === 'MUJER' || s === 'FEMENINO';
};

/**
 * Edad para los formatos oficiales.
 *
 * Manda la **fecha de nacimiento**, no la edad registrada:
 *
 * - En la ficha de inscripción (F03) puede no haber fecha: el primer contacto
 *   es en calle y muchas veces el NNA no tiene documento. Ahí el educador
 *   anota la edad a ojo.
 * - Al llegar al diagnóstico social (F04) ya se tiene el dato concreto, y el
 *   F04 actualiza `NNA.FECHA_NACIMIENTO`.
 *
 * La columna `EDAD` es un valor congelado el día que se registró: un NNA
 * inscrito con 5 años sigue diciendo 5 un año después. La fecha, en cambio,
 * nunca se desactualiza. Por eso se calcula desde ella cuando existe y la edad
 * registrada queda solo como respaldo para los que aún no tienen F04.
 *
 * Devuelve cadena vacía y no un cero cuando no hay ningún dato: en una lista
 * de asistencia una celda vacía se entiende, un "0" confunde.
 */
export const edadDe = (persona: any): string => {
    const iso = persona?.fechaNacimiento || persona?.fechaNacApo;
    if (iso) {
        const nac = new Date(iso);
        if (!Number.isNaN(nac.getTime())) {
            const hoy = new Date();
            let anios = hoy.getFullYear() - nac.getFullYear();
            const yaCumplio =
                hoy.getMonth() > nac.getMonth() ||
                (hoy.getMonth() === nac.getMonth() && hoy.getDate() >= nac.getDate());
            if (!yaCumplio) anios--;
            if (anios > 0) return String(anios);
            // Menor de un año: los meses dicen más que un "0".
            const meses = Math.max(
                0,
                (hoy.getFullYear() - nac.getFullYear()) * 12 + hoy.getMonth() - nac.getMonth()
                    - (hoy.getDate() < nac.getDate() ? 1 : 0)
            );
            return `${meses} m`;
        }
    }

    if (persona?.edad !== undefined && persona?.edad !== null && persona.edad !== '') {
        const unidad = String(persona.unidadEdad ?? 'ANIOS').toUpperCase();
        if (unidad.startsWith('MES')) return `${persona.edad} m`;
        if (unidad.startsWith('DIA')) return `${persona.edad} d`;
        return String(persona.edad);
    }
    return '';
};

/** Grupos que ofrecen los formatos oficiales en la fila "Dirigido a". */
export type GrupoDirigido = 'NN' | 'ADOLESCENTES' | 'FAMILIA' | 'HERMANOS';

const NORMALIZA: Record<string, GrupoDirigido> = {
    'NN': 'NN',
    'NNA': 'NN',
    'NIÑOS Y NIÑAS': 'NN',
    'NINOS Y NINAS': 'NN',
    'ADOLESCENTES': 'ADOLESCENTES',
    'PADRES DE FAMILIA': 'FAMILIA',
    'FAMILIAS': 'FAMILIA',
    'FAMILIA': 'FAMILIA',
    'PADRE, MADRE, ADULTO RESPONSABLE': 'FAMILIA',
    'HERMANOS': 'HERMANOS',
    'HERMANOS(AS)': 'HERMANOS',
};

/**
 * ¿Va marcada esta casilla?
 *
 * El formato oficial permite marcar más de una —un taller puede tener niños y
 * adolescentes—, así que `dirigidoA` se lee como lista separada por comas.
 *
 * Cuando el taller no lo especifica, se deduce de las edades de los
 * participantes: es preferible una lista impresa con la casilla correcta a una
 * que el educador tiene que marcar a mano cada vez.
 */
export const marcaDirigido = (
    dirigidoA: unknown,
    grupo: GrupoDirigido,
    participantes: any[] = []
): boolean => {
    const declarados = String(dirigidoA ?? '')
        .split(',')
        .map(x => NORMALIZA[x.trim().toUpperCase()])
        .filter(Boolean) as GrupoDirigido[];

    if (declarados.length) {
        // 'NNA' es genérico: abarca niños y adolescentes, así que se resuelve
        // por edades en vez de marcar una casilla al azar.
        const soloGenerico = declarados.length === 1 && declarados[0] === 'NN'
            && String(dirigidoA ?? '').trim().toUpperCase() === 'NNA';
        if (!soloGenerico) return declarados.includes(grupo);
    }

    if (grupo !== 'NN' && grupo !== 'ADOLESCENTES') return false;

    // edadDe puede devolver "8 m" o "20 d" para los más pequeños: eso es
    // menos de un año, así que cuenta como niño y no se descarta.
    const edades = participantes
        .map(p => {
            const texto = edadDe(p?.nna || p);
            if (!texto) return NaN;
            if (/[md]$/.test(texto.trim())) return 0;
            return Number(texto);
        })
        .filter(n => Number.isFinite(n));
    if (!edades.length) return false;

    // El corte de 12 años es el que usa el propio diccionario para separar
    // niñas/niños de adolescentes.
    return grupo === 'NN'
        ? edades.some(e => e < 12)
        : edades.some(e => e >= 12);
};
