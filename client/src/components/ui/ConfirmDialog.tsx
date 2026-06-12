import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// ── Confirmación global basada en promesas ───────────────────────────────────
// Uso:  import { confirmar } from '.../components/ui/ConfirmDialog';
//       if (!(await confirmar('¿Eliminar este registro?'))) return;
// Opciones: confirmar('Mensaje', { titulo, textoConfirmar, peligro })
// <ConfirmDialogContainer /> se monta una sola vez en App.tsx.

export interface ConfirmOptions {
    titulo?: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    /** true = botón rojo (acciones destructivas) */
    peligro?: boolean;
}

interface PendingConfirm {
    message: string;
    options: ConfirmOptions;
    resolve: (ok: boolean) => void;
}

let _setPending: ((p: PendingConfirm | null) => void) | null = null;

export function confirmar(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    return new Promise(resolve => {
        if (_setPending) {
            _setPending({ message, options, resolve });
        } else {
            // Fallback si el contenedor no está montado
            resolve(window.confirm(message));
        }
    });
}

export function ConfirmDialogContainer() {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    useEffect(() => {
        _setPending = setPending;
        return () => { _setPending = null; };
    }, []);

    if (!pending) return null;

    const { message, options, resolve } = pending;
    const responder = (ok: boolean) => { setPending(null); resolve(ok); };

    return (
        <div className="fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4"
            onClick={() => responder(false)}>
            <div className="bg-surface rounded-xl w-full max-w-sm shadow-[var(--shadow-3)] overflow-hidden"
                onClick={e => e.stopPropagation()}>
                <div className="px-5 pt-5 pb-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${options.peligro ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
                        <AlertTriangle size={18} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-fg">
                            {options.titulo || 'Confirmar acción'}
                        </h3>
                        <p className="text-[13px] text-fg-secondary mt-1 leading-snug">{message}</p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-surface-muted/40 border-t border-border">
                    <button onClick={() => responder(false)} autoFocus
                        className="text-[13px] font-medium text-fg-muted hover:text-fg px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors">
                        {options.textoCancelar || 'Cancelar'}
                    </button>
                    <button onClick={() => responder(true)}
                        className={`text-[13px] font-bold text-white px-4 py-2 rounded-lg active:scale-95 transition-all ${options.peligro ? 'bg-danger hover:opacity-90' : 'bg-primary hover:bg-primary-hover'}`}>
                        {options.textoConfirmar || 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
