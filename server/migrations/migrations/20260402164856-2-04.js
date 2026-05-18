'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    await queryInterface.createTable('rrhhEmpleado', {
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      legajo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fechaIngreso: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      fechaEgreso: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estadoLaboral: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      idSupervisorEntidad: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      idNegocio: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'negocio',
          key: 'id'
        },
      },
      idUbicacionBase: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ubicacion',
          key: 'id'
        },
      },
      cbu: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
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

    await queryInterface.createTable('rrhhContratoHistorial', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      fechaVigenciaDesde: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      fechaVigenciaHasta: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      puesto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tipoJornada: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sueldoBase: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      pagoPorHora: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      pagoPorHoraExtra: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      sindicatoGremio: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      categoria: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
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

    await queryInterface.createTable('rrhhTurno', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      horaEntrada: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      horaSalida: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      minutosDescanso: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosToleranciaIngreso: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      horasBaseDiarias: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
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

    await queryInterface.createTable('rrhhTurnoEmpleado', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      idTurno: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rrhhTurno',
          key: 'id'
        },
      },
      fechaVigenciaDesde: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      fechaVigenciaHasta: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
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

    await queryInterface.createTable('rrhhFichajeEvento', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      idTurno: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'rrhhTurno',
          key: 'id'
        },
      },
      idUbicacion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ubicacion',
          key: 'id'
        },
      },
      tipoEvento: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fechaHoraServidor: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      fechaHoraCliente: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      latitud: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      longitud: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      precisionGps: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      fuente: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      metodoValidacion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      deviceIdLogico: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
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

    await queryInterface.createTable('rrhhAsistenciaDiaria', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      fecha: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      idTurno: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'rrhhTurno',
          key: 'id'
        },
      },
      idUbicacion: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ubicacion',
          key: 'id'
        },
      },
      primerFichajeAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      ultimoFichajeAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cantidadEventos: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosTrabajados: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosDescanso: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosTarde: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosExtra: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      minutosAusencia: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      estadoAsistencia: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      requiereRevision: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      cerrado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      origenCalculo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      observaciones: {
        type: Sequelize.TEXT,
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

    await queryInterface.createTable('rrhhNovedadLiquidacion', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      periodo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fechaNovedad: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      categoria: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tipoConcepto: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cantidad: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      montoUnitario: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      montoTotal: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      aprobado: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
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

    await queryInterface.createTable('rrhhLiquidacion', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'entidad',
          key: 'id'
        },
      },
      periodo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      estado: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fechaLiquidacion: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      fechaAprobacion: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      fechaPago: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      idContratoHistorial: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'rrhhContratoHistorial',
          key: 'id'
        },
      },
      totalHaberes: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      totalDescuentos: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      totalNeto: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      totalNovedades: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      totalMinutosExtra: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalMinutosTarde: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalMinutosAusencia: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      totalAsistenciasConsideradas: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
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

    await queryInterface.createTable('rrhhLiquidacionDetalle', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idLiquidacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rrhhLiquidacion',
          key: 'id'
        },
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      codigoConcepto: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tipoConcepto: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      origen: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cantidad: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      baseCalculo: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      importe: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      observaciones: {
        type: Sequelize.TEXT,
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

    await queryInterface.removeColumn('entidad', 'adjuntos');

    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.addColumn('transaccionTipoFactura', 'puntoVenta', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('transaccionTipoFactura', 'fechaEmision', {
      type: Sequelize.STRING,
      allowNull: true
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.removeColumn('transaccionTipoFactura', 'fechaEmision');

    await queryInterface.removeColumn('transaccionTipoFactura', 'puntoVenta');

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    // TODO: Restaurar columna adjuntos - requiere definición manual

    await queryInterface.dropTable('rrhhLiquidacionDetalle');

    await queryInterface.dropTable('rrhhLiquidacion');

    await queryInterface.dropTable('rrhhNovedadLiquidacion');

    await queryInterface.dropTable('rrhhAsistenciaDiaria');

    await queryInterface.dropTable('rrhhFichajeEvento');

    await queryInterface.dropTable('rrhhTurnoEmpleado');

    await queryInterface.dropTable('rrhhTurno');

    await queryInterface.dropTable('rrhhContratoHistorial');

    await queryInterface.dropTable('rrhhEmpleado');
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};