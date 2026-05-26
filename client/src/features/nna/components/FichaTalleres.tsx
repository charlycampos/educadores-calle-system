import { useState, useEffect } from 'react';
import {
    Calendar, MapPin, CheckCircle2, User, Plus, Link2,
    StickyNote, AlertTriangle, Lightbulb, BookOpen,
    Clock, Save, X, Edit3, CheckSquare, Target, FileDown, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Formato7Print } from './Formato7Print';
import { Formato8Print } from './Formato8Print';
import { Formato10Print } from './Formato10Print';
import { Formato11Print } from './Formato11Print';
import {
    getTalleresByNna,
    createTaller,
    getTalleres,
    addParticipante,
    updateParticipante
} from '../../../api/talleres.api';
import type { Taller } from '../../../api/talleres.api';
import { useAuthStore } from '../../../store/auth.store';

interface FichaTalleresProps {
    nna?: any;
}

export const FichaTalleres = ({ nna }: FichaTalleresProps) => {
    const { user } = useAuthStore();
    const [talleres, setTalleres] = useState<any[]>([]);
    const [talleresDisponibles, setTalleresDisponibles] = useState<Taller[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTaller, setSelectedTaller] = useState<any | null>(null);
    const [showPlanificarModal, setShowPlanificarModal] = useState(false);
    const [showInscribirModal, setShowInscribirModal] = useState(false);
    const [showEvaluarModal, setShowEvaluarModal] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleDownloadPDF = async (elementId: string, filename: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        setIsGeneratingPDF(true);
        try {
            // Estrategia: Crear un iframe temporal con el contenido aislado
            // para evitar que html2canvas herede estilos de Tailwind con oklch
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '210mm';
            iframe.style.height = '297mm';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el iframe');

            // Copiar el contenido al iframe (sin estilos de Tailwind)
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

            // Esperar a que el iframe cargue
            await new Promise(resolve => setTimeout(resolve, 100));

            const iframeElement = iframeDoc.getElementById(elementId);
            if (!iframeElement) throw new Error('Elemento no encontrado en iframe');

            // Capturar desde el iframe (sin estilos oklch)
            const pdfCanvas = await html2canvas(iframeElement, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800,
                allowTaint: true
            });

            // Limpiar iframe
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

    // Formulario Planificación (F7)
    const [formF7, setFormF7] = useState({
        nombre: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: '10:00',
        lugar: '',
        objetivo: '',
        dirigidoA: 'NNA',
        inicioActividad: '',
        procesoActividad: '',
        cierreActividad: ''
    });

    // Formulario Evaluación (F8)
    const [formF8, setFormF8] = useState({
        asistio: true,
        logros: '',
        limitaciones: '',
        sugerencias: ''
    });

    useEffect(() => {
        if (nna?.id) {
            loadTalleres();
        }
    }, [nna?.id]);

    const loadTalleres = async () => {
        setLoading(true);
        try {
            const data = await getTalleresByNna(nna.id);
            setTalleres(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadTalleresDisponibles = async () => {
        try {
            const data = await getTalleres();
            // Filtrar talleres donde el NNA aún no esté inscrito
            const inscritosIds = talleres.map(t => t.id);
            const disponibles = data.filter(t => !inscritosIds.includes(t.id) && !t.esIndividual);
            setTalleresDisponibles(disponibles);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePlanificarIndividual = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTaller({
                ...formF7,
                esIndividual: true,
                nnaAsociadoId: nna.id,
                educadorResponsableId: user?.id,
                estado: 'PLANIFICADO'
            });
            setShowPlanificarModal(false);
            loadTalleres();
            // Reset form
            setFormF7({
                nombre: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: '10:00',
                lugar: '',
                objetivo: '',
                dirigidoA: 'NNA',
                inicioActividad: '',
                procesoActividad: '',
                cierreActividad: ''
            });
        } catch (err) {
            alert('Error al crear taller');
        }
    };

    const handleInscribir = async (tallerId: number) => {
        try {
            await addParticipante(tallerId, nna.id);
            setShowInscribirModal(false);
            loadTalleres();
        } catch (err) {
            alert('Error al inscribir');
        }
    };

    const handleEvaluar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTaller) return;
        try {
            await updateParticipante(selectedTaller.id, nna.id, formF8);
            setShowEvaluarModal(false);
            setSelectedTaller(null);
            loadTalleres();
        } catch (err) {
            alert('Error al guardar evaluación');
        }
    };

    const openEvaluar = (taller: any) => {
        setSelectedTaller(taller);
        setFormF8({
            asistio: taller.asistio ?? true,
            logros: taller.evaluacion?.logros || '',
            limitaciones: taller.evaluacion?.limitaciones || '',
            sugerencias: taller.evaluacion?.sugerencias || ''
        });
        setShowEvaluarModal(true);
    };

    // Clasificar talleres por estado
    const planificados = talleres.filter(t => t.estado === 'PLANIFICADO');
    const ejecutados = talleres.filter(t => t.estado === 'EJECUTADO');
    const evaluados = talleres.filter(t => t.estado === 'EVALUADO');

    if (selectedTaller && !showEvaluarModal) {
        return (
            <DetalleEvaluacion
                taller={selectedTaller}
                nna={nna}
                onBack={() => setSelectedTaller(null)}
                onEval={() => openEvaluar(selectedTaller)}
                isGeneratingPDF={isGeneratingPDF}
                handleDownloadPDF={handleDownloadPDF}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con acciones */}
            <div className="bg-primary rounded-[16px] p-6 text-primary-fg shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-fg/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black mb-1">Actuaciones: Talleres Socioeducativos</h2>
                            <p className="text-primary-fg/80 text-sm font-medium">
                                Fase 2: Desarrollo e Intervención - {nna?.nombres}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => setShowPlanificarModal(true)}
                            className="bg-surface text-primary px-5 py-3 rounded-[12px] font-bold flex items-center justify-center gap-2 hover:bg-surface-muted transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={20} />
                            Planificar Taller Individual (F7)
                        </button>
                        <button
                            onClick={() => {
                                loadTalleresDisponibles();
                                setShowInscribirModal(true);
                            }}
                            className="bg-primary-fg/10 backdrop-blur-md text-primary-fg border border-primary-fg/20 px-5 py-3 rounded-[12px] font-bold flex items-center justify-center gap-2 hover:bg-primary-fg/20 transition-all active:scale-95"
                        >
                            <Link2 size={20} />
                            Inscribir en Taller Grupal
                        </button>
                    </div>
                </div>
            </div>

            {/* Listados por estado */}
            <div className="grid grid-cols-1 gap-8">
                {planificados.length > 0 && (
                    <SeccionTalleres
                        titulo="📋 Talleres Planificados"
                        subtitulo="Pendientes de ejecución"
                        talleres={planificados}
                        color="blue"
                        onSelect={setSelectedTaller}
                    />
                )}

                {ejecutados.length > 0 && (
                    <SeccionTalleres
                        titulo="⏳ Talleres por Evaluar"
                        subtitulo="Actividades ejecutadas con pendiente de F8"
                        talleres={ejecutados}
                        color="yellow"
                        onSelect={setSelectedTaller}
                        onAction={(t: any) => openEvaluar(t)}
                        actionLabel="Evaluar (F8)"
                    />
                )}

                {evaluados.length > 0 && (
                    <SeccionTalleres
                        titulo="✅ Historial de Talleres"
                        subtitulo="Evaluaciones completadas"
                        talleres={evaluados}
                        color="green"
                        onSelect={setSelectedTaller}
                    />
                )}
            </div>

            {/* Empty state */}
            {talleres.length === 0 && !loading && (
                <div className="text-center py-20 bg-surface-muted rounded-[16px] border-2 border-dashed border-border">
                    <div className="bg-surface w-20 h-20 rounded-[12px] shadow-sm border border-border flex items-center justify-center mx-auto mb-6">
                        <BookOpen size={40} className="text-fg-muted" />
                    </div>
                    <h3 className="text-xl font-bold text-fg mb-2">Sin historial de talleres</h3>
                    <p className="text-fg-muted max-w-sm mx-auto mb-8">
                        Inicia el proceso de fortalecimiento de capacidades planificando un taller individual o inscribiéndolo en uno grupal.
                    </p>
                </div>
            )}

            {/* MODAL PLANIFICAR (F7) */}
            {showPlanificarModal && (
                <div className="fixed inset-0 bg-fg/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-surface rounded-[24px] shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-primary-soft/20 rounded-t-[24px]">
                            <div>
                                <h3 className="text-xl font-extrabold text-primary">FORMATO 07: Planificación de Taller</h3>
                                <p className="text-sm text-primary/80 font-medium italic">Intervención Individualizada para {nna?.nombres}</p>
                            </div>
                            <button onClick={() => setShowPlanificarModal(false)} className="p-2 hover:bg-surface rounded-full transition-colors">
                                <X size={24} className="text-fg-muted" />
                            </button>
                        </div>

                        <form onSubmit={handlePlanificarIndividual} className="p-8 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 block">Nombre del Taller</label>
                                    <input
                                        type="text" required
                                        value={formF7.nombre}
                                        onChange={e => setFormF7({ ...formF7, nombre: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all font-bold text-fg"
                                        placeholder="Ej. Taller de Habilidades Sociales"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 block">Fecha</label>
                                    <input
                                        type="date" required
                                        value={formF7.fecha}
                                        onChange={e => setFormF7({ ...formF7, fecha: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 block">Hora</label>
                                    <input
                                        type="time" required
                                        value={formF7.hora}
                                        onChange={e => setFormF7({ ...formF7, hora: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 block">Lugar</label>
                                    <input
                                        type="text" required
                                        value={formF7.lugar}
                                        onChange={e => setFormF7({ ...formF7, lugar: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all"
                                        placeholder="Ej. Centro de Referencia, Parque, etc."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-2 block">Objetivo</label>
                                    <textarea
                                        required rows={2}
                                        value={formF7.objetivo}
                                        onChange={e => setFormF7({ ...formF7, objetivo: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all"
                                        placeholder="Describa el objetivo pedagógico..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-fg border-l-4 border-primary pl-3">Metodología (Esquema del Taller)</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-primary uppercase mb-1 block">Inicio (Motivación)</label>
                                        <textarea
                                            rows={2}
                                            value={formF7.inicioActividad}
                                            onChange={e => setFormF7({ ...formF7, inicioActividad: e.target.value })}
                                            className="w-full bg-primary-soft/10 border border-primary/20 rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-primary uppercase mb-1 block">Proceso (Desarrollo)</label>
                                        <textarea
                                            rows={3}
                                            value={formF7.procesoActividad}
                                            onChange={e => setFormF7({ ...formF7, procesoActividad: e.target.value })}
                                            className="w-full bg-primary-soft/10 border border-primary/20 rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-primary uppercase mb-1 block">Cierre (Evaluación/Reflexión)</label>
                                        <textarea
                                            rows={2}
                                            value={formF7.cierreActividad}
                                            onChange={e => setFormF7({ ...formF7, cierreActividad: e.target.value })}
                                            className="w-full bg-primary-soft/10 border border-primary/20 rounded-[12px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-surface">
                                <button
                                    type="button" onClick={() => setShowPlanificarModal(false)}
                                    className="flex-1 bg-surface-muted text-fg-2 font-bold py-4 rounded-[16px] hover:bg-border/40 transition-all uppercase text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-3 bg-primary text-primary-fg font-black py-4 px-12 rounded-[16px] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase text-xs flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Guardar Planificación (F7)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL INSCRIBIR (Taller Grupal Existente) */}
            {showInscribirModal && (
                <div className="fixed inset-0 bg-fg/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-[24px] shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] animate-in zoom-in-95">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h3 className="text-xl font-extrabold text-fg">Inscribir en Taller Grupal</h3>
                            <button onClick={() => setShowInscribirModal(false)} className="p-2 hover:bg-surface-muted rounded-full">
                                <X size={24} className="text-fg-muted" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {talleresDisponibles.length === 0 ? (
                                <p className="text-center py-8 text-fg-muted italic">No hay talleres grupales disponibles actualmente.</p>
                            ) : (
                                talleresDisponibles.map(t => (
                                    <div
                                        key={t.id}
                                        className="border-2 border-border rounded-[16px] p-4 flex justify-between items-center hover:border-primary hover:bg-primary-soft/10 transition-all group"
                                    >
                                        <div>
                                            <h4 className="font-bold text-fg mb-1">{t.nombre}</h4>
                                            <div className="flex gap-4 text-xs text-fg-muted font-medium">
                                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(t.fecha).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><MapPin size={12} /> {t.lugar}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInscribir(t.id)}
                                            className="bg-primary text-primary-fg px-4 py-2 rounded-[12px] text-sm font-bold opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0"
                                        >
                                            Inscribir
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EVALUAR (F8) */}
            {showEvaluarModal && (
                <div className="fixed inset-0 bg-fg/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-[24px] shadow-2xl max-w-2xl w-full animate-in zoom-in-95">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-warning-soft/20 rounded-t-[24px]">
                            <div>
                                <h3 className="text-xl font-extrabold text-warning">FORMATO 08: Evaluación de Taller</h3>
                                <p className="text-sm text-warning/80 font-medium">Evaluación Individual: {nna?.nombres}</p>
                            </div>
                            <button onClick={() => setShowEvaluarModal(false)} className="p-2 hover:bg-surface rounded-full transition-colors">
                                <X size={24} className="text-fg-muted" />
                            </button>
                        </div>

                        <form onSubmit={handleEvaluar} className="p-8 space-y-6">
                            <div className="bg-warning-soft/30 p-4 rounded-[16px] border border-warning/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-warning uppercase tracking-wider">¿Asistió al taller?</span>
                                    <button
                                        type="button"
                                        onClick={() => setFormF8({ ...formF8, asistio: !formF8.asistio })}
                                        className={`px-4 py-2 rounded-[12px] font-bold text-sm transition-all shadow-sm ${formF8.asistio ? 'bg-success text-white' : 'bg-danger text-white'
                                            }`}
                                    >
                                        {formF8.asistio ? 'SÍ, ASISTIÓ' : 'NO ASISTIÓ'}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckSquare size={16} className="text-success" />
                                        <label className="text-xs font-black text-fg-muted uppercase tracking-widest">5. Logros Alcanzados</label>
                                    </div>
                                    <textarea
                                        required={formF8.asistio} rows={3}
                                        value={formF8.logros}
                                        onChange={e => setFormF8({ ...formF8, logros: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[16px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                        placeholder="Describa los avances del NNA..."
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={16} className="text-warning" />
                                        <label className="text-xs font-black text-fg-muted uppercase tracking-widest">6. Limitaciones</label>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={formF8.limitaciones}
                                        onChange={e => setFormF8({ ...formF8, limitaciones: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[16px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb size={16} className="text-primary" />
                                        <label className="text-xs font-black text-fg-muted uppercase tracking-widest">7. Sugerencias</label>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={formF8.sugerencias}
                                        onChange={e => setFormF8({ ...formF8, sugerencias: e.target.value })}
                                        className="w-full bg-surface-muted border-2 border-border rounded-[16px] px-4 py-3 focus:outline-none focus:border-primary transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-primary text-primary-fg font-black py-4 rounded-[16px] hover:bg-primary/90 transition-all shadow-lg uppercase text-xs flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                Finalizar Evaluación (F8)
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para sección de talleres
const SeccionTalleres = ({ titulo, subtitulo, talleres, color, onSelect, onAction, actionLabel }: any) => {
    const colorClasses = {
        blue: 'bg-primary-soft/10 border-primary/20 text-primary',
        yellow: 'bg-warning-soft/10 border-warning/20 text-warning',
        green: 'bg-success-soft/10 border-success/20 text-success',
    };

    const accentClasses = {
        blue: 'border-primary hover:bg-primary-soft/10',
        yellow: 'border-warning hover:bg-warning-soft/10',
        green: 'border-success hover:bg-success-soft/10',
    };

    return (
        <div className="space-y-4">
            <div className="flex items-baseline gap-3 mb-2 px-2">
                <h3 className="text-lg font-black text-fg tracking-tight">{titulo}</h3>
                <span className="text-[10px] uppercase font-bold text-fg-muted tracking-widest">{subtitulo}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {talleres.map((taller: any) => (
                    <div
                        key={taller.id}
                        className={`${colorClasses[color as keyof typeof colorClasses]} border-l-[6px] ${accentClasses[color as keyof typeof accentClasses]} rounded-2xl p-5 shadow-sm hover:translate-x-1 transition-all group relative`}
                    >
                        <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => onSelect(taller)}>
                            <div className="flex-1">
                                <h4 className="font-extrabold text-fg mb-2 group-hover:text-primary transition-colors">{taller.nombre}</h4>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-fg-muted uppercase tracking-tighter">
                                        <Calendar size={12} className="text-fg-muted" />
                                        {taller.fecha ? new Date(taller.fecha).toLocaleDateString() : 'S/F'}
                                        <span className="text-border mx-1">|</span>
                                        <Clock size={12} className="text-fg-muted" />
                                        {taller.hora}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-fg-muted uppercase tracking-tighter">
                                        <MapPin size={12} className="text-fg-muted" />
                                        {taller.lugar}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {taller.asistio !== undefined && (
                                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-black uppercase ${taller.asistio ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
                                        {taller.asistio ? 'SÍ ASISTIÓ' : 'NO ASISTIÓ'}
                                    </span>
                                )}
                            </div>
                        </div>

                        {onAction && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction(taller);
                                }}
                                className="mt-4 w-full bg-surface border-2 border-border text-fg-2 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest hover:border-warning hover:text-warning transition-all flex items-center justify-center gap-2"
                            >
                                <Edit3 size={12} />
                                {actionLabel}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Componente para mostrar detalle y evaluación del taller
const DetalleEvaluacion = ({ taller, nna, onBack, onEval, isGeneratingPDF, handleDownloadPDF }: any) => {
    const evalData = taller.evaluacion || {};

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-xs font-black text-fg-muted hover:text-primary transition-colors uppercase tracking-widest px-2"
            >
                ← Volver al Historial
            </button>

            <div className="bg-surface rounded-[24px] p-8 border border-border shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-soft rounded-full -mr-32 -mt-32 opacity-40 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4 relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-primary-soft text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                {taller.esIndividual ? 'Individual' : 'Grupal'}
                            </span>
                            <span className="bg-surface-muted text-fg-muted px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                Formato 7
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-fg tracking-tight leading-tight">{taller.nombre}</h2>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Botón de evaluación F8 - SOLO para talleres INDIVIDUALES */}
                        {taller.estado === 'EJECUTADO' && taller.esIndividual && (
                            <button
                                onClick={onEval}
                                className="bg-warning text-white px-6 py-3 rounded-[16px] font-black text-xs uppercase tracking-widest shadow-lg shadow-warning/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Completar Evaluación (F8) para {nna?.nombres}
                            </button>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {/* F7 - Planificación (TODOS los talleres) */}
                            <button
                                onClick={() => handleDownloadPDF('formato-7-print-ficha', `F7_Planificacion_${taller.nombre.replace(/\s+/g, '_')}`)}
                                disabled={isGeneratingPDF}
                                className="bg-primary text-primary-fg px-5 py-2.5 rounded-[16px] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingPDF ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                                F7: Planificación
                            </button>

                            {/* F8 - Evaluación Individual (SOLO talleres INDIVIDUALES) */}
                            {taller.esIndividual && (
                                <button
                                    onClick={() => handleDownloadPDF('formato-8-print-ficha', `F8_Evaluacion_${nna?.nombres.replace(/\s+/g, '_')}`)}
                                    disabled={isGeneratingPDF}
                                    className="bg-success text-white px-5 py-2.5 rounded-[16px] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-success/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isGeneratingPDF ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                                    F8: Evaluación
                                </button>
                            )}

                            {/* F10 y F11 - Asistencia (SOLO talleres GRUPALES) */}
                            {!taller.esIndividual && (
                                <>
                                    <button
                                        onClick={() => handleDownloadPDF('formato-10-print-ficha', `F10_Asistencia_NNA_${taller.nombre.replace(/\s+/g, '_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="bg-info text-white px-5 py-2.5 rounded-[16px] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-info/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <FileDown size={16} /> F10: Asis. NNA
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPDF('formato-11-print-ficha', `F11_Asistencia_Fam_${taller.nombre.replace(/\s+/g, '_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <FileDown size={16} /> F11: Asis. Familia
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Componentes de Generación (Fuera de la vista pero en el DOM) */}
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <Formato7Print taller={taller} id="formato-7-print-ficha" />
                    <Formato8Print taller={taller} nna={nna} id="formato-8-print-ficha" />
                    {!taller.esIndividual && (
                        <>
                            <Formato10Print taller={taller} participantes={taller.participantes} id="formato-10-print-ficha" />
                            <Formato11Print taller={taller} id="formato-11-print-ficha" />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Fecha y Hora</p>
                        <p className="text-sm font-bold text-fg-2 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            {new Date(taller.fecha).toLocaleDateString()} a las {taller.hora}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Lugar</p>
                        <p className="text-sm font-bold text-fg-2 flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            {taller.lugar}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-fg-muted uppercase tracking-widest">Responsable</p>
                        <p className="text-sm font-bold text-fg-2 flex items-center gap-2">
                            <User size={16} className="text-primary" />
                            {taller.educadorResponsable?.nombreCompleto || 'Educador Responsable'}
                        </p>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-surface-muted rounded-[16px] p-6 border border-border">
                        <h4 className="text-xs font-black text-fg-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Target size={14} className="text-primary" />
                            Objetivo del Fortalecimiento
                        </h4>
                        <p className="text-fg-2 italic font-medium leading-relaxed">{taller.objetivo}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-5 border-2 border-border rounded-[16px]">
                            <h5 className="text-[10px] font-black text-primary uppercase mb-2">I. Inicio (Motivación)</h5>
                            <p className="text-xs text-fg-muted leading-relaxed">{taller.inicioActividad || 'No especificado'}</p>
                        </div>
                        <div className="p-5 border-2 border-primary/20 bg-primary-soft/10 rounded-[16px]">
                            <h5 className="text-[10px] font-black text-primary uppercase mb-2">II. Proceso (Desarrollo)</h5>
                            <p className="text-xs text-fg-muted leading-relaxed">{taller.procesoActividad || 'No especificado'}</p>
                        </div>
                        <div className="p-5 border-2 border-border rounded-[16px]">
                            <h5 className="text-[10px] font-black text-primary uppercase mb-2">III. Cierre (Reflexión)</h5>
                            <p className="text-xs text-fg-muted leading-relaxed">{taller.cierreActividad || 'No especificado'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* F8 EVALUACION */}
            {taller.estado === 'EVALUADO' && (
                <div className="bg-surface rounded-[24px] border border-border shadow-sm overflow-hidden">
                    <div className="bg-success p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-success-fg/10 rounded-[16px] text-white">
                                <StickyNote size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Evaluación Individual (Formato 8)</h3>
                                <p className="text-success-fg/80 text-[10px] uppercase font-bold tracking-widest">Resultado de la Intervención</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-12">
                        <div className="flex items-start gap-8">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-success" />
                                    <h4 className="text-[10px] font-black text-fg-muted uppercase tracking-widest">5. Logros Alcanzados</h4>
                                </div>
                                <p className="text-fg font-medium leading-relaxed bg-success-soft/20 p-6 rounded-[20px] border border-success/20 shadow-inner">
                                    {evalData.logros}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={18} className="text-warning" />
                                    <h4 className="text-[10px] font-black text-fg-muted uppercase tracking-widest">6. Limitaciones</h4>
                                </div>
                                <p className="text-fg-2 text-sm font-medium leading-relaxed bg-surface-muted p-6 rounded-[20px] border border-border">
                                    {evalData.limitaciones || 'Ninguna identificada.'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Lightbulb size={18} className="text-primary" />
                                    <h4 className="text-[10px] font-black text-fg-muted uppercase tracking-widest">7. Sugerencias</h4>
                                </div>
                                <p className="text-fg-2 text-sm font-medium leading-relaxed bg-surface-muted p-6 rounded-[20px] border border-border">
                                    {evalData.sugerencias || 'No se registraron recomendaciones extra.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
