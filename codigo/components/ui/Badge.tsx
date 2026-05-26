/**
 * SEC · Badge / Status pill
 * Reemplaza los chips de estado dispersos (bg-emerald-50 text-emerald-700, etc).
 */

import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
    tone?: Tone;
    dot?: boolean;
    children: ReactNode;
    className?: string;
}

const TONES: Record<Tone, { bg: string; text: string; dot: string }> = {
    success: { bg: 'bg-success-soft', text: 'text-success', dot: 'bg-success' },
    warning: { bg: 'bg-warning-soft', text: 'text-warning', dot: 'bg-warning' },
    danger:  { bg: 'bg-danger-soft',  text: 'text-danger',  dot: 'bg-danger' },
    info:    { bg: 'bg-info-soft',    text: 'text-info',    dot: 'bg-info' },
    primary: { bg: 'bg-primary-soft', text: 'text-primary', dot: 'bg-primary' },
    neutral: { bg: 'bg-surface-muted border border-border', text: 'text-fg-secondary', dot: 'bg-fg-muted' },
};

export const Badge = ({ tone = 'neutral', dot, children, className }: BadgeProps) => {
    const t = TONES[tone];
    return (
        <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight',
            t.bg, t.text, className
        )}>
            {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', t.dot)} aria-hidden="true" />}
            {children}
        </span>
    );
};
