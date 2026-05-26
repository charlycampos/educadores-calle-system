/**
 * SEC · AdminNacionalDashboard rediseñado
 * - Sin header propio (usa MainLayout)
 * - StatCard + Badge unificados
 * - Tokens consolidados — sin emerald, rose, purple, amber
 * - Barras de carga limpias con token primary
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AUTH_API_URL } from '../../config/api';
import { Users, BarChart3, AlertCircle, Building2, TrendingUp, CheckCircle2, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

interface NacionalStats {
    totalCasos: number; casosActivos: number; nnaRegistrados: number; alertasCriticas: number;
    sedesActivas: number; casosPorSede: Array<{ sede: string; count: number }>;
    fases: Array<{ fase: string; cantidad: number; color: string }>;
    alertas: Array<{ tipo: string; cantidad: number; nivel: string }>;
}

const ALERTA_TONE: Record<string, 'danger' | 'warning' | 'info'> = {
    ALTO: 'danger', CRITICO: 'danger', MEDIO: 'warning', BAJO: 'info',
};

export const AdminNacionalDashboard = () => {
    const { token } = useAuthStore();
    const [stats, setStats]   = useState<NacionalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${AUTH_API_URL}/statistics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const d = await res.json();
                setStats({
                    totalCasos:      d.totalCasos ?? 0,
                    casosActivos:    (d.fases ?? []).filter((f: any) => !f.fase.includes('Egresado')).reduce((a: number, f: any) => a + f.cantidad, 0),
                    nnaRegistrados:  d.totalCasos ?? 0,
                    alertasCriticas: (d.alertas ?? []).filter((a: any) => ['CRITICO','ALTO'].includes(a.nivel)).reduce((a: number, al: any) => a + al.cantidad, 0),
                    sedesActivas:    d.cargaLaboral?.length ?? 0,
                    casosPorSede:    (d.cargaLaboral ?? []).map((c: any) => ({ sede: c.educador, count: c.cantidad })),
                    fases:           d.fases ?? [],
                    alertas:         d.alertas ?? [],
                });
            }
        } catch { /* silencioso */ }
        finally { setLoading(false); setLastRefresh(new Date()); }
    };

    useEffect(() => { fetchStats(); }, [token]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-secondary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando métricas nacionales…
                </div>
            </div>
        );
    }

    const maxSede   = Math.max(...(stats?.casosPorSede.map(s => s.count) ?? [1]), 1);
    const totalFases = stats?.fases?.reduce((a, f) => a + f.cantidad, 0) || 1;

    return (
        <div className="space-y-8 max-w-7xl">

            {/* Encabezado */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <p className="text-micro text-primary mb-1">Vista Nacional · DGNNA / INABIF</p>
                    <h1 className="text-h1 text-fg">Dashboard Nacional</h1>
                    <p className="text-body text-fg-secondary mt-1">
                        Consolidado del Programa Educadores de Calle ·{' '}
                        {lastRefresh.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchStats} className="flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary hover:text-fg border border-border hover:bg-surface-muted px-3 py-2 rounded-md transition-colors">
                        <RefreshCw size={13} /> Actualizar
                    </button>
                    <Link to="/nna" className="flex items-center gap-1.5 text-[13px] font-medium bg-primary hover:bg-primary-hover text-primary-fg px-3 py-2 rounded-md transition-colors">
                        Ver padrón <ArrowRight size={13} />
                    </Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="NNA registrados"    value={stats?.nnaRegistrados ?? 0}  icon={Users}      sub="En todo el sistema" />
                <StatCard label="Casos activos"      value={stats?.casosActivos ?? 0}    icon={BarChart3}  sub="Sin incluir cerrados" />
                <StatCard label="Alertas críticas"   value={stats?.alertasCriticas ?? 0} icon={AlertCircle} sub="Requieren atención" />
                <StatCard label="Equipos con casos"  value={stats?.sedesActivas ?? 0}    icon={Building2}  sub="Educadores activos" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Fases */}
                <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
                    <h2 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                        <TrendingUp size={15} className="text-primary" /> Distribución por fase
                    </h2>
                    {stats?.fases?.length ? (
                        <div className="space-y-4">
                            {stats.fases.map((f, i) => {
                                const pct = Math.round((f.cantidad / totalFases) * 100);
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between text-[13px] mb-1.5">
                                            <span className="font-medium text-fg">{f.fase}</span>
                                            <span className="text-fg-muted font-mono text-[12px]">{f.cantidad} · {pct}%</span>
                                        </div>
                                        <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${pct}%`, backgroundColor: f.color || 'var(--color-primary)' }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-fg-muted gap-2">
                            <BarChart3 size={28} /> <p className="text-[12px]">Sin datos de fases</p>
                        </div>
                    )}
                </div>

                {/* Alertas */}
                <div className="bg-surface border border-border rounded-lg p-5">
                    <h2 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                        <AlertCircle size={15} className="text-danger" /> Alertas de calidad
                    </h2>
                    {stats?.alertas?.length ? (
                        <div className="space-y-2">
                            {stats.alertas.map((a, i) => (
                                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-md border border-border bg-surface-muted">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Badge tone={ALERTA_TONE[a.nivel] ?? 'neutral'}>{a.nivel}</Badge>
                                        <span className="text-[12px] font-medium text-fg truncate">{a.tipo}</span>
                                    </div>
                                    <span className="text-[20px] font-bold text-fg flex-shrink-0 ml-2">{a.cantidad}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24 text-success gap-2 bg-success-soft rounded-lg">
                            <CheckCircle2 size={22} /> <p className="text-[12px] font-medium">Sin alertas activas</p>
                        </div>
                    )}
                    <p className="text-[11px] text-fg-muted mt-4">Calculadas según el protocolo SEC.</p>
                </div>
            </div>

            {/* Carga laboral */}
            <div className="bg-surface border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-semibold text-fg">Carga de casos por educador</h2>
                    <Link to="/usuarios" className="text-[12px] text-primary font-medium hover:underline flex items-center gap-1">
                        Gestionar equipo <ArrowRight size={11} />
                    </Link>
                </div>
                {stats?.casosPorSede?.length ? (
                    <div className="space-y-3">
                        {[...stats.casosPorSede].sort((a, b) => b.count - a.count).map((s, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-40 text-[13px] font-medium text-fg truncate" title={s.sede}>{s.sede}</div>
                                <div className="flex-1 h-2 bg-surface-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-700"
                                        style={{ width: `${(s.count / maxSede) * 100}%` }} />
                                </div>
                                <div className="w-8 text-right text-[13px] font-semibold text-fg">{s.count}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-20 text-fg-muted gap-2">
                        <Clock size={22} /> <p className="text-[12px]">Sin datos de carga</p>
                    </div>
                )}
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Padrón de NNA', desc: 'Ver todos los casos activos', to: '/nna' },
                    { label: 'Gestión de Usuarios', desc: 'Administrar equipo y accesos', to: '/usuarios' },
                    { label: 'Talleres', desc: 'Seguimiento de talleres grupales', to: '/talleres' },
                ].map((item, i) => (
                    <Link key={i} to={item.to}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-surface hover:bg-surface-muted hover:border-primary/30 transition-all group">
                        <div>
                            <p className="font-semibold text-[14px] text-fg">{item.label}</p>
                            <p className="text-[12px] text-fg-muted mt-0.5">{item.desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-fg-muted group-hover:text-primary transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
};
