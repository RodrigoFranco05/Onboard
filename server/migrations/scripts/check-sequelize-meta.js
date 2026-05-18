#!/usr/bin/env node

/**
 * Script independiente para verificar y actualizar SequelizeMeta
 * NO es parte del sistema de migraciones - es un flujo separado
 * 
 * Uso: node migrations/scripts/check-sequelize-meta.js <tenant>
 */

const { conexionDB } = require('../../config/db');
const { SequelizeMetaService } = require('../services/sequelizeMetaService');

async function main() {
  const tenant = process.argv[2];
  
  if (!tenant || tenant === '--help' || tenant === '-h') {
    console.log(`
🔍 VERIFICADOR DE SEQUELIZEMETA
================================

Uso: node migrations/scripts/check-sequelize-meta.js <tenant>

Ejemplos:
  node migrations/scripts/check-sequelize-meta.js demo
  node migrations/scripts/check-sequelize-meta.js cliente-xyz

Este script:
  ✅ Verifica el estado de SequelizeMeta
  ✅ Crea la tabla si no existe
  ✅ Actualiza a versión extendida si es necesario
  ✅ NO interfiere con el sistema de migraciones
  ✅ Es un flujo completamente independiente

`);
    process.exit(0);
  }

  try {
    console.log(`🔍 Verificando SequelizeMeta para tenant: ${tenant}`);
    console.log(`📋 NOTA: Este es un flujo independiente del sistema de migraciones`);
    console.log('─'.repeat(60));
    
    // Conectar a la base de datos
    const sequelize = await conexionDB(tenant, 'sequelize-meta-check');
    console.log(`✅ Conectado a ${tenant}`);
    
    // Crear servicio de SequelizeMeta
    const sequelizeMetaService = new SequelizeMetaService(sequelize, tenant);
    
    // Obtener estado actual
    console.log(`\n📊 Estado actual de SequelizeMeta:`);
    const status = await sequelizeMetaService.getSequelizeMetaStatus();
    
    console.log(`   Estado: ${status.status}`);
    console.log(`   Mensaje: ${status.message}`);
    console.log(`   Necesita acción: ${status.needsAction ? 'SÍ' : 'NO'}`);
    
    if (status.needsAction) {
      console.log(`\n🔧 Aplicando actualizaciones necesarias...`);
      const updated = await sequelizeMetaService.ensureSequelizeMetaUpToDate();
      
      if (updated) {
        console.log(`\n✅ SequelizeMeta actualizada exitosamente`);
        
        // Verificar estado final
        const finalStatus = await sequelizeMetaService.getSequelizeMetaStatus();
        console.log(`\n📊 Estado final:`);
        console.log(`   Estado: ${finalStatus.status}`);
        console.log(`   Mensaje: ${finalStatus.message}`);
      } else {
        console.log(`\n⚠️ No se realizaron cambios en SequelizeMeta`);
      }
    } else {
      console.log(`\n✅ SequelizeMeta ya está actualizada - no se requieren cambios`);
    }
    
    console.log('\n🎯 Verificación completada');
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    console.error(`\n💡 Posibles soluciones:`);
    console.error(`   1. Verificar que el tenant existe`);
    console.error(`   2. Verificar permisos de base de datos`);
    console.error(`   3. Verificar conectividad de red`);
    process.exit(1);
  }
}

main();
