import React, { useState, useEffect } from 'react';
import type { ActividadPerfil, AgendaSemanal, HorarioDia } from './actividades.types';
import { defaultAgenda } from './actividades.types';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ActividadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (actividad: ActividadPerfil) => void;
    initialData?: ActividadPerfil;
}

const OPCIONES_ACTIVIDAD_CALLE = [
    'Venta de golosinas',
    'Venta de productos en transporte',
    'Limpieza de parabrisas',
    'Lustrabotas',
    'Reciclaje',
    'Mendicidad',
    'Malabares / Arte callejero',
    'Otro (especificar)'
];

const DIAS_SEMANA: (keyof AgendaSemanal)[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// Helper to calculate hours
const calcularHorasDia = (inicio: string, fin: string) => {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    if (diff < 0) diff += 24; // cruzó medianoche
    return diff;
};

export const ActividadModal: React.FC<ActividadModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [actividad, setActividad] = useState('');
    const [actividadEspecifique, setActividadEspecifique] = useState('');
    const [tiempoModo, setTiempoModo] = useState<'simple' | 'detalle'>('simple');
    const [tiempoValor, setTiempoValor] = useState('');
    const [tiempoUnidad, setTiempoUnidad] = useState('Meses');
    const [tiempoDetalle, setTiempoDetalle] = useState('');
    const [condicion, setCondicion] = useState('SOLO');
    const [agenda, setAgenda] = useState<AgendaSemanal>(defaultAgenda);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setActividad(initialData.actividad || '');
                setActividadEspecifique(initialData.actividadEspecifique || '');
                setCondicion(initialData.acompanamiento || 'SOLO');
                setTiempoValor(initialData.tiempoValor || '');
                setTiempoUnidad(initialData.tiempoUnidad || 'Meses');
                // Si el valor no es un número limpio o si no hay unidad clara, asumimos modo detalle
                if (initialData.tiempoValor && isNaN(Number(initialData.tiempoValor))) {
                    setTiempoModo('detalle');
                    setTiempoDetalle(initialData.tiempoValor);
                } else {
                    setTiempoModo('simple');
                }
                setAgenda(initialData.agenda || defaultAgenda);
            } else {
                setActividad('');
                setActividadEspecifique('');
                setTiempoModo('simple');
                setTiempoValor('');
                setTiempoUnidad('Meses');
                setTiempoDetalle('');
                setCondicion('SOLO');
                setAgenda(defaultAgenda);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const seleccionarDiasPredefinidos = (modo: 'todos' | 'laborables' | 'finde' | 'ninguno') => {
        const nuevaAgenda = { ...agenda };
        DIAS_SEMANA.forEach(dia => {
            let activo = false;
            if (modo === 'todos') activo = true;
            else if (modo === 'laborables' && !['sabado', 'domingo'].includes(dia)) activo = true;
            else if (modo === 'finde' && ['sabado', 'domingo'].includes(dia)) activo = true;
            
            nuevaAgenda[dia] = { ...nuevaAgenda[dia], activo };
        });
        setAgenda(nuevaAgenda);
    };

    const copiarHorariosPrimerDiaActivo = () => {
        const primerDiaActivo = DIAS_SEMANA.find(d => agenda[d].activo);
        if (!primerDiaActivo) return;
        
        const horarioBase = agenda[primerDiaActivo];
        const nuevaAgenda = { ...agenda };
        DIAS_SEMANA.forEach(dia => {
            if (nuevaAgenda[dia].activo) {
                nuevaAgenda[dia] = {
                    ...nuevaAgenda[dia],
                    turno1Inicio: horarioBase.turno1Inicio,
                    turno1Fin: horarioBase.turno1Fin,
                    turno2Inicio: horarioBase.turno2Inicio,
                    turno2Fin: horarioBase.turno2Fin,
                };
            }
        });
        setAgenda(nuevaAgenda);
    };

    const handleSave = () => {
        const tiempoFinal = tiempoModo === 'simple' ? tiempoValor : tiempoDetalle;
        if (!actividad || !tiempoFinal) {
            alert('Por favor complete la actividad y la duración.');
            return;
        }

        onSave({
            actividad,
            actividadEspecifique: actividad === 'Otro (especificar)' ? actividadEspecifique : undefined,
            acompanamiento: condicion,
            tiempoValor: tiempoFinal,
            tiempoUnidad: tiempoModo === 'simple' ? tiempoUnidad : 'Detalle',
            agenda
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fadeIn p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                
                {/* Cabecera del modal */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                            {initialData ? '✏️ Editar Actividad en Calle' : '➕ Agregar Actividad en Calle'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Configura la actividad, la permanencia de tiempo y su agenda semanal de horarios.</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cuerpo del modal */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                    
                    {/* Actividad */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase block">¿Qué actividad realiza?</label>
                        <select
                            value={actividad}
                            onChange={(e) => setActividad(e.target.value)}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm bg-white"
                        >
                            <option value="">-- SELECCIONA UNA ACTIVIDAD --</option>
                            {OPCIONES_ACTIVIDAD_CALLE.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        
                        {actividad === 'Otro (especificar)' && (
                            <div className="pt-2 animate-slideDown">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Especifica la actividad</label>
                                <input
                                    type="text"
                                    value={actividadEspecifique}
                                    onChange={(e) => setActividadEspecifique(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm uppercase"
                                    placeholder="Escribe la actividad específica"
                                />
                            </div>
                        )}
                    </div>

                    {/* Duración / Hace cuánto */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-700 uppercase block">¿Hace cuánto tiempo realiza esta actividad en calle?</label>
                        
                        {/* Selector de modo */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
                            <button
                                type="button"
                                onClick={() => setTiempoModo('simple')}
                                className={clsx(
                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                    tiempoModo === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                ⏱️ Registro Simple
                            </button>
                            <button
                                type="button"
                                onClick={() => setTiempoModo('detalle')}
                                className={clsx(
                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                    tiempoModo === 'detalle' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                📝 Escribir Detalle
                            </button>
                        </div>

                        {tiempoModo === 'simple' ? (
                            <div className="grid grid-cols-2 gap-4 max-w-md animate-slideDown">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Cantidad</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={tiempoValor}
                                        onChange={(e) => setTiempoValor(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Unidad de Tiempo</span>
                                    <select
                                        value={tiempoUnidad}
                                        onChange={(e) => setTiempoUnidad(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm bg-white"
                                    >
                                        <option value="Días">Día(s)</option>
                                        <option value="Semanas">Semana(s)</option>
                                        <option value="Meses">Mes(es)</option>
                                        <option value="Años">Año(s)</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-slideDown">
                                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Escribe la duración</span>
                                <input
                                    type="text"
                                    value={tiempoDetalle}
                                    onChange={(e) => setTiempoDetalle(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm"
                                    placeholder="Ej: 3 meses, 1 año, intermitente hace semanas..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Condición de acompañamiento */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 pt-6">
                        <label className="text-xs font-black text-slate-700 uppercase block mb-3">¿Cómo o con quién realizas la actividad?</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { val: 'SOLO', label: 'Solo', desc: 'Sin compañía' },
                                { val: 'PARES', label: 'Acompañado de Pares', desc: 'Amigos o hermanos menores' },
                                { val: 'FAMILIA', label: 'Acompañado de familiar', desc: 'Padres o parientes directos' }
                            ].map((opt) => (
                                <label 
                                    key={opt.val} 
                                    className={clsx(
                                        "cursor-pointer border rounded-xl p-4 flex flex-col gap-1 transition-all hover:bg-slate-50 text-left",
                                        condicion === opt.val ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200 bg-white"
                                    )}
                                >
                                    <input 
                                        type="radio" 
                                        value={opt.val} 
                                        checked={condicion === opt.val}
                                        onChange={() => setCondicion(opt.val)}
                                        className="sr-only" 
                                    />
                                    <span className="font-bold text-xs text-gray-900 uppercase block">{opt.label}</span>
                                    <span className="text-[10px] text-gray-500 leading-tight block">{opt.desc}</span>
                                    <div className="flex justify-end mt-2">
                                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", condicion === opt.val ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                            {condicion === opt.val && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Sub-formulario de Agenda de Trabajo Semanal Checkboxes */}
                    <div className="border-t border-slate-100 pt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                <span>📅 Agenda Semanal de la Actividad</span>
                            </h4>
                            
                            {/* Botones de selección rápida */}
                            <div className="flex flex-wrap gap-1.5">
                                <button type="button" onClick={() => seleccionarDiasPredefinidos('todos')} className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm" title="Activar de Lunes a Domingo">Todos</button>
                                <button type="button" onClick={() => seleccionarDiasPredefinidos('laborables')} className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm" title="Activar de Lunes a Viernes">Lun-Vie</button>
                                <button type="button" onClick={() => seleccionarDiasPredefinidos('finde')} className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm" title="Activar Sábado y Domingo">Sáb-Dom</button>
                                <button type="button" onClick={() => seleccionarDiasPredefinidos('ninguno')} className="text-[9px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded transition-all uppercase border border-rose-200 shadow-sm" title="Desactivar todos los días">Limpiar</button>
                            </div>
                        </div>

                        {/* Premium: Copiar horarios de forma masiva */}
                        {Object.values(agenda).filter(d => d.activo).length > 1 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between gap-3 animate-slideDown">
                                <span className="text-[10px] text-blue-700 font-medium leading-tight">
                                    💡 Configura el horario del primer día marcado y cópialo a los demás días activos para ahorrar tiempo.
                                </span>
                                <button type="button" onClick={copiarHorariosPrimerDiaActivo} className="text-[9px] font-black bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md shadow-sm transition-all uppercase whitespace-nowrap flex items-center gap-1 hover:scale-[1.02] active:scale-95">
                                    ⚡ Copiar Horario
                                </button>
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            {DIAS_SEMANA.map((dia) => {
                                const isDiaActivo = agenda[dia].activo;
                                const tieneTurno2 = agenda[dia].turno2Inicio !== '' || agenda[dia].turno2Fin !== '';

                                return (
                                    <div key={dia} className={clsx("border rounded-xl p-4 transition-all duration-200 text-left", isDiaActivo ? "border-blue-200 bg-blue-50/10 shadow-sm" : "border-slate-200 bg-slate-50/50 opacity-70")}>
                                        {/* Checkbox selector del Día */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input 
                                                    type="checkbox" 
                                                    id={`modal-switch-${dia}`}
                                                    checked={isDiaActivo}
                                                    onChange={(e) => setAgenda({...agenda, [dia]: {...agenda[dia], activo: e.target.checked}})}
                                                    className="h-5 w-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <label htmlFor={`modal-switch-${dia}`} className="font-bold text-sm text-slate-800 cursor-pointer select-none uppercase">{dia}</label>
                                            </div>
                                            {isDiaActivo && (
                                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                                                    {Math.round((calcularHorasDia(agenda[dia].turno1Inicio, agenda[dia].turno1Fin) + calcularHorasDia(agenda[dia].turno2Inicio, agenda[dia].turno2Fin)) * 10) / 10} hrs
                                                </span>
                                            )}
                                        </div>

                                        {/* Despliegue de Horas si está activo */}
                                        {isDiaActivo && (
                                            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 space-y-4 animate-slideDown">
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    {/* Turno 1 */}
                                                    <div className="flex-1 space-y-1">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase block">Jornada / Turno 1</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                <span className="text-xs text-slate-500 font-bold">De:</span>
                                                                <input type="time" value={agenda[dia].turno1Inicio} onChange={(e) => setAgenda({...agenda, [dia]: {...agenda[dia], turno1Inicio: e.target.value}})} className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" />
                                                            </div>
                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                <span className="text-xs text-slate-500 font-bold">A:</span>
                                                                <input type="time" value={agenda[dia].turno1Fin} onChange={(e) => setAgenda({...agenda, [dia]: {...agenda[dia], turno1Fin: e.target.value}})} className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Checkbox Doble Turno */}
                                                    <div className="flex items-end pb-2">
                                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={tieneTurno2}
                                                                onChange={(e) => {
                                                                    if (!e.target.checked) {
                                                                        setAgenda({...agenda, [dia]: {...agenda[dia], turno2Inicio: '', turno2Fin: ''}});
                                                                    } else {
                                                                        setAgenda({...agenda, [dia]: {...agenda[dia], turno2Inicio: '14:00', turno2Fin: '18:00'}});
                                                                    }
                                                                }}
                                                                className="rounded text-blue-600 h-4 w-4 border-slate-300 focus:ring-blue-500" 
                                                            />
                                                            <span>Doble turno</span>
                                                        </label>
                                                    </div>

                                                    {/* Turno 2 */}
                                                    {tieneTurno2 && (
                                                        <div className="flex-1 space-y-1 animate-slideDown">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase block">Turno 2 (Tarde/Noche)</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                    <span className="text-xs text-slate-500 font-bold">De:</span>
                                                                    <input type="time" value={agenda[dia].turno2Inicio} onChange={(e) => setAgenda({...agenda, [dia]: {...agenda[dia], turno2Inicio: e.target.value}})} className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" />
                                                                </div>
                                                                <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                    <span className="text-xs text-slate-500 font-bold">A:</span>
                                                                    <input type="time" value={agenda[dia].turno2Fin} onChange={(e) => setAgenda({...agenda, [dia]: {...agenda[dia], turno2Fin: e.target.value}})} className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2.5 text-sm font-black bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all uppercase flex items-center gap-2">
                        Guardar Actividad
                    </button>
                </div>
            </div>
        </div>
    );
};
