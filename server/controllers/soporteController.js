/**
 * Controlador para el módulo de Soporte
 * 
 * Este controlador maneja todos los endpoints relacionados con tickets de soporte:
 * - CRUD básico de tickets
 * - Acciones de tickets (tomar, reasignar, mensajes, cambiar estado)
 * - Gestión de categorías, prioridades, plantillas y configuración
 * 
 * Referencia: sistema-tickets-backend.md Sección 2.1
 */

const { Op } = require('sequelize');
const { soporteModelInit } = require('../models/soporteModel');
const { TicketService } = require('../services/soporte/ticketService');
const { SLAService } = require('../services/soporte/slaService');
const { AttachmentService } = require('../services/soporte/attachmentService');
const { TicketNumberService } = require('../services/soporte/ticketNumberService');
const { validarYCrearConfigSoporte } = require('../services/soporte/configSoporteValidator');
const { notificarTicketCreado, notificarTicketAsignado } = require('../services/soporte/soporteMailService');

// Función auxiliar para obtener modelo por asociación
const getModelForAssociation = (association, sequelize) => {
  const { Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
  const { adminModelInit } = require('../models/adminModel');
  const { Usuario } = adminModelInit(sequelize);
  const modelMap = {
    'prioridad': Soporte_Prioridad,
    'categoria': Soporte_Categoria,
    'Agent': Usuario
  };
  return modelMap[association];
};

const normalizarNombrePrioridad = (nombre = '') =>
  nombre
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const obtenerPrioridadBajaActiva = async (Soporte_Prioridad) => {
  const prioridadesActivas = await Soporte_Prioridad.findAll({
    where: {
      activa: true,
      eliminado: false
    },
    order: [['orden', 'ASC'], ['nombre', 'ASC']]
  });

  return (
    prioridadesActivas.find((prioridad) =>
      ['bajo', 'baja'].includes(normalizarNombrePrioridad(prioridad.nombre))
    ) || null
  );
};

// ============================================
// TICKETS - CRUD BÁSICO
// ============================================

/**
 * POST /soporteAPI/tickets
 * Crear nuevo ticket
 */
const crearTicket = async (req, res) => {
  try {
   // console.log('📝 [crearTicket] Iniciando creación de ticket...');
   // console.log('📝 [crearTicket] req.body:', req.body);
   // console.log('📝 [crearTicket] req.files:', req.files);
   // console.log('📝 [crearTicket] Content-Type:', req.headers['content-type']);
    
    const { sequelize, tenant } = req.db;
    const { Soporte_Ticket, Soporte_Prioridad, Soporte_Categoria, Soporte_TicketMensaje, Soporte_TicketEvento, Soporte_Config } = 
      soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    
    // Manejar JSON con archivos en base64
    let tipo, titulo, descripcion, prioridadId, categoriaId;
    let adjuntos = [];
    
    // Siempre esperamos JSON ahora (archivos vienen como base64 en el body)
    ({ tipo, titulo, descripcion, prioridadId, categoriaId, adjuntos = [] } = req.body);
    
    // Mantener como strings
    prioridadId = prioridadId || null;
    categoriaId = categoriaId || null;
    
    // Validar que los UUIDs no estén vacíos (trim si son strings)
    if (prioridadId && typeof prioridadId === 'string') {
      prioridadId = prioridadId.trim();
      if (prioridadId === '') prioridadId = null;
    }
    if (categoriaId && typeof categoriaId === 'string') {
      categoriaId = categoriaId.trim();
      if (categoriaId === '') categoriaId = null;
    }
    
   // console.log('📝 [crearTicket] Datos procesados:');
   // console.log('  - tipo:', tipo);
   // console.log('  - titulo:', titulo);
   // console.log('  - descripcion:', descripcion);
   // console.log('  - prioridadId:', prioridadId);
   // console.log('  - categoriaId:', categoriaId);
   // console.log('  - adjuntos count:', adjuntos ? adjuntos.length : 0);

    // 1. Asegurar que existe configuración
    let config = await Soporte_Config.findOne({ where: { tenant } });
    if (!config) {
      // Crear configuración si no existe
      config = await validarYCrearConfigSoporte(sequelize, tenant);
    }

    // 2. Validar campos obligatorios según config
    if (config.tituloObligatorio && !titulo) {
      return res.status(400).json({
        success: false,
        error: 'El título es obligatorio'
      });
    }

    if (config.descripcionObligatoria && !descripcion) {
      return res.status(400).json({
        success: false,
        error: 'La descripción es obligatoria'
      });
    }

    if (config.categoriaObligatoria && !categoriaId) {
      return res.status(400).json({
        success: false,
        error: 'La categoría es obligatoria'
      });
    }

    // 2.1. Validar longitud de campos
    if (titulo) {
      const tituloTrimmed = titulo.trim();
      if (tituloTrimmed.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'El título debe tener al menos 10 caracteres'
        });
      }
      if (tituloTrimmed.length > 150) {
        return res.status(400).json({
          success: false,
          error: 'El título no puede exceder 150 caracteres'
        });
      }
    }

    if (descripcion) {
      const descripcionTrimmed = descripcion.trim();
      if (descripcionTrimmed.length < 20) {
        return res.status(400).json({
          success: false,
          error: 'La descripción debe tener al menos 20 caracteres'
        });
      }
      if (descripcionTrimmed.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'La descripción no puede exceder 1,000 caracteres'
        });
      }
    }

    // 3. Validar tipo
    if (!tipo || !['incidencia', 'solicitud'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de ticket inválido. Debe ser "incidencia" o "solicitud"'
      });
    }

    // Si es solicitud, siempre forzar prioridad "bajo/baja"
    if (tipo === 'solicitud') {
      const prioridadBaja = await obtenerPrioridadBajaActiva(Soporte_Prioridad);
      if (!prioridadBaja) {
        return res.status(400).json({
          success: false,
          error: 'No hay una prioridad "bajo" activa configurada para solicitudes'
        });
      }
      prioridadId = prioridadBaja.id;
    }

    // 4. Validar prioridad y categoría existen
   // console.log('🔍 [crearTicket] Buscando prioridad con ID:', prioridadId, 'tipo:', typeof prioridadId);
    const prioridad = await Soporte_Prioridad.findByPk(prioridadId);
    if (!prioridad) {
      console.error('❌ [crearTicket] Soporte_Prioridad no encontrada con ID:', prioridadId);
      return res.status(400).json({
        success: false,
        error: `Soporte_Prioridad no válida (ID: ${prioridadId})`
      });
    }
    if (!prioridad.activa || prioridad.eliminado) {
      console.error('❌ [crearTicket] Soporte_Prioridad inactiva o eliminada:', prioridadId);
      return res.status(400).json({
        success: false,
        error: 'Soporte_Prioridad no válida (inactiva o eliminada)'
      });
    }
   // console.log('✅ [crearTicket] Soporte_Prioridad encontrada:', prioridad.nombre);

   // console.log('🔍 [crearTicket] Buscando categoría con ID:', categoriaId, 'tipo:', typeof categoriaId);
    const categoria = await Soporte_Categoria.findByPk(categoriaId);
    if (!categoria) {
      console.error('❌ [crearTicket] Categoría no encontrada con ID:', categoriaId);
      // Listar todas las categorías para debug
      const todasCategorias = await Soporte_Categoria.findAll({ attributes: ['id', 'nombre'] });
     // console.log('📋 [crearTicket] Categorías disponibles:', todasCategorias.map(c => ({ id: c.id, nombre: c.nombre })));
      return res.status(400).json({
        success: false,
        error: `Categoría no válida (ID: ${categoriaId})`
      });
    }
    if (!categoria.activa || categoria.eliminado) {
      console.error('❌ [crearTicket] Categoría inactiva o eliminada:', categoriaId);
      return res.status(400).json({
        success: false,
        error: 'Categoría no válida (inactiva o eliminada)'
      });
    }
   // console.log('✅ [crearTicket] Categoría encontrada:', categoria.nombre);

    // 5. Generar número de ticket
    const numero = await TicketNumberService.getNextNumber(sequelize, tenant, config.prefijoTicket);

    // 6. Calcular SLA
    const { firstResponseDueAt, resolutionDueAt } = 
      SLAService.calculateSLA(prioridad.firstResponseHours, prioridad.resolutionHours);

    // 7. Crear ticket en transacción
    const now = new Date();
    const result = await sequelize.transaction(async (t) => {
      // Crear ticket con fechas explícitas
      const ticket = await Soporte_Ticket.create({
        numero,
        titulo,
        descripcion,
        tipo,
        status: 'nuevo',
        prioridadId,
        categoriaId,
        requesterId: userId,
        firstResponseDueAt,
        resolutionDueAt,
        lastActivityAt: now,
        createdAt: now, // Establecer explícitamente
        updatedAt: now  // Establecer explícitamente
      }, { transaction: t });

      // Guardar adjuntos si existen (sin crear mensaje automático)
      let adjuntosGuardados = [];
      if (adjuntos && adjuntos.length > 0) {
        // Validar cantidad de adjuntos
        if (adjuntos.length > config.maxAttachmentsPerMessage) {
          throw new Error(`Máximo ${config.maxAttachmentsPerMessage} adjuntos por mensaje`);
        }

        // Adaptar archivos del JSON al formato esperado por AttachmentService
        // JSON proporciona: { name, type, size, data (base64) }
        // AttachmentService espera: { data (base64), name, contentType, size }
        const adjuntosAdaptados = adjuntos.map(file => ({
          data: file.data || file.base64 || file.content,
          name: file.name || file.filename || `archivo-${Date.now()}`,
          contentType: file.contentType || file.type || 'application/octet-stream',
          size: file.size || 0
        }));

        adjuntosGuardados = await AttachmentService.saveAttachments(
          sequelize, 
          tenant, 
          ticket.id, 
          null, // No hay mensaje inicial, adjuntos se asocian directamente al ticket
          adjuntosAdaptados,
          config.maxAttachmentSizeMb,
          t
        );
      }

      // Inicializar contador de mensajes en 0 (no hay mensaje automático)
      await Soporte_Ticket.update({
        messageCount: 0
      }, {
        where: { id: ticket.id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      const payloadCreated = {
        tipo,
        prioridad: prioridad.nombre,
        categoria: categoria.nombre,
        adjuntosCount: adjuntosGuardados.length
      };
     // console.log('🔍 [crearTicket] Creando evento "created" con payload:', JSON.stringify(payloadCreated));
     // console.log('🔍 [crearTicket] adjuntosGuardados.length:', adjuntosGuardados.length);
      await Soporte_TicketEvento.create({
        ticketId: ticket.id,
        eventType: 'created',
        actorId: userId,
        payload: payloadCreated,
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      return { ticket, adjuntosGuardados };
    });

    // 8. Cargar relaciones para respuesta
    const ticketCompleto = await Soporte_Ticket.findByPk(result.ticket.id, {
      include: [
        { model: Soporte_Prioridad, as: 'prioridad', attributes: ['id', 'nombre', 'color', 'orden'] },
        { model: Soporte_Categoria, as: 'categoria', attributes: ['id', 'nombre', 'modulo'] }
      ]
    });

   // console.log('✅ [crearTicket] Soporte_Ticket creado exitosamente:', ticketCompleto.id);

    res.status(201).json({
      success: true,
      ticket: ticketCompleto
    });

    // Notificacion por email (fire-and-forget, no bloquea la respuesta)
    notificarTicketCreado(sequelize, tenant, {
      numero: ticketCompleto.numero,
      titulo: ticketCompleto.titulo,
      descripcion: ticketCompleto.descripcion,
      tipo: ticketCompleto.tipo,
      prioridad: ticketCompleto.prioridad?.nombre || 'N/A',
      categoria: ticketCompleto.categoria?.nombre || 'N/A'
    });

  } catch (error) {
    console.error('❌ [crearTicket] Error al crear ticket:', error);
    console.error('❌ [crearTicket] Error message:', error.message);
    console.error('❌ [crearTicket] Error stack:', error.stack);
    
    // Manejar errores específicos (400)
    if (error.message && (
      error.message.includes('obligatorio') ||
      error.message.includes('inválido') ||
      error.message.includes('no válida') ||
      error.message.includes('no válido') ||
      error.message.includes('Máximo')
    )) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear el ticket'
    });
  }
};

/**
 * GET /soporteAPI/tickets
 * Listar tickets con filtros
 */
const listarTickets = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
    const { Sequelize } = require('sequelize');
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    // Log completo de req.query para debugging
    // console.log('🔍 [listarTickets] req.query completo:', JSON.stringify(req.query, null, 2));
    
    const {
      status, prioridad, categoria, tipo, mine, unassigned, assignedToMe, includeClosed,
      requester, agent, search, numero,
      page = 1, limit = 20, sort = 'createdAt', order = 'DESC'
    } = req.query;

    // Construir filtros
    const where = { eliminado: false };

    // Filtrado por rol: Usuarios normales solo ven sus tickets
    // Agentes (Agente Soporte o Soporte) y Administradores ven todos los tickets
    const esAgente = userRole === 'Agente Soporte' || userRole === 'Soporte';
    const esAdmin = userRole === 'Administrador';
    
    // console.log('🔍 [listarTickets] Rol usuario:', userRole, '| Es agente:', esAgente, '| Es admin:', esAdmin);
    // console.log('🔍 [listarTickets] Parámetros recibidos:', {       mine, unassigned, assignedToMe, status, prioridad, categoria, tipo, search, numero, requester, agent, userId     });
    // console.log('🔍 [listarTickets] Cookies recibidas:', req.cookies);
    
    // Filtro: tickets asignados a mí (para agentes/administradores en "Mis Tickets")
    // Hay dos casos:
    // 1. includeClosed=true (TablaTicketsComponent - sección "Mis Tickets"): TODOS los estados (incluidos cerrados)
    // 2. includeClosed=false o undefined (BandejasAgenteComponent - filtro "Mis Tickets"): Excluir cerrados
    if (assignedToMe === 'true' && (esAgente || esAdmin)) {
      const estadosAbierto = ['nuevo', 'abierto', 'en_progreso', 'esperando_cliente', 'en_espera'];
      const estadosCompletado = ['pendiente_validacion'];
      const estadosPrueba = ['pendiente_validacion_nube'];
      const estadosPermitidos = [...estadosAbierto, ...estadosCompletado, ...estadosPrueba];
      
      // Si includeClosed es true, no filtrar por estado (mostrar todos)
      // Si includeClosed es false o undefined, excluir cerrados
      if (includeClosed === 'true') {
        // Sección "Mis Tickets": TODOS los estados
        where[Op.or] = [
          { requesterId: userId },
          { agentId: userId }
        ];
       // console.log('🔍 [listarTickets] Aplicando filtro Mis Tickets (todos los estados, incluyendo cerrados):', { userId });
      } else {
        // Filtro "Mis Tickets" en TICKETS: Excluir cerrados
        where[Op.or] = [
          {
            requesterId: userId,
            status: { [Op.in]: estadosPermitidos }
          },
          {
            agentId: userId,
            status: { [Op.in]: estadosPermitidos }
          }
        ];
       // console.log('🔍 [listarTickets] Aplicando filtro Mis Tickets (excluyendo cerrados):', { userId, estadosPermitidos });
      }
    }
    // Solo aplicar filtro de requesterId si NO es agente/admin Y (es usuario normal O se solicita explícitamente mine)
    // Si es agente/admin, puede ver todos los tickets (incluyendo sin asignar) a menos que se use assignedToMe
    else if ((userRole === 'Usuario' || userRole === 'Vendedor' || mine === 'true') && !esAgente && !esAdmin) {
      where.requesterId = userId;
     // console.log('🔍 [listarTickets] Aplicando filtro requesterId:', userId);
    } else if (esAgente || esAdmin) {
     // console.log('✅ [listarTickets] Usuario es agente/admin, puede ver todos los tickets (incluyendo sin asignar)');
    }

    // Filtro: tickets sin asignar
    // Los agentes y administradores pueden ver tickets sin asignar
    if (unassigned === 'true') {
      // Limpiar cualquier filtro previo que pueda entrar en conflicto
      // (especialmente Op.or de Mis Tickets o requesterId)
      if (where[Op.or]) {
        delete where[Op.or];
      }
      if (where.requesterId) {
        delete where.requesterId;
      }
      if (where.agentId && where.agentId !== null) {
        delete where.agentId;
      }
      
      // Aplicar filtros de "Sin Asignar"
      where.agentId = null;
      where.status = 'nuevo';
      
      // No restringir por requesterId para agentes/admin cuando buscan sin asignar
      // (ya se maneja arriba con el filtro de rol)
     // console.log('🔍 [listarTickets] Aplicando filtro "Sin Asignar"');
    }

    // Filtro: estado
    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(',');
      
      // Si el filtro es "nuevo" y viene de la bandeja "Nuevos", aplicar filtro de fecha (creados HOY)
      // Verificamos si viene el parámetro especial "nuevos_hoy" o si status es "nuevo" sin otros filtros
      if (statusArray.length === 1 && statusArray[0] === 'nuevo' && req.query.nuevos_hoy === 'true') {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);
        // ✅ Usar createdAt directamente (snake_case) para evitar problemas de mapeo
        // Si ya hay Op.and u Op.or, agregar la condición de fecha correctamente
        if (where[Op.and]) {
          where[Op.and].push({
            createdAt: {
              [Op.gte]: hoy,
              [Op.lte]: finDia
            }
          });
        } else if (where[Op.or]) {
          // Si hay Op.or, convertir a Op.and
          const existingOr = where[Op.or];
          delete where[Op.or];
          where[Op.and] = [
            existingOr,
            {
              createdAt: {
                [Op.gte]: hoy,
                [Op.lte]: finDia
              }
            }
          ];
        } else {
          where.createdAt = {
            [Op.gte]: hoy,
            [Op.lte]: finDia
          };
        }
        // No filtrar por status, mostrar cualquier estado creado hoy
       // console.log('🔍 [listarTickets] Aplicando filtro "Nuevos" (creados HOY):', { desde: hoy, hasta: finDia });
      } else {
        // Determinar estados a filtrar
        let estadosAFiltrar = statusArray;
        
        // ✅ Convertir estados visibles a estados internos
        // Mapeo de estados visibles a estados internos
        const mapeoEstadosVisibles = {
          'abierto': ['nuevo', 'abierto', 'esperando_cliente', 'en_espera'],
          'en_progreso': ['en_progreso'],
          'completado': ['pendiente_validacion'],
          'prueba': ['pendiente_validacion_nube'],
          'cerrado': ['resuelto', 'cerrado']
        };
        
        // Convertir estados visibles a internos
        estadosAFiltrar = statusArray.flatMap(estado => {
          // Si es un estado visible, convertir a estados internos
          if (mapeoEstadosVisibles[estado]) {
            return mapeoEstadosVisibles[estado];
          }
          // Si ya es un estado interno, mantenerlo
          return [estado];
        });
        
        // Eliminar duplicados
        estadosAFiltrar = [...new Set(estadosAFiltrar)];
        
       // console.log('🔍 [listarTickets] Estados visibles recibidos:', statusArray);
       // console.log('🔍 [listarTickets] Estados internos convertidos:', estadosAFiltrar);
        
        if (statusArray.includes('esperando_cliente')) {
          const estadosEsperandoCliente = ['esperando_cliente', 'pendiente_validacion', 'pendiente_validacion_nube'];
          const otrosEstados = estadosAFiltrar.filter(s => !estadosEsperandoCliente.includes(s));
          estadosAFiltrar = otrosEstados.length > 0 ? [...estadosEsperandoCliente, ...otrosEstados] : estadosEsperandoCliente;
         // console.log('🔍 [listarTickets] Aplicando filtro "Esperando Cliente" (incluye pendiente_validacion y pendiente_validacion_nube)');
        }
        // Si el filtro es "cerrado", incluir también "resuelto"
        if (statusArray.includes('cerrado')) {
          const estadosCerrado = ['cerrado', 'resuelto'];
          const otrosEstados = estadosAFiltrar.filter(s => !estadosCerrado.includes(s));
          estadosAFiltrar = otrosEstados.length > 0 ? [...estadosCerrado, ...otrosEstados] : estadosCerrado;
         // console.log('🔍 [listarTickets] Aplicando filtro "Cerrado" (incluye resuelto y cerrado)');
        }

        // Si ya hay un Op.or (por ejemplo, de "Mis Tickets"), necesitamos combinar el filtro de estado
        // con las condiciones existentes usando Op.and
        if (where[Op.or]) {
          // Verificar si el Op.or tiene condiciones con status (de "Mis Tickets" sin includeClosed)
          const existingOr = where[Op.or];
          const tieneStatusEnOr = Array.isArray(existingOr) && existingOr.some(cond => cond.status);
          
          delete where[Op.or];
          
          // Separar condiciones base de las especiales
          const baseConditions = {};
          Object.keys(where).forEach(key => {
            if (key !== Op.and && key !== Op.or) {
              baseConditions[key] = where[key];
            }
          });
          
          // Si el Op.or ya tiene status, necesitamos reemplazarlo con el nuevo filtro
          // Si no tiene status, agregarlo como condición adicional
          let orConditions = existingOr;
          if (tieneStatusEnOr) {
            // Reemplazar el status en cada condición del Op.or
            orConditions = existingOr.map(condition => {
              const newCondition = { ...condition };
              newCondition.status = { [Op.in]: estadosAFiltrar };
              return newCondition;
            });
          }
          
          // Si el Op.or no tenía status (includeClosed=true), agregar el filtro de estado usando Op.and
          // Si el Op.or ya tenía status (includeClosed=false), reemplazarlo en cada condición
          if (!tieneStatusEnOr) {
            // Caso: includeClosed=true (Op.or sin status) + filtro de estado
            // Construir: (baseConditions) AND (Op.or) AND (status IN estadosAFiltrar)
            where[Op.and] = [];
            if (Object.keys(baseConditions).length > 0) {
              where[Op.and].push(baseConditions);
            }
            where[Op.and].push({ [Op.or]: existingOr }); // Usar existingOr original, no orConditions
            where[Op.and].push({ status: { [Op.in]: estadosAFiltrar } });
            
            // Limpiar condiciones base del where principal
            Object.keys(baseConditions).forEach(key => {
              delete where[key];
            });
            // NO establecer where[Op.or] aquí, ya está en Op.and
          } else {
            // Caso: includeClosed=false (Op.or con status) + filtro de estado
            // Reemplazar el status en el Op.or
            where[Op.or] = orConditions;
            
            // Agregar condiciones base
            Object.keys(baseConditions).forEach(key => {
              where[key] = baseConditions[key];
            });
          }
          
         // console.log('🔍 [listarTickets] Combinando filtro de estado con Op.or existente (Mis Tickets)');
        } else {
          // Si no hay Op.or, aplicar el filtro de estado normalmente
          where.status = { [Op.in]: estadosAFiltrar };
        }
      }
    }

    // Filtro: tipo
    if (tipo) {
      where.tipo = tipo;
    }

    // Filtro: prioridad (por nombre)
    if (prioridad && prioridad.trim() !== '') {
      const prioridadArray = Array.isArray(prioridad) ? prioridad : prioridad.split(',').map(p => p.trim()).filter(p => p !== '');
     // console.log('🔍 [listarTickets] Buscando prioridades por nombre:', prioridadArray);
      const prioridades = await Soporte_Prioridad.findAll({
        where: { 
          nombre: { [Op.in]: prioridadArray },
          activa: true,
          eliminado: false
        }
      });
     // console.log('🔍 [listarTickets] Prioridades encontradas:', prioridades.map(p => ({ id: p.id, nombre: p.nombre })));
      if (prioridades.length > 0) {
        const prioridadIds = prioridades.map(p => p.id);
        where.prioridadId = { [Op.in]: prioridadIds };
       // console.log('🔍 [listarTickets] Filtro prioridadId aplicado:', prioridadIds);
      } else {
        // Si no encuentra ninguna prioridad, retornar vacío
       // console.log('⚠️ [listarTickets] No se encontraron prioridades con esos nombres, retornando vacío');
        return res.json({
          success: true,
          tickets: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    }

    // Filtro: categoría
    if (categoria) {
      where.categoriaId = categoria;
    }

    // Filtro: requester (solo admin/agente)
    if (requester && (esAdmin || esAgente)) {
      // console.log('🔍 [listarTickets] Aplicando filtro requester:', requester);
      where.requesterId = parseInt(requester);
    }

    // Filtro: agent (solo admin/agente)
    if (agent && (esAdmin || esAgente)) {
      // console.log('🔍 [listarTickets] Aplicando filtro agent:', agent);
      where.agentId = parseInt(agent);
    }

    // Filtro: número de ticket
    if (numero) {
      where.numero = numero;
    }

    // Filtro: búsqueda de texto (full-text search)
    // IMPORTANTE: Usar Op.and para combinar con otros filtros sin sobrescribirlos
    if (search) {
      const searchConditions = [
        { titulo: { [Op.iLike]: `%${search}%` } },
        { descripcion: { [Op.iLike]: `%${search}%` } },
        { numero: { [Op.iLike]: `%${search}%` } }
      ];
      
      // Separar condiciones base de las condiciones especiales (Op.or, Op.and)
      const baseConditions = {};
      const specialConditions = [];
      
      Object.keys(where).forEach(key => {
        if (key === Op.or || key === Op.and) {
          // Mantener condiciones especiales existentes
          if (Array.isArray(where[key])) {
            specialConditions.push(...where[key]);
          } else {
            specialConditions.push(where[key]);
          }
        } else {
          // Agregar condiciones base
          baseConditions[key] = where[key];
        }
      });
      
      // Construir array de condiciones AND
      const andConditions = [];
      
      // Agregar todas las condiciones base como objetos individuales
      Object.keys(baseConditions).forEach(key => {
        andConditions.push({ [key]: baseConditions[key] });
      });
      
      // Agregar condiciones especiales existentes
      if (specialConditions.length > 0) {
        specialConditions.forEach(condition => {
          andConditions.push(condition);
        });
      }
      
      // Agregar condición de búsqueda
      andConditions.push({ [Op.or]: searchConditions });
      
      // Limpiar where y reconstruir con Op.and
      Object.keys(where).forEach(key => delete where[key]);
      where[Op.and] = andConditions;
      
     // console.log('🔍 [listarTickets] Aplicando filtro search con Op.and:', search);
     // console.log('🔍 [listarTickets] Where después de search:', JSON.stringify(where, null, 2));
    }
    
    // Log final del where antes de ejecutar la query
    // Nota: JSON.stringify no serializa correctamente Op.in, así que hacemos un log manual
   // console.log('🔍 [listarTickets] Where final antes de query:');
   // console.log('  - eliminado:', where.eliminado);
   // console.log('  - prioridadId:', where.prioridadId ? `Op.in([${Array.isArray(where.prioridadId[Op.in]) ? where.prioridadId[Op.in].join(', ') : 'N/A'}])` : 'no aplicado');
   // console.log('  - status:', where.status);
   // console.log('  - agentId:', where.agentId);
   // console.log('  - requesterId:', where.requesterId);
   // console.log('  - categoriaId:', where.categoriaId);
   // console.log('  - Op.and:', where[Op.and] ? `${where[Op.and].length} condiciones` : 'no aplicado');

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener modelo Usuario para incluir agente
    const { adminModelInit } = require('../models/adminModel');
    const { Usuario } = adminModelInit(sequelize);
    
    // Mapear campos de sorting del frontend a campos del backend
    let sortField = sort;
    let sortOrder = order.toUpperCase();
    
    // Mapear campos de asociaciones
    const sortMappings = {
      'prioridad': 'prioridad.orden',  // Cambiado de 'nombre' a 'orden' para orden lógico
      'categoria': 'categoria.nombre',
      'agent': 'Agent.nombre'
    };
    
    // Si el campo está en los mapeos, usar el campo mapeado
    if (sortMappings[sort]) {
      sortField = sortMappings[sort];
    }
    
    // Construir ordenamiento
    let orderClause;
    if (sortField.includes('.')) {
      // Para campos de asociaciones, usar array con el campo completo
      const [association, field] = sortField.split('.');
      orderClause = [{ model: getModelForAssociation(association, sequelize), as: association }, field, sortOrder];
    } else {
      // Para campos directos
      orderClause = [sortField, sortOrder];
    }
    
    // Ejecutar query
    const { count, rows: tickets } = await Soporte_Ticket.findAndCountAll({
      where,
      include: [
        { 
          model: Soporte_Prioridad, 
          as: 'prioridad', 
          attributes: ['id', 'nombre', 'color', 'orden'],
          required: false
        },
        { 
          model: Soporte_Categoria, 
          as: 'categoria', 
          attributes: ['id', 'nombre', 'modulo'],
          required: false
        },
        {
          model: Usuario,
          as: 'Agent',
          attributes: ['id', 'usuario', 'nombre', 'apellido'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [orderClause]
    });
    
   // console.log(`✅ [listarTickets] Query ejecutada: ${count} tickets encontrados, ${tickets.length} en esta página`);

    // Convertir tickets a JSON y asegurar que los campos de fecha estén en camelCase
    const ticketsJSON = tickets.map(ticket => {
      const ticketJSON = ticket.toJSON ? ticket.toJSON() : ticket;
      
      // Asegurar que createdAt esté disponible (puede venir como createdAt)
      if (!ticketJSON.createdAt && ticketJSON.createdAt) {
        ticketJSON.createdAt = ticketJSON.createdAt;
      }
      if (!ticketJSON.updatedAt && ticketJSON.updated_at) {
        ticketJSON.updatedAt = ticketJSON.updated_at;
      }
      if (!ticketJSON.lastActivityAt && ticketJSON.lastActivityAt) {
        ticketJSON.lastActivityAt = ticketJSON.lastActivityAt;
      }
      if (!ticketJSON.resolvedAt && ticketJSON.resolvedAt) {
        ticketJSON.resolvedAt = ticketJSON.resolvedAt;
      }
      if (!ticketJSON.closedAt && ticketJSON.closedAt) {
        ticketJSON.closedAt = ticketJSON.closedAt;
      }
      if (!ticketJSON.firstResponseAt && ticketJSON.firstResponseAt) {
        ticketJSON.firstResponseAt = ticketJSON.firstResponseAt;
      }
      
      // Mapear también el agente si existe (para mostrar nombre completo)
      if (ticketJSON.Agent) {
        const agente = ticketJSON.Agent;
        ticketJSON.Agent = {
          id: agente.id,
          nombreUsuario: agente.usuario || agente.nombreUsuario, // Mapear 'usuario' a 'nombreUsuario' para compatibilidad
          usuario: agente.usuario,
          nombre: agente.nombre,
          apellido: agente.apellido
        };
      }

      ticketJSON._tenant = req.db.tenant;

      return ticketJSON;
    });

    res.json({
      success: true,
      tickets: ticketsJSON,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error al listar tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tickets'
    });
  }
};

/**
 * GET /soporteAPI/tickets/:id
 * Obtener detalle de ticket
 */
const obtenerTicket = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketMensaje, Soporte_TicketEvento, Soporte_TicketAdjunto, Soporte_Prioridad, Soporte_Categoria } = 
      soporteModelInit(sequelize);
    
    // Obtener modelo Usuario (debe ser el mismo que se usa en soporteModelInit)
    const { adminModelInit } = require('../models/adminModel');
    const { Usuario } = adminModelInit(sequelize);
    
    // Usar el modelo desde sequelize.models para asegurar que sea la misma instancia
    // que se usó para definir las relaciones en soporteModelInit
    const UsuarioModel = sequelize.models.Usuario || Usuario;
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { id } = req.params;
    const { include = 'mensajes,eventos,adjuntos' } = req.query;

    const includeArray = include.split(',').map(i => i.trim());

    // Construir opciones de include
    const includeOptions = [
      { model: Soporte_Prioridad, as: 'prioridad', required: false },
      { model: Soporte_Categoria, as: 'categoria', required: false },
      { 
        model: UsuarioModel, 
        as: 'requester', 
        required: false,
        attributes: ['id', 'usuario', 'nombre', 'apellido']
      }
    ];

    // Incluir mensajes si se solicita (SIN incluir author para evitar conflictos)
    if (includeArray.includes('mensajes')) {
      includeOptions.push({
        model: Soporte_TicketMensaje,
        as: 'mensajes',
        where: { eliminado: false },
        required: false,
        include: [
          {
            model: Soporte_TicketAdjunto,
            as: 'adjuntos',
            where: { eliminado: false },
            required: false,
            attributes: { exclude: ['archivo'] } // Excluir el base64 para no enviarlo en listados
          }
        ],
        order: [['createdAt', 'ASC']]
      });
    }

    // Incluir eventos si se solicita (SIN incluir actor para evitar conflictos)
    if (includeArray.includes('eventos')) {
      includeOptions.push({
        model: Soporte_TicketEvento,
        as: 'eventos',
        required: false,
        order: [['createdAt', 'DESC']]
      });
    }

    // Incluir adjuntos directamente del ticket (con mensajeId: null) si se solicita
    // IMPORTANTE: Incluir siempre que se soliciten adjuntos, incluso si también se incluyen mensajes
    // Esto es necesario porque los adjuntos creados al crear el ticket tienen mensajeId: null
    if (includeArray.includes('adjuntos')) {
      includeOptions.push({
        model: Soporte_TicketAdjunto,
        as: 'adjuntos',
        where: { 
          eliminado: false,
          mensajeId: null // Solo adjuntos directamente asociados al ticket (no a mensajes)
        },
        required: false,
        attributes: { exclude: ['archivo'] } // Excluir el base64 para no enviarlo en listados
      });
    }

    // Obtener ticket
    const ticket = await Soporte_Ticket.findByPk(id, {
      include: includeOptions,
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Validar permiso de acceso
    if ((userRole === 'Usuario' || userRole === 'Vendedor') && 
        ticket.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para ver este ticket'
      });
    }

    // Filtrar mensajes internos si es usuario normal
    if (ticket.mensajes && (userRole === 'Usuario' || userRole === 'Vendedor')) {
      ticket.mensajes = ticket.mensajes.filter(m => !m.isInternal);
    }

    // Convertir a JSON para asegurar que los campos se mapeen correctamente (createdAt -> createdAt)
    const ticketJSON = ticket.toJSON ? ticket.toJSON() : ticket;
    
    // Asegurar que createdAt esté disponible (puede venir como createdAt)
    if (!ticketJSON.createdAt && ticketJSON.createdAt) {
      ticketJSON.createdAt = ticketJSON.createdAt;
    }
    if (!ticketJSON.updatedAt && ticketJSON.updated_at) {
      ticketJSON.updatedAt = ticketJSON.updated_at;
    }
    if (!ticketJSON.lastActivityAt && ticketJSON.lastActivityAt) {
      ticketJSON.lastActivityAt = ticketJSON.lastActivityAt;
    }
    if (!ticketJSON.resolvedAt && ticketJSON.resolvedAt) {
      ticketJSON.resolvedAt = ticketJSON.resolvedAt;
    }
    if (!ticketJSON.closedAt && ticketJSON.closedAt) {
      ticketJSON.closedAt = ticketJSON.closedAt;
    }
    if (!ticketJSON.firstResponseAt && ticketJSON.firstResponseAt) {
      ticketJSON.firstResponseAt = ticketJSON.firstResponseAt;
    }

    // Obtener Agent y Requester por separado si existen (para evitar conflictos con múltiples asociaciones)
    if (ticketJSON.agentId) {
      try {
        const agent = await UsuarioModel.findByPk(ticketJSON.agentId, {
          attributes: ['id', 'usuario', 'nombre', 'apellido']
        });
        if (agent) {
          ticketJSON.Agent = {
            id: agent.id,
            nombreUsuario: agent.usuario || agent.nombreUsuario,
            usuario: agent.usuario,
            nombre: agent.nombre,
            apellido: agent.apellido
          };
        }
      } catch (err) {
        console.error('Error obteniendo agente:', err);
      }
    }
    
    if (ticketJSON.requesterId) {
      try {
        const requester = await UsuarioModel.findByPk(ticketJSON.requesterId, {
          attributes: ['id', 'usuario', 'nombre', 'apellido']
        });
        if (requester) {
          ticketJSON.Requester = {
            id: requester.id,
            nombreUsuario: requester.usuario || requester.nombreUsuario,
            usuario: requester.usuario,
            nombre: requester.nombre,
            apellido: requester.apellido
          };
        }
      } catch (err) {
        console.error('Error obteniendo solicitante:', err);
      }
    }

    // Obtener usuarios para mensajes y eventos
    const userIds = new Set();
    
    if (ticketJSON.mensajes) {
      ticketJSON.mensajes.forEach(m => {
        if (m.authorId) {
          userIds.add(m.authorId);
        }
      });
    }
    
    if (ticketJSON.eventos) {
      ticketJSON.eventos.forEach(e => {
        if (e.actorId) {
          userIds.add(e.actorId);
        }
      });
    }
    
    // Obtener todos los usuarios de una vez
    const usuariosMap = new Map();
    if (userIds.size > 0) {
      try {
        const usuarios = await UsuarioModel.findAll({
          where: {
            id: Array.from(userIds)
          },
          attributes: ['id', 'usuario', 'nombre', 'apellido']
        });
        
        usuarios.forEach(usuario => {
          usuariosMap.set(usuario.id, {
            id: usuario.id,
            nombreUsuario: usuario.usuario || usuario.nombreUsuario,
            usuario: usuario.usuario,
            nombre: usuario.nombre,
            apellido: usuario.apellido
          });
        });
      } catch (err) {
        console.error('Error obteniendo usuarios para mensajes/eventos:', err);
      }
    }
    
    // Mapear usuarios a mensajes
    if (ticketJSON.mensajes) {
      ticketJSON.mensajes = ticketJSON.mensajes.map(m => {
        const mensaje = m.toJSON ? m.toJSON() : m;
        if (!mensaje.createdAt && mensaje.createdAt) {
          mensaje.createdAt = mensaje.createdAt;
        }
        
        // Agregar información del autor si existe
        if (mensaje.authorId && usuariosMap.has(mensaje.authorId)) {
          mensaje.author = usuariosMap.get(mensaje.authorId);
        }
        
        return mensaje;
      });
    }

    // Mapear usuarios a eventos
    if (ticketJSON.eventos) {
      ticketJSON.eventos = ticketJSON.eventos.map(e => {
        const evento = e.toJSON ? e.toJSON() : e;
        if (!evento.createdAt && evento.createdAt) {
          evento.createdAt = evento.createdAt;
        }
        
        // Agregar información del actor si existe
        if (evento.actorId && usuariosMap.has(evento.actorId)) {
          evento.actor = usuariosMap.get(evento.actorId);
        }
        
        return evento;
      });
    }

    ticketJSON._tenant = req.db.tenant;

    res.json({
      success: true,
      ticket: ticketJSON
    });

  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener el ticket'
    });
  }
};

// ============================================
// TICKETS - ACCIONES
// ============================================

/**
 * POST /soporteAPI/tickets/:id/take
 * Tomar ticket (lock optimista)
 */
const tomarTicket = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const { id } = req.params;

    // Verificar que el ticket existe
    const ticketExistente = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticketExistente) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    const result = await sequelize.transaction(async (t) => {
      // Lock optimista: solo actualizar si agentId es null
      const now = new Date();
      const [rowsUpdated] = await Soporte_Ticket.update({
        agentId: userId,
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      }, {
        where: {
          id,
          agentId: null,
          eliminado: false
        },
        transaction: t
      });

      if (rowsUpdated === 0) {
        throw new Error('TICKET_ALREADY_TAKEN');
      }

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'assigned',
        actorId: userId,
        payload: { agentId: userId },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      // Obtener ticket actualizado
      const ticket = await Soporte_Ticket.findByPk(id, { transaction: t });
      return ticket;
    });

    res.json({
      success: true,
      message: 'Soporte_Ticket asignado correctamente',
      ticket: result
    });

  } catch (error) {
    if (error.message === 'TICKET_ALREADY_TAKEN') {
      return res.status(409).json({
        success: false,
        error: 'Soporte_Ticket ya fue tomado por otro agente'
      });
    }

    console.error('Error al tomar ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al asignar el ticket'
    });
  }
};

/**
 * POST /soporteAPI/tickets/:id/reassign
 * Reasignar ticket a otro agente
 */
const reasignarTicket = async (req, res) => {
  try {
    const { sequelize, tenant } = req.db;
    const { Soporte_Ticket, Soporte_TicketEvento, Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
    const { adminModelInit } = require('../models/adminModel');
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'ID de agente requerido'
      });
    }

    // Obtener ticket actual
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Validar permisos: solo admin puede asignar/reasignar tickets
    // Los agentes no pueden reasignar tickets (solo pueden tomar tickets sin asignar)
    const esAdmin = userRole === 'Administrador';
    if (!esAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden asignar o reasignar tickets'
      });
    }

    // Validar que el nuevo agente existe y tiene rol válido
    const { Usuario, RolUsuario } = adminModelInit(sequelize);
    
    const nuevoAgente = await Usuario.findByPk(parseInt(agentId), {
      include: [{
        model: RolUsuario,
        as: 'rolUsuario',
        attributes: ['descripcion'],
        required: false,
        on: sequelize.where(
          sequelize.cast(sequelize.col('Usuario.rol'), 'INTEGER'),
          sequelize.col('rolUsuario.id')
        )
      }]
    });

    if (!nuevoAgente) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado'
      });
    }

    const rolAgente = nuevoAgente.rolUsuario?.descripcion;
    // Verificar que el usuario tenga rol de agente o administrador
    const esAgenteOAdmin = rolAgente === 'Agente Soporte' || rolAgente === 'Soporte' || rolAgente === 'Administrador';
    if (!esAgenteOAdmin) {
      return res.status(400).json({
        success: false,
        error: 'El usuario seleccionado no tiene rol de Agente Soporte, Soporte o Administrador'
      });
    }

    // Reasignar en transacción
    const ticketActualizado = await sequelize.transaction(async (t) => {
      const now = new Date();
      
      // Si el ticket está en "nuevo" y se está asignando/reasignando, cambiar a "abierto"
      const updateData = {
        agentId: parseInt(agentId),
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      };
      
      // Si el ticket está en "nuevo", cambiar automáticamente a "abierto"
      if (ticket.status === 'nuevo') {
        updateData.status = 'abierto';
       // console.log('🔍 [reasignarTicket] Cambiando estado de "nuevo" a "abierto" al asignar ticket');
      }
      
      await Soporte_Ticket.update(updateData, {
        where: { id },
        transaction: t
      });

      // Determinar tipo de evento: 'assigned' si no tenía agente, 'reassigned' si ya tenía uno
      const eventType = ticket.agentId ? 'reassigned' : 'assigned';
      
      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: eventType,
        actorId: userId,
        payload: {
          oldAgentId: ticket.agentId,
          newAgentId: parseInt(agentId),
           ...(ticket.status === 'nuevo' && { statusChanged: 'abierto' })
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });
      
      // Si se cambió el estado, registrar también un evento de cambio de estado
      if (ticket.status === 'nuevo') {
        await Soporte_TicketEvento.create({
          ticketId: id,
          eventType: 'status_changed',
          actorId: userId,
          payload: {
            oldStatus: 'nuevo',
             newStatus: 'abierto',
            reason: 'auto_on_assignment'
          },
          createdAt: now
        }, { transaction: t });
      }

      // Obtener ticket actualizado
      return await Soporte_Ticket.findByPk(id, { transaction: t });
    });

    res.json({
      success: true,
      message: 'Soporte_Ticket reasignado correctamente',
      ticket: ticketActualizado
    });

    // Notificacion por email al agente asignado (fire-and-forget)
    // Cargar relaciones del ticket para obtener nombres de prioridad y categoria
    const ticketConRelaciones = await Soporte_Ticket.findByPk(id, {
      include: [
        { model: Soporte_Prioridad, as: 'prioridad', attributes: ['id', 'nombre'] },
        { model: Soporte_Categoria, as: 'categoria', attributes: ['id', 'nombre'] }
      ]
    });

    notificarTicketAsignado(sequelize, tenant, {
      numero: ticketConRelaciones?.numero || ticketActualizado.numero,
      titulo: ticketConRelaciones?.titulo || ticketActualizado.titulo,
      descripcion: ticketConRelaciones?.descripcion || ticketActualizado.descripcion,
      tipo: ticketConRelaciones?.tipo || ticketActualizado.tipo,
      prioridad: ticketConRelaciones?.prioridad?.nombre || 'N/A',
      categoria: ticketConRelaciones?.categoria?.nombre || 'N/A'
    }, parseInt(agentId));

  } catch (error) {
    console.error('Error al reasignar ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reasignar el ticket'
    });
  }
};

/**
 * POST /soporteAPI/tickets/:id/messages
 * Agregar mensaje/respuesta al ticket
 */
const agregarMensaje = async (req, res) => {
  try {
    const { sequelize, tenant } = req.db;
    const { Soporte_Ticket, Soporte_TicketMensaje, Soporte_TicketEvento, Soporte_TicketAdjunto, Soporte_Config } = 
      soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { id } = req.params;
    
    // Procesar datos de JSON con archivos en base64
    let content, isInternal, cambiarEstado, adjuntos = [];
    
    // Siempre esperamos JSON ahora (archivos vienen como base64 en el body)
    ({ content, isInternal = false, adjuntos = [], cambiarEstado } = req.body);

    // Normalizar content (puede venir como string o undefined)
    content = content ? String(content).trim() : '';
    
    // Validar contenido
    if (!content || content.length === 0) {
      console.error('❌ [agregarMensaje] Contenido vacío o inválido:', {
        content,
        body: req.body,
        hasFiles: !!req.files,
        filesCount: req.files ? req.files.length : 0
      });
      return res.status(400).json({
        success: false,
        error: 'El contenido del mensaje es obligatorio'
      });
    }
    
   // console.log('✅ [agregarMensaje] Datos procesados:', {      contentLength: content.length,      isInternal,      cambiarEstado,      adjuntosCount: adjuntos.length    });

    // Obtener configuración
    const config = await Soporte_Config.findOne({ where: { tenant } });
    if (!config) {
      return res.status(500).json({
        success: false,
        error: 'Configuración de soporte no encontrada'
      });
    }

    // Obtener ticket
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Validar permiso de acceso
    if ((userRole === 'Usuario' || userRole === 'Vendedor') && 
        ticket.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para agregar mensajes a este ticket'
      });
    }

    // Validar mensaje interno: solo agentes/admin pueden crear mensajes internos
    const puedeCrearInterno = userRole === 'Administrador' || userRole === 'Agente Soporte' || userRole === 'Soporte';
    if (isInternal && !puedeCrearInterno) {
      return res.status(403).json({
        success: false,
        error: 'Solo agentes y administradores pueden crear mensajes internos'
      });
    }

    // Procesar en transacción
    const result = await sequelize.transaction(async (t) => {
      // Crear mensaje
      // Crear mensaje con fecha explícita
      const now = new Date();
      const mensaje = await Soporte_TicketMensaje.create({
        ticketId: id,
        authorId: userId,
        content: content.trim(),
        isInternal,
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      // Guardar adjuntos si existen
      let adjuntosGuardados = [];
      if (adjuntos && adjuntos.length > 0) {
        // Validar cantidad
        if (adjuntos.length > config.maxAttachmentsPerMessage) {
          throw new Error(`Máximo ${config.maxAttachmentsPerMessage} adjuntos por mensaje`);
        }

        adjuntosGuardados = await AttachmentService.saveAttachments(
          sequelize,
          tenant,
          id,
          mensaje.id,
          adjuntos,
          config.maxAttachmentSizeMb,
          t
        );
      }

      // Actualizar ticket con fecha explícita
      const updateData = {
        lastActivityAt: now,
        updatedAt: now, // Actualizar también updated_at
        messageCount: sequelize.literal('"messageCount" + 1')
      };

      // Marcar primera respuesta si es agente/admin y es la primera
      const esAgente = (userRole === 'Agente Soporte' || userRole === 'Soporte') || userRole === 'Administrador';
      if (esAgente && !ticket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      // Reapertura automática: si ticket está resuelto y el autor es el requester
      if (ticket.status === 'resuelto' && 
          ticket.requesterId === userId && 
          TicketService.shouldAutoReopen(ticket, config)) {
        await TicketService.processAutoReopen(sequelize, ticket, userId);
        updateData.status = 'abierto';
        updateData.resolvedAt = null;
      }

      // Auto-transición desde "esperando_cliente": si el autor es el requester
      if (ticket.status === 'esperando_cliente' && ticket.requesterId === userId) {
        updateData.status = 'abierto';
      }

      // Cambiar estado si se solicita
      if (cambiarEstado) {
        if (TicketService.isValidTransition(ticket.status, cambiarEstado)) {
          updateData.status = cambiarEstado;
          
          if (cambiarEstado === 'resuelto') {
            updateData.resolvedAt = new Date();
            // Limpiar closedAt si existe (se reabrió desde cerrado)
            if (ticket.status === 'cerrado') {
              updateData.closedAt = null;
            }
          } else if (cambiarEstado === 'cerrado') {
            updateData.closedAt = new Date();
            // NO eliminar resolvedAt - mantener ambas fechas
          } else {
            // Si cambia a estado "abierto", limpiar ambas fechas
            const estadosAbierto = ['nuevo', 'abierto', 'en_progreso', 'esperando_cliente', 'pendiente_validacion', 'en_espera'];
            if (estadosAbierto.includes(cambiarEstado)) {
              updateData.resolvedAt = null;
              updateData.closedAt = null;
            }
          }
        } else {
          throw new Error(`Transición de estado no válida: ${ticket.status} -> ${cambiarEstado}`);
        }
      }

       console.log("🔍 Update data:", updateData);
       console.log("🔍 Update data:", t);
       console.log("🔍 Update data:", id);
       console.log("🔍 SQL que se ejecutará:");
       console.log("UPDATE soporte_Ticket SET", 
         Object.keys(updateData).map(key => {
           const value = updateData[key];
           if (value && typeof value === 'object' && value.val) {
             return `"${key}" = ${value.val}`; // Para sequelize.literal()
           } else if (value === null) {
             return `"${key}" = NULL`;
           } else {
             return `"${key}" = '${value}'`;
           }
         }).join(', '),
         `WHERE "id" = ${id}`
       );

      await Soporte_Ticket.update(updateData, {
        where: { id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'message_added',
        actorId: userId,
        payload: {
          mensajeId: mensaje.id,
          isInternal,
          adjuntosCount: adjuntosGuardados.length,
          nuevoEstado: updateData.status || ticket.status
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      return { mensaje, adjuntosGuardados };
    });

    // Obtener ticket actualizado
    const ticketActualizado = await Soporte_Ticket.findByPk(id);

    res.status(201).json({
      success: true,
      mensaje: result.mensaje,
      adjuntos: result.adjuntosGuardados,
      ticket: {
        status: ticketActualizado.status,
        lastActivityAt: ticketActualizado.lastActivityAt,
        messageCount: ticketActualizado.messageCount
      }
    });

  } catch (error) {
    console.error('Error al agregar mensaje:', error);
    
    if (error.message.includes('Transición de estado no válida')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Máximo')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al agregar el mensaje'
    });
  }
};

/**
 * PATCH /soporteAPI/tickets/:id/status
 * Cambiar estado del ticket
 */
const cambiarEstado = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const { id } = req.params;
    const { status, comentario } = req.body;

   // console.log('🔍 [cambiarEstado] Solicitud recibida:', {      ticketId: id,      status: status,      statusType: typeof status,      body: req.body    });

    if (!status) {
      console.error('❌ [cambiarEstado] Estado no proporcionado');
      return res.status(400).json({
        success: false,
        error: 'Estado requerido'
      });
    }

    // Normalizar el estado (trim y lowercase)
    const statusNormalizado = String(status).trim().toLowerCase();

    // Obtener ticket actual
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      console.error('❌ [cambiarEstado] Soporte_Ticket no encontrado:', id);
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

   // console.log('🔍 [cambiarEstado] Estado actual del ticket:', ticket.status);
   // console.log('🔍 [cambiarEstado] Estado solicitado (normalizado):', statusNormalizado);
   // console.log('🔍 [cambiarEstado] Soporte_Ticket asignado a:', ticket.agentId);
   // console.log('🔍 [cambiarEstado] Usuario actual:', userId);
   // console.log('🔍 [cambiarEstado] Rol usuario:', req.cookies.rolUsuario);

    const userRole = req.cookies.rolUsuario;
    const esAdmin = userRole === 'Administrador';
    const esAgente = userRole === 'Agente Soporte' || userRole === 'Soporte';
    const esCliente = !esAdmin && !esAgente;

    // EXCEPCIÓN: Cliente puede cerrar ticket si está en estado "resuelto"
    if (esCliente && statusNormalizado === 'cerrado' && ticket.status === 'resuelto') {
      // Verificar que el cliente es el requester del ticket
      if (ticket.requesterId !== userId) {
        console.error('❌ [cambiarEstado] Cliente intentando cerrar ticket que no le pertenece');
        return res.status(403).json({
          success: false,
          error: 'No tienes permiso para cerrar este ticket'
        });
      }
      // Permitir que el cliente cierre el ticket
     // console.log('✅ [cambiarEstado] Cliente cerrando ticket resuelto');
    } else {
      // Para todos los demás casos, validar permisos normales
      
      // Validar que el ticket esté asignado antes de cambiar estado (excepto para clientes cerrando tickets resueltos)
      if (!ticket.agentId) {
        console.error('❌ [cambiarEstado] Soporte_Ticket no asignado');
        return res.status(400).json({
          success: false,
          error: 'No puedes cambiar el estado de un ticket que no ha sido asignado. Primero debes tomar el ticket.'
        });
      }

      // Validar permisos: agente solo puede cambiar estado de sus propios tickets, admin puede cambiar de tickets asignados
      if (esAgente && !esAdmin) {
        // Agente: solo puede cambiar estado si el ticket está asignado a él
        if (ticket.agentId !== userId) {
          console.error('❌ [cambiarEstado] Agente intentando cambiar estado de ticket asignado a otro agente');
          return res.status(403).json({
            success: false,
            error: 'No puedes cambiar el estado de un ticket que no está asignado a ti.'
          });
        }
      } else if (esAdmin) {
        // Admin: puede cambiar estado si el ticket está asignado a alguien (ya validado arriba)
       // console.log('✅ [cambiarEstado] Admin puede cambiar estado de ticket asignado');
      } else {
        // Usuario normal no debería llegar aquí (excepto para cerrar tickets resueltos, ya manejado arriba)
        console.error('❌ [cambiarEstado] Usuario sin permisos');
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para cambiar el estado del ticket'
        });
      }
    }

    // Validar transición (los administradores y clientes cerrando tickets resueltos pueden saltarse las validaciones)
    const esClienteCerrandoResuelto = esCliente && statusNormalizado === 'cerrado' && ticket.status === 'resuelto';
    const puedeSaltarValidacion = esAdmin || esClienteCerrandoResuelto;
    
    if (!puedeSaltarValidacion && !TicketService.isValidTransition(ticket.status, statusNormalizado)) {
      console.error('❌ [cambiarEstado] Transición no válida:', {
        estadoActual: ticket.status,
        estadoSolicitado: statusNormalizado
      });
      return res.status(400).json({
        success: false,
        error: `Transición de estado no válida: ${ticket.status} -> ${statusNormalizado}. El ticket debe estar en "en_progreso" o "abierto" para cambiar a "esperando_cliente".`
      });
    }
    
    // Log para casos que saltan validaciones
    if (puedeSaltarValidacion && !TicketService.isValidTransition(ticket.status, statusNormalizado)) {
      if (esClienteCerrandoResuelto) {
        console.log('✅ [cambiarEstado] Cliente cerrando ticket resuelto (transición permitida)');
      } else {
        console.log('⚠️ [cambiarEstado] Admin saltando validación de transición:', {          estadoActual: ticket.status,          estadoSolicitado: statusNormalizado        });
      }
    }

    // Actualizar estado en transacción
    const ticketActualizado = await sequelize.transaction(async (t) => {
      const now = new Date();
      const updateData = {
        status: statusNormalizado, // Usar el estado normalizado
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      };

      // Establecer fechas según el estado
      if (statusNormalizado === 'resuelto') {
        updateData.resolvedAt = now;
        // Limpiar closedAt si existe (se reabrió desde cerrado)
        if (ticket.status === 'cerrado') {
          updateData.closedAt = null;
        }
      } else if (statusNormalizado === 'cerrado') {
        updateData.closedAt = now;
        // NO eliminar resolvedAt - mantener ambas fechas
      } else {
        // Si cambia a cualquier estado "abierto", limpiar ambas fechas
        const estadosAbierto = ['nuevo', 'abierto', 'en_progreso', 'esperando_cliente', 'pendiente_validacion', 'en_espera'];
        if (estadosAbierto.includes(statusNormalizado)) {
          updateData.resolvedAt = null;
          updateData.closedAt = null;
        }
      }

      await Soporte_Ticket.update(updateData, {
        where: { id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'status_changed',
        actorId: userId,
        payload: {
          oldStatus: ticket.status,
          newStatus: statusNormalizado,
          comentario: comentario || null
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      // Obtener ticket actualizado
      return await Soporte_Ticket.findByPk(id, { transaction: t });
    });

    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      ticket: ticketActualizado
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar el estado del ticket'
    });
  }
};

// ============================================
// TICKETS - CAMBIOS Y CONFIGURACIÓN
// ============================================

/**
 * PATCH /soporteAPI/tickets/:id/priority
 * Cambiar prioridad del ticket
 */
const cambiarPrioridad = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_Prioridad, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const { id } = req.params;
    const { prioridadId } = req.body;

    if (!prioridadId) {
      return res.status(400).json({
        success: false,
        error: 'ID de prioridad requerido'
      });
    }

    // Obtener ticket actual
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Las solicitudes solo pueden tener prioridad "bajo/baja"
    if (ticket.tipo === 'solicitud') {
      const prioridadBaja = await obtenerPrioridadBajaActiva(Soporte_Prioridad);
      if (!prioridadBaja) {
        return res.status(400).json({
          success: false,
          error: 'No hay una prioridad "bajo" activa configurada para solicitudes'
        });
      }
      if (String(prioridadId) !== String(prioridadBaja.id)) {
        return res.status(400).json({
          success: false,
          error: 'Los tickets de tipo solicitud solo pueden tener prioridad baja'
        });
      }
    }

    // Validar que la nueva prioridad existe y está activa
    const nuevaPrioridad = await Soporte_Prioridad.findByPk(prioridadId);
    if (!nuevaPrioridad || !nuevaPrioridad.activa || nuevaPrioridad.eliminado) {
      return res.status(400).json({
        success: false,
        error: 'Soporte_Prioridad no válida'
      });
    }

    // Actualizar prioridad y recalcular SLA en transacción
    const ticketActualizado = await sequelize.transaction(async (t) => {
      // Recalcular SLA desde la fecha de creación del ticket
      const createdAt = new Date(ticket.createdAt);
      const firstResponseDueAt = new Date(
        createdAt.getTime() + (nuevaPrioridad.firstResponseHours * 60 * 60 * 1000)
      );
      const resolutionDueAt = new Date(
        createdAt.getTime() + (nuevaPrioridad.resolutionHours * 60 * 60 * 1000)
      );

      const now = new Date();
      await Soporte_Ticket.update({
        prioridadId,
        firstResponseDueAt,
        resolutionDueAt,
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      }, {
        where: { id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'priority_changed',
        actorId: userId,
        payload: {
          oldPrioridadId: ticket.prioridadId,
          newPrioridadId: prioridadId,
          oldPrioridadNombre: ticket.prioridad?.nombre || 'N/A',
          newPrioridadNombre: nuevaPrioridad.nombre
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      // Obtener ticket actualizado con relaciones
      return await Soporte_Ticket.findByPk(id, {
        include: [
          { model: Soporte_Prioridad, as: 'prioridad', required: false }
        ],
        transaction: t
      });
    });

    res.json({
      success: true,
      message: 'Soporte_Prioridad actualizada correctamente',
      ticket: ticketActualizado
    });

  } catch (error) {
    console.error('Error al cambiar prioridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la prioridad del ticket'
    });
  }
};

/**
 * PATCH /soporteAPI/tickets/:id/category
 * Cambiar categoría del ticket
 */
const cambiarCategoria = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_Categoria, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const { id } = req.params;
    const { categoriaId } = req.body;

    if (!categoriaId) {
      return res.status(400).json({
        success: false,
        error: 'ID de categoría requerido'
      });
    }

    // Obtener ticket actual
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Validar que la nueva categoría existe y está activa
    const nuevaCategoria = await Soporte_Categoria.findByPk(categoriaId);
    if (!nuevaCategoria || !nuevaCategoria.activa || nuevaCategoria.eliminado) {
      return res.status(400).json({
        success: false,
        error: 'Categoría no válida'
      });
    }

    // Actualizar categoría en transacción
    const ticketActualizado = await sequelize.transaction(async (t) => {
      const now = new Date();
      await Soporte_Ticket.update({
        categoriaId,
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      }, {
        where: { id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'category_changed',
        actorId: userId,
        payload: {
          oldCategoriaId: ticket.categoriaId,
          newCategoriaId: categoriaId,
          oldCategoriaNombre: ticket.categoria?.nombre || 'N/A',
          newCategoriaNombre: nuevaCategoria.nombre
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });

      // Obtener ticket actualizado con relaciones
      return await Soporte_Ticket.findByPk(id, {
        include: [
          { model: Soporte_Categoria, as: 'categoria', required: false }
        ],
        transaction: t
      });
    });

    res.json({
      success: true,
      message: 'Categoría actualizada correctamente',
      ticket: ticketActualizado
    });

  } catch (error) {
    console.error('Error al cambiar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar la categoría del ticket'
    });
  }
};

/**
 * DELETE /soporteAPI/tickets/:id
 * Eliminar ticket (soft delete)
 */
const eliminarTicket = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const { id } = req.params;

    // Obtener ticket
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Eliminar (soft delete) en transacción
    await sequelize.transaction(async (t) => {
      const now = new Date();
      await Soporte_Ticket.update({
        eliminado: true,
        lastActivityAt: now,
        updatedAt: now // Actualizar también updated_at
      }, {
        where: { id },
        transaction: t
      });

      // Registrar evento con fecha explícita
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'deleted',
        actorId: userId,
        payload: {
          numero: ticket.numero,
          motivo: 'Eliminado por administrador'
        },
        createdAt: now // Establecer explícitamente
      }, { transaction: t });
    });

    res.json({
      success: true,
      message: 'Soporte_Ticket eliminado correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el ticket'
    });
  }
};

// ============================================
// CATEGORÍAS - CRUD
// ============================================

/**
 * GET /soporteAPI/categorias
 * Listar categorías
 */
const listarCategorias = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Categoria } = soporteModelInit(sequelize);
    
    const userRole = req.cookies.rolUsuario;
    const { includeInactive } = req.query;

    // Construir filtros
    const where = { eliminado: false };

    // Solo admin puede ver categorías inactivas
    if (includeInactive !== 'true' || userRole !== 'Administrador') {
      where.activa = true;
    }

    // Obtener categorías ordenadas
    const categorias = await Soporte_Categoria.findAll({
      where,
      order: [['orden', 'ASC'], ['nombre', 'ASC']]
    });

    res.json({
      success: true,
      categorias
    });

  } catch (error) {
    console.error('Error al listar categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener categorías'
    });
  }
};

/**
 * POST /soporteAPI/categorias
 * Crear categoría
 */
const crearCategoria = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Categoria } = soporteModelInit(sequelize);
    
    const { nombre, modulo, descripcion, orden } = req.body;

    // Validar campos obligatorios
    if (!nombre || !modulo) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y módulo son obligatorios'
      });
    }

    // Verificar si ya existe una categoría con el mismo nombre
    const categoriaExistente = await Soporte_Categoria.findOne({
      where: {
        nombre,
        eliminado: false
      }
    });

    if (categoriaExistente) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una categoría con ese nombre'
      });
    }

    // Crear categoría
    const categoria = await Soporte_Categoria.create({
      nombre,
      modulo,
      descripcion: descripcion || null,
      orden: orden || 0,
      activa: true,
      eliminado: false
    });

    res.status(201).json({
      success: true,
      categoria
    });

  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la categoría'
    });
  }
};

/**
 * PATCH /soporteAPI/categorias/:id
 * Editar categoría
 */
const editarCategoria = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Categoria } = soporteModelInit(sequelize);
    
    const { id } = req.params;
    const { nombre, modulo, descripcion, orden, activa } = req.body;

    // Obtener categoría actual
    const categoria = await Soporte_Categoria.findByPk(id, {
      where: { eliminado: false }
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Validar nombre único si se está cambiando
    if (nombre && nombre !== categoria.nombre) {
      const categoriaExistente = await Soporte_Categoria.findOne({
        where: {
          nombre,
          eliminado: false,
          id: { [Op.ne]: id }
        }
      });

      if (categoriaExistente) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una categoría con ese nombre'
        });
      }
    }

    // Actualizar categoría
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (modulo !== undefined) updateData.modulo = modulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (orden !== undefined) updateData.orden = orden;
    if (activa !== undefined) updateData.activa = activa;

    await Soporte_Categoria.update(updateData, {
      where: { id }
    });

    // Obtener categoría actualizada
    const categoriaActualizada = await Soporte_Categoria.findByPk(id);

    res.json({
      success: true,
      message: 'Categoría actualizada correctamente',
      categoria: categoriaActualizada
    });

  } catch (error) {
    console.error('Error al editar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la categoría'
    });
  }
};

/**
 * DELETE /soporteAPI/categorias/:id
 * Eliminar categoría (soft delete)
 */
const eliminarCategoria = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Categoria, Soporte_Ticket } = soporteModelInit(sequelize);
    
    const { id } = req.params;

    // Obtener categoría
    const categoria = await Soporte_Categoria.findByPk(id, {
      where: { eliminado: false }
    });

    if (!categoria) {
      return res.status(404).json({
        success: false,
        error: 'Categoría no encontrada'
      });
    }

    // Validar que no hay tickets activos con esta categoría
    const ticketsActivos = await Soporte_Ticket.count({
      where: {
        categoriaId: id,
        eliminado: false,
        status: {
          [Op.notIn]: ['cerrado', 'resuelto']
        }
      }
    });

    if (ticketsActivos > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar la categoría. Hay ${ticketsActivos} ticket(s) activo(s) usando esta categoría. Por favor, reasigna los tickets primero.`
      });
    }

    // Eliminar (soft delete)
    await Soporte_Categoria.update({
      eliminado: true,
      activa: false
    }, {
      where: { id }
    });

    res.json({
      success: true,
      message: 'Categoría eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la categoría'
    });
  }
};

// ============================================
// PRIORIDADES - CRUD
// ============================================

/**
 * GET /soporteAPI/prioridades
 * Listar prioridades
 */
const listarPrioridades = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    const userRole = req.cookies.rolUsuario;
    const { includeInactive } = req.query;

    // Construir filtros
    const where = { eliminado: false };

    // Solo admin puede ver prioridades inactivas
    if (includeInactive !== 'true' || userRole !== 'Administrador') {
      where.activa = true;
    }

    // Obtener prioridades ordenadas
    const prioridades = await Soporte_Prioridad.findAll({
      where,
      order: [['orden', 'ASC'], ['nombre', 'ASC']]
    });

    res.json({
      success: true,
      prioridades
    });

  } catch (error) {
    console.error('Error al listar prioridades:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener prioridades'
    });
  }
};

/**
 * POST /soporteAPI/prioridades
 * Crear prioridad
 */
const crearPrioridad = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    const { nombre, firstResponseHours, resolutionHours, color, orden } = req.body;

    // Validar campos obligatorios
    if (!nombre || firstResponseHours === undefined || resolutionHours === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, firstResponseHours y resolutionHours son obligatorios'
      });
    }

    // Validar valores numéricos
    if (firstResponseHours < 0 || resolutionHours < 0) {
      return res.status(400).json({
        success: false,
        error: 'Las horas de SLA deben ser números positivos'
      });
    }

    if (firstResponseHours >= resolutionHours) {
      return res.status(400).json({
        success: false,
        error: 'Las horas de primera respuesta deben ser menores que las horas de resolución'
      });
    }

    // Verificar si ya existe una prioridad con el mismo nombre
    const prioridadExistente = await Soporte_Prioridad.findOne({
      where: {
        nombre,
        eliminado: false
      }
    });

    if (prioridadExistente) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una prioridad con ese nombre'
      });
    }

    // Crear prioridad
    const prioridad = await Soporte_Prioridad.create({
      nombre,
      firstResponseHours: parseInt(firstResponseHours),
      resolutionHours: parseInt(resolutionHours),
      color: color || null,
      orden: orden !== undefined ? parseInt(orden) : 0,
      activa: true,
      eliminado: false
    });

    res.status(201).json({
      success: true,
      prioridad
    });

  } catch (error) {
    console.error('Error al crear prioridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la prioridad'
    });
  }
};

/**
 * PATCH /soporteAPI/prioridades/:id
 * Editar prioridad
 */
const editarPrioridad = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Prioridad } = soporteModelInit(sequelize);
    
    const { id } = req.params;
    const { nombre, firstResponseHours, resolutionHours, color, orden, activa } = req.body;

    // Obtener prioridad actual
    const prioridad = await Soporte_Prioridad.findByPk(id, {
      where: { eliminado: false }
    });

    if (!prioridad) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Prioridad no encontrada'
      });
    }

    // Validar nombre único si se está cambiando
    if (nombre && nombre !== prioridad.nombre) {
      const prioridadExistente = await Soporte_Prioridad.findOne({
        where: {
          nombre,
          eliminado: false,
          id: { [Op.ne]: id }
        }
      });

      if (prioridadExistente) {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una prioridad con ese nombre'
        });
      }
    }

    // Validar valores SLA si se están cambiando
    const newFirstResponseHours = firstResponseHours !== undefined ? parseInt(firstResponseHours) : prioridad.firstResponseHours;
    const newResolutionHours = resolutionHours !== undefined ? parseInt(resolutionHours) : prioridad.resolutionHours;

    if (newFirstResponseHours < 0 || newResolutionHours < 0) {
      return res.status(400).json({
        success: false,
        error: 'Las horas de SLA deben ser números positivos'
      });
    }

    if (newFirstResponseHours >= newResolutionHours) {
      return res.status(400).json({
        success: false,
        error: 'Las horas de primera respuesta deben ser menores que las horas de resolución'
      });
    }

    // Actualizar prioridad
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (firstResponseHours !== undefined) updateData.firstResponseHours = parseInt(firstResponseHours);
    if (resolutionHours !== undefined) updateData.resolutionHours = parseInt(resolutionHours);
    if (color !== undefined) updateData.color = color;
    if (orden !== undefined) updateData.orden = parseInt(orden);
    if (activa !== undefined) updateData.activa = activa;

    await Soporte_Prioridad.update(updateData, {
      where: { id }
    });

    // Obtener prioridad actualizada
    const prioridadActualizada = await Soporte_Prioridad.findByPk(id);

    res.json({
      success: true,
      message: 'Soporte_Prioridad actualizada correctamente',
      prioridad: prioridadActualizada
    });

  } catch (error) {
    console.error('Error al editar prioridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la prioridad'
    });
  }
};

/**
 * DELETE /soporteAPI/prioridades/:id
 * Eliminar prioridad (soft delete)
 */
const eliminarPrioridad = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Prioridad, Soporte_Ticket } = soporteModelInit(sequelize);
    
    const { id } = req.params;

    // Obtener prioridad
    const prioridad = await Soporte_Prioridad.findByPk(id, {
      where: { eliminado: false }
    });

    if (!prioridad) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Prioridad no encontrada'
      });
    }

    // Validar que no hay tickets activos con esta prioridad
    const ticketsActivos = await Soporte_Ticket.count({
      where: {
        prioridadId: id,
        eliminado: false,
        status: {
          [Op.notIn]: ['cerrado', 'resuelto']
        }
      }
    });

    if (ticketsActivos > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede eliminar la prioridad. Hay ${ticketsActivos} ticket(s) activo(s) usando esta prioridad. Por favor, reasigna los tickets primero.`
      });
    }

    // Eliminar (soft delete)
    await Soporte_Prioridad.update({
      eliminado: true,
      activa: false
    }, {
      where: { id }
    });

    res.json({
      success: true,
      message: 'Soporte_Prioridad eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar prioridad:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la prioridad'
    });
  }
};

// ============================================
// CONFIGURACIÓN
// ============================================

/**
 * GET /soporteAPI/config
 * Obtener configuración del tenant
 */
const obtenerConfig = async (req, res) => {
  try {
    const { sequelize, tenant } = req.db;
    const { Soporte_Config } = soporteModelInit(sequelize);
    
    // Obtener o crear configuración
    let config = await Soporte_Config.findOne({ where: { tenant } });
    
    if (!config) {
      // Crear configuración si no existe
      config = await validarYCrearConfigSoporte(sequelize, tenant);
    }

    res.json({
      success: true,
      config
    });

  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la configuración'
    });
  }
};

/**
 * PATCH /soporteAPI/config
 * Actualizar configuración
 */
const actualizarConfig = async (req, res) => {
  try {
    const { sequelize, tenant } = req.db;
    const { Soporte_Config } = soporteModelInit(sequelize);
    
    const {
      prefijoTicket,
      maxAttachmentSizeMb,
      maxAttachmentsPerMessage,
      diasAutocierreResuelto,
      diasAutocierrePendienteValidacion,
      tituloObligatorio,
      descripcionObligatoria,
      categoriaObligatoria,
      visualizacionEstadisticas
    } = req.body;

    // Obtener configuración actual
    let config = await Soporte_Config.findOne({ where: { tenant } });
    
    if (!config) {
      // Crear configuración si no existe
      config = await validarYCrearConfigSoporte(sequelize, tenant);
    }

    // Construir objeto de actualización
    const updateData = {};

    // Validar y actualizar prefijo
    if (prefijoTicket !== undefined) {
      if (typeof prefijoTicket !== 'string' || prefijoTicket.length > 4) {
        return res.status(400).json({
          success: false,
          error: 'El prefijo debe tener máximo 4 caracteres'
        });
      }
      // Convertir a mayúsculas y validar que solo contiene letras
      const prefijoUpper = prefijoTicket.toUpperCase();
      if (!/^[A-Z]+$/.test(prefijoUpper)) {
        return res.status(400).json({
          success: false,
          error: 'El prefijo solo puede contener letras'
        });
      }
      updateData.prefijoTicket = prefijoUpper;
    }

    // Validar y actualizar valores numéricos
    if (maxAttachmentSizeMb !== undefined) {
      const value = parseInt(maxAttachmentSizeMb);
      if (isNaN(value) || value <= 0) {
        return res.status(400).json({
          success: false,
          error: 'maxAttachmentSizeMb debe ser un número positivo'
        });
      }
      updateData.maxAttachmentSizeMb = value;
    }

    if (maxAttachmentsPerMessage !== undefined) {
      const value = parseInt(maxAttachmentsPerMessage);
      if (isNaN(value) || value <= 0) {
        return res.status(400).json({
          success: false,
          error: 'maxAttachmentsPerMessage debe ser un número positivo'
        });
      }
      updateData.maxAttachmentsPerMessage = value;
    }

    if (diasAutocierreResuelto !== undefined) {
      const value = parseInt(diasAutocierreResuelto);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'diasAutocierreResuelto debe ser un número mayor o igual a 0'
        });
      }
      updateData.diasAutocierreResuelto = value;
    }

    if (diasAutocierrePendienteValidacion !== undefined) {
      const value = parseInt(diasAutocierrePendienteValidacion);
      if (isNaN(value) || value < 0) {
        return res.status(400).json({
          success: false,
          error: 'diasAutocierrePendienteValidacion debe ser un número mayor o igual a 0'
        });
      }
      updateData.diasAutocierrePendienteValidacion = value;
    }

    // Actualizar valores booleanos
    if (tituloObligatorio !== undefined) {
      updateData.tituloObligatorio = Boolean(tituloObligatorio);
    }

    if (descripcionObligatoria !== undefined) {
      updateData.descripcionObligatoria = Boolean(descripcionObligatoria);
    }

    if (categoriaObligatoria !== undefined) {
      updateData.categoriaObligatoria = Boolean(categoriaObligatoria);
    }

    // Validar y actualizar visualización de estadísticas
    if (visualizacionEstadisticas !== undefined) {
      const valoresValidos = ['solo_agentes', 'administradores_y_agentes'];
      if (!valoresValidos.includes(visualizacionEstadisticas)) {
        return res.status(400).json({
          success: false,
          error: 'visualizacionEstadisticas debe ser "solo_agentes" o "administradores_y_agentes"'
        });
      }
      updateData.visualizacionEstadisticas = visualizacionEstadisticas;
    }

    // Actualizar configuración
    await Soporte_Config.update(updateData, {
      where: { tenant }
    });

    // Obtener configuración actualizada
    const configActualizada = await Soporte_Config.findOne({ where: { tenant } });

    res.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      config: configActualizada
    });

  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la configuración'
    });
  }
};

// ============================================
// NOTIFICACIONES - CONFIG POR USUARIO
// ============================================

/**
 * GET /soporteAPI/notificaciones/config
 * Listar usuarios del tenant con su configuracion de notificaciones (lazy).
 * Si un usuario no tiene fila en soporte_NotificacionConfig, se devuelven los flags en false.
 */
const obtenerConfigNotificaciones = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_NotificacionConfig } = soporteModelInit(sequelize);
    const { adminModelInit } = require('../models/adminModel');
    const { Usuario, RolUsuario } = adminModelInit(sequelize);

    const usuarios = await Usuario.findAll({
      where: {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      },
      include: [
        { model: RolUsuario, as: 'rolUsuario', attributes: ['id', 'descripcion'], required: false },
        { model: Soporte_NotificacionConfig, as: 'notificacionConfig', required: false }
      ],
      order: [['usuario', 'ASC']]
    });

    const resultado = usuarios.map(u => {
      const cfg = u.notificacionConfig;
      const activo = cfg && cfg.eliminado === false;
      return {
        id: u.id,
        usuario: u.usuario,
        nombre: u.nombre,
        apellido: u.apellido,
        rol: u.rolUsuario?.descripcion || null,
        email: u.email,
        createdAt: u.createdAt,
        notificarCreacion: activo ? !!cfg.notificarCreacion : false,
        notificarAsignacion: activo ? !!cfg.notificarAsignacion : false
      };
    });

    res.json({
      success: true,
      usuarios: resultado
    });
  } catch (error) {
    console.error('Error al obtener configuracion de notificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener la configuracion de notificaciones'
    });
  }
};

/**
 * PUT /soporteAPI/notificaciones/config
 * Actualizar en batch la configuracion de notificaciones por usuario (upsert).
 * Body: { cambios: [{ usuarioId, notificarCreacion, notificarAsignacion }, ...] }
 */
const actualizarConfigNotificaciones = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_NotificacionConfig } = soporteModelInit(sequelize);

    const { cambios } = req.body;

    if (!Array.isArray(cambios) || cambios.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El body debe incluir un array "cambios" con al menos un item'
      });
    }

    // Validar estructura de cada item
    for (const item of cambios) {
      const uid = parseInt(item.usuarioId);
      if (isNaN(uid) || uid <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Cada cambio debe tener un usuarioId numerico valido'
        });
      }
      if (typeof item.notificarCreacion !== 'boolean' || typeof item.notificarAsignacion !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Cada cambio debe tener notificarCreacion y notificarAsignacion booleanos'
        });
      }
    }

    await sequelize.transaction(async (t) => {
      for (const item of cambios) {
        const usuarioId = parseInt(item.usuarioId);
        const data = {
          notificarCreacion: Boolean(item.notificarCreacion),
          notificarAsignacion: Boolean(item.notificarAsignacion),
          eliminado: false
        };

        const existente = await Soporte_NotificacionConfig.findOne({
          where: { usuarioId },
          transaction: t
        });

        if (existente) {
          await existente.update(data, { transaction: t });
        } else {
          await Soporte_NotificacionConfig.create({ usuarioId, ...data }, { transaction: t });
        }
      }
    });

    res.json({
      success: true,
      message: 'Configuracion de notificaciones actualizada correctamente',
      actualizados: cambios.length
    });
  } catch (error) {
    console.error('Error al actualizar configuracion de notificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la configuracion de notificaciones'
    });
  }
};

// ============================================
// PLANTILLAS - CRUD
// ============================================

/**
 * GET /soporteAPI/plantillas
 * Listar plantillas
 */
const listarPlantillas = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_PlantillaRespuesta, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const { categoriaId } = req.query;

    // Construir filtros
    const where = {
      eliminado: false,
      activa: true
    };

    // Filtrar por categoría si se proporciona
    if (categoriaId) {
      where[Op.or] = [
        { categoriaId },
        { categoriaId: null } // Plantillas generales (sin categoría específica)
      ];
    }

    // Obtener plantillas
    const plantillas = await Soporte_PlantillaRespuesta.findAll({
      where,
      include: [
        {
          model: Soporte_Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'modulo'],
          required: false
        }
      ],
      order: [['nombre', 'ASC']]
    });

    res.json({
      success: true,
      plantillas
    });

  } catch (error) {
    console.error('Error al listar plantillas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener plantillas'
    });
  }
};

/**
 * POST /soporteAPI/plantillas
 * Crear plantilla
 */
const crearPlantilla = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_PlantillaRespuesta, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const { nombre, contenido, categoriaId, esPublica } = req.body;

    // Validar campos obligatorios
    if (!nombre || !contenido) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y contenido son obligatorios'
      });
    }

    // Validar categoría si se proporciona
    if (categoriaId) {
      const categoria = await Soporte_Categoria.findByPk(categoriaId, {
        where: { eliminado: false }
      });

      if (!categoria) {
        return res.status(400).json({
          success: false,
          error: 'Categoría no válida'
        });
      }
    }

    // Crear plantilla
    const plantilla = await Soporte_PlantillaRespuesta.create({
      nombre,
      contenido,
      categoriaId: categoriaId || null,
      esPublica: esPublica || false,
      activa: true,
      eliminado: false
    });

    // Cargar relación de categoría
    const plantillaCompleta = await Soporte_PlantillaRespuesta.findByPk(plantilla.id, {
      include: [
        {
          model: Soporte_Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'modulo'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      plantilla: plantillaCompleta
    });

  } catch (error) {
    console.error('Error al crear plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la plantilla'
    });
  }
};

/**
 * PATCH /soporteAPI/plantillas/:id
 * Editar plantilla
 */
const editarPlantilla = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_PlantillaRespuesta, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const { id } = req.params;
    const { nombre, contenido, categoriaId, esPublica, activa } = req.body;

    // Obtener plantilla actual
    const plantilla = await Soporte_PlantillaRespuesta.findByPk(id, {
      where: { eliminado: false }
    });

    if (!plantilla) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    // Validar categoría si se está cambiando
    if (categoriaId !== undefined && categoriaId !== null) {
      const categoria = await Soporte_Categoria.findByPk(categoriaId, {
        where: { eliminado: false }
      });

      if (!categoria) {
        return res.status(400).json({
          success: false,
          error: 'Categoría no válida'
        });
      }
    }

    // Actualizar plantilla
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (contenido !== undefined) updateData.contenido = contenido;
    if (categoriaId !== undefined) updateData.categoriaId = categoriaId || null;
    if (esPublica !== undefined) updateData.esPublica = Boolean(esPublica);
    if (activa !== undefined) updateData.activa = Boolean(activa);

    await Soporte_PlantillaRespuesta.update(updateData, {
      where: { id }
    });

    // Obtener plantilla actualizada
    const plantillaActualizada = await Soporte_PlantillaRespuesta.findByPk(id, {
      include: [
        {
          model: Soporte_Categoria,
          as: 'categoria',
          attributes: ['id', 'nombre', 'modulo'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      message: 'Plantilla actualizada correctamente',
      plantilla: plantillaActualizada
    });

  } catch (error) {
    console.error('Error al editar plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar la plantilla'
    });
  }
};

/**
 * DELETE /soporteAPI/plantillas/:id
 * Eliminar plantilla (soft delete)
 */
const eliminarPlantilla = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_PlantillaRespuesta } = soporteModelInit(sequelize);
    
    const { id } = req.params;

    // Obtener plantilla
    const plantilla = await Soporte_PlantillaRespuesta.findByPk(id, {
      where: { eliminado: false }
    });

    if (!plantilla) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    // Eliminar (soft delete)
    await Soporte_PlantillaRespuesta.update({
      eliminado: true,
      activa: false
    }, {
      where: { id }
    });

    res.json({
      success: true,
      message: 'Plantilla eliminada correctamente'
    });

  } catch (error) {
    console.error('Error al eliminar plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar la plantilla'
    });
  }
};

// ============================================
// MÉTRICAS Y DASHBOARD
// ============================================

/**
 * GET /soporteAPI/metrics/cards
 * Obtener métricas para cards del dashboard
 */
const obtenerMetricasCards = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { agentId } = req.query;

    // Determinar filtro de agente
    let agentFilter = null;
    // Reconocer "Agente Soporte" y "Soporte" como roles de agente
    const esAgenteMetricas = userRole === 'Agente Soporte' || userRole === 'Soporte' || userRole === 'Agente';
    if (esAgenteMetricas) {
      // Si es agente, solo sus tickets
      agentFilter = userId;
    } else if ((userRole === 'Admin' || userRole === 'Administrador') && agentId) {
      // Si es admin y especifica un agente
      agentFilter = parseInt(agentId);
    }
    // Si es admin sin agentId, agentFilter queda null (todos los tickets)

    // Construir where base
    const whereBase = {
      eliminado: false
    };

    if (agentFilter !== null) {
      whereBase.agentId = agentFilter;
    }

    // Fecha de hoy (inicio del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Fecha de inicio de semana (lunes)
    const inicioSemana = new Date(hoy);
    const diaSemana = hoy.getDay();
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
    inicioSemana.setDate(hoy.getDate() - diasHastaLunes);
    inicioSemana.setHours(0, 0, 0, 0);

    // 1. Contadores por estado
    
    // "Sin Asignar": todos los tickets sin asignar (sin filtro de agente)
    const sinAsignar = await Soporte_Ticket.count({
      where: {
        eliminado: false,
        status: 'nuevo',
        agentId: null
      }
    });

    // "Nuevos": tickets creados HOY (desde 00:00 hasta ahora) con cualquier estado
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);
    const nuevos = await Soporte_Ticket.count({
      where: {
        eliminado: false,
        createdAt: { // ✅ Usar snake_case directamente para evitar problemas de mapeo
          [Op.gte]: hoy,
          [Op.lte]: finDia
        }
      }
    });

    const enProgreso = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: 'en_progreso'
      }
    });

    // "Esperando Cliente": incluye esperando_cliente, pendiente_validacion y pendiente_validacion_nube (global)
    const esperandoCliente = await Soporte_Ticket.count({
      where: {
        eliminado: false,
        status: {
          [Op.in]: ['esperando_cliente', 'pendiente_validacion', 'pendiente_validacion_nube']
        }
      }
    });

    const enEspera = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: 'en_espera'
      }
    });

    const pendienteValidacion = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: 'pendiente_validacion'
      }
    });

    // "Mis Tickets": TODOS los tickets relacionados con el usuario (como creador O como agente asignado)
    // - Tickets creados por agente/admin (requesterId = userId) en CUALQUIER estado
    // - Y tickets asignados al agente/admin (agentId = userId) en CUALQUIER estado
    // IMPORTANTE: Usar Op.or para evitar contar duplicados (un ticket puede ser creado Y asignado al mismo agente)
    // NO excluir ningún estado, contar TODOS (incluyendo cerrados)
    // NOTA: NO usar whereBase aquí porque puede tener agentFilter que limita los resultados
    let misTickets = 0;
    if (esAgenteMetricas || userRole === 'Admin' || userRole === 'Administrador') {
      // Usar una query SQL directa para contar correctamente sin duplicados
      // y excluyendo estados 'resuelto' y 'cerrado'
      // SQL equivalente:
      // SELECT COUNT(*) FROM "soporte_Ticket"
      // WHERE "eliminado" = false
      //   AND ("requesterId" = userId OR "agentId" = userId)
      //   AND "status" NOT IN ('resuelto', 'cerrado')
      misTickets = await Soporte_Ticket.count({
        where: {
          eliminado: false,
          [Op.or]: [
            { requesterId: userId },
            { agentId: userId }
          ],
          status: {
            [Op.notIn]: ['resuelto', 'cerrado']
          }
        }
      });

     // console.log('📊 [obtenerMetricasCards] Mis Tickets calculado:', {         total: misTickets,        userId       });
    }

    // 2. Resueltos hoy
    const resueltosHoy = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: 'resuelto',
        resolvedAt: {
          [Op.gte]: hoy
        }
      }
    });

    // 3. Resueltos esta semana
    const resueltosEstaSemana = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: 'resuelto',
        resolvedAt: {
          [Op.gte]: inicioSemana
        }
      }
    });

    // 4. SLA violados - CALCULAR DINÁMICAMENTE
    // En lugar de confiar en los campos booleanos, calcular en tiempo real
    const ahora = new Date();
    const ticketsConSLA = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        status: {
          [Op.notIn]: ['cerrado']
        }
      },
      include: [
        {
          model: Soporte_Prioridad,
          as: 'prioridad',
          attributes: ['firstResponseHours', 'resolutionHours'],
          required: false
        }
      ],
      // No especificar attributes - Sequelize incluye todos los campos automáticamente
      // Esto incluye createdAt (mapeado a createdAt), firstResponseAt, etc.
      raw: false // Mantener instancias de Sequelize para acceder a relaciones
    });

    let slaViolados = 0;
    const ticketsViolados = new Set(); // Para evitar contar el mismo ticket dos veces
    
   // console.log(`🔍 [SLA] Analizando ${ticketsConSLA.length} tickets para verificar SLA vencidos`);
    
    ticketsConSLA.forEach(ticket => {
      const prioridad = ticket.prioridad;
      if (!prioridad) {
        console.warn(`⚠️ [SLA] Soporte_Ticket ${ticket.id} no tiene prioridad asignada`);
        return;
      }

      // ✅ Acceder a campos directamente - Sequelize mapea automáticamente createdAt -> createdAt
      const createdAt = ticket.createdAt || ticket.getDataValue('createdAt');
      const firstResponseAt = ticket.firstResponseAt || ticket.getDataValue('firstResponseAt');
      const firstResponseDueAt = ticket.firstResponseDueAt || ticket.getDataValue('firstResponseDueAt');
      const resolutionDueAt = ticket.resolutionDueAt || ticket.getDataValue('resolutionDueAt');

      if (!createdAt) {
        console.warn(`⚠️ [SLA] Soporte_Ticket ${ticket.id} no tiene fecha de creación. Campos disponibles:`, Object.keys(ticket.dataValues || {}));
        return;
      }

      // Verificar violación de primera respuesta
      if (!firstResponseAt) {
        const firstResponseDue = firstResponseDueAt || 
          new Date(new Date(createdAt).getTime() + (prioridad.firstResponseHours * 60 * 60 * 1000));
        if (ahora > firstResponseDue) {
         // console.log(`🚨 [SLA] Soporte_Ticket ${ticket.id} violó primera respuesta. Vencimiento: ${firstResponseDue}, Ahora: ${ahora}`);
          ticketsViolados.add(ticket.id);
          return;
        }
      }

      // Verificar violación de resolución
      if (ticket.status !== 'resuelto' && ticket.status !== 'cerrado') {
        const resolutionDue = resolutionDueAt || 
          new Date(new Date(createdAt).getTime() + (prioridad.resolutionHours * 60 * 60 * 1000));
        if (ahora > resolutionDue) {
         // console.log(`🚨 [SLA] Soporte_Ticket ${ticket.id} violó resolución. Vencimiento: ${resolutionDue}, Ahora: ${ahora}`);
          ticketsViolados.add(ticket.id);
        }
      }
    });
    
    slaViolados = ticketsViolados.size;
   // console.log(`✅ [SLA] Total de tickets con SLA vencido: ${slaViolados}`);

    // 5. Total de tickets activos (no cerrados, no resueltos, ni eliminados)
    const total = await Soporte_Ticket.count({
      where: {
        ...whereBase,
        status: {
          [Op.notIn]: ['cerrado', 'resuelto'] // ✅ Excluir tickets resueltos también
        }
      }
    });

    // 6. Total de reaperturas
    const reopenCountTotal = await Soporte_Ticket.sum('reopenCount', {
      where: whereBase
    }) || 0;

    // 7. Agrupación por estado
    const ticketsPorEstado = await Soporte_Ticket.findAll({
      where: whereBase,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const porEstado = {};
    ticketsPorEstado.forEach(item => {
      porEstado[item.status] = parseInt(item.count);
    });

    // 8. Agrupación por prioridad
    const ticketsPorPrioridad = await Soporte_Ticket.findAll({
      where: whereBase,
      include: [
        {
          model: Soporte_Prioridad,
          as: 'prioridad',
          attributes: ['nombre'],
          required: false
        }
      ],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Soporte_Ticket.id')), 'count']
      ],
      group: ['prioridad.nombre'],
      raw: true
    });

    const porPrioridad = {};
    ticketsPorPrioridad.forEach(item => {
      const nombrePrioridad = item['prioridad.nombre'] || 'Sin prioridad';
      porPrioridad[nombrePrioridad.toLowerCase().replace(/\s+/g, '_')] = parseInt(item.count);
    });

    // 9. Agrupación por categoría
    const ticketsPorCategoria = await Soporte_Ticket.findAll({
      where: whereBase,
      include: [
        {
          model: Soporte_Categoria,
          as: 'categoria',
          attributes: ['nombre'],
          required: false
        }
      ],
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Soporte_Ticket.id')), 'count']
      ],
      group: ['categoria.nombre'],
      raw: true
    });

    const porCategoria = {};
    ticketsPorCategoria.forEach(item => {
      const nombreCategoria = item['categoria.nombre'] || 'Sin categoría';
      porCategoria[nombreCategoria] = parseInt(item.count);
    });

    // 10. Agrupación por tipo
    const ticketsPorTipo = await Soporte_Ticket.findAll({
      where: whereBase,
      attributes: [
        'tipo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['tipo'],
      raw: true
    });

    const porTipo = {};
    ticketsPorTipo.forEach(item => {
      porTipo[item.tipo] = parseInt(item.count);
    });

    // 11. Tiempos promedio
    const ticketsConPrimeraRespuesta = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        firstResponseAt: {
          [Op.not]: null
        }
      },
      attributes: [
        [sequelize.literal('AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 3600)'), 'avgHours']
      ],
      raw: true
    });

    const primeraRespuestaPromedio = ticketsConPrimeraRespuesta[0]?.avgHours 
      ? parseFloat(ticketsConPrimeraRespuesta[0].avgHours).toFixed(1)
      : 0;

    const ticketsResueltos = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        resolvedAt: {
          [Op.not]: null
        }
      },
      attributes: [
        [sequelize.literal('AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)'), 'avgHours']
      ],
      raw: true
    });

    const resolucionPromedio = ticketsResueltos[0]?.avgHours 
      ? parseFloat(ticketsResueltos[0].avgHours).toFixed(1)
      : 0;

    // Log de métricas calculadas para debugging
   // console.log('📊 [obtenerMetricasCards] Métricas calculadas:', {
    //   sinAsignar,
    //   nuevos,
    //   misTickets,
    //   enProgreso,
    //   esperandoCliente,
    //   total,
    //   userId,
    //   userRole,
    //   esAgenteMetricas
    // });

    res.json({
      success: true,
      metrics: {
        total, // ✅ Tickets Activos (no cerrados ni eliminados)
        sinAsignar,
        nuevos, // ✅ Tickets creados HOY (cualquier estado)
        misTickets, // ✅ Tickets del agente/admin según nueva lógica
        enProgreso,
        esperandoCliente,
        enEspera,
        pendienteValidacion,
        resueltosHoy,
        resueltosEstaSemana,
        slaViolado: slaViolados, // ✅ Calculado dinámicamente (cambiar nombre a singular para consistencia con frontend)
        reopenCountTotal,
        porEstado,
        porPrioridad,
        porCategoria,
        porTipo,
        tiemposPromedio: {
          primeraRespuesta: parseFloat(primeraRespuestaPromedio),
          resolucion: parseFloat(resolucionPromedio)
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener métricas de cards:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener métricas'
    });
  }
};

/**
 * GET /soporteAPI/metrics/charts
 * Obtener datos para gráficas
 */
const obtenerMetricasCharts = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { period = 30, agentId } = req.query;

    // Determinar filtro de agente
    let agentFilter = null;
    // Reconocer "Agente Soporte" y "Soporte" como roles de agente
    const esAgenteCharts = userRole === 'Agente Soporte' || userRole === 'Soporte' || userRole === 'Agente';
    if (esAgenteCharts) {
      agentFilter = userId;
    } else if ((userRole === 'Admin' || userRole === 'Administrador') && agentId) {
      agentFilter = parseInt(agentId);
    }

    // Construir where base
    const whereBase = {
      eliminado: false
    };

    if (agentFilter !== null) {
      whereBase.agentId = agentFilter;
    }

    // Fecha de inicio (últimos N días)
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - parseInt(period));
    fechaInicio.setHours(0, 0, 0, 0);

    // 1. Tendencia de tickets creados
    const tendenciaCreados = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        createdAt: {
          [Op.gte]: fechaInicio
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    const tendenciaCreadosFormateada = tendenciaCreados.map(item => {
      // Manejar casos donde fecha puede ser null o undefined
      let fechaStr = '';
      if (item.fecha) {
        if (item.fecha instanceof Date) {
          fechaStr = item.fecha.toISOString().split('T')[0];
        } else if (typeof item.fecha === 'string') {
          fechaStr = item.fecha.split('T')[0];
        } else {
          fechaStr = String(item.fecha);
        }
      }
      return {
        fecha: fechaStr,
        count: parseInt(item.count) || 0
      };
    }).filter(item => item.fecha); // Filtrar items sin fecha

    // 2. Tendencia de tickets resueltos
    const tendenciaResueltos = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        status: 'resuelto',
        resolvedAt: {
          [Op.gte]: fechaInicio,
          [Op.ne]: null
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('resolvedAt')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('resolvedAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('resolvedAt')), 'ASC']],
      raw: true
    });

    const tendenciaResueltosFormateada = tendenciaResueltos.map(item => {
      // Manejar casos donde fecha puede ser null o undefined
      let fechaStr = '';
      if (item.fecha) {
        if (item.fecha instanceof Date) {
          fechaStr = item.fecha.toISOString().split('T')[0];
        } else if (typeof item.fecha === 'string') {
          fechaStr = item.fecha.split('T')[0];
        } else {
          fechaStr = String(item.fecha);
        }
      }
      return {
        fecha: fechaStr,
        count: parseInt(item.count) || 0
      };
    }).filter(item => item.fecha); // Filtrar items sin fecha

    // 3. Distribución por estado - ÚLTIMOS 30 DÍAS
    const distribucionEstado = await Soporte_Ticket.findAll({
      where: {
        ...whereBase,
        createdAt: {
          [Op.gte]: fechaInicio // ✅ Filtrar por últimos 30 días
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const estadosLabels = {
      'nuevo': 'Nuevo',
      'abierto': 'Abierto',
      'en_progreso': 'En Progreso',
      'esperando_cliente': 'Esperando Cliente',
      'en_espera': 'En Espera',
      'pendiente_validacion': 'Pendiente Validación',
      'pendiente_validacion_nube': 'Pendiente Validación Nube',
      'resuelto': 'Resuelto',
      'cerrado': 'Cerrado'
    };

    const distribucionPorEstado = {
      labels: distribucionEstado.map(item => estadosLabels[item.status] || item.status),
      data: distribucionEstado.map(item => parseInt(item.count))
    };

    // 4. Distribución por prioridad - ÚLTIMOS 30 DÍAS
    // Usar una consulta SQL más directa para evitar problemas con raw: true y includes
     let distribucionPrioridadQuery = `
       SELECT 
         COALESCE("prioridad"."nombre", 'Sin prioridad') as nombre,
         COUNT("Soporte_Ticket"."id") as count
       FROM "soporte_Ticket" AS "Soporte_Ticket"
       LEFT OUTER JOIN "soporte_Prioridad" AS "prioridad" ON "Soporte_Ticket"."prioridadId" = "prioridad"."id"
       WHERE "Soporte_Ticket"."eliminado" = false
         AND "Soporte_Ticket"."status" NOT IN ('resuelto', 'cerrado')
         AND "Soporte_Ticket"."createdAt" >= $1
     `;
    
    const queryParams = [fechaInicio]; // ✅ Agregar fecha como primer parámetro
    
    if (agentFilter !== null) {
      distribucionPrioridadQuery += ` AND "Soporte_Ticket"."agentId" = $2`;
      queryParams.push(agentFilter);
    }
    
    distribucionPrioridadQuery += `
      GROUP BY "prioridad"."nombre"
      ORDER BY count DESC
    `;
    
    const distribucionPrioridad = await sequelize.query(distribucionPrioridadQuery, {
      type: sequelize.QueryTypes.SELECT,
      bind: queryParams
    });

    const distribucionPorPrioridad = {
      labels: distribucionPrioridad.map(item => item.nombre || 'Sin prioridad'),
      data: distribucionPrioridad.map(item => parseInt(item.count) || 0)
    };

    // 5. Distribución por usuario (tickets NO CERRADOS) - TODOS (sin filtro de fecha)
    let distribucionUsuarioQuery = `
      SELECT 
        COALESCE("usuario"."usuario", 'Sin asignar') as username,
        COALESCE("usuario"."nombre", '') as nombre,
        COALESCE("usuario"."apellido", '') as apellido,
        "Soporte_Ticket"."agentId" as agentid,
        COUNT("Soporte_Ticket"."id") as count
      FROM "soporte_Ticket" AS "Soporte_Ticket"
      LEFT OUTER JOIN "usuario" AS "usuario" ON "Soporte_Ticket"."agentId" = "usuario"."id"
      WHERE "Soporte_Ticket"."eliminado" = false
        AND "Soporte_Ticket"."status" NOT IN ('resuelto', 'cerrado')
    `;
    
    const usuarioQueryParams = [];
    
    if (agentFilter !== null) {
      distribucionUsuarioQuery += ` AND "Soporte_Ticket"."agentId" = $1`;
      usuarioQueryParams.push(agentFilter);
    }
    
    distribucionUsuarioQuery += `
      GROUP BY "usuario"."usuario", "usuario"."nombre", "usuario"."apellido", "Soporte_Ticket"."agentId"
      ORDER BY count DESC
    `;
    
    const distribucionUsuario = await sequelize.query(distribucionUsuarioQuery, {
      type: sequelize.QueryTypes.SELECT,
      bind: usuarioQueryParams
    });

    // Agrupar "Sin asignar" (puede venir múltiples veces por NULL en diferentes campos)
    const usuariosAgrupados = {};
    distribucionUsuario.forEach(item => {
      const key = item.username === 'Sin asignar' || !item.username 
        ? 'Sin asignar' 
        : `${item.username}|${item.nombre}|${item.apellido}|${item.agentid}`;
      
      if (!usuariosAgrupados[key]) {
        usuariosAgrupados[key] = {
          ...item,
          count: 0
        };
      }
      usuariosAgrupados[key].count += parseInt(item.count) || 0;
    });

    const distribucionAgrupada = Object.values(usuariosAgrupados);

    // Log para debug
    console.log('📊 [obtenerMetricasCharts] Distribución por usuario (tickets NO CERRADOS):', {
      totalItems: distribucionAgrupada.length,
      items: distribucionAgrupada.map(item => ({
        username: item.username,
        nombre: item.nombre,
        apellido: item.apellido,
        agentid: item.agentid,
        count: item.count
      }))
    });

    const distribucionPorUsuario = {
      labels: distribucionAgrupada.map(item => {
        if (item.username === 'Sin asignar' || !item.username) {
          return 'Sin asignar';
        }
        // Mostrar nombre completo si existe, sino username
        const nombreCompleto = item.nombre && item.apellido 
          ? `${item.nombre} ${item.apellido}` 
          : item.username || `Usuario ${item.agentid}`;
        return `${nombreCompleto} (${item.count})`;
      }),
      data: distribucionAgrupada.map(item => parseInt(item.count) || 0),
      rawData: distribucionAgrupada // Para uso interno
    };

    res.json({
      success: true,
      charts: {
        tendenciaCreados: tendenciaCreadosFormateada,
        tendenciaResueltos: tendenciaResueltosFormateada,
        distribucionPorEstado,
        distribucionPorPrioridad,
        distribucionPorUsuario
      }
    });

  } catch (error) {
    console.error('❌ [obtenerMetricasCharts] Error al obtener métricas de charts:', error);
    console.error('❌ [obtenerMetricasCharts] Error message:', error.message);
    console.error('❌ [obtenerMetricasCharts] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener datos para gráficas'
    });
  }
};

// ============================================
// MÉTRICAS - PROMEDIO DE RESPUESTA
// ============================================

/**
 * GET /soporteAPI/metrics/promedio-respuesta
 * Obtener promedio de tiempo de respuesta (creación a resolución)
 * Auth: Agente, Admin
 * 
 * Query params:
 * - agentId: (opcional) Filtrar por agente específico
 * 
 * Retorna: { promedioDias: number }
 */
const obtenerPromedioRespuesta = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Op } = require('sequelize');
    const { Soporte_Ticket } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { agentId } = req.query;

    // Determinar filtro de agente
    let agentFilter = null;
    const esAgenteMetricas = userRole === 'Agente Soporte' || userRole === 'Soporte' || userRole === 'Agente';
    if (esAgenteMetricas) {
      // Si es agente, solo sus tickets
      agentFilter = userId;
    } else if ((userRole === 'Admin' || userRole === 'Administrador') && agentId) {
      // Si es admin y especifica un agente
      agentFilter = parseInt(agentId);
    }
    // Si es admin sin agentId, agentFilter queda null (todos los tickets)

    // Construir where base para tickets RESUELTOS o CERRADOS
    const whereBase = {
      eliminado: false,
      status: { [Op.in]: ['resuelto', 'cerrado'] } // Incluir ambos estados
    };

    if (agentFilter !== null) {
      whereBase.agentId = agentFilter;
    }

    // Calcular promedio de días entre creación y resolución/cierre
    // Usar COALESCE para usar resolvedAt si existe, sino closedAt
    const resultado = await Soporte_Ticket.findOne({
      where: whereBase,
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal(`EXTRACT(EPOCH FROM (COALESCE("resolvedAt", "closedAt", NOW()) - "createdAt")) / 86400`)
          ),
          'promedioDias'
        ]
      ],
      raw: true
    });

    const promedioDias = resultado?.promedioDias !== null && resultado?.promedioDias !== undefined
      ? parseFloat(parseFloat(resultado.promedioDias).toFixed(2))
      : 0;

    console.log(`📊 [obtenerPromedioRespuesta] Resultado:`, resultado);
    console.log(`📊 [obtenerPromedioRespuesta] Promedio calculado: ${promedioDias} días`);

    res.json({
      success: true,
      promedioDias
    });
  } catch (error) {
    console.error('❌ [obtenerPromedioRespuesta] Error al calcular promedio de respuesta:', error);
    console.error('❌ [obtenerPromedioRespuesta] Error message:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al calcular promedio de respuesta'
    });
  }
};

// ============================================
// BÚSQUEDA
// ============================================

/**
 * GET /soporteAPI/search
 * Búsqueda avanzada de tickets con full-text search
 * 
 * Referencia: sistema-tickets-backend.md Sección 1.8
 */
const buscarTickets = async (req, res) => {
  try {
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketMensaje, Soporte_Prioridad, Soporte_Categoria } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const {
      q, // Query de búsqueda full-text
      numero, // Búsqueda exacta por número
      categoria,
      prioridad,
      status,
      tipo,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'DESC'
    } = req.query;

    // Construir filtros base
    const where = { eliminado: false };

    // Filtrado por rol: Usuarios normales solo ven sus tickets
    if (userRole === 'Usuario' || userRole === 'Vendedor') {
      where.requesterId = userId;
    }

    // Filtro: número exacto
    if (numero) {
      where.numero = numero;
    }

    // Filtro: categoría
    if (categoria) {
      where.categoriaId = categoria;
    }

    // Filtro: prioridad (por nombre o ID)
    if (prioridad) {
      const prioridadArray = Array.isArray(prioridad) ? prioridad : prioridad.split(',');
      const prioridades = await Soporte_Prioridad.findAll({
        where: { 
          [Op.or]: [
            { nombre: { [Op.in]: prioridadArray } },
            { id: { [Op.in]: prioridadArray } }
          ],
          activa: true,
          eliminado: false
        }
      });
      if (prioridades.length > 0) {
        where.prioridadId = { [Op.in]: prioridades.map(p => p.id) };
      } else {
        // Si no encuentra ninguna prioridad, retornar vacío
        return res.json({
          success: true,
          tickets: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        });
      }
    }

    // Filtro: status
    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(',');
      where.status = { [Op.in]: statusArray };
    }

    // Filtro: tipo
    if (tipo) {
      where.tipo = tipo;
    }

    // Filtro: rango de fechas
    if (dateFrom || dateTo) {
      // Usar el nombre del campo del modelo (Sequelize lo mapeará a createdAt)
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        // Incluir el día completo
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }

    // Búsqueda full-text: si hay query de búsqueda
    if (q && q.trim()) {
      const searchTerm = q.trim();
      
      try {
        // Intentar usar búsqueda full-text con índices GIN de PostgreSQL
        // Esto busca en título, descripción y también en mensajes mediante JOIN
        const query = `
          SELECT DISTINCT t.id
          FROM "soporte_Ticket" t
          LEFT JOIN "soporte_TicketMensaje" tm ON tm.ticketId = t.id AND tm.eliminado = false
          WHERE t.eliminado = false
            AND (
              to_tsvector('spanish', coalesce(t.titulo, '') || ' ' || coalesce(t.descripcion, '')) 
              @@ plainto_tsquery('spanish', $1)
              OR to_tsvector('spanish', coalesce(tm.content, '')) 
              @@ plainto_tsquery('spanish', $1)
              OR t.numero ILIKE $2
            )
        `;

        // Obtener los IDs de tickets que coinciden con la búsqueda full-text
        const searchResults = await sequelize.query(query, {
          bind: [searchTerm, `%${searchTerm}%`],
          type: sequelize.QueryTypes.SELECT
        });

        if (searchResults && searchResults.length > 0) {
          const ticketIds = searchResults.map(r => r.id);
          where.id = { [Op.in]: ticketIds };
        } else {
          // Si no hay resultados en la búsqueda full-text, retornar vacío
          return res.json({
            success: true,
            tickets: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          });
        }
      } catch (fullTextError) {
        // Si falla la búsqueda full-text (ej: índices GIN no disponibles),
        // usar búsqueda ILIKE como fallback
        console.warn('⚠️ Búsqueda full-text falló, usando fallback ILIKE:', fullTextError.message);
        
        // Buscar primero tickets que coinciden en campos directos
        const orConditions = [
          { titulo: { [Op.iLike]: `%${searchTerm}%` } },
          { descripcion: { [Op.iLike]: `%${searchTerm}%` } },
          { numero: { [Op.iLike]: `%${searchTerm}%` } }
        ];
        
        // Buscar también en mensajes: obtener IDs de tickets con mensajes que coinciden
        try {
          const ticketsWithMatchingMessages = await Soporte_TicketMensaje.findAll({
            attributes: ['ticketId'],
            where: {
              content: { [Op.iLike]: `%${searchTerm}%` },
              eliminado: false
            },
            group: ['ticketId'],
            raw: true
          });
          
          if (ticketsWithMatchingMessages.length > 0) {
            const ticketIdsFromMessages = ticketsWithMatchingMessages.map(m => m.ticketId);
            orConditions.push({ id: { [Op.in]: ticketIdsFromMessages } });
          }
        } catch (msgError) {
          console.warn('⚠️ Error buscando en mensajes:', msgError.message);
        }
        
        where[Op.or] = orConditions;
      }
    }

    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Mapear campos de sorting del frontend a campos del backend
    let sortField = sort;
    let sortOrder = order.toUpperCase();
    
    // Mapear campos de asociaciones
    const sortMappings = {
      'prioridad': 'prioridad.nombre',
      'categoria': 'categoria.nombre'
    };
    
    // Si el campo está en los mapeos, usar el campo mapeado
    if (sortMappings[sort]) {
      sortField = sortMappings[sort];
    }
    
    // Construir ordenamiento
    let orderClause;
    if (sortField.includes('.')) {
      // Para campos de asociaciones, usar array con el campo completo
      const [association, field] = sortField.split('.');
      orderClause = [{ model: getModelForAssociation(association, sequelize), as: association }, field, sortOrder];
    } else {
      // Para campos directos
      orderClause = [sortField, sortOrder];
    }
    
    // Ejecutar query
    const { count, rows: tickets } = await Soporte_Ticket.findAndCountAll({
      where,
      include: [
        { 
          model: Soporte_Prioridad, 
          as: 'prioridad', 
          attributes: ['id', 'nombre', 'color', 'orden'],
          required: false
        },
        { 
          model: Soporte_Categoria, 
          as: 'categoria', 
          attributes: ['id', 'nombre', 'modulo'],
          required: false
        }
      ],
      distinct: true, // Importante cuando hay JOINs
      limit: parseInt(limit),
      offset,
      order: [orderClause]
    });

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error en búsqueda de tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar tickets'
    });
  }
};

// ============================================
// ADJUNTOS
// ============================================

/**
 * GET /adjuntos-soporte/:tenant/:ticketId/:filename
 * Descargar adjunto de ticket
 * 
 * Referencia: sistema-tickets-backend.md Sección 1.9
 */
const descargarAdjunto = async (req, res) => {
  try {
    const { sequelize, tenant } = req.db;
    const { Soporte_Ticket, Soporte_TicketAdjunto } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { ticketId, filename } = req.params;

    // Validar parámetros
    if (!ticketId || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Soporte_Ticket ID y nombre de archivo requeridos'
      });
    }

    // Validar que el tenant del parámetro coincide con el tenant de la sesión
    const tenantParam = req.params.tenant;
    if (tenantParam !== tenant) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: tenant no coincide'
      });
    }

    // 1. Buscar el adjunto en la base de datos
    const adjunto = await Soporte_TicketAdjunto.findOne({
      where: {
        ticketId,
        name: filename, // Buscar por nombre de archivo
        eliminado: false
      },
      include: [
        {
          model: Soporte_Ticket,
          as: 'ticket',
          attributes: ['id', 'requesterId', 'agentId', 'status', 'eliminado']
        }
      ]
    });

    if (!adjunto) {
      return res.status(404).json({
        success: false,
        error: 'Adjunto no encontrado'
      });
    }

    // 2. Validar que el usuario tiene permiso de ver el ticket
    const ticket = adjunto.ticket;
    
    if (!ticket || ticket.eliminado) {
      return res.status(404).json({
        success: false,
        error: 'Soporte_Ticket no encontrado'
      });
    }

    // Reglas de acceso:
    // - Administrador: Acceso a todos los tickets
    // - Agente Soporte: Acceso a todos los tickets
    // - Usuario normal: Solo acceso a sus propios tickets (requesterId)
    const tieneAcceso = 
      userRole === 'Administrador' || 
      userRole === 'Agente Soporte' ||
      userRole === 'Soporte' ||
      (ticket.requesterId === userId);

    if (!tieneAcceso) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para acceder a este adjunto'
      });
    }

    // 3. Obtener datos del archivo desde base64
    const fileData = AttachmentService.getFileData(adjunto);
    
    // 4. Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileData.data, 'base64');
    
    // 5. Determinar Content-Type
    const pathModule = require('path');
    const ext = pathModule.extname(adjunto.name).toLowerCase();
    
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    const contentType = mimeTypes[ext] || adjunto.contentType || 'application/octet-stream';
    
    // 6. Configurar headers para descarga
    const safeFileName = adjunto.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.length);
    
    // Headers de seguridad adicionales
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 7. Enviar archivo
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error al descargar adjunto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al descargar adjunto'
    });
  }
};

/**
 * PATCH /soporteAPI/tickets/:id/description
 * Editar descripción del ticket
 * Solo el usuario que creó el ticket puede editarlo
 */
const editarDescripcion = async (req, res) => {
  try {
    console.log(`🔍 [editarDescripcion] Iniciando edición de descripción para ticket ID: ${req.params.id}`);
    console.log(`🔍 [editarDescripcion] Body recibido:`, req.body);
    
    const { sequelize } = req.db;
    const { Soporte_Ticket, Soporte_TicketEvento } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { id } = req.params;
    const { descripcion } = req.body;

    console.log(`🔍 [editarDescripcion] Usuario ID: ${userId}, Rol: ${userRole}, Ticket ID: ${id}`);

    if (!descripcion || descripcion.trim() === '') {
      console.log('❌ [editarDescripcion] Descripción vacía');
      return res.status(400).json({
        success: false,
        error: 'La descripción es requerida'
      });
    }

    // Obtener ticket actual
    console.log(`🔍 [editarDescripcion] Buscando ticket con ID: ${id}`);
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      console.log(`❌ [editarDescripcion] Ticket no encontrado: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    console.log(`🔍 [editarDescripcion] Ticket encontrado. RequesterId: ${ticket.requesterId}, Descripción actual: ${ticket.descripcion?.substring(0, 50)}...`);

    // Validar permisos: solo el creador del ticket puede editar la descripción
    // Los administradores y agentes también pueden editar
    const puedeEditar = userRole === 'Administrador' || 
                       userRole === 'Agente Soporte' || 
                       userRole === 'Soporte' ||
                       ticket.requesterId === userId;

    console.log(`🔍 [editarDescripcion] Puede editar: ${puedeEditar}`);

    if (!puedeEditar) {
      console.log(`❌ [editarDescripcion] Permiso denegado. UserId: ${userId}, RequesterId: ${ticket.requesterId}`);
      return res.status(403).json({
        success: false,
        error: 'Solo el creador del ticket puede editar la descripción'
      });
    }

    // Guardar descripción anterior para auditoría
    const descripcionAnterior = ticket.descripcion;

    console.log(`🔍 [editarDescripcion] Actualizando descripción. Anterior: "${descripcionAnterior?.substring(0, 50)}...", Nueva: "${descripcion.substring(0, 50)}..."`);

    // Actualizar descripción en transacción
    await sequelize.transaction(async (t) => {
      const now = new Date();
      
      await Soporte_Ticket.update({
        descripcion: descripcion.trim(),
        lastActivityAt: now,
        updatedAt: now
      }, {
        where: { id },
        transaction: t
      });

      // Registrar evento de auditoría
      await Soporte_TicketEvento.create({
        ticketId: id,
        eventType: 'description_updated',
        actorId: userId,
        payload: {
          previousDescription: descripcionAnterior,
          newDescription: descripcion.trim()
        },
        createdAt: now
      }, { transaction: t });
    });

    console.log(`✅ [editarDescripcion] Descripción actualizada correctamente para ticket ${id}`);
    
    res.status(200).json({
      success: true,
      message: 'Descripción actualizada correctamente'
    });
  } catch (error) {
    console.error('❌ [editarDescripcion] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error al editar la descripción'
    });
  }
};

// ============================================
// CROSS-TENANT: REGISTRY Y DASHBOARD
// ============================================

const { conexionDB } = require('../config/db');
const { getRegistry, isMainSupport: registryIsMainSupport } = require('../services/tenantsRegistry');

/**
 * GET /soporteAPI/tenants-disponibles
 * Devuelve la lista de tenants accesibles desde el tenant principal de soporte.
 * Solo retorna entries del registry; el caller ya pasó por requireMainSupport.
 */
const listarTenantsDisponibles = async (req, res) => {
  try {
    const sessionTenant = req.db?.tenant;
    const registry = getRegistry();
    res.json({
      success: true,
      sessionTenant,
      isMainSupport: registryIsMainSupport(sessionTenant),
      tenants: registry
    });
  } catch (error) {
    console.error('[listarTenantsDisponibles] Error:', error);
    res.status(500).json({ success: false, error: 'Error al listar tenants' });
  }
};

/**
 * GET /soporteAPI/dashboard-cross-tenant
 * Agregados livianos por tenant (counts) para el modo "all" del dropdown.
 * Hace queries en paralelo contra cada tenant del registry. Si un tenant
 * falla, se reporta como error en su entry pero no rompe el resto.
 */
const dashboardCrossTenant = async (req, res) => {
  try {
    const registry = getRegistry();
    const idUsuario = req.cookies.idUsuario;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999);

    const estadosNoCerrados = ['nuevo', 'abierto', 'en_progreso', 'esperando_cliente', 'en_espera', 'pendiente_validacion', 'pendiente_validacion_nube'];

    const tareas = registry.map(async (entry) => {
      try {
        const tenantSequelize = await conexionDB(entry.tenant, idUsuario);
        const { Soporte_Ticket } = soporteModelInit(tenantSequelize);

        const [total, sinAsignar, nuevosHoy, enProgreso, esperandoCliente] = await Promise.all([
          Soporte_Ticket.count({ where: { eliminado: false, status: { [Op.in]: estadosNoCerrados } } }),
          Soporte_Ticket.count({ where: { eliminado: false, status: 'nuevo', agentId: null } }),
          Soporte_Ticket.count({ where: { eliminado: false, createdAt: { [Op.gte]: hoy, [Op.lte]: finDia } } }),
          Soporte_Ticket.count({ where: { eliminado: false, status: 'en_progreso' } }),
          Soporte_Ticket.count({ where: { eliminado: false, status: { [Op.in]: ['esperando_cliente', 'pendiente_validacion', 'pendiente_validacion_nube'] } } })
        ]);

        return {
          tenant: entry.tenant,
          displayName: entry.displayName,
          isMainSupport: !!entry.isMainSupport,
          metrics: { total, sinAsignar, nuevosHoy, enProgreso, esperandoCliente },
          error: null
        };
      } catch (err) {
        console.error(`[dashboardCrossTenant] Falló tenant "${entry.tenant}":`, err.message);
        return {
          tenant: entry.tenant,
          displayName: entry.displayName,
          isMainSupport: !!entry.isMainSupport,
          metrics: null,
          error: err.message || 'Error desconocido'
        };
      }
    });

    const resultados = await Promise.all(tareas);

    // Totales globales sumando los exitosos
    const totalesGlobales = resultados.reduce((acc, r) => {
      if (!r.metrics) return acc;
      acc.total += r.metrics.total;
      acc.sinAsignar += r.metrics.sinAsignar;
      acc.nuevosHoy += r.metrics.nuevosHoy;
      acc.enProgreso += r.metrics.enProgreso;
      acc.esperandoCliente += r.metrics.esperandoCliente;
      return acc;
    }, { total: 0, sinAsignar: 0, nuevosHoy: 0, enProgreso: 0, esperandoCliente: 0 });

    res.json({
      success: true,
      tenants: resultados,
      totales: totalesGlobales
    });
  } catch (error) {
    console.error('[dashboardCrossTenant] Error:', error);
    res.status(500).json({ success: false, error: 'Error al obtener dashboard cross-tenant' });
  }
};

module.exports = {
  // CRUD Básico
  crearTicket,
  listarTickets,
  obtenerTicket,
  // Acciones
  tomarTicket,
  reasignarTicket,
  agregarMensaje,
  cambiarEstado,
   // Cambios y Configuración
   cambiarPrioridad,
   cambiarCategoria,
   editarDescripcion,
   eliminarTicket,
  // Categorías
  listarCategorias,
  crearCategoria,
  editarCategoria,
  eliminarCategoria,
  // Prioridades
  listarPrioridades,
  crearPrioridad,
  editarPrioridad,
  eliminarPrioridad,
  // Configuración
  obtenerConfig,
  actualizarConfig,
  // Notificaciones
  obtenerConfigNotificaciones,
  actualizarConfigNotificaciones,
  // Plantillas
  listarPlantillas,
  crearPlantilla,
  editarPlantilla,
  eliminarPlantilla,
  // Métricas
  obtenerMetricasCards,
  obtenerMetricasCharts,
  obtenerPromedioRespuesta,
  // Búsqueda
  buscarTickets,
  // Adjuntos
  descargarAdjunto,
  // Cross-tenant
  listarTenantsDisponibles,
  dashboardCrossTenant
};
