import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Link } from 'react-router-dom';
import { 
    BookOpen, Calendar, Clock, MapPin, Search, ArrowLeft, 
    Camera, PenTool, Printer, PlusCircle, CheckCircle, FileText, Pencil,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { INTERVENCION_API_URL } from '../../config/api';
import { urlMapa } from '../../utils/geo';
import { DiarioCampoModal } from './DiarioCampoModal';

interface DiaryEntryData {
    id: number;
    casoId: number | null;
    nnaNombre: string;
    fecha: string;
    ubicacion: string;
    actividad: string;
    tipoActividad: string;
    foto?: string;
    firma?: string;
    latitud?: number | null;
    longitud?: number | null;
    creadoPorId: number;
    esInstitucional?: boolean;
    tipoInstitucion?: string;
    nombreInstitucion?: string;
    contactoInstitucion?: string;
    actividadProgramada?: string;
    estadoActividad?: string;
    resultadosObtenidos?: string;
    observacionesTexto?: string;
    horaInicio?: string;
    horaFin?: string;
}

export const EducadorDiariosPage = () => {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTipo, setSelectedTipo] = useState<string>('TODOS');
    const [diarioOpen, setDiarioOpen] = useState(false);
    const [selectedDiario, setSelectedDiario] = useState<DiaryEntryData | null>(null);

    // Diarios de este educador
    const [diarios, setDiarios] = useState<DiaryEntryData[]>([]);

    useEffect(() => {
        loadDiarios();
    }, []);

    const loadDiarios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${INTERVENCION_API_URL}/diario/stats/sede`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error consultando diarios');
            const data = await res.json();

            // Filtrar solo los diarios del educador autenticado
            const misDiarios = (data.recientes || [])
                .filter((d: any) => d.creadoPorId === user?.id)
                .map((d: any) => {
                    // Extraer los campos nuevos si están en el JSON de observaciones
                    let esInst = false;
                    let tInst = '';
                    let nInst = '';
                    let cInst = '';
                    let actProg = '';
                    let estAct = 'REALIZADA';
                    let resObt = '';
                    let obsAdic = '';
                    let hInicio = '';
                    let hFin = '';

                    if (d.foto || d.firma || d.tipoActividad === 'COORDINACION' || d.id) {
                        try {
                            if (d.observaciones) {
                                const parsed = JSON.parse(d.observaciones);
                                esInst = !!parsed.esInstitucional;
                                tInst = parsed.tipoInstitucion || '';
                                nInst = parsed.nombreInstitucion || '';
                                cInst = parsed.contactoInstitucion || '';
                                actProg = parsed.actividadProgramada || '';
                                estAct = parsed.estadoActividad || 'REALIZADA';
                                resObt = parsed.resultadosObtenidos || '';
                                obsAdic = parsed.observacionesTexto || '';
                                hInicio = parsed.horaInicio || '';
                                hFin = parsed.horaFin || '';
                            }
                        } catch (e) {
                            // No es JSON
                        }
                    }

                    return {
                        id: d.id,
                        casoId: d.casoId,
                        nnaNombre: esInst ? `${nInst} (${tInst})` : (d.nnaNombre || `Caso ${d.casoId}`),
                        fecha: d.fecha,
                        ubicacion: d.ubicacion || 'No especificada',
                        latitud: d.latitud,
                        longitud: d.longitud,
                        actividad: d.actividad,
                        tipoActividad: d.tipoActividad || 'CONSEJERIA',
                        foto: d.foto,
                        firma: d.firma,
                        creadoPorId: d.creadoPorId,
                        esInstitucional: esInst,
                        tipoInstitucion: tInst,
                        nombreInstitucion: nInst,
                        contactoInstitucion: cInst,
                        actividadProgramada: actProg,
                        estadoActividad: estAct,
                        resultadosObtenidos: resObt,
                        observacionesTexto: obsAdic,
                        horaInicio: hInicio,
                        horaFin: hFin,
                    };
                });

            setDiarios(misDiarios);
        } catch (error) {
            console.error('Error loading diarios:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar en frontend
    const filteredDiarios = diarios.filter(d => {
        const matchesSearch = d.nnaNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             d.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             d.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (d.actividadProgramada || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (d.resultadosObtenidos || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesTipo = selectedTipo === 'TODOS' || 
                           (selectedTipo === 'INSTITUCIONAL' && d.esInstitucional) ||
                           (selectedTipo === 'CASOS' && !d.esInstitucional) ||
                           d.tipoActividad === selectedTipo;
        return matchesSearch && matchesTipo;
    });

    // Calcular cuántos se registraron HOY
    const entriesToday = diarios.filter(e => {
        const d = new Date(e.fecha);
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    }).length;



    const getTipoLabel = (tipo: string, esInst?: boolean) => {
        if (esInst) {
            return { label: 'Gestión Inst.', color: 'bg-purple-50 border-purple-200 text-purple-700 font-black' };
        }
        switch (tipo) {
            case 'CONSEJERIA': return { label: 'Consejería', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' };
            case 'COORDINACION': return { label: 'Coordinación', color: 'bg-blue-50 border-blue-200 text-blue-700' };
            case 'VISITA': return { label: 'Visita Dom.', color: 'bg-amber-50 border-amber-200 text-amber-700' };
            case 'RECORRIDO': return { label: 'Abordaje', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
            default: return { label: 'Actividad', color: 'bg-gray-50 border-gray-200 text-gray-700' };
        }
    };

    const getEstadoBadge = (estado?: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return { label: 'Pendiente', color: 'bg-blue-55 border-blue-200 text-blue-700 font-bold' };
            case 'REPROGRAMADA':
                return { label: 'Reprogramada', color: 'bg-amber-50 border-amber-200 text-amber-700' };
            case 'NO_REALIZADA':
                return { label: 'No Realizada', color: 'bg-red-50 border-red-200 text-red-700' };
            case 'REALIZADA':
            default:
                return { label: 'Realizada', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
        }
    };

    const handleExportExcel = () => {
        const headers = [
            'N°',
            'ID Registro',
            'Tipo',
            'Caso / Institución',
            'Fecha',
            'Hora Inicio',
            'Hora Fin',
            'Tipo Actividad',
            'Actividad Planificada',
            'Narración / Desarrollo',
            'Estado',
            'Resultados',
            'Observaciones',
            'Ubicación',
            'Latitud',
            'Longitud'
        ];

        const rows = filteredDiarios.map((entry, index) => {
            const fDate = new Date(entry.fecha);
            const tipoEntrada = entry.esInstitucional ? 'Institucional' : `Caso #${entry.casoId || ''}`;
            const nombreDest = entry.esInstitucional 
                ? `${entry.nombreInstitucion || ''} (${entry.tipoInstitucion || ''})` 
                : entry.nnaNombre;

            return [
                index + 1,
                entry.id,
                tipoEntrada,
                nombreDest,
                fDate.toLocaleDateString('es-PE'),
                entry.horaInicio || '',
                entry.horaFin || '',
                entry.tipoActividad || '',
                entry.actividadProgramada || '',
                entry.actividad === "(Pendiente de ejecución)" ? "" : (entry.actividad || ''),
                entry.estadoActividad || 'PENDIENTE',
                entry.resultadosObtenidos || '',
                entry.observacionesTexto || '',
                entry.ubicacion || '',
                entry.latitud || '',
                entry.longitud || ''
            ];
        });

        const csvContent = [
            headers.join(';'),
            ...rows.map(row => 
                row.map(val => {
                    const str = String(val ?? '').replace(/"/g, '""');
                    return `"${str}"`;
                }).join(';')
            )
        ].join('\n');

        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Reporte_Diario_Campo_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link to="/dashboard" className="text-fg-secondary hover:text-fg transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="text-[22px] font-semibold text-fg tracking-tight flex items-center gap-2">
                            <BookOpen size={22} className="text-primary" /> Mis Diarios de Campo
                        </h1>
                    </div>
                    <p className="text-fg-secondary text-[13px]">
                        Historial y bandeja de diarios de campo, coordinaciones institucionales e intervenciones de campo.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        variant="primary" 
                        onClick={() => { setSelectedDiario(null); setDiarioOpen(true); }}
                        className="font-bold gap-1.5"
                    >
                        <PlusCircle size={15} />
                        Nueva Entrada
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={handleExportExcel}
                        className="gap-1.5 font-bold"
                    >
                        <FileText size={15} />
                        Reporte
                    </Button>
                </div>
            </div>

            {/* Impresion Solamente - Cabecera */}
            <div className="only-print hidden p-4 border-b border-gray-300 mb-6">
                <h1 className="text-xl font-bold text-center text-gray-800">REPORTE - DIARIO DE CAMPO</h1>
                <p className="text-sm text-center text-gray-600 mt-1">Educador: {user?.nombre} | Sede: {user?.sedeNombre}</p>
                <p className="text-xs text-center text-gray-400 mt-0.5">Generado el: {new Date().toLocaleDateString('es-PE')}</p>
            </div>

            {/* Tracker de Actividades Diarias */}
            <div className="bg-surface p-4 rounded-lg border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                <div className="space-y-1">
                    <h3 className="text-[13px] font-bold text-fg uppercase tracking-wide">Progreso del Día</h3>
                    <p className="text-xs text-fg-muted">Meta oficial del protocolo: 4 actividades registradas por día de campo.</p>
                </div>
                <div className="flex items-center gap-3 bg-surface-muted/55 px-3 py-2 rounded-lg border border-border w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map((num) => (
                            <div 
                                key={num} 
                                className={clsx(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300",
                                    entriesToday >= num 
                                        ? "bg-primary border-primary text-white font-black" 
                                        : "bg-surface border-border text-fg-muted"
                                )}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                    <div className="text-right sm:text-left">
                        <span className="text-xs font-bold text-fg block leading-none">{entriesToday} de 4</span>
                        <span className="text-[10px] text-fg-muted">completados hoy</span>
                    </div>
                </div>
            </div>

            {/* BANDEJA PRINCIPAL DE DIARIOS */}
            <div className="space-y-4">
                
                {/* Cabecera Filtros */}
                <div className="bg-surface p-4 rounded-lg border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por beneficiario, actividad, ubicación, resultados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-md text-[13px] text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-fg-muted"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Filtro por Tipo */}
                        <div className="flex gap-0.5 bg-surface-muted p-1 rounded-md border border-border">
                            {[
                                { val: 'TODOS', label: 'Todos' },
                                { val: 'CASOS', label: 'Casos NNA' },
                                { val: 'INSTITUCIONAL', label: 'Institucional' }
                            ].map((tipo) => (
                                <button
                                    key={tipo.val}
                                    type="button"
                                    onClick={() => setSelectedTipo(tipo.val)}
                                    className={clsx(
                                        'px-2.5 py-1 rounded-md text-xs font-bold transition-all',
                                        selectedTipo === tipo.val 
                                            ? 'bg-surface text-fg shadow-sm border border-border/50' 
                                            : 'text-fg-muted hover:text-fg'
                                    )}
                                >
                                    {tipo.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-surface rounded-lg border border-border overflow-hidden">
                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-surface-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-12 text-center">N°</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-20">Caso</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-36">Fecha / Hora</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-28">Tipo</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-52">NNA / Institución</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary max-w-sm">Actividad Planificada</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-32">Estado</th>
                                    <th className="px-4 py-3 font-semibold text-fg-secondary w-24 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-fg-muted italic">
                                            Cargando mis bitácoras...
                                        </td>
                                    </tr>
                                ) : filteredDiarios.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-fg-muted">
                                            No se encontraron diarios registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDiarios.map((entry, index) => {
                                        const tInfo = getTipoLabel(entry.tipoActividad, entry.esInstitucional);
                                        const fDate = new Date(entry.fecha);
  
                                        return (
                                            <tr key={entry.id} className="hover:bg-surface-muted/30 transition-colors bg-surface">
                                                {/* N° */}
                                                <td className="px-4 py-3 align-top font-bold text-fg-muted text-center font-mono">
                                                    {index + 1}
                                                </td>

                                                {/* Caso */}
                                                <td className="px-4 py-3 align-top font-mono text-xs text-fg">
                                                    {entry.esInstitucional ? (
                                                        <span className="text-fg-muted italic">N/A</span>
                                                    ) : (
                                                        `#${entry.casoId}`
                                                    )}
                                                </td>

                                                {/* Fecha */}
                                                <td className="px-4 py-3 align-top font-mono text-xs text-fg-secondary">
                                                    <div className="font-semibold">{fDate.toLocaleDateString('es-PE')}</div>
                                                    <div className="text-[10px] text-fg-muted mt-0.5">
                                                        {entry.horaInicio && entry.horaFin 
                                                            ? `🕒 ${entry.horaInicio} - ${entry.horaFin}` 
                                                            : fDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
 
                                                {/* Tipo */}
                                                <td className="px-4 py-3 align-top">
                                                    <span className={clsx(
                                                        "inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                                                        tInfo.color
                                                    )}>
                                                        {tInfo.label}
                                                    </span>
                                                </td>
 
                                                {/* Destinatario / Institución */}
                                                <td className="px-4 py-3 align-top whitespace-nowrap">
                                                    {entry.esInstitucional ? (
                                                        <span className="font-bold text-purple-700">
                                                            🏢 {entry.nombreInstitucion} ({entry.tipoInstitucion})
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-fg">
                                                            👤 {entry.nnaNombre}
                                                        </span>
                                                    )}
                                                </td>
 
                                                {/* Actividad Planificada */}
                                                <td className="px-4 py-3 align-top leading-relaxed max-w-sm break-words">
                                                    {entry.actividadProgramada ? (
                                                        <div className="text-fg-secondary">{entry.actividadProgramada}</div>
                                                    ) : (
                                                        <span className="text-fg-muted italic text-[11px]">No especificado</span>
                                                    )}
                                                </td>
 
                                                {/* Estado */}
                                                <td className="px-4 py-3 align-top">
                                                    <span className={clsx(
                                                        "inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                                                        getEstadoBadge(entry.estadoActividad).color
                                                    )}>
                                                        {getEstadoBadge(entry.estadoActividad).label}
                                                    </span>
                                                </td>
 
                                                {/* Acciones */}
                                                <td className="px-4 py-3 align-top text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedDiario(entry);
                                                            setDiarioOpen(true);
                                                        }}
                                                        className={clsx(
                                                            "p-1.5 rounded-md transition-colors flex items-center gap-1.5 ml-auto text-xs font-bold",
                                                            entry.estadoActividad === 'PENDIENTE'
                                                                ? "bg-primary text-white hover:bg-primary/95"
                                                                : "bg-surface text-fg-muted border border-border hover:bg-surface-muted hover:text-fg"
                                                        )}
                                                        title={entry.estadoActividad === 'PENDIENTE' ? "Completar registro de atención" : "Editar registro"}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden p-3 space-y-3 bg-bg">
                        {loading ? (
                            <div className="py-8 text-center text-fg-muted text-xs italic">Cargando mis bitácoras...</div>
                        ) : filteredDiarios.length === 0 ? (
                            <div className="py-8 text-center text-fg-muted text-xs">No se encontraron diarios registrados.</div>
                        ) : (
                            filteredDiarios.map((entry) => {
                                const tInfo = getTipoLabel(entry.tipoActividad, entry.esInstitucional);
                                const fDate = new Date(entry.fecha);

                                return (
                                    <div key={entry.id} className="bg-surface p-4 rounded-lg border border-border space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                                                tInfo.color
                                            )}>
                                                {tInfo.label}
                                            </span>
                                            <span className="text-[10px] text-fg-muted font-mono">
                                                {fDate.toLocaleDateString('es-PE')} {entry.horaInicio && entry.horaFin 
                                                    ? `🕒 ${entry.horaInicio} - ${entry.horaFin}` 
                                                    : fDate.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div>
                                            {entry.esInstitucional ? (
                                                <div>
                                                    <h4 className="font-bold text-purple-700 text-sm">🏢 {entry.nombreInstitucion}</h4>
                                                    <p className="text-[11px] text-fg-muted">Tipo: {entry.tipoInstitucion} {entry.contactoInstitucion ? `• Cargo: ${entry.contactoInstitucion}` : ''}</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <h4 className="font-bold text-fg text-sm">👤 {entry.nnaNombre}</h4>
                                                    {entry.casoId && <p className="text-[11px] text-fg-muted font-mono">Caso #{entry.casoId}</p>}
                                                </div>
                                            )}
                                        </div>

                                        {entry.actividadProgramada && (
                                            <div className="text-xs bg-surface-muted/50 p-2 rounded border border-border space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-[9px] text-fg-muted uppercase tracking-wider block">🎯 Act. Programada:</span>
                                                    <span className={clsx(
                                                        "inline-block px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                                                        getEstadoBadge(entry.estadoActividad).color
                                                    )}>
                                                        {getEstadoBadge(entry.estadoActividad).label}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-fg-secondary">{entry.actividadProgramada}</p>
                                            </div>
                                        )}

                                        <div className="text-xs space-y-1">
                                            <span className="font-bold text-[9px] text-fg-muted uppercase tracking-wider block">📝 Narración / Desarrollo:</span>
                                             {entry.actividad === "(Pendiente de ejecución)" ? (
                                                 <p className="text-fg-muted italic">Pendiente de ejecución</p>
                                             ) : (
                                                 <p className="text-fg whitespace-pre-wrap leading-relaxed">{entry.actividad}</p>
                                             )}
                                        </div>

                                        {(entry.resultadosObtenidos || entry.observacionesTexto) && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {entry.resultadosObtenidos && (
                                                    <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100 text-[11px] text-emerald-800">
                                                        <span className="font-bold text-[9px] text-emerald-700 uppercase tracking-wider block">Resultados:</span>
                                                        <p className="mt-0.5">{entry.resultadosObtenidos}</p>
                                                    </div>
                                                )}
                                                {entry.observacionesTexto && (
                                                    <div className="bg-amber-50/50 p-2 rounded border border-amber-100 text-[11px] text-amber-800">
                                                        <span className="font-bold text-[9px] text-amber-700 uppercase tracking-wider block">Observaciones:</span>
                                                        <p className="mt-0.5">{entry.observacionesTexto}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-2 border-t border-border/50 text-xs">
                                            <div className="text-fg-muted flex items-center gap-1">
                                                <MapPin size={12} className="text-red-500 shrink-0" />
                                                <span className="truncate max-w-[120px]">{entry.ubicacion || 'Sin ub.'}</span>
                                                {entry.latitud != null && entry.longitud != null && (
                                                    <a href={urlMapa(entry.latitud, entry.longitud)} target="_blank" rel="noreferrer" className="text-primary font-bold ml-1">Ver</a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {entry.foto && <img src={entry.foto} alt="Evid." className="w-6 h-6 rounded object-cover border" />}
                                                {entry.firma && <img src={entry.firma} alt="Firma" className="w-6 h-6 rounded object-contain border bg-white" />}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/30">
                                            <button
                                                onClick={() => {
                                                    setSelectedDiario(entry);
                                                    setDiarioOpen(true);
                                                }}
                                                className={clsx(
                                                    "w-full py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-bold",
                                                    entry.estadoActividad === 'PENDIENTE'
                                                        ? "bg-primary text-white hover:bg-primary/95"
                                                        : "bg-surface text-fg-muted border border-border hover:bg-surface-muted hover:text-fg"
                                                )}
                                            >
                                                <Pencil size={13} />
                                                {entry.estadoActividad === 'PENDIENTE' ? "Registrar Atención" : "Editar Registro"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <DiarioCampoModal 
                open={diarioOpen} 
                entradaEditar={selectedDiario}
                onClose={() => { 
                    setDiarioOpen(false); 
                    setSelectedDiario(null); 
                    loadDiarios(); 
                }} 
            />
        </div>
    );
};

