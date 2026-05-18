/**
 * Rutas del módulo de Soporte
 * 
 * Base URL: /soporteAPI
 * 
 * Referencia: sistema-tickets-backend.md Sección 1.1
 * Referencia: sistema-tickets-GUIA-IMPLEMENTACION.md Fase 7 - Sección 1
 */

const express = require('express');
const router = express.Router();
const adjuntosRouter = express.Router();
const multer = require('multer');
const { conexionDB } = require('../config/db');
const {
  resolveCrossTenant,
  enforceCrossTenantReadOnly,
  requireMainSupport
} = require('../middlewares/crossTenantMiddleware');

// Configurar multer para manejar archivos en memoria (sin guardar en disco temporal)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 5 // Máximo 5 archivos
  }
});

// Middleware para establecer req.db (conexión a base de datos por tenant)
const attachDb = async (req, res, next) => {
  try {
    const tenant = req.cookies.tenant;
    const idUsuario = req.cookies.idUsuario;
    
    if (!tenant) {
      return res.status(400).json({
        success: false,
        error: 'Tenant requerido. Por favor, inicie sesión.'
      });
    }
    
    // Establecer conexión a la base de datos
    const sequelize = await conexionDB(tenant, idUsuario);
    req.db = { sequelize, tenant };
    
    next();
  } catch (error) {
    console.error('Error estableciendo conexión a BD en soporteRoutes:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al conectar con la base de datos'
    });
  }
};

router.use(attachDb);
router.use(resolveCrossTenant);
adjuntosRouter.use(attachDb);

// Importar controladores
const {
  // CRUD Básico Tickets
  crearTicket,
  listarTickets,
  obtenerTicket,
  // Acciones de Tickets
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
} = require('../controllers/soporteController');

// Importar middlewares
const {
  validateTicketAccess,
  requireAgentOrAdmin,
  requireAdmin
} = require('../middlewares/ticketAuthMiddleware');

// ============================================
// TICKETS - CRUD BÁSICO
// ============================================

/**
 * POST /soporteAPI/tickets
 * Crear nuevo ticket
 * Auth: Usuario Normal, Agente, Admin
 * 
 * Acepta JSON con:
 * - tipo: string
 * - titulo: string
 * - descripcion: string
 * - categoriaId: string (se convierte a número)
 * - prioridadId: string (se convierte a número)
 * - adjuntos: Array[{ name, type, size, data: base64 }] (opcional, máximo 5 archivos)
 */
router.post('/tickets', enforceCrossTenantReadOnly, crearTicket);

/**
 * GET /soporteAPI/tickets
 * Listar tickets (filtrado según rol)
 * Auth: Usuario Normal (solo propios), Agente/Admin (todos)
 */
router.get('/tickets', listarTickets);

/**
 * GET /soporteAPI/tickets/:id
 * Obtener ticket específico
 * Auth: Usuario Normal (solo propios), Agente/Admin (todos)
 * Middleware: validateTicketAccess
 */
router.get('/tickets/:id', validateTicketAccess, obtenerTicket);

// ============================================
// TICKETS - ACCIONES
// ============================================

/**
 * POST /soporteAPI/tickets/:id/take
 * Tomar ticket (asignarse a sí mismo)
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin, validateTicketAccess
 */
router.post('/tickets/:id/take', enforceCrossTenantReadOnly, validateTicketAccess, requireAgentOrAdmin, tomarTicket);

/**
 * POST /soporteAPI/tickets/:id/reassign
 * Reasignar ticket a otro agente
 * Auth: Admin únicamente
 * Middleware: requireAdmin, validateTicketAccess
 */
router.post('/tickets/:id/reassign', enforceCrossTenantReadOnly, validateTicketAccess, requireAdmin, reasignarTicket);

/**
 * POST /soporteAPI/tickets/:id/messages
 * Agregar mensaje a ticket
 * Auth: Usuario Normal (solo propios), Agente/Admin (todos)
 * Middleware: validateTicketAccess
 * 
 * Acepta JSON con:
 * - content: string
 * - isInternal: boolean (opcional)
 * - cambiarEstado: string (opcional)
 * - adjuntos: Array[{ name, type, size, data: base64 }] (opcional, máximo 5 archivos)
 */
router.post('/tickets/:id/messages', enforceCrossTenantReadOnly, validateTicketAccess, agregarMensaje);

/**
 * PATCH /soporteAPI/tickets/:id/status
 * Cambiar estado del ticket
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin, validateTicketAccess
 */
router.patch('/tickets/:id/status', enforceCrossTenantReadOnly, validateTicketAccess, requireAgentOrAdmin, cambiarEstado);

/**
 * PATCH /soporteAPI/tickets/:id/priority
 * Cambiar prioridad del ticket
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin, validateTicketAccess
 */
router.patch('/tickets/:id/priority', enforceCrossTenantReadOnly, validateTicketAccess, requireAgentOrAdmin, cambiarPrioridad);

/**
 * PATCH /soporteAPI/tickets/:id/category
 * Cambiar categoría del ticket
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin, validateTicketAccess
 */
router.patch('/tickets/:id/category', enforceCrossTenantReadOnly, validateTicketAccess, requireAgentOrAdmin, cambiarCategoria);

/**
 * PATCH /soporteAPI/tickets/:id/description
 * Editar descripción del ticket
 * Auth: Usuario Normal (solo creador), Agente/Admin (todos)
 * Middleware: validateTicketAccess
 */
router.patch('/tickets/:id/description', enforceCrossTenantReadOnly, validateTicketAccess, editarDescripcion);

/**
 * DELETE /soporteAPI/tickets/:id
 * Eliminar ticket (soft delete)
 * Auth: Admin únicamente
 * Middleware: requireAdmin, validateTicketAccess
 */
router.delete('/tickets/:id', enforceCrossTenantReadOnly, validateTicketAccess, requireAdmin, eliminarTicket);

// ============================================
// CATEGORÍAS - CRUD
// ============================================

/**
 * GET /soporteAPI/categorias
 * Listar categorías
 * Auth: Usuario Normal, Agente, Admin
 */
router.get('/categorias', listarCategorias);

/**
 * POST /soporteAPI/categorias
 * Crear categoría
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.post('/categorias', enforceCrossTenantReadOnly, requireAdmin, crearCategoria);

/**
 * PATCH /soporteAPI/categorias/:id
 * Editar categoría
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.patch('/categorias/:id', enforceCrossTenantReadOnly, requireAdmin, editarCategoria);

/**
 * DELETE /soporteAPI/categorias/:id
 * Eliminar categoría (soft delete)
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.delete('/categorias/:id', enforceCrossTenantReadOnly, requireAdmin, eliminarCategoria);

// ============================================
// PRIORIDADES - CRUD
// ============================================

/**
 * GET /soporteAPI/prioridades
 * Listar prioridades
 * Auth: Usuario Normal, Agente, Admin
 */
router.get('/prioridades', listarPrioridades);

/**
 * POST /soporteAPI/prioridades
 * Crear prioridad
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.post('/prioridades', enforceCrossTenantReadOnly, requireAdmin, crearPrioridad);

/**
 * PATCH /soporteAPI/prioridades/:id
 * Editar prioridad
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.patch('/prioridades/:id', enforceCrossTenantReadOnly, requireAdmin, editarPrioridad);

/**
 * DELETE /soporteAPI/prioridades/:id
 * Eliminar prioridad (soft delete)
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.delete('/prioridades/:id', enforceCrossTenantReadOnly, requireAdmin, eliminarPrioridad);

// ============================================
// CONFIGURACIÓN
// ============================================

/**
 * GET /soporteAPI/config
 * Obtener configuración de soporte
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin
 */
router.get('/config', requireAgentOrAdmin, obtenerConfig);

/**
 * PATCH /soporteAPI/config
 * Actualizar configuración de soporte
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.patch('/config', enforceCrossTenantReadOnly, requireAdmin, actualizarConfig);

// ============================================
// NOTIFICACIONES - CONFIG POR USUARIO
// ============================================

/**
 * GET /soporteAPI/notificaciones/config
 * Listar usuarios del tenant con su config de notificaciones
 * Auth: Admin unicamente
 */
router.get('/notificaciones/config', requireAdmin, obtenerConfigNotificaciones);

/**
 * PUT /soporteAPI/notificaciones/config
 * Upsert batch de la config de notificaciones por usuario
 * Auth: Admin unicamente
 */
router.put('/notificaciones/config', enforceCrossTenantReadOnly, requireAdmin, actualizarConfigNotificaciones);

// ============================================
// PLANTILLAS - CRUD
// ============================================

/**
 * GET /soporteAPI/plantillas
 * Listar plantillas
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin
 */
router.get('/plantillas', requireAgentOrAdmin, listarPlantillas);

/**
 * POST /soporteAPI/plantillas
 * Crear plantilla
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.post('/plantillas', enforceCrossTenantReadOnly, requireAdmin, crearPlantilla);

/**
 * PATCH /soporteAPI/plantillas/:id
 * Editar plantilla
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.patch('/plantillas/:id', enforceCrossTenantReadOnly, requireAdmin, editarPlantilla);

/**
 * DELETE /soporteAPI/plantillas/:id
 * Eliminar plantilla (soft delete)
 * Auth: Admin únicamente
 * Middleware: requireAdmin
 */
router.delete('/plantillas/:id', enforceCrossTenantReadOnly, requireAdmin, eliminarPlantilla);

// ============================================
// MÉTRICAS Y DASHBOARD
// ============================================

/**
 * GET /soporteAPI/metrics/cards
 * Obtener métricas para cards del dashboard
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin
 */
router.get('/metrics/cards', requireAgentOrAdmin, obtenerMetricasCards);

/**
 * GET /soporteAPI/metrics/charts
 * Obtener datos para gráficas
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin
 */
router.get('/metrics/charts', requireAgentOrAdmin, obtenerMetricasCharts);

/**
 * GET /soporteAPI/metrics/promedio-respuesta
 * Obtener promedio de tiempo de respuesta (creación a resolución)
 * Auth: Agente, Admin
 * Middleware: requireAgentOrAdmin
 * 
 * Query params:
 * - agentId: (opcional) Filtrar por agente específico
 */
router.get('/metrics/promedio-respuesta', requireAgentOrAdmin, obtenerPromedioRespuesta);

// ============================================
// BÚSQUEDA
// ============================================

/**
 * GET /soporteAPI/search
 * Búsqueda avanzada de tickets con full-text search
 * Auth: Usuario (solo propios), Agente/Admin (todos)
 */
router.get('/search', buscarTickets);

// ============================================
// CROSS-TENANT
// ============================================

/**
 * GET /soporteAPI/tenants-disponibles
 * Devuelve la lista de tenants visibles desde el tenant principal de soporte.
 * Auth: Agente, Admin (solo dentro de tenant marcado isMainSupport).
 */
router.get('/tenants-disponibles', requireMainSupport, listarTenantsDisponibles);

/**
 * GET /soporteAPI/dashboard-cross-tenant
 * Métricas agregadas (counts) por tenant para el modo "Todos".
 * Auth: Agente, Admin (solo dentro de tenant marcado isMainSupport).
 */
router.get('/dashboard-cross-tenant', requireMainSupport, dashboardCrossTenant);

// ============================================
// ADJUNTOS
// ============================================

/**
 * GET /adjuntos-soporte/:tenant/:ticketId/:filename
 * Descargar adjunto de ticket
 */
adjuntosRouter.get('/adjuntos-soporte/:tenant/:ticketId/:filename', descargarAdjunto);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  soporteRouter: router,
  soporteAdjuntosRouter: adjuntosRouter
};
