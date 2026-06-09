import { useAuthStore } from '../store/auth.store';
import { INTERVENCION_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface UrgenciaF15 {
    id?: number;
    codigo_reporte?: string;
    fecha_atencion?: string;
    hora_atencion?: string;
    zona_atencion?: string;
    nna_ubicado: boolean;
    perfil?: string;
    antecedentes?: string;
    actividades_realiza?: string;
    
    // Diagnóstico Inmediato
    nombre_referido?: string;
    direccion_referida?: string;
    asiste_escuela: boolean;
    escuela_detalle?: string;
    grado_escuela?: string;
    tiene_dni: boolean;
    tiene_sis: boolean;
    familiares_vive?: string;
    horarios_dias?: string;
    
    // Indicadores de Riesgo
    riesgo_salud?: string;
    riesgo_violencia?: string;
    riesgo_escolar?: string;
    riesgo_laboral_padres?: string;
    riesgo_familiar?: string;
    
    // Acciones y Acuerdos
    acciones_realizadas?: string;
    otra_situacion?: string;
    acuerdos?: string;

    datos_extra?: any;

    educador_id?: number;
    sede_id?: number;
    nna_id?: number;
    estado?: string;
    created_at?: string;
    updated_at?: string;
}

export const getUrgencias = async (): Promise<UrgenciaF15[]> => {
    const response = await fetch(`${API_URL}/urgencias`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener lista de urgencias');
    return response.json();
};

export const getUrgenciaById = async (id: number): Promise<UrgenciaF15> => {
    const response = await fetch(`${API_URL}/urgencias/${id}`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener la ficha de urgencia');
    return response.json();
};

export const createUrgencia = async (data: UrgenciaF15): Promise<UrgenciaF15> => {
    const response = await fetch(`${API_URL}/urgencias`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al guardar la urgencia F15');
    }
    return response.json();
};

export const updateUrgencia = async (id: number, data: UrgenciaF15): Promise<UrgenciaF15> => {
    const response = await fetch(`${API_URL}/urgencias/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error al actualizar la urgencia F15');
    return response.json();
};

export const updateEstadoUrgencia = async (id: number, estado: string, nnaId?: number): Promise<unknown> => {
    const response = await fetch(`${API_URL}/urgencias/${id}/estado`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ estado, nna_id: nnaId })
    });
    if (!response.ok) throw new Error('Error al actualizar el estado de la urgencia');
    return response.json();
};

export const getPrefillF03 = async (id: number): Promise<unknown> => {
    const response = await fetch(`${API_URL}/urgencias/${id}/prefill-f03`, {
        method: 'GET',
        headers: getHeaders()
    });
    if (!response.ok) throw new Error('Error al obtener pre-llenado de F03');
    return response.json();
};
