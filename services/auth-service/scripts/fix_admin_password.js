/**
 * Script puntual: corrige el password_hash del admin inicial.
 * Ejecutar UNA sola vez: node scripts/fix_admin_password.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const oracledb = require('oracledb');

const HASH = '$2b$10$XtNVAJsX2M7rkUqmRYh1A.OuEnimyxoDWPFz7QS4gSHZ6UT7fyd02';

(async () => {
  const c = await oracledb.getConnection({
    user:          process.env.ORACLE_USER,
    password:      process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE}`,
  });

  const result = await c.execute(
    `UPDATE SEC_USUARIO SET password_hash = :1 WHERE email = 'admin@inabif.gob.pe'`,
    [HASH]
  );
  await c.commit();
  console.log(`✅ Password actualizada (${result.rowsAffected} fila afectada)`);
  await c.close();
})().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
