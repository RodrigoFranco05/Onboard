/**
 * Conexion a la base de datos de un tenant para inicializacion.
 *
 * Reemplaza al config/db.js del ERP. La logica original (pool de conexiones,
 * cache hasSynced) no tiene sentido aca: este modulo se usa una sola vez
 * por tenant durante la inicializacion. Una conexion limpia, sync, validators
 * y se devuelve.
 *
 * Credenciales: lee de PG_ADMIN_HOST / PG_ADMIN_PORT / PG_ADMIN_USER / PG_ADMIN_PASSWORD.
 * Base destino: el `tenant` recibido (debe existir previamente — la creacion
 * la hace services/tenantDbService.createTenantDatabase).
 */

const { Sequelize } = require('sequelize');

const { registerAllModelsForMigrations } = require('../models/modelRegistryForMigrations');

function buildSequelizeForTenant(tenant) {
  const host = process.env.PG_ADMIN_HOST;
  const port = process.env.PG_ADMIN_PORT;
  const user = process.env.PG_ADMIN_USER;
  const password = process.env.PG_ADMIN_PASSWORD;

  if (!host || !port || !user || password === undefined) {
    throw new Error(
      'Faltan variables de entorno PG_ADMIN_HOST / PG_ADMIN_PORT / PG_ADMIN_USER / PG_ADMIN_PASSWORD.'
    );
  }

  return new Sequelize(tenant, user, password, {
    host,
    port: Number(port),
    dialect: 'postgres',
    logging: process.env.ERP_INIT_DB_LOGGING === 'true' ? console.log : false,
    define: { timestamps: true },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    retry: { max: 3 }
  });
}

/**
 * Conecta al tenant, registra modelos, sincroniza y corre los validators
 * de parametros globales / menus / datos requeridos.
 *
 * Devuelve la instancia de sequelize ya conectada (responsabilidad del caller cerrarla).
 */
async function conexionDB(tenant, _usuario) {
  if (!tenant || typeof tenant !== 'string' || tenant.trim().length === 0) {
    throw new Error('Tenant invalido o ausente al solicitar conexion a la base de datos.');
  }

  const sequelize = buildSequelizeForTenant(tenant);

  await sequelize.authenticate();
  console.log(`[erp-init] Conexion a tenant "${tenant}" establecida.`);

  registerAllModelsForMigrations(sequelize);

  await sequelize.sync({ alter: false });
  console.log(`[erp-init] sync() completado para tenant "${tenant}".`);

  const { validarYCrearParametrosGlobales } = require('../services/parametrosGlobalesValidator');
  await validarYCrearParametrosGlobales(sequelize, tenant);

  const { validarYCrearMenusAcceso } = require('../services/menuAccesoValidator');
  await validarYCrearMenusAcceso(sequelize, tenant);

  const { validarYActualizarDatosRequeridos } = require('../services/defaultDataValidator');
  await validarYActualizarDatosRequeridos(sequelize, tenant);

  return sequelize;
}

module.exports = { conexionDB };
