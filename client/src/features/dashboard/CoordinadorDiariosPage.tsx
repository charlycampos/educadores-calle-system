import React, { useState, useEffect } from 'react';
import { urlMapa } from '../../utils/geo';
import { useAuthStore } from '../../store/auth.store';
import { Link } from 'react-router-dom';
import { 
    BookOpen, Calendar, Clock, MapPin, Search, ArrowLeft, RefreshCw, 
    CheckCircle2, AlertTriangle, Users, Camera, PenTool, CheckCircle, HelpCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { NNA_API_URL, INTERVENCION_API_URL } from '../../config/api';

interface DiaryEntryData {
    id: number;
    casoId: number;
    nnaNombre: string;
    educadorNombre: string;
    fecha: string;
    ubicacion: string;
    actividad: string;
    tipoActividad: string;
    foto?: string;
    firma?: string;
    latitud?: number | null;
    longitud?: number | null;
}

export const CoordinadorDiariosPage = () => {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');

    // Datos reales del endpoint /diario/stats/sede
    const [educadoresProgreso, setEducadoresProgreso] = useState<any[]>([]);
    const [diariosRecientes, setDiariosRecientes] = useState<DiaryEntryData[]>([]);

    useEffect(() => {
        loadDiarios();
    }, []);

    const loadDiarios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${INTERVENCION_API_URL}/diario/stats/sede`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error consultando diarios de la sede');
            const data = await res.json();

            setDiariosRecientes((data.recientes || []).map((d: any) => ({
                id: d.id,
                casoId: d.casoId,
                nnaNombre: d.nnaNombre || `Caso ${d.casoId}`,
                educadorNombre: d.educadorNombre || 'Educador',
                fecha: d.fecha,
                ubicacion: d.ubicacion || 'No especificada',
                latitud: d.latitud,
                longitud: d.longitud,
                actividad: d.actividad,
                tipoActividad: d.tipoActividad || 'CONSEJERIA',
                foto: d.foto,
                firma: d.firma,
            })));

            setEducadoresProgreso((data.educadores || []).map((e: any) => {
                const registrados = e.registrados || 0;
                let estado = 'CRITICO';
                if (registrados >= 4) estado = 'COMPLETO';
                else if (registrados >= 2) estado = 'EN_PROGRESO';
                else if (registrados >= 1) estado = 'ALERTA';
                return { id: e.id, nombre: e.nombre, registrados, meta: 4, estado };
            }));
        } catch (error) {
            console.error('Error loading diarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadDiarios();
        setIsRefreshing(false);
    };

    // Filtros
    const filteredDiarios = diariosRecientes.filter(d => {
        const matchesSearch = d.nnaNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             d.educadorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.ubicacion.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesTipo = selectedTipo === 'TODOS' || d.tipoActividad === selectedTipo;
        return matchesSearch && matchesTipo;
    });

    // Métricas para el Dashboard de Diarios
    const totalHoy = filteredDiarios.filter(d => {
        const df = new Date(d.fecha);
        const t = new Date();
        return df.getDate() === t.getDate() && df.getMonth() === t.getMonth();
    }).length;

    const totalConFirma = filteredDiarios.filter(d => d.firma).length;
    const totalConFoto = filteredDiarios.filter(d => d.foto).length;
    const tasaEvidencia = filteredDiarios.length > 0 
        ? Math.round(((totalConFirma + totalConFoto) / (filteredDiarios.length * 2)) * 100) 
        : 0;

    const getProgresoColor = (estado: string) => {
        switch (estado) {
            case 'COMPLETO': return 'text-green-600 bg-green-50 border-green-200';
            case 'EN_PROGRESO': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'ALERTA': return 'text-orange-600 bg-orange-50 border-orange-200';
            default: return 'text-red-600 bg-red-50 border-red-200';
        }
    };

    const getTipoLabel = (tipo: string) => {
        switch (tipo) {
            case 'CONSEJERIA': return { label: 'Consejería', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' };
            case 'COORDINACION': return { label: 'Coordinación', color: 'bg-purple-50 border-purple-200 text-purple-700' };
            case 'VISITA': return { label: 'Visita Dom.', color: 'bg-amber-50 border-amber-200 text-amber-700' };
            case 'RECORRIDO': return { label: 'Abordaje/Campo', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
            default: return { label: 'Actividad', color: 'bg-gray-50 border-gray-200 text-gray-700' };
        }
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="bg-[#1e40af] text-white p-6 rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Link to="/dashboard" className="text-blue-200 hover:text-white transition-colors">
                                <ArrowLeft size={16} />
                            </Link>
                            <h1 className="text-xl font-black tracking-tight">Monitoreo de Cumplimiento de Diarios</h1>
                        </div>
                        <p className="text-blue-100 text-xs font-medium opacity-80">
                            Supervisión de actividades diarias (meta 4/4), firmas y evidencias fotográficas de los educadores
                        </p>
                    </div>
                    <div>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={handleRefresh}
                            className="bg-white/10 hover:bg-white/20 text-white border-white/10 gap-1.5"
                            loading={isRefreshing}
                        >
                            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                            Actualizar métricas
                        </Button>
                    </div>
                </div>
            </div>

            {/* METRICAS FRAME (INDICADORES) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Calendar size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actividades Hoy</p>
                        <p className="text-2xl font-black text-gray-900">{totalHoy}</p>
                        <p className="text-[10px] text-gray-400">Registros en la sede</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasa de Evidencias</p>
                        <p className="text-2xl font-black text-gray-900">{tasaEvidencia}%</p>
                        <p className="text-[10px] text-gray-400">Registros con Foto/Firma</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <PenTool size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Firmas Recibidas</p>
                        <p className="text-2xl font-black text-gray-900">{totalConFirma}</p>
                        <p className="text-[10px] text-gray-400">Firmas digitalizadas</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Camera size={22} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fotos de Actas</p>
                        <p className="text-2xl font-black text-gray-900">{totalConFoto}</p>
                        <p className="text-[10px] text-gray-400">Archivos adjuntos</p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN CARGA DE EDUCADORES */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Progreso del Equipo de Campo (Meta 4 Actividades Diarias)
                    </h3>
                    <p className="text-xs text-gray-400">Monitoreo de cumplimientos de bitácoras obligatorias por educador para el día de hoy.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {educadoresProgreso.map((edu) => (
                        <div key={edu.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md ${getProgresoColor(edu.estado)}`}>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider">{edu.estado}</span>
                                <h4 className="font-bold text-sm text-gray-800 leading-tight mt-1">{edu.nombre}</h4>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((num) => (
                                        <div 
                                            key={num} 
                                            className={clsx(
                                                "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border",
                                                edu.registrados >= num 
                                                    ? "bg-green-600 border-green-600 text-white" 
                                                    : "bg-white border-gray-300 text-gray-400"
                                            )}
                                        >
                                            {num}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-gray-900">{edu.registrados} de 4</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FILTROS Y BANDEJA PRINCIPAL */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Bitácora Consolidada de Atenciones</h3>
                        <p className="text-xs text-gray-400">Revisión de narraciones dictadas por voz y firmas digitales.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de Tipo */}
                        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                            {['TODOS', 'CONSEJERIA', 'COORDINACION', 'VISITA', 'RECORRIDO'].map((tipo) => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setSelectedTipo(tipo)}
                                    className={clsx(
                                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                                        selectedTipo === tipo 
                                            ? 'bg-white text-gray-900 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-800'
                                    )}
                                >
                                    {tipo === 'TODOS' ? 'Todos' : tipo === 'CONSEJERIA' ? 'Cons.' : tipo === 'COORDINACION' ? 'Coord.' : tipo === 'VISITA' ? 'Visita' : 'Abordaje'}
                                </button>
                            ))}
                        </div>

                        {/* Buscador */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar NNA o educador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-4 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-400 outline-none w-52"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla/Listado */}
                {loading ? (
                    <div className="text-center py-12 text-gray-400 text-xs italic">Cargando bitácoras...</div>
                ) : filteredDiarios.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <BookOpen size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500 font-bold text-sm">No se encontraron diarios de campo</p>
                        <p className="text-gray-400 text-xs mt-1">Intente cambiar el filtro o el término de búsqueda</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredDiarios.map((entry) => {
                            const tInfo = getTipoLabel(entry.tipoActividad);
                            const fDate = new Date(entry.fecha);

                            return (
                                <div key={entry.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow bg-white flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase ${tInfo.color}`}>
                                                {tInfo.label}
                                            </span>
                                            <span className="text-xs font-bold text-gray-800">
                                                NNA: {entry.nnaNombre}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                ID Caso: {entry.casoId}
                                            </span>
                                            <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                                                <Calendar size={10} />
                                                {fDate.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                <Clock size={10} />
                                                {fDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <p className="text-xs text-gray-500 font-medium">
                                            Educador responsable: <strong className="text-gray-700">{entry.educadorNombre}</strong>
                                        </p>

                                        {entry.ubicacion && (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                                <MapPin size={11} /> {entry.ubicacion}
                                                {entry.latitud != null && entry.longitud != null && (
                                                    <a href={urlMapa(entry.latitud, entry.longitud)} target="_blank" rel="noreferrer"
                                                        className="text-blue-500 hover:underline font-bold ml-1">
                                                        Ver en mapa
                                                    </a>
                                                )}
                                            </p>
                                        )}

                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 max-w-4xl">
                                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{entry.actividad}</p>
                                        </div>
                                    </div>

                                    {/* Evidencias visuales del Diario */}
                                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 h-fit">
                                        {entry.foto ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] text-gray-400 font-bold mb-1 uppercase">Evidencia</span>
                                                <img src={entry.foto} alt="Evidencia" className="h-14 w-14 rounded object-cover border bg-white" />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-14 w-14 border border-dashed border-gray-300 rounded bg-white text-gray-300" title="Sin foto">
                                                <Camera size={16} />
                                                <span className="text-[8px] mt-0.5">Sin foto</span>
                                            </div>
                                        )}

                                        {entry.firma ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] text-gray-400 font-bold mb-1 uppercase">Firma</span>
                                                <img src={entry.firma} alt="Firma" className="h-14 w-14 rounded object-contain border bg-white" />
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-14 w-14 border border-dashed border-gray-300 rounded bg-white text-gray-300" title="Sin firma">
                                                <PenTool size={16} />
                                                <span className="text-[8px] mt-0.5">Sin firma</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
