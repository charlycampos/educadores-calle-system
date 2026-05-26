/**
 * SEC · EducadorDashboard rediseñado
 * - Sin header propio (usa MainLayout)
 * - StatCard unificado desde components/ui/
 * - Tokens de color consolidados
 * - Sin shadow coloreada (shadow-blue-200 eliminada)
 * - EmptyState en alertas vacías
 */

import { useEffect, useState } from 'react';
import { AUTH_API_URL } from '../../config/api';
import { useAuthStore } from '../../store/auth.store';
import { Users, Target, CheckCircle2, AlertTriangle, TrendingUp, PlusCircle, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PendientesTicker } from '../../components/dashboard/PendientesTicker';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';

const ALERTA_TONE: Record<string, 'danger' | 'warning' | 'info' | 'neutral'> = {
    CRITICO: 'danger',
    ALTO:    'danger',
    MEDIO:   'warning',
    BAJO:    'info',
};

export const EducadorDashboard = () => {
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
            <div className="flex items-center justify-center h-64 text-fg-secondary text-body">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando panel de trabajo…
                </div>
            </div>
        );
    }

    const faseCount = (keyword: string) =>
        stats?.fases?.find((f: any) => f.fase.includes(keyword))?.cantidad ?? 0;

    return (
        <div className="space-y-8 max-w-7xl">

            {/* Título de sección */}
            <div>
                <h1 className="text-h1 text-fg">Mi Tablero</h1>
                <p className="text-body text-fg-secondary mt-1">
                    Hola, {user?.nombre?.split(' ')[0]} — aquí está el resumen de tu gestión.
                </p>
            </div>

            {/* ── Acciones rápidas ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                    to="/nna/nuevo"
                    className="bg-primary hover:bg-primary-hover text-primary-fg p-4 rounded-lg flex items-center justify-between group transition-colors"
                >
                    <div>
                        <p className="font-semibold text-[15px] leading-tight">Nuevo NNA</p>
                        <p className="text-[12px] text-primary-fg/75 mt-0.5">Registrar Ficha 03</p>
                    </div>
                    <PlusCircle size={28} className="opacity-75 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                </Link>

                <Link
                    to="/nna"
                    className="bg-surface hover:bg-surface-muted border border-border p-4 rounded-lg flex items-center justify-between group transition-colors"
                >
                    <div>
                        <p className="font-semibold text-[15px] text-fg leading-tight">Mis Casos</p>
                        <p className="text-[12px] text-fg-muted mt-0.5">Ver listado completo</p>
                    </div>
                    <Users size={24} className="text-fg-muted group-hover:text-primary transition-colors" aria-hidden="true" />
                </Link>

                <div
                    className="bg-surface-muted border border-border p-4 rounded-lg flex items-center justify-between opacity-50 cursor-not-allowed"
                    title="Disponible próximamente"
                    aria-disabled="true"
                >
                    <div>
                        <p className="font-semibold text-[15px] text-fg leading-tight">Diario de Campo</p>
                        <p className="text-[12px] text-fg-muted mt-0.5">Próximamente</p>
                    </div>
                    <ClipboardList size={24} className="text-fg-muted" aria-hidden="true" />
                </div>
            </div>

            {/* ── Alertas ── */}
            {stats?.alertas?.length > 0 && (
                <div>
                    <h2 className="text-h2 text-fg mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-warning" aria-hidden="true" />
                        Atención requerida
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stats.alertas.map((a: any, i: number) => (
                            <div
                                key={i}
                                className="bg-surface border border-border rounded-lg p-4 flex items-center gap-4"
                            >
                                <div className="text-[26px] font-bold text-fg w-12 h-12 rounded-md bg-surface-muted grid place-items-center flex-shrink-0">
                                    {a.cantidad}
                                </div>
                                <div className="min-w-0">
                                    <Badge tone={ALERTA_TONE[a.nivel] ?? 'neutral'} className="mb-1">{a.nivel}</Badge>
                                    <p className="text-[13px] font-semibold text-fg leading-tight">{a.tipo}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Stats + Pendientes ── */}
            <div>
                <h2 className="text-h2 text-fg mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" aria-hidden="true" />
                    Resumen de beneficiarios
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Stats */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                label="Casos activos"
                                value={stats?.totalCasos ?? 0}
                                icon={Users}
                                sub="Total asignados"
                            />
                            <StatCard
                                label="En diagnóstico (F1)"
                                value={faseCount('Diagnóstico')}
                                icon={Target}
                                sub="Pendiente Plan de Trabajo"
                            />
                            <StatCard
                                label="En intervención (F2)"
                                value={faseCount('Fase 2')}
                                icon={TrendingUp}
                                sub="Seguimiento activo"
                            />
                            <StatCard
                                label="Egreso / Cierre"
                                value={faseCount('Cierre') + faseCount('Egresados')}
                                icon={CheckCircle2}
                                sub="Histórico"
                            />
                        </div>

                        {/* KPI Eficiencia */}
                        <div className="bg-surface border border-border rounded-lg p-5">
                            <h3 className="text-[14px] font-semibold text-fg mb-4">Eficiencia en gestión de fichas</h3>
                            <div>
                                <div className="flex justify-between text-[13px] mb-2">
                                    <span className="text-fg-secondary">Diagnósticos completos (F04)</span>
                                    <span className="font-semibold text-fg">{stats?.kpis?.eficienciaDiagnostico ?? 0}%</span>
                                </div>
                                <div className="w-full bg-surface-muted rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all duration-700"
                                        style={{
                                            width: `${stats?.kpis?.eficienciaDiagnostico ?? 0}%`,
                                            background: (stats?.kpis?.eficienciaDiagnostico ?? 0) >= 80
                                                ? 'var(--color-success)'
                                                : 'var(--color-warning)',
                                        }}
                                    />
                                </div>
                                <p className="text-[11px] text-fg-muted mt-2">
                                    {(stats?.kpis?.eficienciaDiagnostico ?? 0) < 100
                                        ? 'Tienes casos sin diagnóstico social completo.'
                                        : '¡Excelente! Todos tus casos tienen diagnóstico.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ticker pendientes */}
                    <div>
                        <PendientesTicker />
                    </div>
                </div>
            </div>
        </div>
    );
};
