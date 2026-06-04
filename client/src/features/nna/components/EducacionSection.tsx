import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { SectionHeader, SelectField, InputField } from '../../../components/ui/FormFields';
import { useNnaStore } from '../../../store/nna.store';
import type { NnaFormData } from '../types/nna-form.types';

export const EducacionSection: React.FC = () => {
    const { register, watch, control } = useFormContext<NnaFormData>();
    const { fields } = useFieldArray({ control, name: "nnas" });
    const { parametros } = useNnaStore();

    return (
        <div className="space-y-8 animate-fadeIn">
            <SectionHeader title="IV. Educación" subtitle="Situación educativa de cada NNA." />

            {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                    <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                        {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                    </h3>

                    <div className="mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <SelectField
                                label="¿Estudia Actualmente? / Situación de Matrícula"
                                register={register(`nnas.${index}.estudiaActualmente` as const)}
                                options={parametros?.OPCIONES_MATRICULA_2026 || [
                                    { value: 'SI', label: '1. Sí (cuenta con ficha de matrícula)' },
                                    { value: 'NO', label: '2. No (no se encuentra matriculado)' },
                                    { value: 'PROCESO', label: '3. En proceso de matrícula (trámite en gestión)' },
                                    { value: 'NO_APLICA', label: '99. No aplica (menores de 3 años o egresados de secundaria)' }
                                ]}
                            />
                        </div>

                        {['SI', 'PROCESO'].includes(String(watch(`nnas.${index}.estudiaActualmente`))) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                                <SelectField label="Nivel Educativo" register={register(`nnas.${index}.nivelEducativo` as const)} options={parametros?.NIVELES_EDUCATIVOS_2026 || [
                                    { value: '1', label: '1: Sin nivel' },
                                    { value: '2', label: '2: Inicial' },
                                    { value: '3', label: '3: Primaria Incompleta' },
                                    { value: '4', label: '4: Primaria Completa' },
                                    { value: '5', label: '5: Secundaria Incompleta' },
                                    { value: '6', label: '6: Secundaria Completa' },
                                    { value: '7', label: '7: Superior No Universitaria Incompleta' },
                                    { value: '8', label: '8: Superior No Universitaria Completa' },
                                    { value: '9', label: '9: Superior Universitario Incompleto' },
                                    { value: '10', label: '10: Superior Universitario Completo' },
                                    { value: '11', label: '11: Básica Especial' }
                                ]} />
                                <SelectField label="Grado / Año" register={register(`nnas.${index}.gradoEstudio` as const)} options={parametros?.GRADOS_ESTUDIO_2026 || [
                                    { value: '1', label: '1: Inicial' },
                                    { value: '2', label: '2: 1ro primaria' },
                                    { value: '3', label: '3: 2do primaria' },
                                    { value: '4', label: '4: 3ro primaria' },
                                    { value: '5', label: '5: 4to primaria' },
                                    { value: '6', label: '6: 5to primaria' },
                                    { value: '7', label: '7: 6to primaria' },
                                    { value: '8', label: '8: 1ro secundaria' },
                                    { value: '9', label: '9: 2do secundaria' },
                                    { value: '10', label: '10: 3ro secundaria' },
                                    { value: '11', label: '11: 4to secundaria' },
                                    { value: '12', label: '12: 5to secundaria' },
                                    { value: '13', label: '13: Ciclo I (EBA)' },
                                    { value: '14', label: '14: Ciclo II (EBA)' },
                                    { value: '15', label: '15: Ciclo III (EBA)' },
                                    { value: '16', label: '16: Ciclo IV (EBA)' },
                                    { value: '17', label: '17: Ciclo V (EBA)' },
                                    { value: '18', label: '18: Ciclo VI (EBA)' },
                                    { value: '19', label: '19: Ciclo VII (EBA)' },
                                    { value: '20', label: '20: Ciclo VIII (EBA)' },
                                    { value: '21', label: '21: Ciclo IX (EBA)' },
                                    { value: '22', label: '22: Ciclo X (EBA)' },
                                    { value: '99', label: '99: No aplica / No sabe' }
                                ]} />
                                <InputField label="Institución Educativa" register={register(`nnas.${index}.institucionEducativa` as const)} placeholder="Nombre del Colegio" />
                                <SelectField label="Modalidad" register={register(`nnas.${index}.modalidadEstudio` as const)} options={parametros?.MODALIDADES_ESTUDIO_2026 || [
                                    { value: '1', label: '1: Básica / regular (EBR)' },
                                    { value: '2', label: '2: Alternativa (EBA)' },
                                    { value: '3', label: '3: Especial (EBE)' },
                                    { value: '4', label: '4: Superior Técnica' },
                                    { value: '5', label: '5: Superior Universitaria' },
                                    { value: '6', label: '6: CETPRO' }
                                ]} />
                            </div>
                        ) : (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-fadeIn">
                                <InputField label="¿Por qué no estudia?" register={register(`nnas.${index}.detalleNoEstudia` as const)} placeholder="Motivo de deserción..." />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
