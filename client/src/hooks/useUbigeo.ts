import { useState, useMemo, useEffect } from 'react';
import { departamentos, provincias, distritos } from '../data/ubigeo-data';
import { normalizeUbigeo } from '../utils/normalizeUbigeo';

export const useUbigeo = (initialNames?: { dep?: string, prov?: string, dist?: string }) => {
    const [selectedDepId, setSelectedDepId] = useState<string>(() => {
        if (!initialNames?.dep) return '';
        return departamentos.find(d => normalizeUbigeo(d.name) === normalizeUbigeo(initialNames.dep!))?.id || '';
    });

    const [selectedProvId, setSelectedProvId] = useState<string>(() => {
        if (!initialNames?.prov) return '';
        const depId = departamentos.find(d => normalizeUbigeo(d.name) === normalizeUbigeo(initialNames?.dep || ''))?.id;
        if (depId) {
            return provincias.find(p => normalizeUbigeo(p.name) === normalizeUbigeo(initialNames.prov!) && p.dep === depId)?.id || '';
        }
        return provincias.find(p => normalizeUbigeo(p.name) === normalizeUbigeo(initialNames.prov!))?.id || '';
    });

    const [selectedDistId, setSelectedDistId] = useState<string>(() => {
        if (!initialNames?.dist) return '';
        return distritos.find(d => normalizeUbigeo(d.name) === normalizeUbigeo(initialNames.dist!))?.id || '';
    });

    useEffect(() => {
        if (initialNames?.dep) {
            const d = departamentos.find(x => normalizeUbigeo(x.name) === normalizeUbigeo(initialNames.dep!));
            if (d && d.id !== selectedDepId) setSelectedDepId(d.id);
        }
    }, [initialNames?.dep]);

    useEffect(() => {
        if (initialNames?.prov) {
            const p = provincias.find(x => normalizeUbigeo(x.name) === normalizeUbigeo(initialNames.prov!));
            if (p && p.id !== selectedProvId) setSelectedProvId(p.id);
        }
    }, [initialNames?.prov]);

    useEffect(() => {
        if (initialNames?.dist) {
            const d = distritos.find(x => normalizeUbigeo(x.name) === normalizeUbigeo(initialNames.dist!));
            if (d && d.id !== selectedDistId) setSelectedDistId(d.id);
        }
    }, [initialNames?.dist]);

    const depOptions = useMemo(() => departamentos, []);

    const provOptions = useMemo(() => {
        if (!selectedDepId) return [];
        return provincias.filter(p => p.dep === selectedDepId);
    }, [selectedDepId]);

    const distOptions = useMemo(() => {
        if (!selectedProvId) return [];
        return distritos.filter(d => d.prov === selectedProvId);
    }, [selectedProvId]);

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

    // Nombres normalizados: siempre sin tildes para consistencia en BD
    const currentDepName  = useMemo(() => normalizeUbigeo(departamentos.find(d => d.id === selectedDepId)?.name || ''), [selectedDepId]);
    const currentProvName = useMemo(() => normalizeUbigeo(provincias.find(p => p.id === selectedProvId)?.name || ''), [selectedProvId]);
    const currentDistName = useMemo(() => normalizeUbigeo(distritos.find(d => d.id === selectedDistId)?.name || ''), [selectedDistId]);

    return {
        selectedDepId, selectedProvId, selectedDistId,
        depOptions, provOptions, distOptions,
        handleDepChange, handleProvChange, handleDistChange,
        currentDepName, currentProvName, currentDistName,
    };
};
