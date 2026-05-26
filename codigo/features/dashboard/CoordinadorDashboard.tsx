/**
 * SEC · CoordinadorDashboard rediseñado
 * - Sin header propio (usa MainLayout)
 * - StatCard unificado desde components/ui/
 * - Tokens consolidados
 * - ProgressBar con token colors
 * - Avatar con initials en lugar de logo "EC" hardcodeado
 */

import { useEffect, useState } from 'react';
import { AUTH_API_URL } from '../../config/api';
import { useAuthStore } from '../../store/auth.store';
import { Users, Target, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

const ALERTA_TONE: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
    CRITICO: 'danger', ALTO: 'danger', MEDIO: 'warning', BAJO: 'info',
};

const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    const pct = Math.round((value / (max || 1)) * 100);
    return (
        <div>
            <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-medium text-fg">{label}</span>
                <span className="text-fg-muted font-mono text-[12px]">{value} casos ({pct}%)</span>
            </div>
            <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

const FASE_COLORS: Record<string, string> = {
    '1': 'var(--color-warning)',
    '2': 'var(--color-primary)',
    '3': 'var(--color-success)',
};
const faseColor = (label: string) => {
    if (label.includes('1') || label.includes('Diagnóstico')) return FASE_COLORS['1'];
    if (label.includes('2') || label.includes('Intervención')) return FASE_COLORS['2'];
    if (label.includes('3') || label.includes('Cierre') || label.includes('Egreso')) return FASE_COLORS['3'];
    return 'var(--color-fg-muted)';
};

export const CoordinadorDashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats]   = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = useAuthStore.getState().token;
        fetch(`${AUTH_API_URL}/statistics/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setStats(data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-secondary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando panel de coordinación…
                </div>
            </div>
        );
    }

    const totalFases = stats?.fases?.reduce((a: number, f: any) => a + f.cantidad, 0) || 1;
    const maxCarga   = Math.max(...(stats?.cargaLaboral?.map((c: any) => c.cantidad) || [0]), 1);
    const faseCount  = (kw: string) => stats?.fases?.find((f: any) => f.fase.includes(kw))?.cantidad ?? 0;

    return (
        <div className="space-y-8 max-w-7xl">

            <div>
                <h1 className="text-h1 text-fg">Panel de Coordinación</h1>
                <p className="text-body text-fg-secondary mt-1">
                    {user?.nombre} — vista del equipo y cumplimiento.
                </p>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total casos"         value={stats?.totalCasos ?? 0}  icon={Users}        />
                <StatCard label="En diagnóstico (F1)" value={faseCount('Diagnóstico')} icon={Target}       />
                <StatCard label="En intervención (F2)"value={faseCount('Fase 2')}      icon={TrendingUp}   />
                <StatCard label="Egresados / Cierre"  value={faseCount('Cierre') + faseCount('Egresados')} icon={CheckCircle2} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Alertas + KPI ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Alertas */}
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                            <AlertTriangle size={15} className="text-warning" aria-hidden="true" />
                            Alertas de gestión
                        </h2>
                        {stats?.alertas?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {stats.alertas.map((a: any, i: number) => (
                                    <div key={i} className="bg-surface-muted border border-border rounded-lg p-4 flex flex-col justify-between min-h-[96px]">
                                        <Badge tone={ALERTA_TONE[a.nivel] ?? 'neutral'}>{a.nivel}</Badge>
                                        <div>
                                            <p className="text-[24px] font-bold text-fg leading-none mt-2">{a.cantidad}</p>
                                            <p className="text-[12px] text-fg-secondary leading-tight mt-1">{a.tipo}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-success-soft text-success rounded-lg px-4 py-3 text-[13px] font-medium">
                                <CheckCircle2 size={16} /> Sin alertas activas — todo en orden.
                            </div>
                        )}
                    </div>

                    {/* KPI eficiencia */}
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4">Eficiencia operativa</h2>
                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between text-[13px] mb-1.5">
                                    <span className="text-fg-secondary">Diagnósticos completos (F04)</span>
                                    <span className="font-semibold text-fg">{stats?.kpis?.eficienciaDiagnostico ?? 0}%</span>
                                </div>
                                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-2 rounded-full transition-all duration-700"
                                        style={{
                                            width: `${stats?.kpis?.eficienciaDiagnostico ?? 0}%`,
                                            background: (stats?.kpis?.eficienciaDiagnostico ?? 0) > 80
                                                ? 'var(--color-success)' : 'var(--color-warning)',
                                        }}
                                    />
                                </div>
                                <p className="text-[11px] text-fg-muted mt-1.5">Casos activos con F04 completo</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-[13px] mb-1.5">
                                    <span className="text-fg-secondary">Cobertura intervención (F2)</span>
                                    <span className="font-semibold text-fg">
                                        {Math.round((faseCount('Fase 2') / (stats?.totalCasos || 1)) * 100)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-primary transition-all duration-700"
                                        style={{ width: `${Math.round((faseCount('Fase 2') / (stats?.totalCasos || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Flujo + Carga ── */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4">Flujo de atención</h2>
                        <div className="space-y-4">
                            {(stats?.fases ?? []).map((f: any, i: number) => (
                                <ProgressBar key={i} label={f.fase} value={f.cantidad} max={totalFases} color={faseColor(f.fase)} />
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-lg p-5">
                        <h2 className="text-[14px] font-semibold text-fg mb-4">Carga por educador</h2>
                        <div className="space-y-3">
                            {(stats?.cargaLaboral ?? []).slice(0, 5).map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-primary-soft text-primary text-[10px] font-bold grid place-items-center flex-shrink-0">
                                        {item.educador.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-[12px] mb-1">
                                            <span className="font-medium text-fg truncate">{item.educador}</span>
                                            <span className="font-semibold text-fg-secondary flex-shrink-0 ml-2">{item.cantidad}</span>
                                        </div>
                                        <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded-full"
                                                style={{ width: `${(item.cantidad / maxCarga) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
