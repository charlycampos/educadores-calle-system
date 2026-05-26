import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

/**
 * Manejador global de errores.
 * Se registra al final de todos los middlewares en cada microservicio.
 * Convierte AppErrors en respuestas HTTP estructuradas.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
    return;
  }

  // Error inesperado — no exponer detalles internos
  console.error('[ERROR NO CONTROLADO]', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
};
