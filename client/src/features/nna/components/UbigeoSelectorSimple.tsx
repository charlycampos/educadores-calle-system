import { departamentos, provincias, distritos } from '../../../data/ubigeo-data';
import { normalizeUbigeo } from '../../../utils/normalizeUbigeo';

interface UbigeoSelectorSimpleProps {
    departamento: string;
    provincia: string;
    distrito: string;
    onChange: (field: 'departamento' | 'provincia' | 'distrito', value: string) => void;
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
    readOnly = false,
}: UbigeoSelectorSimpleProps) => {

    const normDep  = normalizeUbigeo(departamento);
    const normProv = normalizeUbigeo(provincia);

    const selectedDep  = departamentos.find(d => normalizeUbigeo(d.name) === normDep);
    const provincesList = selectedDep ? provincias.filter(p => p.dep === selectedDep.id) : [];

    const selectedProv  = provincesList.find(p => normalizeUbigeo(p.name) === normProv);
    const districtsList = selectedProv ? distritos.filter(d => d.prov === selectedProv.id) : [];

    const handleDepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDep = normalizeUbigeo(e.target.value);
        if (onCascadeChange) {
            onCascadeChange({ departamento: newDep, provincia: '', distrito: '' });
        } else {
            onChange('departamento', newDep);
            onChange('provincia', '');
            onChange('distrito', '');
        }
    };

    const handleProvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newProv = normalizeUbigeo(e.target.value);
        if (onCascadeChange) {
            onCascadeChange({ provincia: newProv, distrito: '' });
        } else {
            onChange('provincia', newProv);
            onChange('distrito', '');
        }
    };

    const handleDistChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDist = normalizeUbigeo(e.target.value);
        if (onCascadeChange) {
            onCascadeChange({ distrito: newDist });
        } else {
            onChange('distrito', newDist);
        }
    };

    const selectCls = "w-full text-xs p-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-surface uppercase disabled:bg-surface-muted disabled:text-fg-muted";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">{labels.dep}</label>
                {/* value normalizado: si la BD trae 'Junín' y la opción es 'JUNIN', sin esto el combo se ve vacío */}
                <select value={normDep || ''} onChange={handleDepChange} disabled={readOnly} className={selectCls}>
                    <option value="">-- SELECCIONAR --</option>
                    {departamentos.map(dep => (
                        <option key={dep.id} value={normalizeUbigeo(dep.name)}>
                            {normalizeUbigeo(dep.name)}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">{labels.prov}</label>
                <select value={normProv || ''} onChange={handleProvChange} disabled={readOnly || !departamento} className={selectCls}>
                    <option value="">-- SELECCIONAR --</option>
                    {provincesList.map(prov => (
                        <option key={prov.id} value={normalizeUbigeo(prov.name)}>
                            {normalizeUbigeo(prov.name)}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-xs font-bold text-fg-2 uppercase mb-1">{labels.dist}</label>
                <select value={normalizeUbigeo(distrito) || ''} onChange={handleDistChange} disabled={readOnly || !provincia} className={selectCls}>
                    <option value="">-- SELECCIONAR --</option>
                    {districtsList.map(dist => (
                        <option key={dist.id} value={normalizeUbigeo(dist.name)}>
                            {normalizeUbigeo(dist.name)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};
