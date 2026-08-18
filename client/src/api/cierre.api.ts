import { EXPEDIENTE_API_URL } from '../config/api';
import { getToken } from '../utils/auth';

/**
 * Circuito de firma de la Ficha de Egreso – Retiro (F13).
 *
 * La firma la ponen dos personas en momentos distintos: el educador que llenó
 * la ficha y el coordinador de la sede, que es quien "firma y sella" (reunión
 * del 11/08/2026). En medio, el coordinador puede observarla y devolverla.
 *
 *   BORRADOR → PEND_COORDINADOR → FIRMADO
 *                     └── OBSERVADO (vuelve al educador)
 */

export type EstadoFicha = 'BORRADOR' | 'PEND_COORDINADOR' | 'FIRMADO' | 'OBSERVADO' | string;

export interface FichaPendienteFirma {
    id: number;
    codigoInforme: string | null;
    casoId: number;
    fechaEgreso: string | null;
    estado: EstadoFicha;
    /** Cuándo la envió el educador; con esto se calculan los días de espera. */
    enviadoEl: string | null;
    nnaId: number;
    nna: string;
    educador: string;
}

const cabeceras = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
});

const pedir = async (url: string, init: RequestInit) => {
    const res = await fetch(url, init);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo completar la operación');
    }
    return res.json();
};

/** El educador firma: la ficha queda esperando al coordinador. */
export const firmarComoEducador = (informeId: number, firma: string) =>
    pedir(`${EXPEDIENTE_API_URL}/cierre/informe/${informeId}/firmar-educador`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify({ firma }),
    });

/** El coordinador firma: cierra el circuito. */
export const firmarComoCoordinador = (informeId: number, firma: string) =>
    pedir(`${EXPEDIENTE_API_URL}/cierre/informe/${informeId}/firmar-coordinador`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify({ firma }),
    });

/** El coordinador devuelve la ficha al educador con una observación. */
export const observarFicha = (informeId: number, observacion: string) =>
    pedir(`${EXPEDIENTE_API_URL}/cierre/informe/${informeId}/observar`, {
        method: 'POST',
        headers: cabeceras(),
        body: JSON.stringify({ observacion }),
    });

/** Bandeja del coordinador: fichas de su sede esperando su firma. */
export const getFichasPendientesFirma = async (): Promise<FichaPendienteFirma[]> => {
    const res = await fetch(`${EXPEDIENTE_API_URL}/cierre/pendientes-firma`, {
        headers: cabeceras(),
    });
    if (!res.ok) throw new Error('No se pudieron cargar las fichas pendientes de firma');
    return res.json();
};
