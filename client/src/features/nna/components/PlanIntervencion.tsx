import { useState, useEffect } from 'react';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { toast } from '../../../components/ui/Toast';
import {
    Plus, Trash2, Save, Printer, AlertTriangle, ArrowLeft, Loader2, FileDown,
    Eye, Calendar, ClipboardCheck, Heart, BookOpen, CreditCard, Users, Circle,
    ChevronRight, X, Info, CheckCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useNnaStore } from '../../../store/nna.store';
import { Formato9Print } from './Formato9Print';
import { getAllPtisByCaso, createPti, updatePti, updateAccion, saveInformeAmpliacion, cerrarPti, ampliarVigencia } from '../../../api/pti.api';
import type { PlanTrabajo, AccionPTI, InformeAmpliacionData } from '../../../api/pti.api';

// ── Colores de área (clases completas para que Tailwind las escanee) ─────────
const AREA_CFG: Record<string, {
    bgSoft: string; iconColor: string; borderColor: string;
    icon: React.ReactNode; label: string;
}> = {
    SALUD:     { bgSoft: 'bg-danger-soft',   iconColor: 'text-danger',   borderColor: 'var(--color-danger)',        icon: <Heart size={17} />,       label: 'SALUD' },
    EDUCACION: { bgSoft: 'bg-info-soft',      iconColor: 'text-info',     borderColor: 'var(--color-info)',          icon: <BookOpen size={17} />,    label: 'EDUCACIÓN' },
    IDENTIDAD: { bgSoft: 'bg-warning-soft',   iconColor: 'text-warning',  borderColor: 'var(--color-warning)',       icon: <CreditCard size={17} />,  label: 'IDENTIDAD' },
    FAMILIA:   { bgSoft: 'bg-success-soft',   iconColor: 'text-success',  borderColor: 'var(--color-success)',       icon: <Users size={17} />,       label: 'FAMILIA' },
    OTROS:     { bgSoft: 'bg-surface-muted',  iconColor: 'text-fg-muted', borderColor: 'var(--color-border-strong)', icon: <Circle size={17} />,      label: 'OTROS' },
};

const PREDEFINED_ACTIVITIES: Record<string, string[]> = {
    SALUD: [
        'Afiliación al Seguro Integral de Salud (SIS) / Essalud',
        'Gestión de cita de control médico o dental',
        'Acompañamiento para tamizaje de anemia y nutrición',
        'Taller/Charla sobre hábitos de higiene y autocuidado',
    ],
    EDUCACION: [
        'Regularización de matrícula escolar / traslado',
        'Seguimiento de asistencia y rendimiento con profesores',
        'Inserción a reforzamiento escolar o talleres pedagógicos',
        'Matrícula en Educación Básica Alternativa (EBA) / CETPRO',
    ],
    IDENTIDAD: [
        'Coordinación con RENIEC para expedición de DNI',
        'Búsqueda y obtención de partida de nacimiento',
        'Acompañamiento a campañas descentralizadas de documentación',
    ],
    FAMILIA: [
        'Visita de seguimiento y consejería familiar domiciliaria',
        'Derivación de referentes familiares a charlas/talleres de pautas de crianza',
        'Consejería para prevención de violencia intrafamiliar',
    ],
    OTROS: [
        'Participación en talleres de habilidades sociales y personales',
        'Derivación a talleres recreativos, deportivos o culturales',
        'Orientación vocacional e inserción técnico-productiva',
    ],
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

interface PIIProps { nna: any; onClose?: () => void; }

// ── SVG ring de progreso ─────────────────────────────────────────────────────
function PtiRing({ pct, size = 72, fontSize = 17, stroke = 8, color = 'var(--color-success)' }:
    { pct: number; size?: number; fontSize?: number; stroke?: number; color?: string }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="var(--color-border)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={`${circ}`} strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.5s' }} />
            <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
                fontSize={fontSize} fontWeight={700}
                fill="var(--color-fg)" fontFamily="Inter">
                {pct}%
            </text>
        </svg>
    );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const TODAY = new Date();

function isOverdue(act: Actividad) {
    return act.estado !== 'COMPLETADO' && !!act.fechaFin && new Date(act.fechaFin) < TODAY;
}

function objStats(obj: ObjetivoEspecifico) {
    const { actividades: acts } = obj;
    const t = acts.length;
    const l = acts.filter(a => a.estado === 'COMPLETADO').length;
    const p = acts.filter(a => a.estado === 'EN_PROCESO').length;
    const n = acts.filter(a => a.estado === 'PENDIENTE').length;
    const v = acts.filter(isOverdue).length;
    const nextMs = acts.filter(a => a.estado !== 'COMPLETADO' && a.fechaFin).map(a => new Date(a.fechaFin).getTime());
    const next = nextMs.length ? new Date(Math.min(...nextMs)) : null;
    return { t, l, p, n, v, pct: t ? Math.round(l / t * 100) : 0, next };
}

function objPass(s: ReturnType<typeof objStats>, filter: string) {
    if (filter === 'todos') return true;
    if (filter === 'completados') return s.t > 0 && s.pct === 100;
    if (filter === 'vencidas') return s.v > 0;
    if (filter === 'proceso') return s.pct < 100;
    return true;
}

function fmtDate(iso: string) {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

const ESTADO_CYCLE: Record<string, 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO'> = {
    PENDIENTE: 'EN_PROCESO', EN_PROCESO: 'COMPLETADO', COMPLETADO: 'PENDIENTE',
};

const FILTERS = [
    { id: 'todos',      label: 'Todos' },
    { id: 'proceso',    label: 'En proceso' },
    { id: 'vencidas',   label: 'Con vencidas' },
    { id: 'completados', label: 'Completados' },
];

// ── Componente principal ─────────────────────────────────────────────────────
export const PlanIntervencion = ({ nna, onClose }: PIIProps) => {
    const { registerDocument } = useNnaStore();

    // Informe de Ampliación (se persiste en el plan; empieza vacío)
    const EMPTY_INFORME: InformeAmpliacionData = { antecedentes: '', analisis: '', sustento: '', conclusiones: '' };
    const [showInforme, setShowInforme] = useState(false);
    const [informeData, setInformeData] = useState<InformeAmpliacionData>(EMPTY_INFORME);
    const [informeDirty, setInformeDirty] = useState(false);
    const [savingInforme, setSavingInforme] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Navegación
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
    const [plans, setPlans] = useState<PlanTrabajo[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [errorPlans, setErrorPlans] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanTrabajo | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    // Cambios del tablero sin guardar (los cambios de estado en planes existentes se autoguardan)
    const [isDirty, setIsDirty] = useState(false);
    // Cierre de plan
    const [cierreOpen, setCierreOpen] = useState(false);
    const [obsCierre, setObsCierre] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [isAmpliando, setIsAmpliando] = useState(false);
    const planCerrado = selectedPlan?.estado === 'CERRADO';

    // Estado del tablero
    const [objetivoGeneral, setObjetivoGeneral] = useState(
        'Lograr la restitución de los derechos vulnerados del NNA y su reinserción familiar/escolar.'
    );
    const [objetivos, setObjetivos] = useState<ObjetivoEspecifico[]>([{
        id: 1, area: 'IDENTIDAD',
        descripcion: 'Gestionar la obtención del DNI del NNA.',
        indicador: 'NNA cuenta con DNI físico.',
        actividades: [{ id: 101, descripcion: 'Coordinación con RENIEC', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }],
    }]);
    const [ptiFilter, setPtiFilter] = useState('todos');
    const [mobjIdx, setMobjIdx] = useState<number | null>(null);
    const [mptiOpen, setMptiOpen] = useState(false);

    const caso = nna.casos?.find((c: any) => c.estado !== 'CERRADO')
        ?? (nna.casos?.length ? nna.casos[nna.casos.length - 1] : null);

    // ── Backend ────────────────────────────────────────────────────────────

    const fetchPlans = async () => {
        if (!caso?.id) { setLoadingPlans(false); return; }
        setLoadingPlans(true); setErrorPlans(null);
        try {
            const data = (await getAllPtisByCaso(caso.id)) || [];
            setPlans(data);
            if (data.length === 0) goToBoard(null, 'create');
        }
        catch (err: any) { setErrorPlans(err.message || 'Error al cargar los planes'); }
        finally { setLoadingPlans(false); }
    };

    useEffect(() => { fetchPlans(); }, [caso?.id]);

    const loadInformeFromPlan = (plan: PlanTrabajo | null) => {
        if (plan?.informeAmpliacion) {
            try {
                const parsed = JSON.parse(plan.informeAmpliacion);
                setInformeData({
                    antecedentes: parsed.antecedentes || '', analisis: parsed.analisis || '',
                    sustento: parsed.sustento || '', conclusiones: parsed.conclusiones || '',
                });
            } catch { setInformeData(EMPTY_INFORME); }
        } else {
            setInformeData(EMPTY_INFORME);
        }
        setInformeDirty(false);
    };

    const handleSaveInforme = async () => {
        if (!selectedPlan?.id) { toast.info('Guarda primero el plan para poder guardar el informe.'); return; }
        setSavingInforme(true);
        try {
            await saveInformeAmpliacion(selectedPlan.id, informeData);
            setInformeDirty(false);
            setSelectedPlan(p => p ? { ...p, informeAmpliacion: JSON.stringify(informeData) } : p);
        } catch { toast.error('Error al guardar el informe de ampliación.'); }
        finally { setSavingInforme(false); }
    };

    const loadPlanIntoState = (plan: PlanTrabajo) => {
        setObjetivoGeneral(plan.objetivoGeneral || '');
        const rebuilt: ObjetivoEspecifico[] = [];
        (plan.acciones || []).forEach((accion, idx) => {
            // Formato nuevo: columnas AREA e OBJETIVO propias; legacy: 'AREA | objetivo | actividad'
            let area: any, objDesc: string, actDesc: string;
            if (accion.area) {
                area = accion.area;
                objDesc = accion.objetivo || '';
                actDesc = (accion.descripcion || '').trim();
            } else {
                const parts = (accion.descripcion || '').split(' | ');
                area = (parts[0] || 'OTROS') as any;
                objDesc = parts[1] || '';
                actDesc = parts[2] || '';
            }
            const [fechaInicio = '', fechaFin = ''] = (accion.plazo || '').split(' a ');
            const actEstado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' =
                accion.estado === 'CUMPLIDO' ? 'COMPLETADO' :
                accion.estado === 'EN_PROCESO' ? 'EN_PROCESO' : 'PENDIENTE';
            let obj = rebuilt.find(o => o.area === area && o.descripcion === objDesc);
            if (!obj) {
                obj = { id: idx + 1, area, descripcion: objDesc, indicador: accion.meta || '', actividades: [] };
                rebuilt.push(obj);
            }
            if (actDesc.trim()) {
                obj.actividades.push({
                    id: accion.id || (idx * 1000 + obj.actividades.length + 1),
                    descripcion: actDesc, responsable: accion.responsable || '',
                    fechaInicio, fechaFin, estado: actEstado,
                });
            }
        });
        setObjetivos(rebuilt);
    };

    const goToBoard = (plan: PlanTrabajo | null, mode: 'create' | 'detail') => {
        loadInformeFromPlan(plan);
        if (plan) { setSelectedPlan(plan); loadPlanIntoState(plan); }
        else {
            setSelectedPlan(null);
            setObjetivoGeneral('Lograr la restitución de los derechos vulnerados del NNA y su reinserción familiar/escolar.');
            setObjetivos([{ id: 1, area: 'IDENTIDAD', descripcion: 'Gestionar la obtención del DNI del NNA.', indicador: 'NNA cuenta con DNI físico.', actividades: [{ id: 101, descripcion: 'Coordinación con RENIEC', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }] }]);
        }
        setPtiFilter('todos'); setMobjIdx(null); setIsDirty(false); setViewMode(mode);
    };

    // Aviso del navegador si se cierra/recarga con cambios sin guardar
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirty || informeDirty) { e.preventDefault(); e.returnValue = ''; }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty, informeDirty]);

    const confirmLeaveBoard = async () => {
        if (isDirty && !(await confirmar('Hay cambios sin guardar en el plan. ¿Salir de todas formas?', { titulo: 'Cambios sin guardar', textoConfirmar: 'Salir sin guardar', peligro: true }))) return false;
        setIsDirty(false);
        return true;
    };

    const validarPlan = (): string | null => {
        if (!objetivoGeneral.trim()) return 'El objetivo general no puede estar vacío.';
        if (objetivos.length === 0) return 'El plan debe tener al menos un objetivo.';
        for (let i = 0; i < objetivos.length; i++) {
            const obj = objetivos[i];
            if (!obj.descripcion.trim()) return `El objetivo ${i + 1} (${AREA_CFG[obj.area]?.label || obj.area}) no tiene título.`;
            for (const act of obj.actividades) {
                if (!act.descripcion.trim()) return `Hay una actividad sin descripción en "${obj.descripcion}".`;
                if (act.fechaInicio && act.fechaFin && act.fechaFin < act.fechaInicio)
                    return `En "${obj.descripcion}", la fecha fin de una actividad es anterior a su inicio.`;
            }
        }
        return null;
    };

    const handleSave = async () => {
        if (!caso?.id) { toast.error('No hay un caso activo.'); return; }
        const error = validarPlan();
        if (error) { toast.error(error); return; }
        setIsSaving(true);
        try {
            const acciones: AccionPTI[] = [];
            objetivos.forEach(obj => {
                if (obj.actividades.length) {
                    obj.actividades.forEach(act => {
                        const estado: any = act.estado === 'COMPLETADO' ? 'CUMPLIDO' : act.estado;
                        acciones.push({ area: obj.area, objetivo: obj.descripcion, descripcion: act.descripcion, meta: obj.indicador, plazo: `${act.fechaInicio} a ${act.fechaFin}`, responsable: act.responsable, estado });
                    });
                } else {
                    acciones.push({ area: obj.area, objetivo: obj.descripcion, descripcion: '', meta: obj.indicador, plazo: 'a', responsable: '', estado: 'PENDIENTE' });
                }
            });
            if (selectedPlan?.id) {
                await updatePti(selectedPlan.id, { objetivo_general: objetivoGeneral, acciones });
            } else {
                await createPti(caso.id, { caso_id: caso.id, objetivo_general: objetivoGeneral, acciones } as any);
            }
            toast.success('Plan de intervención guardado con éxito.');
            setIsDirty(false);
            setViewMode('list');
            fetchPlans();
        } catch { toast.error('Error al guardar el plan.'); }
        finally { setIsSaving(false); }
    };

    const handleUpdateEstado = async (actId: number, nuevoEstado: string) => {
        setObjetivos(prev => prev.map(obj => ({
            ...obj,
            actividades: obj.actividades.map(a => a.id === actId ? { ...a, estado: nuevoEstado as any } : a),
        })));
        if (selectedPlan?.id) {
            try { await updateAccion(actId, { estado: nuevoEstado as any }); } catch { /* silent */ }
        } else {
            setIsDirty(true); // plan nuevo: el estado solo existe en memoria hasta guardar
        }
    };

    const handleDownloadPDF = async () => {
        const el = document.getElementById('formato-9-print-pii');
        if (!el) { toast.error('No se encontró el formato para generar el PDF'); return; }
        setIsGeneratingPDF(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute;left:-9999px;width:210mm;height:297mm';
            document.body.appendChild(iframe);
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) throw new Error();
            doc.open();
            doc.write(`<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:white;font-family:Arial,sans-serif}</style></head><body>${el.outerHTML}</body></html>`);
            doc.close();
            await new Promise(r => setTimeout(r, 100));
            const target = doc.getElementById('formato-9-print-pii');
            if (!target) throw new Error();
            const canvas = await html2canvas(target, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 800 });
            document.body.removeChild(iframe);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(canvas.toDataURL('image/png', 1), 'PNG', 0, 0, w, canvas.height * w / canvas.width, undefined, 'FAST');
            pdf.save(`F9_Acta_${nna?.nombres?.replace(/\s+/g, '_')}.pdf`);
            registerDocument({ nnaId: nna.id, type: 'ACTA DE COMPROMISO (FORMATO 09)', code: selectedPlan?.codigoPti ? `ACT-${selectedPlan.codigoPti}` : `ACT-${new Date().getFullYear()}-${String(selectedPlan?.id ?? 0).padStart(4, '0')}`, date: new Date().toISOString(), pages: 1, user: 'Usuario Sistema', status: 'GENERADO' });
        } catch { toast.error('Error al generar el PDF.'); }
        finally { setIsGeneratingPDF(false); }
    };

    // ── Mutaciones de objetivos / actividades ──────────────────────────────

    const cycleEstado = (objIdx: number, actId: number) => {
        const act = objetivos[objIdx]?.actividades.find(a => a.id === actId);
        if (act) handleUpdateEstado(actId, ESTADO_CYCLE[act.estado] || 'PENDIENTE');
    };

    const addObjetivo = (area = 'SALUD', desc = '') => {
        const newIdx = objetivos.length;
        setObjetivos(prev => [...prev, { id: Date.now(), area: area as any, descripcion: desc, indicador: '', actividades: [] }]);
        setIsDirty(true);
        setMptiOpen(false);
        setTimeout(() => setMobjIdx(newIdx), 60);
    };

    const addObjetivoDesdeTemplate = (area: string, templateAct: string) => {
        const newIdx = objetivos.length;
        setObjetivos(prev => [...prev, {
            id: Date.now(), area: area as any, descripcion: templateAct, indicador: '',
            actividades: [{ id: Date.now() + 1, descripcion: templateAct, responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }],
        }]);
        setIsDirty(true);
        setMptiOpen(false);
        setTimeout(() => setMobjIdx(newIdx), 60);
    };

    const removeObjetivo = (idx: number) => {
        setObjetivos(prev => prev.filter((_, i) => i !== idx));
        setIsDirty(true);
        setMobjIdx(null);
    };

    const addActividad = (objIdx: number) => {
        setObjetivos(prev => {
            const next = [...prev];
            next[objIdx] = { ...next[objIdx], actividades: [...next[objIdx].actividades, { id: Date.now(), descripcion: '', responsable: 'Educador', fechaInicio: '', fechaFin: '', estado: 'PENDIENTE' }] };
            return next;
        });
        setIsDirty(true);
    };

    const removeActividad = (objIdx: number, actId: number) => {
        setObjetivos(prev => {
            const next = [...prev];
            next[objIdx] = { ...next[objIdx], actividades: next[objIdx].actividades.filter(a => a.id !== actId) };
            return next;
        });
        setIsDirty(true);
    };

    const updateActividadField = (objIdx: number, actId: number, key: string, value: string) => {
        setObjetivos(prev => {
            const next = [...prev];
            const ai = next[objIdx].actividades.findIndex(a => a.id === actId);
            (next[objIdx].actividades[ai] as any)[key] = value;
            return next;
        });
        setIsDirty(true);
    };

    const updateObjetivoField = (idx: number, key: string, value: string) => {
        setObjetivos(prev => { const next = [...prev]; (next[idx] as any)[key] = value; return next; });
        setIsDirty(true);
    };

    const getVigencia = (fechaInicio?: string, vigenciaDias: number = 90) => {
        if (!fechaInicio) return null;
        const v = new Date(fechaInicio); v.setDate(v.getDate() + (vigenciaDias || 90));
        const dias = Math.ceil((v.getTime() - Date.now()) / 86400000);
        return { dias, vencido: dias < 0, urgente: dias >= 0 && dias <= 15 };
    };

    const handleCerrarPlan = async () => {
        if (!selectedPlan?.id) return;
        setIsClosing(true);
        try {
            await cerrarPti(selectedPlan.id, obsCierre.trim() || undefined);
            setCierreOpen(false); setObsCierre(''); setIsDirty(false);
            setViewMode('list');
            fetchPlans();
        } catch { toast.error('Error al cerrar el plan.'); }
        finally { setIsClosing(false); }
    };

    const handleAmpliarVigencia = async () => {
        if (!selectedPlan?.id) return;
        if (!(await confirmar('Se sumarán 30 días a la vigencia del plan. Se recomienda guardar primero el Informe de Ampliación como sustento.', { titulo: 'Ampliar vigencia', textoConfirmar: 'Ampliar +30 días' }))) return;
        setIsAmpliando(true);
        try {
            await ampliarVigencia(selectedPlan.id, 30);
            setSelectedPlan(p => p ? { ...p, vigenciaDias: (p.vigenciaDias || 90) + 30 } : p);
            fetchPlans();
        } catch { toast.error('Error al ampliar la vigencia.'); }
        finally { setIsAmpliando(false); }
    };

    const getSemaforo = (pct: number) => {
        if (pct >= 70) return { bar: 'bg-success', text: 'text-success' };
        if (pct >= 30) return { bar: 'bg-warning', text: 'text-warning' };
        return { bar: 'bg-danger', text: 'text-danger' };
    };

    // ── Informe de Ampliación ────────────────────────────────────────────────
    if (showInforme) return (
        <div className="bg-bg min-h-screen p-6 print:p-0 print:bg-white">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-5 print:hidden">
                    <button onClick={async () => {
                        if (informeDirty && !(await confirmar('Hay cambios sin guardar en el informe. ¿Salir de todas formas?', { titulo: 'Cambios sin guardar', textoConfirmar: 'Salir sin guardar', peligro: true }))) return;
                        loadInformeFromPlan(selectedPlan);
                        setShowInforme(false);
                    }}
                        className="flex items-center gap-1.5 text-fg-muted hover:text-fg text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-surface border border-transparent hover:border-border transition-all">
                        <ArrowLeft size={15} /> Volver al Plan
                    </button>
                    <div className="flex items-center gap-2">
                        {informeDirty && (
                            <span className="text-[11px] font-semibold text-warning bg-warning-soft px-2 py-1 rounded-full">
                                Cambios sin guardar
                            </span>
                        )}
                        {selectedPlan?.id && selectedPlan.estado === 'ACTIVO' && (
                            <button onClick={handleAmpliarVigencia} disabled={isAmpliando}
                                className="flex items-center gap-1.5 bg-warning-soft border border-warning/30 text-warning px-4 py-2 rounded-lg text-[13px] font-semibold hover:opacity-80 transition-all disabled:opacity-50"
                                title="Suma 30 días a la vigencia del plan">
                                {isAmpliando ? <Loader2 size={15} className="animate-spin" /> : <Calendar size={15} />} Ampliar +30 días
                            </button>
                        )}
                        <button onClick={handleSaveInforme} disabled={savingInforme || !informeDirty}
                            className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-[13px] font-bold transition-colors disabled:opacity-50">
                            {savingInforme ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar Informe
                        </button>
                        <button onClick={() => window.print()}
                            className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-muted transition-colors">
                            <Printer size={15} /> Imprimir Informe
                        </button>
                    </div>
                </div>
                <div className="bg-white border border-border rounded px-14 py-12 print:shadow-none print:border-none"
                    style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '13px', lineHeight: '1.7' }}>
                    <div className="text-center border-b-2 border-[#333] pb-4 mb-8">
                        <h2 className="text-[15px] font-bold uppercase">Informe Técnico de Ampliación de Fase I</h2>
                        <h3 className="text-[13px] font-bold text-[#555]">Servicio de Educadores de Calle</h3>
                    </div>
                    <div className="flex justify-end mb-6">
                        <p className="font-bold">Fecha: {new Date().toLocaleDateString('es-PE')}</p>
                    </div>
                    <div className="space-y-5 text-justify">
                        <div>
                            <p className="font-bold underline mb-2">I. DATOS DEL USUARIO:</p>
                            <p><b>Nombres:</b> {nna?.nombres} {nna?.apellidoPaterno}</p>
                            <p><b>DNI:</b> {nna?.numeroDoc || '---'}</p>
                        </div>
                        {[
                            { key: 'antecedentes', label: 'II. ANTECEDENTES:', rows: 3 },
                            { key: 'analisis', label: 'III. ANÁLISIS DE CUMPLIMIENTO DE METAS:', rows: 4 },
                            { key: 'sustento', label: 'IV. SUSTENTO DE LA AMPLIACIÓN (1 mes):', rows: 3 },
                            { key: 'conclusiones', label: 'V. CONCLUSIÓN:', rows: 2 },
                        ].map(({ key, label, rows }) => (
                            <div key={key}>
                                <p className="font-bold underline mb-2">{label}</p>
                                <textarea value={(informeData as any)[key]}
                                    onChange={e => { setInformeData(p => ({ ...p, [key]: e.target.value })); setInformeDirty(true); }} rows={rows}
                                    placeholder="Escribir aquí..."
                                    className="w-full border border-dotted border-[#bbb] p-2 rounded-sm outline-none resize-vertical text-[13px] print:border-none print:p-0"
                                    style={{ fontFamily: 'inherit', lineHeight: 1.5 }} />
                            </div>
                        ))}
                        <div className="grid grid-cols-2 gap-16 text-center" style={{ marginTop: 64 }}>
                            {['Educador/a Responsable', 'V° B° Coordinación'].map(l => (
                                <div key={l} style={{ borderTop: '1px solid #333', paddingTop: 6, marginTop: 48 }}>
                                    <p className="font-bold">{l}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Vista Lista ──────────────────────────────────────────────────────────
    if (viewMode === 'list') return (
        <div className="bg-bg min-h-screen p-3 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-base sm:text-[17px] font-bold text-fg">Planes de Intervención Individual</h1>
                    <p className="text-[12px] text-fg-muted mt-0.5">{nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno || ''}</p>
                </div>
                {onClose && (
                    <button onClick={onClose}
                        className="flex items-center justify-center gap-1.5 bg-surface border border-border text-fg-secondary px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-muted transition-colors w-full sm:w-auto">
                        <ArrowLeft size={14} /> Volver
                    </button>
                )}
            </div>

            {loadingPlans ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-primary mb-3" size={32} />
                    <p className="text-fg-muted text-[13px]">Cargando planes...</p>
                </div>
            ) : errorPlans ? (
                <div className="bg-danger-soft border border-danger/20 rounded-xl p-6 text-center max-w-xl mx-auto">
                    <AlertTriangle className="text-danger mx-auto mb-3" size={28} />
                    <p className="text-danger font-semibold mb-2 text-[13px]">{errorPlans}</p>
                    <button onClick={fetchPlans} className="text-[12px] bg-danger text-white px-4 py-2 rounded-lg font-bold">Reintentar</button>
                </div>
            ) : plans.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl p-6 sm:p-12 text-center max-w-xl mx-auto shadow-[var(--shadow-1)]">
                    <div className="w-14 h-14 bg-primary-soft rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="text-primary" size={28} />
                    </div>
                    <h3 className="text-[15px] font-bold text-fg mb-2">Sin planes registrados</h3>
                    <p className="text-fg-muted text-[13px] mb-6 max-w-sm mx-auto">
                        El PII permite establecer objetivos y actividades para restituir los derechos del NNA.
                    </p>
                    <button onClick={() => goToBoard(null, 'create')}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-[13px] font-bold shadow-sm active:scale-95 transition-all">
                        <Plus size={16} /> Crear Plan de Intervención
                    </button>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl shadow-[var(--shadow-1)] overflow-hidden max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 sm:px-6 py-4 border-b border-border gap-3">
                        <h3 className="font-bold text-fg text-[13px]">Planes Registrados</h3>
                        <button onClick={() => goToBoard(null, 'create')}
                            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-[12px] font-bold active:scale-95 transition-all w-full sm:w-auto">
                            <Plus size={13} /> Nuevo Plan
                        </button>
                    </div>

                    {/* Tabla (Escritorio) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border text-[10px] font-extrabold text-fg-muted uppercase tracking-wider">
                                    {['Código', 'Fecha Inicio', 'Vigencia', 'Avance', 'Estado', ''].map(h => (
                                        <th key={h} className={`px-6 py-3${h === '' ? ' text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-[13px] font-medium">
                                {plans.map(plan => {
                                    const vig = getVigencia(plan.fechaInicio || plan.createdAt, plan.vigenciaDias);
                                    const total = plan.acciones?.length ?? 0;
                                    const done = plan.acciones?.filter(a => (a.estado as any) === 'CUMPLIDO' || (a.estado as any) === 'COMPLETADO').length ?? 0;
                                    const pct = total ? Math.round(done / total * 100) : 0;
                                    const sem = getSemaforo(pct);
                                    return (
                                        <tr key={plan.id} className="hover:bg-surface-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-primary">
                                                {plan.codigoPti || `PII-${new Date(plan.fechaInicio || plan.createdAt).getFullYear()}-${String(plan.id).padStart(4, '0')}`}
                                            </td>
                                            <td className="px-6 py-4 text-fg-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={13} />
                                                    {plan.fechaInicio ? new Date(plan.fechaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {vig ? (
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${vig.vencido ? 'bg-danger-soft text-danger' : vig.urgente ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                                                        {vig.vencido ? `Vencido ${Math.abs(vig.dias)}d` : `${vig.dias}d restantes`}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                    <div className="flex-1 bg-border rounded-full h-1.5">
                                                        <div className={`h-1.5 rounded-full ${sem.bar}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${sem.text}`}>{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${plan.estado === 'ACTIVO' ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg-muted'}`}>
                                                    {plan.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => goToBoard(plan, 'detail')}
                                                        className="inline-flex items-center gap-2 bg-primary-soft border border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary px-3.5 py-2 rounded-lg text-[12px] font-bold transition-all active:scale-95">
                                                        <Eye size={14} /> Abrir PII
                                                    </button>
                                                    <button onClick={() => { loadPlanIntoState(plan); setTimeout(() => window.print(), 150); }}
                                                        title="Imprimir plan"
                                                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface text-fg-muted hover:text-fg hover:border-border-strong hover:bg-surface-muted transition-all">
                                                        <Printer size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Tarjetas (Móvil) */}
                    <div className="md:hidden divide-y divide-border">
                        {plans.map(plan => {
                            const vig = getVigencia(plan.fechaInicio || plan.createdAt, plan.vigenciaDias);
                            const total = plan.acciones?.length ?? 0;
                            const done = plan.acciones?.filter(a => (a.estado as any) === 'CUMPLIDO' || (a.estado as any) === 'COMPLETADO').length ?? 0;
                            const pct = total ? Math.round(done / total * 100) : 0;
                            const sem = getSemaforo(pct);
                            return (
                                <div key={plan.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-primary text-sm">
                                            {plan.codigoPti || `PII-${new Date(plan.fechaInicio || plan.createdAt).getFullYear()}-${String(plan.id).padStart(4, '0')}`}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${plan.estado === 'ACTIVO' ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg-muted'}`}>
                                            {plan.estado}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-fg-muted block text-[10px] uppercase font-bold">Fecha Inicio</span>
                                            <div className="flex items-center gap-1 mt-0.5 font-medium text-fg-secondary">
                                                <Calendar size={12} />
                                                {plan.fechaInicio ? new Date(plan.fechaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-fg-muted block text-[10px] uppercase font-bold">Vigencia</span>
                                            <div className="mt-0.5">
                                                {vig ? (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${vig.vencido ? 'bg-danger-soft text-danger' : vig.urgente ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                                                        {vig.vencido ? `Vencido ${Math.abs(vig.dias)}d` : `${vig.dias}d restantes`}
                                                    </span>
                                                ) : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-fg-muted block text-[10px] uppercase font-bold">Avance</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-border rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${sem.bar}`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className={`text-[10px] font-bold ${sem.text}`}>{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                                        <button onClick={() => goToBoard(plan, 'detail')}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-soft border border-primary/20 text-primary hover:bg-primary hover:text-white hover:border-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95">
                                            <Eye size={13} /> Abrir PII
                                        </button>
                                        <button onClick={() => { loadPlanIntoState(plan); setTimeout(() => window.print(), 150); }}
                                            title="Imprimir plan"
                                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface text-fg-muted hover:text-fg hover:border-border-strong hover:bg-surface-muted transition-all">
                                            <Printer size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    // ── Tablero PTI ──────────────────────────────────────────────────────────

    let totalActs = 0, logActs = 0, procActs = 0, vencActs = 0;
    objetivos.forEach(o => o.actividades.forEach(a => {
        totalActs++;
        if (a.estado === 'COMPLETADO') logActs++;
        else if (a.estado === 'EN_PROCESO') procActs++;
        if (isOverdue(a)) vencActs++;
    }));
    const pctGlobal = totalActs ? Math.round(logActs / totalActs * 100) : 0;
    const objDone = objetivos.filter(o => { const s = objStats(o); return s.t > 0 && s.pct === 100; }).length;
    const fc: Record<string, number> = {
        todos: objetivos.length,
        proceso: objetivos.filter(o => objStats(o).pct < 100).length,
        vencidas: objetivos.filter(o => objStats(o).v > 0).length,
        completados: objDone,
    };

    const mobjObj = mobjIdx !== null && mobjIdx < objetivos.length ? objetivos[mobjIdx] : null;

    return (
        <div className="bg-bg min-h-screen flex flex-col">

            {/* ── Header ── */}
            <div className="bg-surface border-b border-border px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={async () => { if (await confirmLeaveBoard()) setViewMode('list'); }}
                        className="flex items-center gap-1.5 text-fg-muted hover:text-fg text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-surface-muted border border-transparent hover:border-border transition-all">
                        <ArrowLeft size={14} /> Planes
                    </button>
                    <span className="text-border-strong select-none">|</span>
                    <div>
                        <p className="text-[14px] font-bold text-fg">Plan de Intervención Individual</p>
                        <p className="text-[11px] text-fg-muted">
                            {nna?.nombres} {nna?.apellidoPaterno}
                            {selectedPlan ? ` · ${selectedPlan.codigoPti || `PII-${selectedPlan.id}`}` : ' · Nuevo plan'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={handleDownloadPDF} disabled={isGeneratingPDF}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-surface border border-border text-fg-secondary px-3 py-2 rounded-lg text-[12px] font-semibold hover:bg-surface-muted transition-all disabled:opacity-50">
                        {isGeneratingPDF ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} F9: Acta
                    </button>
                    <button onClick={() => window.print()}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-surface border border-border text-fg-secondary px-3 py-2 rounded-lg text-[12px] font-semibold hover:bg-surface-muted transition-all">
                        <Printer size={13} /> Imprimir
                    </button>
                    <button onClick={() => setShowInforme(true)}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-warning-soft border border-warning/30 text-warning px-3 py-2 rounded-lg text-[12px] font-semibold hover:opacity-80 transition-all">
                        <AlertTriangle size={13} /> Inf. Ampliación
                    </button>
                </div>
            </div>

            {/* ── Contenido del tablero ── */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <div className="max-w-[980px] mx-auto space-y-4">

                    {/* Resumen con anillo */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 bg-surface border border-border rounded-xl shadow-[var(--shadow-1)] p-4 sm:p-[18px_22px] text-center sm:text-left">
                        <PtiRing pct={pctGlobal} />
                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-4 sm:gap-6 flex-1 w-full justify-items-center sm:justify-start">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[20px] sm:text-[24px] font-bold leading-none text-fg">{objetivos.length}</span>
                                <span className="text-[10px] sm:text-[11px] text-fg-muted uppercase tracking-widest font-semibold">Objetivos</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[20px] sm:text-[24px] font-bold leading-none text-fg">{totalActs}</span>
                                <span className="text-[10px] sm:text-[11px] text-fg-muted uppercase tracking-widest font-semibold">Actividades</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[20px] sm:text-[24px] font-bold leading-none text-success">{logActs}</span>
                                <span className="text-[10px] sm:text-[11px] text-fg-muted uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-success inline-block" /> Logradas
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[20px] sm:text-[24px] font-bold leading-none text-warning">{procActs}</span>
                                <span className="text-[10px] sm:text-[11px] text-fg-muted uppercase tracking-widest font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-warning inline-block" /> Proceso
                                </span>
                            </div>
                            {vencActs > 0 && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[20px] sm:text-[24px] font-bold leading-none text-danger">{vencActs}</span>
                                    <span className="text-[10px] sm:text-[11px] text-fg-muted uppercase tracking-widest font-semibold flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-danger inline-block" /> Vencidas
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="text-center sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border">
                            <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase mb-1 ${planCerrado ? 'bg-surface-muted text-fg-muted' : 'bg-info-soft text-info'}`}>
                                {selectedPlan ? (planCerrado ? 'Cerrado' : `Activo · ${selectedPlan.vigenciaDias || 90} días`) : 'Nuevo plan'}
                            </span>
                            <p className="text-[11px] text-fg-muted">{objDone} de {objetivos.length} completados</p>
                        </div>
                    </div>

                    {/* Warning de vencidas */}
                    {vencActs > 0 && (
                        <div className="flex items-start gap-2 bg-warning-soft border border-warning/30 rounded-lg text-[12px] text-warning"
                            style={{ padding: '10px 14px' }}>
                            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>
                                <b>{vencActs} actividad{vencActs > 1 ? 'es' : ''} vencida{vencActs > 1 ? 's' : ''}.</b>{' '}
                                Abre el objetivo en rojo para actualizar el estado o reprogramar la fecha.
                            </span>
                        </div>
                    )}

                    {/* Objetivo general */}
                    <div>
                        <label className="block text-[11px] font-bold text-fg-muted uppercase tracking-wider mb-1.5">
                            Objetivo General de la Intervención
                        </label>
                        <textarea value={objetivoGeneral} onChange={e => { setObjetivoGeneral(e.target.value); setIsDirty(true); }} rows={2}
                            className="w-full border border-border rounded-lg bg-surface text-fg text-[13px] outline-none resize-none focus:border-primary transition-colors"
                            style={{ padding: '10px 12px' }} />
                    </div>

                    {/* Filtros chip */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {FILTERS.map(f => {
                            const isActive = ptiFilter === f.id;
                            const isDanger = f.id === 'vencidas';
                            return (
                                <button key={f.id} onClick={() => setPtiFilter(f.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all ${
                                        isActive && isDanger ? 'bg-danger border-danger text-white' :
                                        isActive ? 'bg-primary border-primary text-white' :
                                        'bg-surface border-border-strong text-fg-secondary hover:border-primary hover:text-fg'
                                    }`}>
                                    {f.label}
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-black/10'}`}>
                                        {fc[f.id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tablero de tarjetas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {objetivos.map((obj, idx) => {
                            const s = objStats(obj);
                            if (!objPass(s, ptiFilter)) return null;
                            const cfg = AREA_CFG[obj.area] || AREA_CFG.OTROS;
                            const edgeColor = s.v > 0 ? 'var(--color-danger)' : s.pct === 100 ? 'var(--color-success)' : s.p > 0 ? 'var(--color-warning)' : 'var(--color-border)';
                            const ringColor = s.pct === 100 ? 'var(--color-success)' : 'var(--color-primary)';
                            return (
                                <div key={obj.id} onClick={() => setMobjIdx(idx)}
                                    className="bg-surface border border-border rounded-xl cursor-pointer flex flex-col gap-3 shadow-[var(--shadow-1)] hover:shadow-[var(--shadow-2)] hover:-translate-y-0.5 transition-all duration-150"
                                    style={{ padding: '16px 18px', borderTop: `3px solid ${edgeColor}` }}>
                                    {/* Área + badge */}
                                    <div className="flex items-center gap-2">
                                        <span className={`w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 ${cfg.bgSoft} ${cfg.iconColor}`}>
                                            {cfg.icon}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-fg-muted flex-1">{cfg.label}</span>
                                        {s.v > 0 ? (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-danger-soft text-danger text-[10px] font-bold">
                                                <AlertTriangle size={9} /> {s.v}
                                            </span>
                                        ) : s.pct === 100 ? (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-soft text-success text-[10px] font-bold">
                                                <CheckCircle size={9} /> Completo
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Título */}
                                    <h3 className="text-[14px] font-semibold text-fg leading-snug min-h-[38px] line-clamp-2">
                                        {obj.descripcion || <span className="text-fg-muted font-normal italic">(Sin título)</span>}
                                    </h3>

                                    {/* Mini ring + contadores */}
                                    <div className="flex items-center gap-3.5">
                                        <PtiRing pct={s.pct} size={54} fontSize={13} stroke={7} color={ringColor} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-fg-secondary">{s.l} de {s.t} actividades</p>
                                            <div className="flex gap-3 mt-1.5 flex-wrap">
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-success" /> {s.l}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-warning" /> {s.p}
                                                </span>
                                                <span className="flex items-center gap-1 text-[11px] font-semibold text-fg-muted">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-fg-muted" /> {s.n}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer de tarjeta */}
                                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                                        <span className={`text-[11px] font-medium ${s.v > 0 ? 'text-danger' : 'text-fg-muted'}`}>
                                            {s.next
                                                ? `Próximo: ${fmtDate(s.next.toISOString().split('T')[0])}`
                                                : s.pct === 100 ? 'Objetivo cumplido' : 'Sin plazos definidos'}
                                        </span>
                                        <ChevronRight size={14} className="text-fg-muted" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Tarjeta "Nuevo objetivo" */}
                        <div onClick={() => setMptiOpen(true)}
                            className="border-2 border-dashed border-border-strong rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:bg-primary-soft/10 transition-all duration-150"
                            style={{ minHeight: 188 }}>
                            <div className="w-10 h-10 rounded-[10px] bg-primary-soft flex items-center justify-center">
                                <Plus size={20} className="text-primary" />
                            </div>
                            <p className="text-[13px] font-semibold text-fg">Nuevo Objetivo</p>
                            <p className="text-[11px] text-fg-muted text-center">Desde plantilla o en blanco</p>
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="flex items-start gap-2 bg-primary-soft border border-primary/20 rounded-lg text-[12px] text-primary"
                        style={{ padding: '10px 14px' }}>
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        Si no se logran los resultados esperados en 3 meses, se debe generar un Informe Técnico de Ampliación de Fase.
                    </div>

                </div>
            </div>

            {/* ── Footer ── */}
            <div className="bg-surface border-t border-border px-4 sm:px-6 py-3.5 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                    {isDirty && !planCerrado && (
                        <span className="text-[11px] font-semibold text-warning bg-warning-soft px-2.5 py-1 rounded-full">
                            Cambios sin guardar
                        </span>
                    )}
                    {planCerrado && (
                        <span className="text-[11px] font-semibold text-fg-muted bg-surface-muted px-2.5 py-1 rounded-full">
                            Plan cerrado · solo lectura
                        </span>
                    )}
                    {selectedPlan?.id && !planCerrado && (
                        <button onClick={() => setCierreOpen(true)}
                            className="flex items-center gap-1.5 text-[12px] font-semibold text-danger hover:bg-danger-soft px-3 py-2 rounded-lg transition-colors">
                            <X size={13} /> Cerrar Plan
                        </button>
                    )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => setMptiOpen(true)} disabled={planCerrado}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface border border-border text-fg px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-surface-muted transition-all disabled:opacity-40">
                        <Plus size={13} /> Nuevo Objetivo
                    </button>
                    <button onClick={handleSave} disabled={isSaving || planCerrado}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm active:scale-95 transition-all disabled:opacity-50">
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar Plan
                    </button>
                </div>
            </div>

            {/* ── Modal: Detalle de objetivo ── */}
            {mobjObj && mobjIdx !== null && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
                    onClick={() => setMobjIdx(null)}>
                    <div className="bg-surface rounded-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl shadow-[var(--shadow-3)] flex flex-col overflow-hidden mx-auto"
                        style={{ maxHeight: '90vh' }}
                        onClick={e => e.stopPropagation()}>

                        {/* Modal header */}
                        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                            <div>
                                <h3 className="text-[14px] font-semibold text-fg">Detalle del Objetivo</h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">Edita y registra el avance de cada actividad</p>
                            </div>
                            <button onClick={() => setMobjIdx(null)} className="text-fg-muted hover:text-fg transition-colors p-1 rounded">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
                            {/* Área + descripción */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select value={mobjObj.area} onChange={e => updateObjetivoField(mobjIdx, 'area', e.target.value)}
                                    className="w-full sm:w-auto border border-border rounded-lg px-3 py-2 text-[12px] font-bold text-fg-secondary bg-surface-muted outline-none focus:border-primary">
                                    {Object.keys(AREA_CFG).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                <input type="text" value={mobjObj.descripcion}
                                    onChange={e => updateObjetivoField(mobjIdx, 'descripcion', e.target.value)}
                                    placeholder="Descripción del objetivo..."
                                    className="flex-1 border border-border rounded-lg px-3 py-2 text-[13px] font-medium text-fg bg-surface outline-none focus:border-primary" />
                            </div>

                            {/* Lista de actividades */}
                            <div className="space-y-3">
                                {mobjObj.actividades.map(act => {
                                    const ov = isOverdue(act);
                                    return (
                                        <div key={act.id}
                                            className={`flex flex-col gap-3 border rounded-lg bg-surface transition-colors ${ov ? 'border-danger/40 bg-danger-soft' : 'border-border'} p-3 sm:p-4`}>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                {/* Chip de estado (clic para ciclar) */}
                                                <button onClick={() => cycleEstado(mobjIdx, act.id)}
                                                    title="Clic para cambiar estado"
                                                    className={`w-full sm:w-auto shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border transition-all hover:brightness-95 active:scale-[0.97] ${
                                                        act.estado === 'COMPLETADO' ? 'bg-success-soft text-success border-success/30' :
                                                        act.estado === 'EN_PROCESO' ? 'bg-warning-soft text-warning border-warning/30' :
                                                        'bg-surface-muted text-fg-muted border-border-strong'
                                                    }`} style={{ justifyContent: 'center' }}>
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${act.estado === 'COMPLETADO' ? 'bg-success' : act.estado === 'EN_PROCESO' ? 'bg-warning' : 'bg-fg-muted'}`} />
                                                    {act.estado === 'COMPLETADO' ? 'Logrado' : act.estado === 'EN_PROCESO' ? 'En proceso' : 'Pendiente'}
                                                </button>
                                                {/* Descripción */}
                                                <div className="flex items-center gap-2 flex-1 w-full">
                                                    <input type="text" value={act.descripcion}
                                                        onChange={e => updateActividadField(mobjIdx, act.id, 'descripcion', e.target.value)}
                                                        placeholder="Descripción de la actividad..."
                                                        className="flex-1 border-b border-transparent outline-none bg-transparent text-[13px] font-medium text-fg focus:border-primary transition-colors py-1 min-w-0" />
                                                    <button onClick={() => removeActividad(mobjIdx, act.id)}
                                                        className="text-fg-muted hover:text-danger transition-colors shrink-0 p-1">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Metadatos */}
                                            <div className="flex gap-3 flex-wrap pl-1 justify-between sm:justify-start">
                                                <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                                    Responsable:
                                                    <input type="text" value={act.responsable}
                                                        onChange={e => updateActividadField(mobjIdx, act.id, 'responsable', e.target.value)}
                                                        className="border border-border rounded-md px-2 py-1 text-[12px] bg-surface-muted outline-none focus:border-primary text-fg-secondary w-24 sm:w-28" />
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                                    Inicio:
                                                    <input type="date" value={act.fechaInicio}
                                                        onChange={e => updateActividadField(mobjIdx, act.id, 'fechaInicio', e.target.value)}
                                                        className="border border-border rounded-md px-2 py-1 text-[12px] bg-surface-muted outline-none focus:border-primary text-fg-secondary" />
                                                </label>
                                                <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                                    Fin:
                                                    <input type="date" value={act.fechaFin}
                                                        onChange={e => updateActividadField(mobjIdx, act.id, 'fechaFin', e.target.value)}
                                                        className="border border-border rounded-md px-2 py-1 text-[12px] bg-surface-muted outline-none focus:border-primary text-fg-secondary" />
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={() => addActividad(mobjIdx)}
                                className="flex items-center gap-1.5 text-[12px] font-bold text-primary hover:text-primary-hover uppercase tracking-wider transition-colors">
                                <Plus size={13} /> Agregar Actividad
                            </button>

                            {/* Indicador */}
                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-fg-muted uppercase tracking-wider mb-1.5">
                                    Meta / Indicador de logro
                                </label>
                                <input type="text" value={mobjObj.indicador}
                                    onChange={e => updateObjetivoField(mobjIdx, 'indicador', e.target.value)}
                                    placeholder="Ej: NNA cuenta con documento de identidad físico..."
                                    className="w-full border border-border rounded-lg px-3 py-2 text-[13px] text-fg bg-surface outline-none focus:border-primary italic" />
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div className="flex items-center justify-between border-t border-border px-4 py-3">
                            <button onClick={async () => { if (await confirmar('Se eliminará el objetivo con todas sus actividades.', { titulo: 'Eliminar objetivo', textoConfirmar: 'Eliminar', peligro: true })) removeObjetivo(mobjIdx); }}
                                className="flex items-center gap-1.5 text-[12px] font-semibold text-danger hover:bg-danger-soft px-3 py-2 rounded-lg transition-colors">
                                <Trash2 size={13} /> Eliminar Objetivo
                            </button>
                            <button onClick={() => setMobjIdx(null)}
                                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-[13px] font-bold active:scale-95 transition-all">
                                <CheckCircle size={13} /> Listo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Cerrar plan ── */}
            {cierreOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
                    onClick={() => setCierreOpen(false)}>
                    <div className="bg-surface rounded-xl w-full max-w-md shadow-[var(--shadow-3)] overflow-hidden mx-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="border-b border-border px-4 py-3.5">
                            <h3 className="text-[14px] font-semibold text-fg">Cerrar Plan de Intervención</h3>
                            <p className="text-[11px] text-fg-muted mt-0.5">
                                El plan pasará a solo lectura. Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="px-4 py-4">
                            <label className="block text-[11px] font-bold text-fg-muted uppercase tracking-wider mb-1.5">
                                Observación de cierre (opcional)
                            </label>
                            <textarea value={obsCierre} onChange={e => setObsCierre(e.target.value)} rows={3}
                                placeholder="Ej: Objetivos cumplidos; el NNA fue reinsertado al sistema educativo..."
                                className="w-full border border-border rounded-lg bg-surface text-fg text-[13px] outline-none resize-none focus:border-primary transition-colors p-2.5" />
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
                            <button onClick={() => setCierreOpen(false)}
                                className="text-[13px] font-medium text-fg-muted hover:text-fg px-4 py-2 rounded-lg hover:bg-surface-muted transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleCerrarPlan} disabled={isClosing}
                                className="flex items-center gap-1.5 bg-danger text-white px-4 py-2 rounded-lg text-[13px] font-bold active:scale-95 transition-all disabled:opacity-50">
                                {isClosing ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Cerrar Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Plantillas ── */}
            {mptiOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4"
                    onClick={() => setMptiOpen(false)}>
                    <div className="bg-surface rounded-xl w-full max-w-lg shadow-[var(--shadow-3)] flex flex-col overflow-hidden mx-auto"
                        style={{ maxHeight: '90vh' }}
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                            <div>
                                <h3 className="text-[14px] font-semibold text-fg">Agregar Objetivo al Plan</h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">Elige una plantilla por área o crea uno en blanco</p>
                            </div>
                            <button onClick={() => setMptiOpen(false)} className="text-fg-muted hover:text-fg transition-colors p-1 rounded">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
                            {/* En blanco */}
                            <div onClick={() => addObjetivo()}
                                className="flex items-center gap-3 border border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary-soft/20 transition-all p-3"
                                style={{ padding: '12px 14px' }}>
                                <div className="w-[30px] h-[30px] rounded-lg bg-primary-soft text-primary flex items-center justify-center flex-shrink-0">
                                    <Plus size={16} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-fg">Objetivo en blanco</p>
                                    <p className="text-[11px] text-fg-muted">Sin plantilla — edita libremente</p>
                                </div>
                            </div>

                            {/* Plantillas por área */}
                            {Object.entries(PREDEFINED_ACTIVITIES).map(([area, acts]) => {
                                const cfg = AREA_CFG[area] || AREA_CFG.OTROS;
                                return (
                                    <div key={area}>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${cfg.iconColor}`}>
                                            {cfg.icon} {cfg.label}
                                        </p>
                                        <div className="space-y-1.5">
                                            {acts.map(act => (
                                                <div key={act} onClick={() => addObjetivoDesdeTemplate(area, act)}
                                                    className="flex items-center gap-3 border border-border rounded-lg cursor-pointer hover:border-primary hover:bg-primary-soft/20 transition-all p-3"
                                                    style={{ padding: '10px 14px' }}>
                                                    <div className={`w-[28px] h-[28px] rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bgSoft} ${cfg.iconColor}`}>
                                                        {cfg.icon}
                                                    </div>
                                                    <p className="text-[13px] font-medium text-fg flex-1">{act}</p>
                                                    <ChevronRight size={14} className="text-fg-muted flex-shrink-0" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* F9 oculto para PDF */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                <Formato9Print nna={nna} id="formato-9-print-pii" />
            </div>
        </div>
    );
};
