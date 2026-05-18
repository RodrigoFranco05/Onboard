'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Reinicializando tablas de soporte con IDs enteros...');

    // Eliminar tablas existentes (si existen) en orden de dependencias
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "soporte_TicketSecuencia" CASCADE;
      DROP TABLE IF EXISTS "soporte_TicketAdjunto" CASCADE;
      DROP TABLE IF EXISTS "soporte_TicketEvento" CASCADE;
      DROP TABLE IF EXISTS "soporte_TicketMensaje" CASCADE;
      DROP TABLE IF EXISTS "soporte_Ticket" CASCADE;
      DROP TABLE IF EXISTS "soporte_PlantillaRespuesta" CASCADE;
      DROP TABLE IF EXISTS "soporte_ConfigSoporte" CASCADE;
      DROP TABLE IF EXISTS "soporte_Categoria" CASCADE;
      DROP TABLE IF EXISTS "soporte_Prioridad" CASCADE;
    `);

    // Tablas base
    await queryInterface.createTable('soporte_Prioridad', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      firstResponseHours: { type: Sequelize.INTEGER, allowNull: false },
      resolutionHours: { type: Sequelize.INTEGER, allowNull: false },
      color: { type: Sequelize.STRING, allowNull: true },
      orden: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      activa: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_Categoria', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      modulo: { type: Sequelize.STRING, allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      orden: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      activa: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_ConfigSoporte', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant: { type: Sequelize.STRING, allowNull: false, unique: true },
      prefijoTicket: { type: Sequelize.STRING(4), allowNull: false },
      maxAttachmentSizeMb: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 50 },
      maxAttachmentsPerMessage: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 },
      diasAutocierreResuelto: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 30 },
      diasAutocierrePendienteValidacion: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 7 },
      tituloObligatorio: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      descripcionObligatoria: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      categoriaObligatoria: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      visualizacionEstadisticas: { type: Sequelize.STRING(50), allowNull: true, defaultValue: 'solo_agentes' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_PlantillaRespuesta', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      contenido: { type: Sequelize.TEXT, allowNull: false },
      categoriaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'soporte_Categoria', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      esPublica: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      activa: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_Ticket', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      numero: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      titulo: { type: Sequelize.TEXT, allowNull: false },
      descripcion: { type: Sequelize.TEXT, allowNull: true },
      tipo: { type: Sequelize.STRING(20), allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'nuevo' },
      prioridadId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'soporte_Prioridad', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      categoriaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'soporte_Categoria', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      requesterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuario', key: 'id' },
        onUpdate: 'CASCADE'
      },
      agentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuario', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      relatedEntityType: { type: Sequelize.STRING(50), allowNull: true },
      relatedEntityId: { type: Sequelize.INTEGER, allowNull: true },
      firstResponseDueAt: { type: Sequelize.DATE, allowNull: true },
      resolutionDueAt: { type: Sequelize.DATE, allowNull: true },
      firstResponseAt: { type: Sequelize.DATE, allowNull: true },
      firstResponseViolated: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      resolutionViolated: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      closedAt: { type: Sequelize.DATE, allowNull: true },
      lastActivityAt: { type: Sequelize.DATE, allowNull: true },
      reopenCount: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      messageCount: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_TicketMensaje', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'soporte_Ticket', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuario', key: 'id' },
        onUpdate: 'CASCADE'
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      isInternal: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_TicketEvento', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'soporte_Ticket', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      eventType: { type: Sequelize.STRING(50), allowNull: false },
      actorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuario', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      payload: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_TicketAdjunto', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'soporte_Ticket', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      mensajeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'soporte_TicketMensaje', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      path: { type: Sequelize.TEXT, allowNull: false },
      name: { type: Sequelize.TEXT, allowNull: false },
      contentType: { type: Sequelize.STRING(100), allowNull: false },
      size: { type: Sequelize.BIGINT, allowNull: false },
      eliminado: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('soporte_TicketSecuencia', {
      tenant: { type: Sequelize.STRING(100), primaryKey: true },
      ultimoNumero: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 }
    });

    console.log('✅ Tablas de soporte recreadas con IDs enteros');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Eliminando tablas de soporte (rollback)...');

    await queryInterface.dropTable('soporte_TicketSecuencia');
    await queryInterface.dropTable('soporte_TicketAdjunto');
    await queryInterface.dropTable('soporte_TicketEvento');
    await queryInterface.dropTable('soporte_TicketMensaje');
    await queryInterface.dropTable('soporte_Ticket');
    await queryInterface.dropTable('soporte_PlantillaRespuesta');
    await queryInterface.dropTable('soporte_ConfigSoporte');
    await queryInterface.dropTable('soporte_Categoria');
    await queryInterface.dropTable('soporte_Prioridad');

    console.log('✅ Tablas de soporte eliminadas');
  }
};
