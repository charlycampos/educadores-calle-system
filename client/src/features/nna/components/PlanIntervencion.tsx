import { useState, useEffect } from 'react';
import {
    Plus, Trash2, Save, Printer, Target, AlertTriangle, ArrowLeft, Loader2, FileDown, Eye, Calendar, ClipboardCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useNnaStore } from '../../../store/nna.store';
import { Formato9Print } from './Formato9Print';
import { getAllPtisByCaso, createPti, updateAccion } from '../../../api/pti.api';
import type { PlanTrabajo, AccionPTI } from '../../../api/pti.api';

const PREDEFINED_ACTIVITIES: Record<string, string[]> = {
    SALUD: [
        "Afiliación al Seguro Integral de Salud (SIS) / Essalud",
        "Gestión de cita de control médico o dental",
        "Acompañamiento para tamizaje de anemia y nutrición",
        "Taller/Charla sobre hábitos de higiene y autocuidado"
    ],
    EDUCACION: [
        "Regularización de matrícula escolar / traslado",
        "Seguimiento de asistencia y rendimiento con profesores",
        "Inserción a reforzamiento escolar o talleres pedagógicos",
        "Matrícula en Educación Básiva Alternativa (EBA) / CETPRO"
    ],
    IDENTIDAD: [
        "Coordinación con RENIEC para expedición de DNI",
        "Búsqueda y obtención de partida de nacimiento",
        "Acompañamiento a campañas descentralizadas de documentación"
    ],
    FAMILIA: [
        "Visita de seguimiento y consejería familiar domiciliaria",
        "Derivación de referentes familiares a charlas/talleres de pautas de crianza",
        "Consejería para prevención de violencia intrafamiliar"
    ],
    OTROS: [
        "Participación en talleres de habilidades sociales y personales",
        "Derivación a talleres recreativos, deportivos o culturales",
        "Orientación vocacional e inserción técnico-productiva"
    ]
};

interface Actividad {
    id: number;
    descripcion: string;
    responsable: string;
    fechaInicio: string;
    fechaFin: string;
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO';
}

interface ObjetivoEspecifico {
    id: number;
    area: 'SALUD' | 'EDUCACION' | 'IDENTIDAD' | 'FAMILIA' | 'OTROS';
    descripcion: string;
    indicador: string;
    actividades: Actividad[];
}

interface PIIProps {
    nna: any;
    onClose?: () => void;
}

export const PlanIntervencion = ({ nna, onClose }: PIIProps) => {
    const { registerDocument } = useNnaStore();
    const [showInformeModal, setShowInformeModal] = useState(false);
    const [informeData, setInformeData] = useState({
        antecedentes: 'El NNA ingresó al servicio hace 3 meses...',
        analisis: 'Se observan avances parciales en la integración, sin embargo...',
        sustento: 'Se requiere un mes adicional para consolidar el vínculo de confianza y completar el diagnóstico social.',
        conclusiones: 'Es procedente la ampliación de la Fase I por 30 días.'
    });
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // View state and backend data
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [plans, setPlans] = useState<PlanTrabajo[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [errorPlans, setErrorPlans] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanTrabajo | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [objetivoGeneral, setObjetivoGeneral] = useState(
        'Lograr la restitución de los derechos vulnerados del NNA y su reinserción familiar/escolar.'
    );
    const [objetivos, setObjetivos] = useState<ObjetivoEspecifico[]>([
        {
            id: 1,
            area: 'IDENTIDAD',
            descripcion: 'Gestionar la obtención del DNI del NNA.',
            indicador: 'NNA cuenta con DNI físico.',
            actividades: [
                { id: 101, descripcion: 'Coordinación con RENIEC', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }
            ]
        }
    ]);

    const isReadOnly = viewMode === 'detail';

    const caso = nna.casos?.find((c: any) => c.estado !== 'CERRADO') || (nna.casos && nna.casos.length > 0 ? nna.casos[nna.casos.length - 1] : null);

    const fetchPlans = async () => {
        if (!caso?.id) {
            setLoadingPlans(false);
            return;
        }
        setLoadingPlans(true);
        setErrorPlans(null);
        try {
            const data = await getAllPtisByCaso(caso.id);
            setPlans(data || []);
        } catch (err: any) {
            console.error("Error fetching plans:", err);
            setErrorPlans(err.message || "Error al cargar los planes");
        } finally {
            setLoadingPlans(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, [caso?.id]);

    const handleStartCreate = () => {
        setObjetivoGeneral('Lograr la restitución de los derechos vulnerados del NNA y su reinserción familiar/escolar.');
        setObjetivos([
            {
                id: 1,
                area: 'IDENTIDAD',
                descripcion: 'Gestionar la obtención del DNI del NNA.',
                indicador: 'NNA cuenta con DNI físico.',
                actividades: [
                    { id: 101, descripcion: 'Coordinación con RENIEC', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }
                ]
            }
        ]);
        setSelectedPlan(null);
        setViewMode('create');
    };

    const loadPlanIntoState = (plan: PlanTrabajo) => {
        setObjetivoGeneral(plan.objetivoGeneral || '');
        
        const reconstructedObjetivos: ObjetivoEspecifico[] = [];
        (plan.acciones || []).forEach((accion, idx) => {
            const parts = (accion.descripcion || '').split(' | ');
            const area = (parts[0] || 'OTROS') as any;
            const objDesc = parts[1] || '';
            const actDesc = parts[2] || '';
            
            const dates = (accion.plazo || '').split(' a ');
            const fechaInicio = dates[0] || '';
            const fechaFin = dates[1] || '';
            
            let actEstado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' = 'PENDIENTE';
            if (accion.estado === 'CUMPLIDO') {
                actEstado = 'COMPLETADO';
            } else if (accion.estado === 'EN_PROCESO') {
                actEstado = 'EN_PROCESO';
            }
            
            let existingObj = reconstructedObjetivos.find(
                o => o.area === area && o.descripcion === objDesc
            );
            
            if (!existingObj) {
                existingObj = {
                    id: idx + 1,
                    area,
                    descripcion: objDesc,
                    indicador: accion.meta || '',
                    actividades: []
                };
                reconstructedObjetivos.push(existingObj);
            }
            
            if (actDesc.trim()) {
                existingObj.actividades.push({
                    id: accion.id || (idx * 1000 + existingObj.actividades.length + 1),
                    descripcion: actDesc,
                    responsable: accion.responsable || '',
                    fechaInicio,
                    fechaFin,
                    estado: actEstado
                });
            }
        });
        
        setObjetivos(reconstructedObjetivos);
    };

    const handleViewDetails = (plan: PlanTrabajo) => {
        setSelectedPlan(plan);
        loadPlanIntoState(plan);
        setViewMode('detail');
    };

    const handlePrintPlan = (plan: PlanTrabajo) => {
        loadPlanIntoState(plan);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const handleDownloadPDF = async () => {
        const elementId = 'formato-9-print-pii';
        const element = document.getElementById(elementId);
        if (!element) { alert('Error: No se encontró el formato para imprimir'); return; }

        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;left:-9999px;width:210mm;height:297mm';
            document.body.appendChild(iframe);
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el iframe');

            iframeDoc.open();
            iframeDoc.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:white;color:black;font-family:Arial,sans-serif}</style></head><body>${element.outerHTML}</body></html>`);
            iframeDoc.close();
            await new Promise(r => setTimeout(r, 100));

            const iframeElement = iframeDoc.getElementById(elementId);
            if (!iframeElement) throw new Error('Elemento no encontrado en iframe');

            const pdfCanvas = await html2canvas(iframeElement, {
                scale: 2, useCORS: true, logging: false,
                backgroundColor: '#ffffff', windowWidth: 800
            });
            document.body.removeChild(iframe);

            const imgData = pdfCanvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (pdfCanvas.height * w) / pdfCanvas.width, undefined, 'FAST');
            pdf.save(`F9_Acta_Compromiso_${nna?.nombres?.replace(/\s+/g, '_')}.pdf`);

            registerDocument({
                nnaId: nna.id,
                type: 'ACTA DE COMPROMISO (FORMATO 09)',
                code: `ACT-${new Date().getFullYear()}-001`,
                date: new Date().toISOString(),
                pages: 1,
                user: 'Usuario Sistema',
                status: 'GENERADO'
            });
        } catch (err) {
            console.error(err);
            alert('Error al generar el PDF.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const addObjetivo = () => {
        setObjetivos(prev => [...prev, { id: Date.now(), area: 'SALUD', descripcion: '', indicador: '', actividades: [] }]);
    };

    const addActividad = (objId: number) => {
        setObjetivos(prev => prev.map(obj =>
            obj.id !== objId ? obj : {
                ...obj,
                actividades: [...obj.actividades, {
                    id: Date.now(), descripcion: '', responsable: 'Educador',
                    fechaInicio: '', fechaFin: '', estado: 'PENDIENTE'
                }]
            }
        ));
    };

    const addPredefinedActividad = (objId: number, descripcion: string) => {
        setObjetivos(prev => prev.map(obj =>
            obj.id !== objId ? obj : {
                ...obj,
                actividades: [...obj.actividades, {
                    id: Date.now() + 1,
                    descripcion,
                    responsable: 'Educador',
                    fechaInicio: '',
                    fechaFin: '',
                    estado: 'PENDIENTE'
                }]
            }
        ));
    };

    const removeObjetivo = (id: number) => setObjetivos(prev => prev.filter(o => o.id !== id));

    const removeActividad = (objId: number, actId: number) => {
        setObjetivos(prev => prev.map(obj =>
            obj.id !== objId ? obj : { ...obj, actividades: obj.actividades.filter(a => a.id !== actId) }
        ));
    };

    const updateObjetivo = (index: number, key: string, value: string) => {
        setObjetivos(prev => {
            const next = [...prev];
            (next[index] as any)[key] = value;
            return next;
        });
    };

    const updateActividad = (objIndex: number, actId: number, key: string, value: string) => {
        setObjetivos(prev => {
            const next = [...prev];
            const actIdx = next[objIndex].actividades.findIndex(a => a.id === actId);
            (next[objIndex].actividades[actIdx] as any)[key] = value;
            return next;
        });
    };

    const handleSave = async () => {
        if (!caso?.id) {
            alert("No se puede guardar el plan: no hay un caso activo.");
            return;
        }
        setIsSaving(true);
        try {
            const acciones: AccionPTI[] = [];
            objetivos.forEach((obj) => {
                if (obj.actividades && obj.actividades.length > 0) {
                    obj.actividades.forEach((act) => {
                        const descripcion = `${obj.area} | ${obj.descripcion} | ${act.descripcion}`;
                        const plazo = `${act.fechaInicio} a ${act.fechaFin}`;
                        let estadoAccion: 'PENDIENTE' | 'EN_PROCESO' | 'CUMPLIDO' | 'CANCELADO' = 'PENDIENTE';
                        if (act.estado === 'COMPLETADO') {
                            estadoAccion = 'CUMPLIDO';
                        } else if (act.estado === 'EN_PROCESO') {
                            estadoAccion = 'EN_PROCESO';
                        }
                        
                        acciones.push({
                            descripcion,
                            meta: obj.indicador,
                            plazo,
                            responsable: act.responsable,
                            estado: estadoAccion
                        });
                    });
                } else {
                    const descripcion = `${obj.area} | ${obj.descripcion} | `;
                    acciones.push({
                        descripcion,
                        meta: obj.indicador,
                        plazo: 'a',
                        responsable: '',
                        estado: 'PENDIENTE'
                    });
                }
            });

            const payload = {
                caso_id: caso.id,
                objetivo_general: objetivoGeneral,
                acciones
            };

            await createPti(caso.id, payload as any);
            alert("Plan de intervención guardado con éxito.");
            setViewMode('list');
            fetchPlans();
        } catch (err: any) {
            console.error("Error saving plan:", err);
            alert("Error al guardar el plan de intervención.");
        } finally {
            setIsSaving(false);
        }
    };

    /* ── Informe de Ampliación (documento estilo papel) ── */
    if (showInformeModal) {
        return (
            <div className="bg-bg min-h-screen p-6 print:p-0 print:bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-5 print:hidden">
                        <button
                            onClick={() => setShowInformeModal(false)}
                            className="flex items-center gap-1.5 text-fg-muted hover:text-fg text-[13px] font-medium px-3 py-2 rounded-[6px] hover:bg-surface border border-transparent hover:border-border transition-all"
                        >
                            <ArrowLeft size={15} /> Volver al Plan
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                        >
                            <Printer size={15} /> Imprimir Informe
                        </button>
                    </div>

                    <div className="bg-white border border-border rounded-[4px] shadow-2 px-14 py-12 print:shadow-none print:border-none"
                        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.7' }}>
                        <div className="text-center border-b-2 border-[#333] pb-4 mb-8">
                            <h2 className="text-[15px] font-bold uppercase">Informe Técnico de Ampliación de Fase I</h2>
                            <h3 className="text-[13px] font-bold text-[#555]">Servicio de Educadores de Calle</h3>
                        </div>

                        <div className="flex justify-end mb-6">
                            <p className="text-[13px] font-bold">Fecha: {new Date().toLocaleDateString('es-PE')}</p>
                        </div>

                        <div className="space-y-5 text-justify">
                            {[
                                { roman: 'I', label: 'DATOS DEL USUARIO:',
                                  content: <><p><b>Nombres:</b> {nna?.nombres} {nna?.apellidoPaterno}</p><p><b>DNI:</b> {nna?.numeroDoc || '---'}</p></> },
                            ].map(s => (
                                <div key={s.roman}>
                                    <p className="font-bold underline mb-2">{s.roman}. {s.label}</p>
                                    {s.content}
                                </div>
                            ))}

                            {[
                                { key: 'antecedentes',  label: 'II. ANTECEDENTES:',                          rows: 3 },
                                { key: 'analisis',      label: 'III. ANÁLISIS DE CUMPLIMIENTO DE METAS:',     rows: 4 },
                                { key: 'sustento',      label: 'IV. SUSTENTO DE LA AMPLIACIÓN (1 mes):',      rows: 3 },
                                { key: 'conclusiones',  label: 'V. CONCLUSIÓN:',                              rows: 2 },
                            ].map(({ key, label, rows }) => (
                                <div key={key}>
                                    <p className="font-bold underline mb-2">{label}</p>
                                    {key === 'analisis' && (
                                        <div className="print:hidden bg-warning-soft border border-warning/20 rounded-[5px] px-3 py-2 mb-2 text-[12px] text-warning flex items-center gap-2"
                                            style={{ fontFamily: 'sans-serif' }}>
                                            <AlertTriangle size={13} />
                                            Si no se logran los resultados en 3 meses, se debe sustentar la ampliación.
                                        </div>
                                    )}
                                    <textarea
                                        value={(informeData as any)[key]}
                                        onChange={e => setInformeData(prev => ({ ...prev, [key]: e.target.value }))}
                                        rows={rows}
                                        className="w-full border border-dotted border-[#bbb] p-2 rounded-sm outline-none resize-vertical text-[13px] print:border-none print:p-0"
                                        style={{ fontFamily: 'inherit', lineHeight: 1.5 }}
                                    />
                                </div>
                            ))}

                            <div className="mt-16 pt-8 grid grid-cols-2 gap-16 text-center">
                                <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '48px' }}>
                                    <p className="font-bold">Educador/a Responsable</p>
                                </div>
                                <div style={{ borderTop: '1px solid #333', paddingTop: '6px', marginTop: '48px' }}>
                                    <p className="font-bold">V° B° Coordinación</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Helpers dinámicos ────────────────────────────────────────
    const calcProgress = (actividades: Actividad[]) => {
        const total = actividades.length;
        const completadas = actividades.filter(a => a.estado === 'COMPLETADO').length;
        const enProceso = actividades.filter(a => a.estado === 'EN_PROCESO').length;
        return { pct: total > 0 ? Math.round((completadas / total) * 100) : 0, total, completadas, enProceso };
    };

    const getSemaforo = (pct: number) => {
        if (pct >= 70) return { bar: 'bg-success', text: 'text-success', label: 'Al día' };
        if (pct >= 30) return { bar: 'bg-warning', text: 'text-warning', label: 'En proceso' };
        return { bar: 'bg-danger', text: 'text-danger', label: 'Pendiente' };
    };

    const getVigencia = (fechaInicio?: string) => {
        if (!fechaInicio) return null;
        const vence = new Date(fechaInicio);
        vence.setDate(vence.getDate() + 90);
        const dias = Math.ceil((vence.getTime() - Date.now()) / 86400000);
        return { dias, vencido: dias < 0, urgente: dias >= 0 && dias <= 15, vence };
    };

    const ESTADO_CYCLE: Record<string, 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'> = {
        PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'COMPLETADO', COMPLETADO: 'PENDIENTE'
    };

    const handleUpdateEstado = async (accionId: number, nuevoEstado: string) => {
        try {
            await updateAccion(accionId, { estado: nuevoEstado as any });
            setObjetivos(prev => prev.map(obj => ({
                ...obj,
                actividades: obj.actividades.map(act =>
                    act.id === accionId ? { ...act, estado: nuevoEstado as any } : act
                )
            })));
        } catch (err) {
            console.error('Error actualizando estado de actividad', err);
        }
    };

    const progresoGeneral = (() => {
        const total = objetivos.reduce((s, o) => s + o.actividades.length, 0);
        const done  = objetivos.reduce((s, o) => s + o.actividades.filter(a => a.estado === 'COMPLETADO').length, 0);
        return { pct: total > 0 ? Math.round((done / total) * 100) : 0, done, total };
    })();

    const areaColors: Record<string, { badge: string, accent: string, text: string }> = {
        SALUD: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700' },
        EDUCACION: { badge: 'bg-blue-50 text-blue-700 border-blue-200', accent: 'bg-blue-500', text: 'text-blue-700' },
        IDENTIDAD: { badge: 'bg-purple-50 text-purple-700 border-purple-200', accent: 'bg-purple-500', text: 'text-purple-700' },
        FAMILIA: { badge: 'bg-rose-50 text-rose-700 border-rose-200', accent: 'bg-rose-500', text: 'text-rose-700' },
        OTROS: { badge: 'bg-gray-100 text-gray-700 border-gray-300', accent: 'bg-gray-400', text: 'text-gray-600' }
    };

    if (viewMode === 'list') {
        return (
            <div className="bg-bg min-h-screen p-8 flex flex-col justify-between">
                <div>
                    {/* Header Premium con Gradiente */}
                    <div className="bg-gradient-to-r from-primary to-primary-hover px-8 py-6 rounded-xl shadow-md mb-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                                    <Target className="text-white" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-[19px] font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
                                        Historial de Planes de Intervención (PII)
                                    </h1>
                                    <p className="text-white/80 text-[12px] mt-0.5 font-medium">
                                        Planificación estratégica · Restitución de derechos fundamentales
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                                <div className="text-left md:text-right md:border-r border-white/20 md:pr-4">
                                    <p className="text-[10px] text-white/60 uppercase font-semibold tracking-wider">Beneficiario NNA</p>
                                    <p className="font-bold text-white text-[15px]">
                                        {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno || ''}
                                    </p>
                                </div>
                                {onClose && (
                                    <button
                                        onClick={onClose}
                                        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 duration-150"
                                    >
                                        <ArrowLeft size={15} /> Volver
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {loadingPlans ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary mb-3" size={32} />
                            <p className="text-fg-secondary text-sm">Cargando planes de intervención...</p>
                        </div>
                    ) : errorPlans ? (
                        <div className="bg-danger-soft border border-danger/20 rounded-xl p-6 text-center max-w-xl mx-auto">
                            <AlertTriangle className="text-danger mx-auto mb-3" size={32} />
                            <p className="text-danger font-semibold mb-2">{errorPlans}</p>
                            <button onClick={fetchPlans} className="text-xs bg-danger text-white px-4 py-2 rounded-lg font-bold">Reintentar</button>
                        </div>
                    ) : plans.length === 0 ? (
                        /* Premium Empty State */
                        <div className="bg-surface border border-border rounded-xl p-12 text-center max-w-2xl mx-auto shadow-sm">
                            <div className="w-16 h-16 bg-primary-soft text-primary rounded-full flex items-center justify-center mx-auto mb-5 border border-primary/10">
                                <ClipboardCheck size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-fg mb-2">No hay planes de intervención registrados</h3>
                            <p className="text-fg-muted text-sm mb-8 max-w-md mx-auto">
                                El Plan de Intervención Individual (PII) permite establecer objetivos y tareas para lograr la restitución de los derechos vulnerados del NNA.
                            </p>
                            <button
                                onClick={handleStartCreate}
                                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md shadow-primary/10 transition-all hover:shadow-lg active:scale-95"
                            >
                                <Plus size={18} /> Crear Plan de Intervención (PII)
                            </button>
                        </div>
                    ) : (
                        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden max-w-6xl mx-auto">
                            <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-surface-muted/50">
                                <h3 className="font-bold text-fg text-sm uppercase">Planes Registrados</h3>
                                <button
                                    onClick={handleStartCreate}
                                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm"
                                >
                                    <Plus size={14} /> Crear Nuevo Plan
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-surface-muted/30 text-[10px] font-extrabold text-fg-muted uppercase tracking-wider">
                                            <th className="px-6 py-3">Código</th>
                                            <th className="px-6 py-3">Fecha Inicio</th>
                                            <th className="px-6 py-3">Vigencia (90 días)</th>
                                            <th className="px-6 py-3">Avance</th>
                                            <th className="px-6 py-3">Estado</th>
                                            <th className="px-6 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-[13px] text-fg font-medium">
                                        {plans.map((plan) => {
                                            const vig = getVigencia(plan.fechaInicio || plan.createdAt);
                                            const totalAcc = plan.acciones?.length ?? 0;
                                            const doneAcc = plan.acciones?.filter(a => a.estado === 'CUMPLIDO' || a.estado === 'COMPLETADO').length ?? 0;
                                            const pctPlan = totalAcc > 0 ? Math.round((doneAcc / totalAcc) * 100) : 0;
                                            const sem = getSemaforo(pctPlan);
                                            return (
                                                <tr key={plan.id} className="hover:bg-surface-muted/20 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-primary">
                                                        {plan.codigoPti || `PII-${new Date(plan.fechaInicio || plan.createdAt).getFullYear()}-${String(plan.id).padStart(4, '0')}`}
                                                    </td>
                                                    <td className="px-6 py-4 text-fg-secondary">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar size={14} className="text-fg-muted" />
                                                            {plan.fechaInicio
                                                                ? new Date(plan.fechaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                                : '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {vig ? (
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                                vig.vencido ? 'bg-danger-soft text-danger border border-danger/20' :
                                                                vig.urgente ? 'bg-warning-soft text-warning border border-warning/20' :
                                                                'bg-success-soft text-success border border-success/20'
                                                            }`}>
                                                                {vig.vencido ? `Vencido ${Math.abs(vig.dias)}d` : `${vig.dias}d restantes`}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 min-w-[80px]">
                                                            <div className="flex-1 bg-border rounded-full h-1.5">
                                                                <div className={`h-1.5 rounded-full ${sem.bar}`} style={{ width: `${pctPlan}%` }} />
                                                            </div>
                                                            <span className={`text-[10px] font-bold ${sem.text}`}>{pctPlan}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                                            plan.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                        }`}>
                                                            {plan.estado}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleViewDetails(plan)}
                                                            className="inline-flex items-center gap-1.5 bg-surface border border-border hover:border-border-strong text-fg-secondary hover:text-fg px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                        >
                                                            <Eye size={13} /> Ver / Actualizar
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintPlan(plan)}
                                                            className="inline-flex items-center gap-1.5 bg-surface border border-border hover:border-border-strong text-fg-secondary hover:text-fg px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                                        >
                                                            <Printer size={13} /> Imprimir
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /* ── Vista principal del PTI (Edición / Creación / Lectura) ── */
    return (
        <div className="bg-bg min-h-screen print:bg-white print:p-0 flex flex-col justify-between">

            <div>
                {/* Header Premium con Gradiente */}
                <div className="bg-gradient-to-r from-primary to-primary-hover px-8 py-6 shadow-md print:hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
                                <Target className="text-white" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-[19px] font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
                                    {isReadOnly ? 'Plan de Intervención — Seguimiento' : 'Plan de Intervención Individual'}
                                </h1>
                                <p className="text-white/80 text-[12px] mt-0.5 font-medium">
                                    {isReadOnly ? (selectedPlan?.codigoPti || `PII-${selectedPlan?.id}`) : 'Planificación estratégica · Restitución de derechos fundamentales'}
                                </p>
                                {isReadOnly && (
                                    <div className="mt-2 flex items-center gap-4">
                                        {/* Barra progreso general */}
                                        <div className="flex items-center gap-2 flex-1 max-w-xs">
                                            <div className="flex-1 bg-white/20 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${getSemaforo(progresoGeneral.pct).bar}`}
                                                    style={{ width: `${progresoGeneral.pct}%` }}
                                                />
                                            </div>
                                            <span className="text-white font-bold text-[12px]">{progresoGeneral.pct}%</span>
                                            <span className="text-white/60 text-[11px]">({progresoGeneral.done}/{progresoGeneral.total} actividades)</span>
                                        </div>
                                        {/* Vigencia */}
                                        {(() => {
                                            const vig = getVigencia(selectedPlan?.fechaInicio);
                                            if (!vig) return null;
                                            return (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                    vig.vencido ? 'bg-danger text-white' :
                                                    vig.urgente ? 'bg-warning text-white' :
                                                    'bg-white/20 text-white'
                                                }`}>
                                                    {vig.vencido ? `Vencido hace ${Math.abs(vig.dias)}d` : `Vigente · ${vig.dias}d restantes`}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
                            <div className="text-left md:text-right md:border-r border-white/20 md:pr-4">
                                <p className="text-[10px] text-white/60 uppercase font-semibold tracking-wider">Beneficiario NNA</p>
                                <p className="font-bold text-white text-[15px]">
                                    {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno || ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setViewMode('list')}
                                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 duration-150"
                            >
                                <ArrowLeft size={15} /> Volver a la Lista
                            </button>
                            {!isReadOnly && (
                                <button
                                    onClick={() => setShowInformeModal(true)}
                                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-[12px] font-bold shadow-md shadow-amber-955/10 hover:shadow-lg transition-all active:scale-95 duration-150"
                                >
                                    <AlertTriangle size={15} /> Inf. Ampliación
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Print-only header */}
                <div className="hidden print:block text-center py-8">
                    <h2 className="text-xl font-bold uppercase">Plan de Intervención Individual (PTI)</h2>
                    <h3 className="text-sm">Servicio de Educadores de Calle · INABIF</h3>
                </div>

                <div className="px-8 py-10 max-w-6xl mx-auto space-y-8">
                    {/* Objetivo General */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                        <label className="block text-[11px] font-bold text-fg-muted uppercase tracking-wider mb-3">
                            Objetivo General de la Intervención
                        </label>
                        <textarea
                            value={objetivoGeneral}
                            onChange={e => setObjetivoGeneral(e.target.value)}
                            disabled={isReadOnly}
                            rows={2}
                            placeholder="Describa el objetivo general para la reinserción del menor..."
                            className="w-full px-4 py-3 border border-border hover:border-border-strong rounded-lg bg-surface text-fg text-[13px] font-medium outline-none resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 print:border-none print:bg-transparent print:p-0 disabled:opacity-85"
                        />
                    </div>

                    {/* Objetivos específicos (.objcard style) */}
                    <div className="space-y-8">
                        {objetivos.map((obj, index) => {
                            const currentTheme = areaColors[obj.area] || areaColors.OTROS;
                            return (
                                <div key={obj.id} className="relative border border-border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-surface pl-2.5">
                                    {/* Left Accent Color bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${currentTheme.accent}`} />

                                    {/* Header objetivo */}
                                    <div className="bg-surface-muted border-b border-border px-6 py-3 flex flex-col md:flex-row md:items-center gap-4 justify-between print:bg-transparent">
                                        {/* Barra de progreso por área */}
                                        {obj.actividades.length > 0 && (() => {
                                            const prog = calcProgress(obj.actividades);
                                            const sem = getSemaforo(prog.pct);
                                            return (
                                                <div className="absolute top-0 left-2.5 right-0 h-0.5">
                                                    <div className={`h-0.5 ${sem.bar} transition-all`} style={{ width: `${prog.pct}%` }} />
                                                </div>
                                            );
                                        })()}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="bg-primary-soft text-primary text-[11px] font-extrabold px-3 py-1.5 rounded-lg uppercase tracking-wide border border-primary/10">
                                                    Obj. {index + 1}
                                                </span>
                                                <select
                                                    value={obj.area}
                                                    disabled={isReadOnly}
                                                    onChange={e => updateObjetivo(index, 'area', e.target.value)}
                                                    className="text-[12px] font-bold text-fg-secondary bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:text-primary transition-all print:appearance-none"
                                                >
                                                    <option value="SALUD">ÁREA: SALUD</option>
                                                    <option value="EDUCACION">ÁREA: EDUCACIÓN</option>
                                                    <option value="IDENTIDAD">ÁREA: IDENTIDAD</option>
                                                    <option value="FAMILIA">ÁREA: FAMILIA</option>
                                                    <option value="OTROS">ÁREA: OTROS</option>
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                value={obj.descripcion}
                                                disabled={isReadOnly}
                                                onChange={e => updateObjetivo(index, 'descripcion', e.target.value)}
                                                placeholder="Describa el objetivo específico…"
                                                className="flex-1 bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-4 py-1.5 text-[13px] font-bold text-fg placeholder-fg-muted outline-none transition-all min-w-0 disabled:opacity-85"
                                            />
                                        </div>
                                        {/* Semáforo de avance */}
                                        {obj.actividades.length > 0 && (() => {
                                            const prog = calcProgress(obj.actividades);
                                            const sem = getSemaforo(prog.pct);
                                            return (
                                                <div className="flex items-center gap-2 shrink-0 print:hidden">
                                                    <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1">
                                                        <div className={`w-2 h-2 rounded-full ${sem.bar}`} />
                                                        <span className={`text-[10px] font-bold ${sem.text}`}>{prog.pct}%</span>
                                                        <span className="text-[10px] text-fg-muted">{prog.completadas}/{prog.total}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => removeObjetivo(obj.id)}
                                                className="text-fg-muted hover:text-danger hover:bg-danger-soft p-2 rounded-lg transition-all print:hidden flex-shrink-0 self-end md:self-auto"
                                                title="Eliminar Objetivo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Actividades */}
                                    <div className="p-6">
                                        {/* Encabezado columnas */}
                                        <div className="hidden md:grid grid-cols-12 gap-3 mb-3 text-[10px] font-extrabold text-fg-muted uppercase tracking-wider px-3">
                                            <div className="col-span-3">Actividad / Tarea</div>
                                            <div className="col-span-2">Responsable</div>
                                            <div className="col-span-2">Fecha Inicio</div>
                                            <div className="col-span-2">Fecha Fin</div>
                                            <div className="col-span-2">Estado</div>
                                            <div className="col-span-1"></div>
                                        </div>

                                        <div className="space-y-2">
                                            {obj.actividades.map(act => (
                                                <div
                                                    key={act.id}
                                                    className="grid grid-cols-12 gap-3 items-center p-2 rounded-xl border border-border bg-surface hover:bg-surface-muted/50 hover:shadow-2xs transition-all duration-200 print:border-b print:border-border print:rounded-none"
                                                >
                                                    <div className="col-span-12 md:col-span-3">
                                                        <label className="block md:hidden text-[9px] font-bold text-fg-muted uppercase mb-1">Actividad / Tarea</label>
                                                        <input
                                                            type="text"
                                                            value={act.descripcion}
                                                            disabled={isReadOnly}
                                                            onChange={e => updateActividad(index, act.id, 'descripcion', e.target.value)}
                                                            placeholder="Descripción de la actividad"
                                                            className="w-full bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-[13px] text-fg font-medium placeholder-fg-muted outline-none transition-all duration-200 disabled:opacity-85"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 sm:col-span-4 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-fg-muted uppercase mb-1">Responsable</label>
                                                        <input
                                                            type="text"
                                                            value={act.responsable}
                                                            disabled={isReadOnly}
                                                            onChange={e => updateActividad(index, act.id, 'responsable', e.target.value)}
                                                            placeholder="Responsable"
                                                            className="w-full bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-[13px] text-fg font-medium outline-none transition-all duration-200 disabled:opacity-85"
                                                        />
                                                    </div>
                                                    <div className="col-span-6 sm:col-span-3 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-fg-muted uppercase mb-1">Fecha Inicio</label>
                                                        <input
                                                            type="date"
                                                            value={act.fechaInicio}
                                                            disabled={isReadOnly}
                                                            onChange={e => updateActividad(index, act.id, 'fechaInicio', e.target.value)}
                                                            className="w-full bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-[13px] text-fg font-medium outline-none transition-all duration-200 disabled:opacity-85"
                                                        />
                                                    </div>
                                                    <div className="col-span-6 sm:col-span-3 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-fg-muted uppercase mb-1">Fecha Fin</label>
                                                        <input
                                                            type="date"
                                                            value={act.fechaFin}
                                                            disabled={isReadOnly}
                                                            onChange={e => updateActividad(index, act.id, 'fechaFin', e.target.value)}
                                                            className="w-full bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-[13px] text-fg font-medium outline-none transition-all duration-200 disabled:opacity-85"
                                                        />
                                                    </div>
                                                    <div className="col-span-12 sm:col-span-4 md:col-span-2">
                                                        <label className="block md:hidden text-[9px] font-bold text-fg-muted uppercase mb-1">Estado</label>
                                                        {isReadOnly ? (
                                                            <button
                                                                onClick={() => act.id && handleUpdateEstado(act.id, ESTADO_CYCLE[act.estado] || 'PENDIENTE')}
                                                                title="Clic para avanzar estado"
                                                                className={`w-full py-2 rounded-lg text-[11px] font-bold uppercase transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                                                                    act.estado === 'COMPLETADO' ? 'bg-success-soft text-success border-success/30' :
                                                                    act.estado === 'EN_PROCESO' ? 'bg-warning-soft text-warning border-warning/30' :
                                                                    'bg-surface-muted text-fg-muted border-border hover:border-primary/30'
                                                                }`}
                                                            >
                                                                {act.estado === 'COMPLETADO' ? '✓ Completado' :
                                                                 act.estado === 'EN_PROCESO'  ? '⟳ En proceso' : '○ Pendiente'}
                                                            </button>
                                                        ) : (
                                                            <select
                                                                value={act.estado}
                                                                onChange={e => updateActividad(index, act.id, 'estado', e.target.value as any)}
                                                                className="w-full bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-[13px] text-fg font-medium outline-none transition-all duration-200"
                                                            >
                                                                <option value="PENDIENTE">PENDIENTE</option>
                                                                <option value="EN_PROCESO">EN PROCESO</option>
                                                                <option value="COMPLETADO">COMPLETADO</option>
                                                            </select>
                                                        )}
                                                    </div>
                                                    <div className="col-span-12 sm:col-span-2 md:col-span-1 flex justify-end md:justify-center print:hidden">
                                                        {!isReadOnly && (
                                                            <button
                                                                onClick={() => removeActividad(obj.id, act.id)}
                                                                className="text-fg-muted hover:text-danger hover:bg-danger-soft p-2 rounded-lg transition-all"
                                                                title="Eliminar Actividad"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {!isReadOnly && (
                                            <div className="mt-5 flex flex-wrap items-center gap-3 print:hidden">
                                                <button
                                                    onClick={() => addActividad(obj.id)}
                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary-hover uppercase tracking-wider transition-colors py-1.5 active:scale-95 duration-150"
                                                >
                                                    <Plus size={14} /> Agregar Actividad Vacía
                                                </button>
                                                
                                                <div className="hidden sm:block h-4 w-px bg-border" />
                                                
                                                <div className="flex items-center gap-1.5 bg-surface border border-border hover:border-border-strong focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-lg px-3 py-1.5 transition-all shadow-2xs">
                                                    <select
                                                        value=""
                                                        onChange={e => {
                                                            if (e.target.value) {
                                                                addPredefinedActividad(obj.id, e.target.value);
                                                                e.target.value = ""; // Reset
                                                            }
                                                        }}
                                                        className="text-[11px] font-bold text-fg-secondary bg-transparent border-none outline-none cursor-pointer hover:text-primary"
                                                    >
                                                        <option value="">+ AGREGAR TAREA SUGERIDA...</option>
                                                        {(PREDEFINED_ACTIVITIES[obj.area] || PREDEFINED_ACTIVITIES.OTROS).map((desc, idx) => (
                                                            <option key={idx} value={desc}>{desc}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Indicador */}
                                        <div className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-muted/50 rounded-xl p-4">
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="p-1.5 bg-primary-soft text-primary rounded-lg border border-primary/10">
                                                    <Target size={15} className="flex-shrink-0" />
                                                </div>
                                                <span className="text-[10px] font-extrabold text-fg-muted uppercase tracking-wider">Meta / Indicador:</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={obj.indicador}
                                                disabled={isReadOnly}
                                                onChange={e => updateObjetivo(index, 'indicador', e.target.value)}
                                                placeholder="Ej: NNA cuenta con documento de identidad físico..."
                                                className="flex-1 bg-surface border border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3.5 py-2 outline-none text-[13px] text-fg font-medium italic placeholder-fg-muted transition-all duration-200 disabled:opacity-85"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Agregar objetivo */}
                    {!isReadOnly && (
                        <button
                            onClick={addObjetivo}
                            className="mt-6 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border-strong hover:border-primary/50 text-fg-secondary hover:text-primary hover:bg-primary-soft/10 px-6 py-4 rounded-xl font-bold text-[13px] tracking-wide transition-all duration-200 print:hidden active:scale-[0.99]"
                        >
                            <Plus size={16} /> Agregar Objetivo Específico
                        </button>
                    )}

                    {/* Firmas */}
                    <div className="mt-20 pt-10 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-20 text-center text-[13px]">
                        <div>
                            <div className="h-px bg-fg-2 w-48 mx-auto mb-2 mt-8"></div>
                            <p className="font-bold text-fg-2">Firma del Educador/a</p>
                        </div>
                        <div>
                            <div className="h-px bg-fg-2 w-48 mx-auto mb-2 mt-8"></div>
                            <p className="font-bold text-fg-2">V° B° Coordinación</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer acciones */}
            <div className="bg-surface border-t border-border px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center mt-8 print:hidden shadow-lg sticky bottom-0 z-50">
                <p className="text-[11px] text-fg-muted font-medium text-center sm:text-left">Asegúrese de guardar los cambios antes de imprimir o descargar del sistema.</p>
                <div className="flex flex-wrap justify-center sm:justify-end gap-2.5 w-full sm:w-auto">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-1.5 bg-surface border border-border hover:bg-surface-muted hover:border-border-strong text-fg px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 shadow-2xs w-full sm:w-auto active:scale-95"
                    >
                        <Printer size={15} /> Imprimir PTI
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="flex items-center justify-center gap-1.5 bg-surface border border-border hover:bg-surface-muted hover:border-border-strong text-fg px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 shadow-2xs w-full sm:w-auto disabled:opacity-50 active:scale-95"
                    >
                        {isGeneratingPDF ? <Loader2 className="animate-spin" size={15} /> : <FileDown size={15} />}
                        F9: Acta de Compromiso
                    </button>
                    {!isReadOnly && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200 shadow-md shadow-primary/10 hover:shadow-lg w-full sm:w-auto active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                            Guardar Plan
                        </button>
                    )}
                </div>
            </div>

            {/* F9 oculto para PDF */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                <Formato9Print nna={nna} id="formato-9-print-pii" />
            </div>
        </div>
    );
};

