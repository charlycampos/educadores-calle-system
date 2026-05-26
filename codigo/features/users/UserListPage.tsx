/**
 * SEC · UserListPage rediseñado
 * - Tokens consolidados
 * - Badge de rol unificado (sin mapa de 7 familias de color)
 * - Modal con header limpio (sin bg-gray-900 oscuro)
 * - Sin alert() — errores en UI
 * - EmptyState rediseñado
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { getUsers, createUser, updateUser, deleteUser, type Usuario } from '../../api/usuario.api';
import { Users, UserPlus, Edit, Trash2, Shield, MapPin, X, AlertCircle } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';

interface UsuarioForm {
    nombreCompleto: string;
    email: string;
    password?: string;
    rolId: number;
    sedeId?: number;
    zonaAsignada?: string;
    activo?: boolean;
}

/* Todos los roles usan el mismo tono; diferenciamos solo admin vs. resto */
const rolTone = (rol: string): 'primary' | 'info' | 'neutral' => {
    if (['ADMIN_NACIONAL', 'ADMIN_SEDE'].includes(rol)) return 'primary';
    if (['COORDINADOR', 'EDUCADOR'].includes(rol)) return 'info';
    return 'neutral';
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

export const UserListPage = () => {
    const { user: currentUser } = useAuthStore();
    const [users, setUsers]           = useState<Usuario[]>([]);
    const [loading, setLoading]       = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [formError, setFormError]   = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<UsuarioForm>();

    const canManage = ['ADMIN_NACIONAL', 'ADMIN_SEDE', 'COORDINADOR'].includes(currentUser?.rol ?? '');

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        setGlobalError(null);
        try {
            setUsers(await getUsers());
        } catch (e: any) {
            setGlobalError(e.message ?? 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit: SubmitHandler<UsuarioForm> = async (data) => {
        setFormError(null);
        try {
            const payload = {
                nombreCompleto: data.nombreCompleto,
                email:          data.email,
                password:       data.password || undefined,
                rolId:          Number(data.rolId),
                sedeId:         data.sedeId ? Number(data.sedeId) : (currentUser?.sedeId ?? 1),
                zonaAsignada:   data.zonaAsignada || undefined,
                activo:         data.activo,
            };
            if (editingUser) {
                await updateUser(editingUser.id, payload);
            } else {
                if (!payload.password) { setFormError('La contraseña es requerida para nuevos usuarios'); return; }
                await createUser(payload);
            }
            closeModal();
            loadUsers();
        } catch (e: any) {
            setFormError(e.message ?? 'Error al guardar usuario');
        }
    };

    const openEdit = (user: Usuario) => {
        setEditingUser(user);
        reset({
            nombreCompleto: user.nombreCompleto || user.nombre_completo || '',
            email:          user.email,
            password:       '',
            rolId:          user.rolId ?? 3,
            zonaAsignada:   user.zonaAsignada ?? '',
            activo:         user.activo,
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingUser(null);
        reset({ activo: true, rolId: 4 });
        setIsModalOpen(true);
    };

    const closeModal = () => { setIsModalOpen(false); setEditingUser(null); setFormError(null); reset(); };

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(`¿Eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteUser(id);
            loadUsers();
        } catch (e: any) {
            setGlobalError(e.message ?? 'Error al eliminar usuario');
        }
    };

    if (!canManage) return (
        <div className="flex flex-col items-center justify-center h-80 gap-3">
            <div className="w-12 h-12 rounded-lg bg-surface-muted border border-border grid place-items-center text-fg-muted">
                <Shield size={24} />
            </div>
            <p className="text-[16px] font-semibold text-fg">Acceso denegado</p>
            <p className="text-body text-fg-secondary">No tienes permisos para ver esta sección.</p>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Cabecera */}
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h1 className="text-h1 text-fg">Gestión de Usuarios</h1>
                    <p className="text-body text-fg-secondary mt-1">Administra el personal, roles y zonas asignadas.</p>
                </div>
                <Button iconLeft={<UserPlus size={15} />} onClick={openNew}>Nuevo usuario</Button>
            </div>

            {/* Error global */}
            {globalError && (
                <div className="flex items-start gap-2 bg-danger-soft border border-danger/20 text-danger rounded-lg px-4 py-3 text-[13px]">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    {globalError}
                </div>
            )}

            {/* Tabla */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-fg-secondary">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Cargando usuarios…
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-8">
                        <EmptyState icon={Users} title="No hay usuarios registrados" description="Crea el primer usuario para dar acceso al sistema." action={<Button iconLeft={<UserPlus size={14} />} size="sm" onClick={openNew}>Crear usuario</Button>} />
                    </div>
                ) : (
                    <table className="w-full text-left text-[13px]">
                        <thead className="border-b border-border bg-surface-muted">
                            <tr>
                                <th className="px-5 py-3 font-semibold text-fg-secondary">Usuario</th>
                                <th className="px-5 py-3 font-semibold text-fg-secondary">Rol</th>
                                <th className="px-5 py-3 font-semibold text-fg-secondary">Zona</th>
                                <th className="px-5 py-3 font-semibold text-fg-secondary">Estado</th>
                                <th className="px-5 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map(user => {
                                const nombre = user.nombreCompleto || user.nombre_completo || '';
                                return (
                                    <tr key={user.id} className="hover:bg-surface-muted/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-fg">{nombre}</p>
                                            <p className="text-fg-muted text-[12px]">{user.email}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge tone={rolTone(user.rol ?? '')}>
                                                {ROL_LABELS[user.rol ?? ''] ?? user.rol}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3 text-fg-secondary">
                                            {user.zonaAsignada
                                                ? <span className="flex items-center gap-1.5"><MapPin size={12} className="text-fg-muted" />{user.zonaAsignada}</span>
                                                : <span className="text-fg-muted">—</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            <Badge tone={user.activo ? 'success' : 'neutral'} dot>
                                                {user.activo ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => openEdit(user)} className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-md transition-colors" aria-label={`Editar ${nombre}`}>
                                                    <Edit size={14} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id, nombre)} className="p-1.5 text-fg-muted hover:text-danger hover:bg-danger-soft rounded-md transition-colors" aria-label={`Eliminar ${nombre}`}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-fg/20 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
                    <div className="bg-surface border border-border w-full max-w-lg rounded-lg shadow-[var(--shadow-3)] overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="text-h2 text-fg">{editingUser ? 'Editar usuario' : 'Nuevo usuario'}</h3>
                            <button onClick={closeModal} className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md" aria-label="Cerrar">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            {formError && (
                                <div className="flex items-start gap-2 bg-danger-soft border border-danger/20 text-danger rounded-md px-3 py-2.5 text-[12px]">
                                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {formError}
                                </div>
                            )}

                            <Input
                                label="Nombre completo *"
                                autoFocus
                                error={errors.nombreCompleto?.message}
                                {...register('nombreCompleto', { required: 'El nombre es requerido' })}
                            />
                            <Input
                                label="Correo electrónico *"
                                type="email"
                                error={errors.email?.message}
                                {...register('email', { required: 'El email es requerido' })}
                            />
                            <Input
                                label={editingUser ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                                type="password"
                                placeholder={editingUser ? '••••••••' : ''}
                                {...register('password', { required: !editingUser ? 'La contraseña es requerida' : false })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-caption text-fg-secondary">Rol *</label>
                                    <select {...register('rolId', { required: true, valueAsNumber: true })}
                                        className="w-full bg-surface text-fg text-body px-3 py-2.5 rounded-md border border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)] outline-none transition-shadow">
                                        <option value={1}>Admin Nacional</option>
                                        <option value={2}>Admin Sede</option>
                                        <option value={3}>Coordinador/a</option>
                                        <option value={4}>Educador/a</option>
                                        <option value={5}>Psicólogo/a</option>
                                        <option value={6}>Trabajador/a Social</option>
                                        <option value={7}>Abogado/a</option>
                                    </select>
                                </div>
                                <Input label="Zona asignada" placeholder="Ej: Lima Norte" {...register('zonaAsignada')} />
                            </div>

                            {editingUser && (
                                <label className="flex items-center gap-2 text-caption text-fg-secondary cursor-pointer">
                                    <input type="checkbox" className="w-3.5 h-3.5 accent-primary" id="activo" {...register('activo')} />
                                    <span>Usuario activo</span>
                                </label>
                            )}

                            <div className="pt-2 flex justify-end gap-2">
                                <Button type="button" variant="secondary" onClick={closeModal}>Cancelar</Button>
                                <Button type="submit" loading={isSubmitting}>
                                    {editingUser ? 'Actualizar' : 'Crear usuario'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
