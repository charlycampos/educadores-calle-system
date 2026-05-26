import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, ClipboardList,
    Globe, LogOut, Lock, ChevronRight, MapPin, Shield, Building2,
    BarChart3
} from 'lucide-react';
import { ROLES, AUTH_API_URL } from '../../config/api';
import { SecLogo } from '../../components/SecLogo';
import { Button } from '../../components/ui/Button';

// Etiquetas legibles por rol
const ROL_LABELS: Record<string, string> = {
    ADMIN_NACIONAL:    'Administrador Nacional',
    ADMIN_SEDE:        'Administrador de Sede',
    COORDINADOR:       'Coordinador/a',
    EDUCADOR:          'Educador/a',
    PSICOLOGO:         'Psicólogo/a',
    TRABAJADOR_SOCIAL: 'Trab. Social',
    ABOGADO:           'Abogado/a',
    MONITOR:           'Monitor/a Central',
    ESTADISTICO:       'Estadístico/a',
};

// Iniciales del nombre
const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
};

interface Modulo {
    id: string;
    titulo: string;
    descripcion: string;
    icono: React.ReactNode;
    ruta?: string;
    disponible: boolean;
    roles: string[];       // roles que pueden verlo
    theme: 'primary' | 'info' | 'success' | 'danger' | 'warning';
}

export const MainMenu = () => {
    const { user, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const [pendientes, setPendientes] = useState<number | null>(null);

    // Bypass completo para Monitor, Coordinador, Educador y demás profesionales: Redirigir directamente a sus dashboards correspondientes sin pasar por el menú redundante
    useEffect(() => {
        if (user) {
            if (user.rol === ROLES.MONITOR) {
                navigate('/dashboard-nacional', { replace: true });
            } else if (
                user.rol === ROLES.COORDINADOR ||
                user.rol === ROLES.ADMIN_SEDE ||
                user.rol === ROLES.EDUCADOR ||
                user.rol === ROLES.PSICOLOGO ||
                user.rol === ROLES.TRABAJADOR_SOCIAL ||
                user.rol === ROLES.ABOGADO
            ) {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user?.rol !== ROLES.EDUCADOR || !token) return;
        fetch(`${AUTH_API_URL}/statistics/mis-pendientes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setPendientes(data.total); })
            .catch(() => {});
    }, [user, token]);

    if (!user) return null;

    const todosLosRoles = Object.values(ROLES);

    const modulos: Modulo[] = [
        {
            id: 'dashboard-nacional',
            titulo: 'Dashboard Nacional',
            descripcion: 'Vista global de todas las sedes a nivel nacional',
            icono: <Globe className="w-[18px] h-[18px]" />,
            ruta: '/dashboard-nacional',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.MONITOR, ROLES.ESTADISTICO],
            theme: 'primary',
        },
        {
            id: 'reportes',
            titulo: 'Reportes y Descargas',
            descripcion: 'Exportación de Padrón NNA, talleres e historial en Excel',
            icono: <BarChart3 className="w-[18px] h-[18px]" />,
            ruta: '/reportes',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.MONITOR, ROLES.ESTADISTICO],
            theme: 'success',
        },
        {
            id: 'dashboard-sede',
            titulo: 'Dashboard de Sede',
            descripcion: 'Métricas, alertas de calidad y carga laboral del equipo',
            icono: <LayoutDashboard className="w-[18px] h-[18px]" />,
            ruta: '/dashboard',
            disponible: true,
            roles: [ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
            theme: 'primary',
        },
        {
            id: 'mi-tablero',
            titulo: 'Mi Tablero',
            descripcion: pendientes != null && pendientes > 0
                ? `${pendientes} pendientes hoy`
                : 'Mis casos activos y pendientes',
            icono: <LayoutDashboard className="w-[18px] h-[18px]" />,
            ruta: '/dashboard',
            disponible: true,
            roles: [ROLES.EDUCADOR, ROLES.PSICOLOGO, ROLES.TRABAJADOR_SOCIAL, ROLES.ABOGADO],
            theme: 'primary',
        },
        {
            id: 'nna',
            titulo: 'Gestión de Casos',
            descripcion: 'Registro, fichas y expedientes NNA',
            icono: <FileText className="w-[18px] h-[18px]" />,
            ruta: '/nna',
            disponible: true,
            roles: todosLosRoles,
            theme: 'info',
        },
        {
            id: 'talleres',
            titulo: 'Talleres Socioeducativos',
            descripcion: 'Planificación F07 y evaluación F08',
            icono: <ClipboardList className="w-[18px] h-[18px]" />,
            ruta: '/talleres',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR, ROLES.EDUCADOR],
            theme: 'success',
        },
        {
            id: 'sedes',
            titulo: 'Gestión de Sedes',
            descripcion: 'Sedes, equipos y profesionales por sede',
            icono: <Building2 className="w-[18px] h-[18px]" />,
            ruta: '/sedes',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL],
            theme: 'info',
        },
        {
            id: 'usuarios',
            titulo: 'Gestión de Usuarios',
            descripcion: 'Administrar roles, accesos y equipos',
            icono: <Users className="w-[18px] h-[18px]" />,
            ruta: '/usuarios',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
            theme: 'warning',
        },
        {
            id: 'derivaciones',
            titulo: 'Bandeja de Derivaciones',
            descripcion: 'Aprobaciones y traslados de la sede',
            icono: <ChevronRight className="w-[18px] h-[18px]" />,
            ruta: '/dashboard?tab=derivaciones',
            disponible: true,
            roles: [ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
            theme: 'primary',
        },
        {
            id: 'traslados',
            titulo: 'Bandeja de Traslados',
            descripcion: 'Gestión y aprobación inter-regional',
            icono: <MapPin className="w-[18px] h-[18px]" />,
            ruta: '/monitor/traslados',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.MONITOR],
            theme: 'primary',
        },
        {
            id: 'auditoria-calidad',
            titulo: 'Auditoría de Calidad',
            descripcion: 'Supervisión del correcto foliado y carga de anexos',
            icono: <FileText className="w-[18px] h-[18px]" />,
            ruta: '/monitor/auditoria',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.MONITOR],
            theme: 'warning',
        },
    ];

    const modulosVisibles = modulos.filter(m => m.roles.includes(user.rol));
    const tieneAcceso = (m: Modulo) => m.disponible && m.roles.includes(user.rol);

    const handleClick = (m: Modulo) => {
        if (!m.disponible) return;
        if (m.ruta) navigate(m.ruta);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = getInitials(user.nombre);
    const rolLabel = ROL_LABELS[user.rol] ?? user.rol;

    return (
        <div className="min-h-screen bg-bg">
            <header className="bg-surface border-b border-border px-6 py-3 flex items-center justify-between">
                <div>
                    <SecLogo variant="full" size="sm" />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-muted border border-border">
                        <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-fg text-[10px] font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="hidden sm:block text-left min-w-0">
                            <p className="text-[12px] font-semibold text-fg leading-[1.2]">{user.nombre}</p>
                            <p className="text-[10px] text-fg-muted font-medium">{rolLabel}</p>
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleLogout}>
                        Cerrar sesión
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-10">
                <div className="mb-7">
                    <h1 className="text-[22px] font-semibold tracking-tight text-fg">
                        Bienvenida, {user.nombre.split(' ')[0]}
                    </h1>
                    <p className="text-fg-secondary text-[13px] mt-1">
                        Selecciona el módulo al que deseas acceder
                    </p>
                    {user.zona && (
                        <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-[3px] bg-primary-soft text-primary rounded-full text-[11px] font-semibold">
                            <MapPin size={11} /> {user.zona}
                        </span>
                    )}
                </div>

                {/* Grid de módulos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {modulosVisibles.map((modulo) => {
                        const acceso = tieneAcceso(modulo);
                        const proximamente = !modulo.disponible;

                        return (
                            <div
                                key={modulo.id}
                                onClick={() => handleClick(modulo)}
                                className={`
                                    bg-surface border border-border rounded-lg p-[18px] flex flex-col gap-2.5 relative transition-all duration-150
                                    ${acceso ? 'cursor-pointer hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]' : 'opacity-[0.65] cursor-default'}
                                `}
                            >
                                <div className={`p-2 rounded-md w-fit bg-${acceso ? modulo.theme : 'surface-muted'}${acceso ? '-soft text-' + modulo.theme : ' text-fg-muted'}`}>
                                    {modulo.icono}
                                </div>
                                
                                <div>
                                    <p className={`text-[14px] font-semibold ${acceso ? 'text-fg' : 'text-fg-muted'}`}>
                                        {modulo.titulo}
                                    </p>
                                    <p className="text-[12px] text-fg-muted mt-0.5 leading-[1.3]">
                                        {modulo.descripcion}
                                    </p>
                                </div>

                                {proximamente && (
                                    <span className="absolute top-2.5 right-2.5 bg-surface border border-border text-fg-muted text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Lock size={9} /> Próximamente
                                    </span>
                                )}

                                {modulo.id === 'mi-tablero' && pendientes != null && pendientes > 0 && (
                                    <span className="absolute top-2.5 right-2.5 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {pendientes}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

