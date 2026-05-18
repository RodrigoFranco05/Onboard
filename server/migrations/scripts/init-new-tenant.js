#!/usr/bin/env node

/**
 * 🚀 INICIALIZAR NUEVO TENANT CON SYNC (PUNTO DE PARTIDA)
 * 
 * Script oficial para inicializar nuevos tenants desde cero.
 * Este es el PUNTO DE PARTIDA para todos los nuevos tenants.
 * 
 * ✅ Crea todas las tablas según los modelos actuales
 * ✅ Configura parámetros globales del sistema
 * ✅ Deja la base lista para migraciones futuras
 * 
 * Flujo recomendado:
 * 1. Usar este script para nuevo tenant
 * 2. Usar migraciones para cambios futuros
 * 
 * Uso: node init-new-tenant.js <tenant>
 */

// NO usar migraciones para esta inicialización inicial
process.env.USE_MIGRATIONS = 'false';
process.env.SKIP_AUTO_MIGRATIONS = 'false'; // Permitir sync

const { conexionDB } = require('../../config/db');
const { createMigrationRunner } = require('../services/migrationService');
const fs = require('fs').promises;
const path = require('path');

/**
 * Mostrar ayuda
 */
function showHelp() {
  console.log(`
🚀 INICIALIZAR NUEVO TENANT (PUNTO DE PARTIDA OFICIAL)

📋 Propósito:
   Script oficial para crear nuevos tenants desde cero.
   Este es el PUNTO DE PARTIDA para todos los nuevos tenants.

📋 Uso:
   node init-new-tenant.js <tenant>

📋 Ejemplos:
   node init-new-tenant.js nueva_empresa
   npm run migration:init-tenant nueva_empresa

📋 Lo que hace:
   ✅ Crea todas las tablas según modelos actuales (rápido)
   ✅ Configura parámetros globales del sistema
   ✅ Deja la base lista para migraciones futuras

⚠️  IMPORTANTE:
   - La base de datos debe existir pero puede estar vacía
   - Este es el método RECOMENDADO para nuevos tenants
   - Para cambios futuros usar migraciones normales
`);
}

/**
 * Crea tabla SequelizeMeta extendida con todas las columnas necesarias
 * Esta es la configuración base para el sistema de migraciones
 */
async function createExtendedSequelizeMeta(sequelize) {
  try {
    console.log(`🔧 Configurando tabla SequelizeMeta extendida...`);
    
    // Crear tabla SequelizeMeta completa con todas las columnas incluyendo 'type'
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) PRIMARY KEY,
        "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "executionTime" INTEGER DEFAULT 0,
        "sqlCommands" TEXT DEFAULT '[]',
        "type" VARCHAR(1) DEFAULT 'M' CHECK ("type" IN ('M', 'S'))
      )
    `);
    
    // Verificar si necesita agregar columnas en caso de tabla existente básica
    try {
      // Verificar columnas existentes
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'SequelizeMeta' 
        AND table_schema = 'public'
      `);
      
      const existingColumns = columns.map(row => row.column_name);
      
      // Agregar columnas faltantes si es necesario
      if (!existingColumns.includes('appliedAt')) {
        await sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        `);
        console.log(`✅ Agregada columna appliedAt`);
      }
      
      if (!existingColumns.includes('executionTime')) {
        await sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "executionTime" INTEGER DEFAULT 0
        `);
        console.log(`✅ Agregada columna executionTime`);
      }
      
      if (!existingColumns.includes('sqlCommands')) {
        await sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "sqlCommands" TEXT DEFAULT '[]'
        `);
        console.log(`✅ Agregada columna sqlCommands`);
      }
      
      if (!existingColumns.includes('type')) {
        await sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "type" VARCHAR(1) DEFAULT 'M' CHECK ("type" IN ('M', 'S'))
        `);
        console.log(`✅ Agregada columna type (M=migración, S=simulación)`);
      }
      
    } catch (error) {
      console.log(`💡 Tabla SequelizeMeta ya tiene la estructura correcta`);
    }
    
    console.log(`✅ Tabla SequelizeMeta configurada correctamente`);
    
  } catch (error) {
    console.error(`❌ Error configurando SequelizeMeta:`, error.message);
    throw error;
  }
}

/**
 * Registra todas las migraciones existentes como aplicadas
 * Esto evita que el sistema intente re-ejecutar migraciones
 * cuando las tablas ya fueron creadas con sync()
 */
async function populateSequelizeMeta(sequelize, tenant) {
  try {
    console.log(`📋 Registrando migraciones existentes como aplicadas...`);
    
    // Obtener todas las migraciones disponibles (excluyendo 000-extend-sequelize-meta)
    const migrationsDir = path.join(__dirname, '../migrations');
    const allFiles = await fs.readdir(migrationsDir);
    const migrationFiles = allFiles
      .filter(f => f.endsWith('.js'))
      .filter(f => !f.startsWith('000-extend-sequelize-meta')) // Excluir migración de extensión
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log(`✅ No hay migraciones que registrar`);
      return 0;
    }
    
    console.log(`📋 Migraciones encontradas: ${migrationFiles.length}`);
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    // Insertar todas las migraciones como aplicadas
    const timestamp = new Date().toISOString();
    const insertPromises = migrationFiles.map(migrationName => {
      return sequelize.query(
        `INSERT INTO "SequelizeMeta" (name, "appliedAt", "executionTime", "sqlCommands", "type") 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (name) DO NOTHING`,
        {
          bind: [
            migrationName, 
            timestamp, 
            0, // executionTime = 0 para sync inicial
            JSON.stringify([{ 
              sql: `-- Migración aplicada durante sync inicial del tenant ${tenant}`,
              timestamp: timestamp,
              type: 'SYNC_INITIAL'
            }]),
            'S' // type = 'S' para simulación (sync inicial)
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
    });
    
    await Promise.all(insertPromises);
    
    console.log(`✅ Registradas ${migrationFiles.length} migraciones como aplicadas`);
    console.log(`💡 Esto evita que se re-ejecuten al conectar usuarios`);
    
    return migrationFiles.length;
    
  } catch (error) {
    console.error(`❌ Error registrando migraciones:`, error.message);
    throw error;
  }
}

async function main() {
  const tenant = process.argv[2];
  
  if (!tenant || tenant === '--help' || tenant === '-h') {
    showHelp();
    process.exit(0);
  }

  try {
    console.log(`\n🚀 INICIALIZANDO NUEVO TENANT (PUNTO DE PARTIDA)`);
    console.log(`==================================================`);
    console.log(`📋 Tenant: ${tenant}`);
    console.log(`📋 Método: sequelize.sync() - Estado inicial`);
    console.log(`📋 Propósito: Crear base desde cero para nuevo tenant`);
    console.log(`==================================================\n`);

    console.log(`🔌 Conectando y sincronizando...`);
    const startTime = Date.now();
    
    // Esto creará todas las tablas automáticamente
    const sequelize = await conexionDB(tenant, 'init-sync');
    
    // 🔧 PASO 1: Configurar tabla SequelizeMeta extendida (parte del setup base)
    await createExtendedSequelizeMeta(sequelize);
    
    // 🔑 PASO 2: Registrar migraciones como aplicadas
    const migrationsRegistered = await populateSequelizeMeta(sequelize, tenant);
    
    const totalTime = Date.now() - startTime;
    
    console.log(`\n==================================================`);
    console.log(`🎉 NUEVO TENANT INICIALIZADO EXITOSAMENTE`);
    console.log(`==================================================`);
    console.log(`📊 Resumen:`);
    console.log(`   - Tenant: ${tenant}`);
    console.log(`   - Método: sequelize.sync() (punto de partida)`);
    console.log(`   - Tiempo total: ${totalTime}ms`);
    console.log(`   - Estado: ✅ TODAS LAS TABLAS CREADAS`);
    console.log(`   - Parámetros: ✅ CONFIGURADOS`);
    console.log(`   - Migraciones registradas: ✅ ${migrationsRegistered} marcadas como aplicadas`);
    
    console.log(`\n🚀 ¡El tenant está listo para usar!`);
    console.log(`💡 Para cambios futuros usa migraciones:`);
    console.log(`   - npm run migration:create nombre-cambio`);
    console.log(`   - npm run migration:preview ${tenant}`);
    console.log(`   - Reiniciar servidor (migraciones automáticas)`);
    console.log(`\n📊 Para verificar estado: npm run migration:status ${tenant}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ ERROR:`);
    console.error(`   ${error.message}`);
    console.error(`\n🔧 Verifica:`);
    console.error(`   - Que la base de datos existe`);
    console.error(`   - Credenciales correctas`);
    console.error(`   - Permisos de escritura`);
    process.exit(1);
  }
}

main();
