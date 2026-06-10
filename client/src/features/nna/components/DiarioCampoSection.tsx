import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Mic, MicOff, Trash2, Calendar, Clock, MapPin, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { getDiarioByCaso, createEntradaDiario, deleteEntradaDiario, type EntradaDiario } from '../../../api/diario.api';

// ── Constantes de estado ──────────────────────────────────────────────────────

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

const ESTADO_FISICO_DISPLAY: Record<string, { label: string; cls: string }> = {
    BUENO:   { label: 'Bueno',   cls: 'bg-green-50 border-green-200 text-green-700' },
    REGULAR: { label: 'Regular', cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    MALO:    { label: 'Malo',    cls: 'bg-red-50 border-red-200 text-red-700' },
};

// ── Speech Recognition helper ─────────────────────────────────────────────────

const getSpeechAPI = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
    casoId: number;
}

interface DiarioFormValues {
    fecha: string;
    ubicacion: string;
    actividad: string;
    estadoFisico: string;
    estadoAnimo: string;
}

export const DiarioCampoSection: React.FC<Props> = ({ casoId }) => {
    const [entries, setEntries]         = useState<EntradaDiario[]>([]);
    const [showForm, setShowForm]       = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim]         = useState('');
    const [saving, setSaving]           = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const recognitionRef = useRef<any>(null);
    const hasSpeech = !!getSpeechAPI();

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

    // ── Carga de entradas ────────────────────────────────────────────────────

    const load = async () => {
        try {
            const data = await getDiarioByCaso(casoId);
            setEntries(data);
        } catch { /* silencioso */ }
    };

    useEffect(() => { load(); }, [casoId]);

    // ── Guardar ──────────────────────────────────────────────────────────────

    const onSave = async (data: DiarioFormValues) => {
        if (!data.actividad.trim()) return;
        setSaving(true);
        try {
            await createEntradaDiario(casoId, {
                fecha:        data.fecha,
                ubicacion:    data.ubicacion,
                actividad:    data.actividad,
                estadoFisico: data.estadoFisico,
                estadoAnimo:  data.estadoAnimo,
            });
            reset({
                fecha:        new Date().toISOString().slice(0, 16),
                ubicacion:    '',
                actividad:    '',
                estadoFisico: 'BUENO',
                estadoAnimo:  'TRANQUILO',
            });
            setShowForm(false);
            await load();
        } catch {
            alert('Error al guardar el registro.');
        } finally {
            setSaving(false);
        }
    };

    // ── Eliminar ─────────────────────────────────────────────────────────────

    const onDelete = async (id: number) => {
        try {
            await deleteEntradaDiario(id);
            setConfirmDelete(null);
            await load();
        } catch {
            alert('Error al eliminar.');
        }
    };

    // ── Voice recognition ────────────────────────────────────────────────────

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechAPI = getSpeechAPI();
        if (!SpeechAPI) return;

        const rec = new SpeechAPI();
        rec.lang             = 'es-PE';
        rec.continuous       = true;
        rec.interimResults   = true;
        recognitionRef.current = rec;

        rec.onstart = () => setIsListening(true);

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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                    <BookOpen size={20} className="text-green-600" /> Diario de Campo
                </h2>
                {!showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-green-700 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> Nueva entrada
                    </button>
                )}
            </div>

            {/* ── FORMULARIO ────────────────────────────────────────────── */}
            {showForm && (
                <form
                    onSubmit={handleSubmit(onSave)}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                    <div className="px-4 py-3 bg-green-600 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Nueva entrada de campo</span>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="text-white/80 hover:text-white text-xl leading-none">×</button>
                    </div>

                    <div className="p-4 space-y-4">

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
                                    <MapPin size={11} className="inline mr-1" />Ubicación del encuentro
                                </label>
                                <input
                                    placeholder="Ej: Plaza de Armas, Jr. Comercio..."
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
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setValue('estadoFisico', value)}
                                        className={clsx(
                                            'px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all active:scale-95',
                                            estadoFisico === value
                                                ? cls + ' ring-2 ring-offset-1 ring-current scale-105'
                                                : 'bg-white border-gray-200 text-gray-500'
                                        )}
                                    >
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
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setValue('estadoAnimo', value)}
                                        className={clsx(
                                            'px-3 py-2 rounded-xl border-2 font-bold text-sm flex items-center gap-1.5 transition-all active:scale-95',
                                            estadoAnimo === value
                                                ? 'bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-offset-1 ring-blue-400 scale-105'
                                                : 'bg-white border-gray-200 text-gray-500'
                                        )}
                                    >
                                        <span>{emoji}</span>
                                        <span className="hidden sm:inline">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Narración con voz */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[11px] font-bold text-gray-500 uppercase">
                                    Narración / Descripción de la atención
                                </label>
                                {hasSpeech && (
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        className={clsx(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95',
                                            isListening
                                                ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        )}
                                    >
                                        {isListening
                                            ? <><MicOff size={14} /> Detener</>
                                            : <><Mic size={14} /> Dictar</>
                                        }
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <textarea
                                    rows={6}
                                    value={narracion}
                                    onChange={(e) => setValue('actividad', e.target.value)}
                                    placeholder={isListening
                                        ? '🎤 Escuchando... hable ahora'
                                        : 'Describa lo observado durante la intervención de campo...'}
                                    className={clsx(
                                        'w-full px-3 py-3 border-2 rounded-xl text-sm outline-none resize-none transition-all leading-relaxed',
                                        isListening
                                            ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-300'
                                            : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
                                    )}
                                />
                                {/* Texto provisional de voz */}
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

                        {/* Botón guardar */}
                        <button
                            type="submit"
                            disabled={saving || !narracion?.trim()}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl shadow-sm hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {saving ? 'Guardando...' : 'Guardar registro'}
                        </button>
                    </div>
                </form>
            )}

            {/* ── TIMELINE ──────────────────────────────────────────────── */}
            <div className="space-y-3">
                {entries.length === 0 && !showForm && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <BookOpen size={32} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 font-bold text-sm">Sin registros aún</p>
                        <p className="text-gray-400 text-xs mt-1">Toca "Nueva entrada" para comenzar</p>
                    </div>
                )}

                {entries.map((entry) => {
                    const fecha = new Date(entry.fecha);
                    const fisico = ESTADO_FISICO_DISPLAY[entry.estadoFisico || ''];
                    const animo  = ESTADO_ANIMO.find(a => a.value === entry.estadoAnimo);

                    return (
                        <div key={entry.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                            {/* Cabecera de la tarjeta */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 flex-wrap">
                                            <Calendar size={11} />
                                            {fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            <Clock size={11} />
                                            {fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {entry.ubicacion && (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                                                <MapPin size={10} /> {entry.ubicacion}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Eliminar — visible siempre en móvil */}
                                {confirmDelete === entry.id ? (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[11px] text-red-600 font-bold">¿Eliminar?</span>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(entry.id!)}
                                            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg"
                                        >Sí</button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(null)}
                                            className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg"
                                        >No</button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(entry.id!)}
                                        className="p-2 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>

                            {/* Cuerpo */}
                            <div className="px-4 py-3 space-y-3">
                                {/* Badges estado */}
                                <div className="flex gap-2 flex-wrap">
                                    {fisico && (
                                        <span className={clsx('text-[11px] font-bold px-2.5 py-1 rounded-lg border', fisico.cls)}>
                                            Físico: {fisico.label}
                                        </span>
                                    )}
                                    {animo && (
                                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-blue-50 border-blue-200 text-blue-700">
                                            {animo.emoji} {animo.label}
                                        </span>
                                    )}
                                </div>

                                {/* Narración */}
                                {entry.actividad && (
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {entry.actividad}
                                    </p>
                                )}

                                {entry.observaciones && (
                                    <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                                        {entry.observaciones}
                                    </p>
                                )}

                                <p className="text-[10px] text-gray-400 text-right">
                                    {entry.creadoPor?.nombreCompleto || 'Educador'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
