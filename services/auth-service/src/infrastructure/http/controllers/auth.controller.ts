import { Request, Response, NextFunction } from 'express';
import { ok } from '@sec/shared';
import { LoginUseCase } from '../../../domain/use-cases/LoginUseCase';

/**
 * Controller de autenticación.
 * Solo maneja HTTP: extrae datos del request, llama al caso de uso, formatea la respuesta.
 * Nunca contiene lógica de negocio.
 */
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
        return;
      }

      const result = await this.loginUseCase.execute({ email, password });

      res.json(ok(result, 'Login exitoso'));
    } catch (error) {
      next(error); // El errorHandler lo convierte en respuesta HTTP
    }
  };
}
