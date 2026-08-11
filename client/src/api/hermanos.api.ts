/**
 * Hermanos entre NNA.
 *
 * El informe situacional se hace por familia — "cuando son hermanos, se hace un
 * solo informe de todos los hermanos" — pero cada NNA conserva su expediente y
 * su file. Esto solo resuelve quiénes son hermanos.
 *
 * El sistema sugiere; el educador confirma. Nunca vincula solo.
 */
import { useAuthStore } from '../store/auth.store';
import { NNA_API_URL } from '../config/api';

/** Códigos del catálogo OPCIONES_VINCULO_TUTOR_2026. */
export const PARENTESCO_PADRE_MADRE = '1';
export const PARENTESCO_HERMANO = '4';

export interface HermanoCandidato {
    nnaId: number;
    nombres: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    numeroDoc?: string;
    codigoFicha03?: string;
    /** Por qué se sugiere: se muestra al educador para que decida con criterio. */
    motivo: string;
    origen: 'PARENTESCO' | 'DNI_PADRE' | 'MANUAL';
}

export interface DeteccionHermanos {
    candidatos: HermanoCandidato[];
    /**
     * true cuando se registró un hermano/a que NO existe como NNA. Sin ficha
     * propia no tiene caso, y el informe no podría mencionarlo con sus datos.
     */
    requiereRegistro: boolean;
    nombreHermano: string | null;
}

export interface HermanoVinculado extends Omit<HermanoCandidato, 'motivo'> {
    vinculoId: number;
    fecha: string | null;
}

const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

/** Hermanos ya confirmados de un NNA. */
export const getHermanos = async (nnaId: number): Promise<HermanoVinculado[]> => {
    const res = await fetch(`${NNA_API_URL}/nna/${nnaId}/hermanos`, { headers: headers() });
    if (!res.ok) throw new Error('No se pudieron cargar los hermanos');
    return res.json();
};

/**
 * Busca posibles hermanos a partir del familiar que se acaba de registrar.
 * Se llama al guardar un integrante en la ficha de inscripción o en el
 * diagnóstico social.
 */
export const detectarHermanos = async (
    nnaId: number,
    familiar: { parentesco?: string; nombres?: string; dni?: string }
): Promise<DeteccionHermanos> => {
    const res = await fetch(`${NNA_API_URL}/nna/${nnaId}/hermanos/detectar`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(familiar),
    });
    if (!res.ok) throw new Error('No se pudo verificar si hay hermanos registrados');
    return res.json();
};

/** Confirma (o descarta) que dos NNA son hermanos. */
export const vincularHermano = async (
    nnaId: number,
    hermanoId: number,
    origen: HermanoCandidato['origen'] = 'MANUAL',
    confirmado = true
) => {
    const res = await fetch(`${NNA_API_URL}/nna/${nnaId}/hermanos`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ hermanoId, origen, confirmado }),
    });
    if (!res.ok) throw new Error('No se pudo guardar el vínculo');
    return res.json();
};

export const desvincularHermano = async (nnaId: number, hermanoId: number) => {
    const res = await fetch(`${NNA_API_URL}/nna/${nnaId}/hermanos/${hermanoId}`, {
        method: 'DELETE',
        headers: headers(),
    });
    if (!res.ok) throw new Error('No se pudo quitar el vínculo');
    return res.json();
};
