import React, { useState } from 'react';
import { X, AlertTriangle, Search, ShieldCheck, ExternalLink, UserX } from 'lucide-react';
import type { DuplicateCheckResult, DuplicateMatch } from '../types/nna-form.types';

interface DuplicateDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    results: DuplicateCheckResult | null;
}

/**
 * Coincidencias encontradas al registrar un NNA.
 *
 * Cada candidato trae un puntaje de similitud y el motivo por el que aparece.
 * El educador tiene dos salidas claras: abrir el expediente del NNA existente
 * —si es la misma persona, hay que continuar ahí y no crear una ficha nueva— o
 * descartarlo de la lista.
 *
 * El expediente se abre en otra pestaña a propósito: la ficha en curso puede
 * tener media hora de trabajo escrito y navegar la perdería.
 */
export const DuplicateDrawer: React.FC<DuplicateDrawerProps> = ({ isOpen, onClose, results }) => {
    const [descartados, setDescartados] = useState<Set<number>>(new Set());

    if (!isOpen || !results) return null;

    const critico = results.status === 'duplicate';
    const matches: DuplicateMatch[] = (results.matches || []).filter(m => !descartados.has(m.id));

    const nivel = (p: number) =>
        p >= 90 ? { txt: 'text-danger', bg: 'bg-danger-soft', borde: 'border-danger/30', label: 'Muy probable' }
        : p >= 70 ? { txt: 'text-warning', bg: 'bg-warning-soft', borde: 'border-warning/30', label: 'Probable' }
        : { txt: 'text-fg-2', bg: 'bg-surface-muted', borde: 'border-border', label: 'Parecido' };

    const abrirExpediente = (m: DuplicateMatch) => {
        const url = m.carpetaId
            ? `/nna/expediente/${m.carpetaId}?nnaId=${m.id}`
            : `/nna/ficha/${m.id}`;
        window.open(url, '_blank', 'noopener');
    };

    return (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface shadow-2xl z-40 overflow-y-auto animate-slideInRight border-l border-border">
            <div className="p-4 border-b border-border flex items-center justify-between bg-surface-muted sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-primary" />
                    <h2 className="font-bold text-fg text-sm">Coincidencias encontradas</h2>
                </div>
                <button onClick={onClose} className="text-fg-muted hover:text-fg p-1 rounded transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 space-y-3">
                {matches.length > 0 && (
                    <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                        critico ? 'bg-danger-soft border-danger/30' : 'bg-warning-soft border-warning/30'
                    }`}>
                        <AlertTriangle size={16} className={critico ? 'text-danger mt-0.5' : 'text-warning mt-0.5'} />
                        <div>
                            <p className={`text-[13px] font-bold ${critico ? 'text-danger' : 'text-warning'}`}>
                                {results.message}
                            </p>
                            <p className="text-[11px] text-fg-2 mt-1 leading-relaxed">
                                Si alguno es el mismo NNA, abre su expediente y continúa ahí en vez de
                                crear una ficha nueva.
                            </p>
                        </div>
                    </div>
                )}

                {matches.map(m => {
                    const n = nivel(m.puntaje ?? 0);
                    return (
                        <div key={m.id} className={`border rounded-xl p-4 bg-surface shadow-sm space-y-2.5 ${n.borde}`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-[13px] text-fg uppercase leading-tight">
                                    {m.apellidoPaterno} {m.apellidoMaterno}, {m.nombres}
                                </p>
                                {m.puntaje != null && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${n.bg} ${n.txt}`}>
                                        {n.label}
                                    </span>
                                )}
                            </div>

                            {m.motivo && <p className={`text-[11px] font-semibold ${n.txt}`}>{m.motivo}</p>}

                            <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs">
                                <div>
                                    <span className="text-[9px] uppercase text-fg-muted font-bold block">Documento</span>
                                    <span className="text-fg-2 font-semibold">{m.numeroDoc || 'Sin documento'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] uppercase text-fg-muted font-bold block">Nacimiento</span>
                                    <span className="text-fg-2 font-semibold">
                                        {m.fechaNacimiento ? m.fechaNacimiento.split('-').reverse().join('/') : '—'}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[9px] uppercase text-fg-muted font-bold block">Sede</span>
                                    <span className="text-primary bg-primary-soft px-2 py-0.5 rounded inline-block mt-0.5 font-bold text-[11px]">
                                        {m.sede || 'No especificada'}
                                    </span>
                                    {m.codigoFicha03 && (
                                        <span className="text-[10px] text-fg-muted ml-2">{m.codigoFicha03}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => abrirExpediente(m)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-[12px] font-bold hover:bg-primary/90 transition-colors"
                                >
                                    <ExternalLink size={13} /> Es el mismo NNA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDescartados(prev => new Set(prev).add(m.id))}
                                    title="Quitar de la lista: no es la misma persona"
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border text-fg-2 rounded-xl text-[12px] font-semibold hover:bg-surface-muted transition-colors"
                                >
                                    <UserX size={13} /> No es
                                </button>
                            </div>
                        </div>
                    );
                })}

                {matches.length === 0 && (
                    <div className="py-10 text-center">
                        <ShieldCheck size={28} className="text-success mx-auto mb-2" />
                        <p className="text-[13px] text-fg-2">
                            {descartados.size > 0
                                ? 'Descartaste todas las coincidencias. Puedes continuar con el registro.'
                                : 'Sin coincidencias en el sistema nacional.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
