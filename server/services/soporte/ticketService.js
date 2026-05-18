/**
 * Servicio para lógica de negocio de tickets
 * 
 * Este servicio contiene la lógica de negocio principal para:
 * - Validación de transiciones de estado
 * - Reapertura automática de tickets
 * - Marcado de primera respuesta
 * 
 * Referencia: sistema-tickets-backend.md Sección 3.1
 */

const { Op } = require('sequelize');

class TicketService {
  
  /**
   * Validar transición de estado
   * 
   * @param {string} currentStatus - Estado actual del ticket
   * @param {string} newStatus - Nuevo estado deseado
   * @returns {boolean} - true si la transición es válida
   * 
   * @example
   * TicketService.isValidTransition('nuevo', 'en_progreso'); // true
   * TicketService.isValidTransition('nuevo', 'abierto'); // true
   * TicketService.isValidTransition('nuevo', 'resuelto'); // false
   */
   static isValidTransition(currentStatus, newStatus) {
    const VALID_TRANSITIONS = {
      'nuevo': ['abierto'],
      'abierto': ['en_progreso', 'esperando_cliente', 'en_espera', 'pendiente_validacion', 'pendiente_validacion_nube', 'resuelto'],
      'en_progreso': ['abierto', 'esperando_cliente', 'en_espera', 'pendiente_validacion', 'pendiente_validacion_nube', 'resuelto'],
      'esperando_cliente': ['abierto', 'en_progreso'],
      'en_espera': ['abierto', 'en_progreso'],
      'pendiente_validacion': ['resuelto', 'abierto', 'en_progreso', 'pendiente_validacion_nube'],
      'pendiente_validacion_nube': ['resuelto', 'abierto', 'en_progreso'],
      'resuelto': ['abierto', 'en_progreso', 'cerrado'],
      'cerrado': []
    };

    // Si el estado actual no está en las transiciones válidas, retornar false
    if (!VALID_TRANSITIONS[currentStatus]) {
      return false;
    }

    // Verificar si el nuevo estado está en la lista de transiciones válidas
    return VALID_TRANSITIONS[currentStatus].includes(newStatus);
  }

  /**
   * Verificar si se debe reabrir automáticamente
   * 
   * Un ticket resuelto puede reabrirse automáticamente si:
   * - El estado es "resuelto"
   * - Tiene fecha de resolución
   * - No han pasado más días que los permitidos en la configuración (diasAutocierreResuelto)
   * 
   * @param {Object} ticket - Objeto ticket con status y resolvedAt
   * @param {Object} config - Objeto Soporte_Config con diasAutocierreResuelto
   * @returns {boolean} - true si debe reabrirse automáticamente
   * 
   * @example
   * const shouldReopen = TicketService.shouldAutoReopen(ticket, config);
   */
  static shouldAutoReopen(ticket, config) {
    // Solo tickets resueltos pueden reabrirse
    if (ticket.status !== 'resuelto' || !ticket.resolvedAt) {
      return false;
    }

    // Calcular días desde que fue resuelto
    const diasDesdeResuelto = (Date.now() - new Date(ticket.resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
    
    // Debe estar dentro del período permitido (mismo que días para autocierre)
    return diasDesdeResuelto <= config.diasAutocierreResuelto;
  }

  /**
   * Procesar reapertura automática
   * 
   * Cambia el estado del ticket de "resuelto" a "en_progreso",
   * incrementa el contador de reaperturas y registra un evento.
   * 
   * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
   * @param {Object} ticket - Objeto ticket a reabrir
   * @param {number} userId - ID del usuario que causa la reapertura
   * @returns {Promise<void>}
   * 
   * @example
   * await TicketService.processAutoReopen(sequelize, ticket, userId);
   */
  static async processAutoReopen(sequelize, ticket, userId) {
    const { Soporte_Ticket, Soporte_TicketEvento } = require('../../models/soporteModel').soporteModelInit(sequelize);

    return await sequelize.transaction(async (t) => {
       // Actualizar ticket: cambiar estado, incrementar contador, actualizar actividad
      await Soporte_Ticket.update({
        status: 'abierto',
        reopenCount: sequelize.literal('"reopenCount" + 1'),
        lastActivityAt: new Date(),
        resolvedAt: null, // Limpiar fecha de resolución
        closedAt: null    // También limpiar closedAt si existe
      }, {
        where: { id: ticket.id },
        transaction: t
      });

      // Obtener el ticket actualizado para obtener el nuevo reopenCount
      const ticketActualizado = await Soporte_Ticket.findByPk(ticket.id, { transaction: t });

      // Registrar evento de reapertura
      await Soporte_TicketEvento.create({
        ticketId: ticket.id,
        eventType: 'reopened',
        actorId: userId,
        payload: {
          previousStatus: 'resuelto',
           newStatus: 'abierto',
          reopenCount: ticketActualizado.reopenCount
        }
      }, { transaction: t });
    });
  }

  /**
   * Marcar primera respuesta
   * 
   * Marca la fecha de primera respuesta del agente si aún no está marcada.
   * Esto se usa para calcular si se cumplió el SLA de primera respuesta.
   * 
   * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
   * @param {string} ticketId - UUID del ticket
   * @param {number} userId - ID del usuario que responde (debe ser agente)
   * @returns {Promise<void>}
   * 
   * @example
   * await TicketService.markFirstResponse(sequelize, ticketId, userId);
   */
  static async markFirstResponse(sequelize, ticketId, userId) {
    const { Soporte_Ticket } = require('../../models/soporteModel').soporteModelInit(sequelize);

    const ticket = await Soporte_Ticket.findByPk(ticketId);
    
    // Solo marcar si aún no está marcada
    if (ticket && !ticket.firstResponseAt) {
      await Soporte_Ticket.update({
        firstResponseAt: new Date()
      }, {
        where: { id: ticketId }
      });
    }
  }
}

module.exports = { TicketService };
