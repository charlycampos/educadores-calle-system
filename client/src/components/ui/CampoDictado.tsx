import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from './Toast';

/**
 * Silencio tras el cual se da por olvidado el micrófono.
 *
 * Una pausa para pensar o revisar el cuaderno dura segundos; un minuto entero
 * sin hablar ya no es una pausa. Se apaga y se avisa, en vez de quedar
 * escuchando indefinidamente sin que el educador lo note.
 */
const SILENCIO_MAX_MS = 60_000;

/**
 * Campo de texto con dictado por voz.
 *
 * Es el mismo comportamiento que ya usaba el Diario de Campo, extraído aquí
 * para no volver a escribirlo en cada formato: los educadores llenan en campo,
 * desde el celular, y en la reunión del 11/08/2026 pidieron dictado en todas
 * las secciones extensas.
 *
 * Se presiona una vez para empezar y otra para detener. Lo reconocido se
 * **agrega al final** de lo que ya había escrito: el educador puede escribir un
 * poco, dictar y seguir escribiendo sin perder nada.
 *
 * Necesita conexión: Chrome procesa la voz en sus servidores. Si el navegador
 * no soporta la API, el botón no se muestra y el campo funciona como cualquier
 * otro.
 */

const getSpeechAPI = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

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
    const recognitionRef                = useRef<any>(null);
    // El texto vive en el componente padre; el reconocimiento es asíncrono y
    // sin esta referencia cada frase dictada pisaría a la anterior.
    const valueRef                      = useRef(value);
    valueRef.current = value;
    /** Distingue "el educador pulsó Detener" de "Chrome se cortó solo". */
    const detenidoPorUsuario            = useRef(false);
    const silencioTimer                 = useRef<any>(null);

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

    const hasSpeech = !!getSpeechAPI();

    // Si se cierra el formulario con el micrófono encendido, hay que apagarlo:
    // con la reconexión automática seguiría escuchando en segundo plano.
    useEffect(() => () => {
        detenidoPorUsuario.current = true;
        clearTimeout(silencioTimer.current);
        recognitionRef.current?.stop();
    }, []);

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
                const actual = valueRef.current || '';
                onChange(actual.trimEnd() + (actual ? ' ' : '') + finalText.trim());
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

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
                    {label}
                </label>
                {hasSpeech && !disabled && (
                    <button
                        type="button"
                        onClick={toggleListening}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-bold text-[11px] transition-all active:scale-95 ${
                            isListening
                                ? 'bg-danger text-white animate-pulse'
                                : 'bg-surface-muted text-fg-muted hover:text-fg hover:bg-border'
                        }`}
                    >
                        {isListening
                            ? <><MicOff size={12} /> Detener</>
                            : <><Mic size={12} /> Dictar por voz</>
                        }
                    </button>
                )}
            </div>

            <textarea
                rows={rows}
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder={isListening ? '🎤 Escuchando… hable ahora' : placeholder}
                className={`w-full px-3 py-2 text-[13px] rounded-[6px] text-fg placeholder:text-fg-muted outline-none resize-none transition-colors border ${
                    isListening
                        ? 'border-danger bg-danger-soft/30 focus:ring-2 focus:ring-danger/30'
                        : 'bg-surface border-border focus:ring-2 focus:ring-primary/30 focus:border-primary'
                }`}
            />

            {/* Lo que Chrome aún está interpretando: se ve en gris y desaparece
                en cuanto la frase se da por buena. */}
            {isListening && interim && (
                <p className="mt-1 text-[12px] text-fg-muted italic">{interim}…</p>
            )}
        </div>
    );
};
