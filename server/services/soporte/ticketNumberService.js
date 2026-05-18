/**
 * Servicio para generación de números de ticket secuenciales
 * 
 * Este servicio se encarga de generar números únicos y secuenciales
 * para tickets usando el formato: {PREFIJO}-{NUMERO}
 * Ejemplo: DEMO-0001, ACME-0042
 * 
 * Referencia: sistema-tickets-backend.md Sección 3.4
 */

class TicketNumberService {
  
  /**
   * Obtener siguiente número secuencial para tenant
   * 
   * @param {Sequelize} sequelize - Instancia de Sequelize del tenant
   * @param {string} tenant - Nombre del tenant
   * @param {string} prefijo - Prefijo del ticket (ej: "DEMO", "ACME")
   * @returns {Promise<string>} - Número formateado (ej: "DEMO-0001")
   * 
   * @example
   * const numero = await TicketNumberService.getNextNumber(sequelize, 'demo', 'DEMO');
   * // Retorna: "DEMO-0001"
   */
  static async getNextNumber(sequelize, tenant, prefijo) {
    const { Soporte_TicketSecuencia } = require('../../models/soporteModel').soporteModelInit(sequelize);

    // Usar transacción para evitar condiciones de carrera
    const result = await sequelize.transaction(async (t) => {
      // Obtener o crear secuencia para el tenant
      let [secuencia, created] = await Soporte_TicketSecuencia.findOrCreate({
        where: { tenant },
        defaults: { ultimoNumero: 0 },
        transaction: t
      });

      // Incrementar número
      const nuevoNumero = secuencia.ultimoNumero + 1;
      
      // Actualizar en base de datos
      await Soporte_TicketSecuencia.update({
        ultimoNumero: nuevoNumero
      }, {
        where: { tenant },
        transaction: t
      });

      return nuevoNumero;
    });

    // Formatear con padding: DEMO-0001
    const formatted = `${prefijo}-${String(result).padStart(4, '0')}`;
    return formatted;
  }
}

module.exports = { TicketNumberService };
