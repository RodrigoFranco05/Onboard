/**
 * Servicio para cálculo y validación de SLA (Service Level Agreement)
 * 
 * Este servicio se encarga de:
 * - Calcular fechas límite para primera respuesta y resolución
 * - Verificar si se han violado los SLA
 * - Marcar violaciones en la base de datos
 * 
 * Referencia: sistema-tickets-backend.md Sección 3.2
 */

class SLAService {
  
  /**
   * Calcular timestamps SLA desde ahora
   * 
   * @param {number} firstResponseHours - Horas para primera respuesta
   * @param {number} resolutionHours - Horas para resolución
   * @returns {Object} - Objeto con firstResponseDueAt y resolutionDueAt
   * 
   * @example
   * const sla = SLAService.calculateSLA(4, 48);
   * // Retorna: { firstResponseDueAt: Date, resolutionDueAt: Date }
   */
  static calculateSLA(firstResponseHours, resolutionHours) {
    const now = new Date();
    
    const firstResponseDueAt = new Date(now.getTime() + (firstResponseHours * 60 * 60 * 1000));
    const resolutionDueAt = new Date(now.getTime() + (resolutionHours * 60 * 60 * 1000));

    return {
      firstResponseDueAt,
      resolutionDueAt
    };
  }

  /**
   * Verificar si SLA está violado
   * 
   * @param {Object} ticket - Objeto ticket con campos SLA
   * @returns {Object} - Objeto con violaciones detectadas
   * 
   * @example
   * const violations = SLAService.checkSLAViolations(ticket);
   * // Retorna: { firstResponseViolated: true, resolutionViolated: false }
   */
  static checkSLAViolations(ticket) {
    const now = new Date();
    const violations = {};

    // First response violated
    // Se viola si:
    // - No se ha dado primera respuesta (firstResponseAt es null)
    // - Existe fecha límite (firstResponseDueAt)
    // - La fecha límite ya pasó
    if (!ticket.firstResponseAt && 
        ticket.firstResponseDueAt && 
        now > new Date(ticket.firstResponseDueAt)) {
      violations.firstResponseViolated = true;
    }

    // Resolution violated
    // Se viola si:
    // - No se ha resuelto (resolvedAt es null)
    // - Existe fecha límite (resolutionDueAt)
    // - La fecha límite ya pasó
    if (!ticket.resolvedAt && 
        ticket.resolutionDueAt && 
        now > new Date(ticket.resolutionDueAt)) {
      violations.resolutionViolated = true;
    }

    return violations;
  }

  /**
   * Marcar violaciones SLA en ticket
   * 
   * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
   * @param {string} ticketId - UUID del ticket
   * @param {Object} violations - Objeto con violaciones (firstResponseViolated, resolutionViolated)
   * @returns {Promise<void>}
   * 
   * @example
   * await SLAService.markViolations(sequelize, ticketId, {
   *   firstResponseViolated: true,
   *   resolutionViolated: false
   * });
   */
  static async markViolations(sequelize, ticketId, violations) {
    const { Soporte_Ticket } = require('../../models/soporteModel').soporteModelInit(sequelize);

    if (Object.keys(violations).length > 0) {
      await Soporte_Ticket.update(violations, {
        where: { id: ticketId }
      });
    }
  }
}

module.exports = { SLAService };
