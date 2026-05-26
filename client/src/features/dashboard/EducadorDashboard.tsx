import { AUTH_API_URL } from '../../config/api';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Users, Target, CheckCircle2, AlertTriangle, TrendingUp, PlusCircle, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PendientesTicker } from '../../components/dashboard/PendientesTicker';
import clsx from 'clsx';

const API_URL = AUTH_API_URL;

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const StatCard = ({ title, value, subtext }: any) => (
    <div className="bg-surface border border-border rounded-lg px-[18px] py-4 flex flex-col gap-1.5">
        <div className="text-[12px] font-medium text-fg-secondary flex items-center gap-1.5">{title}</div>
        <div className="text-[26px] font-bold text-fg tracking-[-0.02em] leading-none">{value}</div>
        {subtext && <div className="text-[11px] text-fg-muted">{subtext}</div>}
    </div>
);

export const EducadorDashboard = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_URL}/statistics/dashboard`, {
                    headers: getHeaders()
                });

                if (!response.ok) throw new Error('Error fetching stats');
                const data = await response.json();
                setStats(data);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const getAlertColor = (nivel: string) => {
        switch (nivel) {
            case 'CRITICO': return 'bg-danger-soft border-danger/20 text-danger';
            case 'ALTO': return 'bg-warning-soft border-warning/20 text-warning';
            case 'MEDIO': return 'bg-info-soft border-info/20 text-info';
            default: return 'bg-surface-muted border-border text-fg-muted';
        }
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center text-fg-muted">Cargando tu tablero...</div>;
    }

    return (
        <div className="max-w-6xl w-full mx-auto">
            <div className="mb-6">
                <h1 className="text-[22px] font-semibold tracking-tight text-fg">Mi Tablero</h1>
                <p className="text-fg-secondary mt-1">Hola, {user?.nombre?.split(' ')[0]} — aquí está el resumen de tu gestión.</p>
            </div>

            {/* 1. ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-6">
                <Link to="/nna/nuevo" className="bg-primary text-primary-fg px-4 py-3.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-primary/90 transition-colors">
                    <div>
                        <p className="font-semibold text-[14px] leading-tight">Nuevo NNA</p>
                        <p className="text-[11px] opacity-75 mt-0.5">Registrar Ficha 03</p>
                    </div>
                    <PlusCircle size={26} className="opacity-80" />
                </Link>

                <Link to="/nna" className="bg-surface border border-border px-4 py-3.5 rounded-lg flex items-center justify-between cursor-pointer hover:bg-surface-muted transition-colors">
                    <div>
                        <p className="font-semibold text-[14px] text-fg leading-tight">Mis Casos</p>
                        <p className="text-[11px] text-fg-muted mt-0.5">Ver listado completo</p>
                    </div>
                    <Users size={22} className="text-fg-muted" />
                </Link>

                <div className="bg-surface-muted border border-border px-4 py-3.5 rounded-lg opacity-50 flex items-center justify-between cursor-default">
                    <div>
                        <p className="font-semibold text-[14px] text-fg leading-tight">Diario de Campo</p>
                        <p className="text-[11px] text-fg-muted mt-0.5">Próximamente</p>
                    </div>
                    <ClipboardList size={22} className="text-fg-muted" />
                </div>
            </div>

            {/* 2. ALERTAS PERSONALES */}
            {stats?.alertas?.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-[14px] font-semibold text-fg mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="text-warning" size={16} />
                        Atención Requerida
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {stats.alertas.map((alerta: any, i: number) => (
                            <div key={i} className={clsx("p-3 rounded-lg border flex items-center gap-3.5", getAlertColor(alerta.nivel))}>
                                <div className="text-[20px] font-bold bg-surface/60 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                                    {alerta.cantidad}
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-0.5">{alerta.nivel}</div>
                                    <h4 className="font-semibold text-[13px] leading-tight">{alerta.tipo}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. RESUMEN DE MIS CASOS Y PENDIENTES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Columna Izquierda: Stats */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted mb-3">Resumen de beneficiarios</p>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                            <StatCard
                                title="Casos activos"
                                value={stats?.totalCasos || 0}
                                subtext="Total asignados"
                            />
                            <StatCard
                                title="En diagnóstico"
                                value={stats?.fases?.find((f: any) => f.fase.includes('Diagnóstico'))?.cantidad || 0}
                                subtext="Pendiente Plan"
                            />
                            <StatCard
                                title="Intervención"
                                value={stats?.fases?.find((f: any) => f.fase.includes('Fase 2'))?.cantidad || 0}
                                subtext="Seguimiento activo"
                            />
                            <StatCard
                                title="Egreso / Cierre"
                                value={stats?.fases?.find((f: any) => f.fase.includes('Cierre') || f.fase.includes('Egresados'))?.cantidad || 0}
                                subtext="Histórico"
                            />
                        </div>
                    </div>

                    {/* KPI Eficiencia */}
                    <div className="bg-surface border border-border p-5 rounded-lg">
                        <p className="text-[14px] font-semibold text-fg mb-3.5">Eficiencia en gestión de fichas</p>
                        <div className="flex justify-between items-center text-[13px] mb-1.5">
                            <span className="text-fg-secondary">Diagnósticos completos (F04)</span>
                            <span className="font-semibold text-fg">{stats?.kpis?.eficienciaDiagnostico || 0}%</span>
                        </div>
                        <div className="h-[6px] bg-surface-muted rounded-full overflow-hidden mb-2">
                            <div 
                                className={`h-full rounded-full transition-all ${stats?.kpis?.eficienciaDiagnostico >= 80 ? 'bg-success' : 'bg-warning'}`} 
                                style={{ width: `${stats?.kpis?.eficienciaDiagnostico || 0}%` }}
                            />
                        </div>
                        <p className="text-[11px] text-fg-muted">
                            {stats?.kpis?.eficienciaDiagnostico < 100 ? 'Tienes casos sin diagnóstico social completo.' : '¡Excelente! Todos tus casos tienen diagnóstico.'}
                        </p>
                    </div>
                </div>

                {/* Columna Derecha: Ticker de Pendientes */}
                <div>
                    <PendientesTicker />
                </div>
            </div>
        </div>
    );
};

