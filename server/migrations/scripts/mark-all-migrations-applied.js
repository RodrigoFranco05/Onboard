#!/usr/bin/env node

/**
 * 🏷️  MARK-ALL-MIGRATIONS-APPLIED
 *
 * Marca todas las migraciones del directorio como ya aplicadas en la tabla
 * SequelizeMeta del tenant, SIN ejecutarlas.
 *
 * CASO DE USO:
 *   Importaste un dump de DB entre ambientes (ej. local → nube) y la tabla
 *   SequelizeMeta quedó desactualizada respecto al filesystem de migraciones.
 *   El esquema físico está al día (porque vino en el dump) pero el sistema
 *   detecta migraciones "pendientes" al iniciar sesión y falla.
 *
 * QUÉ HACE:
 *   1. Conecta al tenant SIN correr migraciones automáticas (SKIP_AUTO_MIGRATIONS=true).
 *   2. Asegura que SequelizeMeta existe y está en su versión extendida.
 *   3. Inserta en SequelizeMeta todas las migraciones del filesystem con
 *      type='S' (sync/simulación) y ON CONFLICT DO NOTHING — idempotente.
 *
 * QUÉ NO HACE:
 *   - No ejecuta el SQL de las migraciones.
 *   - No toca el schema de la base (no hay CREATE/ALTER/DROP).
 *   - No toca filas ya presentes en SequelizeMeta.
 */

process.env.SKIP_AUTO_MIGRATIONS = 'true';

const path = require('path');
const fs = require('fs').promises;
const { conexionDB } = require('../../config/db');
const { SequelizeMetaService } = require('../services/sequelizeMetaService');

function showHelp() {
  console.log(`
🏷️  MARK-ALL-MIGRATIONS-APPLIED
================================

Marca todas las migraciones del filesystem como aplicadas en SequelizeMeta
sin ejecutarlas. Útil después de importar un dump entre ambientes.

💡 USO:
  node migrations/scripts/mark-all-migrations-applied.js <tenant>

📋 PARÁMETROS:
  tenant     Nombre del tenant / base de datos

🎯 EJEMPLOS:
  node migrations/scripts/mark-all-migrations-applied.js selectShopMX
  node migrations/scripts/mark-all-migrations-applied.js cliente-prod

⚠️  IMPORTANTE:
  - Usar SOLO cuando el esquema físico ya refleja esas migraciones
    (ej. dump recién importado con todas las tablas al día).
  - Idempotente: ON CONFLICT DO NOTHING. Se puede correr varias veces.
  - No ejecuta SQL de migraciones ni modifica el schema.
`);
}

async function markAllAsApplied(sequelize, tenant) {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const allFiles = await fs.readdir(migrationsDir);
  const migrationFiles = allFiles
    .filter(f => f.endsWith('.js'))
    .filter(f => !f.startsWith('000-extend-sequelize-meta'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log(`✅ No hay archivos de migración en el directorio.`);
    return { total: 0, inserted: 0, alreadyApplied: 0 };
  }

  console.log(`📋 Migraciones encontradas en filesystem: ${migrationFiles.length}`);

  const [beforeRows] = await sequelize.query(`SELECT name FROM "SequelizeMeta"`);
  const beforeSet = new Set(beforeRows.map(r => r.name));

  const timestamp = new Date().toISOString();
  const sqlCommandsPayload = JSON.stringify([{
    sql: `-- Migración marcada como aplicada por mark-all-migrations-applied (tenant ${tenant})`,
    timestamp,
    type: 'SYNC_INITIAL',
  }]);

  let inserted = 0;
  for (const name of migrationFiles) {
    const [result] = await sequelize.query(
      `INSERT INTO "SequelizeMeta" (name, "appliedAt", "executionTime", "sqlCommands", "type")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO NOTHING
       RETURNING name`,
      {
        bind: [name, timestamp, 0, sqlCommandsPayload, 'S'],
        type: sequelize.QueryTypes.INSERT,
      }
    );
    if (result && result.length > 0) inserted++;
  }

  const alreadyApplied = migrationFiles.length - inserted;
  return { total: migrationFiles.length, inserted, alreadyApplied, beforeCount: beforeSet.size };
}

async function main() {
  const tenant = process.argv[2];

  if (!tenant || tenant === '--help' || tenant === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    console.log(`\n🏷️  MARCANDO MIGRACIONES COMO APLICADAS`);
    console.log(`==================================================`);
    console.log(`📋 Tenant: ${tenant}`);
    console.log(`📋 Modo: simulación (no ejecuta SQL de migraciones)`);
    console.log(`==================================================\n`);

    const startTime = Date.now();
    const sequelize = await conexionDB(tenant, 'mark-all-applied');

    console.log(`🔍 Verificando tabla SequelizeMeta...`);
    const metaService = new SequelizeMetaService(sequelize, tenant);
    await metaService.ensureSequelizeMetaUpToDate();

    const { total, inserted, alreadyApplied, beforeCount } = await markAllAsApplied(sequelize, tenant);

    const totalTime = Date.now() - startTime;

    console.log(`\n==================================================`);
    console.log(`✅ OPERACIÓN COMPLETADA`);
    console.log(`==================================================`);
    console.log(`   - Tenant:                 ${tenant}`);
    console.log(`   - Archivos en filesystem: ${total}`);
    console.log(`   - Ya aplicadas (antes):   ${beforeCount}`);
    console.log(`   - Recién marcadas:        ${inserted}`);
    console.log(`   - Ya estaban marcadas:    ${alreadyApplied}`);
    console.log(`   - Tiempo total:           ${totalTime}ms`);
    console.log(`\n📊 Verificar estado: node migrations/scripts/migration-status.js ${tenant}`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ ERROR:`);
    console.error(`   ${error.message}`);
    if (error.sql) console.error(`   📝 SQL: ${error.sql}`);
    console.error(`\n🔧 Verificá:`);
    console.error(`   - Que el tenant / base existe`);
    console.error(`   - Credenciales correctas en config/db.js`);
    console.error(`   - Que el esquema ya refleje las migraciones (caso típico: dump importado)`);
    process.exit(1);
  }
}

main();
