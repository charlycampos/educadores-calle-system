import React, { useState, useEffect } from 'react';
import { Users, X, Zap } from 'lucide-react';
import { InputField, SelectField } from '../../../components/ui/FormFields';
import type { FamiliarFormDataItem } from '../types/nna-form.types';

interface FamiliarModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: FamiliarFormDataItem) => void;
    initialData: FamiliarFormDataItem | null;
    parametros: any;
    editingIndex: number | null;
}

export const FamiliarModal: React.FC<FamiliarModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    parametros,
    editingIndex
}) => {
    const [familiarModalData, setFamiliarModalData] = useState<FamiliarFormDataItem>({
        nombres: '',
        parentesco: 'Otro',
        dni: '',
        telefono: '',
        ocupacion: '',
        viveCon: 'NO',
        esTutorPrincipal: 'true'
    });
    const [tutorError, setTutorError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFamiliarModalData({ ...initialData });
            } else {
                setFamiliarModalData({
                    nombres: '',
                    parentesco: 'Otro',
                    dni: '',
                    telefono: '',
                    ocupacion: '',
                    viveCon: 'NO',
                    esTutorPrincipal: 'true'
                });
            }
            setTutorError('');
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!familiarModalData.nomApeTutApo && !familiarModalData.nombres) {
            setTutorError('Por favor ingrese al menos el nombre del familiar.');
            return;
        }
        setTutorError('');

        const pri = familiarModalData.priApeTutApo || '';
        const seg = familiarModalData.segApeTutApo || '';
        const nom = familiarModalData.nomApeTutApo || familiarModalData.nombres || '';
        const fullName = `${pri} ${seg} ${nom}`.trim().replace(/\s+/g, ' ');

        const finalFamiliar: FamiliarFormDataItem = {
            ...familiarModalData,
            nombres: fullName,
            dni: familiarModalData.nroDocTutApo || familiarModalData.dni || '',
            parentesco: familiarModalData.vinTutUsu || familiarModalData.parentesco || 'Otro',
            viveCon: familiarModalData.viveCon || 'NO',
        };

        onSave(finalFamiliar);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] flex flex-col animate-scaleUp">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50 rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                            <Users size={22} className="text-purple-700" /> {editingIndex !== null ? 'Editar Familia' : 'Registrar Familia'}
                        </h3>
                        <p className="text-xs text-purple-700 font-medium">Complete todos los datos del familiar.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-purple-100 rounded-full transition-all text-purple-900"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {tutorError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-200 text-xs font-semibold animate-fadeIn">
                            {tutorError}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-purple-900">¿Es el Tutor / Apoderado Principal del NNA?</span>
                                <span className="text-[10px] text-purple-700 font-medium">Solo un familiar puede ser el tutor principal para efectos de la ficha F03.</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={familiarModalData.esTutorPrincipal === 'true' || familiarModalData.esTutorPrincipal === true}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, esTutorPrincipal: e.target.checked ? 'true' : 'false' })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700"></div>
                            </label>
                        </div>

                        <InputField
                            label="Primer Apellido"
                            value={familiarModalData.priApeTutApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, priApeTutApo: e.target.value })}
                            placeholder="Primer Apellido"
                        />
                        <InputField
                            label="Segundo Apellido"
                            value={familiarModalData.segApeTutApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, segApeTutApo: e.target.value })}
                            placeholder="Segundo Apellido"
                        />
                        <InputField
                            label="Nombres*"
                            value={familiarModalData.nomApeTutApo || familiarModalData.nombres || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, nomApeTutApo: e.target.value, nombres: e.target.value })}
                            placeholder="Nombres del Familiar"
                            required
                        />

                        <SelectField
                            label="Tipo Documento"
                            value={familiarModalData.tipDocTutApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, tipDocTutApo: e.target.value })}
                            options={parametros?.OPCIONES_TIP_DOC_APO_2026 || [
                                { value: '1', label: '1: DNI' },
                                { value: '2', label: '2: Carné de extranjería' },
                                { value: '3', label: '3: Pasaporte' },
                                { value: '7', label: '7: No tiene' }
                            ]}
                        />
                        <InputField
                            label="Nº de Documento"
                            value={familiarModalData.nroDocTutApo || familiarModalData.dni || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, nroDocTutApo: e.target.value, dni: e.target.value })}
                            placeholder="Número de Documento"
                        />
                        <SelectField
                            label="Vínculo con el NNA"
                            value={familiarModalData.vinTutUsu || familiarModalData.parentesco || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, vinTutUsu: e.target.value, parentesco: e.target.value })}
                            options={parametros?.OPCIONES_VINCULO_TUTOR_2026 || [
                                { value: '1', label: '1: Padre o madre' },
                                { value: '2', label: '2: Tio/a' },
                                { value: '3', label: '3: Abuelo/a' },
                                { value: '4', label: '4: Hermano/a' },
                                { value: '5', label: '5: Otro familiar (ej. cuñado/a)' },
                                { value: '6', label: '6: Otro no familiar (no pariente)' }
                            ]}
                        />
                        <InputField
                            label="Teléfono de Contacto"
                            value={familiarModalData.telefono || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, telefono: e.target.value })}
                            placeholder="Ej. 999888777"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 transition-all flex items-center gap-1.5 shadow-md shadow-purple-200"
                    >
                        <Zap size={14} /> Guardar y Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
};
