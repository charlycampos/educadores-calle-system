import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { SectionHeader, SelectField, InputField } from '../../../components/ui/FormFields';
import { useNnaStore } from '../../../store/nna.store';
import { DISCAPACIDADES_CONADIS } from '../../../data/ubigeo';
import type { NnaFormData } from '../types/nna-form.types';

const SEGUROS_PREDEFINIDOS = [
    "EsSalud",
    "Seguro Privado / EPS",
    "Seguro de FF.AA. o Policiales",
    "Seguro Escolar Privado",
    "Seguro Universitario"
];

export const SaludSection: React.FC = () => {
    const { register, watch, setValue, control } = useFormContext<NnaFormData>();
    const { fields } = useFieldArray({ control, name: "nnas" });
    const { parametros } = useNnaStore();

    return (
        <div className="space-y-8 animate-fadeIn">
            <SectionHeader title="V. Salud" subtitle="Aseguramiento y condición de salud." />

            {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                        {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                    </h3>

                    <div className="space-y-6">
                        <div className="border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado al Seguro Universal de Salud (SIS)?</div>
                                {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                    <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoSIS` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                        <input
                                            type="radio"
                                            value={opt}
                                            {...register(`nnas.${index}.afiliadoSIS` as const)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setValue(`nnas.${index}.afiliadoSIS`, val);
                                                if (val === 'SI') {
                                                    setValue(`nnas.${index}.afiliadoOtroSeguro`, 'NO');
                                                    setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x items-center bg-white">
                                <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado a algún otro tipo de seguro de salud?</div>
                                {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                    <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoOtroSeguro` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                        <input
                                            type="radio"
                                            value={opt}
                                            {...register(`nnas.${index}.afiliadoOtroSeguro` as const)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setValue(`nnas.${index}.afiliadoOtroSeguro`, val);
                                                if (val === 'SI') {
                                                    setValue(`nnas.${index}.afiliadoSIS`, 'NO');
                                                } else {
                                                    setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                            {watch(`nnas.${index}.afiliadoOtroSeguro` as const) === 'SI' && (
                                <div className="p-4 bg-blue-50 animate-slideDown border-t space-y-4">
                                    <SelectField
                                        label="Seleccione el seguro de salud"
                                        value={
                                            SEGUROS_PREDEFINIDOS.includes(watch(`nnas.${index}.detalleOtroSeguro` as const) || '')
                                                ? watch(`nnas.${index}.detalleOtroSeguro` as const)
                                                : (watch(`nnas.${index}.detalleOtroSeguro` as const) ? 'OTRO' : '')
                                        }
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'OTRO') {
                                                setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                            } else {
                                                setValue(`nnas.${index}.detalleOtroSeguro`, val);
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Seleccione un seguro...' },
                                            ...SEGUROS_PREDEFINIDOS.map(s => ({ value: s, label: s })),
                                            { value: 'OTRO', label: 'Otro (Especificar)' }
                                        ]}
                                    />

                                    {(!SEGUROS_PREDEFINIDOS.includes(watch(`nnas.${index}.detalleOtroSeguro` as const) || '') || 
                                     watch(`nnas.${index}.detalleOtroSeguro` as const) === '') && 
                                     (watch(`nnas.${index}.detalleOtroSeguro` as const) !== undefined) && (
                                        <div className="animate-slideDown">
                                            <InputField
                                                label="Especifique el seguro de salud alternativo"
                                                register={register(`nnas.${index}.detalleOtroSeguro` as const)}
                                                placeholder="Ej: Mapfre, Seguro universitario particular..."
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                <div className="p-3 text-sm font-bold text-gray-700">¿Sufres alguna enfermedad actualmente?</div>
                                {['SI', 'NO'].map((opt) => (
                                    <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.sufreEnfermedad` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                        <input type="radio" value={opt} {...register(`nnas.${index}.sufreEnfermedad` as const)} className="mr-2" />
                                        <span className="text-xs font-bold">{opt}</span>
                                    </label>
                                ))}
                            </div>
                            {watch(`nnas.${index}.sufreEnfermedad` as const) === 'SI' && (
                                <div className="p-3 bg-red-50 animate-slideDown">
                                    <InputField label="De ser afirmativo especificar: ¿Cuál?" register={register(`nnas.${index}.detalleEnfermedad` as const)} placeholder="Especifique la enfermedad..." />
                                </div>
                            )}
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                <div className="p-3 text-sm font-bold text-gray-700">¿Presenta algún tipo de discapacidad?</div>
                                <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === true ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                    <input
                                        type="radio"
                                        value="true"
                                        {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                        className="mr-2"
                                        checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true'}
                                        onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, true)}
                                    />
                                    <span className="text-xs font-bold">Sí</span>
                                </label>
                                <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === false ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                    <input
                                        type="radio"
                                        value="false"
                                        {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                        className="mr-2"
                                        checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'false'}
                                        onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, false)}
                                    />
                                    <span className="text-xs font-bold">NO</span>
                                </label>
                            </div>

                            {(String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true') && (
                                <div className="p-4 bg-gray-50 animate-slideDown">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {DISCAPACIDADES_CONADIS.map((discap) => (
                                            <label key={discap} className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-white transition-all ${watch(`nnas.${index}.tipoDiscapacidad` as const) === discap ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}>
                                                <input
                                                    type="radio"
                                                    value={discap}
                                                    {...register(`nnas.${index}.tipoDiscapacidad` as const)}
                                                    className="h-4 w-4 text-blue-600"
                                                />
                                                <span className="text-sm text-gray-700 font-medium">{discap}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                                        <SelectField label="¿Cuenta con Certificado CONADIS?" register={register(`nnas.${index}.certDiscapNna` as const)} options={parametros?.OPCIONES_CERT_DISCAP_APO_2026 || [
                                            { value: '99', label: 'No aplica' },
                                            { value: '1', label: 'Sí, tiene Certificado de Discapacidad' },
                                            { value: '2', label: 'Sí, tiene, pero no lo porta' },
                                            { value: '3', label: 'No, no cuenta con Certificado' },
                                            { value: '4', label: 'En trámite' }
                                        ]} />
                                        <InputField label="Detalle de Discapacidad" register={register(`nnas.${index}.detalleDiscapacidad` as const)} placeholder="Especifique detalles adicionales..." />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2">
                            <InputField label="Observaciones Salud / Lugar de Atención" register={register(`nnas.${index}.observacionesSalud` as const)} />
                        </div>

                    </div>
                </div>
            ))}
        </div>
    );
};
