export interface HorarioDia {
    activo: boolean;
    turno1Inicio: string;
    turno1Fin: string;
    turno2Inicio: string;
    turno2Fin: string;
}

export interface AgendaSemanal {
    lunes: HorarioDia;
    martes: HorarioDia;
    miercoles: HorarioDia;
    jueves: HorarioDia;
    viernes: HorarioDia;
    sabado: HorarioDia;
    domingo: HorarioDia;
}

export interface ActividadPerfil {
    actividad: string;
    actividadEspecifique?: string;
    acompanamiento: string;
    tiempoValor: string;
    tiempoUnidad: string;
    agenda: AgendaSemanal;
}

export const defaultHorario: HorarioDia = {
    activo: false,
    turno1Inicio: '08:00',
    turno1Fin: '12:00',
    turno2Inicio: '',
    turno2Fin: ''
};

export const defaultAgenda: AgendaSemanal = {
    lunes: { ...defaultHorario },
    martes: { ...defaultHorario },
    miercoles: { ...defaultHorario },
    jueves: { ...defaultHorario },
    viernes: { ...defaultHorario },
    sabado: { ...defaultHorario },
    domingo: { ...defaultHorario },
};
