'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Agregando parámetro ubicacionDefaultCreacionItems...');
    
    await queryInterface.bulkInsert('parametrosGlobales', [{
      nombreParametro: 'ubicacionDefaultCreacionItems',
      valorParametro: null,
      verEnMenu: false,
      descripcion: 'Ubicación por defecto al crear ítems',
      eliminado: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    
    console.log('✅ Parámetro ubicacionDefaultCreacionItems agregado exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Eliminando parámetro ubicacionDefaultCreacionItems...');
    
    await queryInterface.bulkDelete('parametrosGlobales', {
      nombreParametro: 'ubicacionDefaultCreacionItems'
    });
    
    console.log('✅ Parámetro ubicacionDefaultCreacionItems eliminado');
  }
};
