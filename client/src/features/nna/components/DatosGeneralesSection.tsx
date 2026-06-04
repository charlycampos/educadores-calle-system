import React from 'react';
import { useFormContext } from 'react-hook-form';
import { InputField, SectionHeader } from '../../../components/ui/FormFields';
import { clsx } from 'clsx';
import type { NnaFormData } from '../types/nna-form.types';

export const DatosGeneralesSection: React.FC = () => {
    const { register, watch, formState: { errors } } = useFormContext<NnaFormData>();
    const perfilValue = watch('perfil');

    return (
        <div className="space-y-6 animate-fadeIn">
            <SectionHeader title="I. Datos Generales" subtitle="Ubicación de la intervención and marco temporal." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <InputField
                        label="Zona de Intervención (Lugar específico)"
                        register={register('zonaIntervencion', { required: 'La zona es obligatoria' })}
                        placeholder="Ej: Plaza de Armas, Jr. Comercio..."
                        error={errors.zonaIntervencion}
                    />
                </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-2">
                <label className="block text-sm font-bold text-gray-700 mb-3">Perfil del NNA</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['TRABAJO_EN_CALLE', 'MENDICIDAD', 'VIDA_EN_CALLE'].map((perf) => (
                        <label key={perf} className={clsx(
                            "cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                            perfilValue === perf ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200"
                        )}>
                            <input type="radio" value={perf} {...register('perfil', { required: true })} className="sr-only" />
                            <span className="font-bold text-xs text-gray-600 block text-center uppercase">{perf.replace(/_/g, ' ')}</span>
                            <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", perfilValue === perf ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                {perfilValue === perf && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-2">
                <label className="block text-sm font-bold text-gray-700 mb-3">¿Víctima de Explotación Sexual?</label>
                <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm transition-all hover:bg-gray-50">
                        <input type="radio" value="SI" {...register('victimaExplotacion')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="font-bold text-sm text-gray-800">SÍ</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm transition-all hover:bg-gray-50">
                        <input type="radio" value="NO" {...register('victimaExplotacion')} className="text-blue-600 focus:ring-blue-500" />
                        <span className="font-bold text-sm text-gray-800">NO</span>
                    </label>
                </div>
            </div>

            {perfilValue === 'VIDA_EN_CALLE' && (
                <div className="border-t border-gray-100 pt-6 mt-2 animate-fadeIn">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Modalidad de Permanencia (Situación)</label>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                            <input type="radio" value="TRANSITO_EN_CALLE" {...register('situacionCalle', { required: perfilValue === 'VIDA_EN_CALLE' ? 'Debe marcar la situación' : false })} className="text-yellow-600 focus:ring-yellow-500" />
                            <span className="font-bold text-sm text-gray-800">Tránsito en Calle</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                            <input type="radio" value="CONVIVENCIA_EN_CALLE" {...register('situacionCalle', { required: perfilValue === 'VIDA_EN_CALLE' ? 'Debe marcar la situación' : false })} className="text-yellow-600 focus:ring-yellow-500" />
                            <span className="font-bold text-sm text-gray-800">Convivencia en Calle (Pernocte)</span>
                        </label>
                    </div>
                    {errors.situacionCalle && <span className="text-red-500 text-xs font-bold mt-1">Este campo es requerido.</span>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                <InputField type="date" label="Fecha de Abordaje" register={register('fechaAbordaje')} />
                <InputField type="date" label="Fecha de Ingreso" register={register('fechaIngreso')} />
                <InputField type="date" label="Fecha Reingreso" register={register('fechaReingreso')} />
                <InputField type="date" label="Fecha Cambio Perfil" register={register('fechaCambioPerfil')} />
            </div>
        </div>
    );
};
