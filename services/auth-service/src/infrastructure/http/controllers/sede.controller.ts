import { Request, Response, NextFunction } from 'express';
import { ok } from '@sec/shared';
import { ISedeRepository } from '../../../domain/repositories/ISedeRepository';

export class SedeController {
  constructor(private readonly sedeRepo: ISedeRepository) {}

  /** GET /api/sedes — lista todas las sedes activas */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sedes = await this.sedeRepo.findAll();
      res.json(ok(sedes));
    } catch (error) {
      next(error);
    }
  };

  /** GET /api/sedes/mi-sede — devuelve la sede del usuario autenticado */
  miSede = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sedeId } = req.user!;
      const sede = await this.sedeRepo.findById(sedeId);
      res.json(ok(sede));
    } catch (error) {
      next(error);
    }
  };
}
