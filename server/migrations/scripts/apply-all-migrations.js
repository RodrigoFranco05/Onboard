#!/usr/bin/env node

/**
 * 🚀 APLICAR TODAS LAS MIGRACIONES A UN TENANT
 * 
 * Aplica todas las migraciones disponibles a una base de datos específica.
 * Útil para:
 * - Nuevas bases de datos desde cero
 * - Ambientes de testing
 * - Despliegues en nuevos servidores
 * 
 * Uso:
 *   node apply-all-migrations.js <tenant> [--force] [--preview-only]
 * 
 * Ejemplos:
 *   node apply-all-migrations.js nueva_empresa
 *   node apply-all-migrations.js nueva_empresa --force
 *   node apply-all-migrations.js nueva_empresa --preview-only
 */

const readline = require('readline');

// Configurar variables de entorno ANTES de importar módulos
process.env.SKIP_AUTO_MIGRATIONS = 'true'; // Evitar migraciones automáticas en conexión

const { conexionDB } = require('../../config/db');
const { createMigrationRunner } = require('../services/migrationService');
const migrationPreviewService = require('../services/migrationPreviewService');

// Configurar readline para input del usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Función para hacer preguntas al usuario
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Mostrar ayuda
 */
function showHelp() {
  console.log(`
🚀 APLICAR TODAS LAS MIGRACIONES A UN TENANT

📋 Uso:
   node apply-all-migrations.js <tenant> [opciones]

📋 Opciones:
   --force         Aplicar sin confirmación interactiva
   --preview-only  Solo generar preview, no aplicar
   --help         Mostrar esta ayuda

📋 Ejemplos:
   node apply-all-migrations.js nueva_empresa
   node apply-all-migrations.js nueva_empresa --force
   node apply-all-migrations.js nueva_empresa --preview-only

⚠️  IMPORTANTE:
   - Asegúrate de que la base de datos existe
   - Haz backup antes de usar en producción
   - El tenant debe estar configurado en tu sistema
`);
}

/**
 * Función principal
 */
async function main() {
  try {
    // Procesar argumentos
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
      showHelp();
      process.exit(0);
    }

    const tenant = args[0];
    const isForce = args.includes('--force');
    const isPreviewOnly = args.includes('--preview-only');

    if (!tenant) {
      console.error('❌ Error: Debes especificar un tenant');
      console.log('💡 Uso: node apply-all-migrations.js <tenant>');
      process.exit(1);
    }

    console.log(`\n🚀 APLICAR TODAS LAS MIGRACIONES`);
    console.log(`==================================================`);
    console.log(`📋 Tenant: ${tenant}`);
    console.log(`📋 Modo: ${isPreviewOnly ? 'SOLO PREVIEW' : 'APLICAR REAL'}`);
    console.log(`📋 Confirmación: ${isForce ? 'AUTOMÁTICA' : 'INTERACTIVA'}`);
    console.log(`==================================================\n`);

    // 1. Conectar a la base de datos
    console.log(`🔌 Conectando a la base de datos del tenant: ${tenant}...`);
    const sequelize = await conexionDB(tenant, 'migration-script');
    console.log(`✅ Conexión establecida`);

    // 2. Crear runner de migraciones
    const umzug = createMigrationRunner(sequelize);

    // 3. Verificar migraciones pendientes
    console.log(`\n🔍 Verificando migraciones pendientes...`);
    const pendingMigrations = await umzug.pending();
    const executedMigrations = await umzug.executed();

    console.log(`📊 Estado actual:`);
    console.log(`   - Ejecutadas: ${executedMigrations.length}`);
    console.log(`   - Pendientes: ${pendingMigrations.length}`);

    if (pendingMigrations.length === 0) {
      console.log(`\n✅ No hay migraciones pendientes para el tenant: ${tenant}`);
      console.log(`🎉 La base de datos está completamente actualizada`);
      process.exit(0);
    }

    // 4. Mostrar lista de migraciones pendientes
    console.log(`\n📋 Migraciones que se aplicarán:`);
    pendingMigrations.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.name}`);
    });

    // 5. Generar preview si se solicita
    if (isPreviewOnly) {
      console.log(`\n🔍 Generando preview solamente...`);
      await migrationPreviewService.generatePreview(tenant);
      console.log(`✅ Preview generado. Revisa los archivos en migrations/previews/`);
      process.exit(0);
    }

    // 6. Confirmación del usuario (si no es --force)
    if (!isForce) {
      console.log(`\n⚠️  ATENCIÓN:`);
      console.log(`   - Se aplicarán ${pendingMigrations.length} migraciones`);
      console.log(`   - Los cambios son IRREVERSIBLES (excepto rollback de la última)`);
      console.log(`   - Asegúrate de tener backup de la base de datos`);
      
      const answer = await question(`\n¿Continuar? (escribe 'APLICAR' para confirmar): `);
      
      if (answer !== 'APLICAR') {
        console.log(`❌ Operación cancelada por el usuario`);
        process.exit(0);
      }
    }

    // 7. Aplicar todas las migraciones
    console.log(`\n🔄 Aplicando ${pendingMigrations.length} migraciones...`);
    console.log(`==================================================`);

    const startTime = Date.now();
    let appliedCount = 0;

    for (const migration of pendingMigrations) {
      const migrationStart = Date.now();
      console.log(`🔄 [${tenant}] Aplicando: ${migration.name}`);
      
      try {
        await umzug.up({ migrations: [migration.name] });
        const migrationTime = Date.now() - migrationStart;
        console.log(`✅ [${tenant}] Completada: ${migration.name} (${migrationTime}ms)`);
        appliedCount++;
      } catch (error) {
        console.error(`❌ [${tenant}] Error en: ${migration.name}`);
        console.error(`   💥 ${error.message || error}`);
        if (error.sql) {
          console.error(`   📝 SQL: ${error.sql}`);
        }
        throw error;
      }
    }

    const totalTime = Date.now() - startTime;

    // 8. Resultado final
    console.log(`\n==================================================`);
    console.log(`🎉 MIGRACIONES APLICADAS EXITOSAMENTE`);
    console.log(`==================================================`);
    console.log(`📊 Resumen:`);
    console.log(`   - Tenant: ${tenant}`);
    console.log(`   - Migraciones aplicadas: ${appliedCount}/${pendingMigrations.length}`);
    console.log(`   - Tiempo total: ${totalTime}ms`);
    console.log(`   - Promedio por migración: ${Math.round(totalTime / appliedCount)}ms`);

    // 9. Verificar estado final
    const finalExecuted = await umzug.executed();
    const finalPending = await umzug.pending();
    
    console.log(`\n📊 Estado final:`);
    console.log(`   - Total ejecutadas: ${finalExecuted.length}`);
    console.log(`   - Pendientes restantes: ${finalPending.length}`);

    if (finalPending.length === 0) {
      console.log(`\n✅ ¡Base de datos completamente actualizada!`);
    } else {
      console.log(`\n⚠️  Aún quedan ${finalPending.length} migraciones pendientes`);
    }

    console.log(`\n💡 Para verificar el estado usa:`);
    console.log(`   npm run migration:status ${tenant}`);

  } catch (error) {
    console.error(`\n❌ ERROR EN LA APLICACIÓN DE MIGRACIONES:`);
    console.error(`   💥 ${error.message || error}`);
    if (error.sql) {
      console.error(`   📝 SQL que falló: ${error.sql}`);
    }
    if (error.original) {
      console.error(`   📋 Error original: ${error.original.message || error.original}`);
    }
    console.error(`\n🔧 Posibles soluciones:`);
    console.error(`   1. Verificar que la base de datos existe`);
    console.error(`   2. Verificar permisos de la base de datos`);
    console.error(`   3. Revisar logs de errores específicos arriba`);
    console.error(`   4. Usar --preview-only para verificar SQL antes de aplicar`);
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Manejo de señales para cerrar readline
process.on('SIGINT', () => {
  console.log('\n👋 Operación cancelada por el usuario');
  rl.close();
  process.exit(0);
});

// Ejecutar función principal
if (require.main === module) {
  main();
}

module.exports = { main };
