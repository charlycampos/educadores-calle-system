import { useAuthStore } from '../store/auth.store';
import { DERIVACION_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface Derivacion {
    id: number;
    casoId: number;
    remitenteId: number;
    destinatarioId?: number;
    entidadDestino?: string;
    tipoDerivacion: 'INTERNA' | 'EXTERNA';
    motivo: string;
    prioridad: 'NORMAL' | 'URGENTE';
    documentoRef?: string;
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'ACEPTADO' | 'RECHAZADO';
    fechaDerivacion: string;
    remitente?: { nombreCompleto: string };
    destinatario?: { nombreCompleto: string };
}

export const getDerivacionesByCaso = async (casoId: number): Promise<Derivacion[]> => {
    const response = await fetch(`${API_URL}/derivaciones/caso/${casoId}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching derivaciones');
    return response.json();
};

export const createDerivacion = async (data: Partial<Derivacion>) => {
    // Backend tiene endpoints separados: POST /api/derivaciones/interna o /externa
    const tipo = data.tipoDerivacion === 'EXTERNA' ? 'externa' : 'interna';
    const response = await fetch(`${API_URL}/derivaciones/${tipo}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error creating derivacion');
    return response.json();
};

export const getDerivacionesPendientes = async (): Promise<any[]> => {
    const response = await fetch(`${API_URL}/derivaciones/pendientes`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al cargar derivaciones pendientes');
    return response.json();
};

export const responderDerivacion = async (id: number, accion: 'ACEPTAR' | 'RECHAZAR', observaciones?: string): Promise<any> => {
    const response = await fetch(`${API_URL}/derivaciones/${id}/responder`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ accion, observaciones })
    });
    if (!response.ok) throw new Error('Error al responder derivación');
    return response.json();
};
