// Archivo de configuración centralizada para las URLs de los microservicios

const isProduction = import.meta.env.PROD; // Usa variables de entorno en producción

// Microservicios Python con arquitectura hexagonal + Oracle
export const AUTH_API_URL         = '/api/auth-service';
export const NNA_API_URL          = '/api/nna-service';
export const INTERVENCION_API_URL = '/api/intervencion-service';
export const DERIVACION_API_URL   = '/api/derivacion-service';
export const TALLERES_API_URL     = '/api/talleres-service';
export const EXPEDIENTE_API_URL   = '/api/expediente-service';

// Configuración de roles y accesos
export const ROLES = {
    ADMIN_NACIONAL: 'ADMIN_NACIONAL',
    ADMIN_SEDE: 'ADMIN_SEDE',
    COORDINADOR: 'COORDINADOR',
    EDUCADOR: 'EDUCADOR',
    PSICOLOGO: 'PSICOLOGO',
    TRABAJADOR_SOCIAL: 'TRABAJADOR_SOCIAL',
    ABOGADO: 'ABOGADO',
    MONITOR: 'MONITOR',
    ESTADISTICO: 'ESTADISTICO',
    SUPERVISOR_EXPEDIENTES: 'SUPERVISOR_EXPEDIENTES'
};
