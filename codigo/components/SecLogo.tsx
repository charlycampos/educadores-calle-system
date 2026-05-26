/**
 * SEC · Logo institucional
 * Reemplaza el emoji 🏛️ en login, sidebar y header.
 *
 * Uso:
 *   <SecLogo />                        → marca + wordmark completo
 *   <SecLogo variant="mark" />         → solo el monograma 36px
 *   <SecLogo variant="compact" />      → marca + "SEC" (sidebar)
 *   <SecLogo inverse />                → versión sobre fondo de color sólido
 */

import { clsx } from 'clsx';

interface SecLogoProps {
    variant?: 'full' | 'compact' | 'mark';
    size?: 'sm' | 'md' | 'lg';
    inverse?: boolean;
    className?: string;
}

const SIZE_MAP = {
    sm: { box: 'w-7 h-7 rounded-md',  svg: 18, t1: 'text-[12px]', t2: 'text-[10px]' },
    md: { box: 'w-9 h-9 rounded-lg',  svg: 22, t1: 'text-[14px]', t2: 'text-[11px]' },
    lg: { box: 'w-12 h-12 rounded-lg', svg: 30, t1: 'text-[16px]', t2: 'text-[12px]' },
};

export const SecLogo = ({
    variant = 'full',
    size = 'md',
    inverse = false,
    className,
}: SecLogoProps) => {
    const s = SIZE_MAP[size];

    const Mark = (
        <div
            className={clsx(
                'grid place-items-center flex-shrink-0',
                s.box,
                inverse ? 'bg-white/15' : 'bg-primary'
            )}
            aria-hidden="true"
        >
            <svg width={s.svg} height={s.svg} viewBox="0 0 24 24" fill="none">
                <path d="M5 18 Q 12 10, 19 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                <circle cx="5" cy="18" r="2.2" fill="white" />
                <circle cx="19" cy="6" r="2.2" fill="white" />
            </svg>
        </div>
    );

    if (variant === 'mark') {
        return <div className={className}>{Mark}</div>;
    }

    return (
        <div className={clsx('flex items-center gap-3', className)}>
            {Mark}
            <div className="leading-tight flex flex-col">
                {variant === 'compact' ? (
                    <>
                        <span className={clsx('font-semibold tracking-tight', s.t1, inverse ? 'text-white' : 'text-fg')}>SEC</span>
                        <span className={clsx(s.t2, inverse ? 'text-white/70' : 'text-fg-muted')}>Educadores de Calle</span>
                    </>
                ) : (
                    <>
                        <span className={clsx('font-semibold tracking-tight', s.t1, inverse ? 'text-white' : 'text-fg')}>
                            Sistema de Educadores de Calle
                        </span>
                        <span className={clsx(s.t2, inverse ? 'text-white/70' : 'text-fg-muted')}>
                            INABIF · DGNNA · MIMP
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};
