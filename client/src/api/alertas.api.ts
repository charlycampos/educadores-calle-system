import { useAuthStore } from '../store/auth.store';
import { AUTH_API_URL as API_URL } from '../config/api';

/**
 * Alertas del tablero: de un número a la lista de casos que hay detrás.
 *
 * Las tarjetas del tablero dicen "Sin Diagnóstico: 5" y antes enlazaban al
 * listado completo. El educador veía el número y quedaba en medio de sus 90
 * casos sin saber cuáles eran los cinco. Con esto se filtra la lista.
 */

export type TipoAlerta = 'sin-f04' | 'estancado';

/** Texto del chip que se muestra sobre la lista mientras el filtro está activo. */
export const ETIQUETA_ALERTA: Record<string, string> = {
    'sin-f04':   'Sin Diagnóstico Social (F04)',
    'estancado': 'Evaluación retrasada (más de 30 días)',
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

export const getCasosAlerta = async (tipo: TipoAlerta): Promise<number[]> => {
    const res = await fetch(`${API_URL}/statistics/casos-alerta?tipo=${tipo}`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('No se pudieron obtener los casos de la alerta');
    const data = await res.json();
    return data.nnaIds || [];
};
