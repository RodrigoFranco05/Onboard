'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.addColumn('transaccionItem', 'porcentajeInteres', {
      type: Sequelize.DOUBLE,
      allowNull: true
    });

    await queryInterface.addColumn('listaDeMontos', 'margenGanancia', {
      type: Sequelize.DECIMAL,
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('listaDeMontos', 'esProveedorReferente', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.removeColumn('listaDeMontos', 'esProveedorReferente');

    await queryInterface.removeColumn('listaDeMontos', 'margenGanancia');

    await queryInterface.removeColumn('transaccionItem', 'porcentajeInteres');

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};