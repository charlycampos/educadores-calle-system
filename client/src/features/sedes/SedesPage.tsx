import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AUTH_API_URL } from '../../config/api';
import { getSedesAll, type Sede } from '../../api/sedes.api';
import {
    Building2, MapPin, Users, FileText, ChevronRight,
    Shield, UserCheck, RefreshCw, Search, CheckCircle2,
    Phone, Globe
} from 'lucide-react';

// ── Colores por región ────────────────────────────────────────────────────────
const REGION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    CENTRO:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    NORTE:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    SUR:     { bg: 'bg-emerald-50',text: 'text-emerald-700',border: 'border-emerald-200' },
    ORIENTE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    LIMA:    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

const ROL_LABEL: Record<string, string> = {
    ADMIN_SEDE:        'Admin Sede',
    COORDINADOR:       'Coordinador',
    EDUCADOR:          'Educador',
    PSICOLOGO:         'Psicólogo',
    TRABAJADOR_SOCIAL: 'T. Social',
    ABOGADO:           'Abogado',
};

const ROL_COLOR: Record<string, string> = {
    ADMIN_SEDE:        'bg-indigo-100 text-indigo-700',
    COORDINADOR:       'bg-blue-100 text-blue-700',
    EDUCADOR:          'bg-emerald-100 text-emerald-700',
    PSICOLOGO:         'bg-violet-100 text-violet-700',
    TRABAJADOR_SOCIAL: 'bg-amber-100 text-amber-700',
    ABOGADO:           'bg-rose-100 text-rose-700',
};

interface UsuarioResumen {
    id: number;
    nombreCompleto: string;
    nombre_completo?: string;
    email: string;
    rol: string;
    zonaAsignada?: string;
    activo: boolean;
}

interface SedeDetalle extends Sede {
    usuarios: UsuarioResumen[];
    totalCasos: number;
}

// ── Tarjeta de Sede ───────────────────────────────────────────────────────────
const SedeCard = ({
    sede,
    onSelect,
    isSelected,
}: {
    sede: SedeDetalle;
    onSelect: (s: SedeDetalle) => void;
    isSelected: boolean;
}) => {
    const rc = REGION_COLORS[sede.region] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
    const activos = sede.usuarios.filter(u => u.activo).length;

    return (
        <button
            onClick={() => onSelect(sede)}
            className={`w-full text-left rounded-xl border-2 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
            }`}
        >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                        <Building2 size={16} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate">{sede.nombre}</p>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{sede.codigo}</p>
                    </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${rc.bg} ${rc.text} ${rc.border}`}>
                    {sede.region}
                </span>
            </div>

            {/* Ubicación */}
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-3">
                <MapPin size={12} className="flex-shrink-0" />
                <span className="truncate">{sede.departamento} · {sede.provincia}</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-black text-gray-900">{sede.usuarios.length}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">Usuarios</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-black text-emerald-600">{activos}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">Activos</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-lg font-black text-indigo-600">{sede.totalCasos}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">NNA</p>
                </div>
            </div>

            {/* Roles presentes */}
            <div className="flex flex-wrap gap-1">
                {Object.entries(
                    sede.usuarios.reduce((acc, u) => {
                        if (u.activo && u.rol !== 'ADMIN_NACIONAL') {
                            acc[u.rol] = (acc[u.rol] ?? 0) + 1;
                        }
                        return acc;
                    }, {} as Record<string, number>)
                ).slice(0, 4).map(([rol, cnt]) => (
                    <span key={rol} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${ROL_COLOR[rol] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROL_LABEL[rol] ?? rol} ({cnt})
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-end mt-3 text-[11px] text-indigo-500 font-semibold gap-1">
                Ver equipo <ChevronRight size={12} />
            </div>
        </button>
    );
};

// ── Panel de detalle de sede ──────────────────────────────────────────────────
const SedePanel = ({ sede }: { sede: SedeDetalle }) => {
    const porRol = sede.usuarios.reduce((acc, u) => {
        acc[u.rol] = [...(acc[u.rol] ?? []), u];
        return acc;
    }, {} as Record<string, UsuarioResumen[]>);

    const ordenRoles = ['ADMIN_SEDE', 'COORDINADOR', 'EDUCADOR', 'PSICOLOGO', 'TRABAJADOR_SOCIAL', 'ABOGADO'];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            {/* Encabezado del panel */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <Building2 size={20} />
                    <div>
                        <h2 className="font-black text-lg leading-tight">{sede.nombre}</h2>
                        <p className="text-indigo-200 text-sm">{sede.codigo} · {sede.departamento}</p>
                    </div>
                </div>
                <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-indigo-300" />
                        <span>{sede.usuarios.filter(u => u.activo).length} activos</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                        <FileText size={14} className="text-indigo-300" />
                        <span>{sede.totalCasos} NNA registrados</span>
                    </div>
                    {sede.direccion && (
                        <div className="flex items-center gap-1.5 text-sm">
                            <MapPin size={14} className="text-indigo-300" />
                            <span className="truncate max-w-[160px]">{sede.direccion}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Equipo por rol */}
            <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <UserCheck size={15} className="text-gray-500" />
                    <h3 className="font-bold text-gray-800 text-sm">Equipo de la Sede</h3>
                    <span className="ml-auto text-[11px] text-gray-400">{sede.usuarios.length} profesionales</span>
                </div>

                {sede.usuarios.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Users size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Sin usuarios asignados a esta sede</p>
                    </div>
                ) : (
                    ordenRoles
                        .filter(rol => porRol[rol]?.length > 0)
                        .map(rol => (
                            <div key={rol}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield size={12} className="text-gray-400" />
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${ROL_COLOR[rol] ?? 'bg-gray-100 text-gray-600'}`}>
                                        {ROL_LABEL[rol] ?? rol}
                                    </span>
                                    <span className="text-[11px] text-gray-400">({porRol[rol].length})</span>
                                </div>
                                <div className="space-y-1.5 ml-4">
                                    {porRol[rol].map(u => (
                                        <div key={u.id}
                                            className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <p className="text-[13px] font-semibold text-gray-800">
                                                    {u.nombreCompleto || u.nombre_completo}
                                                </p>
                                                <p className="text-[11px] text-gray-400">{u.email}</p>
                                                {u.zonaAsignada && (
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <MapPin size={9} />{u.zonaAsignada}
                                                    </p>
                                                )}
                                            </div>
                                            {u.activo
                                                ? <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">ACTIVO</span>
                                                : <span className="text-[9px] font-bold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">INACTIVO</span>
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
};

// ── Página principal ──────────────────────────────────────────────────────────
export const SedesPage = () => {
    const { token } = useAuthStore();
    const [sedes, setSedes] = useState<SedeDetalle[]>([]);
    const [loading, setLoading] = useState(true);
    const [sedeSeleccionada, setSedeSeleccionada] = useState<SedeDetalle | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [regionFiltro, setRegionFiltro] = useState<string>('TODAS');
    const [error, setError] = useState<string | null>(null);

    const cargarSedes = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Traer todas las sedes
            const sedesBase = await getSedesAll();

            // 2. Traer todos los usuarios (sin filtro, solo ADMIN_NACIONAL puede ver esta página)
            const resUsers = await fetch(`${AUTH_API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const usuarios: UsuarioResumen[] = resUsers.ok ? await resUsers.json() : [];

            // 3. Combinar: para cada sede asignar sus usuarios
            const sedesDetalle: SedeDetalle[] = sedesBase.map(sede => ({
                ...sede,
                usuarios: usuarios.filter((u: any) => u.sedeId === sede.id),
                totalCasos: 0, // placeholder — podría enriquecerse con stats
            }));

            // Ordenar: primero las que tienen usuarios
            sedesDetalle.sort((a, b) => b.usuarios.length - a.usuarios.length);

            setSedes(sedesDetalle);
            if (!sedeSeleccionada && sedesDetalle.length > 0) {
                // Auto-seleccionar la primera que tenga usuarios
                const conUsuarios = sedesDetalle.find(s => s.usuarios.length > 0);
                setSedeSeleccionada(conUsuarios ?? sedesDetalle[0]);
            } else if (sedeSeleccionada) {
                // Actualizar la sede seleccionada con datos frescos
                const actualizada = sedesDetalle.find(s => s.id === sedeSeleccionada.id);
                if (actualizada) setSedeSeleccionada(actualizada);
            }
        } catch (e: any) {
            setError(e.message || 'Error al cargar sedes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarSedes(); }, [token]);

    const regiones = ['TODAS', ...Array.from(new Set(sedes.map(s => s.region)))];

    const sedesFiltradas = sedes.filter(s => {
        const matchBusqueda = !busqueda ||
            s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
            s.departamento.toLowerCase().includes(busqueda.toLowerCase());
        const matchRegion = regionFiltro === 'TODAS' || s.region === regionFiltro;
        return matchBusqueda && matchRegion;
    });

    // Estadísticas globales
    const totalUsuarios = sedes.reduce((a, s) => a + s.usuarios.filter(u => u.activo).length, 0);
    const sedesConEquipo = sedes.filter(s => s.usuarios.length > 0).length;

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">Cargando sedes del programa...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Globe size={15} className="text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Vista Nacional</span>
                    </div>
                    <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Gestión de Sedes</h1>
                    <p className="text-gray-500 text-[13px] mt-1">
                        Programa Educadores de Calle · {sedes.length} sedes registradas
                    </p>
                </div>
                <button onClick={cargarSedes}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-all">
                    <RefreshCw size={14} /> Actualizar
                </button>
            </div>

            {/* KPIs globales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Sedes Totales',    value: sedes.length,      icon: Building2,    color: 'bg-indigo-50 text-indigo-600' },
                    { label: 'Sedes con Equipo', value: sedesConEquipo,    icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Profesionales',    value: totalUsuarios,     icon: Users,        color: 'bg-blue-50 text-blue-600' },
                    { label: 'NNA Registrados',  value: sedes.reduce((a, s) => a + s.totalCasos, 0), icon: FileText, color: 'bg-violet-50 text-violet-600' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl flex-shrink-0 ${kpi.color}`}>
                            <kpi.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{kpi.label}</p>
                            <p className="text-xl font-black text-gray-900">{kpi.value.toLocaleString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar sede por nombre, código o departamento..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                    />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {regiones.map(r => (
                        <button
                            key={r}
                            onClick={() => setRegionFiltro(r)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                                regionFiltro === r
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* Layout principal: grid de tarjetas + panel detalle */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                {/* Lista de sedes */}
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sedesFiltradas.length === 0 ? (
                        <div className="col-span-2 py-16 text-center text-gray-400">
                            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No se encontraron sedes</p>
                            <p className="text-sm mt-1">Prueba con otro filtro de búsqueda</p>
                        </div>
                    ) : (
                        sedesFiltradas.map(sede => (
                            <SedeCard
                                key={sede.id}
                                sede={sede}
                                onSelect={setSedeSeleccionada}
                                isSelected={sedeSeleccionada?.id === sede.id}
                            />
                        ))
                    )}
                </div>

                {/* Panel de detalle */}
                <div className="lg:col-span-2 sticky top-4">
                    {sedeSeleccionada ? (
                        <SedePanel sede={sedeSeleccionada} />
                    ) : (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
                            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-semibold">Selecciona una sede</p>
                            <p className="text-xs mt-1">para ver su equipo de profesionales</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
