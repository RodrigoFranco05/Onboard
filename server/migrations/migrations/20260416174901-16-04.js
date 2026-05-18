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

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaIngreso', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaIngreso', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaEgreso', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaDesde', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaDesde', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaHasta', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaDesde', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaDesde', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaHasta', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhAsistenciaDiaria', 'fecha', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhAsistenciaDiaria', 'fecha', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhNovedadLiquidacion', 'fechaNovedad', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhNovedadLiquidacion', 'fechaNovedad', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaLiquidacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaLiquidacion', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: false
      });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaAprobacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaPago', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaPago', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaAprobacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaLiquidacion', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhLiquidacion', 'fechaLiquidacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhNovedadLiquidacion', 'fechaNovedad', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhNovedadLiquidacion', 'fechaNovedad', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhAsistenciaDiaria', 'fecha', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhAsistenciaDiaria', 'fecha', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaHasta', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaDesde', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhTurnoEmpleado', 'fechaVigenciaDesde', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaHasta', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaDesde', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhContratoHistorial', 'fechaVigenciaDesde', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaEgreso', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaIngreso', {
        type: Sequelize.DATE,  // ✅ Tipo del modelo (destino final)
        allowNull: true
      });

    await queryInterface.changeColumn('rrhhEmpleado', 'fechaIngreso', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
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