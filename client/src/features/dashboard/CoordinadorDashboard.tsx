import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../config/api';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { LogOut, Users, Target, CheckCircle2, AlertTriangle, TrendingUp, Check, X, Clock, ArrowRightCircle } from 'lucide-react';
import { getDerivacionesPendientes, responderDerivacion } from '../../api/derivacion.api';

const API_URL = AUTH_API_URL;

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

const StatCard = ({ title, value, color, icon: Icon, subtext }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start justify-between">
        <div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('600', '50').replace('700', '50')}`}>
            <Icon className={color} size={24} />
        </div>
    </div>
);

const ProgressBar = ({ label, value, max, color }: any) => {
    const percentage = Math.round((value / max) * 100) || 0;
    return (
        <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{value} casos ({percentage}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

export const CoordinadorDashboard = () => {
    const { user, logout } = useAuthStore();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_URL}/statistics/dashboard`, {
                    headers: getHeaders()
                });

                if (!response.ok) {
                    throw new Error('Error fetching stats');
                }

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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando Dashboard...</div>;
    }

    // Calcular totales para porcentajes
    const totalFases = stats?.fases?.reduce((acc: number, curr: any) => acc + curr.cantidad, 0) || 1;
    const maxCarga = Math.max(...(stats?.cargaLaboral?.map((c: any) => c.cantidad) || [0]), 1);

    const getAlertColor = (nivel: string) => {
        switch (nivel) {
            case 'CRITICO': return 'bg-red-50 border-red-100 text-red-700';
            case 'ALTO': return 'bg-orange-50 border-orange-100 text-orange-700';
            case 'MEDIO': return 'bg-yellow-50 border-yellow-100 text-yellow-700';
            default: return 'bg-gray-50 border-gray-100 text-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10 w-full mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">
                        EC
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Panel de Coordinación</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                        <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full inline-block">{user?.rol}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 px-4 md:px-6 pb-8 max-w-7xl mx-auto w-full">

                {/* 1. SECCIÓN DE CALIDAD Y ALERTAS (NUEVO) */}
                <div className="mb-8">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Target className="text-purple-600" size={20} />
                        Control de Calidad y Cumplimiento
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* ALERTAS CRÍTICAS */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} /> Alertas de Gestión
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {stats?.alertas?.map((alerta: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-xl border flex flex-col justify-between h-32 transition-all hover:shadow-md ${getAlertColor(alerta.nivel)}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider opacity-80 border border-current px-1.5 rounded-full">{alerta.nivel}</span>
                                            </div>
                                            <h4 className="font-bold text-sm leading-tight mt-2">{alerta.tipo}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black">{alerta.cantidad}</span>
                                            <span className="text-xs opacity-75 ml-1">casos</span>
                                        </div>
                                    </div>
                                ))}
                                {(!stats?.alertas || stats.alertas.length === 0) && (
                                    <div className="col-span-3 text-center py-8 text-green-600 bg-green-50 rounded-xl border border-green-100">
                                        <CheckCircle2 className="mx-auto mb-2" />
                                        <p className="font-bold">¡Todo en orden!</p>
                                        <p className="text-sm opacity-75">No hay alertas de calidad pendientes.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* KPIs DE EFICIENCIA */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">Eficiencia Operativa</h3>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Eficiencia Diagnóstico</span>
                                            <span className="font-bold text-gray-900">{stats?.kpis?.eficienciaDiagnostico}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${stats?.kpis?.eficienciaDiagnostico > 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${stats?.kpis?.eficienciaDiagnostico || 0}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">Casos activos con F04 completo</p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600">Cobertura Intervención (F2)</span>
                                            <span className="font-bold text-gray-900">{Math.round((stats?.fases?.find((f: any) => f.fase.includes('Fase 2'))?.cantidad / (stats?.totalCasos || 1)) * 100) || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.round((stats?.fases?.find((f: any) => f.fase.includes('Fase 2'))?.cantidad / (stats?.totalCasos || 1)) * 100) || 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">Perfil de Calle (Ratio)</div>
                                <div className="flex gap-2">
                                    {stats?.kpis?.distribucionPerfil?.map((p: any, i: number) => (
                                        <div key={i} className="flex-1 bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                            <div className="text-xs text-gray-500 truncate" title={p.nombre}>{p.nombre}</div>
                                            <div className="font-bold text-gray-800">{p.cantidad}</div>
                                        </div>
                                    ))}
                                    {(!stats?.kpis?.distribucionPerfil || stats.kpis.distribucionPerfil.length === 0) && (
                                        <div className="text-xs text-gray-400">Sin datos de perfil</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. ESTADÍSTICAS GENERALES (ANTERIOR) */}
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="text-blue-600" size={20} />
                    Métricas Generales
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Casos"
                        value={stats?.totalCasos || 0}
                        color="text-purple-600"
                        icon={Users}
                        subtext="Activos e Históricos"
                    />
                    <StatCard
                        title="Diagnóstico (F1)"
                        value={stats?.fases?.find((f: any) => f.fase.includes('Diagnóstico'))?.cantidad || 0}
                        color="text-yellow-600"
                        icon={Target}
                    />
                    <StatCard
                        title="Intervención (F2)"
                        value={stats?.fases?.find((f: any) => f.fase.includes('Fase 2'))?.cantidad || 0}
                        color="text-blue-600"
                        icon={TrendingUp}
                    />
                    <StatCard
                        title="Egresados / Cierre"
                        value={stats?.fases?.find((f: any) => f.fase.includes('Cierre') || f.fase.includes('Egresados'))?.cantidad || 0}
                        color="text-green-600"
                        icon={CheckCircle2}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Embudo */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Flujo de Atención</h2>
                            <span className="text-xs text-gray-400">Distribución Total</span>
                        </div>
                        <div className="space-y-6">
                            {(stats?.fases || []).map((fase: any, idx: number) => (
                                <ProgressBar
                                    key={idx}
                                    label={fase.fase}
                                    value={fase.cantidad}
                                    max={totalFases}
                                    color={
                                        fase.fase.includes('Fase 1') ? 'bg-yellow-500' :
                                            fase.fase.includes('Fase 2') ? 'bg-blue-500' :
                                                fase.fase.includes('Fase 3') ? 'bg-green-500' : 'bg-gray-400'
                                    }
                                />
                            ))}
                            {(!stats?.fases || stats.fases.length === 0) && (
                                <p className="text-center text-gray-400 py-4">No hay datos disponibles</p>
                            )}
                        </div>
                    </div>

                    {/* Carga Laboral */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Carga por Educador</h2>
                            <span className="text-xs text-gray-400">Top 5</span>
                        </div>
                        <div className="space-y-4">
                            {(stats?.cargaLaboral || []).slice(0, 5).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                                        {item.educador.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-medium text-gray-800 text-sm">{item.educador}</span>
                                            <span className="font-bold text-gray-900 text-sm">{item.cantidad}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div
                                                className="bg-purple-500 h-1.5 rounded-full"
                                                style={{ width: `${(item.cantidad / maxCarga) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!stats?.cargaLaboral || stats.cargaLaboral.length === 0) && (
                                <p className="text-center text-gray-400 py-4">No hay educadores asignados</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
