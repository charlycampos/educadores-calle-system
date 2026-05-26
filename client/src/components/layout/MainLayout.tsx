import type { ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Presentation,
    ArrowLeft,
    FileText,
    Shield,
    MapPin,
    ArrowLeftRight,
    BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { ROLES } from '../../config/api';
import { SecLogo } from '../SecLogo';

interface MainLayoutProps {
    children: ReactNode;
}

// Iniciales del nombre
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
    MONITOR:           'Monitor/a Central',
    ESTADISTICO:       'Estadístico/a',
};

export const MainLayout = ({ children }: MainLayoutProps) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getSidebarItems = () => {
        const items = [];
        if (!user) return items;

        const isNacional = [ROLES.ADMIN_NACIONAL, ROLES.MONITOR, ROLES.ESTADISTICO].includes(user.rol);

        if (isNacional) {
            items.push({ label: 'Casos NNA', icon: FileText, path: '/nna' });
            if (user.rol !== ROLES.ESTADISTICO) {
                items.push({ label: 'Auditoría Calidad', icon: Shield, path: '/monitor/auditoria' });
                items.push({ label: 'Bandeja Traslados', icon: ArrowLeftRight, path: '/monitor/traslados' });
            }
            if (user.rol === ROLES.ADMIN_NACIONAL) {
                items.push({ label: 'Talleres', icon: Presentation, path: '/talleres' });
                items.push({ label: 'Gestión Sedes', icon: MapPin, path: '/sedes' });
            }
            items.push({ label: 'Reportes', icon: BarChart3, path: '/reportes' });
        } else {
            const isSedeSupervisor = [ROLES.ADMIN_SEDE, ROLES.COORDINADOR].includes(user.rol);
            items.push({ 
                label: 'Casos NNA', 
                icon: FileText, 
                path: isSedeSupervisor ? '/coordinador/casos' : '/nna' 
            });
            if (isSedeSupervisor) {
                items.push({ label: 'Bandeja Derivaciones', icon: Shield, path: '/coordinador/derivaciones' });
            }
            if (user.rol === ROLES.EDUCADOR) {
                items.push({ label: 'Talleres', icon: Presentation, path: '/talleres' });
            }
        }
        return items;
    };

    const modulosItems = getSidebarItems();

    const adminItems = [
        { label: 'Usuarios', icon: Users, path: '/usuarios' },
    ];

    const showDashboard = user?.rol && [ROLES.ADMIN_SEDE, ROLES.COORDINADOR, ROLES.EDUCADOR, ROLES.PSICOLOGO, ROLES.TRABAJADOR_SOCIAL, ROLES.ABOGADO].includes(user.rol);
    const showDashboardNacional = user?.rol && [ROLES.ADMIN_NACIONAL, ROLES.MONITOR, ROLES.ESTADISTICO].includes(user.rol);
    const showAdmin = user?.rol && [ROLES.ADMIN_NACIONAL, ROLES.ADMIN_SEDE, ROLES.COORDINADOR].includes(user.rol);

    const initials = user ? getInitials(user.nombre) : '?';
    const rolLabel = user ? (ROL_LABELS[user.rol] ?? user.rol) : '';

    return (
        <div className="flex min-h-screen bg-bg overflow-hidden">
            {/* Mobile overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed lg:static inset-y-0 left-0 z-30 w-[220px] bg-surface border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col shrink-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo / Branding */}
                <div className="px-4 py-[14px] border-b border-border flex items-center justify-between">
                    <SecLogo variant="compact" size="sm" />
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-fg-muted hover:text-fg">
                        <X size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">

                    {/* Dashboard */}
                    {(showDashboard || showDashboardNacional) && (
                        <div>
                            <p className="text-micro px-3 mb-1">Inicio</p>
                            {showDashboardNacional && (
                                <NavLink
                                    to="/dashboard-nacional"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => clsx(
                                        "flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-primary-soft text-primary"
                                            : "text-fg-secondary hover:bg-surface-muted hover:text-fg"
                                    )}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <LayoutDashboard size={15} className={clsx("shrink-0", isActive ? "text-primary" : "text-fg-muted")} />
                                            Dashboard Nacional
                                        </>
                                    )}
                                </NavLink>
                            )}
                            {showDashboard && (
                                <NavLink
                                    to="/dashboard"
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => clsx(
                                        "flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-primary-soft text-primary"
                                            : "text-fg-secondary hover:bg-surface-muted hover:text-fg"
                                    )}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <LayoutDashboard size={15} className={clsx("shrink-0", isActive ? "text-primary" : "text-fg-muted")} />
                                            {user?.rol === ROLES.EDUCADOR ? 'Mi Tablero' : 'Dashboard'}
                                        </>
                                    )}
                                </NavLink>
                            )}
                        </div>
                    )}

                    {/* Módulos */}
                    <div>
                        <p className="text-micro px-3 mb-1">Módulos</p>
                        {modulosItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                                    isActive || location.pathname.startsWith(item.path)
                                        ? "bg-primary-soft text-primary"
                                        : "text-fg-secondary hover:bg-surface-muted hover:text-fg"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon size={15} className={clsx("shrink-0", isActive || location.pathname.startsWith(item.path) ? "text-primary" : "text-fg-muted")} />
                                        {item.label}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>

                    {/* Administración */}
                    {showAdmin && (
                        <div>
                            <p className="text-micro px-3 mb-1">Sistema</p>
                            {adminItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={({ isActive }) => clsx(
                                        "flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] font-medium transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-primary-soft text-primary"
                                            : "text-fg-secondary hover:bg-surface-muted hover:text-fg"
                                    )}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <item.icon size={15} className={clsx("shrink-0", isActive ? "text-primary" : "text-fg-muted")} />
                                            {item.label}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    )}
                </nav>

                {/* Footer: user info + back to menu + logout */}
                <div className="border-t border-border p-[10px] space-y-1">
                    {/* Back to main menu */}
                    {user?.rol && [ROLES.ADMIN_NACIONAL, ROLES.ESTADISTICO].includes(user.rol) && (
                        <button
                            onClick={() => { navigate('/'); setIsSidebarOpen(false); }}
                            className="w-full flex items-center gap-1.5 px-[10px] py-[6px] text-[12px] font-medium text-fg-secondary hover:bg-surface-muted hover:text-fg rounded-md transition-colors"
                        >
                            <ArrowLeft size={13} />
                            Menú Principal
                        </button>
                    )}

                    {/* User info */}
                    <div className="flex items-center gap-2 px-[10px] py-2 rounded-md bg-surface-muted border border-border">
                        <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-fg text-[10px] font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-fg truncate leading-[1.2]">{user?.nombre}</p>
                            <p className="text-[10px] text-fg-muted truncate">
                                {rolLabel}
                            </p>
                        </div>
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-full mt-1 flex items-center gap-1.5 px-[10px] py-[7px] text-[12px] font-medium text-fg-secondary hover:bg-danger-soft hover:text-danger rounded-md transition-colors"
                    >
                        <LogOut size={13} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top bar (mobile only) */}
                <header className="h-14 bg-surface border-b border-border flex items-center gap-3 px-4 shrink-0 lg:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-fg-muted hover:bg-surface-muted rounded-md"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-fg text-sm">SEC · INABIF</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-7 lg:px-8 lg:py-7">
                    {children}
                </main>
            </div>
        </div>
    );
};
