import React, { useEffect, useState } from 'react';
import { getUrgencias, type UrgenciaF15 } from '../../api/urgencia.api';
import { Siren, Plus, Search, Calendar, MapPin, CheckCircle, AlertCircle, HelpCircle, ArrowRight, Pencil } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const UrgenciasListPage = () => {
    const navigate = useNavigate();
    const [urgencias, setUrgencias] = useState<UrgenciaF15[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('TODOS');

    const fetchUrgencias = async () => {
        try {
            setIsLoading(true);
            const data = await getUrgencias();
            setUrgencias(data);
        } catch (error) {
            console.error("Error al obtener urgencias:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUrgencias();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                        <AlertCircle size={12} /> Pendiente de Verificación
                    </span>
                );
            case 'PROMOVIDO_F03':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        <CheckCircle size={12} /> Promovido a F03 (Caso Activo)
                    </span>
                );
            case 'NO_LOCALIZADO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                        <AlertCircle size={12} /> No Localizado (Cerrado)
                    </span>
                );
            case 'DERIVADO_EXTERNO':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                        <ArrowRight size={12} /> Derivado a Entidad Externa
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                        <HelpCircle size={12} /> {estado}
                    </span>
                );
        }
    };

    const getPerfilLabel = (perfil?: string) => {
        if (!perfil) return 'No definido';
        switch (perfil) {
            case 'TRABAJO_CALLE': return 'Trabajo en Calle';
            case 'MENDICIDAD': return 'Mendicidad';
            case 'VIDA_CALLE': return 'Vida en Calle';
            case 'OTRO': return 'Otro Perfil / Riesgo';
            default: return perfil;
        }
    };

    const filteredUrgencias = urgencias.filter(item => {
        const matchSearch = (item.codigo_reporte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.nombre_referido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.zona_atencion?.toLowerCase().includes(searchTerm.toLowerCase()));
            
        const matchEstado = filterEstado === 'TODOS' || item.estado === filterEstado;
        
        return matchSearch && matchEstado;
    });

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6 animate-in fade-in duration-300">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface p-6 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-lg">
                        <Siren size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-fg">Atención de Urgencia — Formato 15</h1>
                        <p className="text-sm text-fg-muted mt-0.5">
                            Fichas de atención inmediata y captación inicial de NNA en situación de riesgo.
                        </p>
                    </div>
                </div>
                
                <Link to="/urgencias/nueva">
                    <Button variant="primary" className="gap-2">
                        <Plus size={16} />
                        Nueva Atención de Urgencia
                    </Button>
                </Link>
            </div>

            {/* Filtros y Buscador */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Buscador */}
                <div className="relative md:col-span-2">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-muted">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por código de reporte, nombre o zona de ubicación..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                </div>

                {/* Filtro Estado */}
                <div>
                    <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="PENDIENTE">Pendientes de Verificación</option>
                        <option value="PROMOVIDO_F03">Promovidos a F03 (Caso)</option>
                        <option value="NO_LOCALIZADO">No Localizados (Cerrados)</option>
                        <option value="DERIVADO_EXTERNO">Derivados Externamente</option>
                    </select>
                </div>
            </div>

            {/* Listado */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-xl border border-border">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-fg-muted mt-4 font-medium">Cargando fichas de urgencia...</p>
                </div>
            ) : filteredUrgencias.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-surface rounded-xl border border-border text-center px-4">
                    <div className="p-4 bg-fg-muted/10 rounded-full text-fg-muted mb-4">
                        <Siren size={36} />
                    </div>
                    <h3 className="text-lg font-bold text-fg">No se encontraron reportes</h3>
                    <p className="text-sm text-fg-muted max-w-md mt-1 mb-6">
                        {searchTerm || filterEstado !== 'TODOS' 
                            ? 'Intenta cambiar los términos de búsqueda o filtros aplicados.' 
                            : 'No hay reportes de urgencia F15 creados en esta sede todavía.'
                        }
                    </p>
                    <Link to="/urgencias/nueva">
                        <Button variant="primary" className="gap-2">
                            <Plus size={16} />
                            Crear Nueva Urgencia (F15)
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredUrgencias.map((item) => (
                        <div key={item.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                        {item.codigo_reporte}
                                    </span>
                                    {getEstadoBadge(item.estado || 'PENDIENTE')}
                                    <span className="text-xs text-fg-muted font-medium bg-surface-muted px-2 py-0.5 rounded border border-border">
                                        Perfil: {getPerfilLabel(item.perfil)}
                                    </span>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-base font-bold text-fg">
                                        {item.nombre_referido || 'NNA No Identificado / Referido'}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={13} />
                                            Atención: {item.fecha_atencion ? (() => {
                                                const d = new Date(item.fecha_atencion);
                                                if (isNaN(d.getTime())) return 'No registra';
                                                const pad = (n: number) => String(n).padStart(2, '0');
                                                return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                            })() : 'No registra'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin size={13} />
                                            {item.zona_atencion || 'Ubicación no especificada'}
                                        </span>
                                    </div>
                                </div>

                                {item.antecedentes && (
                                    <p className="text-xs text-fg-muted bg-surface-muted p-2.5 rounded-lg border border-border/60 max-w-3xl line-clamp-1">
                                        <strong>Reporte inicial:</strong> {item.antecedentes}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                                <Link to={`/urgencias/editar/${item.id}`}>
                                    <button 
                                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-fg hover:text-primary border border-border hover:border-primary/40 bg-surface rounded-lg transition-colors"
                                    >
                                        <Pencil size={14} /> Editar F15
                                    </button>
                                </Link>

                                {item.estado === 'PENDIENTE' && (
                                    <button
                                        onClick={() => navigate(`/nna/nuevo?prefillFromUrgencia=${item.id}`)}
                                        className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
                                    >
                                        Vincular F03 <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
