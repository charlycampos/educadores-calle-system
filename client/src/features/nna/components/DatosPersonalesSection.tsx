import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { InputField, SelectField, SectionHeader } from '../../../components/ui/FormFields';
import { UbigeoFields } from '../../../components/forms/UbigeoFields';
import { useNnaStore } from '../../../store/nna.store';
import { MapPin, Trash2 } from 'lucide-react';
import type { NnaFormData, DuplicateCheckResult } from '../types/nna-form.types';

interface DatosPersonalesSectionProps {
    duplicateCheckResults: DuplicateCheckResult | null;
    isCheckingDuplicates: boolean;
    checkDuplicates: (index: number, force: boolean) => void;
}

const MOTIVOS_SIN_DOCUMENTO = [
    'No ha tramitado documento',
    'Tiene documento, pero no lo porta',
    'Tiene documento, pero no recuerda el número',
    'Documento extraviado o sustraído',
    'Documento en trámite',
    'Documento en poder de un familiar o tercero',
    'Desconoce o no brinda información',
];

const OPCIONES_MOTIVO_SIN_DOCUMENTO = [
    ...MOTIVOS_SIN_DOCUMENTO.map(motivo => ({ value: motivo, label: motivo })),
    { value: 'OTRO', label: 'Otro' },
];

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
    const nnas = watch('nnas');

    // Mantiene consistentes los campos existentes sin agregar variables nuevas:
    // "No tiene" nunca conserva un número y cualquier otro tipo limpia el motivo.
    React.useEffect(() => {
        nnas?.forEach((nna, index) => {
            const tipoDocumento = String(nna?.tipoDoc || '');
            if (tipoDocumento === '7' && nna?.numeroDoc) {
                setValue(`nnas.${index}.numeroDoc`, '');
            } else if (tipoDocumento && tipoDocumento !== '7' && nna?.detalleSinDoc) {
                setValue(`nnas.${index}.detalleSinDoc`, '');
            }
        });
    }, [nnas, setValue]);

    return (
        <div className="space-y-8 animate-fadeIn">
            <SectionHeader title="II. Datos Personales del NNA" />
            
            {fields.map((field, index) => {
                const tipoDocumento = String(watch(`nnas.${index}.tipoDoc`) || '');
                const sinDocumento = tipoDocumento === '7';
                const detalleSinDocumento = String(watch(`nnas.${index}.detalleSinDoc`) || '');
                const motivoPredefinido = MOTIVOS_SIN_DOCUMENTO.includes(detalleSinDocumento);
                const motivoSeleccionado = motivoPredefinido
                    ? detalleSinDocumento
                    : detalleSinDocumento
                        ? 'OTRO'
                        : '';
                const detalleOtro = detalleSinDocumento.startsWith('Otro:')
                    ? detalleSinDocumento.slice('Otro:'.length).trimStart()
                    : motivoSeleccionado === 'OTRO'
                        ? detalleSinDocumento
                        : '';

                // Determinar el status del semáforo para este NNA en base a las coincidencias y su DNI / nombre
                let semaphoreStatus: 'unique' | 'homonym' | 'duplicate' = 'unique';
                if (duplicateCheckResults?.matches && duplicateCheckResults.matches.length > 0) {
                    const nnaDoc = (watch(`nnas.${index}.numeroDoc`) || '').trim();
                    const nnaName = (watch(`nnas.${index}.nombres`) || '').trim().toLowerCase();
                    const matchByDoc = duplicateCheckResults.matches.some((m: any) => m.numeroDoc && m.numeroDoc === nnaDoc);
                    const matchByName = duplicateCheckResults.matches.some((m: any) => m.nombres && m.nombres.toLowerCase().includes(nnaName));

                    if (matchByDoc) {
                        semaphoreStatus = 'duplicate';
                    } else if (matchByName) {
                        semaphoreStatus = 'homonym';
                    }
                }

                return (
                    <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 relative mt-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                                Datos del NNA {index > 0 ? '(Hermano)' : ''}
                            </h3>
                            <div className="flex items-center gap-3">
                                {index > 0 && (
                                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                        <Trash2 size={14} /> Eliminar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 1. Apellidos y Nombres */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <InputField label="Apellido Paterno" register={register(`nnas.${index}.apellidoPaterno` as const, { required: true, onBlur: () => checkDuplicates(index, false) })} placeholder="Ap. Paterno" />
                            <InputField label="Apellido Materno" register={register(`nnas.${index}.apellidoMaterno` as const, { onBlur: () => checkDuplicates(index, false) })} placeholder="Ap. Materno" />
                            <InputField label="Nombres" register={register(`nnas.${index}.nombres` as const, { required: true, onBlur: () => checkDuplicates(index, false) })} placeholder="Nombres" />
                        </div>

                        {/* 2. Sexo, Fecha y Lugar de Nacimiento */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b pb-1">Sexo, Nacimiento y Edad</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SelectField label="Sexo" register={register(`nnas.${index}.sexo` as const)} options={parametros?.OPCIONES_SEXO_2026 || [
                                    { value: '1', label: '1: Masculino' },
                                    { value: '2', label: '2: Femenino' }
                                ]} />
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <InputField type="number" label="Edad" register={register(`nnas.${index}.edad` as const)} placeholder="Edad" />
                                    <SelectField label="Unidad" register={register(`nnas.${index}.unidadEdad` as const)} options={[
                                        { value: 'ANIOS', label: 'Años' },
                                        { value: 'MESES', label: 'Meses' },
                                        { value: 'DIAS', label: 'Días' }
                                    ]} />
                                </div>
                                
                                <InputField type="date" label="Fecha Nacimiento" register={register(`nnas.${index}.fechaNacimiento` as const, { onBlur: () => checkDuplicates(index, false) })} />
                            </div>

                            <div className="space-y-2 border-t border-gray-100 pt-4">
                                <label className="text-xs font-bold text-gray-700 block mb-1">Lugar de Nacimiento (Ubigeo)</label>
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

                        {/* 3. Domicilio Actual y Contacto (Solo visible o modificable en el NNA principal, para hermanos heredan el domicilio) */}
                        {index === 0 && (
                            <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                                <h4 className="text-xs font-black text-blue-900 uppercase flex items-center gap-2">
                                    <MapPin size={14} /> Domicilio Actual y Contacto
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="Dirección exacta" />
                                    <InputField label="Referencia de Domicilio" register={register('referenciaDomicilio')} placeholder="Referencia de ubicación" />
                                    
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-700">Ubicación Geográfica (Domicilio)</label>
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
                        )}

                        {/* 4. Nacionalidad e Identidad Cultural */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide border-b pb-1">Nacionalidad e Identidad Cultural (SEC 2026)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </div>
                        </div>

                        {/* 5. Documentación de Identidad */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-1 flex items-center justify-between">
                                <span>Documento de Identidad</span>
                                <DuplicateSemaphore
                                    status={semaphoreStatus}
                                    onClick={() => checkDuplicates(index, true)}
                                />
                            </h4>

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

                                <InputField 
                                    label="Nº de Documento / DNI" 
                                    register={register(`nnas.${index}.numeroDoc` as const, { onBlur: () => checkDuplicates(index, false) })} 
                                    disabled={sinDocumento}
                                    placeholder={
                                        sinDocumento
                                            ? 'No corresponde'
                                            : tipoDocumento === '1' || tipoDocumento === 'DNI'
                                            ? 'DNI de 8 dígitos' 
                                            : 'Ingrese número'
                                    } 
                                    maxLength={
                                        tipoDocumento === '1' || tipoDocumento === 'DNI'
                                            ? 8 
                                            : 15
                                    }
                                    onKeyDown={(e) => {
                                        // Si es DNI, solo permitir números y teclas de control
                                        if (tipoDocumento === '1' || tipoDocumento === 'DNI') {
                                            if (!/[0-9]/.test(e.key) && !['Backspace', 'ArrowLeft', 'ArrowRight', 'Delete', 'Tab'].includes(e.key)) {
                                                e.preventDefault();
                                            }
                                        }
                                    }}
                                />

                                <div className="flex flex-col justify-end pb-2">
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">¿Tiene Partida Nac.?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="true" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                            <span className="text-sm">Sí</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" value="false" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                            <span className="text-sm">No</span>
                                        </label>
                                    </div>
                                </div>

                                {sinDocumento && (
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SelectField
                                            label="¿Por qué? (En caso no tenga documento de identidad)"
                                            register={register(`nnas.${index}.detalleSinDoc` as const)}
                                            options={OPCIONES_MOTIVO_SIN_DOCUMENTO}
                                            value={motivoSeleccionado}
                                            required
                                            onChange={(event) => {
                                                const motivo = event.target.value;
                                                setValue(
                                                    `nnas.${index}.detalleSinDoc`,
                                                    motivo === 'OTRO' ? 'Otro: ' : motivo,
                                                    { shouldDirty: true }
                                                );
                                            }}
                                        />

                                        {motivoSeleccionado === 'OTRO' && (
                                            <InputField
                                                label="Especifique el motivo"
                                                placeholder="Escriba el motivo..."
                                                value={detalleOtro}
                                                required
                                                onChange={(event) => {
                                                    setValue(
                                                        `nnas.${index}.detalleSinDoc`,
                                                        `Otro: ${event.target.value}`,
                                                        { shouldDirty: true }
                                                    );
                                                }}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
