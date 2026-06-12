import React, { useState, useRef, useEffect } from 'react';
import { GpsCapture } from '../../../components/ui/GpsCapture';
import { urlMapa, type Coordenadas } from '../../../utils/geo';
import { toast } from '../../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { Plus, Mic, MicOff, Trash2, Calendar, Clock, MapPin, BookOpen, Camera, FileImage, PenTool } from 'lucide-react';
import { clsx } from 'clsx';
import { getDiarioByCaso, createEntradaDiario, deleteEntradaDiario, type EntradaDiario } from '../../../api/diario.api';

// ── Constantes de estado ──────────────────────────────────────────────────────

const TIPOS_ACTIVIDAD = [
    { value: 'CONSEJERIA', label: 'Consejería', icon: '💬', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
    { value: 'COORDINACION', label: 'Coordinación', icon: '🤝', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
    { value: 'VISITA', label: 'Visita Domiciliaria', icon: '🏠', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
    { value: 'RECORRIDO', label: 'Abordaje / Campo', icon: '🚶', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
];

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
    tipoActividad: string;
}

export const DiarioCampoSection: React.FC<Props> = ({ casoId }) => {
    const [entries, setEntries]         = useState<EntradaDiario[]>([]);
    const [showForm, setShowForm]       = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [interim, setInterim]         = useState('');
    const [saving, setSaving]           = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    // Evidencias: Foto y Firma
    const [fotoB64, setFotoB64] = useState<string | null>(null);
    const [coords, setCoords] = useState<Coordenadas | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const recognitionRef = useRef<any>(null);
    const hasSpeech = !!getSpeechAPI();

    const { register, handleSubmit, watch, setValue, reset, getValues } = useForm<DiarioFormValues>({
        defaultValues: {
            fecha:        new Date().toISOString().slice(0, 16),
            ubicacion:    '',
            actividad:    '',
            tipoActividad: 'CONSEJERIA',
        },
    });

    const narracion     = watch('actividad');
    const tipoActividad = watch('tipoActividad');

    // ── Carga de entradas ────────────────────────────────────────────────────

    const load = async () => {
        try {
            const data = await getDiarioByCaso(casoId);
            setEntries(data);
        } catch { /* silencioso */ }
    };

    useEffect(() => { load(); }, [casoId]);

    // Calcular cuántas actividades se han registrado HOY
    const entriesToday = entries.filter(e => {
        const d = new Date(e.fecha);
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    }).length;

    // ── Manejo de Firma (Canvas) ──────────────────────────────────────────────

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b'; // Slate 800

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    // ── Carga de Foto ────────────────────────────────────────────────────────

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setFotoB64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    // ── Guardar ──────────────────────────────────────────────────────────────

    const onSave = async (data: DiarioFormValues) => {
        if (!data.actividad.trim()) return;
        setSaving(true);

        // Obtener firma del canvas
        let signatureB64 = '';
        const canvas = canvasRef.current;
        if (canvas) {
            const blank = document.createElement('canvas');
            blank.width = canvas.width;
            blank.height = canvas.height;
            if (canvas.toDataURL() !== blank.toDataURL()) {
                signatureB64 = canvas.toDataURL();
            }
        }

        // Serializamos tipoActividad, foto y firma en "observaciones" como JSON
        const obsJson = JSON.stringify({
            tipoActividad: data.tipoActividad,
            foto: fotoB64 || undefined,
            firma: signatureB64 || undefined,
            fechaRegistro: new Date().toISOString()
        });

        try {
            await createEntradaDiario(casoId, {
                fecha:        data.fecha,
                ubicacion:    data.ubicacion,
                actividad:    data.actividad,
                observaciones: obsJson, // Guardamos la metadata aquí
                latitud:      coords?.latitud,
                longitud:     coords?.longitud,
            });

            reset({
                fecha:        new Date().toISOString().slice(0, 16),
                ubicacion:    '',
                actividad:    '',
                tipoActividad: 'CONSEJERIA',
            });
            setCoords(null);
            setFotoB64(null);
            clearSignature();
            setShowForm(false);
            await load();
        } catch {
            toast.error('Error al guardar el registro.');
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
            toast.error('Error al eliminar.');
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

            {/* Header y Tracker Diario */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                        <BookOpen size={20} className="text-green-600" /> Diario de Campo
                    </h2>
                    {/* Contador de Progreso Diario */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold text-gray-500">Progreso de hoy:</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4].map((num) => (
                                <div
                                    key={num}
                                    className={clsx(
                                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-300",
                                        entriesToday >= num
                                            ? "bg-green-600 border-green-600 text-white shadow-sm shadow-green-100 scale-105"
                                            : "bg-white border-gray-300 text-gray-400"
                                    )}
                                >
                                    {num}
                                </div>
                            ))}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium ml-1">
                            ({entriesToday} de 4 actividades registradas)
                        </span>
                    </div>
                </div>

                {!showForm && (
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-green-700 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> Nueva entrada
                    </button>
                )}
            </div>

            {/* ── FORMULARIO ────────────────────────────────────────────── */}
            {showForm && (
                <form
                    onSubmit={handleSubmit(onSave)}
                    className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden"
                >
                    <div className="px-4 py-3 bg-green-600 flex items-center justify-between">
                        <span className="text-white font-bold text-sm">Nueva entrada de campo</span>
                        <button type="button" onClick={() => setShowForm(false)}
                            className="text-white/80 hover:text-white text-xl leading-none">×</button>
                    </div>

                    <div className="p-4 space-y-4">
                        
                        {/* Selector de Tipo de Actividad */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                                Tipo de Actividad Obligatoria
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {TIPOS_ACTIVIDAD.map(({ value, label, icon, color }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setValue('tipoActividad', value)}
                                        className={clsx(
                                            'px-3 py-2.5 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 text-center',
                                            tipoActividad === value
                                                ? 'bg-green-50 border-green-500 text-green-700 ring-2 ring-green-100 scale-102 font-black'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        )}
                                    >
                                        <span className="text-lg">{icon}</span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

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
                                <GpsCapture coords={coords} onChange={setCoords} />
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
                                            : <><Mic size={14} /> Dictar por voz</>
                                        }
                                    </button>
                                )}
                            </div>

                            <div className="relative">
                                <textarea
                                    rows={5}
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

                        {/* Evidencias: Foto y Firma */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                            
                            {/* Evidencia Fotográfica */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                                    <Camera size={12} className="inline mr-1" /> Evidencia Fotográfica (Foto / Acta)
                                </label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center bg-gray-50 min-h-[120px] relative overflow-hidden">
                                    {fotoB64 ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center">
                                            <img src={fotoB64} alt="Evidencia" className="max-h-[100px] rounded-lg shadow-sm border" />
                                            <button
                                                type="button"
                                                onClick={() => setFotoB64(null)}
                                                className="mt-2 text-xs font-bold text-red-500 hover:underline"
                                            >
                                                Quitar foto
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                            <FileImage className="text-gray-300 mb-1" size={24} />
                                            <span className="text-[11px] font-bold text-gray-500">Subir foto o documento</span>
                                            <span className="text-[9px] text-gray-400 mt-0.5">Formatos: JPG, PNG</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFotoChange}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Firma Digital del Tutor/NNA */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase">
                                        <PenTool size={12} className="inline mr-1" /> Firma del Tutor / NNA
                                    </label>
                                    <button
                                        type="button"
                                        onClick={clearSignature}
                                        className="text-[10px] font-bold text-gray-400 hover:text-red-500"
                                    >
                                        Limpiar firma
                                    </button>
                                </div>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-[120px]">
                                    <canvas
                                        ref={canvasRef}
                                        width={280}
                                        height={120}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-full cursor-crosshair bg-white touch-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botón guardar */}
                        <button
                            type="submit"
                            disabled={saving || !narracion?.trim()}
                            className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            {saving ? 'Guardando...' : 'Guardar y Completar Actividad'}
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

                    // Intentar parsear las observaciones como JSON
                    let tipoActInfo = undefined;
                    let fotoEvidencia = undefined;
                    let firmaEvidencia = undefined;
                    let obsTexto = entry.observaciones;

                    if (entry.observaciones) {
                        try {
                            const parsed = JSON.parse(entry.observaciones);
                            if (parsed && typeof parsed === 'object') {
                                tipoActInfo = TIPOS_ACTIVIDAD.find(t => t.value === parsed.tipoActividad);
                                fotoEvidencia = parsed.foto;
                                firmaEvidencia = parsed.firma;
                                obsTexto = parsed.comentarios || '';
                            }
                        } catch {
                            // No es JSON
                        }
                    }

                    return (
                        <div key={entry.id}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                            {/* Cabecera de la tarjeta */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
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
                                                {entry.latitud != null && entry.longitud != null && (
                                                    <a href={urlMapa(entry.latitud, entry.longitud)} target="_blank" rel="noreferrer"
                                                        className="text-blue-500 hover:underline font-bold ml-1 flex-shrink-0">
                                                        Ver en mapa
                                                    </a>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Eliminar */}
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
                                
                                {/* Tipo de Actividad */}
                                <div className="flex flex-wrap gap-2">
                                    {tipoActInfo ? (
                                        <span className={clsx('text-[11px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1', tipoActInfo.color)}>
                                            <span>{tipoActInfo.icon}</span>
                                            <span>{tipoActInfo.label}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-gray-50 border-gray-200 text-gray-600">
                                            📝 Actividad
                                        </span>
                                    )}
                                </div>

                                {/* Narración */}
                                {entry.actividad && (
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {entry.actividad}
                                    </p>
                                )}

                                {/* Evidencias en Timeline (Foto y Firma lado a lado si existen) */}
                                {(fotoEvidencia || firmaEvidencia) && (
                                    <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                                        {fotoEvidencia && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-400 font-bold mb-1 uppercase tracking-wide">Foto Evidencia</span>
                                                <img src={fotoEvidencia} alt="Foto Adjunta" className="max-h-[80px] rounded border bg-white object-contain" />
                                            </div>
                                        )}
                                        {firmaEvidencia && (
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-gray-400 font-bold mb-1 uppercase tracking-wide">Firma Recibida</span>
                                                <img src={firmaEvidencia} alt="Firma" className="max-h-[80px] rounded border bg-white object-contain" />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {obsTexto && (
                                    <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                                        {obsTexto}
                                    </p>
                                )}

                                <p className="text-[10px] text-gray-400 text-right">
                                    Registrado por: {entry.creadoPor?.nombreCompleto || 'Educador'}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
