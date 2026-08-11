import { useAuthStore } from '../store/auth.store';
import { INTERVENCION_API_URL as API_URL } from '../config/api';

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${useAuthStore.getState().token}`,
});

export interface ProcesoLogrosPayload {
    nnaId: number;
    casoId?: number | null;
    perfilUsuario?: string | null;
    fechaIngreso?: string | null;
    educadorResponsable?: string | null;
    f1Fecha?: string | null;   // heredado: se mantiene igual al término
    f1Inicio?: string | null;
    f1Fin?: string | null;
    f1I1?: string | null; f1I2?: string | null; f1I3?: string | null;
    f1I4?: string | null; f1I5?: string | null;
    f1Obs?: string | null;
    f2Fecha?: string | null;   // heredado: se mantiene igual al término
    f2Inicio?: string | null;
    f2Fin?: string | null;
    f2I1?: string | null; f2I2?: string | null; f2I3?: string | null;
    f2I4?: string | null; f2I5?: string | null; f2I6?: string | null;
    f2I7?: string | null; f2I8?: string | null; f2I9?: string | null;
    f2I10?: string | null;
    f2Obs?: string | null;
    f3Fecha?: string | null;   // heredado: se mantiene igual al término
    f3Inicio?: string | null;
    f3Fin?: string | null;
    f3I1?: string | null; f3I2?: string | null; f3I3?: string | null;
    f3I4?: string | null; f3I5?: string | null;
    f3Obs?: string | null;
}

export const createLogros = async (nnaId: number, data: ProcesoLogrosPayload) => {
    const res = await fetch(`${API_URL}/proceso-logros/nna/${nnaId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al crear F05');
    }
    return res.json();
};

export const getLogrosByNna = async (nnaId: number): Promise<any[]> => {
    const res = await fetch(`${API_URL}/proceso-logros/nna/${nnaId}`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener F05');
    return res.json();
};

export const getLogrosById = async (id: number) => {
    const res = await fetch(`${API_URL}/proceso-logros/${id}`, {
        headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener F05');
    return res.json();
};

export const finalizarF05 = async (logrosId: number) => {
    const res = await fetch(`${API_URL}/proceso-logros/${logrosId}/finalizar`, {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al finalizar F05');
    }
    return res.json() as Promise<{ ok: boolean; logros_id: number; codigo_f05: string; pdf_url: string }>;
};

export const cerrarFase = async (logrosId: number, faseNum: 1 | 2 | 3) => {
    const res = await fetch(`${API_URL}/proceso-logros/${logrosId}/cerrar-fase/${faseNum}`, {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error al cerrar Fase ${faseNum}`);
    }
    return res.json() as Promise<{ ok: boolean; logros_id: number; fase_num: number; codigo_f05: string; pdf_url: string }>;
};

export const updateLogros = async (id: number, data: ProcesoLogrosPayload) => {
    const res = await fetch(`${API_URL}/proceso-logros/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al actualizar F05');
    }
    return res.json();
};
