import { Rol } from './roles.types';

/**
 * Payload del JWT que viaja en cada request.
 * Contiene la sede del usuario para el filtro multi-tenancy.
 */
export interface JwtPayload {
  userId:     number;
  email:      string;
  rol:        Rol;
  sedeId:     number;   // ID numérico de la sede
  sedeCodigo: string;   // 'LIM-01', 'AQP-01', etc.
  regionId:   number;   // Para validar traslados internos (misma región)
  iat?:       number;
  exp?:       number;
}

/**
 * Filtro de sede inyectado por el sede.middleware en cada request.
 * null = sin filtro (ADMIN_NACIONAL ve todo)
 */
export interface SedeFilter {
  sedeId:        number | null;
  responsableId: number | null; // solo para roles de campo
}

/** Extiende Express.Request con los datos del JWT y el filtro de sede */
declare global {
  namespace Express {
    interface Request {
      user?:       JwtPayload;
      sedeFilter?: SedeFilter;
    }
  }
}
