'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
    // Helper function para verificar si una tabla existe
    const tableExists = async (tableName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );
      `);
      return results[0].exists;
    };

    // Helper function para verificar si una columna existe
    const columnExists = async (tableName, columnName) => {
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = '${columnName}'
        AND table_schema = 'public'
      `);
      return columns.length > 0;
    };
    
    // Crear tabla entidadAtributo si no existe
    if (!(await tableExists('entidadAtributo'))) {
      await queryInterface.createTable('entidadAtributo', {
      idEntidadAtributo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      idTipoEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'tipoEntidad',
          key: 'id'
        },
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
    } else {
      console.log('⏭️  Tabla entidadAtributo ya existe, omitiendo...');
    }

    // Crear tabla entidadAtributoClasificacion si no existe
    if (!(await tableExists('entidadAtributoClasificacion'))) {
      await queryInterface.createTable('entidadAtributoClasificacion', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidadAtributo: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      idTipoEntidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
    } else {
      console.log('⏭️  Tabla entidadAtributoClasificacion ya existe, omitiendo...');
    }

    // Crear tabla sesionesUsuario si no existe
    if (!(await tableExists('sesionesUsuario'))) {
      await queryInterface.createTable('sesionesUsuario', {
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
    } else {
      console.log('⏭️  Tabla sesionesUsuario ya existe, omitiendo...');
    }

    // Crear tabla transaccionAuditoria si no existe
    if (!(await tableExists('transaccionAuditoria'))) {
      await queryInterface.createTable('transaccionAuditoria', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true,
        autoIncrement: true,
      },
      idTransaccion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'transaccion',
          key: 'id'
        },
      },
      idUsuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id'
        },
      },
      comentario: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      accion: {
        type: Sequelize.STRING,
        allowNull: false,
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
    } else {
      console.log('⏭️  Tabla transaccionAuditoria ya existe, omitiendo...');
    }

    // Eliminar tabla item_backup si existe
    if (await tableExists('item_backup')) {
      await queryInterface.dropTable('item_backup');
      console.log('✅ Tabla item_backup eliminada');
    } else {
      console.log('⏭️  Tabla item_backup no existe, omitiendo...');
    }

    // Agregar columna destinoTransferenciaInternaCaja si no existe
    if (!(await columnExists('ubicacion', 'destinoTransferenciaInternaCaja'))) {
      await queryInterface.addColumn('ubicacion', 'destinoTransferenciaInternaCaja', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      console.log('✅ Columna destinoTransferenciaInternaCaja agregada a ubicacion');
    } else {
      console.log('⏭️  Columna destinoTransferenciaInternaCaja ya existe en ubicacion');
    }

    // Agregar columna idCanal si no existe
    if (!(await columnExists('entidad', 'idCanal'))) {
      await queryInterface.addColumn('entidad', 'idCanal', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'canalEntidad',
          key: 'id'
        }
      });
      console.log('✅ Columna idCanal agregada a entidad');
    } else {
      console.log('⏭️  Columna idCanal ya existe en entidad');
    }

    // Agregar columna entidadDatoAtributo1 si no existe
    if (!(await columnExists('entidad', 'entidadDatoAtributo1'))) {
      await queryInterface.addColumn('entidad', 'entidadDatoAtributo1', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'entidadAtributoClasificacion',
        key: 'id'
      }
    });
      console.log('✅ Columna entidadDatoAtributo1 agregada a entidad');
    } else {
      console.log('⏭️  Columna entidadDatoAtributo1 ya existe en entidad');
    }

    // Agregar columnas entidadDatoAtributo2-10 si no existen
    for (let i = 2; i <= 10; i++) {
      const columnName = `entidadDatoAtributo${i}`;
      if (!(await columnExists('entidad', columnName))) {
        await queryInterface.addColumn('entidad', columnName, {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          references: {
            model: 'entidadAtributoClasificacion',
            key: 'id'
          }
        });
        console.log(`✅ Columna ${columnName} agregada a entidad`);
      } else {
        console.log(`⏭️  Columna ${columnName} ya existe en entidad`);
      }
    }

    // Conversión CHARACTER VARYING(255) → INTEGER requiere USING explícito
    // Verificar tipo actual de la columna rol
    const [rolColumnInfo] = await queryInterface.sequelize.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'usuario' 
      AND column_name = 'rol'
      AND table_schema = 'public'
    `);
    
    if (rolColumnInfo.length > 0 && rolColumnInfo[0].data_type !== 'integer') {
      await queryInterface.sequelize.query(`
        ALTER TABLE "usuario" 
        ALTER COLUMN "rol" TYPE integer 
        USING CASE 
          WHEN "rol" IS NULL OR "rol" = '' THEN NULL
          ELSE "rol"::integer 
        END;
      `);
      console.log('✅ Columna rol de usuario convertida a INTEGER');
    } else {
      console.log('⏭️  Columna rol de usuario ya es INTEGER');
    }

    // Cambiar tipo de valorParametro
    const [valorParamInfo] = await queryInterface.sequelize.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'parametrosGlobales' 
      AND column_name = 'valorParametro'
      AND table_schema = 'public'
    `);
    
    if (valorParamInfo.length > 0 && valorParamInfo[0].data_type !== 'text') {
      await queryInterface.changeColumn('parametrosGlobales', 'valorParametro', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      console.log('✅ Columna valorParametro cambiada a TEXT');
    } else {
      console.log('⏭️  Columna valorParametro ya es TEXT');
    }

    // Agregar columna pluBalanza si no existe
    if (!(await columnExists('item', 'pluBalanza'))) {
      await queryInterface.addColumn('item', 'pluBalanza', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Columna pluBalanza agregada a item');
    } else {
      console.log('⏭️  Columna pluBalanza ya existe en item');
    }

    // Agregar columna publicadoEcommerce si no existe
    if (!(await columnExists('item', 'publicadoEcommerce'))) {
      await queryInterface.addColumn('item', 'publicadoEcommerce', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      console.log('✅ Columna publicadoEcommerce agregada a item');
    } else {
      console.log('⏭️  Columna publicadoEcommerce ya existe en item');
    }

    // Cambiar tipos de columnas en itemUbicacion (solo si es necesario)
    await queryInterface.changeColumn('itemUbicacion', 'inventario', {
      type: Sequelize.DOUBLE,
      allowNull: true
    });
    console.log('✅ Columna inventario de itemUbicacion actualizada');

    await queryInterface.changeColumn('itemUbicacion', 'stockMinimo', {
      type: Sequelize.DOUBLE,
      allowNull: true
    });
    console.log('✅ Columna stockMinimo de itemUbicacion actualizada');

    // Cambiar tipos de columnas en lote
    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true
    });
    console.log('✅ Columna fechaFabricacion de lote actualizada');

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true
    });
    console.log('✅ Columna fechaVencimiento de lote actualizada');

    // Agregar columna afectaCuentaCorriente a tipoMedioDePago si no existe
    if (!(await columnExists('tipoMedioDePago', 'afectaCuentaCorriente'))) {
      await queryInterface.addColumn('tipoMedioDePago', 'afectaCuentaCorriente', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      console.log('✅ Columna afectaCuentaCorriente agregada a tipoMedioDePago');
    } else {
      console.log('⏭️  Columna afectaCuentaCorriente ya existe en tipoMedioDePago');
    }

    // Agregar columnas a tipoTransaccion si no existen
    const tipoTransaccionColumns = [
      { name: 'operacionCuentaCorriente', type: Sequelize.STRING },
      { name: 'operacionCaja', type: Sequelize.STRING },
      { name: 'verEnTransaccion', type: Sequelize.BOOLEAN },
      { name: 'verEnCaja', type: Sequelize.BOOLEAN },
      { name: 'verEnColumna', type: Sequelize.STRING }
    ];

    for (const col of tipoTransaccionColumns) {
      if (!(await columnExists('tipoTransaccion', col.name))) {
        await queryInterface.addColumn('tipoTransaccion', col.name, {
          type: col.type,
          allowNull: true
        });
        console.log(`✅ Columna ${col.name} agregada a tipoTransaccion`);
      } else {
        console.log(`⏭️  Columna ${col.name} ya existe en tipoTransaccion`);
      }
    }

    // Agregar columnas a transaccion si no existen
    if (!(await columnExists('transaccion', 'afectaCuentaCorriente'))) {
      await queryInterface.addColumn('transaccion', 'afectaCuentaCorriente', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      console.log('✅ Columna afectaCuentaCorriente agregada a transaccion');
    } else {
      console.log('⏭️  Columna afectaCuentaCorriente ya existe en transaccion');
    }

    if (!(await columnExists('transaccion', 'operacionParaCuentaCorriente'))) {
      await queryInterface.addColumn('transaccion', 'operacionParaCuentaCorriente', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      });
      console.log('✅ Columna operacionParaCuentaCorriente agregada a transaccion');
    } else {
      console.log('⏭️  Columna operacionParaCuentaCorriente ya existe en transaccion');
    }

    if (!(await columnExists('transaccion', 'archivosAdjuntos'))) {
      await queryInterface.addColumn('transaccion', 'archivosAdjuntos', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null
      });
      console.log('✅ Columna archivosAdjuntos agregada a transaccion');
    } else {
      console.log('⏭️  Columna archivosAdjuntos ya existe en transaccion');
    }

    // Agregar columnas a transaccionTipoFactura si no existen
    if (!(await columnExists('transaccionTipoFactura', 'idCondicionIva'))) {
      // Verificar si existe el id 4 en condicionIva
      const [condiciones] = await queryInterface.sequelize.query(
        `SELECT id FROM "condicionIva" WHERE id = 4 LIMIT 1`
      );
      
      // Usar el primer ID disponible si el 4 no existe
      const [primeraCondicion] = await queryInterface.sequelize.query(
        `SELECT id FROM "condicionIva" ORDER BY id LIMIT 1`
      );
      
      const defaultId = condiciones.length > 0 ? 4 : (primeraCondicion.length > 0 ? primeraCondicion[0].id : null);
      
      if (defaultId !== null) {
        await queryInterface.addColumn('transaccionTipoFactura', 'idCondicionIva', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: defaultId,
          references: {
            model: 'condicionIva',
            key: 'id'
          }
        });
        console.log(`✅ Columna idCondicionIva agregada a transaccionTipoFactura (default: ${defaultId})`);
      } else {
        // Si no hay condiciones IVA, agregar como nullable
        await queryInterface.addColumn('transaccionTipoFactura', 'idCondicionIva', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'condicionIva',
            key: 'id'
          }
        });
        console.log('✅ Columna idCondicionIva agregada a transaccionTipoFactura (nullable)');
      }
    } else {
      console.log('⏭️  Columna idCondicionIva ya existe en transaccionTipoFactura');
    }

    if (!(await columnExists('transaccionTipoFactura', 'CAE'))) {
      await queryInterface.addColumn('transaccionTipoFactura', 'CAE', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Columna CAE agregada a transaccionTipoFactura');
    } else {
      console.log('⏭️  Columna CAE ya existe en transaccionTipoFactura');
    }

    if (!(await columnExists('transaccionTipoFactura', 'vencimientoCAE'))) {
      await queryInterface.addColumn('transaccionTipoFactura', 'vencimientoCAE', {
        type: Sequelize.DATE,
        allowNull: true
      });
      console.log('✅ Columna vencimientoCAE agregada a transaccionTipoFactura');
    } else {
      console.log('⏭️  Columna vencimientoCAE ya existe en transaccionTipoFactura');
    }

    if (!(await columnExists('transaccionTipoFactura', 'numeroFactura'))) {
      await queryInterface.addColumn('transaccionTipoFactura', 'numeroFactura', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Columna numeroFactura agregada a transaccionTipoFactura');
    } else {
      console.log('⏭️  Columna numeroFactura ya existe en transaccionTipoFactura');
    }

    // Eliminar columna items_data_fixed.csv de listaDeMontos si existe
    if (await columnExists('listaDeMontos', 'items_data_fixed.csv')) {
      await queryInterface.removeColumn('listaDeMontos', 'items_data_fixed.csv');
      console.log('✅ Columna items_data_fixed.csv eliminada de listaDeMontos');
    } else {
      console.log('⏭️  Columna items_data_fixed.csv no existe en listaDeMontos');
    }
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
    // TODO: Restaurar columna items_data_fixed.csv - requiere definición manual

    await queryInterface.removeColumn('transaccionTipoFactura', 'numeroFactura');

    await queryInterface.removeColumn('transaccionTipoFactura', 'vencimientoCAE');

    await queryInterface.removeColumn('transaccionTipoFactura', 'CAE');

    await queryInterface.removeColumn('transaccionTipoFactura', 'idCondicionIva');

    await queryInterface.removeColumn('transaccion', 'archivosAdjuntos');

    await queryInterface.removeColumn('transaccion', 'operacionParaCuentaCorriente');

    await queryInterface.removeColumn('transaccion', 'afectaCuentaCorriente');

    await queryInterface.removeColumn('tipoTransaccion', 'verEnColumna');

    await queryInterface.removeColumn('tipoTransaccion', 'verEnCaja');

    await queryInterface.removeColumn('tipoTransaccion', 'verEnTransaccion');

    await queryInterface.removeColumn('tipoTransaccion', 'operacionCaja');

    await queryInterface.removeColumn('tipoTransaccion', 'operacionCuentaCorriente');

    await queryInterface.removeColumn('tipoMedioDePago', 'afectaCuentaCorriente');

    await queryInterface.changeColumn('lote', 'fechaVencimiento', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('lote', 'fechaFabricacion', {
      type: Sequelize.DATE,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('itemUbicacion', 'stockMinimo', {
      type: Sequelize.INTEGER,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.changeColumn('itemUbicacion', 'inventario', {
      type: Sequelize.INTEGER,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    await queryInterface.removeColumn('item', 'publicadoEcommerce');

    await queryInterface.removeColumn('item', 'pluBalanza');

    await queryInterface.changeColumn('parametrosGlobales', 'valorParametro', {
      type: Sequelize.STRING,
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });

    // Reversión INTEGER → CHARACTER VARYING(255)
    await queryInterface.changeColumn('usuario', 'rol', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo10');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo9');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo8');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo7');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo6');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo5');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo4');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo3');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo2');

    await queryInterface.removeColumn('entidad', 'entidadDatoAtributo1');

    await queryInterface.removeColumn('entidad', 'idCanal');

    await queryInterface.removeColumn('ubicacion', 'destinoTransferenciaInternaCaja');

    // TODO: Recrear tabla item_backup - requiere definición manual

    await queryInterface.dropTable('transaccionAuditoria');

    await queryInterface.dropTable('sesionesUsuario');

    await queryInterface.dropTable('entidadAtributoClasificacion');

    await queryInterface.dropTable('entidadAtributo');
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};