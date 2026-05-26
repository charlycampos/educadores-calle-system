/**
 * SEC · TalleresPage rediseñado
 * - Tokens consolidados (sin blue-600, emerald-100, amber-100, purple-50, etc.)
 * - Button/Badge/Input unificados
 * - Header sin logo duplicado
 * - Tab bar limpia con tokens
 * - Cards de taller: sin gradientes, sin colored shadows
 * - Modal de evaluación con header limpio
 * - Sin alert() — errores en UI
 * - Empty state con CTA
 * Nota: la lógica de negocio (PDF, participantes, etc.) no se toca.
 */

import { useState, useEffect } from 'react';
import {
    Presentation, Plus, X, Edit, FileText, LayoutGrid, List as ListIcon,
    Calendar as CalendarIcon, Clock, Users, MapPin, CheckCircle2,
    Search, UserPlus, Save, BookOpen, AlertTriangle, Lightbulb, StickyNote,
    FileDown, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
    getTalleres, createTaller, updateTaller,
    addParticipante, updateParticipante, removeParticipante, getTallerById
} from '../../api/talleres.api';
import type { Taller, ParticipanteTaller } from '../../api/talleres.api';
import { useNnaStore } from '../../store/nna.store';
import { useAuthStore } from '../../store/auth.store';
import { WorkshopCalendar } from './components/WorkshopCalendar';
import { Formato7Print } from '../nna/components/Formato7Print';
import { Formato10Print } from '../nna/components/Formato10Print';
import { Formato11Print } from '../nna/components/Formato11Print';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

const estadoTone = (estado: string): 'success' | 'info' | 'warning' | 'neutral' => {
    if (estado === 'EVALUADO')   return 'success';
    if (estado === 'EJECUTADO')  return 'info';
    if (estado === 'PLANIFICADO') return 'warning';
    return 'neutral';
};

export const TalleresPage = () => {
    const [talleres, setTalleres]       = useState<Taller[]>([]);
    const [loading, setLoading]         = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [formError, setFormError]     = useState<string | null>(null);

    const { nnas, fetchAllNnas } = useNnaStore();
    const user = useAuthStore(state => state.user);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTalleres();
            setTalleres(data);
            if (nnas.length === 0) fetchAllNnas();
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    };

    const [isFormOpen, setIsFormOpen]   = useState(false);
    const [currentTaller, setCurrentTaller] = useState<Partial<Taller> | null>(null);
    const [activeTab, setActiveTab]     = useState<'planificacion' | 'ejecucion'>('planificacion');
    const [viewMode, setViewMode]       = useState<'lista' | 'calendario'>('calendario');
    const [evaluatingParticipantId, setEvaluatingParticipantId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm]   = useState('');

    const handleSelectFromCalendar = async (taller: Taller) => {
        const full = await getTallerById(taller.id);
        setCurrentTaller(full);
        setIsFormOpen(true);
        setActiveTab('planificacion');
    };

    const handleNewTaller = (prefilledDate?: string) => {
        setCurrentTaller({
            nombre: '', dirigidoA: 'Niños y niñas', objetivo: '', lugar: '',
            fecha: prefilledDate || new Date().toISOString().split('T')[0],
            hora: '09:00', inicioActividad: '', procesoActividad: '', cierreActividad: '',
            estado: 'PLANIFICADO', participantes: [], incidenciasLogisticas: ''
        });
        setIsFormOpen(true);
        setActiveTab('planificacion');
    };

    const handleSave = async () => {
        if (!currentTaller) return;
        setFormError(null);
        try {
            if (currentTaller.id) {
                await updateTaller(currentTaller.id, currentTaller);
            } else {
                await createTaller(currentTaller);
            }
            await loadData();
            setIsFormOpen(false);
        } catch { setFormError('Error al guardar el taller. Inténtalo de nuevo.'); }
    };

    const handleAddParticipant = async (nna: { id: number }) => {
        if (!currentTaller?.id) { setFormError('Guarda el taller primero para agregar participantes.'); return; }
        try {
            await addParticipante(currentTaller.id, nna.id);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch { setFormError('Error al agregar participante (puede que ya esté en la lista).'); }
        setSearchTerm('');
    };

    const handleRemoveParticipant = async (nnaId: number) => {
        if (!currentTaller?.id) return;
        if (!window.confirm('¿Eliminar a este participante del taller?')) return;
        try {
            await removeParticipante(currentTaller.id, nnaId);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch { setFormError('Error al eliminar participante.'); }
    };

    const toggleAsistencia = async (nnaId: number, currentStatus: boolean) => {
        if (!currentTaller?.id) return;
        try {
            await updateParticipante(currentTaller.id, nnaId, { asistio: !currentStatus });
            setCurrentTaller({ ...currentTaller, participantes: currentTaller.participantes!.map(p => p.nnaId === nnaId ? { ...p, asistio: !currentStatus } : p) });
        } catch { /* silencioso */ }
    };

    const saveEvaluation = async () => {
        if (!currentTaller?.id || !evaluatingParticipantId) return;
        const p = currentTaller.participantes!.find(x => x.nnaId === evaluatingParticipantId);
        if (!p) return;
        try {
            await updateParticipante(currentTaller.id, evaluatingParticipantId, { logros: p.logros, limitaciones: p.limitaciones, sugerencias: p.sugerencias });
            setEvaluatingParticipantId(null);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch { setFormError('Error al guardar evaluación.'); }
    };

    const updateLocalEvaluation = (nnaId: number, field: 'logros' | 'limitaciones' | 'sugerencias', value: string) => {
        if (currentTaller?.participantes) {
            setCurrentTaller({ ...currentTaller, participantes: currentTaller.participantes.map(p => p.nnaId === nnaId ? { ...p, [field]: value } : p) });
        }
    };

    const handleDownloadPDF = async (elementId: string, filename: string) => {
        const element = document.getElementById(elementId);
        if (!element) { setFormError(`No se pudo generar el PDF (${elementId}).`); return; }
        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;left:-9999px;width:210mm;height:297mm';
            document.body.appendChild(iframe);
            const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iDoc) throw new Error();
            iDoc.open();
            iDoc.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:white;color:black}</style></head><body>${element.outerHTML}</body></html>`);
            iDoc.close();
            await new Promise(r => setTimeout(r, 100));
            const el = iDoc.getElementById(elementId);
            if (!el) throw new Error();
            const canvas = await html2canvas(el, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 800, allowTaint: true });
            document.body.removeChild(iframe);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, w, (canvas.height * w) / canvas.width, undefined, 'FAST');
            pdf.save(`${filename}.pdf`);
        } catch { setFormError('Error al generar el PDF. Inténtalo de nuevo.'); }
        finally { setIsGeneratingPDF(false); }
    };

    const filteredNNAs = searchTerm ? nnas.filter(n => `${n.nombres} ${n.apellidoPaterno}`.toLowerCase().includes(searchTerm.toLowerCase())) : [];
    const evaluatingParticipant = currentTaller?.participantes?.find(p => p.nnaId === evaluatingParticipantId);

    if (loading && talleres.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-secondary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando talleres…
                </div>
            </div>
        );
    }

    /* ──────────── FORMULARIO ──────────── */
    if (isFormOpen && currentTaller) {
        return (
            <div className="space-y-5">

                {/* Modal evaluación individual */}
                {evaluatingParticipantId !== null && evaluatingParticipant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/20 p-4">
                        <div className="bg-surface border border-border w-full max-w-2xl rounded-lg shadow-[var(--shadow-3)] overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                                <div>
                                    <h3 className="text-h2 text-fg">Evaluación individual</h3>
                                    <p className="text-caption text-fg-secondary mt-0.5">
                                        {evaluatingParticipant.nna
                                            ? `${evaluatingParticipant.nna.nombres} ${evaluatingParticipant.nna.apellidoPaterno}`
                                            : 'Participante'}
                                    </p>
                                </div>
                                <button onClick={() => setEvaluatingParticipantId(null)} className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md" aria-label="Cerrar">
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                <div className="bg-primary-soft border border-primary/20 rounded-md px-4 py-3 text-caption text-primary">
                                    <strong>Taller:</strong> {currentTaller.nombre}
                                </div>
                                <div>
                                    <label className="text-micro text-fg-muted mb-2 flex items-center gap-1.5 block">
                                        <StickyNote size={13} className="text-warning" /> 5. Logros alcanzados
                                    </label>
                                    <textarea value={evaluatingParticipant.logros || ''} onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'logros', e.target.value)} rows={3}
                                        className="w-full p-3 border border-border-strong rounded-md text-body text-fg focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_18%,transparent)] outline-none resize-none transition-shadow bg-surface"
                                        placeholder="¿Qué cambios u objetivos logró el NNA hoy?" autoFocus />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-micro text-fg-muted mb-2 flex items-center gap-1.5 block">
                                            <AlertTriangle size={13} className="text-warning" /> 6. Limitaciones
                                        </label>
                                        <textarea value={evaluatingParticipant.limitaciones || ''} onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'limitaciones', e.target.value)} rows={3}
                                            className="w-full p-3 border border-border-strong rounded-md text-body text-fg focus:border-primary outline-none resize-none bg-surface"
                                            placeholder="Dificultades específicas…" />
                                    </div>
                                    <div>
                                        <label className="text-micro text-fg-muted mb-2 flex items-center gap-1.5 block">
                                            <Lightbulb size={13} className="text-info" /> 7. Sugerencias
                                        </label>
                                        <textarea value={evaluatingParticipant.sugerencias || ''} onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'sugerencias', e.target.value)} rows={3}
                                            className="w-full p-3 border border-border-strong rounded-md text-body text-fg focus:border-primary outline-none resize-none bg-surface"
                                            placeholder="Recomendaciones futuras…" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-muted px-6 py-4 border-t border-border flex justify-end">
                                <Button onClick={saveEvaluation}>Guardar evaluación</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar del formulario */}
                <div className="bg-surface border border-border rounded-lg px-5 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary-soft">
                            <Presentation size={16} className="text-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-[15px] font-semibold text-fg leading-tight">{currentTaller.nombre || 'Nuevo taller'}</h1>
                            <p className="text-caption text-fg-muted">Formato F7 · Talleres Socioeducativos</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {currentTaller.id && (
                            <div className="flex gap-1 border-r border-border pr-2 mr-1">
                                {[
                                    { id: 'formato-7-print-talleres',  label: 'F7' },
                                    ...(!currentTaller.esIndividual ? [
                                        { id: 'formato-10-print-talleres', label: 'F10' },
                                        { id: 'formato-11-print-talleres', label: 'F11' },
                                    ] : []),
                                ].map(f => (
                                    <button key={f.id}
                                        onClick={() => handleDownloadPDF(f.id, `${f.label}_${currentTaller.nombre?.replace(/\s+/g,'_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-md text-[12px] font-semibold text-fg-secondary hover:bg-surface-muted disabled:opacity-50 transition-colors"
                                    >
                                        {isGeneratingPDF ? <Loader2 size={11} className="animate-spin" /> : <FileDown size={11} />}
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button variant="ghost" iconLeft={<X size={14} />} onClick={() => setIsFormOpen(false)}>Volver</Button>
                        <Button iconLeft={<Save size={14} />} onClick={handleSave}>Guardar</Button>
                    </div>
                </div>

                {/* Error de formulario */}
                {formError && (
                    <div className="flex items-start gap-2 bg-danger-soft border border-danger/20 text-danger rounded-md px-3 py-2.5 text-caption">
                        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" /> {formError}
                        <button onClick={() => setFormError(null)} className="ml-auto text-danger/60 hover:text-danger"><X size={13} /></button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-surface border border-border rounded-lg overflow-hidden">
                    {(['planificacion', 'ejecucion'] as const).map(tab => (
                        <button key={tab}
                            onClick={() => {
                                if (tab === 'ejecucion' && !currentTaller.id) { setFormError('Guarda la planificación primero.'); return; }
                                setActiveTab(tab);
                            }}
                            className={`flex-1 px-5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary bg-primary-soft/40' : 'border-transparent text-fg-secondary hover:text-fg hover:bg-surface-muted'}`}
                        >
                            {tab === 'planificacion' ? '1. Planificación (F7)' : '2. Ejecución y Evaluación (F8)'}
                        </button>
                    ))}
                </div>

                {/* Contenido del tab */}
                <div className="bg-surface border border-border rounded-lg p-6 min-h-[480px]">
                    {activeTab === 'planificacion' && (
                        <div className="space-y-8 max-w-5xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-micro text-fg-muted mb-1 block">Nombre del taller</label>
                                        <input value={currentTaller.nombre} onChange={e => setCurrentTaller({ ...currentTaller, nombre: e.target.value })}
                                            className="w-full text-[17px] font-semibold border-b-2 border-border focus:border-primary outline-none py-2 placeholder:text-fg-muted bg-transparent text-fg"
                                            placeholder="Ej. Taller de Habilidades Blandas" />
                                    </div>
                                    <div>
                                        <label className="text-micro text-fg-muted mb-1 block">Objetivo general</label>
                                        <textarea value={currentTaller.objetivo} onChange={e => setCurrentTaller({ ...currentTaller, objetivo: e.target.value })} rows={3}
                                            className="w-full p-3 bg-surface-muted rounded-md border-none resize-none focus:ring-2 focus:ring-primary/20 outline-none text-body text-fg"
                                            placeholder="¿Qué queremos lograr con el grupo?" />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-micro text-fg-muted mb-1 block">Fecha</label>
                                            <input type="date" value={currentTaller.fecha ? new Date(currentTaller.fecha).toISOString().split('T')[0] : ''} onChange={e => setCurrentTaller({ ...currentTaller, fecha: e.target.value })}
                                                className="w-full p-2.5 bg-surface-muted rounded-md border border-border text-body text-fg outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="text-micro text-fg-muted mb-1 block">Hora</label>
                                            <input type="time" value={currentTaller.hora} onChange={e => setCurrentTaller({ ...currentTaller, hora: e.target.value })}
                                                className="w-full p-2.5 bg-surface-muted rounded-md border border-border text-body text-fg outline-none focus:border-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-micro text-fg-muted mb-1 block">Lugar</label>
                                        <input value={currentTaller.lugar} onChange={e => setCurrentTaller({ ...currentTaller, lugar: e.target.value })}
                                            className="w-full p-2.5 bg-surface-muted rounded-md border border-border text-body text-fg outline-none focus:border-primary"
                                            placeholder="Ej. Loza Deportiva" />
                                    </div>
                                </div>
                            </div>

                            {/* Esquema metodológico */}
                            <div className="border-t border-dashed border-border pt-6">
                                <h3 className="text-[14px] font-semibold text-fg mb-4 flex items-center gap-2">
                                    <BookOpen size={15} className="text-fg-muted" /> Esquema metodológico
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'inicioActividad',   label: 'Inicio',   color: 'bg-success-soft text-success' },
                                        { key: 'procesoActividad',  label: 'Proceso',  color: 'bg-primary-soft text-primary' },
                                        { key: 'cierreActividad',   label: 'Cierre',   color: 'bg-info-soft text-info' },
                                    ].map(({ key, label, color }) => (
                                        <div key={key} className={`p-4 rounded-lg ${color.split(' ')[0]}`}>
                                            <span className={`text-micro ${color.split(' ')[1]} block mb-2`}>{label}</span>
                                            <textarea
                                                value={(currentTaller as any)[key] || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, [key]: e.target.value })}
                                                className="w-full mt-1 bg-surface/60 border-none rounded-md text-[13px] text-fg p-2 resize-none focus:outline-none" rows={3}
                                                placeholder="Actividad…"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ejecucion' && (
                        <div className="max-w-5xl mx-auto space-y-6">
                            {/* Incidencias */}
                            <div className="bg-warning-soft border border-warning/20 p-4 rounded-lg flex gap-3 items-start">
                                <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <label className="text-micro text-fg-secondary mb-1 block">Informe de incidencias / asuntos globales</label>
                                    <textarea value={currentTaller.incidenciasLogisticas || ''} onChange={e => setCurrentTaller({ ...currentTaller, incidenciasLogisticas: e.target.value })}
                                        className="w-full bg-surface border border-border rounded-md p-2.5 text-[13px] text-fg focus:border-primary outline-none transition-shadow" rows={2}
                                        placeholder="Ej: Retraso por lluvia, falta de materiales…" />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Buscador */}
                                <div className="w-full md:w-1/3 space-y-3">
                                    <div className="bg-surface border border-border rounded-lg p-4">
                                        <label className="text-micro text-fg-muted block mb-2">Agregar participante</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={14} />
                                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar NNA…"
                                                className="w-full pl-9 p-2 bg-surface-muted border border-border rounded-md text-body text-fg focus:border-primary outline-none transition-shadow" />
                                        </div>
                                        {searchTerm && (
                                            <div className="mt-2 bg-surface border border-border rounded-lg shadow-[var(--shadow-2)] max-h-56 overflow-y-auto">
                                                {filteredNNAs.length > 0 ? filteredNNAs.map((nna: any) => (
                                                    <button key={nna.id} onClick={() => handleAddParticipant(nna)}
                                                        disabled={currentTaller.participantes?.some(p => p.nnaId === nna.id)}
                                                        className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-surface-muted flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed">
                                                        <span>{nna.nombres} {nna.apellidoPaterno}</span>
                                                        <UserPlus size={13} className="text-primary" />
                                                    </button>
                                                )) : (
                                                    <div className="p-3 text-caption text-center text-fg-muted">Sin resultados</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-primary-soft border border-primary/20 rounded-lg px-4 py-3 text-[13px] text-primary font-medium flex items-center gap-2">
                                        <Users size={14} /> Lista: {currentTaller.participantes?.length ?? 0} participantes
                                    </div>
                                </div>

                                {/* Tabla participantes */}
                                <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-[13px]">
                                        <thead className="bg-surface-muted border-b border-border">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-fg-secondary">Participante</th>
                                                <th className="px-4 py-3 text-center font-semibold text-fg-secondary">Asistencia</th>
                                                <th className="px-4 py-3 text-center font-semibold text-fg-secondary">Evaluación F8</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {!currentTaller.participantes?.length ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center">
                                                        <EmptyState icon={Users} title="Sin participantes aún" description="Usa el buscador para agregar NNA a la lista." />
                                                    </td>
                                                </tr>
                                            ) : currentTaller.participantes.map(p => (
                                                <tr key={p.nnaId} className="hover:bg-surface-muted/50">
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-fg">
                                                            {p.nna ? `${p.nna.nombres} ${p.nna.apellidoPaterno}` : `Participante ${p.nnaId}`}
                                                        </p>
                                                        {p.logros && (
                                                            <p className="text-[11px] text-success flex items-center gap-1 mt-0.5">
                                                                <CheckCircle2 size={10} /> Evaluado
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => toggleAsistencia(p.nnaId, p.asistio)}
                                                            className={`p-1 rounded-full transition-colors ${p.asistio ? 'text-success' : 'text-fg-muted/40'}`}
                                                            aria-label={p.asistio ? 'Marcar ausente' : 'Marcar asistente'}>
                                                            <CheckCircle2 size={22} />
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => setEvaluatingParticipantId(p.nnaId)} disabled={!p.asistio}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors mx-auto ${p.logros ? 'bg-primary-soft text-primary hover:bg-primary-soft' : 'bg-surface-muted text-fg-secondary hover:bg-border'} disabled:opacity-30 disabled:cursor-not-allowed`}>
                                                            <Edit size={12} /> {p.logros ? 'Editar F8' : 'Evaluar'}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => handleRemoveParticipant(p.nnaId)} className="p-1 text-fg-muted/40 hover:text-danger rounded transition-colors" aria-label="Eliminar participante">
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Formatos de impresión ocultos */}
                {currentTaller && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato7Print taller={currentTaller} id="formato-7-print-talleres" />
                        <Formato10Print taller={currentTaller} participantes={currentTaller.participantes || []} id="formato-10-print-talleres" />
                        <Formato11Print taller={currentTaller} id="formato-11-print-talleres" />
                    </div>
                )}
            </div>
        );
    }

    /* ──────────── LISTADO / CALENDARIO ──────────── */
    return (
        <div className="space-y-5 pb-10">

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-h1 text-fg flex items-center gap-2">
                        <Presentation size={20} className="text-primary" aria-hidden="true" />
                        Talleres Socioeducativos
                    </h1>
                    <p className="text-body text-fg-secondary mt-1">Planificación (F7) y evaluación grupal (F8 / F10 / F11)</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Toggle vista */}
                    <div className="flex bg-surface-muted border border-border p-0.5 rounded-md gap-0.5">
                        {(['calendario', 'lista'] as const).map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${viewMode === mode ? 'bg-surface text-primary shadow-[var(--shadow-1)]' : 'text-fg-secondary hover:text-fg'}`}>
                                {mode === 'calendario' ? <><LayoutGrid size={13} /> Calendario</> : <><ListIcon size={13} /> Listado</>}
                            </button>
                        ))}
                    </div>
                    <Button iconLeft={<Plus size={15} />} onClick={() => handleNewTaller()}>Nuevo taller</Button>
                </div>
            </div>

            {/* Vista */}
            {viewMode === 'calendario' ? (
                <WorkshopCalendar talleres={talleres} onSelectTaller={handleSelectFromCalendar} onNewTaller={date => handleNewTaller(date)} />
            ) : (
                talleres.length === 0 ? (
                    <EmptyState icon={Presentation} title="Sin talleres registrados" description="Crea el primer taller socioeducativo del período." action={<Button iconLeft={<Plus size={14} />} size="sm" onClick={() => handleNewTaller()}>Nuevo taller</Button>} />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {talleres.map(taller => (
                            <div key={taller.id} className="bg-surface border border-border rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-[var(--shadow-2)] transition-all flex flex-col group">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge tone={estadoTone(taller.estado ?? '')}>{taller.estado}</Badge>
                                        <span className="text-[12px] text-fg-muted flex items-center gap-1">
                                            <CalendarIcon size={11} />
                                            {taller.fecha ? new Date(taller.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'S/F'}
                                        </span>
                                    </div>
                                    <h3 className="text-[14px] font-semibold text-fg leading-tight mb-2 group-hover:text-primary transition-colors">
                                        {taller.nombre}
                                    </h3>
                                    <p className="text-[12px] text-fg-secondary line-clamp-2 mb-4 italic">
                                        {taller.objetivo || 'Sin objetivo registrado'}
                                    </p>
                                    <div className="flex items-center gap-4 text-[12px] text-fg-muted">
                                        <span className="flex items-center gap-1"><MapPin size={11} className="text-fg-muted" /><span className="truncate max-w-[96px]">{taller.lugar || '—'}</span></span>
                                        <span className="flex items-center gap-1"><Clock size={11} />{taller.hora || '—'}</span>
                                        <span className="flex items-center gap-1 ml-auto">
                                            <Users size={11} />
                                            <span className="font-semibold text-primary">{taller.participantes?.filter(p => p.asistio).length ?? 0}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-3 border-t border-border bg-surface-muted">
                                    <Button block variant="secondary" size="sm" onClick={() => handleSelectFromCalendar(taller)}>
                                        Gestionar sesión
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Formatos ocultos para listado */}
            {currentTaller && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato7Print taller={currentTaller} id="formato-7-print-talleres" />
                    <Formato10Print taller={currentTaller} participantes={currentTaller.participantes || []} id="formato-10-print-talleres" />
                    <Formato11Print taller={currentTaller} id="formato-11-print-talleres" />
                </div>
            )}
        </div>
    );
};
