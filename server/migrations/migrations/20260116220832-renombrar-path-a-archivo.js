'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Renombrar columna 'path' a 'archivo' en la tabla soporte_TicketAdjunto
    await queryInterface.renameColumn('soporte_TicketAdjunto', 'path', 'archivo');
  },

  async down (queryInterface, Sequelize) {
    // Revertir: renombrar columna 'archivo' a 'path'
    await queryInterface.renameColumn('soporte_TicketAdjunto', 'archivo', 'path');
  }
};
