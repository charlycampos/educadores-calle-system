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
    /** Área de intervención: SALUD, EDUCACION, IDENTIDAD, FAMILIA, OTROS */
    area?: string;
    /** Objetivo específico al que pertenece la actividad */
    objetivo?: string;
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
    codigoPti?: string;
    objetivoGeneral?: string;
    fechaInicio?: string;
    fechaRevision?: string;
    estado: string;
    acciones: AccionPTI[];
    createdAt: string;
    /** Duración del plan en días (default 90; se amplía con el Informe de Ampliación) */
    vigenciaDias?: number;
    fechaCierre?: string | null;
    observacionCierre?: string | null;
    /** JSON del Informe Técnico de Ampliación: {antecedentes, analisis, sustento, conclusiones, fecha} */
    informeAmpliacion?: string | null;
}

export interface InformeAmpliacionData {
    antecedentes: string;
    analisis: string;
    sustento: string;
    conclusiones: string;
}

export const cerrarPti = async (ptiId: number, observacion?: string) => {
    const response = await fetch(`${API_URL}/pti/${ptiId}/cerrar`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ observacion: observacion || null })
    });
    if (!response.ok) throw new Error('Error cerrando el plan');
    return response.json();
};

export const ampliarVigencia = async (ptiId: number, dias: number = 30) => {
    const response = await fetch(`${API_URL}/pti/${ptiId}/ampliar-vigencia`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ dias })
    });
    if (!response.ok) throw new Error('Error ampliando la vigencia');
    return response.json();
};

export const saveInformeAmpliacion = async (ptiId: number, data: InformeAmpliacionData) => {
    const response = await fetch(`${API_URL}/pti/${ptiId}/informe-ampliacion`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error guardando informe de ampliación');
    return response.json();
};

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

export const updatePti = async (ptiId: number, data: { objetivo_general: string; acciones: AccionPTI[] }) => {
    const response = await fetch(`${API_URL}/pti/${ptiId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error updating PTI');
    return response.json();
};

export const getAllPtisByCaso = async (casoId: number): Promise<PlanTrabajo[]> => {
    const response = await fetch(`${API_URL}/pti/caso/${casoId}/all`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching plans');
    return response.json();
};
