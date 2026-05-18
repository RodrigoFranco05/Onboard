/**
 * Utilidades para gestión de prioridades de soporte
 * 
 * Este módulo proporciona funciones para:
 * 1. Verificar el orden actual de prioridades
 * 2. Corregir el orden de prioridades según lógica establecida
 * 3. Inicializar configuración completa de soporte
 * 
 * Referencia: sistema-tickets-backend.md Sección 2.1
 */

const { conexionDB } = require('../../config/db');
const { soporteModelInit } = require('../../models/soporteModel');
const { validarYCrearConfigSoporte } = require('./configSoporteValidator');

/**
 * Verificar el orden actual de prioridades en la base de datos
 * @param {string} tenant - Nombre del tenant (default: 'erp')
 * @returns {Promise<Array>} Lista de prioridades ordenadas
 */
async function checkPrioridades(tenant = 'erp') {
  try {
    // Conectar a la base de datos
    const sequelize = await conexionDB(tenant, 'admin');
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    // Obtener todas las prioridades
    const prioridades = await Soporte_Prioridad.findAll({
      where: { eliminado: false },
      order: [['orden', 'ASC']]
    });
    
    // console.log(`📊 Prioridades actuales en la base de datos (tenant: ${tenant}):`);
    // console.log('===========================================');
    
    // prioridades.forEach(p => {      console.log(`- ${p.nombre}: orden=${p.orden}, id=${p.id}`);    });
    
    // console.log('\n🔍 Orden actual (por campo "orden"):');
    // console.log(prioridades.map(p => p.nombre).join(' → '));
    
    const ordenEsperado = ['Urgente', 'Alto', 'Medio', 'Bajo', 'Muy Bajo'];
    const ordenActual = prioridades.map(p => p.nombre);
    
    // if (JSON.stringify(ordenActual) === JSON.stringify(ordenEsperado)) {      console.log('\n✅ El orden de prioridades es correcto');
    // } else {
    //   console.log('\n⚠️  El orden NO es el esperado: Urgente → Alto → Medio → Bajo → Muy Bajo');
    //   console.log('   Ejecuta: fixPrioridades() para corregir');
    // }
    
    await sequelize.close();
    return prioridades;
    
  } catch (error) {
    console.error(`❌ Error verificando prioridades para ${tenant}:`, error.message);
    throw error;
  }
}

/**
 * Corregir el orden de prioridades según la lógica establecida
 * @param {string} tenant - Nombre del tenant (default: 'erp')
 * @returns {Promise<Array>} Lista de prioridades actualizadas
 */
async function fixPrioridades(tenant = 'erp') {
  try {
    // Conectar a la base de datos
    const sequelize = await conexionDB(tenant, 'admin');
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    // Definir el orden correcto
    const ordenCorrecto = [
      { nombre: 'Urgente', orden: 1 },
      { nombre: 'Alto', orden: 2 },
      { nombre: 'Medio', orden: 3 },
      { nombre: 'Bajo', orden: 4 },
      { nombre: 'Muy Bajo', orden: 5 }
    ];
    
    console.log(`🔄 Actualizando orden de prioridades para tenant: ${tenant}...`);
    
    let actualizadas = 0;
    for (const prioridad of ordenCorrecto) {
      const [updated] = await Soporte_Prioridad.update(
        { orden: prioridad.orden },
        { where: { nombre: prioridad.nombre, eliminado: false } }
      );
      
      if (updated > 0) {
        console.log(`✅ ${prioridad.nombre} → orden=${prioridad.orden}`);
        actualizadas++;
      } else {
        console.log(`⚠️  ${prioridad.nombre} no encontrada o ya tiene el orden correcto`);
      }
    }
    
    // Verificar el resultado
    const prioridadesActualizadas = await Soporte_Prioridad.findAll({
      where: { eliminado: false },
      order: [['orden', 'ASC']]
    });
    
    // console.log(`\n📊 Prioridades actualizadas (${actualizadas} modificadas):`);
    // console.log('===========================');
    prioridadesActualizadas.forEach(p => {
      console.log(`- ${p.nombre}: orden=${p.orden}`);
    });
    
    // console.log('\n🎯 Orden final:');
    // console.log(prioridadesActualizadas.map(p => p.nombre).join(' → '));
    
    await sequelize.close();
    return prioridadesActualizadas;
    
  } catch (error) {
    // console.error(`❌ Error corrigiendo prioridades para ${tenant}:`, error.message);
    throw error;
  }
}

/**
 * Inicializar configuración completa de soporte para un tenant
 * @param {string} tenant - Nombre del tenant (default: 'erp')
 * @returns {Promise<Object>} Configuración creada
 */
async function initSoporteConfig(tenant = 'erp') {
  try {
    // console.log(`🚀 Inicializando configuración de soporte para tenant: ${tenant}`);
    
    // Conectar a la base de datos
    const sequelize = await conexionDB(tenant, 'admin');
    
    // Ejecutar validador de configuración de soporte
    const config = await validarYCrearConfigSoporte(sequelize, tenant);
    
    // console.log('✅ Configuración de soporte inicializada correctamente');
    
    // Verificar las prioridades creadas
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    const prioridades = await Soporte_Prioridad.findAll({
      where: { eliminado: false },
      order: [['orden', 'ASC']]
    });
    
    // console.log('\n📊 Prioridades creadas:');
    // console.log('=====================');
    prioridades.forEach(p => {
      console.log(`- ${p.nombre}: orden=${p.orden}, color=${p.color}`);
    });
    
    // console.log('\n🎯 Orden lógico establecido:');
    // console.log(prioridades.map(p => p.nombre).join(' → '));
    
    await sequelize.close();
    return { config, prioridades };
    
  } catch (error) {
    // console.error(`❌ Error inicializando soporte para ${tenant}:`, error.message);
    throw error;
  }
}

/**
 * Función CLI para ejecutar desde línea de comandos
 * Uso: node prioridadUtils.js [comando] [tenant]
 * Comandos: check, fix, init
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  const tenant = args[1] || 'erp';
  
  try {
    switch (command) {
      case 'check':
        await checkPrioridades(tenant);
        break;
      case 'fix':
        await fixPrioridades(tenant);
        break;
      case 'init':
        await initSoporteConfig(tenant);
        break;
      case 'help':
      default:
        console.log(`
📋 Utilidades de Prioridades de Soporte
=====================================
Uso: node prioridadUtils.js [comando] [tenant]

Comandos:
  check [tenant]  - Verificar orden de prioridades (default: erp)
  fix [tenant]    - Corregir orden de prioridades (default: erp)
  init [tenant]   - Inicializar configuración completa (default: erp)
  help            - Mostrar esta ayuda

Ejemplos:
  node prioridadUtils.js check erp
  node prioridadUtils.js fix demo
  node prioridadUtils.js init mytenant
        `);
        break;
    }
  } catch (error) {
    // console.error('❌ Error ejecutando comando:', error.message);
    process.exit(1);
  }
}

// Exportar funciones para uso programático
module.exports = {
  checkPrioridades,
  fixPrioridades,
  initSoporteConfig
};

// Ejecutar como script CLI si se llama directamente
if (require.main === module) {
  main();
}