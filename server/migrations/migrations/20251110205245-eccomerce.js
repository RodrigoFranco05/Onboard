'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    await queryInterface.createTable('menuFuncionalidadAcceso', {
      id: {
        type: Sequelize.STRING,
        allowNull: true,
        primaryKey: true,
      },
      idMenuAcceso: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'menuAcceso',
          key: 'id'
        },
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tipo: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      meta: {
        type: Sequelize.JSON,
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

    await queryInterface.createTable('rolFuncionalidadAcceso', {
      idRolUsuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'rolUsuario',
          key: 'id'
        },
      },
      idMenuAcceso: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'menuAcceso',
          key: 'id'
        },
      },
      idSector: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'menuFuncionalidadAcceso',
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

    await queryInterface.createTable('sesiones', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idUsuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id'
        },
      },
      tokenHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      dispositivo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      navegador: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sistemaOperativo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      activa: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      ultimaActividad: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      fechaCreacion: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      fechaExpiracion: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      cerradaPor: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
      },
      razonCierre: {
        type: Sequelize.STRING,
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

    await queryInterface.createTable('lote', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idItem: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'item',
          key: 'id'
        },
      },
      numeroLote: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fechaFabricacion: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      fechaVencimiento: {
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

    await queryInterface.createTable('loteItemUbicacion', {
      idLote: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'lote',
          key: 'id'
        },
      },
      idUbicacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'ubicacion',
          key: 'id'
        },
      },
      stock: {
        type: Sequelize.DOUBLE,
        allowNull: false,
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

    await queryInterface.createTable('loteTransaccion', {
      idLote: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'lote',
          key: 'id'
        },
      },
      idTransaccion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      cantidad: {
        type: Sequelize.DOUBLE,
        allowNull: false,
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

    await queryInterface.createTable('condicionIva', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      descripcion: {
        type: Sequelize.STRING,
        allowNull: false,
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

    await queryInterface.createTable('condicionIvaEntidad', {
      idCondicionIva: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'condicionIva',
          key: 'id'
        },
      },
      idEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'entidad',
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

    await queryInterface.addColumn('tipoEntidad', 'verEnCaja', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('tipoEntidad', 'verEnGasto', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.addColumn('parametrosGlobales', 'verEnMenu', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });

    await queryInterface.addColumn('parametrosGlobales', 'descripcion', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('item', 'usaGestionLotes', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.removeColumn('item', 'viewweb');

    // Conversión CHARACTER VARYING(255) → DOUBLE requiere USING explícito
    await queryInterface.sequelize.query(`
      ALTER TABLE "impuestoItem" 
      ALTER COLUMN "porcentaje" TYPE double precision 
      USING CASE 
        WHEN "porcentaje" IS NULL OR "porcentaje" = '' THEN NULL
        ELSE "porcentaje"::double precision 
      END;
    `);

    // Conversión CHARACTER VARYING(255) → DOUBLE requiere USING explícito
    await queryInterface.sequelize.query(`
      ALTER TABLE "impuestoItemTransaccion" 
      ALTER COLUMN "porcentaje" TYPE double precision 
      USING CASE 
        WHEN "porcentaje" IS NULL OR "porcentaje" = '' THEN NULL
        ELSE "porcentaje"::double precision 
      END;
    `);

    // Conversión CHARACTER VARYING(255) → DOUBLE requiere USING explícito
    await queryInterface.sequelize.query(`
      ALTER TABLE "impuestoItemTransaccion" 
      ALTER COLUMN "montoTotal" TYPE double precision 
      USING CASE 
        WHEN "montoTotal" IS NULL OR "montoTotal" = '' THEN NULL
        ELSE "montoTotal"::double precision 
      END;
    `);

    await queryInterface.addColumn('transaccionTipoFactura', 'idCondicionIva', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 4,
      primaryKey: true,
      references: {
        model: 'condicionIva',
        key: 'id'
      }
    });
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    await queryInterface.removeColumn('transaccionTipoFactura', 'idCondicionIva');

    // Reversión DOUBLE → CHARACTER VARYING(255)
    await queryInterface.changeColumn('impuestoItemTransaccion', 'montoTotal', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Reversión DOUBLE → CHARACTER VARYING(255)
    await queryInterface.changeColumn('impuestoItemTransaccion', 'porcentaje', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // Reversión DOUBLE → CHARACTER VARYING(255)
    await queryInterface.changeColumn('impuestoItem', 'porcentaje', {
      type: Sequelize.STRING,
      allowNull: true
    });

    // TODO: Restaurar columna viewweb - requiere definición manual

    await queryInterface.removeColumn('item', 'usaGestionLotes');

    await queryInterface.removeColumn('parametrosGlobales', 'descripcion');

    await queryInterface.removeColumn('parametrosGlobales', 'verEnMenu');

    await queryInterface.removeColumn('tipoEntidad', 'verEnGasto');

    await queryInterface.removeColumn('tipoEntidad', 'verEnCaja');

    await queryInterface.dropTable('condicionIvaEntidad');

    await queryInterface.dropTable('condicionIva');

    await queryInterface.dropTable('loteTransaccion');

    await queryInterface.dropTable('loteItemUbicacion');

    await queryInterface.dropTable('lote');

    await queryInterface.dropTable('sesiones');

    await queryInterface.dropTable('rolFuncionalidadAcceso');

    await queryInterface.dropTable('menuFuncionalidadAcceso');
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};