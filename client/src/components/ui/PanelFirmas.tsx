import { useEffect, useRef, useState } from 'react';
import { FileSignature, Printer, RefreshCw, Camera, AlertCircle, X } from 'lucide-react';

/**
 * Panel de firmas reutilizable — sigue la mecánica de la ficha de compromiso (F09).
 *
 * Dos caminos, porque en campo se dan los dos:
 *
 * - **Digital:** cada firmante traza su firma con el dedo y, si no sabe firmar,
 *   se registra su huella (foto del dedo entintado con la cámara del celular).
 *   Es el camino que los educadores validaron en la reunión del 11/08/2026.
 * - **Físico:** se descarga la ficha en blanco, se firma con lapicero y se sube
 *   la foto o el escaneo.
 *
 * Las firmas no se guardan en tablas: se estampan en el PDF y ese PDF firmado
 * es el que va al expediente digital, igual que en el F09.
 */

export interface Firmante {
    /** Identificador del recuadro; con él se recuperan trazo y huella. */
    clave: string;
    /** Etiqueta corta del bloque: "NNA", "Tutor/a", "Educador/a". */
    etiqueta: string;
    /** Lo que dice el formato oficial debajo de la línea. */
    rol: string;
    /** Nombre de quien firma; sale del expediente, no se escribe. */
    nombre: string;
    dni?: string;
    /** Los NNA menores no siempre firman; oculta el huellero si no aplica. */
    conHuella?: boolean;
}

interface PanelFirmasProps {
    titulo: string;
    subtitulo?: string;
    firmantes: Firmante[];
    /** Recibe `{ clave: PNG, "clave-huella": PNG }` de quienes firmaron. */
    onFirmar: (firmas: Record<string, string>) => Promise<void> | void;
    onDescargarParaFirmar: () => Promise<void> | void;
    onSubirFirmado: (archivo: File) => Promise<void> | void;
    onClose: () => void;
}

const BloqueFirmante = ({
    firmante,
    orden,
    registrar,
}: {
    firmante: Firmante;
    orden: number;
    registrar: (clave: string, canvas: HTMLCanvasElement | null) => void;
}) => {
    const firmaRef  = useRef<HTMLCanvasElement | null>(null);
    const huellaRef = useRef<HTMLCanvasElement | null>(null);
    const dibujando = useRef(false);

    useEffect(() => {
        registrar(firmante.clave, firmaRef.current);
        registrar(`${firmante.clave}-huella`, huellaRef.current);
        return () => {
            registrar(firmante.clave, null);
            registrar(`${firmante.clave}-huella`, null);
        };
    }, [firmante.clave]);

    const posicion = (e: any, canvas: HTMLCanvasElement) => {
        const rect  = canvas.getBoundingClientRect();
        const punto = 'touches' in e ? e.touches[0] : e;
        // El canvas se dibuja a más resolución que su tamaño en pantalla para que
        // la firma no salga pixelada en el PDF; hay que escalar el trazo.
        return {
            x: (punto.clientX - rect.left) * (canvas.width / rect.width),
            y: (punto.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const empezar = (e: any) => {
        e.preventDefault();
        const canvas = firmaRef.current;
        const ctx    = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.lineWidth   = 3;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = '#1e293b';
        const { x, y } = posicion(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        dibujando.current = true;
    };

    const trazar = (e: any) => {
        if (!dibujando.current) return;
        e.preventDefault();
        const canvas = firmaRef.current;
        const ctx    = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = posicion(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const soltar = () => { dibujando.current = false; };

    const limpiar = (canvas: HTMLCanvasElement | null) => {
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    /**
     * La huella se fotografía —el dedo entintado— y se encaja en el recuadro.
     *
     * También se puede trazar con el dedo sobre el mismo canvas, porque en
     * escritorio no hay cámara y en muchos equipos de campo tampoco: sin eso el
     * huellero quedaba muerto.
     */
    const subirHuella = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file   = e.target.files?.[0];
        const canvas = huellaRef.current;
        if (!file || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const lector = new FileReader();
        lector.onload = () => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Se recorta al centro para que la huella llene el recuadro sin
                // deformarse, venga la foto en vertical o en horizontal.
                const escala = Math.max(canvas.width / img.width, canvas.height / img.height);
                const ancho  = img.width * escala;
                const alto   = img.height * escala;
                ctx.drawImage(img, (canvas.width - ancho) / 2, (canvas.height - alto) / 2, ancho, alto);
            };
            img.src = lector.result as string;
        };
        lector.readAsDataURL(file);
        e.target.value = '';
    };

    /** Trazo directo sobre el huellero, con el mismo mecanismo que la firma. */
    const dibujandoHuella = useRef(false);

    const empezarHuella = (e: any) => {
        e.preventDefault();
        const canvas = huellaRef.current;
        const ctx    = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.lineWidth   = 6;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.strokeStyle = '#1e293b';
        const { x, y } = posicion(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        dibujandoHuella.current = true;
    };

    const trazarHuella = (e: any) => {
        if (!dibujandoHuella.current) return;
        e.preventDefault();
        const canvas = huellaRef.current;
        const ctx    = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const { x, y } = posicion(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const soltarHuella = () => { dibujandoHuella.current = false; };

    return (
        <div className="border border-border rounded-[10px] p-4 flex flex-col items-center bg-surface relative w-full">
            <span className="absolute top-2 left-2 bg-surface-muted text-fg-secondary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                {orden}. {firmante.etiqueta}
            </span>

            <div className="text-[12px] font-bold text-fg text-center mt-4 mb-1 truncate w-full">
                {firmante.nombre || '(sin nombre)'}
            </div>
            <div className="text-[10px] text-fg-muted mb-3">DNI: {firmante.dni || '---'}</div>

            {/* Firma */}
            <div className="w-full bg-surface-muted/50 border border-dashed border-border rounded-[8px] overflow-hidden h-28 relative">
                <canvas
                    ref={firmaRef}
                    width={560}
                    height={224}
                    onMouseDown={empezar}
                    onMouseMove={trazar}
                    onMouseUp={soltar}
                    onMouseLeave={soltar}
                    onTouchStart={empezar}
                    onTouchMove={trazar}
                    onTouchEnd={soltar}
                    className="w-full h-full cursor-crosshair touch-none"
                />
                <button
                    type="button"
                    onClick={() => limpiar(firmaRef.current)}
                    className="absolute bottom-1 right-1 p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-[5px] text-[9px] font-bold flex items-center gap-1 transition-colors"
                >
                    <RefreshCw size={9} /> Limpiar
                </button>
            </div>
            <div className="text-[10px] text-fg-muted font-bold mt-1 mb-4">Firma de {firmante.etiqueta}</div>

            {/* Huella */}
            {firmante.conHuella !== false && (
                <>
                    <div className="w-24 h-28 bg-surface-muted/50 border border-dashed border-border rounded-[8px] overflow-hidden relative">
                        <canvas
                            ref={huellaRef}
                            width={192}
                            height={224}
                            onMouseDown={empezarHuella}
                            onMouseMove={trazarHuella}
                            onMouseUp={soltarHuella}
                            onMouseLeave={soltarHuella}
                            onTouchStart={empezarHuella}
                            onTouchMove={trazarHuella}
                            onTouchEnd={soltarHuella}
                            className="w-full h-full touch-none cursor-crosshair"
                        />
                        <div className="absolute bottom-1 right-1 flex gap-1">
                            {/* Sin `capture`: en escritorio ese atributo deja el
                                botón sin hacer nada, y en el celular la cámara
                                se ofrece igual al abrir el selector. */}
                            <label
                                title="Tomar foto de la huella"
                                className="p-1 bg-surface border border-border hover:bg-primary-soft hover:text-primary rounded-[5px] flex items-center cursor-pointer transition-colors"
                            >
                                <Camera size={9} />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={subirHuella}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => limpiar(huellaRef.current)}
                                className="p-1 bg-surface border border-border hover:bg-danger-soft hover:text-danger rounded-[5px] flex items-center transition-colors"
                            >
                                <RefreshCw size={9} />
                            </button>
                        </div>
                    </div>
                    <div className="text-[10px] text-fg-muted font-bold mt-1">Huellero</div>
                </>
            )}
        </div>
    );
};

export const PanelFirmas = ({
    titulo,
    subtitulo,
    firmantes,
    onFirmar,
    onDescargarParaFirmar,
    onSubirFirmado,
    onClose,
}: PanelFirmasProps) => {
    const [modo, setModo]       = useState<'digital' | 'fisico'>('digital');
    const [ocupado, setOcupado] = useState(false);
    const [archivo, setArchivo] = useState<File | null>(null);
    const canvases              = useRef<Record<string, HTMLCanvasElement | null>>({});

    const registrar = (clave: string, canvas: HTMLCanvasElement | null) => {
        canvases.current[clave] = canvas;
    };

    /** Un canvas en blanco no debe estamparse: dejaría una imagen vacía encima. */
    const tieneTrazo = (canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
        return false;
    };

    const confirmarDigital = async () => {
        const firmas: Record<string, string> = {};
        Object.entries(canvases.current).forEach(([clave, canvas]) => {
            if (canvas && tieneTrazo(canvas)) firmas[clave] = canvas.toDataURL('image/png');
        });
        setOcupado(true);
        try {
            await onFirmar(firmas);
        } finally {
            setOcupado(false);
        }
    };

    const confirmarFisico = async () => {
        if (!archivo) return;
        setOcupado(true);
        try {
            await onSubirFirmado(archivo);
        } finally {
            setOcupado(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface rounded-[10px] shadow-3 w-full max-w-[860px] max-h-[92vh] overflow-hidden flex flex-col border border-border">

                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                    <div>
                        <h3 className="text-[14px] font-semibold text-fg">{titulo}</h3>
                        {subtitulo && <p className="text-[11px] text-fg-muted mt-0.5">{subtitulo}</p>}
                    </div>
                    <button onClick={onClose} className="p-1 text-fg-muted hover:text-fg rounded-[5px] hover:bg-surface-muted">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto flex-1 space-y-5">
                    <div className="flex bg-surface-muted/50 p-1 rounded-[10px] border border-border">
                        <button
                            onClick={() => setModo('digital')}
                            className={`flex-1 py-2.5 text-[13px] font-bold rounded-[8px] transition-all flex items-center justify-center gap-2 ${
                                modo === 'digital'
                                    ? 'bg-surface text-primary shadow-sm border border-border/50'
                                    : 'text-fg-secondary hover:text-fg'
                            }`}
                        >
                            <FileSignature size={17} /> Firma Táctil (Digital)
                        </button>
                        <button
                            onClick={() => setModo('fisico')}
                            className={`flex-1 py-2.5 text-[13px] font-bold rounded-[8px] transition-all flex items-center justify-center gap-2 ${
                                modo === 'fisico'
                                    ? 'bg-surface text-primary shadow-sm border border-border/50'
                                    : 'text-fg-secondary hover:text-fg'
                            }`}
                        >
                            <Printer size={17} /> Proceso Físico (Manual)
                        </button>
                    </div>

                    {modo === 'digital' ? (
                        <div className="space-y-4">
                            <h4 className="font-bold text-[11px] text-fg uppercase tracking-widest border-b border-border pb-2">
                                Firmas y huellas directas (pantalla táctil)
                            </h4>
                            <p className="text-[11px] text-fg-muted">
                                Pase el equipo a cada persona. Puede firmar solo quien esté presente;
                                los recuadros vacíos quedan en blanco para completarse después.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {firmantes.map((f, i) => (
                                    <BloqueFirmante key={f.clave} firmante={f} orden={i + 1} registrar={registrar} />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 border border-warning/20 bg-warning-soft/20 rounded-[10px] space-y-4">
                            <div className="flex items-start gap-2.5">
                                <AlertCircle className="text-warning mt-0.5 flex-shrink-0" size={18} />
                                <div>
                                    <h5 className="font-bold text-[11px] text-fg uppercase tracking-wider">
                                        Alternativa de proceso físico (manual)
                                    </h5>
                                    <p className="text-[11px] text-fg-muted">
                                        Si se requieren firmas con lapicero, descargue la ficha en blanco y suba
                                        el documento firmado y escaneado.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                <button
                                    onClick={() => onDescargarParaFirmar()}
                                    className="px-4 py-2 bg-surface text-fg-secondary hover:text-fg border border-border hover:bg-surface-muted rounded-[6px] text-[12px] font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Printer size={14} /> Descargar ficha para imprimir
                                </button>

                                <div className="flex items-center gap-3 bg-surface border border-border rounded-[6px] px-3 py-1.5">
                                    <label className="px-3 py-1 bg-surface-muted hover:bg-border text-fg rounded-[5px] text-[11px] font-bold cursor-pointer transition-colors border border-border">
                                        Seleccionar escaneado
                                        <input
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                    <span className="text-[11px] font-medium text-fg-secondary truncate max-w-[220px]">
                                        {archivo ? archivo.name : 'Ningún archivo seleccionado'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-muted">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-surface border border-border-strong text-fg text-[13px] font-medium rounded-[6px] hover:bg-surface-muted transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={modo === 'digital' ? confirmarDigital : confirmarFisico}
                        disabled={ocupado || (modo === 'fisico' && !archivo)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-[13px] font-medium rounded-[6px] hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                        <FileSignature size={15} />
                        {ocupado ? 'Guardando…' : modo === 'digital' ? 'Firmar y archivar' : 'Subir y archivar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
