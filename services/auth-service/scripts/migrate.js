/**
 * Script de migración Oracle — crea tablas y carga datos iniciales.
 *
 * Ejecutar: node scripts/migrate.js
 *
 * Requiere Oracle Instant Client instalado en el sistema y las
 * variables de entorno en el .env del auth-service:
 *   ORACLE_HOST, ORACLE_PORT, ORACLE_USER, ORACLE_PASSWORD, ORACLE_SERVICE
 *
 * NOTA IMPORTANTE sobre el driver oracledb:
 *   - Los archivos .sql con múltiples sentencias se ejecutan de una en una.
 *   - Los bloques PL/SQL (BEGIN...END;/) se envían completos como una unidad.
 *   - No se puede usar client.query(sql_multi_statement) como en pg.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const oracledb = require('oracledb');
const fs       = require('fs');
const path     = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '../src/infrastructure/db/migrations');

// ── Parsea un archivo .sql y devuelve un array de sentencias individuales ──
// Regla:
//   - Los bloques PL/SQL terminan con "/" en línea propia  → se envían como bloque completo
//   - Las sentencias SQL normales terminan con ";"         → se envían sin el punto y coma
//   - Los comentarios "--" se conservan pero no afectan la lógica
function parseSql(content) {
  const statements = [];
  let buffer = '';
  let inPlsqlBlock = false;

  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // Detectar inicio de bloque PL/SQL (BEGIN standalone o MERGE que puede contener bloques)
    if (/^(BEGIN|DECLARE)\s*$/i.test(trimmed)) {
      inPlsqlBlock = true;
    }

    buffer += line + '\n';

    if (inPlsqlBlock) {
      // El bloque PL/SQL termina con "/" en línea propia
      if (trimmed === '/') {
        const stmt = buffer.trim();
        // Quitar el "/" final antes de enviar
        statements.push(stmt.slice(0, stmt.lastIndexOf('/')).trim());
        buffer = '';
        inPlsqlBlock = false;
      }
    } else {
      // Sentencia SQL normal: termina con ";"
      if (trimmed.endsWith(';') && !trimmed.startsWith('--')) {
        // Para MERGE y sentencias DML: quitar el ";" al enviar a oracledb
        const stmt = buffer.trim();
        statements.push(stmt.endsWith(';') ? stmt.slice(0, -1).trim() : stmt);
        buffer = '';
      }
    }
  }

  // Si quedó algo en buffer que no sea solo whitespace/comentarios
  const remaining = buffer.trim().replace(/--.*$/gm, '').trim();
  if (remaining) {
    statements.push(remaining);
  }

  // Filtrar sentencias vacías o solo comentarios
  return statements.filter(s => {
    const clean = s.replace(/--.*$/gm, '').trim();
    return clean.length > 0;
  });
}

async function migrate() {
  let connection;

  // Configuración de conexión
  const dbConfig = {
    user:         process.env.ORACLE_USER     || 'sec_user',
    password:     process.env.ORACLE_PASSWORD || 'cambiar_en_produccion',
    connectString: process.env.ORACLE_SERVICE
      ? `${process.env.ORACLE_HOST || 'localhost'}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE}`
      : `${process.env.ORACLE_HOST || 'localhost'}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SID || 'XE'}`,
  };

  console.log(`🔌 Conectando a Oracle: ${dbConfig.connectString}`);

  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log('✅ Conectado a Oracle');

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const statements = parseSql(content);

      console.log(`\n⏳ Ejecutando: ${file} (${statements.length} sentencias)`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        // Saltar COMMIT — lo manejamos nosotros
        if (stmt.trim().toUpperCase() === 'COMMIT') {
          await connection.commit();
          continue;
        }
        try {
          await connection.execute(stmt, [], { autoCommit: false });
        } catch (err) {
          // ORA-00955: objeto ya existe → ignorar (idempotencia en DDL)
          if (err.errorNum === 955) {
            // ya manejado por BEGIN/EXCEPTION en los scripts
          } else {
            console.error(`  ❌ Error en sentencia ${i + 1}:`);
            console.error(`     ${stmt.substring(0, 120)}...`);
            throw err;
          }
        }
      }

      await connection.commit();
      console.log(`✅ OK: ${file}`);
    }

    // Verificación final
    const rSedes = await connection.execute('SELECT COUNT(*) AS TOTAL FROM SEC_SEDE');
    const rRoles = await connection.execute('SELECT COUNT(*) AS TOTAL FROM SEC_ROL');
    const rAdmin = await connection.execute("SELECT COUNT(*) AS TOTAL FROM SEC_USUARIO WHERE email = 'admin@inabif.gob.pe'");

    const totalSedes = rSedes.rows[0][0];
    const totalRoles = rRoles.rows[0][0];
    const totalAdmin = rAdmin.rows[0][0];

    console.log('\n📊 Resultado final:');
    console.log(`   Sedes:    ${totalSedes} (esperado: 23)`);
    console.log(`   Roles:    ${totalRoles} (esperado: 7)`);
    console.log(`   Admin:    ${totalAdmin} (esperado: 1)`);
    console.log('\n🎉 Migración Oracle completada exitosamente');

  } catch (err) {
    console.error('\n❌ Error en migración Oracle:', err.message);
    if (err.errorNum) console.error(`   ORA-${err.errorNum}`);
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    process.exit(1);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (_) {}
    }
  }
}

migrate();
