import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { getUsers, createUser, updateUser, deleteUser, type Usuario } from '../../api/usuario.api';
import { getSedesAll, type Sede } from '../../api/sedes.api';
import {
    Users, UserPlus, Edit, Trash2, Shield, MapPin, X,
    Building2, Search, Filter
} from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import clsx from 'clsx';
import { Button } from '../../components/ui/Button';

interface UsuarioForm {
    nombreCompleto: string;
    email: string;
    password?: string;
    rolId: number;
    sedeId?: number;
    zonaAsignada?: string;
    activo?: boolean;
}

const ROL_COLORES: Record<string, string> = {
    ADMIN_NACIONAL:    'bg-primary-soft text-primary',
    ADMIN_SEDE:        'bg-primary-soft text-primary',
    COORDINADOR:       'bg-info-soft text-info',
    EDUCADOR:          'bg-success-soft text-success',
    PSICOLOGO:         'bg-warning-soft text-warning',
    TRABAJADOR_SOCIAL: 'bg-warning-soft text-warning',
    ABOGADO:           'bg-danger-soft text-danger',
};

export const UserListPage = () => {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers]               = useState<Usuario[]>([]);
    const [sedes, setSedes]               = useState<Sede[]>([]);
    const [loading, setLoading]           = useState(true);
    const [isModalOpen, setIsModalOpen]   = useState(false);
    const [editingUser, setEditingUser]   = useState<Usuario | null>(null);
    const [error, setError]               = useState<string | null>(null);
    const [busqueda, setBusqueda]         = useState('');
    const [sedeFiltro, setSedeFiltro]     = useState<number | 'TODAS'>('TODAS');

    const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<UsuarioForm>();

    const isAdminNacional = currentUser?.rol === 'ADMIN_NACIONAL';
    const isAdminSede     = currentUser?.rol === 'ADMIN_SEDE';
    const canManage = ['ADMIN_NACIONAL', 'ADMIN_SEDE', 'COORDINADOR'].includes(currentUser?.rol ?? '');

    // El ADMIN_SEDE solo gestiona su propia sede
    const miSedeId = currentUser?.sedeId ?? null;

    useEffect(() => {
        loadUsers();
        if (isAdminNacional) loadSedes();
    }, []);

    const loadSedes = async () => {
        try {
            const data = await getSedesAll();
            setSedes(data);
        } catch {}
    };

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (e: any) {
            setError(e.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit: SubmitHandler<UsuarioForm> = async (data) => {
        try {
            // ADMIN_SEDE siempre crea usuarios en su propia sede
            const sedeDestino = isAdminNacional
                ? (data.sedeId ? Number(data.sedeId) : 1)
                : (miSedeId ?? 1);

            const payload = {
                nombreCompleto: data.nombreCompleto,
                email:          data.email,
                password:       data.password || undefined,
                rolId:          Number(data.rolId),
                sedeId:         sedeDestino,
                zonaAsignada:   data.zonaAsignada || undefined,
                activo:         data.activo,
            };

            if (editingUser) {
                await updateUser(editingUser.id, payload);
            } else {
                if (!payload.password) { alert('La contraseña es requerida'); return; }
                await createUser(payload);
            }
            closeModal();
            loadUsers();
        } catch (e: any) {
            alert(e.message || 'Error al guardar usuario');
        }
    };

    const openEdit = (user: Usuario) => {
        setEditingUser(user);
        reset({
            nombreCompleto: user.nombreCompleto || user.nombre_completo || '',
            email:          user.email,
            password:       '',
            rolId:          user.rolId ?? 3,
            sedeId:         user.sedeId,
            zonaAsignada:   user.zonaAsignada ?? '',
            activo:         user.activo,
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingUser(null);
        reset({
            activo: true,
            rolId: 4,
            sedeId: miSedeId ?? undefined,
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        try {
            await deleteUser(id);
            loadUsers();
        } catch (e: any) {
            alert(e.message || 'Error al eliminar usuario');
        }
    };

    // Filtrado: ADMIN_SEDE solo ve su sede; ADMIN_NACIONAL puede filtrar
    const usersFiltrados = users.filter(u => {
        // Restricción de sede para ADMIN_SEDE
        if (isAdminSede && miSedeId && u.sedeId !== miSedeId) return false;

        // Filtro por sede seleccionado (solo ADMIN_NACIONAL)
        if (isAdminNacional && sedeFiltro !== 'TODAS' && u.sedeId !== sedeFiltro) return false;

        // Búsqueda textual
        if (busqueda) {
            const q = busqueda.toLowerCase();
            const nombre = (u.nombreCompleto || u.nombre_completo || '').toLowerCase();
            if (!nombre.includes(q) && !u.email.toLowerCase().includes(q) && !(u.rol ?? '').toLowerCase().includes(q)) {
                return false;
            }
        }
        return true;
    });

    if (!canManage) return (
        <div className="p-10 text-center text-fg-muted">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-semibold text-lg text-fg">Acceso denegado</p>
            <p className="text-[13px]">No tienes permisos para ver esta sección.</p>
        </div>
    );

    // Nombre de la sede actual para mostrar en el título
    const sedeNombreActual = isAdminSede
        ? (sedes.find(s => s.id === miSedeId)?.nombre ?? currentUser?.zona ?? 'Mi Sede')
        : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold text-fg tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-fg-secondary text-[13px] mt-1">
                        {isAdminSede
                            ? `Equipo de la sede: ${sedeNombreActual}`
                            : 'Administre el personal, roles y sedes.'}
                    </p>
                </div>
                <Button variant="primary" onClick={openNew} className="gap-2">
                    <UserPlus size={16} />
                    Nuevo Usuario
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-danger-soft border border-danger/20 rounded-lg text-danger text-[13px] font-medium">
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                {/* Búsqueda */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o rol..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                </div>

                {/* Filtro por sede (solo ADMIN_NACIONAL) */}
                {isAdminNacional && (
                    <div className="relative min-w-[200px]">
                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                        <select
                            value={sedeFiltro}
                            onChange={e => setSedeFiltro(e.target.value === 'TODAS' ? 'TODAS' : Number(e.target.value))}
                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
                        >
                            <option value="TODAS">Todas las sedes</option>
                            {sedes.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Badge contador */}
                <div className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border rounded-lg text-[12px] text-fg-secondary">
                    <Users size={13} />
                    <span className="font-semibold">{usersFiltrados.length}</span>
                    <span>usuario{usersFiltrados.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-fg-muted text-[13px]">Cargando usuarios...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead className="bg-surface-muted text-[11px] font-semibold text-fg-secondary uppercase tracking-wider border-b border-border">
                                <tr>
                                    <th className="px-5 py-3.5">Usuario</th>
                                    <th className="px-5 py-3.5">Rol</th>
                                    {isAdminNacional && <th className="px-5 py-3.5">Sede</th>}
                                    <th className="px-5 py-3.5">Zona</th>
                                    <th className="px-5 py-3.5">Estado</th>
                                    <th className="px-5 py-3.5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {usersFiltrados.map(user => (
                                    <tr key={user.id} className="hover:bg-surface-muted/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="font-semibold text-fg">
                                                {user.nombreCompleto || user.nombre_completo}
                                            </div>
                                            <div className="text-[12px] text-fg-muted mt-0.5">{user.email}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={clsx(
                                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border border-transparent',
                                                ROL_COLORES[user.rol ?? ''] ?? 'bg-surface-muted text-fg-secondary border-border'
                                            )}>
                                                <Shield size={12} /> {user.rol}
                                            </span>
                                        </td>
                                        {/* Columna Sede — solo para ADMIN_NACIONAL */}
                                        {isAdminNacional && (
                                            <td className="px-5 py-3">
                                                {user.sedeId ? (
                                                    <span className="flex items-center gap-1.5 text-[12px] text-fg-secondary">
                                                        <Building2 size={13} className="text-indigo-400" />
                                                        {sedes.find(s => s.id === user.sedeId)?.nombre ?? `Sede #${user.sedeId}`}
                                                    </span>
                                                ) : (
                                                    <span className="text-fg-muted">—</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-5 py-3 text-fg-secondary">
                                            {user.zonaAsignada
                                                ? <span className="flex items-center gap-1.5 text-[12px]"><MapPin size={14} />{user.zonaAsignada}</span>
                                                : <span className="text-fg-muted">—</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            {user.activo
                                                ? <span className="text-[10px] font-bold text-success bg-success-soft px-2 py-0.5 rounded-full border border-success/20 tracking-wider">ACTIVO</span>
                                                : <span className="text-[10px] font-bold text-fg-muted bg-surface-muted px-2 py-0.5 rounded-full border border-border tracking-wider">INACTIVO</span>}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(user)}
                                                    className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-md transition-colors" title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id)}
                                                    className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-md transition-colors" title="Eliminar">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && usersFiltrados.length === 0 && (
                    <div className="p-10 text-center text-fg-muted text-[13px]">
                        {busqueda || sedeFiltro !== 'TODAS'
                            ? 'No hay usuarios que coincidan con los filtros.'
                            : 'No hay usuarios registrados.'}
                    </div>
                )}
            </div>

            {/* Modal crear / editar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-surface w-full max-w-lg rounded-lg shadow-xl overflow-hidden border border-border">
                        <div className="bg-bg border-b border-border px-5 py-3.5 flex justify-between items-center">
                            <h3 className="font-semibold text-[15px] text-fg">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h3>
                            <button onClick={closeModal} className="text-fg-muted hover:text-fg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">
                                    Nombre Completo *
                                </label>
                                <input
                                    {...register('nombreCompleto', { required: true })}
                                    className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">
                                    Email *
                                </label>
                                <input
                                    {...register('email', { required: true })}
                                    type="email"
                                    className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                />
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">
                                    {editingUser ? 'Nueva Contraseña (vacío = sin cambio)' : 'Contraseña *'}
                                </label>
                                <input
                                    {...register('password', { required: !editingUser })}
                                    type="password"
                                    placeholder={editingUser ? '••••••••' : ''}
                                    className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                />
                            </div>

                            {/* Rol + Sede */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">Rol *</label>
                                    <select
                                        {...register('rolId', { required: true, valueAsNumber: true })}
                                        className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    >
                                        {isAdminNacional && <option value={1}>ADMIN NACIONAL</option>}
                                        <option value={2}>ADMIN SEDE</option>
                                        <option value={3}>COORDINADOR</option>
                                        <option value={4}>EDUCADOR</option>
                                        <option value={5}>PSICÓLOGO</option>
                                        <option value={6}>TRABAJADOR SOCIAL</option>
                                        <option value={7}>ABOGADO</option>
                                    </select>
                                </div>

                                {/* Selector de sede — solo ADMIN_NACIONAL puede cambiar la sede */}
                                <div>
                                    <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">
                                        Sede *
                                    </label>
                                    {isAdminNacional ? (
                                        <select
                                            {...register('sedeId', { valueAsNumber: true })}
                                            className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                        >
                                            {sedes.map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="w-full p-2.5 border border-border rounded-md text-[13px] bg-surface-muted text-fg-secondary flex items-center gap-2">
                                            <Building2 size={13} />
                                            {currentUser?.zona ?? 'Mi Sede'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Zona asignada */}
                            <div>
                                <label className="block text-[12px] font-semibold text-fg-secondary mb-1.5">
                                    Zona Asignada
                                </label>
                                <input
                                    {...register('zonaAsignada')}
                                    placeholder="Ej: Lima Norte, Jr. de la Unión"
                                    className="w-full p-2.5 border border-border rounded-md text-[13px] bg-bg text-fg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                />
                            </div>

                            {/* Activo (solo en edición) */}
                            {editingUser && (
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        {...register('activo')}
                                        id="activo"
                                        className="w-4 h-4 text-primary bg-bg border-border rounded focus:ring-primary"
                                    />
                                    <label htmlFor="activo" className="text-[13px] font-semibold text-fg">
                                        Usuario Activo
                                    </label>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="pt-5 flex justify-end gap-2 border-t border-border mt-5">
                                <Button type="button" variant="secondary" onClick={closeModal}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
