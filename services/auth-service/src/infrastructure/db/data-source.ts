import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { SedeEntity }    from './entities/SedeEntity';
import { RolEntity }     from './entities/RolEntity';
import { UsuarioEntity } from './entities/UsuarioEntity';

/**
 * Configuración de conexión TypeORM con Oracle.
 *
 * Variables de entorno requeridas (.env):
 *   ORACLE_HOST      → IP o hostname del servidor Oracle de OGTI
 *   ORACLE_PORT      → Puerto (por defecto 1521)
 *   ORACLE_USER      → Usuario de la base de datos
 *   ORACLE_PASSWORD  → Contraseña
 *   ORACLE_SERVICE   → Service name (recomendado sobre SID en Oracle 12c+)
 *   ORACLE_SID       → SID alternativo si no se usa SERVICE
 *
 * Modo de conexión con oracledb:
 *   TypeORM usa el driver oficial 'oracledb' de Oracle Corporation.
 *   Requiere Oracle Instant Client instalado en el servidor.
 *   Instrucciones: https://oracle.github.io/node-oracledb/INSTALL.html
 */
export const AppDataSource = new DataSource({
  type:        'oracle',
  host:        process.env.ORACLE_HOST     || 'localhost',
  port:        Number(process.env.ORACLE_PORT) || 1521,
  username:    process.env.ORACLE_USER     || 'sec_user',
  password:    process.env.ORACLE_PASSWORD || 'cambiar_en_produccion',
  // Usar serviceName para Oracle 12c+ (preferido sobre SID)
  serviceName: process.env.ORACLE_SERVICE  || undefined,
  sid:         process.env.ORACLE_SID      || undefined,
  synchronize: false,   // NUNCA true en producción — usar scripts SQL
  logging:     process.env.NODE_ENV === 'development',
  entities:    [SedeEntity, RolEntity, UsuarioEntity],
  // Oracle necesita que los nombres de tabla estén en MAYÚSCULAS
  // por eso las entidades usan @Entity('SEC_SEDE'), etc.
});
