import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { NNA_API_URL, ROLES } from '../../config/api';
import {
    Users, BarChart3, AlertCircle, Building2,
    TrendingUp, ShieldAlert, CheckCircle2, Clock,
    MapPin, ArrowRight, RefreshCw, ChevronRight,
    Check, X, Search, FileText, ArrowLeftRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface SedeStats {
    id: number;
    nombre: string;
    codigo: string;
    totalNna: number;
    fases: {
        captacion: number;
        diagnostico: number;
        intervencion: number;
        preEgreso: number;
    };
    alertas: number;
    estado: 'verde' | 'amarillo' | 'rojo';
}

interface NacionalStats {
    kpis: {
        totalNna: number;
        sedesOperativas: number;
        alertasCriticas: number;
        egresadosMes: number;
    };
    sedes: SedeStats[];
    regiones: Array<{ region: string; count: number }>;
    alertas: Array<{ tipo: string; cantidad: number; nivel: string }>;
    fasesNacional: {
        captacion: number;
        diagnostico: number;
        intervencion: number;
        preEgreso: number;
    };
}

const NIVEL_COLOR: Record<string, string> = {
    ALTO:    'bg-orange-50 text-orange-700 border-orange-200',
    MEDIO:   'bg-amber-50 text-amber-700 border-amber-200',
    CRITICO: 'bg-red-50 text-red-800 border-red-300',
    BAJO:    'bg-green-50 text-green-700 border-green-200',
};

// ── Componentes reutilizables ─────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, colorClass, sub }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${colorClass}`}>
            <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-gray-900 leading-tight">
                {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </p>
            {sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</p>}
        </div>
    </div>
);

const SedeCard = ({ sede }: { sede: SedeStats }) => {
    const total = (sede.fases.captacion + sede.fases.diagnostico + sede.fases.intervencion + sede.fases.preEgreso) || 1;
    
    const statusColors = {
        verde: { border: 'border-green-200', bg: 'bg-green-50', dot: 'bg-green-500' },
        amarillo: { border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-500' },
        rojo: { border: 'border-red-200', bg: 'bg-red-50', dot: 'bg-red-500' }
    };

    const config = statusColors[sede.estado] || statusColors.verde;

    return (
        <div className={`p-3 rounded-xl border ${config.border} ${config.bg} relative transition-all hover:shadow-md`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-[11px] font-bold text-gray-900 leading-tight">{sede.nombre}</h4>
                    <span className="text-[9px] font-mono text-gray-400 uppercase">{sede.codigo}</span>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shadow-sm`} />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div>
                    <span className="text-[13px] font-black text-gray-900 block">{sede.totalNna}</span>
                    <span className="text-[9px] text-gray-500 uppercase">NNA</span>
                </div>
                <div>
                    <span className="text-[13px] font-black text-gray-900 block">{Math.ceil(sede.totalNna / 15)}</span>
                    <span className="text-[9px] text-gray-500 uppercase">Prof.</span>
                </div>
                <div>
                    <span className="text-[13px] font-black text-gray-900 block">{sede.alertas}</span>
                    <span className="text-[9px] text-gray-500 uppercase">{sede.estado === 'verde' ? '✅' : '⚠️'}</span>
                </div>
            </div>

            <div className="flex h-1 rounded-full overflow-hidden bg-gray-200/50">
                <div className="bg-gray-400" style={{ width: `${(sede.fases.captacion / total) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(sede.fases.diagnostico / total) * 100}%` }} />
                <div className="bg-blue-400" style={{ width: `${(sede.fases.intervencion / total) * 100}%` }} />
                <div className="bg-green-400" style={{ width: `${(sede.fases.preEgreso / total) * 100}%` }} />
            </div>
        </div>
    );
};

// ── Dashboard principal ───────────────────────────────────────────────────────
export const AdminNacionalDashboard = () => {
    const { token } = useAuthStore();
    const [stats, setStats] = useState<NacionalStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${NNA_API_URL}/dashboard-nacional/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error('Error fetchStats nacional:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        fetchStats(); 
    }, [token]);

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Sincronizando datos nacionales...</p>
            </div>
        </div>
    );

    const maxRegion = Math.max(...(stats?.regiones.map(r => r.count) ?? [1]), 1);

    return (
        <div className="min-h-screen bg-[#f1f5f9] pb-10">

            {/* ── Header Estilo PEC ── */}
            <div className="bg-[#1e40af] text-white px-6 py-6 shadow-lg">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Dashboard Nacional · DGNNA</h1>
                        <p className="text-blue-100 text-xs font-medium opacity-80 mt-1">Programa Educadores de Calle · Vista consolidada por sede</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/5 text-center min-w-[80px]">
                            <span className="block text-lg font-black leading-none">{stats?.sedes.length}</span>
                            <span className="text-[9px] font-bold opacity-60 uppercase">Sedes</span>
                        </div>
                        <button onClick={fetchStats} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-lg transition-all border border-white/5">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-4 space-y-4">
                
                {/* ── KPIs ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard label="NNA en Programa" value={stats?.kpis.totalNna} icon={Users} colorClass="bg-blue-50 text-blue-600" sub="Total nacional activos" />
                    <KpiCard label="Sedes Operativas" value={stats?.kpis.sedesOperativas} icon={Building2} colorClass="bg-green-50 text-green-600" sub="Con casos activos" />
                    <KpiCard label="Alertas Críticas" value={stats?.kpis.alertasCriticas} icon={ShieldAlert} colorClass="bg-red-50 text-red-600" sub="Requieren acción inmediata" />
                    <KpiCard label="Egresados (mes)" value={stats?.kpis.egresadosMes} icon={CheckCircle2} colorClass="bg-purple-50 text-purple-600" sub="NNA egresados este mes" />
                </div>

                {/* ── Main Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    
                    {/* ── Semáforo de Sedes ── */}
                    <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Estado de Sedes</h3>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> OK</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> ALERTAS</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> CRÍTICO</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {stats?.sedes.slice(0, 9).map(sede => (
                                <SedeCard key={sede.id} sede={sede} />
                            ))}
                            {stats && stats.sedes.length > 9 && (
                                <div className="border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center p-6 text-gray-400 hover:border-blue-200 hover:text-blue-400 transition-all cursor-pointer group">
                                    <span className="text-xs font-bold uppercase tracking-widest">+ {stats.sedes.length - 9} sedes adicionales</span>
                                    <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </div>

                        {/* Leyenda Mini-bar */}
                        <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap gap-x-6 gap-y-2">
                            {[
                                { label: 'Captación', color: 'bg-gray-400' },
                                { label: 'Diagnóstico', color: 'bg-amber-400' },
                                { label: 'Intervención', color: 'bg-blue-400' },
                                { label: 'Pre-egreso', color: 'bg-green-400' },
                            ].map(l => (
                                <div key={l.label} className="flex items-center gap-2">
                                    <div className={`w-3 h-1.5 rounded-sm ${l.color}`} />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Ranking ── */}
                    <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp size={16} className="text-purple-600" />
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Ranking NNA Activos</h3>
                        </div>
                        <div className="space-y-4">
                            {stats?.sedes.slice(0, 8).map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3">
                                    <span className="text-xs font-black text-gray-300 w-4 text-center">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-[11px] font-bold text-gray-800 truncate pr-2">{s.nombre}</span>
                                            <span className="text-[11px] font-black text-blue-600">{s.totalNna}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${(s.totalNna / (stats.sedes[0]?.totalNna || 1)) * 100}%` }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Bottom Row ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Regiones */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">NNA por Región</h3>
                        <div className="space-y-3">
                            {stats?.regiones.map((r, i) => (
                                <div key={r.region} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-sm ${['bg-blue-500', 'bg-amber-500', 'bg-green-500', 'bg-purple-500'][i % 4]}`} />
                                        <span className="text-[11px] font-bold text-gray-600">{r.region}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-black text-gray-900">{r.count}</span>
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">NNA</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribución Fases */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Distribución Fase Nacional</h3>
                        <div className="space-y-4">
                            {[
                                { label: 'Captación', count: stats?.fasesNacional.captacion, color: 'bg-gray-400' },
                                { label: 'Diagnóstico', count: stats?.fasesNacional.diagnostico, color: 'bg-amber-400' },
                                { label: 'Intervención', count: stats?.fasesNacional.intervencion, color: 'bg-blue-400' },
                                { label: 'Pre-egreso', count: stats?.fasesNacional.preEgreso, color: 'bg-green-400' },
                            ].map(f => (
                                <div key={f.label} className="flex items-center gap-3">
                                    <div className={`w-1.5 h-6 rounded-full ${f.color}`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-bold text-gray-600">{f.label}</span>
                                            <span className="text-sm font-black text-gray-900">{f.count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Alertas */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alertas Nacionales</h3>
                            <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full">QA MOTOR</span>
                        </div>
                        <div className="space-y-2">
                            {stats?.alertas.map((a, i) => (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${NIVEL_COLOR[a.nivel] || 'bg-gray-50 border-gray-100'}`}>
                                    <span className="text-[11px] font-bold uppercase">{a.tipo}</span>
                                    <span className="text-lg font-black">{a.cantidad}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                            Las alertas críticas se consolidan de todas las sedes. Estas métricas impactan en el cumplimiento del protocolo nacional.
                        </p>
                    </div>
                </div>

                {/* ── Accesos Rápidos Estilo PEC ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Padrón Nacional', icon: Users, to: '/nna' },
                        { label: 'Mapa de Sedes', icon: MapPin, to: '/sedes' },
                        { label: 'Reportes Excel', icon: BarChart3, to: '/reportes' },
                        { label: 'Usuarios/Sedes', icon: Building2, to: '/usuarios' },
                    ].map(btn => (
                        <Link key={btn.label} to={btn.to} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:shadow-md transition-all group">
                            <btn.icon size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-900">{btn.label}</span>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    );
};
