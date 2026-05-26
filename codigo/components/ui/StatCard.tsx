/**
 * SEC · StatCard
 * UN SOLO StatCard para reemplazar las 2+ versiones que viven en
 * EducadorDashboard.tsx y AdminSedeDashboard.tsx.
 */

import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
    label: string;
    value: number | string;
    icon?: LucideIcon;
    /** Cambio respecto al periodo anterior — positivo verde, negativo rojo */
    delta?: { value: string; direction: 'up' | 'down' | 'flat' };
    sub?: string;
    /** Resaltar como métrica clave */
    highlight?: boolean;
    className?: string;
}

export const StatCard = ({ label, value, icon: Icon, delta, sub, highlight, className }: StatCardProps) => (
    <div
        className={clsx(
            'bg-surface border rounded-lg p-4 flex flex-col gap-1.5',
            highlight ? 'border-primary/40 ring-2 ring-primary-soft' : 'border-border',
            className
        )}
    >
        <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-fg-secondary">{label}</span>
            {Icon && <Icon size={14} className="text-fg-muted" aria-hidden="true" />}
        </div>
        <div className="text-display text-fg leading-none mt-1">
            {typeof value === 'number' ? value.toLocaleString('es-PE') : value}
        </div>
        {delta && (
            <div className={clsx(
                'text-[11px] flex items-center gap-1',
                delta.direction === 'up' && 'text-success',
                delta.direction === 'down' && 'text-danger',
                delta.direction === 'flat' && 'text-fg-muted'
            )}>
                <span aria-hidden="true">
                    {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '·'}
                </span>
                {delta.value}
            </div>
        )}
        {sub && !delta && <div className="text-[11px] text-fg-muted">{sub}</div>}
    </div>
);
