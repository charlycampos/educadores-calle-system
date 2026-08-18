import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Bold, Italic, Underline, List } from 'lucide-react';
import { toast } from './Toast';
import { limpiarHtml } from '../../utils/texto-rico';

/**
 * Campo de texto largo con formato y dictado por voz.
 *
 * Es el mismo comportamiento que ya usaba el Diario de Campo, extraído aquí
 * para no volver a escribirlo en cada formato: los educadores llenan en campo,
 * desde el celular, y en la reunión del 11/08/2026 pidieron dictado y formato
 * (viñetas, negritas) en todas las secciones extensas.
 *
 * **Formato:** negrita, cursiva y viñetas, nada más. Es un formato oficial; con
 * colores y tamaños la ficha impresa dejaría de parecerse al anexo aprobado. El
 * contenido se guarda como HTML acotado y se limpia al entrar y al salir.
 *
 * **Dictado:** se presiona una vez para empezar y otra para detener. Lo
 * reconocido se agrega al final de lo escrito. Necesita conexión —Chrome
 * procesa la voz en sus servidores—; si el navegador no lo soporta, el botón no
 * se muestra y el campo funciona igual.
 */

const getSpeechAPI = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

/**
 * Silencio tras el cual se da por olvidado el micrófono.
 *
 * Una pausa para pensar o revisar el cuaderno dura segundos; un minuto entero
 * sin hablar ya no es una pausa. Se apaga y se avisa, en vez de quedar
 * escuchando indefinidamente sin que el educador lo note.
 */
const SILENCIO_MAX_MS = 60_000;

interface CampoDictadoProps {
    label: string;
    value: string;
    onChange: (valor: string) => void;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
}

export const CampoDictado = ({
    label,
    value,
    onChange,
    placeholder,
    rows = 2,
    disabled,
}: CampoDictadoProps) => {
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim]         = useState('');
    const [vacio, setVacio]             = useState(true);
    const recognitionRef                = useRef<any>(null);
    const editorRef                     = useRef<HTMLDivElement | null>(null);
    // El texto vive en el componente padre; el reconocimiento es asíncrono y
    // sin esta referencia cada frase dictada pisaría a la anterior.
    const valueRef                      = useRef(value);
    valueRef.current = value;
    /** Distingue "el educador pulsó Detener" de "Chrome se cortó solo". */
    const detenidoPorUsuario            = useRef(false);
    const silencioTimer                 = useRef<any>(null);

    const hasSpeech = !!getSpeechAPI();

    /**
     * El contenido solo se escribe en el editor cuando difiere del que ya
     * tiene. Reescribirlo en cada tecleo devolvería el cursor al inicio.
     */
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        if (editor.innerHTML !== (value || '')) editor.innerHTML = value || '';
        setVacio(!editor.textContent?.trim());
    }, [value]);

    // Si se cierra el formulario con el micrófono encendido, hay que apagarlo:
    // con la reconexión automática seguiría escuchando en segundo plano.
    useEffect(() => () => {
        detenidoPorUsuario.current = true;
        clearTimeout(silencioTimer.current);
        recognitionRef.current?.stop();
    }, []);

    const emitir = () => {
        const editor = editorRef.current;
        if (!editor) return;
        setVacio(!editor.textContent?.trim());
        onChange(limpiarHtml(editor.innerHTML));
    };

    /** Aplica formato a lo seleccionado, sin sacar el foco del editor. */
    const formatear = (comando: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
        editorRef.current?.focus();
        document.execCommand(comando, false);
        emitir();
    };

    /** Reinicia la cuenta de silencio cada vez que se oye algo. */
    const reiniciarVigilanciaSilencio = () => {
        clearTimeout(silencioTimer.current);
        silencioTimer.current = setTimeout(() => {
            detenidoPorUsuario.current = true;
            recognitionRef.current?.stop();
            setIsListening(false);
            setInterim('');
            toast.info('Se apagó el micrófono: no se escuchó nada durante un minuto.');
        }, SILENCIO_MAX_MS);
    };

    const toggleListening = () => {
        if (isListening) {
            detenidoPorUsuario.current = true;
            clearTimeout(silencioTimer.current);
            recognitionRef.current?.stop();
            return;
        }

        const SpeechAPI = getSpeechAPI();
        if (!SpeechAPI) return;

        detenidoPorUsuario.current = false;

        const rec = new SpeechAPI();
        rec.lang           = 'es-PE';
        rec.continuous     = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        rec.onstart = () => { setIsListening(true); reiniciarVigilanciaSilencio(); };

        rec.onresult = (e: any) => {
            reiniciarVigilanciaSilencio();
            let finalText   = '';
            let interimText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t;
                else interimText += t;
            }
            if (finalText) {
                // Se agrega al final del contenido, respetando el formato que
                // ya tuviera lo escrito.
                const editor = editorRef.current;
                if (editor) {
                    const separador = editor.textContent?.trim() ? ' ' : '';
                    editor.innerHTML = (editor.innerHTML || '') + separador + finalText.trim();
                    emitir();
                }
                setInterim('');
            } else {
                setInterim(interimText);
            }
        };

        /**
         * Los errores que no tienen arreglo apagan el micrófono; el resto se
         * dejan pasar para que `onend` lo reconecte.
         *
         * `no-speech` es el más común y no es una falla: es Chrome avisando que
         * lleva unos segundos sin oír nada.
         */
        rec.onerror = (e: any) => {
            const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
            if (fatal.includes(e?.error)) {
                detenidoPorUsuario.current = true;
                clearTimeout(silencioTimer.current);
                setIsListening(false);
                setInterim('');
                toast.error(
                    e.error === 'audio-capture'
                        ? 'No se detectó un micrófono en este dispositivo.'
                        : 'El navegador bloqueó el micrófono. Habilítalo desde el candado de la barra de direcciones.'
                );
            }
        };

        /**
         * Chrome corta el reconocimiento solo tras unos segundos de silencio,
         * aunque `continuous` sea true. Sin esto, el educador que se queda
         * pensando pierde el micrófono sin enterarse y lo que dicta después no
         * se graba. Mientras el botón siga rojo, se reconecta.
         */
        rec.onend = () => {
            setInterim('');
            if (detenidoPorUsuario.current) {
                setIsListening(false);
                return;
            }
            try {
                rec.start();
            } catch {
                setIsListening(false);
            }
        };

        rec.start();
    };

    const botonBarra = 'flex items-center justify-center w-7 h-7 rounded-[6px] transition-all active:scale-95 bg-surface-muted text-fg-muted hover:text-fg hover:bg-border';

    return (
        <div>
            {/* Sin etiqueta cuando el formulario ya la pone por su cuenta —el
                informe situacional titula cada sección—: la barra se va sola a
                la derecha. */}
            <div className={`flex items-center gap-2 mb-1 ${label ? 'justify-between' : 'justify-end'}`}>
                {label && (
                    <label className="block text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
                        {label}
                    </label>
                )}

                {!disabled && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => formatear('bold')}
                                title="Negrita" aria-label="Negrita" className={botonBarra}>
                            <Bold size={13} />
                        </button>
                        <button type="button" onClick={() => formatear('italic')}
                                title="Cursiva" aria-label="Cursiva" className={botonBarra}>
                            <Italic size={13} />
                        </button>
                        <button type="button" onClick={() => formatear('underline')}
                                title="Subrayado" aria-label="Subrayado" className={botonBarra}>
                            <Underline size={13} />
                        </button>
                        <button type="button" onClick={() => formatear('insertUnorderedList')}
                                title="Viñetas" aria-label="Viñetas" className={botonBarra}>
                            <List size={13} />
                        </button>

                        {/* Solo el icono: el texto "Dictar por voz" repetido en
                            cada casilla competía con la etiqueta del campo. */}
                        {hasSpeech && (
                            <button
                                type="button"
                                onClick={toggleListening}
                                title={isListening ? 'Detener el dictado' : 'Dictar por voz'}
                                aria-label={isListening ? 'Detener el dictado' : 'Dictar por voz'}
                                className={`flex items-center justify-center w-7 h-7 rounded-[6px] transition-all active:scale-95 ml-1 ${
                                    isListening
                                        ? 'bg-danger text-white animate-pulse'
                                        : 'bg-surface-muted text-fg-muted hover:text-fg hover:bg-border'
                                }`}
                            >
                                {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    suppressContentEditableWarning
                    onInput={emitir}
                    onBlur={emitir}
                    /* Al pegar desde Word se toma solo el texto: el HTML de Word
                       arrastra fuentes, tamaños y tablas que rompen la ficha. */
                    onPaste={e => {
                        e.preventDefault();
                        const texto = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, texto);
                    }}
                    style={{ minHeight: `${Math.max(rows, 2) * 24 + 16}px` }}
                    className={`campo-rico w-full px-3 py-2 text-[13px] rounded-[6px] text-fg outline-none overflow-y-auto transition-colors border ${
                        disabled
                            ? 'bg-surface-muted text-fg-muted cursor-not-allowed border-border'
                            : isListening
                                ? 'border-danger bg-danger-soft/30 ring-2 ring-danger/30'
                                : 'bg-surface border-border focus:ring-2 focus:ring-primary/30 focus:border-primary'
                    }`}
                />

                {/* El marcador de posición va aparte: un contenedor editable no
                    admite `placeholder`. */}
                {vacio && !isListening && (
                    <span className="absolute left-3 top-2 text-[13px] text-fg-muted pointer-events-none">
                        {placeholder}
                    </span>
                )}
                {vacio && isListening && (
                    <span className="absolute left-3 top-2 text-[13px] text-fg-muted pointer-events-none">
                        🎤 Escuchando… hable ahora
                    </span>
                )}
            </div>

            {/* Lo que Chrome aún está interpretando: se ve en gris y desaparece
                en cuanto la frase se da por buena. */}
            {isListening && interim && (
                <p className="mt-1 text-[12px] text-fg-muted italic">{interim}…</p>
            )}
        </div>
    );
};
