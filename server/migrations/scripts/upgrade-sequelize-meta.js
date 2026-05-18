#!/usr/bin/env node

/**
 * UPGRADE SEQUELIZE META
 * Actualiza la tabla SequelizeMeta de básica a extendida
 * para tenants existentes que solo tienen la estructura básica
 */

process.env.SKIP_AUTO_MIGRATIONS = 'true';

const { conexionDB } = require('../../config/db');

function showHelp() {
  console.log(`
🔧 UPGRADE SEQUELIZE META
==========================

Actualiza la tabla SequelizeMeta de básica a extendida para tenants existentes.

💡 USO:
  node migrations/scripts/upgrade-sequelize-meta.js <tenant>

📋 PARÁMETROS:
  tenant     Nombre del tenant a actualizar

🎯 EJEMPLOS:
  node migrations/scripts/upgrade-sequelize-meta.js demo
  node migrations/scripts/upgrade-sequelize-meta.js cliente-existente

⚠️  IMPORTANTE:
  - Solo usar para tenants que YA TIENEN tabla SequelizeMeta básica
  - Para nuevos tenants usar: init-new-tenant.js
  - Este script es SEGURO y no afecta datos existentes

📖 MÁS INFO:
  Ver README-MIGRACIONES.md sección "Tabla SequelizeMeta"
`);
}

/**
 * Actualiza tabla SequelizeMeta existente de básica a extendida
 */
async function upgradeSequelizeMeta(sequelize, tenant) {
  try {
    console.log(`🔧 Actualizando tabla SequelizeMeta para tenant: ${tenant}`);
    
    // Verificar si la tabla existe
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'SequelizeMeta' 
      AND table_schema = 'public'
    `);
    
    if (tables.length === 0) {
      console.log(`❌ Tabla SequelizeMeta no existe para tenant: ${tenant}`);
      console.log(`💡 Para nuevos tenants usar: init-new-tenant.js`);
      return false;
    }
    
    console.log(`✅ Tabla SequelizeMeta encontrada`);
    
    // Verificar columnas existentes
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SequelizeMeta' 
      AND table_schema = 'public'
    `);
    
    const existingColumns = columns.map(row => row.column_name);
    console.log(`📋 Columnas existentes: ${existingColumns.join(', ')}`);
    
    let upgrades = 0;
    
    // Agregar columnas faltantes
    if (!existingColumns.includes('appliedAt')) {
      console.log(`🔧 Agregando columna appliedAt...`);
      await sequelize.query(`
        ALTER TABLE "SequelizeMeta" 
        ADD COLUMN "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      `);
      console.log(`✅ Agregada columna appliedAt`);
      upgrades++;
    }
    
    if (!existingColumns.includes('executionTime')) {
      console.log(`🔧 Agregando columna executionTime...`);
      await sequelize.query(`
        ALTER TABLE "SequelizeMeta" 
        ADD COLUMN "executionTime" INTEGER DEFAULT 0
      `);
      console.log(`✅ Agregada columna executionTime`);
      upgrades++;
    }
    
    if (!existingColumns.includes('sqlCommands')) {
      console.log(`🔧 Agregando columna sqlCommands...`);
      await sequelize.query(`
        ALTER TABLE "SequelizeMeta" 
        ADD COLUMN "sqlCommands" TEXT DEFAULT '[]'
      `);
      console.log(`✅ Agregada columna sqlCommands`);
      upgrades++;
    }
    
    if (!existingColumns.includes('type')) {
      console.log(`🔧 Agregando columna type...`);
      await sequelize.query(`
        ALTER TABLE "SequelizeMeta" 
        ADD COLUMN "type" VARCHAR(1) DEFAULT 'M' CHECK ("type" IN ('M', 'S'))
      `);
      console.log(`✅ Agregada columna type (M=migración, S=simulación)`);
      upgrades++;
    }
    
    if (upgrades === 0) {
      console.log(`✅ Tabla SequelizeMeta ya está actualizada (estructura extendida)`);
      return true;
    }
    
    // Actualizar registros existentes con valores por defecto
    console.log(`🔧 Actualizando registros existentes...`);
    await sequelize.query(`
      UPDATE "SequelizeMeta" 
      SET 
        "appliedAt" = CURRENT_TIMESTAMP,
        "executionTime" = 0,
        "sqlCommands" = '[]',
        "type" = 'M'
      WHERE "appliedAt" IS NULL OR "type" IS NULL
    `);
    
    console.log(`✅ Tabla SequelizeMeta actualizada exitosamente`);
    console.log(`📊 Upgrades aplicados: ${upgrades}`);
    
    // Mostrar estructura final
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'SequelizeMeta' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n📋 ESTRUCTURA FINAL:`);
    finalColumns.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error actualizando SequelizeMeta:`, error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tenant = args[0];
  
  if (!tenant || tenant === '--help' || tenant === '-h') {
    showHelp();
    process.exit(0);
  }
  
  console.log(`🔧 UPGRADE SEQUELIZE META`);
  console.log(`==========================`);
  console.log(`📋 Tenant: ${tenant}`);
  console.log(`==========================\n`);
  
  try {
    // Conectar a la base de datos
    console.log(`🔌 Conectando al tenant: ${tenant}...`);
    const sequelize = await conexionDB(tenant, 'upgrade-sequelize-meta');
    console.log(`✅ Conexión establecida\n`);
    
    // Actualizar SequelizeMeta
    const success = await upgradeSequelizeMeta(sequelize, tenant);
    
    if (success) {
      console.log(`\n🎉 ACTUALIZACIÓN COMPLETADA`);
      console.log(`============================`);
      console.log(`✅ Tenant: ${tenant}`);
      console.log(`✅ Tabla SequelizeMeta actualizada a versión extendida`);
      console.log(`💡 Ahora el tenant tiene acceso completo a metadatos de migraciones`);
    } else {
      console.log(`\n⚠️  ACTUALIZACIÓN NO NECESARIA`);
      console.log(`===============================`);
      console.log(`ℹ️  La tabla ya estaba actualizada o no existe`);
    }
    
  } catch (error) {
    console.error(`\n❌ ERROR EN ACTUALIZACIÓN`);
    console.error(`==========================`);
    console.error(`❌ Tenant: ${tenant}`);
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { upgradeSequelizeMeta };

