import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Printer, RefreshCw, FileSignature, AlertCircle, Camera } from 'lucide-react';
import { useNnaStore } from '../../../store/nna.store';
import { useAuthStore } from '../../../store/auth.store';
import { toast } from '../../../components/ui/Toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface CompromisoModalProps {
    isOpen: boolean;
    onClose: () => void;
    nna: any; // Complete NNA data
}

export const CompromisoModal = ({ isOpen, onClose, nna }: CompromisoModalProps) => {
    const { uploadPhysicalDocument, fetchExpediente } = useNnaStore();
    const currentUser = useAuthStore((state) => state.user);

    // Form inputs state (editable in case it is blank)
    const [tutorName, setTutorName] = useState('');
    const [tutorDni, setTutorDni] = useState('');
    const [educadorName, setEducadorName] = useState('');
    const [educadorDni, setEducadorDni] = useState('');

    // Canvas references for drawing signatures and fingerprints
    const canvasNnaRef = useRef<HTMLCanvasElement | null>(null);
    const canvasNnaHuellaRef = useRef<HTMLCanvasElement | null>(null);
    const canvasTutorRef = useRef<HTMLCanvasElement | null>(null);
    const canvasTutorHuellaRef = useRef<HTMLCanvasElement | null>(null);
    const canvasEducadorRef = useRef<HTMLCanvasElement | null>(null);

    // Drawing state variables
    const [isDrawingNna, setIsDrawingNna] = useState(false);
    const [isDrawingNnaHuella, setIsDrawingNnaHuella] = useState(false);
    const [isDrawingTutor, setIsDrawingTutor] = useState(false);
    const [isDrawingTutorHuella, setIsDrawingTutorHuella] = useState(false);
    const [isDrawingEducador, setIsDrawingEducador] = useState(false);

    // Actions state
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'digital' | 'fisico'>('digital');

    // Initialize pre-filled data
    useEffect(() => {
        if (isOpen && nna) {
            setTutorName(nna.nombreTutor || '');
            setTutorDni(nna.nroDocTutApo || nna.dniTutor || '');
            setEducadorName(currentUser?.nombreCompleto || currentUser?.nombre || '');
            setEducadorDni('');
            setUploadFile(null);
            
            // Clear canvases after opening
            setTimeout(() => {
                clearCanvas(canvasNnaRef.current, true);
                clearCanvas(canvasNnaHuellaRef.current, false);
                clearCanvas(canvasTutorRef.current, true);
                clearCanvas(canvasTutorHuellaRef.current, false);
                clearCanvas(canvasEducadorRef.current, true);
            }, 100);
        }
    }, [isOpen, nna, currentUser]);

    if (!isOpen || !nna) return null;

    const nnaName = `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno || ''}`.trim();
    const nnaDni = nna.numeroDoc || '---';
    const casoActivo = nna.casos?.find((caso: any) => caso.estado !== 'CERRADO') || nna.casos?.[0];

    // Canvas helper functions
    const clearCanvas = (canvas: HTMLCanvasElement | null, drawLine: boolean) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (drawLine) {
            // Draw helper line for signatures
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(10, canvas.height - 20);
            ctx.lineTo(canvas.width - 10, canvas.height - 20);
            ctx.stroke();
        } else {
            // Fill fingerprint helper hint text or background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        }
    };

    const getCoordinates = (e: any, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        
        // Handle touch events or mouse events
        const isTouch = e.touches && e.touches.length > 0;
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        // Account for CSS styling scale changes (e.g. w-full)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e: any, canvas: HTMLCanvasElement, setDrawing: (val: boolean) => void) => {
        e.preventDefault();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setDrawing(true);
        const { x, y } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = '#0f172a'; // Sleek dark ink
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const draw = (e: any, canvas: HTMLCanvasElement, isDrawing: boolean) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoordinates(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (setDrawing: (val: boolean) => void) => {
        setDrawing(false);
    };

    const handleFingerprintUpload = (e: React.ChangeEvent<HTMLInputElement>, canvas: HTMLCanvasElement | null) => {
        const file = e.target.files?.[0];
        if (!file || !canvas) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Clear and draw the image to fit the canvas layout
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Subir archivo escaneado (físico)
    const handleUploadEscaneado = async () => {
        if (!uploadFile) {
            toast.error('Por favor, selecciona un archivo firmado.');
            return;
        }
        setIsSaving(true);
        try {
            await uploadPhysicalDocument(nna.id, uploadFile, 'COMPROMISO DEL NNA Y/O APODERADO (FORMATO 09)', casoActivo?.id);
            toast.success('Documento de compromiso físico subido y foliado exitosamente.');
            await fetchExpediente(nna.id);
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error al subir el documento escaneado.');
        } finally {
            setIsSaving(false);
        }
    };

    // Descargar PDF Prefirmado (para impresión) o Digital con firmas
    const handleDownloadPDF = async (onlyPrefilled: boolean) => {
        setIsGenerating(true);
        const printElement = document.getElementById('compromiso-pdf-print-container');
        if (!printElement) {
            toast.error('Error al generar la vista de impresión.');
            setIsGenerating(false);
            return;
        }

        try {
            // Configurar imágenes de firma/huella en el DOM oculto temporalmente
            const domNnaFirma = document.getElementById('print-nna-firma') as HTMLImageElement;
            const domNnaHuella = document.getElementById('print-nna-huella') as HTMLImageElement;
            const domTutorFirma = document.getElementById('print-tutor-firma') as HTMLImageElement;
            const domTutorHuella = document.getElementById('print-tutor-huella') as HTMLImageElement;
            const domEducadorFirma = document.getElementById('print-educador-firma') as HTMLImageElement;

            const transparentGif = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            if (!onlyPrefilled) {
                domNnaFirma.src = canvasNnaRef.current ? canvasNnaRef.current.toDataURL() : transparentGif;
                domNnaHuella.src = canvasNnaHuellaRef.current ? canvasNnaHuellaRef.current.toDataURL() : transparentGif;
                domTutorFirma.src = canvasTutorRef.current ? canvasTutorRef.current.toDataURL() : transparentGif;
                domTutorHuella.src = canvasTutorHuellaRef.current ? canvasTutorHuellaRef.current.toDataURL() : transparentGif;
                domEducadorFirma.src = canvasEducadorRef.current ? canvasEducadorRef.current.toDataURL() : transparentGif;
            } else {
                domNnaFirma.src = transparentGif;
                domNnaHuella.src = transparentGif;
                domTutorFirma.src = transparentGif;
                domTutorHuella.src = transparentGif;
                domEducadorFirma.src = transparentGif;
            }

            await new Promise(resolve => setTimeout(resolve, 300)); // wait for images to load

            const pdfCanvas = await html2canvas(printElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800,
                onclone: (clonedDoc) => {
                    // Remove all stylesheets from the clone — the PDF container uses only inline styles
                    clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
                }
            });

            const imgData = pdfCanvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (pdfCanvas.height * pdfWidth) / pdfCanvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            
            if (onlyPrefilled) {
                pdf.save(`Formato_09_Compromiso_Imprimir_${nna.nombres.replace(/\s+/g, '_')}.pdf`);
            } else {
                // Save it and also convert to file to upload
                const pdfBlob = pdf.output('blob');
                const pdfFile = new File([pdfBlob], `F09_Compromiso_Digital_${nna.nombres.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
                
                await uploadPhysicalDocument(nna.id, pdfFile, 'COMPROMISO DEL NNA Y/O APODERADO (FORMATO 09)', casoActivo?.id);
                toast.success('Compromiso digital guardado y foliado en el expediente.');
                await fetchExpediente(nna.id);
                onClose();
            }
        } catch (err) {
            console.error('Error generando PDF de compromiso:', err);
            toast.error('Error al generar o guardar el PDF de compromiso.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-surface rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-muted/30">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary-soft text-primary rounded-lg">
                            <FileSignature size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-fg">Compromiso del NNA y/o Apoderado</h3>
                            <p className="text-[11px] text-fg-muted">Formato Oficial F03 / Formato 09 de Compromiso del NNA y Apoderado</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-fg-muted hover:bg-surface-muted hover:text-fg rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 space-y-6">

                    {/* Signature Method Selection */}
                    <div className="flex bg-surface-muted/50 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setActiveTab('digital')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'digital' 
                                ? 'bg-surface text-primary shadow-sm border border-border/50' 
                                : 'text-fg-secondary hover:text-fg'
                            }`}
                        >
                            <FileSignature size={18} /> Firma Táctil (Digital)
                        </button>
                        <button
                            onClick={() => setActiveTab('fisico')}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'fisico' 
                                ? 'bg-surface text-primary shadow-sm border border-border/50' 
                                : 'text-fg-secondary hover:text-fg'
                            }`}
                        >
                            <Printer size={18} /> Proceso Físico (Manual)
                        </button>
                    </div>

                    {/* Section 2: Interactive Signatures & Fingerprints (Huelleros) */}
                    {activeTab === 'digital' && (
                        <div className="space-y-4 animate-fadeIn">
                            <h4 className="font-bold text-xs text-fg uppercase tracking-widest border-b border-border pb-2">Firmas y Huellas Digitales Directas (Pantalla Táctil)</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* NNA Block */}
                                <div className="border border-border rounded-xl p-4 flex flex-col items-center bg-surface relative w-full">
                                    <span className="absolute top-2 left-2 bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">1. NNA</span>
                                    <div className="text-[12px] font-bold text-fg text-center mt-3 mb-1 truncate w-full">{nnaName}</div>
                                    <div className="text-[10px] text-fg-muted mb-3">DNI: {nnaDni}</div>

                                    {/* Signature Canvas */}
                                    <div className="w-full bg-surface-muted/50 border border-dashed border-border rounded-lg overflow-hidden h-28 relative">
                                        <canvas 
                                            ref={canvasNnaRef} 
                                            width={280} 
                                            height={112}
                                            onMouseDown={(e) => startDrawing(e, canvasNnaRef.current!, setIsDrawingNna)}
                                            onMouseMove={(e) => draw(e, canvasNnaRef.current!, isDrawingNna)}
                                            onMouseUp={() => stopDrawing(setIsDrawingNna)}
                                            onMouseLeave={() => stopDrawing(setIsDrawingNna)}
                                            onTouchStart={(e) => startDrawing(e, canvasNnaRef.current!, setIsDrawingNna)}
                                            onTouchMove={(e) => draw(e, canvasNnaRef.current!, isDrawingNna)}
                                            onTouchEnd={() => stopDrawing(setIsDrawingNna)}
                                            className="w-full h-full cursor-crosshair touch-none"
                                        />
                                        <button 
                                            onClick={() => clearCanvas(canvasNnaRef.current, true)}
                                            className="absolute bottom-1 right-1 p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <RefreshCw size={9} /> Limpiar
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-fg-muted font-bold mt-1 mb-4">Firma Digital del NNA</div>

                                    {/* Fingerprint Canvas (Huellero de Celular) */}
                                    <div className="w-24 h-28 bg-surface-muted/50 border border-dashed border-border rounded-lg overflow-hidden relative">
                                        <canvas 
                                            ref={canvasNnaHuellaRef} 
                                            width={96} 
                                            height={112}
                                            className="w-full h-full cursor-default touch-none"
                                        />
                                        <div className="absolute bottom-1 right-1 flex gap-1">
                                            <label className="p-1 bg-surface border border-border hover:bg-primary-soft hover:text-primary rounded-md text-[8px] font-bold flex items-center cursor-pointer transition-colors" title="Subir foto de huella">
                                                <Camera size={8} />
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    capture="environment" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFingerprintUpload(e, canvasNnaHuellaRef.current)} 
                                                />
                                            </label>
                                            <button 
                                                onClick={() => clearCanvas(canvasNnaHuellaRef.current, false)}
                                                className="p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-md text-[8px] font-bold flex items-center transition-colors"
                                            >
                                                <RefreshCw size={8} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-fg-muted font-bold mt-1">Huellero NNA</div>
                                </div>

                                {/* Tutor Block */}
                                <div className="border border-border rounded-xl p-4 flex flex-col items-center bg-surface relative w-full">
                                    <span className="absolute top-2 left-2 bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">2. Tutor/a</span>
                                    <div className="text-[12px] font-bold text-fg text-center mt-3 mb-1 truncate w-full">{tutorName || '(No asignado)'}</div>
                                    <div className="text-[10px] text-fg-muted mb-3">DNI: {tutorDni || '---'}</div>

                                    {/* Signature Canvas */}
                                    <div className="w-full bg-surface-muted/50 border border-dashed border-border rounded-lg overflow-hidden h-28 relative">
                                        <canvas 
                                            ref={canvasTutorRef} 
                                            width={280} 
                                            height={112}
                                            onMouseDown={(e) => startDrawing(e, canvasTutorRef.current!, setIsDrawingTutor)}
                                            onMouseMove={(e) => draw(e, canvasTutorRef.current!, isDrawingTutor)}
                                            onMouseUp={() => stopDrawing(setIsDrawingTutor)}
                                            onMouseLeave={() => stopDrawing(setIsDrawingTutor)}
                                            onTouchStart={(e) => startDrawing(e, canvasTutorRef.current!, setIsDrawingTutor)}
                                            onTouchMove={(e) => draw(e, canvasTutorRef.current!, isDrawingTutor)}
                                            onTouchEnd={() => stopDrawing(setIsDrawingTutor)}
                                            className="w-full h-full cursor-crosshair touch-none"
                                        />
                                        <button 
                                            onClick={() => clearCanvas(canvasTutorRef.current, true)}
                                            className="absolute bottom-1 right-1 p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <RefreshCw size={9} /> Limpiar
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-fg-muted font-bold mt-1 mb-4">Firma Digital del Tutor</div>

                                    {/* Fingerprint Canvas (Huellero de Celular) */}
                                    <div className="w-24 h-28 bg-surface-muted/50 border border-dashed border-border rounded-lg overflow-hidden relative">
                                        <canvas 
                                            ref={canvasTutorHuellaRef} 
                                            width={96} 
                                            height={112}
                                            className="w-full h-full cursor-default touch-none"
                                        />
                                        <div className="absolute bottom-1 right-1 flex gap-1">
                                            <label className="p-1 bg-surface border border-border hover:bg-primary-soft hover:text-primary rounded-md text-[8px] font-bold flex items-center cursor-pointer transition-colors" title="Subir foto de huella">
                                                <Camera size={8} />
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    capture="environment" 
                                                    className="hidden" 
                                                    onChange={(e) => handleFingerprintUpload(e, canvasTutorHuellaRef.current)} 
                                                />
                                            </label>
                                            <button 
                                                onClick={() => clearCanvas(canvasTutorHuellaRef.current, false)}
                                                className="p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-md text-[8px] font-bold flex items-center transition-colors"
                                            >
                                                <RefreshCw size={8} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-fg-muted font-bold mt-1">Huellero Tutor</div>
                                </div>

                                {/* Educador/a Block */}
                                <div className="border border-border rounded-xl p-4 flex flex-col items-center bg-surface relative w-full">
                                    <span className="absolute top-2 left-2 bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">3. Educador/a</span>
                                    <div className="text-[12px] font-bold text-fg text-center mt-3 mb-1 truncate w-full">{educadorName}</div>
                                    <div className="text-[10px] text-fg-muted mb-3">DNI: {educadorDni || '---'}</div>

                                    {/* Signature Canvas */}
                                    <div className="w-full bg-surface-muted/50 border border-dashed border-border rounded-lg overflow-hidden h-28 relative">
                                        <canvas 
                                            ref={canvasEducadorRef} 
                                            width={280} 
                                            height={112}
                                            onMouseDown={(e) => startDrawing(e, canvasEducadorRef.current!, setIsDrawingEducador)}
                                            onMouseMove={(e) => draw(e, canvasEducadorRef.current!, isDrawingEducador)}
                                            onMouseUp={() => stopDrawing(setIsDrawingEducador)}
                                            onMouseLeave={() => stopDrawing(setIsDrawingEducador)}
                                            onTouchStart={(e) => startDrawing(e, canvasEducadorRef.current!, setIsDrawingEducador)}
                                            onTouchMove={(e) => draw(e, canvasEducadorRef.current!, isDrawingEducador)}
                                            onTouchEnd={() => stopDrawing(setIsDrawingEducador)}
                                            className="w-full h-full cursor-crosshair touch-none"
                                        />
                                        <button 
                                            onClick={() => clearCanvas(canvasEducadorRef.current, true)}
                                            className="absolute bottom-1 right-1 p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-md text-[9px] font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <RefreshCw size={9} /> Limpiar
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-fg-muted font-bold mt-1">Firma del Educador/a</div>
                                </div>

                            </div>
                            
                            <div className="flex justify-end pt-4 border-t border-border mt-4">
                                <button
                                    onClick={() => handleDownloadPDF(false)}
                                    disabled={isGenerating || isSaving}
                                    className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-primary-fg rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
                                >
                                    <Check size={16} /> Guardar y Registrar Compromiso Digital
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Section 3: Physical workflow (Download blank template & upload scanned copy) */}
                    {activeTab === 'fisico' && (
                        <div className="p-4 border border-warning/20 bg-warning-soft/20 rounded-xl space-y-4 animate-fadeIn">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="text-warning mt-0.5" size={18} />
                                <div>
                                    <h5 className="font-bold text-xs text-warning-fg uppercase tracking-wider">Alternativa de Proceso Físico (Manual)</h5>
                                    <p className="text-[11px] text-fg-muted">Si requiere firmas con lapicero real, descargue la plantilla vacía y suba el documento firmado y escaneado.</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                {/* Download empty template */}
                                <button
                                    onClick={() => handleDownloadPDF(true)}
                                    className="px-4 py-2 bg-surface text-fg-secondary hover:text-fg border border-border hover:bg-surface-muted rounded-md text-[12px] font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Printer size={14} /> Descargar Plantilla Prefirmada para Imprimir
                                </button>

                                {/* Upload physical signed file */}
                                <div className="flex items-center gap-3 bg-surface border border-border rounded-md px-3 py-1.5">
                                    <label className="px-3 py-1 bg-surface-muted hover:bg-border text-fg rounded text-[11px] font-bold cursor-pointer transition-colors border border-border">
                                        Seleccionar Escaneado
                                        <input 
                                            type="file" 
                                            accept="application/pdf,image/*" 
                                            className="hidden" 
                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                    <span className="text-[11px] font-medium text-fg-secondary truncate max-w-[200px]">
                                        {uploadFile ? uploadFile.name : 'Ningún archivo seleccionado'}
                                    </span>
                                    {uploadFile && (
                                        <button 
                                            onClick={handleUploadEscaneado}
                                            disabled={isSaving}
                                            className="px-3 py-1 bg-success text-success-fg hover:bg-success/90 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <Printer size={12} /> Subir y Archivar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* Hidden Element for PDF Generation */}
            <div className="absolute left-[-9999px] top-[-9999px]">
                <div id="compromiso-pdf-print-container" style={{
                    width: '210mm',
                    height: '297mm',
                    padding: '20mm 20mm',
                    backgroundColor: 'white',
                    color: 'black',
                    fontFamily: 'Arial, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                }}>
                    <div>
                        {/* INABIF Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #ddd', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '280px', height: '48px', overflow: 'hidden', position: 'relative' }}>
                                    <img 
                                        src="/compromiso.png" 
                                        alt="MIMP Logo" 
                                        style={{ 
                                            position: 'absolute', 
                                            top: '-4px', 
                                            left: '-28px', 
                                            width: '560px', 
                                            maxWidth: 'none' 
                                        }} 
                                    />
                                </div>
                                <div style={{ fontSize: '9px', lineHeight: '1.2', borderLeft: '1.5px solid #bbb', paddingLeft: '10px', color: '#555' }}>
                                    <strong>MINISTERIO DE LA MUJER Y<br />POBLACIONES VULNERABLES</strong><br />
                                    <span>Programa Integral Nacional para el Bienestar Familiar - INABIF</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#333', textAlign: 'right' }}>
                                SERVICIO DE EDUCADORES DE CALLE<br />
                                <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#666' }}>FORMATO 09</span>
                            </div>
                        </div>

                        {/* Title */}
                        <h2 style={{ fontSize: '18px', fontStyle: 'italic', fontWeight: 'bold', textAlign: 'center', margin: '20px 0 25px 0', textDecoration: 'none' }}>COMPROMISO</h2>

                        {/* Body Text */}
                        <div style={{ fontSize: '12px', lineHeight: '1.6', textAlign: 'justify', color: '#222' }}>
                            <p style={{ marginBottom: '20px' }}>
                                Puesto en conocimiento al NNA y sus familias los objetivos y bondades del Servicio Educadores de Calle - INABIF dicha usuaria, usuario y/o adulto responsable, expresa su conformidad a través de su firma asumiendo los siguientes compromisos los cuales se darán de manera progresiva:
                            </p>
                            <ul style={{ paddingLeft: '20px', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px', listStyleType: 'disc' }}>
                                <li>Participación activa de los NNA y sus familias dentro del Servicio Educadores de Calle (talleres, salidas recreativas y culturales, etc.)</li>
                                <li>Que su hijo, hija tenga una continuidad educativa, dé tiempo necesario para sus estudios y el cumplimiento de sus tareas, (según sea el caso).</li>
                                <li>Disminución de horas y/o extinción progresiva de la situación de calle.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Signatures & Huellas Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', marginTop: 'auto' }}>
                        
                        {/* NNA Sign area */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: '120px' }}>
                            <div style={{ width: '65%', fontSize: '11px', lineHeight: '1.6' }}>
                                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                    Firma: _________________________________________
                                </div>
                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', paddingLeft: '40px', marginTop: '-35px', marginBottom: '5px' }}>
                                    <img id="print-nna-firma" alt="" style={{ maxHeight: '45px', maxWidth: '180px', objectFit: 'contain' }} />
                                </div>
                                <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Nombre y Apellidos Completos de la niña, niño o adolescente</div>
                                <div style={{ fontSize: '11px' }}>{nnaName}</div>
                                <div>DNI: {nnaDni}</div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                                <div style={{ width: '70px', height: '90px', border: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fcfcfc' }}>
                                    <img id="print-nna-huella" alt="" style={{ maxHeight: '86px', maxWidth: '66px', objectFit: 'cover' }} />
                                </div>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', marginTop: '5px' }}>Huella Digital del Usuario@</div>
                            </div>
                        </div>

                        {/* Tutor Sign area */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: '120px' }}>
                            <div style={{ width: '65%', fontSize: '11px', lineHeight: '1.6' }}>
                                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                    Firma: _________________________________________
                                </div>
                                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', paddingLeft: '40px', marginTop: '-35px', marginBottom: '5px' }}>
                                    <img id="print-tutor-firma" alt="" style={{ maxHeight: '45px', maxWidth: '180px', objectFit: 'contain' }} />
                                </div>
                                <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Nombre y Apellidos Completos del Padre, Madre o Tutor</div>
                                <div style={{ fontSize: '11px' }}>{tutorName || '---'}</div>
                                <div>DNI: {tutorDni || '---'}</div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                                <div style={{ width: '70px', height: '90px', border: '1px solid black', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fcfcfc' }}>
                                    <img id="print-tutor-huella" alt="" style={{ maxHeight: '86px', maxWidth: '66px', objectFit: 'cover' }} />
                                </div>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', marginTop: '5px' }}>Huella Digital del Padre o Madre<br />Tutor</div>
                            </div>
                        </div>

                        {/* Educador/a Sign area - Bordered Box */}
                        <div style={{ border: '1px solid black', padding: '15px 20px', backgroundColor: '#fff', fontSize: '11px', lineHeight: '1.6' }}>
                            <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                                Firma: _________________________________________
                            </div>
                            <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', paddingLeft: '40px', marginTop: '-35px', marginBottom: '5px' }}>
                                <img id="print-educador-firma" alt="" style={{ maxHeight: '45px', maxWidth: '180px', objectFit: 'contain' }} />
                            </div>
                            <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Nombre y Apellidos Completos del Educador (a):</div>
                            <div style={{ fontSize: '11px' }}>{educadorName}</div>
                            <div>DNI: {educadorDni || '---'}</div>
                        </div>

                    </div>
                </div>
            </div>

        </div>
    );
};
