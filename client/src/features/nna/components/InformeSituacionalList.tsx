import { getToken } from '../../../utils/auth';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, AlertCircle, RefreshCw, Eye } from 'lucide-react';

interface InformeSituacionalListProps {
    casoId: number;
    nnaFullName?: string;
    onNuevoInforme: () => void;
    onEditarInforme: () => void;
}

export const InformeSituacionalList = ({
    casoId,
    nnaFullName,
    onNuevoInforme,
    onEditarInforme,
}: InformeSituacionalListProps) => {
    const [informe, setInforme] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInforme = async () => {
        if (!casoId) return;
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            const response = await fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    setInforme(null);
                    return;
                }
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const data = await response.json();
            setInforme(data ?? null);
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInforme();
    }, [casoId]);

    const handleEliminar = async () => {
        if (!window.confirm('¿Estás seguro de eliminar este informe situacional?')) return;
        try {
            const token = getToken();
            const res = await fetch(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setInforme(null);
            } else {
                alert('No se pudo eliminar el informe');
            }
        } catch (err) {
            console.error('Error eliminando:', err);
        }
    };

    return (
        <div className="bg-surface rounded-[8px] border border-border shadow-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Informe Situacional</h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">Sustento de Abordaje y Diagnóstico</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchInforme}
                        title="Recargar"
                        className="p-2 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[6px] transition-colors"
                    >
                        <RefreshCw size={16} />
                    </button>
                    {!informe && !loading && (
                        <button
                            onClick={onNuevoInforme}
                            className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus size={15} /> Registrar Informe
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <div className="py-8 text-center text-fg-muted text-[13px]">Cargando informe situacional...</div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-2 text-danger py-8 text-center">
                        <AlertCircle size={22} />
                        <span className="font-semibold text-[13px]">Error al cargar el informe</span>
                        <span className="text-[11px] text-fg-muted">{error}</span>
                    </div>
                ) : informe ? (
                    <>
                        {/* Tabla (Escritorio) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-[13px] border-collapse">
                                <thead>
                                    <tr className="bg-surface-muted border-b border-border text-left">
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Asunto</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Fecha Informe</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">NNA</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-border hover:bg-surface-muted/50">
                                        <td className="px-4 py-3 font-semibold text-fg">{informe.asunto}</td>
                                        <td className="px-4 py-3 text-fg-2">{new Date(informe.fecha_informe + 'T00:00:00').toLocaleDateString('es-PE')}</td>
                                        <td className="px-4 py-3 text-fg-2">{nnaFullName}</td>
                                        <td className="px-4 py-3">
                                            {informe.estado === 'FINALIZADO' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-soft text-success border border-success/20">
                                                    ✓ Finalizado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning-soft text-warning border border-warning/20">
                                                    Borrador
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {informe.estado === 'FINALIZADO' ? (
                                                    <button
                                                        onClick={() => {
                                                            const token = getToken();
                                                            window.open(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}/vista?token=${token}`, '_blank');
                                                        }}
                                                        className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                        title="Ver informe"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={onEditarInforme}
                                                            className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button
                                                            onClick={handleEliminar}
                                                            className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-[4px] transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Tarjeta (Móvil) */}
                        <div className="md:hidden border border-border rounded-xl p-4 space-y-3 bg-surface">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-fg text-sm">{informe.asunto}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${informe.estado === 'FINALIZADO' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}`}>
                                    {informe.estado === 'FINALIZADO' ? 'Finalizado' : 'Borrador'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-fg-muted block text-[10px] uppercase font-bold">Fecha Informe</span>
                                    <span className="text-fg-2 font-medium">{new Date(informe.fecha_informe + 'T00:00:00').toLocaleDateString('es-PE')}</span>
                                </div>
                                <div>
                                    <span className="text-fg-muted block text-[10px] uppercase font-bold">Beneficiario</span>
                                    <span className="text-fg-2 font-medium">{nnaFullName}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                {informe.estado === 'FINALIZADO' ? (
                                    <button
                                        onClick={() => {
                                            const token = getToken();
                                            window.open(`${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}/vista?token=${token}`, '_blank');
                                        }}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-soft text-primary py-1.5 rounded-lg text-xs font-bold"
                                    >
                                        <Eye size={14} /> Ver Informe
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={onEditarInforme}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-warning-soft text-warning py-1.5 rounded-lg text-xs font-bold"
                                        >
                                            <Edit size={14} /> Editar
                                        </button>
                                        <button
                                            onClick={handleEliminar}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-danger-soft text-danger py-1.5 rounded-lg text-xs font-bold"
                                        >
                                            <Trash2 size={14} /> Eliminar
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-[8px] bg-surface-muted/30">
                        <FileText size={32} className="text-fg-muted opacity-40" />
                        <span className="font-semibold text-fg-2 text-[13px]">No se ha registrado el Informe Situacional</span>
                        <p className="text-fg-muted text-[11px] max-w-[280px]">El informe situacional sustenta las condiciones del NNA para su promoción de fase.</p>
                        <button
                            onClick={onNuevoInforme}
                            className="mt-2 text-primary font-bold text-[12px] hover:underline"
                        >
                            Crear ahora mismo
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
