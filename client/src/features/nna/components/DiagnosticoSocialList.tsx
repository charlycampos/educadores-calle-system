import { INTERVENCION_API_URL } from '../../../config/api';
import { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, FileText, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticoSocialListProps {
    nnaId: number;
    nnaFullName?: string;
    onNuevoDiagnostico: () => void;
    onVerDiagnostico: (id: number) => void;
    onEditarDiagnostico: (id: number) => void;
}

export const DiagnosticoSocialList = ({
    nnaId,
    nnaFullName,
    onNuevoDiagnostico,
    onVerDiagnostico,
    onEditarDiagnostico,
}: DiagnosticoSocialListProps) => {
    const [diagnosticos, setDiagnosticos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDiagnosticos = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!nnaId) throw new Error('ID de NNA no válido');

            const response = await fetch(`${INTERVENCION_API_URL}/diagnostico/nna/${nnaId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setDiagnosticos(
                    data.map((d: any) => ({
                        id: d.id,
                        fechaCreacion: d.created_at,
                        nnaNombre:
                            (d.nna
                                ? `${d.nna.nombres || ''} ${d.nna.apellidoPaterno || ''} ${d.nna.apellidoMaterno || ''}`.trim()
                                : '') ||
                            nnaFullName ||
                            '---',
                        estado: d.estado,
                    }))
                );
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }
        } catch (err: any) {
            setError(err.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiagnosticos();
    }, [nnaId]);

    const handleEliminar = async (id: number) => {
        if (!window.confirm('¿Estás seguro de eliminar este diagnóstico social?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${INTERVENCION_API_URL}/diagnostico/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) setDiagnosticos(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            console.error('Error eliminando:', err);
        }
    };

    const estadoBadge = (estado: string) => {
        const map: Record<string, { cls: string; label: string }> = {
            COMPLETO:   { cls: 'bg-success-soft text-success',  label: 'Completo'    },
            EN_PROCESO: { cls: 'bg-warning-soft text-warning',  label: 'En Proceso'  },
            PENDIENTE:  { cls: 'bg-primary-soft text-primary',  label: 'Pendiente'   },
        };
        const b = map[estado] ?? { cls: 'bg-surface-muted text-fg-muted border border-border', label: estado };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${b.cls}`}>
                {b.label}
            </span>
        );
    };

    return (
        <div className="bg-surface rounded-[8px] border border-border shadow-1 overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Diagnósticos Sociales</h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">Formato 4 — Evaluación Sociofamiliar</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchDiagnosticos}
                        title="Recargar lista"
                        className="p-2 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[6px] transition-colors"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={onNuevoDiagnostico}
                        className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={15} /> Nuevo Diagnóstico
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                    <thead>
                        <tr className="bg-surface-muted border-b border-border">
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">N° Ficha</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Fecha Registro</th>
                            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-fg-muted uppercase tracking-wider">NNA</th>
                            <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-fg-muted uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {error ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center">
                                    <div className="flex flex-col items-center gap-2 text-danger">
                                        <div className="bg-danger-soft p-3 rounded-full">
                                            <AlertCircle size={22} />
                                        </div>
                                        <span className="font-semibold text-[13px]">Error al cargar datos</span>
                                        <span className="text-[11px] text-fg-muted">{error}</span>
                                        <button
                                            onClick={fetchDiagnosticos}
                                            className="text-primary hover:underline text-[12px] mt-1"
                                        >
                                            Reintentar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : loading ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-fg-muted text-[13px]">
                                    <div className="flex flex-col items-center gap-2 animate-pulse">
                                        <div className="h-3 w-32 bg-border rounded"></div>
                                        <span className="text-[12px]">Cargando registros…</span>
                                    </div>
                                </td>
                            </tr>
                        ) : diagnosticos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-14 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-surface-muted rounded-full">
                                            <FileText size={28} className="text-fg-muted" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-fg text-[13px]">No hay diagnósticos registrados</p>
                                            <p className="text-[12px] text-fg-muted mt-1">
                                                Comienza creando una nueva evaluación sociofamiliar.
                                            </p>
                                        </div>
                                        <button
                                            onClick={onNuevoDiagnostico}
                                            className="flex items-center gap-1.5 text-primary bg-primary-soft px-3 py-1.5 rounded-[6px] text-[12px] font-medium border border-primary/20 hover:bg-primary/10 transition-colors"
                                        >
                                            <Plus size={13} /> Crear Nuevo
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            diagnosticos.map(diag => {
                                const year = new Date(diag.fechaCreacion).getFullYear();
                                const code = `${String(diag.id).padStart(4, '0')}-${year}`;
                                return (
                                    <tr
                                        key={diag.id}
                                        className="border-b border-border last:border-b-0 hover:bg-surface-muted transition-colors group"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-primary-soft text-primary border border-primary/20">
                                                {code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-fg text-[13px]">
                                                {new Date(diag.fechaCreacion).toLocaleDateString('es-PE', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-[11px] text-fg-muted">
                                                {new Date(diag.fechaCreacion).toLocaleTimeString('es-PE', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                                                    {diag.nnaNombre.charAt(0)}
                                                </div>
                                                <span className="font-medium text-fg text-[13px]">{diag.nnaNombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {estadoBadge(diag.estado)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onVerDiagnostico(diag.id)}
                                                    title="Ver Detalle"
                                                    className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    onClick={() => onEditarDiagnostico(diag.id)}
                                                    title="Editar"
                                                    className="p-1.5 text-fg-muted hover:text-success hover:bg-success-soft rounded-[5px] transition-all"
                                                >
                                                    <Edit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(diag.id)}
                                                    title="Eliminar"
                                                    className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-[5px] transition-all"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {!loading && diagnosticos.length > 0 && (
                <div className="px-5 py-3 bg-surface-muted border-t border-border text-[12px] text-fg-muted text-center">
                    Total:{' '}
                    <span className="font-semibold text-fg">{diagnosticos.length}</span>{' '}
                    diagnóstico(s) registrado(s)
                </div>
            )}
        </div>
    );
};
