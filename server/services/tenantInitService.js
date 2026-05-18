/**
 * Wrapper sobre erp-init/config/db.js para inicializar un tenant nuevo.
 *
 * Se asume que la BD ya fue creada (vacia) por tenantDbService.createTenantDatabase.
 * Este servicio se conecta a esa BD, corre sequelize.sync() para crear tablas,
 * dispara los validators (parametros globales, menus, datos requeridos),
 * y cierra la conexion.
 *
 * Es one-shot: NO mantiene pool ni cache. Cada llamada crea y cierra su propia
 * conexion. Aceptable porque solo se ejecuta una vez por tenant.
 */

const { conexionDB } = require("../erp-init/config/db");

async function initializeTenantSchema(tenant) {
  if (!tenant || typeof tenant !== "string") {
    throw new Error("initializeTenantSchema requiere un nombre de tenant valido");
  }

  const startedAt = Date.now();
  let sequelize = null;
  try {
    sequelize = await conexionDB(tenant, "onboarding-init");
    const elapsedMs = Date.now() - startedAt;
    console.log(`[tenantInitService] Tenant "${tenant}" inicializado en ${elapsedMs}ms`);
    return { tenant, initialized: true, elapsedMs };
  } finally {
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeErr) {
        console.warn(`[tenantInitService] No se pudo cerrar la conexion: ${closeErr.message}`);
      }
    }
  }
}

module.exports = { initializeTenantSchema };
