'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Creando tablas del módulo de Soporte...');

    // 1. Tabla prioridad
    await queryInterface.createTable('prioridad', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      first_response_hours: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      resolution_hours: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      color: {
        type: Sequelize.STRING(7),
        allowNull: true
      },
      orden: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      activa: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 2. Tabla categoria
    await queryInterface.createTable('categoria', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      modulo: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      orden: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      activa: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 3. Tabla ticket
    await queryInterface.createTable('ticket', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      numero: {
        type: Sequelize.STRING(20),
        unique: true,
        allowNull: false
      },
      titulo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'nuevo'
      },
      prioridad_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'prioridad',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      categoria_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'categoria',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      requester_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      agent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      related_entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      related_entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      first_response_due_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolution_due_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      first_response_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      first_response_violated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      resolution_violated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_activity_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reopen_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      message_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 4. Tabla ticketMensaje
    await queryInterface.createTable('ticketMensaje', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'usuario',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_internal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 5. Tabla ticketEvento
    await queryInterface.createTable('ticketEvento', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      actor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuario',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      payload: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 6. Tabla ticketAdjunto
    await queryInterface.createTable('ticketAdjunto', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mensaje_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'ticketMensaje',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      path: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      content_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 7. Tabla configSoporte
    await queryInterface.createTable('configSoporte', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant: {
        type: Sequelize.STRING(100),
        unique: true,
        allowNull: false
      },
      prefijo_ticket: {
        type: Sequelize.STRING(4),
        allowNull: false
      },
      max_attachment_size_mb: {
        type: Sequelize.INTEGER,
        defaultValue: 50
      },
      max_attachments_per_message: {
        type: Sequelize.INTEGER,
        defaultValue: 5
      },
      dias_autocierre_resuelto: {
        type: Sequelize.INTEGER,
        defaultValue: 30
      },
      dias_autocierre_pendiente_validacion: {
        type: Sequelize.INTEGER,
        defaultValue: 7
      },
      dias_reapertura_permitida: {
        type: Sequelize.INTEGER,
        defaultValue: 7
      },
      titulo_obligatorio: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      descripcion_obligatoria: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      categoria_obligatoria: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 8. Tabla plantillaRespuesta
    await queryInterface.createTable('plantillaRespuesta', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      contenido: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      categoria_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'categoria',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      es_publica: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      activa: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      eliminado: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // 9. Tabla ticketSecuencia
    await queryInterface.createTable('ticketSecuencia', {
      tenant: {
        type: Sequelize.STRING(100),
        primaryKey: true
      },
      ultimo_numero: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      }
    });

    // 10. Crear índices para ticket
    await queryInterface.addIndex('ticket', ['numero'], {
      name: 'idx_ticket_numero'
    });
    await queryInterface.addIndex('ticket', ['status'], {
      name: 'idx_ticket_status',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['requester_id'], {
      name: 'idx_ticket_requester',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['agent_id'], {
      name: 'idx_ticket_agent',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['categoria_id'], {
      name: 'idx_ticket_categoria',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['prioridad_id'], {
      name: 'idx_ticket_prioridad',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['tipo'], {
      name: 'idx_ticket_tipo',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticket', ['first_response_violated', 'resolution_violated'], {
      name: 'idx_ticket_sla_violated',
      where: { 
        status: { [Sequelize.Op.notIn]: ['cerrado', 'resuelto'] }
      }
    });

    // 11. Crear índices para ticketMensaje
    await queryInterface.addIndex('ticketMensaje', ['ticket_id'], {
      name: 'idx_ticket_mensaje_ticket',
      where: { eliminado: false }
    });
    await queryInterface.addIndex('ticketMensaje', ['created_at'], {
      name: 'idx_ticket_mensaje_created',
      order: [['created_at', 'DESC']]
    });

    // 12. Crear índices para ticketEvento
    await queryInterface.addIndex('ticketEvento', ['ticket_id', 'created_at'], {
      name: 'idx_ticket_evento_ticket',
      order: [['created_at', 'DESC']]
    });

    // 13. Crear índices para ticketAdjunto
    await queryInterface.addIndex('ticketAdjunto', ['ticket_id'], {
      name: 'idx_ticket_adjunto_ticket',
      where: { eliminado: false }
    });

    // 14. Crear índices para categoria
    await queryInterface.addIndex('categoria', ['activa'], {
      name: 'idx_categoria_activa',
      where: { eliminado: false }
    });

    // 15. Crear índices para prioridad
    await queryInterface.addIndex('prioridad', ['activa'], {
      name: 'idx_prioridad_activa',
      where: { eliminado: false }
    });

    // 16. Agregar constraints CHECK para ticket.tipo
    await queryInterface.sequelize.query(`
      ALTER TABLE ticket 
      ADD CONSTRAINT check_ticket_tipo 
      CHECK (tipo IN ('incidencia', 'solicitud'));
    `);

    // 17. Agregar constraints CHECK para ticket.status
    await queryInterface.sequelize.query(`
      ALTER TABLE ticket 
      ADD CONSTRAINT check_ticket_status 
      CHECK (status IN ('nuevo', 'en_progreso', 'esperando_cliente', 'en_espera', 'pendiente_validacion', 'resuelto', 'cerrado'));
    `);

    // 18. Crear índice GIN para búsqueda full-text en ticket (PostgreSQL)
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_ticket_search ON ticket 
      USING GIN(to_tsvector('spanish', titulo || ' ' || COALESCE(descripcion, '')));
    `).catch(err => {
      // Si falla (por ejemplo, si no está habilitado el módulo de texto), solo loguear
      console.warn('⚠️ No se pudo crear índice GIN para búsqueda full-text:', err.message);
    });

    // 19. Crear índice GIN para búsqueda full-text en ticketMensaje (PostgreSQL)
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_ticket_mensaje_search ON "ticketMensaje" 
      USING GIN(to_tsvector('spanish', content));
    `).catch(err => {
      console.warn('⚠️ No se pudo crear índice GIN para búsqueda en mensajes:', err.message);
    });

    console.log('✅ Tablas del módulo de Soporte creadas correctamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo migración de tablas de Soporte...');

    // Eliminar índices primero
    await queryInterface.removeIndex('ticket', 'idx_ticket_numero').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_status').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_requester').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_agent').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_categoria').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_prioridad').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_tipo').catch(() => {});
    await queryInterface.removeIndex('ticket', 'idx_ticket_sla_violated').catch(() => {});
    await queryInterface.removeIndex('ticketMensaje', 'idx_ticket_mensaje_ticket').catch(() => {});
    await queryInterface.removeIndex('ticketMensaje', 'idx_ticket_mensaje_created').catch(() => {});
    await queryInterface.removeIndex('ticketEvento', 'idx_ticket_evento_ticket').catch(() => {});
    await queryInterface.removeIndex('ticketAdjunto', 'idx_ticket_adjunto_ticket').catch(() => {});
    await queryInterface.removeIndex('categoria', 'idx_categoria_activa').catch(() => {});
    await queryInterface.removeIndex('prioridad', 'idx_prioridad_activa').catch(() => {});

    // Eliminar índices GIN si existen
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_ticket_search;
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_ticket_mensaje_search;
    `).catch(() => {});

    // Eliminar constraints CHECK
    await queryInterface.sequelize.query(`
      ALTER TABLE ticket DROP CONSTRAINT IF EXISTS check_ticket_tipo;
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      ALTER TABLE ticket DROP CONSTRAINT IF EXISTS check_ticket_status;
    `).catch(() => {});

    // Eliminar tablas en orden inverso (respetando dependencias)
    await queryInterface.dropTable('ticketSecuencia');
    await queryInterface.dropTable('plantillaRespuesta');
    await queryInterface.dropTable('configSoporte');
    await queryInterface.dropTable('ticketAdjunto');
    await queryInterface.dropTable('ticketEvento');
    await queryInterface.dropTable('ticketMensaje');
    await queryInterface.dropTable('ticket');
    await queryInterface.dropTable('categoria');
    await queryInterface.dropTable('prioridad');

    console.log('✅ Migración revertida correctamente');
  }
};

