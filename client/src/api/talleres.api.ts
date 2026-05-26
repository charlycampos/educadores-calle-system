import { useAuthStore } from '../store/auth.store';
import { TALLERES_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface Taller {
    id: number;
    nombre: string;
    fecha: string; // ISO date string
    hora: string;
    lugar: string;
    objetivo: string;
    estado: 'PLANIFICADO' | 'EJECUTADO' | 'EVALUADO';
    dirigidoA?: string;
    esIndividual?: boolean;     // Nuevo: indica si es taller individual
    nnaAsociadoId?: number;     // Nuevo: ID del NNA si es individual
    educadorResponsableId?: number; // Nuevo: ID del educador que crea el taller
    incidenciasLogisticas?: string;
    participantes: ParticipanteTaller[];
    // Planificación Method fields...
    inicioActividad?: string;
    procesoActividad?: string;
    cierreActividad?: string;
}

export interface ParticipanteTaller {
    id: number;
    tallerId: number;
    nnaId: number;
    asistio: boolean;
    logros?: string;
    limitaciones?: string;
    sugerencias?: string;
    nna?: {
        nombres: string;
        apellidoPaterno: string;
        apellidoMaterno: string;
    };
}

export const getTalleres = async (): Promise<Taller[]> => {
    const response = await fetch(`${API_URL}/talleres`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching talleres');
    return response.json();
};

export const createTaller = async (data: Partial<Taller>) => {
    // Backend PlanificarTallerRequest: { tema, fecha_programada, objetivos?, metodologia? }
    // El frontend usa: { nombre, fecha, hora, objetivo, inicioActividad, procesoActividad, cierreActividad }
    const fechaHora = data.fecha && data.hora
        ? `${data.fecha}T${data.hora}:00`
        : data.fecha
            ? `${data.fecha}T09:00:00`
            : new Date().toISOString();

    const metodologia = [
        data.inicioActividad ? `INICIO: ${data.inicioActividad}` : '',
        data.procesoActividad ? `PROCESO: ${data.procesoActividad}` : '',
        data.cierreActividad ? `CIERRE: ${data.cierreActividad}` : '',
    ].filter(Boolean).join('\n\n') || undefined;

    const payload = {
        tema:             data.nombre || 'Sin nombre',
        fecha_programada: fechaHora,
        objetivos:        data.objetivo || undefined,
        metodologia:      metodologia,
    };

    const response = await fetch(`${API_URL}/talleres/planificar`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error creating taller');
    return response.json();
};

export const getTallerById = async (id: number): Promise<Taller> => {
    const response = await fetch(`${API_URL}/talleres/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching taller detail');
    return response.json();
};
export const updateTaller = async (id: number, data: Partial<Taller>) => {
    // Si el taller está en PLANIFICADO y no estamos enviando participantes (es decir, solo editando la planeación)
    if (data.estado === 'PLANIFICADO' && (!data.participantes || data.participantes.length === 0)) {
        const fechaHora = data.fecha && data.hora
            ? `${data.fecha}T${data.hora}:00`
            : data.fecha
                ? `${data.fecha}T09:00:00`
                : undefined;

        const metodologia = [
            data.inicioActividad ? `INICIO: ${data.inicioActividad}` : '',
            data.procesoActividad ? `PROCESO: ${data.procesoActividad}` : '',
            data.cierreActividad ? `CIERRE: ${data.cierreActividad}` : '',
        ].filter(Boolean).join('\n\n') || undefined;

        const payload = {
            tema:             data.nombre,
            fecha_programada: fechaHora,
            objetivos:        data.objetivo,
            metodologia:      metodologia,
        };

        const response = await fetch(`${API_URL}/talleres/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Error updating taller planning');
        return response.json();
    }

    // Backend EjecutarTallerRequest: { fecha_ejecucion, participantes: [{nna_id, asiste, evaluacion}] }
    const payload = {
        fecha_ejecucion: data.fecha && data.hora
            ? `${data.fecha}T${data.hora}:00`
            : new Date().toISOString(),
        participantes: (data.participantes || []).map(p => ({
            nna_id:     p.nnaId,
            asiste:     p.asistio,
            evaluacion: p.logros || p.limitaciones
                ? `Logros: ${p.logros || '—'}\nLimitaciones: ${p.limitaciones || '—'}\nSugerencias: ${p.sugerencias || '—'}`
                : undefined,
        })),
    };

    const response = await fetch(`${API_URL}/talleres/${id}/ejecutar`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error executing taller');
    return response.json();
};


// Participantes

export const addParticipante = async (tallerId: number, nnaId: number) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/participantes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ nnaId })
    });
    if (!response.ok) throw new Error('Error adding participant');
    return response.json();
};

export const updateParticipante = async (tallerId: number, nnaId: number, data: Partial<ParticipanteTaller>) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/participantes/${nnaId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error updating participant');
    return response.json();
};

export const removeParticipante = async (tallerId: number, nnaId: number) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/participantes/${nnaId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error removing participant');
    return response.json();
};

export const getTalleresByNna = async (nnaId: number): Promise<any[]> => {
    const response = await fetch(`${API_URL}/talleres/historial/${nnaId}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching NNA workshops history');
    return response.json();
};
