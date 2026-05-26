import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', controller.login);

  return router;
};
