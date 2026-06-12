import { useState, useEffect } from 'react';
import { toast } from '../../../components/ui/Toast';
import { CheckCircle2, AlertTriangle, Printer, ChevronDown, ChevronUp, User, FileText, Plus, Edit, Eye, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Formato13Print } from './Formato13Print';
import { useNnaStore } from '../../../store/nna.store';
import { cerrarCaso, getInformeCierre } from '../../../api/casos.api';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { PdfViewerModal } from './PdfViewerModal';
import { useAuthStore } from '../../../store/auth.store';
import { getUsuariosBySede } from '../../../api/sedes.api';

/* ── Clases helper para inputs/selects ─────────────────────────────── */
const INP = 'w-full px-3 py-2 border border-border-strong rounded-[6px] text-[13px] bg-surface text-fg outline-none focus:border-primary transition-colors';
const SEL = INP + ' appearance-none';
const TA  = INP + ' resize-vertical min-h-[60px]';
const INP_DISABLED = 'w-full px-3 py-2 border border-border rounded-[6px] text-[13px] bg-surface-muted text-fg-muted outline-none cursor-not-allowed';
const LBL = 'block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1';

const getInputClass = (disabled?: boolean) => disabled ? INP_DISABLED : INP;
const getSelectClass = (disabled?: boolean) => disabled ? INP_DISABLED : SEL;
const getTextareaClass = (disabled?: boolean) => disabled ? INP_DISABLED + ' resize-none' : TA;

/* ── SectionHeader reutilizable (.esec-hd) ─────────────────────────── */
interface EsecHeaderProps {
    title: string;
    section: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    expanded: boolean;
    onToggle: (section: string) => void;
}

const EsecHeader = ({ title, section, icon: Icon, expanded, onToggle }: EsecHeaderProps) => (
    <button
        onClick={() => onToggle(section)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-bg cursor-pointer select-none transition-colors border-b border-border"
    >
        <div className="flex items-center gap-2">
            <Icon size={16} className="text-success" />
            <h3 className="font-semibold text-[13px] text-fg">{title}</h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-fg-muted" /> : <ChevronDown size={16} className="text-fg-muted" />}
    </button>
);

/* ── Checkbox card (.rcard style) ─────────────────────────────────── */
const CheckCard = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void, disabled?: boolean }) => (
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] border cursor-pointer transition-all text-[13px] ${
        checked ? 'border-primary bg-primary-soft text-primary' : 'border-border text-fg-2 hover:border-primary'
    } ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border-strong bg-surface'}`}>
            {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><polyline points="1 3.5 3.5 6 8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
        {label}
    </label>
);

interface NnaData {
    id: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    fechaNacimiento?: string;
    fechaIngreso?: string;
    numeroDoc?: string;
    sexo?: string;
    seguroSalud?: string;
    afiliadoSis?: string | number;
    afiliadoOtroSeguro?: string | number;
    detalleOtroSeguro?: string;
}

interface CasoData {
    id: number;
    perfil?: string;
    situacionCalle?: string;
    situacion_calle?: string;
    fechaIngreso?: string;
    fecha_ingreso?: string;
}

interface FichaFormato13 {
    fechaNacimiento: string;
    fechaIngreso: string;
    fechaEgreso: string;
    dni: string;
    sexo: string;
    seguroSalud: string;
    trabajoInfantil: boolean;
    mendicidad: boolean;
    vidaCalleTransito: boolean;
    vidaCalleConVivienda: boolean;
    cumplioFases: boolean;
    mayoriaEdad: boolean;
    derivacionServicios: boolean;
    modalidadRetiro: string;
    interesSuperiorTrata: boolean;
    interesSuperiorDelincuencia: boolean;
    interesSuperiorOtro: string;
    noUbicado: boolean;
    noDeseaParticipar: boolean;
    noResuelveUPE: boolean;
    cuentaResolucionUPE: string;
    situacionResolucionUPE: string;
    recibeDefensaPublica: string;
    descripcionDefensa: string;
    faseAlEgreso: string;
    logros: Record<number, boolean>;
    derechosIdentidad: boolean;
    derechosSalud: boolean;
    derechosEducacion: boolean;
    derechosRecreacion: boolean;
    derechosOtros: string;
    entregaDirectorio: string;
    observacionesMayoriaEdad: string;
    institucionDerivada: string;
    observacionesDerivacion: string;
    retiInterSuperiorAcciones: string;
    accionesBusqueda: string;
    motivoNoDesea: string;
    educadorApellidoPaterno: string;
    educadorApellidoMaterno: string;
    educadorNombres: string;
    educadorDNI: string;
    educadorLugarFecha: string;
    coordinadorApellidoPaterno: string;
    coordinadorApellidoMaterno: string;
    coordinadorNombres: string;
    coordinadorDNI: string;
    coordinadorLugarFecha: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export const InformeEgresoList = ({ nna, caso }: { nna: NnaData; caso?: CasoData }) => {
    const { user: currentUser } = useAuthStore();
    const { registerDocument, uploadPhysicalDocument } = useNnaStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        datos: true, modalidad: true, observaciones: false, logros: true, defensePublica: false, firmas: false
    });
    const [currentPrintFicha, setCurrentPrintFicha] = useState<FichaFormato13 | null>(null);

    /* ── State & Lifecycle ────────────────────────────────────────── */
    const [showForm, setShowForm] = useState(false);
    const [isViewing, setIsViewing] = useState(false);
    const [informe, setInforme] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [pdfModalOpen, setPdfModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    const getInitialFicha = (): FichaFormato13 => {
        const fechaIng = caso?.fechaIngreso || caso?.fecha_ingreso || nna.fechaIngreso || '';
        const fechaIngStr = fechaIng ? fechaIng.split('T')[0] : '';

        const pCaso = caso?.perfil || '';
        const sCalle = caso?.situacionCalle || caso?.situacion_calle || '';

        const isTrabajo = pCaso === 'TRABAJO_EN_CALLE' || pCaso.includes('TRABAJO');
        const isMendicidad = pCaso === 'MENDICIDAD';
        const isCalleTransito = (pCaso === 'VIDA_EN_CALLE' || pCaso === 'VIDA_CALLE') && (sCalle.includes('TRANSITO') || sCalle === 'TRANSITO');
        const isCalleConVivienda = (pCaso === 'VIDA_EN_CALLE' || pCaso === 'VIDA_CALLE') && (sCalle.includes('VIVIENDA') || sCalle === 'CON_VIVIENDA');

        let defaultSeguro = 'NO';
        if (nna.afiliadoSis && String(nna.afiliadoSis).toUpperCase() === 'SI') {
            defaultSeguro = 'SIS';
        } else if (nna.afiliadoOtroSeguro && String(nna.afiliadoOtroSeguro).toUpperCase() === 'SI') {
            if (String(nna.detalleOtroSeguro || '').toUpperCase().includes('ESSALUD')) {
                defaultSeguro = 'ESSALUD';
            } else {
                defaultSeguro = 'OTRO';
            }
        }

        // Prefill Educador (Usuario autenticado actual)
        let edN = '';
        let edAP = '';
        let edAM = '';
        if (currentUser) {
            const words = (currentUser.nombreCompleto || currentUser.nombre || '').trim().split(/\s+/);
            if (words.length >= 3) {
                edAP = words[0];
                edAM = words[1];
                edN = words.slice(2).join(' ');
            } else if (words.length === 2) {
                edAP = words[0];
                edN = words[1];
            } else if (words.length === 1) {
                edN = words[0];
            }
        }

        return {
            fechaNacimiento: nna.fechaNacimiento || '',
            fechaIngreso: fechaIngStr,
            fechaEgreso: new Date().toISOString().split('T')[0],
            dni: nna.numeroDoc || '',
            sexo: nna.sexo || 'M',
            seguroSalud: defaultSeguro,
            trabajoInfantil: isTrabajo,
            mendicidad: isMendicidad,
            vidaCalleTransito: isCalleTransito,
            vidaCalleConVivienda: isCalleConVivienda,
            cumplioFases: false,
            mayoriaEdad: false,
            derivacionServicios: false,
            modalidadRetiro: '',
            interesSuperiorTrata: false,
            interesSuperiorDelincuencia: false,
            interesSuperiorOtro: '',
            noUbicado: false,
            noDeseaParticipar: false,
            noResuelveUPE: false,
            cuentaResolucionUPE: '',
            situacionResolucionUPE: '',
            recibeDefensaPublica: '',
            descripcionDefensa: '',
            faseAlEgreso: '',
            logros: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
            derechosIdentidad: false,
            derechosSalud: false,
            derechosEducacion: false,
            derechosRecreacion: false,
            derechosOtros: '',
            entregaDirectorio: '',
            observacionesMayoriaEdad: '',
            institucionDerivada: '',
            observacionesDerivacion: '',
            retiInterSuperiorAcciones: '',
            accionesBusqueda: '',
            motivoNoDesea: '',
            educadorApellidoPaterno: edAP,
            educadorApellidoMaterno: edAM,
            educadorNombres: edN,
            educadorDNI: '',
            educadorLugarFecha: currentUser?.sedeNombre ? `${currentUser.sedeNombre}, ${new Date().toLocaleDateString('es-PE')}` : '',
            coordinadorApellidoPaterno: '',
            coordinadorApellidoMaterno: '',
            coordinadorNombres: '',
            coordinadorDNI: '',
            coordinadorLugarFecha: '',
        };
    };

    const [ficha, setFicha] = useState<FichaFormato13>(getInitialFicha());

    useEffect(() => {
        const loadInforme = async () => {
            if (!caso?.id) return;
            setLoading(true);
            try {
                const data = await getInformeCierre(caso.id);
                setInforme(data);
                if (data && data.detalles) {
                    try {
                        const parsed = JSON.parse(data.detalles);
                        setFicha(parsed);
                    } catch (e) {
                        console.error('Error parsing details JSON:', e);
                    }
                }
            } catch (err) {
                // If it fails/404, set to null
                setInforme(null);
            } finally {
                setLoading(false);
            }
        };
        loadInforme();
    }, [caso?.id]);

    useEffect(() => {
        const fetchCoordinator = async () => {
            if (nna && !informe) {
                const initFicha = getInitialFicha();
                setFicha(initFicha);

                if (currentUser && currentUser.sedeId) {
                    try {
                        const res = await getUsuariosBySede(currentUser.sedeId);
                        const list = Array.isArray(res) ? res : (res.data || []);
                        const coord = list.find((u: any) => u.rol === 'COORDINADOR');
                        if (coord) {
                            const cWords = (coord.nombreCompleto || coord.nombre || '').trim().split(/\s+/);
                            let coordN = '';
                            let coordAP = '';
                            let coordAM = '';
                            if (cWords.length >= 3) {
                                coordAP = cWords[0];
                                coordAM = cWords[1];
                                coordN = cWords.slice(2).join(' ');
                            } else if (cWords.length === 2) {
                                coordAP = cWords[0];
                                coordN = cWords[1];
                            } else if (cWords.length === 1) {
                                coordN = cWords[0];
                            }
                            setFicha((prev: any) => ({
                                ...prev,
                                coordinadorNombres: coordN,
                                coordinadorApellidoPaterno: coordAP,
                                coordinadorApellidoMaterno: coordAM,
                                coordinadorLugarFecha: currentUser.sedeNombre ? `${currentUser.sedeNombre}, ${new Date().toLocaleDateString('es-PE')}` : '',
                            }));
                        }
                    } catch (e) {
                        console.error('Error fetching coordinator:', e);
                    }
                }
            }
        };
        fetchCoordinator();
    }, [nna, informe, caso, currentUser]);

    const toggle = (section: string) => setExpandedSections(p => ({ ...p, [section]: !p[section] }));
    const upF = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setFicha((p: FichaFormato13) => ({ ...p, [key]: e.target.value }));
    const upBool = (key: string, val: boolean) => setFicha((p: FichaFormato13) => ({ ...p, [key]: val }));
    const toggleLogro = (id: number) => setFicha((p: FichaFormato13) => ({ ...p, logros: { ...p.logros, [id]: !p.logros[id] } }));

    const handleSaveDraft = async () => {
        if (!caso?.id) return;
        setLoading(true);
        try {
            let motivoEgreso = 'CUMPLIMIENTO_OBJETIVOS';
            if (ficha.cumplioFases) {
                motivoEgreso = 'CUMPLIMIENTO_OBJETIVOS';
            } else if (ficha.mayoriaEdad) {
                motivoEgreso = 'MAYORIA_EDAD';
            } else if (ficha.derivacionServicios) {
                motivoEgreso = 'DERIVACION';
            } else if (ficha.modalidadRetiro === 'NO_UBICADO' || ficha.modalidadRetiro === 'NO_DESEA' || ficha.noResuelveUPE) {
                motivoEgreso = 'DESERCION';
            }

            const data = await cerrarCaso(caso.id, {
                motivoEgreso,
                fechaEgreso: ficha.fechaEgreso,
                situacionFamiliar: ficha.observacionesMayoriaEdad || '',
                situacionEducativa: ficha.faseAlEgreso || '',
                logrosAlcanzados: JSON.stringify(ficha.logros),
                recomendaciones: ficha.observacionesDerivacion || '',
                estado: 'BORRADOR',
                detalles: JSON.stringify(ficha)
            });

            setInforme(data);
            toast.success('Borrador de Ficha de Egreso guardado correctamente.');
            setShowForm(false);
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar borrador');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!caso?.id) return;
        setLoading(true);
        setIsGenerating(true);
        try {
            // Generate PDF from hidden layout
            setCurrentPrintFicha(ficha);
            await new Promise(r => setTimeout(r, 500));
            const element = document.getElementById('formato-13-hidden-print');
            if (!element) throw new Error('Elemento de impresión no encontrado');

            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            
            const pdfBlob = pdf.output('blob');
            const filename = `F13_Ficha_Egreso_${nna.nombres}_${nna.apellidoPaterno}.pdf`;
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            // Upload PDF to Case digital file
            const uploadMeta = await uploadPhysicalDocument(nna.id, pdfFile, 'FICHA DE EGRESO (FORMATO 13)');
            const archivoUrl = `${EXPEDIENTE_API_URL}/expediente/documento/${uploadMeta.filename}`;

            // Finalize in Backend
            let motivoEgreso = 'CUMPLIMIENTO_OBJETIVOS';
            if (ficha.cumplioFases) {
                motivoEgreso = 'CUMPLIMIENTO_OBJETIVOS';
            } else if (ficha.mayoriaEdad) {
                motivoEgreso = 'MAYORIA_EDAD';
            } else if (ficha.derivacionServicios) {
                motivoEgreso = 'DERIVACION';
            } else if (ficha.modalidadRetiro === 'NO_UBICADO' || ficha.modalidadRetiro === 'NO_DESEA' || ficha.noResuelveUPE) {
                motivoEgreso = 'DESERCION';
            }

            const data = await cerrarCaso(caso.id, {
                motivoEgreso,
                fechaEgreso: ficha.fechaEgreso,
                situacionFamiliar: ficha.observacionesMayoriaEdad || '',
                situacionEducativa: ficha.faseAlEgreso || '',
                logrosAlcanzados: JSON.stringify(ficha.logros),
                recomendaciones: ficha.observacionesDerivacion || '',
                archivoUrl,
                estado: 'FINALIZADO',
                detalles: JSON.stringify(ficha)
            });

            setInforme(data);
            toast.success('Ficha de Egreso finalizada y registrada correctamente.');
            window.location.reload();
        } catch (e) {
            console.error(e);
            toast.error('Error al finalizar el egreso');
        } finally {
            setLoading(false);
            setIsGenerating(false);
            setCurrentPrintFicha(null);
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            setCurrentPrintFicha(ficha);
            await new Promise(r => setTimeout(r, 500));
            const element = document.getElementById('formato-13-hidden-print');
            if (!element) return;

            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            pdf.addImage(imgData, 'PNG', 0, 0, w, (canvas.height * w) / canvas.width);
            pdf.save(`F13_Ficha_Egreso_${nna.nombres}_${nna.apellidoPaterno}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error('Error al generar PDF');
        } finally {
            setIsGenerating(false);
            setCurrentPrintFicha(null);
        }
    };

    const handlePreviewPDF = () => {
        setPdfModalOpen(true);
    };

    /* ── Render: List View ────────────────────────────────────────── */
    if (!showForm) {
        if (loading) {
            return (
                <div className="bg-surface border border-border rounded-[8px] p-8 flex items-center justify-center">
                    <span className="text-[13px] text-fg-2 font-medium">Cargando información del egreso...</span>
                </div>
            );
        }

        if (informe === null) {
            return (
                <div className="bg-surface border border-border rounded-[8px] p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                        <Plus size={24} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-[15px] font-semibold text-fg">No hay Ficha de Egreso registrada</h4>
                        <p className="text-[12px] text-fg-muted max-w-sm">
                            Este caso aún no cuenta con un proceso de egreso o retiro registrado en el sistema. Registre uno para proceder con el cierre del caso.
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                        className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                        Registrar Egreso (F13)
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-surface border border-border rounded-[8px] shadow-1 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                        <h4 className="text-[14px] font-semibold text-fg">Historial de Ficha de Egreso</h4>
                        <p className="text-[12px] text-fg-muted mt-0.5">Detalles del informe de cierre del NNA</p>
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-[13px] border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-muted text-fg-muted text-[11px] font-semibold uppercase tracking-wider">
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Fecha de Egreso</th>
                                <th className="px-4 py-3">Motivo</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-border hover:bg-surface-muted/50">
                                <td className="px-4 py-3 font-semibold text-fg">{informe.codigoInforme || 'Borrador'}</td>
                                <td className="px-4 py-3 text-fg-2">{informe.fechaEgreso ? informe.fechaEgreso.split('T')[0] : 'No registrada'}</td>
                                <td className="px-4 py-3 text-fg-2 font-medium">{informe.motivoEgreso || 'No registrado'}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[12px] text-[11px] font-semibold ${
                                        informe.estado === 'FINALIZADO'
                                            ? 'bg-success-soft text-success'
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {informe.estado || 'BORRADOR'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {informe.estado === 'BORRADOR' ? (
                                            <button
                                                onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-[4px] transition-colors"
                                                title="Editar Borrador"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => { setShowForm(true); setIsViewing(true); setCurrentStep(1); }}
                                                    className="p-1.5 text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                    title="Ver Detalles"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={handlePreviewPDF}
                                                    className="p-1.5 text-info hover:bg-info-soft rounded-[4px] transition-colors"
                                                    title="Vista Previa PDF"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button
                                                    onClick={handleDownloadPDF}
                                                    className="p-1.5 text-success hover:bg-success-soft rounded-[4px] transition-colors"
                                                    title="Descargar PDF"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Vista Móvil */}
                <div className="md:hidden border border-border rounded-xl p-4 space-y-3 bg-surface">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-primary text-sm">{informe.codigoInforme || 'Borrador'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${informe.estado === 'FINALIZADO' ? 'bg-success-soft text-success' : 'bg-amber-100 text-amber-700'}`}>
                            {informe.estado || 'BORRADOR'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-fg-muted block text-[10px] uppercase font-bold">Fecha de Egreso</span>
                            <span className="text-fg-2 font-medium">{informe.fechaEgreso ? informe.fechaEgreso.split('T')[0] : 'No registrada'}</span>
                        </div>
                        <div>
                            <span className="text-fg-muted block text-[10px] uppercase font-bold">Motivo</span>
                            <span className="text-fg-2 font-medium">{informe.motivoEgreso || 'No registrado'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        {informe.estado === 'BORRADOR' ? (
                            <button
                                onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                                className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-500 text-white py-1.5 rounded-lg text-xs font-bold"
                            >
                                <Edit size={14} /> Editar Borrador
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => { setShowForm(true); setIsViewing(true); setCurrentStep(1); }}
                                    className="flex-1 inline-flex items-center justify-center gap-1 bg-primary-soft text-primary py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <Eye size={14} /> Ver
                                </button>
                                <button
                                    onClick={handlePreviewPDF}
                                    className="flex-1 inline-flex items-center justify-center gap-1 bg-info-soft text-info py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <FileText size={14} /> Vista PDF
                                </button>
                                <button
                                    onClick={handleDownloadPDF}
                                    className="flex-1 inline-flex items-center justify-center gap-1 bg-success text-white py-1.5 rounded-lg text-xs font-bold"
                                >
                                    <Download size={14} /> PDF
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <PdfViewerModal
                    isOpen={pdfModalOpen}
                    onClose={() => setPdfModalOpen(false)}
                    nnaId={nna.id}
                    nnaName={`${nna.nombres} ${nna.apellidoPaterno}`}
                    pdfUrl={informe?.archivoUrl}
                    title="Ficha de Egreso (Formato 13)"
                />

                {/* Hidden Print */}
                {currentPrintFicha && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato13Print id="formato-13-hidden-print" nna={nna} ficha={currentPrintFicha} />
                    </div>
                )}
            </div>
        );
    }

    /* ── Render: Form View ────────────────────────────────────────── */
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="bg-surface border border-border rounded-[8px] shadow-1 px-5 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">
                        {isViewing ? 'Ver Ficha de Egreso / Retiro' : 'Registrar Ficha de Egreso / Retiro'}
                    </h3>
                    <p className="text-[12px] text-fg-2 mt-0.5">
                        Formato 13 · {nna.nombres} {nna.apellidoPaterno}
                    </p>
                </div>
                {isViewing && (
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 bg-success text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        <Printer size={15} />
                        {isGenerating ? 'Generando…' : 'Imprimir PDF'}
                    </button>
                )}
            </div>

            {/* Stepper Progress Bar */}
            <div className="flex justify-between items-center bg-surface p-4 rounded-[8px] border border-border shadow-sm">
                {[1, 2, 3].map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setCurrentStep(s)}
                        className="flex-1 flex items-center focus:outline-none text-left cursor-pointer"
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                            currentStep === s 
                                ? 'bg-primary text-primary-fg shadow-sm ring-4 ring-primary/20' 
                                : currentStep > s 
                                ? 'bg-success text-white' 
                                : 'bg-surface-muted text-fg-muted border border-border-strong'
                        }`}>
                            {currentStep > s ? '✓' : s}
                        </div>
                        <span className={`ml-2 text-xs font-semibold hidden md:inline transition-colors ${currentStep === s ? 'text-primary' : 'text-fg-muted hover:text-fg'}`}>
                            {s === 1 && "Datos Generales"}
                            {s === 2 && "Modalidad Egreso"}
                            {s === 3 && "Logros, Firmas y Cierre"}
                        </span>
                        {s < 3 && <div className="flex-1 h-0.5 mx-4 bg-border" />}
                    </button>
                ))}
            </div>

            {/* ── Step 1: Datos Generales ───────────────────────────────── */}
            {currentStep === 1 && (
                <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                    <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                        <User size={16} className="text-success" />
                        <h3 className="font-semibold text-[13px] text-fg">Datos Generales del NNA</h3>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={LBL}>Apellidos y Nombres</label>
                                <input className={INP_DISABLED} value={`${nna.apellidoPaterno} ${nna.apellidoMaterno || ''} ${nna.nombres}`} disabled />
                            </div>
                            <div>
                                <label className={LBL}>Fecha de Nacimiento</label>
                                <input type="date" className={INP_DISABLED} value={ficha.fechaNacimiento?.split('T')[0] || ''} disabled />
                            </div>
                            <div>
                                <label className={LBL}>DNI</label>
                                <input className={INP_DISABLED} value={ficha.dni} disabled />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={LBL}>Sexo</label>
                                <div className="flex gap-4 mt-1">
                                    <label className="flex items-center gap-1.5 text-[13px] text-fg-2">
                                        <input type="radio" checked={['M', 'HOMBRE', '1', 'MASCULINO'].includes(String(ficha.sexo).toUpperCase())} disabled /> Hombre
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[13px] text-fg-2">
                                        <input type="radio" checked={['F', 'MUJER', '2', 'FEMENINO'].includes(String(ficha.sexo).toUpperCase())} disabled /> Mujer
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className={LBL}>Seguro de Salud</label>
                                <select className={getSelectClass(isViewing)} value={ficha.seguroSalud} onChange={upF('seguroSalud')} disabled={isViewing}>
                                    {['NO','SIS','ESSALUD','OTRO'].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                            <label className={LBL + ' mb-2'}>Perfil del Usuario/a</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    { key: 'trabajoInfantil', label: 'Trabajo Infantil' },
                                    { key: 'mendicidad', label: 'Mendicidad' },
                                    { key: 'vidaCalleTransito', label: 'Vida en calle — Tránsito' },
                                    { key: 'vidaCalleConVivienda', label: 'Vida en calle — Con vivienda' },
                                ].map(opt => (
                                    <CheckCard key={opt.key} label={opt.label} checked={ficha[opt.key]} onChange={v => upBool(opt.key, v)} disabled={isViewing} />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                            <div>
                                <label className={LBL}>Fecha Ingreso al Servicio</label>
                                <input type="date" className={INP_DISABLED} value={ficha.fechaIngreso?.split('T')[0] || ''} disabled />
                            </div>
                            <div>
                                <label className={LBL}>Fecha Egreso del Servicio</label>
                                <input type="date" className={getInputClass(isViewing)} value={ficha.fechaEgreso} onChange={upF('fechaEgreso')} disabled={isViewing} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 2: Modalidad de Egreso ────────────────────────────── */}
            {currentStep === 2 && (
                <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                    <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                        <AlertTriangle size={16} className="text-success" />
                        <h3 className="font-semibold text-[13px] text-fg">Modalidad de Egreso</h3>
                    </div>
                    <div className="p-5 space-y-3">
                        {/* Cumplió fases */}
                        <CheckCard label="Cumplió Fases (Culminación Exitosa)" checked={ficha.cumplioFases} onChange={v => upBool('cumplioFases', v)} disabled={isViewing} />

                        {/* Mayoría de Edad */}
                        <div className={`rounded-[8px] border transition-all ${ficha.mayoriaEdad ? 'bg-info-soft border-info/20 p-4' : 'border-border p-3'}`}>
                            <CheckCard label="Mayoría de Edad" checked={ficha.mayoriaEdad} onChange={v => upBool('mayoriaEdad', v)} disabled={isViewing} />
                            {ficha.mayoriaEdad && (
                                <div className="ml-6 mt-3 space-y-3">
                                    <div>
                                        <label className={LBL + ' mb-2'}>Derechos Restituidos</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {['derechosIdentidad','derechosSalud','derechosEducacion','derechosRecreacion'].map((k, i) => (
                                                <CheckCard key={k} label={['Identidad','Salud','Educación','Recreación'][i]} checked={ficha[k]} onChange={v => upBool(k, v)} disabled={isViewing} />
                                            ))}
                                        </div>
                                        <input className={getInputClass(isViewing)} placeholder="Otros derechos…" value={ficha.derechosOtros} onChange={upF('derechosOtros')} disabled={isViewing} />
                                    </div>
                                    <div>
                                        <label className={LBL}>Observaciones Generales</label>
                                        <textarea className={getTextareaClass(isViewing)} rows={2} value={ficha.observacionesMayoriaEdad || ''} onChange={upF('observacionesMayoriaEdad')} disabled={isViewing} />
                                    </div>
                                    <div>
                                        <label className={LBL}>Se Entrega Directorio de Instituciones</label>
                                        <select className={getSelectClass(isViewing)} value={ficha.entregaDirectorio} onChange={upF('entregaDirectorio')} disabled={isViewing}>
                                            <option value="">Seleccionar…</option>
                                            <option value="SI">SÍ</option><option value="NO">NO</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Intervención Integral */}
                        <div className={`rounded-[8px] border transition-all ${ficha.modalidadRetiro === 'RET_INTEGRAL' ? 'bg-success-soft/30 border-success/20 p-4' : 'border-border p-3'}`}>
                            <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-fg-2 font-medium">
                                <input type="radio" name="modalidadRetiro" checked={ficha.modalidadRetiro === 'RET_INTEGRAL'} onChange={() => !isViewing && setFicha(p => ({ ...p, modalidadRetiro: 'RET_INTEGRAL' }))} disabled={isViewing} />
                                Retiro por Intervención Integral
                            </label>
                            {ficha.modalidadRetiro === 'RET_INTEGRAL' && (
                                <div className="ml-6 mt-3 space-y-3">
                                    <CheckCard label="Medida de Protección de Acogimiento Familiar" checked={ficha.interesSuperiorTrata} onChange={v => upBool('interesSuperiorTrata', v)} disabled={isViewing} />
                                    <CheckCard label="Medida de Protección de Acogimiento Residencial" checked={ficha.interesSuperiorDelincuencia} onChange={v => upBool('interesSuperiorDelincuencia', v)} disabled={isViewing} />
                                    <input className={getInputClass(isViewing)} placeholder="Otros motivos de interés superior…" value={ficha.interesSuperiorOtro} onChange={upF('interesSuperiorOtro')} disabled={isViewing} />
                                    <div>
                                        <label className={LBL}>Acciones Realizadas</label>
                                        <textarea className={getTextareaClass(isViewing)} rows={2} value={ficha.retiInterSuperiorAcciones} onChange={upF('retiInterSuperiorAcciones')} disabled={isViewing} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Retiro Desestimado */}
                        <div className={`rounded-[8px] border transition-all ${ficha.modalidadRetiro === 'RET_DESESTIMADO' ? 'bg-amber-50/50 border-amber-200 p-4' : 'border-border p-3'}`}>
                            <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-fg-2 font-medium">
                                <input type="radio" name="modalidadRetiro" checked={ficha.modalidadRetiro === 'RET_DESESTIMADO'} onChange={() => !isViewing && setFicha(p => ({ ...p, modalidadRetiro: 'RET_DESESTIMADO' }))} disabled={isViewing} />
                                Retiro Desestimado (Pérdida de Contacto / Rechazo / UPE)
                            </label>
                            {ficha.modalidadRetiro === 'RET_DESESTIMADO' && (
                                <div className="ml-6 mt-3 space-y-3">
                                    <CheckCard label="No Ubicado (Pérdida de Contacto)" checked={ficha.noUbicado} onChange={v => upBool('noUbicado', v)} disabled={isViewing} />
                                    {ficha.noUbicado && (
                                        <div>
                                            <label className={LBL}>Acciones de Búsqueda y Coordinación</label>
                                            <textarea className={getTextareaClass(isViewing)} rows={2} value={ficha.accionesBusqueda} onChange={upF('accionesBusqueda')} disabled={isViewing} />
                                        </div>
                                    )}
                                    <CheckCard label="No Desea Participar" checked={ficha.noDeseaParticipar} onChange={v => upBool('noDeseaParticipar', v)} disabled={isViewing} />
                                    {ficha.noDeseaParticipar && (
                                        <div>
                                            <label className={LBL}>Motivo Manifestado / Dificultades</label>
                                            <textarea className={getTextareaClass(isViewing)} rows={2} value={ficha.motivoNoDesea} onChange={upF('motivoNoDesea')} disabled={isViewing} />
                                        </div>
                                    )}
                                    <CheckCard label="No Resuelve UPE" checked={ficha.noResuelveUPE} onChange={v => upBool('noResuelveUPE', v)} disabled={isViewing} />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                            <div>
                                <label className={LBL}>Cuenta con Resolución UPE</label>
                                <select className={getSelectClass(isViewing)} value={ficha.cuentaResolucionUPE} onChange={upF('cuentaResolucionUPE')} disabled={isViewing}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                            <div>
                                <label className={LBL}>Situación Resolución UPE</label>
                                <select className={getSelectClass(isViewing)} value={ficha.situacionResolucionUPE} onChange={upF('situacionResolucionUPE')} disabled={isViewing}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 3: Logros, Firmas y Cierre ────────────────────────────────── */}
            {currentStep === 3 && (
                <div className="space-y-3">
                    <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                        <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                            <FileText size={16} className="text-success" />
                            <h3 className="font-semibold text-[13px] text-fg">Defensa Pública y Fase del Servicio</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={LBL}>Recibe Servicio de Defensa Pública</label>
                                    <select className={getSelectClass(isViewing)} value={ficha.recibeDefensaPublica} onChange={upF('recibeDefensaPublica')} disabled={isViewing}>
                                        <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LBL}>Fase al Momento del Egreso</label>
                                    <select className={getSelectClass(isViewing)} value={ficha.faseAlEgreso} onChange={upF('faseAlEgreso')} disabled={isViewing}>
                                        <option value="">Seleccionar…</option>
                                        <option value="FASE I">FASE I</option><option value="FASE II">FASE II</option><option value="FASE III">FASE III</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={LBL}>Descripción (Defensa Pública)</label>
                                <textarea className={getTextareaClass(isViewing)} rows={3} value={ficha.descripcionDefensa} onChange={upF('descripcionDefensa')} placeholder="Detalles del servicio de defensa pública…" disabled={isViewing} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                        <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-success" />
                            <h3 className="font-semibold text-[13px] text-fg">Logros Cumplidos</h3>
                        </div>
                        <div className="p-5 space-y-2">
                            {[
                                { id: 1, text: 'Niñas, niños y adolescentes dejan la situación de calle, ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación, entre otros)' },
                                { id: 2, text: 'Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida' },
                                { id: 3, text: 'Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos' },
                                { id: 4, text: 'Persona adulta responsable presenta capacidades para garantizar la protección integral de las niñas, niños y adolescentes usuarios/as del servicio' },
                                { id: 5, text: 'Las/os NNA presentan y desarrollan sus proyectos de vida con el cumplimiento de algunas de sus metas según su temporalidad' },
                                { id: 6, text: 'Padres, madres o tutor cuenta con herramientas para asumir el cuidado de sus hijos' },
                            ].map(logro => (
                                <label
                                    key={logro.id}
                                    className={`flex gap-3 items-start px-3 py-2.5 rounded-[6px] border cursor-pointer transition-all ${
                                        ficha.logros[logro.id]
                                            ? 'border-success bg-success-soft text-success'
                                            : 'border-border hover:border-success hover:bg-success-soft/30 text-fg-2'
                                    } ${isViewing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 flex-shrink-0"
                                        checked={ficha.logros[logro.id]}
                                        onChange={() => !isViewing && toggleLogro(logro.id)}
                                        disabled={isViewing}
                                    />
                                    <div className="text-[13px]">
                                        <span className="font-bold mr-1.5">
                                            Logro {logro.id}:
                                        </span>
                                        <span>{logro.text}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                        <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                            <FileText size={16} className="text-success" />
                            <h3 className="font-semibold text-[13px] text-fg">Datos del Educador/a y Coordinador/a</h3>
                        </div>
                        <div className="p-5 space-y-4">
                            {[
                                { prefix: 'educador', label: 'Educador/a Responsable', colorCls: 'bg-info-soft border-info/20', titleCls: 'text-info' },
                                { prefix: 'coordinador', label: 'Coordinador/a', colorCls: 'bg-primary-soft border-primary/20', titleCls: 'text-primary' },
                            ].map(({ prefix, label, colorCls, titleCls }) => (
                                <div key={prefix} className={`p-4 rounded-[8px] border ${colorCls}`}>
                                    <h4 className={`font-bold text-[13px] uppercase mb-3 ${titleCls}`}>{label}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {['ApellidoPaterno','ApellidoMaterno','Nombres'].map(f => (
                                            <div key={f}>
                                                <label className={LBL}>{f.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                <input className={getInputClass(isViewing)} value={ficha[`${prefix}${f}`] || ''} onChange={upF(`${prefix}${f}`)} disabled={isViewing} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <label className={LBL}>DNI</label>
                                            <input className={getInputClass(isViewing)} maxLength={8} value={ficha[`${prefix}DNI`] || ''} onChange={upF(`${prefix}DNI`)} disabled={isViewing} />
                                        </div>
                                        <div>
                                            <label className={LBL}>Lugar / Fecha</label>
                                            <input className={getInputClass(isViewing)} placeholder="Lima, 09/02/2026" value={ficha[`${prefix}LugarFecha`] || ''} onChange={upF(`${prefix}LugarFecha`)} disabled={isViewing} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Form Actions ──────────────────────────────────────── */}
            <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t border-border bg-surface px-5 py-4 rounded-[8px] border border-border">
                {/* Left Side Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 border border-border rounded-[6px] text-[13px] font-medium text-fg hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                        {isViewing ? 'Volver' : 'Cancelar'}
                    </button>
                    {!isViewing && (
                        <button
                            onClick={handleSaveDraft}
                            disabled={loading || isGenerating}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[6px] text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Guardar Borrador
                        </button>
                    )}
                </div>

                {/* Right Side Navigation Actions */}
                <div className="flex gap-2">
                    {currentStep > 1 && (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(prev => prev - 1)}
                            className="px-4 py-2 border border-border rounded-[6px] text-[13px] font-medium text-fg hover:bg-surface-muted transition-colors cursor-pointer"
                        >
                            Anterior
                        </button>
                    )}
                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            className="px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium hover:bg-primary/95 transition-colors cursor-pointer"
                        >
                            Siguiente
                        </button>
                    ) : (
                        !isViewing && (
                            <button
                                onClick={handleFinalize}
                                disabled={loading || isGenerating}
                                className="px-4 py-2 bg-success hover:bg-success/90 text-white rounded-[6px] text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {isGenerating ? 'Generando PDF...' : 'Finalizar Egreso'}
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Hidden Print */}
            {currentPrintFicha && (
                <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                    <Formato13Print id="formato-13-hidden-print" nna={nna} ficha={currentPrintFicha} />
                </div>
            )}
        </div>
    );
};
