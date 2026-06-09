import { useAuthStore } from '../store/auth.store';
import { TALLERES_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

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

export interface Taller {
    id: number;
    nombre: string;
    fecha: string;
    hora: string;
    lugar?: string;
    objetivo?: string;
    estado: 'PLANIFICADO' | 'EJECUTADO' | 'EVALUADO';
    dirigidoA?: string;
    esIndividual?: boolean;
    nnaAsociadoId?: number;
    educadorResponsableId?: number;
    educadorResponsable?: { nombreCompleto?: string };
    incidenciasLogisticas?: string;
    participantes: ParticipanteTaller[];
    // Esquema metodológico
    inicioActividad?: string;
    inicioTiempo?: string;
    inicioMateriales?: string;
    procesoActividad?: string;
    procesoTiempo?: string;
    procesoMateriales?: string;
    cierreActividad?: string;
    cierreTiempo?: string;
    cierreMateriales?: string;
    // Otros campos F7
    numeroPersonasPlanificadas?: number;
    accionesPrevias?: string;
}

const buildFechaHora = (fecha?: string, hora?: string, fallback = true): string | undefined => {
    const fechaPart = fecha
        ? (fecha.includes('T') ? fecha.split('T')[0] : fecha)
        : null;
    if (fechaPart && hora) return `${fechaPart}T${hora}:00`;
    if (fechaPart) return `${fechaPart}T09:00:00`;
    return fallback ? new Date().toISOString() : undefined;
};

const buildMetodologia = (data: Partial<Taller>): string | undefined => {
    const parts = [
        data.inicioActividad ? `INICIO: ${data.inicioActividad}` : '',
        data.procesoActividad ? `PROCESO: ${data.procesoActividad}` : '',
        data.cierreActividad ? `CIERRE: ${data.cierreActividad}` : '',
    ].filter(Boolean);
    return parts.length ? parts.join('\n\n') : undefined;
};

const buildPlanificacionPayload = (data: Partial<Taller>, fechaHora?: string) => ({
    tema: data.nombre || 'Sin nombre',
    fecha_programada: fechaHora,
    objetivos: data.objetivo || undefined,
    metodologia: buildMetodologia(data),
    lugar: data.lugar || undefined,
    dirigido_a: data.dirigidoA || undefined,
    num_personas_planificadas: data.numeroPersonasPlanificadas || undefined,
    acciones_previas: data.accionesPrevias || undefined,
    inicio_tiempo: data.inicioTiempo || undefined,
    inicio_materiales: data.inicioMateriales || undefined,
    proceso_tiempo: data.procesoTiempo || undefined,
    proceso_materiales: data.procesoMateriales || undefined,
    cierre_tiempo: data.cierreTiempo || undefined,
    cierre_materiales: data.cierreMateriales || undefined,
});

export const getTalleres = async (): Promise<Taller[]> => {
    const response = await fetch(`${API_URL}/talleres`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching talleres');
    return response.json();
};

export const createTaller = async (data: Partial<Taller>) => {
    const fechaHora = buildFechaHora(data.fecha, data.hora, false) ?? new Date().toISOString();
    const payload = buildPlanificacionPayload(data, fechaHora);
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
    if (data.estado === 'PLANIFICADO' && (!data.participantes || data.participantes.length === 0)) {
        const fechaHora = buildFechaHora(data.fecha, data.hora, false);
        const payload = buildPlanificacionPayload(data, fechaHora);
        const response = await fetch(`${API_URL}/talleres/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Error updating taller planning');
        return response.json();
    }

    // Ejecución: POST /{id}/ejecutar
    const payload = {
        fecha_ejecucion: buildFechaHora(data.fecha, data.hora) ?? new Date().toISOString(),
        participantes: (data.participantes || []).map(p => ({
            nna_id: p.nnaId,
            asiste: p.asistio,
            evaluacion: p.logros || p.limitaciones || p.sugerencias
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
