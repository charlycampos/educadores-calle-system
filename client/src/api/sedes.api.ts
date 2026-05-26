import { useAuthStore } from '../store/auth.store';
import { AUTH_API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface Sede {
    id: number;
    codigo: string;
    nombre: string;
    regionId: number;
    region: string;
    departamento: string;
    provincia: string;
    direccion?: string | null;
    telefono?: string | null;
    activo: number;
    createdAt?: string;
}

export interface SedeConStats extends Sede {
    totalUsuarios: number;
    totalCasos: number;
    usuariosPorRol: Array<{ rol: string; cantidad: number }>;
}

/** Lista todas las sedes activas */
export const getSedesAll = async (): Promise<Sede[]> => {
    const response = await fetch(`${AUTH_API_URL}/sedes`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al obtener las sedes');
    const data = await response.json();
    // El backend envuelve en { data: [...] } con el helper ok()
    return data.data ?? data;
};

/** Obtiene la sede del usuario autenticado */
export const getMiSede = async (): Promise<Sede> => {
    const response = await fetch(`${AUTH_API_URL}/sedes/mi-sede`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al obtener la sede');
    const data = await response.json();
    return data.data ?? data;
};

/** Obtiene usuarios filtrados por sede */
export const getUsuariosBySede = async (sedeId: number) => {
    const response = await fetch(`${AUTH_API_URL}/usuarios?sedeId=${sedeId}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error al obtener usuarios de la sede');
    return response.json();
};
