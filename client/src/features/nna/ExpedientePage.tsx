import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../config/api';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import {
    LayoutDashboard,
    FileText,
    ClipboardList,
    HeartPulse,
    GraduationCap,
    ArrowLeft,
    FolderOpen,
    AlertCircle,
    CheckCircle2,
    Clock,
    Send,
    Map,
    Contact,
    Calendar,
    User,
    Eye,
    Upload,
    X,
    FilePlus,
    TrendingUp,
    FileSignature,
    Target,
    Presentation,
    Activity,
    BookOpen,
    Users
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
// Formato 13: Informe de Egreso (Fase 3)
import { InformeEgresoList } from './components/InformeEgresoList';
// Formato 12: Seguimiento Familiar (Fase 3)
import { SeguimientoFamiliarList } from './components/SeguimientoFamiliarList';
import { ResumenCaso } from './components/ResumenCaso';
import { PdfViewerModal } from './components/PdfViewerModal';

export const ExpedientePage = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { selectedExpediente, isLoading, fetchExpediente } = useNnaStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showDiagnosticoForm, setShowDiagnosticoForm] = useState(false);
    const [currentDiagnosticoId, setCurrentDiagnosticoId] = useState<number | null>(null);
    const [currentDiagnosticoData, setCurrentDiagnosticoData] = useState<any>(null);
    const [showLogrosForm, setShowLogrosForm] = useState(false);

    useEffect(() => {
        if (id) {
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    // Fetch diagnóstico para edición — usar el NNA seleccionado, no siempre el [0]
    useEffect(() => {
        if (selectedExpediente && selectedExpediente.length > 0) {
            const nnaIdParam = searchParams.get('nnaId');
            const targetNna = nnaIdParam
                ? (selectedExpediente.find((n: any) => n.id === Number(nnaIdParam)) ?? selectedExpediente[0])
                : selectedExpediente[0];
            useNnaStore.getState().loadDocuments(targetNna.id, targetNna);
        }
    }, [selectedExpediente, searchParams]);

    useEffect(() => {
        if (currentDiagnosticoId) {
            const token = localStorage.getItem('token');
            fetch(`${INTERVENCION_API_URL}/diagnostico/${currentDiagnosticoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setCurrentDiagnosticoData(data))
                .catch(err => console.error('Error cargando diagnóstico:', err));
        } else {
            setCurrentDiagnosticoData(null);
        }
    }, [currentDiagnosticoId]);

    if (isLoading || !selectedExpediente || selectedExpediente.length === 0) {
        return <div className="p-8 text-center text-gray-500">Cargando expediente digital...</div>;
    }

    // Mostrar el NNA específico que el educador eligió; si no hay query param, el primero de la carpeta
    const nnaIdParam = searchParams.get('nnaId');
    const mainNna = nnaIdParam
        ? (selectedExpediente.find((n: any) => n.id === Number(nnaIdParam)) ?? selectedExpediente[0])
        : selectedExpediente[0];
    // Buscamos caso activo, si no hay, el último caso registrado (para ver historial o cierre)
    const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || (mainNna.casos && mainNna.casos.length > 0 ? mainNna.casos[mainNna.casos.length - 1] : null);
    const carpetaCode = mainNna.carpeta?.codigo || '---';

    // Fases del Proceso (Educadores de Calle - Estructura de Intervención)
    const phases = [
        { id: 1, name: 'Fase 1: Contacto e Integración', status: 'completed', icon: Contact },
        { id: 2, name: 'Fase 2: Desarrollo e Intervención', status: 'current', icon: HeartPulse },
        { id: 3, name: 'Fase 3: Seguimiento y Egreso', status: 'pending', icon: CheckCircle2 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <ResumenCaso nna={mainNna} caso={activeCase} familia={selectedExpediente || [mainNna]} />;
            case 'ficha':
                return <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><NnaFichaPage embed={true} /></div>;
            case 'social':
                if (showDiagnosticoForm) {
                    return (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowDiagnosticoForm(false)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300"
                            >
                                <ArrowLeft size={18} />
                                Volver a la Lista
                            </button>
                            <Formato4Social
                                nna={mainNna}
                                caso={activeCase}
                                initialData={currentDiagnosticoData}
                                onClose={() => setShowDiagnosticoForm(false)}
                                onSuccess={() => setShowDiagnosticoForm(false)}
                            />
                        </div>
                    );
                }
                return (
                    <DiagnosticoSocialList
                        nnaId={mainNna.id}
                        nnaFullName={`${mainNna.nombres} ${mainNna.apellidoPaterno} ${mainNna.apellidoMaterno}`}
                        onNuevoDiagnostico={() => {
                            setCurrentDiagnosticoId(null);
                            setShowDiagnosticoForm(true);
                        }}
                        onVerDiagnostico={(id) => {
                            setCurrentDiagnosticoId(id);
                            setShowDiagnosticoForm(true);
                        }}
                        onEditarDiagnostico={(id) => {
                            setCurrentDiagnosticoId(id);
                            setShowDiagnosticoForm(true);
                        }}
                    />
                );
            case 'logros':
                if (showLogrosForm) {
                    return (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowLogrosForm(false)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300"
                            >
                                <ArrowLeft size={18} />
                                Volver a la Lista
                            </button>
                            <Formato5Logros nna={mainNna} onClose={() => setShowLogrosForm(false)} />
                        </div>
                    );
                }
                return (
                    <LogrosList
                        nnaId={mainNna.id}
                        nnaFullName={`${mainNna.nombres} ${mainNna.apellidoPaterno} ${mainNna.apellidoMaterno}`}
                        onNuevoLogro={() => setShowLogrosForm(true)}
                        onVerLogro={() => setShowLogrosForm(true)}
                        onEditarLogro={() => setShowLogrosForm(true)}
                    />
                );
            case 'informe':
                return <InformeSituacional nna={mainNna} onClose={() => setActiveTab('dashboard')} />;
            case 'seguimiento_familiar':
                return <SeguimientoFamiliarList nna={mainNna} caso={activeCase} />;
            case 'pti':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <PlanIntervencion nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                    </div>
                );
            case 'derivaciones':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                        <FichaDerivacion nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                    </div>
                );
            case 'talleres':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                        <FichaTalleres nna={mainNna} onClose={() => setActiveTab('dashboard')} />
                    </div>
                );
            case 'egreso':
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                        <InformeEgresoList nna={mainNna} />
                    </div>
                );
            case 'seguimiento':
                return <PlaceholderModule title="Diario de Campo y Seguimiento" description="Registro de visitas, abordajes en calle y evoluciones." />;
            default:
                return <ExpedienteDigitalDocs nna={mainNna} caso={activeCase} />;
        }
    };

    return (
        <div className="min-h-screen bg-bg space-y-6">
            {/* Header del Expediente */}
            <div className="bg-surface border-b border-border">
                <div className="w-full px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <Link to="/nna" className="flex items-center gap-2 text-fg-muted hover:text-fg text-[13px] font-medium transition-colors">
                            <ArrowLeft size={16} /> Volver al Padrón
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${activeCase?.estado === 'CERRADO' ? 'bg-surface-muted text-fg-muted border border-border' : 'bg-success-soft text-success border border-success/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${activeCase?.estado === 'CERRADO' ? 'bg-fg-muted' : 'bg-success'}`}></span>
                                {activeCase?.estado || 'ACTIVO'}
                            </span>
                            <span className="text-[11px] text-fg-muted font-mono font-medium">EXP: {mainNna.carpeta?.codigo || activeCase?.codigoCaso || '---'}</span>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-fg uppercase tracking-tight">
                                {mainNna.nombres} {mainNna.apellidoPaterno} {mainNna.apellidoMaterno}
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-[13px] text-fg-muted font-medium">
                                <span className="flex items-center gap-1.5"><FolderOpen size={14} /> Expediente Digital</span>
                                <span className="w-1 h-1 bg-border rounded-full"></span>
                                <span>{mainNna.tipoDoc}: {mainNna.numeroDoc || 'S/D'}</span>
                                <span className="w-1 h-1 bg-border rounded-full"></span>
                                <span>{mainNna.fechaNacimiento ? new Date().getFullYear() - new Date(mainNna.fechaNacimiento).getFullYear() : '-'} años</span>
                            </div>
                        </div>

                        {/* Progress Tracker Visual */}
                        <div className="flex items-center">
                            {phases.map((phase, index) => {
                                const isLast = index === phases.length - 1;
                                const isActive = phase.status === 'current';
                                const isCompleted = phase.status === 'completed';

                                return (
                                    <div key={phase.id} className="flex items-center">
                                        <div
                                            title={phase.name}
                                            className={`
                                            flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-1.5 rounded-full border text-[11px] font-bold transition-all relative z-10
                                            ${isCompleted ? 'bg-success-soft border-success/30 text-success' :
                                                    isActive ? 'bg-primary border-primary text-primary-fg shadow-sm' :
                                                        'bg-surface border-border text-fg-muted'}
                                        `}>
                                            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${isActive ? 'bg-primary-fg text-primary' : isCompleted ? 'bg-success/20 text-success' : 'bg-surface-muted text-fg-muted'}`}>
                                                {isCompleted ? <CheckCircle2 size={12} /> : phase.id}
                                            </div>
                                            <span className="hidden xl:inline tracking-tight">{phase.name.replace(/Fase \d+: /, '')}</span>
                                            <span className="hidden sm:inline xl:hidden">Fase {phase.id}</span>
                                        </div>

                                        {!isLast && (
                                            <div className={`w-4 sm:w-8 md:w-12 h-px transition-colors ${isCompleted ? 'bg-success/40' : 'bg-border'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full px-6 flex flex-col md:flex-row gap-6 items-start">
                {/* Sidebar Menu - Ancho Fijo optimizado */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-4 sticky top-6">

                    {/* VISTA GENERAL */}
                    <div className="space-y-1">
                        <NavButton
                            active={activeTab === 'dashboard'}
                            onClick={() => setActiveTab('dashboard')}
                            icon={LayoutDashboard}
                            label="Resumen del Caso"
                        />
                    </div>

                    {/* FASE 1: CONTACTO E INTEGRACIÓN */}
                    <div>
                        <div className="px-4 mb-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-primary-soft text-primary uppercase tracking-wider mb-1">Fase 1</span>
                            <p className="text-[12px] font-bold text-fg">Contacto e Integración</p>
                        </div>
                        <NavButton
                            active={activeTab === 'mapeo'}
                            onClick={() => setActiveTab('mapeo')}
                            icon={Map}
                            label="Expediente Digital"
                            subLabel="Identificación"
                        />
                        <NavButton
                            active={activeTab === 'ficha'}
                            onClick={() => setActiveTab('ficha')}
                            icon={FileText}
                            label="Ficha de Inscripción"
                            subLabel="Empadronamiento F3"
                        />
                        <NavButton
                            active={activeTab === 'social'}
                            onClick={() => setActiveTab('social')}
                            icon={ClipboardList}
                            label="Ficha de Diagnóstico Social"
                            subLabel="Formato 4"
                        />
                        <NavButton
                            active={activeTab === 'logros'}
                            onClick={() => setActiveTab('logros')}
                            icon={TrendingUp}
                            label="Ficha de Logros"
                            subLabel="Formato 5"
                        />
                        <NavButton
                            active={activeTab === 'informe'}
                            onClick={() => setActiveTab('informe')}
                            icon={FileSignature}
                            label="Informe Situacional"
                            subLabel="Cierre Fase 1"
                        />
                    </div>

                    {/* FASE 2: DESARROLLO E INTERVENCIÓN */}
                    <div>
                        <div className="px-4 mb-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-info-soft text-info uppercase tracking-wider mb-1">Fase 2</span>
                            <p className="text-[12px] font-bold text-fg">Desarrollo e Intervención</p>
                        </div>
                        <NavButton
                            active={activeTab === 'pti'}
                            onClick={() => setActiveTab('pti')}
                            icon={Target}
                            label="Plan de Intervención Individual"
                            subLabel="Restitución de Derechos"
                        />

                        <NavButton
                            active={activeTab === 'talleres'}
                            onClick={() => setActiveTab('talleres')}
                            icon={Presentation}
                            label="Talleres Socioeducativos"
                            subLabel="Formatos 07 y 08"
                        />

                    </div>

                    {/* FASE 3: SEGUIMIENTO Y EGRESO */}
                    <div>
                        <div className="px-4 mb-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-success-soft text-success uppercase tracking-wider mb-1">Fase 3</span>
                            <p className="text-[12px] font-bold text-fg">Seguimiento y Egreso</p>
                        </div>
                        <NavButton
                            active={activeTab === 'seguimiento_familiar'}
                            onClick={() => setActiveTab('seguimiento_familiar')}
                            icon={Users}
                            label="Seguimiento Familiar"
                            subLabel="Formato 12"
                        />
                        <NavButton
                            active={activeTab === 'egreso'}
                            onClick={() => setActiveTab('egreso')}
                            icon={CheckCircle2}
                            label="Ficha de Egreso"
                            subLabel="Formato 13"
                        />
                        <NavButton
                            active={activeTab === 'seguimiento'}
                            onClick={() => setActiveTab('seguimiento')}
                            icon={Activity}
                            label="Seguimiento"
                            subLabel="Posterior Egreso"
                        />
                    </div>
                </div>

                {/* Main Content Area - Ocupa todo el resto */}
                <div className="flex-1 min-w-0 w-full">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon: Icon, label, subLabel }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all border
            ${active
                ? 'bg-primary-soft text-primary border-primary/20'
                : 'bg-transparent text-fg-2 border-transparent hover:bg-surface-muted hover:text-fg'}
        `}
    >
        <Icon size={18} className={active ? 'text-primary' : 'text-fg-muted'} />
        <div>
            <p className="font-semibold text-[13px] leading-tight">{label}</p>
            {subLabel && <p className={`text-[10px] mt-0.5 ${active ? 'text-primary/70 font-medium' : 'text-fg-muted'}`}>{subLabel}</p>}
        </div>
    </button>
);

const ExpedienteDigitalDocs = ({ nna, caso }: any) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { documents, uploadPhysicalDocument } = useNnaStore();
    const [isPdfOpen, setIsPdfOpen] = useState(false);
    const [selectedPdfNna, setSelectedPdfNna] = useState<{ id: number, name: string, filename?: string, title?: string } | null>(null);

    // documents viene del store ahora

    const handleUploadDocument = async (newDocData: any) => {
        try {
            await uploadPhysicalDocument(nna.id, newDocData.file, newDocData.type);
        } catch (error: any) {
            alert(`Error al subir documento: ${error.message}`);
        }
        setIsUploadModalOpen(false);
    };

    // 1. Ordenar documentos cronológicamente de forma ascendente (el más antiguo primero) para realizar el foliado
    const sortedAsc = [...documents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Cálculo dinámico de folios secuenciales
    let currentFolio = 1;
    const documentsFoliatedAsc = sortedAsc.map((doc: any) => {
        const start = currentFolio;
        const end = currentFolio + doc.pages - 1;
        currentFolio = end + 1;
        return { ...doc, folioStart: start, folioEnd: end };
    });

    // 3. Invertir la lista foliada para mostrarla en orden estrictamente descendente (el más reciente arriba)
    const documentsFoliated = [...documentsFoliatedAsc].reverse();

    return (
        <div className="space-y-6 relative">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard
                    title="Situación de Salud"
                    status={nna.afiliadoSIS === 'SI' ? 'success' : 'warning'}
                    icon={HeartPulse}
                    details={nna.afiliadoSIS === 'SI' ? 'Afiliado al SIS' : 'Sin afiliación registrada'}
                />
                <StatusCard
                    title="Situación Educativa"
                    status={nna.estudiaActualmente ? 'success' : 'danger'}
                    icon={GraduationCap}
                    details={nna.estudiaActualmente ? `${nna.nivelEducativo} - ${nna.gradoEstudio}` : 'No estudia actualmente'}
                />
                <StatusCard
                    title="Identidad (DNI)"
                    status={nna.numeroDoc ? 'success' : 'danger'}
                    icon={FileText}
                    details={nna.numeroDoc ? `DNI: ${nna.numeroDoc}` : 'Sin Documento de Identidad'}
                />
            </div>

            {/* Header Stats */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[16px] font-semibold text-fg">Documentos del Expediente</h2>
                    <p className="text-[12px] text-fg-2 mt-0.5">Vista consolidada y foliada de actuaciones</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-fg px-3 py-1.5 rounded-lg font-medium text-[13px] transition-all"
                    >
                        <Upload size={14} />
                        Subir Documentos
                    </button>
                    <div className="bg-primary-soft text-primary px-3 py-1.5 rounded-lg border border-primary/20 flex items-center gap-1.5">
                        <FolderOpen size={16} />
                        <span className="font-semibold text-[13px]">Total Folios: {String(currentFolio - 1).padStart(3, '0')}</span>
                    </div>
                </div>
            </div>

            {/* Document List Table */}
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-[13px] border-collapse">
                    <thead className="bg-surface-muted border-b border-border text-fg-2 font-semibold text-[12px]">
                        <tr>
                            <th className="px-4 py-2.5 w-12 text-center">N°</th>
                            <th className="px-4 py-2.5">Documento / Referencia</th>
                            <th className="px-4 py-2.5 w-48">Fecha / Hora</th>
                            <th className="px-4 py-2.5">Responsable</th>
                            <th className="px-4 py-2.5 text-center">Folios</th>
                            <th className="px-4 py-2.5 text-center w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {documentsFoliated.map((doc, idx) => (
                            <tr key={doc.id} className="hover:bg-surface-muted transition-colors group">
                                <td className="px-4 py-2.5 text-center font-semibold text-fg-muted">
                                    {idx + 1}
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded flex-shrink-0
                                            ${doc.type.includes('FICHA') ? 'bg-info-soft text-info border border-info/20' :
                                                doc.type.includes('DNI') ? 'bg-primary-soft text-primary border border-primary/20' :
                                                    'bg-danger-soft text-danger border border-danger/20'
                                            }`}
                                        >
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-fg text-[13px]">{doc.type}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-mono font-semibold text-warning bg-warning-soft px-1.5 py-0.5 rounded">
                                                    #{doc.code}
                                                </span>
                                                {doc.status === 'PENDIENTE_FIRMA' && (
                                                    <span className="text-[10px] font-bold text-fg-muted flex items-center gap-1">
                                                        <Clock size={10} /> Pendiente Firma
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-col text-[12px] text-fg-2">
                                        <span>{new Date(doc.date).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5 bg-surface-muted px-2 py-1 rounded w-fit border border-border">
                                        <User size={12} className="text-fg-muted" />
                                        <span className="text-[12px] text-fg-2 truncate max-w-[150px]" title={doc.usuarioResponsable || doc.user}>
                                            {doc.usuarioResponsable || doc.user}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="bg-primary text-primary-fg text-[9px] font-bold px-2 py-0.5 rounded-t-[3px] w-16 text-center uppercase tracking-wider">
                                            Folios
                                        </div>
                                        <div className="bg-primary-soft text-primary border border-t-0 border-primary/20 rounded-b-[3px] w-16 py-0.5 flex flex-col items-center">
                                            <span className="text-[11px] font-bold">{String(doc.folioStart).padStart(3, '0')}-{String(doc.folioEnd).padStart(3, '0')}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                    {(doc.type.includes('FICHA') || doc.filename) ? (
                                        <button
                                            onClick={() => {
                                                setSelectedPdfNna({
                                                    id: nna.id,
                                                    name: `${nna.nombres} ${nna.apellidoPaterno} ${nna.apellidoMaterno}`,
                                                    filename: doc.filename,
                                                    title: doc.type
                                                });
                                                setIsPdfOpen(true);
                                            }}
                                            className="text-fg-muted hover:text-primary p-1.5 rounded transition-all"
                                            title="Ver Documento PDF"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => alert('La visualización directa en este momento solo está habilitada para las Fichas de Inscripción F03 en formato PDF y archivos PDF cargados.')}
                                            className="text-fg-muted/40 p-1.5 rounded cursor-not-allowed"
                                            title="Vista previa no disponible"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Carga */}
            {isUploadModalOpen && (
                <UploadModal
                    onClose={() => setIsUploadModalOpen(false)}
                    onUpload={handleUploadDocument}
                />
            )}

            {/* Visor de PDF Integrado */}
            {selectedPdfNna && (
                <PdfViewerModal
                    isOpen={isPdfOpen}
                    onClose={() => {
                        setIsPdfOpen(false);
                        setSelectedPdfNna(null);
                    }}
                    nnaId={selectedPdfNna.id}
                    nnaName={selectedPdfNna.name}
                    documentFilename={selectedPdfNna.filename}
                    title={selectedPdfNna.title}
                />
            )}
        </div>
    );
};

const StatusCard = ({ title, status, icon: Icon, details }: any) => {
    const colors: Record<string, string> = {
        success: 'bg-success-soft text-success border-success/30',
        warning: 'bg-warning-soft text-warning border-warning/30',
        danger: 'bg-danger-soft text-danger border-danger/30',
    };

    return (
        <div className={`p-[14px] rounded-[7px] border ${colors[status] || colors.warning} flex flex-col gap-1.5`}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase opacity-80">{title}</span>
                <Icon size={15} />
            </div>
            <p className="font-semibold text-[14px] leading-tight">{details}</p>
        </div>
    );
};

const PlaceholderModule = ({ title, description }: any) => (
    <div className="bg-surface rounded-xl border border-dashed border-border p-12 text-center flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mb-4">
            <Clock size={32} className="text-fg-muted" />
        </div>
        <h3 className="text-[20px] font-semibold text-fg mb-2">{title}</h3>
        <p className="text-fg-2 max-w-md">{description}</p>
        <button className="mt-6 px-4 py-2 bg-primary text-primary-fg rounded-lg text-[13px] font-medium opacity-50 cursor-not-allowed">
            Módulo en desarrollo (Próximamente)
        </button>
    </div>
);
const UploadModal = ({ onClose, onUpload }: any) => {
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState('COPIA DNI (NNA)');
    const [pages, setPages] = useState(1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        onUpload({
            type: docType,
            pages: pages,
            file: file
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-surface rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-muted">
                    <h3 className="font-semibold text-fg flex items-center gap-2">
                        <FilePlus size={18} className="text-primary" />
                        Subir Nuevo Documento
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-border rounded text-fg-muted transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[12px] font-medium text-fg-2 mb-1">Tipo de Documento</label>
                        <select
                            className="w-full p-2 text-[13px] rounded-md border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                        >
                            <option value="COPIA DNI (NNA)">Copia DNI (NNA)</option>
                            <option value="COPIA DNI (APODERADO)">Copia DNI (Padre/Madre/Apoderado)</option>
                            <option value="COPIA SIS/SEGURO">Copia SIS o Seguro</option>
                            <option value="CUADERNO DE CAMPO (FOLIOS)">Cuaderno de Campo (Folios)</option>
                            <option value="OTROS DOCUMENTOS">Otros Documentos</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[12px] font-medium text-fg-2 mb-1">Cant. Folios</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 text-[13px] rounded-md border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-surface"
                                value={pages}
                                onChange={(e) => setPages(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-fg-2 mb-1">Archivo Digital</label>
                        <div className="border border-dashed border-border rounded-lg p-6 text-center hover:bg-surface-muted transition-colors cursor-pointer relative bg-surface">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                accept=".pdf,.jpg,.png,.jpeg"
                            />
                            <Upload size={24} className="mx-auto text-fg-muted mb-2" />
                            {file ? (
                                <p className="text-[13px] font-medium text-primary break-all">{file.name}</p>
                            ) : (
                                <div>
                                    <p className="text-[13px] font-medium text-fg-2">Arrastra o selecciona un archivo</p>
                                    <p className="text-[11px] text-fg-muted mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!file}
                            className={`w-full py-2.5 rounded-md font-medium text-[13px] transition-all
                                ${file ? 'bg-primary hover:bg-primary/90 text-primary-fg' : 'bg-surface-muted text-fg-muted border border-border cursor-not-allowed'}
                            `}
                        >
                            Subir al Expediente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
