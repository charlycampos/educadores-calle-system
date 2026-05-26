/**
 * SEC · PendientesTicker rediseñado
 * - Tokens consolidados (sin red-50, yellow-50, green-50 etc.)
 * - Sin emoji 📋 🎉 en header/empty state
 * - Badge de urgencia usando el Badge component
 * - Sin archivo PendientesTicker.css (animación inline)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_API_URL } from '../../config/api';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface Pendiente {
    id: number; nnaId: number;
    tipo: string; titulo: string; descripcion: string;
    urgencia: 'ALTA' | 'MEDIA' | 'BAJA';
    dias: number; icono: string;
}

const urgenciaTone = (u: string): 'danger' | 'warning' | 'success' => {
    if (u === 'ALTA')  return 'danger';
    if (u === 'MEDIA') return 'warning';
    return 'success';
};

export const PendientesTicker = () => {
    const [pendientes, setPendientes] = useState<Pendiente[]>([]);
    const [loading, setLoading]       = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${AUTH_API_URL}/statistics/mis-pendientes`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                });
                if (res.ok) {
                    const data = await res.json();
                    setPendientes(data.pendientes ?? []);
                }
            } catch { /* silencioso */ }
            finally { setLoading(false); }
        };
        fetch_();
        const id = setInterval(fetch_, 60_000);
        return () => clearInterval(id);
    }, []);

    if (loading) {
        return (
            <div className="bg-surface border border-border rounded-lg h-96 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-fg-secondary">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-caption">Cargando pendientes…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col h-96">

            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <ClipboardList size={15} className="text-fg-muted" aria-hidden="true" />
                    <h3 className="text-[13px] font-semibold text-fg">Mis pendientes</h3>
                </div>
                {pendientes.length > 0 && (
                    <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {pendientes.length}
                    </span>
                )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-hidden relative">
                {pendientes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
                        <div className="w-10 h-10 rounded-md bg-success-soft border border-border grid place-items-center text-success">
                            <CheckCircle2 size={20} />
                        </div>
                        <p className="text-[14px] font-semibold text-fg">¡Todo al día!</p>
                        <p className="text-caption text-fg-secondary">No tienes tareas pendientes urgentes</p>
                    </div>
                ) : (
                    <div
                        className="overflow-y-auto h-full"
                        style={{
                            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                        }}
                    >
                        {/* Duplicar para efecto scroll continuo */}
                        <style>{`
                            @keyframes ticker-scroll {
                                0%   { transform: translateY(0); }
                                100% { transform: translateY(-50%); }
                            }
                            .ticker-inner {
                                animation: ticker-scroll ${pendientes.length * 3}s linear infinite;
                            }
                            .ticker-inner:hover { animation-play-state: paused; }
                        `}</style>
                        <div className="ticker-inner">
                            {[...pendientes, ...pendientes].map((p, idx) => (
                                <button
                                    key={`${p.id}-${idx}`}
                                    onClick={() => navigate(`/nna/expediente/${p.nnaId}`)}
                                    className="w-full text-left px-4 py-3 border-b border-border hover:bg-surface-muted transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <p className="text-[13px] font-semibold text-fg truncate">{p.titulo}</p>
                                                {p.dias > 0 && (
                                                    <span className="text-[11px] text-fg-muted flex-shrink-0">{p.dias}d</span>
                                                )}
                                            </div>
                                            <p className="text-[12px] text-fg-secondary truncate">{p.descripcion}</p>
                                        </div>
                                        <Badge tone={urgenciaTone(p.urgencia)} className="flex-shrink-0">
                                            {p.urgencia}
                                        </Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
