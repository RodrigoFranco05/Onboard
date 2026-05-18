'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    await queryInterface.addColumn('transaccion', 'estado', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('caja', 'idMedioDePago', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'medioDePago',
        key: 'id'
      }
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.removeColumn('caja', 'idMedioDePago');

    await queryInterface.removeColumn('transaccion', 'estado');
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};