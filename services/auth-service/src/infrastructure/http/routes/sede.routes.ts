import { Router } from 'express';
import { authMiddleware } from '@sec/shared';
import { SedeController } from '../controllers/sede.controller';

export const createSedeRouter = (controller: SedeController): Router => {
  const router = Router();

  router.use(authMiddleware);

  // GET /api/sedes
  router.get('/', controller.listar);

  // GET /api/sedes/mi-sede
  router.get('/mi-sede', controller.miSede);

  return router;
};
