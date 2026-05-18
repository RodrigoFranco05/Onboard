/**
 * Job para cerrar automáticamente tickets resueltos después de N días
 * Se ejecuta diariamente a las 3 AM
 * 
 * Referencia: sistema-tickets-backend.md Sección 5.1
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const { conexionDB } = require('../../config/db');
const { soporteModelInit } = require('../../models/soporteModel');

/**
 * Cerrar tickets resueltos después de N días según configuración
 * @param {string} tenant - Nombre del tenant
 */
async function autocloseResolvedTickets(tenant) {
  try {
    console.log(`🔍 [Autoclose] Iniciando para tenant: ${tenant}`);
    const sequelize = await conexionDB(tenant);
    const { Soporte_Ticket, Soporte_TicketEvento, Soporte_Config } = soporteModelInit(sequelize);

    // Obtener configuración
    const config = await Soporte_Config.findOne({ where: { tenant } });
    if (!config) {
      console.warn(`⚠️ [Autoclose] Config no encontrada para tenant: ${tenant}`);
      return;
    }

    const diasAutocierre = config.diasAutocierreResuelto || 30;
    console.log(`📋 [Autoclose] Configuración: ${diasAutocierre} días para autocierre en tenant: ${tenant}`);
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAutocierre);
    console.log(`📅 [Autoclose] Fecha límite (resueltos antes de): ${fechaLimite.toISOString()}`);

    // Buscar tickets resueltos que excedan el tiempo
    // Nota: Sequelize mapea automáticamente resolvedAt <-> resolvedAt
    const ticketsParaCerrar = await Soporte_Ticket.findAll({
      where: {
        status: 'resuelto',
        resolvedAt: {
          [Op.lt]: fechaLimite
        },
        closedAt: null,
        eliminado: false
      },
      raw: false // Mantener instancias para acceder a atributos
    });
    
    // Log adicional: verificar todos los tickets resueltos para depuración
    const todosResueltos = await Soporte_Ticket.findAll({
      where: {
        status: 'resuelto',
        closedAt: null,
        eliminado: false
      },
      attributes: ['id', 'numero', 'status', 'resolvedAt', 'resolvedAt'],
      raw: true
    });
    console.log(`🔍 [Autoclose] Total tickets resueltos sin cerrar: ${todosResueltos.length}`);
    todosResueltos.forEach(t => {
      const resolvedAt = t.resolvedAt || t.resolvedAt;
      const diasDesdeResolucion = resolvedAt ? Math.floor((new Date() - new Date(resolvedAt)) / (1000 * 60 * 60 * 24)) : 'N/A';
      console.log(`  - Soporte_Ticket ${t.numero}: resuelto hace ${diasDesdeResolucion} días (${resolvedAt ? new Date(resolvedAt).toISOString() : 'N/A'})`);
    });

    console.log(`🔍 [Autoclose] Tickets encontrados para cerrar: ${ticketsParaCerrar.length} en tenant: ${tenant}`);
    
    // Log de tickets encontrados para depuración
    if (ticketsParaCerrar.length > 0) {
      ticketsParaCerrar.forEach(ticket => {
        console.log(`  - Soporte_Ticket ${ticket.numero}: resuelto el ${ticket.resolvedAt ? new Date(ticket.resolvedAt).toISOString() : 'N/A'}`);
      });
    }

    if (ticketsParaCerrar.length === 0) {
      console.log(`✅ [Autoclose] No hay tickets para cerrar en ${tenant}`);
      return;
    }

    // Cerrar tickets en transacción
    for (const ticket of ticketsParaCerrar) {
      await sequelize.transaction(async (t) => {
        await Soporte_Ticket.update({
          status: 'cerrado',
          closedAt: new Date(),
          lastActivityAt: new Date()
        }, {
          where: { id: ticket.id },
          transaction: t
        });

        await Soporte_TicketEvento.create({
          ticketId: ticket.id,
          eventType: 'closed',
          actorId: null,  // Sistema
          payload: {
            reason: 'autoclose_after_resolved',
            days: diasAutocierre,
            previousStatus: 'resuelto'
          }
        }, { transaction: t });
      });

      console.log(`✅ [Autoclose] Soporte_Ticket ${ticket.numero} cerrado automáticamente`);
    }

    console.log(`✅ [Autoclose] ${ticketsParaCerrar.length} tickets cerrados en ${tenant}`);

  } catch (error) {
    console.error(`❌ [Autoclose] Error en tenant ${tenant}:`, error);
  }
}

/**
 * Resolver tickets en pendiente_validacion después de N días
 * @param {string} tenant - Nombre del tenant
 */
async function autocloseFromPendingValidation(tenant) {
  try {
    const sequelize = await conexionDB(tenant);
    const { Soporte_Ticket, Soporte_TicketEvento, Soporte_Config } = soporteModelInit(sequelize);

    const config = await Soporte_Config.findOne({ where: { tenant } });
    if (!config) {
      console.warn(`⚠️ [Autoclose PV] Config no encontrada para tenant: ${tenant}`);
      return;
    }

    const diasAutocierre = config.diasAutocierrePendienteValidacion || 7;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAutocierre);

    // Buscar tickets en pendiente validación que excedan el tiempo
    const tickets = await Soporte_Ticket.findAll({
      where: {
        status: 'pendiente_validacion',
        lastActivityAt: {
          [Op.lt]: fechaLimite
        },
        resolvedAt: null,
        eliminado: false
      }
    });

    if (tickets.length === 0) {
      console.log(`✅ [Autoclose PV] No hay tickets para resolver en ${tenant}`);
      return;
    }

    // Marcar como resueltos
    for (const ticket of tickets) {
      await sequelize.transaction(async (t) => {
        await Soporte_Ticket.update({
          status: 'resuelto',
          resolvedAt: new Date(),
          lastActivityAt: new Date()
        }, {
          where: { id: ticket.id },
          transaction: t
        });

        await Soporte_TicketEvento.create({
          ticketId: ticket.id,
          eventType: 'status_changed',
          actorId: null,  // Sistema
          payload: {
            reason: 'autoclose_from_pending_validation',
            days: diasAutocierre,
            oldStatus: 'pendiente_validacion',
            newStatus: 'resuelto'
          }
        }, { transaction: t });
      });

      console.log(`✅ [Autoclose PV] Soporte_Ticket ${ticket.numero} marcado como resuelto`);
    }

    console.log(`✅ [Autoclose PV] ${tickets.length} tickets resueltos en ${tenant}`);

  } catch (error) {
    console.error(`❌ [Autoclose PV] Error en tenant ${tenant}:`, error);
  }
}

/**
 * Resolver tickets en pendiente_validacion_nube después de N días
 * Usa el mismo parámetro que pendiente_validacion
 * @param {string} tenant - Nombre del tenant
 */
async function autocloseFromPendingValidationNube(tenant) {
  try {
    const sequelize = await conexionDB(tenant);
    const { Soporte_Ticket, Soporte_TicketEvento, Soporte_Config } = soporteModelInit(sequelize);

    const config = await Soporte_Config.findOne({ where: { tenant } });
    if (!config) {
      console.warn(`⚠️ [Autoclose PVN] Config no encontrada para tenant: ${tenant}`);
      return;
    }

    const diasAutocierre = config.diasAutocierrePendienteValidacion || 7;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAutocierre);

    // Buscar tickets en pendiente validación nube que excedan el tiempo
    const tickets = await Soporte_Ticket.findAll({
      where: {
        status: 'pendiente_validacion_nube',
        lastActivityAt: {
          [Op.lt]: fechaLimite
        },
        resolvedAt: null,
        eliminado: false
      }
    });

    if (tickets.length === 0) {
      console.log(`✅ [Autoclose PVN] No hay tickets para resolver en ${tenant}`);
      return;
    }

    // Marcar como resueltos
    for (const ticket of tickets) {
      await sequelize.transaction(async (t) => {
        await Soporte_Ticket.update({
          status: 'resuelto',
          resolvedAt: new Date(),
          lastActivityAt: new Date()
        }, {
          where: { id: ticket.id },
          transaction: t
        });

        await Soporte_TicketEvento.create({
          ticketId: ticket.id,
          eventType: 'status_changed',
          actorId: null,  // Sistema
          payload: {
            reason: 'autoclose_from_pending_validation_nube',
            days: diasAutocierre,
            oldStatus: 'pendiente_validacion_nube',
            newStatus: 'resuelto'
          }
        }, { transaction: t });
      });

      console.log(`✅ [Autoclose PVN] Soporte_Ticket ${ticket.numero} marcado como resuelto`);
    }

    console.log(`✅ [Autoclose PVN] ${tickets.length} tickets resueltos en ${tenant}`);

  } catch (error) {
    console.error(`❌ [Autoclose PVN] Error en tenant ${tenant}:`, error);
  }
}

/**
 * Ejecutar job para todos los tenants
 * @param {string[]} tenants - Lista de tenants a procesar (opcional)
 */
async function runAutocloseJob(tenants = null) {
  console.log('🚀 [Autoclose Job] Iniciando...');

  try {
    // Si no se proporcionan tenants, usar lista por defecto o leer de configuración
    // Por ahora, si no se proporcionan, no se ejecuta nada
    // En producción, esto debería obtener los tenants de una tabla de configuración
    if (!tenants || tenants.length === 0) {
      console.warn('⚠️ [Autoclose Job] No se proporcionaron tenants. Job no ejecutado.');
      return;
    }

    for (const tenant of tenants) {
      try {
        await autocloseResolvedTickets(tenant);
        await autocloseFromPendingValidation(tenant);
        await autocloseFromPendingValidationNube(tenant);
      } catch (error) {
        console.error(`❌ [Autoclose Job] Error procesando tenant ${tenant}:`, error);
        // Continuar con el siguiente tenant aunque falle uno
      }
    }

    console.log('✅ [Autoclose Job] Completado');
  } catch (error) {
    console.error('❌ [Autoclose Job] Error general:', error);
  }
}

/**
 * Programar job diario a las 3 AM
 * @param {string[]} tenants - Lista de tenants a procesar (opcional)
 */
function scheduleAutocloseJob(tenants = null) {
  // Programar job diario a las 3:00 AM
  cron.schedule('0 3 * * *', () => {
    runAutocloseJob(tenants);
  });

  console.log('✅ [Autoclose Job] Job programado (diario 3:00 AM)');
}

module.exports = {
  scheduleAutocloseJob,
  runAutocloseJob,
  autocloseResolvedTickets,
  autocloseFromPendingValidation,
  autocloseFromPendingValidationNube
};
