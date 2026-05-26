import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { useAuthStore } from '../../store/auth.store';
import { NNA_API_URL } from '../../config/api';
import { MapPin, Users, Briefcase, School, HeartPulse, Home, Plus, Trash2, X, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { InputField, SelectField, SectionHeader, FooterButtons } from '../../components/ui/FormFields';
import { UbigeoFields } from '../../components/forms/UbigeoFields';
import { 
    DISCAPACIDADES_CONADIS,
    OPCIONES_ACTIVIDAD_CALLE,
    OPCIONES_MATRICULA_2026, 
    NIVELES_EDUCATIVOS_2026, 
    MODALIDADES_ESTUDIO_2026, 
    GRADOS_ESTUDIO_2026, 
    OPCIONES_CONVIVENCIA_2026, 
    OPCIONES_VINCULO_TUTOR_2026,
    OPCIONES_SEXO_APO_2026,
    OPCIONES_TIP_DOC_APO_2026,
    OPCIONES_LENGUA_APO_2026,
    OPCIONES_ETNIA_APO_2026,
    OPCIONES_DISCAPACIDAD_APO_2026,
    OPCIONES_CERT_DISCAP_APO_2026
} from '../../data/ubigeo';

// TIPOS DE DATOS
interface NnaPersonalData {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    sexo: string;
    fechaNacimiento: string;
    edad: string;
    unidadEdad: string;
    nacionalidad: string;

    // Lugar Nacimiento
    departamentoNac: string;
    provinciaNac: string;
    distritoNac: string;

    // Identidad
    tipoDoc: string;
    numeroDoc: string;
    tienePartidaNacimiento: string;
    detalleSinDoc: string;

    // Edu & Salud
    estudiaActualmente: string | boolean;
    nivelEducativo: string;
    gradoEstudio: string;
    institucionEducativa: string;
    modalidadEstudio: string;
    detalleNoEstudia: string;
    afiliadoSIS: string;
    afiliadoOtroSeguro: string;
    detalleOtroSeguro: string;
    sufreEnfermedad: string;
    detalleEnfermedad: string;
    observacionesSalud: string;
    tieneDiscapacidad: boolean;
    tipoDiscapacidad: string;
    detalleDiscapacidad: string;

    actividadesTiempoLibre: string;
    caracteristicas: string;
    tieneAntecedenteAlbergue: boolean;
    detalleAntecedenteAlbergue: string;
    lenMatNna?: string;
    lenMatEspNna?: string;
    autIdeEtNna?: string;
    autIdeEtEspNna?: string;
    certDiscapNna?: string;
}

interface DiaActividad {
    dia: string;
    inicio: string;
    fin: string;
    certDiscapNna?: string;
}

}

interface ActividadPerfil {
    actividad: string;
    actividadEspecifique?: string;
    tiempoValor: string;
    tiempoUnidad: string;
    tiempoDetalle?: string;
    jornada: DiaActividad[];
    condicion?: string;
}

interface NnaFormData {
    actividadesPerfil?: ActividadPerfil[];
    zonaIntervencion: string;
    departamentoIntervencion: string;
    provinciaIntervencion: string;
    distritoIntervencion: string;

    departamentoDom: string;
    provinciaDom: string;
    distritoDom: string;

    perfil: string;
    situacionCalle: string;
    fechaAbordaje: string;
    fechaIngreso: string;
    fechaReingreso: string;
    fechaCambioPerfil: string;

    domicilioActual: string;
    referenciaDomicilio: string;
    telefonoContacto: string;

    nnas: NnaPersonalData[];

    actividadRealizada: string;

    domicilioActual: string;
    referenciaDomicilio: string;
    telefonoContacto: string;

    nnas: NnaPersonalData[];

    actividadRealizada: string;
    tiempoEnCalle: string;
    horarioInicio: string;
    horarioFin: string;
    horarioInicio2: string;
    horarioFin2: string;
    diasTrabajo: string;
    condicion: string;

    viveCon: string;
    detalleViveCon: string;
    lugarPernocte: string;
    detalleLugarPernocte: string;
    nombreTutor: string;
    familiares: FamiliarData[];
}

interface FamiliarData {
    nombres: string;
    parentesco: string;
    dni: string;
    telefono: string;
    ocupacion: string;
    viveCon: string; // 'SI' | 'NO'
    esTutor?: boolean;
    priApeTutApo?: string;
    segApeTutApo?: string;
    nomApeTutApo?: string;
    sexoApo?: string;
    fechaNacApo?: string;
    nacionalidadApo?: string;
    tipDocTutApo?: string;
    nroDocTutApo?: string;
    vinTutUsu?: string;
    lenMatApo?: string;
    lenMatEspApo?: string;
    autIdeEtApo?: string;
    autIdeEtEspApo?: string;
    tipoDiscapApo?: string;
    certDiscapApo?: string;
}

// =========================================================================
// FUNCIONES NORMALIZADORAS PARA VARIABLES SOCIO-DEMOGRÁFICAS SEC 2026
// Evitan que el formulario quede en blanco si los valores guardados en BD 
// tienen formatos heredados o ligeras inconsistencias con ubigeo.ts
// =========================================================================
const normalizeLenMat = (val: any): string => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "10: Castellano", "1: Quechua", "2: Aimara", "3: Asháninca", 
        "4: Awajún/Aguaruna", "5: Shipibo-Conibo", "6: Shawi/ Chayahuita", 
        "7: Matsigenka/ Machiguenga", "8: Achuar", "9: Otra lengua indígena u originaria", 
        "11: portugués", "12: Otra lengua extranjera", "13: Lengua de señas peruana", 
        "14: No escucha ni habla", "16 NO RESPONDE / NO SABE", "99. NO APLICA (menores de 3 años)"
    ];
    if (validValues.includes(v)) return v;

    const lower = v.toLowerCase();
    
    // Primero palabras clave
    if (lower.includes('castellano') || lower.includes('español') || lower.includes('espanol')) return '10: Castellano';
    if (lower.includes('quechua')) return '1: Quechua';
    if (lower.includes('aimara') || lower.includes('aymara')) return '2: Aimara';
    if (lower.includes('asháninca') || lower.includes('ashaninca')) return '3: Asháninca';
    if (lower.includes('awajún') || lower.includes('awajun') || lower.includes('aguaruna')) return '4: Awajún/Aguaruna';
    if (lower.includes('shipibo') || lower.includes('conibo')) return '5: Shipibo-Conibo';
    if (lower.includes('shawi') || lower.includes('chayahuita')) return '6: Shawi/ Chayahuita';
    if (lower.includes('matsigenka') || lower.includes('machiguenga')) return '7: Matsigenka/ Machiguenga';
    if (lower.includes('achuar')) return '8: Achuar';
    if (lower.includes('otra lengua indígena') || lower.includes('indigena') || lower.includes('originaria')) return '9: Otra lengua indígena u originaria';
    if (lower.includes('portugués') || lower.includes('portugues')) return '11: portugués';
    if (lower.includes('extranjera')) return '12: Otra lengua extranjera';
    if (lower.includes('señas') || lower.includes('senas')) return '13: Lengua de señas peruana';
    if (lower.includes('no escucha') || lower.includes('sordo') || lower.includes('mudo')) return '14: No escucha ni habla';
    if (lower.includes('no responde') || lower.includes('no sabe') || lower.includes('sin respuesta')) return '16 NO RESPONDE / NO SABE';
    if (lower.includes('no aplica')) return '99. NO APLICA (menores de 3 años)';

    // Búsqueda por número exacto o prefijo
    const numMatch = v.match(/^(\d+)/);
    if (numMatch) {
        const num = numMatch[1];
        if (num === '10') return '10: Castellano';
        if (num === '1') return '1: Quechua';
        if (num === '2') return '2: Aimara';
        if (num === '3') return '3: Asháninca';
        if (num === '4') return '4: Awajún/Aguaruna';
        if (num === '5') return '5: Shipibo-Conibo';
        if (num === '6') return '6: Shawi/ Chayahuita';
        if (num === '7') return '7: Matsigenka/ Machiguenga';
        if (num === '8') return '8: Achuar';
        if (num === '9') return '9: Otra lengua indígena u originaria';
        if (num === '11') return '11: portugués';
        if (num === '12') return '12: Otra lengua extranjera';
        if (num === '13') return '13: Lengua de señas peruana';
        if (num === '14') return '14: No escucha ni habla';
        if (num === '16') return '16 NO RESPONDE / NO SABE';
        if (num === '99') return '99. NO APLICA (menores de 3 años)';
    }

    return v;
};

const normalizeEtnia = (val: any): string => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "7: Mestizo", "1: Quechua", "2: Aimara", "3: Indígena u originario de la Amazonía", 
        "4: Perteneciente o parte de otro pueblo indígena u originario", 
        "5: Negro, moreno, zambo, mulato o afrodescendiente", "6: Blanco", "8: Otro"
    ];
    if (validValues.includes(v)) return v;

    const lower = v.toLowerCase();
    
    // Primero palabras clave
    if (lower.includes('mestizo')) return '7: Mestizo';
    if (lower.includes('quechua')) return '1: Quechua';
    if (lower.includes('aimara') || lower.includes('aymara')) return '2: Aimara';
    if (lower.includes('amazonía') || lower.includes('amazonia') || lower.includes('selva') || lower.includes('nativo')) return '3: Indígena u originario de la Amazonía';
    if (lower.includes('otro pueblo') || lower.includes('perteneciente') || lower.includes('comunidad')) return '4: Perteneciente o parte de otro pueblo indígena u originario';
    if (lower.includes('negro') || lower.includes('moreno') || lower.includes('afro') || lower.includes('zambo') || lower.includes('mulato') || lower.includes('afrodescendiente')) return '5: Negro, moreno, zambo, mulato o afrodescendiente';
    if (lower.includes('blanco')) return '6: Blanco';
    if (lower.includes('otro')) return '8: Otro';

    // Búsqueda por número exacto o prefijo
    const numMatch = v.match(/^(\d+)/);
    if (numMatch) {
        const num = numMatch[1];
        if (num === '7') return '7: Mestizo';
        if (num === '1') return '1: Quechua';
        if (num === '2') return '2: Aimara';
        if (num === '3') return '3: Indígena u originario de la Amazonía';
        if (num === '4') return '4: Perteneciente o parte de otro pueblo indígena u originario';
        if (num === '5') return '5: Negro, moreno, zambo, mulato o afrodescendiente';
        if (num === '6') return '6: Blanco';
        if (num === '8') return '8: Otro';
    }

    return v;
};

const normalizeTipoDiscap = (val: any): string => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "6. Ninguna",
        "1. Motriz o física",
        "2. Sensorial",
        "3. Cognitivo-intelectual",
        "4. Psicosocial o psíquica",
        "5. Mas de una discapacidad"
    ];
    if (validValues.includes(v)) return v;

    const lower = v.toLowerCase();
    if (lower.includes('ninguna') || v === '6' || v.startsWith('6')) return '6. Ninguna';
    if (lower.includes('motriz') || lower.includes('física') || lower.includes('fisica') || v === '1' || v.startsWith('1')) return '1. Motriz o física';
    if (lower.includes('sensorial') || v === '2' || v.startsWith('2')) return '2. Sensorial';
    if (lower.includes('cognitivo') || lower.includes('intelectual') || v === '3' || v.startsWith('3')) return '3. Cognitivo-intelectual';
    if (lower.includes('psicosocial') || lower.includes('psíquica') || lower.includes('psiquica') || v === '4' || v.startsWith('4')) return '4. Psicosocial o psíquica';
    if (lower.includes('mas de una') || lower.includes('más de una') || v === '5' || v.startsWith('5')) return '5. Mas de una discapacidad';

    return v;
};

const normalizeCertDiscap = (val: any): string => {
    if (!val) return '';
    const v = String(val).trim();
    const validValues = [
        "99. No aplica",
        "1. Sí, tiene Certificado de Discapacidad.",
        "2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.",
        "3. No, no tiene Certificado de Discapacidad."
    ];
    if (validValues.includes(v)) return v;

    const lower = v.toLowerCase();
    
    // 1. Evaluar negaciones y "no aplica" primero para resolver prioridad errónea con "2: No tiene"
    if (v === '99' || lower.includes('no aplica') || v.startsWith('99')) {
        return '99. No aplica';
    }
    if (v === '3' || lower.includes('no tiene') || lower.includes('no, no tiene') || lower.includes('no tiene certificado') || (lower.includes('no') && !lower.includes('sí') && !lower.includes('si') && !lower.includes('porto') && !lower.includes('porta'))) {
        return '3. No, no tiene Certificado de Discapacidad.';
    }

    // 2. Evaluar "no lo porto" / "no lo porta"
    if (v === '2' || lower.includes('no lo porto') || lower.includes('no lo porta') || (lower.includes('porto') || lower.includes('porta'))) {
        return '2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.';
    }

    // 3. Evaluar "sí tiene" / "sí, tiene"
    if (v === '1' || lower.includes('sí tiene') || lower.includes('si tiene') || lower.includes('tiene certificado')) {
        return '1. Sí, tiene Certificado de Discapacidad.';
    }

    // 4. Búsqueda por número exacto o prefijo
    const numMatch = v.match(/^(\d+)/);
    if (numMatch) {
        const num = numMatch[1];
        if (num === '1') return '1. Sí, tiene Certificado de Discapacidad.';
        if (num === '2') {
            if (lower.includes('no')) {
                return '3. No, no tiene Certificado de Discapacidad.';
            }
            return '2. Si, tiene Certificado de Discapacidad, pero no lo porto conmigo.';
        }
        if (num === '3') return '3. No, no tiene Certificado de Discapacidad.';
        if (num === '99') return '99. No aplica';
    }
    }

    return v;
};

// Función utilitaria global para calcular la diferencia de horas entre dos horas en formato HH:MM
export const calcularHorasDia = (inicio: string, fin: string): number => {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMin < 0) diffMin += 24 * 60;
    return diffMin / 60;
};

export const NnaCreatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Obtener ID para edición
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, error: storeError } = useNnaStore();
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeSection, setActiveSection] = useState('paso1_generales');

    // Banner de errores de validación
    const [submitValidationMsg, setSubmitValidationMsg] = useState<string | null>(null);
    // Duplicate detection & drawer
    const [nnaSemaforo, setNnaSemaforo] = useState<Record<number, 'clean' | 'warning' | 'error'>>({});
    const [nnaBuscando, setNnaBuscando] = useState<Record<number, boolean>>({});
    const [duplicadosData, setDuplicadosData] = useState<any[]>([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerNnaIdx, setDrawerNnaIdx] = useState<number | null>(null);
    // Modal de familiar
    const [familiarModal, setFamiliarModal] = useState(false);
    const [familiarEditIdx, setFamiliarEditIdx] = useState<number | null>(null);
    const [familiarDraft, setFamiliarDraft] = useState<FamiliarData>({
        nombres: '',
        parentesco: '',
        dni: '',
        telefono: '',
        ocupacion: '',
        viveCon: 'SI',
        esTutor: false,
        priApeTutApo: '',
        segApeTutApo: '',
        nomApeTutApo: '',
        sexoApo: '',
        fechaNacApo: '',
        nacionalidadApo: 'PERUANA',
        tipDocTutApo: '',
        nroDocTutApo: '',
        vinTutUsu: '',
        lenMatApo: '',
        lenMatEspApo: '',
        autIdeEtApo: '',
        autIdeEtEspApo: '',
        tipoDiscapApo: '',
        certDiscapApo: ''
    });

    // Modal de actividad del perfil
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
    const [modalActividad, setModalActividad] = useState('');
    const [modalActividadEspecifique, setModalActividadEspecifique] = useState('');
    const [modalTiempoModo, setModalTiempoModo] = useState<'simple' | 'detalle'>('simple');
    const [modalTiempoValor, setModalTiempoValor] = useState('1');
    const [modalTiempoUnidad, setModalTiempoUnidad] = useState('Meses');
    const [modalTiempoDetalle, setModalTiempoDetalle] = useState('');
    const [modalCondicion, setModalCondicion] = useState('SOLO');
    const [modalJornadaSemanal, setModalJornadaSemanal] = useState<Record<string, { activo: boolean; inicio: string; fin: string; tieneTurno2: boolean; inicio2: string; fin2: string; }>>({});

    const seleccionarDiasPredefinidos = (tipo: 'todos' | 'laborables' | 'finde' | 'ninguno') => {
        const nuevosJornadas = { ...modalJornadaSemanal };
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        DIAS.forEach(d => {
            let activo = false;
            if (tipo === 'todos') activo = true;
            else if (tipo === 'laborables') activo = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(d);
            else if (tipo === 'finde') activo = ['Sábado', 'Domingo'].includes(d);
            else if (tipo === 'ninguno') activo = false;
            

    const seleccionarDiasPredefinidosLibre = (tipo: 'todos' | 'laborables' | 'finde' | 'ninguno') => {
        const nuevosJornadas = { ...modalLibreJornadaSemanal };
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        DIAS.forEach(d => {
            let activo = false;
            if (tipo === 'todos') activo = true;
            else if (tipo === 'laborables') activo = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(d);
            else if (tipo === 'finde') activo = ['Sábado', 'Domingo'].includes(d);
            else if (tipo === 'ninguno') activo = false;
            
            nuevosJornadas[d] = {
                ...nuevosJornadas[d],
                activo: activo
            };
        });
        setModalLibreJornadaSemanal(nuevosJornadas);
    };

    const copiarHorariosPrimerDiaActivoLibre = () => {
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const primerActivo = DIAS.find(d => modalLibreJornadaSemanal[d]?.activo);
        if (!primerActivo) {
            alert("Primero debes activar al menos un día y configurar su horario.");
            return;
        }
        const configPrimerDia = modalLibreJornadaSemanal[primerActivo];
        
        const nuevosJornadas = { ...modalLibreJornadaSemanal };
        DIAS.forEach(d => {
            if (modalLibreJornadaSemanal[d]?.activo && d !== primerActivo) {
                nuevosJornadas[d] = {
                    ...nuevosJornadas[d],
                    inicio: configPrimerDia.inicio,
                    fin: configPrimerDia.fin,
                    tieneTurno2: configPrimerDia.tieneTurno2,
                    inicio2: configPrimerDia.inicio2,
                    fin2: configPrimerDia.fin2
                };
            }
        });
        setModalLibreJornadaSemanal(nuevosJornadas);
    };

    const abrirModalLibre = (nnaIdx: number, actIdx?: number) => {
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const initialJornada: any = {};
        
        setLibreNnaIndex(nnaIdx);

        if (actIdx !== undefined) {
            setEditingLibreIndex(actIdx);
            const acts = getValues(`nnas.${nnaIdx}.actividadesTiempoLibreLista` as const) || [];
            const act = acts[actIdx];
            setModalLibreActividad(act.actividad || '');
            setModalLibreActividadEspecifique(act.actividadEspecifique || '');
            if (act.tiempoValor && act.tiempoUnidad) {
                setModalLibreTiempoModo('simple');
                setModalLibreTiempoValor(act.tiempoValor);
                setModalLibreTiempoUnidad(act.tiempoUnidad);
            } else {
                setModalLibreTiempoModo('detalle');
                setModalLibreTiempoDetalle(act.tiempoDetalle || '');
            }
            
            DIAS.forEach(d => {
                const j = (act.jornada || []).find(x => x.dia === d);
                initialJornada[d] = {
                    activo: !!j,
                    inicio: j?.inicio || '08:00',
                    fin: j?.fin || '12:00',
                    tieneTurno2: !!j?.tieneTurno2,
                    inicio2: j?.inicio2 || '14:00',
                    fin2: j?.fin2 || '18:00'
                };
            });
        } else {
            setEditingLibreIndex(null);
            setModalLibreActividad('');
            setModalLibreActividadEspecifique('');
            setModalLibreTiempoModo('simple');
            setModalLibreTiempoValor('1');
            setModalLibreTiempoUnidad('Semanas');
            setModalLibreTiempoDetalle('');
            
            DIAS.forEach(d => {
                initialJornada[d] = {
                    activo: false,
                    inicio: '08:00',
                    fin: '12:00',
                    tieneTurno2: false,
                    inicio2: '14:00',
                    fin2: '18:00'
                };
            });
        }
        
        setModalLibreJornadaSemanal(initialJornada);
        setIsLibreModalOpen(true);
    };

    const guardarLibreEnForm = () => {
        if (!modalLibreActividad) {
            alert("Por favor selecciona una actividad.");
            return;
        }
        if (modalLibreActividad === 'Otro (especificar)' && !modalLibreActividadEspecifique) {
            alert("Por favor especifica la actividad.");
            return;
        }
        
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const jornadasActivas: DiaActividad[] = [];
        DIAS.forEach(d => {
            const j = modalLibreJornadaSemanal[d];
            if (j?.activo) {
                jornadasActivas.push({
                    dia: d,
                    inicio: j.inicio || '08:00',
                    fin: j.fin || '12:00',
                    tieneTurno2: !!j.tieneTurno2,
                    inicio2: j.tieneTurno2 ? (j.inicio2 || '14:00') : undefined,
                    fin2: j.tieneTurno2 ? (j.fin2 || '18:00') : undefined
                });
            }
        });
        
        if (jornadasActivas.length === 0) {
            alert("Debes seleccionar al menos un día en la agenda semanal.");
            return;
        }
        
        const actData: ActividadPerfil = {
            actividad: modalLibreActividad,
            actividadEspecifique: modalLibreActividad === 'Otro (especificar)' ? modalLibreActividadEspecifique : undefined,
            tiempoValor: modalLibreTiempoModo === 'simple' ? modalLibreTiempoValor : '',
            tiempoUnidad: modalLibreTiempoModo === 'simple' ? modalLibreTiempoUnidad : '',
            tiempoDetalle: modalLibreTiempoModo === 'detalle' ? modalLibreTiempoDetalle : `${modalLibreTiempoValor} ${modalLibreTiempoUnidad}`,
            jornada: jornadasActivas,
            condicion: 'SOLO'
        };
        
        if (libreNnaIndex === null) return;
        const current = getValues(`nnas.${libreNnaIndex}.actividadesTiempoLibreLista` as const) || [];
        if (editingLibreIndex !== null) {
            const updated = [...current];
            updated[editingLibreIndex] = actData;
            setValue(`nnas.${libreNnaIndex}.actividadesTiempoLibreLista`, updated);
        } else {
            setValue(`nnas.${libreNnaIndex}.actividadesTiempoLibreLista`, [...current, actData]);
        }
        setIsLibreModalOpen(false);
    };

    const eliminarLibreDelForm = (nnaIdx: number, actIdx: number) => {
        const current = getValues(`nnas.${nnaIdx}.actividadesTiempoLibreLista` as const) || [];
        setValue(`nnas.${nnaIdx}.actividadesTiempoLibreLista`, current.filter((_, i) => i !== actIdx));
    };

    const seleccionarDiasPredefinidos = (tipo: 'todos' | 'laborables' | 'finde' | 'ninguno') => {
        const nuevosJornadas = { ...modalJornadaSemanal };
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        DIAS.forEach(d => {
            let activo = false;
            if (tipo === 'todos') activo = true;
            else if (tipo === 'laborables') activo = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(d);
            else if (tipo === 'finde') activo = ['Sábado', 'Domingo'].includes(d);
            else if (tipo === 'ninguno') activo = false;
            
            nuevosJornadas[d] = {
                ...nuevosJornadas[d],
                activo: activo
            };
        });
        setModalJornadaSemanal(nuevosJornadas);
    };

    const copiarHorariosPrimerDiaActivo = () => {
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const primerActivo = DIAS.find(d => modalJornadaSemanal[d]?.activo);
        if (!primerActivo) {
            alert("Primero debes activar al menos un día y configurar su horario.");
            return;
        }
        const configPrimerDia = modalJornadaSemanal[primerActivo];
        
        const nuevosJornadas = { ...modalJornadaSemanal };
        DIAS.forEach(d => {
            if (modalJornadaSemanal[d]?.activo && d !== primerActivo) {
                nuevosJornadas[d] = {
                    ...nuevosJornadas[d],
                    inicio: configPrimerDia.inicio,
                    fin: configPrimerDia.fin,
                    tieneTurno2: configPrimerDia.tieneTurno2,
                    inicio2: configPrimerDia.inicio2,
                    fin2: configPrimerDia.fin2
                };
            }
        });
        setModalJornadaSemanal(nuevosJornadas);
    };

    const abrirModalActividad = (idx?: number) => {
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const initialJornada: any = {};

        if (idx !== undefined) {
            setEditingActivityIndex(idx);
            const acts = getValues('actividadesPerfil') || [];
            const act = acts[idx];
            setModalActividad(act.actividad || '');
            setModalActividadEspecifique(act.actividadEspecifique || '');
            setModalCondicion(act.condicion || 'SOLO');
            if (act.tiempoValor && act.tiempoUnidad) {
                setModalTiempoModo('simple');
                setModalTiempoValor(act.tiempoValor);
                setModalTiempoUnidad(act.tiempoUnidad);
                setModalTiempoDetalle('');
            } else {
                setModalTiempoModo('detalle');
                setModalTiempoValor('1');
                setModalTiempoUnidad('Meses');
                setModalTiempoDetalle(act.tiempoDetalle || '');
            }
            
            DIAS.forEach(d => {
                const found = (act.jornada || []).find(j => j.dia === d);
                if (found) {
                    initialJornada[d] = {
                        activo: true,
                        inicio: found.inicio || '08:00',
                        fin: found.fin || '12:00',
                        tieneTurno2: !!found.tieneTurno2,
                        inicio2: found.inicio2 || '14:00',
                        fin2: found.fin2 || '18:00'
                    };
                } else {
                    initialJornada[d] = {
                        activo: false,
                        inicio: '08:00',
                        fin: '12:00',
                        tieneTurno2: false,
                        inicio2: '14:00',
                        fin2: '18:00'
                    };
                }
            });
        } else {
            setEditingActivityIndex(null);
            setModalActividad('');
            setModalActividadEspecifique('');
            setModalCondicion('SOLO');
            setModalTiempoModo('simple');
            setModalTiempoValor('1');
            setModalTiempoUnidad('Meses');
            setModalTiempoDetalle('');
            
            DIAS.forEach(d => {
                initialJornada[d] = {
                    activo: false,
                    inicio: '08:00',
        defaultValues: {
            nnas: [{
                nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDoc: '', fechaNacimiento: '',
                edad: '', unidadEdad: 'ANIOS', nacionalidad: 'PERUANA',
                tipoDoc: 'DNI', sexo: '', estudiaActualmente: '', tieneDiscapacidad: false,
                tienePartidaNacimiento: "true", tipoDiscapacidad: '', detalleDiscapacidad: '',
                afiliadoSIS: 'NO_SABE', afiliadoOtroSeguro: 'NO', sufreEnfermedad: 'NO',
                lenMatNna: '', lenMatEspNna: '', autIdeEtNna: '', autIdeEtEspNna: '', certDiscapNna: ''
            }],
            situacionCalle: '',
            perfil: '',
            condicion: '',
            diasTrabajo: '',
            nombreTutor: '',
            departamentoIntervencion: '',
            provinciaIntervencion: '',
            distritoIntervencion: '',
            familiares: [],
            actividadesPerfil: [],
        }
    });

    const { fields, remove } = useFieldArray({ control, name: "nnas" });
    const { fields: familiaresFields, append: appendFamiliar, remove: removeFamiliar } = useFieldArray({ control, name: "familiares" });

    // ── DETECCIÓN DE DUPLICADOS (onBlur en campos de nombre/DNI) ──────────────
    /**
     * Quita tildes y pasa a mayúsculas: "María" → "MARIA", "Guillén" → "GUILLEN".
     * Usa Unicode category Mn (combining marks) — funciona con cualquier acento latino.
     */
    const normStr = (s: string): string => {
            : `${modalTiempoValor} ${modalTiempoValor === '1' ? modalTiempoUnidad.slice(0, -1).toLowerCase() : modalTiempoUnidad.toLowerCase()}`;

        // Construir jornada array de las checkboxes activas
        const activeJornadas: DiaActividad[] = [];
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        DIAS.forEach(d => {
            const dInfo = modalJornadaSemanal[d];
            if (dInfo && dInfo.activo) {
                const j: DiaActividad = {
                    dia: d,
                    inicio: dInfo.inicio || '08:00',
                    fin: dInfo.fin || '12:00'
                };
                if (dInfo.tieneTurno2) {
                    j.tieneTurno2 = true;
                    j.inicio2 = dInfo.inicio2 || '14:00';
                    j.fin2 = dInfo.fin2 || '18:00';
                }
                activeJornadas.push(j);
            }
        });

        const actData: ActividadPerfil = {
            actividad: modalActividad,
            actividadEspecifique: modalActividad === 'Otro (especificar)' ? modalActividadEspecifique : undefined,
            tiempoValor: modalTiempoModo === 'simple' ? modalTiempoValor : '',
            tiempoUnidad: modalTiempoModo === 'simple' ? modalTiempoUnidad : '',
            tiempoDetalle: tDetalle,
            jornada: activeJornadas,
            condicion: modalCondicion
        };

        const current = getValues('actividadesPerfil') || [];
        if (editingActivityIndex !== null) {
            const updated = [...current];
            updated[editingActivityIndex] = actData;
            setValue('actividadesPerfil', updated);
        } else {
            setValue('actividadesPerfil', [...current, actData]);
        }
        setIsActivityModalOpen(false);
    };

    const eliminarActividadDelForm = (idx: number) => {
        const current = getValues('actividadesPerfil') || [];
        setValue('actividadesPerfil', current.filter((_, i) => i !== idx));
    };

    const abrirModalFamiliar = (idx?: number) => {
        if (idx !== undefined) {
            setFamiliarEditIdx(idx);
            const raw = familiaresFields[idx] as any;
            setFamiliarDraft({
                nombres: raw.nombres || '',
                parentesco: raw.parentesco || '',
                dni: raw.dni || '',
                telefono: raw.telefono || '',
                ocupacion: raw.ocupacion || '',
                viveCon: raw.viveCon || 'SI',
                esTutor: !!raw.esTutor,
                priApeTutApo: raw.priApeTutApo || '',
                segApeTutApo: raw.segApeTutApo || '',
                nomApeTutApo: raw.nomApeTutApo || '',
                sexoApo: raw.sexoApo || '',
                fechaNacApo: raw.fechaNacApo || '',
                nacionalidadApo: raw.nacionalidadApo || 'PERUANA',
                tipDocTutApo: raw.tipDocTutApo || '',
                nroDocTutApo: raw.nroDocTutApo || '',
                vinTutUsu: raw.vinTutUsu || '',
                lenMatApo: raw.lenMatApo || '',
                lenMatEspApo: raw.lenMatEspApo || '',
                autIdeEtApo: raw.autIdeEtApo || '',
                autIdeEtEspApo: raw.autIdeEtEspApo || '',
                tipoDiscapApo: raw.tipoDiscapApo || '',
                certDiscapApo: raw.certDiscapApo || ''
            });
        } else {
            setFamiliarEditIdx(null);
            setFamiliarDraft({
                nombres: '',
                parentesco: '',
                dni: '',
                telefono: '',
                ocupacion: '',
                viveCon: 'SI',
                esTutor: false,
                priApeTutApo: '',
                segApeTutApo: '',
                nomApeTutApo: '',
                sexoApo: '',
                fechaNacApo: '',
                nacionalidadApo: 'PERUANA',
                tipDocTutApo: '',
                nroDocTutApo: '',
                vinTutUsu: '',
                lenMatApo: '',
                lenMatEspApo: '',
                autIdeEtApo: '',
                autIdeEtEspApo: '',
                tipoDiscapApo: '',
                certDiscapApo: ''
            });
        }
        setFamiliarModal(true);
    };

    const guardarFamiliar = () => {
        let draft = { ...familiarDraft };
        const current = watch('familiares') || [];

        // Construir nombres a partir de los campos individuales
        draft.nombres = `${draft.priApeTutApo || ''} ${draft.segApeTutApo || ''} ${draft.nomApeTutApo || ''}`.trim() || draft.nombres;
        // Sincronizar documento
        draft.dni = draft.nroDocTutApo || draft.dni;
        // Sincronizar parentesco
        draft.parentesco = draft.vinTutUsu || draft.parentesco;

        if (draft.esTutor) {
            // Desmarcar cualquier otro familiar como tutor para asegurar unicidad
            current.forEach((f: any, idx: number) => {
                if (idx !== familiarEditIdx) {
                    f.esTutor = false;
                }
            });
        if (isEditMode && selectedExpediente && selectedExpediente.length > 0) {
            const mainNna = selectedExpediente[0] as any;
            const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

            // Normaliza cualquier formato de fecha a "yyyy-MM-dd"
            // Oracle puede devolver "2026-05-17 00:00:00" o "2026-05-17T00:00:00"
            const mappedNnas = selectedExpediente.map(nna => ({
                id: nna.id, // Guardamos ID para updates (si es necesario backend support)
                nombres: nna.nombres,
                apellidoPaterno: nna.apellidoPaterno,
                apellidoMaterno: nna.apellidoMaterno,
                numeroDoc: nna.numeroDoc || '',
                fechaNacimiento: toDateInput(nna.fechaNacimiento),
                edad:       nna.edad        ? String(nna.edad) : '',
                unidadEdad: nna.unidadEdad  || 'ANIOS',
                tipoDoc: nna.tipoDoc,
                sexo: nna.sexo || '',
                tienePartidaNacimiento: nna.tienePartidaNacimiento ? "true" : "false",
                detalleSinDoc: nna.detalleSinDoc || '',

                // Ubicacion Nac
                departamentoNac: nna.departamentoNac || '',
                provinciaNac: nna.provinciaNac || '',
                distritoNac: nna.distritoNac || '',

                // Educacion
                estudiaActualmente: nna.estudiaActualmente 
                    ? 'SI' 
                    : (nna.detalleNoEstudia === 'En proceso de matrícula' 
                        ? 'PROCESO' 
                        : (nna.detalleNoEstudia === 'No aplica' 
                            ? 'NO_APLICA' 
                            : 'NO')),
                nivelEducativo: nna.nivelEducativo || '',
                gradoEstudio: nna.gradoEstudio || '',
                institucionEducativa: nna.institucionEducativa || '',
                modalidadEstudio: nna.modalidadEstudio || '',
                detalleNoEstudia: nna.detalleNoEstudia || '',

                // Salud
                afiliadoSIS: nna.afiliadoSIS || '',
                afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
                detalleOtroSeguro: nna.detalleOtroSeguro || '',
                sufreEnfermedad: (nna.sufreEnfermedad as any) === true || nna.sufreEnfermedad === 'SI' ? 'SI' : 'NO',
                detalleEnfermedad: nna.detalleEnfermedad || '',
                observacionesSalud: nna.observacionesSalud || '',
                tieneDiscapacidad: nna.tieneDiscapacidad,
                tipoDiscapacidad: nna.tipoDiscapacidad || '',
                detalleDiscapacidad: nna.detalleDiscapacidad || '',

                // Extra
                actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
                caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue,
                detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                
                // Socio-demográficas NNA
                lenMatNna: normalizeLenMat(nna.lenMatNna),
                lenMatEspNna: nna.lenMatEspNna || '',
                autIdeEtNna: normalizeEtnia(nna.autIdeEtNna),
                autIdeEtEspNna: nna.autIdeEtEspNna || '',
                certDiscapNna: normalizeCertDiscap(nna.certDiscapNna)
            }));

            // Reset del form con todos los datos
            reset({
                lenMatEspNna: nna.lenMatEspNna || '',
                autIdeEtNna: normalizeEtnia(nna.autIdeEtNna),
                autIdeEtEspNna: nna.autIdeEtEspNna || '',
                certDiscapNna: normalizeCertDiscap(nna.certDiscapNna)
            }));

            // Reset del form con todos los datos
            reset({
                // Global datos (del caso activo o primer nna)
                zonaIntervencion: activeCase?.zonaIntervencion || '',
                condicion: activeCase?.condicion || '',
                horarioInicio: activeCase?.horarioInicio || '',
                horarioFin: activeCase?.horarioFin || '',
                horarioInicio2: activeCase?.horarioInicio2 || '',
                horarioFin2: activeCase?.horarioFin2 || '',
                diasTrabajo: activeCase?.diasTrabajo || '',

                // Familia / Domicilio (compartido, tomamos del main)
                domicilioActual: mainNna.domicilioActual || '',
                referenciaDomicilio: mainNna.referenciaDomicilio || '',
                departamentoDom: mainNna.departamentoDom || '',
                provinciaDom: mainNna.provinciaDom || '',
                distritoDom: mainNna.distritoDom || '',
                telefonoContacto: mainNna.telefonoContacto || '',
                viveCon: (() => {
                    const val = mainNna.viveCon || '';
                    const upper = val.toUpperCase().trim();
                    if (upper === 'SOLO_PADRE') return '1: Solo Padre';
                    if (upper === 'SOLO_MADRE') return '2: Solo Madre';
                    if (upper === 'AMBOS_PADRES') return '3: Padre y madre';
                    if (upper === 'OTROS_FAMILIARES') return '4: Adulto responsable (familia extensa)';
                    if (upper === 'SOLO') return '5: Solo';
                    if (upper === 'AMIGOS' || upper === 'OTRO') return '6: Otro';
                    return val;
                })(),
                detalleViveCon: mainNna.detalleViveCon || '',
                lugarPernocte: mainNna.lugarPernocte || '',
                detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
                nombreTutor: mainNna.nombreTutor || '',
                jornadaSemanal: (() => {
                    let jSaved: any = null;
                    if (mainNna.datosF03) {
                        try {
                            const parsed = typeof mainNna.datosF03 === 'string' 
                                ? JSON.parse(mainNna.datosF03) 
                                : mainNna.datosF03;
                            if (parsed && (parsed.jornadaSemanal || parsed.jornada_semanal)) {
                                jSaved = parsed.jornadaSemanal || parsed.jornada_semanal;
                            }
                        } catch (e) {
                            console.error("Error parsing datosF03 for jackpot", e);
                        }
                    }
                    const res: any = {};
                    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                    if (jSaved) {
                        DIAS.forEach(d => {
                            const match = jSaved[d] || jSaved[d.toLowerCase()] || {};
                            res[d] = {
                                activo: !!match.activo,
                                inicio: match.inicio || '08:00',
                                fin: match.fin || '12:00',
                                inicio2: match.inicio2 || '',
                                fin2: match.fin2 || '',
                                tieneTurno2: !!match.tieneTurno2
                            };
                        });
                        return res;
                    }
                    const diasActivos = activeCase?.diasTrabajo 
                        ? activeCase.diasTrabajo.split(',').map((s: string) => s.trim()) 
                        : [];
                    DIAS.forEach(d => {
                        const isActivo = diasActivos.some((da: string) => da.toLowerCase() === d.toLowerCase() || (d === 'Miércoles' && da.toLowerCase() === 'miercoles') || (d === 'Sábado' && da.toLowerCase() === 'sabado'));
                        res[d] = {
                            activo: isActivo,
                            inicio: activeCase?.horarioInicio || '08:00',
                            fin: activeCase?.horarioFin || '12:00',
                            inicio2: activeCase?.horarioInicio2 || '',
                            fin2: activeCase?.horarioFin2 || '',
                            tieneTurno2: !!(activeCase?.horarioInicio2 && activeCase?.horarioFin2)
                        };
                    });
                    return res;
                })(),
                actividadesPerfil: (() => {
                    let actSaved: ActividadPerfil[] = [];
            } else {
                console.error('Error verificando duplicados:', await res.text());
            }
        } catch (err) {
            console.error('Error de red al verificar duplicados:', err);
        } finally {
            setNnaBuscando(prev => ({ ...prev, [index]: false }));
        }
    };

    // Fusiona el onBlur de react-hook-form con nuestra verificación
    const withBlurCheck = (regResult: any, index: number) => ({
        ...regResult,
        onBlur: (e: any) => {
            regResult.onBlur?.(e);
            checkDuplicadoNna(index);
        },
    });
    // ─────────────────────────────────────────────────────────────────────────

    // CARGAR DATOS SI ES EDICIÓN
    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    // POPULAR FORMULARIO CUANDO LLEGAN DATOS
    useEffect(() => {
        if (isEditMode && selectedExpediente && selectedExpediente.length > 0) {
            const mainNna = selectedExpediente[0] as any;
            const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

            // Normaliza cualquier formato de fecha a "yyyy-MM-dd"
            // Oracle puede devolver "2026-05-17 00:00:00" o "2026-05-17T00:00:00"
            const toDateInput = (v: any): string => {
                if (!v) return '';
                const s = String(v).replace(' ', 'T'); // normaliza espacio → T
                const d = new Date(s);
                return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
            };

            // Mapeamos los NNA backend -> form
            const mappedNnas = selectedExpediente.map(nna => ({
                id: nna.id, // Guardamos ID para updates (si es necesario backend support)
                nombres: nna.nombres,
                apellidoPaterno: nna.apellidoPaterno,
                apellidoMaterno: nna.apellidoMaterno,
                numeroDoc: nna.numeroDoc || '',
                fechaNacimiento: toDateInput(nna.fechaNacimiento),
                edad:       nna.edad        ? String(nna.edad) : '',
                unidadEdad: nna.unidadEdad  || 'ANIOS',
                tipoDoc: nna.tipoDoc,
                sexo: nna.sexo || '',
                tienePartidaNacimiento: nna.tienePartidaNacimiento ? "true" : "false",
                detalleSinDoc: nna.detalleSinDoc || '',

                // Ubicacion Nac
                departamentoNac: nna.departamentoNac || '',
                provinciaNac: nna.provinciaNac || '',
                distritoNac: nna.distritoNac || '',

                // Educacion
                estudiaActualmente: nna.estudiaActualmente 
                    ? 'SI' 
                    : (nna.detalleNoEstudia === 'En proceso de matrícula' 
                        ? 'PROCESO' 
                        : (nna.detalleNoEstudia === 'No aplica' 
                            ? 'NO_APLICA' 
                            : 'NO')),
                nivelEducativo: nna.nivelEducativo || '',
                tieneDiscapacidad: nna.tieneDiscapacidad,
                tipoDiscapacidad: nna.tipoDiscapacidad || '',
                detalleDiscapacidad: nna.detalleDiscapacidad || '',

                // Extra
                actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
                caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue,
                detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                
                // Socio-demográficas NNA
                lenMatNna: normalizeLenMat(nna.lenMatNna),
                lenMatEspNna: nna.lenMatEspNna || '',
                autIdeEtNna: normalizeEtnia(nna.autIdeEtNna),
                autIdeEtEspNna: nna.autIdeEtEspNna || '',
                certDiscapNna: normalizeCertDiscap(nna.certDiscapNna),
                usoTiempo: (() => {
                    let utSaved: any = null;
                    if (nna.datosF03) {
                        try {
                            const parsed = typeof nna.datosF03 === 'string' 
                                ? JSON.parse(nna.datosF03) 
                                : nna.datosF03;
                            if (parsed && parsed.usoTiempo) {
                                utSaved = parsed.usoTiempo;
                            }
                        } catch (e) {
                            console.error("Error parsing usoTiempo from datosF03", e);
                        }
                    }
                    if (utSaved) return utSaved;
                    
                    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                    const emptyUso: any = {};
                    DIAS.forEach(d => {
                        emptyUso[d] = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
                    });
                    return emptyUso;
                })()
            }));

            // Reset del form con todos los datos
            reset({
                // Global datos (del caso activo o primer nna)
                zonaIntervencion: activeCase?.zonaIntervencion || '',
                perfil: activeCase?.perfil || '',
                situacionCalle: activeCase?.situacionCalle || '',
                fechaAbordaje:    toDateInput(activeCase?.fechaAbordaje),
                fechaIngreso:     toDateInput(activeCase?.fechaIngreso),
                fechaReingreso:   toDateInput(activeCase?.fechaReingreso),
                fechaCambioPerfil: toDateInput(activeCase?.fechaCambioPerfil),
                situacionCalle: activeCase?.situacionCalle || '',
                fechaAbordaje:    toDateInput(activeCase?.fechaAbordaje),
                fechaIngreso:     toDateInput(activeCase?.fechaIngreso),
                fechaReingreso:   toDateInput(activeCase?.fechaReingreso),
                fechaCambioPerfil: toDateInput(activeCase?.fechaCambioPerfil),
                actividadRealizada: activeCase?.actividadRealizada || '',
                tiempoEnCalle: activeCase?.tiempoEnCalle || '',
                condicion: activeCase?.condicion || '',
                horarioInicio: activeCase?.horarioInicio || '',
                horarioFin: activeCase?.horarioFin || '',
                horarioInicio2: activeCase?.horarioInicio2 || '',
                horarioFin2: activeCase?.horarioFin2 || '',
                diasTrabajo: activeCase?.diasTrabajo || '',

                // Familia / Domicilio (compartido, tomamos del main)
                domicilioActual: mainNna.domicilioActual || '',
                referenciaDomicilio: mainNna.referenciaDomicilio || '',
                departamentoDom: mainNna.departamentoDom || '',
                provinciaDom: mainNna.provinciaDom || '',
                distritoDom: mainNna.distritoDom || '',
                telefonoContacto: mainNna.telefonoContacto || '',
                viveCon: (() => {
                    const val = mainNna.viveCon || '';
                    const upper = val.toUpperCase().trim();
                    if (upper === 'SOLO_PADRE') return '1: Solo Padre';
                    if (upper === 'SOLO_MADRE') return '2: Solo Madre';
                    if (upper === 'AMBOS_PADRES') return '3: Padre y madre';
                    if (upper === 'OTROS_FAMILIARES') return '4: Adulto responsable (familia extensa)';
                    if (upper === 'SOLO') return '5: Solo';
                    if (upper === 'AMIGOS' || upper === 'OTRO') return '6: Otro';
                    return val;
                })(),
                detalleViveCon: mainNna.detalleViveCon || '',
                lugarPernocte: mainNna.lugarPernocte || '',
                detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
                nombreTutor: mainNna.nombreTutor || '',
                jornadaSemanal: (() => {
                    let jSaved: any = null;
                    if (mainNna.datosF03) {
                        try {
                            const parsed = typeof mainNna.datosF03 === 'string' 
                                ? JSON.parse(mainNna.datosF03) 
                                : mainNna.datosF03;
                            if (parsed && (parsed.jornadaSemanal || parsed.jornada_semanal)) {
                                jSaved = parsed.jornadaSemanal || parsed.jornada_semanal;
                            }
                        } catch (e) {
                            console.error("Error parsing datosF03 for jackpot", e);
                        }
                    }
                    const res: any = {};
                    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                    if (jSaved) {
                        DIAS.forEach(d => {
                            const match = jSaved[d] || jSaved[d.toLowerCase()] || {};
                            res[d] = {
                                activo: !!match.activo,
                                inicio: match.inicio || '08:00',
                                fin: match.fin || '12:00',
                                inicio2: match.inicio2 || '',
                                fin2: match.fin2 || '',
                                tieneTurno2: !!match.tieneTurno2
                            };
                        });
                        return res;
                    }
                    const diasActivos = activeCase?.diasTrabajo 
                        ? activeCase.diasTrabajo.split(',').map((s: string) => s.trim()) 
                        : [];
                            tipoDiscapApo: mainNna.tipoDiscapApo || '',
                            certDiscapApo: mainNna.certDiscapApo || '',
                        });
                    }

                    return mappedFamiliares;
                })(),
            } as any);
        }
    }, [isEditMode, selectedExpediente, reset]);

    const mapToBackend = (data: NnaFormData, isUpdate: boolean = false) => {
        const toIso = (d: string) => (d && d.trim() !== '') ? new Date(d).toISOString() : null;

        // --- Cómputo Dinámico de Horas, Actividades y Días ---
        const actividades = data.actividadesPerfil || [];

        // 1. Concatenar actividades para columna física actividad_realizada
        const actividadRealizada = actividades.map(act => act.actividad === 'Otro (especificar)' ? act.actividadEspecifique : act.actividad).filter(Boolean).join(', ') || data.actividadRealizada || '';

        // 2. Concatenar tiempos para columna física tiempo_en_calle
        const tiempoEnCalle = actividades.map(act => act.tiempoDetalle || `${act.tiempoValor} ${act.tiempoUnidad}`).filter(Boolean).join(', ') || data.tiempoEnCalle || '';

        // 3. Unificar días laborados para columna física dias_trabajo
        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const diasSet = new Set<string>();
        actividades.forEach(act => {
            if (act.jornada) {
                act.jornada.forEach(j => {
                    if (j.dia) diasSet.add(j.dia);
                });
            }
        });
        const diasActivos = DIAS.filter(d => diasSet.has(d));
        const diasTrabajo = diasActivos.join(', ') || null;

        // 4. Calcular horas semanales y mensuales de todas las actividades
        const calcularHorasDia = (inicio: string, fin: string): number => {
            if (!inicio || !fin) return 0;
            const [h1, m1] = inicio.split(':').map(Number);
            const [h2, m2] = fin.split(':').map(Number);
            if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
            let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diffMin < 0) diffMin += 24 * 60;
            return diffMin / 60;
        };

        const totalSemanal = actividades.reduce((acc, act) => {
            let actHours = 0;
            if (act.jornada) {
                act.jornada.forEach(j => {
                    actHours += calcularHorasDia(j.inicio, j.fin);
                    if (j.tieneTurno2 && j.inicio2 && j.fin2) {
                        actHours += calcularHorasDia(j.inicio2, j.fin2);
                    }
                });
            }
            return acc + actHours;
        }, 0);

        const totalMensual = Math.round(totalSemanal * 4.28 * 10) / 10;

        // 5. Horario de inicio y fin para compatibilidad física de columnas (primer turno de la primera actividad que tenga jornada)
        let horarioInicio = null;
        let horarioFin = null;
        let horarioInicio2 = null;
        let horarioFin2 = null;

        const primeraJornada = actividades.find(act => act.jornada && act.jornada.length > 0)?.jornada[0];
        if (primeraJornada) {
            horarioInicio = primeraJornada.inicio || null;
            horarioFin = primeraJornada.fin || null;
            horarioInicio2 = (primeraJornada.tieneTurno2 && primeraJornada.inicio2) ? primeraJornada.inicio2 : null;
            horarioFin2 = (primeraJornada.tieneTurno2 && primeraJornada.fin2) ? primeraJornada.fin2 : null;
        }

        // 6. Generar una jornada consolidada aplanada por retrocompatibilidad de datos_f03
        const jornadaSemanalConsolidada: any = {};
        DIAS.forEach(d => {
            const jornadasDia = actividades.flatMap(act => act.jornada || []).filter(j => j.dia === d);
            if (jornadasDia.length > 0) {
                const j1 = jornadasDia[0];
                jornadaSemanalConsolidada[d] = {
                    activo: true,
                    inicio: j1.inicio || '08:00',
                    fin: j1.fin || '12:00',
                    inicio2: j1.inicio2 || '',
                    fin2: j1.fin2 || '',
                    tieneTurno2: !!j1.tieneTurno2
                };
            } else {
                jornadaSemanalConsolidada[d] = {
                    activo: false,
                    inicio: '08:00',
                    fin: '12:00',
                    inicio2: '',
                    fin2: '',
                    tieneTurno2: false
                };
            }
        });

        const payload: any = {
            perfil:              data.perfil,
            zona_intervencion:   data.zonaIntervencion,
            distrito_intervencion: data.distritoIntervencion || null,
            situacion_calle:     data.situacionCalle,
            actividad_realizada: actividadRealizada,
            tiempo_en_calle:     tiempoEnCalle,
            condicion:           actividades[0]?.condicion || data.condicion || 'SOLO',
            horario_inicio:      horarioInicio,
            horario_fin:         horarioFin,
            horario_inicio2:     horarioInicio2,
            horario_fin2:        horarioFin2,
            dias_trabajo:        diasTrabajo,
            fecha_abordaje:      toIso(data.fechaAbordaje),
            fecha_ingreso:       toIso(data.fechaIngreso),
            fecha_reingreso:     toIso(data.fechaReingreso),
            fecha_cambio_perfil: toIso(data.fechaCambioPerfil),
        };

        if (!isUpdate) {
            payload.crear_nueva_carpeta = true;
            payload.familiares = (data.familiares || []).map((f: any) => ({
                nombres:    f.nombres,
                parentesco: f.parentesco,
                dni:        f.dni        || null,
                telefono:   f.telefono   || null,
                ocupacion:  f.ocupacion  || null,
                viveCon:    f.viveCon    || 'NO',
            }));
        } else {
            payload.carpeta_id = id ? parseInt(id, 10) : undefined;
        }

        const tutorFamiliar = (data.familiares || []).find((f: any) => f.esTutor === true) || data.familiares?.[0];

        payload.nnas = data.nnas.map((nna: any) => {
            const mapped: any = {
                id: nna.id,
                nombres:                  nna.nombres,
                apellido_paterno:         nna.apellidoPaterno,
                apellido_materno:         nna.apellidoMaterno      || null,
                tipo_doc:                 nna.tipoDoc,
                numero_doc:               nna.numeroDoc            || null,
                sexo:                     nna.sexo,
                nacionalidad:             nna.nacionalidad         || 'PERUANA',
                tiene_partida_nacimiento: nna.tienePartidaNacimiento === 'true' || nna.tienePartidaNacimiento === true,
                detalle_sin_doc:          nna.detalleSinDoc        || null,
                departamento_nac:         nna.departamentoNac      || null,
                provincia_nac:            nna.provinciaNac         || null,
                distrito_nac:             nna.distritoNac          || null,
                domicilio_actual:         data.domicilioActual     || null,
                referencia_domicilio:     data.referenciaDomicilio || null,
                departamento_dom:         data.departamentoDom     || null,
                provincia_dom:            data.provinciaDom        || null,
                distrito_dom:             data.distritoDom         || null,
                telefono_contacto:        data.telefonoContacto    || null,
                nombre_tutor:             tutorFamiliar 
                                            ? `${tutorFamiliar.priApeTutApo || ''} ${tutorFamiliar.segApeTutApo || ''} ${tutorFamiliar.nomApeTutApo || ''}`.trim() 
                                            : (data.familiares?.[0]?.nombres || data.nombreTutor || null),
                vive_con:                 data.viveCon             || null,
                detalle_vive_con:         data.detalleViveCon      || null,
                lugar_pernocte:           data.lugarPernocte       || null,
                detalle_lugar_pernocte:   data.detalleLugarPernocte || null,
                tiene_antecedente_albergue:    String(nna.tieneAntecedenteAlbergue) === 'true',
                detalle_antecedente_albergue:  nna.detalleAntecedenteAlbergue || null,
                afiliado_sis:             nna.afiliadoSIS          || null,
                afiliado_otro_seguro:     nna.afiliadoOtroSeguro   || null,
                detalle_otro_seguro:      nna.detalleOtroSeguro    || null,
                sufre_enfermedad:         String(nna.sufreEnfermedad) === 'SI' || nna.sufreEnfermedad === true,
                detalle_enfermedad:       nna.detalleEnfermedad    || null,
                observaciones_salud:      nna.observacionesSalud   || null,
                tiene_discapacidad:       String(nna.tieneDiscapacidad) === 'true',
                tipo_discapacidad:        nna.tipoDiscapacidad     || null,
                detalle_discapacidad:     nna.detalleDiscapacidad  || null,
                estudia_actualmente:      nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true,
                nivel_educativo:          (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.nivelEducativo || null) : null,
                
                // Mapeo Físico de variables socio-demográficas del Tutor/Apoderado SEC 2026
                tiene_tutor_apo:          tutorFamiliar ? 1 : 0,
                pri_ape_tut_apo:          tutorFamiliar?.priApeTutApo || null,
                seg_ape_tut_apo:          tutorFamiliar?.segApeTutApo || null,
                nom_ape_tut_apo:          tutorFamiliar?.nomApeTutApo || null,
                sexo_apo:                 tutorFamiliar?.sexoApo || null,
                fecha_nac_apo:            (tutorFamiliar?.fechaNacApo && tutorFamiliar.fechaNacApo.trim() !== '') ? new Date(tutorFamiliar.fechaNacApo).toISOString() : null,
                nacionalidad_apo:         tutorFamiliar?.nacionalidadApo || 'PERUANA',
                tip_doc_tut_apo:          tutorFamiliar?.tipDocTutApo || null,
                nro_doc_tut_apo:          tutorFamiliar?.nroDocTutApo || null,
                vin_tut_usu:              tutorFamiliar?.vinTutUsu || null,
                len_mat_apo:              tutorFamiliar?.lenMatApo || null,
                len_mat_esp_apo:          tutorFamiliar?.lenMatEspApo || null,
                aut_ide_et_apo:           tutorFamiliar?.autIdeEtApo || null,
                aut_ide_et_esp_apo:       tutorFamiliar?.autIdeEtEspApo || null,
                tipo_discap_apo:          tutorFamiliar?.tipoDiscapApo || null,
                cert_discap_apo:          tutorFamiliar?.certDiscapApo || null,
                grado_estudio:            (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.gradoEstudio || null) : null,
                institucion_educativa:    (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.institucionEducativa || null) : null,
                modalidad_estudio:        (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.modalidadEstudio || null) : null,
                detalle_no_estudia:       nna.estudiaActualmente === 'PROCESO' 
                    ? (nna.detalleNoEstudia || 'En proceso de matrícula') 
                    : (nna.estudiaActualmente === 'NO_APLICA' 
                        ? (nna.detalleNoEstudia || 'No aplica') 
                        : (nna.detalleNoEstudia || null)),
                edad:                     nna.edad ? parseInt(nna.edad, 10) : null,
                unidad_edad:              nna.unidadEdad           || 'ANIOS',
                actividades_tiempo_libre: nna.actividadesTiempoLibre || null,
                caracteristicas:          nna.caracteristicas      || null,
                
                // Variables socio-demográficas NNA SEC 2026
                len_mat_nna:              nna.lenMatNna            || null,
                len_mat_esp_nna:          (nna.lenMatNna === '9: Otra lengua indígena u originaria' || nna.lenMatNna === '12: Otra lengua extranjera') ? (nna.lenMatEspNna || null) : null,
                aut_ide_et_nna:           nna.autIdeEtNna          || null,
                aut_ide_et_esp_nna:       nna.autIdeEtNna === '8: Otro' ? (nna.autIdeEtEspNna || null) : null,
                cert_discap_nna:          (String(nna.tieneDiscapacidad) === 'true') ? (nna.certDiscapNna || null) : null,
                datos_f03:                JSON.stringify({
                    jornadaSemanal: jornadaSemanalConsolidada,
                    actividadesPerfil: data.actividadesPerfil,
                    horasSemanales: totalSemanal,
                    horasMensuales: totalMensual
                })
            };

            if (nna.fechaNacimiento) mapped.fecha_nacimiento = new Date(nna.fechaNacimiento).toISOString();
            return mapped;
        });

        return payload;
    };

    /**
                    ? (nna.detalleNoEstudia || 'En proceso de matrícula') 
                    : (nna.estudiaActualmente === 'NO_APLICA' 
                        ? (nna.detalleNoEstudia || 'No aplica') 
                        : (nna.detalleNoEstudia || null)),
                edad:                     nna.edad ? parseInt(nna.edad, 10) : null,
                unidad_edad:              nna.unidadEdad           || 'ANIOS',
                actividades_tiempo_libre: nna.actividadesTiempoLibre || null,
                caracteristicas:          nna.caracteristicas      || null,
                
                // Variables socio-demográficas NNA SEC 2026
                len_mat_nna:              nna.lenMatNna            || null,
                len_mat_esp_nna:          (nna.lenMatNna === '9: Otra lengua indígena u originaria' || nna.lenMatNna === '12: Otra lengua extranjera') ? (nna.lenMatEspNna || null) : null,
                aut_ide_et_nna:           nna.autIdeEtNna          || null,
                aut_ide_et_esp_nna:       nna.autIdeEtNna === '8: Otro' ? (nna.autIdeEtEspNna || null) : null,
                cert_discap_nna:          (String(nna.tieneDiscapacidad) === 'true') ? (nna.certDiscapNna || null) : null,
                datos_f03:                JSON.stringify({
                    jornadaSemanal: jornadaSemanalConsolidada,
                    actividadesPerfil: data.actividadesPerfil,
                    horasSemanales: totalSemanal,
                    horasMensuales: totalMensual
                })
            };

            if (nna.fechaNacimiento) mapped.fecha_nacimiento = new Date(nna.fechaNacimiento).toISOString();
            return mapped;

        // 5. Horario de inicio y fin para compatibilidad física de columnas (primer turno de la primera actividad que tenga jornada)
        let horarioInicio = null;
        let horarioFin = null;
        let horarioInicio2 = null;
        let horarioFin2 = null;

        const primeraJornada = actividades.find(act => act.jornada && act.jornada.length > 0)?.jornada[0];
        if (primeraJornada) {
            horarioInicio = primeraJornada.inicio || null;
            horarioFin = primeraJornada.fin || null;
            horarioInicio2 = (primeraJornada.tieneTurno2 && primeraJornada.inicio2) ? primeraJornada.inicio2 : null;
            horarioFin2 = (primeraJornada.tieneTurno2 && primeraJornada.fin2) ? primeraJornada.fin2 : null;
        }

        // 6. Generar una jornada consolidada aplanada por retrocompatibilidad de datos_f03
        const jornadaSemanalConsolidada: any = {};
        DIAS.forEach(d => {
            const jornadasDia = actividades.flatMap(act => act.jornada || []).filter(j => j.dia === d);
            if (jornadasDia.length > 0) {
                const j1 = jornadasDia[0];
                jornadaSemanalConsolidada[d] = {
                    activo: true,
                    inicio: j1.inicio || '08:00',
                    fin: j1.fin || '12:00',
                    inicio2: j1.inicio2 || '',
                    fin2: j1.fin2 || '',
                    tieneTurno2: !!j1.tieneTurno2
                };
            } else {
                jornadaSemanalConsolidada[d] = {
                    activo: false,
                    inicio: '08:00',
                    fin: '12:00',
                    inicio2: '',
                    fin2: '',
                    tieneTurno2: false
                };
            }
        });

        const payload: any = {
            perfil:              data.perfil,
            zona_intervencion:   data.zonaIntervencion,
            distrito_intervencion: data.distritoIntervencion || null,
            situacion_calle:     data.situacionCalle,
            actividad_realizada: actividadRealizada,
            tiempo_en_calle:     tiempoEnCalle,
            condicion:           actividades[0]?.condicion || data.condicion || 'SOLO',
            horario_inicio:      horarioInicio,
            horario_fin:         horarioFin,
            horario_inicio2:     horarioInicio2,
            horario_fin2:        horarioFin2,
            dias_trabajo:        diasTrabajo,
            fecha_abordaje:      toIso(data.fechaAbordaje),
            fecha_ingreso:       toIso(data.fechaIngreso),
            fecha_reingreso:     toIso(data.fechaReingreso),
            fecha_cambio_perfil: toIso(data.fechaCambioPerfil),
        };

        if (!isUpdate) {
            payload.crear_nueva_carpeta = true;
            payload.familiares = (data.familiares || []).map((f: any) => ({
                nombres:    f.nombres,
                parentesco: f.parentesco,
                dni:        f.dni        || null,
                telefono:   f.telefono   || null,
                ocupacion:  f.ocupacion  || null,
                viveCon:    f.viveCon    || 'NO',
            }));
        } else {
            payload.carpeta_id = id ? parseInt(id, 10) : undefined;
        }

        const tutorFamiliar = (data.familiares || []).find((f: any) => f.esTutor === true) || data.familiares?.[0];

        payload.nnas = data.nnas.map((nna: any) => {
            // Cómputo cuantitativo de uso de tiempo para este NNA
            const ut = nna.usoTiempo || {};
            const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            let sumEstudiar = 0;
            let sumTrabajar = 0;
            let sumDormir = 0;
            let sumJugar = 0;
            
            DIAS.forEach(d => {
                const diaData = ut[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
                sumEstudiar += Number(diaData.estudiar) || 0;
                sumTrabajar += Number(diaData.trabajar) || 0;
                sumDormir += Number(diaData.dormir) || 0;
                sumJugar += Number(diaData.jugar) || 0;
            });
            
            const promedioSueño = Math.round((sumDormir / 7) * 10) / 10;
            let evalRiesgo = 'Sin Riesgo';
            if (sumTrabajar > 30 || promedioSueño < 6) {
                evalRiesgo = 'Riesgo Crítico';
            } else if (sumTrabajar > 14 || promedioSueño < 8 || sumTrabajar > sumEstudiar) {
                evalRiesgo = 'Riesgo Moderado';
            } else if (sumTrabajar > 0) {
                evalRiesgo = 'Riesgo Leve';
            }
            
            let resumenLibre = `Estudiar: ${sumEstudiar}h/sem, Trabajar: ${sumTrabajar}h/sem, Dormir: ${sumDormir}h/sem, Jugar: ${sumJugar}h/sem. Diagnóstico: ${evalRiesgo}.`;
            if (promedioSueño < 8) resumenLibre += ' Alerta: Privación de Sueño.';
            if (sumTrabajar > sumEstudiar) resumenLibre += ' Alerta: Interferencia Educativa.';
            if (nna.actividadesTiempoLibre && nna.actividadesTiempoLibre.trim() !== '') {
                resumenLibre += ` Detalle cualitativo: ${nna.actividadesTiempoLibre}`;
            }

            const mapped: any = {
                id: nna.id,
                nombres:                  nna.nombres,
                apellido_paterno:         nna.apellidoPaterno,
                apellido_materno:         nna.apellidoMaterno      || null,
                tipo_doc:                 nna.tipoDoc,
                numero_doc:               nna.numeroDoc            || null,
                sexo:                     nna.sexo,
                nacionalidad:             nna.nacionalidad         || 'PERUANA',
                tiene_partida_nacimiento: nna.tienePartidaNacimiento === 'true' || nna.tienePartidaNacimiento === true,
                detalle_sin_doc:          nna.detalleSinDoc        || null,
                departamento_nac:         nna.departamentoNac      || null,
                provincia_nac:            nna.provinciaNac         || null,
                distrito_nac:             nna.distritoNac          || null,
                domicilio_actual:         data.domicilioActual     || null,
                referencia_domicilio:     data.referenciaDomicilio || null,
                departamento_dom:         data.departamentoDom     || null,
                provincia_dom:            data.provinciaDom        || null,
                distrito_dom:             data.distritoDom         || null,
                telefono_contacto:        data.telefonoContacto    || null,
                nombre_tutor:             tutorFamiliar 
                                            ? `${tutorFamiliar.priApeTutApo || ''} ${tutorFamiliar.segApeTutApo || ''} ${tutorFamiliar.nomApeTutApo || ''}`.trim() 
                                            : (data.familiares?.[0]?.nombres || data.nombreTutor || null),
                vive_con:                 data.viveCon             || null,
                detalle_vive_con:         data.detalleViveCon      || null,
                lugar_pernocte:           data.lugarPernocte       || null,
                detalle_lugar_pernocte:   data.detalleLugarPernocte || null,
                tiene_antecedente_albergue:    String(nna.tieneAntecedenteAlbergue) === 'true',
                detalle_antecedente_albergue:  nna.detalleAntecedenteAlbergue || null,
                afiliado_sis:             nna.afiliadoSIS          || null,
                afiliado_otro_seguro:     nna.afiliadoOtroSeguro   || null,
                detalle_otro_seguro:      nna.detalleOtroSeguro    || null,
                sufre_enfermedad:         String(nna.sufreEnfermedad) === 'SI' || nna.sufreEnfermedad === true,
                detalle_enfermedad:       nna.detalleEnfermedad    || null,
                observaciones_salud:      nna.observacionesSalud   || null,
                tiene_discapacidad:       String(nna.tieneDiscapacidad) === 'true',
                tipo_discapacidad:        nna.tipoDiscapacidad     || null,
                detalle_discapacidad:     nna.detalleDiscapacidad  || null,
                estudia_actualmente:      nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true,
                nivel_educativo:          (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.nivelEducativo || null) : null,
                
                // Mapeo Físico de variables socio-demográficas del Tutor/Apoderado SEC 2026
                tiene_tutor_apo:          tutorFamiliar ? 1 : 0,
                pri_ape_tut_apo:          tutorFamiliar?.priApeTutApo || null,
                seg_ape_tut_apo:          tutorFamiliar?.segApeTutApo || null,
                nom_ape_tut_apo:          tutorFamiliar?.nomApeTutApo || null,
                sexo_apo:                 tutorFamiliar?.sexoApo || null,
                fecha_nac_apo:            (tutorFamiliar?.fechaNacApo && tutorFamiliar.fechaNacApo.trim() !== '') ? new Date(tutorFamiliar.fechaNacApo).toISOString() : null,
                nacionalidad_apo:         tutorFamiliar?.nacionalidadApo || 'PERUANA',
                tip_doc_tut_apo:          tutorFamiliar?.tipDocTutApo || null,
                nro_doc_tut_apo:          tutorFamiliar?.nroDocTutApo || null,
                vin_tut_usu:              tutorFamiliar?.vinTutUsu || null,
                len_mat_apo:              tutorFamiliar?.lenMatApo || null,
                len_mat_esp_apo:          tutorFamiliar?.lenMatEspApo || null,
                aut_ide_et_apo:           tutorFamiliar?.autIdeEtApo || null,
                aut_ide_et_esp_apo:       tutorFamiliar?.autIdeEtEspApo || null,
                tipo_discap_apo:          tutorFamiliar?.tipoDiscapApo || null,
                cert_discap_apo:          tutorFamiliar?.certDiscapApo || null,
                grado_estudio:            (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.gradoEstudio || null) : null,
                institucion_educativa:    (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.institucionEducativa || null) : null,
                modalidad_estudio:        (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === true) ? (nna.modalidadEstudio || null) : null,
                detalle_no_estudia:       nna.estudiaActualmente === 'PROCESO' 
                    ? (nna.detalleNoEstudia || 'En proceso de matrícula') 
                    : (nna.estudiaActualmente === 'NO_APLICA' 
                        ? (nna.detalleNoEstudia || 'No aplica') 
                        : (nna.detalleNoEstudia || null)),
                edad:                     nna.edad ? parseInt(nna.edad, 10) : null,
                unidad_edad:              nna.unidadEdad           || 'ANIOS',
                actividades_tiempo_libre: resumenLibre, // <-- Guardamos el diagnóstico consolidado
                caracteristicas:          nna.caracteristicas      || null,
                
                // Variables socio-demográficas NNA SEC 2026
                len_mat_nna:              nna.lenMatNna            || null,
                len_mat_esp_nna:          (nna.lenMatNna === '9: Otra lengua indígena u originaria' || nna.lenMatNna === '12: Otra lengua extranjera') ? (nna.lenMatEspNna || null) : null,
                aut_ide_et_nna:           nna.autIdeEtNna          || null,
                aut_ide_et_esp_nna:       nna.autIdeEtNna === '8: Otro' ? (nna.autIdeEtEspNna || null) : null,
                cert_discap_nna:          (String(nna.tieneDiscapacidad) === 'true') ? (nna.certDiscapNna || null) : null,
                datos_f03:                JSON.stringify({
                    jornadaSemanal:   jornadaSemanalConsolidada,
                    actividadesPerfil: data.actividadesPerfil,
                    horasSemanales:    totalSemanal,
                    horasMensuales:    totalMensual,
                    usoTiempo:         ut, // <-- Matriz completa guardada en el CLOB
                    totalesUsoTiempo:  { estudiar: sumEstudiar, trabajar: sumTrabajar, dormir: sumDormir, jugar: sumJugar }
                })
            };

            if (nna.fechaNacimiento) mapped.fecha_nacimiento = new Date(nna.fechaNacimiento).toISOString();
            return mapped;
        });

        return payload;
    };

    /**
     * Se ejecuta cuando react-hook-form detecta campos inválidos al intentar guardar.
     * Mapea los errores a secciones del formulario para mostrar un aviso claro.
     */
    const onFormError = (errs: any) => {
        const seccionesConError: string[] = [];

        const paso1Keys = ['zonaIntervencion', 'perfil', 'situacionCalle', 'fechaAbordaje', 'fechaIngreso'];
        const paso3Keys = ['actividadRealizada', 'tiempoEnCalle', 'condicion'];

        if (paso1Keys.some(k => errs[k])) seccionesConError.push('I. Datos Generales');
        if (errs.nnas) {
            // nnas es un array — buscamos qué campos fallan
            const nnasErrs = errs.nnas || [];

            const hasPersonal = nnasErrs.some((e: any) => e && personalFields.some(f => e[f]));
            const hasEduc = nnasErrs.some((e: any) => e && educFields.some(f => e[f]));
            const hasSalud = nnasErrs.some((e: any) => e && saludFields.some(f => e[f]));

            if (hasPersonal) seccionesConError.push('II. Datos Personales');
            if (hasEduc) seccionesConError.push('IV. Educación');
            if (hasSalud) seccionesConError.push('V. Salud');
        }
        if (paso3Keys.some(k => errs[k])) seccionesConError.push('III. Datos Perfil');

        const msg = seccionesConError.length > 0
            ? `Faltan campos obligatorios en: ${seccionesConError.join(', ')}. Por favor completa esas secciones antes de guardar.`
            : 'Hay campos obligatorios sin completar. Por favor revisa el formulario.';

        setSubmitValidationMsg(msg);
        // Auto-navegar a la primera sección con error
        if (seccionesConError[0]?.includes('I.')) setActiveSection('paso1_generales');
        else if (seccionesConError[0]?.includes('II.')) setActiveSection('paso2_personales');
        else if (seccionesConError[0]?.includes('III.')) setActiveSection('paso3_perfil');
        else if (seccionesConError[0]?.includes('IV.')) setActiveSection('paso4_educacion');
        else if (seccionesConError[0]?.includes('V.')) setActiveSection('paso5_salud');
    };

    /** Guarda definitivamente (sin verificación de duplicados). */
    const doSubmit = async (data: NnaFormData) => {
        setSubmitting(true);
        try {
            if (isEditMode) {
                // UPDATE: El backend ahora maneja familiares dentro de BatchUpdateRequest
                const payload = mapToBackend(data, true);
                payload.familiares = (data.familiares || []).map((f: any) => ({
                    nombres:    f.nombres,
                    parentesco: f.parentesco,
                    dni:        f.dni        || null,
                    telefono:   f.telefono   || null,
                    ocupacion:  f.ocupacion  || null,
                    viveCon:    f.viveCon    || 'NO',
                }));
                await updateExpediente(payload);
                navigate('/nna');
            } else {
                // CREATE: RegistrarNnaRequest ya incluye familiares vía mapToBackend
                const payload = mapToBackend(data, false);
                // Aseguramos que familiares se mapeen correctamente antes del envío
                payload.familiares = (data.familiares || []).map((f: any) => ({
                    nombres:    f.nombres,
                    parentesco: f.parentesco,
                    dni:        f.dni        || null,
                    telefono:   f.telefono   || null,
                    ocupacion:  f.ocupacion  || null,
                    viveCon:    f.viveCon    || 'NO',
                }));

                console.log('[F03] payload enviado al backend:', JSON.stringify(payload, null, 2));
                const result = await createNna(payload);
                console.log('[F03] respuesta del backend:', result);

                navigate('/nna');
            }
        } catch (e) {
            console.error("Submission failed", e);
            alert("Error al guardar: " + e);
        } finally {
            setSubmitting(false);
        }
    };

    /** Pre-submit: verifica duplicados por cada NNA antes de guardar (solo modo creación). */
    const onSubmit = async (data: NnaFormData) => {
        setSubmitValidationMsg(null); // Limpiar banner si la validación pasó
        if (isEditMode) {
            await doSubmit(data);
            return;
        }

        // Llamar al endpoint por cada NNA del formulario para validar de forma exhaustiva antes de guardar
        const token = useAuthStore.getState().token || '';
        const coincidenciasPorNna: { nnaIdx: number; nombre: string; coincidencias: any[] }[] = [];
        let primerConflictoIdx: number | null = null;
        let tieneErrorBloqueante = false;

        for (let i = 0; i < data.nnas.length; i++) {
            const nna = data.nnas[i];
            if (!nna.nombres.trim() || !nna.apellidoPaterno.trim()) continue;
            try {
                const res = await fetch(`${NNA_API_URL}/nna/verificar-duplicados`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        nombres: nna.nombres,
                        apellido_paterno: nna.apellidoPaterno,
                        apellido_materno: nna.apellidoMaterno || null,
                        numero_doc: nna.numeroDoc || null,
                        tipo_doc: nna.tipoDoc || 'SIN_DOC',
                    }),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.hayDuplicados && json.coincidencias.length > 0) {
                        coincidenciasPorNna.push({
                            nnaIdx: i,
                            nombre: `${nna.apellidoPaterno} ${nna.apellidoMaterno || ''} ${nna.nombres}`.trim(),
                            coincidencias: json.coincidencias,
                        });

                        const docBuscado = nna.numeroDoc ? String(nna.numeroDoc).toUpperCase().trim() : '';
                        const esDniDuplicado = docBuscado && json.coincidencias.some(
                            (c: any) => c.numeroDoc && String(c.numeroDoc).trim() === docBuscado
                        );

                        if (esDniDuplicado) {
                            setNnaSemaforo(prev => ({ ...prev, [i]: 'error' }));
                            tieneErrorBloqueante = true;
                        } else {
                            setNnaSemaforo(prev => ({ ...prev, [i]: 'warning' }));
                        }

                        if (primerConflictoIdx === null) {
                            primerConflictoIdx = i;
                        }
                    } else {
                        setNnaSemaforo(prev => ({ ...prev, [i]: 'clean' }));
                    }
                }
            } catch (err) {
                console.warn(`[verificar-duplicados] Error al consultar NNA ${i}:`, err);
                setNnaSemaforo(prev => ({ ...prev, [i]: 'clean' }));
            }
        }
        
        if (tieneErrorBloqueante) {
            setSubmitValidationMsg('Se ha detectado un NNA con el mismo DNI ya registrado en el sistema. Por favor, verifica los datos antes de continuar.');
            if (primerConflictoIdx !== null) {
                setActiveSection('paso2_personales');
            }
            return;
        }
        
        if (coincidenciasPorNna.length > 0) {
            setDuplicadosData(coincidenciasPorNna);
            setDrawerNnaIdx(primerConflictoIdx ?? 0);
            setDrawerOpen(true);
            return;
        }
        
        await doSubmit(data);
    };

    const sections = [
        { id: 'paso1_generales', label: 'I. Datos Generales', icon: MapPin, description: 'Intervencion y Fechas' },
        { id: 'paso2_personales', label: 'II. Datos Personales', icon: Users, description: 'Identidad, Domicilio y Contacto' },
        { id: 'paso3_perfil', label: 'III. Datos Perfil', icon: Briefcase, description: 'Actividad en Calle' },
        { id: 'paso4_educacion', label: 'IV. Educacion', icon: School, description: 'Situacion Educativa' },
        { id: 'paso5_salud', label: 'V. Salud', icon: HeartPulse, description: 'Seguro y Discapacidad' },
        { id: 'paso6_familia', label: 'VI. Familia / Otros', icon: Home, description: 'Vivienda y Observaciones' },
    ];

    const handleNext = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex < sections.length - 1) setActiveSection(sections[currentIndex + 1].id);
    };

    const handlePrev = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex > 0) setActiveSection(sections[currentIndex - 1].id);
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-0px)] gap-0 bg-slate-50 overflow-hidden">
            {/* SIDEBAR DE SECCIONES */}
            <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-100 bg-blue-600">
                    <p className="text-white font-bold text-sm leading-tight">Ficha de InscripciÃ³n</p>
                    <p className="text-blue-200 text-[11px] mt-0.5">Formato F03 Â· Registro Oficial</p>
                </div>
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {sections.map((section, idx) => {
                        const isActive = activeSection === section.id;
                        const isPast = sections.findIndex(s => s.id === activeSection) > idx;
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                type="button"
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : isPast
                                            ? "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                            : "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                )}
                            >
                                <div className={clsx(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : isPast
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-100 text-gray-400"
                                )}>
                                    {idx + 1}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon size={14} className="flex-shrink-0" />
                                    <span className="text-xs font-semibold truncate leading-tight">
                                        {section.label.replace(/^[IVX]+\.\s/, '')}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">Progreso</span>
                        <span className="text-[10px] text-blue-600 font-bold">
                            {sections.findIndex(s => s.id === activeSection) + 1}/{sections.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* MAIN FORM */}
            <main className="flex-1 bg-white flex flex-col overflow-hidden relative">
                <form onSubmit={handleSubmit(onSubmit, onFormError)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-8">
                        {submitValidationMsg && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-fadeIn shadow-sm">
                                âš ï¸ {submitValidationMsg}
                            </div>
                        )}
                        {storeError && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {storeError}
                            </div>
                        )}

                        {/* ====== PASO 1: I. DATOS GENERALES ====== */}
                        {activeSection === 'paso1_generales' && (
                            <div className="space-y-6 animate-fadeIn">
                                <SectionHeader title="I. Datos Generales" subtitle="UbicaciÃ³n de la intervenciÃ³n y marco temporal." />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <InputField
                                            label="Zona de IntervenciÃ³n (Lugar especÃ­fico)"
                                            register={register('zonaIntervencion', { required: 'La zona es obligatoria' })}
                                            placeholder="Ej: Plaza de Armas, Jr. Comercio..."
                                            error={errors.zonaIntervencion}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Perfil del NNA (SituaciÃ³n Identificada)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['TRABAJO_EN_CALLE', 'MENDICIDAD', 'VIDA_EN_CALLE', 'EXPLOTACION_SEXUAL'].map((perf) => (
                                            <label key={perf} className={clsx(
                                                "cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                                                watch('perfil') === perf ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200"
                                            )}>
                                                <input type="radio" value={perf} {...register('perfil', { required: true })} className="sr-only" />
                                                <span className="font-bold text-xs text-gray-600 block text-center uppercase">{perf.replace(/_/g, ' ')}</span>
                                                <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", watch('perfil') === perf ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                                    {watch('perfil') === perf && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Modalidad de Permanencia (SituaciÃ³n)</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="TRANSITO_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situaciÃ³n' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">TrÃ¡nsito en Calle</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="CONVIVENCIA_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situaciÃ³n' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">Convivencia en Calle (Pernocte)</span>
                                        </label>
                                    </div>
                                    {errors.situacionCalle && <span className="text-red-500 text-xs font-bold mt-1">Este campo es requerido.</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                                    <InputField type="date" label="Fecha de Abordaje" register={register('fechaAbordaje')} />
                                    <InputField type="date" label="Fecha de Ingreso" register={register('fechaIngreso')} />
                                    <InputField type="date" label="Fecha Reingreso" register={register('fechaReingreso')} />
                                    <InputField type="date" label="Fecha Cambio Perfil" register={register('fechaCambioPerfil')} />
                                </div>
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 2: II. DATOS PERSONALES */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso2_personales' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="II. Datos Personales del NNA" subtitle="Información de identidad y ubicación." />

                                {/* BLOQUE INICIAL DE DOMICILIO Y CONTACTO (COMPARTIDO) */}
                                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-6 group hover:border-blue-300 transition-all">
                                    <h3 className="text-sm font-black text-blue-900 uppercase mb-4 flex items-center gap-2">
                                        <MapPin size={16} /> Domicilio Actual y Contacto
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="Dirección exacta" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Referencia" register={register('referenciaDomicilio')} placeholder="Referencia de ubicación" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label"><span className="label-text font-bold text-gray-700">Ubicación Geográfica</span></label>
                                            <UbigeoFields
                                                departamento={watch('departamentoDom')}
                                                provincia={watch('provinciaDom')}
                                                distrito={watch('distritoDom')}
                                                onChange={({ departamento, provincia, distrito }) => {
                                                    setValue('departamentoDom', departamento);
                                                    setValue('provinciaDom', provincia);
                                                    setValue('distritoDom', distrito);
                                                }}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Teléfono de Referencia" register={register('telefonoContacto')} placeholder="999..." />
                                        </div>
                                    </div>
                                </div>

                                {/* LISTA DE NNAS */}
                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 relative mt-6">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                                             <div className="flex items-center gap-2 flex-wrap">
                                                 <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                     <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                                                     Datos del NNA {index > 0 ? '(Hermano)' : ''}
                                                 </h3>
                                                 
                                                 {/* SEMÁFORO INTERACTIVO PREMIUM */}
                                                 <div className="flex items-center gap-2">
                                                     {nnaBuscando[index] && (
                                                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 animate-pulse">
                                                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
                                                             Verificando...
                                                         </span>
                                                     )}
                                                     {!nnaBuscando[index] && nnaSemaforo[index] === 'clean' && (
                                                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-fadeIn">
                                                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                             ✓ Único
                                                         </span>
                                                     )}
                                                     {!nnaBuscando[index] && nnaSemaforo[index] === 'warning' && (
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const todosValores = getValues('nnas') as any[];
                                                                 const v = todosValores?.[index];
                                                                 const nombreCompleto = `${normStr(v?.apellidoPaterno || '')} ${normStr(v?.apellidoMaterno || '')} ${normStr(v?.nombres || '')}`.trim();
                                                                 setDuplicadosData(prev => {
                                                                     const filtrado = prev.filter(item => item.nnaIdx !== index);
                                                                     return [...filtrado, { nnaIdx: index, nombre: nombreCompleto, coincidencias: nnaDuplicadoAlerta[index] || [] }];
                                                                 });
                                                                 setDrawerNnaIdx(index);
                                                                 setDrawerOpen(true);
                                                             }}
                                                             className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 transition-all cursor-pointer shadow-sm animate-pulse"
                                                         >
                                                             <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                             ⚠ Homónimos (Comparar)
                                                         </button>
                                                     )}
                                                     {!nnaBuscando[index] && nnaSemaforo[index] === 'error' && (
                                                         <button
                                                             type="button"
                                                             onClick={() => {
                                                                 const todosValores = getValues('nnas') as any[];
                                if (horas <= 14) return { etiqueta: 'Riesgo Bajo (Jornada Permitida)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', desc: 'Dentro del rango de trabajo ligero protegido para adolescentes.' };
                                if (horas <= 30) return { etiqueta: 'Riesgo Moderado (Jornada Excesiva)', color: 'bg-amber-50 text-amber-800 border-amber-200', desc: 'Alerta: Jornada sobrecargada. Interfiere con el desarrollo y educación del menor.' };
                                return { etiqueta: 'Riesgo Crítico (Explotación Severa)', color: 'bg-rose-50 text-rose-900 border-rose-200 shadow-sm animate-pulse', desc: '¡Peligro!: Jornada severa que atenta contra la integridad del menor.' };
                            };
                            
                            const riesgo = getRiesgoInfo(horasSemanalesCalculadas);

                            return (
                                <div className="space-y-8 animate-fadeIn">
                                    <SectionHeader title="III. Datos Según Perfil" subtitle="Detalle de actividades en calle y jornadas horarias programadas." />

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        
                                        {/* COLUMNA IZQUIERDA: GRILLA DE ACTIVIDADES */}
                                        <div className="lg:col-span-2 space-y-6">
                                            
                                            {/* Grilla principal de actividades */}
                                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                                <div className="flex items-center justify-between border-b pb-3">
                                                    <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-2">
                                                        <Briefcase className="w-5 h-5 text-blue-600" />
                                                        <span>🛠️ Actividades en Calle</span>
                                                    </h3>
                                                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                                                        {actividades.length} {actividades.length === 1 ? 'actividad' : 'actividades'}
                                                    </span>
                                                </div>

                                                {actividades.length === 0 ? (
                                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
                                                        <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                                                        <span className="block text-sm font-black text-slate-700 uppercase">Sin actividades registradas</span>
                                                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Haz clic en el botón de abajo para registrar las actividades, el tiempo y la agenda semanal del menor.</p>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Actividad / Trabajo</th>
                                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Acompañamiento</th>
                                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Permanencia</th>
                                                                    <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Agenda Semanal</th>
                                                                    <th scope="col" className="px-4 py-3 text-center text-xs font-black text-slate-600 uppercase tracking-wider">Hrs/Sem</th>
                                                                    <th scope="col" className="px-4 py-3 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Acciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-slate-100">
                                                                {actividades.map((act, index) => {
                                                                    // Calcular horas de esta actividad
                                                                    const actHours = (act.jornada || []).reduce((sum, j) => {
                                                                        let h = calcularHorasDia(j.inicio, j.fin);
                                                                        if (j.tieneTurno2 && j.inicio2 && j.fin2) {
                                                                            h += calcularHorasDia(j.inicio2, j.fin2);
                                                                        }
                                                                        return sum + h;
                                                                    }, 0);

                                                                    return (
                                                                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                                                    <span className="text-xs font-bold text-slate-800 uppercase block">
                                                                                        {act.actividad === 'Otro (especificar)' ? act.actividadEspecifique : act.actividad}
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                                <span className={clsx(
                                                                                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase border",
                                                                                    act.condicion === 'SOLO' ? "bg-slate-50 text-slate-600 border-slate-200" :
                                                                                    act.condicion === 'PARES' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                                    "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                                )}>
                                                                                    {act.condicion === 'SOLO' ? 'Solo' :
                                                                                     act.condicion === 'PARES' ? 'Pares' : 'Familiar'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-4 whitespace-nowrap">
                                                                                <span className="text-xs text-slate-500 block">⏱️ {act.tiempoDetalle}</span>
                                                                            </td>
                                                                            <td className="px-4 py-4">
                                                                                <div className="space-y-2">
                                                                                    {/* Mini-calendario semanal premium */}
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((d) => {
                                                                                            const jDia = (act.jornada || []).find(j => j.dia === d);
                                                                                            const isAct = !!jDia;
                                                                                            const has2 = !!jDia?.tieneTurno2;
                                                                                            const letter = d === 'Miércoles' ? 'X' : d[0];
                                                                                            return (
                                                                                                <span 
                                                                                                    key={d} 
                                                                                                    title={jDia ? `${d}: ${jDia.inicio}-${jDia.fin}${jDia.tieneTurno2 ? ` y ${jDia.inicio2}-${jDia.fin2}` : ''}` : `${d}: No programado`}
                                                                                                    className={clsx(
                                                                                                        "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all cursor-default select-none shadow-sm",
                                                                                                        isAct 
                                                                                                            ? (has2 ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-blue-600 font-extrabold shadow" : "bg-blue-500 text-white border-blue-500 font-extrabold shadow") 
                                                                                                            : "bg-slate-50 text-slate-350 border-slate-200/50"
                                                                                                    )}
                                                                                                >
                                                                                                    {letter}
                                                                                                </span>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <span className="text-sm font-black text-slate-700">{actHours.toFixed(1)}h</span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => abrirModalActividad(index)} 
                                                                                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all" 
                                                                                        title="Editar actividad"
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </button>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => eliminarActividadDelForm(index)} 
                                                                                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all" 
                                                                                        title="Eliminar actividad"
                                                                                    >
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => abrirModalActividad()}
                                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-slate-500 hover:text-blue-600 font-bold transition-all flex items-center justify-center gap-2 group"
                                            >
                                                <Plus size={20} className="group-hover:text-blue-600 transition-colors" />
                                                Agregar Actividad en Calle
                                            </button>
                                        </div>

                                        {/* COLUMNA DERECHA: RESUMEN DE RIESGO */}
                                        <div className="lg:col-span-1 space-y-6">
                                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5 sticky top-4">
                                                <h3 className="text-sm font-black text-gray-800 uppercase flex items-center gap-2 border-b pb-3">
                                                    <span className="w-5 h-5 flex items-center justify-center rounded bg-slate-800 text-white text-[10px]">!</span>
                                                    AnÃ¡lisis de Riesgo
                                                </h3>

                                                {/* Total horas semanales */}
                                                <div className="space-y-2">
                                                    <span className="text-xs text-slate-500 uppercase font-bold block">Total Horas Semanales</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-3xl font-black text-slate-800">{horasSemanalesCalculadas.toFixed(1)}</span>
                                                        <span className="text-sm text-slate-400 font-medium">hrs</span>
                                                    </div>
                                                </div>

                                                {/* Barra de progreso de riesgo */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                                                        <span>0h</span>
                                                        <span>14h</span>
                                                        <span>30h</span>
                                                        <span>72h+</span>
                                                    </div>
                                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                        <div 
                                                            className={clsx(
                                                                "h-full rounded-full transition-all duration-500",
                                                                horasSemanalesCalculadas <= 14 ? "bg-emerald-500" : horasSemanalesCalculadas <= 30 ? "bg-amber-500" : "bg-rose-500"
                                                            )}
                                                            style={{ width: `${Math.min(100, (horasSemanalesCalculadas / 72) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Badge de riesgo */}
                                                <div className={clsx("p-4 rounded-xl border", riesgo.color)}>
                                                    <span className="block text-xs font-black uppercase mb-1">{riesgo.etiqueta}</span>
                                                    <p className="text-[11px] leading-relaxed opacity-80">{riesgo.desc}</p>
                                                </div>

                                                {/* Detalle de actividades */}
                                                {actividades.length > 0 && (
                                                    <div className="border-t border-slate-100 pt-4 space-y-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase block">Desglose por Actividad</span>
                                                        {actividades.map((act, i) => {
                                                            const actHours = (act.jornada || []).reduce((sum, j) => {
                                                                let h = calcularHorasDia(j.inicio, j.fin);
                                                                if (j.tieneTurno2 && j.inicio2 && j.fin2) {
                                                                    h += calcularHorasDia(j.inicio2, j.fin2);
                                                                }
                                                                return sum + h;
                                                            }, 0);
                                                            return (
                                                                <div key={i} className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                        <span className="text-slate-600 font-medium truncate max-w-[120px]">
                                                                            {act.actividad === 'Otro (especificar)' ? act.actividadEspecifique : act.actividad}
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-black text-slate-700 tabular-nums">{actHours.toFixed(1)}h</span>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="flex items-center justify-between text-xs font-black border-t border-slate-200 pt-2 mt-1">
                                                            <span className="text-slate-500 uppercase">Total</span>
                                                            <span className="text-slate-800">{horasSemanalesCalculadas.toFixed(1)}h</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Info adicional */}
                                                <div className="border-t border-slate-100 pt-4 space-y-1.5">
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-400">Actividades</span>
                                                        <span className="font-bold text-slate-700">{actividades.length}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-400">DÃ­as activos</span>
                                                        <span className="font-bold text-slate-700">
                                                            {(() => {
                                                                const diasSet = new Set<string>();
                                                                actividades.forEach(a => (a.jornada || []).forEach(j => diasSet.add(j.dia)));
                                                                return diasSet.size;
                                                            })()}/7
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px]">
                                                        <span className="text-slate-400">CondiciÃ³n predominante</span>
                                                        <span className="font-bold text-slate-700">
                                                            {(() => {
                                                                const counts: Record<string, number> = {};
                                                                actividades.forEach(a => { const c = a.condicion || 'SOLO'; counts[c] = (counts[c] || 0) + 1; });
                                                                const max = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                                                                return max ? (max[0] === 'SOLO' ? 'Solo' : max[0] === 'PARES' ? 'Pares' : 'Familiar') : 'N/A';
                                                            })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                                    {isActivityModalOpen && (
                                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto">
                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                                                
                                                {/* Cabecera del modal */}
                                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                                    <div>
                                                        <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                                                            {editingActivityIndex !== null ? '✏️ Editar Actividad en Calle' : '➕ Agregar Actividad en Calle'}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">Configura la actividad, la permanencia de tiempo y su agenda semanal de horarios.</p>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setIsActivityModalOpen(false)} 
                                                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Cuerpo del modal */}
                                                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                                                    
                                                    {/* Actividad */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-700 uppercase block">¿Qué actividad realiza?</label>
                                                        <select
                                                            value={modalActividad}
                                                            onChange={(e) => setModalActividad(e.target.value)}
                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm bg-white"
                                                        >
                                                            <option value="">-- SELECCIONA UNA ACTIVIDAD --</option>
                                                            {OPCIONES_ACTIVIDAD_CALLE.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        
                                                        {modalActividad === 'Otro (especificar)' && (
                                                            <div className="pt-2 animate-slideDown">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Especifica la actividad</label>
                                                                <input
                                                                    type="text"
                                                                    value={modalActividadEspecifique}
                                                                    onChange={(e) => setModalActividadEspecifique(e.target.value)}
                                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm uppercase"
                                                                    placeholder="Escribe la actividad específica"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Duración / Hace cuánto */}
                                                    <div className="space-y-3">
                                                        <label className="text-xs font-black text-slate-700 uppercase block">¿Hace cuánto tiempo realiza esta actividad en calle?</label>
                                                        
                                                        {/* Selector de modo */}
                                                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalTiempoModo('simple')}
                                                                className={clsx(
                                                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                                                    modalTiempoModo === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                                )}
                                                            >
                                                                ⏱️ Registro Simple
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalTiempoModo('detalle')}
                                                                className={clsx(
                                                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                                                    modalTiempoModo === 'detalle' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                                )}
                                                            >
                                                                📝 Escribir Detalle
                                                            </button>
                                                        </div>

                                                        {modalTiempoModo === 'simple' ? (
                                                            <div className="grid grid-cols-2 gap-4 max-w-md animate-slideDown">
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Cantidad</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={modalTiempoValor}
                                                                        onChange={(e) => setModalTiempoValor(e.target.value)}
                                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Unidad de Tiempo</span>
                                                                    <select
                                                                        value={modalTiempoUnidad}
                                                                        onChange={(e) => setModalTiempoUnidad(e.target.value)}
                                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm bg-white"
                                                                    >
                                                                        <option value="Días">Día(s)</option>
                                                                        <option value="Semanas">Semana(s)</option>
                                                                        <option value="Meses">Mes(es)</option>
                                                                        <option value="Años">Año(s)</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="animate-slideDown">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Escribe la duración</span>
                                                                <input
                                                                    type="text"
                                                                    value={modalTiempoDetalle}
                                                                    onChange={(e) => setModalTiempoDetalle(e.target.value)}
                                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm"
                                                                    placeholder="Ej: 3 meses, 1 año, intermitente hace semanas..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Condición de acompañamiento dentro del modal */}
                                                    <div className="space-y-2 pt-2 border-t border-slate-100 pt-6">
                                                        <label className="text-xs font-black text-slate-700 uppercase block mb-3">¿Cómo o con quién realizas la actividad?</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            {[
                                                                { val: 'SOLO', label: 'Solo', desc: 'Sin compañía' },
                                                                { val: 'PARES', label: 'Acompañado de Pares', desc: 'Amigos o hermanos menores' },
                                                                { val: 'FAMILIA', label: 'Acompañado de familiar', desc: 'Padres o parientes directos' }
                                                            ].map((opt) => (
                                                                <label 
                                                                    key={opt.val} 
                                                                    className={clsx(
                                                                        "cursor-pointer border rounded-xl p-4 flex flex-col gap-1 transition-all hover:bg-slate-50 text-left",
                                                                        modalCondicion === opt.val ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200 bg-white"
                                                                    )}
                                                                >
                                                                    <input 
                                                                        type="radio" 
                                                                        value={opt.val} 
                                                                        checked={modalCondicion === opt.val}
                                                                        onChange={() => setModalCondicion(opt.val)}
                                                                        className="sr-only" 
                                                                    />
                                                                    <span className="font-bold text-xs text-gray-900 uppercase block">{opt.label}</span>
                                                                    <span className="text-[10px] text-gray-500 leading-tight block">{opt.desc}</span>
                                                                    <div className="flex justify-end mt-2">
                                                                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", modalCondicion === opt.val ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                                                            {modalCondicion === opt.val && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Sub-formulario de Agenda de Trabajo Semanal Checkboxes */}
                                                    <div className="border-t border-slate-100 pt-6 space-y-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                                                <span>📅 Agenda Semanal de la Actividad</span>
                                                            </h4>
                                                            
                                                            {/* Botones de selección rápida */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('todos')}
                                                                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                                                    title="Activar de Lunes a Domingo"
                                                                >
                                                                    Todos
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('laborables')}
                                                                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                    {/* MODAL CONFIGURADOR DE ACTIVIDAD INDIVIDUAL */}
                                    {/* ========================================================================================= */}
                                    {isActivityModalOpen && (
                                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto">
                                            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                                                
                                                {/* Cabecera del modal */}
                                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                                    <div>
                                                        <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                                                            {editingActivityIndex !== null ? '✏️ Editar Actividad en Calle' : '➕ Agregar Actividad en Calle'}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">Configura la actividad, la permanencia de tiempo y su agenda semanal de horarios.</p>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setIsActivityModalOpen(false)} 
                                                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {/* Cuerpo del modal */}
                                                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                                                    
                                                    {/* Actividad */}
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-black text-slate-700 uppercase block">¿Qué actividad realiza?</label>
                                                        <select
                                                            value={modalActividad}
                                                            onChange={(e) => setModalActividad(e.target.value)}
                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm bg-white"
                                                        >
                                                            <option value="">-- SELECCIONA UNA ACTIVIDAD --</option>
                                                            {OPCIONES_ACTIVIDAD_CALLE.map(opt => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        
                                                        {modalActividad === 'Otro (especificar)' && (
                                                            <div className="pt-2 animate-slideDown">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Especifica la actividad</label>
                                                                <input
                                                                    type="text"
                                                                    value={modalActividadEspecifique}
                                                                    onChange={(e) => setModalActividadEspecifique(e.target.value)}
                                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm uppercase"
                                                                    placeholder="Escribe la actividad específica"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Duración / Hace cuánto */}
                                                    <div className="space-y-3">
                                                        <label className="text-xs font-black text-slate-700 uppercase block">¿Hace cuánto tiempo realiza esta actividad en calle?</label>
                                                        
                                                        {/* Selector de modo */}
                                                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalTiempoModo('simple')}
                                                                className={clsx(
                                                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                                                    modalTiempoModo === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                                )}
                                                            >
                                                                ⏱️ Registro Simple
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalTiempoModo('detalle')}
                                                                className={clsx(
                                                                    "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                                                    modalTiempoModo === 'detalle' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                                                )}
                                                            >
                                                                📝 Escribir Detalle
                                                            </button>
                                                        </div>

                                                        {modalTiempoModo === 'simple' ? (
                                                            <div className="grid grid-cols-2 gap-4 max-w-md animate-slideDown">
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Cantidad</span>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={modalTiempoValor}
                                                                        onChange={(e) => setModalTiempoValor(e.target.value)}
                                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm"
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-black text-slate-500 uppercase block">Unidad de Tiempo</span>
                                                                    <select
                                                                        value={modalTiempoUnidad}
                                                                        onChange={(e) => setModalTiempoUnidad(e.target.value)}
                                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm bg-white"
                                                                    >
                                                                        <option value="Días">Día(s)</option>
                                                                        <option value="Semanas">Semana(s)</option>
                                                                        <option value="Meses">Mes(es)</option>
                                                                        <option value="Años">Año(s)</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="animate-slideDown">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Escribe la duración</span>
                                                                <input
                                                                    type="text"
                                                                    value={modalTiempoDetalle}
                                                                    onChange={(e) => setModalTiempoDetalle(e.target.value)}
                                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm"
                                                                    placeholder="Ej: 3 meses, 1 año, intermitente hace semanas..."
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Condición de acompañamiento dentro del modal */}
                                                    <div className="space-y-2 pt-2 border-t border-slate-100 pt-6">
                                                        <label className="text-xs font-black text-slate-700 uppercase block mb-3">¿Cómo o con quién realizas la actividad?</label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            {[
                                                                { val: 'SOLO', label: 'Solo', desc: 'Sin compañía' },
                                                                { val: 'PARES', label: 'Acompañado de Pares', desc: 'Amigos o hermanos menores' },
                                                                { val: 'FAMILIA', label: 'Acompañado de familiar', desc: 'Padres o parientes directos' }
                                                            ].map((opt) => (
                                                                <label 
                                                                    key={opt.val} 
                                                                    className={clsx(
                                                                        "cursor-pointer border rounded-xl p-4 flex flex-col gap-1 transition-all hover:bg-slate-50 text-left",
                                                                        modalCondicion === opt.val ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200 bg-white"
                                                                    )}
                                                                >
                                                                    <input 
                                                                        type="radio" 
                                                                        value={opt.val} 
                                                                        checked={modalCondicion === opt.val}
                                                                        onChange={() => setModalCondicion(opt.val)}
                                                                        className="sr-only" 
                                                                    />
                                                                    <span className="font-bold text-xs text-gray-900 uppercase block">{opt.label}</span>
                                                                    <span className="text-[10px] text-gray-500 leading-tight block">{opt.desc}</span>
                                                                    <div className="flex justify-end mt-2">
                                                                        <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", modalCondicion === opt.val ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                                                            {modalCondicion === opt.val && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                        </div>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Sub-formulario de Agenda de Trabajo Semanal Checkboxes */}
                                                    <div className="border-t border-slate-100 pt-6 space-y-4">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                                                <span>📅 Agenda Semanal de la Actividad</span>
                                                            </h4>
                                                            
                                                            {/* Botones de selección rápida */}
                                                            <div className="flex flex-wrap gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('todos')}
                                                                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                                                    title="Activar de Lunes a Domingo"
                                                                >
                                                                    Todos
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('laborables')}
                                                                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                                                    title="Activar de Lunes a Viernes"
                                                                >
                                                                    Lun-Vie
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('finde')}
                                                                    className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                                                    title="Activar Sábado y Domingo"
                                                                >
                                                                    Sáb-Dom
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => seleccionarDiasPredefinidos('ninguno')}
                                                                    className="text-[9px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded transition-all uppercase border border-rose-200 shadow-sm"
                                                                    title="Desactivar todos los días"
                                                                >
                                                                    Limpiar
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Premium: Copiar horarios de forma masiva */}
                                                        {Object.values(modalJornadaSemanal).filter(d => d.activo).length > 1 && (
                                                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-center justify-between gap-3 animate-slideDown">
                                                                <span className="text-[10px] text-blue-700 font-medium leading-tight">
                                                                    💡 Configura el horario del primer día marcado y cópialo a los demás días activos para ahorrar tiempo.
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={copiarHorariosPrimerDiaActivo}
                                                                    className="text-[9px] font-black bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md shadow-sm transition-all uppercase whitespace-nowrap flex items-center gap-1 hover:scale-[1.02] active:scale-95"
                                                                >
                                                                    ⚡ Copiar Horario
                                                                </button>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="space-y-4">
                                                            {DIAS_SEMANA.map((dia) => {
                                                                const isDiaActivo = !!modalJornadaSemanal[dia]?.activo;
                                                                const tieneTurno2 = !!modalJornadaSemanal[dia]?.tieneTurno2;

                                                                return (
                                                                    <div key={dia} className={clsx(
                                                                        "border rounded-xl p-4 transition-all duration-200 text-left",
                                                                        isDiaActivo ? "border-blue-200 bg-blue-50/10 shadow-sm" : "border-slate-200 bg-slate-50/50 opacity-70"
                                                                    )}>
                                                                        {/* Checkbox selector del Día */}
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    id={`modal-switch-${dia}`}
                                                                                    checked={isDiaActivo}
                                                                                    onChange={(e) => {
                                                                                        setModalJornadaSemanal({
                                                                                            ...modalJornadaSemanal,
                                                                                            [dia]: {
                                                                                                ...modalJornadaSemanal[dia],
                                                                                                activo: e.target.checked
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                    className="h-5 w-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                                                />
                                                                                <label htmlFor={`modal-switch-${dia}`} className="font-bold text-sm text-slate-800 cursor-pointer select-none">{dia}</label>
                                                                            </div>
                                                                            {isDiaActivo && (
                                                                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">
                                                                                    {Math.round((calcularHorasDia(modalJornadaSemanal[dia]?.inicio || '08:00', modalJornadaSemanal[dia]?.fin || '12:00') + (tieneTurno2 ? calcularHorasDia(modalJornadaSemanal[dia]?.inicio2 || '14:00', modalJornadaSemanal[dia]?.fin2 || '18:00') : 0)) * 10) / 10} hrs
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {/* Despliegue de Horas si está activo */}
                                                                        {isDiaActivo && (
                                                                            <div className="mt-4 pt-3 border-t border-dashed border-slate-200 space-y-4 animate-slideDown">
                                                                                <div className="flex flex-col md:flex-row gap-4">
                                                                                    {/* Turno 1 */}
                                                                                    <div className="flex-1 space-y-1">
                                                                                        <span className="text-[10px] font-black text-slate-500 uppercase block">Jornada / Turno 1</span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                                                <span className="text-xs text-slate-500 font-bold">De:</span>
                                                                                                <input 
                                                                                                    type="time" 
                                                                                                    value={modalJornadaSemanal[dia]?.inicio || '08:00'}
                                                                                                    onChange={(e) => {
                                                                                                        setModalJornadaSemanal({
                                                                                                            ...modalJornadaSemanal,
                                                                                                            [dia]: {
                                                                                                                ...modalJornadaSemanal[dia],
                                                                                                                inicio: e.target.value
                                                                                                            }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" 
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                                                <span className="text-xs text-slate-500 font-bold">A:</span>
                                                                                                <input 
                                                                                                    type="time" 
                                                                                                    value={modalJornadaSemanal[dia]?.fin || '12:00'}
                                                                                                    onChange={(e) => {
                                                                                                        setModalJornadaSemanal({
                                                                                                            ...modalJornadaSemanal,
                                                                                                            [dia]: {
                                                                                                                ...modalJornadaSemanal[dia],
                                                                                                                fin: e.target.value
                                                                                                            }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" 
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Checkbox Doble Turno */}
                                                                                    <div className="flex items-end pb-2">
                                                                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600">
                                                                                            <input 
                                                                                                type="checkbox" 
                                                                                                checked={tieneTurno2}
                                                                                                onChange={(e) => {
                                                                                                    setModalJornadaSemanal({
                                                                                                        ...modalJornadaSemanal,
                                                                                                        [dia]: {
                                                                                                            ...modalJornadaSemanal[dia],
                                                                                                            tieneTurno2: e.target.checked
                                                                                                        }
                                                                                                    });
                                                                                                }}
                                                                                                className="rounded text-blue-600 h-4 w-4 border-slate-300 focus:ring-blue-500" 
                                                                                            />
                                                                                            <span>Turno cortado / Doble turno</span>
                                                                                        </label>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Turno 2 condicionado */}
                                                                                {tieneTurno2 && (
                                                                                    <div className="flex-1 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200 animate-slideDown">
                                                                                        <span className="text-[10px] font-black text-slate-500 uppercase block">Jornada / Turno 2</span>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                                                <span className="text-xs text-slate-500 font-bold">De:</span>
                                                                                                <input 
                                                                                                    type="time" 
                                                                                                    value={modalJornadaSemanal[dia]?.inicio2 || '14:00'}
                                                                                                    onChange={(e) => {
                                                                                                        setModalJornadaSemanal({
                                                                                                            ...modalJornadaSemanal,
                                                                                                            [dia]: {
                                                                                                                ...modalJornadaSemanal[dia],
                                                                                                                inicio2: e.target.value
                                                                                                            }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" 
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex-1 flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-300">
                                                                                                <span className="text-xs text-slate-500 font-bold">A:</span>
                                                                                                <input 
                                                                                                    type="time" 
                                                                                                    value={modalJornadaSemanal[dia]?.fin2 || '18:00'}
                                                                                                    onChange={(e) => {
                                                                                                        setModalJornadaSemanal({
                                                                                                            ...modalJornadaSemanal,
                                                                                                            [dia]: {
                                                                                                                ...modalJornadaSemanal[dia],
                                                                                                                fin2: e.target.value
                                                                                                            }
                                                                                                        });
                                                                                                    }}
                                                                                                    className="w-full bg-transparent border-0 p-1 text-xs focus:ring-0" 
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                </div>

                                                {/* Footer del modal */}
                                                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsActivityModalOpen(false)}
                                                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all uppercase"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={guardarActividadEnForm}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm uppercase"
                                                    >
                                                        Confirmar
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    )}

                                </div>
                            );
                        })()}

                        {/* ========================================================================================= */}
                        {/* PASO 4: IV. EDUCACIÓN */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso4_educacion' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="IV. Educación" subtitle="Situación educativa de cada NNA." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.apellidoPaterno`)} {watch(`nnas.${index}.apellidoMaterno`)} {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'}
                                        </h3>

                                        <div className="mb-2">
                                            <div className="grid grid-cols-1 gap-4 mb-4">
                                                <SelectField 
                                                    label="¿Estudia actualmente? (Situación de matrícula)" 
                                                    register={register(`nnas.${index}.estudiaActualmente` as const)} 
                                                    options={OPCIONES_MATRICULA_2026}
                                                    required
                                                />
                                            </div>

                                            {watch(`nnas.${index}.estudiaActualmente`) === 'SI' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                                                    <SelectField 
                                                        label="Nivel Educativo" 
                                                        register={register(`nnas.${index}.nivelEducativo` as const)} 
                                                        options={NIVELES_EDUCATIVOS_2026} 
                                                    />
                                                    <SelectField 
                                                        label="Grado / Año escolar o Ciclo" 
                                                        register={register(`nnas.${index}.gradoEstudio` as const)} 
                                                        options={GRADOS_ESTUDIO_2026} 
                                                    />
                                                    <InputField 
                                                        label="Institución Educativa" 
                                                        register={register(`nnas.${index}.institucionEducativa` as const)} 
                                                        placeholder="Nombre de la Institución Educativa..." 
                                                    />
                                                    <SelectField 
                                                        label="Modalidad de Estudio" 
                                                        register={register(`nnas.${index}.modalidadEstudio` as const)} 
                                                        options={MODALIDADES_ESTUDIO_2026} 
                                                    />
                                                </div>
                                            ) : (
                                                watch(`nnas.${index}.estudiaActualmente`) && watch(`nnas.${index}.estudiaActualmente`) !== '' ? (
                                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-fadeIn">
                                                        <InputField 
                                                            label="¿Por qué no estudia? / Detalles del proceso" 
                                                            register={register(`nnas.${index}.detalleNoEstudia` as const)} 
                                                            placeholder="Describa el motivo, detalles, etc." 
                                                        />
                                                    </div>
                                                ) : null
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ========================================================================================= */}
                        {/* PASO 5: V. SALUD */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso5_salud' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="V. Salud" subtitle="Aseguramiento y condición de salud." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.apellidoPaterno`)} {watch(`nnas.${index}.apellidoMaterno`)} {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'}
                                        </h3>

                                        <div className="space-y-6">
                                            {/* SEGUROS DE SALUD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                {/* SIS */}
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado al Seguro Universal de Salud (SIS)?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoSIS` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoSIS` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {/* OTRO SEGURO */}
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x items-center bg-white">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado a algún otro tipo de seguro de salud?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoOtroSeguro` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoOtroSeguro` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {watch(`nnas.${index}.afiliadoOtroSeguro` as const) === 'SI' && (
                                                    <div className="p-3 bg-blue-50 animate-slideDown border-t">
                                                        <InputField label="De ser afirmativo especificar: ¿Cuál?" register={register(`nnas.${index}.detalleOtroSeguro` as const)} placeholder="Especifique el seguro..." />
                                                    </div>
                                                )}
                                            </div>

                                            {/* ENFERMEDAD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Sufres alguna enfermedad actualmente?</div>
                                                    {['SI', 'NO'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.sufreEnfermedad` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.sufreEnfermedad` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {(watch(`nnas.${index}.sufreEnfermedad` as const) === 'SI') && (
                                                    <div className="p-3 bg-red-50 animate-slideDown">
                                                        <InputField label="De ser afirmativo especificar: ¿Cuál?" register={register(`nnas.${index}.detalleEnfermedad` as const)} placeholder="Especifique la enfermedad..." />
                                                    </div>
                                                )}
                                            </div>

                                            {/* DISCAPACIDAD */}
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Presenta algún tipo de discapacidad?</div>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === true ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="true" // Radio uses string value, but react-hook-form handles boolean if we use boolean true? No, radio values are strings usually. Let's cast or handle in onChange if needed, but simple string comparison 'true' is safer for DOM.
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, true)}
                                                        />
                                                        <span className="text-xs font-bold">SÍ</span>
                                                    </label>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === false ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="false"
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'false'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, false)}
                                                        />
                                                        <span className="text-xs font-bold">NO</span>
                                                    </label>
                                                </div>

                                                {(String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true') && (
                                                    <div className="p-4 bg-gray-50 animate-slideDown space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {DISCAPACIDADES_CONADIS.map((discap) => (
                                                                <label key={discap} className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-white transition-all ${watch(`nnas.${index}.tipoDiscapacidad` as const) === discap ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}>
                                                                    <input
                                                                        type="radio"
                                                                        value={discap}
                                                                        {...register(`nnas.${index}.tipoDiscapacidad` as const)}
                                                                        className="h-4 w-4 text-blue-600"
                                                                    />
                                                                    <span className="text-sm text-gray-700 font-medium">{discap}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <InputField
                                                            label="Especifique el tipo o detalle de la discapacidad"
                                                            register={register(`nnas.${index}.detalleDiscapacidad` as const)}
                                                            placeholder="Ej: Grado de discapacidad, apoyos necesarios..."
                                                        />

                                                        <div className="animate-fadeIn mt-2">
                                                            <SelectField 
                                                                label="Certificado de Discapacidad" 
                                                                register={register(`nnas.${index}.certDiscapNna` as const)} 
                                                                options={OPCIONES_CERT_DISCAP_APO_2026} 
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <InputField label="Observaciones Salud / Lugar de Atención" register={register(`nnas.${index}.observacionesSalud` as const)} />
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}


                        {/* ========================================================================================= */}
                        {/* PASO 6: VI. FAMILIA y OTROS (VII, VIII) */}
                        {/* ========================================================================================= */}
                        {activeSection === 'paso6_familia' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="VI. Familia / VII. Tiempo Libre" subtitle="Datos de vivienda y detalles finales." />

                                {/* VI. FAMILIA */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <h3 className="bg-purple-50 text-purple-900 font-bold px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                                        <Home size={18} /> VI. FAMILIA
                                    </h3>
                                    <div className="p-5 space-y-6">

                                        {/* ¿Con quiénes vives? */}
                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">¿Con quiénes vives?</div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {OPCIONES_CONVIVENCIA_2026.map(opt => (
                                                    <label key={opt.value} className={`border rounded-lg p-3 cursor-pointer hover:bg-purple-50 transition-colors flex items-center gap-2 ${watch('viveCon') === opt.value ? 'bg-purple-100 border-purple-300 ring-1 ring-purple-300' : 'border-gray-200'}`}>
                                                        <input type="radio" value={opt.value} {...register('viveCon', { required: 'Este campo es obligatorio' })} className="text-purple-600 focus:ring-purple-500" />
                                                        <span className="text-xs font-bold text-gray-700">{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {watch('viveCon') === '6: Otro' && (
                                                <div className="animate-slideDown pl-2 border-l-4 border-purple-200">
                                                    <InputField label="Detallar (Otro):" register={register('detalleViveCon')} placeholder="Especifique con quién vive..." />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* ¿Dónde duermes habitualmente? */}
                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">
                                                En caso que no viva con sus padres u otros familiares preguntar: <br />
                                                <span className="text-base text-blue-900 mt-1 block">¿Dónde duermes habitualmente?</span>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    { val: 'SU_CASA', lbl: 'Su casa' },
                                                    { val: 'CALLES_PARQUES', lbl: 'Calles, Parques' },
                                                    { val: 'CUARTO_ALQUILADO', lbl: 'Cuarto alquilado' },
                                                    { val: 'OTRO', lbl: 'Otro' }
                                                ].map(opt => (
                                                    <label key={opt.val} className={`border rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2 ${watch('lugarPernocte') === opt.val ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'}`}>
                                                        <input type="radio" value={opt.val} {...register('lugarPernocte', { required: 'Este campo es obligatorio' })} className="text-blue-600 focus:ring-blue-500" />
                                                        <span className="text-xs font-bold text-gray-700 capitalize">{opt.lbl}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {watch('lugarPernocte') === 'OTRO' && (
                                                <div className="animate-slideDown pl-2 border-l-4 border-blue-200">
                                                    <InputField label="Detallar (Otro):" register={register('detalleLugarPernocte')} placeholder="Especifique dónde duerme..." />
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 my-4"></div>

                                        {/* Familiares — lista con modal */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-sm font-bold text-gray-800">Familiares / Responsables</div>
                                                <button type="button" onClick={() => abrirModalFamiliar()}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-primary-fg bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors">
                                                    <Plus size={13} /> Agregar familiar
                                                </button>
                                            </div>

                                            {familiaresFields.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
                                                    Sin familiares registrados. Haz clic en "Agregar familiar" para comenzar.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-gray-100 text-gray-600 text-[10px] uppercase">
                                                                <th className="text-left px-3 py-2 font-bold">#</th>
                                                                <th className="text-left px-3 py-2 font-bold">Nombres y Apellidos</th>
                                                                <th className="text-left px-3 py-2 font-bold">Parentesco</th>
                                                                <th className="text-left px-3 py-2 font-bold">DNI</th>
                                                                <th className="text-left px-3 py-2 font-bold">Teléfono</th>
                                                                <th className="text-left px-3 py-2 font-bold">Ocupación</th>
                                                                <th className="text-center px-3 py-2 font-bold">¿Vive c/NNA?</th>
                                                                <th className="px-2 py-2"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {familiaresFields.map((fam, fi) => {
                                                                const f = watch(`familiares.${fi}`) as FamiliarData;
                                                                return (
                                                                <tr key={fam.id} className={fi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                                    <td className="px-3 py-2 text-gray-400 font-bold">{fi + 1}</td>
                                                                    <td className="px-3 py-2 font-semibold text-gray-800">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span>{f?.nombres || '---'}</span>

                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{f?.parentesco || '---'}</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-gray-600">{f?.dni || '---'}</td>
                                                                    <td className="px-3 py-2 text-gray-600">{f?.telefono || '---'}</td>
                                                                    <td className="px-3 py-2 text-gray-600">{f?.ocupacion || '---'}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f?.viveCon === 'SI' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                                            {f?.viveCon === 'SI' ? 'Sí' : 'No'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-2 py-2 text-center">
                                                                        <div className="flex gap-2 justify-center">
                                                                            <button type="button" onClick={() => abrirModalFamiliar(fi)} className="text-blue-400 hover:text-blue-600 transition-colors" title="Editar">
                                                                                <Edit2 size={13} />
                                                                            </button>
                                                                            <button type="button" onClick={() => removeFamiliar(fi)} className="text-red-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                                                <X size={13} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                {/* VII y VIII. OTROS DATOS */}
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-2 mt-2">VII. Tiempo Libre, VIII. Observaciones y H. Institucional</h3>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                                            <div className="text-xs font-bold text-white bg-gray-800 px-3 py-1 rounded inline-block mb-4">NNA: {watch(`nnas.${index}.nombres`) || 'Sin Nombre'}</div>

                                            <div className="grid grid-cols-1 gap-4">
                                                {/* Antecedente Institucional (Casa/Albergue) - Pregunta Específica de la Imagen */}
                                                <div className="border rounded-lg overflow-hidden bg-orange-50/50 border-orange-100">
                                                    <div className="grid grid-cols-[3fr_1fr_1fr] border-b border-orange-200 divide-x divide-orange-200 items-center">
                                                        <div className="p-3 text-sm font-bold text-gray-800">¿Ha estado en una casa de estancia, hogar o albergue?</div>
                                                        <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors h-full ${watch(`nnas.${index}.tieneAntecedenteAlbergue` as const) === true ? 'bg-orange-200 text-orange-900 font-bold' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                value="true" // String value for radio but handled as boolean via onChange if needed, usually react-hook-form handles standard inputs well, but for radio 'true' string != boolean true.
                                                                // Better approach: use onChange to set boolean.
                                                                {...register(`nnas.${index}.tieneAntecedenteAlbergue` as const)}
                                                                className="mr-2"
                                                                checked={String(watch(`nnas.${index}.tieneAntecedenteAlbergue`)) === 'true'}
                                                                onChange={() => setValue(`nnas.${index}.tieneAntecedenteAlbergue`, true)}
                                                            />
                                                            <span className="text-xs font-bold">SÍ</span>
                                                        </label>
                                                        <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-orange-100 transition-colors h-full ${watch(`nnas.${index}.tieneAntecedenteAlbergue` as const) === false ? 'bg-orange-200 text-orange-900 font-bold' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                value="false"
                                                                {...register(`nnas.${index}.tieneAntecedenteAlbergue` as const)}
                                                                className="mr-2"
                                                                checked={String(watch(`nnas.${index}.tieneAntecedenteAlbergue`)) === 'false'}
                                                                onChange={() => {
                                                                    setValue(`nnas.${index}.tieneAntecedenteAlbergue`, false);
                                                                    setValue(`nnas.${index}.detalleAntecedenteAlbergue`, ''); // Clear detail on NO
                                                                }}
                                                            />
                                                            <span className="text-xs font-bold">NO</span>
                                                        </label>
                                                    </div>
                                                    {String(watch(`nnas.${index}.tieneAntecedenteAlbergue` as const)) === 'true' && (
                                                        <div className="p-3 bg-white animate-slideDown">
                                                            <InputField
                                                                label="¿Cuál? (Nombre de la institución)"
                                                                register={register(`nnas.${index}.detalleAntecedenteAlbergue` as const)}
                                                                placeholder="Especifique nombre del albergue..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* VII. CUADRICULA DE USO DE TIEMPO INTERACTIVA */}
                                                {(() => {
                                                    const ut = watch(`nnas.${index}.usoTiempo`) || {};
                                                    const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

                                                    // Calcular sumas semanales
                                                    let semEstudiar = 0;
                                                    let semTrabajar = 0;
                                                    let semDormir = 0;
                                                    let semJugar = 0;

                                                    DIAS.forEach(d => {
                                                        const diaData = ut[d] || { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 };
                                                        semEstudiar += Number(diaData.estudiar) || 0;
                                                        semTrabajar += Number(diaData.trabajar) || 0;
                                                        semDormir += Number(diaData.dormir) || 0;
                                                        semJugar += Number(diaData.jugar) || 0;
                                                    });

                                                    const totalSemanalUso = semEstudiar + semTrabajar + semDormir + semJugar;
                                                    const totalMensualUso = Math.round(totalSemanalUso * 4.28 * 10) / 10;
                                                    const promedioSueñoDiario = Math.round((semDormir / 7) * 10) / 10;
                                                        });
                                                        
                                                        // 2. Sumar Tiempo Libre (actividadesTiempoLibreLista de este NNA)
                                                        actividadesLibre.forEach((al: any) => {
                                                            const j = (al.jornada || []).find((x: any) => x.dia === d);
                                                            if (j) {
                                                                let h = calcularHorasDia(j.inicio, j.fin);
                                                                if (j.tieneTurno2 && j.inicio2 && j.fin2) {
                                                                    h += calcularHorasDia(j.inicio2, j.fin2);
                                                                }
                                                                if ((al.actividad || '').includes('Estudiar')) {
                                                                    consolUso[d].estudiar += h;
                                                                } else if ((al.actividad || '').includes('Dormir')) {
                                                                    consolUso[d].dormir += h;
                                                                } else if ((al.actividad || '').includes('Jugar') || (al.actividad || '').includes('Deportes') || (al.actividad || '').includes('Arte')) {
                                                                    consolUso[d].jugar += h;
                                                                }
                                                            }
                                                        });
                                                    });

                                                    // Calcular sumas semanales consolidadas
                                                    let semEstudiar = 0;
                                                    let semTrabajar = 0;
                                                    let semDormir = 0;
                                                    let semJugar = 0;

                                                    DIAS.forEach(d => {
                                                        semEstudiar += consolUso[d].estudiar;
                                                        semTrabajar += consolUso[d].trabajar;
                                                        semDormir += consolUso[d].dormir;
                                                        semJugar += consolUso[d].jugar;
                                                    });

                                                    const totalSemanalUso = semEstudiar + semTrabajar + semDormir + semJugar;
                                                    const totalMensualUso = Math.round(totalSemanalUso * 4.28 * 10) / 10;
                                                    const promedioSueñoDiario = Math.round((semDormir / 7) * 10) / 10;

                                                    // Reglas de negocio para diagnóstico
                                                    let alertaSueño = '';
                                                    let alertaSueñoColor = '';
                                                    if (promedioSueñoDiario < 8) {
                                                        alertaSueño = `⚠️ Privación de sueño detectada (${promedioSueñoDiario}h/día promedio). Se recomiendan mínimo 8 horas diarias de descanso para el desarrollo del menor.`;
                                                        alertaSueñoColor = 'text-rose-700 bg-rose-50 border-rose-100';
                                                    } else {
                                                        alertaSueño = `✨ Descanso adecuado (${promedioSueñoDiario}h/día promedio). Cumple con las horas de sueño recomendadas.`;
                                                        alertaSueñoColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                                                    }

                                                    let alertaEducacion = '';
                                                    let alertaEducacionColor = '';
                                                    const estudia = watch(`nnas.${index}.estudiaActualmente`);
                                                    if (estudia === 'NO' || estudia === false || estudia === 'NO_APLICA') {
                                                        if (semTrabajar > 0) {
                                                            alertaEducacion = `❌ Exclusión escolar activa. El menor realiza trabajo infantil (${semTrabajar}h/sem) y no se encuentra inserto en el sistema educativo.`;
                                                            alertaEducacionColor = 'text-rose-750 bg-rose-50 border-rose-150';
                                                        } else {
                                                            alertaEducacion = `⚠️ El menor no estudia actualmente. Se debe promover activamente la reinserción escolar.`;
                                                            alertaEducacionColor = 'text-amber-700 bg-amber-50 border-amber-100';
                                                        }
                                                    } else if (semTrabajar > semEstudiar) {
                                                        alertaEducacion = `⚠️ Interferencia educativa. Las horas de trabajo (${semTrabajar}h/sem) superan a las de estudio (${semEstudiar}h/sem), incrementando el riesgo de deserción.`;
                                                        alertaEducacionColor = 'text-amber-700 bg-amber-50 border-amber-100';
                                                    } else {
                                                        alertaEducacion = `✨ Equilibrio educativo. El menor dedica tiempo adecuado a su educación (${semEstudiar}h/sem) frente al trabajo (${semTrabajar}h/sem).`;
                                                        alertaEducacionColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
                                                    }

                                                    // Semáforo de riesgo
                                                    let nivelRiesgo = 'Sin Riesgo';
                                                    let riesgoColor = 'from-emerald-500 to-teal-600 text-white';
                                                    let riesgoBg = 'bg-emerald-50 border-emerald-200 text-emerald-800';
                                                    let riesgoDesc = 'Distribución saludable del tiempo orientada al desarrollo integral del menor, garantizando su juego y descanso.';

                                                    if (semTrabajar > 30 || promedioSueñoDiario < 6) {
                                                        nivelRiesgo = 'Riesgo Crítico';
                                                        riesgoColor = 'from-red-500 to-rose-600 text-white animate-pulse';
                                                        riesgoBg = 'bg-rose-50 border-rose-200 text-rose-900';
                                                        riesgoDesc = '¡Explotación Severa o Desvelo Crítico! La alta carga laboral o la extrema falta de descanso comprometen gravemente su bienestar.';
                                                    } else if (semTrabajar > 14 || promedioSueñoDiario < 8 || semTrabajar > semEstudiar) {
                                                        nivelRiesgo = 'Riesgo Moderado';
                                                        riesgoColor = 'from-amber-500 to-orange-600 text-white';
                                                        riesgoBg = 'bg-amber-50 border-amber-200 text-amber-900';
                                                        riesgoDesc = 'Jornada Excesiva o Interferencia Escolar. El menor trabaja más horas de las recomendadas o su descanso se ve afectado.';
                                                    } else if (semTrabajar > 0) {
                                                        nivelRiesgo = 'Riesgo Leve';
                                                        riesgoColor = 'from-yellow-400 to-amber-500 text-slate-800';
                                                        riesgoBg = 'bg-yellow-50 border-yellow-200 text-yellow-800';
                                                        riesgoDesc = 'Trabajo infantil ligero. Requiere monitoreo continuo para evitar interferencias con sus derechos de educación y juego.';
                                                    }

                                                    return (
                                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50/50 p-5 space-y-6">
                                                            {/* Cabecera de la sección */}
                                                            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl">🏃‍♂️</span>
                                                                    <div>
                                                                        <h4 className="text-sm font-black text-slate-800 uppercase">VII. Actividades de Tiempo Libre</h4>
                                                                        <p className="text-[11px] text-slate-500">Registra dinámicamente las actividades del menor fuera de la jornada de calle.</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => abrirModalLibre(index)}
                                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3.5 py-2 rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                                                                >
                                                                    ➕ Agregar Actividad de Tiempo Libre
                                                                </button>
                                                            </div>

                                                            {/* LISTADO DINÁMICO DE ACTIVIDADES REGISTRADAS */}
                                                            {actividadesLibre.length === 0 ? (
                                                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-white shadow-inner">
                                                                    <span className="text-2xl block mb-2 opacity-60">🎮</span>
                                                                    <span className="block text-xs font-black text-slate-700 uppercase">Sin Actividades de Tiempo Libre</span>
                                                                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">Haz clic en el botón superior para registrar las actividades del menor (ej. Dormir, Estudiar, Jugar) y sus horarios semanales.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {actividadesLibre.map((al: any, alIdx: number) => {
                                                                        // Calcular horas de esta actividad
                                                                        const actHours = (al.jornada || []).reduce((sum: number, j: any) => {
                                                                            let h = calcularHorasDia(j.inicio, j.fin);
                                                                            if (j.tieneTurno2 && j.inicio2 && j.fin2) {
                                                                                h += calcularHorasDia(j.inicio2, j.fin2);
                                                                            }
                                                                            return sum + h;
                                                                        }, 0);

                                                                        const isEstudio = (al.actividad || '').includes('Estudiar');
                                                                        const isSueño = (al.actividad || '').includes('Dormir');
                                                                        const isJuego = !isEstudio && !isSueño;

                                                                        return (
                                                                            <div key={alIdx} className="bg-white rounded-xl border border-slate-150 p-4 shadow-sm flex flex-col justify-between space-y-3 hover:border-indigo-200 transition-colors">
                                                                                <div className="flex items-start justify-between gap-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xl">
                                                                                            {isEstudio ? '📚' : isSueño ? '😴' : '🎮'}
                                                                                        </span>
                                                                                        <div>
                                                                                            <span className="text-xs font-bold text-slate-800 block uppercase">
                                                                                                {al.actividad === 'Otro (especificar)' ? al.actividadEspecifique : al.actividad}
                                                                                            </span>
                                                                                            <span className="text-[10px] text-slate-400">⏱️ {al.tiempoDetalle}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                                                        isEstudio ? 'bg-indigo-50 text-indigo-700' :
                                                                                        isSueño ? 'bg-teal-50 text-teal-700' : 'bg-emerald-50 text-emerald-700'
                                                                                    }`}>
                                                                                        {actHours}h/sem
                                                                                    </span>
                                                                                </div>

                                                                                {/* Mini-calendario semanal de Lunes a Domingo */}
                                                                                <div className="flex items-center gap-1">
                                                                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => {
                                                                                        const jDia = (al.jornada || []).find((x: any) => x.dia === d);
                                                                                        const isAct = !!jDia;
                                                                                        const letter = d === 'Miércoles' ? 'X' : d[0];
                                                                                        return (
                                                                                            <span 
                                                                                                key={d} 
                                                                                                title={jDia ? `${d}: ${jDia.inicio}-${jDia.fin}${jDia.tieneTurno2 ? ` y ${jDia.inicio2}-${jDia.fin2}` : ''}` : `${d}: No programado`}
                                                                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all cursor-default select-none ${
                                                                                                    isAct 
                                                                                                        ? (isEstudio ? "bg-indigo-500 text-white border-indigo-500" : isSueño ? "bg-teal-400 text-white border-teal-400" : "bg-emerald-500 text-white border-emerald-500")
                                                                                                        : "bg-slate-50 text-slate-350 border-slate-200/50"
                                                                                                }`}
                                                                                            >
                                                                                                {letter}
                                                                                            </span>
                                                                                        );
                                                                                    })}
                                                                                </div>

                                                                                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2.5">
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => abrirModalLibre(index, alIdx)} 
                                                                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                                                                    >
                                                                                        ✏️ Editar
                                                                                    </button>
                                                                                    <span className="text-slate-300">|</span>
                                                                                    <button 
                                                                                        type="button" 
                                                                                        onClick={() => eliminarLibreDelForm(index, alIdx)} 
                                                                                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1"
                                                                                    >
                                                                                        🗑️ Eliminar
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* HERRAMIENTA DE CONSOLIDACIÓN AUTOMÁTICA Y ALERTAS */}
                                                            <div className="border-t border-slate-200 pt-6 space-y-4">
                                                                <h5 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                                                    <span>📊 Consolidado y Distribución del Tiempo (Cálculo Automático)</span>
                                                                </h5>

                                                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                                                    {/* TABLA DE RESUMEN DIARIO CON BARRA APILADA */}
                                                                    <div className="xl:col-span-2 overflow-x-auto">
                                                                        <table className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                                            <thead className="bg-slate-150 text-slate-600 uppercase text-[9px] font-black border-b border-slate-200">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left w-[20%]">Día</th>
                                                                                    <th className="px-2 py-2 text-center text-indigo-700 w-[12%]">📚 Estudio</th>
                                                                                    <th className="px-2 py-2 text-center text-amber-700 w-[12%]">💼 Trabajo</th>
                                                                                    <th className="px-2 py-2 text-center text-teal-700 w-[12%]">😴 Sueño</th>
                                                                                    <th className="px-2 py-2 text-center text-emerald-700 w-[12%]">🎮 Ocio</th>
                                                                                    <th className="px-2 py-2 text-center w-[12%]">Total</th>
                                                                                    <th className="px-3 py-2 text-left w-[20%]">Distribución (24h)</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {DIAS.map(d => {
                                                                                    const hrsDia = Math.round((consolUso[d].estudiar + consolUso[d].trabajar + consolUso[d].dormir + consolUso[d].jugar) * 10) / 10;
                                                                                    
                                                                                    const pctEstudiar = Math.min(100, consolUso[d].estudiar / 24 * 100);
                                                                                    const pctTrabajar = Math.min(100, consolUso[d].trabajar / 24 * 100);
                                                                                    const pctDormir = Math.min(100, consolUso[d].dormir / 24 * 100);
                                                                                    const pctJugar = Math.min(100, consolUso[d].jugar / 24 * 100);
                                                                                    const pctLibre = Math.max(0, 100 - (pctEstudiar + pctTrabajar + pctDormir + pctJugar));

                                                                                    return (
                                                                                        <tr key={d} className="hover:bg-slate-50/50 transition-colors">
                                                                                            <td className="px-3 py-2 font-bold text-slate-800">{d}</td>
                                                                                            <td className="px-2 py-2 text-center font-bold text-indigo-900">{consolUso[d].estudiar}h</td>
                                                                                            <td className="px-2 py-2 text-center font-bold text-amber-900">{consolUso[d].trabajar}h</td>
                                                                                            <td className="px-2 py-2 text-center font-bold text-teal-900">{consolUso[d].dormir}h</td>
                                                                                            <td className="px-2 py-2 text-center font-bold text-emerald-900">{consolUso[d].jugar}h</td>
                                                                                            <td className="px-2 py-2 text-center">
                                                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                                                                                    hrsDia > 24 
                                                                                                        ? 'bg-red-100 text-red-700 animate-bounce' 
                                                                                                        : hrsDia === 24 
                                                                                                            ? 'bg-slate-100 text-slate-800' 
                                                                                                            : 'bg-slate-50 text-slate-500'
                                                                                                }`}>
                                                                                                    {hrsDia}h
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <div className="flex h-3 w-full rounded overflow-hidden bg-slate-150 border border-slate-200/50 shadow-inner">
                                                                                                    {pctEstudiar > 0 && <div style={{ width: `${pctEstudiar}%` }} title={`Estudio: ${consolUso[d].estudiar}h`} className="h-full bg-indigo-500 transition-all duration-300" />}
                                                                                                    {pctTrabajar > 0 && <div style={{ width: `${pctTrabajar}%` }} title={`Trabajo: ${consolUso[d].trabajar}h`} className="h-full bg-amber-500 transition-all duration-300" />}
                                                                                                    {pctDormir > 0 && <div style={{ width: `${pctDormir}%` }} title={`Sueño: ${consolUso[d].dormir}h`} className="h-full bg-teal-400 transition-all duration-300" />}
                                                                                                    {pctJugar > 0 && <div style={{ width: `${pctJugar}%` }} title={`Juego/Ocio: ${consolUso[d].jugar}h`} className="h-full bg-emerald-450 transition-all duration-300" />}
                                                                                                    {pctLibre > 0 && <div style={{ width: `${pctLibre}%` }} title={`Tiempo Libre/Otros: ${Math.round((24 - hrsDia)*10)/10}h`} className="h-full bg-slate-100 transition-all duration-300" />}
                                                                                                </div>
                                                                                                {hrsDia > 24 && (
                                                                                                    <span className="text-[8px] font-bold text-red-600 block mt-0.5 animate-pulse">⚠️ ¡Excede 24h!</span>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                                {/* FILA DE TOTALES */}
                                                                                <tr className="bg-slate-50 font-black border-t border-slate-200">
                                                                                    <td className="px-3 py-2.5 text-slate-700">Total Semanal</td>
                                                                                    <td className="px-2 py-2.5 text-center text-indigo-900">{semEstudiar}h</td>
                                                                                    <td className="px-2 py-2.5 text-center text-amber-900">{semTrabajar}h</td>
                                                                                    <td className="px-2 py-2.5 text-center text-teal-900">{semDormir}h</td>
                                                                                    <td className="px-2 py-2.5 text-center text-emerald-900">{semJugar}h</td>
                                                                                    <td className="px-2 py-2.5 text-center text-slate-800 bg-slate-100">{totalSemanalUso}h</td>
                                                                                    <td className="px-3 py-2.5 text-[9px] text-slate-500 font-bold">Total Mensual: <span className="text-slate-800 text-xs font-black">{totalMensualUso}h</span></td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>

                                                                    {/* PANEL DE DIAGNÓSTICO EN TIEMPO REAL */}
                                                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-4">
                                                                        <div className="space-y-4">
                                                                            <div className="flex items-center justify-between border-b pb-2">
                                                                                <span className="text-[10px] font-black text-slate-500 uppercase">Evaluación Diagnóstica</span>
                                                                                <span className="text-xs">🩺</span>
                                                                            </div>

                                                                            <div className={`p-4 rounded-xl border flex flex-col items-center text-center space-y-2 ${riesgoBg}`}>
                                                                                <span className="text-[9px] font-black uppercase tracking-wider opacity-75">Riesgo de Explotación</span>
                                                                                <div className={`text-xs font-black px-4.5 py-1.5 rounded-full bg-gradient-to-br shadow ${riesgoColor}`}>
                                                                                    {nivelRiesgo}
                                                                                </div>
                                                                                <p className="text-[10px] font-bold leading-normal mt-1">{riesgoDesc}</p>
                                                                            </div>

                                                                            <div className="space-y-2 text-[10px] font-bold leading-normal">
                                                                                <div className={`p-2.5 rounded-lg border ${alertaSueñoColor}`}>
                                                                                    {alertaSueño}
                                                                                </div>
                                                                                <div className={`p-2.5 rounded-lg border ${alertaEducacionColor}`}>
                                                                                    {alertaEducacion}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Leyenda consolidada */}
                                                                        <div className="border-t border-slate-150 pt-2 text-[9px] font-bold">
                                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Distribución de Colores</span>
                                                                            <div className="grid grid-cols-2 gap-1">
                                                                                <div className="flex items-center gap-1 text-indigo-700">
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-sm" />
                                                                                    <span>Estudio</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 text-amber-700">
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" />
                                                                                    <span>Trabajo (Calle)</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 text-teal-700">
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block shadow-sm" />
                                                                                    <span>Sueño</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1 text-emerald-700">
                                                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-450 inline-block shadow-sm" />
                                                                                    <span>Juego/Ocio</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <InputField 
                                                    label="VII. Actividades de Tiempo Libre (Detalles cualitativos o gustos personales)" 
                                                    register={register(`nnas.${index}.actividadesTiempoLibre` as const)} 
                                                    placeholder="Especifique qué cosas le gusta hacer en su tiempo libre (ej. fútbol con vecinos, ver TV, dibujar)..." 
                                                />
                                                <InputField label="VIII. Observaciones Generales" register={register(`nnas.${index}.caracteristicas` as const)} placeholder="Observaciones adicionales sobre el NNA..." />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <FooterButtons
                        onBack={activeSection !== 'paso1_generales' ? handlePrev : undefined}
                        onNext={activeSection !== 'paso6_familia' ? handleNext : undefined}
                        onSave={activeSection === 'paso6_familia' ? handleSubmit(onSubmit, onFormError) : undefined}
                        loading={submitting}
                        nextLabel="Siguiente Paso"
                        submitLabel="Guardar Ficha"
                    />
                </form>
            </main>

            {/* ── MODAL FAMILIAR ─────────────────────────────────────── */}
            {familiarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 overflow-y-auto py-6">
                    <div className="bg-white rounded-2xl shadow-2xl w-full transition-all duration-300 my-auto flex flex-col max-h-[90vh] max-w-3xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                <Users size={16} className="text-primary" />
                                <span>{familiarEditIdx !== null ? 'Editar familiar / responsable' : 'Agregar familiar / responsable'}</span>
                            </h3>
                            <button type="button" onClick={() => setFamiliarModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-6 space-y-4 overflow-y-auto flex-grow text-left">
                            <div className="space-y-4">

                                {/* Grilla 3 columnas para nombre completo del tutor */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primer Apellido (Paterno) <span className="text-red-500">*</span></label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 uppercase"
                                            placeholder="PATERNO"
                                            value={familiarDraft.priApeTutApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ 
                                                    ...familiarDraft, 
                                                    priApeTutApo: val,
                                                    nombres: `${val} ${familiarDraft.segApeTutApo || ''} ${familiarDraft.nomApeTutApo || ''}`.trim()
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Segundo Apellido (Materno)</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 uppercase"
                                            placeholder="MATERNO"
                                            value={familiarDraft.segApeTutApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ 
                                                    ...familiarDraft, 
                                                    segApeTutApo: val,
                                                    nombres: `${familiarDraft.priApeTutApo || ''} ${val} ${familiarDraft.nomApeTutApo || ''}`.trim()
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombres <span className="text-red-500">*</span></label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 uppercase"
                                            placeholder="NOMBRES"
                                            value={familiarDraft.nomApeTutApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ 
                                                    ...familiarDraft, 
                                                    nomApeTutApo: val,
                                                    nombres: `${familiarDraft.priApeTutApo || ''} ${familiarDraft.segApeTutApo || ''} ${val}`.trim()
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Grilla 2 columnas para Datos Personales del Tutor */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sexo</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.sexoApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, sexoApo: e.target.value })}
                                        >
                                            <option value="">Seleccionar sexo...</option>
                                            {OPCIONES_SEXO_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fecha de Nacimiento</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary"
                                            value={familiarDraft.fechaNacApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, fechaNacApo: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Identificación del Tutor */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo de Documento</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.tipDocTutApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, tipDocTutApo: e.target.value })}
                                        >
                                            <option value="">Seleccionar tipo...</option>
                                            {OPCIONES_TIP_DOC_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Número de Documento</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary"
                                            placeholder="Nro. documento"
                                            value={familiarDraft.nroDocTutApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ ...familiarDraft, nroDocTutApo: val, dni: val });
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Origen y Vínculo */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nacionalidad</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary"
                                            placeholder="Ej: PERUANA"
                                            value={familiarDraft.nacionalidadApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, nacionalidadApo: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vínculo con el NNA <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.vinTutUsu || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ ...familiarDraft, vinTutUsu: val, parentesco: val });
                                            }}
                                        >
                                            <option value="">Seleccionar vínculo...</option>
                                            {OPCIONES_VINCULO_TUTOR_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Lengua Materna */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Lengua Materna</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.lenMatApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ 
                                                    ...familiarDraft, 
                                                    lenMatApo: val,
                                                    lenMatEspApo: (val.startsWith("9:") || val.startsWith("12:")) ? familiarDraft.lenMatEspApo : ''
                                                });
                                            }}
                                        >
                                            <option value="">Seleccionar lengua...</option>
                                            {OPCIONES_LENGUA_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(familiarDraft.lenMatApo?.startsWith("9:") || familiarDraft.lenMatApo?.startsWith("12:")) && (
                                        <div className="animate-slideDown">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Especificar Lengua <span className="text-red-500">*</span></label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                placeholder="Escriba la lengua..."
                                                value={familiarDraft.lenMatEspApo || ''}
                                                onChange={e => setFamiliarDraft({ ...familiarDraft, lenMatEspApo: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Identificación Étnica */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Autoidentificación Étnica</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.autIdeEtApo || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setFamiliarDraft({ 
                                                    ...familiarDraft, 
                                                    autIdeEtApo: val,
                                                    autIdeEtEspApo: (val.startsWith("3:") || val.startsWith("4:") || val.startsWith("8:")) ? familiarDraft.autIdeEtEspApo : ''
                                                });
                                            }}
                                        >
                                            <option value="">Seleccionar autoidentificación...</option>
                                            {OPCIONES_ETNIA_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {(familiarDraft.autIdeEtApo?.startsWith("3:") || familiarDraft.autIdeEtApo?.startsWith("4:") || familiarDraft.autIdeEtApo?.startsWith("8:")) && (
                                        <div className="animate-slideDown">
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Especificar Pueblo/Etnia <span className="text-red-500">*</span></label>
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                placeholder="Escriba el pueblo o etnia..."
                                                value={familiarDraft.autIdeEtEspApo || ''}
                                                onChange={e => setFamiliarDraft({ ...familiarDraft, autIdeEtEspApo: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Discapacidad del Tutor */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Discapacidad</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.tipoDiscapApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, tipoDiscapApo: e.target.value })}
                                        >
                                            <option value="">Seleccionar tipo...</option>
                                            {OPCIONES_DISCAPACIDAD_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Certificado de Discapacidad</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary bg-white"
                                            value={familiarDraft.certDiscapApo || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, certDiscapApo: e.target.value })}
                                        >
                                            <option value="">Seleccionar opción...</option>
                                            {OPCIONES_CERT_DISCAP_APO_2026.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Campos adicionales de familiar estándar */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Teléfono de Contacto</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary"
                                            placeholder="Nro. celular"
                                            value={familiarDraft.telefono || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, telefono: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ocupación</label>
                                        <input
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-primary"
                                            placeholder="Ej: Comerciante, Obrero..."
                                            value={familiarDraft.ocupacion || ''}
                                            onChange={e => setFamiliarDraft({ ...familiarDraft, ocupacion: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">¿Vive con el NNA?</label>
                                    <div className="flex gap-4">
                                        {['SI','NO'].map(v => (
                                            <label key={v} className={`flex items-center gap-2 cursor-pointer px-4 py-1.5 rounded-lg border text-xs transition-colors ${familiarDraft.viveCon === v ? 'border-primary bg-primary/10 font-bold text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                <input type="radio" className="hidden" value={v} checked={familiarDraft.viveCon === v} onChange={() => setFamiliarDraft({ ...familiarDraft, viveCon: v })} />
                                                {v === 'SI' ? '✓ Sí' : '✗ No'}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                            <button type="button" onClick={() => setFamiliarModal(false)} className="px-4 py-2 text-xs text-gray-600 hover:text-gray-800 font-semibold transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={guardarFamiliar}
                                disabled={(() => {
                                    if (!familiarDraft.vinTutUsu && !familiarDraft.parentesco) return true;
                                    if (!familiarDraft.priApeTutApo?.trim()) return true;
                                    if (!familiarDraft.nomApeTutApo?.trim()) return true;
                                    if (familiarDraft.lenMatApo && (familiarDraft.lenMatApo.startsWith("9:") || familiarDraft.lenMatApo.startsWith("12:")) && !familiarDraft.lenMatEspApo?.trim()) return true;
                                    if (familiarDraft.autIdeEtApo && (familiarDraft.autIdeEtApo.startsWith("3:") || familiarDraft.autIdeEtApo.startsWith("4:") || familiarDraft.autIdeEtApo.startsWith("8:")) && !familiarDraft.autIdeEtEspApo?.trim()) return true;
                                    return false;
                                })()}
                                className="px-5 py-2 text-xs font-bold text-primary-fg bg-primary hover:bg-primary/90 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/10"
                            >
                                {familiarEditIdx !== null ? 'Guardar cambios' : 'Agregar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL CONFIGURADOR DE ACTIVIDAD DE TIEMPO LIBRE INDIVIDUAL ───────────────── */}
            {isLibreModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn flex flex-col">
                        
                        {/* Cabecera del modal */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase flex items-center gap-2">
                                    {editingLibreIndex !== null ? '✏️ Editar Actividad de Tiempo Libre' : '➕ Agregar Actividad de Tiempo Libre'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">Configura la actividad, la permanencia de tiempo y su agenda semanal de horarios.</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setIsLibreModalOpen(false)} 
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Cuerpo del modal */}
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
                            
                            {/* Actividad */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-700 uppercase block">¿Qué actividad realiza?</label>
                                <select
                                    value={modalLibreActividad}
                                    onChange={(e) => setModalLibreActividad(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm bg-white"
                                >
                                    <option value="">-- SELECCIONA UNA ACTIVIDAD --</option>
                                    <option value="Estudiar / Hacer tareas">📚 Estudiar / Hacer tareas</option>
                                    <option value="Dormir / Descansar">😴 Dormir / Descansar</option>
                                    <option value="Jugar / Ocio / Recreación">🎮 Jugar / Ocio / Recreación</option>
                                    <option value="Deportes">🏃 Deportes</option>
                                    <option value="Actividades artísticas / Talleres">🎭 Actividades artísticas / Talleres</option>
                                    <option value="Tareas del hogar / Apoyo familiar">🏡 Tareas del hogar / Apoyo familiar</option>
                                    <option value="Otro (especificar)">Otro (especificar)</option>
                                </select>
                                
                                {modalLibreActividad === 'Otro (especificar)' && (
                                    <div className="pt-2 animate-slideDown">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Especifica la actividad</label>
                                        <input
                                            type="text"
                                            value={modalLibreActividadEspecifique}
                                            onChange={(e) => setModalLibreActividadEspecifique(e.target.value)}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm uppercase"
                                            placeholder="Escribe la actividad específica"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Duración / Hace cuánto */}
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-700 uppercase block">¿Hace cuánto tiempo realiza esta actividad?</label>
                                
                                {/* Selector de modo */}
                                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
                                    <button
                                        type="button"
                                        onClick={() => setModalLibreTiempoModo('simple')}
                                        className={clsx(
                                            "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                            modalLibreTiempoModo === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        )}
                                    >
                                        ⏱️ Registro Simple
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModalLibreTiempoModo('detalle')}
                                        className={clsx(
                                            "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all uppercase",
                                            modalLibreTiempoModo === 'detalle' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                                        )}
                                    >
                                        📝 Escribir Detalle
                                    </button>
                                </div>

                                {modalLibreTiempoModo === 'simple' ? (
                                    <div className="grid grid-cols-2 gap-4 max-w-md animate-slideDown">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase block">Cantidad</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={modalLibreTiempoValor}
                                                onChange={(e) => setModalLibreTiempoValor(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase block">Unidad de Tiempo</span>
                                            <select
                                                value={modalLibreTiempoUnidad}
                                                onChange={(e) => setModalLibreTiempoUnidad(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border text-sm bg-white"
                                            >
                                                <option value="Días">Día(s)</option>
                                                <option value="Semanas">Semana(s)</option>
                                                <option value="Meses">Mes(es)</option>
                                                <option value="Años">Año(s)</option>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-slideDown">
                                        <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Escribe la duración</span>
                                        <input
                                            type="text"
                                            value={modalLibreTiempoDetalle}
                                            onChange={(e) => setModalLibreTiempoDetalle(e.target.value)}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-3 border text-sm"
                                            placeholder="Ej: 3 meses, 1 año, todos los días, etc..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Sub-formulario de Agenda Semanal */}
                            <div className="border-t border-slate-100 pt-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                                        <span>📅 Agenda Semanal de la Actividad</span>
                                    </h4>
                                    
                                    {/* Botones de selección rápida */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => seleccionarDiasPredefinidosLibre('todos')}
                                            className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                            title="Activar de Lunes a Domingo"
                                        >
                                            Todos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarDiasPredefinidosLibre('laborables')}
                                            className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                            title="Activar de Lunes a Viernes"
                                        >
                                            Lun-Vie
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarDiasPredefinidosLibre('finde')}
                                            className="text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition-all uppercase border border-slate-200 shadow-sm"
                                            title="Activar Sábado y Domingo"
                                        >
                                            Sáb-Dom
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => seleccionarDiasPredefinidosLibre('ninguno')}
                                            className="text-[9px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 rounded transition-all uppercase border border-rose-200 shadow-sm"
                                            title="Desactivar todos los días"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>

                                {/* Premium: Copiar horarios de forma masiva */}
                                {Object.values(modalLibreJornadaSemanal).filter(d => d.activo).length > 1 && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 flex items-center justify-between gap-3 animate-slideDown">
                                        <span className="text-[10px] text-indigo-700 font-medium leading-tight">
                                            💡 Configura el horario del primer día marcado y cópialo a los demás días activos para ahorrar tiempo.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={copiarHorariosPrimerDiaActivoLibre}
                                            className="text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-md shadow-sm transition-all uppercase whitespace-nowrap flex items-center gap-1 hover:scale-[1.02] active:scale-95"
                                        >
                                            ⚡ Copiar Horario
                                        </button>
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => {
                                        const isDiaActivo = !!modalLibreJornadaSemanal[dia]?.activo;
                                        const tieneTurno2 = !!modalLibreJornadaSemanal[dia]?.tieneTurno2;

                                        return (
                                            <div key={dia} className={clsx(
                                                "border rounded-xl p-4 transition-all duration-200 text-left",
                                                isDiaActivo ? "border-indigo-200 bg-indigo-50/10 shadow-sm" : "border-slate-200 bg-slate-50/50 opacity-70"
                                            )}>
                                                {/* Checkbox selector del Día */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`modal-libre-switch-${dia}`}
                                                            checked={isDiaActivo}
                                                            onChange={(e) => {
                                                                setModalLibreJornadaSemanal({
                                                                    ...modalLibreJornadaSemanal,
                                                                    [dia]: {
                                                                        ...modalLibreJornadaSemanal[dia],
                                                                        activo: e.target.checked
                                                                    }
                                                                });
                                                            }}
                                                            className="h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                        <label htmlFor={`modal-libre-switch-${dia}`} className="font-bold text-sm text-slate-800 cursor-pointer select-none">{dia}</label>
                                                    </div>
                                                    {isDiaActivo && (
                            )}
                            <button
                                type="button"
                                onClick={() => { 
                                    setDrawerOpen(false); 
                                    setPendingSubmitData(null); 
                                }}
                                className="w-full py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center border border-slate-200/50 cursor-pointer"
                            >
                                Cancelar — revisar ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

