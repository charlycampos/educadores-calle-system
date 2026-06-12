import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

// ── Sistema de notificaciones global ─────────────────────────────────────────
// Uso: import { toast } from '.../components/ui/Toast';
//      toast.success('Informe guardado');  toast.error('No se pudo guardar');
// <ToastContainer /> se monta una sola vez en App.tsx.

export type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; message: string; }

let _listener: ((items: ToastItem[]) => void) | null = null;
let _items: ToastItem[] = [];
let _nextId = 1;

function push(type: ToastType, message: string, durationMs = 4000) {
    const item: ToastItem = { id: _nextId++, type, message };
    _items = [..._items, item];
    _listener?.(_items);
    setTimeout(() => dismiss(item.id), durationMs);
}

function dismiss(id: number) {
    _items = _items.filter(t => t.id !== id);
    _listener?.(_items);
}

export const toast = {
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg, 6000),
    info: (msg: string) => push('info', msg),
};

const STYLES: Record<ToastType, { box: string; icon: React.ReactNode }> = {
    success: { box: 'bg-green-50 border-green-300 text-green-800', icon: <CheckCircle size={17} className="text-green-600 flex-shrink-0" /> },
    error:   { box: 'bg-red-50 border-red-300 text-red-800',       icon: <AlertCircle size={17} className="text-red-600 flex-shrink-0" /> },
    info:    { box: 'bg-blue-50 border-blue-300 text-blue-800',    icon: <AlertCircle size={17} className="text-blue-600 flex-shrink-0" /> },
};

export function ToastContainer() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        _listener = setItems;
        return () => { _listener = null; };
    }, []);

    if (!items.length) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
            {items.map(t => (
                <div key={t.id}
                    className={`flex items-start gap-2.5 border rounded-xl shadow-lg px-4 py-3 text-[13px] font-medium animate-[slideIn_.2s_ease-out] ${STYLES[t.type].box}`}
                    style={{ minWidth: 260 }}>
                    {STYLES[t.type].icon}
                    <span className="flex-1 leading-snug">{t.message}</span>
                    <button onClick={() => dismiss(t.id)} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <X size={14} />
                    </button>
                </div>
            ))}
            <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
        </div>
    );
}
