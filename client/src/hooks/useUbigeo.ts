import { useState, useMemo, useEffect } from 'react';
import { departamentos, provincias, distritos } from '../data/ubigeo-data';

export const useUbigeo = (initialNames?: { dep?: string, prov?: string, dist?: string }) => {
    // 1. Estados de IDs seleccionados
    const [selectedDepId, setSelectedDepId] = useState<string>(() => {
        if (!initialNames?.dep) return '';
        return departamentos.find(d => d.name === initialNames.dep)?.id || '';
    });

    const [selectedProvId, setSelectedProvId] = useState<string>(() => {
        if (!initialNames?.prov) return '';
        // Intentar buscar provincia asumiendo que pertenece al departamento inicial (si existe)
        // O buscar globalmente por nombre (riesgoso si hay duplicados, pero aceptable para init)
        const depId = departamentos.find(d => d.name === initialNames?.dep)?.id;
        if (depId) {
            return provincias.find(p => p.name === initialNames.prov && p.dep === depId)?.id || '';
        }
        return provincias.find(p => p.name === initialNames.prov)?.id || '';
    });

    const [selectedDistId, setSelectedDistId] = useState<string>(() => {
        if (!initialNames?.dist) return '';
        return distritos.find(d => d.name === initialNames.dist)?.id || '';
    });

    // Sincronización con props externos (para Edición Async)
    useEffect(() => {
        if (initialNames?.dep) {
            const d = departamentos.find(x => x.name === initialNames.dep);
            if (d && d.id !== selectedDepId) setSelectedDepId(d.id);
        }
    }, [initialNames?.dep]);

    useEffect(() => {
        if (initialNames?.prov) {
            const p = provincias.find(x => x.name === initialNames.prov);
            if (p && p.id !== selectedProvId) setSelectedProvId(p.id);
        }
    }, [initialNames?.prov]);

    useEffect(() => {
        if (initialNames?.dist) {
            const d = distritos.find(x => x.name === initialNames.dist);
            if (d && d.id !== selectedDistId) setSelectedDistId(d.id);
        }
    }, [initialNames?.dist]);

    // 2. Opciones Filtradas
    const depOptions = useMemo(() => departamentos, []);

    const provOptions = useMemo(() => {
        if (!selectedDepId) return [];
        return provincias.filter(p => p.dep === selectedDepId);
    }, [selectedDepId]);

    const distOptions = useMemo(() => {
        if (!selectedProvId) return [];
        return distritos.filter(d => d.prov === selectedProvId);
    }, [selectedProvId]);

    // 3. Manejadores de Cambio (Actualizan IDs y limpian hijos)
    const handleDepChange = (depId: string) => {
        setSelectedDepId(depId);
        setSelectedProvId('');
        setSelectedDistId('');
    };

    const handleProvChange = (provId: string) => {
        setSelectedProvId(provId);
        setSelectedDistId('');
    };

    const handleDistChange = (distId: string) => {
        setSelectedDistId(distId);
    };

    // 4. Obtener Nombres actuales (para devolver al form)
    const currentDepName = useMemo(() => departamentos.find(d => d.id === selectedDepId)?.name || '', [selectedDepId]);
    const currentProvName = useMemo(() => provincias.find(p => p.id === selectedProvId)?.name || '', [selectedProvId]);
    const currentDistName = useMemo(() => distritos.find(d => d.id === selectedDistId)?.name || '', [selectedDistId]);

    return {
        // IDs para controlar los selects
        selectedDepId,
        selectedProvId,
        selectedDistId,

        // Opciones para renderizar
        depOptions,
        provOptions,
        distOptions,

        // Handlers
        handleDepChange,
        handleProvChange,
        handleDistChange,

        // Nombres finales
        currentDepName,
        currentProvName,
        currentDistName
    };
};
