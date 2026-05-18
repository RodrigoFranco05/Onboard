#!/usr/bin/env node
const { conexionDB } = require('../../config/db');
const migrationPreviewService = require('../services/migrationPreviewService');

async function previewMigrations(tenantName, migrationName = null) {
  try {
    console.log(`🔍 PREVIEW DE MIGRACIONES`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📋 Tenant: ${tenantName}`);
    console.log(`📋 Migración: ${migrationName || 'TODAS LAS PENDIENTES'}`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Conectar sin ejecutar migraciones automáticas
    const originalSkip = process.env.SKIP_AUTO_MIGRATIONS;
    process.env.SKIP_AUTO_MIGRATIONS = 'true';
    
    const sequelize = await conexionDB(tenantName, 'admin');
    
    // Restaurar configuración
    process.env.SKIP_AUTO_MIGRATIONS = originalSkip;
    
    // Generar preview
    const result = await migrationPreviewService.generatePreview(
      sequelize, 
      tenantName, 
      migrationName
    );
    
    if (!result.previewFile) {
      console.log('✅ No hay migraciones pendientes para revisar\n');
      return;
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📄 ARCHIVOS GENERADOS:`);
    console.log(`${'='.repeat(50)}`);
    console.log(`📋 Markdown: ${result.previewFile.markdownFile}`);
    console.log(`📋 SQL:      ${result.previewFile.sqlFile}`);
    console.log(`📊 Total comandos: ${result.totalCommands}`);
    console.log(`${'='.repeat(50)}\n`);
    
    // Mostrar resumen en consola
    console.log(`🔍 RESUMEN RÁPIDO:`);
    for (const migration of result.migrations) {
      const status = migration.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${migration.migration} - ${migration.commandCount} comandos`);
      
      if (migration.status === 'error') {
        console.log(`   ❌ Error: ${migration.error}`);
      }
    }
    
    console.log(`\n💡 Revisa los archivos generados antes de reiniciar el servidor`);
    
  } catch (error) {
    console.error('\n❌ Error generando preview:', error.message);
    process.exit(1);
  }
}

// Manejo de argumentos de línea de comandos
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 GENERADOR DE PREVIEW DE MIGRACIONES

📋 Uso:
  node preview-migration.js <tenant> [migration-file]

📋 Ejemplos:
  node preview-migration.js conecta                    # Preview todas las pendientes
  node preview-migration.js conecta 003-add-audit.js  # Preview migración específica

📋 Flags:
  --help, -h    Mostrar esta ayuda

📄 Salida:
  - Archivo Markdown con preview detallado
  - Archivo SQL con comandos puros para revisión
  - Resumen en consola
`);
    process.exit(0);
  }
  
  const tenantName = args[0];
  const migrationName = args[1];
  
  previewMigrations(tenantName, migrationName)
    .then(() => {
      console.log('\n✅ Preview completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Preview falló:', error.message);
      process.exit(1);
    });
}

module.exports = { previewMigrations };
