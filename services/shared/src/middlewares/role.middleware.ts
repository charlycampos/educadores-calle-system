import { Request, Response, NextFunction } from 'express';
import { Rol } from '../types/roles.types';

/**
 * Middleware de autorización por rol.
 * Se usa después de authMiddleware para proteger rutas específicas.
 *
 * Ejemplo de uso:
 *   router.post('/usuarios', authMiddleware, roleMiddleware([Rol.ADMIN_NACIONAL, Rol.COORDINADOR]), ...)
 */
export const roleMiddleware = (rolesPermitidos: Rol[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a este recurso',
      });
      return;
    }

    next();
  };
};
