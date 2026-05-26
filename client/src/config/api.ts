// Archivo de configuración centralizada para las URLs de los microservicios

const isProduction = import.meta.env.PROD; // Usa variables de entorno en producción

// Microservicios Python con arquitectura hexagonal + Oracle
export const AUTH_API_URL         = isProduction ? '/api/auth-service'         : 'http://localhost:3001/api';
export const NNA_API_URL          = isProduction ? '/api/nna-service'          : 'http://localhost:3002/api';
export const INTERVENCION_API_URL = isProduction ? '/api/intervencion-service' : 'http://localhost:3003/api';
export const DERIVACION_API_URL   = isProduction ? '/api/derivacion-service'   : 'http://localhost:3004/api';
export const TALLERES_API_URL     = isProduction ? '/api/talleres-service'     : 'http://localhost:3005/api';
export const EXPEDIENTE_API_URL   = isProduction ? '/api/expediente-service'   : 'http://localhost:3006/api';

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
    ESTADISTICO: 'ESTADISTICO'
};
