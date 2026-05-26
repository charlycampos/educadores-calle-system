import { Router } from 'express';
import { authMiddleware, sedeMiddleware, roleMiddleware, Rol } from '@sec/shared';
import { UsuarioController } from '../controllers/usuario.controller';

export const createUsuarioRouter = (controller: UsuarioController): Router => {
  const router = Router();

  // Todas las rutas requieren autenticación
  router.use(authMiddleware, sedeMiddleware);

  // GET /api/usuarios
  router.get('/', controller.listar);

  // POST /api/usuarios — solo ADMIN y COORDINADOR
  router.post(
    '/',
    roleMiddleware([Rol.ADMIN_NACIONAL, Rol.ADMIN_SEDE, Rol.COORDINADOR]),
    controller.crear,
  );

  // PUT /api/usuarios/:id/desactivar — solo ADMIN y COORDINADOR
  router.put(
    '/:id/desactivar',
    roleMiddleware([Rol.ADMIN_NACIONAL, Rol.ADMIN_SEDE, Rol.COORDINADOR]),
    controller.desactivar,
  );

  // PUT /api/usuarios/:id — solo ADMIN y COORDINADOR
  router.put(
    '/:id',
    roleMiddleware([Rol.ADMIN_NACIONAL, Rol.ADMIN_SEDE, Rol.COORDINADOR]),
    controller.actualizar,
  );

  return router;
};
