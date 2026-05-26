import React from 'react';
import { useUbigeo } from '../../hooks/useUbigeo';

interface UbigeoFieldsProps {
    departamento?: string;
    provincia?: string;
    distrito?: string;
    onChange: (data: { departamento: string, provincia: string, distrito: string }) => void;
    className?: string; // Para estilos del contenedor grid
}

export const UbigeoFields: React.FC<UbigeoFieldsProps> = ({
    departamento,
    provincia,
    distrito,
    onChange,
    className = "grid grid-cols-1 md:grid-cols-3 gap-4"
}) => {

    // Hook maneja la lógica de filtrado y estado interno de IDs
    const {
        handleDepChange, handleProvChange, handleDistChange,
        selectedDepId, selectedProvId, selectedDistId,
        depOptions, provOptions, distOptions,
        currentDepName, currentProvName, currentDistName
    } = useUbigeo({ dep: departamento, prov: provincia, dist: distrito });

    // Handlers locales para coordinar con el padre
    const onDepSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        handleDepChange(newId);

        const newDepName = depOptions.find(d => d.id === newId)?.name || '';

        onChange({
            departamento: newDepName,
            provincia: '',
            distrito: ''
        });
    };

    const onProvSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        handleProvChange(newId);

        const newProvName = provOptions.find(p => p.id === newId)?.name || '';

        onChange({
            departamento: currentDepName,
            provincia: newProvName,
            distrito: ''
        });
    };

    const onDistSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        handleDistChange(newId);

        const newDistName = distOptions.find(d => d.id === newId)?.name || '';

        onChange({
            departamento: currentDepName,
            provincia: currentProvName,
            distrito: newDistName
        });
    };

    // Estilos consistentes con FormFields
    const selectStyles = "w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-900 outline-none transition-all appearance-none shadow-sm cursor-pointer focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:bg-gray-100";
    const labelStyles = "text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block";

    const ArrowIcon = () => (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
        </div>
    );

    return (
        <div className={className}>
            {/* Departamento */}
            <div className="w-full">
                <label className={labelStyles}>Departamento</label>
                <div className="relative">
                    <select className={selectStyles} value={selectedDepId} onChange={onDepSelect}>
                        <option value="">Seleccionar...</option>
                        {depOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <ArrowIcon />
                </div>
            </div>

            {/* Provincia */}
            <div className="w-full">
                <label className={labelStyles}>Provincia</label>
                <div className="relative">
                    <select className={selectStyles} value={selectedProvId} onChange={onProvSelect} disabled={!selectedDepId}>
                        <option value="">Seleccionar...</option>
                        {provOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <ArrowIcon />
                </div>
            </div>

            {/* Distrito */}
            <div className="w-full">
                <label className={labelStyles}>Distrito</label>
                <div className="relative">
                    <select className={selectStyles} value={selectedDistId} onChange={onDistSelect} disabled={!selectedProvId}>
                        <option value="">Seleccionar...</option>
                        {distOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                    </select>
                    <ArrowIcon />
                </div>
                {distOptions.length === 0 && selectedProvId && (
                    <span className="text-xs text-orange-500 mt-1 font-medium">* Sin resultados (cargue el JSON completo)</span>
                )}
            </div>
        </div>
    );
};
