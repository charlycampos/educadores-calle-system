import { useAuthStore } from '../store/auth.store';
import { EXPEDIENTE_API_URL as API_URL } from '../config/api';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface InformeCierre {
    id: number;
    casoId: number;
    codigoInforme?: string;
    codigo_informe?: string; // fallback
    motivoEgreso: string;
    fechaEgreso: string;
    situacionFamiliar?: string;
    situacionEducativa?: string;
    logrosAlcanzados?: string;
    recomendaciones?: string;
    archivoUrl?: string;
    estado?: string;
    detalles?: string;
}

export const cerrarCaso = async (casoId: number, data: Partial<InformeCierre>) => {
    // Map to snake_case for the backend
    const payload = {
        motivo_egreso: data.motivoEgreso,
        fecha_egreso: data.fechaEgreso,
        situacion_familiar: data.situacionFamiliar,
        situacion_educativa: data.situacionEducativa,
        logros_alcanzados: data.logrosAlcanzados,
        recomendaciones: data.recomendaciones,
        archivo_url: data.archivoUrl,
        estado: data.estado || "FINALIZADO",
        detalles: data.detalles
    };

    const response = await fetch(`${API_URL}/cierre/caso/${casoId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error cerrando caso');
    return response.json();
};

export const getInformeCierre = async (casoId: number): Promise<any> => {
    const response = await fetch(`${API_URL}/cierre/caso/${casoId}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching informe cierre');
    const data = await response.json();
    if (!data) return null;
    // Return mapped object
    return {
        id: data.id,
        casoId: data.caso_id,
        codigoInforme: data.codigo_informe,
        codigo_informe: data.codigo_informe, // fallback
        motivoEgreso: data.motivo_egreso,
        motivo_egreso: data.motivo_egreso, // fallback
        fechaEgreso: data.fecha_egreso,
        fecha_egreso: data.fecha_egreso, // fallback
        situacionFamiliar: data.situacion_familiar,
        situacionEducativa: data.situacion_educativa,
        logrosAlcanzados: data.logros_alcanzados,
        recomendaciones: data.recomendaciones,
        archivoUrl: data.archivo_url,
        archivo_url: data.archivo_url, // fallback
        estado: data.estado,
        detalles: data.detalles
    };
};
