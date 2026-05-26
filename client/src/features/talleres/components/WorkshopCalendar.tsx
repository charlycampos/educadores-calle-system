import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import type { Taller } from '../../../api/talleres.api';

interface WorkshopCalendarProps {
    talleres: Taller[];
    onSelectTaller: (taller: Taller) => void;
    onNewTaller: (date: string) => void;
}

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const WorkshopCalendar = ({ talleres, onSelectTaller, onNewTaller }: WorkshopCalendarProps) => {
    const [viewDate, setViewDate] = useState(new Date());

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastDay  = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays   = lastDay.getDate();

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const goToday   = () => setViewDate(new Date());

    const getTalleresForDay = (day: number) =>
        talleres
            .filter(t => {
                if (!t.fecha) return false;
                
                // Parse date carefully to avoid timezone shift
                // If t.fecha is "YYYY-MM-DD", new Date(t.fecha) will be midnight UTC.
                // If it includes time, it will be local or UTC.
                const d = new Date(t.fecha);
                
                // Standardizing comparison by using the local date components of the stored date
                // We use getUTCDate/Month/FullYear if the backend sends ISO without time,
                // or getDate/Month/FullYear if it sends local time.
                // Assuming backend sends a full ISO string from Oracle TIMESTAMP.
                return d.getDate() === day &&
                    d.getMonth() === viewDate.getMonth() &&
                    d.getFullYear() === viewDate.getFullYear();
            })
            .sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

    const today = new Date();

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Header del calendario */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {MONTHS[viewDate.getMonth()]}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">{viewDate.getFullYear()}</p>
                </div>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-gray-50 transition-colors text-gray-500"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={goToday}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-x border-gray-200"
                    >
                        HOY
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-50 transition-colors text-gray-500"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {DAYS.map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
                {/* Celdas vacías antes del primer día */}
                {Array.from({ length: startingDay }).map((_, i) => (
                    <div key={`blank-${i}`} className="min-h-[110px] bg-gray-50/50" />
                ))}

                {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1;
                    const dayTalleres = getTalleresForDay(day);
                    const isToday =
                        day === today.getDate() &&
                        viewDate.getMonth() === today.getMonth() &&
                        viewDate.getFullYear() === today.getFullYear();

                    return (
                        <div
                            key={day}
                            onClick={() => {
                                const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
                                    .toISOString().split('T')[0];
                                onNewTaller(dateStr);
                            }}
                            className={`min-h-[110px] p-2 transition-colors cursor-pointer group relative
                                ${isToday ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}
                            `}
                        >
                            {/* Número del día */}
                            <div className="flex justify-between items-start mb-1.5">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-blue-600 text-white' : 'text-gray-400 group-hover:text-gray-700'}
                                `}>
                                    {day}
                                </span>
                                {dayTalleres.length > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-0.5" />
                                )}
                            </div>

                            {/* Talleres del día */}
                            <div className="space-y-1">
                                {dayTalleres.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectTaller(t);
                                        }}
                                        className={`w-full text-left px-2 py-1 rounded-md text-[10px] font-semibold leading-tight transition-all hover:opacity-80
                                            ${t.estado === 'PLANIFICADO'
                                                ? 'bg-blue-100 text-blue-800'
                                                : t.estado === 'EJECUTADO'
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-emerald-100 text-emerald-800'
                                            }
                                        `}
                                    >
                                        <span className="flex items-center gap-1">
                                            <Clock size={9} className="opacity-60 flex-shrink-0" />
                                            {t.hora}
                                        </span>
                                        <span className="truncate block mt-0.5">{t.nombre}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Hover: ícono de agregar */}
                            {dayTalleres.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                    <Plus size={20} className="text-blue-300" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer con leyenda y totales */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center gap-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Planificado
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> En ejecución
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Completado
                    </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                        <strong className="text-blue-600">{talleres.filter(t => t.estado === 'PLANIFICADO').length}</strong> pendientes
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                        <strong className="text-gray-700">{talleres.length}</strong> total
                    </span>
                </div>
            </div>
        </div>
    );
};
