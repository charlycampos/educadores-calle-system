/**
 * SEC · EmptyState
 * Reemplaza los "Cargando datos..." y "No hay beneficiarios registrados"
 * sueltos en gris claro centrado.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
    <div className="border border-dashed border-border-strong rounded-lg p-9 text-center bg-surface-muted">
        {Icon && (
            <div className="w-10 h-10 rounded-md bg-surface border border-border grid place-items-center mx-auto mb-3 text-fg-muted">
                <Icon size={20} />
            </div>
        )}
        <div className="text-body font-semibold text-fg">{title}</div>
        {description && <p className="text-caption text-fg-secondary mt-1 mb-4 max-w-md mx-auto">{description}</p>}
        {action && <div className="flex justify-center">{action}</div>}
    </div>
);
