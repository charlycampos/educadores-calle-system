import { useAuthStore } from '../store/auth.store';
import { AUTH_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface Usuario {
    id: number;
    nombreCompleto: string;
    nombre_completo?: string;
    email: string;
    rolId?: number;
    rol?: string;
    sedeId?: number;
    sedeCodigo?: string;
    zonaAsignada?: string;
    activo: boolean;
    password?: string; // Optional for creating/updating
}

export const getUsers = async (): Promise<Usuario[]> => {
    const response = await fetch(`${API_URL}/usuarios`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching users');
    return response.json();
};

export const createUser = async (user: Partial<Usuario>) => {
    const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(user)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Error creating user');
    }
    return response.json();
};

export const updateUser = async (id: number, user: Partial<Usuario>) => {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(user)
    });
    if (!response.ok) {
        let detail = 'Error al actualizar usuario';
        try { const err = await response.json(); detail = err.detail || err.message || detail; } catch {}
        throw new Error(detail);
    }
    return response.json();
};

export const deleteUser = async (id: number) => {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) {
        let detail = 'Error al eliminar usuario';
        try { const err = await response.json(); detail = err.detail || err.message || detail; } catch {}
        throw new Error(detail);
    }
    // 204 No Content — no hay body que parsear
};
