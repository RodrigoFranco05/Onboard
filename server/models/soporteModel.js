/**
 * Modelos Sequelize para el módulo de Soporte
 * 
 * Este archivo define todos los modelos del sistema de tickets:
 * - Soporte_Ticket, Soporte_TicketMensaje, Soporte_TicketEvento, Soporte_TicketAdjunto
 * - Soporte_Categoria, Soporte_Prioridad, Soporte_Config, Soporte_PlantillaRespuesta, Soporte_TicketSecuencia
 * 
 * Referencia: sistema-tickets-backend.md Sección 2.1
 * Referencia: sistema-tickets-despliegue.md Sección 5.2
 */

const { DataTypes } = require('sequelize');

function soporteModelInit(sequelize) {
  // Importar adminModel para relaciones con Usuario
  const { adminModelInit } = require('./adminModel');
  const { Usuario } = adminModelInit(sequelize);
  
  // ============================================
  // MODELO: PRIORIDAD
  // ============================================
  const Soporte_Prioridad = sequelize.define('Soporte_Prioridad', {
    // id: {    //   type: DataTypes.UUID,    //   defaultValue: DataTypes.UUIDV4,    //   primaryKey: true    // },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    firstResponseHours: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    resolutionHours: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true
    },
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_Prioridad',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

  // ============================================
  // MODELO: CATEGORIA
  // ============================================
  const Soporte_Categoria = sequelize.define('Soporte_Categoria', {
    // id: {    //   type: DataTypes.UUID,    //   defaultValue: DataTypes.UUIDV4,    //   primaryKey: true    // },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    modulo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_Categoria',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

  // ============================================
  // MODELO: TICKET
  // ============================================
  const Soporte_Ticket = sequelize.define('Soporte_Ticket', {
    // id: {      type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4,      primaryKey: true    },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    numero: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false
    },
    titulo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['incidencia', 'solicitud']]
      }
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'nuevo',
      validate: {
        isIn: [[
          'nuevo', 'abierto', 'en_progreso', 'esperando_cliente', 'en_espera',
          'pendiente_validacion', 'pendiente_validacion_nube', 'resuelto', 'cerrado'
        ]]
      }
    },
    prioridadId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    agentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    relatedEntityType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    firstResponseDueAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolutionDueAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    firstResponseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    firstResponseViolated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolutionViolated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,

    },
    reopenCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,    
    },
    messageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_Ticket',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

  // ============================================
  // MODELO: TICKET MENSAJE
  // ============================================
  const Soporte_TicketMensaje = sequelize.define('Soporte_TicketMensaje', {
    // id: {    //   type: DataTypes.UUID,    //   defaultValue: DataTypes.UUIDV4,    //   primaryKey: true    // },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isInternal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_TicketMensaje',
    timestamps: true,
    // createdAt: 'createdAt',
    // // updatedAt: '// updatedAt'
  });

  // ============================================
  // MODELO: TICKET EVENTO
  // ============================================
  const Soporte_TicketEvento = sequelize.define('Soporte_TicketEvento', {
    // id: {      type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4,      primaryKey: true    },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    payload: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'soporte_TicketEvento',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

    // ============================================
    // MODELO: TICKET ADJUNTO
    // ============================================
    const Soporte_TicketAdjunto = sequelize.define('Soporte_TicketAdjunto', {
      //id: {      type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4,      primaryKey: true    },
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      mensajeId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      archivo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Contenido del archivo en base64'
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      contentType: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      size: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    }, {
      tableName: 'soporte_TicketAdjunto',
      timestamps: true,
      // createdAt: 'createdAt',
      // updatedAt: 'updated_at'
    });

  // ============================================
  // MODELO: CONFIG SOPORTE
  // ============================================
  const Soporte_Config = sequelize.define('Soporte_Config', {
    // id: {      type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4,      primaryKey: true
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tenant: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false
    },
    prefijoTicket: {
      type: DataTypes.STRING(4),
      allowNull: false
    },
    maxAttachmentSizeMb: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    maxAttachmentsPerMessage: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    diasAutocierreResuelto: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    diasAutocierrePendienteValidacion: {
      type: DataTypes.INTEGER,
      defaultValue: 7
    },
    tituloObligatorio: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    descripcionObligatoria: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    categoriaObligatoria: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    visualizacionEstadisticas: {
      type: DataTypes.STRING(50),
      defaultValue: 'solo_agentes',
      allowNull: true,
      validate: {
        isIn: [['solo_agentes', 'administradores_y_agentes']]
      }
    }
  }, {
    tableName: 'soporte_ConfigSoporte',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

  // ============================================
  // MODELO: PLANTILLA RESPUESTA
  // ============================================
  const Soporte_PlantillaRespuesta = sequelize.define('Soporte_PlantillaRespuesta', {
    // id: {      type: DataTypes.UUID,      defaultValue: DataTypes.UUIDV4,      primaryKey: true    },
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    contenido: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    categoriaId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    esPublica: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,    
    },
    activa: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_PlantillaRespuesta',
    timestamps: true,
    // createdAt: 'createdAt',
    // updatedAt: 'updated_at'
  });

  // ============================================
  // MODELO: TICKET SECUENCIA
  // ============================================
  const Soporte_TicketSecuencia = sequelize.define('Soporte_TicketSecuencia', {
    tenant: {
      type: DataTypes.STRING(100),
      primaryKey: true
    },
    ultimoNumero: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'soporte_TicketSecuencia',
    timestamps: false
  });

  // ============================================
  // MODELO: NOTIFICACION CONFIG (por usuario)
  // ============================================
  const Soporte_NotificacionConfig = sequelize.define('Soporte_NotificacionConfig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: 'usuario', key: 'id' }
    },
    notificarCreacion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notificarAsignacion: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'soporte_NotificacionConfig',
    timestamps: true
  });

  // ============================================
  // RELACIONES
  // ============================================

  // Soporte_Ticket
  Soporte_Ticket.belongsTo(Soporte_Prioridad, { 
    foreignKey: 'prioridadId', 
    as: 'prioridad' 
  });
  
  Soporte_Ticket.belongsTo(Soporte_Categoria, { 
    foreignKey: 'categoriaId', 
    as: 'categoria' 
  });
  
  // Relación con Usuario (Requester)
  Soporte_Ticket.belongsTo(Usuario, {
    foreignKey: 'requesterId',
    as: 'requester',
    targetKey: 'id'
  });
  
  // Relación con Usuario (Agent)
  Soporte_Ticket.belongsTo(Usuario, {
    foreignKey: 'agentId',
    as: 'Agent',
    targetKey: 'id'
  });
  
  Soporte_Ticket.hasMany(Soporte_TicketMensaje, { 
    foreignKey: 'ticketId', 
    as: 'mensajes' 
  });
  
  Soporte_Ticket.hasMany(Soporte_TicketEvento, { 
    foreignKey: 'ticketId', 
    as: 'eventos' 
  });
  
  Soporte_Ticket.hasMany(Soporte_TicketAdjunto, { 
    foreignKey: 'ticketId', 
    as: 'adjuntos' 
  });

  // Soporte_TicketMensaje
  Soporte_TicketMensaje.belongsTo(Soporte_Ticket, { 
    foreignKey: 'ticketId', 
    as: 'ticket' 
  });
  
  // Relación con Usuario (Author)
  Soporte_TicketMensaje.belongsTo(Usuario, {
    foreignKey: 'authorId',
    as: 'author',
    targetKey: 'id'
  });
  
  Soporte_TicketMensaje.hasMany(Soporte_TicketAdjunto, { 
    foreignKey: 'mensajeId', 
    as: 'adjuntos' 
  });

  // Soporte_TicketEvento
  Soporte_TicketEvento.belongsTo(Soporte_Ticket, { 
    foreignKey: 'ticketId', 
    as: 'ticket' 
  });
  
  // Relación con Usuario (Actor)
  Soporte_TicketEvento.belongsTo(Usuario, {
    foreignKey: 'actorId',
    as: 'actor',
    targetKey: 'id'
  });

  // Soporte_TicketAdjunto
  Soporte_TicketAdjunto.belongsTo(Soporte_Ticket, { 
    foreignKey: 'ticketId', 
    as: 'ticket' 
  });
  
  Soporte_TicketAdjunto.belongsTo(Soporte_TicketMensaje, { 
    foreignKey: 'mensajeId', 
    as: 'mensaje' 
  });

  // Soporte_PlantillaRespuesta
  Soporte_PlantillaRespuesta.belongsTo(Soporte_Categoria, { 
    foreignKey: 'categoriaId', 
    as: 'categoria' 
  });

  // Soporte_NotificacionConfig
  // Nota: soporteModelInit puede invocarse varias veces en la misma request
  // (distintos controllers la llaman). Sequelize no permite redefinir un alias,
  // por eso verificamos si la asociacion ya existe antes de crearla.
  if (!Soporte_NotificacionConfig.associations?.usuario) {
    Soporte_NotificacionConfig.belongsTo(Usuario, {
      foreignKey: 'usuarioId',
      as: 'usuario',
      targetKey: 'id'
    });
  }
  if (!Usuario.associations?.notificacionConfig) {
    Usuario.hasOne(Soporte_NotificacionConfig, {
      foreignKey: 'usuarioId',
      as: 'notificacionConfig'
    });
  }

  // ============================================
  // RETORNAR MODELOS
  // ============================================
  return {
    Soporte_Categoria,
    Soporte_Prioridad,
    Soporte_Config,
    Soporte_PlantillaRespuesta,
    Soporte_Ticket,
    Soporte_TicketMensaje,
    Soporte_TicketEvento,
    Soporte_TicketAdjunto,
    Soporte_TicketSecuencia,
    Soporte_NotificacionConfig
  };
}

module.exports = { soporteModelInit };
