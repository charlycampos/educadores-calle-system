/**
 * SEC · FormFields rediseñado
 * - Tokens consolidados (sin gray-50, blue-600, rounded-xl, shadow-blue-200)
 * - InputField: labels visibles y accesibles
 * - SectionHeader: tipografía del sistema
 * - FooterButtons: sin shadow coloreada
 */

import React, { useId } from 'react';
import { clsx } from 'clsx';
import type { UseFormRegisterReturn, FieldError } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';

/* ─── InputField ─────────────────────────────────────────────── */
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    register?: UseFormRegisterReturn;
    error?: FieldError;
    icon?: React.ReactNode;
}

export const InputField = ({ label, register, error, icon, className, ...props }: InputFieldProps) => {
    const autoId = useId();
    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={autoId} className="text-caption text-fg-secondary block mb-1.5">
                    {label}{props.required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    id={autoId}
                    {...register}
                    {...props}
                    aria-invalid={!!error || undefined}
                    className={clsx(
                        'w-full bg-surface text-fg text-body px-3 py-2.5 rounded-md border outline-none transition-shadow placeholder:text-fg-muted',
                        'focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)]',
                        'disabled:opacity-50 disabled:bg-surface-muted',
                        icon ? 'pl-9' : '',
                        error
                            ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-danger)_18%,transparent)]'
                            : 'border-border-strong hover:border-primary/40'
                    )}
                />
            </div>
            {error && (
                <p className="text-danger text-[11px] font-medium mt-1">{error.message}</p>
            )}
        </div>
    );
};

/* ─── SelectField ────────────────────────────────────────────── */
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    register?: UseFormRegisterReturn;
    error?: FieldError;
    options?: { value: string; label: string }[];
    children?: React.ReactNode;
}

export const SelectField = ({ label, register, error, options, children, className, ...props }: SelectFieldProps) => {
    const autoId = useId();
    return (
        <div className={clsx('w-full', className)}>
            {label && (
                <label htmlFor={autoId} className="text-caption text-fg-secondary block mb-1.5">
                    {label}{props.required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
                </label>
            )}
            <div className="relative">
                <select
                    id={autoId}
                    {...register}
                    {...props}
                    aria-invalid={!!error || undefined}
                    className={clsx(
                        'w-full px-3 py-2.5 bg-surface text-fg text-body border rounded-md outline-none appearance-none cursor-pointer transition-shadow',
                        'focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)]',
                        error
                            ? 'border-danger'
                            : 'border-border-strong hover:border-primary/40'
                    )}
                >
                    <option value="">Seleccionar…</option>
                    {options
                        ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                        : children
                    }
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-fg-muted">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                </div>
            </div>
            {error && <p className="text-danger text-[11px] font-medium mt-1">{error.message}</p>}
        </div>
    );
};

/* ─── SectionHeader ──────────────────────────────────────────── */
interface SectionHeaderProps { title: string; subtitle?: string; }

export const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
    <div className="mb-6 pb-3 border-b border-border">
        <h2 className="text-h2 text-fg">{title}</h2>
        {subtitle && <p className="text-caption text-fg-secondary mt-0.5">{subtitle}</p>}
    </div>
);

/* ─── FooterButtons ──────────────────────────────────────────── */
interface FooterButtonsProps {
    onBack?: () => void;
    onNext?: () => void;
    onSave?: () => void;
    loading?: boolean;
    nextLabel?: string;
    submitLabel?: string;
}

export const FooterButtons = ({
    onBack, onNext, onSave,
    loading = false,
    nextLabel = 'Siguiente',
    submitLabel = 'Guardar',
}: FooterButtonsProps) => (
    <div className="flex items-center justify-between pt-4 border-t border-border mt-4 bg-surface sticky bottom-0 z-10 px-6 py-4">
        {onBack ? (
            <button
                type="button"
                onClick={onBack}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-fg-secondary hover:bg-surface-muted hover:text-fg rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
            >
                <ArrowLeft size={15} /> Atrás
            </button>
        ) : <div />}

        <div className="flex gap-3">
            {onNext && (
                <button
                    type="button"
                    onClick={onNext}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-fg text-surface rounded-md text-[13px] font-medium hover:bg-fg/90 transition-colors disabled:opacity-50"
                >
                    {nextLabel} <ArrowRight size={15} />
                </button>
            )}
            {onSave && (
                <button
                    type="submit"
                    onClick={onSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-primary-fg rounded-md text-[13px] font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {loading ? 'Guardando…' : submitLabel}
                </button>
            )}
        </div>
    </div>
);
