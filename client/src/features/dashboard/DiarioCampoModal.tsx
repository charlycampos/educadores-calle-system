import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Search, ChevronLeft, Mic, MicOff, Calendar, MapPin, BookOpen, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useNnaStore } from '../../store/nna.store';
import { createEntradaDiario } from '../../api/diario.api';

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADO_FISICO = [
    { value: 'BUENO',   label: 'Bueno',   cls: 'bg-green-100 border-green-400 text-green-800' },
    { value: 'REGULAR', label: 'Regular', cls: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
    { value: 'MALO',    label: 'Malo',    cls: 'bg-red-100 border-red-400 text-red-800' },
];

const ESTADO_ANIMO = [
    { value: 'TRANQUILO', label: 'Tranquilo', emoji: '😌' },
    { value: 'ALEGRE',    label: 'Alegre',    emoji: '😊' },
    { value: 'TRISTE',    label: 'Triste',    emoji: '😢' },
    { value: 'AGRESIVO',  label: 'Agresivo',  emoji: '😡' },
    { value: 'ANSIOSO',   label: 'Ansioso',   emoji: '😰' },
];

const getSpeechAPI = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DiarioFormValues {
    fecha: string;
    ubicacion: string;
    actividad: string;
    estadoFisico: string;
    estadoAnimo: string;
}

interface NnaOption {
    nnaId: number;
    casoId: number;
    nombre: string;
    codigoCaso?: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const DiarioCampoModal: React.FC<Props> = ({ open, onClose }) => {
    const { nnas, fetchAllNnas } = useNnaStore();

    // Pasos: 'buscar' | 'formulario'
    const [step, setStep]               = useState<'buscar' | 'formulario'>('buscar');
    const [search, setSearch]           = useState('');
    const [selected, setSelected]       = useState<NnaOption | null>(null);
    const [saving, setSaving]           = useState(false);
    const [savedOk, setSavedOk]         = useState(false);

    // Voz
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim]         = useState('');
    const recognitionRef                = useRef<any>(null);
    const hasSpeech                     = !!getSpeechAPI();

    const { register, handleSubmit, watch, setValue, reset, getValues } = useForm<DiarioFormValues>({
        defaultValues: {
            fecha:        new Date().toISOString().slice(0, 16),
            ubicacion:    '',
            actividad:    '',
            estadoFisico: 'BUENO',
            estadoAnimo:  'TRANQUILO',
        },
    });

    const narracion    = watch('actividad');
    const estadoFisico = watch('estadoFisico');
    const estadoAnimo  = watch('estadoAnimo');

    // Cargar NNAs al abrir
    useEffect(() => {
        if (open) {
            fetchAllNnas();
            setStep('buscar');
            setSearch('');
            setSelected(null);
            setSavedOk(false);
            reset({
                fecha: new Date().toISOString().slice(0, 16),
                ubicacion: '',
                actividad: '',
                estadoFisico: 'BUENO',
                estadoAnimo: 'TRANQUILO',
            });
        }
    }, [open]);

    // Detener micrófono al cerrar
    useEffect(() => {
        if (!open) {
            recognitionRef.current?.stop();
            setIsListening(false);
            setInterim('');
        }
    }, [open]);

    // NNAs con caso activo, filtrados por búsqueda
    const opciones: NnaOption[] = nnas
        .filter(nna => {
            const casoActivo = nna.casos?.find((c: any) => c.estado !== 'CERRADO');
            if (!casoActivo) return false;
            const nombreCompleto = `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`.toLowerCase();
            const dni = (nna.numeroDoc || '').toLowerCase();
            const term = search.toLowerCase();
            return !term || nombreCompleto.includes(term) || dni.includes(term);
        })
        .slice(0, 20)
        .map(nna => {
            const casoActivo = nna.casos!.find((c: any) => c.estado !== 'CERRADO');
            return {
                nnaId: nna.id,
                casoId: casoActivo!.id,
                nombre: `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`.trim(),
                codigoCaso: casoActivo!.codigoCaso || casoActivo!.codigo,
            };
        });

    const handleSelectNna = (opcion: NnaOption) => {
        setSelected(opcion);
        setStep('formulario');
    };

    // ── Guardar ────────────────────────────────────────────────────────────────

    const onSave = async (data: DiarioFormValues) => {
        if (!data.actividad.trim() || !selected) return;
        setSaving(true);
        try {
            await createEntradaDiario(selected.casoId, {
                fecha:        data.fecha,
                ubicacion:    data.ubicacion,
                actividad:    data.actividad,
                estadoFisico: data.estadoFisico,
                estadoAnimo:  data.estadoAnimo,
            });
            setSavedOk(true);
            setTimeout(() => onClose(), 1400);
        } catch {
            alert('Error al guardar. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    // ── Voz ────────────────────────────────────────────────────────────────────

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }
        const SpeechAPI = getSpeechAPI();
        if (!SpeechAPI) return;
        const rec = new SpeechAPI();
        rec.lang           = 'es-PE';
        rec.continuous     = true;
        rec.interimResults = true;
        recognitionRef.current = rec;
        rec.onstart  = () => setIsListening(true);
        rec.onresult = (e: any) => {
            let finalText = '';
            let interimText = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t;
                else interimText += t;
            }
            if (finalText) {
                const current = getValues('actividad') || '';
                setValue('actividad', current.trimEnd() + (current ? ' ' : '') + finalText);
                setInterim('');
            } else {
                setInterim(interimText);
            }
        };
        rec.onerror = () => { setIsListening(false); setInterim(''); };
        rec.onend   = () => { setIsListening(false); setInterim(''); };
        rec.start();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Fondo */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Panel */}
            <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-green-600 text-white flex-shrink-0">
                    <div className="flex items-center gap-2">
                        {step === 'formulario' && (
                            <button type="button" onClick={() => setStep('buscar')}
                                className="p-1 rounded-lg hover:bg-white/20 transition-colors mr-1">
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        <BookOpen size={18} />
                        <div>
                            <p className="font-bold text-sm leading-tight">Diario de Campo</p>
                            {step === 'formulario' && selected && (
                                <p className="text-[11px] text-white/80 leading-tight truncate max-w-[220px]">{selected.nombre}</p>
                            )}
                        </div>
                    </div>
                    <button type="button" onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Paso 1: Buscar NNA ── */}
                {step === 'buscar' && (
                    <div className="flex flex-col overflow-hidden flex-1">
                        <div className="px-4 pt-4 pb-2 flex-shrink-0">
                            <p className="text-xs text-gray-500 mb-3">Selecciona el NNA para registrar una nueva entrada de campo.</p>
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar por nombre o DNI..."
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1.5">
                            {opciones.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    <User size={28} className="mx-auto mb-2 opacity-40" />
                                    {search ? 'No se encontraron resultados.' : 'No tienes casos activos asignados.'}
                                </div>
                            ) : (
                                opciones.map(op => (
                                    <button
                                        key={op.casoId}
                                        type="button"
                                        onClick={() => handleSelectNna(op)}
                                        className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all flex items-center gap-3 group"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                                            {op.nombre.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-gray-800 truncate">{op.nombre}</p>
                                            {op.codigoCaso && (
                                                <p className="text-[11px] text-gray-400 font-mono">{op.codigoCaso}</p>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── Paso 2: Formulario ── */}
                {step === 'formulario' && (
                    <form onSubmit={handleSubmit(onSave)}
                        className="flex flex-col overflow-hidden flex-1">

                        <div className="overflow-y-auto flex-1 p-4 space-y-4">

                            {/* Fecha + Ubicación */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                        <Calendar size={11} className="inline mr-1" />Fecha y hora
                                    </label>
                                    <input
                                        type="datetime-local"
                                        {...register('fecha', { required: true })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                        <MapPin size={11} className="inline mr-1" />Ubicación
                                    </label>
                                    <input
                                        placeholder="Ej: Plaza de Armas..."
                                        {...register('ubicacion', { required: true })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Estado físico */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Estado físico observado</label>
                                <div className="flex gap-2 flex-wrap">
                                    {ESTADO_FISICO.map(({ value, label, cls }) => (
                                        <button key={value} type="button"
                                            onClick={() => setValue('estadoFisico', value)}
                                            className={clsx(
                                                'px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all active:scale-95',
                                                estadoFisico === value
                                                    ? cls + ' ring-2 ring-offset-1 ring-current scale-105'
                                                    : 'bg-white border-gray-200 text-gray-500'
                                            )}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Estado ánimo */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">Estado de ánimo</label>
                                <div className="flex gap-2 flex-wrap">
                                    {ESTADO_ANIMO.map(({ value, label, emoji }) => (
                                        <button key={value} type="button"
                                            onClick={() => setValue('estadoAnimo', value)}
                                            className={clsx(
                                                'px-3 py-2 rounded-xl border-2 font-bold text-sm flex items-center gap-1.5 transition-all active:scale-95',
                                                estadoAnimo === value
                                                    ? 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-offset-1 ring-blue-400 scale-105'
                                                    : 'bg-white border-gray-200 text-gray-500'
                                            )}>
                                            <span>{emoji}</span>
                                            <span className="hidden sm:inline">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Narración */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase">
                                        Narración / Descripción
                                    </label>
                                    {hasSpeech && (
                                        <button type="button" onClick={toggleListening}
                                            className={clsx(
                                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95',
                                                isListening
                                                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            )}>
                                            {isListening ? <><MicOff size={14} /> Detener</> : <><Mic size={14} /> Dictar</>}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        rows={6}
                                        value={narracion}
                                        onChange={e => setValue('actividad', e.target.value)}
                                        placeholder={isListening
                                            ? '🎤 Escuchando... hable ahora'
                                            : 'Describa lo observado durante la intervención...'}
                                        className={clsx(
                                            'w-full px-3 py-3 border-2 rounded-xl text-sm outline-none resize-none transition-all leading-relaxed',
                                            isListening
                                                ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                                                : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
                                        )}
                                    />
                                    {interim && (
                                        <div className="absolute bottom-2 left-3 right-3 text-xs text-red-400 italic pointer-events-none truncate">
                                            {interim}…
                                        </div>
                                    )}
                                </div>
                                {hasSpeech && (
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Toca <strong>Dictar</strong> y habla — el texto aparece automáticamente.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Botón guardar — fijo en el footer */}
                        <div className="flex-shrink-0 px-4 pb-5 pt-2 border-t border-gray-100 bg-white">
                            {savedOk ? (
                                <div className="w-full py-3 bg-green-100 text-green-700 font-bold rounded-xl text-center text-sm">
                                    ✓ Registro guardado correctamente
                                </div>
                            ) : (
                                <button type="submit"
                                    disabled={saving || !narracion?.trim()}
                                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                    {saving ? 'Guardando...' : 'Guardar registro'}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
