import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/jwt.types';
import { UnauthorizedError } from '../errors/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_cambiar_en_produccion';

/**
 * Middleware de autenticación compartido.
 * Verifica el JWT en el header Authorization y adjunta el payload en req.user.
 * Usado por todos los microservicios.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    if (!token) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, message: 'Token expirado' });
    } else {
      res.status(401).json({ success: false, message: 'Token inválido' });
    }
  }
};

/** Genera un JWT con el payload del usuario */
export const generarToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
};
