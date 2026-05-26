import React from 'react';
import { useAuthStore } from '../../store/auth.store';
import { CoordinadorDashboard } from './CoordinadorDashboard';
import { EducadorDashboard } from './EducadorDashboard';
import { AdminNacionalDashboard } from './AdminNacionalDashboard';
import { AdminSedeDashboard } from './AdminSedeDashboard';
import { ROLES } from '../../config/api';

export const DashboardPage = () => {
    const { user, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) return null;

    // Cada rol tiene su propio dashboard optimizado para su función
    switch (user.rol) {
        case ROLES.ADMIN_NACIONAL:
        case ROLES.MONITOR:
        case ROLES.ESTADISTICO:
            return <AdminNacionalDashboard />;

        case ROLES.ADMIN_SEDE:
            return <AdminSedeDashboard />;

        case ROLES.COORDINADOR:
            return <CoordinadorDashboard />;

        case ROLES.EDUCADOR:
            return <EducadorDashboard />;

        // Psicólogo, Trabajador Social y Abogado ven el mismo tablero
        // que el educador (sus casos asignados y pendientes personales)
        case ROLES.PSICOLOGO:
        case ROLES.TRABAJADOR_SOCIAL:
        case ROLES.ABOGADO:
            return <EducadorDashboard />;

        default:
            return <CoordinadorDashboard />;
    }
};
