'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    await queryInterface.createTable('soporte_NotificacionConfig', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id'
        },
      },
      notificarCreacion: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      notificarAsignacion: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      }
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.dropTable('soporte_NotificacionConfig');
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};