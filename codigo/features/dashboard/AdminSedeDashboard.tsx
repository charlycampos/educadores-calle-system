/**
 * SEC · AdminSedeDashboard rediseñado
 * - Sin header propio (usa MainLayout)
 * - StatCard + Badge unificados
 * - Tokens consolidados — sin emerald, rose, amber, purple
 * - Barras de carga con colores semánticos
 * - Gauge bars limpias
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AUTH_API_URL } from '../../config/api';
import {
    Users, BarChart3, AlertCircle, Target,
    TrendingUp, CheckCircle2, Clock, Bell,
    ArrowRight, RefreshCw, UserCheck, ClipboardList,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

interface SedeStats {
    totalCasos: number;
    fases: Array<{ fase: string; cantidad: number; color: string }>;
    cargaLaboral: Array<{ educador: string; cantidad: number }>;
    alertas: Array<{ tipo: string; cantidad: number; nivel: string }>;
    kpis: {
        eficienciaDiagnostico: number;
        distribucionPerfil: Array<{ nombre: string; cantidad: number }>;
    };
}

const ALERTA_TONE: Record<string, 'danger' | 'warning' | 'info'> = {
    ALTO: 'danger', CRITICO: 'danger', MEDIO: 'warning', BAJO: 'info',
};

const GaugeBar = ({ label, value, max }: { label: string; value: number; max: number }) => {
    const pct = Math.round((value / (max || 1)) * 100);
    return (
        <div>
            <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-medium text-fg truncate max-w-[160px]">{label}</span>
                <span className="text-fg-muted font-mono text-[12px] flex-shrink-0 ml-2">{value}</span>
            </div>
            <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
};

export const AdminSedeDashboard = () => {
    const { token } = useAuthStore();
    const [stats, setStats] = useState<SedeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${AUTH_API_URL}/statistics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) setStats(await res.json());
        } catch { /* silencioso */ }
        finally { setLoading(false); setLastRefresh(new Date()); }
    };

    useEffect(() => { fetchStats(); }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-secondary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando métricas de sede…
                </div>
            </div>
        );
    }

    const maxCarga  = Math.max(...(stats?.cargaLaboral?.map(c => c.cantidad) ?? [1]), 1);
    const totalFases = stats?.fases?.reduce((a, f) => a + f.cantidad, 0) || 1;

    return (
        <div className="space-y-8 max-w-7xl">

            {/* Encabezado */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-micro text-primary mb-1">Dashboard de Sede · DGNNA / INABIF</p>
                    <h1 className="text-h1 text-fg">Resumen operativo</h1>
                    <p className="text-body text-fg-secondary mt-1">
                        Actualizado: {lastRefresh.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary hover:text-fg border border-border hover:bg-surface-muted px-3 py-2 rounded-md transition-colors"
                    >
                        <RefreshCw size={13} aria-hidden="true" /> Actualizar
                    </button>
                    <Link
                        to="/nna"
                        className="flex items-center gap-1.5 text-[13px] font-medium bg-primary hover:bg-primary-hover text-primary-fg px-3 py-2 rounded-md transition-colors"
                    >
                        Ver padrón <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total NNA"          value={stats?.totalCasos ?? 0}     icon={Users}        />
                <StatCard label="Casos activos"      value={stats?.fases?.filter(f => !f.fase.includes('Egresad')).reduce((a,f)=>a+f.cantidad,0) ?? 0} icon={BarChart3} />
                <StatCard label="Alertas críticas"   value={stats?.alertas?.filter(a => ['CRITICO','ALTO'].includes(a.nivel)).reduce((a,al)=>a+al.cantidad,0) ?? 0} icon={AlertCircle} />
                <StatCard label="Educadores activos" value={stats?.cargaLaboral?.length ?? 0} icon={UserCheck} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Fases + Alertas */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Distribución por fases */}
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                            <TrendingUp size={15} className="text-primary" aria-hidden="true" />
                            Distribución por fase de intervención
                        </h2>
                        <div className="space-y-4">
                            {(stats?.fases ?? []).map((f, i) => {
                                const pct = Math.round((f.cantidad / totalFases) * 100);
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-[13px] mb-1.5">
                                            <span className="font-medium text-fg">{f.fase}</span>
                                            <span className="text-fg-muted font-mono text-[12px]">{f.cantidad} · {pct}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: f.color || 'var(--color-primary)' }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alertas */}
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                            <Bell size={15} className="text-warning" aria-hidden="true" />
                            Alertas de calidad (QA)
                        </h2>
                        {stats?.alertas && stats.alertas.length > 0 ? (
                            <div className="space-y-2">
                                {stats.alertas.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border bg-surface-muted">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <Badge tone={ALERTA_TONE[a.nivel] ?? 'neutral'}>{a.nivel}</Badge>
                                            <span className="text-[13px] font-medium text-fg truncate">{a.tipo}</span>
                                        </div>
                                        <span className="text-[20px] font-bold text-fg flex-shrink-0 ml-3">{a.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2.5 bg-success-soft text-success rounded-lg px-4 py-3 text-[13px] font-medium">
                                <CheckCircle2 size={15} /> Sin alertas activas
                            </div>
                        )}
                        <p className="text-[11px] text-fg-muted mt-4">Calculadas según el protocolo SEC.</p>
                    </div>
                </div>

                {/* Carga laboral */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[14px] font-semibold text-fg">Carga por educador</h2>
                        <Link to="/usuarios" className="text-[12px] text-primary font-medium hover:underline flex items-center gap-1">
                            Gestionar <ArrowRight size={11} />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {[...(stats?.cargaLaboral ?? [])].sort((a, b) => b.cantidad - a.cantidad).map((s, i) => (
                            <GaugeBar key={i} label={s.educador} value={s.cantidad} max={maxCarga} />
                        ))}
                        {!stats?.cargaLaboral?.length && (
                            <div className="flex flex-col items-center justify-center h-24 text-fg-muted gap-2">
                                <Clock size={24} />
                                <p className="text-[12px]">Sin datos de carga</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Padrón de NNA',       desc: 'Ver todos los casos activos', to: '/nna' },
                    { label: 'Gestión de Usuarios',  desc: 'Administrar equipo y accesos', to: '/usuarios' },
                    { label: 'Talleres',             desc: 'Seguimiento de talleres', to: '/talleres' },
                ].map((item, i) => (
                    <Link
                        key={i}
                        to={item.to}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:bg-surface-muted hover:border-primary/30 transition-all group"
                    >
                        <div>
                            <p className="font-semibold text-[14px] text-fg">{item.label}</p>
                            <p className="text-[12px] text-fg-muted mt-0.5">{item.desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-fg-muted group-hover:text-primary transition-colors" aria-hidden="true" />
                    </Link>
                ))}
            </div>
        </div>
    );
};
