/**
 * SEC · Button
 * Reemplaza todos los <button className="bg-blue-600 ..."> dispersos.
 *
 * Variantes:
 *   primary    → acción principal de la pantalla
 *   secondary  → acción alternativa
 *   ghost      → acción terciaria (sin contorno)
 *   danger     → acción destructiva
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    block?: boolean;
}

const BASE =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2';

const VARIANTS: Record<Variant, string> = {
    primary:   'bg-primary text-primary-fg hover:bg-primary-hover focus-visible:outline-primary',
    secondary: 'bg-surface text-fg border border-border-strong hover:bg-surface-muted focus-visible:outline-primary',
    ghost:     'bg-transparent text-fg-secondary hover:bg-surface-muted hover:text-fg focus-visible:outline-primary',
    danger:    'bg-danger text-white hover:opacity-90 focus-visible:outline-danger',
};

const SIZES: Record<Size, string> = {
    sm: 'text-[12px] px-2.5 py-1.5 h-7',
    md: 'text-[13px] px-3.5 py-2 h-9',
    lg: 'text-[14px] px-4 py-2.5 h-11',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, iconLeft, iconRight, block, className, children, disabled, ...rest }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={clsx(BASE, VARIANTS[variant], SIZES[size], block && 'w-full', className)}
                {...rest}
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : iconLeft}
                {children}
                {!loading && iconRight}
            </button>
        );
    }
);
Button.displayName = 'Button';
