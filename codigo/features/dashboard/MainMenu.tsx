/**
 * SEC · MainMenu rediseñado
 * - Tarjetas blancas con icono coloreado (no azulejos sólidos idénticos)
 * - Descripción y métrica en vivo por módulo
 * - Badge "Próximamente" visible pero discreto
 * - SecLogo en header
 * - Pending badge en Mi Tablero
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, ClipboardList,
    Globe, LogOut, Lock, ChevronRight, MapPin, Shield,
} from 'lucide-react';
import { ROLES, AUTH_API_URL } from '../../config/api';
import { SecLogo } from '../../components/SecLogo';

const ROL_LABELS: Record<string, string> = {
    ADMIN_NACIONAL:    'Administrador Nacional',
    ADMIN_SEDE:        'Administrador de Sede',
    COORDINADOR:       'Coordinador/a',
    EDUCADOR:          'Educador/a de Calle',
    PSICOLOGO:         'Psicólogo/a',
    TRABAJADOR_SOCIAL: 'Trabajador/a Social',
    ABOGADO:           'Abogado/a',
};

const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
};

/* Colores de ícono por módulo — todos del mismo sistema de tokens */
const ICON_TONE: Record<string, { bg: string; text: string }> = {
    'dashboard-nacional': { bg: 'bg-primary-soft',  text: 'text-primary' },
    'dashboard-sede':     { bg: 'bg-primary-soft',  text: 'text-primary' },
    'mi-tablero':         { bg: 'bg-primary-soft',  text: 'text-primary' },
    'nna':                { bg: 'bg-info-soft',      text: 'text-info' },
    'talleres':           { bg: 'bg-success-soft',   text: 'text-success' },
    'usuarios':           { bg: 'bg-warning-soft',   text: 'text-warning' },
    'derivaciones':       { bg: 'bg-surface-muted',  text: 'text-fg-muted' },
    'traslados':          { bg: 'bg-surface-muted',  text: 'text-fg-muted' },
};

interface Modulo {
    id: string;
    titulo: string;
    descripcion: string;
    icono: React.ElementType;
    ruta?: string;
    disponible: boolean;
    roles: string[];
}

export const MainMenu = () => {
    const { user, token, logout } = useAuthStore();
    const navigate = useNavigate();
    const [pendientes, setPendientes] = useState<number | null>(null);

    useEffect(() => {
        if (user?.rol !== ROLES.EDUCADOR || !token) return;
        fetch(`${AUTH_API_URL}/statistics/mis-pendientes`, {
            headers: { 'Authorization': `Bearer ${token}` },
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
            descripcion: 'Vista consolidada de todas las sedes',
            icono: Globe,
            ruta: '/dashboard-nacional',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL],
        },
        {
            id: 'dashboard-sede',
            titulo: 'Dashboard de Sede',
            descripcion: 'Métricas, alertas y carga del equipo',
            icono: LayoutDashboard,
            ruta: '/dashboard',
            disponible: true,
            roles: [ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
        },
        {
            id: 'mi-tablero',
            titulo: 'Mi Tablero',
            descripcion: pendientes != null && pendientes > 0
                ? `${pendientes} pendiente${pendientes > 1 ? 's' : ''} hoy`
                : 'Mis casos activos del día',
            icono: LayoutDashboard,
            ruta: '/dashboard',
            disponible: true,
            roles: [ROLES.EDUCADOR, ROLES.PSICOLOGO, ROLES.TRABAJADOR_SOCIAL, ROLES.ABOGADO],
        },
        {
            id: 'nna',
            titulo: 'Gestión de Casos',
            descripcion: 'Registro, fichas y expedientes NNA',
            icono: FileText,
            ruta: '/nna',
            disponible: true,
            roles: todosLosRoles,
        },
        {
            id: 'talleres',
            titulo: 'Talleres Socioeducativos',
            descripcion: 'Planificación F07 y evaluación F08',
            icono: ClipboardList,
            ruta: '/talleres',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR, ROLES.EDUCADOR],
        },
        {
            id: 'usuarios',
            titulo: 'Gestión de Usuarios',
            descripcion: 'Roles, accesos y equipos',
            icono: Users,
            ruta: '/usuarios',
            disponible: true,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
        },
        {
            id: 'derivaciones',
            titulo: 'Derivaciones',
            descripcion: 'Internas y externas (DEMUNA, UPE)',
            icono: ChevronRight,
            disponible: false,
            roles: todosLosRoles,
        },
        {
            id: 'traslados',
            titulo: 'Traslados de NNA',
            descripcion: 'Entre sedes y unidades',
            icono: MapPin,
            disponible: false,
            roles: [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR],
        },
    ];

    const modulosVisibles = modulos.filter(m => m.roles.includes(user.rol));
    const initials = getInitials(user.nombre);
    const rolLabel = ROL_LABELS[user.rol] ?? user.rol;

    return (
        <div className="min-h-screen bg-bg">

            {/* Header */}
            <header className="bg-surface border-b border-border">
                <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
                    <SecLogo variant="full" size="md" />

                    <div className="flex items-center gap-3">
                        {/* Usuario */}
                        <div className="flex items-center gap-2.5 hidden sm:flex">
                            <div className="w-8 h-8 rounded-full bg-primary grid place-items-center text-primary-fg text-[11px] font-bold flex-shrink-0">
                                {initials}
                            </div>
                            <div className="leading-tight">
                                <p className="text-[13px] font-semibold text-fg">{user.nombre}</p>
                                <p className="text-[11px] text-fg-muted flex items-center gap-1">
                                    <Shield size={10} aria-hidden="true" /> {rolLabel}
                                </p>
                            </div>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={() => { logout(); navigate('/login'); }}
                            className="flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary hover:text-danger border border-border hover:border-danger/30 hover:bg-danger-soft px-3 py-1.5 rounded-md transition-colors"
                        >
                            <LogOut size={14} aria-hidden="true" />
                            <span className="hidden sm:inline">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido */}
            <main className="max-w-5xl mx-auto px-6 py-10">

                {/* Saludo */}
                <div className="mb-8">
                    <h1 className="text-h1 text-fg">Bienvenido, {user.nombre.split(' ')[0]}</h1>
                    <p className="text-body text-fg-secondary mt-1">Selecciona el módulo al que deseas acceder</p>
                    {user.zona && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-primary-soft text-primary rounded-full text-[11px] font-semibold">
                            <MapPin size={11} aria-hidden="true" /> {user.zona}
                        </span>
                    )}
                </div>

                {/* Grid de módulos */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {modulosVisibles.map((modulo) => {
                        const tone = ICON_TONE[modulo.id] ?? { bg: 'bg-surface-muted', text: 'text-fg-muted' };
                        const Icon = modulo.icono;
                        const hasPendingBadge = modulo.id === 'mi-tablero' && pendientes != null && pendientes > 0;

                        return (
                            <button
                                key={modulo.id}
                                onClick={() => { if (modulo.disponible && modulo.ruta) navigate(modulo.ruta); }}
                                disabled={!modulo.disponible}
                                className={[
                                    'relative flex flex-col items-start text-left gap-3 p-5 rounded-lg border transition-all duration-150',
                                    modulo.disponible
                                        ? 'bg-surface border-border hover:border-primary/40 hover:shadow-[var(--shadow-2)] cursor-pointer group'
                                        : 'bg-surface-muted border-border cursor-default opacity-70',
                                ].join(' ')}
                            >
                                {/* Ícono */}
                                <div className={`p-2.5 rounded-md ${tone.bg}`}>
                                    <Icon size={18} className={tone.text} aria-hidden="true" />
                                </div>

                                {/* Texto */}
                                <div className="flex-1">
                                    <p className="text-[14px] font-semibold text-fg leading-snug group-hover:text-primary transition-colors">
                                        {modulo.titulo}
                                    </p>
                                    <p className="text-[12px] text-fg-muted mt-0.5 leading-snug">
                                        {modulo.descripcion}
                                    </p>
                                </div>

                                {/* Flecha */}
                                {modulo.disponible && (
                                    <ChevronRight
                                        size={14}
                                        className="absolute bottom-4 right-4 text-fg-muted/40 group-hover:text-primary transition-colors"
                                        aria-hidden="true"
                                    />
                                )}

                                {/* Badge próximamente */}
                                {!modulo.disponible && (
                                    <span className="absolute top-3 right-3 flex items-center gap-1 bg-surface border border-border text-fg-muted text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        <Lock size={8} aria-hidden="true" /> Próximamente
                                    </span>
                                )}

                                {/* Badge pendientes */}
                                {hasPendingBadge && (
                                    <span className="absolute top-3 right-3 bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {pendientes}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <p className="text-center text-[11px] text-fg-muted mt-12">
                    INABIF · DGNNA · Ministerio de la Mujer y Poblaciones Vulnerables · © {new Date().getFullYear()}
                </p>
            </main>
        </div>
    );
};
