/**
 * Diagnóstico TypeORM + Oracle — comprueba si findByEmail funciona correctamente.
 * Ejecutar: node scripts/debug_typeorm.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('reflect-metadata');

const { DataSource } = require('typeorm');
const path = require('path');

// Registrar ts-node para poder importar entidades TypeScript
require('ts-node').register({ transpileOnly: true });

const { SedeEntity }    = require('../src/infrastructure/db/entities/SedeEntity');
const { RolEntity }     = require('../src/infrastructure/db/entities/RolEntity');
const { UsuarioEntity } = require('../src/infrastructure/db/entities/UsuarioEntity');

const ds = new DataSource({
  type:        'oracle',
  host:        process.env.ORACLE_HOST     || 'localhost',
  port:        Number(process.env.ORACLE_PORT) || 1521,
  username:    process.env.ORACLE_USER,
  password:    process.env.ORACLE_PASSWORD,
  serviceName: process.env.ORACLE_SERVICE,
  synchronize: false,
  logging:     true,
  entities:    [SedeEntity, RolEntity, UsuarioEntity],
});

(async () => {
  await ds.initialize();
  console.log('\n✅ DataSource conectado');

  const repo = ds.getRepository(UsuarioEntity);

  console.log('\n🔍 Buscando usuario sin relaciones...');
  const sinRel = await repo.findOne({ where: { email: 'admin@inabif.gob.pe' } });
  console.log('Resultado sin relaciones:', sinRel ? `ID=${sinRel.id}, hash=${sinRel.passwordHash?.substring(0,20)}...` : 'NULL');

  console.log('\n🔍 Buscando usuario CON relaciones...');
  const conRel = await repo.findOne({
    where: { email: 'admin@inabif.gob.pe' },
    relations: ['rol', 'sede'],
  });
  console.log('Resultado con relaciones:', conRel ? `ID=${conRel.id}, rol=${conRel.rol?.nombre}, sede=${conRel.sede?.codigo}` : 'NULL');

  await ds.destroy();
})().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
