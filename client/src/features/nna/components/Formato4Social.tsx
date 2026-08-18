import { getToken } from '../../../utils/auth';
import { confirmar } from '../../../components/ui/ConfirmDialog';
import { NNA_API_URL, DERIVACION_API_URL, INTERVENCION_API_URL, AUTH_API_URL, EXPEDIENTE_API_URL } from '../../../config/api';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Plus, Edit2, Trash2, X, ArrowLeft, ArrowRight, User, Users, GraduationCap, HeartPulse, Target, Clock, Timer, Briefcase, AlertCircle, School, CheckCircle2, XCircle, Mic, Sparkles, Lock } from 'lucide-react';
import { UbigeoSelectorSimple } from './UbigeoSelectorSimple';
import { ActividadModal } from './ActividadModal';
import { InputField, SelectField } from '../../../components/ui/FormFields';
import { useNnaStore } from '../../../store/nna.store';
import { DISCAPACIDADES_CONADIS } from '../../../data/ubigeo';
import clsx from 'clsx';

import { AvisoHermanos } from './AvisoHermanos';
import { CampoDictado } from '../../../components/ui/CampoDictado';
import { detectarHermanos } from '../../../api/hermanos.api';
import type { DeteccionHermanos } from '../../../api/hermanos.api';

interface Formato4SocialProps {
    nna: any;
    caso?: any;
    initialData?: any; // Para modo edición
    onClose?: () => void; // Para volver a la lista
    onSuccess?: () => void; // Para refrescar la lista
}

type FormTabId = 'GENERAL' | 'FAMILIA' | 'EDUCACION' | 'SALUD' | 'NECESIDADES';

const FORM_TABS: Array<{ id: FormTabId; label: string; icon: typeof User }> = [
    { id: 'GENERAL',     label: 'I-III. General / Calle',       icon: User },
    { id: 'FAMILIA',     label: 'IV-V. Familia / Vivienda',     icon: Users },
    { id: 'EDUCACION',   label: 'VI. Educación',                icon: GraduationCap },
    { id: 'SALUD',       label: 'VII-VIII. Salud / Recreación', icon: HeartPulse },
    { id: 'NECESIDADES', label: 'IX. Necesidades',              icon: Target },
];

const MOTIVO_PRIMERA_INFANCIA = 'MENOR DE 3 AÑOS';

/**
 * Campos que solo tienen sentido con matrícula vigente.
 *
 * Debe coincidir con `EDUCACION_DEPENDIENTE_VACIA` del backend
 * (`services/intervencion-service-py/src/domain/entities/diagnostico.py`).
 *
 * Bullying, expulsión, atraso escolar y problemas de aprendizaje o conducta
 * **no se borran**: son antecedentes y normalmente la causa de la deserción.
 * Vaciarlos al marcar "no estudia" eliminaba la explicación de por qué dejó de
 * estudiar, justo en el momento de registrarlo.
 */
const EDUCACION_DEPENDIENTE_VACIA = {
    eduNivel: '',
    eduGrado: '',
    eduTurno: '',
    eduTipoIE: '',
    eduModalidad: '',
    eduInstitucion: '',
    faltasTardanzas: false,
    seDuermeClase: false,
    tutorConversaDocente: false,
};

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
    descripcion?: string; // Compatibilidad con fichas antiguas.
    faseI: string;
    faseII: string;
    faseIII: string;
    acciones?: NeedAction[];
}

type NeedPhase = 'faseI' | 'faseII' | 'faseIII';

interface NeedAction {
    id: string;
    flowId?: string;
    titulo: string;
    faseI: string;
    faseII: string;
    faseIII: string;
    fasesActivas: NeedPhase[];
}

const NEED_PHASES: Array<{ key: NeedPhase; label: string }> = [
    { key: 'faseI', label: 'Fase I' },
    { key: 'faseII', label: 'Fase II' },
    { key: 'faseIII', label: 'Fase III' },
];

const createNeedActionId = () => `accion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeNeedActions = (need: Partial<Need>, legacyIndex = 0): NeedAction[] => {
    if (Array.isArray(need.acciones) && need.acciones.length > 0) {
        return need.acciones.map((action, index) => ({
            id: action.id || `accion-${legacyIndex}-${index}`,
            flowId: action.flowId,
            titulo: action.titulo || 'Acción de intervención',
            faseI: action.faseI || '',
            faseII: action.faseII || '',
            faseIII: action.faseIII || '',
            fasesActivas: Array.isArray(action.fasesActivas)
                ? action.fasesActivas
                : NEED_PHASES.filter(phase => Boolean(action[phase.key])).map(phase => phase.key),
        }));
    }

    const legacyPhases = NEED_PHASES.filter(phase => Boolean(need[phase.key])).map(phase => phase.key);
    if (legacyPhases.length === 0) return [];
    return [{
        id: `accion-legada-${legacyIndex}`,
        titulo: need.categoria ? `Gestión de ${String(need.categoria).toLocaleLowerCase('es-PE')}` : 'Acción de intervención',
        faseI: need.faseI || need.descripcion || '',
        faseII: need.faseII || '',
        faseIII: need.faseIII || '',
        fasesActivas: legacyPhases,
    }];
};

const NEED_CATEGORIES = [
    { value: 'SALUD', label: 'Salud' },
    { value: 'IDENTIFICACIÓN', label: 'Identificación' },
    { value: 'ALIMENTACIÓN', label: 'Alimentación' },
    { value: 'VIVIENDA', label: 'Vivienda' },
    { value: 'EDUCACIÓN', label: 'Educación' },
    { value: 'LEGAL', label: 'Legal' },
    { value: 'PAUTAS DE CRIANZA', label: 'Pautas de Crianza' },
    { value: 'VIOLENCIA', label: 'Violencia - Física y Psicológica' },
    { value: 'RECREATIVAS', label: 'Recreativas' },
    { value: 'OTRA', label: 'Otra' },
] as const;

interface NeedActionFlow {
    id: string;
    titulo: string;
    faseI: string;
    faseII: string[];
    faseIII: string[];
}

const NEED_ACTION_FLOWS: Record<string, NeedActionFlow[]> = {
    SALUD: [
        { id: 'salud-sis', titulo: 'Afiliación y acceso al SIS', faseI: 'Gestionar afiliación al Seguro Integral de Salud (SIS).', faseII: ['Verificar la afiliación y gestionar la primera atención de salud.'], faseIII: ['Realizar seguimiento al acceso y continuidad de la atención en salud.'] },
        { id: 'salud-medica', titulo: 'Atención médica', faseI: 'Coordinar evaluación médica general o especializada.', faseII: ['Acompañar el tratamiento o las atenciones médicas indicadas.'], faseIII: ['Verificar la evolución y continuidad del tratamiento médico.'] },
        { id: 'salud-psicologica', titulo: 'Atención psicológica', faseI: 'Gestionar evaluación psicológica.', faseII: ['Acompañar el proceso de atención psicológica.'], faseIII: ['Realizar seguimiento a los avances y continuidad de la atención psicológica.'] },
        { id: 'salud-higiene', titulo: 'Higiene y autocuidado', faseI: 'Brindar orientación sobre higiene y autocuidado.', faseII: ['Reforzar hábitos de higiene y autocuidado con el NNA y su familia.'], faseIII: ['Verificar la incorporación sostenida de hábitos de higiene y autocuidado.'] },
    ],
    IDENTIFICACIÓN: [
        { id: 'identidad-documentacion', titulo: 'Gestión de documentación', faseI: 'Gestionar certificado de nacido vivo.', faseII: ['Gestionar la inscripción de la partida de nacimiento.'], faseIII: ['Gestionar la inscripción o duplicado del DNI.'] },
    ],
    ALIMENTACIÓN: [
        { id: 'alimentacion-nutricion', titulo: 'Alimentación y nutrición', faseI: 'Coordinar evaluación nutricional del NNA.', faseII: ['Gestionar acceso a un programa de apoyo alimentario.', 'Orientar a la familia sobre alimentación saludable.'], faseIII: ['Realizar seguimiento al estado nutricional y a la alimentación del NNA.'] },
    ],
    VIVIENDA: [
        { id: 'vivienda-condiciones', titulo: 'Condiciones de vivienda', faseI: 'Coordinar la evaluación de las condiciones de vivienda.', faseII: ['Orientar sobre acceso a servicios básicos y condiciones seguras de vivienda.'], faseIII: ['Realizar seguimiento a las mejoras gestionadas en la vivienda.'] },
    ],
    EDUCACIÓN: [
        { id: 'educacion-insercion', titulo: 'Matrícula o reinserción educativa', faseI: 'Gestionar matrícula o reinserción educativa.', faseII: ['Coordinar seguimiento de asistencia y rendimiento escolar.'], faseIII: ['Verificar la permanencia y continuidad educativa.'] },
        { id: 'educacion-apoyo', titulo: 'Apoyo educativo', faseI: 'Identificar necesidades de reforzamiento escolar o apoyo pedagógico.', faseII: ['Gestionar reforzamiento escolar o apoyo pedagógico.'], faseIII: ['Evaluar los avances obtenidos mediante el apoyo educativo.'] },
    ],
    LEGAL: [
        { id: 'legal-orientacion', titulo: 'Orientación y acompañamiento legal', faseI: 'Brindar orientación legal a la familia.', faseII: ['Coordinar la derivación a la entidad competente.'], faseIII: ['Realizar seguimiento al trámite o procedimiento legal.'] },
    ],
    'PAUTAS DE CRIANZA': [
        { id: 'crianza-positiva', titulo: 'Fortalecimiento de pautas de crianza', faseI: 'Brindar orientación sobre pautas de crianza positiva.', faseII: ['Promover la participación del familiar en talleres de crianza.'], faseIII: ['Realizar seguimiento y consejería familiar sobre pautas de crianza.'] },
    ],
    VIOLENCIA: [
        { id: 'violencia-proteccion', titulo: 'Atención y protección frente a violencia', faseI: 'Activar la ruta de atención y protección correspondiente.', faseII: ['Gestionar evaluación psicológica y coordinar con la entidad competente.'], faseIII: ['Realizar seguimiento a las medidas de protección y recuperación.'] },
    ],
    RECREATIVAS: [
        { id: 'recreacion-participacion', titulo: 'Participación recreativa y comunitaria', faseI: 'Identificar intereses deportivos, recreativos o culturales.', faseII: ['Gestionar la vinculación con una institución deportiva, cultural o comunitaria.'], faseIII: ['Realizar seguimiento a la participación sostenida del NNA.'] },
    ],
    OTRA: [],
};

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

type TiempoSituacionCalle = {
    cantidad: string;
    unidad: 'SEMANAS' | 'MESES' | 'AÑOS';
};

const parseTiempoSituacionCalle = (value: unknown): TiempoSituacionCalle => {
    const fallback: TiempoSituacionCalle = { cantidad: '', unidad: 'MESES' };

    if (value && typeof value === 'object') {
        const tiempo = value as { cantidad?: unknown; unidad?: unknown };
        const cantidad = String(tiempo.cantidad ?? '').trim();
        if (!cantidad) return fallback;
        const unidadNormalizada = normalizeCatalogText(tiempo.unidad);
        return {
            cantidad,
            unidad: unidadNormalizada.includes('SEMANA')
                ? 'SEMANAS'
                : unidadNormalizada.includes('ANO')
                    ? 'AÑOS'
                    : 'MESES',
        };
    }

    const texto = String(value ?? '').trim();
    if (!texto) return fallback;
    const cantidad = texto.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.') || '';
    if (!cantidad) return fallback;

    const textoNormalizado = normalizeCatalogText(texto);
    return {
        cantidad,
        unidad: textoNormalizado.includes('SEMANA')
            ? 'SEMANAS'
            : textoNormalizado.includes('ANO')
                ? 'AÑOS'
                : 'MESES',
    };
};

const formatTiempoSituacionCalle = (tiempo?: { cantidad?: unknown; unidad?: unknown }): string => {
    const cantidad = String(tiempo?.cantidad ?? '').trim();
    const unidad = String(tiempo?.unidad ?? '').trim();
    return cantidad ? `${cantidad} ${unidad}`.trim() : '';
};

const calcularTiempoDesdeActividades = (actividades: any[]): TiempoSituacionCalle | null => {
    let mayor: { tiempo: TiempoSituacionCalle; mesesEquivalentes: number } | null = null;

    actividades.forEach((actividad) => {
        const unidad = normalizeCatalogText(actividad?.tiempoUnidad);
        const tiempo = unidad === 'DETALLE'
            ? parseTiempoSituacionCalle(actividad?.tiempoValor)
            : parseTiempoSituacionCalle({
                cantidad: actividad?.tiempoValor,
                unidad: actividad?.tiempoUnidad,
            });
        const cantidad = Number(tiempo.cantidad);
        if (!Number.isFinite(cantidad) || cantidad <= 0) return;

        const mesesEquivalentes = tiempo.unidad === 'AÑOS'
            ? cantidad * 12
            : tiempo.unidad === 'SEMANAS'
                ? cantidad / 4.345
                : cantidad;

        if (!mayor || mesesEquivalentes > mayor.mesesEquivalentes) {
            mayor = { tiempo, mesesEquivalentes };
        }
    });

    const resultado = mayor as { tiempo: TiempoSituacionCalle; mesesEquivalentes: number } | null;
    return resultado?.tiempo ?? null;
};

const getTiempoGuardadoDiagnostico = (initialData: any): TiempoSituacionCalle | null => {
    if (!initialData) return null;
    let extra: any = {};
    try {
        extra = typeof initialData.datos_extra === 'string'
            ? JSON.parse(initialData.datos_extra)
            : initialData.datos_extra || {};
    } catch {}

    const detalle = initialData.situacionCalleDetalle?.tiempo
        ?? extra.situacionCalleDetalle?.tiempo;
    const tiempo = String(detalle?.cantidad ?? '').trim()
        ? parseTiempoSituacionCalle(detalle)
        : parseTiempoSituacionCalle(initialData.tiempo_en_calle ?? initialData.tiempoEnCalle);
    return tiempo.cantidad ? tiempo : null;
};

type HorariosSituacionCalle = {
    manana: boolean;
    tarde: boolean;
    noche: boolean;
    madrugada: boolean;
};

const HORARIOS_VACIOS: HorariosSituacionCalle = {
    manana: false,
    tarde: false,
    noche: false,
    madrugada: false,
};

const calcularHorariosDesdeActividades = (actividades: any[]): HorariosSituacionCalle => {
    const resultado = { ...HORARIOS_VACIOS };
    const franjas: Record<keyof HorariosSituacionCalle, Array<[number, number]>> = {
        madrugada: [[0, 360], [1440, 1800]],
        manana: [[360, 720], [1800, 2160]],
        tarde: [[720, 1080], [2160, 2520]],
        noche: [[1080, 1440], [2520, 2880]],
    };

    const minutos = (hora: unknown): number | null => {
        const match = String(hora ?? '').match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return null;
        const total = Number(match[1]) * 60 + Number(match[2]);
        return Number.isFinite(total) && total >= 0 && total <= 1440 ? total : null;
    };

    const marcarTurno = (inicioRaw: unknown, finRaw: unknown) => {
        const inicio = minutos(inicioRaw);
        const finBase = minutos(finRaw);
        if (inicio === null || finBase === null || inicio === finBase) return;
        const fin = finBase < inicio ? finBase + 1440 : finBase;

        (Object.keys(franjas) as Array<keyof HorariosSituacionCalle>).forEach((franja) => {
            if (franjas[franja].some(([desde, hasta]) => inicio < hasta && fin > desde)) {
                resultado[franja] = true;
            }
        });
    };

    actividades.forEach((actividad) => {
        Object.values(actividad?.agenda || {}).forEach((dia: any) => {
            if (!dia?.activo) return;
            marcarTurno(dia.turno1Inicio, dia.turno1Fin);
            marcarTurno(dia.turno2Inicio, dia.turno2Fin);
        });
    });

    return resultado;
};

const getHorariosGuardadosDiagnostico = (initialData: any): HorariosSituacionCalle | null => {
    if (!initialData) return null;
    let extra: any = {};
    try {
        extra = typeof initialData.datos_extra === 'string'
            ? JSON.parse(initialData.datos_extra)
            : initialData.datos_extra || {};
    } catch {}
    const horarios = initialData.situacionCalleDetalle?.horarios
        ?? extra.situacionCalleDetalle?.horarios;

    // "madrugada" identifica las fichas guardadas después de incorporar este bloque.
    // Las fichas antiguas traían tres falsos por defecto, aunque nunca mostraron el campo.
    if (!horarios || !Object.prototype.hasOwnProperty.call(horarios, 'madrugada')) return null;
    return {
        manana: Boolean(horarios.manana),
        tarde: Boolean(horarios.tarde),
        noche: Boolean(horarios.noche),
        madrugada: Boolean(horarios.madrugada),
    };
};

type FrecuenciaSituacionCalle = {
    diario: boolean;
    interdiario: boolean;
    finesSemana: boolean;
    temporadas: boolean;
};

const FRECUENCIA_VACIA: FrecuenciaSituacionCalle = {
    diario: false,
    interdiario: false,
    finesSemana: false,
    temporadas: false,
};

const calcularFrecuenciaDesdeActividades = (actividades: any[]): FrecuenciaSituacionCalle => {
    const diasOrdenados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasActivos = new Set<number>();

    actividades.forEach((actividad) => {
        diasOrdenados.forEach((dia, index) => {
            if (actividad?.agenda?.[dia]?.activo) diasActivos.add(index);
        });
    });

    if (diasActivos.size >= 5) {
        return { ...FRECUENCIA_VACIA, diario: true };
    }
    if (diasActivos.size > 0 && [...diasActivos].every((dia) => dia === 5 || dia === 6)) {
        return { ...FRECUENCIA_VACIA, finesSemana: true };
    }

    const patron = [...diasActivos].sort((a, b) => a - b).join(',');
    if (['0,2,4', '1,3,5', '0,2,4,6'].includes(patron)) {
        return { ...FRECUENCIA_VACIA, interdiario: true };
    }

    return { ...FRECUENCIA_VACIA };
};

const getFrecuenciaGuardadaDiagnostico = (initialData: any): FrecuenciaSituacionCalle | null => {
    if (!initialData) return null;
    let extra: any = {};
    try {
        extra = typeof initialData.datos_extra === 'string'
            ? JSON.parse(initialData.datos_extra)
            : initialData.datos_extra || {};
    } catch {}
    const frecuencia = initialData.situacionCalleDetalle?.frecuencia
        ?? extra.situacionCalleDetalle?.frecuencia;
    if (!frecuencia || !Object.values(frecuencia).some(Boolean)) return null;
    return {
        diario: Boolean(frecuencia.diario),
        interdiario: Boolean(frecuencia.interdiario),
        finesSemana: Boolean(frecuencia.finesSemana),
        temporadas: Boolean(frecuencia.temporadas),
    };
};

const calcularActividadDesdeActividades = (actividades: any[]): string => {
    const unicas = new Map<string, string>();
    actividades.forEach((actividad) => {
        const nombreBase = String(actividad?.actividad ?? '').trim();
        const esOtro = normalizeCatalogText(nombreBase).startsWith('OTRO');
        const nombre = String(
            esOtro && actividad?.actividadEspecifique
                ? actividad.actividadEspecifique
                : nombreBase.replace(/_/g, ' ')
        ).trim();
        if (nombre) unicas.set(normalizeCatalogText(nombre), nombre);
    });
    return [...unicas.values()].join('; ');
};

const getActividadGuardadaDiagnostico = (initialData: any): string => {
    if (!initialData) return '';
    let extra: any = {};
    try {
        extra = typeof initialData.datos_extra === 'string'
            ? JSON.parse(initialData.datos_extra)
            : initialData.datos_extra || {};
    } catch {}
    return String(
        initialData.situacionCalleDetalle?.actividad
        ?? extra.situacionCalleDetalle?.actividad
        ?? initialData.actividad_calle
        ?? initialData.actividadCalle
        ?? ''
    ).trim();
};

const normalizeEstudiaActualmente = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '';
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

// Misma lista que SaludSection.tsx (Ficha de Inscripción - V. Salud)
const SEGUROS_PREDEFINIDOS = [
    "EsSalud",
    "Seguro Privado / EPS",
    "Seguro de FF.AA. o Policiales",
    "Seguro Escolar Privado",
    "Seguro Universitario"
];

// Toggle SI/NO reutilizable. Cada uso se conecta explícitamente a su propia variable de formData,
// sin indexado dinámico por string. Si se le pasan children, estos se muestran DENTRO de la misma
// tarjeta cuando value === true, para que quede claro a qué pregunta pertenece cada detalle.
const ToggleSiNo = ({ label, value, onChange, children }: { label: string; value: boolean; onChange: (val: boolean) => void; children?: React.ReactNode }) => (
    <div className="p-4 border border-purple-100 rounded-xl bg-purple-50/10 flex flex-col justify-between">
        <span className="font-bold text-[10px] text-purple-900 uppercase mb-3">{label}</span>
        <div className="flex gap-2 h-8">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded-lg cursor-pointer transition-colors ${value === true ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
            >
                SÍ
            </button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded-lg cursor-pointer transition-colors ${value === false ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
                NO
            </button>
        </div>
        {value === true && children && (
            <div className="mt-3 pt-3 border-t border-purple-100 space-y-2 animate-scaleUp">
                {children}
            </div>
        )}
    </div>
);

// Toggle de 3 estados (SI / NO / A VECES), para las preguntas de higiene de la plantilla oficial.
// Cada uso se conecta explícitamente a su propia variable de formData.
const Toggle3 = ({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) => (
    <div className="p-4 border border-purple-100 rounded-xl bg-purple-50/10">
        <span className="font-bold text-[10px] text-purple-900 uppercase mb-3 block">{label}</span>
        <div className="flex gap-2">
            {[{ value: 'SI', label: 'SÍ' }, { value: 'NO', label: 'NO' }, { value: 'A_VECES', label: 'A Veces' }].map(opt => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange(opt.value)}
                    className={`flex-1 flex items-center justify-center font-bold text-[10px] border rounded-lg cursor-pointer transition-colors px-1 py-2 ${value === opt.value ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
);

const NeedPhaseItems = ({ value }: { value?: string }) => {
    const items = String(value || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);
    if (items.length === 0) return <span>-</span>;
    return (
        <div className="space-y-1">
            {items.map((item, index) => (
                <div key={`${index}-${item}`} className="flex items-start gap-1">
                    <span className="shrink-0 font-bold">-</span>
                    <span>{item}</span>
                </div>
            ))}
        </div>
    );
};

export const Formato4Social = ({ nna, caso, initialData, onClose, onSuccess }: Formato4SocialProps) => {
    const getTodayLocal = () => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
        return local.toISOString().slice(0, 10);
    };


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

    const [activeTab, setActiveTab] = useState<FormTabId>('GENERAL');
    const [generalErrors, setGeneralErrors] = useState<string[]>([]);
    const activeTabIndex = FORM_TABS.findIndex(tab => tab.id === activeTab);
    const [loading, setLoading] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showDraftConfirm, setShowDraftConfirm] = useState(false);
    const [resultModal, setResultModal] = useState<{
        type: 'success' | 'draft' | 'error';
        title: string;
        message: string;
        callSuccess?: boolean;
    } | null>(null);

    const closeResultModal = () => {
        const shouldCall = resultModal?.callSuccess;
        setResultModal(null);
        if (shouldCall && onSuccess) onSuccess();
    };

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
    // El modal de actividades usa estos códigos para cargar sus opciones.
    // Normalizamos el valor legado para que "Vida en calle" también lo habilite.
    const perfilActividad = perfilCaso === 'VIDA_CALLE' ? 'VIDA_EN_CALLE' : perfilCaso;
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
    const tiempoSituacionDesdeInscripcion = parseTiempoSituacionCalle(
        caso?.tiempoEnCalle ?? caso?.tiempo_en_calle
    );

    const [formData, setFormData] = useState({
        // I-III. Datos Generales y Calle
        apellidoPaterno:    nna?.apellidoPaterno  || '',
        apellidoMaterno:    nna?.apellidoMaterno  || '',
        nombres:            nna?.nombres          || '',
        sexo:               nna?.sexo             || '',
        numeroDoc:          nna?.numeroDoc        || '',
        tipoDoc:            String(nna?.tipoDoc || '').split(':')[0].trim(),
        tienePartidaNacimiento: nna?.tienePartidaNacimiento !== undefined && nna?.tienePartidaNacimiento !== null
                                    ? !!nna.tienePartidaNacimiento
                                    : true,
        detalleSinDoc:      nna?.detalleSinDoc    || '',
        fechaNacimiento:    nna?.fechaNacimiento  ? new Date(nna.fechaNacimiento).toISOString().split('T')[0] : '',
        // Fecha en que se inicia/termina de aplicar la entrevista del Formato 4 (no es la fecha de nacimiento del NNA).
        // Las pone el sistema, no el educador: el inicio es hoy —el día en que se
        // empieza a llenar— y el fin se sella al finalizar la ficha.
        fechaInicioAplicacion: getTodayLocal(),
        fechaFinAplicacion:    '',
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
            tiempo: tiempoSituacionDesdeInscripcion,
            // Se precarga desde el F03: el dato ya lo dio el educador al
            // inscribir al NNA y estaba calculándose para nada. Queda editable
            // porque el diagnóstico puede corregir lo que se supo al inicio.
            explotacionSexual: explotacionSexualF03,
            ingresoSemanal: '',
            usoDinero: { gastosFamiliares: false, gastosPropios: false, entregaOtraPersona: false },
            horarios:  { ...HORARIOS_VACIOS },
            frecuencia: { ...FRECUENCIA_VACIA },
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
        tutorViveConNna:       tutorPrincipal?.viveCon || '',
        tutorLenguaMaterna:    tutorPrincipal?.lenMatApo || '10',
        tutorEtnia:            tutorPrincipal?.autIdeEtApo || '7',
        tutorTelefono:         tutorPrincipal?.telefono || '',
        tutorConsumoDrogas:    '',
        tutorRecibeApoyo:      '',
        tutorDeseaDemanda:     '',

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
            viveCon:           f.viveCon || '',
            telefono:          f.telefono || '',
            esTutorPrincipal:  f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true ? 'true' : 'false'
        })) as FamilyMember[],
        dinamicaFamiliar: {
            contacto:     '',
            frecuencia:   '',
            rolProtector: '',
            rolProveedor: ''
        },

        // V. Vivienda
        materialVivienda:    '',
        numeroAmbientes:     '',
        propiedadVivienda:   '',
        serviciosBasicos: {
            agua: false,
            detalleAgua: '',
            luz: false,
            detalleLuz: '',
            desague: false,
            detalleDesague: '',
            otros: false,
            detalleOtros: '',
        },
        viviendaSisfoh:      '',
        duermeCama:          '',
        lugarPernocte:        nna?.lugarPernocte    || '',
        detalleLugarPernocte: nna?.detalleLugarPernocte || '',
        duermeConQuien:       nna?.detalleViveCon  || '',
        duermeSoloAcompanado: 'SOLO',
        higieneDomicilio:    '',
        tieneAntecedenteAlbergue:   !!nna?.tieneAntecedenteAlbergue,
        tiempoAlbergue:             '',
        detalleAntecedenteAlbergue: nna?.detalleAntecedenteAlbergue || '',

        // VI. Educación
        presentaAtraso:      false,
        tiempoAtraso:        '',
        motivoAtraso:        '',
        problemasAprendizaje: false,
        problemasConducta:   false,
        intensidadConducta:  '',
        expulsado:           false,
        vecesExpulsado:      '',
        faltasTardanzas:     false,
        seDuermeClase:       false,
        sufreBullying:       false,
        tutorConversaDocente: false,
        eduNivel:      normalizeNivelEducativo(nna?.nivelEducativo || '5'),
        eduGrado:      normalizeGradoEstudio(nna?.gradoEstudio || '8'),
        eduTurno:      'MAÑANA',
        eduTipoIE:     'ESTATAL',
        eduModalidad:  normalizeModalidadEstudio(nna?.modalidadEstudio || ''),
        eduEstudia:    normalizeEstudiaActualmente(nna?.estudiaActualmente),
        eduInstitucion: nna?.institucionEducativa || '',
        eduMotivoNoEstudia: nna?.detalleNoEstudia || '',

        // VII. Salud
        afiliadoSIS:              nna?.afiliadoSIS        || '',
        afiliadoOtroSeguro:       nna?.afiliadoOtroSeguro || '',
        detalleOtroSeguro:        nna?.detalleOtroSeguro  || '',

        // Presenta problemas de salud en (checkboxes múltiples, propio del F04)
        problemasSaludTipo: { piel: false, desnutricion: false, respiratorios: false, its: false, otros: false },
        problemasSaludOtroDetalle: '',

        // Enfermedad crónica — hereda de la ficha de inscripción
        enfermedadCronica:        !!(nna?.sufreEnfermedad && nna.sufreEnfermedad !== 'NO' && nna.sufreEnfermedad !== 0),
        detalleEnfermedadCronica: nna?.detalleEnfermedad  || '',
        recibeTratamientoEnfermedad: false,

        // Discapacidad — hereda de la ficha de inscripción
        tieneDiscapacidad:        !!(nna?.tieneDiscapacidad && nna.tieneDiscapacidad !== 0),
        tipoDiscapacidad:         nna?.tipoDiscapacidad   || '',
        detalleDiscapacidad:      nna?.detalleDiscapacidad || '',
        certificadoDiscapacidad:  ['1', '2'].includes(String(nna?.certDiscapNna || '')),
        dondeTratamientoDiscapacidad: '',

        // Problemas psicológicos
        problemaPsicologico:      false,
        detalleProblemaPsicologico: '',
        tipoIndicadorPsicologico: { autoestimaBaja: false, depresion: false, ansiedad: false, impulsividad: false },

        // Consumo de sustancias / adicción
        consumeSustancias:        false,
        tipoSustancias:           '',
        adiccionRecibeTratamiento: false,

        // Salud sexual y reproductiva (propio del F04)
        seEncuentraGestando:      false,
        esMadrePadreAdolescente:  false,
        haSufridoAborto:          false,
        victimaAbusoSexual:       false,

        // Alimentación
        recibeTresAlimentos:      true,
        aparentaBienAlimentado:   true,
        dondeAlimenta:            '',
        quienAlimenta:            '',

        // Higiene (SI / NO / A VECES)
        higieneAdecuada:          'SI',
        ropasLimpias:             '',
        normasHigieneComer:       '',
        cabelloUnasLimpias:       '',

        // Disciplina / violencia correctiva
        violenciaCorrectiva:      false,
        quienEjerceViolencia:     '',
        tipoViolencia: { fisica: false, psicologica: false },

        observacionesSalud:       nna?.observacionesSalud || '',

        // VIII. Recreación
        tiempoParaJugar:              true,
        vecesJuegaSemana:             '',
        lugarJuego:                   '',
        lugarJuegoOtroDetalle:        '',
        interesesDeportivos:          false,
        interesesArtisticos:          false,
        recreacionActividadFamilia:   '',
        recreacionInteresDeporte:     '',
        recreacionInteresArte:        '',
        recreacionParticipaInstitucion: 'NO',
        recreacionTipoInstitucion:    '',
        recreacionInstitucionDetalle: '',

        // IX. Necesidades
        necesidades: [] as Need[]
    });

    const esMenorDeTres = useMemo(() => {
        const fechaNacimiento = formData.fechaNacimiento;
        const fechaReferencia = formData.fechaInicioAplicacion || getTodayLocal();

        if (fechaNacimiento) {
            const [birthYear, birthMonth, birthDay] = fechaNacimiento.split('-').map(Number);
            const [refYear, refMonth, refDay] = fechaReferencia.split('-').map(Number);
            if ([birthYear, birthMonth, birthDay, refYear, refMonth, refDay].every(Number.isFinite)) {
                const cumpleTres = new Date(birthYear + 3, birthMonth - 1, birthDay);
                const referencia = new Date(refYear, refMonth - 1, refDay);
                return referencia < cumpleTres;
            }
        }

        if (String(formData.edad ?? '').trim() === '') return false;
        const edad = Number(formData.edad);
        if (!Number.isFinite(edad) || edad < 0) return false;
        const unidad = String(formData.unidadEdad || 'ANIOS').toUpperCase();
        if (unidad.includes('DIA')) return edad < 1095;
        if (unidad.includes('MES')) return edad < 36;
        return edad < 3;
    }, [formData.fechaNacimiento, formData.fechaInicioAplicacion, formData.edad, formData.unidadEdad]);

    const actualizarSituacionEducativa = (situacion: string) => {
        setFormData(prev => {
            if (['SI', 'PROCESO'].includes(situacion)) {
                return { ...prev, eduEstudia: situacion, eduMotivoNoEstudia: '' };
            }
            return {
                ...prev,
                ...EDUCACION_DEPENDIENTE_VACIA,
                eduEstudia: situacion,
                eduMotivoNoEstudia: prev.eduMotivoNoEstudia === MOTIVO_PRIMERA_INFANCIA
                    ? ''
                    : prev.eduMotivoNoEstudia,
            };
        });
    };

    // --- MODALES ---
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
    const [currentFamily, setCurrentFamily] = useState<FamilyMember>({
        primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: '', estadoCivil: '', gradoInstruccion: '', ocupacion: '',
        priApeTutApo: '', segApeTutApo: '', nomApeTutApo: '', sexoApo: '', fechaNacApo: '', nacionalidadApo: 'PERUANA', tipDocTutApo: '1', nroDocTutApo: '',
        vinTutUsu: '1', lenMatApo: '10', lenMatEspApo: '', autIdeEtApo: '7', autIdeEtEspApo: '', tipoDiscapApo: '6', certDiscapApo: '99', viveCon: '', telefono: ''
    });

    // Detección de hermanos al registrar un integrante de la familia.
    const [deteccionHermanos, setDeteccionHermanos] = useState<DeteccionHermanos | null>(null);

    const [showNeedModal, setShowNeedModal] = useState(false);
    const [editingNeedIndex, setEditingNeedIndex] = useState<number | null>(null);
    const [currentNeed, setCurrentNeed] = useState<Need>({
        categoria: 'SALUD', faseI: '', faseII: '', faseIII: '', acciones: []
    });
    const [activeNeedPhase, setActiveNeedPhase] = useState<NeedPhase>('faseI');
    const [listeningActionKey, setListeningActionKey] = useState<string | null>(null);
    const speechRecognitionRef = useRef<any>(null);

    const suggestedNeeds = useMemo(() => {
        const suggestions: Array<{ categoria: string; motivo: string }> = [];
        const add = (categoria: string, motivo: string) => suggestions.push({ categoria, motivo });
        const sinDocumento = String(formData.tipoDoc) === '7';
        const sinSeguro = formData.afiliadoSIS === 'NO' && formData.afiliadoOtroSeguro === 'NO';
        const presentaAlertaSalud = formData.enfermedadCronica
            || formData.tieneDiscapacidad
            || formData.problemaPsicologico
            || formData.consumeSustancias
            || Object.values(formData.problemasSaludTipo).some(Boolean);

        if (sinDocumento) add('IDENTIFICACIÓN', 'No cuenta con un número de documento registrado.');
        if (sinSeguro || presentaAlertaSalud) add('SALUD', sinSeguro
            ? 'No registra afiliación a un seguro de salud.'
            : 'Se identificó una condición que requiere atención o seguimiento en salud.');
        if (!esMenorDeTres && formData.eduEstudia === 'NO') add('EDUCACIÓN', 'Actualmente no se encuentra estudiando.');
        if (!formData.recibeTresAlimentos || !formData.aparentaBienAlimentado) add('ALIMENTACIÓN', 'Se identificó una alerta en alimentación o nutrición.');
        if (formData.violenciaCorrectiva || formData.victimaAbusoSexual) add('VIOLENCIA', 'Se identificaron indicadores que requieren atención frente a violencia.');
        if (formData.violenciaCorrectiva) add('PAUTAS DE CRIANZA', 'Se requiere fortalecer pautas de crianza sin violencia.');
        if (formData.tiempoParaJugar === false) add('RECREATIVAS', 'Se identificó que el NNA no dispone de tiempo para jugar o realizar actividades recreativas.');

        const registradas = new Set(formData.necesidades.map(need => need.categoria));
        return suggestions.filter(item => !registradas.has(item.categoria));
    }, [formData, esMenorDeTres]);

    useEffect(() => () => {
        speechRecognitionRef.current?.stop?.();
    }, []);

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
    const tiempoCalculadoActividades = useMemo(
        () => calcularTiempoDesdeActividades(actividadesCalle),
        [actividadesCalle]
    );
    const tiempoGuardadoDiagnostico = useMemo(
        () => getTiempoGuardadoDiagnostico(initialData),
        [initialData]
    );
    const tiempoEditadoManualmenteRef = useRef(false);
    const horariosEditadosManualmenteRef = useRef(false);
    const horariosCalculadosActividades = useMemo(
        () => calcularHorariosDesdeActividades(actividadesCalle),
        [actividadesCalle]
    );
    const horariosGuardadosDiagnostico = useMemo(
        () => getHorariosGuardadosDiagnostico(initialData),
        [initialData]
    );
    const frecuenciaEditadaManualmenteRef = useRef(false);
    const frecuenciaCalculadaActividades = useMemo(
        () => calcularFrecuenciaDesdeActividades(actividadesCalle),
        [actividadesCalle]
    );
    const frecuenciaGuardadaDiagnostico = useMemo(
        () => getFrecuenciaGuardadaDiagnostico(initialData),
        [initialData]
    );
    const actividadEditadaManualmenteRef = useRef(false);
    const actividadCalculadaActividades = useMemo(
        () => calcularActividadDesdeActividades(actividadesCalle),
        [actividadesCalle]
    );
    const actividadGuardadaDiagnostico = useMemo(
        () => getActividadGuardadaDiagnostico(initialData),
        [initialData]
    );

    useEffect(() => {
        // Una modificación manual o un valor ya guardado en F04 siempre tiene prioridad.
        if (!tiempoCalculadoActividades || tiempoGuardadoDiagnostico || tiempoEditadoManualmenteRef.current) return;
        setFormData(prev => ({
            ...prev,
            situacionCalleDetalle: {
                ...prev.situacionCalleDetalle,
                tiempo: tiempoCalculadoActividades,
            },
        }));
    }, [tiempoCalculadoActividades, tiempoGuardadoDiagnostico]);

    useEffect(() => {
        if (horariosGuardadosDiagnostico || horariosEditadosManualmenteRef.current) return;
        setFormData(prev => ({
            ...prev,
            situacionCalleDetalle: {
                ...prev.situacionCalleDetalle,
                horarios: horariosCalculadosActividades,
            },
        }));
    }, [horariosCalculadosActividades, horariosGuardadosDiagnostico]);

    useEffect(() => {
        if (frecuenciaGuardadaDiagnostico || frecuenciaEditadaManualmenteRef.current) return;
        setFormData(prev => ({
            ...prev,
            situacionCalleDetalle: {
                ...prev.situacionCalleDetalle,
                frecuencia: frecuenciaCalculadaActividades,
            },
        }));
    }, [frecuenciaCalculadaActividades, frecuenciaGuardadaDiagnostico]);

    useEffect(() => {
        if (actividadGuardadaDiagnostico || actividadEditadaManualmenteRef.current) return;
        setFormData(prev => ({
            ...prev,
            situacionCalleDetalle: {
                ...prev.situacionCalleDetalle,
                actividad: actividadCalculadaActividades,
            },
        }));
    }, [actividadCalculadaActividades, actividadGuardadaDiagnostico]);

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
                const tiempoDetalleGuardado = mergedData.situacionCalleDetalle?.tiempo;
                const tiempoColumnaGuardado = parseTiempoSituacionCalle(
                    initialData.tiempo_en_calle ?? initialData.tiempoEnCalle
                );
                const tiempoDiagnostico = String(tiempoDetalleGuardado?.cantidad ?? '').trim()
                    ? tiempoDetalleGuardado
                    : tiempoColumnaGuardado.cantidad
                        ? tiempoColumnaGuardado
                        : prev.situacionCalleDetalle.tiempo;
                const horariosDetalleGuardados = mergedData.situacionCalleDetalle?.horarios;
                const horariosDiagnostico = horariosDetalleGuardados
                    && Object.prototype.hasOwnProperty.call(horariosDetalleGuardados, 'madrugada')
                    ? horariosDetalleGuardados
                    : prev.situacionCalleDetalle.horarios;
                const frecuenciaDetalleGuardada = mergedData.situacionCalleDetalle?.frecuencia;
                const frecuenciaDiagnostico = frecuenciaDetalleGuardada
                    && Object.values(frecuenciaDetalleGuardada).some(Boolean)
                    ? frecuenciaDetalleGuardada
                    : prev.situacionCalleDetalle.frecuencia;
                const actividadDetalleGuardada = String(
                    mergedData.situacionCalleDetalle?.actividad
                    ?? initialData.actividad_calle
                    ?? initialData.actividadCalle
                    ?? ''
                ).trim();
                const actividadDiagnostico = actividadDetalleGuardada
                    || prev.situacionCalleDetalle.actividad;

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

                // Normalizadores para combos: valores heredados de F03/NNA llegan en
                // formatos que no existen en las opciones y el combo se ve vacío.
                const normParentesco = (val: any): string => {
                    const s = normCode(val);
                    if (['1','2','3','4','5','6'].includes(s)) return s;
                    const u = String(s).toUpperCase();
                    if (u.includes('MADRE') || u.includes('PADRE')) return '1';
                    if (u.includes('TIO') || u.includes('TÍO') || u.includes('TIA') || u.includes('TÍA')) return '2';
                    if (u.includes('ABUEL')) return '3';
                    if (u.includes('HERMAN')) return '4';
                    if (u.includes('FAMILIAR') || u.includes('CUÑAD') || u.includes('PRIM')) return '5';
                    return s ? '6' : '';
                };
                const normEstadoCivil = (val: any): string => {
                    if (!val) return '';
                    const u = String(val).toUpperCase().trim();
                    if (u.startsWith('SOLTER')) return 'SOLTERO(A)';
                    if (u.startsWith('CASAD')) return 'CASADO(A)';
                    if (u.startsWith('CONVIV')) return 'CONVIVIENTE';
                    if (u.startsWith('DIVORCIAD')) return 'DIVORCIADO(A)';
                    if (u.startsWith('VIUD')) return 'VIUDO(A)';
                    return u;
                };
                const normGradoInstr = (val: any): string => {
                    if (!val) return '';
                    const u = String(val).toUpperCase().trim();
                    const opciones = ['SIN_INSTRUCCION','PRIMARIA_INCOMPLETA','PRIMARIA_COMPLETA','SECUNDARIA_INCOMPLETA','SECUNDARIA_COMPLETA','SUPERIOR_INCOMPLETA','SUPERIOR_COMPLETA'];
                    if (opciones.includes(u)) return u;
                    if (u.includes('SIN')) return 'SIN_INSTRUCCION';
                    if (u.includes('PRIMARIA')) return u.includes('INCOMPLETA') ? 'PRIMARIA_INCOMPLETA' : 'PRIMARIA_COMPLETA';
                    if (u.includes('SECUNDARIA')) return u.includes('INCOMPLETA') ? 'SECUNDARIA_INCOMPLETA' : 'SECUNDARIA_COMPLETA';
                    if (u.includes('SUPERIOR') || u.includes('TECNIC') || u.includes('TÉCNIC') || u.includes('UNIVERSIT')) return u.includes('INCOMPLETA') ? 'SUPERIOR_INCOMPLETA' : 'SUPERIOR_COMPLETA';
                    return u;
                };
                const normTipoDiscapNna = (val: any): string => {
                    if (!val) return '';
                    const s = String(val).trim();
                    // Códigos del F03 → textos CONADIS que usa el combo del F04
                    const mapa: Record<string, string> = {
                        '1': 'Motriz /física', '2': 'Sensorial', '3': 'cognitivo / Intelectual',
                        '4': 'Psicosocial /Psíquica', '5': 'Más de una discapacidad', '6': ''
                    };
                    if (mapa[s] !== undefined) return mapa[s];
                    return s;
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
                    parentesco:        normParentesco(f.vinTutUsu || f.parentesco || ''),
                    edad:              f.edad || '',
                    sexo:              normCode(f.sexoApo || f.sexo || ''),
                    estadoCivil:       normEstadoCivil(f.estadoCivil || ''),
                    gradoInstruccion:  normGradoInstr(f.gradoInstruccion || ''),
                    ocupacion:         f.ocupacion || '',
                    priApeTutApo:      f.priApeTutApo || f.primerApellido || f.nombres?.split(' ')[0] || '',
                    segApeTutApo:      f.segApeTutApo || f.segundoApellido || f.nombres?.split(' ')[1] || '',
                    nomApeTutApo:      f.nomApeTutApo || f.nombres?.split(' ').slice(2).join(' ') || f.nombres || '',
                    sexoApo:           f.sexoApo || f.sexo || '',
                    fechaNacApo:       f.fechaNacApo || '',
                    nacionalidadApo:   f.nacionalidadApo || 'PERUANA',
                    tipDocTutApo:      f.tipDocTutApo || '',
                    nroDocTutApo:      f.nroDocTutApo || f.dni || '',
                    vinTutUsu:         normParentesco(f.vinTutUsu || f.parentesco || ''),
                    lenMatApo:         normCode(f.lenMatApo || '10'),
                    lenMatEspApo:      f.lenMatEspApo || '',
                    autIdeEtApo:       normCode(f.autIdeEtApo || '7'),
                    autIdeEtEspApo:    f.autIdeEtEspApo || '',
                    tipoDiscapApo:     normCode(f.tipoDiscapApo || '6'),
                    certDiscapApo:     normCode(f.certDiscapApo || '99'),
                    viveCon:           normYesNo(f.viveCon || 'SI'),
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

                    // Sexo del NNA (viene de la ficha de inscripción, editable si faltara)
                    sexo: normCode(mergedData.sexo || nna?.sexo || prev.sexo),

                    // Fecha de inicio/fin de aplicación de la ficha (propias del F04, no vienen de la inscripción)
                    fechaInicioAplicacion: normDate(mergedData.fechaInicioAplicacion || prev.fechaInicioAplicacion),
                    fechaFinAplicacion:    normDate(mergedData.fechaFinAplicacion || prev.fechaFinAplicacion),

                    // Merge seguro de situacionCalleDetalle: si el registro guardado es de antes de agregar
                    // "usoDinero" (u otro sub-campo nuevo), evita que quede undefined y rompa el render.
                    situacionCalleDetalle: {
                        ...prev.situacionCalleDetalle,
                        ...(mergedData.situacionCalleDetalle || {}),
                        tiempo: {
                            ...prev.situacionCalleDetalle.tiempo,
                            ...tiempoDiagnostico,
                        },
                        horarios: {
                            ...prev.situacionCalleDetalle.horarios,
                            ...horariosDiagnostico,
                        },
                        frecuencia: {
                            ...prev.situacionCalleDetalle.frecuencia,
                            ...frecuenciaDiagnostico,
                        },
                        actividad: actividadDiagnostico,
                        usoDinero: {
                            ...prev.situacionCalleDetalle.usoDinero,
                            ...(mergedData.situacionCalleDetalle?.usoDinero || {})
                        }
                    },

                    // Mantener compatibilidad con fichas anteriores que solo
                    // guardaban los cuatro indicadores booleanos de servicios.
                    serviciosBasicos: {
                        ...prev.serviciosBasicos,
                        ...(mergedData.serviciosBasicos || {}),
                    },

                    // higieneAdecuada pasó de booleano a SI/NO/A_VECES. Si el registro guardado
                    // es de antes de este cambio, convierte el booleano legado al nuevo formato.
                    higieneAdecuada: (() => {
                        const v = mergedData.higieneAdecuada;
                        if (v === true) return 'SI';
                        if (v === false) return 'NO';
                        return v || prev.higieneAdecuada;
                    })(),

                    // Sexo, Documento, Parentesco y Fecha Nacimiento
                    tutorSexo: normCode(mergedData.tutorSexo || mergedData.sexoApo || prev.tutorSexo),
                    tutorFechaNacimiento: normDate(mergedData.tutorFechaNacimiento || mergedData.fechaNacApo || prev.tutorFechaNacimiento),
                    tutorDNI: mergedData.tutorDNI || mergedData.nroDocTutApo || mergedData.dni || prev.tutorDNI || '',
                    tutorTipoDocumento: normCode(mergedData.tutorTipoDocumento || mergedData.tipDocTutApo || prev.tutorTipoDocumento || '1'),
                    tutorParentesco: normParentesco(mergedData.tutorParentesco || mergedData.vinTutUsu || prev.tutorParentesco),

                    // Combos con formato heredado de F03/NNA: normalizar para que
                    // coincidan con los values de sus opciones (si no, se ven vacíos)
                    tipoDoc: normCode(mergedData.tipoDoc || prev.tipoDoc),
                    tutorEstadoCivil: normEstadoCivil(mergedData.tutorEstadoCivil || prev.tutorEstadoCivil),
                    tipoDiscapacidad: normTipoDiscapNna(mergedData.tipoDiscapacidad || prev.tipoDiscapacidad),
                    
                    // Ocupación y Grado Instrucción
                    tutorOcupacion: mergedData.tutorOcupacion || mergedData.ocupacion || prev.tutorOcupacion || '',
                    tutorGradoInstruccion: normGradoInstr(mergedData.tutorGradoInstruccion || mergedData.gradoInstruccion || prev.tutorGradoInstruccion || ''),

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

                    // Las fichas anteriores guardaban una columna "Descripción".
                    // Si no tenían acción en Fase I, conservar ese texto como acción inicial.
                    necesidades: Array.isArray(mergedData.necesidades)
                        ? mergedData.necesidades.map((need: any, index: number) => ({
                            categoria: need.categoria || '',
                            descripcion: need.descripcion || '',
                            faseI: need.faseI || need.descripcion || '',
                            faseII: need.faseII || '',
                            faseIII: need.faseIII || '',
                            acciones: normalizeNeedActions(need, index),
                        }))
                        : prev.necesidades,

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

    // Debe ejecutarse después de la precarga de initialData para que una ficha
    // antigua no reponga respuestas educativas que ya no aplican por la edad.
    useEffect(() => {
        setFormData(prev => {
            if (esMenorDeTres) {
                return {
                    ...prev,
                    ...EDUCACION_DEPENDIENTE_VACIA,
                    eduEstudia: 'NO_APLICA',
                    eduMotivoNoEstudia: MOTIVO_PRIMERA_INFANCIA,
                };
            }
            if (prev.eduEstudia === 'NO_APLICA' && prev.eduMotivoNoEstudia === MOTIVO_PRIMERA_INFANCIA) {
                return { ...prev, eduEstudia: '', eduMotivoNoEstudia: '' };
            }
            return prev;
        });
    }, [esMenorDeTres, initialData]);

    // --- HANDLERS ---
    const scrollToFormTop = () => {
        requestAnimationFrame(() => {
            document.getElementById('f04-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    const validarGeneralCalle = () => {
        const errores: string[] = [];
        const detalle = formData.situacionCalleDetalle;
        const perfilSeleccionado = Object.values(detalle.perfil).some(Boolean);

        if (!formData.apellidoPaterno.trim()) errores.push('Primer apellido');
        if (!formData.nombres.trim()) errores.push('Nombres');
        if (!formData.sexo) errores.push('Sexo');
        if (!formData.fechaNacimiento && !formData.edad) errores.push('Fecha de nacimiento o edad estimada');
        if (!formData.tipoDoc) errores.push('Tipo de documento');
        if (formData.tipoDoc && formData.tipoDoc !== '7' && !formData.numeroDoc.trim()) errores.push('Número de documento');
        if (formData.tipoDoc === '7' && !formData.detalleSinDoc.trim()) errores.push('Motivo por el que no tiene documento');
        if (!perfilSeleccionado) errores.push('Perfil o situación de calle');
        setGeneralErrors(errores);

        if (errores.length > 0) {
            setActiveTab('GENERAL');
            scrollToFormTop();
            return false;
        }
        return true;
    };

    const handleOpenSaveConfirm = () => {
        if (validarGeneralCalle()) setShowSaveConfirm(true);
    };

    const handlePreviousSection = () => {
        const currentIndex = FORM_TABS.findIndex(tab => tab.id === activeTab);
        if (currentIndex <= 0) return;
        setActiveTab(FORM_TABS[currentIndex - 1].id);
        scrollToFormTop();
    };

    const handleNextSection = () => {
        const currentIndex = FORM_TABS.findIndex(tab => tab.id === activeTab);
        if (activeTab === 'GENERAL' && !validarGeneralCalle()) return;
        if (currentIndex >= FORM_TABS.length - 1) {
            handleOpenSaveConfirm();
            return;
        }
        setActiveTab(FORM_TABS[currentIndex + 1].id);
        scrollToFormTop();
    };

    const prepararFechasAplicacion = (esBorrador: boolean) => {
        const hoy = getTodayLocal();
        const fechaInicioAplicacion = formData.fechaInicioAplicacion || hoy;
        const fechaFinAplicacion = esBorrador
            ? formData.fechaFinAplicacion
            : (formData.fechaFinAplicacion || hoy);

        let error = '';
        if (fechaInicioAplicacion > hoy || fechaFinAplicacion > hoy) {
            error = 'Las fechas de aplicación no pueden ser posteriores a la fecha actual.';
        } else if (fechaFinAplicacion && fechaInicioAplicacion > fechaFinAplicacion) {
            error = 'La fecha de inicio de aplicación no puede ser posterior a la fecha de fin.';
        }

        return { fechaInicioAplicacion, fechaFinAplicacion, error };
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            const fechas = prepararFechasAplicacion(true);
            if (fechas.error) {
                setResultModal({ type: 'error', title: 'Fechas no válidas', message: fechas.error });
                return;
            }
            setFormData(prev => ({
                ...prev,
                fechaInicioAplicacion: fechas.fechaInicioAplicacion,
                fechaFinAplicacion: fechas.fechaFinAplicacion,
            }));

            const token = getToken();
            const isEdit = !!(initialData && initialData.id);
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit
                ? `${INTERVENCION_API_URL}/diagnostico/${initialData.id}`
                : `${INTERVENCION_API_URL}/diagnostico/nna/${nna.id}`;

            const payload = {
                ...formData,
                fechaInicioAplicacion: fechas.fechaInicioAplicacion,
                fechaFinAplicacion: fechas.fechaFinAplicacion,
                actividadesCalle: actividadesCalle,
                nnaId: nna.id,
                casoId: caso?.id,
                es_borrador: true
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
                setResultModal({ type: 'draft', title: 'Borrador guardado', message: 'El avance del Diagnóstico Social (F04) fue guardado como borrador. Podrás retomarlo y completarlo cuando lo necesites.', callSuccess: true });
            } else {
                const err = await response.json();
                setResultModal({ type: 'error', title: 'Error al guardar borrador', message: err.detail || err.message || 'Ocurrió un error al guardar el borrador.' });
            }
        } catch (error) {
            console.error(error);
            setResultModal({ type: 'error', title: 'Error de conexión', message: 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!validarGeneralCalle()) return;
        setLoading(true);
        try {
            const fechas = prepararFechasAplicacion(false);
            if (fechas.error) {
                setResultModal({ type: 'error', title: 'Fechas no válidas', message: fechas.error });
                return;
            }
            setFormData(prev => ({
                ...prev,
                fechaInicioAplicacion: fechas.fechaInicioAplicacion,
                fechaFinAplicacion: fechas.fechaFinAplicacion,
            }));

            const token = getToken();
            const isEdit = !!(initialData && initialData.id);
            const method = isEdit ? 'PUT' : 'POST';
            const url = isEdit
                ? `${INTERVENCION_API_URL}/diagnostico/${initialData.id}`
                : `${INTERVENCION_API_URL}/diagnostico/nna/${nna.id}`;

            const payload = {
                ...formData,
                fechaInicioAplicacion: fechas.fechaInicioAplicacion,
                fechaFinAplicacion: fechas.fechaFinAplicacion,
                actividadesCalle: actividadesCalle,
                nnaId: nna.id,
                casoId: caso?.id,
                // Forzar false: al finalizar un borrador, formData puede traer
                // es_borrador=true heredado del datos_extra guardado.
                es_borrador: false
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
                setResultModal({ type: 'success', title: 'Diagnóstico guardado', message: 'El Diagnóstico Social (F04) fue registrado correctamente en el expediente digital del beneficiario.', callSuccess: true });
            } else {
                const err = await response.json();
                setResultModal({ type: 'error', title: 'Error al guardar', message: err.detail || err.message || 'Ocurrió un error al guardar el diagnóstico.' });
            }
        } catch (error) {
            console.error(error);
            setResultModal({ type: 'error', title: 'Error de conexión', message: 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddFamily = () => {
        setEditingFamilyIndex(null);
        setCurrentFamily({
            primerApellido: '', segundoApellido: '', nombres: '', parentesco: '', edad: '', sexo: '', estadoCivil: '', gradoInstruccion: '', ocupacion: '',
            priApeTutApo: '', segApeTutApo: '', nomApeTutApo: '', sexoApo: '', fechaNacApo: '', nacionalidadApo: 'PERUANA', tipDocTutApo: '1', nroDocTutApo: '',
            vinTutUsu: '1', lenMatApo: '10', lenMatEspApo: '', autIdeEtApo: '7', autIdeEtEspApo: '', tipoDiscapApo: '6', certDiscapApo: '99', viveCon: '', telefono: ''
        });
        setShowFamilyModal(true);
    };

    const handleEditFamily = (index: number) => {
        setEditingFamilyIndex(index);
        setCurrentFamily(formData.familiares[index]);
        setShowFamilyModal(true);
    };

    const handleDeleteFamily = async (index: number) => {
        if (await confirmar('¿Eliminar a este integrante de la familia?', { titulo: 'Eliminar integrante', textoConfirmar: 'Eliminar', peligro: true })) {
            const newFam = [...formData.familiares];
            newFam.splice(index, 1);
            setFormData({ ...formData, familiares: newFam });
        }
    };

    /**
     * Pregunta al backend si el familiar recién registrado permite deducir un
     * hermano: por parentesco "Hermano/a" o por el DNI del padre o madre.
     * Si el hermano no está registrado, el aviso lo indica — sin ficha propia
     * no tiene caso que mencionar en el informe situacional.
     */
    const verificarHermanos = async (familiar: any) => {
        if (!nna?.id) return;
        try {
            const res = await detectarHermanos(nna.id, {
                parentesco: familiar.vinTutUsu || familiar.parentesco,
                nombres: [familiar.nomApeTutApo || familiar.nombres,
                          familiar.priApeTutApo || familiar.primerApellido,
                          familiar.segApeTutApo || familiar.segundoApellido]
                         .filter(Boolean).join(' ').trim(),
                dni: familiar.nroDocTutApo || familiar.dni,
            });
            if (res.candidatos.length > 0 || res.requiereRegistro) {
                setDeteccionHermanos(res);
            }
        } catch (err) {
            // La detección es una ayuda: si falla, no debe frenar el registro.
            console.error('No se pudo verificar hermanos', err);
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

        // Si el integrante recién guardado permite deducir un hermano, se
        // consulta y se le pregunta al educador. Nunca se vincula solo.
        verificarHermanos(finalFamiliar);
    };

    const handleAddNeed = (categoria?: string) => {
        const categoriasRegistradas = new Set(formData.necesidades.map(need => need.categoria));
        const categoriaInicial = categoria && !categoriasRegistradas.has(categoria)
            ? categoria
            : NEED_CATEGORIES.find(item => !categoriasRegistradas.has(item.value))?.value || '';
        setEditingNeedIndex(null);
        setCurrentNeed({ categoria: categoriaInicial, faseI: '', faseII: '', faseIII: '', acciones: [] });
        setActiveNeedPhase('faseI');
        setShowNeedModal(true);
    };

    const handleEditNeed = (index: number) => {
        setEditingNeedIndex(index);
        const need = formData.necesidades[index];
        const acciones = normalizeNeedActions(need, index);
        setCurrentNeed({
            ...need,
            faseI: need.faseI || need.descripcion || '',
            faseII: need.faseII || '',
            faseIII: need.faseIII || '',
            acciones,
        });
        const tieneFaseI = acciones.some(action => action.fasesActivas.includes('faseI'));
        const tieneFaseII = acciones.some(action => action.fasesActivas.includes('faseII'));
        setActiveNeedPhase(!tieneFaseI ? 'faseI' : !tieneFaseII ? 'faseII' : 'faseIII');
        setShowNeedModal(true);
    };

    const handleDeleteNeed = async (index: number) => {
        if (await confirmar('¿Eliminar esta necesidad?', { titulo: 'Eliminar necesidad', textoConfirmar: 'Eliminar', peligro: true })) {
            const newNeeds = [...formData.necesidades];
            newNeeds.splice(index, 1);
            setFormData({ ...formData, necesidades: newNeeds });
        }
    };

    const handleSaveNeed = () => {
        const categoriaDuplicada = formData.necesidades.some((need, index) =>
            need.categoria === currentNeed.categoria && index !== editingNeedIndex
        );
        if (!currentNeed.categoria || categoriaDuplicada) return;

        const acciones = (currentNeed.acciones || []).filter(action => action.fasesActivas.length > 0);
        const summarizePhase = (phase: NeedPhase) => acciones
            .filter(action => action.fasesActivas.includes(phase) && action[phase].trim())
            .map(action => action[phase].trim() === action.titulo.trim()
                ? action[phase].trim()
                : `${action.titulo}: ${action[phase].trim()}`)
            .join('\n');
        const newNeeds = [...formData.necesidades];
        const normalizedNeed: Need = {
            categoria: currentNeed.categoria,
            faseI: summarizePhase('faseI'),
            faseII: summarizePhase('faseII'),
            faseIII: summarizePhase('faseIII'),
            acciones,
        };
        if (editingNeedIndex !== null) {
            newNeeds[editingNeedIndex] = normalizedNeed;
        } else {
            newNeeds.push(normalizedNeed);
        }
        setFormData({ ...formData, necesidades: newNeeds });
        setShowNeedModal(false);
    };

    const addInitialNeedFlow = (flow: NeedActionFlow) => {
        setCurrentNeed(prev => {
            const acciones = [...(prev.acciones || [])];
            const existingIndex = acciones.findIndex(action => action.flowId === flow.id);
            if (existingIndex >= 0) {
                const existing = acciones[existingIndex];
                if (existing.faseI.includes(flow.faseI)) return prev;
                acciones[existingIndex] = {
                    ...existing,
                    faseI: existing.faseI.trim() ? `${existing.faseI.trim()}\n${flow.faseI}` : flow.faseI,
                    fasesActivas: existing.fasesActivas.includes('faseI') ? existing.fasesActivas : [...existing.fasesActivas, 'faseI'],
                };
            } else {
                acciones.push({
                    id: createNeedActionId(),
                    flowId: flow.id,
                    titulo: flow.titulo,
                    faseI: flow.faseI,
                    faseII: '',
                    faseIII: '',
                    fasesActivas: ['faseI'],
                });
            }
            return { ...prev, acciones };
        });
        setActiveNeedPhase('faseI');
    };

    const applyNeedFlowSuggestion = (actionId: string, targetPhase: NeedPhase, suggestion: string) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: (prev.acciones || []).map(action => {
                if (action.id !== actionId || action[targetPhase].includes(suggestion)) return action;
                const currentText = action[targetPhase].trim();
                return {
                    ...action,
                    [targetPhase]: currentText ? `${currentText}\n${suggestion}` : suggestion,
                    fasesActivas: action.fasesActivas.includes(targetPhase)
                        ? action.fasesActivas
                        : [...action.fasesActivas, targetPhase],
                };
            }),
        }));
        setActiveNeedPhase(targetPhase);
    };

    const continueCustomNeedAction = (actionId: string, targetPhase: NeedPhase) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: (prev.acciones || []).map(action => {
                if (action.id !== actionId) return action;
                const continuation = `Continuar con la gestión: ${action.titulo}.`;
                return {
                    ...action,
                    [targetPhase]: action[targetPhase].trim() || continuation,
                    fasesActivas: action.fasesActivas.includes(targetPhase)
                        ? action.fasesActivas
                        : [...action.fasesActivas, targetPhase],
                };
            }),
        }));
        setActiveNeedPhase(targetPhase);
    };

    const addCustomNeedAction = (targetPhase: NeedPhase = activeNeedPhase) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: [
                ...(prev.acciones || []),
                {
                    id: createNeedActionId(),
                    titulo: 'Acción personalizada',
                    faseI: '', faseII: '', faseIII: '',
                    fasesActivas: [targetPhase],
                },
            ],
        }));
    };

    const updateNeedActionText = (actionId: string, phase: NeedPhase, value: string) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: (prev.acciones || []).map(action => action.id === actionId
                ? {
                    ...action,
                    [phase]: value,
                    fasesActivas: value.trim()
                        ? action.fasesActivas.includes(phase) ? action.fasesActivas : [...action.fasesActivas, phase]
                        : action.fasesActivas.filter(item => item !== phase),
                }
                : action),
        }));
    };

    const updateNeedActionTitle = (actionId: string, titulo: string) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: (prev.acciones || []).map(action => action.id === actionId
                ? { ...action, titulo }
                : action),
        }));
    };

    const removeNeedAction = (actionId: string) => {
        setCurrentNeed(prev => ({
            ...prev,
            acciones: (prev.acciones || []).filter(action => action.id !== actionId),
        }));
    };

    const toggleVoiceDictation = (actionId: string, phase: NeedPhase) => {
        const actionKey = `${actionId}:${phase}`;
        if (listeningActionKey === actionKey) {
            speechRecognitionRef.current?.stop?.();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        speechRecognitionRef.current?.stop?.();
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-PE';
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onresult = (event: any) => {
            const transcript = String(event.results?.[0]?.[0]?.transcript || '').trim();
            if (!transcript) return;
            setCurrentNeed(prev => ({ ...prev, acciones: (prev.acciones || []).map(action => {
                if (action.id !== actionId) return action;
                const currentText = action[phase].trim();
                return { ...action, [phase]: currentText ? `${currentText} ${transcript}` : transcript };
            }) }));
        };
        recognition.onend = () => setListeningActionKey(null);
        recognition.onerror = () => setListeningActionKey(null);
        speechRecognitionRef.current = recognition;
        setListeningActionKey(actionKey);
        recognition.start();
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
            <div id="f04-form-top" className="max-w-7xl mx-auto print:hidden">

                {/* Header con acciones */}
                <div className="bg-surface border-b border-border px-4 md:px-6 py-4 rounded-t-[8px] shadow-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-[15px] md:text-[16px] font-bold text-fg uppercase">FICHA DE DIAGNÓSTICO SOCIAL</h1>
                            <p className="text-[12px] text-fg-muted mt-0.5 font-medium">Completa la evaluación social del NNA</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setShowDraftConfirm(true)}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-warning-soft text-warning border border-warning/30 px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-warning/10 transition-colors disabled:opacity-60"
                            >
                                <Clock size={16} /> Borrador
                            </button>
                            <button
                                onClick={handleOpenSaveConfirm}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary text-primary-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                <Save size={16} /> Guardar
                            </button>
                            <button
                                onClick={() => onClose?.()}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface border border-border-strong text-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-surface-muted transition-colors"
                            >
                                <X size={16} /> Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABS DE NAVEGACIÓN */}
                <div className="bg-surface px-4 pt-0 border-x border-border overflow-hidden">
                    <div className="flex overflow-x-auto whitespace-nowrap gap-1 py-1 scrollbar-none">
                        {FORM_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    scrollToFormTop();
                                }}
                                className={`
                                    flex items-center gap-1.5 px-4 py-3 border-b-2 text-[12px] font-bold uppercase tracking-wide transition-all
                                    ${activeTab === tab.id
                                        ? 'border-primary text-primary bg-primary-soft/20 rounded-t-lg'
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

                    {activeTab === 'GENERAL' && generalErrors.length > 0 && (
                        <div className="rounded-[8px] border border-danger/30 bg-danger-soft px-4 py-3" role="alert">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[12px] font-bold text-danger">Complete los campos obligatorios para continuar:</p>
                                    <ul className="mt-1 list-disc pl-4 text-[11px] text-fg-2 columns-1 md:columns-2">
                                        {generalErrors.map(error => <li key={error}>{error}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* I. DATOS GENERALES */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden ${activeTab === 'GENERAL' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                I. DATOS GENERALES
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4">
                            {/* Fila 1: Nombres y Apellidos separados */}
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Primer Apellido <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                    value={formData.apellidoPaterno}
                                    onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Segundo Apellido</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                    value={formData.apellidoMaterno}
                                    onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nombres <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                    value={formData.nombres}
                                    onChange={(e) => setFormData({ ...formData, nombres: e.target.value.toUpperCase() })}
                                />
                            </div>

                            {/* Fila 1b: Documento de Identidad (igual que la ficha de inscripción) */}
                            <div className="col-span-12 border-t border-border pt-4 mt-1">
                                <p className="text-[10px] font-bold text-fg-muted uppercase mb-3">Documento de Identidad</p>
                                <div className="grid grid-cols-12 gap-x-6 gap-y-4">
                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tipo Documento <span className="text-danger">*</span></label>
                                        <select
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                            value={formData.tipoDoc}
                                            onChange={(e) => setFormData({ ...formData, tipoDoc: e.target.value })}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {(parametros?.OPCIONES_TIP_DOC_APO_2026 || [
                                                { value: '1', label: '1: DNI' },
                                                { value: '2', label: '2: Carné de extranjería' },
                                                { value: '3', label: '3: Pasaporte' },
                                                { value: '4', label: '4: Documento de Identidad Extranjero' },
                                                { value: '5', label: '5: CUI o Acta de Nacimiento' },
                                                { value: '6', label: '6: Certificado de Nacido Vivo - CNV' },
                                                { value: '7', label: '7: No tiene' },
                                            ]).map((opt: { value: string; label: string }) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Nº de Documento / DNI {formData.tipoDoc !== '7' && <span className="text-danger">*</span>}</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                            placeholder="Ingrese número"
                                            value={formData.numeroDoc}
                                            onChange={(e) => setFormData({ ...formData, numeroDoc: e.target.value })}
                                        />
                                    </div>

                                    <div className="col-span-12 md:col-span-4">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Tiene Partida Nac.?</label>
                                        <div className="flex gap-2">
                                            {[{ value: true, label: 'Sí' }, { value: false, label: 'No' }].map(opt => (
                                                <button
                                                    type="button"
                                                    key={String(opt.value)}
                                                    onClick={() => setFormData({ ...formData, tienePartidaNacimiento: opt.value })}
                                                    className={`flex-1 px-3 py-2 rounded-[6px] border text-xs font-bold uppercase transition-colors ${formData.tienePartidaNacimiento === opt.value ? 'bg-primary text-white border-primary' : 'border-border text-fg-muted hover:bg-surface-muted'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-12">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Por qué? (En caso no tenga documento de identidad) {formData.tipoDoc === '7' && <span className="text-danger">*</span>}</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                            placeholder="Especifique motivo..."
                                            value={formData.detalleSinDoc}
                                            onChange={(e) => setFormData({ ...formData, detalleSinDoc: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fila 2: Sexo, Fecha de Nacimiento, Edad / Tiempo y Teléfono (25% | col-span-3 c/u) */}
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Sexo <span className="text-danger">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                    value={formData.sexo}
                                    onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {opcionesSexo.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha Nacimiento {!formData.edad && <span className="text-danger">*</span>}</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                    value={formData.fechaNacimiento}
                                    onChange={(e) => {
                                        const fecha = e.target.value;
                                        // Calcular edad automáticamente desde la fecha de nacimiento
                                        let edad = formData.edad;
                                        let unidadEdad = formData.unidadEdad;
                                        if (fecha) {
                                            const nac = new Date(fecha + 'T00:00:00');
                                            const hoy = new Date();
                                            if (!isNaN(nac.getTime()) && nac <= hoy) {
                                                let anios = hoy.getFullYear() - nac.getFullYear();
                                                let meses = hoy.getMonth() - nac.getMonth();
                                                if (hoy.getDate() < nac.getDate()) meses--;
                                                if (meses < 0) { anios--; meses += 12; }
                                                if (anios >= 1) {
                                                    edad = String(anios); unidadEdad = 'ANIOS';
                                                } else if (meses >= 1) {
                                                    edad = String(meses); unidadEdad = 'MESES';
                                                } else {
                                                    const dias = Math.max(0, Math.floor((hoy.getTime() - nac.getTime()) / 86400000));
                                                    edad = String(dias); unidadEdad = 'DIAS';
                                                }
                                            }
                                        }
                                        setFormData({ ...formData, fechaNacimiento: fecha, edad, unidadEdad });
                                    }}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Edad / Tiempo {!formData.fechaNacimiento && <span className="text-danger">*</span>}</label>
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

                            <div className="col-span-12 md:col-span-3">
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

                            {/* Fila 5: Aseguramiento de Salud (100% | col-span-12) */}
                            <div className="col-span-12 border-t border-border pt-4 mt-1">
                                <p className="text-[10px] font-bold text-fg-muted uppercase mb-3">Aseguramiento de Salud</p>
                                <div className="grid grid-cols-12 gap-x-6 gap-y-4">
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Afiliado al Seguro Universal de Salud (SIS)?</label>
                                        <div className="flex gap-2">
                                            {['SI', 'NO', 'NO_SABE'].map(opt => (
                                                <button
                                                    type="button"
                                                    key={opt}
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        afiliadoSIS: opt,
                                                        ...(opt === 'SI' ? { afiliadoOtroSeguro: 'NO', detalleOtroSeguro: '' } : {})
                                                    }))}
                                                    className={`flex-1 px-3 py-2 rounded-[6px] border text-xs font-bold uppercase transition-colors ${formData.afiliadoSIS === opt ? 'bg-primary text-white border-primary' : 'border-border text-fg-muted hover:bg-surface-muted'}`}
                                                >
                                                    {opt.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">¿Afiliado a algún otro tipo de seguro de salud?</label>
                                        <div className="flex gap-2">
                                            {['SI', 'NO', 'NO_SABE'].map(opt => (
                                                <button
                                                    type="button"
                                                    key={opt}
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        afiliadoOtroSeguro: opt,
                                                        ...(opt === 'SI' ? { afiliadoSIS: 'NO' } : { detalleOtroSeguro: '' })
                                                    }))}
                                                    className={`flex-1 px-3 py-2 rounded-[6px] border text-xs font-bold uppercase transition-colors ${formData.afiliadoOtroSeguro === opt ? 'bg-primary text-white border-primary' : 'border-border text-fg-muted hover:bg-surface-muted'}`}
                                                >
                                                    {opt.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.afiliadoOtroSeguro === 'SI' && (
                                        <>
                                            <div className="col-span-12 md:col-span-6">
                                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Seleccione el seguro de salud</label>
                                                <select
                                                    className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                                    value={SEGUROS_PREDEFINIDOS.includes(formData.detalleOtroSeguro) ? formData.detalleOtroSeguro : (formData.detalleOtroSeguro ? 'OTRO' : '')}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setFormData({ ...formData, detalleOtroSeguro: val === 'OTRO' ? '' : val });
                                                    }}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {SEGUROS_PREDEFINIDOS.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                    <option value="OTRO">Otro (Especificar)</option>
                                                </select>
                                            </div>
                                            {!SEGUROS_PREDEFINIDOS.includes(formData.detalleOtroSeguro) && (
                                                <div className="col-span-12 md:col-span-6">
                                                    <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Especifique el seguro de salud alternativo</label>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface text-fg font-medium focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
                                                        placeholder="Ej: Mapfre, Seguro universitario particular..."
                                                        value={formData.detalleOtroSeguro}
                                                        onChange={(e) => setFormData({ ...formData, detalleOtroSeguro: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Fila 6: Fecha de Aplicación de la Ficha (100% | col-span-12) */}
                            <div className="col-span-12 border-t border-border pt-4 mt-1">
                                <p className="text-[10px] font-bold text-fg-muted uppercase mb-3">Fecha de Aplicación de la Ficha</p>
                                <div className="grid grid-cols-12 gap-x-6 gap-y-4">
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha de Inicio de Aplicación</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted text-fg font-medium outline-none cursor-default"
                                            value={formData.fechaInicioAplicacion}
                                            readOnly
                                            disabled
                                        />
                                        <p className="text-[10px] text-fg-muted mt-1 flex items-center gap-1">
                                            <Lock size={9} /> La registra el sistema: día en que se empieza a aplicar la ficha.
                                        </p>
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Fecha de Fin de Aplicación</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-border rounded-[6px] text-xs bg-surface-muted text-fg font-medium outline-none cursor-default"
                                            value={formData.fechaFinAplicacion}
                                            readOnly
                                            disabled
                                        />
                                        <p className="text-[10px] text-fg-muted mt-1 flex items-center gap-1">
                                            <Lock size={9} />
                                            {formData.fechaFinAplicacion
                                                ? 'La registró el sistema al finalizar la ficha.'
                                                : 'Se sella sola cuando finalices la ficha. Mientras sea borrador queda en blanco.'}
                                        </p>
                                    </div>
                                </div>
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
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Perfil del Usuario/a <span className="text-danger">*</span></label>
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
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Tiempo en Situación de Calle</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Cant."
                                        className="w-20 px-3 py-2 border border-border rounded-[6px] text-xs focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.cantidad}
                                        onChange={e => {
                                            tiempoEditadoManualmenteRef.current = true;
                                            setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, cantidad: e.target.value } } });
                                        }}
                                    />
                                    <select
                                        className="flex-1 px-3 py-2 border border-border rounded-[6px] text-xs bg-surface focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={formData.situacionCalleDetalle.tiempo.unidad}
                                        onChange={e => {
                                            tiempoEditadoManualmenteRef.current = true;
                                            setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, tiempo: { ...formData.situacionCalleDetalle.tiempo, unidad: e.target.value as TiempoSituacionCalle['unidad'] } } });
                                        }}
                                    >
                                        <option value="SEMANAS">SEMANAS</option>
                                        <option value="MESES">MESES</option>
                                        <option value="AÑOS">AÑOS</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-fg-muted mt-1">
                                    Calculado con la actividad de mayor antigüedad trasladada desde la ficha de inscripción. Puedes modificarlo; el valor guardado aquí tendrá prioridad.
                                </p>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Horarios en Situación de Calle</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        ['manana', 'Mañana'],
                                        ['tarde', 'Tarde'],
                                        ['noche', 'Noche'],
                                        ['madrugada', 'Madrugada'],
                                    ] as Array<[keyof HorariosSituacionCalle, string]>).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.situacionCalleDetalle.horarios[key]}
                                                onChange={(e) => {
                                                    horariosEditadosManualmenteRef.current = true;
                                                    setFormData({
                                                        ...formData,
                                                        situacionCalleDetalle: {
                                                            ...formData.situacionCalleDetalle,
                                                            horarios: {
                                                                ...formData.situacionCalleDetalle.horarios,
                                                                [key]: e.target.checked,
                                                            },
                                                        },
                                                    });
                                                }}
                                                className="rounded text-primary"
                                            />
                                            <span className="text-xs text-fg-2">{label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-fg-muted mt-1">
                                    Calculado según los rangos horarios de las actividades. Puedes modificar las marcas.
                                </p>
                            </div>

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Frecuencia en Calle</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        ['diario', 'Diario'],
                                        ['interdiario', 'Interdiario'],
                                        ['finesSemana', 'Fines de semana'],
                                        ['temporadas', 'Temporadas'],
                                    ] as Array<[keyof FrecuenciaSituacionCalle, string]>).map(([key, label]) => (
                                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="frecuenciaSituacionCalle"
                                                checked={formData.situacionCalleDetalle.frecuencia[key]}
                                                onChange={() => {
                                                    frecuenciaEditadaManualmenteRef.current = true;
                                                    setFormData({
                                                        ...formData,
                                                        situacionCalleDetalle: {
                                                            ...formData.situacionCalleDetalle,
                                                            frecuencia: {
                                                                ...FRECUENCIA_VACIA,
                                                                [key]: true,
                                                            },
                                                        },
                                                    });
                                                }}
                                                className="text-primary"
                                            />
                                            <span className="text-xs text-fg-2">{label}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-[10px] text-fg-muted mt-1">
                                    Diario, interdiario y fines de semana se calculan desde las agendas. Temporadas se selecciona manualmente.
                                </p>
                            </div>

                            <div className="col-span-12">
                                <CampoDictado
                                    label="Actividad que realiza en calle"
                                    placeholder="Se completará con las actividades desglosadas..."
                                    value={formData.situacionCalleDetalle.actividad || ''}
                                    rows={2}
                                    onChange={(v) => {
                                        actividadEditadaManualmenteRef.current = true;
                                        setFormData({
                                            ...formData,
                                            situacionCalleDetalle: {
                                                ...formData.situacionCalleDetalle,
                                                actividad: v,
                                            },
                                        });
                                    }}
                                />
                                <p className="text-[10px] text-fg-muted mt-1">
                                    Se consolida automáticamente desde las actividades desglosadas, sin repetir nombres. Puedes modificar el resultado.
                                </p>
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

                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">¿En qué utiliza el dinero producto de la actividad de calle?</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.usoDinero.gastosFamiliares} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, usoDinero: { ...formData.situacionCalleDetalle.usoDinero, gastosFamiliares: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Gastos familiares</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.usoDinero.gastosPropios} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, usoDinero: { ...formData.situacionCalleDetalle.usoDinero, gastosPropios: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Gastos propios</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.situacionCalleDetalle.usoDinero.entregaOtraPersona} onChange={e => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, usoDinero: { ...formData.situacionCalleDetalle.usoDinero, entregaOtraPersona: e.target.checked } } })} className="rounded text-success" />
                                        <span className="text-xs text-fg-2">Entrega a otra persona (padres o tutor, otro)</span>
                                    </label>
                                </div>
                            </div>

                            <hr className="col-span-12 border-border" />

                            {/* Motivo, Modalidad y Lugar */}
                            <div className="col-span-12 md:col-span-4">
                                <CampoDictado
                                    label="Motivo de su Situación de Calle"
                                    placeholder="Describa el motivo..."
                                    value={formData.situacionCalleDetalle.motivo || ''}
                                    rows={3}
                                    onChange={v => setFormData({ ...formData, situacionCalleDetalle: { ...formData.situacionCalleDetalle, motivo: v } })}
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
                                    <label className="text-[10px] font-bold text-danger uppercase">¿Es obligado a realizar la actividad de calle?</label>
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
                                    <label className="text-[10px] font-bold text-warning uppercase">¿Alguna vez te escapaste de casa más de 1 día?</label>
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
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Parentesco con el Usuario</label>
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

                            {/* Fila 5: Lengua, Estado Civil */}
                            <div className="col-span-12 md:col-span-6">
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
                            <div className="col-span-12 md:col-span-6">
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
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-1">Presenta Alguna Discapacidad</label>
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
                        <div className="bg-surface rounded-[8px] border border-border overflow-hidden">
                            <div className="bg-surface-muted border-b border-border px-4 py-2">
                                <h2 className="text-sm font-black text-fg uppercase">
                                    IV. DATOS DE LA FAMILIA
                                </h2>
                            </div>
                        </div>
                        <div className="border border-purple-100 rounded-xl bg-purple-50/30 p-5 mt-2 group hover:border-purple-200 transition-all">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100/50">
                                <h4 className="text-sm font-black text-purple-900 uppercase flex items-center gap-2">
                                    <Users size={16} className="text-purple-700" /> Datos de la Familia
                                </h4>
                                <button
                                    type="button"
                                    onClick={handleAddFamily}
                                    className="px-3.5 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-all flex items-center gap-1 shadow-md shadow-purple-200"
                                >
                                    <Plus size={13} /> Agregar Familiar
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
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Edad</span>
                                                            <span className="font-bold text-gray-700">{familiar.edad || 'No registra'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Sexo</span>
                                                            <span className="font-bold text-gray-700">
                                                                {['1', 'MASCULINO', 'M'].includes(String(familiar.sexo || familiar.sexoApo || '').toUpperCase())
                                                                    ? 'Masculino'
                                                                    : ['2', 'FEMENINO', 'F'].includes(String(familiar.sexo || familiar.sexoApo || '').toUpperCase())
                                                                        ? 'Femenino'
                                                                        : 'No registra'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Estado Civil</span>
                                                            <span className="font-bold text-gray-700">{familiar.estadoCivil || 'No registra'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400 font-bold text-[9px] uppercase block">Grado de Instrucción</span>
                                                            <span className="font-bold text-gray-700">{(familiar.gradoInstruccion || 'No registra').replace(/_/g, ' ')}</span>
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
                                            <input type="radio" name="ambientes" value={opt} checked={formData.numeroAmbientes === opt} onChange={(e) => setFormData({ ...formData, numeroAmbientes: e.target.value })} className="hidden peer" />
                                            <span className="block font-bold text-fg-muted rounded peer-checked:text-primary peer-checked:bg-primary-soft transition-colors">{opt}</span>
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
                                            <span className="text-[10px] font-semibold text-fg-2 truncate" title={opt}>{opt === 'ALOJADO' ? 'ALOJADO/INVASIÓN' : opt}</span>
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
                                <div className="space-y-3 bg-primary-soft/20 p-3 rounded-[6px] border border-primary/20">
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.serviciosBasicos.agua}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        serviciosBasicos: {
                                                            ...prev.serviciosBasicos,
                                                            agua: checked,
                                                            detalleAgua: checked ? prev.serviciosBasicos.detalleAgua : '',
                                                        },
                                                    }));
                                                }}
                                                className="rounded text-primary focus:ring-primary/40"
                                            />
                                            <span className="font-medium text-fg-2">Agua</span>
                                        </label>
                                        {formData.serviciosBasicos.agua && (
                                            <div className="ml-7 mt-1 flex flex-col gap-1.5 text-[11px] text-fg-2" role="radiogroup" aria-label="Tipo de servicio de agua">
                                                {[
                                                    { value: 'PROPIO_CASA', label: 'Propio de la casa' },
                                                    { value: 'COMPRA_CISTERNA', label: 'Se compra (cisterna)' },
                                                ].map(option => (
                                                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="detalle-servicio-agua"
                                                            value={option.value}
                                                            checked={formData.serviciosBasicos.detalleAgua === option.value}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                serviciosBasicos: { ...prev.serviciosBasicos, detalleAgua: e.target.value },
                                                            }))}
                                                            className="text-primary focus:ring-primary/40"
                                                        />
                                                        {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.serviciosBasicos.luz}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        serviciosBasicos: {
                                                            ...prev.serviciosBasicos,
                                                            luz: checked,
                                                            detalleLuz: checked ? prev.serviciosBasicos.detalleLuz : '',
                                                        },
                                                    }));
                                                }}
                                                className="rounded text-primary focus:ring-primary/40"
                                            />
                                            <span className="font-medium text-fg-2">Luz</span>
                                        </label>
                                        {formData.serviciosBasicos.luz && (
                                            <div className="ml-7 mt-1 flex flex-col gap-1.5 text-[11px] text-fg-2" role="radiogroup" aria-label="Tipo de servicio de luz">
                                                {[
                                                    { value: 'PROPIO_CASA', label: 'Propio de la casa' },
                                                    { value: 'ALQUILADA', label: 'Se alquila' },
                                                ].map(option => (
                                                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="detalle-servicio-luz"
                                                            value={option.value}
                                                            checked={formData.serviciosBasicos.detalleLuz === option.value}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                serviciosBasicos: { ...prev.serviciosBasicos, detalleLuz: e.target.value },
                                                            }))}
                                                            className="text-primary focus:ring-primary/40"
                                                        />
                                                        {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.serviciosBasicos.desague}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        serviciosBasicos: {
                                                            ...prev.serviciosBasicos,
                                                            desague: checked,
                                                            detalleDesague: checked ? prev.serviciosBasicos.detalleDesague : '',
                                                        },
                                                    }));
                                                }}
                                                className="rounded text-primary focus:ring-primary/40"
                                            />
                                            <span className="font-medium text-fg-2">Desagüe</span>
                                        </label>
                                        {formData.serviciosBasicos.desague && (
                                            <div className="ml-7 mt-1 flex flex-col gap-1.5 text-[11px] text-fg-2" role="radiogroup" aria-label="Tipo de servicio de desagüe">
                                                {[
                                                    { value: 'RED_PUBLICA', label: 'Red pública' },
                                                    { value: 'SILO', label: 'Silo' },
                                                ].map(option => (
                                                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="detalle-servicio-desague"
                                                            value={option.value}
                                                            checked={formData.serviciosBasicos.detalleDesague === option.value}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                serviciosBasicos: { ...prev.serviciosBasicos, detalleDesague: e.target.value },
                                                            }))}
                                                            className="text-primary focus:ring-primary/40"
                                                        />
                                                        {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-primary-soft/40 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={formData.serviciosBasicos.otros}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        serviciosBasicos: {
                                                            ...prev.serviciosBasicos,
                                                            otros: checked,
                                                            detalleOtros: checked ? prev.serviciosBasicos.detalleOtros : '',
                                                        },
                                                    }));
                                                }}
                                                className="rounded text-primary focus:ring-primary/40"
                                            />
                                            <span className="font-medium text-fg-2">Otros</span>
                                        </label>
                                        {formData.serviciosBasicos.otros && (
                                            <input
                                                type="text"
                                                value={formData.serviciosBasicos.detalleOtros}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    serviciosBasicos: { ...prev.serviciosBasicos, detalleOtros: e.target.value },
                                                }))}
                                                placeholder="Especifique el servicio"
                                                className="ml-7 mt-1 w-[calc(100%-1.75rem)] rounded-[6px] border border-border bg-surface px-2.5 py-1.5 text-[11px] text-fg focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
                                            />
                                        )}
                                    </div>
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
                                    onChange={(e) => actualizarSituacionEducativa(e.target.value)}
                                    disabled={esMenorDeTres}
                                    options={parametros?.OPCIONES_MATRICULA_2026 || [
                                        { value: 'SI', label: '1. Sí (cuenta con ficha de matrícula)' },
                                        { value: 'NO', label: '2. No (no se encuentra matriculado)' },
                                        { value: 'PROCESO', label: '3. En proceso de matrícula (trámite en gestión)' },
                                        { value: 'NO_APLICA', label: '99. No aplica (menores de 3 años o egresados de secundaria)' }
                                    ]}
                                />
                            </div>

                            {esMenorDeTres && (
                                <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-soft/60 px-4 py-3">
                                    <AlertCircle size={15} className="text-info shrink-0 mt-0.5" />
                                    <p className="text-[11px] font-medium leading-relaxed text-fg-2">
                                        No aplica: menor de 3 años. La situación educativa y el motivo fueron determinados automáticamente según la edad del NNA.
                                    </p>
                                </div>
                            )}

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
                            ) : ['NO', 'NO_APLICA'].includes(formData.eduEstudia) ? (
                                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 animate-scaleUp">
                                    <InputField
                                        label="¿Por qué no estudia?"
                                        value={formData.eduMotivoNoEstudia}
                                        onChange={(e) => setFormData({ ...formData, eduMotivoNoEstudia: e.target.value })}
                                        placeholder="Motivo de deserción..."
                                        disabled={esMenorDeTres}
                                    />
                                </div>
                            ) : null}

                            {/* Atraso y Problemas — cada campo con su propia variable y su propio componente */}
                            {['SI', 'PROCESO'].includes(formData.eduEstudia) && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4 items-start">
                                <ToggleSiNo
                                    label="Atraso Escolar"
                                    value={formData.presentaAtraso}
                                    onChange={(v) => setFormData({ ...formData, presentaAtraso: v })}
                                >
                                    <InputField
                                        label="¿Cuánto? (años)"
                                        value={formData.tiempoAtraso}
                                        onChange={(e) => setFormData({ ...formData, tiempoAtraso: e.target.value })}
                                        placeholder="Ej: 1"
                                    />
                                    <SelectField
                                        label="Motivo del Atraso"
                                        value={formData.motivoAtraso}
                                        onChange={(e) => setFormData({ ...formData, motivoAtraso: e.target.value })}
                                        options={[
                                            { value: 'REPITIO', label: 'Repitió' },
                                            { value: 'DESERTO', label: 'Deserto' },
                                            { value: 'NO_ESTUDIO', label: 'No Estudió' }
                                        ]}
                                    />
                                </ToggleSiNo>
                                <ToggleSiNo
                                    label="Prob. Aprendizaje"
                                    value={formData.problemasAprendizaje}
                                    onChange={(v) => setFormData({ ...formData, problemasAprendizaje: v })}
                                />
                                <ToggleSiNo
                                    label="Prob. Conducta"
                                    value={formData.problemasConducta}
                                    onChange={(v) => setFormData({ ...formData, problemasConducta: v })}
                                >
                                    <SelectField
                                        label="Intensidad del Problema Conductual"
                                        value={formData.intensidadConducta}
                                        onChange={(e) => setFormData({ ...formData, intensidadConducta: e.target.value })}
                                        options={[
                                            { value: 'LEVE', label: 'Leve' },
                                            { value: 'MODERADO', label: 'Moderado' },
                                            { value: 'SEVERO', label: 'Severo' }
                                        ]}
                                    />
                                </ToggleSiNo>
                                <ToggleSiNo
                                    label="Ha sido Expulsado"
                                    value={formData.expulsado}
                                    onChange={(v) => setFormData({ ...formData, expulsado: v })}
                                >
                                    <InputField
                                        label="N° de Veces"
                                        value={formData.vecesExpulsado}
                                        onChange={(e) => setFormData({ ...formData, vecesExpulsado: e.target.value })}
                                        placeholder="Ej: 1"
                                    />
                                </ToggleSiNo>
                                <ToggleSiNo
                                    label="Faltas/Tardanzas en el Mes"
                                    value={formData.faltasTardanzas}
                                    onChange={(v) => setFormData({ ...formData, faltasTardanzas: v })}
                                />
                                <ToggleSiNo
                                    label="Se Duerme en Clase"
                                    value={formData.seDuermeClase}
                                    onChange={(v) => setFormData({ ...formData, seDuermeClase: v })}
                                />
                                <ToggleSiNo
                                    label="Sufre Bullying/Discriminación"
                                    value={formData.sufreBullying}
                                    onChange={(v) => setFormData({ ...formData, sufreBullying: v })}
                                />
                                <ToggleSiNo
                                    label="Tutor/Padre Conversa con Docente"
                                    value={formData.tutorConversaDocente}
                                    onChange={(v) => setFormData({ ...formData, tutorConversaDocente: v })}
                                />
                            </div>
                            )}
                        </div>
                    </div>

                    {/* VII. SALUD */}
                    <div className={`bg-surface rounded-[8px] border border-border overflow-hidden mt-6 ${activeTab === 'SALUD' ? '' : 'hidden'}`}>
                        <div className="bg-surface-muted border-b border-border px-4 py-2">
                            <h2 className="text-sm font-black text-fg uppercase">
                                VII. SALUD – ALIMENTACIÓN – HIGIENE
                            </h2>
                        </div>
                        <div className="p-6 space-y-6 text-xs">

                            {/* Presenta problemas de salud en (checkboxes múltiples) */}
                            <div>
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Presenta Problemas de Salud en</label>
                                <div className="flex flex-wrap gap-4 p-3 bg-purple-50/10 border border-purple-100 rounded-xl">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.problemasSaludTipo.piel} onChange={e => setFormData({ ...formData, problemasSaludTipo: { ...formData.problemasSaludTipo, piel: e.target.checked } })} className="rounded text-purple-700" />
                                        <span className="font-bold text-fg-2">Piel</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.problemasSaludTipo.desnutricion} onChange={e => setFormData({ ...formData, problemasSaludTipo: { ...formData.problemasSaludTipo, desnutricion: e.target.checked } })} className="rounded text-purple-700" />
                                        <span className="font-bold text-fg-2">Desnutrición</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.problemasSaludTipo.respiratorios} onChange={e => setFormData({ ...formData, problemasSaludTipo: { ...formData.problemasSaludTipo, respiratorios: e.target.checked } })} className="rounded text-purple-700" />
                                        <span className="font-bold text-fg-2">Respiratorios</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.problemasSaludTipo.its} onChange={e => setFormData({ ...formData, problemasSaludTipo: { ...formData.problemasSaludTipo, its: e.target.checked } })} className="rounded text-purple-700" />
                                        <span className="font-bold text-fg-2">ITS</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={formData.problemasSaludTipo.otros} onChange={e => setFormData({ ...formData, problemasSaludTipo: { ...formData.problemasSaludTipo, otros: e.target.checked } })} className="rounded text-purple-700" />
                                        <span className="font-bold text-fg-2">Otros</span>
                                    </label>
                                </div>
                                {formData.problemasSaludTipo.otros && (
                                    <div className="mt-2 animate-scaleUp">
                                        <InputField
                                            label="Especifique otro problema de salud"
                                            value={formData.problemasSaludOtroDetalle}
                                            onChange={(e) => setFormData({ ...formData, problemasSaludOtroDetalle: e.target.value })}
                                            placeholder="Describa el problema..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Enfermedad Crónica / Discapacidad / Problema Psicológico / Consumo — cada uno con su tarjeta y sus propios detalles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <ToggleSiNo
                                    label="¿Enfermedad Crónica?"
                                    value={formData.enfermedadCronica}
                                    onChange={(v) => setFormData({ ...formData, enfermedadCronica: v })}
                                >
                                    <InputField
                                        label="Especifique / Detalles"
                                        value={formData.detalleEnfermedadCronica}
                                        onChange={(e) => setFormData({ ...formData, detalleEnfermedadCronica: e.target.value })}
                                        placeholder="Describa la situación..."
                                    />
                                    <ToggleSiNo
                                        label="Recibe Tratamiento"
                                        value={formData.recibeTratamientoEnfermedad}
                                        onChange={(v) => setFormData({ ...formData, recibeTratamientoEnfermedad: v })}
                                    />
                                </ToggleSiNo>

                                <ToggleSiNo
                                    label="Sufre Alguna Discapacidad"
                                    value={formData.tieneDiscapacidad}
                                    onChange={(v) => setFormData({ ...formData, tieneDiscapacidad: v })}
                                >
                                    <SelectField
                                        label="Tipo de Discapacidad"
                                        value={formData.tipoDiscapacidad}
                                        onChange={(e) => setFormData({ ...formData, tipoDiscapacidad: e.target.value })}
                                        options={DISCAPACIDADES_CONADIS.map(d => ({ value: d, label: d }))}
                                    />
                                    <InputField
                                        label="Detalle de Discapacidad"
                                        value={formData.detalleDiscapacidad}
                                        onChange={(e) => setFormData({ ...formData, detalleDiscapacidad: e.target.value })}
                                        placeholder="Especifique detalles adicionales..."
                                    />
                                    <ToggleSiNo
                                        label="Cuenta con Carnet de Discapacidad"
                                        value={formData.certificadoDiscapacidad}
                                        onChange={(v) => setFormData({ ...formData, certificadoDiscapacidad: v })}
                                    />
                                    <SelectField
                                        label="Dónde Recibe Tratamiento"
                                        value={formData.dondeTratamientoDiscapacidad}
                                        onChange={(e) => setFormData({ ...formData, dondeTratamientoDiscapacidad: e.target.value })}
                                        options={[
                                            { value: 'HOSPITAL', label: 'Hospital' },
                                            { value: 'CENTRO_SALUD', label: 'Centro de Salud' },
                                            { value: 'OTRO', label: 'Otro' }
                                        ]}
                                    />
                                </ToggleSiNo>

                                <ToggleSiNo
                                    label="Presenta Indicadores de Problemas Psicológicos"
                                    value={formData.problemaPsicologico}
                                    onChange={(v) => setFormData({ ...formData, problemaPsicologico: v })}
                                >
                                    <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Tipo de Indicador</label>
                                    <div className="flex flex-wrap gap-3 mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoIndicadorPsicologico.autoestimaBaja} onChange={e => setFormData({ ...formData, tipoIndicadorPsicologico: { ...formData.tipoIndicadorPsicologico, autoestimaBaja: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Autoestima Baja</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoIndicadorPsicologico.depresion} onChange={e => setFormData({ ...formData, tipoIndicadorPsicologico: { ...formData.tipoIndicadorPsicologico, depresion: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Depresión</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoIndicadorPsicologico.ansiedad} onChange={e => setFormData({ ...formData, tipoIndicadorPsicologico: { ...formData.tipoIndicadorPsicologico, ansiedad: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Ansiedad</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoIndicadorPsicologico.impulsividad} onChange={e => setFormData({ ...formData, tipoIndicadorPsicologico: { ...formData.tipoIndicadorPsicologico, impulsividad: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Impulsividad</span>
                                        </label>
                                    </div>
                                    <InputField
                                        label="Detalles Importantes"
                                        value={formData.detalleProblemaPsicologico}
                                        onChange={(e) => setFormData({ ...formData, detalleProblemaPsicologico: e.target.value })}
                                        placeholder="Describa la situación..."
                                    />
                                </ToggleSiNo>

                                <ToggleSiNo
                                    label="¿Consume Sustancias?"
                                    value={formData.consumeSustancias}
                                    onChange={(v) => setFormData({ ...formData, consumeSustancias: v })}
                                >
                                    <InputField
                                        label="¿Cuál(es)?"
                                        value={formData.tipoSustancias}
                                        onChange={(e) => setFormData({ ...formData, tipoSustancias: e.target.value })}
                                        placeholder="Especifique..."
                                    />
                                    <ToggleSiNo
                                        label="Si Presenta Adicción, Recibe Tratamiento"
                                        value={formData.adiccionRecibeTratamiento}
                                        onChange={(v) => setFormData({ ...formData, adiccionRecibeTratamiento: v })}
                                    />
                                </ToggleSiNo>
                            </div>

                            {/* Salud Sexual y Reproductiva */}
                            <div>
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Salud Sexual y Reproductiva</label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <ToggleSiNo
                                        label="Se Encuentra Gestando"
                                        value={formData.seEncuentraGestando}
                                        onChange={(v) => setFormData({ ...formData, seEncuentraGestando: v })}
                                    />
                                    <ToggleSiNo
                                        label="Es Madre/Padre Adolescente"
                                        value={formData.esMadrePadreAdolescente}
                                        onChange={(v) => setFormData({ ...formData, esMadrePadreAdolescente: v })}
                                    />
                                    <ToggleSiNo
                                        label="Ha Sufrido Algún Aborto"
                                        value={formData.haSufridoAborto}
                                        onChange={(v) => setFormData({ ...formData, haSufridoAborto: v })}
                                    />
                                    <ToggleSiNo
                                        label="Ha Sido Víctima de Abuso Sexual"
                                        value={formData.victimaAbusoSexual}
                                        onChange={(v) => setFormData({ ...formData, victimaAbusoSexual: v })}
                                    />
                                </div>
                            </div>

                            {/* Alimentación */}
                            <div>
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Alimentación</label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <ToggleSiNo
                                        label="Recibe sus Alimentos 3 Veces al Día"
                                        value={formData.recibeTresAlimentos}
                                        onChange={(v) => setFormData({ ...formData, recibeTresAlimentos: v })}
                                    />
                                    <ToggleSiNo
                                        label="Aparenta Estar Bien Alimentado"
                                        value={formData.aparentaBienAlimentado}
                                        onChange={(v) => setFormData({ ...formData, aparentaBienAlimentado: v })}
                                    />
                                    <SelectField
                                        label="Dónde Recibe sus Alimentos"
                                        value={formData.dondeAlimenta}
                                        onChange={(e) => setFormData({ ...formData, dondeAlimenta: e.target.value })}
                                        options={[
                                            { value: 'CALLE', label: 'Calle' },
                                            { value: 'HOGAR', label: 'Hogar' },
                                            { value: 'OTRO', label: 'Otro' }
                                        ]}
                                    />
                                    <SelectField
                                        label="Quién Asume su Alimentación"
                                        value={formData.quienAlimenta}
                                        onChange={(e) => setFormData({ ...formData, quienAlimenta: e.target.value })}
                                        options={[
                                            { value: 'USUARIO', label: 'Usuario' },
                                            { value: 'PADRE_TUTOR', label: 'Padre/Tutor' },
                                            { value: 'INSTITUCION', label: 'Institución' },
                                            { value: 'OTROS', label: 'Otros' }
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Higiene (SI / NO / A VECES) */}
                            <div>
                                <label className="block text-[10px] font-bold text-fg-muted uppercase mb-2">Higiene</label>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <Toggle3
                                        label="Se Asea Diariamente"
                                        value={formData.higieneAdecuada}
                                        onChange={(v) => setFormData({ ...formData, higieneAdecuada: v })}
                                    />
                                    <Toggle3
                                        label="Utiliza Ropas Limpias"
                                        value={formData.ropasLimpias}
                                        onChange={(v) => setFormData({ ...formData, ropasLimpias: v })}
                                    />
                                    <Toggle3
                                        label="Cumple Normas de Higiene antes/después de Comer"
                                        value={formData.normasHigieneComer}
                                        onChange={(v) => setFormData({ ...formData, normasHigieneComer: v })}
                                    />
                                    <Toggle3
                                        label="Mantiene el Cabello/Uñas Recortadas y Limpias"
                                        value={formData.cabelloUnasLimpias}
                                        onChange={(v) => setFormData({ ...formData, cabelloUnasLimpias: v })}
                                    />
                                </div>
                            </div>

                            {/* Disciplina / Violencia correctiva */}
                            <div>
                                <ToggleSiNo
                                    label="Los Padres/Tutor Ejercen Violencia para Corregir Conductas Inadecuadas"
                                    value={formData.violenciaCorrectiva}
                                    onChange={(v) => setFormData({ ...formData, violenciaCorrectiva: v })}
                                >
                                    <InputField
                                        label="¿Quién?"
                                        value={formData.quienEjerceViolencia}
                                        onChange={(e) => setFormData({ ...formData, quienEjerceViolencia: e.target.value })}
                                        placeholder="Especifique..."
                                    />
                                    <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Tipo de Violencia</label>
                                    <div className="flex flex-wrap gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoViolencia.fisica} onChange={e => setFormData({ ...formData, tipoViolencia: { ...formData.tipoViolencia, fisica: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Física</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={formData.tipoViolencia.psicologica} onChange={e => setFormData({ ...formData, tipoViolencia: { ...formData.tipoViolencia, psicologica: e.target.checked } })} className="rounded text-purple-700" />
                                            <span className="font-bold text-fg-2">Psicológica</span>
                                        </label>
                                    </div>
                                </ToggleSiNo>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <CampoDictado
                                    label="Observaciones de Salud"
                                    placeholder="Observaciones adicionales..."
                                    value={formData.observacionesSalud || ''}
                                    rows={3}
                                    onChange={v => setFormData({ ...formData, observacionesSalud: v })}
                                />
                            </div>
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
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Lugar Donde Juega</label>
                                            <div className="flex gap-1">
                                                {[
                                                    { value: 'CALLE_PARQUE', label: 'Calle/Parque' },
                                                    { value: 'CASA', label: 'Casa' },
                                                    { value: 'OTRO', label: 'Otro' }
                                                ].map(opt => (
                                                    <div
                                                        key={opt.value}
                                                        onClick={() => setFormData({ ...formData, lugarJuego: opt.value })}
                                                        className={`flex-1 text-center py-1.5 rounded cursor-pointer text-[8px] font-bold border transition-all ${formData.lugarJuego === opt.value ? 'bg-primary-soft border-primary/30 text-primary shadow-sm' : 'bg-surface border-primary/10 text-fg-muted hover:bg-primary-soft/20'}`}
                                                    >
                                                        {opt.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {formData.lugarJuego === 'OTRO' && (
                                        <div className="mt-3">
                                            <label className="block text-[9px] font-bold text-fg-muted uppercase mb-1">Especifique el Lugar</label>
                                            <input
                                                type="text"
                                                className="w-full text-xs p-2 border border-primary/10 rounded-[6px] bg-surface"
                                                placeholder="Especifique..."
                                                value={formData.lugarJuegoOtroDetalle}
                                                onChange={(e) => setFormData({ ...formData, lugarJuegoOtroDetalle: e.target.value })}
                                            />
                                        </div>
                                    )}
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
                                        <ToggleSiNo
                                            label="Refiere Intereses Deportivos"
                                            value={formData.interesesDeportivos}
                                            onChange={(v) => setFormData({ ...formData, interesesDeportivos: v })}
                                        >
                                            <InputField
                                                label="¿Cuál(es)?"
                                                value={formData.recreacionInteresDeporte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresDeporte: e.target.value })}
                                                placeholder="Ej: Fútbol, Voley..."
                                            />
                                        </ToggleSiNo>
                                        <ToggleSiNo
                                            label="Refiere Intereses Artísticos"
                                            value={formData.interesesArtisticos}
                                            onChange={(v) => setFormData({ ...formData, interesesArtisticos: v })}
                                        >
                                            <InputField
                                                label="¿Cuál(es)?"
                                                value={formData.recreacionInteresArte}
                                                onChange={(e) => setFormData({ ...formData, recreacionInteresArte: e.target.value })}
                                                placeholder="Ej: Dibujo, Baile, Música..."
                                            />
                                        </ToggleSiNo>
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
                                onClick={() => handleAddNeed()}
                                disabled={formData.necesidades.length >= NEED_CATEGORIES.length}
                                className="flex items-center gap-2 bg-primary text-primary-fg px-4 py-2 rounded-[6px] hover:bg-primary/90 transition-colors text-sm font-bold"
                            >
                                <Plus size={16} /> Agregar Necesidad
                            </button>
                        </div>

                        {suggestedNeeds.length > 0 && (
                            <div className="mb-4 rounded-[8px] border border-primary/20 bg-primary-soft/40 p-4">
                                <div className="mb-3 flex items-start gap-2">
                                    <Sparkles size={18} className="mt-0.5 shrink-0 text-primary" />
                                    <div>
                                        <p className="text-sm font-bold text-fg">Necesidades sugeridas según el diagnóstico</p>
                                        <p className="text-xs text-fg-muted">Revise la evidencia y confirme únicamente las que correspondan.</p>
                                    </div>
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {suggestedNeeds.map(item => (
                                        <div key={item.categoria} className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-surface p-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-primary">{item.categoria}</p>
                                                <p className="text-xs text-fg-muted">{item.motivo}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleAddNeed(item.categoria)}
                                                className="shrink-0 rounded-[6px] border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-fg"
                                            >
                                                Revisar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.necesidades.length > 0 ? (
                            <div className="border border-border rounded-[6px] overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left" style={{ width: '5%' }}>N°</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '20%' }}>Categoría</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '22%' }}>Fase I</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '22%' }}>Fase II</th>
                                            <th className="px-3 py-2 text-left" style={{ width: '22%' }}>Fase III</th>
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
                                                <td className="px-3 py-2 text-xs text-fg-muted"><NeedPhaseItems value={necesidad.faseI} /></td>
                                                <td className="px-3 py-2 text-xs text-fg-muted"><NeedPhaseItems value={necesidad.faseII} /></td>
                                                <td className="px-3 py-2 text-xs text-fg-muted"><NeedPhaseItems value={necesidad.faseIII} /></td>
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
                                    onClick={() => handleAddNeed()}
                                    className="text-primary text-sm font-bold hover:text-primary/80"
                                >
                                    + Agregar la primera necesidad
                                </button>
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* Navegación guiada y acciones generales */}
            <div className="max-w-7xl mx-auto print:hidden px-4 pb-6 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowDraftConfirm(true)}
                            disabled={loading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-warning-soft text-warning border border-warning/30 px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-warning/10 transition-colors disabled:opacity-60"
                        >
                            <Clock size={16} /> Borrador
                        </button>
                        <button
                            onClick={() => onClose?.()}
                            disabled={loading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface border border-border-strong text-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-surface-muted transition-colors disabled:opacity-60"
                        >
                            <X size={16} /> Cancelar
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="mr-1 text-[11px] font-semibold text-fg-muted whitespace-nowrap">
                            Sección {activeTabIndex + 1} de {FORM_TABS.length}
                        </span>
                        <button
                            onClick={handlePreviousSection}
                            disabled={loading || activeTabIndex === 0}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface border border-border-strong text-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-surface-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft size={16} /> Atrás
                        </button>
                        {activeTabIndex === FORM_TABS.length - 1 ? (
                            <button
                                onClick={handleOpenSaveConfirm}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary text-primary-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                <Save size={16} /> Guardar diagnóstico
                            </button>
                        ) : (
                            <button
                                onClick={handleNextSection}
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-primary text-primary-fg px-3.5 py-2 rounded-[6px] text-[13px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                Siguiente <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Aviso de posibles hermanos, tras registrar un integrante */}
            {deteccionHermanos && (
                <AvisoHermanos
                    nnaId={nna.id}
                    deteccion={deteccionHermanos}
                    onCerrar={() => setDeteccionHermanos(null)}
                />
            )}

            {/* MODAL PARA AGREGAR/EDITAR FAMILIAR */}
            {
                showFamilyModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] flex flex-col animate-scaleUp">
                            {/* Header del Modal */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50 rounded-t-2xl">
                                <div>
                                    <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                                        <Users size={22} className="text-purple-700" /> {editingFamilyIndex !== null ? 'Editar Familia' : 'Registrar Familia'}
                                    </h3>
                                    <p className="text-xs text-purple-700 font-medium">Complete todos los datos del familiar.</p>
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
                                                const [year, month, day] = val.split('-').map(Number);
                                                const today = new Date();
                                                let age = today.getFullYear() - year;
                                                const currentMonth = today.getMonth() + 1;
                                                if (currentMonth < month || (currentMonth === month && today.getDate() < day)) {
                                                    age--;
                                                }
                                                calculatedAge = String(age);
                                            }
                                            setCurrentFamily({ ...currentFamily, fechaNacApo: val, edad: calculatedAge });
                                        }}
                                        max={getTodayLocal()}
                                    />
                                    <InputField
                                        type="number"
                                        label="Edad"
                                        value={currentFamily.edad || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, edad: e.target.value })}
                                        placeholder="Se calcula automáticamente"
                                        min="0"
                                        max="120"
                                        required
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
                                    <SelectField
                                        label="Estado Civil"
                                        value={currentFamily.estadoCivil || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, estadoCivil: e.target.value })}
                                        options={[
                                            { value: 'SOLTERO(A)', label: 'SOLTERO(A)' },
                                            { value: 'CASADO(A)', label: 'CASADO(A)' },
                                            { value: 'CONVIVIENTE', label: 'CONVIVIENTE' },
                                            { value: 'DIVORCIADO(A)', label: 'DIVORCIADO(A)' },
                                            { value: 'VIUDO(A)', label: 'VIUDO(A)' },
                                        ]}
                                    />
                                    <SelectField
                                        label="Grado de Instrucción"
                                        value={currentFamily.gradoInstruccion || ''}
                                        onChange={(e) => setCurrentFamily({ ...currentFamily, gradoInstruccion: e.target.value })}
                                        options={[
                                            { value: 'SIN_INSTRUCCION', label: 'SIN INSTRUCCIÓN' },
                                            { value: 'PRIMARIA_INCOMPLETA', label: 'PRIMARIA INCOMPLETA' },
                                            { value: 'PRIMARIA_COMPLETA', label: 'PRIMARIA COMPLETA' },
                                            { value: 'SECUNDARIA_INCOMPLETA', label: 'SECUNDARIA INCOMPLETA' },
                                            { value: 'SECUNDARIA_COMPLETA', label: 'SECUNDARIA COMPLETA' },
                                            { value: 'SUPERIOR_INCOMPLETA', label: 'SUPERIOR INCOMPLETA' },
                                            { value: 'SUPERIOR_COMPLETA', label: 'SUPERIOR COMPLETA' },
                                        ]}
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px] p-4">
                        <div className="bg-surface rounded-[12px] shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-fg-2 mb-2">
                                        Categoría <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="w-full px-4 py-2 border border-border rounded-[6px] focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                        value={currentNeed.categoria}
                                        disabled={editingNeedIndex !== null}
                                        onChange={(e) => setCurrentNeed({ ...currentNeed, categoria: e.target.value, acciones: [], faseI: '', faseII: '', faseIII: '' })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {NEED_CATEGORIES.map(item => {
                                            const usedByAnother = formData.necesidades.some((need, index) =>
                                                need.categoria === item.value && index !== editingNeedIndex
                                            );
                                            return (
                                                <option key={item.value} value={item.value} disabled={usedByAnother}>
                                                    {item.label}{usedByAnother ? ' — ya registrada' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className="mt-1.5 text-xs text-fg-muted">Cada categoría se registra una sola vez y continúa en las fases siguientes.</p>
                                </div>

                                <div className="rounded-[8px] border border-primary/25 bg-primary-soft/30 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Sparkles size={17} className="text-primary" />
                                        <div>
                                            <p className="text-sm font-bold text-fg">Acciones sugeridas para {activeNeedPhase === 'faseI' ? 'Fase I' : activeNeedPhase === 'faseII' ? 'Fase II' : 'Fase III'}</p>
                                            <p className="text-xs text-fg-muted">
                                                {activeNeedPhase === 'faseI'
                                                    ? 'Seleccione una acción inicial para crear su línea de intervención.'
                                                    : 'Las opciones corresponden a las acciones registradas en la fase anterior y completarán la misma fila.'}
                                            </p>
                                        </div>
                                    </div>

                                    {activeNeedPhase === 'faseI' ? (
                                        (NEED_ACTION_FLOWS[currentNeed.categoria] || []).length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {NEED_ACTION_FLOWS[currentNeed.categoria].map(flow => (
                                                    <button type="button" key={flow.id} onClick={() => addInitialNeedFlow(flow)} className="rounded-full border border-primary/25 bg-surface px-3 py-1.5 text-left text-xs text-fg-2 hover:border-primary hover:text-primary">
                                                        <Plus size={12} className="mr-1 inline" />{flow.faseI}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => addCustomNeedAction('faseI')} className="rounded-[6px] border border-dashed border-primary/40 bg-surface px-3 py-2 text-xs font-bold text-primary">
                                                <Plus size={12} className="mr-1 inline" /> Agregar acción personalizada
                                            </button>
                                        )
                                    ) : (() => {
                                        const previousPhase: NeedPhase = activeNeedPhase === 'faseII' ? 'faseI' : 'faseII';
                                        const previousActions = (currentNeed.acciones || []).filter(action => action[previousPhase].trim());
                                        if (previousActions.length === 0) {
                                            return <p className="rounded-[6px] border border-dashed border-border bg-surface p-3 text-xs text-fg-muted">Primero registre una acción en {previousPhase === 'faseI' ? 'Fase I' : 'Fase II'} para mostrar sus continuaciones correspondientes.</p>;
                                        }
                                        return (
                                            <div className="space-y-3">
                                                {previousActions.map(action => {
                                                    const flow = (NEED_ACTION_FLOWS[currentNeed.categoria] || []).find(item => item.id === action.flowId);
                                                    const suggestions: string[] = activeNeedPhase === 'faseII'
                                                        ? flow?.faseII || []
                                                        : flow?.faseIII || [];
                                                    return (
                                                        <div key={`${activeNeedPhase}-${action.id}`} className="rounded-[7px] border border-primary/15 bg-surface p-3">
                                                            <div className="mb-2 flex items-start gap-2">
                                                                <ArrowRight size={15} className="mt-0.5 shrink-0 text-primary" />
                                                                <div>
                                                                    <p className="text-xs font-black text-fg">Continuación de: {action.titulo}</p>
                                                                    <p className="text-[11px] text-fg-muted">{action[previousPhase]}</p>
                                                                </div>
                                                            </div>
                                                            {suggestions.length > 0 ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {suggestions.map(suggestion => (
                                                                        <button type="button" key={suggestion} onClick={() => applyNeedFlowSuggestion(action.id, activeNeedPhase, suggestion)} className="rounded-full border border-primary/25 bg-primary-soft/30 px-3 py-1.5 text-left text-xs text-fg-2 hover:border-primary hover:text-primary">
                                                                            <Plus size={12} className="mr-1 inline" />{suggestion}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <button type="button" onClick={() => continueCustomNeedAction(action.id, activeNeedPhase)} className="rounded-[6px] border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-fg">
                                                                    Vincular y continuar esta gestión
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-black text-fg">Secuencia de acciones por fases</h4>
                                            <p className="text-xs text-fg-muted">Todas las fases se muestran juntas. Seleccione una columna para indicar dónde se agregará la siguiente sugerencia.</p>
                                        </div>
                                        <button type="button" onClick={() => addCustomNeedAction()} className="rounded-[6px] border border-primary px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-fg">
                                            <Plus size={14} className="mr-1 inline" /> Otra acción
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto rounded-[8px] border border-border">
                                        <div className="min-w-[1050px]">
                                            <div className="grid bg-surface-muted" style={{ gridTemplateColumns: '220px repeat(3, minmax(240px, 1fr)) 48px' }}>
                                                <div className="flex items-center border-r border-border px-3 py-3 text-xs font-black uppercase text-fg-muted">Gestión / Acción</div>
                                                {NEED_PHASES.map(phase => (
                                                    <button
                                                        type="button"
                                                        key={phase.key}
                                                        onClick={() => setActiveNeedPhase(phase.key)}
                                                        className={`border-r border-border px-3 py-3 text-sm font-black transition-colors ${activeNeedPhase === phase.key ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface'}`}
                                                    >
                                                        {phase.label}
                                                        {activeNeedPhase === phase.key && <span className="ml-2 text-[10px] font-bold opacity-80">ACTIVA</span>}
                                                    </button>
                                                ))}
                                                <div />
                                            </div>

                                            {(currentNeed.acciones || []).map(action => (
                                                <div key={action.id} className="grid border-t border-border bg-surface" style={{ gridTemplateColumns: '220px repeat(3, minmax(240px, 1fr)) 48px' }}>
                                                    <div className="border-r border-border p-3">
                                                        <label className="mb-1 block text-[10px] font-bold uppercase text-fg-muted">Gestión</label>
                                                        <input
                                                            type="text"
                                                            value={action.titulo}
                                                            onChange={(e) => updateNeedActionTitle(action.id, e.target.value)}
                                                            placeholder="Nombre de la gestión"
                                                            className="w-full rounded-[6px] border border-border px-2.5 py-2 text-xs font-bold focus:border-primary focus:ring-2 focus:ring-primary/30"
                                                        />
                                                    </div>
                                                    {NEED_PHASES.map(phase => {
                                                        const actionKey = `${action.id}:${phase.key}`;
                                                        return (
                                                            <div key={phase.key} onClick={() => setActiveNeedPhase(phase.key)} className={`relative border-r border-border p-2 ${activeNeedPhase === phase.key ? 'bg-primary-soft/25' : ''}`}>
                                                                <textarea
                                                                    rows={4}
                                                                    value={action[phase.key]}
                                                                    onFocus={() => setActiveNeedPhase(phase.key)}
                                                                    onChange={(e) => updateNeedActionText(action.id, phase.key, e.target.value)}
                                                                    placeholder={phase.key === 'faseI' ? 'Acción inicial...' : 'Continuación o avance...'}
                                                                    className="h-full min-h-[96px] w-full resize-y rounded-[6px] border border-border bg-surface px-3 py-2 pr-9 text-xs focus:border-primary focus:ring-2 focus:ring-primary/30"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setActiveNeedPhase(phase.key); toggleVoiceDictation(action.id, phase.key); }}
                                                                    disabled={!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)}
                                                                    title={`Dictar acción de ${phase.label}`}
                                                                    className={`absolute right-4 top-4 rounded-full border bg-surface p-1 disabled:cursor-not-allowed disabled:opacity-30 ${listeningActionKey === actionKey ? 'border-danger text-danger' : 'border-border text-fg-muted hover:border-primary hover:text-primary'}`}
                                                                >
                                                                    <Mic size={13} />
                                                                </button>
                                                                {listeningActionKey === actionKey && <p className="mt-1 text-[10px] font-bold text-danger">Escuchando…</p>}
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex items-center justify-center p-2">
                                                        <button type="button" onClick={() => removeNeedAction(action.id)} title="Eliminar gestión" className="rounded-full border border-border p-2 text-fg-muted hover:border-danger hover:text-danger">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {(currentNeed.acciones || []).length === 0 && (
                                                <div className="border-t border-border p-7 text-center text-xs text-fg-muted">
                                                    Seleccione una acción sugerida o agregue una acción personalizada para iniciar la secuencia.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-fg-muted">Las fases representan una proyección. No es necesario completar las tres ni registrar fechas.</p>
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
                                    disabled={!currentNeed.categoria || !(currentNeed.acciones || []).some(action => action.fasesActivas.some(phase => action[phase].trim()))}
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
                perfil={perfilActividad}
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
                                M [{formData.sexo === '1' ? 'X' : ' '}]  F [{formData.sexo === '2' ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Lugar Nacimiento</span>
                                {nna?.departamentoNac} - {nna?.provinciaNac}
                            </td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Seguro de Salud</span>
                                {formData.afiliadoSIS === 'SI' ? 'SIS' : (formData.afiliadoOtroSeguro === 'SI' ? (formData.detalleOtroSeguro || 'OTRO') : 'NINGUNO')}
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
                                <span style={labelStyle as any}>Tiempo en Situación de Calle</span>
                                <b>{formatTiempoSituacionCalle(formData.situacionCalleDetalle.tiempo) || formData.tiempoEnCalle || caso?.tiempoEnCalle}</b>
                            </td>
                            <td style={tdStyle} colSpan={3}>
                                <span style={labelStyle as any}>Punto de Concentración</span>
                                <b>{formData.puntoConcentracion || caso?.zonaIntervencion}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Actividad que realiza en calle</span>
                                <b>{formData.situacionCalleDetalle.actividad || formData.actividadEconomica || caso?.actividadRealizada}</b>
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Horarios en Situación de Calle</span>
                                Mañana [{formData.situacionCalleDetalle.horarios.manana ? 'X' : ' '}]
                                {' '}Tarde [{formData.situacionCalleDetalle.horarios.tarde ? 'X' : ' '}]
                                {' '}Noche [{formData.situacionCalleDetalle.horarios.noche ? 'X' : ' '}]
                                {' '}Madrugada [{formData.situacionCalleDetalle.horarios.madrugada ? 'X' : ' '}]
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle} colSpan={4}>
                                <span style={labelStyle as any}>Frecuencia en Calle</span>
                                Diario [{formData.situacionCalleDetalle.frecuencia.diario ? 'X' : ' '}]
                                {' '}Interdiario [{formData.situacionCalleDetalle.frecuencia.interdiario ? 'X' : ' '}]
                                {' '}Fines de semana [{formData.situacionCalleDetalle.frecuencia.finesSemana ? 'X' : ' '}]
                                {' '}Temporadas [{formData.situacionCalleDetalle.frecuencia.temporadas ? 'X' : ' '}]
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
                                {formData.problemasConducta && <b> ({formData.intensidadConducta || '---'})</b>}
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Ha sido expulsado</span>
                                SI [{formData.expulsado ? 'X' : ' '}] NO [{!formData.expulsado ? 'X' : ' '}] N° veces: {formData.vecesExpulsado || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Faltas/Tardanzas en el Mes</span>
                                SI [{formData.faltasTardanzas ? 'X' : ' '}] NO [{!formData.faltasTardanzas ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Se Duerme en Clase</span>
                                SI [{formData.seDuermeClase ? 'X' : ' '}] NO [{!formData.seDuermeClase ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Sufre Bullying/Discriminación</span>
                                SI [{formData.sufreBullying ? 'X' : ' '}] NO [{!formData.sufreBullying ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>
                                <span style={labelStyle as any}>Tutor Conversa con Docente</span>
                                SI [{formData.tutorConversaDocente ? 'X' : ' '}] NO [{!formData.tutorConversaDocente ? 'X' : ' '}]
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* VII. SALUD */}
                <div style={sectionTitle as any}>VII. SALUD – ALIMENTACIÓN – HIGIENE</div>
                <table style={tableStyle as any}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }} width="30%"><b>Presenta Problemas en:</b></td>
                            <td style={tdStyle} colSpan={2}>
                                Piel [{formData.problemasSaludTipo.piel ? 'X' : ' '}]
                                {' '}Desnutrición [{formData.problemasSaludTipo.desnutricion ? 'X' : ' '}]
                                {' '}Respiratorios [{formData.problemasSaludTipo.respiratorios ? 'X' : ' '}]
                                {' '}ITS [{formData.problemasSaludTipo.its ? 'X' : ' '}]
                                {' '}Otros [{formData.problemasSaludTipo.otros ? 'X' : ' '}] {formData.problemasSaludTipo.otros && `(${formData.problemasSaludOtroDetalle || '---'})`}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Enfermedad Crónica:</b></td>
                            <td style={tdStyle}>SI [{formData.enfermedadCronica ? 'X' : ' '}] NO [{!formData.enfermedadCronica ? 'X' : ' '}] Recibe Tratamiento: SI [{formData.recibeTratamientoEnfermedad ? 'X' : ' '}] NO [{!formData.recibeTratamientoEnfermedad ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.detalleEnfermedadCronica || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Discapacidad:</b></td>
                            <td style={tdStyle}>
                                SI [{formData.tieneDiscapacidad ? 'X' : ' '}] NO [{!formData.tieneDiscapacidad ? 'X' : ' '}]
                                {' '}Carnet: SI [{formData.certificadoDiscapacidad ? 'X' : ' '}] NO [{!formData.certificadoDiscapacidad ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>{formData.tipoDiscapacidad || '---'} — Tratamiento: {formData.dondeTratamientoDiscapacidad || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Problemas Psicológicos:</b></td>
                            <td style={tdStyle}>SI [{formData.problemaPsicologico ? 'X' : ' '}] NO [{!formData.problemaPsicologico ? 'X' : ' '}]</td>
                            <td style={tdStyle}>
                                {[
                                    formData.tipoIndicadorPsicologico.autoestimaBaja && 'Autoestima Baja',
                                    formData.tipoIndicadorPsicologico.depresion && 'Depresión',
                                    formData.tipoIndicadorPsicologico.ansiedad && 'Ansiedad',
                                    formData.tipoIndicadorPsicologico.impulsividad && 'Impulsividad'
                                ].filter(Boolean).join(', ') || '---'} — {formData.detalleProblemaPsicologico || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Consume Sustancias:</b></td>
                            <td style={tdStyle}>SI [{formData.consumeSustancias ? 'X' : ' '}] NO [{!formData.consumeSustancias ? 'X' : ' '}] Recibe Tratamiento: SI [{formData.adiccionRecibeTratamiento ? 'X' : ' '}] NO [{!formData.adiccionRecibeTratamiento ? 'X' : ' '}]</td>
                            <td style={tdStyle}>{formData.tipoSustancias || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Salud Sexual y Reproductiva:</b></td>
                            <td style={tdStyle} colSpan={2}>
                                Gestando [{formData.seEncuentraGestando ? 'X' : ' '}]
                                {' '}Madre/Padre Adolescente [{formData.esMadrePadreAdolescente ? 'X' : ' '}]
                                {' '}Aborto [{formData.haSufridoAborto ? 'X' : ' '}]
                                {' '}Abuso Sexual [{formData.victimaAbusoSexual ? 'X' : ' '}]
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Alimentación:</b></td>
                            <td style={tdStyle}>
                                3 Veces al Día: SI [{formData.recibeTresAlimentos ? 'X' : ' '}] NO [{!formData.recibeTresAlimentos ? 'X' : ' '}]
                                {' '}Bien Alimentado: SI [{formData.aparentaBienAlimentado ? 'X' : ' '}] NO [{!formData.aparentaBienAlimentado ? 'X' : ' '}]
                            </td>
                            <td style={tdStyle}>Dónde: {formData.dondeAlimenta || '---'} — Quién: {formData.quienAlimenta || '---'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Higiene:</b></td>
                            <td style={tdStyle} colSpan={2}>
                                Se Asea: {formData.higieneAdecuada || '---'}
                                {' '}| Ropas Limpias: {formData.ropasLimpias || '---'}
                                {' '}| Normas al Comer: {formData.normasHigieneComer || '---'}
                                {' '}| Cabello/Uñas: {formData.cabelloUnasLimpias || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Violencia Correctiva:</b></td>
                            <td style={tdStyle}>SI [{formData.violenciaCorrectiva ? 'X' : ' '}] NO [{!formData.violenciaCorrectiva ? 'X' : ' '}]</td>
                            <td style={tdStyle}>
                                ¿Quién? {formData.quienEjerceViolencia || '---'} — Tipo: {[
                                    formData.tipoViolencia.fisica && 'Física',
                                    formData.tipoViolencia.psicologica && 'Psicológica'
                                ].filter(Boolean).join(', ') || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Observaciones de Salud:</b></td>
                            <td style={tdStyle} colSpan={2}>{formData.observacionesSalud || '---'}</td>
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
                                <b>
                                    {formData.lugarJuego === 'CALLE_PARQUE' ? 'Calle/Parque' :
                                     formData.lugarJuego === 'CASA' ? 'Casa' :
                                     formData.lugarJuego === 'OTRO' ? `Otro (${formData.lugarJuegoOtroDetalle || '---'})` : '---'}
                                </b>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ ...tdStyle, backgroundColor: '#f9fafb' }}><b>Participa en Institución:</b></td>
                            <td style={tdStyle}>SI [{formData.recreacionParticipaInstitucion ? 'X' : ' '}] NO [{!formData.recreacionParticipaInstitucion ? 'X' : ' '}]</td>
                            <td style={tdStyle} colSpan={2}>
                                <span style={labelStyle as any}>Tipo</span>
                                {formData.recreacionTipoInstitucion || '---'}
                            </td>
                        </tr>
                        <tr>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Deportivos</span> SI [{formData.interesesDeportivos ? 'X' : ' '}] NO [{!formData.interesesDeportivos ? 'X' : ' '}] {formData.interesesDeportivos && `(${formData.recreacionInteresDeporte || '---'})`}</td>
                            <td style={tdStyle}><span style={labelStyle as any}>Intereses Artísticos</span> SI [{formData.interesesArtisticos ? 'X' : ' '}] NO [{!formData.interesesArtisticos ? 'X' : ' '}] {formData.interesesArtisticos && `(${formData.recreacionInteresArte || '---'})`}</td>
                            <td style={tdStyle} colSpan={2}><span style={labelStyle as any}>Actividades con Familia</span> SI [{formData.recreacionActividadFamilia ? 'X' : ' '}] NO [{!formData.recreacionActividadFamilia ? 'X' : ' '}]</td>
                        </tr>
                    </tbody>
                </table>

                {/* IX. NECESIDADES Y PLAN DE ACCIÓN */}
                <div style={sectionTitle as any}>IX. NECESIDADES DEL NNA Y PLAN DE ACCIÓN</div>
                <table style={tableStyle as any}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '5%' }}>N°</th>
                            <th style={{ ...thStyle, width: '20%' }}>Categoría</th>
                            <th style={{ ...thStyle, width: '25%' }}>Fase I</th>
                            <th style={{ ...thStyle, width: '25%' }}>Fase II</th>
                            <th style={{ ...thStyle, width: '25%' }}>Fase III</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.necesidades.length > 0 ? (
                            formData.necesidades.map((necesidad, idx) => (
                                <tr key={idx}>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                                    <td style={{ ...tdStyle, fontSize: '9px', fontWeight: 'bold' }}>{necesidad.categoria}</td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}><NeedPhaseItems value={necesidad.faseI} /></td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}><NeedPhaseItems value={necesidad.faseII} /></td>
                                    <td style={{ ...tdStyle, fontSize: '8px' }}><NeedPhaseItems value={necesidad.faseIII} /></td>
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

        {/* ── Modal de resultado (éxito / borrador / error) ── */}
        {resultModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className={`h-1.5 ${resultModal.type === 'success' ? 'bg-gradient-to-r from-success via-success/70 to-success/30' : resultModal.type === 'draft' ? 'bg-gradient-to-r from-warning via-warning/70 to-warning/30' : 'bg-gradient-to-r from-danger via-danger/70 to-danger/30'}`} />
                    <div className="p-7">
                        {/* Ícono */}
                        <div className="flex justify-center mb-5">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${resultModal.type === 'success' ? 'bg-success-soft' : resultModal.type === 'draft' ? 'bg-warning-soft' : 'bg-danger-soft'}`}>
                                {resultModal.type === 'success' && <CheckCircle2 size={32} className="text-success" />}
                                {resultModal.type === 'draft'   && <Clock       size={32} className="text-warning" />}
                                {resultModal.type === 'error'   && <XCircle     size={32} className="text-danger"  />}
                            </div>
                        </div>

                        {/* Texto */}
                        <div className="text-center mb-6">
                            <h3 className={`text-[17px] font-black mb-2 ${resultModal.type === 'success' ? 'text-success' : resultModal.type === 'draft' ? 'text-warning' : 'text-danger'}`}>
                                {resultModal.title}
                            </h3>
                            <p className="text-[13px] text-fg-muted leading-relaxed">
                                {resultModal.message}
                            </p>
                        </div>

                        {/* Botón */}
                        <button
                            onClick={closeResultModal}
                            className={`w-full px-4 py-2.5 rounded-xl font-bold text-[13px] transition-all ${resultModal.type === 'success' ? 'bg-success text-white hover:bg-success/90' : resultModal.type === 'draft' ? 'bg-warning text-white hover:bg-warning/90' : 'bg-danger text-white hover:bg-danger/90'}`}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Modal de confirmación de borrador ── */}
        {showDraftConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-1.5 bg-gradient-to-r from-warning via-warning/70 to-warning/30" />
                    <div className="p-7">
                        {/* Ícono */}
                        <div className="flex justify-center mb-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-warning-soft flex items-center justify-center">
                                    <Clock size={28} className="text-warning" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center border-2 border-surface">
                                    <Save size={11} className="text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Texto */}
                        <div className="text-center mb-5">
                            <h3 className="text-[17px] font-black text-fg mb-1.5">¿Guardar como borrador?</h3>
                            <p className="text-[13px] text-fg-muted leading-relaxed">
                                Se guardará el avance parcial del <span className="font-bold text-fg">Diagnóstico Social (F04)</span> de:
                            </p>
                            <p className="text-[13px] font-bold text-warning mt-1 truncate">
                                {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno}
                            </p>
                        </div>

                        {/* Nota */}
                        <div className="flex items-start gap-2.5 bg-warning-soft/60 border border-warning/20 rounded-xl px-4 py-3 mb-6">
                            <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />
                            <p className="text-[11px] text-fg-2 font-medium leading-relaxed">
                                El borrador quedará guardado pero <span className="font-bold">no será considerado un diagnóstico finalizado</span>. Podrás retomarlo y completarlo en cualquier momento.
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDraftConfirm(false)}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-fg font-semibold text-[13px] hover:bg-surface-muted transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setShowDraftConfirm(false);
                                    await handleSaveDraft();
                                }}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-warning text-white font-bold text-[13px] hover:bg-warning/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Clock size={14} />
                                        Sí, guardar borrador
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ── Modal de confirmación de guardado ── */}
        {showSaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-surface rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
                    <div className="p-7">
                        {/* Ícono */}
                        <div className="flex justify-center mb-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full bg-primary-soft flex items-center justify-center">
                                    <Save size={28} className="text-primary" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success flex items-center justify-center border-2 border-surface">
                                    <CheckCircle2 size={13} className="text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Texto */}
                        <div className="text-center mb-5">
                            <h3 className="text-[17px] font-black text-fg mb-1.5">¿Desea guardar el diagnóstico?</h3>
                            <p className="text-[13px] text-fg-muted leading-relaxed">
                                Al confirmar, se guardará el <span className="font-bold text-fg">Diagnóstico Social (F04)</span> del beneficiario:
                            </p>
                            <p className="text-[13px] font-bold text-primary mt-1 truncate">
                                {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno}
                            </p>
                        </div>

                        {/* Nota */}
                        <div className="flex items-start gap-2.5 bg-info-soft/60 border border-info/20 rounded-xl px-4 py-3 mb-6">
                            <AlertCircle size={14} className="text-info shrink-0 mt-0.5" />
                            <p className="text-[11px] text-fg-2 font-medium leading-relaxed">
                                Los cambios quedarán registrados en el expediente digital y podrán revisarse o actualizarse en cualquier momento.
                            </p>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSaveConfirm(false)}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-fg font-semibold text-[13px] hover:bg-surface-muted transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setShowSaveConfirm(false);
                                    await handleSave();
                                }}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-fg font-bold text-[13px] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-primary-fg/30 border-t-primary-fg rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        Sí, guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div >
    );
};
