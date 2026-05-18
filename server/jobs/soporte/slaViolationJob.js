/**
 * Job para marcar violaciones SLA
 * Se ejecuta cada hora
 * 
 * Referencia: sistema-tickets-backend.md Sección 5.2
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { conexionDB } = require('../../config/db');
const { soporteModelInit } = require('../../models/soporteModel');
const { SLAService } = require('../../services/soporte/slaService');

/**
 * Marcar violaciones SLA en tickets activos de un tenant
 * @param {string} tenant - Nombre del tenant
 */
async function markSLAViolations(tenant) {
  try {
    const sequelize = await conexionDB(tenant);
    const { Soporte_Ticket } = soporteModelInit(sequelize);

    // Buscar tickets activos que puedan tener violaciones
    // Solo verificamos tickets que aún no tienen violaciones marcadas o que necesitan re-verificación
    const tickets = await Soporte_Ticket.findAll({
      where: {
        status: {
          [Op.notIn]: ['cerrado', 'resuelto']
        },
        eliminado: false,
        [Op.or]: [
          { firstResponseViolated: false },
          { resolutionViolated: false },
          { firstResponseViolated: null },
          { resolutionViolated: null }
        ]
      }
    });

    if (tickets.length === 0) {
      console.log(`✅ [SLA] No hay tickets para verificar en ${tenant}`);
      return 0;
    }

    let violationsMarked = 0;

    // Verificar violaciones en cada ticket
    for (const ticket of tickets) {
      const violations = SLAService.checkSLAViolations(ticket);
      
      // Solo marcar si hay violaciones nuevas o cambios
      if (Object.keys(violations).length > 0) {
        // Verificar si ya estaba marcado (para evitar actualizaciones innecesarias)
        const needsUpdate = 
          (violations.firstResponseViolated && !ticket.firstResponseViolated) ||
          (violations.resolutionViolated && !ticket.resolutionViolated);

        if (needsUpdate) {
          await SLAService.markViolations(sequelize, ticket.id, violations);
          violationsMarked++;
        }
      }
    }

    if (violationsMarked > 0) {
      console.log(`⚠️ [SLA] ${violationsMarked} violaciones marcadas en ${tenant}`);
    } else {
      console.log(`✅ [SLA] No se encontraron violaciones nuevas en ${tenant}`);
    }

    return violationsMarked;

  } catch (error) {
    console.error(`❌ [SLA] Error en tenant ${tenant}:`, error);
    throw error;
  }
}

/**
 * Ejecutar job para todos los tenants
 * @param {string[]} tenants - Lista de tenants a procesar (opcional)
 */
async function runSLAViolationJob(tenants = null) {
  console.log('🚀 [SLA Job] Verificando violaciones...');

  try {
    // Si no se proporcionan tenants, usar lista por defecto o leer de configuración
    // Por ahora, si no se proporcionan, no se ejecuta nada
    if (!tenants || tenants.length === 0) {
      console.warn('⚠️ [SLA Job] No se proporcionaron tenants. Job no ejecutado.');
      return;
    }

    let totalViolations = 0;

    for (const tenant of tenants) {
      try {
        const violations = await markSLAViolations(tenant);
        totalViolations += violations;
      } catch (error) {
        console.error(`❌ [SLA Job] Error procesando tenant ${tenant}:`, error);
        // Continuar con el siguiente tenant aunque falle uno
      }
    }

    if (totalViolations > 0) {
      console.log(`⚠️ [SLA Job] Total: ${totalViolations} violaciones marcadas`);
    } else {
      console.log('✅ [SLA Job] Completado sin violaciones nuevas');
    }

  } catch (error) {
    console.error('❌ [SLA Job] Error general:', error);
  }
}

/**
 * Programar job cada hora
 * @param {string[]} tenants - Lista de tenants a procesar (opcional)
 */
function scheduleSLAViolationJob(tenants = null) {
  // Programar job cada hora (minuto 0 de cada hora)
  cron.schedule('0 * * * *', () => {
    runSLAViolationJob(tenants);
  });

  console.log('✅ [SLA Job] Job programado (cada hora)');
}

module.exports = {
  scheduleSLAViolationJob,
  runSLAViolationJob,
  markSLAViolations
};
