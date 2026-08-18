import { useAuthStore } from '../store/auth.store';
import { TALLERES_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export type TipoParticipante = 'NNA' | 'FAMILIAR';

export interface ParticipanteTaller {
    id: number;
    tallerId: number;
    tipo: TipoParticipante;
    nnaId?: number;
    familiarId?: number;
    asistio: boolean;
    logros?: string;
    limitaciones?: string;
    sugerencias?: string;
    /**
     * false = los tres campos de arriba vienen heredados de la evaluación
     * del taller. true = alguien escribió algo distinto para este participante.
     */
    evaluacionPropia?: boolean;
    nna?: {
        nombres: string;
        apellidoPaterno: string;
        apellidoMaterno: string;
        fechaNacimiento?: string;
        sexo?: string;
        /** Muchos NNA se registran solo con edad, sin fecha de nacimiento. */
        edad?: number | string;
        unidadEdad?: string;
    };
    familiar?: {
        nombres: string;
        parentesco?: string;
        dni?: string;
        telefono?: string;
        /** NNA del taller al que acompaña este familiar. */
        nnaRelacionado?: string;
    };
}

/** Familiar colgado de un NNA en el árbol del selector único. */
export interface FamiliarDeNna {
    familiarId: number;
    nombres: string;
    parentesco?: string;
    dni?: string;
    yaInscrito: boolean;
}

/** Un NNA del ámbito del educador con su familia anidada. */
export interface NnaCandidato {
    nnaId: number;
    nombres: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    numeroDoc?: string;
    fechaNacimiento?: string;
    sexo?: string;
    carpetaCodigo?: string;
    yaInscrito: boolean;
    familiares: FamiliarDeNna[];
}

/** Padre/tutor sugerido: sale de la ficha F03 de los NNA ya inscritos. */
export interface FamiliarCandidato {
    familiarId: number;
    nombres: string;
    parentesco?: string;
    dni?: string;
    telefono?: string;
    viveCon?: string;
    nnaRelacionado?: string;
    yaInscrito: boolean;
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
    /**
     * Evaluación del taller (Formato 08). Una sola por taller.
     *
     * No confundir con `evaluacion` del historial por NNA, que es el texto de
     * ese chico en ese taller.
     */
    evaluacionTaller?: EvaluacionTaller;
}

export interface EvaluacionTaller {
    logros: string;
    limitaciones: string;
    sugerencias: string;
    fecha?: string | null;
    evaluadaPorId?: number | null;
    evaluado: boolean;
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
    // El nombre es lo único que identifica al taller en el calendario. Antes se
    // guardaba 'Sin nombre' en silencio; ahora se exige antes de llamar al API.
    tema: (data.nombre || '').trim(),
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

/**
 * Extrae el `detail` que devuelve FastAPI para que el error del navegador
 * muestre la causa real (por ejemplo un ORA-xxxxx) en vez de un texto genérico.
 */
const throwApiError = async (response: Response, contexto: string): Promise<never> => {
    let detalle = '';
    try {
        const cuerpo = await response.json();
        detalle = typeof cuerpo?.detail === 'string'
            ? cuerpo.detail
            : JSON.stringify(cuerpo?.detail ?? cuerpo);
    } catch {
        try { detalle = await response.text(); } catch { /* respuesta sin cuerpo */ }
    }
    const error = new Error(`${contexto} (HTTP ${response.status})${detalle ? `: ${detalle}` : ''}`);
    console.error(`[talleres.api] ${contexto}`, { status: response.status, detalle });
    throw error;
};

export const getTalleres = async (): Promise<Taller[]> => {
    const response = await fetch(`${API_URL}/talleres`, { headers: getHeaders() });
    if (!response.ok) await throwApiError(response, 'Error al listar talleres');
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
    if (!response.ok) await throwApiError(response, 'Error al crear el taller');
    return response.json();
};

export const getTallerById = async (id: number): Promise<Taller> => {
    const response = await fetch(`${API_URL}/talleres/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching taller detail');
    return response.json();
};

/**
 * Guarda el taller.
 *
 * `modo` decide a qué endpoint va, y proviene de la pestaña abierta. Antes se
 * deducía del estado y de si había participantes, lo que hacía que editar la
 * planificación de un taller ya ejecutado disparara el borrado y reinserción
 * de toda su lista. El estado ya no se envía: lo deriva el backend de la
 * asistencia y las evaluaciones.
 */
export const updateTaller = async (
    id: number,
    data: Partial<Taller>,
    modo: 'planificacion' | 'ejecucion' = 'ejecucion'
) => {
    if (modo === 'planificacion') {
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
    // Solo se envían los NNA. Los familiares se administran por sus propios
    // endpoints y el backend no los toca al ejecutar.
    const payload = {
        fecha_ejecucion: buildFechaHora(data.fecha, data.hora) ?? new Date().toISOString(),
        participantes: (data.participantes || []).filter(p => p.tipo !== 'FAMILIAR' && p.nnaId).map(p => ({
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


// Familiares (Formato 11) ---------------------------------------------------

/**
 * Padres/tutores sugeridos para el taller. El backend los deriva de la ficha
 * F03 de los NNA ya inscritos, así que el educador solo marca, no escribe.
 */
/**
 * Árbol del selector único: NNA del ámbito del educador con su familia
 * anidada. Todos los nombres salen de la base — el educador solo marca.
 */
export const getCandidatos = async (tallerId: number): Promise<NnaCandidato[]> => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/candidatos`, {
        headers: getHeaders()
    });
    if (!response.ok) await throwApiError(response, 'Error al cargar los participantes');
    return response.json();
};

export const getFamiliaresCandidatos = async (tallerId: number): Promise<FamiliarCandidato[]> => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/familiares-candidatos`, {
        headers: getHeaders()
    });
    if (!response.ok) await throwApiError(response, 'Error al cargar los familiares');
    return response.json();
};

export const addFamiliar = async (tallerId: number, familiarId: number) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/participantes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ familiarId })
    });
    if (!response.ok) await throwApiError(response, 'Error al agregar al familiar');
    return response.json();
};

export const updateFamiliar = async (tallerId: number, familiarId: number, data: Partial<ParticipanteTaller>) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/familiares/${familiarId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) await throwApiError(response, 'Error al actualizar al familiar');
    return response.json();
};

export const removeFamiliar = async (tallerId: number, familiarId: number) => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/familiares/${familiarId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!response.ok) await throwApiError(response, 'Error al quitar al familiar');
    return response.json();
};

/** Alta masiva de los checks marcados en campo. */
export const addParticipantesBulk = async (
    tallerId: number,
    payload: { nnaIds?: number[]; familiarIds?: number[] }
): Promise<ParticipanteTaller[]> => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/participantes/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            nnaIds: payload.nnaIds ?? [],
            familiarIds: payload.familiarIds ?? []
        })
    });
    if (!response.ok) throw new Error('Error adding participants');
    return response.json();
};

/**
 * Guarda el Formato 08 — la evaluación del taller.
 *
 * Una sola por taller. Los participantes que no tengan evaluación propia
 * heredan este texto, así el F08 que se archiva en el expediente de cada NNA
 * sale completo aunque el educador solo haya escrito una vez.
 */
export const guardarEvaluacionTaller = async (
    tallerId: number,
    data: { logros?: string; limitaciones?: string; sugerencias?: string },
): Promise<Taller> => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/evaluacion`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Error al guardar la evaluación del taller');
    }
    return response.json();
};

/** Quita las evaluaciones personalizadas para que todos hereden la del taller. */
export const igualarEvaluaciones = async (tallerId: number): Promise<Taller> => {
    const response = await fetch(`${API_URL}/talleres/${tallerId}/evaluacion/igualar`, {
        method: 'POST',
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Error al igualar las evaluaciones');
    return response.json();
};

export const getTalleresByNna = async (nnaId: number): Promise<any[]> => {
    const response = await fetch(`${API_URL}/talleres/historial/${nnaId}`, {
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error fetching NNA workshops history');
    return response.json();
};
