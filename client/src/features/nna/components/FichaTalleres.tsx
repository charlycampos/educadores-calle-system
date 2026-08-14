import { etiquetaParentesco } from '../../../utils/parentesco';
import { useState, useEffect } from 'react';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import {
    Calendar, MapPin, CheckCircle2, User, Users, Plus, Link2,
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
    getTallerById,
    updateTaller,
    addParticipante,
    updateParticipante
} from '../../../api/talleres.api';
import type { Taller } from '../../../api/talleres.api';
import { useAuthStore } from '../../../store/auth.store';

interface FichaTalleresProps {
    nna?: any;
    onClose?: () => void;
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
            toast.error('Error al generar el PDF. Por favor, intente de nuevo.');
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
            const created = await createTaller({
                ...formF7,
                esIndividual: true,
                nnaAsociadoId: nna.id,
                educadorResponsableId: user?.id,
                estado: 'PLANIFICADO'
            });
            // Bug 1 fix: registrar al NNA como participante para que aparezca en su historial
            await addParticipante(created.id, nna.id);
            setShowPlanificarModal(false);
            loadTalleres();
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
            toast.error('Error al crear taller');
        }
    };

    // Bug 3 fix: ejecutar taller directamente desde el expediente
    const handleEjecutar = async (taller: any) => {
        if (!(await confirmar(`¿Confirmar que el taller "${taller.nombre}" ya fue ejecutado?`, { titulo: 'Registrar ejecución', textoConfirmar: 'Sí, ejecutado' }))) return;
        try {
            setLoading(true);
            // Obtener lista completa de participantes para no perderlos al ejecutar
            let fullTaller = await getTallerById(taller.id);
            if (!fullTaller.participantes || fullTaller.participantes.length === 0) {
                await addParticipante(taller.id, nna.id);
                fullTaller = await getTallerById(taller.id);
            }
            // El estado lo deriva el backend de la asistencia registrada.
            await updateTaller(taller.id, fullTaller, 'ejecucion');
            await loadTalleres();
        } catch (err) {
            console.error(err);
            toast.error('Error al registrar la ejecución del taller.');
        } finally {
            setLoading(false);
        }
    };

    const handleInscribir = async (tallerId: number) => {
        try {
            await addParticipante(tallerId, nna.id);
            setShowInscribirModal(false);
            loadTalleres();
        } catch (err) {
            toast.error('Error al inscribir');
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
            toast.error('Error al guardar evaluación');
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

    // Solo los talleres ya ejecutados cuentan para la participación: uno
    // planificado todavía no dice nada del proceso del NNA.
    const resumen = (() => {
        const realizados = talleres.filter((t: any) => t.estado !== 'PLANIFICADO');
        const asistio = realizados.filter((t: any) => (t.asistio ?? t.asiste)).length;
        const conFamilia = realizados.filter(
            (t: any) => (t.familiaresAcompanantes || []).some((f: any) => f.asistio)
        ).length;

        const familiares = [...new Set(
            realizados.flatMap((t: any) =>
                (t.familiaresAcompanantes || [])
                    .filter((f: any) => f.asistio)
                    .map((f: any) => f.nombres)
            )
        )] as string[];

        const fechas = realizados
            .filter((t: any) => (t.asistio ?? t.asiste) && t.fecha)
            .map((t: any) => new Date(t.fecha).getTime())
            .filter((n: number) => Number.isFinite(n));

        return {
            convocados: realizados.length,
            asistio,
            conFamilia,
            familiares,
            ultima: fechas.length ? new Date(Math.max(...fechas)).toLocaleDateString('es-PE') : '',
        };
    })();

    /** El párrafo que el educador pega en la sección III del informe. */
    const copiarResumen = async () => {
        const nombre = `${nna?.nombres ?? ''} ${nna?.apellidoPaterno ?? ''}`.trim();
        let texto = `${nombre} participó en ${resumen.asistio} de ${resumen.convocados} talleres socioeducativos ejecutados por el servicio`;
        if (resumen.ultima) texto += `, siendo su última participación el ${resumen.ultima}`;
        texto += '.';
        if (resumen.conFamilia > 0) {
            texto += ` En ${resumen.conFamilia} de ellos asistió acompañado de ${resumen.familiares.join(', ')}.`;
        }
        try {
            await navigator.clipboard.writeText(texto);
            toast.success('Resumen copiado. Pégalo en la sección III del informe.');
        } catch {
            // Sin permiso de portapapeles el educador igual necesita el texto.
            toast.info(texto);
        }
    };

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

                    <div className="grid grid-cols-1 gap-4">
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

            {talleres.length > 0 && (
                <HistorialTalleres
                    talleres={talleres}
                    resumen={resumen}
                    onSelect={setSelectedTaller}
                    onEjecutar={handleEjecutar}
                    onEvaluar={openEvaluar}
                    onCopiarResumen={copiarResumen}
                />
            )}

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
/** "Padre o madre" no entra al lado del nombre completo en una celda de tabla. */
const abreviarParentesco = (codigo: any): string => {
    const etiqueta = etiquetaParentesco(codigo) || '';
    return etiqueta
        .replace(/Padre o madre/i, 'Padre/madre')
        .replace(/Otro no familiar/i, 'No familiar')
        .replace(/Otro familiar/i, 'Familiar');
};

/**
 * Historial de participación del NNA en talleres, en registros.
 *
 * Se reemplazó la grilla de tarjetas: con nueve talleres obligaba a hacer
 * scroll para armarse una idea que debe leerse de un vistazo. La tabla y la
 * línea de asistencia muestran el patrón —si viene sostenido o dejó de venir—
 * que es justo lo que hay que juzgar para marcar el indicador 2 del F05.
 */
const HistorialTalleres = ({ talleres, resumen, onSelect, onEjecutar, onEvaluar, onCopiarResumen }: any) => {
    const [filtro, setFiltro] = useState<'todos' | 'asistio' | 'falto' | 'familia'>('todos');
    const [verTodos, setVerTodos] = useState(false);

    const asistioDe = (t: any) => (t.asistio !== undefined ? t.asistio : t.asiste);
    const conFamilia = (t: any) => (t.familiaresAcompanantes || []).some((f: any) => f.asistio);
    const realizados = talleres.filter((t: any) => t.estado !== 'PLANIFICADO');

    const conteos = {
        todos: talleres.length,
        asistio: realizados.filter(asistioDe).length,
        falto: realizados.filter((t: any) => !asistioDe(t)).length,
        familia: realizados.filter(conFamilia).length,
    };

    const filtrados = talleres.filter((t: any) => {
        if (filtro === 'todos') return true;
        if (t.estado === 'PLANIFICADO') return false;
        if (filtro === 'asistio') return asistioDe(t);
        if (filtro === 'falto') return !asistioDe(t);
        return conFamilia(t);
    });

    // Los más recientes primero: es lo que el educador necesita al abrir.
    const ordenados = [...filtrados].sort(
        (a: any, b: any) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime()
    );
    const visibles = verTodos ? ordenados : ordenados.slice(0, 15);

    const FILTROS: Array<[typeof filtro, string]> = [
        ['todos', 'Todos'], ['asistio', 'Asistió'], ['falto', 'Faltó'], ['familia', 'Con familia'],
    ];

    /** Cronología, del más antiguo al más reciente: así se lee el proceso. */
    const linea = [...realizados].sort(
        (a: any, b: any) => new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime()
    );

    const fechaCorta = (iso: any) => {
        if (!iso) return 's/f';
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
            ? 's/f'
            : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    const estadoNna = (t: any) => {
        if (t.estado === 'PLANIFICADO') return { txt: 'Planificado', cls: 'bg-surface-muted text-fg-muted' };
        if (!asistioDe(t)) return { txt: 'Faltó', cls: 'bg-danger-soft text-danger' };
        if (t.estado === 'EJECUTADO') return { txt: 'Sin F08', cls: 'bg-warning-soft text-warning' };
        return { txt: 'Asistió', cls: 'bg-success-soft text-success' };
    };

    return (
        <div className="space-y-3">
            {/* Cifras y línea de asistencia */}
            <div className="flex flex-wrap items-end gap-6">
                <div>
                    <p className="text-[11px] text-fg-muted">Asistencia</p>
                    <p className="text-2xl font-black text-fg leading-none">
                        {resumen.asistio}<span className="text-sm font-bold text-fg-muted"> / {resumen.convocados}</span>
                    </p>
                </div>
                <div>
                    <p className="text-[11px] text-fg-muted">Con familia</p>
                    <p className="text-2xl font-black text-fg leading-none">
                        {resumen.conFamilia}<span className="text-sm font-bold text-fg-muted"> / {resumen.convocados}</span>
                    </p>
                </div>
                {linea.length > 0 && (
                    <div className="flex-1 min-w-[180px]">
                        <p className="text-[11px] text-fg-muted mb-1.5">Línea de asistencia</p>
                        <div className="flex flex-wrap gap-1">
                            {linea.map((t: any) => {
                                const fue = asistioDe(t);
                                const fam = conFamilia(t);
                                return (
                                    <span
                                        key={t.id}
                                        title={`${fechaCorta(t.fecha)} · ${t.nombre} · ${fue ? 'asistió' : 'no asistió'}${fam ? ' con familia' : ''}`}
                                        className={`w-5 h-5 rounded-[4px] flex items-center justify-center text-[9px] ${
                                            fue ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
                                        }`}
                                    >
                                        {fue ? (fam ? <Users size={11} /> : '') : <X size={11} />}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Filtros con su conteo */}
            <div className="flex flex-wrap items-center gap-1.5">
                {FILTROS.map(([clave, etiqueta]) => (
                    <button
                        key={clave}
                        onClick={() => { setFiltro(clave); setVerTodos(false); }}
                        className={`px-2.5 py-1 rounded-[6px] text-[11px] font-bold border transition-colors ${
                            filtro === clave
                                ? 'bg-primary text-primary-fg border-primary'
                                : 'bg-surface text-fg-2 border-border hover:bg-surface-muted'
                        }`}
                    >
                        {etiqueta} · {conteos[clave]}
                    </button>
                ))}
                {resumen.convocados > 0 && (
                    <button
                        onClick={onCopiarResumen}
                        className="ml-auto px-2.5 py-1 rounded-[6px] text-[11px] font-bold border border-border text-fg-2 hover:bg-surface-muted flex items-center gap-1.5"
                    >
                        <StickyNote size={12} /> Copiar para el informe
                    </button>
                )}
            </div>

            {/* Registros */}
            <div className="border border-border rounded-[12px] overflow-hidden bg-surface">
                <table className="w-full text-[13px]" style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr className="bg-surface-muted text-[11px] text-fg-muted">
                            <th style={{ width: '9%' }} className="text-left px-3 py-2 font-bold">Fecha</th>
                            <th style={{ width: '39%' }} className="text-left px-3 py-2 font-bold">Taller</th>
                            <th style={{ width: '11%' }} className="text-left px-3 py-2 font-bold">NNA</th>
                            <th style={{ width: '29%' }} className="text-left px-3 py-2 font-bold">Acompañado por</th>
                            <th style={{ width: '12%' }} className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibles.map((t: any) => {
                            const est = estadoNna(t);
                            const acomp = t.familiaresAcompanantes || [];
                            return (
                                <tr key={t.id} className="border-t border-border hover:bg-surface-muted/40">
                                    <td className="px-3 py-2.5 text-fg-muted align-top whitespace-nowrap">{fechaCorta(t.fecha)}</td>
                                    <td className="px-3 py-2.5 align-top">
                                        <button
                                            onClick={() => onSelect(t)}
                                            title={t.nombre}
                                            className="text-left font-semibold text-fg hover:text-primary transition-colors block w-full truncate"
                                        >
                                            {t.nombre}
                                        </button>
                                        {t.evaluacion?.logros && (
                                            <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-1">{t.evaluacion.logros}</p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                        <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-bold whitespace-nowrap ${est.cls}`}>
                                            {est.txt}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 align-top">
                                        {acomp.length === 0 ? (
                                            <span className="text-[11px] text-fg-muted">—</span>
                                        ) : (
                                            <span
                                                title={acomp.map((f: any) => `${f.nombres}${f.asistio ? '' : ' (no asistió)'}`).join(' · ')}
                                                className="text-[11px] font-bold text-primary bg-primary-soft border border-primary/20 px-2 py-0.5 rounded-full inline-block max-w-full truncate"
                                            >
                                                {acomp[0].nombres}
                                                {acomp[0].parentesco ? ` · ${abreviarParentesco(acomp[0].parentesco)}` : ''}
                                                {acomp.length > 1 ? ` +${acomp.length - 1}` : ''}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5 align-top text-right">
                                        {t.estado === 'PLANIFICADO' && (
                                            <button onClick={() => onEjecutar(t)} className="text-[11px] font-bold text-primary hover:underline">
                                                Ejecutado
                                            </button>
                                        )}
                                        {t.estado === 'EJECUTADO' && (
                                            <button onClick={() => onEvaluar(t)} className="text-[11px] font-bold text-warning hover:underline">
                                                Evaluar F08
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {visibles.length === 0 && (
                            <tr className="border-t border-border">
                                <td colSpan={5} className="px-3 py-6 text-center text-[12px] text-fg-muted">
                                    Ningún taller con este filtro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {ordenados.length > 15 && !verTodos && (
                    <button
                        onClick={() => setVerTodos(true)}
                        className="w-full py-2.5 text-[11px] font-bold text-fg-muted hover:text-primary border-t border-border transition-colors"
                    >
                        Ver los {ordenados.length - 15} restantes
                    </button>
                )}
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
                        {taller.estado === 'EJECUTADO' && (
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

                            {/* F8 - Evaluación Individual */}
                            <button
                                onClick={() => handleDownloadPDF('formato-8-print-ficha', `F8_Evaluacion_${nna?.nombres.replace(/\s+/g, '_')}`)}
                                disabled={isGeneratingPDF}
                                className="bg-success text-white px-5 py-2.5 rounded-[16px] font-black text-xs uppercase tracking-widest shadow-lg hover:bg-success/90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGeneratingPDF ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
                                F8: Evaluación
                            </button>

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
                            <Formato10Print
                                taller={taller}
                                participantes={(taller.participantes || []).filter((p: any) => p.tipo !== 'FAMILIAR')}
                                id="formato-10-print-ficha"
                            />
                            <Formato11Print
                                taller={taller}
                                familiares={(taller.participantes || []).filter((p: any) => p.tipo === 'FAMILIAR')}
                                id="formato-11-print-ficha"
                            />
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
