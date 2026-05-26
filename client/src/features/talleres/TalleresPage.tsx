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

export const TalleresPage = () => {
    const [talleres, setTalleres] = useState<Taller[]>([]);
    const [loading, setLoading] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // NNA Search logic
    const { nnas, fetchAllNnas } = useNnaStore();
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTalleres();
            setTalleres(data);
            if (nnas.length === 0) fetchAllNnas();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentTaller, setCurrentTaller] = useState<Partial<Taller> | null>(null);
    const [activeTab, setActiveTab] = useState<'planificacion' | 'ejecucion'>('planificacion');
    const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('calendario');

    // Evaluation Modal State
    const [evaluatingParticipantId, setEvaluatingParticipantId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSelectFromCalendar = async (taller: Taller) => {
        const fullTaller = await getTallerById(taller.id);
        setCurrentTaller(fullTaller);
        setIsFormOpen(true);
        setActiveTab('planificacion');
    };

    const handleNewTaller = (prefilledDate?: string) => {
        setCurrentTaller({
            nombre: '',
            dirigidoA: 'Niños y niñas',
            objetivo: '',
            lugar: '',
            fecha: prefilledDate || new Date().toISOString().split('T')[0],
            hora: '09:00',
            inicioActividad: '',
            procesoActividad: '',
            cierreActividad: '',
            estado: 'PLANIFICADO',
            participantes: [],
            incidenciasLogisticas: ''
        });
        setIsFormOpen(true);
        setActiveTab('planificacion');
    };

    const handleSave = async () => {
        if (!currentTaller) return;
        try {
            setLoading(true);
            if (currentTaller.id) {
                // Si el taller ya existe, lo actualizamos. 
                // Nota: El endpoint /ejecutar cambia el estado a EJECUTADO.
                // Si solo queremos actualizar la planificación, necesitaríamos otro endpoint o manejarlo aquí.
                if (currentTaller.estado === 'PLANIFICADO' && activeTab === 'planificacion') {
                    // Por ahora el API solo tiene planificar (POST) y ejecutar (POST)
                    // Podríamos implementar un update genérico si el backend lo soporta
                    await updateTaller(currentTaller.id, currentTaller);
                } else {
                    await updateTaller(currentTaller.id, currentTaller);
                }
            } else {
                await createTaller(currentTaller);
            }
            await loadData();
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving taller", error);
            alert("Error al guardar el taller. Verifique los datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddParticipant = async (nna: { id: number }) => {
        if (!currentTaller?.id) {
            alert("Primero guarda el taller para agregar participantes.");
            return;
        }
        try {
            await addParticipante(currentTaller.id, nna.id);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (error) {
            console.error("Error adding participant", error);
            alert("Error o ya agregado.");
        }
        setSearchTerm('');
    };

    const handleRemoveParticipant = async (nnaId: number) => {
        if (!currentTaller?.id) return;
        if (!confirm('¿Estás seguro de eliminar a este participante del taller?')) return;

        try {
            await removeParticipante(currentTaller.id, nnaId);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (error) {
            console.error("Error removing participant", error);
            alert("Error al eliminar participante.");
        }
    };

    const toggleAsistencia = async (nnaId: number, currentStatus: boolean) => {
        if (!currentTaller?.id) return;
        try {
            await updateParticipante(currentTaller.id, nnaId, { asistio: !currentStatus });
            const updatedParticipants = currentTaller.participantes!.map(p =>
                p.nnaId === nnaId ? { ...p, asistio: !currentStatus } : p
            );
            setCurrentTaller({ ...currentTaller, participantes: updatedParticipants });
        } catch (error) {
            console.error(error);
        }
    };

    const saveEvaluation = async () => {
        if (!currentTaller?.id || !evaluatingParticipantId) return;
        const p = currentTaller.participantes!.find(x => x.nnaId === evaluatingParticipantId);
        if (!p) return;

        try {
            await updateParticipante(currentTaller.id, evaluatingParticipantId, {
                logros: p.logros,
                limitaciones: p.limitaciones,
                sugerencias: p.sugerencias
            });
            setEvaluatingParticipantId(null);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (error) {
            alert("Error guardando evaluación");
        }
    };

    const updateLocalEvaluation = (nnaId: number, field: 'logros' | 'limitaciones' | 'sugerencias', value: string) => {
        if (currentTaller && currentTaller.participantes) {
            const updatedParticipants = currentTaller.participantes.map(p =>
                p.nnaId === nnaId ? { ...p, [field]: value } : p
            );
            setCurrentTaller({ ...currentTaller, participantes: updatedParticipants });
        }
    };

    const handleDownloadPDF = async (elementId: string, filename: string) => {
        console.log(`[PDF] Intentando generar: ${elementId}`);
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`[PDF] Elemento no encontrado: ${elementId}`);
            alert(`Error técnico: No se pudo encontrar el documento para generar el PDF (${elementId}).`);
            return;
        }

        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '210mm';
            iframe.style.height = '297mm';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el iframe');

            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: white; color: black; }
                    </style>
                </head>
                <body>${element.outerHTML}</body>
                </html>
            `);
            iframeDoc.close();

            await new Promise(resolve => setTimeout(resolve, 100));

            const iframeElement = iframeDoc.getElementById(elementId);
            if (!iframeElement) throw new Error('Elemento no encontrado en iframe');

            const pdfCanvas = await html2canvas(iframeElement, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800,
                allowTaint: true
            });

            document.body.removeChild(iframe);

            const imgData = pdfCanvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (pdfCanvas.height * pdfWidth) / pdfCanvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`${filename}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor, intente de nuevo.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };


    const filteredNNAs = searchTerm
        ? nnas.filter(nna =>
            `${nna.nombres} ${nna.apellidoPaterno}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const evaluatingParticipant = currentTaller?.participantes?.find(p => p.nnaId === evaluatingParticipantId);

    if (loading && talleres.length === 0) return <div className="p-8 text-center text-gray-500">Cargando Talleres...</div>;

    if (isFormOpen && currentTaller) {
        return (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 relative">
                {/* Modal Evaluación Individual Overlay */}
                {evaluatingParticipantId !== null && evaluatingParticipant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-surface rounded-2xl shadow-lg w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border">
                            <div className="bg-primary px-6 py-4 flex justify-between items-center text-primary-fg">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <FileText size={20} /> Evaluación Individual
                                    </h3>
                                    <p className="opacity-90 text-[13px]">
                                        {evaluatingParticipant.nna ? `${evaluatingParticipant.nna.nombres} ${evaluatingParticipant.nna.apellidoPaterno}` : 'Participante'}
                                    </p>
                                </div>
                                <button onClick={() => setEvaluatingParticipantId(null)} className="hover:bg-black/10 p-2 rounded-full transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className="bg-info-soft p-4 rounded-xl border border-info/20 mb-6">
                                    <p className="text-[13px] text-info">
                                        <strong>Contexto Taller:</strong> {currentTaller.nombre}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-fg-muted uppercase mb-2 flex items-center gap-2">
                                        <StickyNote size={16} className="text-success" />
                                        5. Logros Alcanzados (Por el NNA)
                                    </label>
                                    <textarea
                                        value={evaluatingParticipant.logros || ''}
                                        onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'logros', e.target.value)}
                                        rows={3}
                                        className="w-full p-3.5 bg-surface-muted border border-border rounded-xl focus:border-success focus:ring-1 focus:ring-success outline-none resize-none shadow-sm text-[14px]"
                                        placeholder="¿Qué cambios u objetivos logró el NNA hoy?"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[11px] font-bold text-fg-muted uppercase mb-2 flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-warning" />
                                            6. Limitaciones
                                        </label>
                                        <textarea
                                            value={evaluatingParticipant.limitaciones || ''}
                                            onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'limitaciones', e.target.value)}
                                            rows={3}
                                            className="w-full p-3.5 bg-surface-muted border border-border rounded-xl focus:border-warning focus:ring-1 focus:ring-warning outline-none resize-none shadow-sm text-[14px]"
                                            placeholder="Dificultades específicas..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-fg-muted uppercase mb-2 flex items-center gap-2">
                                            <Lightbulb size={16} className="text-primary" />
                                            7. Sugerencias
                                        </label>
                                        <textarea
                                            value={evaluatingParticipant.sugerencias || ''}
                                            onChange={e => updateLocalEvaluation(evaluatingParticipant.nnaId, 'sugerencias', e.target.value)}
                                            rows={3}
                                            className="w-full p-3.5 bg-surface-muted border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none shadow-sm text-[14px]"
                                            placeholder="Recomendaciones futuras..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface-muted px-6 py-4 border-t border-border flex justify-end">
                                <Button onClick={saveEvaluation}>
                                    Guardar Evaluación
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-surface px-6 py-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${currentTaller.estado === 'EVALUADO' ? 'bg-success-soft text-success' :
                            currentTaller.estado === 'EJECUTADO' ? 'bg-info-soft text-info' :
                                'bg-surface-muted text-fg-muted'
                            }`}>
                            <Presentation size={18} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-fg leading-tight">
                                {currentTaller.nombre || 'Nuevo Taller'}
                            </h1>
                            <p className="text-[12px] text-fg-muted">Formato F7 · Talleres Socioeducativos</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {currentTaller.id && (
                            <div className="flex gap-1.5 border-r border-border pr-3 mr-1">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleDownloadPDF('formato-7-print-talleres', `F7_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                    disabled={isGeneratingPDF}
                                >
                                    {isGeneratingPDF ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />}
                                    F7
                                </Button>
                                {!currentTaller.esIndividual && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDownloadPDF('formato-10-print-talleres', `F10_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                            disabled={isGeneratingPDF}
                                        >
                                            <FileDown size={14} /> F10
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDownloadPDF('formato-11-print-talleres', `F11_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                            disabled={isGeneratingPDF}
                                        >
                                            <FileDown size={14} /> F11
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => setIsFormOpen(false)}
                        >
                            <X size={16} /> Volver
                        </Button>
                        <Button
                            onClick={handleSave}
                        >
                            <Save size={16} /> Guardar
                        </Button>
                    </div>
                </div>

                <div className="flex gap-0 border-b border-border bg-surface rounded-t-xl overflow-hidden">
                    <button
                        onClick={() => setActiveTab('planificacion')}
                        className={`px-5 py-3 font-semibold text-[13px] border-b-2 transition-colors ${activeTab === 'planificacion' ? 'border-primary text-primary bg-primary-soft/50' : 'border-transparent text-fg-muted hover:text-fg'}`}
                    >
                        1. Planificación (F7)
                    </button>
                    <button
                        onClick={() => {
                            if (!currentTaller.id) {
                                alert("Guarda la planificación primero para gestionar participantes.");
                                return;
                            }
                            setActiveTab('ejecucion');
                        }}
                        className={`px-5 py-3 font-semibold text-[13px] border-b-2 transition-colors ${activeTab === 'ejecucion' ? 'border-primary text-primary bg-primary-soft/50' : 'border-transparent text-fg-muted hover:text-fg'}`}
                    >
                        2. Ejecución y Evaluación (F8)
                    </button>
                </div>

                <div className="bg-surface rounded-b-xl border border-t-0 border-border shadow-sm p-6 min-h-[500px]">
                    {activeTab === 'planificacion' && (
                        <div className="space-y-8 max-w-5xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-fg-muted uppercase mb-1">Nombre del Taller</label>
                                        <input
                                            value={currentTaller.nombre}
                                            onChange={e => setCurrentTaller({ ...currentTaller, nombre: e.target.value })}
                                            className="w-full text-[15px] font-bold border-b border-border bg-transparent focus:border-primary outline-none py-2 text-fg placeholder-fg-muted"
                                            placeholder="Ej. Taller de Habilidades Blandas"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-fg-muted uppercase mb-1">Objetivo General</label>
                                        <textarea
                                            value={currentTaller.objetivo}
                                            onChange={e => setCurrentTaller({ ...currentTaller, objetivo: e.target.value })}
                                            rows={3}
                                            className="w-full p-3 bg-surface-muted rounded-xl border border-border resize-none focus:ring-1 focus:ring-primary focus:border-primary text-[14px]"
                                            placeholder="¿Qué queremos lograr con el grupo?"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-fg-muted uppercase mb-1">Fecha</label>
                                            <input
                                                type="date"
                                                value={currentTaller.fecha ? new Date(currentTaller.fecha).toISOString().split('T')[0] : ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, fecha: e.target.value })}
                                                className="w-full p-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-fg-muted uppercase mb-1">Hora</label>
                                            <input
                                                type="time"
                                                value={currentTaller.hora}
                                                onChange={e => setCurrentTaller({ ...currentTaller, hora: e.target.value })}
                                                className="w-full p-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-fg-muted uppercase mb-1">Lugar</label>
                                        <input
                                            value={currentTaller.lugar}
                                            onChange={e => setCurrentTaller({ ...currentTaller, lugar: e.target.value })}
                                            className="w-full p-2 bg-surface border border-border rounded-lg text-[13px] text-fg focus:ring-1 focus:ring-primary"
                                            placeholder="Ej. Loza Deportiva"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-dashed border-border pt-6">
                                <h3 className="font-bold text-fg mb-4 flex items-center gap-2">
                                    <BookOpen size={18} className="text-fg-muted" /> Esquema Metodológico
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-success-soft p-4 rounded-xl border border-success/20">
                                        <span className="text-[11px] font-black text-success">INICIO</span>
                                        <textarea
                                            value={currentTaller.inicioActividad || ''}
                                            onChange={e => setCurrentTaller({ ...currentTaller, inicioActividad: e.target.value })}
                                            className="w-full mt-2 bg-surface/50 border border-success/20 focus:border-success focus:ring-1 focus:ring-success rounded-lg text-[13px] p-2" rows={3} placeholder="Actividad..."
                                        />
                                    </div>
                                    <div className="bg-info-soft p-4 rounded-xl border border-info/20">
                                        <span className="text-[11px] font-black text-info">PROCESO</span>
                                        <textarea
                                            value={currentTaller.procesoActividad || ''}
                                            onChange={e => setCurrentTaller({ ...currentTaller, procesoActividad: e.target.value })}
                                            className="w-full mt-2 bg-surface/50 border border-info/20 focus:border-info focus:ring-1 focus:ring-info rounded-lg text-[13px] p-2" rows={3} placeholder="Actividad..."
                                        />
                                    </div>
                                    <div className="bg-primary-soft p-4 rounded-xl border border-primary/20">
                                        <span className="text-[11px] font-black text-primary">CIERRE</span>
                                        <textarea
                                            value={currentTaller.cierreActividad || ''}
                                            onChange={e => setCurrentTaller({ ...currentTaller, cierreActividad: e.target.value })}
                                            className="w-full mt-2 bg-surface/50 border border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-[13px] p-2" rows={3} placeholder="Actividad..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'ejecucion' && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="bg-warning-soft p-4 rounded-xl border border-warning/20 flex gap-4 items-start">
                                <AlertTriangle className="text-warning shrink-0 mt-1" size={20} />
                                <div className="flex-1">
                                    <label className="block text-[11px] font-bold text-warning uppercase mb-1">Informe de Asuntos Globales / Incidencias</label>
                                    <textarea
                                        value={currentTaller.incidenciasLogisticas || ''}
                                        onChange={e => setCurrentTaller({ ...currentTaller, incidenciasLogisticas: e.target.value })}
                                        className="w-full bg-surface border border-warning/20 rounded-lg p-2 text-[13px] focus:ring-1 focus:ring-warning outline-none"
                                        placeholder="Ej: Retraso por lluvia, falta de materiales, interrupciones externas..."
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="w-full md:w-1/3 space-y-4">
                                    <div className="bg-surface-muted p-4 rounded-xl border border-border">
                                        <label className="text-[11px] font-bold text-fg-muted uppercase block mb-2">Agregar Participante</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-fg-muted" size={16} />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                placeholder="Buscar NNA..."
                                                className="w-full pl-9 p-2 bg-surface border border-border rounded-lg text-[13px] focus:ring-1 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        {searchTerm && (
                                            <div className="mt-2 bg-surface rounded-lg shadow-lg border border-border max-h-60 overflow-y-auto">
                                                {filteredNNAs.length > 0 ? filteredNNAs.map((nna: any) => (
                                                    <button
                                                        key={nna.id}
                                                        onClick={() => handleAddParticipant(nna)}
                                                        disabled={currentTaller.participantes?.some(p => p.nnaId === nna.id)}
                                                        className="w-full text-left px-4 py-2 hover:bg-surface-muted flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <span className="text-[13px] font-medium">{nna.nombres} {nna.apellidoPaterno}</span>
                                                        <UserPlus size={14} className="text-primary" />
                                                    </button>
                                                )) : (
                                                    <div className="p-3 text-[12px] text-center text-fg-muted">No encontrado</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-primary-soft p-4 rounded-xl text-primary text-[14px]">
                                        <p className="font-bold flex items-center gap-2">
                                            <Users size={16} /> Total Lista: {currentTaller.participantes?.length || 0}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full">
                                            <thead className="bg-surface-muted text-[11px] font-bold text-fg-muted uppercase text-left border-b border-border">
                                                <tr>
                                                    <th className="px-4 py-3">Participante</th>
                                                    <th className="px-4 py-3 text-center">Asistencia</th>
                                                    <th className="px-4 py-3 text-center">Evaluación F8</th>
                                                    <th className="px-4 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {!currentTaller.participantes || currentTaller.participantes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-fg-muted text-[13px] italic">
                                                            Aún no hay participantes en la lista.
                                                        </td>
                                                    </tr>
                                                ) : currentTaller.participantes.map(p => (
                                                    <tr key={p.nnaId} className="hover:bg-surface-muted transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="text-[13px] font-bold text-fg">
                                                                {p.nna ? `${p.nna.nombres} ${p.nna.apellidoPaterno}` : `Participante ${p.nnaId}`}
                                                            </p>
                                                            {p.logros && (
                                                                <p className="text-[10px] text-success flex items-center gap-1 mt-0.5 font-medium">
                                                                    <CheckCircle2 size={10} /> Evaluado
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => toggleAsistencia(p.nnaId, p.asistio)}
                                                                className={`p-1 rounded-full transition-colors ${p.asistio ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg-muted hover:bg-border'}`}
                                                            >
                                                                <CheckCircle2 size={24} className={!p.asistio ? "opacity-50" : ""} />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <Button
                                                                size="sm"
                                                                variant={p.logros ? "secondary" : "outline"}
                                                                onClick={() => setEvaluatingParticipantId(p.nnaId)}
                                                                disabled={!p.asistio}
                                                                className={`mx-auto ${!p.asistio ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <Edit size={14} />
                                                                {p.logros ? 'Editar F8' : 'Evaluar'}
                                                            </Button>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button onClick={() => handleRemoveParticipant(p.nnaId)} className="text-fg-muted hover:text-danger p-1 rounded transition-colors">
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Componentes de impresión ocultos para MODO FORMULARIO */}
                {currentTaller && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato7Print taller={currentTaller} id="formato-7-print-talleres" />
                        <Formato10Print
                            taller={currentTaller}
                            participantes={currentTaller.participantes || []}
                            id="formato-10-print-talleres"
                        />
                        <Formato11Print
                            taller={currentTaller}
                            id="formato-11-print-talleres"
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface px-6 py-5 rounded-xl border border-border">
                <div>
                    <h1 className="text-xl font-bold text-fg flex items-center gap-2">
                        <Presentation size={20} className="text-primary" />
                        Talleres Socioeducativos
                    </h1>
                    <p className="text-fg-muted text-[13px] mt-0.5">Planificación (F7) y evaluación grupal (F8 / F10 / F11)</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-surface-muted p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setViewMode('calendario')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-[12px] transition-all ${viewMode === 'calendario' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                        >
                            <LayoutGrid size={14} /> Calendario
                        </button>
                        <button
                            onClick={() => setViewMode('lista')}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-[12px] transition-all ${viewMode === 'lista' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'}`}
                        >
                            <ListIcon size={14} /> Listado
                        </button>
                    </div>
                    <Button onClick={() => handleNewTaller()}>
                        <Plus size={16} /> Nuevo Taller
                    </Button>
                </div>
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-500">
                {viewMode === 'calendario' ? (
                    <WorkshopCalendar
                        talleres={talleres}
                        onSelectTaller={handleSelectFromCalendar}
                        onNewTaller={(date) => handleNewTaller(date)}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {talleres.map(taller => (
                            <div key={taller.id} className="bg-surface rounded-xl border border-border overflow-hidden hover:shadow-md hover:border-primary/40 transition-all group flex flex-col">
                                <div className="p-5 flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${taller.estado === 'EVALUADO' ? 'bg-success-soft text-success' :
                                            taller.estado === 'EJECUTADO' ? 'bg-info-soft text-info' :
                                                'bg-surface-muted text-fg-muted'
                                            }`}>
                                            {taller.estado}
                                        </span>
                                        <span className="text-[11px] text-fg-muted flex items-center gap-1">
                                            <CalendarIcon size={11} />
                                            {taller.fecha ? new Date(taller.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'S/F'}
                                        </span>
                                    </div>
                                    <h3 className="text-[15px] font-bold text-fg leading-tight mb-2 group-hover:text-primary transition-colors">
                                        {taller.nombre}
                                    </h3>
                                    <p className="text-[12px] text-fg-muted line-clamp-2 mb-4 italic">
                                        {taller.objetivo || 'Sin objetivo registrado'}
                                    </p>
                                    <div className="flex items-center gap-4 text-[11px] text-fg-muted">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={11} className="text-primary" />
                                            <span className="truncate max-w-[100px]">{taller.lugar || '—'}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={11} className="text-primary" />
                                            {taller.hora || '—'}
                                        </span>
                                        <span className="flex items-center gap-1 ml-auto">
                                            <Users size={11} className="text-primary" />
                                            <span className="font-semibold text-primary">{taller.participantes?.filter(p => p.asistio).length || 0}</span> asist.
                                        </span>
                                    </div>
                                </div>
                                <div className="px-5 py-3 border-t border-border bg-surface-muted">
                                    <Button
                                        className="w-full"
                                        onClick={() => handleSelectFromCalendar(taller)}
                                    >
                                        Gestionar sesión
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Componentes de impresión ocultos */}
            {currentTaller && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato7Print taller={currentTaller} id="formato-7-print-talleres" />
                    <Formato10Print
                        taller={currentTaller}
                        participantes={currentTaller.participantes || []}
                        id="formato-10-print-talleres"
                    />
                    <Formato11Print
                        taller={currentTaller}
                        id="formato-11-print-talleres"
                    />
                </div>
            )}
        </div>
    );
};
