import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { Link } from 'react-router-dom';
import { 
    Calendar, Clock, MapPin, Search, ArrowLeft, 
    PlusCircle, FileText, Pencil, ChevronLeft, ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../../components/ui/Button';
import { INTERVENCION_API_URL } from '../../config/api';
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

export const EducadorCalendarioPage = () => {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [diarioOpen, setDiarioOpen] = useState(false);
    const [selectedDiario, setSelectedDiario] = useState<DiaryEntryData | null>(null);
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());

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
    const filteredDiarios = diarios;

    const getDaysInMonth = (year: number, month: number) => {
        const firstDayOfMonth = new Date(year, month, 1);
        const dayOfWeek = firstDayOfMonth.getDay();
        const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const days = [];
        
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startOffset; i > 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i + 1),
                isCurrentMonth: false
            });
        }

        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= totalDaysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const getMonthName = (date: Date) => {
        const names = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${names[date.getMonth()]} ${date.getFullYear()}`;
    };

    const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const getEventPillStyle = (tipo: string, estado?: string, esInst?: boolean) => {
        let baseColor = 'indigo';
        if (esInst) baseColor = 'purple';
        else {
            switch (tipo) {
                case 'CONSEJERIA': baseColor = 'indigo'; break;
                case 'COORDINACION': baseColor = 'purple'; break;
                case 'VISITA': baseColor = 'amber'; break;
                case 'RECORRIDO': baseColor = 'emerald'; break;
                default: baseColor = 'gray'; break;
            }
        }

        const colors: Record<string, { bg: string, border: string, text: string, hoverBg: string }> = {
            indigo: { bg: 'bg-indigo-50/75', border: 'border-indigo-200', text: 'text-indigo-700', hoverBg: 'hover:bg-indigo-100' },
            purple: { bg: 'bg-purple-50/75', border: 'border-purple-200', text: 'text-purple-700', hoverBg: 'hover:bg-purple-100' },
            amber: { bg: 'bg-amber-50/75', border: 'border-amber-200', text: 'text-amber-850', hoverBg: 'hover:bg-amber-100' },
            emerald: { bg: 'bg-emerald-50/75', border: 'border-emerald-200', text: 'text-emerald-700', hoverBg: 'hover:bg-emerald-100' },
            gray: { bg: 'bg-gray-50/75', border: 'border-gray-200', text: 'text-gray-750', hoverBg: 'hover:bg-gray-100' }
        };

        const c = colors[baseColor] || colors.gray;
        const isPending = estado === 'PENDIENTE';

        return clsx(
            "px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex flex-col gap-0.5 relative group/pill text-left w-full select-none truncate",
            c.bg,
            isPending ? "border-dashed border-2 border-indigo-400 animate-pulse bg-opacity-40" : c.border,
            c.text,
            c.hoverBg
        );
    };

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
                            <Calendar size={22} className="text-primary" /> Calendario de Programaciones
                        </h1>
                    </div>
                    <p className="text-fg-secondary text-[13px]">
                        Planifica, programa y gestiona tus visitas y actividades de campo visualmente en un entorno de calendario mensual.
                    </p>
                </div>
                <div>
                    <Button 
                        variant="primary" 
                        onClick={() => { setSelectedDiario(null); setDiarioOpen(true); }}
                        className="font-bold gap-1.5"
                    >
                        <PlusCircle size={15} />
                        Programar Actividad
                    </Button>
                </div>
            </div>



            {/* Calendario principal */}
            <div className="bg-surface rounded-lg border border-border overflow-hidden p-4 space-y-4">
                {/* Cabecera del mes */}
                <div className="flex justify-between items-center bg-surface-muted/50 p-3 rounded-lg border border-border">
                    <h2 className="text-base sm:text-lg font-bold text-fg capitalize flex items-center gap-2">
                        <Calendar size={18} className="text-primary" />
                        {getMonthName(calendarDate)}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                            className="p-1.5"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setCalendarDate(new Date())}
                            className="text-xs font-bold px-3 py-1.5"
                        >
                            Hoy
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                            className="p-1.5"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>

                {/* Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] sm:text-xs text-fg-secondary uppercase tracking-wider select-none">
                    {weekDays.map(wd => (
                        <div key={wd} className="py-2 bg-surface-muted rounded-md border border-border/30">
                            {wd}
                        </div>
                    ))}
                </div>

                {/* Grilla de Días */}
                <div className="grid grid-cols-7 gap-[1px] bg-border border border-border rounded-lg overflow-hidden bg-surface-muted">
                    {getDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, idx) => {
                        const dayDiarios = filteredDiarios.filter(d => isSameDay(new Date(d.fecha), day.date));
                        const isToday = isSameDay(day.date, new Date());
                        
                        return (
                            <div
                                key={idx}
                                className={clsx(
                                    "min-h-[120px] bg-surface p-2 flex flex-col justify-between group relative transition-colors duration-200",
                                    !day.isCurrentMonth && "bg-surface-muted/40 text-fg-muted",
                                    isToday && "bg-primary/5 ring-1 ring-primary/20"
                                )}
                            >
                                {/* Cabecera del Día */}
                                <div className="flex justify-between items-center mb-1">
                                    <span
                                        className={clsx(
                                            "text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all",
                                            isToday ? "bg-primary text-white scale-110 font-black" : "text-fg-secondary"
                                        )}
                                    >
                                        {day.date.getDate()}
                                    </span>

                                    {/* Botón rápido para agregar actividad planificada */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const selectedDate = new Date(day.date);
                                            selectedDate.setHours(9, 0, 0, 0);
                                            setSelectedDiario({
                                                id: undefined,
                                                fecha: selectedDate.toISOString(),
                                                ubicacion: '',
                                                actividad: '',
                                                tipoActividad: 'CONSEJERIA',
                                                estadoActividad: 'PENDIENTE',
                                                nnaNombre: ''
                                            } as any);
                                            setDiarioOpen(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 hover:bg-primary/20 text-primary p-0.5 rounded-full"
                                        title="Planificar nueva actividad"
                                    >
                                        <PlusCircle size={14} />
                                    </button>
                                </div>

                                {/* Eventos / Bitácoras */}
                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[85px] pr-0.5 scrollbar-thin">
                                    {dayDiarios.map((entry) => {
                                        const tInfo = getTipoLabel(entry.tipoActividad, entry.esInstitucional);
                                        return (
                                            <div key={entry.id} className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedDiario(entry);
                                                        setDiarioOpen(true);
                                                    }}
                                                    className={getEventPillStyle(entry.tipoActividad, entry.estadoActividad, entry.esInstitucional)}
                                                >
                                                    <div className="flex justify-between items-center gap-1">
                                                        <span className="font-bold text-[9px] truncate">
                                                            {entry.esInstitucional ? entry.nombreInstitucion : entry.nnaNombre}
                                                        </span>
                                                        <span className="text-[8px] font-mono opacity-80 shrink-0">
                                                            {entry.horaInicio || new Date(entry.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                </button>

                                                {/* Tooltip Detallado */}
                                                <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-1.5 w-64 bg-surface border border-border rounded-lg shadow-xl p-3 text-xs text-fg space-y-2 pointer-events-none hidden group-hover/pill:block z-45">
                                                    <div className="flex justify-between items-center border-b border-border pb-1">
                                                        <span className="font-bold uppercase tracking-wider text-[9px] text-fg-muted">
                                                            {tInfo.label}
                                                        </span>
                                                        <span className={clsx(
                                                            "px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider",
                                                            getEstadoBadge(entry.estadoActividad).color
                                                        )}>
                                                            {getEstadoBadge(entry.estadoActividad).label}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-fg leading-tight">
                                                            {entry.esInstitucional ? `🏢 ${entry.nombreInstitucion}` : `👤 ${entry.nnaNombre}`}
                                                        </p>
                                                        {!entry.esInstitucional && entry.casoId && (
                                                            <p className="text-[9px] text-fg-muted font-mono mt-0.5">Caso #{entry.casoId}</p>
                                                        )}
                                                        <p className="text-[9px] text-fg-muted font-mono mt-0.5">
                                                            🕒 {entry.horaInicio && entry.horaFin ? `${entry.horaInicio} - ${entry.horaFin}` : 'Hora no especificada'}
                                                        </p>
                                                    </div>
                                                    {entry.actividadProgramada && (
                                                        <div className="bg-surface-muted/30 p-1.5 rounded border border-border/50">
                                                            <span className="font-bold text-[8px] text-fg-muted uppercase block">Planificado:</span>
                                                            <p className="text-fg-secondary text-[10px] leading-relaxed line-clamp-2">{entry.actividadProgramada}</p>
                                                        </div>
                                                    )}
                                                    {entry.actividad && entry.actividad !== "(Pendiente de ejecución)" && (
                                                        <div>
                                                            <span className="font-bold text-[8px] text-fg-muted uppercase block">Desarrollo:</span>
                                                            <p className="text-fg text-[10px] leading-relaxed line-clamp-3">{entry.actividad}</p>
                                                        </div>
                                                    )}
                                                    <div className="text-[9px] text-fg-muted flex items-center gap-1 border-t border-border/40 pt-1.5">
                                                        <MapPin size={9} className="text-red-500 shrink-0" />
                                                        <span className="truncate">{entry.ubicacion || 'Sin ubicación registrada'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
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
