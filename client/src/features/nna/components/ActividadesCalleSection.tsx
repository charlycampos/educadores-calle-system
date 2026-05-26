import React, { useState, useMemo } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import clsx from 'clsx';
import { Briefcase, Clock, Plus, Trash2, Edit2, AlertCircle, Timer } from 'lucide-react';
import type { ActividadPerfil, AgendaSemanal } from './actividades.types';
import { ActividadModal } from './ActividadModal';

interface ActividadesCalleSectionProps {
    control: Control<any>;
}

const diffHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const date1 = new Date(2000, 1, 1, h1, m1);
    let date2 = new Date(2000, 1, 1, h2, m2);
    if (date2 < date1) date2.setDate(date2.getDate() + 1);
    return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
};

const calcularHorasSemanales = (agenda: AgendaSemanal): number => {
    let total = 0;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
    dias.forEach(dia => {
        const d = agenda[dia];
        if (d && d.activo) {
            total += diffHours(d.turno1Inicio, d.turno1Fin);
            total += diffHours(d.turno2Inicio, d.turno2Fin);
        }
    });
    return total;
};

const DIAS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export const ActividadesCalleSection: React.FC<ActividadesCalleSectionProps> = ({ control }) => {
    const { fields, append, remove, update } = useFieldArray({
        control,
        name: 'actividadesCalle'
    });

    const watchedFields = useWatch({ control, name: 'actividadesCalle' });
    const actividades = (watchedFields || fields) as unknown as ActividadPerfil[];

    const [modalState, setModalState] = useState<{ isOpen: boolean; editIndex: number | null }>({
        isOpen: false,
        editIndex: null
    });

    const openModal = (index: number | null = null) => {
        setModalState({ isOpen: true, editIndex: index });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, editIndex: null });
    };

    const handleSaveActivity = (actividad: ActividadPerfil) => {
        if (modalState.editIndex !== null) {
            update(modalState.editIndex, actividad);
        } else {
            append(actividad);
        }
        closeModal();
    };

    const horasSemanalesCalculadas = useMemo(() => {
        let total = 0;
        actividades.forEach(act => {
            if (act.agenda) {
                total += calcularHorasSemanales(act.agenda);
            }
        });
        return Number(total.toFixed(1));
    }, [actividades]);

    const horasMensualesCalculadas = Number((horasSemanalesCalculadas * 4.28).toFixed(1));

    const riesgo = useMemo(() => {
        if (horasSemanalesCalculadas === 0) return { color: 'border-slate-200 text-slate-500 bg-slate-50', etiqueta: 'Sin Actividad', desc: 'No se han registrado horas.' };
        if (horasSemanalesCalculadas < 15) return { color: 'border-green-200 text-green-700 bg-green-50', etiqueta: 'Riesgo Bajo', desc: 'Jornada leve o esporádica.' };
        if (horasSemanalesCalculadas <= 35) return { color: 'border-yellow-300 text-yellow-700 bg-yellow-50', etiqueta: 'Riesgo Moderado', desc: 'Jornada que requiere seguimiento.' };
        return { color: 'border-red-300 text-red-700 bg-red-50', etiqueta: 'Riesgo Crítico (Explotación Severa)', desc: '¡Peligro!: Jornada severa que atenta contra la integridad del menor.' };
    }, [horasSemanalesCalculadas]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Lista de Actividades */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            <h3 className="font-black text-slate-700 uppercase tracking-wide text-sm">Actividades en Calle</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                            {fields.length} actividades
                        </span>
                    </div>

                    <div className="p-6 flex-1 space-y-6">
                        {fields.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-bold text-sm">No hay actividades registradas</p>
                                <p className="text-slate-400 text-xs mb-4">Añade la primera actividad para generar la agenda.</p>
                                <button
                                    type="button"
                                    onClick={() => openModal()}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    + Agregar Actividad
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Encabezados de tabla simulada */}
                                <div className="hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-200">
                                    <div className="col-span-4">Actividad / Trabajo</div>
                                    <div className="col-span-2 text-center">Acompañamiento</div>
                                    <div className="col-span-2 text-center">Permanencia</div>
                                    <div className="col-span-4 text-center">Agenda Semanal</div>
                                </div>
 
                                 {actividades.map((act, index) => (
                                     <div key={(fields[index] as any).id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center group relative border-b border-slate-100 py-5 last:border-0 last:pb-0">
                                         
                                         <div className="md:col-span-4 flex items-center gap-3">
                                             <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                                             <div>
                                                 <p className="font-extrabold text-slate-800 text-xs tracking-wide uppercase">
                                                     {act.actividad === 'OTROS' ? act.actividadEspecifique : act.actividad?.replace(/_/g, ' ')}
                                                 </p>
                                             </div>
                                         </div>
 
                                         <div className="md:col-span-2 text-center flex justify-start md:justify-center">
                                             <span className="text-[10px] font-bold px-3 py-1 bg-slate-50 text-slate-500 rounded-full border border-slate-200/60 tracking-wider uppercase">
                                                 {act.acompanamiento}
                                             </span>
                                         </div>
 
                                         <div className="md:col-span-2 text-center flex items-center justify-start md:justify-center gap-1.5 text-slate-500 font-semibold text-xs">
                                             <Timer className="w-4 h-4 text-slate-400" />
                                             <span>{act.tiempoValor} {act.tiempoUnidad?.toLowerCase()}</span>
                                         </div>
 
                                         <div className="md:col-span-4 flex flex-col items-start md:items-center">
                                             <div className="flex gap-1.5 mb-2.5">
                                                 {DIAS_KEYS.map((k, i) => {
                                                     const isActive = act.agenda?.[k]?.activo;
                                                     return (
                                                         <div key={k} className={clsx("w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-black transition-all", isActive ? "bg-blue-600 text-white shadow-sm border border-blue-600" : "bg-slate-50 text-slate-300 border border-slate-200/60")}>
                                                             {DIAS_SHORT[i]}
                                                         </div>
                                                     )
                                                 })}
                                             </div>
                                             
                                             <div className="grid grid-cols-2 gap-1.5 w-full max-w-[280px]">
                                                 {DIAS_KEYS.filter(k => act.agenda?.[k]?.activo).map(k => {
                                                     const d = act.agenda[k];
                                                     const text = d.turno2Inicio ? `${d.turno1Inicio}-${d.turno1Fin} / ${d.turno2Inicio}-${d.turno2Fin}` : `${d.turno1Inicio}-${d.turno1Fin}`;
                                                     return (
                                                         <div key={k} className="bg-blue-50/70 border border-blue-100/50 rounded-lg px-2 py-1 text-blue-700 font-bold text-[9px] flex items-center justify-between gap-1 uppercase shadow-sm">
                                                             <span className="text-blue-800 font-extrabold">{k.substring(0,2)}:</span>
                                                             <span className="font-mono tracking-tighter text-[8.5px]">{text}</span>
                                                         </div>
                                                     );
                                                 })}
                                             </div>
                                         </div>

                                        {/* Acciones Hover */}
                                        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur pl-2 flex gap-1 shadow-sm rounded-lg border border-slate-100">
                                            <button type="button" onClick={() => openModal(index)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => openModal()}
                                    className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-bold text-sm uppercase tracking-wider hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Agregar Actividad
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Cómputo General Horario */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-700 uppercase border-b pb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" /> Cómputo General Horario
                    </h3>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-5 relative shadow overflow-hidden group hover:scale-[1.02] transition-all duration-200">
                        <div className="absolute right-0 bottom-0 opacity-10 text-9xl font-black -mb-8 -mr-4 pointer-events-none select-none">W</div>
                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-85">Horas por Semana</span>
                        <span className="text-5xl font-extrabold block mt-2 tracking-tight">{horasSemanalesCalculadas} <span className="text-sm font-normal">hrs</span></span>
                        <span className="text-[10px] block mt-2 opacity-80">Suma total de todas las actividades</span>
                    </div>

                    <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white rounded-xl p-5 relative shadow overflow-hidden group hover:scale-[1.02] transition-all duration-200">
                        <div className="absolute right-0 bottom-0 opacity-10 text-9xl font-black -mb-8 -mr-4 pointer-events-none select-none">M</div>
                        <span className="text-[10px] font-black uppercase tracking-wider block opacity-85">Horas Mensuales (Est.)</span>
                        <span className="text-5xl font-extrabold block mt-2 tracking-tight">{horasMensualesCalculadas} <span className="text-sm font-normal">hrs</span></span>
                        <span className="text-[10px] block mt-2 opacity-80">Promedio mensual global</span>
                    </div>

                    <div className={clsx("border-2 rounded-xl p-5 space-y-3 transition-all duration-300", riesgo.color)}>
                        <div className="flex items-center justify-between border-b border-current/15 pb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider block">Intensidad Laboral</span>
                            {horasSemanalesCalculadas > 0 && <span className="text-xs animate-pulse">●</span>}
                        </div>
                        <span className="text-base font-black block leading-tight">{riesgo.etiqueta}</span>
                        <p className="text-xs leading-relaxed opacity-90">{riesgo.desc}</p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1.5 mb-2">
                            <AlertCircle className="w-3.5 h-3.5 text-yellow-500" /> Consejos de Registro
                        </span>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Agrega las actividades de forma desglosada con su respectiva agenda horaria en el modal. El sistema computará las horas totales acumuladas por semana de manera autónoma para asegurar la precisión del semáforo.
                        </p>
                    </div>
                </div>
            </div>

            <ActividadModal 
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onSave={handleSaveActivity}
                initialData={modalState.editIndex !== null ? actividades[modalState.editIndex] : undefined}
            />
        </div>
    );
};
