import { Request, Response, NextFunction } from 'express';
import { Rol, ROLES_SEDE_COMPLETA, ROLES_CAMPO } from '../types/roles.types';
import { SedeFilter } from '../types/jwt.types';

/**
 * Middleware de multi-tenancy.
 *
 * Lee el JWT (ya verificado por authMiddleware) y construye el filtro de sede
 * que cada repositorio debe aplicar en sus queries a Oracle.
 *
 * Reglas:
 * - ADMIN_NACIONAL       → sedeId: null  (ve todo sin filtro)
 * - COORDINADOR/ADMIN    → sedeId: X     (ve toda su sede)
 * - EDUCADOR/PSIC/TSOC/ABOG → sedeId: X + responsableId: Y (solo sus casos)
 */
export const sedeMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    return;
  }

  const { rol, sedeId, userId } = req.user;

  let filter: SedeFilter;

  if (rol === Rol.ADMIN_NACIONAL) {
    // Ve absolutamente todo el sistema
    filter = { sedeId: null, responsableId: null };
  } else if (ROLES_SEDE_COMPLETA.includes(rol)) {
    // Ve todos los registros de su sede
    filter = { sedeId, responsableId: null };
  } else if (ROLES_CAMPO.includes(rol)) {
    // Solo ve los registros donde es responsable, dentro de su sede
    filter = { sedeId, responsableId: userId };
  } else {
    filter = { sedeId, responsableId: userId };
  }

  req.sedeFilter = filter;
  next();
};
