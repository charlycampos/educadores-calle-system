/**
 * SEC · Input
 * Con label visible (no solo placeholder) — accesibilidad.
 */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, error, iconRight, className, id, ...rest }, ref) => {
        const autoId = useId();
        const inputId = id ?? autoId;

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={inputId} className="text-caption text-fg-secondary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={!!error || undefined}
                        aria-describedby={hint || error ? `${inputId}-desc` : undefined}
                        className={clsx(
                            'w-full bg-surface text-fg text-body px-3 py-2.5 rounded-md',
                            'border outline-none transition-shadow',
                            'placeholder:text-fg-muted',
                            error
                                ? 'border-danger focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-danger)_18%,transparent)]'
                                : 'border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)]',
                            iconRight && 'pr-10',
                            className
                        )}
                        {...rest}
                    />
                    {iconRight && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted">
                            {iconRight}
                        </div>
                    )}
                </div>
                {(hint || error) && (
                    <p id={`${inputId}-desc`} className={clsx('text-[11px]', error ? 'text-danger' : 'text-fg-muted')}>
                        {error ?? hint}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
