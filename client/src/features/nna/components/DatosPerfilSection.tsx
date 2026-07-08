import React from 'react';
import { useFormContext } from 'react-hook-form';
import { SectionHeader } from '../../../components/ui/FormFields';
import { ActividadesCalleSection } from './ActividadesCalleSection';
import type { NnaFormData } from '../types/nna-form.types';

export const DatosPerfilSection: React.FC = () => {
    const { control } = useFormContext<NnaFormData>();

    return (
        <div className="space-y-6 animate-fadeIn">
            <SectionHeader title="III. Datos Según Perfil de la Niña, Niño y Adolescente (entrevista)" />
            <ActividadesCalleSection control={control} />
        </div>
    );
};
