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

    await queryInterface.changeColumn('transaccionTipoFactura', 'idCondicionIva', {
        type: Sequelize.INTEGER,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.changeColumn('transaccionTipoFactura', 'idCondicionIva', {
        type: Sequelize.INTEGER,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

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