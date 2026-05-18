#!/usr/bin/env node
const readline = require('readline');
const { conexionDB } = require('../../config/db');
const { rollbackLastMigration, getMigrationStatus } = require('../services/migrationService');

async function rollbackMigration(tenantName, confirm = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log(`🔄 ROLLBACK DE MIGRACIONES`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📋 Tenant: ${tenantName}`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Conectar sin ejecutar migraciones automáticas
    const originalSkip = process.env.SKIP_AUTO_MIGRATIONS;
    process.env.SKIP_AUTO_MIGRATIONS = 'true';
    
    const sequelize = await conexionDB(tenantName, 'admin');
    
    // Restaurar configuración
    process.env.SKIP_AUTO_MIGRATIONS = originalSkip;
    
    // Verificar estado actual
    const status = await getMigrationStatus(sequelize, tenantName);
    
    if (status.executed.length === 0) {
      console.log('✅ No hay migraciones para revertir\n');
      return;
    }
    
    const lastMigration = status.executed[status.executed.length - 1];
    
    console.log(`⚠️  ADVERTENCIA: Se revertirá la última migración aplicada`);
    console.log(`📋 Migración a revertir: ${lastMigration}`);
    console.log(`📊 Migraciones aplicadas: ${status.executed.length}`);
    console.log(`⏳ Migraciones pendientes: ${status.pending.length}\n`);
    
    // Confirmar si no se especificó --confirm
    if (!confirm) {
      const shouldProceed = await new Promise(resolve => {
        rl.question('❓ ¿Confirmar rollback? (escriba "CONFIRMAR" para continuar): ', answer => {
          resolve(answer === 'CONFIRMAR');
        });
      });
      
      if (!shouldProceed) {
        console.log('❌ Rollback cancelado por el usuario\n');
        return;
      }
    }
    
    console.log('\n🔄 Ejecutando rollback...\n');
    
    // Ejecutar rollback
    const result = await rollbackLastMigration(sequelize, tenantName);
    
    if (result.reverted === 0) {
      console.log('✅ No había migraciones para revertir');
    } else {
      console.log(`✅ Rollback completado exitosamente`);
      console.log(`📋 Migración revertida: ${result.migration}`);
      
      // Mostrar estado actualizado
      const newStatus = await getMigrationStatus(sequelize, tenantName);
      console.log(`\n📊 ESTADO ACTUALIZADO:`);
      console.log(`✅ Migraciones aplicadas: ${newStatus.executed.length}`);
      console.log(`⏳ Migraciones pendientes: ${newStatus.pending.length}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error ejecutando rollback:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Manejo de argumentos de línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔄 HERRAMIENTA DE ROLLBACK DE MIGRACIONES

📋 Uso:
  node migration-rollback.js <tenant> [--confirm]

📋 Ejemplos:
  node migration-rollback.js conecta           # Rollback con confirmación interactiva
  node migration-rollback.js conecta --confirm # Rollback sin confirmación

📋 Flags:
  --confirm     Ejecutar rollback sin confirmación interactiva
  --help, -h    Mostrar esta ayuda

⚠️  ADVERTENCIA:
  - Solo revierte la ÚLTIMA migración aplicada
  - Esta operación puede ser destructiva
  - Asegúrate de tener backup antes de proceder
`);
    process.exit(0);
  }
  
  const tenantName = args[0];
  const confirm = args.includes('--confirm');
  
  rollbackMigration(tenantName, confirm)
    .then(() => {
      console.log('\n✅ Operación completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Operación falló:', error.message);
      process.exit(1);
    });
}

module.exports = { rollbackMigration };
