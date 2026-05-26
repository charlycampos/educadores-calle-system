/**
 * SEC · LoginPage rediseñado
 * Reemplaza client/src/features/auth/LoginPage.tsx
 *
 * Cambios vs. versión anterior:
 *   ✗ Emoji 🏛️ como logo                 → ✓ Monograma SecLogo
 *   ✗ Banner azul gradient                → ✓ Fondo sereno con sutil patrón
 *   ✗ Inputs sin label (solo placeholder) → ✓ Labels visibles + autocomplete
 *   ✗ Avatar decorativo SVG               → ✓ Removido (no aporta)
 *   ✗ "¿Necesitas ayuda?" con alert()     → ✓ Email de soporte directo
 *   ✗ Sin "recordarme"                    → ✓ Checkbox de sesión persistente
 *   ✗ Sin "olvidé contraseña"             → ✓ Link explícito
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../store/auth.store';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SecLogo } from '../../components/SecLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

type LoginForm = { email: string; password: string; remember?: boolean };

export const LoginPage = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
    const { login, error, isLoading } = useAuthStore();
    const navigate = useNavigate();
    const [showPass, setShowPass] = useState(false);

    const onSubmit = async (data: LoginForm) => {
        await login(data.email, data.password);
        const { isAuthenticated } = useAuthStore.getState();
        if (isAuthenticated) navigate('/');
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12 relative overflow-hidden">

            {/* Sutil fondo decorativo (no gradiente saturado) */}
            <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden="true"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 20% 30%, color-mix(in oklch, var(--color-primary) 5%, transparent) 0, transparent 40%),
                        radial-gradient(circle at 80% 70%, color-mix(in oklch, var(--color-primary) 3%, transparent) 0, transparent 45%)
                    `,
                }}
            />

            <div className="w-full max-w-[380px] relative">

                {/* Card */}
                <div className="bg-surface border border-border rounded-lg shadow-[var(--shadow-2)] p-8">

                    {/* Brand */}
                    <SecLogo size="md" className="mb-7" />

                    <h1 className="text-[20px] font-semibold tracking-tight text-fg mb-1">Inicia sesión</h1>
                    <p className="text-body text-fg-secondary mb-6">Acceso al sistema de gestión de casos</p>

                    {/* Error global */}
                    {error && (
                        <div className="flex items-start gap-2 bg-danger-soft text-danger border border-danger/20 rounded-md px-3 py-2.5 text-caption mb-4">
                            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        <Input
                            label="Correo institucional"
                            type="email"
                            placeholder="ana.lopez@inabif.gob.pe"
                            autoComplete="email"
                            error={errors.email?.message}
                            {...register('email', { required: 'El correo es requerido' })}
                        />

                        <Input
                            label="Contraseña"
                            type={showPass ? 'text' : 'password'}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            error={errors.password?.message}
                            iconRight={
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="p-1 text-fg-muted hover:text-fg rounded-sm"
                                    tabIndex={-1}
                                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            }
                            {...register('password', { required: 'La contraseña es requerida' })}
                        />

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 text-caption text-fg-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 accent-primary"
                                    {...register('remember')}
                                />
                                Mantener sesión iniciada
                            </label>
                            <button
                                type="button"
                                onClick={() => navigate('/recuperar-clave')}
                                className="text-caption text-primary font-medium hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <Button
                            type="submit"
                            block
                            size="lg"
                            loading={isLoading}
                            iconRight={!isLoading ? <ArrowRight size={16} /> : undefined}
                        >
                            {isLoading ? 'Verificando…' : 'Ingresar'}
                        </Button>
                    </form>

                    {/* Soporte */}
                    <div className="mt-6 pt-5 border-t border-border">
                        <p className="text-caption text-fg-muted leading-relaxed">
                            ¿Problemas para acceder? Contacta a tu Coordinador de Sede o escribe a{' '}
                            <a
                                href="mailto:soporte.sec@inabif.gob.pe"
                                className="text-primary font-medium hover:underline"
                            >
                                soporte.sec@inabif.gob.pe
                            </a>
                        </p>
                    </div>
                </div>

                {/* Legal */}
                <p className="text-center text-[11px] text-fg-muted mt-5">
                    © {new Date().getFullYear()} MIMP · INABIF · DGNNA · Uso exclusivo interno
                </p>
            </div>
        </div>
    );
};
