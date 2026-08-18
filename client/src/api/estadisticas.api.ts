import { useAuthStore } from '../store/auth.store';
import { AUTH_API_URL as API_URL } from '../config/api';

/**
 * Resumen de cantidades por periodo.
 *
 * El alcance lo decide el backend según el rol: el educador ve lo suyo, el
 * coordinador su sede, el nacional todo. Desde el cliente no se manda nada
 * que pueda ampliar lo que a cada uno le toca ver.
 */

const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

export interface ResumenPeriodoData {
    anio: number;
    mes: number | null;
    /** Lo que ocurrió DENTRO del periodo. Cambia con el filtro. */
    flujo: {
        atendidos: number;
        atendidosPrev: number;
        ingresos: number;
        talleres: number;
        talleresPrev: number;
        participaciones: number;
        visitas: number;
        fasesCerradas: number;
        egresos: number;
    };
    /** La foto de HOY. No responde al filtro de periodo. */
    stock: {
        activos: number;
        fase1: number;
        fase2: number;
        fase3: number;
    };
}

export const getResumenPeriodo = async (
    anio: number,
    mes?: number,
): Promise<ResumenPeriodoData> => {
    const params = new URLSearchParams({ anio: String(anio) });
    if (mes) params.set('mes', String(mes));
    const res = await fetch(`${API_URL}/statistics/resumen-periodo?${params}`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('No se pudo obtener el resumen del periodo');
    return res.json();
};
