/**
 * Servicio dedicado exclusivamente a la gestión de la tabla SequelizeMeta
 * Se ejecuta automáticamente cuando un tenant se conecta
 * NO es parte del sistema de migraciones - es un flujo independiente
 */

class SequelizeMetaService {
  constructor(sequelize, tenant) {
    this.sequelize = sequelize;
    this.tenant = tenant;
  }

  /**
   * Verifica y actualiza automáticamente la tabla SequelizeMeta
   * Se ejecuta cada vez que un tenant se conecta
   */
  async ensureSequelizeMetaUpToDate() {
    try {
      console.log(`🔍 [${this.tenant}] Verificando estado de SequelizeMeta...`);
      
      // Verificar si la tabla existe
      const tableExists = await this.checkTableExists();
      
      if (!tableExists) {
        console.log(`📋 [${this.tenant}] Tabla SequelizeMeta no existe - creando versión extendida...`);
        await this.createExtendedSequelizeMeta();
        return true;
      }
      
      // Verificar si necesita actualización
      const needsUpgrade = await this.checkNeedsUpgrade();
      
      if (needsUpgrade) {
        console.log(`🔧 [${this.tenant}] SequelizeMeta necesita actualización - aplicando...`);
        await this.upgradeSequelizeMeta();
        return true;
      }
      
      console.log(`✅ [${this.tenant}] SequelizeMeta está actualizada`);
      return false; // No se realizaron cambios
      
    } catch (error) {
      console.error(`❌ [${this.tenant}] Error verificando SequelizeMeta:`, error.message);
      // NO lanzar error - solo loguear para no interrumpir el flujo principal
      return false;
    }
  }

  /**
   * Verifica si la tabla SequelizeMeta existe
   */
  async checkTableExists() {
    try {
      const [result] = await this.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'SequelizeMeta'
        );
      `);
      return result[0].exists;
    } catch (error) {
      console.warn(`⚠️ [${this.tenant}] Error verificando existencia de tabla:`, error.message);
      return false;
    }
  }

  /**
   * Verifica si SequelizeMeta necesita actualización
   */
  async checkNeedsUpgrade() {
    try {
      const [columns] = await this.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'SequelizeMeta' 
        AND table_schema = 'public'
      `);
      
      const existingColumns = columns.map(row => row.column_name);
      const requiredColumns = ['name', 'appliedAt', 'executionTime', 'sqlCommands', 'type'];
      
      // Verificar si faltan columnas requeridas
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`📋 [${this.tenant}] Columnas faltantes: ${missingColumns.join(', ')}`);
        return true;
      }
      
      // Verificar si la columna 'type' tiene la constraint correcta
      try {
        const [constraints] = await this.sequelize.query(`
          SELECT constraint_name, check_clause
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%SequelizeMeta%'
        `);
        
        const hasTypeConstraint = constraints.some(c => 
          c.check_clause && c.check_clause.includes("type IN ('M', 'S')")
        );
        
        if (!hasTypeConstraint) {
          console.log(`📋 [${this.tenant}] Falta constraint de tipo en columna 'type'`);
          return true;
        }
      } catch (constraintError) {
        // Si no se puede verificar constraints, asumir que necesita upgrade
        console.log(`📋 [${this.tenant}] No se pudo verificar constraints - asumiendo upgrade necesario`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn(`⚠️ [${this.tenant}] Error verificando estructura:`, error.message);
      return true; // En caso de error, asumir que necesita upgrade
    }
  }

  /**
   * Crea la tabla SequelizeMeta con estructura extendida
   */
  async createExtendedSequelizeMeta() {
    try {
      await this.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
          name VARCHAR(255) PRIMARY KEY,
          "appliedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "executionTime" INTEGER DEFAULT 0,
          "sqlCommands" TEXT DEFAULT '[]',
          "type" VARCHAR(1) DEFAULT 'M' CHECK ("type" IN ('M', 'S'))
        )
      `);
      
      console.log(`✅ [${this.tenant}] Tabla SequelizeMeta extendida creada exitosamente`);
      
      // Crear índice para mejorar performance
      await this.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_sequelizemeta_appliedat" 
        ON "SequelizeMeta" ("appliedAt")
      `);
      
      console.log(`✅ [${this.tenant}] Índices de SequelizeMeta creados`);
      
    } catch (error) {
      console.error(`❌ [${this.tenant}] Error creando SequelizeMeta:`, error.message);
      throw error;
    }
  }

  /**
   * Actualiza SequelizeMeta existente a estructura extendida
   */
  async upgradeSequelizeMeta() {
    try {
      const [columns] = await this.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'SequelizeMeta' 
        AND table_schema = 'public'
      `);
      
      const existingColumns = columns.map(row => row.column_name);
      let upgrades = 0;
      
      // Agregar columna appliedAt si no existe
      if (!existingColumns.includes('appliedAt')) {
        await this.sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "appliedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);
        console.log(`✅ [${this.tenant}] Columna 'appliedAt' agregada`);
        upgrades++;
      }
      
      // Agregar columna executionTime si no existe
      if (!existingColumns.includes('executionTime')) {
        await this.sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "executionTime" INTEGER DEFAULT 0
        `);
        console.log(`✅ [${this.tenant}] Columna 'executionTime' agregada`);
        upgrades++;
      }
      
      // Agregar columna sqlCommands si no existe
      if (!existingColumns.includes('sqlCommands')) {
        await this.sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "sqlCommands" TEXT DEFAULT '[]'
        `);
        console.log(`✅ [${this.tenant}] Columna 'sqlCommands' agregada`);
        upgrades++;
      }
      
      // Agregar columna type si no existe
      if (!existingColumns.includes('type')) {
        await this.sequelize.query(`
          ALTER TABLE "SequelizeMeta" 
          ADD COLUMN "type" VARCHAR(1) DEFAULT 'M'
        `);
        console.log(`✅ [${this.tenant}] Columna 'type' agregada`);
        upgrades++;
        
        // Agregar constraint CHECK
        try {
          await this.sequelize.query(`
            ALTER TABLE "SequelizeMeta" 
            ADD CONSTRAINT "chk_sequelizemeta_type" 
            CHECK ("type" IN ('M', 'S'))
          `);
          console.log(`✅ [${this.tenant}] Constraint CHECK agregado`);
        } catch (constraintError) {
          console.warn(`⚠️ [${this.tenant}] No se pudo agregar constraint CHECK:`, constraintError.message);
        }
      }
      
      // Actualizar registros existentes con valores por defecto
      if (upgrades > 0) {
        await this.sequelize.query(`
          UPDATE "SequelizeMeta"
          SET
            "appliedAt" = COALESCE("appliedAt", CURRENT_TIMESTAMP),
            "executionTime" = COALESCE("executionTime", 0),
            "sqlCommands" = COALESCE("sqlCommands", '[]'),
            "type" = COALESCE("type", 'M')
          WHERE "appliedAt" IS NULL 
             OR "executionTime" IS NULL 
             OR "sqlCommands" IS NULL 
             OR "type" IS NULL
        `);
        
        console.log(`✅ [${this.tenant}] Registros existentes actualizados con valores por defecto`);
      }
      
      // Crear índices si no existen
      try {
        await this.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "idx_sequelizemeta_appliedat" 
          ON "SequelizeMeta" ("appliedAt")
        `);
        console.log(`✅ [${this.tenant}] Índices verificados/creados`);
      } catch (indexError) {
        console.warn(`⚠️ [${this.tenant}] No se pudo crear índice:`, indexError.message);
      }
      
      console.log(`✅ [${this.tenant}] SequelizeMeta actualizada exitosamente (${upgrades} upgrades aplicados)`);
      
    } catch (error) {
      console.error(`❌ [${this.tenant}] Error actualizando SequelizeMeta:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene información del estado actual de SequelizeMeta
   */
  async getSequelizeMetaStatus() {
    try {
      const tableExists = await this.checkTableExists();
      
      if (!tableExists) {
        return {
          status: 'MISSING',
          message: 'Tabla SequelizeMeta no existe',
          needsAction: true
        };
      }
      
      const needsUpgrade = await this.checkNeedsUpgrade();
      
      if (needsUpgrade) {
        return {
          status: 'OUTDATED',
          message: 'SequelizeMeta necesita actualización',
          needsAction: true
        };
      }
      
      return {
        status: 'UP_TO_DATE',
        message: 'SequelizeMeta está actualizada',
        needsAction: false
      };
      
    } catch (error) {
      return {
        status: 'ERROR',
        message: `Error verificando estado: ${error.message}`,
        needsAction: true
      };
    }
  }
}

module.exports = { SequelizeMetaService };
