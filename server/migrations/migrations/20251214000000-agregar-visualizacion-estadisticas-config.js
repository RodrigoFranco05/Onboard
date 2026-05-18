'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Agregando campo visualizacion_estadisticas a configSoporte...');
    
    // Verificar si la columna ya existe
    const tableDescription = await queryInterface.describeTable('configSoporte');
    
    if (!tableDescription.visualizacion_estadisticas) {
      await queryInterface.addColumn('configSoporte', 'visualizacion_estadisticas', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'solo_agentes',
        comment: 'Tipo de visualización de estadísticas: "solo_agentes" o "administradores_y_agentes"'
      });
      
      console.log('✅ Campo visualizacion_estadisticas agregado correctamente');
    } else {
      console.log('⚠️  El campo visualizacion_estadisticas ya existe');
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Eliminando campo visualizacion_estadisticas de configSoporte...');
    
    const tableDescription = await queryInterface.describeTable('configSoporte');
    
    if (tableDescription.visualizacion_estadisticas) {
      await queryInterface.removeColumn('configSoporte', 'visualizacion_estadisticas');
      console.log('✅ Campo visualizacion_estadisticas eliminado correctamente');
    } else {
      console.log('⚠️  El campo visualizacion_estadisticas no existe');
    }
  }
};

