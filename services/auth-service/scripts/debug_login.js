/**
 * Diagnóstico del login — ejecutar con:
 *   node scripts/debug_login.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const oracledb  = require('oracledb');
const bcryptjs  = require('../node_modules/bcryptjs');

const EMAIL    = 'admin@inabif.gob.pe';
const PASSWORD = 'Admin2026*';

(async () => {
  const c = await oracledb.getConnection({
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE}`,
  });

  console.log(`\n🔌 Conectado como: ${process.env.ORACLE_USER}`);

  // 1. Verificar que el usuario existe
  const r = await c.execute(
    `SELECT id, email, password_hash, activo FROM SEC_USUARIO WHERE email = :1`,
    [EMAIL],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (r.rows.length === 0) {
    console.log(`❌ Usuario '${EMAIL}' NO existe en la tabla SEC_USUARIO`);
    console.log('   Verifica que la migración corrió con el usuario correcto');
    await c.close();
    return;
  }

  const row = r.rows[0];
  console.log(`\n✅ Usuario encontrado:`);
  console.log(`   ID:     ${row.ID}`);
  console.log(`   Email:  ${row.EMAIL}`);
  console.log(`   Activo: ${row.ACTIVO}`);
  console.log(`   Hash:   ${row.PASSWORD_HASH}`);

  // 2. Verificar bcrypt
  const match = await bcryptjs.compare(PASSWORD, row.PASSWORD_HASH);
  console.log(`\n${match ? '✅' : '❌'} bcrypt.compare('${PASSWORD}', hash) → ${match}`);

  if (!match) {
    // Generar hash correcto para referencia
    const nuevoHash = await bcryptjs.hash(PASSWORD, 10);
    console.log(`\n   Hash correcto para '${PASSWORD}':`);
    console.log(`   ${nuevoHash}`);
    console.log(`\n   Actualizando automáticamente...`);
    await c.execute(
      `UPDATE SEC_USUARIO SET password_hash = :1 WHERE email = :2`,
      [nuevoHash, EMAIL]
    );
    await c.commit();
    console.log(`✅ Password corregida en BD`);
  }

  await c.close();
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
