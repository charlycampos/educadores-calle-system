import React, { useState, useEffect } from 'react';
import { Plus, Calendar, FileDown, Users, MapPin, X, Home, ClipboardCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Formato12Print } from './Formato12Print';
import { useNnaStore } from '../../../store/nna.store';
import { INTERVENCION_API_URL } from '../../../config/api';

const LUGAR_OPTIONS = [
    { value: 'DOMICILIO',         label: 'Domicilio',       icon: '🏠' },
    { value: 'TRABAJO',           label: 'Trabajo',          icon: '💼' },
    { value: 'CENTRO_REFERENCIA', label: 'Centro de Ref.',   icon: '🏢' },
    { value: 'CALLE',             label: 'Calle',            icon: '🚶' },
];

const EVALUACION_OPTIONS = [
    { value: 'FAVORABLE',    label: 'Favorable',    color: '#10b981', bgSoft: 'rgba(16, 185, 129, 0.1)', borderCol: 'border-emerald-500/30', description: 'Progreso positivo detectado', icon: '✓' },
    { value: 'EN_PROCESO',   label: 'En Proceso',   color: '#f59e0b', bgSoft: 'rgba(245, 158, 11, 0.1)', borderCol: 'border-amber-500/30', description: 'Visita de seguimiento regular', icon: '⚡' },
    { value: 'DESFAVORABLE', label: 'Desfavorable', color: '#f43f5e', bgSoft: 'rgba(244, 63, 94, 0.1)', borderCol: 'border-rose-500/30', description: 'Retroceso o alertas críticas', icon: '⚠' },
    { value: 'SIN_CAMBIOS',  label: 'Sin Cambios',  color: '#64748b', bgSoft: 'rgba(100, 116, 139, 0.1)', borderCol: 'border-slate-500/30', description: 'Estable sin cambios reportados', icon: '•' },
];


const blankFicha = (nna: any) => ({
    zona:               '',
    entrevistado:       '',
    parentesco:         '',
    telefono:           '',
    lugarSeguimiento:   'DOMICILIO',
    direccion:          nna?.domicilioActual || '',
    fecha:              new Date().toISOString().split('T')[0],
    hora:               new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    antecedentes:       '',
    descripcion:        '',
    acuerdos:           '',
    observaciones:      '',
    evaluacion:         'EN_PROCESO',
    proximaVisita:      '',
    nombreUsuario:      `${nna?.nombres ?? ''} ${nna?.apellidoPaterno ?? ''}`.trim(),
    nombreEducador:     'Usuario Actual',
});

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{children}</span>
        <div className="flex-1 h-px bg-border" />
    </div>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[6px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
const textareaCls = "w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[6px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none";

export const SeguimientoFamiliarList = ({ nna, caso }: { nna: any; caso?: any }) => {
    const { registerDocument } = useNnaStore();
    const [expandedFichaId, setExpandedFichaId] = useState<any>(null);
    const [isGenerating, setIsGenerating]       = useState(false);
    const [isLoading, setIsLoading]             = useState(false);
    const [isSaving, setIsSaving]               = useState(false);
    const [showModal, setShowModal]             = useState(false);
    const [fichas, setFichas]                   = useState<any[]>([]);
    const [currentFicha, setCurrentFicha]       = useState<any>(blankFicha(nna));
    const [currentPrintFicha, setCurrentPrintFicha] = useState<any>(null);

    // Cargar fichas existentes del backend
    useEffect(() => {
        if (!caso?.id) return;
        const token = localStorage.getItem('token');
        setIsLoading(true);
        fetch(`${INTERVENCION_API_URL}/seguimiento/caso/${caso.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setFichas(Array.isArray(data) ? data : []))
            .catch(() => setFichas([]))
            .finally(() => setIsLoading(false));
    }, [caso?.id]);

    // Auto-rellenar dirección cuando cambia lugar de seguimiento
    const handleLugarChange = (value: string) => {
        setCurrentFicha((prev: any) => ({
            ...prev,
            lugarSeguimiento: value,
            direccion: value === 'DOMICILIO' ? (nna?.domicilioActual || prev.direccion) : prev.direccion,
        }));
    };

    const up = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setCurrentFicha((prev: any) => ({ ...prev, [key]: e.target.value }));

    const handleSave = async () => {
        const token = localStorage.getItem('token');

        if (caso?.id && token) {
            setIsSaving(true);
            try {
                const payload = {
                    zona:              currentFicha.zona,
                    entrevistado:      currentFicha.entrevistado,
                    parentesco:        currentFicha.parentesco,
                    telefono:          currentFicha.telefono,
                    lugar_seguimiento: currentFicha.lugarSeguimiento,
                    direccion:         currentFicha.direccion,
                    fecha:             currentFicha.fecha,
                    hora:              currentFicha.hora,
                    antecedentes:      currentFicha.antecedentes,
                    descripcion:       currentFicha.descripcion,
                    acuerdos:          currentFicha.acuerdos,
                    observaciones:     currentFicha.observaciones,
                    evaluacion:        currentFicha.evaluacion,
                    proxima_visita:    currentFicha.proximaVisita || null,
                    nombre_educador:   currentFicha.nombreEducador,
                };

                const res = await fetch(`${INTERVENCION_API_URL}/seguimiento/caso/${caso.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    const saved = await res.json();
                    setFichas(prev => [saved, ...prev]);
                } else {
                    // Fallback local si el backend falla
                    setFichas(prev => [{ ...currentFicha, id: Date.now(), fechaRegistro: new Date() }, ...prev]);
                }
            } catch {
                setFichas(prev => [{ ...currentFicha, id: Date.now(), fechaRegistro: new Date() }, ...prev]);
            } finally {
                setIsSaving(false);
            }
        } else {
            // Sin caso conectado: guardar localmente
            setFichas(prev => [{ ...currentFicha, id: Date.now(), fechaRegistro: new Date() }, ...prev]);
        }

        setShowModal(false);
        setCurrentFicha(blankFicha(nna));
    };

    const handleDownloadPDF = async (ficha: any) => {
        setCurrentPrintFicha(ficha);
        await new Promise(r => setTimeout(r, 500));
        const element = document.getElementById('formato-12-hidden-print');
        if (!element) return;

        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            pdf.save(`F12_Seguimiento_${nna.nombres}_${ficha.fecha}.pdf`);

            registerDocument({
                nnaId: nna.id,
                type: 'FICHA DE SEGUIMIENTO FAMILIAR (FORMATO 12)',
                code: `SEG-${new Date().getFullYear()}-${String(fichas.length + 1).padStart(3, '0')}`,
                date: new Date().toISOString(),
                pages: 1,
                user: ficha.nombreEducador || ficha.nombre_educador || 'Usuario Actual',
                status: 'GENERADO',
            });
        } catch (e) {
            console.error(e);
            alert('Error al generar PDF');
        } finally {
            setIsGenerating(false);
            setCurrentPrintFicha(null);
        }
    };

    const evalColor = (v: string) => {
        if (v === 'FAVORABLE')    return 'bg-success-soft text-success border-success/20';
        if (v === 'EN_PROCESO')   return 'bg-warning-soft text-warning border-warning/20';
        if (v === 'DESFAVORABLE') return 'bg-danger-soft text-danger border-danger/20';
        return 'bg-surface-muted text-fg-muted border-border';
    };

    const getAccentColor = (v: string) => {
        if (v === 'FAVORABLE')    return 'bg-green-500';
        if (v === 'EN_PROCESO')   return 'bg-amber-500';
        if (v === 'DESFAVORABLE') return 'bg-red-500';
        return 'bg-gray-400';
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-surface border border-border rounded-[8px] shadow-1 px-5 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Seguimiento Familiar</h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">Formato 12 · Fase 3 — Registro de visitas y consejerías</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus size={15} /> Nueva Ficha (F12)
                </button>
            </div>

            {/* Lista de fichas */}
            {isLoading ? (
                <div className="bg-surface border border-border rounded-[8px] py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-[12px] text-fg-muted">Cargando fichas…</p>
                </div>
            ) : fichas.length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-border rounded-[8px] py-14 text-center">
                    <Users size={40} className="mx-auto mb-3 text-fg-muted opacity-40" />
                    <p className="text-[13px] font-medium text-fg-muted">Sin fichas de seguimiento registradas</p>
                    <p className="text-[12px] text-fg-muted mt-1 max-w-xs mx-auto">
                        Las fichas documentan visitas y consejerías en la Fase 3.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fichas.map(ficha => {
                        const evalVal = ficha.evaluacion || ficha.EVALUACION || 'SIN_CAMBIOS';
                        const lugar   = ficha.lugarSeguimiento || ficha.lugar_seguimiento || '';
                        const acuerdos = ficha.acuerdos || ficha.ACUERDOS || '';
                        const proxima  = ficha.proximaVisita || ficha.proxima_visita || ficha.PROXIMA_VISITA || '';
                        const isExpanded = expandedFichaId === ficha.id;
                        return (
                            <div
                                key={ficha.id}
                                onClick={() => setExpandedFichaId(isExpanded ? null : ficha.id)}
                                className="relative bg-surface border border-border rounded-[8px] p-4 pl-6 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transform transition-all duration-300"
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[8px] ${getAccentColor(evalVal)}`} />
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-primary-soft text-primary px-2.5 py-0.5 rounded text-[11px] font-bold">
                                        {new Date(ficha.fecha || ficha.FECHA).toLocaleDateString('es-PE')}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${evalColor(evalVal)}`}>
                                            {evalVal.replace(/_/g, ' ')}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPDF(ficha);
                                            }}
                                            disabled={isGenerating}
                                            className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                            title="Descargar PDF"
                                        >
                                            <FileDown size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-[12px] text-fg-2">
                                        <MapPin size={12} className="text-fg-muted flex-shrink-0" />
                                        <span className="font-medium">{lugar.replace(/_/g, ' ')}</span>
                                    </div>
                                    <p className="font-semibold text-fg text-[13px]">
                                        {ficha.entrevistado || ficha.ENTREVISTADO || '(sin nombre)'}
                                        {(ficha.parentesco || ficha.PARENTESCO) && ` (${ficha.parentesco || ficha.PARENTESCO})`}
                                    </p>
                                    <p className={`text-[12px] text-fg-muted ${isExpanded ? '' : 'line-clamp-2'}`}>
                                        {ficha.descripcion || ficha.DESCRIPCION || 'Sin descripción registrada.'}
                                    </p>
                                    {acuerdos && (
                                        <p className={`text-[11px] text-fg-2 italic ${isExpanded ? '' : 'line-clamp-1'}`}>
                                            <span className="font-semibold not-italic">Acuerdos: </span>{acuerdos}
                                        </p>
                                    )}

                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-border space-y-2 text-[12px] text-fg-2">
                                            {(ficha.antecedentes || ficha.ANTECEDENTES) && (
                                                <div>
                                                    <span className="font-semibold text-fg block">Antecedentes:</span>
                                                    <p className="text-fg-muted">{ficha.antecedentes || ficha.ANTECEDENTES}</p>
                                                </div>
                                            )}
                                            {(ficha.direccion || ficha.DIRECCION) && (
                                                <div>
                                                    <span className="font-semibold text-fg block">Dirección:</span>
                                                    <p className="text-fg-muted">{ficha.direccion || ficha.DIRECCION}</p>
                                                </div>
                                            )}
                                            {(ficha.telefono || ficha.TELEFONO) && (
                                                <div>
                                                    <span className="font-semibold text-fg block">Teléfono:</span>
                                                    <p className="text-fg-muted">{ficha.telefono || ficha.TELEFONO}</p>
                                                </div>
                                            )}
                                            {(ficha.observaciones || ficha.OBSERVACIONES) && (
                                                <div>
                                                    <span className="font-semibold text-fg block">Observaciones:</span>
                                                    <p className="text-fg-muted">{ficha.observaciones || ficha.OBSERVACIONES}</p>
                                                </div>
                                            )}
                                            {(ficha.hora || ficha.HORA) && (
                                                <div>
                                                    <span className="font-semibold text-fg block">Hora de la visita:</span>
                                                    <p className="text-fg-muted">{ficha.hora || ficha.HORA}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-border flex justify-between items-center text-[11px] text-fg-muted">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={11} /> {ficha.hora || ficha.HORA || ''}
                                    </span>
                                    {proxima ? (
                                        <span className="flex items-center gap-1 text-primary font-medium">
                                            <Home size={11} /> Próx. {new Date(proxima).toLocaleDateString('es-PE')}
                                        </span>
                                    ) : (
                                        <span>{ficha.zona || ficha.ZONA || 'Sin zona'}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Modal Nueva Ficha ─── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-[10px] shadow-3 w-full max-w-[600px] max-h-[92vh] overflow-hidden flex flex-col border border-border">

                        {/* Header modal */}
                        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface">
                            <div>
                                <h3 className="text-[14px] font-semibold text-fg">Nueva Ficha de Seguimiento Familiar</h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">Formato F12 · {caso?.codigoCaso || caso?.codigo_caso || 'Sin caso vinculado'}</p>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); setCurrentFicha(blankFicha(nna)); }}
                                className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-[5px] transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Cuerpo scrollable */}
                        <div className="overflow-y-auto p-5 space-y-5 flex-1">

                            {/* ── Sección 1: Datos de la Visita ── */}
                            <div>
                                <SectionTitle>Datos de la Visita</SectionTitle>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Zona de Intervención">
                                        <input
                                            className={inputCls}
                                            value={currentFicha.zona}
                                            onChange={up('zona')}
                                            placeholder="Ej: Centro de Lima"
                                        />
                                    </FormField>
                                    <FormField label="Fecha">
                                        <input type="date" className={inputCls} value={currentFicha.fecha} onChange={up('fecha')} />
                                    </FormField>
                                </div>

                                <div className="mt-3">
                                    <FormField label="Lugar de Seguimiento">
                                        <div className="flex gap-2 flex-wrap mt-1">
                                            {LUGAR_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleLugarChange(opt.value)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border text-[12px] font-medium transition-all ${
                                                        currentFicha.lugarSeguimiento === opt.value
                                                            ? 'border-primary bg-primary-soft text-primary'
                                                            : 'border-border-strong text-fg-2 hover:border-primary hover:text-fg'
                                                    }`}
                                                >
                                                    <span>{opt.icon}</span> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <FormField label="Dirección">
                                        <input
                                            className={inputCls}
                                            value={currentFicha.direccion}
                                            onChange={up('direccion')}
                                            placeholder="Dirección del lugar visitado"
                                        />
                                    </FormField>
                                    <FormField label="Hora">
                                        <input type="time" className={inputCls} value={currentFicha.hora} onChange={up('hora')} />
                                    </FormField>
                                </div>
                            </div>

                            {/* ── Sección 2: Persona Entrevistada ── */}
                            <div>
                                <SectionTitle>Persona Entrevistada</SectionTitle>
                                <div className="grid grid-cols-3 gap-3">
                                    <FormField label="Nombre Completo">
                                        <input
                                            className={inputCls}
                                            value={currentFicha.entrevistado}
                                            onChange={up('entrevistado')}
                                            placeholder="Nombre del entrevistado"
                                        />
                                    </FormField>
                                    <FormField label="Parentesco">
                                        <input
                                            className={inputCls}
                                            value={currentFicha.parentesco}
                                            onChange={up('parentesco')}
                                            placeholder="Ej: Madre, Tío"
                                        />
                                    </FormField>
                                    <FormField label="Teléfono">
                                        <input
                                            className={inputCls}
                                            value={currentFicha.telefono}
                                            onChange={up('telefono')}
                                            placeholder="999 999 999"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            {/* ── Sección 3: Contenido de la Visita ── */}
                            <div>
                                <SectionTitle>Contenido de la Visita</SectionTitle>
                                <div className="space-y-3">
                                    <FormField label="Antecedentes / Motivo de la Visita">
                                        <textarea
                                            className={textareaCls}
                                            rows={2}
                                            value={currentFicha.antecedentes}
                                            onChange={up('antecedentes')}
                                            placeholder="Motivo o contexto de la visita…"
                                        />
                                    </FormField>
                                    <FormField label="Descripción de la Visita">
                                        <textarea
                                            className={textareaCls}
                                            rows={3}
                                            value={currentFicha.descripcion}
                                            onChange={up('descripcion')}
                                            placeholder="Relato detallado de lo ocurrido en la visita…"
                                        />
                                    </FormField>
                                    <FormField label="Acuerdos / Compromisos">
                                        <textarea
                                            className={textareaCls}
                                            rows={2}
                                            value={currentFicha.acuerdos}
                                            onChange={up('acuerdos')}
                                            placeholder="Acuerdos y compromisos alcanzados con la familia…"
                                        />
                                    </FormField>
                                    <FormField label="Observaciones">
                                        <textarea
                                            className={textareaCls}
                                            rows={2}
                                            value={currentFicha.observaciones}
                                            onChange={up('observaciones')}
                                            placeholder="Observaciones adicionales…"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            {/* ── Sección 4: Cierre y Evaluación ── */}
                            <div>
                                <SectionTitle>Cierre y Evaluación</SectionTitle>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Evaluación de la Visita">
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            {EVALUACION_OPTIONS.map(opt => (
                                                <label
                                                    key={opt.value}
                                                    className={`relative flex flex-col p-2.5 rounded-[8px] border cursor-pointer transition-all duration-200 select-none ${
                                                        currentFicha.evaluacion === opt.value
                                                            ? 'border-primary ring-1 ring-primary'
                                                            : 'border-border bg-surface hover:border-primary/50'
                                                    }`}
                                                    style={currentFicha.evaluacion === opt.value ? { backgroundColor: opt.bgSoft } : {}}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="evaluacion"
                                                        value={opt.value}
                                                        checked={currentFicha.evaluacion === opt.value}
                                                        onChange={up('evaluacion')}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                                                        <span className={currentFicha.evaluacion === opt.value ? 'text-primary' : 'text-fg'}>{opt.label}</span>
                                                        <span className="ml-auto text-[10px] opacity-70">{opt.icon}</span>
                                                    </div>
                                                    <p className="text-[10px] text-fg-muted mt-1 leading-normal">{opt.description}</p>
                                                </label>
                                            ))}
                                        </div>
                                    </FormField>
                                    <FormField label="Próxima Visita Programada">
                                        <div className="space-y-2">
                                            <input
                                                type="date"
                                                className={inputCls}
                                                value={currentFicha.proximaVisita}
                                                onChange={up('proximaVisita')}
                                            />
                                            <p className="text-[11px] text-fg-muted">
                                                Deja vacío si no hay próxima visita agendada.
                                            </p>
                                            <FormField label="Educador Responsable">
                                                <input
                                                    className={inputCls}
                                                    value={currentFicha.nombreEducador}
                                                    onChange={up('nombreEducador')}
                                                    placeholder="Nombre del educador"
                                                />
                                            </FormField>
                                        </div>
                                    </FormField>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-muted">
                            <button
                                onClick={() => { setShowModal(false); setCurrentFicha(blankFicha(nna)); }}
                                className="px-4 py-2 bg-surface border border-border-strong text-fg text-[13px] font-medium rounded-[6px] hover:bg-surface-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-[13px] font-medium rounded-[6px] hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {isSaving && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-fg" />}
                                <ClipboardCheck size={14} />
                                {isSaving ? 'Guardando…' : 'Guardar Ficha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden print */}
            {currentPrintFicha && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato12Print id="formato-12-hidden-print" nna={nna} ficha={currentPrintFicha} />
                </div>
            )}
        </div>
    );
};
