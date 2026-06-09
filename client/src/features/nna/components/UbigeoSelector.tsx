import { useEffect } from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { SelectField } from '../../../components/ui/FormFields';
import { departamentos, provincias, distritos } from '../../../data/ubigeo-data';
import { normalizeUbigeo } from '../../../utils/normalizeUbigeo';

interface UbigeoSelectorProps {
    prefix: string;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    index?: number;
}

export const UbigeoSelector = ({ prefix, register, watch, setValue, index }: UbigeoSelectorProps) => {
    const getFieldName = (field: 'departamento' | 'provincia' | 'distrito') => {
        const baseName = `${field}${prefix}`;
        return typeof index === 'number' ? `nnas.${index}.${baseName}` : baseName;
    };

    const depName  = getFieldName('departamento');
    const provName = getFieldName('provincia');
    const distName = getFieldName('distrito');

    const selectedDep  = watch(depName);
    const selectedProv = watch(provName);

    useEffect(() => {
        if (!selectedDep) { setValue(provName, ''); setValue(distName, ''); }
    }, [selectedDep, setValue, provName, distName]);

    useEffect(() => {
        if (!selectedProv) { setValue(distName, ''); }
    }, [selectedProv, setValue, distName]);

    const selectedDepObj = departamentos.find(d => normalizeUbigeo(d.name) === normalizeUbigeo(selectedDep));
    const provincesList  = selectedDepObj ? provincias.filter(p => p.dep === selectedDepObj.id) : [];

    const selectedProvObj = provincesList.find(p => normalizeUbigeo(p.name) === normalizeUbigeo(selectedProv));
    const districtsList   = selectedProvObj ? distritos.filter(d => d.prov === selectedProvObj.id) : [];

    // Al seleccionar, guardar siempre normalizado (sin tildes)
    const wrapRegister = (fieldName: string, options?: object) => {
        const reg = register(fieldName, options);
        return {
            ...reg,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                setValue(fieldName, normalizeUbigeo(e.target.value));
            },
        };
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SelectField
                label={`Departamento ${prefix === 'Dom' ? 'Domicilio' : 'Nacimiento'}`}
                register={wrapRegister(depName)}
            >
                <option value="">Seleccionar...</option>
                {departamentos.map(dep => (
                    <option key={dep.id} value={normalizeUbigeo(dep.name)}>{normalizeUbigeo(dep.name)}</option>
                ))}
            </SelectField>

            <SelectField label="Provincia" register={wrapRegister(provName)} disabled={!selectedDep}>
                <option value="">Seleccionar...</option>
                {provincesList.map(prov => (
                    <option key={prov.id} value={normalizeUbigeo(prov.name)}>{normalizeUbigeo(prov.name)}</option>
                ))}
            </SelectField>

            <SelectField label="Distrito" register={wrapRegister(distName)} disabled={!selectedProv}>
                <option value="">Seleccionar...</option>
                {districtsList.map(dist => (
                    <option key={dist.id} value={normalizeUbigeo(dist.name)}>{normalizeUbigeo(dist.name)}</option>
                ))}
            </SelectField>
        </div>
    );
};
