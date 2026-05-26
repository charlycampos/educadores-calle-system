import { useAuthStore } from '../store/auth.store';
import { INTERVENCION_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface EntradaDiario {
    id?: number;
    casoId: number;
    fecha: string;
    ubicacion: string;
    actividad: string;
    estadoFisico?: string;
    estadoAnimo?: string;
    observaciones?: string;
    creadoPor?: {
        nombreCompleto: string;
    };
    createdAt?: string;
}

export const getDiarioByCaso = async (casoId: number): Promise<EntradaDiario[]> => {
    const response = await fetch(`${API_URL}/diario/caso/${casoId}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching diario');
    return response.json();
};

export const createEntradaDiario = async (casoId: number, data: Partial<EntradaDiario>) => {
    // Backend: POST /api/diario (el caso_id va en el body, no en la URL)
    const response = await fetch(`${API_URL}/diario`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ ...data, casoId })
    });
    if (!response.ok) throw new Error('Error creating entrada');
    return response.json();
};

export const deleteEntradaDiario = async (id: number) => {
    const response = await fetch(`${API_URL}/diario/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error deleting entrada');
};
