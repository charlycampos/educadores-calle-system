/**
 * Aviso que aparece al registrar un integrante de la familia, en la ficha de
 * inscripción o en el diagnóstico social.
 *
 * Dos situaciones:
 *
 *   1. El hermano YA está registrado como NNA → se ofrece vincularlo, con el
 *      motivo de la sugerencia a la vista para que el educador decida.
 *   2. Se registró un hermano/a que NO existe en el sistema → se avisa que
 *      necesita su propia ficha. Sin registro no tiene caso, y el informe
 *      situacional habla de los hermanos con sus respectivos casos.
 *
 * El sistema nunca vincula solo: siempre confirma el educador.
 */
import { useState } from 'react';
import { Users, UserPlus, AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { vincularHermano } from '../../../api/hermanos.api';
import type { DeteccionHermanos, HermanoCandidato } from '../../../api/hermanos.api';

interface AvisoHermanosProps {
    nnaId: number;
    deteccion: DeteccionHermanos;
    onCerrar: () => void;
    /** Para llevar al educador a registrar al hermano que falta. */
    onRegistrarHermano?: (nombre: string) => void;
}

export const AvisoHermanos = ({ nnaId, deteccion, onCerrar, onRegistrarHermano }: AvisoHermanosProps) => {
    const [procesando, setProcesando] = useState<number | null>(null);
    const [resueltos, setResueltos] = useState<Record<number, 'si' | 'no'>>({});
    const [error, setError] = useState<string | null>(null);

    const responder = async (c: HermanoCandidato, esHermano: boolean) => {
        setProcesando(c.nnaId);
        setError(null);
        try {
            await vincularHermano(nnaId, c.nnaId, c.origen, esHermano);
            setResueltos(prev => ({ ...prev, [c.nnaId]: esHermano ? 'si' : 'no' }));
        } catch (e: any) {
            setError(e.message || 'No se pudo guardar la respuesta');
        } finally {
            setProcesando(null);
        }
    };

    const pendientes = deteccion.candidatos.filter(c => !resueltos[c.nnaId]);
    const nombreCompleto = (c: HermanoCandidato) =>
        `${c.apellidoPaterno || ''} ${c.apellidoMaterno || ''}, ${c.nombres}`.trim();

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-surface-muted/50">
                    <div className="p-2 rounded-full bg-primary-soft">
                        <Users size={18} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[15px] text-fg">
                            {deteccion.requiereRegistro ? 'Hermano sin registrar' : 'Posibles hermanos'}
                        </h3>
                        <p className="text-[12px] text-fg-muted">
                            {deteccion.requiereRegistro
                                ? 'El informe situacional los menciona con sus respectivos casos'
                                : 'Confirma si son hermanos para el informe situacional'}
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* Caso 2: el hermano existe pero no está en el sistema */}
                    {deteccion.requiereRegistro && (
                        <div className="rounded-xl border border-warning/30 bg-warning-soft/50 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={18} className="text-warning flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-fg">
                                        {deteccion.nombreHermano} no tiene ficha en el servicio
                                    </p>
                                    <p className="text-[12px] text-fg-2 mt-1 leading-relaxed">
                                        Para incluirlo en el informe necesita su propia ficha de
                                        inscripción: el informe habla de cada hermano con su caso.
                                        Puedes registrarlo ahora o más adelante, cuando lo ubiques.
                                    </p>
                                </div>
                            </div>
                            {onRegistrarHermano && (
                                <button
                                    type="button"
                                    onClick={() => onRegistrarHermano(deteccion.nombreHermano || '')}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-warning text-white rounded-xl text-[12px] font-bold hover:bg-warning/90 transition-colors"
                                >
                                    <UserPlus size={14} />
                                    Registrar a {deteccion.nombreHermano}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Caso 1: candidatos ya registrados */}
                    {pendientes.map(c => (
                        <div key={c.nnaId} className="rounded-xl border border-border p-4">
                            <p className="text-[13px] font-bold text-fg">{nombreCompleto(c)}</p>
                            <p className="text-[11px] text-fg-muted mt-0.5">
                                {c.numeroDoc ? `DNI ${c.numeroDoc}` : 'Sin documento'}
                                {c.codigoFicha03 ? ` · ${c.codigoFicha03}` : ''}
                            </p>
                            <p className="text-[12px] text-primary mt-2">{c.motivo}</p>

                            <div className="flex gap-2 mt-3">
                                <button
                                    type="button"
                                    onClick={() => responder(c, true)}
                                    disabled={procesando === c.nnaId}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-[12px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {procesando === c.nnaId
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <Check size={13} />}
                                    Sí, son hermanos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => responder(c, false)}
                                    disabled={procesando === c.nnaId}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-border text-fg rounded-xl text-[12px] font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
                                >
                                    <X size={13} /> No
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Ya respondidos en esta sesión */}
                    {deteccion.candidatos.filter(c => resueltos[c.nnaId]).map(c => (
                        <div key={c.nnaId} className="flex items-center gap-2 text-[12px] px-1">
                            {resueltos[c.nnaId] === 'si'
                                ? <><Check size={14} className="text-success" /><span className="text-success">{nombreCompleto(c)} vinculado como hermano</span></>
                                : <><X size={14} className="text-fg-muted" /><span className="text-fg-muted">{nombreCompleto(c)} descartado</span></>}
                        </div>
                    ))}

                    {error && (
                        <p className="text-[12px] text-danger flex items-center gap-1.5">
                            <AlertCircle size={13} /> {error}
                        </p>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-border bg-surface-muted/50 flex justify-end">
                    <button
                        type="button"
                        onClick={onCerrar}
                        className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-[13px] hover:bg-primary/90 transition-colors"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};
