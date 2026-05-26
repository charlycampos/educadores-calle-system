import 'dotenv/config';       // ← debe ser la primera línea, antes de todo
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource }    from './infrastructure/db/data-source';
import { SedeEntity }       from './infrastructure/db/entities/SedeEntity';
import { RolEntity }        from './infrastructure/db/entities/RolEntity';
import { UsuarioEntity }    from './infrastructure/db/entities/UsuarioEntity';
import { OracleSedeRepository }    from './infrastructure/db/repositories/OracleSedeRepository';
import { OracleUsuarioRepository } from './infrastructure/db/repositories/OracleUsuarioRepository';
import { LoginUseCase }            from './domain/use-cases/LoginUseCase';
import { CrearUsuarioUseCase }     from './domain/use-cases/CrearUsuarioUseCase';
import { AuthController }          from './infrastructure/http/controllers/auth.controller';
import { UsuarioController }       from './infrastructure/http/controllers/usuario.controller';
import { SedeController }          from './infrastructure/http/controllers/sede.controller';
import { createAuthRouter }        from './infrastructure/http/routes/auth.routes';
import { createUsuarioRouter }     from './infrastructure/http/routes/usuario.routes';
import { createSedeRouter }        from './infrastructure/http/routes/sede.routes';
import { errorHandler }            from '@sec/shared';

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  // 1. Conectar a la base de datos
  await AppDataSource.initialize();
  console.log('✅ Base de datos conectada');

  // 2. Obtener repositorios TypeORM
  const sedeRepo    = AppDataSource.getRepository(SedeEntity);
  const usuarioRepo = AppDataSource.getRepository(UsuarioEntity);

  // 3. Construir adaptadores (implementaciones de los puertos)
  const sedeRepository    = new OracleSedeRepository(sedeRepo);
  const usuarioRepository = new OracleUsuarioRepository(usuarioRepo);

  // 4. Construir casos de uso (dominio)
  const loginUseCase        = new LoginUseCase(usuarioRepository);
  const crearUsuarioUseCase = new CrearUsuarioUseCase(usuarioRepository, sedeRepository);

  // 5. Construir controllers
  const authController    = new AuthController(loginUseCase);
  const usuarioController = new UsuarioController(crearUsuarioUseCase, usuarioRepository);
  const sedeController    = new SedeController(sedeRepository);

  // 6. Configurar Express
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 7. Registrar rutas
  app.use('/api/auth',     createAuthRouter(authController));
  app.use('/api/usuarios', createUsuarioRouter(usuarioController));
  app.use('/api/sedes',    createSedeRouter(sedeController));

  // 8. Health check
  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', service: 'auth-service', port: PORT });
  });

  // 9. Manejador global de errores (siempre al final)
  app.use(errorHandler);

  // 10. Levantar servidor
  app.listen(PORT, () => {
    console.log(`\n🚀 auth-service corriendo en http://localhost:${PORT}`);
    console.log(`🔑 JWT multi-sede activo`);
    console.log(`🏢 23 sedes disponibles\n`);
  });
}

bootstrap().catch(err => {
  console.error('❌ Error al iniciar auth-service:', err);
  process.exit(1);
});
