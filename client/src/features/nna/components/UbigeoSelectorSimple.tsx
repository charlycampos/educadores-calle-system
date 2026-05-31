import { useEffect, useState } from 'react';
import { DEPARTAMENTOS, PROVINCIAS, DISTRITOS } from '../../../data/ubigeo';

interface UbigeoSelectorSimpleProps {
    departamento: string;
    provincia: string;
    distrito: string;
    onChange: (field: 'departamento' | 'provincia' | 'distrito', value: string) => void;
    // Opcional: para permitir limpiar dependientes automáticamente
    onCascadeChange?: (updates: { departamento?: string; provincia?: string; distrito?: string }) => void;
    labels?: { dep?: string; prov?: string; dist?: string };
    readOnly?: boolean;
}

export const UbigeoSelectorSimple = ({
    departamento,
    provincia,
    distrito,
    onChange,
    onCascadeChange,
    labels = { dep: 'Departamento', prov: 'Provincia', dist: 'Distrito' },
    readOnly = false
}: UbigeoSelectorSimpleProps) => {

    // Encontrar ID del departamento seleccionado para filtrar provincias
    const selectedDepObj = DEPARTAMENTOS.find(d => d.name === departamento);
    const depId = selectedDepObj?.id;
    const provincesList = depId && PROVINCIAS[depId] ? [...PROVINCIAS[depId]] : [];

    // Si la provincia viene de la base de datos (F03) pero no está en el listado mock local, inyectarla
    if (provincia && !provincesList.some(p => p.name === provincia)) {
        provincesList.push({ id: `TEMP_PROV_${provincia}`, name: provincia });
    }

    // Encontrar ID de la provincia seleccionada para filtrar distritos
    const selectedProvObj = provincesList.find(p => p.name === provincia);
    const provId = selectedProvObj?.id;
    const districtsList = provId && DISTRITOS[provId] ? [...DISTRITOS[provId]] : [];

    // Si el distrito viene de la base de datos (F03) pero no está en el listado mock local, inyectarlo
    if (distrito && !districtsList.some(d => d.name === distrito)) {
        districtsList.push({ id: `TEMP_DIST_${distrito}`, name: distrito });
    }

    // Manejadores de cambio con cascada
    const handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDep = e.target.value;
        if (onCascadeChange) {
            onCascadeChange({ departamento: newDep, provincia: '', distrito: '' });
        } else {
            onChange('departamento', newDep);
            onChange('provincia', '');
            onChange('distrito', '');
        }
    };

    const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProv = e.target.value;
        if (onCascadeChange) {
            onCascadeChange({ provincia: newProv, distrito: '' });
        } else {
            onChange('provincia', newProv);
            onChange('distrito', '');
        }
    };

    const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDist = e.target.value;
        if (onCascadeChange) {
            onCascadeChange({ distrito: newDist });
        } else {
            onChange('distrito', newDist);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* DEPARTAMENTO */}
            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">
                    {labels.dep}
                </label>
                <select
                    value={departamento || ''}
                    onChange={handleDepChange}
                    disabled={readOnly}
                    className="w-full text-xs p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-surface uppercase"
                >
                    <option value="">-- SELECCIONAR --</option>
                    {DEPARTAMENTOS.map(dep => (
                        <option key={dep.id} value={dep.name}>{dep.name}</option>
                    ))}
                </select>
            </div>

            {/* PROVINCIA */}
            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">
                    {labels.prov}
                </label>
                <select
                    value={provincia || ''}
                    onChange={handleProvChange}
                    disabled={readOnly || !departamento}
                    className="w-full text-xs p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-surface uppercase disabled:bg-surface-muted disabled:text-fg-muted"
                >
                    <option value="">-- SELECCIONAR --</option>
                    {provincesList.map(prov => (
                        <option key={prov.id} value={prov.name}>{prov.name}</option>
                    ))}
                </select>
            </div>

            {/* DISTRITO */}
            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">
                    {labels.dist}
                </label>
                <select
                    value={distrito || ''}
                    onChange={handleDistChange}
                    disabled={readOnly || !provincia}
                    className="w-full text-xs p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-surface uppercase disabled:bg-surface-muted disabled:text-fg-muted"
                >
                    <option value="">-- SELECCIONAR --</option>
                    {districtsList.map(dist => (
                        <option key={dist.id} value={dist.name}>{dist.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
