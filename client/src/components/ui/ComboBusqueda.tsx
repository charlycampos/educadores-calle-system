import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

/**
 * Combo con búsqueda escribiendo.
 *
 * Un `<select>` nativo con 844 opciones es inservible: hay que desplazarse a
 * ciegas y el navegador solo salta por la primera letra. Aquí se escribe y la
 * lista se filtra sola, que es como la gente busca su distrito.
 *
 * Se maneja con teclado —flechas, Enter, Escape— porque quien llena muchas
 * fichas no suelta el teclado para ir al mouse.
 */

export interface OpcionCombo {
    valor: string;
    etiqueta: string;
    /** Texto extra a mostrar bajo la etiqueta. También se busca en él. */
    detalle?: string;
    /**
     * Estado con color, al final del detalle. Se busca igual que el resto,
     * así que escribir "acreditada" filtra por él.
     */
    insignia?: { texto: string; tono: 'success' | 'danger' | 'warning' };
}

interface Props {
    opciones: OpcionCombo[];
    value: string;
    onChange: (valor: string) => void;
    placeholder?: string;
    disabled?: boolean;
    /** Se muestra cuando no hay coincidencias. */
    sinResultados?: string;
    /** Máximo de opciones a pintar a la vez. Protege el render con listas largas. */
    limite?: number;
}

const normalizar = (s: string): string =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const ComboBusqueda = ({
    opciones, value, onChange,
    placeholder = 'Escriba para buscar…',
    disabled = false,
    sinResultados = 'Sin coincidencias',
    limite = 60,
}: Props) => {
    const [abierto, setAbierto] = useState(false);
    const [texto, setTexto] = useState('');
    const [resaltado, setResaltado] = useState(0);
    // La lista se abre hacia arriba cuando abajo no cabe. Sin esto, un combo
    // al final del formulario despliega fuera de la pantalla y no se ve nada.
    const [haciaArriba, setHaciaArriba] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);
    const listaRef = useRef<HTMLUListElement>(null);

    const ALTO_LISTA = 256;  // igual al max-h-64 de la lista

    /** Decide la dirección midiendo el espacio real bajo el control. */
    const calcularDireccion = () => {
        const caja = contenedorRef.current?.getBoundingClientRect();
        if (!caja) return;
        const espacioAbajo  = window.innerHeight - caja.bottom;
        const espacioArriba = caja.top;
        // Solo sube si arriba hay más sitio: en pantallas chicas puede no
        // haber espacio en ninguna de las dos direcciones.
        setHaciaArriba(espacioAbajo < ALTO_LISTA && espacioArriba > espacioAbajo);
    };

    const seleccionada = opciones.find(o => o.valor === value);

    // Al cerrar sin elegir, el texto tecleado se descarta: si no, quedaría un
    // filtro a medias en pantalla que no corresponde a lo seleccionado.
    useEffect(() => {
        const alClicFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false);
                setTexto('');
            }
        };
        document.addEventListener('mousedown', alClicFuera);
        return () => document.removeEventListener('mousedown', alClicFuera);
    }, []);

    // Con la lista abierta, la dirección se recalcula al desplazar o
    // redimensionar: el control puede pasar de tener sitio abajo a no tenerlo.
    // El scroll se escucha en captura para enterarse también de los
    // contenedores internos, no solo del de la ventana.
    useEffect(() => {
        if (!abierto) return;
        const recalcular = () => calcularDireccion();
        window.addEventListener('scroll', recalcular, true);
        window.addEventListener('resize', recalcular);
        return () => {
            window.removeEventListener('scroll', recalcular, true);
            window.removeEventListener('resize', recalcular);
        };
    }, [abierto]);

    const q = normalizar(texto.trim());
    const filtradas = q
        ? opciones.filter(o =>
            normalizar(o.etiqueta).includes(q) ||
            normalizar(o.detalle || '').includes(q) ||
            normalizar(o.insignia?.texto || '').includes(q))
        : opciones;
    const visibles = filtradas.slice(0, limite);

    // El resaltado vuelve al inicio en cada búsqueda: mantenerlo apuntaría a
    // una opción que ya no está en la lista.
    useEffect(() => { setResaltado(0); }, [texto]);

    // Mantiene visible la opción resaltada al navegar con flechas.
    useEffect(() => {
        if (!abierto || !listaRef.current) return;
        const el = listaRef.current.children[resaltado] as HTMLElement | undefined;
        el?.scrollIntoView({ block: 'nearest' });
    }, [resaltado, abierto]);

    const elegir = (valor: string) => {
        onChange(valor);
        setTexto('');
        setAbierto(false);
    };

    const alTeclear = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!abierto) { setAbierto(true); return; }
            setResaltado(r => Math.min(r + 1, visibles.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setResaltado(r => Math.max(r - 1, 0));
        } else if (e.key === 'Enter') {
            // preventDefault siempre que el combo esté abierto: si no, el Enter
            // burbujea y envía el formulario a medio elegir.
            if (abierto && visibles[resaltado]) {
                e.preventDefault();
                elegir(visibles[resaltado].valor);
            }
        } else if (e.key === 'Escape') {
            setAbierto(false);
            setTexto('');
        }
    };

    return (
        <div ref={contenedorRef} className="relative">
            <div
                className={`flex items-center gap-1 border rounded-[6px] transition-colors ${
                    disabled
                        ? 'bg-surface-muted border-border cursor-default'
                        : abierto
                            ? 'bg-surface border-primary ring-1 ring-primary'
                            : 'bg-surface border-border-strong'
                }`}
            >
                <input
                    type="text"
                    disabled={disabled}
                    value={abierto ? texto : (seleccionada?.etiqueta || '')}
                    placeholder={seleccionada ? seleccionada.etiqueta : placeholder}
                    onFocus={() => { if (!disabled) { calcularDireccion(); setAbierto(true); } }}
                    onChange={e => { calcularDireccion(); setTexto(e.target.value); setAbierto(true); }}
                    onKeyDown={alTeclear}
                    className="flex-1 min-w-0 text-[13px] px-3 py-2 bg-transparent text-fg outline-none placeholder:text-fg-muted disabled:cursor-default"
                />
                {seleccionada && !disabled && (
                    <button
                        type="button"
                        onClick={() => { onChange(''); setTexto(''); }}
                        title="Quitar selección"
                        className="p-1 text-fg-muted hover:text-danger transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
                <ChevronDown
                    size={15}
                    className={`mr-2 flex-shrink-0 text-fg-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
                />
            </div>

            {abierto && !disabled && (
                <ul
                    ref={listaRef}
                    className={`absolute z-30 w-full max-h-64 overflow-y-auto bg-surface border border-border rounded-[8px] shadow-lg py-1 ${
                        haciaArriba ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}
                >
                    {visibles.length === 0 ? (
                        <li className="px-3 py-2 text-[12px] text-fg-muted">{sinResultados}</li>
                    ) : (
                        visibles.map((o, idx) => (
                            <li
                                key={o.valor}
                                // onMouseDown y no onClick: el clic normal llega
                                // después del blur del input, que ya cerró la lista.
                                onMouseDown={e => { e.preventDefault(); elegir(o.valor); }}
                                onMouseEnter={() => setResaltado(idx)}
                                className={`px-3 py-1.5 cursor-pointer transition-colors ${
                                    idx === resaltado ? 'bg-primary-soft' : ''
                                } ${o.valor === value ? 'font-semibold' : ''}`}
                            >
                                <span className="block text-[13px] text-fg">{o.etiqueta}</span>
                                {(o.detalle || o.insignia) && (
                                    <span className="block text-[11px] text-fg-muted">
                                        {o.detalle}
                                        {o.insignia && (
                                            <>
                                                {o.detalle && ' · '}
                                                <span className={
                                                    o.insignia.tono === 'success' ? 'text-success font-medium'
                                                    : o.insignia.tono === 'danger' ? 'text-danger font-medium'
                                                    : 'text-warning font-medium'
                                                }>
                                                    {o.insignia.texto}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                )}
                            </li>
                        ))
                    )}
                    {filtradas.length > visibles.length && (
                        <li className="px-3 py-1.5 text-[11px] text-fg-muted border-t border-border mt-1">
                            {filtradas.length - visibles.length} más — afine la búsqueda
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
