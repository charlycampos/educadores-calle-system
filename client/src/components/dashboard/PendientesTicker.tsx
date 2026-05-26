import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../config/api';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PendientesTicker.css';

const API_URL = AUTH_API_URL;

interface Pendiente {
    id: number;
    nnaId: number;
    tipo: string;
    titulo: string;
    descripcion: string;
    urgencia: 'ALTA' | 'MEDIA' | 'BAJA';
    dias: number;
    icono: string;
}

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const PendientesTicker = () => {
    const [pendientes, setPendientes] = useState<Pendiente[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPendientes = async () => {
            try {
                const response = await fetch(`${API_URL}/statistics/mis-pendientes`, {
                    headers: getHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    setPendientes(data.pendientes || []);
                }
            } catch (error) {
                console.error('Error fetching pendientes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPendientes();
        const interval = setInterval(fetchPendientes, 60000); // Actualizar cada minuto
        return () => clearInterval(interval);
    }, []);

    const getColorClass = (urgencia: string) => {
        switch (urgencia) {
            case 'ALTA': return 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100';
            case 'MEDIA': return 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100';
            case 'BAJA': return 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100';
            default: return 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100';
        }
    };

    const handleClick = (pendiente: Pendiente) => {
        // Navegar al expediente del NNA
        navigate(`/nna/${pendiente.nnaId}`);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-96 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Cargando pendientes...</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-96">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <h3 className="font-bold text-gray-800">Mis Pendientes</h3>
                </div>
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {pendientes.length} tareas
                </div>
            </div>

            {/* Ticker Container */}
            <div className="flex-1 overflow-hidden relative">
                {pendientes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <div className="text-6xl mb-4">🎉</div>
                        <h4 className="font-bold text-gray-700 mb-2">¡Todo al día!</h4>
                        <p className="text-sm text-gray-500">No tienes tareas pendientes urgentes</p>
                    </div>
                ) : (
                    <div className="ticker-scroll">
                        {/* Duplicar para efecto infinito */}
                        {[...pendientes, ...pendientes].map((pendiente, idx) => (
                            <div
                                key={`${pendiente.id}-${idx}`}
                                onClick={() => handleClick(pendiente)}
                                className={`ticker-item px-6 py-4 border-b border-gray-100 cursor-pointer transition-all ${getColorClass(pendiente.urgencia)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl shrink-0">{pendiente.icono}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-sm truncate">{pendiente.titulo}</h4>
                                            {pendiente.dias > 0 && (
                                                <span className="text-xs opacity-70 whitespace-nowrap">
                                                    {pendiente.dias}d
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs opacity-80 truncate">{pendiente.descripcion}</p>
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${pendiente.urgencia === 'ALTA' ? 'bg-red-100 border-red-300 text-red-700' :
                                            pendiente.urgencia === 'MEDIA' ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                                                'bg-green-100 border-green-300 text-green-700'
                                        }`}>
                                        {pendiente.urgencia}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
