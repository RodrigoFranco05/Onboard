#!/usr/bin/env node
const { conexionDB } = require('../../config/db');
const { getMigrationStatus, getMigrationHistory } = require('../services/migrationService');

async function checkMigrationStatus(tenantName, showHistory = false) {
  try {
    console.log(`📊 ESTADO DE MIGRACIONES`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📋 Tenant: ${tenantName}`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Conectar sin ejecutar migraciones automáticas
    const originalSkip = process.env.SKIP_AUTO_MIGRATIONS;
    process.env.SKIP_AUTO_MIGRATIONS = 'true';
    
    const sequelize = await conexionDB(tenantName, 'admin');
    
    // Restaurar configuración
    process.env.SKIP_AUTO_MIGRATIONS = originalSkip;
    
    // Obtener estado
    const status = await getMigrationStatus(sequelize, tenantName);
    
    console.log(`📊 RESUMEN:`);
    console.log(`✅ Migraciones aplicadas: ${status.executed.length}`);
    console.log(`⏳ Migraciones pendientes: ${status.pending.length}`);
    console.log(`🎯 Estado: ${status.isUpToDate ? 'AL DÍA' : 'PENDIENTES'}\n`);
    
    if (status.executed.length > 0) {
      console.log(`✅ MIGRACIONES APLICADAS:`);
      status.executed.forEach((migration, i) => {
        console.log(`   ${i + 1}. ${migration}`);
      });
      console.log('');
    }
    
    if (status.pending.length > 0) {
      console.log(`⏳ MIGRACIONES PENDIENTES:`);
      status.pending.forEach((migration, i) => {
        console.log(`   ${i + 1}. ${migration}`);
      });
      console.log('');
    }
    
    // Mostrar historial si se solicita
    if (showHistory) {
      console.log(`📋 HISTORIAL DETALLADO:`);
      console.log(`${'='.repeat(50)}`);
      
      const history = await getMigrationHistory(sequelize, tenantName);
      
      if (history.length === 0) {
        console.log('No hay historial de migraciones disponible\n');
      } else {
        history.forEach((entry, i) => {
          console.log(`${i + 1}. ${entry.name}`);
          console.log(`   📅 Aplicada: ${new Date(entry.appliedAt).toLocaleString()}`);
          console.log(`   ⏱️  Tiempo: ${entry.executionTime || 'N/A'}ms`);
          console.log(`   📝 Comandos SQL: ${entry.sqlCommands.length}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error verificando estado:', error.message);
    process.exit(1);
  }
}

// Manejo de argumentos de línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📊 VERIFICADOR DE ESTADO DE MIGRACIONES

📋 Uso:
  node migration-status.js <tenant> [--history]

📋 Ejemplos:
  node migration-status.js conecta           # Estado básico
  node migration-status.js conecta --history # Estado con historial detallado

📋 Flags:
  --history     Mostrar historial detallado de migraciones aplicadas
  --help, -h    Mostrar esta ayuda
`);
    process.exit(0);
  }
  
  const tenantName = args[0];
  const showHistory = args.includes('--history');
  
  checkMigrationStatus(tenantName, showHistory)
    .then(() => {
      console.log('✅ Verificación completada');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Verificación falló:', error.message);
      process.exit(1);
    });
}

module.exports = { checkMigrationStatus };
