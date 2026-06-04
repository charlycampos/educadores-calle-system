import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { SectionHeader, InputField } from '../../../components/ui/FormFields';
import { useNnaStore } from '../../../store/nna.store';
import { clsx } from 'clsx';
import { Home, Users, Plus, Trash2, Edit2, Calendar, AlertCircle } from 'lucide-react';
import type { NnaFormData, NnaPersonalData, ActividadTiempoLibre } from '../types/nna-form.types';

interface FamiliaSectionProps {
    setEditingFamiliarIndex: (index: number | null) => void;
    setShowTutorModal: (show: boolean) => void;
    setEditingActivityIndex: (index: number | null) => void;
    setShowTimeActivityModal: (show: boolean) => void;
    setCurrentNnaIndexForDuplicate: (index: number) => void;
    handleDeleteActivity: (nnaIndex: number, actIndex: number) => void;
}

const RiskAssessmentPanel = ({ nnaData, actividadesList }: { nnaData: any; actividadesList: ActividadTiempoLibre[] }) => {
    const calcularTotales = () => {
        let estudiar = 0, trabajar = 0, dormir = 0, jugar = 0;
        
        actividadesList.forEach(act => {
            if (act.categoria === 'ESTUDIAR') estudiar += act.horasSemana;
            if (act.categoria === 'DORMIR') dormir += act.horasSemana;
            if (act.categoria === 'JUGAR') jugar += act.horasSemana;
        });

        if (nnaData.usoTiempo) {
            Object.values(nnaData.usoTiempo).forEach((dia: any) => {
                trabajar += dia.trabajar || 0;
            });
        }

        return { estudiar, trabajar, dormir, jugar };
    };

    const totales = calcularTotales();
    const promedioDiarioSueño = Math.round((totales.dormir / 7) * 10) / 10;

    let nivelRiesgo: 'critico' | 'moderado' | 'leve' | 'sin_riesgo' = 'sin_riesgo';
    const alertas: string[] = [];

    if (totales.trabajar > 30 || promedioDiarioSueño < 6) {
        nivelRiesgo = 'critico';
        alertas.push('🔴 Riesgo CRÍTICO: Explotación laboral o privación grave de sueño');
    } else if (totales.trabajar > 14 || promedioDiarioSueño < 8 || totales.trabajar > totales.estudiar) {
        nivelRiesgo = 'moderado';
        alertas.push('🟠 Riesgo MODERADO: Interferencia con educación o sueño insuficiente');
    } else if (totales.trabajar > 0) {
        nivelRiesgo = 'leve';
        alertas.push('🟡 Riesgo LEVE: Trabajo infantil moderado');
    }

    if (promedioDiarioSueño < 8) {
        alertas.push(`😴 Privación de sueño: ${promedioDiarioSueño}h/día (recomendado 8-10h)`);
    }
    if (totales.trabajar > totales.estudiar) {
        alertas.push(`📚 Interferencia educativa: Trabajo ${totales.trabajar}h > Estudio ${totales.estudiar}h`);
    }

    const colores = {
        critico: 'bg-red-100 border-red-300 text-red-900',
        moderado: 'bg-orange-100 border-orange-300 text-orange-900',
        leve: 'bg-yellow-100 border-yellow-300 text-yellow-900',
        sin_riesgo: 'bg-green-100 border-green-300 text-green-900'
    };

    return (
        <div className={`border rounded-lg p-4 ${colores[nivelRiesgo]}`}>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <AlertCircle size={16} />
                Panel de Evaluación de Riesgo
            </h4>
            <div className="space-y-2 text-sm">
                <p className="font-bold">
                    Semanal: Estudiar {totales.estudiar}h | Trabajar {totales.trabajar}h | Dormir {totales.dormir}h | Jugar {totales.jugar}h
                </p>
                {alertas.map((alerta, i) => (
                    <p key={i} className="text-xs">{alerta}</p>
                ))}
            </div>
        </div>
    );
};

const ActivityCard = ({ activity, onEdit, onDelete }: { activity: ActividadTiempoLibre; onEdit: () => void; onDelete: () => void }) => {
    const diasActivos = Object.entries(activity.horarios)
        .filter(([, v]) => v.turno1.inicio && v.turno1.fin)
        .map(([k]) => k.substring(0, 3))
        .join(', ');

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h4 className="font-bold text-gray-800">{activity.nombre}</h4>
                    <p className="text-xs text-gray-600">{activity.categoria}</p>
                </div>
                <div className="flex gap-1">
                    <button type="button" onClick={onEdit} className="p-1.5 hover:bg-blue-100 rounded text-blue-600">
                        <Edit2 size={16} />
                    </button>
                    <button type="button" onClick={onDelete} className="p-1.5 hover:bg-red-100 rounded text-red-600">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-blue-600">{activity.horasSemana}h/sem</span>
                <span className="text-xs font-bold text-green-600">{activity.horasMes}h/mes</span>
            </div>
            <div className="flex gap-1 flex-wrap">
                {diasActivos ? diasActivos.split(', ').map((d, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                        {d}
                    </span>
                )) : <span className="text-xs text-gray-400">Sin horarios</span>}
            </div>
        </div>
    );
};

export const FamiliaSection: React.FC<FamiliaSectionProps> = ({
    setEditingFamiliarIndex,
    setShowTutorModal,
    setEditingActivityIndex,
    setShowTimeActivityModal,
    setCurrentNnaIndexForDuplicate,
    handleDeleteActivity
}) => {
    const { register, watch, setValue, control } = useFormContext<NnaFormData>();
    const { fields } = useFieldArray({ control, name: "nnas" });
    const { fields: familiaresFields, replace: replaceFamiliares } = useFieldArray({ control, name: "familiares" });
    const { parametros } = useNnaStore();

    return (
        <div className="space-y-8 animate-fadeIn">
            <SectionHeader title="VI. Familia / VII. Tiempo Libre" subtitle="Datos de vivienda y actividades de tiempo libre." />

            {/* VI. FAMILIA */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <h3 className="bg-purple-50 text-purple-900 font-bold px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                    <Home size={18} /> VI. FAMILIA
                </h3>
                <div className="p-5 space-y-6">

                    <div className="space-y-3">
                        <div className="text-sm font-bold text-gray-800">¿Con quiénes vives?</div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            {(parametros?.OPCIONES_CONVIVENCIA_2026 || [
                                { value: '1', label: '1. Solo Padre' },
                                { value: '2', label: '2. Solo Madre' },
                                { value: '3', label: '3. Padre y madre' },
                                { value: '4', label: '4. Adulto responsable (familia extensa)' },
                                { value: '5', label: '5. Solo' },
                                { value: '6', label: '6. Otro' }
                            ]).map((opt: any) => (
                                <label key={opt.value} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${String(watch('viveCon')) === String(opt.value) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <input type="radio" value={opt.value} {...register('viveCon')} className="text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {(watch('viveCon') === '6' || watch('viveCon') === 'Otro') && (
                        <div className="animate-slideDown">
                            <InputField label="Especifique" register={register('detalleViveCon')} placeholder="Detalle..." />
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="text-sm font-bold text-gray-800">¿Dónde pernocta generalmente?</div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {['Casa Propia', 'Casa Familiar', 'Calle', 'Albergue', 'Refugio Temporal', 'Obra'].map((opt) => (
                                <label key={opt} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('lugarPernocte') === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <input type="radio" value={opt} {...register('lugarPernocte')} className="text-blue-600" />
                                    <span className="text-xs font-bold text-gray-700">{opt}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {watch('lugarPernocte') === 'Otro' && (
                        <div className="animate-slideDown">
                            <InputField label="Especifique" register={register('detalleLugarPernocte')} placeholder="Detalle..." />
                        </div>
                    )}

                    {/* Familiar / Adulto Responsable (SEC 2026) */}
                    <div className="border border-purple-100 rounded-xl bg-purple-50/30 p-5 mt-6 group hover:border-purple-200 transition-all">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100/50">
                            <h4 className="text-sm font-black text-purple-900 uppercase flex items-center gap-2">
                                <Users size={16} className="text-purple-700" /> Familiar / Adulto Responsable (SEC 2026)
                            </h4>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingFamiliarIndex(null);
                                    setShowTutorModal(true);
                                }}
                                className="px-3.5 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-all flex items-center gap-1 shadow-md shadow-purple-200"
                            >
                                <Plus size={13} /> Agregar Familiar Responsable
                            </button>
                        </div>

                        {familiaresFields.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {familiaresFields.map((field, idx) => {
                                    const isTutor = field.esTutorPrincipal === 'true' || field.esTutorPrincipal === true;
                                    return (
                                        <div key={field.id} className={clsx(
                                            "bg-white p-4 rounded-xl border shadow-sm animate-fadeIn flex flex-col justify-between transition-all hover:shadow-md",
                                            isTutor ? "border-purple-300 ring-1 ring-purple-300 bg-purple-50/5" : "border-gray-200"
                                        )}>
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded">
                                                        {field.parentesco || field.vinTutUsu || 'Familiar'}
                                                    </span>
                                                    {isTutor && (
                                                        <span className="px-2.5 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                            Tutor Principal
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm font-black text-gray-800 mt-2">
                                                    {field.nombres}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 text-xs">
                                                    <div>
                                                        <span className="text-gray-400 font-bold text-[9px] uppercase block">DNI / Documento</span>
                                                        <span className="font-bold text-gray-700">{field.dni || field.nroDocTutApo || 'Sin Documento'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-bold text-[9px] uppercase block">Teléfono</span>
                                                        <span className="font-bold text-gray-700">{field.telefono || 'No registra'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-bold text-[9px] uppercase block">Vive con NNA</span>
                                                        <span className="font-bold text-gray-700">{field.viveCon || 'NO'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 font-bold text-[9px] uppercase block">Ocupación</span>
                                                        <span className="font-bold text-gray-700">{field.ocupacion || 'No registra'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingFamiliarIndex(idx);
                                                        setShowTutorModal(true);
                                                    }}
                                                    className="px-2.5 py-1 hover:bg-purple-100 rounded text-purple-700 text-xs font-bold flex items-center gap-1 transition-all"
                                                >
                                                    <Edit2 size={12} /> Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...(watch('familiares') || [])].filter((_, i) => i !== idx);
                                                        setValue('familiares', updated);
                                                        replaceFamiliares(updated);
                                                        if (isTutor) {
                                                            setValue('tieneTutorApo', 'false');
                                                            setValue('priApeTutApo', '');
                                                            setValue('segApeTutApo', '');
                                                            setValue('nomApeTutApo', '');
                                                            setValue('sexoApo', '');
                                                            setValue('fechaNacApo', '');
                                                            setValue('nacionalidadApo', 'PERUANA');
                                                            setValue('tipDocTutApo', '1');
                                                            setValue('nroDocTutApo', '');
                                                            setValue('vinTutUsu', '');
                                                            setValue('lenMatApo', '10');
                                                            setValue('lenMatEspApo', '');
                                                            setValue('autIdeEtApo', '7');
                                                            setValue('autIdeEtEspApo', '');
                                                            setValue('tipoDiscapApo', '');
                                                            setValue('certDiscapApo', '99');
                                                            setValue('nombreTutor', '');
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 hover:bg-red-50 rounded text-red-600 text-xs font-bold flex items-center gap-1 transition-all"
                                                >
                                                    <Trash2 size={12} /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-purple-200 rounded-xl text-center">
                                <Users size={32} className="text-purple-300 mb-2" />
                                <div className="text-xs font-bold text-gray-700">Sin familiares o adultos responsables registrados</div>
                                <div className="text-[10px] text-gray-500 mt-0.5 max-w-xs">Agregue uno o más familiares presionando el botón superior.</div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-bold text-gray-800">¿Tiene antecedente de albergue?</div>
                        <div className="flex gap-3">
                            {[true, false].map((val) => (
                                <label key={String(val)} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('nnas.0.tieneAntecedenteAlbergue') === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                    <input
                                        type="radio"
                                        value={String(val)}
                                        onChange={() => fields.forEach((_, i) => setValue(`nnas.${i}.tieneAntecedenteAlbergue`, val))}
                                        checked={watch('nnas.0.tieneAntecedenteAlbergue') === val}
                                        className="text-blue-600"
                                    />
                                    <span className="text-xs font-bold text-gray-700">{val ? 'Sí' : 'No'}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {watch('nnas.0.tieneAntecedenteAlbergue') && (
                        <div className="animate-slideDown">
                            <InputField label="Detalle" register={register('nnas.0.detalleAntecedenteAlbergue' as const)} placeholder="Mencione dónde y cuándo..." />
                        </div>
                    )}
                </div>
            </div>

            {/* VII. ACTIVIDADES DE TIEMPO LIBRE */}
            {fields.map((field, nnaIndex) => (
                <div key={field.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <h3 className="bg-blue-50 text-blue-900 font-bold px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                        <Calendar size={18} /> VII. Actividades de Tiempo Libre - {watch(`nnas.${nnaIndex}.nombres`)} {watch(`nnas.${nnaIndex}.apellidoPaterno`)}
                    </h3>
                    <div className="p-5 space-y-4">

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                            {(watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || []).map((activity, actIndex) => (
                                <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    onEdit={() => {
                                        setEditingActivityIndex(actIndex);
                                        setShowTimeActivityModal(true);
                                    }}
                                    onDelete={() => handleDeleteActivity(nnaIndex, actIndex)}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingActivityIndex(null);
                                setShowTimeActivityModal(true);
                                setCurrentNnaIndexForDuplicate(nnaIndex);
                            }}
                            className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Agregar Actividad de Tiempo Libre
                        </button>

                        <RiskAssessmentPanel
                            nnaData={watch(`nnas.${nnaIndex}`)}
                            actividadesList={watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || []}
                        />

                    </div>
                </div>
            ))}
        </div>
    );
};
