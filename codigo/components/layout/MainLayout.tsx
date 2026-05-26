/**
 * SEC · MainLayout rediseñado
 * - SecLogo en lugar de emoji
 * - Tokens de color unificados (sin blue-600, gray-400, etc.)
 * - Un solo logout (en el user card, no duplicado)
 * - Nav items con active state limpio
 * - User card con rol legible
 */

import type { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
    LayoutDashboard, Users, LogOut, Menu, X,
    Presentation, FileText, Shield, ChevronLeft,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';
import { ROLES } from '../../config/api';
import { SecLogo } from '../SecLogo';

interface MainLayoutProps { children: ReactNode; }

const getInitials = (nombre: string) => {
    const parts = nombre.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
};

const ROL_LABELS: Record<string, string> = {
    ADMIN_NACIONAL:    'Admin. Nacional',
    ADMIN_SEDE:        'Admin. de Sede',
    COORDINADOR:       'Coordinador/a',
    EDUCADOR:          'Educador/a',
    PSICOLOGO:         'Psicólogo/a',
    TRABAJADOR_SOCIAL: 'Trab. Social',
    ABOGADO:           'Abogado/a',
};

/* Ítem de nav reutilizable */
const NavItem = ({ to, icon: Icon, label, exact = false, onClick }: {
    to: string; icon: React.ElementType; label: string; exact?: boolean; onClick?: () => void;
}) => {
    const location = useLocation();
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-fg-secondary hover:bg-surface-muted hover:text-fg'
            )}
        >
            <Icon size={15} className={isActive ? 'text-primary' : 'text-fg-muted'} aria-hidden="true" />
            {label}
        </NavLink>
    );
};

export const MainLayout = ({ children }: MainLayoutProps) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const closeSidebar = () => setIsSidebarOpen(false);

    const showDashboard       = user?.rol && [ROLES.ADMIN_SEDE, ROLES.COORDINADOR, ROLES.EDUCADOR, ROLES.PSICOLOGO, ROLES.TRABAJADOR_SOCIAL, ROLES.ABOGADO].includes(user.rol);
    const showDashboardNac    = user?.rol === ROLES.ADMIN_NACIONAL;
    const showAdmin           = user?.rol && [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR].includes(user.rol);

    const initials = user ? getInitials(user.nombre) : '?';
    const rolLabel = user ? (ROL_LABELS[user.rol] ?? user.rol) : '';

    const handleLogout = () => { logout(); navigate('/login'); };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">

            {/* Logo */}
            <div className="px-4 py-4 border-b border-border flex items-center justify-between">
                <SecLogo variant="compact" size="sm" />
                <button
                    onClick={closeSidebar}
                    className="lg:hidden p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md"
                    aria-label="Cerrar menú"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

                {(showDashboard || showDashboardNac) && (
                    <div>
                        <p className="text-micro text-fg-muted px-3 mb-1.5">Inicio</p>
                        {showDashboardNac && (
                            <NavItem to="/dashboard-nacional" icon={LayoutDashboard} label="Dashboard Nacional" onClick={closeSidebar} />
                        )}
                        {showDashboard && (
                            <NavItem
                                to="/dashboard"
                                icon={LayoutDashboard}
                                label={user?.rol === ROLES.EDUCADOR ? 'Mi Tablero' : 'Dashboard'}
                                onClick={closeSidebar}
                            />
                        )}
                    </div>
                )}

                <div>
                    <p className="text-micro text-fg-muted px-3 mb-1.5">Módulos</p>
                    <NavItem to="/nna"      icon={FileText}     label="Casos NNA"  onClick={closeSidebar} />
                    <NavItem to="/talleres" icon={Presentation} label="Talleres"   onClick={closeSidebar} />
                </div>

                {showAdmin && (
                    <div>
                        <p className="text-micro text-fg-muted px-3 mb-1.5">Sistema</p>
                        <NavItem to="/usuarios" icon={Users} label="Usuarios" onClick={closeSidebar} />
                    </div>
                )}
            </nav>

            {/* Footer: usuario + acciones */}
            <div className="border-t border-border p-3 space-y-1">

                <button
                    onClick={() => { navigate('/'); closeSidebar(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fg-secondary hover:bg-surface-muted hover:text-fg rounded-md transition-colors"
                >
                    <ChevronLeft size={13} aria-hidden="true" />
                    Menú Principal
                </button>

                {/* User info */}
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface-muted border border-border">
                    <div
                        className="w-7 h-7 rounded-full bg-primary grid place-items-center text-primary-fg text-[10px] font-bold flex-shrink-0"
                        aria-hidden="true"
                    >
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-fg truncate leading-tight">{user?.nombre}</p>
                        <p className="text-[10px] text-fg-muted flex items-center gap-0.5 truncate">
                            <Shield size={9} aria-hidden="true" /> {rolLabel}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fg-secondary hover:bg-danger-soft hover:text-danger rounded-md transition-colors"
                >
                    <LogOut size={13} aria-hidden="true" />
                    Cerrar sesión
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-bg flex">

            {/* Overlay mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-fg/20 z-20 lg:hidden"
                    onClick={closeSidebar}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                'fixed lg:static inset-y-0 left-0 z-30 w-56 bg-surface border-r border-border flex flex-col',
                'transform transition-transform duration-200 ease-in-out lg:translate-x-0',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                <SidebarContent />
            </aside>

            {/* Contenido principal */}
            <div className="flex-1 flex flex-col min-h-screen min-w-0">

                {/* Top bar (solo mobile) */}
                <header className="h-13 bg-surface border-b border-border flex items-center gap-3 px-4 sticky top-0 z-10 lg:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-fg-secondary hover:bg-surface-muted rounded-md"
                        aria-label="Abrir menú"
                    >
                        <Menu size={18} />
                    </button>
                    <SecLogo variant="compact" size="sm" />
                </header>

                <main className="flex-1 p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
