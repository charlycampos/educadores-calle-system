import React, { useState, useRef, useEffect } from 'react';
import { GpsCapture } from '../../components/ui/GpsCapture';
import type { Coordenadas } from '../../utils/geo';
import { toast } from '../../components/ui/Toast';
import { useForm } from 'react-hook-form';
import { X, Search, ChevronLeft, Mic, MicOff, Calendar, MapPin, BookOpen, User, Camera, FileImage, PenTool } from 'lucide-react';
import { clsx } from 'clsx';
import { useNnaStore } from '../../store/nna.store';
import { createEntradaDiario, updateEntradaDiario } from '../../api/diario.api';
import { getToken } from '../../utils/auth';
import { INTERVENCION_API_URL, EXPEDIENTE_API_URL } from '../../config/api';

// ── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_ACTIVIDAD = [
    { value: 'CONSEJERIA', label: 'Consejería', icon: '💬', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
    { value: 'COORDINACION', label: 'Coordinación', icon: '🤝', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
    { value: 'VISITA', label: 'Visita Domiciliaria', icon: '🏠', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
    { value: 'RECORRIDO', label: 'Abordaje / Campo', icon: '🚶', color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
];

const getSpeechAPI = () =>
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface DiarioFormValues {
    fecha: string;
    ubicacion: string;
    actividad: string;
    tipoActividad: string;
    tipoInstitucion?: string;
    nombreInstitucion?: string;
    contactoInstitucion?: string;
    actividadProgramada?: string;
    estadoActividad?: string;
    horaInicio?: string;
    horaFin?: string;
    resultadosObtenidos?: string;
    observacionesTexto?: string;
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
    entradaEditar?: any | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

export const DiarioCampoModal: React.FC<Props> = ({ open, onClose, entradaEditar }) => {
    const { nnas, fetchAllNnas, registerDocument } = useNnaStore();

    // Pasos: 'buscar' | 'formulario'
    const [step, setStep]               = useState<'buscar' | 'formulario'>('buscar');
    const [search, setSearch]           = useState('');
    const [selected, setSelected]       = useState<NnaOption | null>(null);
    const [saving, setSaving]           = useState(false);
    const [savedOk, setSavedOk]         = useState(false);
    const [esInstitucional, setEsInstitucional] = useState(false);

    // Coordenadas GPS (opcionales)
    const [coords, setCoords] = useState<Coordenadas | null>(null);

    // Evidencias: Foto y Firma
    const [fotoB64, setFotoB64] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
            tipoActividad: 'CONSEJERIA',
            actividadProgramada: '',
            estadoActividad: 'PENDIENTE',
            horaInicio: '',
            horaFin: '',
            resultadosObtenidos: '',
            observacionesTexto: '',
        },
    });

    const narracion     = watch('actividad');
    const tipoActividad = watch('tipoActividad');
    const estadoActividadVal = watch('estadoActividad');
    const isPendiente = estadoActividadVal === 'PENDIENTE';

    // Cargar NNAs al abrir
    useEffect(() => {
        if (open) {
            fetchAllNnas();
            setSavedOk(false);

            if (entradaEditar) {
                if (entradaEditar.id) {
                    setStep('formulario');
                    setEsInstitucional(!!entradaEditar.esInstitucional);
                    if (entradaEditar.casoId || entradaEditar.nnaNombre) {
                        setSelected({
                            nnaId: 0,
                            casoId: entradaEditar.casoId || 0,
                            nombre: entradaEditar.nnaNombre
                        });
                    } else {
                        setSelected(null);
                    }
                    setFotoB64(entradaEditar.foto || null);
                    if (entradaEditar.latitud && entradaEditar.longitud) {
                        setCoords({ latitud: entradaEditar.latitud, longitud: entradaEditar.longitud, precision: 0 });
                    } else {
                        setCoords(null);
                    }
                    reset({
                        fecha: entradaEditar.fecha ? new Date(entradaEditar.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                        ubicacion: entradaEditar.ubicacion || '',
                        actividad: (entradaEditar.actividad === "(Pendiente de ejecución)" ? '' : (entradaEditar.actividad || '')),
                        tipoActividad: entradaEditar.tipoActividad || 'CONSEJERIA',
                        tipoInstitucion: entradaEditar.tipoInstitucion || 'OTRO',
                        nombreInstitucion: entradaEditar.nombreInstitucion || '',
                        contactoInstitucion: entradaEditar.contactoInstitucion || '',
                        actividadProgramada: entradaEditar.actividadProgramada || '',
                        estadoActividad: entradaEditar.estadoActividad || 'PENDIENTE',
                        horaInicio: entradaEditar.horaInicio || '',
                        horaFin: entradaEditar.horaFin || '',
                        resultadosObtenidos: entradaEditar.resultadosObtenidos || '',
                        observacionesTexto: entradaEditar.observacionesTexto || '',
                    });
                } else {
                    setStep('buscar');
                    setSearch('');
                    setSelected(null);
                    setFotoB64(null);
                    setCoords(null);
                    setEsInstitucional(false);
                    reset({
                        fecha: entradaEditar.fecha ? new Date(entradaEditar.fecha).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                        ubicacion: '',
                        actividad: '',
                        tipoActividad: 'CONSEJERIA',
                        actividadProgramada: '',
                        estadoActividad: 'PENDIENTE',
                        horaInicio: '',
                        horaFin: '',
                        resultadosObtenidos: '',
                        observacionesTexto: '',
                    });
                }
            } else {
                setStep('buscar');
                setSearch('');
                setSelected(null);
                setFotoB64(null);
                setCoords(null);
                setEsInstitucional(false);
                reset({
                    fecha: new Date().toISOString().slice(0, 16),
                    ubicacion: '',
                    actividad: '',
                    tipoActividad: 'CONSEJERIA',
                    actividadProgramada: '',
                    estadoActividad: 'PENDIENTE',
                    horaInicio: '',
                    horaFin: '',
                    resultadosObtenidos: '',
                    observacionesTexto: '',
                });
            }
        }
    }, [open, entradaEditar]);
 
    // Cargar la firma en el canvas si existe al abrir el formulario
    useEffect(() => {
        if (open && step === 'formulario') {
            const timer = setTimeout(() => {
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (entradaEditar?.firma) {
                            const img = new Image();
                            img.onload = () => {
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            };
                            img.src = entradaEditar.firma;
                        }
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open, entradaEditar, step]);

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

    // ── Manejo de Firma (Canvas) ──────────────────────────────────────────────

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b';

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

    // ── Guardar ────────────────────────────────────────────────────────────────

    const onSave = async (data: DiarioFormValues) => {
        if (data.estadoActividad !== 'PENDIENTE') {
            if (!data.actividad?.trim()) {
                toast.error('Debe ingresar la narración/desarrollo para guardar una actividad realizada, reprogramada o cancelada.');
                return;
            }
            if (!data.ubicacion?.trim()) {
                toast.error('Debe ingresar la ubicación para guardar una actividad realizada, reprogramada o cancelada.');
                return;
            }
        }
        if (!esInstitucional && !selected) return;
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

        // Serializamos metadatos en "observaciones" — foto y firma se guardan aparte como archivos
        const obsJson = JSON.stringify({
            tipoActividad: data.tipoActividad,
            fechaRegistro: new Date().toISOString(),
            esInstitucional: esInstitucional,
            tipoInstitucion: data.tipoInstitucion || undefined,
            nombreInstitucion: data.nombreInstitucion || undefined,
            contactoInstitucion: data.contactoInstitucion || undefined,
            actividadProgramada: data.actividadProgramada || undefined,
            estadoActividad: data.estadoActividad || 'PENDIENTE',
            horaInicio: data.horaInicio || undefined,
            horaFin: data.horaFin || undefined,
            resultadosObtenidos: data.resultadosObtenidos || undefined,
            observacionesTexto: data.observacionesTexto || undefined,
        });

        try {
            let created: any = null;
            const actividadVal = data.actividad?.trim() || '';
            const resolvedCasoId = selected?.casoId || entradaEditar?.casoId;

            if (entradaEditar?.id) {
                created = await updateEntradaDiario(entradaEditar.id, esInstitucional ? null : resolvedCasoId, {
                    fecha:        data.fecha,
                    ubicacion:    data.ubicacion,
                    actividad:    actividadVal || "(Pendiente de ejecución)",
                    observaciones: obsJson,
                    latitud:      coords?.latitud,
                    longitud:     coords?.longitud,
                });
            } else {
                created = await createEntradaDiario(esInstitucional ? null : resolvedCasoId, {
                    fecha:        data.fecha,
                    ubicacion:    data.ubicacion,
                    actividad:    actividadVal || "(Pendiente de ejecución)",
                    observaciones: obsJson,
                    latitud:      coords?.latitud,
                    longitud:     coords?.longitud,
                });
            }

            // Guardar foto y firma como archivos en el servidor
            const token = getToken();
            if (token && created?.id && (fotoB64 || signatureB64)) {
                try {
                    await fetch(`${INTERVENCION_API_URL}/diario/${created.id}/evidencias`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                            foto_b64: fotoB64 || undefined,
                            firma_b64: signatureB64 || undefined,
                        }),
                    });
                } catch {
                    // no bloquea el flujo principal
                }
            }

            // Enviar al expediente digital SOLO si el estado es REALIZADA y no es institucional
            const resolvedNna = nnas.find(n => n.casos?.some((c: any) => c.id === resolvedCasoId));
            const nnaId = resolvedNna?.id;

            if (token && data.estadoActividad === 'REALIZADA' && !esInstitucional && resolvedCasoId && nnaId) {
                try {
                    const pdfUrl = `${INTERVENCION_API_URL}/diario/${created.id}/pdf`;
                    const fechaStr = data.fecha.split('T')[0];

                    // 1. Pages check
                    const pagesRes = await fetch(`${INTERVENCION_API_URL}/diario/${created.id}/pdf/pages`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const pagesData = pagesRes.ok ? await pagesRes.json() : { pages: 1 };

                    // 2. Register in EXP_FOLIO
                    const folioRes = await fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${resolvedCasoId}/folio`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            tipo_documento: 'DIARIO_CAMPO',
                            titulo: `DIARIO DE CAMPO (${data.tipoActividad}) — ${fechaStr}`,
                            archivo_url: pdfUrl,
                            contenido_hash: `DIARIO-${created.id}`.substring(0, 40),
                        })
                    });

                    if (folioRes.ok) {
                        registerDocument({
                            nnaId: nnaId,
                            type: `DIARIO DE CAMPO (${data.tipoActividad})`,
                            code: `DIARIO-${created.id}`,
                            pages: pagesData.pages || 1,
                            nombreResponsable: 'Educador Responsable',
                            pdfUrl,
                            status: 'COMPLETO'
                        });
                    }
                } catch (expErr) {
                    console.error('Error al registrar folio en DiarioCampoModal:', expErr);
                }
            }

            setSavedOk(true);
            setTimeout(() => onClose(), 1400);
        } catch {
            toast.error('Error al guardar. Intente nuevamente.');
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
            <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">

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
                            {step === 'formulario' && (
                                esInstitucional ? (
                                    <p className="text-[11px] text-white/80 leading-tight truncate max-w-[220px]">Gestión / Coordinación Institucional</p>
                                ) : selected && (
                                    <p className="text-[11px] text-white/80 leading-tight truncate max-w-[220px]">{selected.nombre}</p>
                                )
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
                        <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">
                            <p className="text-xs text-gray-500">Selecciona el NNA para registrar o activa la casilla para coordinaciones.</p>
                            
                            {/* Tarjeta de Checkbox para Institución */}
                            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-green-50/30 hover:border-green-300 cursor-pointer transition-all select-none">
                                <input
                                    type="checkbox"
                                    checked={esInstitucional}
                                    onChange={(e) => {
                                        setEsInstitucional(e.target.checked);
                                        if (e.target.checked) {
                                            setSelected(null);
                                        }
                                    }}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-400"
                                />
                                <div className="text-left">
                                    <p className="text-xs font-bold text-gray-700">Registrar Coordinación / Gestión Institucional</p>
                                    <p className="text-[10px] text-gray-400">Coordinación con colegios, postas, DEMUNA u otras redes (sin NNA específico).</p>
                                </div>
                            </label>

                            {!esInstitucional && (
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
                            )}
                        </div>

                        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1.5 flex flex-col">
                            {esInstitucional ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-3xl">
                                        🤝
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-750">Modo: Gestión Institucional</p>
                                        <p className="text-xs text-gray-400 max-w-xs mt-1">Registrarás una actividad realizada con una entidad pública, privada o comunitaria de la red.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('tipoActividad', 'COORDINACION');
                                            setStep('formulario');
                                        }}
                                        className="px-6 py-3 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        Continuar a Formulario ➔
                                    </button>
                                </div>
                            ) : opciones.length === 0 ? (
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
                                                'px-3 py-2 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all active:scale-95 text-center',
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

                            {/* Campos de Institución (Solo si esInstitucional) */}
                            {esInstitucional && (
                                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 space-y-3">
                                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mb-1">
                                        🏢 Datos de la Institución
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                Tipo de Institución
                                            </label>
                                            <select
                                                {...register('tipoInstitucion', { required: esInstitucional })}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none font-medium text-gray-700"
                                            >
                                                <option value="SALUD">🏥 Centro de Salud / Hospital</option>
                                                <option value="EDUCACION">🏫 Colegio / I.E.</option>
                                                <option value="JUSTICIA">⚖️ DEMUNA / Fiscalía / Juez</option>
                                                <option value="SEGURIDAD">👮 Comisaría / PNP</option>
                                                <option value="MUNICIPALIDAD">🏛️ Municipalidad / Gob. Local</option>
                                                <option value="ONG">🤝 ONG / Iglesia / Privado</option>
                                                <option value="OTRO">✏️ Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                                Nombre de la Entidad
                                            </label>
                                            <input
                                                placeholder="Ej: I.E. Mercedes Cabello"
                                                {...register('nombreInstitucion', { required: esInstitucional })}
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                            Contacto / Cargo del Representante
                                        </label>
                                        <input
                                            placeholder="Ej: Sra. Directora Carmen Rivas"
                                            {...register('contactoInstitucion')}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

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
                                        {...register('ubicacion', { required: !isPendiente })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                    />
                                    <GpsCapture coords={coords} onChange={setCoords} />
                                </div>
                            </div>

                            {/* Horas de Ejecución (Solo si ya no está Pendiente) */}
                            {!isPendiente && (
                                <div className="grid grid-cols-2 gap-3 bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/50">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                            🕒 Hora Inicio Real
                                        </label>
                                        <input
                                            type="time"
                                            {...register('horaInicio', { required: !isPendiente })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none font-medium text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                                            🕒 Hora Fin Real
                                        </label>
                                        <input
                                            type="time"
                                            {...register('horaFin', { required: !isPendiente })}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none font-medium text-gray-700"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Actividad Programada y Estado */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                        Actividad Programada (Planificación)
                                    </label>
                                    <input
                                        placeholder="Ej: Consejería individual sobre pautas de crianza..."
                                        {...register('actividadProgramada')}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-400 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                        Estado Actividad
                                    </label>
                                    <select
                                        {...register('estadoActividad')}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-green-400 outline-none font-medium text-gray-700"
                                    >
                                        <option value="PENDIENTE">📅 Pendiente</option>
                                        <option value="REALIZADA">🟢 Realizada</option>
                                        <option value="REPROGRAMADA">🟡 Reprogramada</option>
                                        <option value="NO_REALIZADA">🔴 No Realizada</option>
                                    </select>
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
                                        rows={5}
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
                            </div>

                            {/* Resultados Obtenidos */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                    Resultados Obtenidos (Logros / Acuerdos)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Describa los acuerdos, compromisos o resultados logrados..."
                                    {...register('resultadosObtenidos')}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                                />
                            </div>

                            {/* Observaciones */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                                    Observaciones Adicionales
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Comentarios adicionales u observaciones sobre el desarrollo de la sesión..."
                                    {...register('observacionesTexto')}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none resize-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                                />
                            </div>

                            {/* Evidencias: Foto y Firma */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                {/* Foto Evidencia */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">
                                        <Camera size={12} className="inline mr-1" /> Foto / Documento Evidencia
                                    </label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 flex flex-col items-center justify-center bg-gray-50 min-h-[100px] relative overflow-hidden">
                                        {fotoB64 ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                                <img src={fotoB64} alt="Evidencia" className="max-h-[70px] rounded border" />
                                                <button type="button" onClick={() => setFotoB64(null)} className="mt-1 text-[10px] font-bold text-red-500 hover:underline">Quitar</button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                                                <FileImage className="text-gray-300 mb-0.5" size={20} />
                                                <span className="text-[10px] font-bold text-gray-500">Subir foto</span>
                                                <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Firma Digital */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase">
                                            <PenTool size={12} className="inline mr-1" /> {esInstitucional ? 'Firma o Sello Institucional' : 'Firma Tutor / NNA'}
                                        </label>
                                        <button type="button" onClick={clearSignature} className="text-[10px] font-bold text-gray-400 hover:text-red-500">Limpiar</button>
                                    </div>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-white h-[100px]">
                                        <canvas
                                            ref={canvasRef}
                                            width={240}
                                            height={100}
                                            onMouseDown={startDrawing}
                                            onMouseMove={draw}
                                            onMouseUp={stopDrawing}
                                            onMouseLeave={stopDrawing}
                                            onTouchStart={startDrawing}
                                            onTouchMove={draw}
                                            onTouchEnd={stopDrawing}
                                            className="w-full h-full cursor-crosshair touch-none"
                                        />
                                    </div>
                                </div>
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
                                    disabled={saving || (!isPendiente && !narracion?.trim())}
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
