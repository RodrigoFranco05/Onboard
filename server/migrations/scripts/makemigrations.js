#!/usr/bin/env node

/**
 * MAKEMIGRATIONS - Similar a Django
 * Detecta automáticamente cambios entre modelos y base de datos
 * y genera migraciones automáticamente
 */

process.env.SKIP_AUTO_MIGRATIONS = 'true';

const { conexionDB } = require('../../config/db');
const { ModelDiffService } = require('../services/modelDiffService');
const fs = require('fs');
const path = require('path');

function showHelp() {
  console.log(`
🚀 MAKEMIGRATIONS - Detector Automático de Cambios
==================================================

Uso: npm run migration:makemigrations <tenant> [opciones]

Argumentos:
  <tenant>          Nombre del tenant para analizar

Opciones:
  --name <nombre>   Nombre personalizado para la migración
  --dry-run         Solo mostrar cambios sin crear archivo
  --force           No pedir confirmación

Ejemplos:
  npm run migration:makemigrations demo
  npm run migration:makemigrations demo --name "remove-old-columns"
  npm run migration:makemigrations demo --dry-run
  npm run migration:makemigrations demo --force

Descripción:
  - Compara los modelos del código con la estructura actual de la BD
  - Detecta automáticamente tablas/columnas añadidas, eliminadas o modificadas
  - Genera automáticamente el contenido de la migración
  - Similar al comando 'makemigrations' de Django

📋 Este comando NO aplica migraciones, solo las crea.
   Para aplicar usar: npm run migration:apply-all <tenant>
`);
}

function generateMigrationFileName(customName = null) {
  const timestamp = new Date().toISOString()
    .replace(/[-:]/g, '')
    .replace(/T/, '')
    .substring(0, 14);
  
  const name = customName || 'auto_detected_changes';
  return `${timestamp}-${name}.js`;
}

async function main() {
  const args = process.argv.slice(2);
  const tenant = args[0];
  
  if (!tenant || tenant === '--help' || tenant === '-h') {
    showHelp();
    process.exit(0);
  }
  
  // Parsear opciones
  const options = {
    name: null,
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force')
  };
  
  // Buscar --name en cualquier posición
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && i + 1 < args.length) {
      options.name = args[i + 1];
      break;
    }
  }
  
  console.log(`\n🔍 MAKEMIGRATIONS - Detector Automático`);
  console.log(`==================================================`);
  console.log(`📋 Tenant: ${tenant}`);
  console.log(`📋 Modo: ${options.dryRun ? 'DRY-RUN (solo análisis)' : 'CREAR MIGRACIÓN'}`);
  console.log(`==================================================\n`);
  
  try {
    // Conectar a la base de datos
    console.log(`🔌 Conectando al tenant: ${tenant}...`);
    const sequelize = await conexionDB(tenant, 'makemigrations');
    console.log(`✅ Conexión establecida\n`);
    
    // Debug: mostrar argumentos parseados DESPUÉS de la conexión
    console.log(`🔍 Argumentos recibidos: [${args.join(', ')}]`);
    console.log(`🔍 Nombre personalizado: ${options.name || 'NO ESPECIFICADO'}`);
    console.log(`🔍 Nombre que se usará: ${options.name || 'auto_detected_changes'}\n`);
    
    // Analizar diferencias
    console.log(`🔍 Analizando diferencias entre modelos y base de datos...`);
    const diffService = new ModelDiffService(sequelize);
    const changes = await diffService.detectChanges();
    
    if (changes.length === 0) {
      console.log(`\n✅ No se detectaron cambios`);
      console.log(`📋 Los modelos están sincronizados con la base de datos`);
      console.log(`🎯 No es necesario crear migraciones`);
      process.exit(0);
    }
    
    // Mostrar cambios detectados
    console.log(`\n📋 CAMBIOS DETECTADOS:`);
    console.log(`=====================`);
    changes.forEach((change, index) => {
      console.log(`${index + 1}. ${formatChangeDescription(change)}`);
    });
    
    // Generar contenido de migración
    const migrationContent = diffService.generateMigrationContent(changes);
    
    if (options.dryRun) {
      console.log(`\n📄 CONTENIDO DE MIGRACIÓN QUE SE GENERARÍA:`);
      console.log(`==========================================`);
      console.log(migrationContent);
      console.log(`\n✅ Dry-run completado. No se creó ningún archivo.`);
      process.exit(0);
    }
    
    // Confirmar creación
    if (!options.force) {
      console.log(`\n⚠️  Se creará una nueva migración con ${changes.length} cambios`);
      console.log(`❓ ¿Continuar? (escribe "CREAR" para confirmar):`);
      
      // Leer input del usuario
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const confirmation = await new Promise(resolve => {
        rl.question('', resolve);
      });
      
      rl.close();
      
      if (confirmation.trim().toUpperCase() !== 'CREAR') {
        console.log(`\n❌ Operación cancelada`);
        process.exit(0);
      }
    }
    
    // Crear archivo de migración
    const fileName = generateMigrationFileName(options.name);
    const migrationPath = path.join(__dirname, '../migrations', fileName);
    
    fs.writeFileSync(migrationPath, migrationContent, 'utf8');
    
    console.log(`\n✅ MIGRACIÓN CREADA EXITOSAMENTE`);
    console.log(`==================================`);
    console.log(`📁 Archivo: ${fileName}`);
    console.log(`📍 Ubicación: ${migrationPath}`);
    console.log(`📋 Cambios incluidos: ${changes.length}`);
    
    console.log(`\n🚀 PRÓXIMOS PASOS:`);
    console.log(`  1. Revisar el archivo generado`);
    console.log(`  2. Crear preview: npm run migration:preview ${tenant}`);
    console.log(`  3. Aplicar cambios: npm run migration:apply-all ${tenant}`);
    console.log(`     O reiniciar el servidor para aplicación automática`);
    
    process.exit(0);
    
  } catch (error) {
    console.error(`\n❌ Error en makemigrations:`, error.message);
    if (error.stack) {
      console.error(`📋 Stack trace:`, error.stack);
    }
    process.exit(1);
  }
}

function formatChangeDescription(change) {
  switch (change.type) {
    case 'CREATE_TABLE':
      return `🆕 Crear tabla '${change.table}'`;
    
    case 'DROP_TABLE':
      return `🗑️  Eliminar tabla '${change.table}'`;
    
    case 'ADD_COLUMN':
      return `➕ Agregar columna '${change.column}' a tabla '${change.table}'`;
    
    case 'REMOVE_COLUMN':
      return `➖ Eliminar columna '${change.column}' de tabla '${change.table}'`;
    
    case 'CHANGE_COLUMN_TYPE':
      return `🔄 Cambiar tipo de '${change.table}.${change.column}' (${change.from} → ${change.to})`;
    
    case 'CHANGE_COLUMN_NULL':
      return `🔄 Cambiar nullabilidad de '${change.table}.${change.column}' (allowNull: ${change.allowNull})`;
    
    default:
      return `🔄 ${change.type} en '${change.table}'`;
  }
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Operación cancelada por el usuario');
  process.exit(0);
});

main();
