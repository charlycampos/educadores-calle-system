import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';
import { useRef, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Send, Loader2, Building2, UserCircle, CheckCircle2, FileDown } from 'lucide-react';
import { useNnaStore } from '../../../store/nna.store';
import { useAuthStore } from '../../../store/auth.store';
import clsx from 'clsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Formato6Print } from './Formato6Print';

interface DerivacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    nnaId: number;
    casoId: number; // Derivamos un CASO específico
    nnaName: string;
}

interface DerivacionForm {
    tipoDerivacion: 'INTERNA' | 'EXTERNA';
    entidadDestino?: string;
    destinatarioId?: number;
    prioridad: 'NORMAL' | 'URGENTE';
    motivo: string;
    documentoRef?: string;
}

export const DerivacionModal = ({ isOpen, onClose, casoId, nnaName }: DerivacionModalProps) => {
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<DerivacionForm>();
    const { createDerivacion, error, selectedExpediente, registerDocument } = useNnaStore();
    const token = useAuthStore((state) => state.token);
    const nna = selectedExpediente?.[0] || { id: 0, nombres: nnaName, apellidoPaterno: '', apellidoMaterno: '' };

    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [success, setSuccess] = useState(false);
    const [lastData, setLastData] = useState<DerivacionForm | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const tipo = watch('tipoDerivacion', 'INTERNA');

    // Cargar usuarios si es interna
    useEffect(() => {
        if (isOpen && tipo === 'INTERNA') {
            fetch(`${AUTH_API_URL}/usuarios`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setUsers(data))
                .catch(console.error);
        }
    }, [isOpen, tipo, token]);

    const onSubmit = async (data: DerivacionForm) => {
        setIsLoading(true);
        try {
            // 1. Crear registro de derivación en derivacion-service
            //    El backend espera snake_case: caso_id, destinatario_id, entidad_externa, motivo
            await createDerivacion({
                casoId,
                tipoDerivacion: data.tipoDerivacion,
                destinatarioId: data.destinatarioId ? Number(data.destinatarioId) : undefined,
                entidadDestino: data.entidadDestino,
                motivo: data.motivo,
                prioridad: data.prioridad,
                documentoRef: data.documentoRef,
            });

            // 2. Actualizar el caso según el tipo de derivación (lógica del proceso)
            if (data.tipoDerivacion === 'INTERNA' && data.destinatarioId) {
                // Reasignar el caso al nuevo responsable
                await fetch(`${NNA_API_URL}/casos/${casoId}/reasignar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        nuevo_responsable_id: Number(data.destinatarioId),
                        motivo: `Derivación interna: ${data.motivo}`,
                    }),
                });
            } else if (data.tipoDerivacion === 'EXTERNA') {
                // Cambiar estado del caso a DERIVADO
                await fetch(`${NNA_API_URL}/casos/${casoId}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        nuevo_estado: 'DERIVADO',
                        motivo: `Derivación externa a ${data.entidadDestino}: ${data.motivo}`,
                    }),
                });
            }

            // 3. Registrar Documento en Expediente Digital
            registerDocument({
                nnaId: nna.id,
                type: 'FICHA DE DERIVACIÓN (FORMATO 06)',
                code: `DER-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
                date: new Date().toISOString(),
                pages: 1,
                user: 'Usuario Sistema',
                status: 'GENERADO'
            });

            setLastData(data);
            setSuccess(true);
            reset();
            // onClose(); // Se mantiene abierto para descargar PDF
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        const elementId = 'formato-6-print-modal';
        const filename = `F6_Derivacion_${nna.nombres?.replace(/\s+/g, '_')}`;
        const element = document.getElementById(elementId);

        if (!element) {
            alert('Error: No se encontró el formato para imprimir');
            return;
        }

        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '210mm';
            iframe.style.height = '297mm';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el iframe');

            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: white; color: black; font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>${element.outerHTML}</body>
                </html>
            `);
            iframeDoc.close();

            await new Promise(resolve => setTimeout(resolve, 100));

            const iframeElement = iframeDoc.getElementById(elementId);
            if (!iframeElement) throw new Error('Elemento no encontrado en iframe');

            const pdfCanvas = await html2canvas(iframeElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800
            });

            document.body.removeChild(iframe);

            const imgData = pdfCanvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (pdfCanvas.height * pdfWidth) / pdfCanvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (!isOpen) return null;

    if (success && lastData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-surface rounded-[16px] shadow-2xl w-full max-w-md overflow-hidden p-8 text-center">
                    <div className="w-16 h-16 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="text-success" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-fg mb-2">¡Derivación Exitosa!</h3>
                    <p className="text-fg-muted mb-8">El caso ha sido derivado correctamente.</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-fg rounded-[8px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-70"
                        >
                            {isGeneratingPDF ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
                            Descargar Ficha (F6)
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-surface-muted hover:bg-border/40 text-fg-2 rounded-[8px] font-bold transition-all"
                        >
                            Cerrar
                        </button>
                    </div>

                    {/* Componente Oculto para PDF */}
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato6Print nna={nna} data={lastData} id="formato-6-print-modal" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-surface rounded-[16px] shadow-2xl w-full max-w-lg overflow-hidden">

                {/* Header con franja de color */}
                <div className="der-header">
                    <div className="der-header-icon">
                        <Send size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base leading-tight">Nueva Derivación</h3>
                        <p className="text-primary-fg/60 text-xs truncate">{nnaName}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                        <X size={18} className="text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 bg-danger-soft border border-danger/20 text-danger text-xs rounded-[6px]">
                            {error}
                        </div>
                    )}

                    {/* Selector INTERNA / EXTERNA — estilo segmented control */}
                    <div className="der-type-selector">
                        <label className={clsx("der-type-option", tipo === 'INTERNA' && "active")}>
                            <input type="radio" value="INTERNA" {...register('tipoDerivacion')} className="hidden" />
                            <UserCircle size={20} />
                            <span>INTERNA</span>
                        </label>
                        <label className={clsx("der-type-option", tipo === 'EXTERNA' && "active")}>
                            <input type="radio" value="EXTERNA" {...register('tipoDerivacion')} className="hidden" />
                            <Building2 size={20} />
                            <span>EXTERNA</span>
                        </label>
                    </div>

                    {/* Destinatario */}
                    {tipo === 'INTERNA' ? (
                        <div className="der-field animate-fadeIn">
                            <label className="der-label">Destinatario (Equipo)</label>
                            <select {...register('destinatarioId', { required: true })} className="der-input">
                                <option value="">Seleccione un compañero...</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.nombreCompleto} — {u.rol?.nombre ?? u.rol}</option>
                                ))}
                            </select>
                            {errors.destinatarioId && <span className="der-error">Campo requerido</span>}
                        </div>
                    ) : (
                        <div className="der-field animate-fadeIn">
                            <label className="der-label">Entidad Externa</label>
                            <select {...register('entidadDestino', { required: true })} className="der-input">
                                <option value="">Seleccione entidad...</option>
                                <option value="UPE">UPE — Unidad de Protección Especial</option>
                                <option value="DEMUNA">DEMUNA</option>
                                <option value="FISCALIA">Fiscalía de Familia</option>
                                <option value="MINSA">Centro de Salud / Hospital</option>
                                <option value="COMISARIA">Comisaría PNP</option>
                                <option value="CEM">CEM — Centro Emergencia Mujer</option>
                                <option value="CAR">CAR — Centro de Acogida Residencial</option>
                            </select>
                            {errors.entidadDestino && <span className="der-error">Campo requerido</span>}
                        </div>
                    )}

                    {/* Prioridad + Doc. Referencia */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="der-field">
                            <label className="der-label">Prioridad</label>
                            <select {...register('prioridad')} className="der-input">
                                <option value="NORMAL">Normal</option>
                                <option value="URGENTE">🔴 Urgente</option>
                            </select>
                        </div>
                        <div className="der-field">
                            <label className="der-label">Doc. Referencia</label>
                            <input
                                {...register('documentoRef')}
                                className="der-input"
                                placeholder="N° Oficio / Carta"
                            />
                        </div>
                    </div>

                    {/* Motivo */}
                    <div className="der-field">
                        <label className="der-label">
                            Motivo de la Derivación
                            <span className="text-red-400 ml-0.5">*</span>
                        </label>
                        <textarea
                            {...register('motivo', { required: true })}
                            className={clsx("der-input resize-none", errors.motivo && "border-red-300 focus:ring-red-200")}
                            rows={3}
                            placeholder="Describa brevemente por qué se deriva el caso..."
                        />
                        {errors.motivo && <span className="der-error">Detalle el motivo de la derivación</span>}
                    </div>

                    {/* Footer */}
                    <div className="der-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="der-submit-btn"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            Derivar Caso
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .der-header {
                    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .der-header-icon {
                    width: 36px; height: 36px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    color: white; flex-shrink: 0;
                }
                .der-type-selector {
                    display: grid; grid-template-columns: 1fr 1fr;
                    background: #f1f5f9; border-radius: 12px; padding: 4px; gap: 4px;
                }
                .der-type-option {
                    cursor: pointer;
                    border-radius: 9px; padding: 10px 12px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    font-size: 12px; font-weight: 700; letter-spacing: 0.03em;
                    color: #94a3b8; transition: all 0.15s;
                    user-select: none;
                }
                .der-type-option:hover { color: #64748b; }
                .der-type-option.active {
                    background: white;
                    color: #4f46e5;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
                }
                .der-field { display: flex; flex-direction: column; gap: 5px; }
                .der-label {
                    font-size: 11px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.05em;
                    color: #64748b;
                }
                .der-input {
                    width: 100%; padding: 9px 12px;
                    background: #f8fafc; border: 1.5px solid #e2e8f0;
                    border-radius: 9px; font-size: 13px; color: #1e293b;
                    outline: none; transition: all 0.15s;
                    appearance: auto;
                }
                .der-input:focus {
                    background: white;
                    border-color: #818cf8;
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
                }
                .der-error { font-size: 11px; color: #ef4444; }
                .der-footer {
                    display: flex; justify-content: flex-end;
                    align-items: center; gap: 8px;
                    padding-top: 8px;
                    border-top: 1px solid #f1f5f9; margin-top: 4px;
                }
                .der-submit-btn {
                    display: flex; align-items: center; gap-: 6px;
                    gap: 6px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #4f46e5, #6366f1);
                    color: white; border-radius: 9px;
                    font-size: 13px; font-weight: 600;
                    box-shadow: 0 4px 12px rgba(99,102,241,0.3);
                    transition: all 0.15s;
                    cursor: pointer;
                }
                .der-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.35); }
                .der-submit-btn:active { transform: scale(0.98); }
                .der-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.97) translateY(4px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </div>
    );
};
