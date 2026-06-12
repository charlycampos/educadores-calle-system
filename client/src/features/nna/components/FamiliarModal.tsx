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
        esTutorPrincipal: 'false'
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
                    esTutorPrincipal: 'false'
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
                            <Users size={22} className="text-purple-700" /> {editingIndex !== null ? 'Editar Familiar' : 'Registrar Familiar Responsable'} (SEC 2026)
                        </h3>
                        <p className="text-xs text-purple-700 font-medium">Complete todos los datos oficiales del familiar responsable del NNA.</p>
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
                            label="Nombres"
                            value={familiarModalData.nomApeTutApo || familiarModalData.nombres || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, nomApeTutApo: e.target.value, nombres: e.target.value })}
                            placeholder="Nombres del Familiar"
                            required
                        />

                        <SelectField
                            label="Sexo"
                            value={familiarModalData.sexoApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, sexoApo: e.target.value })}
                            options={parametros?.OPCIONES_SEXO_2026 || [
                                { value: '1', label: '1: Masculino' },
                                { value: '2', label: '2: Femenino' }
                            ]}
                        />
                        <InputField
                            type="date"
                            label="Fecha Nacimiento"
                            value={familiarModalData.fechaNacApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, fechaNacApo: e.target.value })}
                        />
                        <InputField
                            label="Nacionalidad"
                            value={familiarModalData.nacionalidadApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, nacionalidadApo: e.target.value })}
                            placeholder="PERUANA"
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
                        <InputField
                            label="Ocupación"
                            value={familiarModalData.ocupacion || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, ocupacion: e.target.value })}
                            placeholder="Ej. Independiente, Comerciante..."
                        />
                        <SelectField
                            label="¿Vive con el NNA?"
                            value={familiarModalData.viveCon || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, viveCon: e.target.value })}
                            options={[
                                { value: 'SI', label: 'Sí' },
                                { value: 'NO', label: 'No' }
                            ]}
                        />

                        <SelectField
                            label="Lengua Materna"
                            value={familiarModalData.lenMatApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, lenMatApo: e.target.value })}
                            options={parametros?.OPCIONES_LENGUA_APO_2026 || [
                                { value: '10', label: '10: Castellano' },
                                { value: '1', label: '1: Quechua' },
                                { value: '2', label: '2: Aimara' },
                                { value: '3', label: '3: Asháninka' },
                                { value: '4', label: '4: Awajún/Aguaruna' },
                                { value: '5', label: '5: Shipibo-Conibo' },
                                { value: '6', label: '6: Shawi/ Chayahuita' },
                                { value: '7', label: '7: Matsigenka/ Machiguenga' },
                                { value: '8', label: '8: Achuar' },
                                { value: '9', label: '9: Otra lengua indígena u originaria' },
                                { value: '11', label: '11: Portugués' },
                                { value: '12', label: '12: Otra lengua extranjera' },
                                { value: '13', label: '13: Lengua de señas peruana' },
                                { value: '14', label: '14: No escucha ni habla' },
                                { value: '16', label: '16: No responde / No sabe' },
                                { value: '99', label: '99: No aplica' }
                            ]}
                        />
                        {['9', '12', 'OTRO'].includes(familiarModalData.lenMatApo || '') && (
                            <InputField
                                label="Especificar Lengua"
                                value={familiarModalData.lenMatEspApo || ''}
                                onChange={(e) => setFamiliarModalData({ ...familiarModalData, lenMatEspApo: e.target.value })}
                                placeholder="Escriba la lengua..."
                            />
                        )}
                        
                        <SelectField
                            label="Autoidentificación Étnica"
                            value={familiarModalData.autIdeEtApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, autIdeEtApo: e.target.value })}
                            options={parametros?.OPCIONES_ETNIA_APO_2026 || [
                                { value: '7', label: '7: Mestizo' },
                                { value: '1', label: '1: Quechua' },
                                { value: '2', label: '2: Aimara' },
                                { value: '3', label: '3: Indígena u originario de la Amazonía' },
                                { value: '4', label: '4: Perteneciente o parte de otro pueblo indígena' },
                                { value: '5', label: '5: Negro, moreno, zambo, mulato o afrodescendiente' },
                                { value: '6', label: '6: Blanco' },
                                { value: '8', label: '8: Otro' }
                            ]}
                        />
                        {['8', 'OTRO'].includes(familiarModalData.autIdeEtApo || '') && (
                            <InputField
                                label="Especificar Etnia"
                                value={familiarModalData.autIdeEtEspApo || ''}
                                onChange={(e) => setFamiliarModalData({ ...familiarModalData, autIdeEtEspApo: e.target.value })}
                                placeholder="Escriba la etnia..."
                            />
                        )}

                        <SelectField
                            label="Tipo de Discapacidad"
                            value={familiarModalData.tipoDiscapApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, tipoDiscapApo: e.target.value })}
                            options={parametros?.OPCIONES_DISCAPACIDAD_APO_2026 || [
                                { value: '6', label: 'Ninguna' },
                                { value: '1', label: 'Motriz o física' },
                                { value: '2', label: 'Sensorial' },
                                { value: '3', label: 'Cognitivo-intelectual' },
                                { value: '4', label: 'Psicosocial o psíquica' },
                                { value: '5', label: 'Más de una discapacidad' }
                            ]}
                        />
                        <SelectField
                            label="¿Certificado CONADIS?"
                            value={familiarModalData.certDiscapApo || ''}
                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, certDiscapApo: e.target.value })}
                            options={parametros?.OPCIONES_CERT_DISCAP_APO_2026 || [
                                { value: '99', label: 'No aplica' },
                                { value: '1', label: 'Sí, tiene Certificado de Discapacidad' },
                                { value: '2', label: 'Sí, tiene, pero no lo porta' },
                                { value: '3', label: 'No, no cuenta con Certificado' },
                                { value: '4', label: 'En trámite' }
                            ]}
                        />

                        <div className="md:col-span-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between mt-2">
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
