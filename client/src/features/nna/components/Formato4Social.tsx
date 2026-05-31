import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';
import { useState, useEffect, useMemo } from 'react';
import { Printer, Save, Plus, Edit2, Trash2, X, ArrowLeft, User, Users, GraduationCap, HeartPulse, Target, Clock, Timer, Briefcase, AlertCircle, School } from 'lucide-react';
import { UbigeoSelectorSimple } from './UbigeoSelectorSimple';
import { ActividadModal } from './ActividadModal';
import { InputField, SelectField } from '../../../components/ui/FormFields';
import { useNnaStore } from '../../../store/nna.store';
import clsx from 'clsx';

interface Formato4SocialProps {
    nna: any;
    caso?: any;
    initialData?: any; // Para modo edición
    onClose?: () => void; // Para volver a la lista
    onSuccess?: () => void; // Para refrescar la lista
}

interface FamilyMember {
    primerApellido: string;
    segundoApellido: string;
    nombres: string;
    parentesco: string;
    edad: string;
    sexo: string;
    estadoCivil: string;
    gradoInstruccion: string;
    ocupacion: string;

    // SEC 2026 detailed fields
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
    viveCon?: string;
    telefono?: string;
    dni?: string;
    esTutorPrincipal?: boolean | string;
}

interface Need {
    categoria: string;
    descripcion: string;
    faseI: string;
    faseII: string;
    faseIII: string;
}

const diffHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(h2)) return 0;
    const date1 = new Date(2000, 1, 1, h1, m1);
    let date2 = new Date(2000, 1, 1, h2, m2);
    if (date2 < date1) date2.setDate(date2.getDate() + 1);
    return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
};

const calcularHorasSemanales = (agenda: any): number => {
    let total = 0;
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
    dias.forEach(dia => {
        const d = agenda[dia];
        if (d && d.activo) {
            total += diffHours(d.turno1Inicio, d.turno1Fin);
            total += diffHours(d.turno2Inicio, d.turno2Fin);
        }
    });
    return total;
};

const normalizeCatalogText = (value: unknown): string => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const normalizeEstudiaActualmente = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return 'NO';
    const str = String(value).toUpperCase().trim();
    if (str === '1' || str === 'SI' || str === 'TRUE') return 'SI';
    if (str === '0' || str === 'NO' || str === 'FALSE') return 'NO';
    if (str === '3' || str === 'PROCESO') return 'PROCESO';
    if (str === '99' || str === 'NO_APLICA' || str === 'NO APLICA') return 'NO_APLICA';
    return str;
};

const normalizeNivelEducativo = (value: unknown): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    if (['1','2','3','4','5','6','7','8','9','10','11'].includes(normalized)) return normalized;
    if (normalized.includes('INICIAL')) return '2';
    if (normalized.includes('PRIMARIA INCOMPLETA')) return '3';
    if (normalized.includes('PRIMARIA COMPLETA') || normalized === 'PRIMARIA') return '4';
    if (normalized.includes('SECUNDARIA INCOMPLETA')) return '5';
    if (normalized.includes('SECUNDARIA COMPLETA') || normalized === 'SECUNDARIA') return '6';
    if (normalized.includes('SIN NIVEL') || normalized.includes('NO ESCOLAR')) return '1';
    return normalized;
};

const normalizeModalidadEstudio = (value: unknown): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    if (['1','2','3','4','5','6'].includes(normalized)) return normalized;
    if (normalized.includes('EBR') || normalized.includes('REGULAR')) return '1';
    if (normalized.includes('EBA') || normalized.includes('ALTERNAT')) return '2';
    if (normalized.includes('EBE') || normalized.includes('ESPECIAL')) return '3';
    if (normalized.includes('CETPRO')) return '6';
    return normalized;
};

const normalizeGradoEstudio = (value: unknown): string => {
    if (!value) return '';
    const str = String(value).toUpperCase().trim();
    if (['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','99'].includes(str)) return str;
    if (str.includes('INICIAL')) return '1';
    if (str.includes('1RO PRIMARIA') || str.includes('1 PRIMARIA') || str.includes('1° PRIMARIA') || str === '1ERO' || str === '1RO') return '2';
    if (str.includes('2DO PRIMARIA') || str.includes('2 PRIMARIA') || str.includes('2° PRIMARIA') || str === '2DO') return '3';
    if (str.includes('3RO PRIMARIA') || str.includes('3 PRIMARIA') || str.includes('3° PRIMARIA') || str === '3RO') return '4';
    if (str.includes('4TO PRIMARIA') || str.includes('4 PRIMARIA') || str.includes('4° PRIMARIA') || str === '4TO') return '5';
    if (str.includes('5TO PRIMARIA') || str.includes('5 PRIMARIA') || str.includes('5° PRIMARIA') || str === '5TO') return '6';
    if (str.includes('6TO PRIMARIA') || str.includes('6 PRIMARIA') || str.includes('6° PRIMARIA') || str === '6TO') return '7';
    if (str.includes('1RO SECUNDARIA') || str.includes('1 SECUNDARIA') || str.includes('1° SECUNDARIA') || str === '1ERO SECUNDARIA' || str === '1RO SEC') return '8';
    if (str.includes('2DO SECUNDARIA') || str.includes('2 SECUNDARIA') || str.includes('2° SECUNDARIA') || str === '2DO SECUNDARIA' || str === '2DO SEC') return '9';
    if (str.includes('3RO SECUNDARIA') || str.includes('3 SECUNDARIA') || str.includes('3° SECUNDARIA') || str === '3RO SECUNDARIA' || str === '3RO SEC') return '10';
    if (str.includes('4TO SECUNDARIA') || str.includes('4 SECUNDARIA') || str.includes('4° SECUNDARIA') || str === '4TO SECUNDARIA' || str === '4TO SEC') return '11';
    if (str.includes('5TO SECUNDARIA') || str.includes('5 SECUNDARIA') || str.includes('5° SECUNDARIA') || str === '5TO SECUNDARIA' || str === '5TO SEC') return '12';
    if (str.includes('NO APLICA') || str.includes('NO SABE')) return '99';
    return str;
};

const DIAS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;

export const Formato4Social = ({ nna, caso, initialData, onClose, onSuccess }: Formato4SocialProps) => {

    const { parametros, fetchParametros } = useNnaStore();

    useEffect(() => {
        fetchParametros();
    }, [fetchParametros]);

    const opcionesSexo = parametros?.OPCIONES_SEXO_2026 || [
        { value: '1', label: '1: Masculino' },
        { value: '2', label: '2: Femenino' }
    ];

    const opcionesTipoDocumento = parametros?.OPCIONES_TIP_DOC_APO_2026 || [
        { value: '1', label: '1: DNI' },
        { value: '2', label: '2: Carné de extranjería' },
        { value: '3', label: '3: Pasaporte' },
        { value: '7', label: '7: No tiene' }
    ];

    const opcionesVinculo = parametros?.OPCIONES_VINCULO_TUTOR_2026 || [
        { value: '1', label: '1: Padre o madre' },
        { value: '2', label: '2: Tio/a' },
        { value: '3', label: '3: Abuelo/a' },
        { value: '4', label: '4: Hermano/a' },
        { value: '5', label: '5: Otro familiar (ej. cuñado/a)' },
        { value: '6', label: '6: Otro no familiar (no pariente)' }
    ];

    const opcionesLengua = parametros?.OPCIONES_LENGUA_APO_2026 || [
        { value: '10', label: '10: Castellano' },
        { value: '1', label: '1: Quechua' },
        { value: '2', label: '2: Aimara' },
        { value: '3', label: '3: Asháninka' },
        { value: '4', label: '4: Awajún/Aguaruna' },
        { value: '5', label: '5: Shipibo-Conibo' },
        { value: '6', label: '6: Shawi/ Chayahuita' },
        { value: '7', label: '7: Matsigenka/ Machiguenga' },
        { value: '8', label: '8: Achuar' },
        { value: '9', label: '9: Otra lengua indígena u originaria' },
        { value: '11', label: '11: Portugués' },
        { value: '12', label: '12: Otra lengua extranjera' },
        { value: '13', label: '13: Lengua de señas peruana' },
        { value: '14', label: '14: No escucha ni habla' },
        { value: '16', label: '16: No responde / No sabe' },
        { value: '99', label: '99: No aplica' }
    ];

    const opcionesEtnia = parametros?.OPCIONES_ETNIA_APO_2026 || [
        { value: '7', label: '7: Mestizo' },
        { value: '1', label: '1: Quechua' },
        { value: '2', label: '2: Aimara' },
        { value: '3', label: '3: Indígena u originario de la Amazonía' },
        { value: '4', label: '4: Perteneciente o parte de otro pueblo indígena' },
        { value: '5', label: '5: Negro, moreno, zambo, mulato o afrodescendiente' },
        { value: '6', label: '6: Blanco' },
        { value: '8', label: '8: Otro' }
    ];

    const opcionesDiscapacidad = parametros?.OPCIONES_DISCAPACIDAD_APO_2026 || [
        { value: '6', label: 'Ninguna' },
        { value: '1', label: 'Motriz o física' },
        { value: '2', label: 'Sensorial' },
        { value: '3', label: 'Cognitivo-intelectual' },
        { value: '4', label: 'Psicosocial o psíquica' },
        { value: '5', label: 'Más de una discapacidad' }
    ];

    const opcionesCertificado = parametros?.OPCIONES_CERT_DISCAP_APO_2026 || [
        { value: '99', label: 'No aplica' },
        { value: '1', label: 'Sí, tiene Certificado de Discapacidad' },
        { value: '2', label: 'Sí, tiene, pero no lo porta' },
        { value: '3', label: 'No, no cuenta con Certificado' },
        { value: '4', label: 'En trámite' }
    ];

    const [activeTab, setActiveTab] = useState<'GENERAL' | 'FAMILIA' | 'EDUCACION' | 'SALUD' | 'NECESIDADES'>('GENERAL');
    const [loading, setLoading] = useState(false);

    // --- ESTADO DEL FORMULARIO (Basado en la estructura del backend) ---
    // ── Parsear datos_f03 CLOB para pre-cargar campos del educador ──────────
    const datosF03 = (() => {
        try { return nna?.datosF03 ? JSON.parse(nna.datosF03) : {}; }
        catch { return {}; }
    })();
    const familiaresF03 = Array.isArray(datosF03.familiares) ? datosF03.familiares : [];
    // Tutor principal: Primero buscar familiar con el flag explicito 'esTutorPrincipal'
    const tutorPrincipal = familiaresF03.find((f: any) =>
        f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true
    ) || familiaresF03.find((f: any) =>
        ['Madre','Padre','Tutor legal'].includes(f.parentesco)
    ) || familiaresF03[0] || null;

    // ── Pre-carga de datos desde F03 (NNA + Caso) ──────────────────────────
    const perfilCaso = caso?.perfil || '';
    const perfilCalle = {
        trabajoInfantil: perfilCaso === 'TRABAJO_EN_CALLE',
        mendicidad:      perfilCaso === 'MENDICIDAD',
        vidaEnCalle:     perfilCaso === 'VIDA_EN_CALLE' || perfilCaso === 'VIDA_CALLE',
        transito:        false,
        convivencia:     false,
    };
    const explotacionSexualF03: boolean | null =
        caso?.victimaExplotacion === 'SI' || caso?.victima_explotacion === 'SI' || perfilCaso === 'EXPLOTACION_SEXUAL' ? true : 
        (caso?.victimaExplotacion === 'NO' || caso?.victima_explotacion === 'NO' ? false : null);

    const [formData, setFormData] = useState({
        // I-III. Datos Generales y Calle
        noTieneDNI:         !nna?.numeroDoc,
        edad:               nna?.edad        ? String(nna.edad) : '',
        unidadEdad:         nna?.unidadEdad  || 'ANIOS',
        direccionActual:    nna?.domicilioActual    || '',
        ubigeoDepto:        nna?.departamentoDom  || '',
        ubigeoProvinc:      nna?.provinciaDom     || '',
        ubigeoDistrito:     nna?.distritoDom      || '',
        referenciaDireccion: nna?.referenciaDomicilio || '',
        telefonoContacto:   nna?.telefonoContacto   || '',

        tiempoEnCalle:      caso?.tiempoEnCalle        || '',
        puntoConcentracion: caso?.zonaIntervencion     || '',
        actividadEconomica: caso?.actividadRealizada   || '',
        situacionCalleDetalle: {
            perfil: perfilCalle,
            tiempo: { cantidad: '', unidad: 'MESES' },
            explotacionSexual: explotacionSexualF03,
            ingresoSemanal: '',
            horarios:  { manana: false, tarde: false, noche: false },
            frecuencia: { diario: false, interdiario: false, finesSemana: false, temporadas: false },
            motivo: '',
            modalidadTrabajo: { puestoFijo: false, ambulante: false, recorre: false },
            actividad: '',
            lugar: '',
            acompanamiento: { solo: false, acompanado: false, acompanadoFamiliar: false, quien: '' },
            obligado:   { si: false, no: false, quien: '' },
            escapoCasa: { si: false, no: false, veces: '' },
            consumo:    { si: false, no: false, tipo: '', frecuencia: '', tiempo: '', unidadTiempo: 'MESES' }
        },

        // III. Tutor — pre-cargado desde tutor principal del F03
        tutorPrimerApellido:   tutorPrincipal?.priApeTutApo || tutorPrincipal?.primerApellido || tutorPrincipal?.nombres?.split(' ')[0] || '',
        tutorSegundoApellido:  tutorPrincipal?.segApeTutApo || tutorPrincipal?.segundoApellido || tutorPrincipal?.nombres?.split(' ')[1] || '',
        tutorNombre:           tutorPrincipal?.nomApeTutApo || tutorPrincipal?.nombres?.split(' ').slice(2).join(' ') || tutorPrincipal?.nombres || nna?.nombreTutor || '',
        tutorSexo:             tutorPrincipal?.sexoApo || tutorPrincipal?.sexo || '',
        tutorDNI:              tutorPrincipal?.nroDocTutApo || tutorPrincipal?.dni || nna?.dniTutor || '',
        tutorTipoDocumento:    tutorPrincipal?.tipDocTutApo || tutorPrincipal?.tipoDoc || '1',
        tutorFechaNacimiento:  tutorPrincipal?.fechaNacApo || '',
        tutorNacionalidad:     tutorPrincipal?.nacionalidadApo || 'PERUANA',
        tutorParentesco:       tutorPrincipal?.vinTutUsu || tutorPrincipal?.parentesco || nna?.parentescoTutor || nna?.viveCon || '',
        tutorGradoInstruccion: tutorPrincipal?.gradoInstruccion || '',
        tutorDiscapacidad:     tutorPrincipal?.tipoDiscapApo && tutorPrincipal?.tipoDiscapApo !== '6' ? 'SI' : 'NO',
        tutorTipoDiscapacidad: tutorPrincipal?.tipoDiscapApo || '',
        tutorConadis:          tutorPrincipal?.certDiscapApo && ['1', '2'].includes(tutorPrincipal?.certDiscapApo) ? 'SI' : 'NO',
        tutorCertificadoConadis: tutorPrincipal?.certDiscapApo || '99',
        tutorEstadoCivil:      tutorPrincipal?.estadoCivil || '',
        tutorOcupacion:        tutorPrincipal?.ocupacion || '',
        tutorIngreso:          tutorPrincipal?.ingresos || '',
        tutorViveConNna:       tutorPrincipal?.viveCon || 'SI',
        tutorLenguaMaterna:    tutorPrincipal?.lenMatApo || '10',
        tutorEtnia:            tutorPrincipal?.autIdeEtApo || '7',
        tutorTelefono:         tutorPrincipal?.telefono || '',
        tutorConsumoDrogas:    'NO',
        tutorRecibeApoyo:      'NO',
        tutorDeseaDemanda:     'NO',

        familiares: familiaresF03.map((f: any) => ({
            primerApellido:    f.priApeTutApo || f.primerApellido || f.nombres?.split(' ')[0] || '',
            segundoApellido:   f.segApeTutApo || f.segundoApellido || f.nombres?.split(' ')[1] || '',
            nombres:           f.nomApeTutApo || f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
            parentesco:        f.vinTutUsu || f.parentesco || '',
            edad:              f.edad || '',
            sexo:              f.sexoApo || f.sexo || '',
            estadoCivil:       f.estadoCivil || '',
            gradoInstruccion:  f.gradoInstruccion || '',
            ocupacion:         f.ocupacion || '',
            priApeTutApo:      f.priApeTutApo || f.primerApellido || f.nombres?.split(' ')[0] || '',
            segApeTutApo:      f.segApeTutApo || f.segundoApellido || f.nombres?.split(' ')[1] || '',
            nomApeTutApo:      f.nomApeTutApo || f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
            sexoApo:           f.sexoApo || f.sexo || '',
            fechaNacApo:       f.fechaNacApo || '',
            nacionalidadApo:   f.nacionalidadApo || 'PERUANA',
            tipDocTutApo:      f.tipDocTutApo || '',
            nroDocTutApo:      f.nroDocTutApo || f.dni || '',
            vinTutUsu:         f.vinTutUsu || f.parentesco || '',
            lenMatApo:         f.lenMatApo || '10',
            lenMatEspApo:      f.lenMatEspApo || '',
            autIdeEtApo:       f.autIdeEtApo || '7',
            autIdeEtEspApo:    f.autIdeEtEspApo || '',
            tipoDiscapApo:     f.tipoDiscapApo || '6',
            certDiscapApo:     f.certDiscapApo || '99',
            viveCon:           f.viveCon || 'SI',
            telefono:          f.telefono || '',
            esTutorPrincipal:  f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true ? 'true' : 'false'
        })) as FamilyMember[],
        dinamicaFamiliar: {
            contacto:     'SI',
            frecuencia:   'DIARIO',
            rolProtector: 'REGULAR',
            rolProveedor: 'REGULAR'
        },

        // V. Vivienda
        materialVivienda:    'CONCRETO',
        numeroAmbientes:     '1',
        propiedadVivienda:   'PROPIA',
        serviciosBasicos:    { agua: true, luz: true, desague: true, otros: false },
        viviendaSisfoh:      'NO',
        duermeCama:          'SI',
        lugarPernocte:        nna?.lugarPernocte    || '',
        detalleLugarPernocte: nna?.detalleLugarPernocte || '',
        duermeConQuien:       nna?.detalleViveCon  || '',
        duermeSoloAcompanado: 'SOLO',
        higieneDomicilio:    'BUENO',
        tieneAntecedenteAlbergue:   !!nna?.tieneAntecedenteAlbergue,
        tiempoAlbergue:             '',
        detalleAntecedenteAlbergue: nna?.detalleAntecedenteAlbergue || '',

        // VI. Educación
        presentaAtraso:      false,
        tiempoAtraso:        '',
        motivoAtraso:        '',
        problemasAprendizaje: false,
        problemasConducta:   false,
        expulsado:           false,
        vecesExpulsado:      '',
        eduNivel:      normalizeNivelEducativo(nna?.nivelEducativo || '5'),
        eduGrado:      normalizeGradoEstudio(nna?.gradoEstudio || '8'),
        eduTurno:      'MAÑANA',
        eduTipoIE:     'ESTATAL',
        eduModalidad:  normalizeModalidadEstudio(nna?.modalidadEstudio || ''),
        eduEstudia:    normalizeEstudiaActualmente(nna?.estudiaActualmente),
        eduInstitucion: nna?.institucionEducativa || '',
        eduMotivoNoEstudia: nna?.detalleNoEstudia || '',

        // VII. Salud
        afiliadoSIS:              nna?.afiliadoSIS        || 'NO',
        afiliadoOtroSeguro:       nna?.afiliadoOtroSeguro || '',
        detalleOtroSeguro:        nna?.detalleOtroSeguro  || '',
        tieneDiscapacidad:        !!(nna?.tieneDiscapacidad && nna.tieneDiscapacidad !== 0),
        tipoDiscapacidad:         nna?.tipoDiscapacidad   || '',
        detalleDiscapacidad:      nna?.detalleDiscapacidad || '',
        enfermedadCronica:        !!(nna?.sufreEnfermedad && nna.sufreEnfermedad !== 'NO' && nna.sufreEnfermedad !== 0),
        detalleEnfermedadCronica: nna?.detalleEnfermedad  || '',
        observacionesSalud:       nna?.observacionesSalud || '',
        problemaPsicologico:      false,
        detalleProblemaPsicologico: '',
        consumeSustancias:        false,
        tipoSustancias:           '',
        recibeTresAlimentos:      true,
        higieneAdecuada:          true,

        // VIII. Recreación
        tiempoParaJugar:              true,
        vecesJuegaSemana:             '',
        lugarJuego:                   '',
        participaInstitucion:         false,
        tipoInstitucion:              '',
        interesesDeportivos:          false,
        interesesArtisticos:          false,
        actividadesFamilia:           false,
        recreacionActividadFamilia:   'NO',
        recreacionInteresDeporte:     '',
        recreacionInteresArte:        '',
        recreacionParticipaInstitucion: 'NO',
        recreacionTipoInstitucion:    '',
        recreacionInstitucionDetalle: '',

        // IX. Necesidades
        necesidades: [] as Need[]
    });

    // --- MODALES ---
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
    const [currentFamily, setCurrentFamily] = useState<FamilyMember>({
        primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: '', estadoCivil: '', gradoInstruccion: '', ocupacion: '',
        priApeTutApo: '', segApeTutApo: '', nomApeTutApo: '', sexoApo: '', fechaNacApo: '', nacionalidadApo: 'PERUANA', tipDocTutApo: '1', nroDocTutApo: '',
        vinTutUsu: '1', lenMatApo: '10', lenMatEspApo: '', autIdeEtApo: '7', autIdeEtEspApo: '', tipoDiscapApo: '6', certDiscapApo: '99', viveCon: 'SI', telefono: ''
    });

    const [showNeedModal, setShowNeedModal] = useState(false);
    const [editingNeedIndex, setEditingNeedIndex] = useState<number | null>(null);
    const [currentNeed, setCurrentNeed] = useState<Need>({
        categoria: 'SALUD', descripcion: '', faseI: '', faseII: '', faseIII: ''
    });

    // --- ESTADO DE ACTIVIDADES EN CALLE (Trasladado de F03) ---
    const [actividadesCalle, setActividadesCalle] = useState<any[]>(() => {
        // 1. Ver si viene en initialData directamente
        if (initialData?.actividadesCalle && Array.isArray(initialData.actividadesCalle)) {
            return initialData.actividadesCalle;
        }
        // 2. Ver si viene dentro de datos_extra
        if (initialData?.datos_extra) {
            try {
                const extra = typeof initialData.datos_extra === 'string' ? JSON.parse(initialData.datos_extra) : initialData.datos_extra;
                if (Array.isArray(extra?.actividadesCalle)) return extra.actividadesCalle;
            } catch {}
        }
        // 3. Fallback: Pre-cargar desde F03 del NNA (que ya está guardado en BD)
        try {
            const f03 = nna?.datosF03 ? JSON.parse(nna.datosF03) : {};
            if (Array.isArray(f03?.actividadesCalle)) return f03.actividadesCalle;
        } catch {}
        return [];
    });

    const [actividadModalState, setActividadModalState] = useState<{ isOpen: boolean; editIndex: number | null }>({
        isOpen: false,
        editIndex: null
    });

    const openActividadModal = (index: number | null = null) => {
        setActividadModalState({ isOpen: true, editIndex: index });
    };

    const closeActividadModal = () => {
        setActividadModalState({ isOpen: false, editIndex: null });
    };

    const handleSaveActividad = (actividad: any) => {
        if (actividadModalState.editIndex !== null) {
            const copy = [...actividadesCalle];
            copy[actividadModalState.editIndex] = actividad;
            setActividadesCalle(copy);
        } else {
            setActividadesCalle([...actividadesCalle, actividad]);
        }
        closeActividadModal();
    };

    const handleRemoveActividad = (index: number) => {
        const copy = [...actividadesCalle];
        copy.splice(index, 1);
        setActividadesCalle(copy);
    };

    // Cálculos de horas de trabajo en calle
    const horasSemanalesCalculadas = useMemo(() => {
        let total = 0;
        actividadesCalle.forEach(act => {
            if (act.agenda) {
                total += calcularHorasSemanales(act.agenda);
            }
        });
        return Number(total.toFixed(1));
    }, [actividadesCalle]);

    const horasMensualesCalculadas = Number((horasSemanalesCalculadas * 4.28).toFixed(1));

    const riesgoCalculado = useMemo(() => {
        if (horasSemanalesCalculadas === 0) return { color: 'border-slate-200 text-slate-500 bg-slate-50', etiqueta: 'Sin Actividad', desc: 'No se han registrado horas.' };
        if (horasSemanalesCalculadas < 15) return { color: 'border-green-200 text-green-700 bg-green-50', etiqueta: 'Riesgo Bajo', desc: 'Jornada leve o esporádica.' };
        if (horasSemanalesCalculadas <= 35) return { color: 'border-yellow-300 text-yellow-700 bg-yellow-50', etiqueta: 'Riesgo Moderado', desc: 'Jornada que requiere seguimiento.' };
        return { color: 'border-red-300 text-red-700 bg-red-50', etiqueta: 'Riesgo Crítico (Explotación Severa)', desc: '¡Peligro!: Jornada severa que atenta contra la integridad del menor.' };
    }, [horasSemanalesCalculadas]);

    // --- EFECTOS ---
    useEffect(() => {
        if (initialData) {
            setFormData(prev => {
                // Si initialData tiene datos_extra (ya sea como objeto o como string JSON), lo parseamos y combinamos
                let extra: any = {};
                if (initialData.datos_extra) {
                    try {
                        extra = typeof initialData.datos_extra === 'string'
                            ? JSON.parse(initialData.datos_extra)
                            : initialData.datos_extra;
                    } catch (e) {
                        console.error("Error parsing datos_extra in useEffect", e);
                    }
                }

                // Excluir columnas snake_case de la BD y datos_extra para no contaminar formData
                const DB_SNAKE_KEYS = new Set([
                    'id', 'nna_id', 'situacion_calle', 'tiempo_en_calle', 'motivo_ingreso',
                    'lugar_pernota', 'actividad_calle', 'consumo_sustancias', 'nombre_tutor',
                    'dni_tutor', 'direccion_tutor', 'telefono_tutor', 'codigo_ficha_04',
                    'created_at', 'updated_at', 'datos_extra'
                ]);
                const cleanInitialData = Object.fromEntries(
                    Object.entries(initialData).filter(([k]) => !DB_SNAKE_KEYS.has(k))
                );
                const mergedData = {
                    ...prev,
                    ...extra,
                    ...cleanInitialData
                };

                // Normalizadores de códigos y formatos de F03 a F04
                const normCode = (val: any): string => {
                    if (!val) return '';
                    let s = String(val).trim();
                    if (s.includes(':')) return s.split(':')[0].trim();
                    if (s.includes('.')) return s.split('.')[0].trim();
                    
                    const upper = s.toUpperCase();
                    if (upper === 'MASCULINO' || upper === 'HOMBRE' || upper === 'M') return '1';
                    if (upper === 'FEMENINO' || upper === 'MUJER' || upper === 'F') return '2';
                    if (upper === 'DNI') return '1';
                    if (upper === 'PASAPORTE') return '3';
                    if (upper === 'NO TIENE') return '7';
                    return s;
                };

                const normDate = (val: any): string => {
                    if (!val) return '';
                    return String(val).split('T')[0];
                };

                const normYesNo = (val: any): string => {
                    if (!val) return 'SI';
                    let s = String(val).toUpperCase().trim();
                    if (s.includes('NO') || s === '3') return 'NO';
                    return 'SI';
                };

                const combinedName = mergedData.tutorNombre || prev.tutorNombre || '';
                const parts = combinedName.trim().split(/\s+/);
                
                // Si la base de datos devuelve un tutorNombre combinado pero no devuelve los apellidos separados:
                const defaultPriApe = parts[0] || '';
                const defaultSegApe = parts[1] || '';
                const defaultNom = parts.slice(2).join(' ') || '';

                const priApe = mergedData.tutorPrimerApellido || mergedData.priApeTutApo || defaultPriApe;
                const segApe = mergedData.tutorSegundoApellido || mergedData.segApeTutApo || defaultSegApe;
                const nom = mergedData.tutorNombre && !mergedData.tutorPrimerApellido ? defaultNom : (mergedData.tutorNombre || mergedData.nomApeTutApo || prev.tutorNombre);

                const rawFamiliares = (mergedData.familiares && mergedData.familiares.length > 0)
                    ? mergedData.familiares
                    : (extra.familiares && extra.familiares.length > 0)
                    ? extra.familiares
                    : (initialData.familiares && initialData.familiares.length > 0)
                    ? initialData.familiares
                    : (prev.familiares && prev.familiares.length > 0)
                    ? prev.familiares
                    : familiaresF03;
                const mappedFamiliares = Array.isArray(rawFamiliares) ? rawFamiliares.map((f: any) => ({
                    primerApellido:    f.priApeTutApo || f.primerApellido || f.nombres?.split(' ')[0] || '',
                    segundoApellido:   f.segApeTutApo || f.segundoApellido || f.nombres?.split(' ')[1] || '',
                    nombres:           f.nomApeTutApo || f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
                    parentesco:        f.vinTutUsu || f.parentesco || '',
                    edad:              f.edad || '',
                    sexo:              f.sexoApo || f.sexo || '',
                    estadoCivil:       f.estadoCivil || '',
                    gradoInstruccion:  f.gradoInstruccion || '',
                    ocupacion:         f.ocupacion || '',
                    priApeTutApo:      f.priApeTutApo || f.primerApellido || f.nombres?.split(' ')[0] || '',
                    segApeTutApo:      f.segApeTutApo || f.segundoApellido || f.nombres?.split(' ')[1] || '',
                    nomApeTutApo:      f.nomApeTutApo || f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
                    sexoApo:           f.sexoApo || f.sexo || '',
                    fechaNacApo:       f.fechaNacApo || '',
                    nacionalidadApo:   f.nacionalidadApo || 'PERUANA',
                    tipDocTutApo:      f.tipDocTutApo || '',
                    nroDocTutApo:      f.nroDocTutApo || f.dni || '',
                    vinTutUsu:         f.vinTutUsu || f.parentesco || '',
                    lenMatApo:         f.lenMatApo || '10',
                    lenMatEspApo:      f.lenMatEspApo || '',
                    autIdeEtApo:       f.autIdeEtApo || '7',
                    autIdeEtEspApo:    f.autIdeEtEspApo || '',
                    tipoDiscapApo:     f.tipoDiscapApo || '6',
                    certDiscapApo:     f.certDiscapApo || '99',
                    viveCon:           f.viveCon || 'SI',
                    telefono:          f.telefono || '',
                    esTutorPrincipal:  f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true ? 'true' : 'false'
                })) : [];

                return {
                    ...prev,
                    ...mergedData,
                    
                    // Nombres y Apellidos
                    tutorPrimerApellido: priApe,
                    tutorSegundoApellido: segApe,
                    tutorNombre: nom,

                    // Sexo, Documento, Parentesco y Fecha Nacimiento
                    tutorSexo: normCode(mergedData.tutorSexo || mergedData.sexoApo || prev.tutorSexo),
                    tutorFechaNacimiento: normDate(mergedData.tutorFechaNacimiento || mergedData.fechaNacApo || prev.tutorFechaNacimiento),
                    tutorDNI: mergedData.tutorDNI || mergedData.nroDocTutApo || mergedData.dni || prev.tutorDNI || '',
                    tutorTipoDocumento: normCode(mergedData.tutorTipoDocumento || mergedData.tipDocTutApo || prev.tutorTipoDocumento || '1'),
                    tutorParentesco: normCode(mergedData.tutorParentesco || mergedData.vinTutUsu || prev.tutorParentesco),
                    
                    // Ocupación y Grado Instrucción
                    tutorOcupacion: mergedData.tutorOcupacion || mergedData.ocupacion || prev.tutorOcupacion || '',
                    tutorGradoInstruccion: mergedData.tutorGradoInstruccion || mergedData.gradoInstruccion || prev.tutorGradoInstruccion || '',

                    // Discapacidad y CONADIS
                    tutorTipoDiscapacidad: normCode(mergedData.tutorTipoDiscapacidad || mergedData.tipoDiscapApo || prev.tutorTipoDiscapacidad),
                    tutorCertificadoConadis: normCode(mergedData.tutorCertificadoConadis || mergedData.certDiscapApo || prev.tutorCertificadoConadis || '99'),
                    tutorDiscapacidad: (mergedData.tipoDiscapApo && normCode(mergedData.tipoDiscapApo) !== '6') || (mergedData.tutorTipoDiscapacidad && normCode(mergedData.tutorTipoDiscapacidad) !== '6') ? 'SI' : 'NO',
                    tutorConadis: ['1', '2'].includes(normCode(mergedData.certDiscapApo || mergedData.tutorCertificadoConadis)) ? 'SI' : 'NO',
                    
                    // Lengua y etnia también normalizadas
                    tutorLenguaMaterna: normCode(mergedData.tutorLenguaMaterna || mergedData.lenMatApo || prev.tutorLenguaMaterna || '10'),
                    tutorEtnia: normCode(mergedData.tutorEtnia || mergedData.autIdeEtApo || prev.tutorEtnia || '7'),
                    
                    // Ubicación, teléfono y otros
                    tutorTelefono: mergedData.tutorTelefono || mergedData.telefono || prev.tutorTelefono || '',
                    tutorViveConNna: normYesNo(mergedData.tutorViveConNna || mergedData.viveCon),
                    tutorNacionalidad: mergedData.tutorNacionalidad || mergedData.nacionalidadApo || prev.tutorNacionalidad || 'PERUANA',

                    // Garantizar carga segura del Ubigeo en cascada
                    ubigeoDepto: mergedData.ubigeoDepto || mergedData.ubigeo_depto || prev.ubigeoDepto,
                    ubigeoProvinc: mergedData.ubigeoProvinc || mergedData.ubigeo_provinc || prev.ubigeoProvinc,
                    ubigeoDistrito: mergedData.ubigeoDistrito || mergedData.ubigeo_distrito || prev.ubigeoDistrito,

                    // VI. Educación normalizados
                    eduEstudia: normalizeEstudiaActualmente(
                        mergedData.eduEstudia !== undefined && mergedData.eduEstudia !== ''
                            ? mergedData.eduEstudia
                            : nna?.estudiaActualmente
                    ),
                    eduNivel: normalizeNivelEducativo(
                        mergedData.eduNivel !== undefined && mergedData.eduNivel !== ''
                            ? mergedData.eduNivel
                            : nna?.nivelEducativo || '5'
                    ),
                    eduGrado: normalizeGradoEstudio(
                        mergedData.eduGrado !== undefined && mergedData.eduGrado !== ''
                            ? mergedData.eduGrado
                            : nna?.gradoEstudio || '8'
                    ),
                    eduModalidad: normalizeModalidadEstudio(
                        mergedData.eduModalidad !== undefined && mergedData.eduModalidad !== ''
                            ? mergedData.eduModalidad
                            : nna?.modalidadEstudio || ''
                    ),
                    eduInstitucion: mergedData.eduInstitucion !== undefined && mergedData.eduInstitucion !== ''
                        ? mergedData.eduInstitucion
                        : nna?.institucionEducativa || '',
                    eduMotivoNoEstudia: mergedData.eduMotivoNoEstudia !== undefined && mergedData.eduMotivoNoEstudia !== ''
                        ? mergedData.eduMotivoNoEstudia
                        : nna?.detalleNoEstudia || '',

                    familiares: mappedFamiliares,
                };
            });

            // Carga segura de la grilla de actividades
            if (initialData.actividadesCalle && Array.isArray(initialData.actividadesCalle)) {
                setActividadesCalle(initialData.actividadesCalle);
            } else if (initialData.datos_extra) {
                try {
                    const extra = typeof initialData.datos_extra === 'string' ? JSON.parse(initialData.datos_extra) : initialData.datos_extra;
                    if (Array.isArray(extra?.actividadesCalle)) {
                        setActividadesCalle(extra.actividadesCalle);
                    }
                } catch {}
            }
        }
    }, [initialData]);

    // --- HANDLERS ---
    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const isEdit = !!(initialData && initialData.id);
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit
                ? `${INTERVENCION_API_URL}/diagnostico/${initialData.id}`
                : `${INTERVENCION_API_URL}/diagnostico/nna/${nna.id}`;

            const payload = {
                ...formData,
                actividadesCalle: actividadesCalle,
                nnaId: nna.id,
                casoId: caso?.id
            };

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Diagnóstico guardado correctamente');
                if (onSuccess) onSuccess();
            } else {
                const err = await response.json();
                alert('Error al guardar: ' + (err.detail || err.message));
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFamily = () => {
        setEditingFamilyIndex(null);
        setCurrentFamily({
            primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: '', estadoCivil: '', gradoInstruccion: '', ocupacion: '',
            priApeTutApo: '', segApeTutApo: '', nomApeTutApo: '', sexoApo: '', fechaNacApo: '', nacionalidadApo: 'PERUANA', tipDocTutApo: '1', nroDocTutApo: '',
            vinTutUsu: '1', lenMatApo: '10', lenMatEspApo: '', autIdeEtApo: '7', autIdeEtEspApo: '', tipoDiscapApo: '6', certDiscapApo: '99', viveCon: 'SI', telefono: ''
        });
        setShowFamilyModal(true);
    };

    const handleEditFamily = (index: number) => {
        setEditingFamilyIndex(index);
        setCurrentFamily(formData.familiares[index]);
        setShowFamilyModal(true);
    };

    const handleDeleteFamily = (index: number) => {
        if (confirm('¿Eliminar a este integrante de la familia?')) {
            const newFam = [...formData.familiares];
            newFam.splice(index, 1);
            setFormData({ ...formData, familiares: newFam });
        }
    };

    const handleSaveFamily = () => {
        let finalFamiliar = { ...currentFamily };
        const isTutor = finalFamiliar.esTutorPrincipal === 'true' || finalFamiliar.esTutorPrincipal === true;
        
        let newFam = [...formData.familiares];
        
        if (isTutor) {
            // Set all other family members to not be tutor principal
            newFam = newFam.map(f => ({ ...f, esTutorPrincipal: 'false' }));
            finalFamiliar.esTutorPrincipal = 'true';
        }
        
        if (editingFamilyIndex !== null) {
            newFam[editingFamilyIndex] = finalFamiliar;
        } else {
            newFam.push(finalFamiliar);
        }
        
        // If it's the tutor principal, sync with root fields
        let tutorSync = {};
        if (isTutor) {
            tutorSync = {
                tutorPrimerApellido: finalFamiliar.priApeTutApo || finalFamiliar.primerApellido,
                tutorSegundoApellido: finalFamiliar.segApeTutApo || finalFamiliar.segundoApellido,
                tutorNombre: finalFamiliar.nomApeTutApo || finalFamiliar.nombres,
                tutorSexo: finalFamiliar.sexoApo || (finalFamiliar.sexo === 'MASCULINO' ? '1' : finalFamiliar.sexo === 'FEMENINO' ? '2' : ''),
                tutorFechaNacimiento: finalFamiliar.fechaNacApo || '',
                tutorNacionalidad: finalFamiliar.nacionalidadApo || 'PERUANA',
                tutorDNI: finalFamiliar.nroDocTutApo || finalFamiliar.dni || '',
                tutorTipoDocumento: finalFamiliar.tipDocTutApo || '1',
                tutorParentesco: finalFamiliar.vinTutUsu || '1',
                tutorOcupacion: finalFamiliar.ocupacion || '',
                tutorLenguaMaterna: finalFamiliar.lenMatApo || '10',
                tutorEtnia: finalFamiliar.autIdeEtApo || '7',
                tutorTipoDiscapacidad: finalFamiliar.tipoDiscapApo || '6',
                tutorDiscapacidad: finalFamiliar.tipoDiscapApo && finalFamiliar.tipoDiscapApo !== '6' ? 'SI' : 'NO',
                tutorCertificadoConadis: finalFamiliar.certDiscapApo || '99',
                tutorConadis: ['1', '2'].includes(finalFamiliar.certDiscapApo || '') ? 'SI' : 'NO',
                tutorTelefono: finalFamiliar.telefono || ''
            };
        }
        
        setFormData({ 
            ...formData, 
            ...tutorSync,
            familiares: newFam 
        });
        setShowFamilyModal(false);
    };

    const handleAddNeed = () => {
        setEditingNeedIndex(null);
        setCurrentNeed({ categoria: 'SALUD', descripcion: '', faseI: '', faseII: '', faseIII: '' });
        setShowNeedModal(true);
    };

    const handleEditNeed = (index: number) => {
        setEditingNeedIndex(index);
        setCurrentNeed(formData.necesidades[index]);
        setShowNeedModal(true);
    };

    const handleDeleteNeed = (index: number) => {
        if (confirm('¿Eliminar esta necesidad?')) {
            const newNeeds = [...formData.necesidades];
            newNeeds.splice(index, 1);
            setFormData({ ...formData, necesidades: newNeeds });
        }
    };

    const handleSaveNeed = () => {
        const newNeeds = [...formData.necesidades];
        if (editingNeedIndex !== null) {
            newNeeds[editingNeedIndex] = currentNeed;
        } else {
            newNeeds.push(currentNeed);
        }
        setFormData({ ...formData, necesidades: newNeeds });
        setShowNeedModal(false);
    };

    // --- HELPER ESTILOS ---
    const formatDate = (date: string) => {
        if (!date) return '---';
        return new Date(date).toLocaleDateString('es-PE');
    };

    const tableStyle = { width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '10px' };
    const thStyle: React.CSSProperties = { border: '1px solid black', padding: '4px', fontSize: '10px', backgroundColor: '#f2f2f2', textAlign: 'left' };
    const tdStyle: React.CSSProperties = { border: '1px solid black', padding: '4px', fontSize: '10px' };
    const sectionTitle = { backgroundColor: '#333', color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '11px', marginTop: '15px' };
    const labelStyle = { display: 'block', fontSize: '8px', color: '#666', fontWeight: 'bold' };
    const valueStyle = { fontSize: '10px', fontWeight: 'bold' };

    return (
        <div className="bg-bg print:bg-white min-h-screen p-6 print:p-0">

            {/* ===== VISTA WEB (INTERACTIVA) - Solo visible en pantalla ===== */}
            <div className="max-w-7xl mx-auto print:hidden">

                {/* Header con acciones */}
                <div className="bg-surface border-b border-border px-6 py-4 rounded-t-[8px] shadow-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-[16px] font-bold text-fg uppercase">FICHA DE DIAGNÓSTICO SOCIAL</h1>
                            <p className="text-[12px] text-fg-muted mt-0.5">Completa la evaluación social del NNA</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 bg-primary text-primary-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                            >
                                <Save size={16} /> Guardar
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 bg-surface border border-border-strong text-fg px-4 py-2 rounded-[6px] text-[13px] font-medium hover:bg-surface-muted transition-colors"
                            >
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABS DE NAVEGACIÓN */}
                <div className="bg-surface px-4 pt-0 border-x border-border">
                    <div className="flex overflow-x-auto no-scrollbar">
                        {[
                            { id: 'GENERAL',    label: 'I-III. General / Calle',       icon: User },
                            { id: 'FAMILIA',    label: 'IV-V. Familia / Vivienda',     icon: Users },
                            { id: 'EDUCACION',  label: 'VI. Educación',                icon: GraduationCap },
                            { id: 'SALUD',      label: 'VII-VIII. Salud / Recreación', icon: HeartPulse },
                            { id: 'NECESIDADES',label: 'IX. Necesidades',              icon: Target }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex items-center gap-1.5 px-4 py-3.5 border-b-2 text-[12px] font-semibold uppercase tracking-wide transition-all whitespace-nowrap
                                    ${activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary-soft/20'
                                        : 'border-transparent text-fg-muted hover:text-fg hover:bg-surface-muted'}
                                `}
                            >
                                <tab.icon size={14} className={activeTab === tab.id ? 'text-primary' : 'text-fg-muted'} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Contenido del formulario */}
                <div className="bg-surface rounded-b-[8px] shadow-1 p-6 space-y-6 border-t border-border">

                    {/* I. DATOS GENERALES */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                I. DATOS GENERALES
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4">
                            {/* Fila 1: Nombres y Apellidos (75% | col-span-9) and DNI / Documento (25% | col-span-3) */}
                            <div className="col-span-12 md:col-span-9">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nombres y Apellidos</label>
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted text-fg font-medium disabled:opacity-100 disabled:bg-surface-muted select-none"
                                    value={`${nna?.nombres || ''} ${nna?.apellidoPaterno || ''} ${nna?.apellidoMaterno || ''}`}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">DNI / Documento</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        readOnly
                                        disabled
                                        className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted text-fg font-medium disabled:opacity-100 disabled:bg-surface-muted select-none pr-14"
                                        value={nna?.numeroDoc || '---'}
                                    />
                                    {formData.noTieneDNI && (
                                        <span className="absolute right-2 top-1.5 text-[8px] bg-warning/10 text-warning border border-warning/20 px-1 py-0.5 rounded font-bold uppercase select-none">Sin DNI</span>
                                    )}
                                </div>
                            </div>

                            {/* Fila 2: Fecha de Nacimiento (33.3% | col-span-4), Edad / Tiempo (33.3% | col-span-4), and Teléfono (33.3% | col-span-4) */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha Nacimiento</label>
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted text-fg font-medium disabled:opacity-100 disabled:bg-surface-muted select-none"
                                    value={nna?.fechaNacimiento ? new Date(nna.fechaNacimiento).toLocaleDateString('es-PE') : '---'}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Edad / Tiempo</label>
                                <div className="flex -space-x-px">
                                    <input
                                        type="number"
                                        min="0"
                                        max="999"
                                        placeholder="Ej: 12"
                                        className="w-1/2 px-3 py-2 border border-border rounded-l-[6px] text-xs focus:z-10 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none bg-surface"
                                        value={formData.edad}
                                        onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                                    />
                                    <select
                                        className="w-1/2 px-2 py-2 border border-border rounded-r-[6px] text-xs focus:z-10 focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface-muted outline-none border-l-0 font-semibold text-fg"
                                        value={formData.unidadEdad}
                                        onChange={(e) => setFormData({ ...formData, unidadEdad: e.target.value })}
                                    >
                                        <option value="ANIOS">Años</option>
                                        <option value="MESES">Meses</option>
                                        <option value="DIAS">Días</option>
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.telefonoContacto}
                                    onChange={(e) => setFormData({ ...formData, telefonoContacto: e.target.value })}
                                />
                            </div>

                            {/* Fila 3: Dirección (75% | col-span-9) and Referencia (25% | col-span-3) */}
                            <div className="col-span-12 md:col-span-9">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Dirección Actual</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.direccionActual}
                                    onChange={(e) => setFormData({ ...formData, direccionActual: e.target.value })}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Referencia</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.referenciaDireccion}
                                    onChange={(e) => setFormData({ ...formData, referenciaDireccion: e.target.value })}
                                />
                            </div>

                            {/* Fila 4: Ubigeo Político Completo (100% | col-span-12) */}
                            <div className="col-span-12">
                                <UbigeoSelectorSimple
                                    departamento={formData.ubigeoDepto}
                                    provincia={formData.ubigeoProvinc}
                                    distrito={formData.ubigeoDistrito}
                                    onChange={(field, value) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            [field === 'departamento' ? 'ubigeoDepto' : field === 'provincia' ? 'ubigeoProvinc' : 'ubigeoDistrito']: value
                                        }));
                                    }}
                                    onCascadeChange={(updates) =>
                                        setFormData(prev => ({
                                            ...prev,
                                            ubigeoDepto:    updates.departamento ?? prev.ubigeoDepto,
                                            ubigeoProvinc:  updates.provincia    ?? prev.ubigeoProvinc,
                                            ubigeoDistrito: updates.distrito     ?? prev.ubigeoDistrito,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* II. SITUACIÓN DE CALLE */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                II. SITUACIÓN DE CALLE
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-6 text-xs">

                            {/* Perfil */}
                            <div className="col-span-12">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Perfil del Usuario/a</label>
                                <div className="flex flex-wrap gap-3">
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input 
                                            type="radio" 
                                            name="perfilSocial"
                                            checked={formData.situacionCalleDetalle.perfil.trabajoInfantil} 
                                            onChange={() => setFormData({ 
                                                ...formData, 
                                                situacionCalleDetalle: { 
                                                    ...formData.situacionCalleDetalle, 
                                                    perfil: { 
                                                        trabajoInfantil: true, 
                                                        mendicidad: false, 
                                                        vidaEnCalle: false, 
                                                        transito: false, 
                                                        convivencia: false 
                                                    } 
                                                } 
                                            })} 
                                            className="w-4 h-4 text-primary focus:ring-primary outline-none" 
                                        />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Trabajo Infantil</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input 
                                            type="radio" 
                                            name="perfilSocial"
                                            checked={formData.situacionCalleDetalle.perfil.mendicidad} 
                                            onChange={() => setFormData({ 
                                                ...formData, 
                                                situacionCalleDetalle: { 
                                                    ...formData.situacionCalleDetalle, 
                                                    perfil: { 
                                                        trabajoInfantil: false, 
                                                        mendicidad: true, 
                                                        vidaEnCalle: false, 
                                                        transito: false, 
                                                        convivencia: false 
                                                    } 
                                                } 
                                            })} 
                                            className="w-4 h-4 text-primary focus:ring-primary outline-none" 
                                        />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Mendicidad</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-border rounded-[6px] bg-surface-muted/60 cursor-pointer hover:bg-surface-muted">
                                        <input 
                                            type="radio" 
                                            name="perfilSocial"
                                            checked={formData.situacionCalleDetalle.perfil.vidaEnCalle} 
                                            onChange={() => setFormData({ 
                                                ...formData, 
                                                situacionCalleDetalle: { 
                                                    ...formData.situacionCalleDetalle, 
                                                    perfil: { 
                                                        trabajoInfantil: false, 
                                                        mendicidad: false, 
                                                        vidaEnCalle: true, 
                                                        transito: false, 
                                                        convivencia: false 
                                                    } 
                                                } 
                                            })} 
                                            className="w-4 h-4 text-primary focus:ring-primary outline-none" 
                                        />
                                        <span className="font-bold text-[10px] text-fg-2 uppercase">Vida en Calle</span>
                                    </label>
                                </div>
                                {(formData.situacionCalleDetalle.perfil.vidaEnCalle) && (
                                    <div className="mt-2 ml-4 flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="subperfilVidaCalle"
                                                checked={formData.situacionCalleDetalle.perfil.transito} 
                                                onChange={() => setFormData({ 
                                                    ...formData, 
                                                    situacionCalleDetalle: { 
                                                        ...formData.situacionCalleDetalle, 
                                                        perfil: { 
                                                            ...formData.situacionCalleDetalle.perfil, 
                                                            transito: true, 
                                                            convivencia: false 
                                                        } 
                                                    } 
                                                })} 
                                                className="w-4 h-4 text-primary focus:ring-primary outline-none" 
                                            /> 
                                            <span className="text-[10px] text-fg-muted font-bold uppercase">Tránsito</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="subperfilVidaCalle"
                                                checked={formData.situacionCalleDetalle.perfil.convivencia} 
                                                onChange={() => setFormData({ 
                                                    ...formData, 
                                                    situacionCalleDetalle: { 
                                                        ...formData.situacionCalleDetalle, 
                                                        perfil: { 
                                                            ...formData.situacionCalleDetalle.perfil, 
                                                            transito: false, 
                                                            convivencia: true 
                                                        } 
                                                    } 
                                                })} 
                                                className="w-4 h-4 text-primary focus:ring-primary outline-none" 
                                            /> 
                                            <span className="text-[10px] text-fg-muted font-bold uppercase">Convivencia</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Tiempo y Explotación */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tiempo en Calle</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Cant."
                                        className="w-20 px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.cantidad}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, cantidad: e.target.value } } })}
                                    />
                                    <select
                                        className="flex-1 px-3 py-2 border border-border rounded-[6px] text-xs bg-surface focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.unidad}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, unidad: e.target.value } } })}
                                    >
                                        <option value="SEMANAS">SEMANAS</option>
                                        <option value="MESES">MESES</option>
                                        <option value="AÑOS">AÑOS</option>
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿Víctima de Explotación Sexual?</label>
                                <div className="flex gap-6 mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="explotacion_sexual"
                                            checked={formData.situacionCalleDetalle.explotacionSexual === true}
                                            onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, explotacionSexual: true } })}
                                            className="w-4 h-4 text-danger focus:ring-danger/40"
                                        />
                                        <span className="text-xs font-bold text-fg-2">SI</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="explotacion_sexual"
                                            checked={formData.situacionCalleDetalle.explotacionSexual === false}
                                            onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, explotacionSexual: false } })}
                                            className="w-4 h-4 text-primary focus:ring-primary/40"
                                        />
                                        <span className="text-xs font-bold text-fg-2">NO</span>
                                    </label>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Ingreso Aprox. Semanal</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-fg-muted font-bold">S/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        placeholder="0.00"
                                        value={formData.situacionCalleDetalle.ingresoSemanal}
                                        onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, ingresoSemanal: e.target.value } })}
                                    />
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Motivo, Modalidad y Lugar */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Motivo Situación de Calle</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[80px]"
                                    placeholder="Describa el motivo..."
                                    value={formData.situacionCalleDetalle.motivo}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, motivo: e.target.value } })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Modalidad de Trabajo</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.puestoFijo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle.modalidadTrabajo, puestoFijo: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Puesto Fijo</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.ambulante} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle.modalidadTrabajo, ambulante: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Ambulante</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.modalidadTrabajo.recorre} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, modalidadTrabajo: { ...formData.situacionCalleDetalle.modalidadTrabajo, recorre: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Recorre</span>
                                    </label>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Lugar / Zona de Actividad</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={formData.situacionCalleDetalle.lugar}
                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, lugar: e.target.value } })}
                                />
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* NUEVA SECCIÓN DE ACTIVIDADES EN CALLE Y CÓMPUTO HORARIO DESGLOSADO */}
                            <div className="col-span-12">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
                                    {/* Grilla de Actividades (2/3 de ancho) */}
                                    <div className="lg:col-span-2 bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-3 border-b border-border flex items-center justify-between bg-surface-muted/50">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-primary" />
                                                <h3 className="font-black text-fg-2 uppercase tracking-wide text-xs">Actividades en Calle (Desglosadas)</h3>
                                            </div>
                                            <span className="text-[10px] font-bold text-fg-muted bg-surface px-2.5 py-0.5 rounded-full shadow-sm border border-border">
                                                {actividadesCalle.length} actividades
                                            </span>
                                        </div>

                                        <div className="p-4 flex-1 space-y-4">
                                            {actividadesCalle.length === 0 ? (
                                                <div className="text-center py-8 bg-surface-muted/30 border-2 border-dashed border-border rounded-lg">
                                                    <Briefcase className="w-8 h-8 text-fg-muted/40 mx-auto mb-2" />
                                                    <p className="text-fg font-bold text-xs">No hay actividades registradas</p>
                                                    <p className="text-fg-muted text-[10px] mb-3">Las actividades de calle y sus horarios se trasladan desde el F03.</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => openActividadModal()}
                                                        className="px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded hover:bg-primary/20 transition-colors"
                                                    >
                                                        + Agregar Actividad
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Encabezados de tabla */}
                                                    <div className="hidden md:grid grid-cols-12 gap-3 text-[9px] font-black text-fg-muted uppercase tracking-wider pb-2 border-b border-border">
                                                        <div className="col-span-4">Actividad / Trabajo</div>
                                                        <div className="col-span-2 text-center">Acompañamiento</div>
                                                        <div className="col-span-2 text-center">Permanencia</div>
                                                        <div className="col-span-4 text-center">Agenda Semanal</div>
                                                    </div>

                                                    {actividadesCalle.map((act, index) => (
                                                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center group relative border-b border-border pb-3 last:border-0 last:pb-0">
                                                            <div className="md:col-span-4 flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                                                <p className="font-extrabold text-fg text-xs tracking-wide uppercase">
                                                                    {act.actividad === 'OTROS' ? act.actividadEspecifique : act.actividad?.replace(/_/g, ' ')}
                                                                </p>
                                                            </div>

                                                            <div className="md:col-span-2 text-center flex justify-start md:justify-center">
                                                                <span className="text-[9px] font-bold px-2 py-0.5 bg-surface-muted text-fg-muted rounded-full border border-border/60 uppercase">
                                                                    {act.acompanamiento}
                                                                </span>
                                                            </div>

                                                            <div className="md:col-span-2 text-center flex items-center justify-start md:justify-center gap-1 text-fg-muted font-semibold text-xs">
                                                                <Timer className="w-3.5 h-3.5 text-fg-muted" />
                                                                <span>{act.tiempoValor} {act.tiempoUnidad?.toLowerCase()}</span>
                                                            </div>

                                                            <div className="md:col-span-4 flex flex-col items-start md:items-center">
                                                                <div className="flex gap-1 mb-1">
                                                                    {DIAS_KEYS.map((k, i) => {
                                                                        const isActive = act.agenda?.[k]?.activo;
                                                                        return (
                                                                            <div key={k} className={clsx("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all", isActive ? "bg-primary text-white" : "bg-surface-muted text-fg-muted/40 border border-border")}>
                                                                                {DIAS_SHORT[i]}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Acciones */}
                                                            <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-surface/90 backdrop-blur pl-2 flex gap-1 rounded border border-border shadow-sm">
                                                                <button type="button" onClick={() => openActividadModal(index)} className="p-1 text-primary hover:bg-surface-muted rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                <button type="button" onClick={() => handleRemoveActividad(index)} className="p-1 text-danger hover:bg-surface-muted rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => openActividadModal()}
                                                        className="w-full py-2.5 border border-dashed border-primary/50 rounded-lg text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/5 hover:border-primary transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Agregar Actividad
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Panel de Cómputo Horario (1/3 de ancho) */}
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-br from-primary to-primary-hover text-white rounded-xl p-4 relative shadow overflow-hidden">
                                            <span className="text-[9px] font-black uppercase tracking-wider block opacity-90">Horas por Semana</span>
                                            <span className="text-3xl font-extrabold block mt-1 tracking-tight">{horasSemanalesCalculadas} <span className="text-xs font-normal">hrs</span></span>
                                            <span className="text-[9px] block mt-1 opacity-80">Suma total de todas las actividades</span>
                                        </div>

                                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-4 relative shadow overflow-hidden">
                                            <span className="text-[9px] font-black uppercase tracking-wider block opacity-90">Horas Mensuales (Est.)</span>
                                            <span className="text-3xl font-extrabold block mt-1 tracking-tight">{horasMensualesCalculadas} <span className="text-xs font-normal">hrs</span></span>
                                            <span className="text-[9px] block mt-1 opacity-80">Promedio mensual global</span>
                                        </div>
                                        <div className={clsx("border rounded-xl p-4 space-y-2 transition-all duration-300", riesgoCalculado.color)}>
                                            <span className="text-[9px] font-black uppercase tracking-wider block">Intensidad Laboral</span>
                                            <span className="text-sm font-black block leading-tight">{riesgoCalculado.etiqueta}</span>
                                            <p className="text-[10px] leading-relaxed opacity-90">{riesgoCalculado.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Obligado y Escapó */}
                            <div className="col-span-12 md:col-span-6 bg-danger-soft p-3 rounded-[6px] border border-danger/20 transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-danger uppercase">¿Es obligado a trabajar?</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="obligado" checked={formData.situacionCalleDetalle.obligado.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { si: true, no: false, quien: '' } } })} className="text-danger" /> <span className="text-xs font-bold">SI</span></label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="obligado" checked={formData.situacionCalleDetalle.obligado.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { si: false, no: true, quien: '' } } })} className="text-fg-muted" /> <span className="text-xs font-bold">NO</span></label>
                                    </div>
                                </div>
                                {formData.situacionCalleDetalle.obligado.si && (
                                    <div className="mt-2 animate-fadeIn">
                                        <input
                                            type="text"
                                            placeholder="¿Quién lo obliga?"
                                            className="w-full px-2 py-1 border border-danger/20 rounded text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-danger"
                                            value={formData.situacionCalleDetalle.obligado.quien}
                                            onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, obligado: { ...formData.situacionCalleDetalle.obligado, quien: e.target.value } } })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="col-span-12 md:col-span-6 bg-warning-soft p-3 rounded-[6px] border border-warning/20 transition-all duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-bold text-warning uppercase">¿Escapó de casa?</label>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="escapo" checked={formData.situacionCalleDetalle.escapoCasa.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { si: true, no: false, veces: '' } } })} className="text-warning" /> <span className="text-xs font-bold">SI</span></label>
                                        <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="escapo" checked={formData.situacionCalleDetalle.escapoCasa.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { si: false, no: true, veces: '' } } })} className="text-fg-muted" /> <span className="text-xs font-bold">NO</span></label>
                                    </div>
                                </div>
                                {formData.situacionCalleDetalle.escapoCasa.si && (
                                    <div className="mt-2 animate-fadeIn">
                                        <input
                                            type="text"
                                            placeholder="¿Cuántas veces?"
                                            className="w-full px-2 py-1 border border-warning/20 rounded text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-warning"
                                            value={formData.situacionCalleDetalle.escapoCasa.veces}
                                            onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, escapoCasa: { ...formData.situacionCalleDetalle.escapoCasa, veces: e.target.value } } })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Consumo */}
                            <div className="col-span-12 border-t border-border pt-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Consumo de Sustancias Psicoactivas</label>
                                <div className="bg-surface-muted rounded-[6px] p-3 border border-border">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-fg-2">¿Consume?</span>
                                        <div className="flex gap-3">
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="consumo" checked={formData.situacionCalleDetalle.consumo.si} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, si: true, no: false } } })} className="text-danger" /> <span className="text-xs font-bold">SI</span></label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="consumo" checked={formData.situacionCalleDetalle.consumo.no} onChange={() => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, si: false, no: true, tipo: '', frecuencia: '', tiempo: '', unidadTiempo: 'SEMANAS' } } })} className="text-success" /> <span className="text-xs font-bold">NO</span></label>
                                        </div>
                                    </div>
                                    {formData.situacionCalleDetalle.consumo.si && (
                                        <div className="grid grid-cols-12 gap-4 mt-3 pt-3 border-t border-border animate-fadeIn">
                                            <div className="col-span-12">
                                                <input
                                                    type="text"
                                                    placeholder="¿Qué tipo de sustancias?"
                                                    className="w-full px-3 py-1.5 border border-border rounded text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-danger"
                                                    value={formData.situacionCalleDetalle.consumo.tipo}
                                                    onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, tipo: e.target.value } } })}
                                                />
                                            </div>
                                            <div className="col-span-12 md:col-span-6 flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-fg-muted uppercase">Frecuencia:</span>
                                                <div className="flex gap-2">
                                                    {['Experimental', 'Ocasional', 'Habitual'].map(fr => (
                                                         <label key={fr} className="text-[10px] flex items-center gap-1 cursor-pointer">
                                                             <input type="radio" name="frecuenciaConsumo" value={fr.toUpperCase()} checked={formData.situacionCalleDetalle.consumo.frecuencia === fr.toUpperCase()} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, frecuencia: e.target.value } } })} />
                                                             {fr}
                                                         </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-6 flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-fg-muted uppercase">Tiempo:</span>
                                                <input type="text" className="w-16 px-2 py-1 border border-border rounded text-xs bg-surface" placeholder="Cant." value={formData.situacionCalleDetalle.consumo.tiempo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, tiempo: e.target.value } } })} />
                                                <select className="px-2 py-1 border border-border rounded text-xs bg-surface" value={formData.situacionCalleDetalle.consumo.unidadTiempo} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, consumo: { ...formData.situacionCalleDetalle.consumo, unidadTiempo: e.target.value } } })}>
                                                    <option value="SEMANAS">Semanas</option>
                                                    <option value="MESES">Meses</option>
                                                    <option value="AÑOS">Años</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* III. TUTOR */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                III. DATOS DEL TUTOR/APODERADO/FAMILIAR
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">

                            {/* Fila 1: Apellidos y Nombres */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Primer Apellido</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorPrimerApellido}
                                    onChange={(e) => setFormData({ ...formData, tutorPrimerApellido: e.target.value.toUpperCase() })}
                                    placeholder="Primer Apellido"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Segundo Apellido</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorSegundoApellido}
                                    onChange={(e) => setFormData({ ...formData, tutorSegundoApellido: e.target.value.toUpperCase() })}
                                    placeholder="Segundo Apellido"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nombres <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorNombre}
                                    onChange={(e) => setFormData({ ...formData, tutorNombre: e.target.value.toUpperCase() })}
                                    placeholder="Nombres del Familiar"
                                    required
                                />
                            </div>

                            {/* Fila 2: Sexo, Fecha Nac, Nacionalidad */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Sexo</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorSexo}
                                    onChange={(e) => setFormData({ ...formData, tutorSexo: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesSexo.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha de Nacimiento</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorFechaNacimiento}
                                    onChange={(e) => setFormData({ ...formData, tutorFechaNacimiento: e.target.value })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nacionalidad</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorNacionalidad}
                                    onChange={(e) => setFormData({ ...formData, tutorNacionalidad: e.target.value.toUpperCase() })}
                                    placeholder="PERUANA"
                                />
                            </div>

                            {/* Fila 3: Documento de Identidad y Parentesco */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tipo Documento</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorTipoDocumento}
                                    onChange={(e) => setFormData({ ...formData, tutorTipoDocumento: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesTipoDocumento.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nº de Documento</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorDNI}
                                    onChange={(e) => setFormData({ ...formData, tutorDNI: e.target.value })}
                                    placeholder="Número de Documento"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Vínculo con el NNA</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorParentesco}
                                    onChange={(e) => setFormData({ ...formData, tutorParentesco: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesVinculo.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fila 4: Teléfono, Ocupación, Vive con NNA */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Teléfono de Contacto</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorTelefono}
                                    onChange={(e) => setFormData({ ...formData, tutorTelefono: e.target.value })}
                                    placeholder="Ej. 999888777"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Ocupación</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorOcupacion}
                                    onChange={(e) => setFormData({ ...formData, tutorOcupacion: e.target.value })}
                                    placeholder="Ej. Independiente, Comerciante..."
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Vive con el NNA?</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorViveConNna}
                                    onChange={(e) => setFormData({ ...formData, tutorViveConNna: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    <option value="SI">Sí</option>
                                    <option value="NO">No</option>
                                </select>
                            </div>

                            {/* Fila 5: Lengua, Autoidentificación, Estado Civil */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Lengua Materna</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorLenguaMaterna}
                                    onChange={(e) => setFormData({ ...formData, tutorLenguaMaterna: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesLengua.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Autoidentificación Étnica</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorEtnia}
                                    onChange={(e) => setFormData({ ...formData, tutorEtnia: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesEtnia.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Estado Civil</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorEstadoCivil}
                                    onChange={(e) => setFormData({ ...formData, tutorEstadoCivil: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    <option value="SOLTERO(A)">SOLTERO(A)</option>
                                    <option value="CASADO(A)">CASADO(A)</option>
                                    <option value="CONVIVIENTE">CONVIVIENTE</option>
                                    <option value="DIVORCIADO(A)">DIVORCIADO(A)</option>
                                    <option value="VIUDO(A)">VIUDO(A)</option>
                                </select>
                            </div>

                            {/* Fila 6: Grado Instrucción, Discapacidad y CONADIS */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Grado de Instrucción</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorGradoInstruccion}
                                    onChange={(e) => setFormData({ ...formData, tutorGradoInstruccion: e.target.value })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    <option value="SIN_INSTRUCCION">SIN INSTRUCCIÓN</option>
                                    <option value="PRIMARIA_INCOMPLETA">PRIMARIA INCOMPLETA</option>
                                    <option value="PRIMARIA_COMPLETA">PRIMARIA COMPLETA</option>
                                    <option value="SECUNDARIA_INCOMPLETA">SECUNDARIA INCOMPLETA</option>
                                    <option value="SECUNDARIA_COMPLETA">SECUNDARIA COMPLETA</option>
                                    <option value="SUPERIOR_INCOMPLETA">SUPERIOR INCOMPLETA</option>
                                    <option value="SUPERIOR_COMPLETA">SUPERIOR COMPLETA</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tipo de Discapacidad</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorTipoDiscapacidad}
                                    onChange={(e) => setFormData({ ...formData, tutorTipoDiscapacidad: e.target.value, tutorDiscapacidad: e.target.value === '6' ? 'NO' : 'SI' })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesDiscapacidad.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Certificado CONADIS?</label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                    value={formData.tutorCertificadoConadis}
                                    onChange={(e) => setFormData({ ...formData, tutorCertificadoConadis: e.target.value, tutorConadis: ['1', '2'].includes(e.target.value) ? 'SI' : 'NO' })}
                                >
                                    <option value="">-- SELECCIONAR --</option>
                                    {opcionesCertificado.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Variables Específicas de F04 conservadas al final de la sección */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Ingreso Aprox. Semanal</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-fg-muted font-bold">S/</span>
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border border-border rounded-[6px] text-xs font-bold focus:ring-2 focus:ring-primary/40 focus:border-primary bg-surface"
                                        placeholder="0.00"
                                        value={formData.tutorIngreso}
                                        onChange={(e) => setFormData({ ...formData, tutorIngreso: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Consumo de Drogas</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorConsumoDrogas" value="SI" checked={formData.tutorConsumoDrogas === 'SI'} onChange={() => setFormData({ ...formData, tutorConsumoDrogas: 'SI' })} className="text-danger" /> <span className="font-bold text-fg-2">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorConsumoDrogas" value="NO" checked={formData.tutorConsumoDrogas === 'NO'} onChange={() => setFormData({ ...formData, tutorConsumoDrogas: 'NO' })} className="text-success" /> <span className="font-bold text-fg-2">NO</span></label>
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Recibe apoyo para alimentos del NNA?</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorRecibeApoyo" value="SI" checked={formData.tutorRecibeApoyo === 'SI'} onChange={() => setFormData({ ...formData, tutorRecibeApoyo: 'SI' })} className="text-primary" /> <span className="font-bold text-fg-2">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorRecibeApoyo" value="NO" checked={formData.tutorRecibeApoyo === 'NO'} onChange={() => setFormData({ ...formData, tutorRecibeApoyo: 'NO' })} className="text-primary" /> <span className="font-bold text-fg-2">NO</span></label>
                                </div>
                            </div>

                            <div className="col-span-12 bg-primary-soft/30 p-3 rounded-[6px] border border-primary/20 flex items-center justify-between mt-2">
                                <label className="font-bold text-primary uppercase text-[10px]">¿Desea realizar demanda por alimentos?</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDeseaDemanda" value="SI" checked={formData.tutorDeseaDemanda === 'SI'} onChange={() => setFormData({ ...formData, tutorDeseaDemanda: 'SI' })} className="text-primary" /> <span className="font-bold text-primary text-xs">SI</span></label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="tutorDeseaDemanda" value="NO" checked={formData.tutorDeseaDemanda === 'NO'} onChange={() => setFormData({ ...formData, tutorDeseaDemanda: 'NO' })} className="text-primary" /> <span className="font-bold text-primary text-xs">NO</span></label>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* IV. DATOS DE LA FAMILIA */}
                    <div className={activeTab === 'FAMILIA' ? '' : 'hidden'}>
                        <div className="border border-purple-100 rounded-xl bg-purple-50/30 p-5 mt-2 group hover:border-purple-200 transition-all">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100/50">
                                <h4 className="text-sm font-black text-purple-900 uppercase flex items-center gap-2">
                                    <Users size={16} className="text-purple-700" /> Familiar / Adulto Responsable (SEC 2026)
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleAddFamily}
                                    className="px-3.5 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-all flex items-center gap-1 shadow-md shadow-purple-200"
                                >
                                    <Plus size={13} /> Agregar Familiar Responsable
                                </button>
                            </div>

                            {formData.familiares.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {formData.familiares.map((familiar, idx) => {
                                        const isTutor = familiar.esTutorPrincipal === 'true' || familiar.esTutorPrincipal === true || idx === 0;
                                        return (
                                            <div key={idx} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${isTutor ? "border-purple-300 ring-1 ring-purple-300 bg-purple-50/5" : "border-gray-200"}`}>
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded">
                                                            {familiar.parentesco || 'Familiar'}
                                                        </span>
                                                        {isTutor && (
                                                            <span className="px-2.5 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                                Tutor Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-black text-gray-800 mt-2">
                                                        {`${familiar.primerApellido} ${familiar.segundoApellido} ${familiar.nombres}`.trim()}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 text-xs">
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">DNI / Documento</span>
                                                            <span className="font-bold text-gray-700">{familiar.nroDocTutApo || familiar.dni || 'Sin Documento'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Teléfono</span>
                                                            <span className="font-bold text-gray-700">{familiar.telefono || 'No registra'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Vive con NNA</span>
                                                            <span className="font-bold text-gray-700">{familiar.viveCon || 'NO'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Ocupación</span>
                                                            <span className="font-bold text-gray-700">{familiar.ocupacion || 'No registra'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditFamily(idx)}
                                                        className="px-2.5 py-1 hover:bg-purple-100 rounded text-purple-700 text-xs font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        <Edit2 size={12} /> Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFamily(idx)}
                                                        className="px-2.5 py-1 hover:bg-red-50 rounded text-red-600 text-xs font-bold flex items-center gap-1 transition-all"
                                                    >
                                                        <Trash2 size={12} /> Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-purple-100 bg-purple-50/5 rounded-xl p-8 text-center">
                                    <p className="text-fg-muted text-sm mb-3">No hay familiares o adultos responsables registrados</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 max-w-xs mx-auto mb-4">Agregue uno o más familiares presionando el botón superior.</p>
                                    <button
                                        onClick={handleAddFamily}
                                        className="text-purple-700 text-sm font-bold hover:text-purple-900 flex items-center gap-1 mx-auto"
                                    >
                                        <Plus size={16} /> Agregar el primer familiar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t border-border pt-4">
                            <h4 className="text-xs font-black text-fg-muted uppercase tracking-widest mb-4">Relación con la Familia</h4>

                            <div className="grid grid-cols-12 gap-4 text-xs">
                                {/* Contacto y Frecuencia */}
                                <div className="col-span-12 md:col-span-4">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿Tiene contacto con su familia?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-1 font-bold"><input type="radio" checked={formData.dinamicaFamiliar.contacto === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, contacto: 'SI' } })} /> SI</label>
                                        <label className="flex items-center gap-1 font-bold"><input type="radio" checked={formData.dinamicaFamiliar.contacto === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, contacto: 'NO' } })} /> NO</label>
                                    </div>
                                </div>

                                <div className="col-span-12 md:col-span-8">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Frecuencia</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['DIARIO', 'INTERDIARIO', 'FINES DE SEMANA', 'MESES', 'AÑOS'].map(opt => (
                                            <label key={opt} className="flex items-center gap-1 text-[10px]">
                                                <input type="radio" checked={formData.dinamicaFamiliar.frecuencia === opt} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, frecuencia: opt } })} />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-12 mt-2">
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Padres asumen su rol (X)</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-border rounded-[6px] p-3 bg-surface-muted">
                                        {/* Protector */}
                                        <div>
                                            <div className="text-center font-bold mb-2 text-fg-muted border-b border-border pb-1">PROTECTOR</div>
                                            <div className="flex justify-center gap-4">
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'SI' } })} /> SI</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'NO' } })} /> NO</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProtector === 'REGULAR'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProtector: 'REGULAR' } })} /> REGULAR</label>
                                            </div>
                                        </div>

                                        {/* Proveedor */}
                                        <div>
                                            <div className="text-center font-bold mb-2 text-fg-muted border-b border-border pb-1">PROVEEDOR</div>
                                            <div className="flex justify-center gap-4">
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'SI'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'SI' } })} /> SI</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'NO'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'NO' } })} /> NO</label>
                                                <label className="flex items-center gap-1"><input type="radio" checked={formData.dinamicaFamiliar.rolProveedor === 'REGULAR'} onChange={() => setFormData({ ...formData, dinamicaFamiliar: { ...formData.dinamicaFamiliar, rolProveedor: 'REGULAR' } })} /> REGULAR</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* V. DATOS DE LA VIVIENDA */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 ${activeTab === 'FAMILIA' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                V. DATOS DE LA VIVIENDA
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-6 text-xs">

                            {/* Fila 1: Material */}
                            <div className="col-span-12 md:col-span-4 relative group">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Material de Vivienda (X)</label>
                                <div className="flex gap-2 bg-surface-muted p-2 rounded-[6px] border border-border">
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                        <input type="radio" name="material" value="CONCRETO" checked={formData.materialVivienda === 'CONCRETO'} onChange={(e) => setFormData({ ...formData, materialVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                        <span className="font-semibold text-fg-2">Concreto</span>
                                    </label>
                                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                        <input type="radio" name="material" value="PRECARIO" checked={formData.materialVivienda === 'PRECARIO'} onChange={(e) => setFormData({ ...formData, materialVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                        <span className="font-semibold text-fg-2">Precario</span>
                                    </label>
                                </div>
                            </div>

                            {/* Fila 1: Ambientes */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Número de Ambientes</label>
                                <div className="flex gap-2 bg-surface-muted p-2 rounded-[6px] border border-border text-center">
                                    {['1', '2', '3'].map(opt => (
                                        <label key={opt} className="flex-1 cursor-pointer hover:bg-surface p-2 rounded transition-all shadow-sm border border-transparent hover:border-border">
                                            <input type="radio" name="ambientes" value={opt} checked={formData.numeroAmbientes === opt} onChange={(e) => setFormData({ ...formData, numeroAmbientes: e.target.value })} className="sr-only peer" />
                                            <span className="block font-bold text-fg-muted peer-checked:text-primary peer-checked:scale-110 transition-transform">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Fila 1: Propiedad */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Propiedad de la Vivienda</label>
                                <div className="grid grid-cols-2 gap-2 bg-surface-muted p-2 rounded-[6px] border border-border">
                                    {['OTROS', 'PROPIA', 'ALQUILADA', 'ALOJADO'].map(opt => (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-surface p-1 px-2 rounded transition-all border border-transparent hover:border-border">
                                            <input type="radio" name="propiedad" value={opt} checked={formData.propiedadVivienda === opt} onChange={(e) => setFormData({ ...formData, propiedadVivienda: e.target.value })} className="text-primary focus:ring-primary/40" />
                                            <span className="text-[10px] font-semibold text-fg-2 truncate" title={opt}>{opt === 'ALOJADO' ? 'ALOJADO/INV.' : opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 2: SISFOH y Cama (Agrupados) */}
                            <div className="col-span-12 md:col-span-4 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Vivienda inscrita en SISFOH</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sisfoh" value="SI" checked={formData.viviendaSisfoh === 'SI'} onChange={(e) => setFormData({ ...formData, viviendaSisfoh: e.target.value })} className="text-primary" /> <span className="font-bold">SI</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="sisfoh" value="NO" checked={formData.viviendaSisfoh === 'NO'} onChange={(e) => setFormData({ ...formData, viviendaSisfoh: e.target.value })} className="text-primary" /> <span className="font-bold">NO</span></label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Duerme en una Cama</label>
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cama" value="SI" checked={formData.duermeCama === 'SI'} onChange={(e) => setFormData({ ...formData, duermeCama: e.target.value })} className="text-primary" /> <span className="font-bold">SI</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="cama" value="NO" checked={formData.duermeCama === 'NO'} onChange={(e) => setFormData({ ...formData, duermeCama: e.target.value, duermeSoloAcompanado: '', duermeConQuien: '' })} className="text-primary" /> <span className="font-bold">NO</span></label>
                                    </div>

                                    {formData.duermeCama === 'SI' && (
                                        <div className="space-y-2 mt-2 p-3 bg-purple-50/30 rounded-lg border border-purple-100/50 animate-scaleUp">
                                            <label className="block text-[9px] font-black text-purple-900 uppercase">¿Con quién?</label>
                                            <div className="flex gap-4 text-[10px] font-bold text-purple-950">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="solo" value="SOLO" checked={formData.duermeSoloAcompanado === 'SOLO'} onChange={(e) => setFormData({ ...formData, duermeSoloAcompanado: e.target.value, duermeConQuien: '' })} className="text-purple-700 focus:ring-purple-500" /> 
                                                    SOLO
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="solo" value="ACOMPAÑADO" checked={formData.duermeSoloAcompanado === 'ACOMPAÑADO'} onChange={(e) => setFormData({ ...formData, duermeSoloAcompanado: e.target.value })} className="text-purple-700 focus:ring-purple-500" /> 
                                                    ACOMPAÑADO
                                                </label>
                                            </div>
                                            {formData.duermeSoloAcompanado === 'ACOMPAÑADO' && (
                                                <input
                                                    type="text"
                                                    placeholder="Especifique con quién (ej. Madre, hermano...)"
                                                    className="w-full border-b border-purple-200 focus:border-purple-600 outline-none text-xs py-1.5 bg-transparent transition-all placeholder-purple-300/80 font-medium"
                                                    value={formData.duermeConQuien}
                                                    onChange={(e) => setFormData({ ...formData, duermeConQuien: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fila 2: Servicios Básicos */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Servicios Básicos</label>
                                <div className="space-y-2 bg-primary-soft/20 p-3 rounded-[6px] border border-primary/20">
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.agua} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, agua: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Agua</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.luz} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, luz: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Luz</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.desague} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, desague: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Desagüe</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                        <input type="checkbox" checked={formData.serviciosBasicos.otros} onChange={(e) => setFormData({ ...formData, serviciosBasicos: { ...formData.serviciosBasicos, otros: e.target.checked } })} className="rounded text-primary focus:ring-primary/40" />
                                        <span className="font-medium text-fg-2">Otros</span>
                                    </label>
                                </div>
                            </div>

                            {/* Fila 2: Higiene */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Higiene en el domicilio</label>
                                <div className="space-y-1">
                                    {['BUENO', 'REGULAR', 'MALO', 'PESIMO'].map(opt => (
                                        <label key={opt} className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg border transition-all ${formData.higieneDomicilio === opt ? 'bg-success-soft border-success/20 shadow-sm' : 'border-transparent hover:bg-surface-muted'}`}>
                                            <input type="radio" name="higiene" value={opt} checked={formData.higieneDomicilio === opt} onChange={(e) => setFormData({ ...formData, higieneDomicilio: e.target.value })} className="text-success focus:ring-success/40" />
                                            <span className={`text-xs font-bold ${formData.higieneDomicilio === opt ? 'text-success' : 'text-fg-muted'}`}>{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Fila 3: Albergue */}
                            <div className="col-span-12">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Antecedente en CAR / Albergue</label>
                                <div className="bg-purple-50/10 p-4 rounded-xl border border-purple-100/50">
                                    <span className="text-xs font-bold text-fg-muted block mb-2">¿Estuvo en Albergue / CAR?</span>
                                    <div className="flex gap-4 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input type="radio" name="albergue" value="SI" checked={formData.tieneAntecedenteAlbergue === true} onChange={() => setFormData({ ...formData, tieneAntecedenteAlbergue: true })} className="text-primary" /> 
                                            <span className="font-bold text-xs">SI</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input type="radio" name="albergue" value="NO" checked={formData.tieneAntecedenteAlbergue === false} onChange={() => setFormData({ ...formData, tieneAntecedenteAlbergue: false, tiempoAlbergue: '', detalleAntecedenteAlbergue: '' })} className="text-primary" /> 
                                            <span className="font-bold text-xs">NO</span>
                                        </label>
                                    </div>

                                    {formData.tieneAntecedenteAlbergue === true && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 p-3 bg-purple-50/30 rounded-lg border border-purple-100/50 animate-scaleUp">
                                            <div>
                                                <label className="block text-[9px] font-black text-purple-900 uppercase mb-1">¿Cuánto Tiempo?</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-purple-200 focus:border-purple-600 rounded-lg text-xs outline-none bg-white transition-all font-medium"
                                                    placeholder="Ej: 3 meses"
                                                    value={formData.tiempoAlbergue}
                                                    onChange={(e) => setFormData({ ...formData, tiempoAlbergue: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-purple-900 uppercase mb-1">Motivo</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-purple-200 focus:border-purple-600 rounded-lg text-xs outline-none bg-white transition-all font-medium"
                                                    placeholder="Especifique motivo..."
                                                    value={formData.detalleAntecedenteAlbergue}
                                                    onChange={(e) => setFormData({ ...formData, detalleAntecedenteAlbergue: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* VI. EDUCACIÓN */}
                    <div className={`bg-white rounded-2xl border border-purple-100 shadow-sm mt-6 ${activeTab === 'EDUCACION' ? '' : 'hidden'}`}>
                        <div className="bg-purple-50/50 border-b border-purple-100 px-6 py-4 rounded-t-2xl">
                            <h2 className="text-base font-black text-purple-900 flex items-center gap-2">
                                <School size={20} className="text-purple-700" /> VI. EDUCACIÓN - NNA
                            </h2>
                            <p className="text-xs text-purple-700 font-medium mt-0.5">Gestione la situación escolar del niño, niña o adolescente.</p>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SelectField
                                    label="¿Estudia Actualmente? / Situación de Matrícula"
                                    value={formData.eduEstudia}
                                    onChange={(e) => setFormData({ ...formData, eduEstudia: e.target.value })}
                                    options={parametros?.OPCIONES_MATRICULA_2026 || [
                                        { value: 'SI', label: '1. Sí (cuenta con ficha de matrícula)' },
                                        { value: 'NO', label: '2. No (no se encuentra matriculado)' },
                                        { value: 'PROCESO', label: '3. En proceso de matrícula (trámite en gestión)' },
                                        { value: 'NO_APLICA', label: '99. No aplica (menores de 3 años o egresados de secundaria)' }
                                    ]}
                                />
                            </div>

                            {['SI', 'PROCESO'].includes(formData.eduEstudia) ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-scaleUp">
                                    <SelectField
                                        label="Nivel Educativo"
                                        value={formData.eduNivel}
                                        onChange={(e) => setFormData({ ...formData, eduNivel: e.target.value })}
                                        options={parametros?.NIVELES_EDUCATIVOS_2026 || [
                                            { value: '1', label: '1: Sin nivel' },
                                            { value: '2', label: '2: Inicial' },
                                            { value: '3', label: '3: Primaria Incompleta' },
                                            { value: '4', label: '4: Primaria Completa' },
                                            { value: '5', label: '5: Secundaria Incompleta' },
                                            { value: '6', label: '6: Secundaria Completa' },
                                            { value: '7', label: '7: Superior No Universitaria Incompleta' },
                                            { value: '8', label: '8: Superior No Universitaria Completa' },
                                            { value: '9', label: '9: Superior Universitario Incompleto' },
                                            { value: '10', label: '10: Superior Universitario Completo' },
                                            { value: '11', label: '11: Básica Especial' }
                                        ]}
                                    />
                                    <SelectField
                                        label="Grado / Año"
                                        value={formData.eduGrado}
                                        onChange={(e) => setFormData({ ...formData, eduGrado: e.target.value })}
                                        options={parametros?.GRADOS_ESTUDIO_2026 || [
                                            { value: '1', label: '1: Inicial' },
                                            { value: '2', label: '2: 1ro primaria' },
                                            { value: '3', label: '3: 2do primaria' },
                                            { value: '4', label: '4: 3ro primaria' },
                                            { value: '5', label: '5: 4to primaria' },
                                            { value: '6', label: '6: 5to primaria' },
                                            { value: '7', label: '7: 6to primaria' },
                                            { value: '8', label: '8: 1ro secundaria' },
                                            { value: '9', label: '9: 2do secundaria' },
                                            { value: '10', label: '10: 3ro secundaria' },
                                            { value: '11', label: '11: 4to secundaria' },
                                            { value: '12', label: '12: 5to secundaria' },
                                            { value: '13', label: '13: Ciclo I (EBA)' },
                                            { value: '14', label: '14: Ciclo II (EBA)' },
                                            { value: '15', label: '15: Ciclo III (EBA)' },
                                            { value: '16', label: '16: Ciclo IV (EBA)' },
                                            { value: '17', label: '17: Ciclo V (EBA)' },
                                            { value: '18', label: '18: Ciclo VI (EBA)' },
                                            { value: '19', label: '19: Ciclo VII (EBA)' },
                                            { value: '20', label: '20: Ciclo VIII (EBA)' },
                                            { value: '21', label: '21: Ciclo IX (EBA)' },
                                            { value: '22', label: '22: Ciclo X (EBA)' },
                                            { value: '99', label: '99: No aplica / No sabe' }
                                        ]}
                                    />
                                    <InputField
                                        label="Institución Educativa"
                                        value={formData.eduInstitucion}
                                        onChange={(e) => setFormData({ ...formData, eduInstitucion: e.target.value })}
                                        placeholder="Nombre del Colegio"
                                    />
                                    <SelectField
                                        label="Modalidad"
                                        value={formData.eduModalidad}
                                        onChange={(e) => setFormData({ ...formData, eduModalidad: e.target.value })}
                                        options={parametros?.MODALIDADES_ESTUDIO_2026 || [
                                            { value: '1', label: '1: Básica / regular (EBR)' },
                                            { value: '2', label: '2: Alternativa (EBA)' },
                                            { value: '3', label: '3: Especial (EBE)' },
                                            { value: '4', label: '4: Superior Técnica' },
                                            { value: '5', label: '5: Superior Universitaria' },
                                            { value: '6', label: '6: CETPRO' }
                                        ]}
                                    />
                                    <SelectField
                                        label="Turno"
                                        value={formData.eduTurno || 'MAÑANA'}
                                        onChange={(e) => setFormData({ ...formData, eduTurno: e.target.value })}
                                        options={[
                                            { value: 'MAÑANA', label: 'Mañana' },
                                            { value: 'TARDE', label: 'Tarde' },
                                            { value: 'NOCHE', label: 'Noche' }
                                        ]}
                                    />
                                    <SelectField
                                        label="Tipo de I.E."
                                        value={formData.eduTipoIE || 'ESTATAL'}
                                        onChange={(e) => setFormData({ ...formData, eduTipoIE: e.target.value })}
                                        options={[
                                            { value: 'ESTATAL', label: 'Estatal' },
                                            { value: 'PARTICULAR', label: 'Particular' },
                                            { value: 'CONVENIO', label: 'Convenio' }
                                        ]}
                                    />
                                </div>
                            ) : (
                                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 animate-scaleUp">
                                    <InputField
                                        label="¿Por qué no estudia?"
                                        value={formData.eduMotivoNoEstudia}
                                        onChange={(e) => setFormData({ ...formData, eduMotivoNoEstudia: e.target.value })}
                                        placeholder="Motivo de deserción..."
                                    />
                                </div>
                            )}

                            {/* Atraso y Problemas */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                {[
                                    { label: 'Atraso Escolar', key: 'presentaAtraso' },
                                    { label: 'Prob. Aprendizaje', key: 'problemasAprendizaje' },
                                    { label: 'Prob. Conducta', key: 'problemasConducta' }
                                ].map(item => (
                                    <div key={item.key} className="p-4 border border-purple-100 rounded-xl bg-purple-50/10 flex flex-col justify-between">
                                        <span className="font-bold text-[10px] text-purple-900 uppercase mb-3">{item.label}</span>
                                        <div className="flex gap-2 h-8">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, [item.key]: true })}
                                                className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded-lg cursor-pointer transition-colors ${formData[item.key as keyof typeof formData] === true ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                                            >
                                                SÍ
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, [item.key]: false })}
                                                className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded-lg cursor-pointer transition-colors ${formData[item.key as keyof typeof formData] === false ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                NO
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* VII. SALUD */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 ${activeTab === 'SALUD' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VII. SALUD – ALIMENTACIÓN – HIGIENE
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">
                            {[
                                { label: '¿Enfermedad Crónica?', key: 'enfermedadCronica', detailKey: 'detalleEnfermedadCronica' },
                                { label: '¿Problema Psicológico?', key: 'problemaPsicologico', detailKey: 'detalleProblemaPsicologico' },
                                { label: '¿Consume Sustancias?', key: 'consumeSustancias', detailKey: 'tipoSustancias' }
                            ].map(item => (
                                <div key={item.key} className="col-span-12 p-3 border-b border-border/50 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="w-48">
                                        <span className="font-bold text-[10px] text-fg-muted uppercase">{item.label}</span>
                                        <div className="flex gap-2 mt-2">
                                            <div onClick={() => setFormData({ ...formData, [item.key]: true })} className={`px-4 py-1 rounded cursor-pointer font-bold transition-colors ${formData[item.key as keyof typeof formData] === true ? 'bg-danger text-white' : 'bg-surface-muted text-fg-muted hover:text-danger'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, [item.key]: false })} className={`px-4 py-1 rounded cursor-pointer font-bold transition-colors ${formData[item.key as keyof typeof formData] === false ? 'bg-success text-white' : 'bg-surface-muted text-fg-muted hover:text-success'}`}>NO</div>
                                        </div>
                                    </div>
                                    {formData[item.key as keyof typeof formData] && (
                                        <div className="flex-1 w-full animate-in slide-in-from-left-2 duration-300">
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Especifique / Detalles:</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-danger/20 rounded-[6px] text-xs bg-danger-soft/10 focus:bg-surface focus:ring-2 focus:ring-danger/20 outline-none"
                                                placeholder="Describa la situación..."
                                                value={formData[item.detailKey as keyof typeof formData] as string}
                                                onChange={e => setFormData({ ...formData, [item.detailKey]: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* VIII. RECREACIÓN */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 shadow-sm ${activeTab === 'SALUD' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VIII. RECREACIÓN E INTERESES DEL NNA
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-6 text-xs">

                            {/* --- 1. TIEMPO Y ACTIVIDADES --- */}
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <div className="p-4 bg-primary-soft/10 rounded-[8px] border border-primary/20">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-primary uppercase">¿Cuenta con tiempo para jugar?</label>
                                        <div className="flex bg-surface rounded border border-border p-0.5 shadow-sm">
                                            <div onClick={() => setFormData({ ...formData, tiempoParaJugar: true })} className={`px-3 py-1 rounded cursor-pointer font-bold transition-colors ${formData.tiempoParaJugar ? 'bg-primary text-white' : 'text-fg-muted hover:text-primary'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, tiempoParaJugar: false })} className={`px-3 py-1 rounded cursor-pointer font-bold transition-colors ${!formData.tiempoParaJugar ? 'bg-fg-muted text-white' : 'text-fg-muted hover:text-fg'}`}>NO</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Veces por semana</label>
                                            <input type="text" className="w-full text-xs p-2 border border-primary/10 rounded-[6px] bg-surface" placeholder="Ej: 3 veces" value={formData.vecesJuegaSemana} onChange={e => setFormData({ ...formData, vecesJuegaSemana: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">¿Dónde juega?</label>
                                            <input type="text" className="w-full text-xs p-2 border border-primary/10 rounded-[6px] bg-surface" placeholder="Ej: Parque, Casa..." value={formData.lugarJuego} onChange={e => setFormData({ ...formData, lugarJuego: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-muted/30 rounded-[8px] border border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col border-r border-primary/20 pr-4 w-1/3">
                                            <span className="text-[14px] font-black text-primary">NNA</span>
                                            <span className="text-[8px] font-bold text-fg-muted uppercase">Familia</span>
                                        </div>
                                        <div className="flex items-center gap-4 bg-primary-soft/10 p-2 rounded-lg border border-primary/20">
                                            <span className="text-[9px] font-bold text-primary uppercase leading-tight w-2/3">Actividades Recreativas con Familia</span>
                                            <div className="flex gap-2">
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.recreacionActividadFamilia === 'SI'} onChange={() => setFormData({ ...formData, recreacionActividadFamilia: 'SI' })} className="text-primary" /> <span className="font-bold text-[9px]">SI</span></label>
                                                <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={formData.recreacionActividadFamilia === 'NO'} onChange={() => setFormData({ ...formData, recreacionActividadFamilia: 'NO' })} className="text-primary" /> <span className="font-bold text-[9px]">NO</span></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- 2. INTERESES --- */}
                            <div className="col-span-12 md:col-span-6 space-y-4">
                                <div className="bg-primary-soft/10 rounded-[8px] border border-primary/20 p-4">
                                    <h3 className="text-primary font-bold uppercase text-[10px] mb-3 border-b border-primary/20 pb-1 flex items-center gap-2">
                                        <span className="text-lg">🎨</span> Intereses y Talentos
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Intereses Deportivos</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-primary/20 rounded-[6px] focus:ring-primary/40 bg-surface"
                                                placeholder="Ej: Fútbol, Voley..."
                                                value={formData.recreacionInteresDeporte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresDeporte: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Intereses Artísticos</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-primary/20 rounded-[6px] focus:ring-primary/40 bg-surface"
                                                placeholder="Ej: Dibujo, Baile, Música..."
                                                value={formData.recreacionInteresArte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresArte: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-info-soft/20 rounded-[8px] border border-info/20 p-4">
                                    <h3 className="text-info font-bold uppercase text-[10px] mb-3 border-b border-info/20 pb-1 flex items-center gap-2">
                                        <span className="text-lg">🏫</span> Participación Institucional
                                    </h3>

                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[9px] font-bold text-info uppercase">¿Participa en alguna institución?</label>
                                        <div className="flex bg-surface rounded border border-border p-0.5 shadow-sm">
                                            <div onClick={() => setFormData({ ...formData, recreacionParticipaInstitucion: 'SI' })} className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${formData.recreacionParticipaInstitucion === 'SI' ? 'bg-info text-white' : 'text-fg-muted hover:text-info'}`}>SI</div>
                                            <div onClick={() => setFormData({ ...formData, recreacionParticipaInstitucion: 'NO' })} className={`px-2 py-0.5 rounded cursor-pointer font-bold transition-colors ${formData.recreacionParticipaInstitucion === 'NO' ? 'bg-fg-muted text-white' : 'text-fg-muted hover:text-fg'}`}>NO</div>
                                        </div>
                                    </div>

                                    {formData.recreacionParticipaInstitucion === 'SI' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <div className="grid grid-cols-2 gap-2">
                                                {['IGLESIA', 'CLUB CULTURAL', 'CLUB DEPORTIVO', 'OTROS'].map(opt => (
                                                    <div
                                                        key={opt}
                                                        onClick={() => setFormData({ ...formData, recreacionTipoInstitucion: opt })}
                                                        className={`text-center py-1.5 rounded cursor-pointer text-[8px] font-bold border transition-all ${formData.recreacionTipoInstitucion === opt ? 'bg-info-soft border-info/30 text-info shadow-sm' : 'bg-surface border-info/10 text-fg-muted hover:bg-info-soft/20'}`}
                                                    >
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-info/20 rounded-[6px] bg-surface"
                                                placeholder="Nombre de la institución..."
                                                value={formData.recreacionInstitucionDetalle}
                                                onChange={(e) => setFormData({ ...formData, recreacionInstitucionDetalle: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>


                    {/* IX. NECESIDADES Y PLAN DE ACCIÓN */}
                    <div className={activeTab === 'NECESIDADES' ? '' : 'hidden'}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-fg-muted uppercase tracking-widest border-b border-border pb-2">
                                IX. Necesidades del NNA y Plan de Acción
                            </h3>
                            <button
                                onClick={handleAddNeed}
                                className="flex items-center gap-2 bg-primary text-primary-fg px-4 py-2 rounded-[6px] hover:bg-primary/90 transition-colors text-sm font-bold"
                            >
                                <Plus size={16} /> Agregar Necesidad
                            </button>
                        </div>

                        {formData.necesidades.length > 0 ? (
                            <div className="border border-border rounded-[6px] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left" style={{ width: '5%' }}>N°</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '15%' }}>Categoría</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '20%' }}>Descripción</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase I</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase II</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '17%' }}>Fase III</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '9%' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.necesidades.map((necesidad, idx) => (
                                            <tr key={idx} className="border-t border-border">
                                                <td className="px-3 py-2 font-bold text-fg-muted text-center">{idx + 1}</td>
                                                <td className="px-3 py-2">
                                                    <span className="inline-block px-2 py-1 bg-primary-soft text-primary text-xs font-bold rounded">
                                                        {necesidad.categoria}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs">{necesidad.descripcion}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseI || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseII || '-'}</td>
                                                <td className="px-3 py-2 text-xs text-fg-muted">{necesidad.faseIII || '-'}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => handleEditNeed(idx)}
                                                            className="p-1 text-primary hover:bg-primary-soft rounded transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNeed(idx)}
                                                            className="p-1 text-danger hover:bg-danger-soft rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-border rounded-[6px] p-8 text-center">
                                <p className="text-fg-muted text-sm mb-3">No hay necesidades registradas</p>
                                <p className="text-xs text-fg-muted mb-4">Agrega las necesidades identificadas del NNA y el plan de acción por fases</p>
                                <button
                                    onClick={handleAddNeed}
                                    className="text-primary text-sm font-bold hover:text-primary/80"
                                >
                                    + Agregar la primera necesidad
                                </button>
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* MODAL PARA AGREGAR/EDITAR FAMILIAR */}
            {
                showFamilyModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] flex flex-col animate-scaleUp">
                            {/* Header del Modal */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                                        <Users size={22} className="text-purple-700" /> {editingFamilyIndex !== null ? 'Editar Familiar' : 'Registrar Familiar Responsable'} (SEC 2026)
                                    </h3>
                                    <p className="text-xs text-purple-700 font-medium">Complete todos los datos oficiales del familiar responsable del NNA.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFamilyModal(false)}
                                    className="p-2 hover:bg-purple-100 rounded-full transition-all text-purple-900"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Contenido del Modal */}
                            <div className="p-6 overflow-y-auto space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputField
                                        label="Primer Apellido"
                                        value={currentFamily.priApeTutApo || currentFamily.primerApellido || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setCurrentFamily({ ...currentFamily, priApeTutApo: val, primerApellido: val });
                                        }}
                                        placeholder="Primer Apellido"
                                    />
                                    <InputField
                                        label="Segundo Apellido"
                                        value={currentFamily.segApeTutApo || currentFamily.segundoApellido || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setCurrentFamily({ ...currentFamily, segApeTutApo: val, segundoApellido: val });
                                        }}
                                        placeholder="Segundo Apellido"
                                    />
                                    <InputField
                                        label="Nombres"
                                        value={currentFamily.nomApeTutApo || currentFamily.nombres || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            setCurrentFamily({ ...currentFamily, nomApeTutApo: val, nombres: val });
                                        }}
                                        placeholder="Nombres del Familiar"
                                        required
                                    />
                                    <SelectField
                                        label="Sexo"
                                        value={currentFamily.sexoApo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const simpleSex = val === '1' ? 'MASCULINO' : val === '2' ? 'FEMENINO' : '';
                                            setCurrentFamily({ ...currentFamily, sexoApo: val, sexo: simpleSex });
                                        }}
                                        options={opcionesSexo}
                                    />
                                    <InputField
                                        type="date"
                                        label="Fecha Nacimiento"
                                        value={currentFamily.fechaNacApo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            let calculatedAge = '';
                                            if (val) {
                                                const birthDate = new Date(val);
                                                const today = new Date();
                                                let age = today.getFullYear() - birthDate.getFullYear();
                                                const m = today.getMonth() - birthDate.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                                    age--;
                                                }
                                                calculatedAge = String(age);
                                            }
                                            setCurrentFamily({ ...currentFamily, fechaNacApo: val, edad: calculatedAge });
                                        }}
                                    />
                                    <InputField
                                        label="Nacionalidad"
                                        value={currentFamily.nacionalidadApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, nacionalidadApo: e.target.value.toUpperCase() })}
                                        placeholder="PERUANA"
                                    />
                                    <SelectField
                                        label="Tipo Documento"
                                        value={currentFamily.tipDocTutApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, tipDocTutApo: e.target.value })}
                                        options={opcionesTipoDocumento}
                                    />
                                    <InputField
                                        label="Nº de Documento"
                                        value={currentFamily.nroDocTutApo || currentFamily.dni || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, nroDocTutApo: e.target.value, dni: e.target.value })}
                                        placeholder="Número de Documento"
                                    />
                                    <SelectField
                                        label="Vínculo con el NNA"
                                        value={currentFamily.vinTutUsu || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const parentescos: Record<string, string> = {
                                                '1': 'Padre o madre',
                                                '2': 'Tio/a',
                                                '3': 'Abuelo/a',
                                                '4': 'Hermano/a',
                                                '5': 'Otro familiar',
                                                '6': 'Otro no familiar'
                                            };
                                            setCurrentFamily({ ...currentFamily, vinTutUsu: val, parentesco: parentescos[val] || val });
                                        }}
                                        options={opcionesVinculo}
                                    />
                                    <InputField
                                        label="Teléfono de Contacto"
                                        value={currentFamily.telefono || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, telefono: e.target.value })}
                                        placeholder="Ej. 999888777"
                                    />
                                    <InputField
                                        label="Ocupación"
                                        value={currentFamily.ocupacion || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, ocupacion: e.target.value })}
                                        placeholder="Ej. Independiente, Comerciante..."
                                    />
                                    <SelectField
                                        label="¿Vive con el NNA?"
                                        value={currentFamily.viveCon || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, viveCon: e.target.value })}
                                        options={[
                                            { value: 'SI', label: 'Sí' },
                                            { value: 'NO', label: 'No' }
                                        ]}
                                    />
                                    <SelectField
                                        label="Lengua Materna"
                                        value={currentFamily.lenMatApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, lenMatApo: e.target.value })}
                                        options={opcionesLengua}
                                    />
                                    {['9', '12', 'OTRO'].includes(currentFamily.lenMatApo || '') && (
                                        <InputField
                                            label="Especificar Lengua"
                                            value={currentFamily.lenMatEspApo || ''}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, lenMatEspApo: e.target.value })}
                                            placeholder="Escriba la lengua..."
                                        />
                                    )}
                                    <SelectField
                                        label="Autoidentificación Étnica"
                                        value={currentFamily.autIdeEtApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, autIdeEtApo: e.target.value })}
                                        options={opcionesEtnia}
                                    />
                                    {['8', 'OTRO'].includes(currentFamily.autIdeEtApo || '') && (
                                        <InputField
                                            label="Especificar Etnia"
                                            value={currentFamily.autIdeEtEspApo || ''}
                                            onChange={(e) => setCurrentFamily({ ...currentFamily, autIdeEtEspApo: e.target.value })}
                                            placeholder="Escriba la etnia..."
                                        />
                                    )}
                                    <SelectField
                                        label="Tipo de Discapacidad"
                                        value={currentFamily.tipoDiscapApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, tipoDiscapApo: e.target.value })}
                                        options={opcionesDiscapacidad}
                                    />
                                    <SelectField
                                        label="¿Certificado CONADIS?"
                                        value={currentFamily.certDiscapApo || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, certDiscapApo: e.target.value })}
                                        options={opcionesCertificado}
                                    />
                                    <InputField
                                        type="number"
                                        label="Edad"
                                        value={currentFamily.edad || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, edad: e.target.value })}
                                        placeholder="Ej. 35"
                                        min="0"
                                        max="120"
                                        required
                                    />

                                    {/* ¿Es Tutor Principal? */}
                                    <div className="md:col-span-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between mt-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-purple-900">¿Es el Tutor / Apoderado Principal del NNA?</span>
                                            <span className="text-[10px] text-purple-700 font-medium">Solo un familiar puede ser el tutor principal para efectos del Diagnóstico.</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={currentFamily.esTutorPrincipal === 'true' || currentFamily.esTutorPrincipal === true}
                                                onChange={(e) => setCurrentFamily({ ...currentFamily, esTutorPrincipal: e.target.checked ? 'true' : 'false' })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Footer del Modal */}
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                                <button
                                    type="button"
                                    onClick={() => setShowFamilyModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveFamily}
                                    disabled={!(currentFamily.nomApeTutApo || currentFamily.nombres) || !(currentFamily.sexoApo || currentFamily.sexo) || !(currentFamily.vinTutUsu || currentFamily.parentesco) || !currentFamily.edad}
                                    className="px-5 py-2 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 transition-all flex items-center gap-1.5 shadow-md shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editingFamilyIndex !== null ? 'Actualizar' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL PARA AGREGAR/EDITAR NECESIDAD */}
            {
                showNeedModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                        <div className="bg-surface rounded-[12px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header del Modal */}
                            <div className="flex items-center justify-between p-6 border-b border-border">
                                <h3 className="text-xl font-bold text-fg">
                                    {editingNeedIndex !== null ? 'Editar Necesidad' : 'Agregar Necesidad'}
                                </h3>
                                <button
                                    onClick={() => setShowNeedModal(false)}
                                    className="text-fg-muted hover:text-fg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Contenido del Modal */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Categoría <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            value={currentNeed.categoria}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, categoria: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="SALUD">Salud</option>
                                            <option value="IDENTIFICACIÓN">Identificación</option>
                                            <option value="ALIMENTACIÓN">Alimentación</option>
                                            <option value="VIVIENDA">Vivienda</option>
                                            <option value="EDUCACIÓN">Educación</option>
                                            <option value="LEGAL">Legal</option>
                                            <option value="PAUTAS DE CRIANZA">Pautas de Crianza</option>
                                            <option value="VIOLENCIA">Violencia</option>
                                            <option value="RECREATIVAS">Recreativas</option>
                                            <option value="OTRA">Otra</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Descripción <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            value={currentNeed.descripcion}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, descripcion: e.target.value })}
                                            placeholder="Describa brevemente la necesidad..."
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase I - Contacto
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseI}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseI: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase I..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase II - Desarrollo
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseII}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseII: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase II..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-fg-2 mb-2">
                                            Fase III - Reinserción
                                        </label>
                                        <textarea
                                            className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                            rows={4}
                                            value={currentNeed.faseIII}
                                            onChange={(e) => setCurrentNeed({ ...currentNeed, faseIII: e.target.value })}
                                            placeholder="Acciones a desarrollar en Fase III..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer del Modal */}
                            <div className="flex gap-3 justify-end p-6 border-t border-border bg-surface-muted">
                                <button
                                    onClick={() => setShowNeedModal(false)}
                                    className="px-6 py-2 border border-border rounded-[6px] text-fg-2 font-bold hover:bg-surface-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveNeed}
                                    disabled={!currentNeed.categoria || !currentNeed.descripcion}
                                    className="px-6 py-2 bg-primary text-primary-fg rounded-[6px] font-bold hover:bg-primary/90 disabled:bg-surface-muted disabled:cursor-not-allowed transition-colors"
                                >
                                    {editingNeedIndex !== null ? 'Actualizar' : 'Agregar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ActividadModal para la grilla de actividades en calle */}
            <ActividadModal 
                isOpen={actividadModalState.isOpen}
                onClose={closeActividadModal}
                onSave={handleSaveActividad}
                initialData={actividadModalState.editIndex !== null ? actividadesCalle[actividadModalState.editIndex] : undefined}
            />

            {/* ===== VISTA IMPRESIÓN (OFICIAL) - Solo visible al imprimir ===== */}
            <div className="hidden print:block max-w-[210mm] mx-auto bg-white min-h-[297mm] p-8">

                {/* ENCABEZADO OFICIAL */}
                <table style={{ width: '100%', marginBottom: '5px' }}>
                    <tbody>
                        <tr>
                            <td width="20%"><img src="/logo-min.png" alt="MIMP" style={{ height: '35px', filter: 'grayscale(100%)' }} /></td>
                            <td width="60%" style={{ textAlign: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>FORMATO 4: FICHA DE DIAGNÓSTICO SOCIAL</h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#555' }}>EDUCADORES DE CALLE - INABIF</p>
                            </td>
                            <td width="20%" style={{ border: '1px solid black', textAlign: 'center', padding: '5px' }}>
                                <div style={{ fontSize: '9px' }}>FECHA INGRESO</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{formatDate(caso?.fechaIngreso)}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* I. DATOS GENERALES */}
                <div style={sectionTitle as any}>I. DATOS GENERALES DEL USUARIO/A</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Apellidos</span>
                                <div style={valueStyle as any}>{nna?.apellidoPaterno} {nna?.apellidoMaterno}</div>
                            </td>
                            <td style={tdStyle} width="30%">
                                <span style={labelStyle as any}>Nombres</span>
                                <div style={valueStyle as any}>{nna?.nombres}</div>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Fecha Nacimiento</span>
                                <div style={valueStyle as any}>{formatDate(nna?.fechaNacimiento)}</div>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>DNI</span>
                                <div style={valueStyle as any}>{nna?.numeroDoc || 'NO REGISTRA'}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Sexo</span>
                                M [{nna?.sexo === 'M' ? 'X' : ' '}]  F [{nna?.sexo === 'F' ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Lugar Nacimiento</span>
                                {nna?.departamentoNac} - {nna?.provinciaNac}
                            </td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Seguro de Salud</span>
                                {nna?.afiliadoSIS === 'SI' ? 'SIS' : (nna?.afiliadoOtroSeguro === 'SI' ? nna?.detalleOtroSeguro : 'NINGUNO')}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Dirección Actual</span>
                                {nna?.domicilioActual}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* II. SITUACIÓN DE CALLE */}
                <div style={sectionTitle as any}>II. SITUACIÓN DE CALLE</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb', fontWeight: 'bold' }} width="25%">Perfil:</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Trabajo Infantil</span> {caso?.perfil === 'TRABAJO_EN_CALLE' ? 'X' : ''}</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Mendicidad</span> {caso?.perfil === 'MENDICIDAD' ? 'X' : ''}</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Vida en Calle</span> {caso?.perfil === 'VIDA_EN_CALLE' ? 'X' : ''}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Tiempo en Calle</span>
                                <b>{formData.tiempoEnCalle || caso?.tiempoEnCalle}</b>
                            </td>
                            <td style={tdStyle} colSpan={3}>
                                <span style={labelStyle as any}>Punto de Concentración</span>
                                <b>{formData.puntoConcentracion || caso?.zonaIntervencion}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Actividad Económica</span>
                                <b>{formData.actividadEconomica || caso?.actividadRealizada}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* III. DATOS DEL TUTOR */}
                <div style={sectionTitle as any}>III. DATOS DEL TUTOR / APODERADO / FAMILIAR</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="40%" colSpan={2}>
                                <span style={labelStyle as any}>Nombres y Apellidos</span>
                                <div style={{ fontWeight: 'bold' }}>{formData.tutorNombre || '---'}</div>
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Fecha Nacimiento</span>
                                <b>{formatDate(formData.tutorFechaNacimiento) || '---'}</b>
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>DNI</span>
                                <b>{formData.tutorDNI || '---'}</b>
                            </td>
                            <td style={tdStyle} width="20%">
                                <span style={labelStyle as any}>Parentesco</span>
                                <b>{formData.tutorParentesco || '---'}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Grado Instrucción</span>
                                <b>{formData.tutorGradoInstruccion || '---'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>¿Discapacidad?</span>
                                <b>{formData.tutorDiscapacidad || 'NO'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Carnet CONADIS</span>
                                <b>{formData.tutorConadis || 'NO'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Estado Civil</span>
                                <b>{formData.tutorEstadoCivil || '---'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Ocupación</span>
                                <b>{formData.tutorOcupacion || '---'}</b>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* IV. DATOS DE LA FAMILIA */}
                <div style={sectionTitle as any}>IV. DATOS DE LA FAMILIA</div>
                <table style={tableStyle as any}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '5%' }}>N°</th>
                            <th style={{ ...thStyle, width: '35%' }}>Apellidos y Nombres</th>
                            <th style={{ ...thStyle, width: '15%' }}>Parentesco</th>
                            <th style={{ ...thStyle, width: '10%' }}>Edad</th>
                            <th style={{ ...thStyle, width: '10%' }}>Sexo</th>
                            <th style={{ ...thStyle, width: '15%' }}>G. Instrucción</th>
                            <th style={{ ...thStyle, width: '10%' }}>Ocupación</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.familiares.length > 0 ? (
                            formData.familiares.map((familiar, i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                                    <td style={tdStyle}>{`${familiar.primerApellido} ${familiar.segundoApellido} ${familiar.nombres}`.trim() || '-'}</td>
                                    <td style={tdStyle}>{familiar.parentesco || '-'}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{familiar.edad || '-'}</td>
                                    <td style={tdStyle}>{familiar.sexo || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{familiar.gradoInstruccion || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{familiar.ocupacion || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            // Si no hay familiares, mostrar al menos 3 filas vacías
                            [1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i}</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* V. DATOS DE LA VIVIENDA */}
                <div style={sectionTitle as any}>V. DATOS DE LA VIVIENDA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="25%"><b>Material Vivienda:</b></td>
                            <td style={tdStyle}>Concreto [{formData.materialVivienda === 'CONCRETO' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Precario [{formData.materialVivienda === 'PRECARIO' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Otro [{formData.materialVivienda === 'OTRO' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>N° Ambientes:</b></td>
                            <td style={tdStyle}>1 [{formData.numeroAmbientes === '1' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>2 [{formData.numeroAmbientes === '2' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>3+ [{formData.numeroAmbientes === '3+' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Propiedad:</b></td>
                            <td style={tdStyle}>Propia [{formData.propiedadVivienda === 'PROPIA' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Alquilada [{formData.propiedadVivienda === 'ALQUILADA' ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Alojado [{formData.propiedadVivienda === 'ALOJADO' ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Servicios Básicos:</b></td>
                            <td style={tdStyle}>Agua [{formData.serviciosBasicos.agua ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Luz [{formData.serviciosBasicos.luz ? 'X' : ' '}]</td>
                            <td style={tdStyle}>Desagüe [{formData.serviciosBasicos.desague ? 'X' : ' '}]</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Estuvo en CAR/Albergue:</b></td>
                            <td style={tdStyle}>SI [{nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</td>
                            <td style={tdStyle}>NO [{!nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</td>
                            <td style={tdStyle}>
                                <span style={{ fontSize: '8px' }}>Motivo: {nna?.detalleAntecedenteAlbergue || '---'}</span>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* VI. EDUCACIÓN */}
                <div style={sectionTitle as any}>VI. EDUCACIÓN - NNA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>¿Estudia Actualmente?</span>
                                <b>{nna?.estudiaActualmente ? 'SÍ' : 'NO'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Nivel / Grado</span>
                                {nna?.nivelEducativo} - {nna?.gradoEstudio}
                            </td>
                            <td style={tdStyle} width="50%">
                                <span style={labelStyle as any}>Institución Educativa</span>
                                {nna?.institucionEducativa || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Presenta Atraso Escolar</span>
                                SI [{formData.presentaAtraso ? 'X' : ' '}] NO [{!formData.presentaAtraso ? 'X' : ' '}]
                                <b> Cuánto: {formData.tiempoAtraso || '---'}</b>
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Motivo Atraso</span>
                                {formData.motivoAtraso || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Problemas Aprendizaje</span>
                                SI [{formData.problemasAprendizaje ? 'X' : ' '}] NO [{!formData.problemasAprendizaje ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Problemas Conducta</span>
                                SI [{formData.problemasConducta ? 'X' : ' '}] NO [{!formData.problemasConducta ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Ha sido expulsado</span>
                                SI [{formData.expulsado ? 'X' : ' '}] NO [{!formData.expulsado ? 'X' : ' '}] N° veces: {formData.vecesExpulsado || '---'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* VII. SALUD */}
                <div style={sectionTitle as any}>VII. SALUD – ALIMENTACIÓN – HIGIENE</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="30%"><b>Enfermedad Crónica:</b></td>
                            <td style={tdStyle}>SI [{formData.enfermedadCronica ? 'X' : ' '}] NO [{!formData.enfermedadCronica ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.detalleEnfermedadCronica || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Discapacidad:</b></td>
                            <td style={tdStyle}>SI [{nna?.tieneDiscapacidad ? 'X' : ' '}] NO [{!nna?.tieneDiscapacidad ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{nna?.tipoDiscapacidad || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Problemas Psicológicos:</b></td>
                            <td style={tdStyle}>SI [{formData.problemaPsicologico ? 'X' : ' '}] NO [{!formData.problemaPsicologico ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.detalleProblemaPsicologico || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Consume Sustancias:</b></td>
                            <td style={tdStyle}>SI [{formData.consumeSustancias ? 'X' : ' '}] NO [{!formData.consumeSustancias ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.tipoSustancias || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Recibe 3 Alimentos al Día:</b></td>
                            <td style={tdStyle}>SI [{formData.recibeTresAlimentos ? 'X' : ' '}] NO [{!formData.recibeTresAlimentos ? 'X' : ' '}]</td>
                            <td style={tdStyle}></td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Higiene Personal Adecuada:</b></td>
                            <td style={tdStyle}>SI [{formData.higieneAdecuada ? 'X' : ' '}] NO [{!formData.higieneAdecuada ? 'X' : ' '}]</td>
                            <td style={tdStyle}><span style={{ fontSize: '8px' }}>Cabello/uñas limpias y recortadas</span></td>
                        </tr>
                    </tbody>
                </table>

                {/* VIII. RECREACIÓN */}
                <div style={sectionTitle as any}>VIII. RECREACIÓN E INTERESES DEL NNA</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="30%"><b>Cuenta con Tiempo para Jugar:</b></td>
                            <td style={tdStyle} width="20%">SI [{formData.tiempoParaJugar ? 'X' : ' '}] NO [{!formData.tiempoParaJugar ? 'X' : ' '}]</td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Veces/Semana</span>
                                <b>{formData.vecesJuegaSemana || '---'}</b>
                            </td>
                            <td style={tdStyle} width="25%">
                                <span style={labelStyle as any}>Lugar</span>
                                <b>{formData.lugarJuego || '---'}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Participa en Institución:</b></td>
                            <td style={tdStyle}>SI [{formData.participaInstitucion ? 'X' : ' '}] NO [{!formData.participaInstitucion ? 'X' : ' '}]</td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Tipo</span>
                                {formData.tipoInstitucion || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Deportivos</span> SI [{formData.interesesDeportivos ? 'X' : ' '}] NO [{!formData.interesesDeportivos ? 'X' : ' '}]</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Artísticos</span> SI [{formData.interesesArtisticos ? 'X' : ' '}] NO [{!formData.interesesArtisticos ? 'X' : ' '}]</td>
                            <td style={tdStyle} colSpan={2}><span style={labelStyle as any}>Actividades con Familia</span> SI [{formData.actividadesFamilia ? 'X' : ' '}] NO [{!formData.actividadesFamilia ? 'X' : ' '}]</td>
                        </tr>
                    </tbody>
                </table>

                {/* IX. NECESIDADES Y PLAN DE ACCIÓN */}
                <div style={sectionTitle as any}>IX. NECESIDADES DEL NNA Y PLAN DE ACCIÓN</div>
                <table style={tableStyle as any}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '5%' }}>N°</th>
                            <th style={{ ...thStyle, width: '15%' }}>Categoría</th>
                            <th style={{ ...thStyle, width: '20%' }}>Descripción</th>
                            <th style={{ ...thStyle, width: '20%' }}>Fase I (Contacto)</th>
                            <th style={{ ...thStyle, width: '20%' }}>Fase II (Desarrollo)</th>
                            <th style={{ ...thStyle, width: '20%' }}>Fase III (Reinserción)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.necesidades.length > 0 ? (
                            formData.necesidades.map((necesidad, idx) => (
                                <tr key={idx}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px', fontWeight: 'bold' }}>{necesidad.categoria}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px' }}>{necesidad.descripcion}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseI || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseII || '-'}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}>{necesidad.faseIII || '-'}</td>
                                </tr>
                            ))
                        ) : (
                            // Si no hay necesidades, mostrar al menos 3 filas vacías
                            [1, 2, 3].map((i) => (
                                <tr key={i}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i}</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                    <td style={tdStyle}>&nbsp;</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* FIRMAS */}
                <table style={{ width: '100%', marginTop: '40px', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '8px 0', fontSize: '10px' }}>
                                <b>Educador/a Responsable:</b> {caso?.responsable?.nombreCompleto || '________________________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0', fontSize: '10px' }}>
                                <b>DNI:</b> {caso?.responsable?.dni || '________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0', fontSize: '10px' }}>
                                <b>Fecha:</b> {new Date().toLocaleDateString()} - <b>Zona:</b> {caso?.zonaIntervencion || '________________'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ paddingTop: '30px' }}>
                                <div style={{ borderTop: '1px solid black', width: '250px', paddingTop: '5px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                    FIRMA DEL EDUCADOR
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

            </div>
        </div >
    );
};
