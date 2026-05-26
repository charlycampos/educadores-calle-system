/**
 * SEC · Card
 * Reemplaza los <div className="bg-white rounded-2xl shadow-sm border ..."> dispersos.
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    elevation?: 0 | 1 | 2;   // 0 = solo borde, 1 = sombra suave, 2 = sombra fuerte (modal)
    padded?: boolean;
}

export const Card = ({ children, elevation = 1, padded = true, className, ...rest }: CardProps) => (
    <div
        className={clsx(
            'bg-surface border border-border rounded-lg',
            elevation === 1 && 'shadow-[var(--shadow-1)]',
            elevation === 2 && 'shadow-[var(--shadow-2)]',
            padded && 'p-5',
            className
        )}
        {...rest}
    >
        {children}
    </div>
);

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
}

export const CardHeader = ({ title, subtitle, action }: CardHeaderProps) => (
    <div className="flex items-start justify-between gap-3 mb-4">
        <div>
            <h3 className="text-h2 text-fg">{title}</h3>
            {subtitle && <p className="text-caption text-fg-secondary mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
    </div>
);
