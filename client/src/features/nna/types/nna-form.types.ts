import type { ActividadPerfil } from '../components/actividades.types';

export interface UsoTiempoDia {
    estudiar: number;
    trabajar: number;
    dormir: number;
    jugar: number;
}

export interface ActividadTiempoLibre {
    id: string;
    nombre: string;
    categoria: 'ESTUDIAR' | 'DORMIR' | 'JUGAR' | 'DEPORTES' | 'ARTE' | 'TAREAS';
    horarios: {
        [dia: string]: {
            turno1: { inicio: string; fin: string };
            turno2?: { inicio: string; fin: string };
        };
    };
    horasSemana: number;
    horasMes: number;
}

export interface NnaPersonalData {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    sexo: string;
    fechaNacimiento: string;

    departamentoNac: string;
    provinciaNac: string;
    distritoNac: string;

    tipoDoc: string;
    numeroDoc: string;
    tienePartidaNacimiento: string;
    detalleSinDoc: string;

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

    actividadesTiempoLibre: string;
    caracteristicas: string;
    tieneAntecedenteAlbergue: boolean;
    detalleAntecedenteAlbergue: string;
    edad?: number | string;
    unidadEdad?: string;
    nacionalidad: string;
    lenMatNna?: string;
    lenMatEspNna?: string;
    autIdeEtNna?: string;
    autIdeEtEspNna?: string;
    certDiscapNna?: string;
    detalleDiscapacidad?: string;
    usoTiempo?: Record<string, UsoTiempoDia>;
    actividadesTiempoLibreLista?: ActividadTiempoLibre[];
}

export interface CasoExpedienteData {
    estado?: string;
    zonaIntervencion?: string;
    perfil?: string;
    situacionCalle?: string;
    fechaAbordaje?: string;
    fechaIngreso?: string;
    fechaReingreso?: string;
    fechaCambioPerfil?: string;
    actividadRealizada?: string;
    tiempoEnCalle?: string;
    condicion?: string;
    horarioInicio?: string;
    horarioFin?: string;
    horarioInicio2?: string;
    horarioFin2?: string;
    diasTrabajo?: string;
    victimaExplotacion?: string;
    victima_explotacion?: string;
}

export interface LegacyJornadaDia {
    activo?: boolean;
    inicio?: string;
    fin?: string;
    inicio2?: string;
    fin2?: string;
    tieneTurno2?: boolean;
}

export interface LegacyActividadJornada {
    dia?: string;
    inicio?: string;
    fin?: string;
    inicio2?: string;
    fin2?: string;
    tieneTurno2?: boolean;
}

export interface LegacyActividadPerfil {
    actividad?: string;
    tiempoValor?: string | number;
    tiempoUnidad?: string;
    tiempoDetalle?: string;
    jornada?: LegacyActividadJornada[];
    condicion?: string;
}

export interface DatosF03 {
    usoTiempo?: Record<string, UsoTiempoDia>;
    grid?: Record<string, UsoTiempoDia>;
    actividadesTiempoLibreLista?: ActividadTiempoLibre[];
    actividadesCalle?: ActividadPerfil[];
    actividadesPerfil?: LegacyActividadPerfil[];
    jornadaSemanal?: Record<string, LegacyJornadaDia>;
    jornada_semanal?: Record<string, LegacyJornadaDia>;
}

export type HorariosActividad = ActividadTiempoLibre['horarios'];

export interface NnaConDatos extends NnaPersonalData {
    id?: number;
    datosF03Backup?: string;
}

export type ExpedienteNna = Omit<Partial<NnaConDatos>, 'tienePartidaNacimiento' | 'sufreEnfermedad'> & {
    datosF03?: string | DatosF03 | null;
    actividadesTiempoLibre?: string | null;
    casos?: CasoExpedienteData[];
    carpetaId?: number;
    domicilioActual?: string | null;
    referenciaDomicilio?: string | null;
    departamentoDom?: string | null;
    provinciaDom?: string | null;
    distritoDom?: string | null;
    telefonoContacto?: string | null;
    viveCon?: string | null;
    detalleViveCon?: string | null;
    lugarPernocte?: string | null;
    detalleLugarPernocte?: string | null;
    nombreTutor?: string | null;
    tienePartidaNacimiento?: boolean | string;
    sufreEnfermedad?: boolean | string;
};

export interface NnaPayloadItem extends Record<string, unknown> {
    id?: number;
}

export interface RegistrarNnaPayload {
    nnas: NnaPayloadItem[];
    perfil: string;
    zona_intervencion: string | null;
    distrito_intervencion: string | null;
    situacion_calle: string | null;
    actividad_realizada: string | null;
    tiempo_en_calle: string | null;
    condicion: string | null;
    fecha_abordaje: string | null;
    fecha_ingreso: string | null;
    fecha_reingreso: string | null;
    fecha_cambio_perfil: string | null;
    horario_inicio: string | null;
    horario_fin: string | null;
    horario_inicio2: string | null;
    horario_fin2: string | null;
    dias_trabajo: string | null;
    carpeta_id?: number;
    crear_nueva_carpeta?: boolean;
    familiares?: any[];
    victima_explotacion?: string | null;
    es_borrador?: boolean;
}

export interface FamiliarFormDataItem {
    id?: string;
    nombres?: string;
    parentesco?: string;
    dni?: string;
    telefono?: string;
    ocupacion?: string;
    viveCon?: string; // "SI" / "NO"
    tipoDoc?: string;
    
    // Datos detallados SEC 2026 si aplica
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

    esTutorPrincipal?: boolean | string;
}

export interface NnaFormData {
    zonaIntervencion: string;
    departamentoDom: string;
    provinciaDom: string;
    distritoDom: string;

    perfil: string;
    situacionCalle: string;
    victimaExplotacion?: string;
    fechaAbordaje: string;
    fechaIngreso: string;
    fechaReingreso: string;
    fechaCambioPerfil: string;

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
    
    // Hermanos (SEC 2026)
    tieneHermanos?: string | boolean;
    cantHermanos?: number | string;
    detallesHermanos?: string;

    // Tutor / Apoderado (SEC 2026)
    tieneTutorApo?: string | number | boolean;
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

    familiares?: FamiliarFormDataItem[];
    actividadesCalle?: ActividadPerfil[];
}

export interface DuplicateCheckResult {
    status: 'unique' | 'homonym' | 'duplicate';
    message: string;
    matches?: NnaPersonalData[];
}
