const { Umzug, SequelizeStorage } = require('umzug');
const path = require('path');

// Storage simplificado que usa solo el comportamiento estándar de Sequelize
class ExtendedSequelizeStorage extends SequelizeStorage {
  constructor(options) {
    super(options);
  }

  async logMigration(migrationName) {
    console.log(`📝 Registrando migración: ${migrationName}`);
    
    try {
      await super.logMigration(migrationName);
      console.log(`✅ Migración ${migrationName} registrada exitosamente`);
    } catch (error) {
      console.warn(`⚠️ Error registrando migración ${migrationName}:`, error.message);
      throw error;
    }
  }
}

/**
 * Crea un ejecutor de migraciones para un tenant específico
 */
function createMigrationRunner(sequelize, tenantName) {
  const umzug = new Umzug({
    migrations: {
      glob: path.join(__dirname, '../migrations/*.js'),
      resolve: ({ name, path: migrationPath }) => {
        const migration = require(migrationPath);
        return {
          name,
          up: async () => {
            console.log(`🔄 [${tenantName}] Aplicando: ${name}`);
            const startTime = Date.now();
            
            try {
              await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
              const duration = Date.now() - startTime;
              
              console.log(`✅ [${tenantName}] Completada: ${name} (${duration}ms)`);
            } catch (error) {
              console.error(`❌ [${tenantName}] Error en: ${name}`);
              console.error(`   💥 ${error.message || error}`);
              if (error.sql) {
                console.error(`   📝 SQL: ${error.sql}`);
              }
              throw error;
            }
          },
          down: async () => {
            console.log(`🔄 [${tenantName}] Revirtiendo: ${name}`);
            try {
              await migration.down(sequelize.getQueryInterface(), sequelize.constructor);
              console.log(`✅ [${tenantName}] Revertida: ${name}`);
            } catch (error) {
              console.error(`❌ [${tenantName}] Error revirtiendo: ${name}`);
              console.error(`   💥 ${error.message || error}`);
              if (error.sql) {
                console.error(`   📝 SQL: ${error.sql}`);
              }
              throw error;
            }
          }
        };
      }
    },
    context: sequelize.getQueryInterface(),
    storage: new ExtendedSequelizeStorage({ 
      sequelize,
      tableName: 'SequelizeMeta'
    }),
    logger: {
      info: (message) => console.log(`🔄 [${tenantName}] ${message}`),
      warn: (message) => console.warn(`⚠️  [${tenantName}] ${message}`),
      error: (message) => console.error(`❌ [${tenantName}] ${message}`)
    }
  });

  return umzug;
}

/**
 * Ejecuta migraciones pendientes para un tenant
 */
async function runMigrationsForTenant(sequelize, tenantName) {
  try {
    console.log(`🚀 Iniciando migraciones para tenant: ${tenantName}`);
    
    const umzug = createMigrationRunner(sequelize, tenantName);
    
    // Obtener migraciones pendientes
    const pendingMigrations = await umzug.pending();
    
    if (pendingMigrations.length === 0) {
      console.log(`✅ No hay migraciones pendientes para ${tenantName}`);
      return { applied: 0, migrations: [] };
    }

    console.log(`📋 Migraciones pendientes para ${tenantName}:`, 
      pendingMigrations.map(m => m.name)
    );

    // Ejecutar migraciones
    const executed = await umzug.up();
    
    console.log(`✅ Aplicadas ${executed.length} migraciones para ${tenantName}`);
    
    return {
      applied: executed.length,
      migrations: executed.map(m => m.name)
    };

  } catch (error) {
    console.error(`❌ Error ejecutando migraciones para ${tenantName}:`);
    console.error(`   💥 ${error.message || error}`);
    if (error.sql) {
      console.error(`   📝 SQL: ${error.sql}`);
    }
    throw error;
  }
}

/**
 * Verifica el estado de migraciones para un tenant
 */
async function getMigrationStatus(sequelize, tenantName) {
  try {
    const umzug = createMigrationRunner(sequelize, tenantName);
    
    const [executed, pending] = await Promise.all([
      umzug.executed(),
      umzug.pending()
    ]);

    return {
      tenant: tenantName,
      executed: executed.map(m => m.name),
      pending: pending.map(m => m.name),
      isUpToDate: pending.length === 0
    };
    
  } catch (error) {
    console.error(`❌ Error verificando estado de migraciones para ${tenantName}:`);
    console.error(`   💥 ${error.message || error}`);
    throw error;
  }
}

/**
 * Revierte la última migración aplicada
 */
async function rollbackLastMigration(sequelize, tenantName) {
  try {
    console.log(`🔄 Revirtiendo última migración para tenant: ${tenantName}`);
    
    const umzug = createMigrationRunner(sequelize, tenantName);
    
    // Obtener migraciones ejecutadas
    const executedMigrations = await umzug.executed();
    
    if (executedMigrations.length === 0) {
      console.log(`✅ No hay migraciones para revertir en ${tenantName}`);
      return { reverted: 0, migration: null };
    }

    // Revertir la última migración
    const reverted = await umzug.down();
    
    console.log(`✅ Revertida migración para ${tenantName}:`, reverted.map(m => m.name));
    
    return {
      reverted: reverted.length,
      migration: reverted[0]?.name || null
    };

  } catch (error) {
    console.error(`❌ Error revirtiendo migración para ${tenantName}:`);
    console.error(`   💥 ${error.message || error}`);
    throw error;
  }
}

/**
 * Obtiene el historial básico de migraciones aplicadas
 */
async function getMigrationHistory(sequelize, tenantName) {
  try {
    const umzug = createMigrationRunner(sequelize, tenantName);
    const executed = await umzug.executed();
    
    return executed.map(migration => ({
      name: migration.name,
      tenant: tenantName,
      appliedAt: null, // No disponible en versión simplificada
      status: 'applied'
    }));
    
  } catch (error) {
    console.error(`❌ Error obteniendo historial para ${tenantName}:`);
    console.error(`   💥 ${error.message || error}`);
    return [];
  }
}

module.exports = {
  createMigrationRunner,
  runMigrationsForTenant,
  getMigrationStatus,
  rollbackLastMigration,
  getMigrationHistory,
  ExtendedSequelizeStorage
};