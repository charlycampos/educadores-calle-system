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
    casoId: number | null;
    fecha: string;
    ubicacion: string;
    actividad: string;
    estadoFisico?: string;
    estadoAnimo?: string;
    observaciones?: string;
    latitud?: number | null;
    longitud?: number | null;
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

export const createEntradaDiario = async (casoId: number | null, data: Partial<EntradaDiario>) => {
    const response = await fetch(`${API_URL}/diario`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            caso_id: casoId,
            ubicacion: data.ubicacion,
            actividad: data.actividad,
            estado_fisico: data.estadoFisico,
            estado_animo: data.estadoAnimo,
            observaciones: data.observaciones,
            latitud: data.latitud ?? null,
            longitud: data.longitud ?? null,
        })
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

export const updateEntradaDiario = async (id: number, casoId: number | null, data: Partial<EntradaDiario>) => {
    const response = await fetch(`${API_URL}/diario/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
            caso_id: casoId,
            ubicacion: data.ubicacion,
            actividad: data.actividad,
            estado_fisico: data.estadoFisico,
            estado_animo: data.estadoAnimo,
            observaciones: data.observaciones,
            latitud: data.latitud ?? null,
            longitud: data.longitud ?? null,
        })
    });
    if (!response.ok) throw new Error('Error updating entrada');
    return response.json();
};
