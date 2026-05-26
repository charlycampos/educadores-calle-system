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
    motivoEgreso: string;
    fechaEgreso: string;
    situacionFamiliar?: string;
    situacionEducativa?: string;
    logrosAlcanzados?: string;
    recomendaciones?: string;
    archivoUrl?: string;
}

export const cerrarCaso = async (casoId: number, data: Partial<InformeCierre>) => {
    // Backend: POST /api/cierre/caso/{caso_id}
    const response = await fetch(`${API_URL}/cierre/caso/${casoId}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Error cerrando caso');
    return response.json();
};

export const getInformeCierre = async (casoId: number): Promise<InformeCierre> => {
    // Backend: GET /api/cierre/caso/{caso_id}
    const response = await fetch(`${API_URL}/cierre/caso/${casoId}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Error fetching informe cierre');
    return response.json();
};
