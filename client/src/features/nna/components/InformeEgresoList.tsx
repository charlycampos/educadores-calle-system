import { useState, useEffect } from 'react';
import { toast } from '../../../components/ui/Toast';
import { CampoDictado } from '../../../components/ui/CampoDictado';
import { PanelFirmas } from '../../../components/ui/PanelFirmas';
import { firmarComoEducador } from '../../../api/cierre.api';
import { AlertTriangle, FileSignature, Lock, Printer, ChevronDown, ChevronUp, User, FileText, Plus, Edit, Eye, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Formato13Print } from './Formato13Print';
import { useNnaStore } from '../../../store/nna.store';
import { cerrarCaso, getInformeCierre } from '../../../api/casos.api';
import { EXPEDIENTE_API_URL } from '../../../config/api';
import { PdfViewerModal } from './PdfViewerModal';
import { useAuthStore } from '../../../store/auth.store';
import { getUsuariosBySede } from '../../../api/sedes.api';
import { normalizarFase } from '../../../utils/fases';

/* ── Clases helper para inputs/selects ─────────────────────────────── */
const INP = 'w-full px-3 py-2 border border-border-strong rounded-[6px] text-[13px] bg-surface text-fg outline-none focus:border-primary transition-colors';
const SEL = INP + ' appearance-none';
const TA  = INP + ' resize-vertical min-h-[60px]';
const INP_DISABLED = 'w-full px-3 py-2 border border-border rounded-[6px] text-[13px] bg-surface-muted text-fg-muted outline-none cursor-not-allowed';
const LBL = 'block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1';

const getInputClass = (disabled?: boolean) => disabled ? INP_DISABLED : INP;
const getSelectClass = (disabled?: boolean) => disabled ? INP_DISABLED : SEL;
const getTextareaClass = (disabled?: boolean) => disabled ? INP_DISABLED + ' resize-none' : TA;

/**
 * Las seis causas de salida del formato, en sus dos grupos.
 *
 * Un caso **o** egresa **o** se retira: nunca las dos cosas. Dentro de un mismo
 * grupo sí pueden concurrir varias (se puede cumplir fases y además llegar a la
 * mayoría de edad), por eso el bloqueo es de grupo y no de casilla.
 */
/**
 * Estados de la ficha en el circuito de firma.
 *
 * `FINALIZADO` es el estado con el que nacía la ficha antes de que existieran
 * las firmas: significa completa pero todavía sin firmar.
 */
const ESTADO_ETIQUETA: Record<string, string> = {
    BORRADOR:         'Borrador',
    FINALIZADO:       'Sin firmar',
    PEND_COORDINADOR: 'Esperando al coordinador',
    OBSERVADO:        'Observada',
    FIRMADO:          'Firmada',
};

const ESTADO_ESTILO: Record<string, string> = {
    BORRADOR:         'bg-amber-100 text-amber-700',
    FINALIZADO:       'bg-info-soft text-info',
    PEND_COORDINADOR: 'bg-warning-soft text-warning',
    OBSERVADO:        'bg-danger-soft text-danger',
    FIRMADO:          'bg-success-soft text-success',
};

/**
 * Estados en los que la ficha se puede modificar.
 *
 * OBSERVADO entra porque el coordinador la devolvió justamente para que se
 * corrija. Mientras espera su firma —PEND_COORDINADOR— queda bloqueada: nadie
 * cambia un documento que otro está revisando. Y una vez FIRMADO, se cierra.
 */
const EDITABLES = ['BORRADOR', 'OBSERVADO'];

/** Quien firma es quien tiene la sesión abierta; no se escribe a mano. */
const educadorDeLaSesion = () => {
    const u = useAuthStore.getState().user;
    return u?.nombreCompleto || u?.nombre || '';
};

const MODALIDADES_EGRESO = ['cumplioFases', 'mayoriaEdad', 'derivacionServicios'] as const;
const MODALIDADES_RETIRO = ['interesSuperior', 'noUbicado', 'noDeseaParticipar'] as const;

/** Lo que se borra cuando una modalidad deja de estar marcada. */
const DEPENDIENTES_MODALIDAD: Record<string, Record<string, any>> = {
    cumplioFases: { logros: {}, observacionesLogros: '' },
    mayoriaEdad: {
        derechosIdentidad: false, derechosSalud: false, derechosEducacion: false,
        derechosRecreacion: false, derechosOtros: '', entregaDirectorio: '',
        observacionesMayoriaEdad: '',
    },
    derivacionServicios: { institucionDerivada: '', observacionesDerivacion: '' },
    interesSuperior: {
        interesSuperiorTrata: false, interesSuperiorDelincuencia: false,
        interesSuperiorOtro: '', retiInterSuperiorAcciones: '',
    },
    noUbicado: { accionesBusqueda: '' },
    noDeseaParticipar: { motivoNoDesea: '' },
};

/** Los seis logros del Formato 13, en el orden y con el texto del oficial. */
const LOGROS_F13 = [
    { id: 1, text: 'Niñas, niños y adolescentes dejan la situación de calle, ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación, entre otros)' },
    { id: 2, text: 'Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida' },
    { id: 3, text: 'Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos' },
    { id: 4, text: 'Persona adulta responsable presenta capacidades para garantizar la protección integral de las niñas, niños y adolescentes usuarias/os del servicio' },
    { id: 5, text: 'Las/os NNA presentan y desarrollan sus proyectos de vida con el cumplimiento de algunas de sus metas según su temporalidad' },
    { id: 6, text: 'Padres, madres o tutor cuenta con herramientas para asumir el cuidado de sus hijos' },
];

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
// Un solo fondo por estado: dos clases bg-* en el mismo className las resuelve
// el orden de la hoja de estilos, no el del string, y la casilla marcada
// terminaba con el fondo de "deshabilitada".
const CheckCard = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void, disabled?: boolean }) => (
    <label className={`flex items-center gap-2.5 px-3 py-2 rounded-[6px] border transition-all text-[13px] ${
        disabled
            ? (checked
                ? 'border-primary bg-primary-soft text-primary cursor-not-allowed'
                : 'border-border bg-surface-muted text-fg-muted cursor-not-allowed')
            : (checked
                ? 'border-primary bg-primary-soft text-primary cursor-pointer'
                : 'border-border text-fg-2 hover:border-primary cursor-pointer')
    }`}>
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
    /** Fase vigente del caso: 'I' | 'II' | 'III' | 'EGRESADO'. */
    fase?: string;
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
    /** Primera opción de MODALIDAD DE RETIRO en el formato oficial. */
    interesSuperior: boolean;
    interesSuperiorTrata: boolean;
    interesSuperiorDelincuencia: boolean;
    interesSuperiorOtro: string;
    noUbicado: boolean;
    noDeseaParticipar: boolean;
    cuentaResolucionUPE: string;
    situacionResolucionUPE: string;
    recibeDefensaPublica: string;
    descripcionDefensa: string;
    faseAlEgreso: string;
    /**
     * Fase en que se cumplió cada logro: 'FASE I' | 'FASE II' | 'FASE III'.
     * `boolean` se conserva porque las fichas guardadas antes marcaban sí/no.
     */
    logros: Record<number, string | boolean>;
    /** Observaciones de la tabla de logros cumplidos. */
    observacionesLogros: string;
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
    /** Panel de firma del educador abierto. */
    const [firmando, setFirmando] = useState(false);

    /**
     * Las firmas y la observación del coordinador viajan dentro de `detalles`,
     * el mismo JSON donde vive el formulario: son datos de la ficha.
     */
    const detallesGuardados = (() => {
        try {
            return informe?.detalles ? JSON.parse(informe.detalles) : {};
        } catch {
            return {};
        }
    })();
    const observacionCoordinador = detallesGuardados.observacionCoordinador;
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
            interesSuperior: false,
            interesSuperiorTrata: false,
            interesSuperiorDelincuencia: false,
            interesSuperiorOtro: '',
            noUbicado: false,
            noDeseaParticipar: false,
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
            observacionesLogros: '',
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
                        // La fase al egreso se guardó un tiempo en
                        // `situacionEducativa`, un campo que semánticamente es
                        // otra cosa. Se lee de ahí solo si falta en `detalles`,
                        // para que los informes antiguos no pierdan el dato.
                        if (!parsed.faseAlEgreso && data.situacionEducativa) {
                            parsed.faseAlEgreso = data.situacionEducativa;
                        }
                        // Se mezcla con los valores por omisión: una ficha
                        // guardada antes de que existiera un campo lo dejaba
                        // `undefined`, y con `logros` eso rompía el render y
                        // la pantalla quedaba en blanco.
                        setFicha({ ...getInitialFicha(), ...parsed });
                    } catch (e) {
                        console.error('Error parsing details JSON:', e);
                    }
                } else if (caso?.fase && caso.fase !== 'EGRESADO') {
                    // Ficha nueva: se propone la fase en la que el caso está
                    // ahora mismo, según el Resumen del Caso. Queda editable
                    // porque el F13 registra un hecho puntual —en qué fase
                    // estaba al egresar— y hay egresos excepcionales que
                    // ocurren antes de terminar el recorrido.
                    setFicha((p: FichaFormato13) => ({
                        ...p,
                        faseAlEgreso: `FASE ${normalizarFase(caso.fase)}`,
                    }));
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
                        // Si mientras se pedía la lista terminó de cargar una
                        // ficha guardada, no se pisa: este prellenado es solo
                        // para fichas nuevas.
                        if (coord && !informe) {
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

    /** Igual que `upF`, pero recibe el valor ya listo (lo usan los campos con formato). */
    const setCampo = (key: string, valor: string) =>
        setFicha((p: FichaFormato13) => ({ ...p, [key]: valor }));
    /**
     * Marca o desmarca una modalidad.
     *
     * Al desmarcarla se borra lo que se hubiera escrito en sus campos: si no, la
     * ficha se guardaba con datos huérfanos —una institución derivada en un caso
     * de "no ubicado"— y el motivo de egreso terminaba deduciéndose del campo
     * equivocado.
     *
     * El bloqueo del otro grupo no se hace aquí sino en la propia casilla
     * (`disabled`): así el educador ve por qué no puede marcarla, en vez de que
     * el sistema le apague en silencio lo que ya había llenado.
     */
    const marcarModalidad = (campo: string, valor: boolean) =>
        setFicha((p: FichaFormato13) => {
            const next: any = { ...p, [campo]: valor };
            if (!valor) Object.assign(next, DEPENDIENTES_MODALIDAD[campo]);
            return next as FichaFormato13;
        });

    /** ¿Ya se marcó algo en cada grupo? Lo que bloquea al grupo contrario. */
    const hayEgreso = MODALIDADES_EGRESO.some(m => (ficha as any)[m]);
    const hayRetiro = MODALIDADES_RETIRO.some(m => (ficha as any)[m]);

    /**
     * Cada logro se marca con una sola casilla: cumplido o no.
     *
     * La fase del servicio **no** se pregunta por logro — es un dato único del
     * NNA (`faseAlEgreso`) que va arriba, junto a defensa pública, tal como en
     * el formato oficial.
     */
    const marcarLogro = (id: number) =>
        setFicha((p: FichaFormato13) => ({
            ...p,
            logros: { ...p.logros, [id]: !logroCumplido(p.logros[id]) },
        }));

    /**
     * Hubo una versión intermedia que guardaba la fase ('FASE II') en vez de un
     * booleano. Cualquier valor con contenido significa que el logro se marcó,
     * así que esas fichas se siguen viendo bien.
     */
    const logroCumplido = (valor: any): boolean =>
        valor === true || (typeof valor === 'string' && valor.trim() !== '');

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
            } else if (ficha.interesSuperior) {
                motivoEgreso = 'INTERES_SUPERIOR';
            } else if (ficha.noUbicado || ficha.noDeseaParticipar) {
                // Antes se comparaba modalidadRetiro contra 'NO_UBICADO', valor
                // que la pantalla nunca llegaba a guardar: un NNA perdido se
                // cerraba como 'CUMPLIMIENTO_OBJETIVOS', el valor por defecto.
                motivoEgreso = 'DESERCION';
            }

            const data = await cerrarCaso(caso.id, {
                motivoEgreso,
                fechaEgreso: ficha.fechaEgreso,
                // Estos textos ya no van a columnas que no les corresponden:
                // `observacionesMayoriaEdad` iba a SITUACION_FAMILIAR, que es
                // VARCHAR2(100), y con el dictado —que emite HTML— reventaba
                // con ORA-12899 mostrando solo "Error al guardar borrador".
                // El dato completo viaja en `detalles`, que es un CLOB.
                situacionFamiliar: '',
                // La fase al egreso viaja en `detalles`, junto al resto de la
                // ficha. Dejó de escribirse aquí: `situacionEducativa` es la
                // situación educativa del NNA, no su fase, y guardarla ahí
                // hacía que dos datos distintos compitieran por una columna.
                situacionEducativa: '',
                logrosAlcanzados: JSON.stringify(ficha.logros),
                recomendaciones: '',
                estado: 'BORRADOR',
                detalles: JSON.stringify(ficha)
            });

            setInforme(data);
            toast.success('Borrador de Ficha de Egreso – Retiro guardado correctamente.');
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
            } else if (ficha.interesSuperior) {
                motivoEgreso = 'INTERES_SUPERIOR';
            } else if (ficha.noUbicado || ficha.noDeseaParticipar) {
                // Antes se comparaba modalidadRetiro contra 'NO_UBICADO', valor
                // que la pantalla nunca llegaba a guardar: un NNA perdido se
                // cerraba como 'CUMPLIMIENTO_OBJETIVOS', el valor por defecto.
                motivoEgreso = 'DESERCION';
            }

            const data = await cerrarCaso(caso.id, {
                motivoEgreso,
                fechaEgreso: ficha.fechaEgreso,
                // Estos textos ya no van a columnas que no les corresponden:
                // `observacionesMayoriaEdad` iba a SITUACION_FAMILIAR, que es
                // VARCHAR2(100), y con el dictado —que emite HTML— reventaba
                // con ORA-12899 mostrando solo "Error al guardar borrador".
                // El dato completo viaja en `detalles`, que es un CLOB.
                situacionFamiliar: '',
                // La fase al egreso viaja en `detalles`, junto al resto de la
                // ficha. Dejó de escribirse aquí: `situacionEducativa` es la
                // situación educativa del NNA, no su fase, y guardarla ahí
                // hacía que dos datos distintos compitieran por una columna.
                situacionEducativa: '',
                logrosAlcanzados: JSON.stringify(ficha.logros),
                recomendaciones: '',
                archivoUrl,
                estado: 'FINALIZADO',
                detalles: JSON.stringify(ficha)
            });

            setInforme(data);
            toast.success('Ficha de Egreso – Retiro finalizada y registrada correctamente.');
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
                        <h4 className="text-[15px] font-semibold text-fg">No hay Ficha de Egreso – Retiro registrada</h4>
                        <p className="text-[12px] text-fg-muted max-w-sm">
                            Este caso aún no cuenta con un proceso de egreso o retiro registrado en el sistema. Registre uno para proceder con el cierre del caso.
                        </p>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                        className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                        Registrar Egreso – Retiro (F13)
                    </button>
                </div>
            );
        }

        return (
            <div className="bg-surface border border-border rounded-[8px] shadow-1 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                        <h4 className="text-[14px] font-semibold text-fg">Historial de Ficha de Egreso – Retiro</h4>
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
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[12px] text-[11px] font-semibold ${ESTADO_ESTILO[informe.estado] || 'bg-amber-100 text-amber-700'}`}>
                                        {ESTADO_ETIQUETA[informe.estado] || informe.estado || 'BORRADOR'}
                                    </span>
                                    {/* La observación del coordinador se muestra aquí
                                        mismo: antes llegaba por correo o por Zimbra y
                                        el educador tenía que buscarla fuera. */}
                                    {observacionCoordinador && (
                                        <p className="mt-1 text-[11px] text-danger max-w-[280px]">
                                            <strong>Observado:</strong> {observacionCoordinador.texto}
                                        </p>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* Firma del educador: disponible mientras la
                                            ficha no esté esperando al coordinador ni
                                            firmada por él. */}
                                        {!isViewing && ['FINALIZADO', 'OBSERVADO'].includes(informe.estado) && (
                                            <button
                                                onClick={() => setFirmando(true)}
                                                className="p-1.5 text-primary hover:bg-primary-soft rounded-[4px] transition-colors"
                                                title="Firmar y enviar al coordinador"
                                            >
                                                <FileSignature size={16} />
                                            </button>
                                        )}
                                        {/* Editable en borrador y también cuando el
                                            coordinador la devolvió con observaciones.
                                            Sin esto el educador solo podía volver a
                                            firmar la misma ficha sin corregir nada, que
                                            es lo contrario de lo que se acordó. */}
                                        {EDITABLES.includes(informe.estado) ? (
                                            <button
                                                onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-[4px] transition-colors"
                                                title={informe.estado === 'OBSERVADO' ? 'Corregir lo observado' : 'Editar Borrador'}
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
                        <span className="font-bold text-primary text-sm">
                            {informe.codigoInforme || 'Sin numerar'}
                        </span>
                        {/* Mismo mapa que la tabla: antes esta vista pintaba
                            cualquier estado distinto de FINALIZADO en ámbar con
                            el código crudo, así que una ficha firmada se veía
                            igual que un borrador. */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ESTADO_ESTILO[informe.estado] || 'bg-amber-100 text-amber-700'}`}>
                            {ESTADO_ETIQUETA[informe.estado] || informe.estado || 'Borrador'}
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
                        {EDITABLES.includes(informe.estado) ? (
                            <button
                                onClick={() => { setShowForm(true); setIsViewing(false); setCurrentStep(1); }}
                                className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-500 text-white py-1.5 rounded-lg text-xs font-bold"
                            >
                                <Edit size={14} />
                                {informe.estado === 'OBSERVADO' ? 'Corregir' : 'Editar Borrador'}
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
                    title="Ficha de Egreso – Retiro (Formato 13)"
                />

                {/* Firma del educador. Solo su recuadro: el coordinador firma
                    después, desde su bandeja. */}
                {firmando && informe && (
                    <PanelFirmas
                        titulo="Firmar Ficha de Egreso – Retiro"
                        subtitulo="Al firmar, la ficha se envía al coordinador para su firma y sello"
                        firmantes={[{
                            clave: 'educador',
                            etiqueta: 'Educador/a',
                            rol: 'Nombre y firma del educador/a responsable',
                            nombre: educadorDeLaSesion(),
                            conHuella: false,
                        }]}
                        onFirmar={async (firmas) => {
                            if (!firmas.educador) {
                                toast.error('Dibuje su firma antes de continuar.');
                                return;
                            }
                            try {
                                await firmarComoEducador(informe.id, firmas.educador);
                                setInforme({ ...informe, estado: 'PEND_COORDINADOR' });
                                toast.success('Ficha firmada y enviada al coordinador.');
                                setFirmando(false);
                            } catch (e: any) {
                                toast.error(e.message || 'No se pudo firmar la ficha.');
                            }
                        }}
                        onDescargarParaFirmar={handlePreviewPDF}
                        onSubirFirmado={async () => {
                            toast.info('Para el proceso en papel, descargue la ficha y súbala desde el expediente digital.');
                        }}
                        onClose={() => setFirmando(false)}
                    />
                )}

                {/* Hidden Print */}
                {currentPrintFicha && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato13Print id="formato-13-hidden-print" nna={nna} ficha={currentPrintFicha}
                            firmaEducador={detallesGuardados.firmaEducador}
                            firmaCoordinador={detallesGuardados.firmaCoordinador} />
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
                        {isViewing ? 'Ver Ficha de Egreso – Retiro' : 'Registrar Ficha de Egreso – Retiro'}
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
                {/* Dos pasos: el tercero se fue con los datos de educador y
                    coordinador, que ahora salen de la firma. */}
                {[1, 2].map(s => (
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
                            {s === 2 && "Modalidad Egreso / Retiro"}
                        </span>
                        {s < 2 && <div className="flex-1 h-0.5 mx-4 bg-border" />}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mt-4 border-t border-border">
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
                            <div>
                                <label className={LBL}>Recibe servicio de defensa pública</label>
                                <select className={getSelectClass(isViewing)} value={ficha.recibeDefensaPublica} onChange={upF('recibeDefensaPublica')} disabled={isViewing}>
                                    <option value="">Seleccionar…</option><option value="SI">SÍ</option><option value="NO">NO</option>
                                </select>
                            </div>
                            <div>
                                <label className={LBL}>En qué fase del servicio se encuentra al momento del egreso o retiro</label>
                                <select className={getSelectClass(isViewing)} value={ficha.faseAlEgreso} onChange={upF('faseAlEgreso')} disabled={isViewing}>
                                    <option value="">Seleccionar…</option>
                                    <option value="FASE I">FASE I</option>
                                    <option value="FASE II">FASE II</option>
                                    <option value="FASE III">FASE III</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className={LBL}>Descripción (Defensa Pública)</label>
                            <CampoDictado
                                label=""
                                value={ficha.descripcionDefensa || ''}
                                onChange={v => setCampo('descripcionDefensa', v)}
                                rows={3}
                                placeholder="Detalles del servicio de defensa pública…"
                                disabled={isViewing}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Step 2: Modalidad de Egreso ────────────────────────────── */}
            {currentStep === 2 && (
                <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                    <div className="px-4 py-3 bg-surface-muted border-b border-border flex items-center gap-2">
                        <AlertTriangle size={16} className="text-success" />
                        <h3 className="font-semibold text-[13px] text-fg">Modalidad de Egreso / Retiro</h3>
                    </div>
                    <div className="p-5 space-y-3">
                        {/* ── MODALIDAD DE EGRESO ──
                            Las tres del formato oficial. Antes faltaba la de
                            derivación: el campo existía y se guardaba, pero no
                            había casilla para marcarlo. */}
                        {/* El grupo bloqueado no se atenúa: el CheckCard ya baja la
                            opacidad al deshabilitarse y, sumada a la del contenedor,
                            el texto quedaba ilegible. El candado dice lo mismo sin
                            borrar el contenido de la pantalla. */}
                        <div>
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Modalidad de egreso</p>
                                {hayRetiro && (
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted bg-surface-muted border border-border rounded-full px-2.5 py-0.5">
                                        <Lock size={11} /> No aplica: el caso se registró como retiro
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {/* Cumplió fases despliega su propio bloque, igual que
                                    las demás modalidades: en el formato oficial la
                                    tabla de logros solo se llena en este supuesto. */}
                                <div className={`rounded-[8px] border transition-all ${ficha.cumplioFases ? 'bg-info-soft border-info/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="Cumplió fases" checked={ficha.cumplioFases} onChange={v => marcarModalidad('cumplioFases', v)} disabled={isViewing || hayRetiro} />
                                    {ficha.cumplioFases && (
                                        <div className="mt-3 space-y-3">
                                            <p className="text-[11px] text-fg-muted">
                                                Marque los logros cumplidos.
                                            </p>
                                            <div className="border border-border rounded-[8px] overflow-hidden bg-surface">
                                                <table className="w-full text-[13px]" style={{ tableLayout: 'fixed' }}>
                                                    <thead>
                                                        <tr className="bg-surface-muted text-[10px] text-fg-muted uppercase tracking-wider">
                                                            <th style={{ width: '5%' }} className="px-2 py-2 font-bold">N°</th>
                                                            <th className="px-3 py-2 font-bold text-left">Logros cumplidos</th>
                                                            <th style={{ width: '12%' }} className="px-2 py-2 font-bold border-l border-border">Cumplido</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {/* Toda la fila marca el logro: la casilla sola,
                                                            al final de un texto largo, obligaba a apuntar a
                                                            un cuadrito de 13 px y parecía que la tabla no
                                                            respondía. */}
                                                        {LOGROS_F13.map(logro => {
                                                            const cumplido = logroCumplido(ficha.logros[logro.id]);
                                                            return (
                                                                <tr
                                                                    key={logro.id}
                                                                    onClick={() => !isViewing && marcarLogro(logro.id)}
                                                                    className={`border-t border-border align-top select-none transition-colors
                                                                        ${cumplido ? 'bg-success-soft' : ''}
                                                                        ${isViewing ? '' : 'cursor-pointer hover:bg-surface-muted'}`}
                                                                >
                                                                    <td className="px-2 py-2.5 text-center font-bold text-fg-muted">{logro.id}</td>
                                                                    <td className={`px-3 py-2.5 leading-snug ${cumplido ? 'text-fg font-medium' : 'text-fg-2'}`}>{logro.text}</td>
                                                                    <td className="px-2 py-2.5 text-center border-l border-border">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="w-4 h-4 cursor-pointer accent-primary"
                                                                            aria-label={`Logro ${logro.id} cumplido`}
                                                                            checked={cumplido}
                                                                            onChange={() => !isViewing && marcarLogro(logro.id)}
                                                                            onClick={e => e.stopPropagation()}
                                                                            disabled={isViewing}
                                                                        />
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <CampoDictado
                                                label="Observaciones"
                                                value={ficha.observacionesLogros || ''}
                                                onChange={v => setCampo('observacionesLogros', v)}
                                                rows={3}
                                                disabled={isViewing}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-[8px] border transition-all ${ficha.mayoriaEdad ? 'bg-info-soft border-info/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="Mayoría de edad" checked={ficha.mayoriaEdad} onChange={v => marcarModalidad('mayoriaEdad', v)} disabled={isViewing || hayRetiro} />
                                    {ficha.mayoriaEdad && (
                                        <div className="ml-6 mt-3 space-y-3">
                                            <div>
                                                <label className={LBL + ' mb-2'}>Derechos restituidos</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {['derechosIdentidad','derechosSalud','derechosEducacion','derechosRecreacion'].map((k, i) => (
                                                        <CheckCard key={k} label={['Identidad','Salud','Educación','Recreación'][i]} checked={ficha[k]} onChange={v => upBool(k, v)} disabled={isViewing} />
                                                    ))}
                                                </div>
                                                <input className={getInputClass(isViewing)} placeholder="Otros derechos…" value={ficha.derechosOtros} onChange={upF('derechosOtros')} disabled={isViewing} />
                                            </div>
                                            <CampoDictado
                                                label="Observaciones"
                                                value={ficha.observacionesMayoriaEdad || ''}
                                                onChange={v => setCampo('observacionesMayoriaEdad', v)}
                                                rows={2}
                                                disabled={isViewing}
                                            />
                                            <div>
                                                <label className={LBL}>Se entrega directorio de instituciones al usuario</label>
                                                <select className={getSelectClass(isViewing)} value={ficha.entregaDirectorio} onChange={upF('entregaDirectorio')} disabled={isViewing}>
                                                    <option value="">Seleccionar…</option>
                                                    <option value="SI">SÍ</option><option value="NO">NO</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-[8px] border transition-all ${ficha.derivacionServicios ? 'bg-info-soft border-info/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="Derivación servicios complementarios" checked={ficha.derivacionServicios} onChange={v => marcarModalidad('derivacionServicios', v)} disabled={isViewing || hayRetiro} />
                                    {ficha.derivacionServicios && (
                                        <div className="ml-6 mt-3 space-y-3">
                                            <div>
                                                <label className={LBL}>Institución derivada</label>
                                                <input className={getInputClass(isViewing)} value={ficha.institucionDerivada} onChange={upF('institucionDerivada')} disabled={isViewing} />
                                            </div>
                                            <CampoDictado
                                                label="Observaciones"
                                                value={ficha.observacionesDerivacion || ''}
                                                onChange={v => setCampo('observacionesDerivacion', v)}
                                                rows={2}
                                                disabled={isViewing}
                                            />
                                            <p className="text-[11px] text-fg-muted italic">Adjuntar evidencia de derivación al expediente digital.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── MODALIDAD DE RETIRO ──
                            Las tres del formato oficial. Antes estaban dentro de
                            "Retiro por Intervención Integral" y "Retiro
                            Desestimado", dos categorías que no existen en el
                            papel: el educador que buscaba "No ubicado" no lo
                            encontraba. */}
                        <div className="pt-3 border-t border-border">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-fg-muted">Modalidad de retiro</p>
                                {hayEgreso && (
                                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-muted bg-surface-muted border border-border rounded-full px-2.5 py-0.5">
                                        <Lock size={11} /> No aplica: el caso se registró como egreso
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className={`rounded-[8px] border transition-all ${ficha.interesSuperior ? 'bg-warning-soft/40 border-warning/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="Interés superior del NNA (trata, delincuencia, etc.)" checked={ficha.interesSuperior} onChange={v => marcarModalidad('interesSuperior', v)} disabled={isViewing || hayEgreso} />
                                    {ficha.interesSuperior && (
                                        <div className="ml-6 mt-3 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <CheckCard label="Trata" checked={ficha.interesSuperiorTrata} onChange={v => upBool('interesSuperiorTrata', v)} disabled={isViewing} />
                                                <CheckCard label="Infractor / delincuencia" checked={ficha.interesSuperiorDelincuencia} onChange={v => upBool('interesSuperiorDelincuencia', v)} disabled={isViewing} />
                                            </div>
                                            <input className={getInputClass(isViewing)} placeholder="Otros…" value={ficha.interesSuperiorOtro} onChange={upF('interesSuperiorOtro')} disabled={isViewing} />
                                            <div>
                                                <CampoDictado
                                                    label="Acciones realizadas"
                                                    value={ficha.retiInterSuperiorAcciones || ''}
                                                    onChange={v => setCampo('retiInterSuperiorAcciones', v)}
                                                    rows={2}
                                                    disabled={isViewing}
                                                />
                                                <p className="text-[11px] text-fg-muted italic mt-1">Adjuntar evidencia al expediente digital.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-[8px] border transition-all ${ficha.noUbicado ? 'bg-warning-soft/40 border-warning/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="No ubicado (3 meses o más de no ubicado)" checked={ficha.noUbicado} onChange={v => marcarModalidad('noUbicado', v)} disabled={isViewing || hayEgreso} />
                                    {ficha.noUbicado && (
                                        <div className="ml-6 mt-3">
                                            <CampoDictado
                                                label="Acciones realizadas para ubicarlo"
                                                value={ficha.accionesBusqueda || ''}
                                                onChange={v => setCampo('accionesBusqueda', v)}
                                                rows={2}
                                                disabled={isViewing}
                                            />
                                            <p className="text-[11px] text-fg-muted italic mt-1">Adjuntar evidencia en el cuaderno de campo.</p>
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-[8px] border transition-all ${ficha.noDeseaParticipar ? 'bg-warning-soft/40 border-warning/20 p-4' : 'border-border p-3'}`}>
                                    <CheckCard label="No desea participar" checked={ficha.noDeseaParticipar} onChange={v => marcarModalidad('noDeseaParticipar', v)} disabled={isViewing || hayEgreso} />
                                    {ficha.noDeseaParticipar && (
                                        <div className="ml-6 mt-3">
                                            <CampoDictado
                                                label="Motivo y acciones realizadas para motivarlo"
                                                value={ficha.motivoNoDesea || ''}
                                                onChange={v => setCampo('motivoNoDesea', v)}
                                                rows={2}
                                                disabled={isViewing}
                                            />
                                            <p className="text-[11px] text-fg-muted italic mt-1">Adjuntar evidencia en el cuaderno de campo.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* El paso 3 desapareció: los datos del educador y del coordinador
                ya no se escriben. Cada uno firma desde la tabla de fichas y su
                nombre sale de su cuenta, así que una ficha no puede salir
                firmada a nombre de otra persona. */}

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
                    {currentStep < 2 ? (
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
                    <Formato13Print id="formato-13-hidden-print" nna={nna} ficha={currentPrintFicha}
                            firmaEducador={detallesGuardados.firmaEducador}
                            firmaCoordinador={detallesGuardados.firmaCoordinador} />
                </div>
            )}
        </div>
    );
};
