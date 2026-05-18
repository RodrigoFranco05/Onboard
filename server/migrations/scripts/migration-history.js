#!/usr/bin/env node
const { conexionDB } = require('../../config/db');
const { getMigrationHistory } = require('../services/migrationService');

async function showMigrationHistory(tenantName) {
  try {
    console.log(`📋 HISTORIAL DE MIGRACIONES`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Tenant: ${tenantName}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Conectar sin ejecutar migraciones automáticas
    const originalSkip = process.env.SKIP_AUTO_MIGRATIONS;
    process.env.SKIP_AUTO_MIGRATIONS = 'true';
    
    const sequelize = await conexionDB(tenantName, 'admin');
    
    // Restaurar configuración
    process.env.SKIP_AUTO_MIGRATIONS = originalSkip;
    
    // Obtener historial
    const history = await getMigrationHistory(sequelize, tenantName);
    
    if (history.length === 0) {
      console.log('📋 No hay migraciones aplicadas\n');
      console.log('💡 Para aplicar migraciones usa:');
      console.log('   npm run migration:apply-all <tenant>\n');
      return;
    }
    
    console.log(`📊 Total de migraciones aplicadas: ${history.length}\n`);
    
    // Mostrar cada migración
    history.forEach((entry, i) => {
      const migrationNumber = i + 1;
      console.log(`${'─'.repeat(60)}`);
      
      console.log(`📋 ${migrationNumber}. ${entry.name}`);
      console.log(`✅ Estado: ${entry.status}`);
      
      console.log(); // Línea en blanco entre migraciones
    });

    console.log(`${'='.repeat(60)}`);
    console.log(`📊 RESUMEN:`);
    console.log(`🚀 Total de migraciones: ${history.length}`);
    console.log(`✅ Todas aplicadas correctamente`);
    console.log(`${'='.repeat(60)}\n`);

    console.log('✅ Historial mostrado completamente');
    
  } catch (error) {
    console.error('❌ Error mostrando historial:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`📋 HISTORIAL DE MIGRACIONES - Mostrar migraciones aplicadas`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Uso: npm run migration:history <tenant>`);
  console.log(``);
  console.log(`Argumentos:`);
  console.log(`  <tenant>          Nombre del tenant`);
  console.log(``);
  console.log(`Ejemplos:`);
  console.log(`  npm run migration:history demo`);
  console.log(`  npm run migration:history produccion`);
  console.log(``);
  console.log(`Descripción:`);
  console.log(`  - Muestra todas las migraciones aplicadas al tenant`);
  console.log(`  - Lista en orden de aplicación`);
  console.log(`  - No modifica la base de datos (solo lectura)`);
}

// Ejecución principal
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const [tenantName] = args;
  
  if (!tenantName) {
    console.error('❌ Error: Debe proporcionar el nombre del tenant');
    showHelp();
    process.exit(1);
  }

  showMigrationHistory(tenantName);
}

module.exports = { showMigrationHistory };