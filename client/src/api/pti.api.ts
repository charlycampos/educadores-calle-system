import { useAuthStore } from '../store/auth.store';
import { INTERVENCION_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface AccionPTI {
    id?: number;
    descripcion: string;
    meta?: string;
    plazo?: string;
    responsable?: string;
    estado?: 'PENDIENTE' | 'EN_PROCESO' | 'CUMPLIDO' | 'CANCELADO';
    observaciones?: string;
}

export interface PlanTrabajo {
    id: number;
    casoId: number;
    objetivoGeneral?: string;
    estado: string;
    acciones: AccionPTI[];
    createdAt: string;
}

export const getPtiByCaso = async (casoId: number): Promise<PlanTrabajo | null> => {
    const response = await fetch(`${API_URL}/pti/caso/${casoId}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching PTI');
    return response.json();
};

export const createPti = async (casoId: number, data: { objetivoGeneral: string, acciones: AccionPTI[] }) => {
    const response = await fetch(`${API_URL}/pti/caso/${casoId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error creating PTI');
    return response.json();
};

export const addAccion = async (ptiId: number, accion: AccionPTI) => {
    const response = await fetch(`${API_URL}/pti/${ptiId}/acciones`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(accion)
    });
    if (!response.ok) throw new Error('Error adding action');
    return response.json();
};

export const updateAccion = async (accionId: number, data: Partial<AccionPTI>) => {
    const response = await fetch(`${API_URL}/pti/acciones/${accionId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error updating action');
    return response.json();
};

export const deleteAccion = async (accionId: number) => {
    const response = await fetch(`${API_URL}/pti/acciones/${accionId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error deleting action');
};
