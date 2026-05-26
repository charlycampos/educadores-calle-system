import { useEffect } from 'react';
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { SelectField } from '../../../components/ui/FormFields';
import { DEPARTAMENTOS, PROVINCIAS, DISTRITOS } from '../../../data/ubigeo';

interface UbigeoSelectorProps {
    prefix: string; // "Nac", "Dom", etc.
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    index?: number; // Optional index for array fields
}

export const UbigeoSelector = ({ prefix, register, watch, setValue, index }: UbigeoSelectorProps) => {
    // Construct field names based on prefix and optional index
    // If index is defined, it means we are in 'nnas[index].prefix...'
    // If index is undefined, we are in 'prefix...' (root level)

    // Example: prefix="departamentoNac" -> base="departamentoNac"
    // Wait, the hook names in NnaCreatePage are "departamentoNac", "provinciaNac", "distritoNac".
    // So prefix passed is just "Nac".
    // Field names: departamento${prefix}, provincia${prefix}, distrito${prefix}

    // BUT if index is present: nnas.${index}.departamento${prefix}

    const getFieldName = (field: 'departamento' | 'provincia' | 'distrito') => {
        const baseName = `${field}${prefix}`; // e.g., departamentoNac
        return typeof index === 'number' ? `nnas.${index}.${baseName}` : baseName;
    };

    const depName = getFieldName('departamento');
    const provName = getFieldName('provincia');
    const distName = getFieldName('distrito');

    const selectedDep = watch(depName);
    const selectedProv = watch(provName);

    // Reset logic
    useEffect(() => {
        if (!selectedDep) {
            setValue(provName, '');
            setValue(distName, '');
        }
    }, [selectedDep, setValue, provName, distName]);

    useEffect(() => {
        if (!selectedProv) {
            setValue(distName, '');
        }
    }, [selectedProv, setValue, distName]);

    // Logic to find IDs based on selected Names
    const selectedDepObj = DEPARTAMENTOS.find(d => d.name === selectedDep);
    const depId = selectedDepObj?.id;

    const provinces = depId ? PROVINCIAS[depId] : [];

    // For provinces, we need to find the ID to get districts
    const selectedProvObj = provinces?.find(p => p.name === selectedProv);
    const provId = selectedProvObj?.id;

    const districts = provId ? DISTRITOS[provId] : [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SelectField
                label={`Departamento ${prefix === 'Dom' ? 'Domicilio' : 'Nacimiento'}`}
                register={register(depName)}
            >
                <option value="">Seleccionar...</option>
                {DEPARTAMENTOS.map((dep) => (
                    <option key={dep.id} value={dep.name}>{dep.name}</option>
                ))}
            </SelectField>

            <SelectField
                label="Provincia"
                register={register(provName)}
                disabled={!selectedDep}
            >
                <option value="">Seleccionar...</option>
                {provinces?.map((prov) => (
                    <option key={prov.id} value={prov.name}>{prov.name}</option>
                ))}
            </SelectField>

            <SelectField
                label="Distrito"
                register={register(distName)}
                disabled={!selectedProv}
            >
                <option value="">Seleccionar...</option>
                {districts?.map((dist) => (
                    <option key={dist.id} value={dist.name}>{dist.name}</option>
                ))}
            </SelectField>
        </div>
    );
};
