import { Request, Response, NextFunction } from 'express';
import { Rol, ok, NotFoundError } from '@sec/shared';
import { CrearUsuarioUseCase } from '../../../domain/use-cases/CrearUsuarioUseCase';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';

export class UsuarioController {
  constructor(
    private readonly crearUsuarioUseCase: CrearUsuarioUseCase,
    private readonly usuarioRepo:         IUsuarioRepository,
  ) {}

  /** GET /api/usuarios — lista usuarios de la sede del solicitante */
  listar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sedeFilter } = req;
      let usuarios;

      if (!sedeFilter?.sedeId) {
        usuarios = await this.usuarioRepo.findAll(); // ADMIN_NACIONAL
      } else {
        usuarios = await this.usuarioRepo.findBySede(sedeFilter.sedeId);
      }

      const data = usuarios.map(u => ({
        id:             u.id,
        nombreCompleto: u.nombreCompleto,
        email:          u.email,
        rol:            u.rol,
        sedeId:         u.sedeId,
        sedeCodigo:     u.sedeCodigo,
        zonaAsignada:   u.zonaAsignada,
        activo:         u.estaActivo(),
      }));

      res.json(ok(data));
    } catch (error) {
      next(error);
    }
  };

  /** POST /api/usuarios — crea un nuevo usuario */
  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombreCompleto, email, password, rol, sedeId, zonaAsignada } = req.body;
      const creadoPorId = req.user!.userId;

      const creadoPor = await this.usuarioRepo.findById(creadoPorId);
      if (!creadoPor) throw new NotFoundError('Usuario creador');

      const nuevo = await this.crearUsuarioUseCase.execute({
        nombreCompleto,
        email,
        password,
        rol: rol as Rol,
        sedeId: Number(sedeId),
        zonaAsignada,
        creadoPor,
      });

      res.status(201).json(ok({
        id:             nuevo.id,
        nombreCompleto: nuevo.nombreCompleto,
        email:          nuevo.email,
        rol:            nuevo.rol,
        sedeId:         nuevo.sedeId,
      }, 'Usuario creado exitosamente'));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /api/usuarios/:id/desactivar */
  desactivar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      await this.usuarioRepo.update(id, { activo: false });
      res.json(ok(null, 'Usuario desactivado'));
    } catch (error) {
      next(error);
    }
  };

  /** PUT /api/usuarios/:id — actualiza datos del usuario */
  actualizar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = Number(req.params.id);
      const { nombreCompleto, rol, rolId, zonaAsignada, activo } = req.body;

      const actualizado = await this.usuarioRepo.update(id, {
        nombreCompleto,
        rol: rol as Rol,
        rolId: rolId ? Number(rolId) : undefined,
        zonaAsignada,
        activo: activo !== undefined ? Boolean(activo) : undefined
      });

      res.json(ok({
        id:             actualizado.id,
        nombreCompleto: actualizado.nombreCompleto,
        email:          actualizado.email,
        rol:            actualizado.rol,
        sedeId:         actualizado.sedeId,
        zonaAsignada:   actualizado.zonaAsignada,
        activo:         actualizado.estaActivo(),
      }, 'Usuario actualizado correctamente'));
    } catch (error) {
      next(error);
    }
  };
}
