import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AUTH_API_URL } from '../../config/api';
import {
    Users, BarChart3, AlertCircle, Target,
    TrendingUp, CheckCircle2, Clock, Bell,
    ArrowRight, RefreshCw, UserCheck, FileWarning,
    ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Tipos ─────────────────────────────────────────────────────────────────────
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

const NIVEL_COLOR: Record<string, { bg: string; text: string; icon: string }> = {
    ALTO:    { bg: 'bg-red-50',   text: 'text-red-700',   icon: 'text-red-500' },
    MEDIO:   { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    CRITICO: { bg: 'bg-rose-50',  text: 'text-rose-800',  icon: 'text-rose-600' },
    BAJO:    { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
};

const PERFIL_COLOR: Record<string, string> = {
    TRABAJO_EN_CALLE:    '#6366f1',
    MENDICIDAD:          '#f59e0b',
    VIDA_EN_CALLE:       '#ef4444',
    EXPLOTACION_SEXUAL:  '#8b5cf6',
    EN_EVALUACION:       '#94a3b8',
};

// ── Subcomponentes ────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, colorClass, sub, highlight }: any) => (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4 ${highlight ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'}`}>
        <div className={`p-3 rounded-xl flex-shrink-0 ${colorClass}`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
                {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

const GaugeBar = ({ label, value, max, color }: any) => {
    const pct = Math.round((value / (max || 1)) * 100);
    return (
        <div>
            <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-gray-700 truncate max-w-[160px]" title={label}>{label}</span>
                <span className="text-gray-400 font-mono text-xs flex-shrink-0 ml-2">{value} casos</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color ?? '#6366f1' }} />
            </div>
        </div>
    );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const AdminSedeDashboard = () => {
    const { token, user } = useAuthStore();
    const [stats, setStats] = useState<SedeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${AUTH_API_URL}/statistics/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('AdminSede fetchStats error:', e);
        } finally {
            setLoading(false);
            setLastRefresh(new Date());
        }
    };

    useEffect(() => { fetchStats(); }, [token]);

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">Cargando métricas de sede...</p>
            </div>
        </div>
    );

    const totalCasos = stats?.totalCasos ?? 0;
    const maxCarga = Math.max(...(stats?.cargaLaboral.map(c => c.cantidad) ?? [1]), 1);

    // Casos activos (sin cerrados)
    const casosActivos = (stats?.fases ?? [])
        .filter(f => !f.fase.toLowerCase().includes('egresado'))
        .reduce((a, f) => a + f.cantidad, 0);

    const alertasTotal = (stats?.alertas ?? []).reduce((a, al) => a + al.cantidad, 0);

    return (
        <div className="min-h-screen bg-gray-50/50">

            {/* ── Header ── */}
            <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ClipboardList size={16} className="text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                Vista Sede · {user?.zona ?? 'Sin sede asignada'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900">Dashboard de Sede</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Supervisión operativa y calidad de la intervención</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-400 hidden sm:block">
                            Actualizado: {lastRefresh.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button onClick={fetchStats}
                            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-all">
                            <RefreshCw size={14} /> Actualizar
                        </button>
                        <Link to="/nna"
                            className="flex items-center gap-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm">
                            Ver Padrón <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* ── KPIs ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Casos en Sede"    value={totalCasos}                            icon={BarChart3}   colorClass="bg-indigo-50 text-indigo-600"   sub="Todos los estados" highlight />
                    <StatCard label="Casos Activos"           value={casosActivos}                         icon={Target}      colorClass="bg-emerald-50 text-emerald-600" sub="En proceso" />
                    <StatCard label="Alertas de Calidad"      value={alertasTotal}                         icon={Bell}        colorClass="bg-amber-50 text-amber-600"     sub="Ver detalle abajo" />
                    <StatCard label="Eficiencia Diagnóstico"  value={`${stats?.kpis?.eficienciaDiagnostico ?? 0}%`} icon={UserCheck} colorClass="bg-teal-50 text-teal-600" sub="F04 completados vs activos" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── Distribución por fase ── */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <TrendingUp size={16} className="text-indigo-600" />
                            <h3 className="font-bold text-gray-900">Casos por Fase</h3>
                        </div>
                        {stats?.fases && stats.fases.length > 0 ? (
                            <div className="space-y-4">
                                {stats.fases.map((f, i) => {
                                    const total = stats.fases.reduce((a, ff) => a + ff.cantidad, 0) || 1;
                                    const pct = Math.round((f.cantidad / total) * 100);
                                    return (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="font-semibold text-gray-700">{f.fase}</span>
                                                <span className="text-xs text-gray-400 font-mono">{f.cantidad} · {pct}%</span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: f.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState icon={BarChart3} text="Sin datos de fases" />
                        )}
                    </div>

                    {/* ── Distribución por perfil del NNA ── */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Users size={16} className="text-purple-600" />
                            <h3 className="font-bold text-gray-900">Distribución por Perfil del NNA</h3>
                        </div>
                        {stats?.kpis?.distribucionPerfil && stats.kpis.distribucionPerfil.length > 0 ? (
                            <div className="space-y-4">
                                {stats.kpis.distribucionPerfil.map((p, i) => (
                                    <GaugeBar
                                        key={i}
                                        label={p.nombre.replace(/_/g, ' ')}
                                        value={p.cantidad}
                                        max={Math.max(...stats.kpis.distribucionPerfil.map(x => x.cantidad))}
                                        color={PERFIL_COLOR[p.nombre] ?? '#6366f1'}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={Users} text="Sin datos de perfil" />
                        )}
                    </div>
                </div>

                {/* ── Alertas de calidad ── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <FileWarning size={16} className="text-amber-500" />
                        <h3 className="font-bold text-gray-900">Alertas de Calidad del Proceso</h3>
                        <span className="ml-auto text-xs text-gray-400">Requieren seguimiento del equipo</span>
                    </div>
                    {stats?.alertas && stats.alertas.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {stats.alertas.map((a, i) => {
                                const nc = NIVEL_COLOR[a.nivel] ?? { bg: 'bg-gray-50', text: 'text-gray-600', icon: 'text-gray-400' };
                                return (
                                    <div key={i} className={`rounded-xl p-4 ${nc.bg} flex flex-col gap-1`}>
                                        <div className="flex items-center gap-1.5">
                                            <AlertCircle size={13} className={nc.icon} />
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${nc.text}`}>{a.nivel}</span>
                                        </div>
                                        <p className={`text-sm font-semibold ${nc.text} leading-tight`}>{a.tipo}</p>
                                        <p className={`text-3xl font-black ${nc.text}`}>{a.cantidad}</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                            <CheckCircle2 size={20} className="text-green-500" />
                            <p className="text-sm font-semibold text-green-700">Sin alertas activas. El equipo está al día.</p>
                        </div>
                    )}
                </div>

                {/* ── Carga laboral ── */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <UserCheck size={16} className="text-indigo-500" />
                            <h3 className="font-bold text-gray-900">Carga Laboral del Equipo</h3>
                        </div>
                        <Link to="/usuarios" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            Administrar equipo <ArrowRight size={12} />
                        </Link>
                    </div>
                    {stats?.cargaLaboral && stats.cargaLaboral.length > 0 ? (
                        <div className="space-y-3">
                            {[...stats.cargaLaboral].sort((a, b) => b.cantidad - a.cantidad).map((c, i) => (
                                <GaugeBar key={i} label={c.educador} value={c.cantidad} max={maxCarga} color="#6366f1" />
                            ))}
                        </div>
                    ) : (
                        <EmptyState icon={Clock} text="Sin datos de carga laboral" />
                    )}
                </div>

                {/* ── Accesos rápidos ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Gestión de Casos (NNA)', desc: 'Ver padrón completo de la sede',       to: '/nna',      icon: Users },
                        { label: 'Talleres Socioeducativos', desc: 'Planificación y seguimiento grupal', to: '/talleres', icon: ClipboardList },
                        { label: 'Gestión de Usuarios',   desc: 'Equipo y accesos de la sede',          to: '/usuarios', icon: UserCheck },
                    ].map((item, i) => (
                        <Link key={i} to={item.to}
                            className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    <item.icon size={16} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{item.label}</p>
                                    <p className="text-xs text-gray-400">{item.desc}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
};

// ── Helper ────────────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, text }: any) => (
    <div className="flex flex-col items-center justify-center h-28 text-gray-300">
        <Icon size={28} />
        <p className="text-sm mt-2">{text}</p>
    </div>
);
