/**
 * Middlewares para soporte cross-tenant.
 *
 * Flujo: attachDb (en soporteRoutes) ya pone req.db = { sequelize, tenant }
 * apuntando al tenant de la cookie (sesión). resolveCrossTenant corre después y,
 * si la request trae ?tenant=X (distinto al de la sesión), valida el acceso y
 * reemplaza req.db.sequelize por la conexión del tenant solicitado.
 *
 * Roles permitidos para cross-tenant: Administrador, Agente Soporte, Soporte.
 */

const { conexionDB } = require('../config/db');
const { findTenant, isMainSupport } = require('../services/tenantsRegistry');

const ROLES_CROSS_TENANT = ['Administrador', 'Agente Soporte', 'Soporte'];

const esRolCrossTenant = (rol) => ROLES_CROSS_TENANT.includes(rol);

/**
 * Resuelve el tenant solicitado por la request:
 *   - Sin ?tenant o ?tenant === sesión → modo single, sin cambios.
 *   - ?tenant === 'all' → modo all (solo válido en endpoints que lo manejan).
 *   - ?tenant === otro tenant del registry → cambia req.db.sequelize.
 *
 * Setea req.crossTenant = {
 *   isCrossTenant: boolean,
 *   sessionTenant: string,
 *   requestedTenant: string,
 *   mode: 'single' | 'all'
 * }
 */
const resolveCrossTenant = async (req, res, next) => {
  try {
    const sessionTenant = req.db?.tenant;
    if (!sessionTenant) {
      return res.status(500).json({
        success: false,
        error: 'resolveCrossTenant requiere req.db. Asegúrese de aplicar attachDb antes.'
      });
    }

    const requested = (req.query.tenant || '').toString().trim();

    // Sin override o mismo tenant → modo single sin cambios
    if (!requested || requested === sessionTenant) {
      req.crossTenant = {
        isCrossTenant: false,
        sessionTenant,
        requestedTenant: sessionTenant,
        mode: 'single'
      };
      return next();
    }

    // A partir de acá hay override: validar permisos generales
    const userRole = req.cookies.rolUsuario;
    if (!isMainSupport(sessionTenant)) {
      return res.status(403).json({
        success: false,
        error: 'El tenant actual no tiene habilitado el soporte cross-tenant.'
      });
    }
    if (!esRolCrossTenant(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Tu rol no permite consultar tickets de otros tenants.'
      });
    }

    // Modo "all" → no cambiamos req.db, los handlers que lo soportan se encargan
    if (requested === 'all') {
      req.crossTenant = {
        isCrossTenant: true,
        sessionTenant,
        requestedTenant: 'all',
        mode: 'all'
      };
      return next();
    }

    // Modo single contra otro tenant: validar registry y obtener conexión
    const target = findTenant(requested);
    if (!target) {
      return res.status(404).json({
        success: false,
        error: `Tenant "${requested}" no existe en el registry.`
      });
    }

    const idUsuario = req.cookies.idUsuario;
    let targetSequelize;
    try {
      targetSequelize = await conexionDB(requested, idUsuario);
    } catch (connErr) {
      // PostgreSQL 3D000 = "database does not exist". También puede llegar como
      // SequelizeConnectionError envolviendo otros errores.
      const pgCode = connErr?.parent?.code || connErr?.original?.code;
      const dbInexistente = pgCode === '3D000' ||
        /database\s+".+"\s+does not exist/i.test(connErr?.message || '');

      console.warn(
        `[resolveCrossTenant] Tenant "${requested}" no disponible: ${connErr.message || connErr}`
      );

      if (dbInexistente) {
        return res.status(503).json({
          success: false,
          error: `El tenant "${requested}" no está disponible: la base de datos no existe en este servidor.`,
          code: 'TENANT_DB_NOT_FOUND',
          tenant: requested
        });
      }
      return res.status(503).json({
        success: false,
        error: `El tenant "${requested}" no está disponible: ${connErr.message || 'error de conexión'}`,
        code: 'TENANT_UNAVAILABLE',
        tenant: requested
      });
    }

    req.db = { sequelize: targetSequelize, tenant: requested };
    req.crossTenant = {
      isCrossTenant: true,
      sessionTenant,
      requestedTenant: requested,
      mode: 'single'
    };
    return next();
  } catch (error) {
    console.error('[resolveCrossTenant] Error inesperado:', error);
    return res.status(500).json({
      success: false,
      error: 'Error resolviendo tenant cross-tenant'
    });
  }
};

/**
 * Bloquea endpoints de escritura cuando la request es cross-tenant.
 * Aplicar DESPUÉS de resolveCrossTenant en rutas POST/PATCH/PUT/DELETE.
 */
const enforceCrossTenantReadOnly = (req, res, next) => {
  if (req.crossTenant?.isCrossTenant) {
    return res.status(403).json({
      success: false,
      error: 'Acción no permitida: la vista cross-tenant es de solo lectura.'
    });
  }
  next();
};

/**
 * Solo permite continuar si la sesión está en un tenant marcado como main support
 * y el rol del usuario es agente o admin. Pensado para endpoints exclusivos del modo
 * cross-tenant (ej. GET /tenants-disponibles, GET /dashboard-cross-tenant).
 */
const requireMainSupport = (req, res, next) => {
  const sessionTenant = req.db?.tenant;
  const userRole = req.cookies.rolUsuario;
  if (!sessionTenant || !isMainSupport(sessionTenant)) {
    return res.status(403).json({
      success: false,
      error: 'Endpoint disponible solo desde el tenant principal de soporte.'
    });
  }
  if (!esRolCrossTenant(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Tu rol no tiene acceso a esta funcionalidad.'
    });
  }
  next();
};

module.exports = {
  resolveCrossTenant,
  enforceCrossTenantReadOnly,
  requireMainSupport,
  esRolCrossTenant
};
