#!/usr/bin/env node

/**
 * 🆕 INICIALIZAR NUEVA BASE DE DATOS COMPLETA
 * 
 * Script para configurar una base de datos completamente nueva desde cero.
 * Incluye:
 * - Verificación de conexión
 * - Aplicación de todas las migraciones
 * - Validación de parámetros globales
 * - Verificación final del estado
 * 
 * Uso:
 *   node init-new-database.js <tenant> [--force]
 * 
 * Ejemplos:
 *   node init-new-database.js nueva_empresa
 *   node init-new-database.js nueva_empresa --force
 */

const readline = require('readline');

// Configurar variables de entorno ANTES de importar módulos
process.env.SKIP_AUTO_MIGRATIONS = 'true';

const { conexionDB } = require('../../config/db');
const { createMigrationRunner } = require('../services/migrationService');

// Configurar readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function showHelp() {
  console.log(`
🆕 INICIALIZAR NUEVA BASE DE DATOS COMPLETA

📋 Propósito:
   Configura una base de datos completamente nueva desde cero con todas
   las migraciones, validaciones y configuraciones necesarias.

📋 Uso:
   node init-new-database.js <tenant> [--force]

📋 Opciones:
   --force    Aplicar sin confirmación interactiva
   --help     Mostrar esta ayuda

📋 Ejemplos:
   node init-new-database.js nueva_empresa
   node init-new-database.js nueva_empresa --force

📋 Lo que hace este script:
   1. ✅ Verifica conexión a la base de datos
   2. 🔍 Analiza estado inicial
   3. 🚀 Aplica TODAS las migraciones disponibles
   4. ⚙️  Valida parámetros globales del sistema
   5. 📊 Verifica estado final
   6. 🎉 Confirma que todo está listo

⚠️  IMPORTANTE:
   - La base de datos debe existir (pero puede estar vacía)
   - Ideal para nuevos tenants o ambientes limpios
   - NO usar en bases de datos con datos existentes
`);
}

async function checkDatabaseExists(sequelize, tenant) {
  try {
    await sequelize.authenticate();
    console.log(`✅ Conexión a la base de datos verificada`);
    return true;
  } catch (error) {
    console.error(`❌ Error de conexión a la base de datos:`);
    console.error(`   ${error.message}`);
    console.error(`\n🔧 Posibles causas:`);
    console.error(`   - La base de datos no existe`);
    console.error(`   - Credenciales incorrectas`);
    console.error(`   - Servidor de base de datos no disponible`);
    return false;
  }
}

async function analyzeInitialState(umzug) {
  console.log(`🔍 Analizando estado inicial de la base de datos...`);
  
  try {
    const executedMigrations = await umzug.executed();
    const pendingMigrations = await umzug.pending();
    
    console.log(`📊 Estado inicial:`);
    console.log(`   - Migraciones ya ejecutadas: ${executedMigrations.length}`);
    console.log(`   - Migraciones pendientes: ${pendingMigrations.length}`);
    
    if (executedMigrations.length > 0) {
      console.log(`\n📋 Migraciones ya aplicadas:`);
      executedMigrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
    }
    
    if (pendingMigrations.length > 0) {
      console.log(`\n📋 Migraciones pendientes:`);
      pendingMigrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
    }
    
    return {
      executedCount: executedMigrations.length,
      pendingCount: pendingMigrations.length,
      isCompletelyNew: executedMigrations.length === 0,
      pendingMigrations
    };
  } catch (error) {
    // Si hay error, probablemente es una base completamente nueva
    console.log(`📝 Base de datos completamente nueva (sin tabla SequelizeMeta)`);
    const allMigrations = await umzug.pending();
    return {
      executedCount: 0,
      pendingCount: allMigrations.length,
      isCompletelyNew: true,
      pendingMigrations: allMigrations
    };
  }
}

async function applyAllMigrations(umzug, tenant, pendingMigrations) {
  if (pendingMigrations.length === 0) {
    console.log(`✅ No hay migraciones pendientes`);
    return true;
  }
  
  console.log(`\n🚀 Aplicando ${pendingMigrations.length} migraciones...`);
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
      console.error(`   Error: ${error.message}`);
      throw error;
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\n📊 Resumen de migraciones:`);
  console.log(`   - Aplicadas exitosamente: ${appliedCount}/${pendingMigrations.length}`);
  console.log(`   - Tiempo total: ${totalTime}ms`);
  console.log(`   - Promedio: ${Math.round(totalTime / appliedCount)}ms por migración`);
  
  return appliedCount === pendingMigrations.length;
}

async function validateGlobalParameters(sequelize, tenant) {
  console.log(`\n⚙️  Validando parámetros globales del sistema...`);
  
  try {
    // Temporarily restore auto-initialization for parameter validation
    const originalSkip = process.env.SKIP_AUTO_MIGRATIONS;
    delete process.env.SKIP_AUTO_MIGRATIONS;
    
    const { validarYCrearParametrosGlobales } = require('../../services/parametrosGlobalesValidator');
    await validarYCrearParametrosGlobales(sequelize, tenant);
    
    // Restore the original setting
    if (originalSkip) {
      process.env.SKIP_AUTO_MIGRATIONS = originalSkip;
    }
    
    console.log(`✅ Parámetros globales validados y configurados`);
    return true;
  } catch (error) {
    console.error(`❌ Error en validación de parámetros globales:`);
    console.error(`   ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
      showHelp();
      process.exit(0);
    }
    
    const tenant = args[0];
    const isForce = args.includes('--force');
    
    if (!tenant) {
      console.error('❌ Error: Debes especificar un tenant');
      console.log('💡 Uso: node init-new-database.js <tenant>');
      process.exit(1);
    }
    
    console.log(`\n🆕 INICIALIZAR NUEVA BASE DE DATOS`);
    console.log(`==================================================`);
    console.log(`📋 Tenant: ${tenant}`);
    console.log(`📋 Modo: ${isForce ? 'AUTOMÁTICO' : 'INTERACTIVO'}`);
    console.log(`==================================================\n`);
    
    // 1. Conectar y verificar base de datos
    console.log(`🔌 Conectando a la base de datos...`);
    const sequelize = await conexionDB(tenant, 'init-script');
    
    const isConnected = await checkDatabaseExists(sequelize, tenant);
    if (!isConnected) {
      process.exit(1);
    }
    
    // 2. Crear runner de migraciones
    const umzug = createMigrationRunner(sequelize);
    
    // 3. Analizar estado inicial
    const state = await analyzeInitialState(umzug);
    
    if (state.isCompletelyNew) {
      console.log(`\n🎯 Detectada base de datos completamente nueva`);
    } else if (state.pendingCount === 0) {
      console.log(`\n✅ Base de datos ya está completamente actualizada`);
      console.log(`🎉 No se requiere inicialización`);
      process.exit(0);
    } else {
      console.log(`\n📊 Base de datos parcialmente configurada`);
    }
    
    // 4. Confirmación del usuario
    if (!isForce && state.pendingCount > 0) {
      console.log(`\n⚠️  Se realizarán las siguientes acciones:`);
      console.log(`   - Aplicar ${state.pendingCount} migraciones`);
      console.log(`   - Configurar parámetros globales`);
      console.log(`   - Validar configuración final`);
      
      const answer = await question(`\n¿Continuar con la inicialización? (escribe 'INICIALIZAR' para confirmar): `);
      
      if (answer !== 'INICIALIZAR') {
        console.log(`❌ Inicialización cancelada por el usuario`);
        process.exit(0);
      }
    }
    
    // 5. Aplicar todas las migraciones
    const migrationsSuccess = await applyAllMigrations(umzug, tenant, state.pendingMigrations);
    if (!migrationsSuccess) {
      throw new Error('Falló la aplicación de migraciones');
    }
    
    // 6. Validar parámetros globales
    const paramsSuccess = await validateGlobalParameters(sequelize, tenant);
    if (!paramsSuccess) {
      console.log(`⚠️  Advertencia: Error en parámetros globales, pero migraciones aplicadas exitosamente`);
    }
    
    // 7. Verificación final
    console.log(`\n🔍 Verificación final...`);
    const finalExecuted = await umzug.executed();
    const finalPending = await umzug.pending();
    
    console.log(`\n==================================================`);
    console.log(`🎉 INICIALIZACIÓN COMPLETADA EXITOSAMENTE`);
    console.log(`==================================================`);
    console.log(`📊 Resumen final:`);
    console.log(`   - Tenant: ${tenant}`);
    console.log(`   - Total migraciones aplicadas: ${finalExecuted.length}`);
    console.log(`   - Migraciones pendientes: ${finalPending.length}`);
    console.log(`   - Estado: ${finalPending.length === 0 ? '✅ COMPLETAMENTE ACTUALIZADA' : '⚠️  PENDIENTES RESTANTES'}`);
    
    if (paramsSuccess) {
      console.log(`   - Parámetros globales: ✅ CONFIGURADOS`);
    } else {
      console.log(`   - Parámetros globales: ⚠️  CON ADVERTENCIAS`);
    }
    
    console.log(`\n🚀 La base de datos está lista para uso!`);
    console.log(`💡 Para verificar el estado usa: npm run migration:status ${tenant}`);
    
  } catch (error) {
    console.error(`\n❌ ERROR EN LA INICIALIZACIÓN:`);
    console.error(`   ${error.message}`);
    console.error(`\n🔧 Posibles soluciones:`);
    console.error(`   1. Verificar que la base de datos existe`);
    console.error(`   2. Verificar credenciales y permisos`);
    console.error(`   3. Revisar logs específicos del error`);
    console.error(`   4. Contactar al administrador del sistema`);
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Manejo de señales
process.on('SIGINT', () => {
  console.log('\n👋 Inicialización cancelada por el usuario');
  rl.close();
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = { main };
