/**
 * SEC · ExpedientePage rediseñado
 * - NavButton: primary-soft/text-primary en lugar de blue-600 + shadow-blue-200
 * - Phase tracker: tokens de color unificados
 * - StatusCard: success/warning/danger tokens
 * - Sidebar de fases: labels con primary/info/success tokens
 * - UploadModal: header limpio, sin rounded-2xl, sin shadow coloreada
 * - PlaceholderModule: empty state con tokens
 * - Todos los hardcoded blue-600/indigo/green/red → tokens
 * Nota: toda la lógica de negocio intacta.
 */

import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../config/api';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import {
    LayoutDashboard, FileText, ClipboardList, HeartPulse, GraduationCap,
    ArrowLeft, FolderOpen, CheckCircle2, Clock, Map, Contact, Calendar,
    User, Eye, Upload, X, FilePlus, TrendingUp, FileSignature, Target,
    Presentation, Activity, BookOpen, Users
} from 'lucide-react';
import { NnaFichaPage } from './NnaFichaPage';
import { Formato4Social } from './components/Formato4Social';
import { DiagnosticoSocialList } from './components/DiagnosticoSocialList';
import { Formato5Logros } from './components/Formato5Logros';
import { LogrosList } from './components/LogrosList';
import { InformeSituacional } from './components/InformeSituacional';
import { PlanIntervencion } from './components/PlanIntervencion';
import { FichaDerivacion } from './components/FichaDerivacion';
import { FichaTalleres } from './components/FichaTalleres';
import { InformeEgresoList } from './components/InformeEgresoList';
import { SeguimientoFamiliarList } from './components/SeguimientoFamiliarList';
import { Badge } from '../../components/ui/Badge';

export const ExpedientePage = () => {
    const { id } = useParams();
    const { selectedExpediente, isLoading, fetchExpediente } = useNnaStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showDiagnosticoForm, setShowDiagnosticoForm]   = useState(false);
    const [currentDiagnosticoId, setCurrentDiagnosticoId] = useState<number | null>(null);
    const [currentDiagnosticoData, setCurrentDiagnosticoData] = useState<any>(null);
    const [showLogrosForm, setShowLogrosForm] = useState(false);

    useEffect(() => {
        if (id) fetchExpediente(Number(id));
    }, [id, fetchExpediente]);

    useEffect(() => {
        if (selectedExpediente?.length > 0) {
            useNnaStore.getState().loadDocuments(selectedExpediente[0].id, selectedExpediente[0]);
        }
    }, [selectedExpediente]);

    useEffect(() => {
        if (!currentDiagnosticoId) { setCurrentDiagnosticoData(null); return; }
        const token = localStorage.getItem('token');
        fetch(`${INTERVENCION_API_URL}/diagnostico/${currentDiagnosticoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setCurrentDiagnosticoData)
            .catch(console.error);
    }, [currentDiagnosticoId]);

    if (isLoading || !selectedExpediente?.length) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-secondary">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Cargando expediente digital…
                </div>
            </div>
        );
    }

    const mainNna   = selectedExpediente[0];
    const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[mainNna.casos.length - 1];
    const carpetaCode = mainNna.carpeta?.codigo || '---';

    const phases = [
        { id: 1, name: 'Contacto e Integración',     status: 'completed', icon: Contact },
        { id: 2, name: 'Desarrollo e Intervención',  status: 'current',   icon: HeartPulse },
        { id: 3, name: 'Seguimiento y Egreso',        status: 'pending',   icon: CheckCircle2 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <ExpedienteDigitalDocs nna={mainNna} caso={activeCase} />;
            case 'ficha':
                return <div className="bg-surface rounded-lg border border-border overflow-hidden"><NnaFichaPage embed={true} /></div>;
            case 'social':
                if (showDiagnosticoForm) return (
                    <div className="space-y-4">
                        <button onClick={() => setShowDiagnosticoForm(false)}
                            className="flex items-center gap-2 text-fg-secondary hover:text-fg text-[13px] font-medium bg-surface px-3 py-2 rounded-md border border-border hover:bg-surface-muted transition-colors">
                            <ArrowLeft size={15} /> Volver a la lista
                        </button>
                        <Formato4Social nna={mainNna} caso={activeCase} initialData={currentDiagnosticoData}
                            onClose={() => setShowDiagnosticoForm(false)} onSuccess={() => setShowDiagnosticoForm(false)} />
                    </div>
                );
                return <DiagnosticoSocialList nnaId={mainNna.id}
                    nnaFullName={`${mainNna.nombres} ${mainNna.apellidoPaterno} ${mainNna.apellidoMaterno}`}
                    onNuevoDiagnostico={() => { setCurrentDiagnosticoId(null); setShowDiagnosticoForm(true); }}
                    onVerDiagnostico={id => { setCurrentDiagnosticoId(id); setShowDiagnosticoForm(true); }}
                    onEditarDiagnostico={id => { setCurrentDiagnosticoId(id); setShowDiagnosticoForm(true); }} />;
            case 'logros':
                if (showLogrosForm) return (
                    <div className="space-y-4">
                        <button onClick={() => setShowLogrosForm(false)}
                            className="flex items-center gap-2 text-fg-secondary hover:text-fg text-[13px] font-medium bg-surface px-3 py-2 rounded-md border border-border hover:bg-surface-muted transition-colors">
                            <ArrowLeft size={15} /> Volver a la lista
                        </button>
                        <Formato5Logros nna={mainNna} onClose={() => setShowLogrosForm(false)} />
                    </div>
                );
                return <LogrosList nnaId={mainNna.id}
                    nnaFullName={`${mainNna.nombres} ${mainNna.apellidoPaterno} ${mainNna.apellidoMaterno}`}
                    onNuevoLogro={() => setShowLogrosForm(true)}
                    onVerLogro={() => setShowLogrosForm(true)}
                    onEditarLogro={() => setShowLogrosForm(true)} />;
            case 'informe':
                return <InformeSituacional nna={mainNna} onClose={() => setActiveTab('dashboard')} />;
            case 'seguimiento_familiar':
                return <SeguimientoFamiliarList nna={mainNna} />;
            case 'pti':
                return <div className="bg-surface rounded-lg border border-border overflow-hidden">
                    <PlanIntervencion nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                </div>;
            case 'derivaciones':
                return <div className="bg-surface rounded-lg border border-border p-6">
                    <FichaDerivacion nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                </div>;
            case 'talleres':
                return <div className="bg-surface rounded-lg border border-border p-6">
                    <FichaTalleres nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                </div>;
            case 'egreso':
                return <div className="bg-surface rounded-lg border border-border p-6">
                    <InformeEgresoList nna={mainNna} />
                </div>;
            case 'seguimiento':
                return <PlaceholderModule title="Diario de Campo y Seguimiento" description="Registro de visitas, abordajes en calle y evoluciones." />;
            default:
                return <ExpedienteDigitalDocs nna={mainNna} caso={activeCase} />;
        }
    };

    return (
        <div className="space-y-0">

            {/* ── Header del expediente ── */}
            <div className="bg-surface border-b border-border px-6 py-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <Link to="/nna" className="flex items-center gap-1.5 text-fg-secondary hover:text-fg text-[13px] font-medium transition-colors">
                        <ArrowLeft size={15} /> Volver al Padrón
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge tone={activeCase?.estado === 'ACTIVO' ? 'success' : 'neutral'} dot>
                            {activeCase?.estado || 'ACTIVO'}
                        </Badge>
                        <span className="text-[12px] text-fg-muted font-mono">EXP: {carpetaCode}</span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-h1 text-fg uppercase tracking-tight">
                            {mainNna.nombres} {mainNna.apellidoPaterno} {mainNna.apellidoMaterno}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-[13px] text-fg-secondary">
                            <span className="flex items-center gap-1"><FolderOpen size={13} /> Expediente Digital</span>
                            <span className="w-1 h-1 bg-border-strong rounded-full" aria-hidden="true" />
                            <span>{mainNna.tipoDoc}: {mainNna.numeroDoc || 'S/D'}</span>
                            <span className="w-1 h-1 bg-border-strong rounded-full" aria-hidden="true" />
                            <span>{mainNna.fechaNacimiento ? new Date().getFullYear() - new Date(mainNna.fechaNacimiento).getFullYear() : '—'} años</span>
                        </div>
                    </div>

                    {/* Tracker de fases */}
                    <div className="flex items-center gap-0">
                        {phases.map((phase, i) => {
                            const isLast      = i === phases.length - 1;
                            const isActive    = phase.status === 'current';
                            const isCompleted = phase.status === 'completed';
                            return (
                                <div key={phase.id} className="flex items-center">
                                    <div title={`Fase ${phase.id}: ${phase.name}`}
                                        className={[
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all',
                                            isCompleted ? 'bg-success-soft border-success/30 text-success'
                                                : isActive ? 'bg-primary text-primary-fg border-primary shadow-[var(--shadow-1)]'
                                                : 'bg-surface border-border text-fg-muted',
                                        ].join(' ')}
                                    >
                                        <div className={[
                                            'w-4 h-4 rounded-full grid place-items-center text-[9px] font-bold',
                                            isActive ? 'bg-white/20 text-white'
                                                : isCompleted ? 'bg-success/20 text-success'
                                                : 'bg-surface-muted text-fg-muted',
                                        ].join(' ')}>
                                            {isCompleted ? <CheckCircle2 size={10} /> : phase.id}
                                        </div>
                                        <span className="hidden xl:inline">{phase.name.replace(/Fase \d+: /, '')}</span>
                                        <span className="hidden sm:inline xl:hidden">F{phase.id}</span>
                                    </div>
                                    {!isLast && (
                                        <div className={`w-6 md:w-10 h-px ${isCompleted ? 'bg-success/40' : 'bg-border'}`} aria-hidden="true" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="px-6 flex flex-col md:flex-row gap-6 items-start">

                {/* ── Sidebar de navegación por fases ── */}
                <aside className="w-full md:w-60 flex-shrink-0 space-y-3 md:sticky md:top-6">

                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="Resumen del Caso" />

                    {/* Fase 1 */}
                    <div>
                        <div className="px-3 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary-soft text-primary mb-0.5">Fase 1</span>
                            <p className="text-[12px] font-semibold text-fg">Contacto e Integración</p>
                        </div>
                        <NavButton active={activeTab === 'mapeo'}  onClick={() => setActiveTab('mapeo')}  icon={Map}          label="Expediente Digital"          subLabel="Identificación" />
                        <NavButton active={activeTab === 'ficha'}  onClick={() => setActiveTab('ficha')}  icon={FileText}     label="Ficha de Inscripción"      subLabel="Empadronamiento F3" />
                        <NavButton active={activeTab === 'social'} onClick={() => setActiveTab('social')} icon={ClipboardList} label="Diagnóstico Social"        subLabel="Formato 4" />
                        <NavButton active={activeTab === 'logros'} onClick={() => setActiveTab('logros')} icon={TrendingUp}   label="Ficha de Logros"           subLabel="Formato 5" />
                        <NavButton active={activeTab === 'informe'} onClick={() => setActiveTab('informe')} icon={FileSignature} label="Informe Situacional"     subLabel="Cierre Fase 1" />
                    </div>

                    {/* Fase 2 */}
                    <div>
                        <div className="px-3 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-info-soft text-info mb-0.5">Fase 2</span>
                            <p className="text-[12px] font-semibold text-fg">Desarrollo e Intervención</p>
                        </div>
                        <NavButton active={activeTab === 'pti'}      onClick={() => setActiveTab('pti')}      icon={Target}      label="Plan de Intervención"    subLabel="Restitución de Derechos" />
                        <NavButton active={activeTab === 'talleres'} onClick={() => setActiveTab('talleres')} icon={Presentation} label="Talleres Socioeducativos" subLabel="F07 y F08" />
                    </div>

                    {/* Fase 3 */}
                    <div>
                        <div className="px-3 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-success-soft text-success mb-0.5">Fase 3</span>
                            <p className="text-[12px] font-semibold text-fg">Seguimiento y Egreso</p>
                        </div>
                        <NavButton active={activeTab === 'seguimiento_familiar'} onClick={() => setActiveTab('seguimiento_familiar')} icon={Users}        label="Seguimiento Familiar"  subLabel="Formato 12" />
                        <NavButton active={activeTab === 'egreso'}               onClick={() => setActiveTab('egreso')}               icon={CheckCircle2} label="Ficha de Egreso"       subLabel="Formato 13" />
                        <NavButton active={activeTab === 'seguimiento'}          onClick={() => setActiveTab('seguimiento')}          icon={Activity}    label="Seguimiento"            subLabel="Posterior Egreso" />
                    </div>
                </aside>

                {/* ── Contenido principal ── */}
                <div className="flex-1 min-w-0 w-full pb-12">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

/* ── NavButton ──────────────────────────────────────────────── */
const NavButton = ({ active, onClick, icon: Icon, label, subLabel }: {
    active: boolean; onClick: () => void; icon: React.ElementType; label: string; subLabel?: string;
}) => (
    <button
        onClick={onClick}
        className={[
            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-left transition-colors border',
            active
                ? 'bg-primary-soft text-primary border-primary/20'
                : 'bg-transparent text-fg-secondary border-transparent hover:bg-surface-muted hover:text-fg',
        ].join(' ')}
    >
        <Icon size={15} className={active ? 'text-primary' : 'text-fg-muted'} aria-hidden="true" />
        <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate">{label}</p>
            {subLabel && <p className={`text-[10px] truncate ${active ? 'text-primary/70' : 'text-fg-muted'}`}>{subLabel}</p>}
        </div>
    </button>
);

/* ── StatusCard ──────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, string> = {
    success: 'bg-success-soft border-success/30 text-success',
    warning: 'bg-warning-soft border-warning/30 text-warning',
    danger:  'bg-danger-soft border-danger/30 text-danger',
};

const StatusCard = ({ title, status, icon: Icon, details }: any) => (
    <div className={`p-4 rounded-lg border flex flex-col gap-2 ${STATUS_STYLES[status] ?? STATUS_STYLES.warning}`}>
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{title}</span>
            <Icon size={16} aria-hidden="true" />
        </div>
        <p className="text-[15px] font-semibold leading-tight">{details}</p>
    </div>
);

/* ── PlaceholderModule ───────────────────────────────────────── */
const PlaceholderModule = ({ title, description }: { title: string; description: string }) => (
    <div className="border border-dashed border-border-strong rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-80">
        <div className="w-12 h-12 rounded-lg bg-surface-muted border border-border grid place-items-center text-fg-muted mb-4">
            <Clock size={24} />
        </div>
        <h3 className="text-h2 text-fg mb-2">{title}</h3>
        <p className="text-body text-fg-secondary max-w-sm">{description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] text-fg-muted bg-surface-muted">
            Módulo en desarrollo — Próximamente
        </span>
    </div>
);

/* ── ExpedienteDigitalDocs ───────────────────────────────────── */
const ExpedienteDigitalDocs = ({ nna, caso }: any) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { documents, registerDocument } = useNnaStore();

    const handleUploadDocument = (newDocData: any) => {
        registerDocument({
            nnaId: nna.id, type: newDocData.type,
            code: `DOC-${String(documents.length + 1).padStart(3, '0')}`,
            pages: Number(newDocData.pages), user: 'Usuario Actual', status: 'CARGADO', file: newDocData.file
        });
        setIsUploadModalOpen(false);
    };

    let currentFolio = 1;
    const documentsFoliated = documents.map((doc: any) => {
        const start = currentFolio;
        const end = currentFolio + doc.pages - 1;
        currentFolio = end + 1;
        return { ...doc, folioStart: start, folioEnd: end };
    });

    return (
        <div className="space-y-5">

            {/* Status cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard title="Situación de Salud"    status={nna.afiliadoSIS === 'SI' ? 'success' : 'warning'}    icon={HeartPulse}    details={nna.afiliadoSIS === 'SI' ? 'Afiliado al SIS' : 'Sin afiliación registrada'} />
                <StatusCard title="Situación Educativa"   status={nna.estudiaActualmente ? 'success' : 'danger'}         icon={GraduationCap} details={nna.estudiaActualmente ? `${nna.nivelEducativo} - ${nna.gradoEstudio}` : 'No estudia actualmente'} />
                <StatusCard title="Identidad (DNI)"       status={nna.numeroDoc ? 'success' : 'danger'}                  icon={FileText}      details={nna.numeroDoc ? `DNI: ${nna.numeroDoc}` : 'Sin Documento de Identidad'} />
            </div>

            {/* Header de documentos */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-h2 text-fg">Documentos del Expediente</h2>
                    <p className="text-caption text-fg-secondary mt-0.5">Vista consolidada y foliada de actuaciones</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-primary-fg px-3 py-2 rounded-md text-[13px] font-medium transition-colors">
                        <Upload size={14} /> Subir documentos
                    </button>
                    <div className="bg-primary-soft text-primary px-3 py-2 rounded-md border border-primary/20 flex items-center gap-1.5 text-[13px] font-medium">
                        <FolderOpen size={14} /> Total Folios: {String(currentFolio - 1).padStart(3, '0')}
                    </div>
                </div>
            </div>

            {/* Tabla de documentos */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface-muted border-b border-border">
                        <tr>
                            <th className="px-5 py-3 w-10 text-center font-semibold text-fg-secondary text-[12px]">N°</th>
                            <th className="px-5 py-3 font-semibold text-fg-secondary text-[12px]">Documento</th>
                            <th className="px-5 py-3 font-semibold text-fg-secondary text-[12px]">Fecha</th>
                            <th className="px-5 py-3 font-semibold text-fg-secondary text-[12px]">Responsable</th>
                            <th className="px-5 py-3 text-center font-semibold text-fg-secondary text-[12px]">Folios</th>
                            <th className="px-5 py-3 text-center w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {documentsFoliated.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-5 py-12 text-center text-fg-secondary">
                                    <div className="flex flex-col items-center gap-2">
                                        <FolderOpen size={28} className="text-fg-muted" />
                                        <p className="text-[14px] font-semibold text-fg">Sin documentos cargados</p>
                                        <p className="text-caption">Sube el primer documento para comenzar el expediente digital.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : documentsFoliated.map((doc: any, idx: number) => (
                            <tr key={doc.id} className="hover:bg-surface-muted/50 transition-colors">
                                <td className="px-5 py-3 text-center font-semibold text-fg-muted">{idx + 1}</td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-md bg-primary-soft text-primary border border-primary/15 flex-shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-fg">{doc.type}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono font-semibold text-warning bg-warning-soft px-1.5 py-0.5 rounded">#{doc.code}</span>
                                                {doc.status === 'PENDIENTE_FIRMA' && (
                                                    <span className="text-[10px] text-fg-muted flex items-center gap-1"><Clock size={9} /> Pendiente Firma</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3">
                                    <p className="text-[13px] text-fg flex items-center gap-1.5">
                                        <Calendar size={12} className="text-fg-muted" />
                                        {new Date(doc.date).toLocaleDateString('es-PE')}
                                    </p>
                                    <p className="text-[11px] text-fg-muted mt-0.5 flex items-center gap-1.5">
                                        <Clock size={10} />
                                        {new Date(doc.date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                                    </p>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2 bg-surface-muted px-2.5 py-1.5 rounded-md border border-border w-fit">
                                        <User size={12} className="text-fg-muted" />
                                        <span className="text-[12px] font-medium text-fg truncate max-w-[140px]">{doc.user}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <div className="inline-flex flex-col items-center">
                                        <div className="bg-primary text-primary-fg text-[10px] font-bold px-2 py-0.5 rounded-t w-18 text-center uppercase tracking-wide">Exp.</div>
                                        <div className="bg-primary-soft text-primary border-x border-b border-primary/20 rounded-b px-2 py-1 text-center">
                                            <span className="text-[11px] font-bold block">{doc.pages} págs</span>
                                            <span className="text-[10px] font-mono opacity-70">{String(doc.folioStart).padStart(3,'0')}–{String(doc.folioEnd).padStart(3,'0')}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <button className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-md transition-colors" title="Ver documento" aria-label="Ver documento">
                                        <Eye size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isUploadModalOpen && (
                <UploadModal onClose={() => setIsUploadModalOpen(false)} onUpload={handleUploadDocument} />
            )}
        </div>
    );
};

/* ── UploadModal ──────────────────────────────────────────────── */
const UploadModal = ({ onClose, onUpload }: { onClose: () => void; onUpload: (d: any) => void }) => {
    const [file, setFile]     = useState<File | null>(null);
    const [docType, setDocType] = useState('COPIA DNI (NNA)');
    const [pages, setPages]   = useState(1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        onUpload({ type: docType, pages, file });
    };

    return (
        <div className="fixed inset-0 bg-fg/20 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-surface border border-border w-full max-w-md rounded-lg shadow-[var(--shadow-3)] overflow-hidden">

                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-h2 text-fg flex items-center gap-2">
                        <FilePlus size={16} className="text-primary" /> Subir documento
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-md" aria-label="Cerrar">
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-caption text-fg-secondary block mb-1.5">Tipo de Documento</label>
                        <select value={docType} onChange={e => setDocType(e.target.value)}
                            className="w-full bg-surface text-fg text-body px-3 py-2.5 border border-border-strong rounded-md outline-none focus:border-primary transition-shadow">
                            {['COPIA DNI (NNA)','COPIA DNI (APODERADO)','COPIA SIS/SEGURO','CUADERNO DE CAMPO (FOLIOS)','OTROS DOCUMENTOS'].map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-caption text-fg-secondary block mb-1.5">Cantidad de folios</label>
                        <input type="number" min="1" value={pages} onChange={e => setPages(Number(e.target.value))}
                            className="w-32 bg-surface text-fg text-body px-3 py-2.5 border border-border-strong rounded-md outline-none focus:border-primary" />
                    </div>

                    <div>
                        <label className="text-caption text-fg-secondary block mb-1.5">Archivo digital</label>
                        <div className="border-2 border-dashed border-border-strong rounded-lg p-6 text-center hover:bg-surface-muted transition-colors cursor-pointer relative">
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.jpg,.png,.jpeg" />
                            <Upload size={24} className="mx-auto text-fg-muted mb-2" />
                            {file ? (
                                <p className="text-[13px] font-semibold text-primary break-all">{file.name}</p>
                            ) : (
                                <>
                                    <p className="text-[13px] font-medium text-fg">Arrastra o selecciona un archivo</p>
                                    <p className="text-caption text-fg-muted mt-1">PDF, JPG, PNG (máx. 10 MB)</p>
                                </>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={!file}
                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-fg rounded-md text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        Subir al expediente
                    </button>
                </form>
            </div>
        </div>
    );
};
