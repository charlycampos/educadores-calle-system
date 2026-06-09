import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { InputField, SelectField } from '../../../components/ui/FormFields';
import { UbigeoFields } from '../../../components/forms/UbigeoFields';
import { useNnaStore } from '../../../store/nna.store';
import { MapPin, Trash2 } from 'lucide-react';
import type { NnaFormData, DuplicateCheckResult } from '../types/nna-form.types';

interface DatosPersonalesSectionProps {
    duplicateCheckResults: DuplicateCheckResult | null;
    isCheckingDuplicates: boolean;
    checkDuplicates: (index: number, force: boolean) => void;
}

const DuplicateSemaphore = ({ status, onClick }: { status: 'unique' | 'homonym' | 'duplicate'; onClick: () => void }) => {
    const configs = {
        unique: { color: 'bg-green-100 border-green-300', icon: '✓', label: 'Único', textColor: 'text-green-700' },
        homonym: { color: 'bg-yellow-100 border-yellow-300', icon: '⚠', label: 'Homónimos', textColor: 'text-yellow-700' },
        duplicate: { color: 'bg-red-100 border-red-300', icon: '🛑', label: 'DNI Duplicado', textColor: 'text-red-700' }
    };
    const config = configs[status];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${config.color} ${config.textColor} px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 hover:shadow-md transition-all cursor-pointer`}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </button>
    );
};

export const DatosPersonalesSection: React.FC<DatosPersonalesSectionProps> = ({
    duplicateCheckResults,
    isCheckingDuplicates,
    checkDuplicates
}) => {
    const { register, control, watch, setValue } = useFormContext<NnaFormData>();
    const { fields, remove } = useFieldArray({ control, name: "nnas" });
    const { parametros } = useNnaStore();

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-6 group hover:border-blue-300 transition-all">
                <h3 className="text-sm font-black text-blue-900 uppercase mb-4 flex items-center gap-2">
                    <MapPin size={16} /> Domicilio Actual y Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="Dirección exacta" />
                    </div>
                    <div className="md:col-span-2">
                        <InputField label="Referencia" register={register('referenciaDomicilio')} placeholder="Referencia de ubicación" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="label"><span className="label-text font-bold text-gray-700">Ubicación Geográfica</span></label>
                        <UbigeoFields
                            departamento={watch('departamentoDom')}
                            provincia={watch('provinciaDom')}
                            distrito={watch('distritoDom')}
                            onChange={({ departamento, provincia, distrito }) => {
                                setValue('departamentoDom', departamento);
                                setValue('provinciaDom', provincia);
                                setValue('distritoDom', distrito);
                            }}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <InputField label="Teléfono de Referencia" register={register('telefonoContacto')} placeholder="999..." />
                    </div>
                </div>
            </div>

            {fields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 relative mt-6">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                            Datos del NNA {index > 0 ? '(Hermano)' : ''}
                        </h3>
                        {index > 0 && (
                            <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                <Trash2 size={14} /> Eliminar
                            </button>
                        )}
                    </div>

                    {/* Duplicate Check Semaphore */}
                    <div className="mb-3 flex items-center justify-between">
                        <DuplicateSemaphore
                            status={duplicateCheckResults?.status || 'unique'}
                            onClick={() => checkDuplicates(index, true)}
                        />
                        <button
                            type="button"
                            onClick={() => checkDuplicates(index, true)}
                            disabled={isCheckingDuplicates}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 flex items-center gap-1"
                        >
                            {isCheckingDuplicates ? 'Validando...' : 'Verificar Nacional'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputField label="Apellido Paterno" register={register(`nnas.${index}.apellidoPaterno` as const, { required: true, onBlur: () => checkDuplicates(index, false) })} placeholder="Ap. Paterno" />
                        <InputField label="Apellido Materno" register={register(`nnas.${index}.apellidoMaterno` as const, { onBlur: () => checkDuplicates(index, false) })} placeholder="Ap. Materno" />
                        <InputField label="Nombres" register={register(`nnas.${index}.nombres` as const, { required: true, onBlur: () => checkDuplicates(index, false) })} placeholder="Nombres" />

                        <div className="md:col-span-1">
                            <SelectField label="Sexo" register={register(`nnas.${index}.sexo` as const)} options={parametros?.OPCIONES_SEXO_2026 || [
                                { value: '1', label: '1: Masculino' },
                                { value: '2', label: '2: Femenino' }
                            ]} />
                        </div>

                        <div className="md:col-span-2 grid grid-cols-2 gap-2">
                            <InputField type="number" label="Edad" register={register(`nnas.${index}.edad` as const)} placeholder="Edad" />
                            <SelectField label="Unidad" register={register(`nnas.${index}.unidadEdad` as const)} options={[
                                { value: 'ANIOS', label: 'Años' },
                                { value: 'MESES', label: 'Meses' },
                                { value: 'DIAS', label: 'Días' }
                            ]} />
                            <div className="col-span-2">
                                <InputField type="date" label="Fecha Nacimiento" register={register(`nnas.${index}.fechaNacimiento` as const)} />
                            </div>
                        </div>

                        <div className="md:col-span-3 grid grid-cols-3 gap-2 bg-white p-3 rounded border border-gray-200">
                            <label className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Lugar de Nacimiento</label>
                            <div className="col-span-3">
                                <UbigeoFields
                                    departamento={watch(`nnas.${index}.departamentoNac`)}
                                    provincia={watch(`nnas.${index}.provinciaNac`)}
                                    distrito={watch(`nnas.${index}.distritoNac`)}
                                    onChange={({ departamento, provincia, distrito }) => {
                                        setValue(`nnas.${index}.departamentoNac` as const, departamento);
                                        setValue(`nnas.${index}.provinciaNac` as const, provincia);
                                        setValue(`nnas.${index}.distritoNac` as const, distrito);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Identidad Cultural (SEC 2026) */}
                        <div className="md:col-span-3 bg-white p-3 rounded border border-gray-200 space-y-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nacionalidad e Identidad Cultural (SEC 2026)</p>
                            <InputField label="Nacionalidad" register={register(`nnas.${index}.nacionalidad` as const)} placeholder="Ej. PERUANA" />
                            <div>
                                <SelectField label="Lengua Materna" register={register(`nnas.${index}.lenMatNna` as const)} options={parametros?.OPCIONES_LENGUA_APO_2026 || [
                                    { value: '10', label: 'Castellano' },
                                    { value: '1', label: 'Quechua' },
                                    { value: '2', label: 'Aimara' },
                                    { value: '3', label: 'Asháninka' },
                                    { value: '9', label: 'Otra lengua indígena u originaria' }
                                ]} />
                                {['9', '12', 'OTRO'].includes(watch(`nnas.${index}.lenMatNna`) || '') && (
                                    <div className="mt-2">
                                        <InputField label="Especificar Lengua" register={register(`nnas.${index}.lenMatEspNna` as const)} placeholder="Escriba la lengua..." />
                                    </div>
                                )}
                            </div>
                            <div>
                                <SelectField label="Autoidentificación Étnica" register={register(`nnas.${index}.autIdeEtNna` as const)} options={parametros?.OPCIONES_ETNIA_APO_2026 || [
                                    { value: '7', label: 'Mestizo' },
                                    { value: '1', label: 'Quechua' },
                                    { value: '2', label: 'Aimara' },
                                    { value: '8', label: 'Otro' }
                                ]} />
                                {['8', 'OTRO'].includes(watch(`nnas.${index}.autIdeEtNna`) || '') && (
                                    <div className="mt-2">
                                        <InputField label="Especificar Etnia" register={register(`nnas.${index}.autIdeEtEspNna` as const)} placeholder="Escriba la etnia..." />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-3 bg-white p-4 rounded border border-gray-200 mt-2">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-1">Documento de Identidad</h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SelectField label="Tipo Documento" register={register(`nnas.${index}.tipoDoc` as const)} options={parametros?.OPCIONES_TIP_DOC_APO_2026 || [
                                    { value: '1', label: '1: DNI' },
                                    { value: '2', label: '2: Carné de extranjería' },
                                    { value: '3', label: '3: Pasaporte' },
                                    { value: '4', label: '4: Documento de Identidad Extranjero' },
                                    { value: '5', label: '5: CUI o Acta de Nacimiento' },
                                    { value: '6', label: '6: Certificado de Nacido Vivo - CNV' },
                                    { value: '7', label: '7: No tiene' },
                                ]} />

                                <div className="md:col-span-2">
                                    <InputField label="Nº de Documento / DNI" register={register(`nnas.${index}.numeroDoc` as const, { onBlur: () => checkDuplicates(index, false) })} placeholder="Ingrese número si tiene" />
                                </div>

                                <div className="flex flex-col justify-end pb-2">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">¿Tiene Partida Nac.?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="true" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                            <span className="text-sm">Sí</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="false" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                            <span className="text-sm">NO</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <InputField label="¿Por qué? (En caso no tenga documento)" register={register(`nnas.${index}.detalleSinDoc` as const)} placeholder="Especifique motivo..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
