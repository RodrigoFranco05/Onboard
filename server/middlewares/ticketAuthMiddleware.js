/**
 * Middleware para validar permisos de acceso a tickets
 * 
 * Este middleware proporciona funciones para:
 * - Validar acceso a tickets específicos
 * - Requerir roles de agente o administrador
 * - Requerir rol de administrador
 * 
 * Referencia: sistema-tickets-backend.md Sección 4.1
 */

const { soporteModelInit } = require('../models/soporteModel');

/**
 * Validar que usuario tiene permiso para acceder al ticket
 * 
 * Reglas de acceso:
 * - Administrador: Acceso a todos los tickets
 * - Agente Soporte: Acceso a todos los tickets
 * - Usuario normal: Solo acceso a sus propios tickets (requesterId)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * 
 * @example
 * router.get('/tickets/:id', validateTicketAccess, obtenerTicket);
 */
const validateTicketAccess = async (req, res, next) => {
  try {
    console.log(`🔍 [validateTicketAccess] Validando acceso para ticket ID: ${req.params.id}`);
    console.log(`🔍 [validateTicketAccess] Método: ${req.method}, Ruta: ${req.path}`);
    
    const { sequelize } = req.db;
    const { Soporte_Ticket } = soporteModelInit(sequelize);
    
    const userId = parseInt(req.cookies.idUsuario);
    const userRole = req.cookies.rolUsuario;
    const { id } = req.params;

    console.log(`🔍 [validateTicketAccess] Usuario ID: ${userId}, Rol: ${userRole}`);

    // Validar que se proporcionó ID
    if (!id) {
      console.log('❌ [validateTicketAccess] ID de ticket requerido');
      return res.status(400).json({
        success: false,
        error: 'ID de ticket requerido'
      });
    }

    // Buscar ticket
    console.log(`🔍 [validateTicketAccess] Buscando ticket con ID: ${id}`);
    const ticket = await Soporte_Ticket.findByPk(id, {
      where: { eliminado: false }
    });

    if (!ticket) {
      console.log(`❌ [validateTicketAccess] Ticket no encontrado: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // Admin y Agente Soporte siempre tienen acceso
    // También reconocer "Soporte" como rol de agente
    // console.log('🔍 [validateTicketAccess] Rol usuario:', userRole, '| Soporte_Ticket ID:', id, '| AgentId:', ticket.agentId);
    if (userRole === 'Administrador' || userRole === 'Agente Soporte' || userRole === 'Soporte') {
      console.log('✅ [validateTicketAccess] Usuario es agente/admin, acceso permitido');
      req.ticket = ticket;
      return next();
    }

    // Usuario normal solo accede a sus propios tickets
    if (ticket.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permiso para acceder a este ticket'
      });
    }

    console.log(`✅ [validateTicketAccess] Acceso permitido para usuario ${userId} al ticket ${id}`);
    
    // Adjuntar ticket al request para uso posterior
    req.ticket = ticket;
    next();

  } catch (error) {
    console.error('Error al validar acceso a ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar permisos'
    });
  }
};

/**
 * Validar que usuario tiene rol de agente o admin
 * 
 * Permite acceso a:
 * - Administrador
 * - Agente Soporte
 * - Clientes (solo para cerrar tickets en estado "resuelto")
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * 
 * @example
 * router.post('/tickets/:id/take', requireAgentOrAdmin, tomarTicket);
 */
const requireAgentOrAdmin = async (req, res, next) => {
  const userRole = req.cookies.rolUsuario;

  if (!userRole) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado'
    });
  }

  // Reconocer "Soporte" como rol de agente también
  if (userRole === 'Administrador' || userRole === 'Agente Soporte' || userRole === 'Soporte') {
    return next();
  }

  // EXCEPCIÓN: Permitir que clientes cierren tickets en estado "resuelto"
  // Solo para la ruta PATCH /tickets/:id/status
  if (req.method === 'PATCH' && req.path.includes('/status')) {
    try {
      const { sequelize } = req.db;
      const { Soporte_Ticket } = require('../models/soporteModel').soporteModelInit(sequelize);
      const { id } = req.params;
      const { status } = req.body;
      const userId = parseInt(req.cookies.idUsuario);

      // Obtener ticket para verificar estado y requester
      const ticket = await Soporte_Ticket.findByPk(id, {
        where: { eliminado: false }
      });

      if (ticket && 
          status && 
          String(status).trim().toLowerCase() === 'cerrado' && 
          ticket.status === 'resuelto' && 
          ticket.requesterId === userId) {
        // Permitir que el cliente cierre su ticket resuelto
        console.log('✅ [requireAgentOrAdmin] Excepción: Cliente cerrando ticket resuelto');
        return next();
      }
    } catch (error) {
      console.error('Error verificando excepción de cierre de ticket:', error);
      // Si hay error, continuar con la validación normal (bloquear)
    }
  }

  res.status(403).json({
    success: false,
    error: 'No tienes permisos para realizar esta acción. Se requiere rol de Agente Soporte o Administrador.'
  });
};

/**
 * Validar que usuario tiene rol de admin
 * 
 * Solo permite acceso a:
 * - Administrador
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 * 
 * @example
 * router.delete('/tickets/:id', requireAdmin, eliminarTicket);
 */
const requireAdmin = (req, res, next) => {
  const userRole = req.cookies.rolUsuario;

  if (!userRole) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado'
    });
  }

  if (userRole === 'Administrador') {
    return next();
  }

  res.status(403).json({
    success: false,
    error: 'Solo administradores pueden realizar esta acción'
  });
};

module.exports = {
  validateTicketAccess,
  requireAgentOrAdmin,
  requireAdmin
};
