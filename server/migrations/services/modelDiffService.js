const fs = require('fs');
const path = require('path');
const {
  MODEL_REGISTRY_FOR_MIGRATIONS,
  registerAllModelsForMigrations,
} = require('../../models/modelRegistryForMigrations');

/**
 * Servicio para detectar diferencias entre modelos y base de datos
 * Similar a Django's makemigrations
 * 
 * ✅ MEJORA IMPLEMENTADA: Todas las migraciones generadas incluyen el campo 'type' 
 * en changeColumn para evitar errores de Sequelize en PostgreSQL
 */
class ModelDiffService {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.modelsPath = path.join(__dirname, '../../models');
    this.registryPath = path.join(__dirname, '../../models/modelRegistryForMigrations.js');
    console.log(`🔍 Registro de modelos para migraciones: ${this.registryPath}`);
    console.log(`🔍 Fallback de modelos por carpeta: ${this.modelsPath}`);
  }

  /**
   * Obtiene la estructura actual de la base de datos
   */
  async getCurrentDatabaseSchema() {
    const queryInterface = this.sequelize.getQueryInterface();
    const tables = {};

    try {
      // Obtener todas las tablas
      const tableNames = await queryInterface.showAllTables();
      
      for (const tableName of tableNames) {
        if (tableName === 'SequelizeMeta') continue; // Ignorar tabla de migraciones
        
        // Obtener estructura de cada tabla
        const columns = await queryInterface.describeTable(tableName);
        const indexes = await this.getTableIndexes(tableName);
        
        tables[tableName] = {
          columns: columns,
          indexes: indexes
        };
      }
      
      return tables;
    } catch (error) {
      console.error('❌ Error obteniendo esquema de BD:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene los índices de una tabla
   */
  async getTableIndexes(tableName) {
    try {
      const indexes = await this.sequelize.query(
        `SELECT 
          i.relname AS name,
          ix.indisprimary AS primary,
          ix.indisunique AS unique,
          array_agg(a.attname) AS column_names
        FROM pg_class t, pg_class i, pg_index ix, pg_attribute a 
        WHERE t.oid = ix.indrelid 
          AND i.oid = ix.indexrelid 
          AND a.attrelid = t.oid 
          AND t.relkind = 'r' 
          AND t.relname = $1
          AND a.attnum = ANY(ix.indkey)
        GROUP BY i.relname, ix.indexrelid, ix.indisprimary, ix.indisunique 
        ORDER BY i.relname;`,
        {
          bind: [tableName],
          type: this.sequelize.QueryTypes.SELECT
        }
      );
      
      return indexes;
    } catch (error) {
      console.warn(`⚠️ Error obteniendo índices para ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Obtiene la estructura de los modelos desde el código
   */
  async getModelSchema() {
    const models = {};
    
    try {
      console.log(`📂 Analizando modelos desde registro centralizado`);
      console.log(
        `📋 Entradas registradas: ${MODEL_REGISTRY_FOR_MIGRATIONS.map(entry => entry.key).join(', ')}`
      );

      for (const entry of MODEL_REGISTRY_FOR_MIGRATIONS) {
        console.log(`🔍 Registrando: ${entry.key} (${entry.source})`);
      }

      const registeredModels = registerAllModelsForMigrations(this.sequelize);
      this.extractModelsFromFactory(registeredModels, models);
      
      console.log(`✅ Modelos procesados: ${Object.keys(models).join(', ')}`);
      return models;
    } catch (error) {
      console.warn(`⚠️ Error usando registro centralizado de modelos: ${error.message}`);
      console.warn(`⚠️ Activando fallback de escaneo por carpeta`);
      return this.getModelSchemaFromDirectory(models);
    }
  }

  async getModelSchemaFromDirectory(models = {}) {
    try {
      console.log(`📂 Analizando modelos en fallback: ${this.modelsPath}`);
      
      const modelFiles = fs.readdirSync(this.modelsPath)
        .filter(file => file.endsWith('.js') && 
                       !file.includes('index.js') && 
                       !file.includes('.zip') && 
                       !file.includes('NOTAS') &&
                       file !== 'modelRegistryForMigrations.js');
      
      console.log(`📋 Archivos de modelo encontrados: ${modelFiles.join(', ')}`);
      
      for (const file of modelFiles) {
        const modelPath = path.join(this.modelsPath, file);
        console.log(`🔍 Analizando fallback: ${file}`);
        
        try {
          delete require.cache[require.resolve(modelPath)];
          const modelModule = require(modelPath);
          
          if (typeof modelModule === 'object' && modelModule.itemModelInit) {
            const modelsFromFactory = modelModule.itemModelInit(this.sequelize);
            this.extractModelsFromFactory(modelsFromFactory, models);
          } else if (typeof modelModule === 'object' && modelModule.adminModelInit) {
            const modelsFromFactory = modelModule.adminModelInit(this.sequelize);
            this.extractModelsFromFactory(modelsFromFactory, models);
          } else if (typeof modelModule === 'object' && modelModule.transaccionModelInit) {
            const modelsFromFactory = modelModule.transaccionModelInit(this.sequelize);
            this.extractModelsFromFactory(modelsFromFactory, models);
          } else if (typeof modelModule === 'object' && modelModule.soporteModelInit) {
            const modelsFromFactory = modelModule.soporteModelInit(this.sequelize);
            this.extractModelsFromFactory(modelsFromFactory, models);
          } else if (typeof modelModule === 'function') {
            const modelsFromFactory = modelModule(this.sequelize);
            this.extractModelsFromFactory(modelsFromFactory, models);
          } else {
            console.log(`⚠️ No se pudo procesar ${file} - estructura no reconocida`);
          }
        } catch (fileError) {
          console.warn(`⚠️ Error procesando ${file}:`, fileError.message);
        }
      }
      
      console.log(`✅ Modelos procesados por fallback: ${Object.keys(models).join(', ')}`);
      return models;
    } catch (error) {
      console.error('❌ Error analizando modelos:', error.message);
      throw error;
    }
  }

  /**
   * Extrae modelos de un objeto de factory
   */
  extractModelsFromFactory(factoryResult, models) {
    if (!factoryResult) return;
    
    // Si factoryResult es un solo modelo
    if (factoryResult.rawAttributes) {
      const tableName = factoryResult.tableName || factoryResult.getTableName();
      models[tableName] = {
        columns: this.processModelAttributes(factoryResult.rawAttributes),
        indexes: this.processModelIndexes(factoryResult.options?.indexes || [])
      };
      return;
    }
    
    // Si factoryResult es un objeto con múltiples modelos
    for (const [key, model] of Object.entries(factoryResult)) {
      if (model && model.rawAttributes) {
        const tableName = model.tableName || model.getTableName();
        models[tableName] = {
          columns: this.processModelAttributes(model.rawAttributes),
          indexes: this.processModelIndexes(model.options?.indexes || [])
        };
      }
    }
  }

  /**
   * Procesa los atributos del modelo a formato comparable
   */
  processModelAttributes(rawAttributes) {
    const processed = {};
    
    for (const [fieldName, field] of Object.entries(rawAttributes)) {
      processed[fieldName] = {
        type: this.normalizeDataType(field.type),
        allowNull: field.allowNull !== false,
        defaultValue: field.defaultValue,
        primaryKey: field.primaryKey || false,
        autoIncrement: field.autoIncrement || false,
        unique: field.unique || false,
        references: field.references || null  // ✅ Incluir referencias de foreign keys
      };
    }
    
    return processed;
  }

  /**
   * Normaliza los tipos de datos para comparación
   */
  normalizeDataType(type) {
    if (!type) return 'UNKNOWN';
    
    const typeString = type.toString().toUpperCase();
    
    // Mapear tipos comunes - orden específico para evitar conflictos
    if (typeString.includes('STRING')) return 'VARCHAR';
    if (typeString.includes('VARCHAR')) return 'VARCHAR';
    if (typeString.includes('CHARACTER VARYING')) return 'VARCHAR';
    if (typeString.includes('CHAR')) return 'CHAR';
    if (typeString.includes('TIME WITHOUT TIME ZONE')) return 'TIME';
    if (typeString === 'TIME') return 'TIME';
    if (typeString.includes('INTEGER') || typeString.includes('INT')) return 'INTEGER';
    if (typeString.includes('BOOLEAN') || typeString.includes('BOOL')) return 'BOOLEAN';
    if (typeString.includes('TEXT')) return 'TEXT';
    if (typeString.includes('DATE')) return 'TIMESTAMP';
    if (typeString.includes('FLOAT')) return 'DOUBLE'; // Mapear FLOAT a DOUBLE para compatibilidad
    if (typeString.includes('DOUBLE PRECISION') || typeString.includes('FLOAT8')) return 'DOUBLE';
    if (typeString.includes('REAL') || typeString.includes('FLOAT4')) return 'REAL';
    if (typeString.includes('BIGINT')) return 'BIGINT';
    if (typeString.includes('SMALLINT')) return 'SMALLINT';
    if (typeString.includes('DECIMAL') || typeString.includes('NUMERIC')) return 'DECIMAL';
    if (typeString.includes('JSON')) return 'JSON';
    
    return typeString;
  }

  /**
   * Procesa los índices del modelo
   */
  processModelIndexes(indexes) {
    return indexes.map(index => ({
      name: index.name,
      fields: index.fields || index.columns,
      unique: index.unique || false
    }));
  }

  /**
   * Compara esquemas y detecta diferencias
   */
  async detectChanges() {
    console.log('🔍 Analizando diferencias entre modelos y base de datos...');
    
    const [dbSchema, modelSchema] = await Promise.all([
      this.getCurrentDatabaseSchema(),
      this.getModelSchema()
    ]);
    
    const changes = [];
    
    // Detectar tablas nuevas
    for (const tableName of Object.keys(modelSchema)) {
      if (!dbSchema[tableName]) {
        changes.push({
          type: 'CREATE_TABLE',
          table: tableName,
          definition: modelSchema[tableName]
        });
      }
    }
    
    // Detectar tablas eliminadas
    for (const tableName of Object.keys(dbSchema)) {
      if (!modelSchema[tableName]) {
        changes.push({
          type: 'DROP_TABLE',
          table: tableName
        });
      }
    }
    
    // Detectar cambios en tablas existentes
    for (const tableName of Object.keys(modelSchema)) {
      if (dbSchema[tableName]) {
        const tableChanges = this.compareTableStructure(
          tableName,
          dbSchema[tableName],
          modelSchema[tableName]
        );
        changes.push(...tableChanges);
      }
    }
    
    return changes;
  }

  /**
   * Compara la estructura de una tabla específica
   */
  compareTableStructure(tableName, dbTable, modelTable) {
    const changes = [];
    const dbColumns = dbTable.columns;
    const modelColumns = modelTable.columns;
    
    // Detectar columnas nuevas
    for (const columnName of Object.keys(modelColumns)) {
      if (!dbColumns[columnName]) {
        changes.push({
          type: 'ADD_COLUMN',
          table: tableName,
          column: columnName,
          definition: modelColumns[columnName]
        });
      }
    }
    
    // Detectar columnas eliminadas
    for (const columnName of Object.keys(dbColumns)) {
      if (!modelColumns[columnName]) {
        changes.push({
          type: 'REMOVE_COLUMN',
          table: tableName,
          column: columnName
        });
      }
    }
    
    // Detectar cambios en columnas existentes
    for (const columnName of Object.keys(modelColumns)) {
      if (dbColumns[columnName]) {
        const columnChanges = this.compareColumnDefinition(
          tableName,
          columnName,
          dbColumns[columnName],
          modelColumns[columnName]
        );
        changes.push(...columnChanges);
      }
    }
    
    return changes;
  }

  /**
   * Compara la definición de una columna específica
   */
  compareColumnDefinition(tableName, columnName, dbColumn, modelColumn) {
    const changes = [];
    
    // Verificar si la columna es clave primaria
    const isPrimaryKey = dbColumn.primaryKey || false;
    
    // Verificar si la columna tiene restricciones NOT NULL
    const hasNotNullConstraint = dbColumn.allowNull === false;
    
    // En PostgreSQL, solo cambiar tipos si es seguro
    if (this.normalizeDataType(dbColumn.type) !== modelColumn.type) {
      // Para claves primarias, solo cambiar tipos si es compatible
      if (isPrimaryKey) {
        if (this.isTypeChangeSafeForPrimaryKey(dbColumn.type, modelColumn.type)) {
          changes.push({
            type: 'CHANGE_COLUMN_TYPE',
            table: tableName,
            column: columnName,
            from: dbColumn.type,
            to: modelColumn.type,
            isPrimaryKey: true,
            safe: true
          });
        } else {
          console.log(`⚠️ Cambio de tipo no seguro para clave primaria ${tableName}.${columnName}: ${dbColumn.type} → ${modelColumn.type}`);
        }
      } else {
        // Para columnas normales, cambiar tipo
        changes.push({
          type: 'CHANGE_COLUMN_TYPE',
          table: tableName,
          column: columnName,
          from: dbColumn.type,
          to: modelColumn.type,
          isPrimaryKey: false,
          safe: true
        });
      }
    }
    
    // Solo cambiar nullabilidad si NO es clave primaria y NO tiene restricciones NOT NULL
    if (!isPrimaryKey && !hasNotNullConstraint && dbColumn.allowNull !== modelColumn.allowNull) {
      changes.push({
        type: 'CHANGE_COLUMN_NULL',
        table: tableName,
        column: columnName,
        allowNull: modelColumn.allowNull,
        modelType: modelColumn.type,  // ✅ Usar tipo del modelo (destino final)
        currentType: dbColumn.type,   // Tipo actual en BD (para referencia)
        safe: true
      });
    } else if (isPrimaryKey && dbColumn.allowNull !== modelColumn.allowNull) {
      console.log(`⚠️ No se puede cambiar nullabilidad de clave primaria ${tableName}.${columnName}`);
    } else if (hasNotNullConstraint && dbColumn.allowNull !== modelColumn.allowNull) {
      console.log(`⚠️ No se puede cambiar nullabilidad de columna con restricción NOT NULL ${tableName}.${columnName}`);
    }
    
    return changes;
  }

  /**
   * Verifica si un cambio de tipo es seguro para claves primarias
   */
  isTypeChangeSafeForPrimaryKey(fromType, toType) {
    const from = fromType.toUpperCase();
    const to = toType.toUpperCase();
    
    // Cambios seguros para claves primarias
    const safeChanges = [
      // VARCHAR con diferentes longitudes
      { from: 'VARCHAR', to: 'VARCHAR' },
      { from: 'CHARACTER VARYING', to: 'VARCHAR' },
      { from: 'CHAR', to: 'CHAR' },
      { from: 'CHARACTER', to: 'CHAR' },
      
      // Tipos numéricos compatibles
      { from: 'INTEGER', to: 'BIGINT' },
      { from: 'INT', to: 'BIGINT' },
      { from: 'SMALLINT', to: 'INTEGER' },
      { from: 'SMALLINT', to: 'BIGINT' },
      
      // Tipos de texto compatibles
      { from: 'TEXT', to: 'VARCHAR' },
      { from: 'VARCHAR', to: 'TEXT' }
    ];
    
    return safeChanges.some(change => 
      from.includes(change.from) && to.includes(change.to)
    );
  }

  /**
   * Genera el contenido de la migración basado en los cambios detectados
   */
  generateMigrationContent(changes) {
    if (changes.length === 0) {
      return null; // No hay cambios
    }
    
    const upCommands = [];
    const downCommands = [];
    
    for (const change of changes) {
      const { up, down } = this.generateMigrationCommand(change);
      if (up) upCommands.push(up);
      if (down) downCommands.push(down);
    }
    
    return `'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Aplicando cambios detectados automáticamente...');
    
${upCommands.map(cmd => `    ${cmd}`).join('\n\n')}
    
    console.log('✅ Cambios aplicados exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo cambios...');
    
${downCommands.reverse().map(cmd => `    ${cmd}`).join('\n\n')}
    
    console.log('✅ Cambios revertidos exitosamente');
  }
};`;
  }

  /**
   * Mapea tipos de PostgreSQL a tipos válidos de Sequelize
   */
  mapPostgresTypeToSequelize(postgresType) {
    if (!postgresType) {
      console.warn('⚠️ mapPostgresTypeToSequelize: postgresType es undefined/null, usando STRING por defecto');
      return 'STRING';
    }
    
    const type = postgresType.toUpperCase();
    console.log(`🔍 Mapeando tipo PostgreSQL: "${postgresType}" → "${type}"`);
    
    // Tipos numéricos
    // PostgreSQL puede devolver "DOUBLE PRECISION", "DOUBLE", o "FLOAT8" para float8
    if (type.includes('DOUBLE PRECISION') || type.includes('FLOAT8') || type === 'DOUBLE') return 'DOUBLE';
    if (type.includes('REAL') || type.includes('FLOAT4')) return 'REAL';
    if (type.includes('BIGINT')) return 'BIGINT';
    if (type.includes('INTEGER') || type.includes('INT')) return 'INTEGER';
    if (type.includes('SMALLINT')) return 'SMALLINT';
    if (type.includes('DECIMAL') || type.includes('NUMERIC')) return 'DECIMAL';
    
    // Tipos de texto
    if (type.includes('CHARACTER VARYING') || type.includes('VARCHAR')) return 'STRING';
    if (type.includes('CHARACTER') || type.includes('CHAR')) return 'CHAR';
    if (type.includes('TEXT')) return 'TEXT';
    
    // Tipos de fecha
    if (type.includes('TIMESTAMP')) return 'DATE';
    if (type.includes('DATE')) return 'DATEONLY';
    if (type.includes('TIME')) return 'TIME';
    
    // Tipos booleanos
    if (type.includes('BOOLEAN') || type.includes('BOOL')) return 'BOOLEAN';
    
    // Tipos JSON
    if (type.includes('JSON')) return 'JSON';
    if (type.includes('JSONB')) return 'JSONB';
    
    // Por defecto, usar STRING
    console.warn(`⚠️ Tipo PostgreSQL no reconocido: "${postgresType}" (normalizado: "${type}"), usando STRING por defecto`);
    console.warn(`   💡 Considera agregar este tipo al mapeo en modelDiffService.js`);
    return 'STRING';
  }

  /**
   * Genera comandos para cambiar nullabilidad de columnas
   * IMPORTANTE: Siempre incluye el type para evitar errores de Sequelize
   * IMPORTANTE: Usa el tipo del MODELO (destino), no el tipo de la BD (origen)
   * Esto es crucial cuando hay cambios simultáneos de tipo y nullabilidad
   */
  generateChangeColumnNullCommand(change) {
    const { table, column, allowNull, modelType, currentType } = change;
    
    // Usar el tipo del MODELO como destino final (no el tipo actual de la BD)
    // Si hay cambio de tipo simultáneo, el tipo ya habrá sido cambiado en un comando anterior
    const columnType = modelType ? this.mapPostgresTypeToSequelize(modelType) : 
                       (currentType ? this.mapPostgresTypeToSequelize(currentType) : 'STRING');
    
    return {
      up: `await queryInterface.changeColumn('${table}', '${column}', {
        type: Sequelize.${columnType},  // ✅ Tipo del modelo (destino final)
        allowNull: ${allowNull}
      });`,
      down: `await queryInterface.changeColumn('${table}', '${column}', {
        type: Sequelize.${columnType},  // ✅ Tipo del modelo (destino final)
        allowNull: ${!allowNull}
      });`
    };
  }

  /**
   * Genera comandos específicos para cada tipo de cambio
   */
  generateMigrationCommand(change) {
    switch (change.type) {
      case 'CREATE_TABLE':
        return this.generateCreateTableCommand(change);
      
      case 'DROP_TABLE':
        return this.generateDropTableCommand(change);
      
      case 'ADD_COLUMN':
        return this.generateAddColumnCommand(change);
      
      case 'REMOVE_COLUMN':
        return this.generateRemoveColumnCommand(change);
      
      case 'CHANGE_COLUMN_TYPE':
        return this.generateChangeColumnCommand(change);
      
      case 'CHANGE_COLUMN_NULL':
        return this.generateChangeColumnNullCommand(change);
      
      default:
        return { up: `// TODO: Implementar ${change.type}`, down: '' };
    }
  }

  generateCreateTableCommand(change) {
    const self = this; // Capturar referencia a this
    const columns = Object.entries(change.definition.columns)
      .map(([name, def]) => {
        let columnDef = `      ${name}: {
        type: Sequelize.${self.mapPostgresTypeToSequelize(def.type)},
        allowNull: ${def.allowNull},`;
        
        // Agregar primaryKey si existe
        if (def.primaryKey) {
          columnDef += '\n        primaryKey: true,';
        }
        
        // Agregar autoIncrement si existe
        if (def.autoIncrement) {
          columnDef += '\n        autoIncrement: true,';
        }
        
        // ✅ Agregar references (foreign key) si existe
        if (def.references) {
          const refModel = def.references.model;
          const refKey = def.references.key || 'id';
          // Extraer el nombre de la tabla del modelo
          const tableName = typeof refModel === 'string' ? refModel : refModel.tableName || refModel.name;
          columnDef += `\n        references: {
          model: '${tableName}',
          key: '${refKey}'
        },`;
        }
        
        columnDef += '\n      }';
        return columnDef;
      }).join(',\n');

    return {
      up: `await queryInterface.createTable('${change.table}', {
${columns}
    });`,
      down: `await queryInterface.dropTable('${change.table}');`
    };
  }

  generateDropTableCommand(change) {
    return {
      up: `await queryInterface.dropTable('${change.table}');`,
      down: `// TODO: Recrear tabla ${change.table} - requiere definición manual`
    };
  }

  generateAddColumnCommand(change) {
    const def = change.definition;
    let columnDef = `      type: Sequelize.${this.mapPostgresTypeToSequelize(def.type)},
      allowNull: ${def.allowNull}`;
    
    // Agregar defaultValue si existe
    if (def.defaultValue !== undefined) {
      columnDef += `,\n      defaultValue: ${JSON.stringify(def.defaultValue)}`;
    }
    
    // ✅ Agregar primaryKey si existe
    if (def.primaryKey) {
      columnDef += ',\n      primaryKey: true';
    }
    
    // ✅ Agregar autoIncrement si existe
    if (def.autoIncrement) {
      columnDef += ',\n      autoIncrement: true';
    }
    
    // ✅ Agregar references (foreign key) si existe
    if (def.references) {
      const refModel = def.references.model;
      const refKey = def.references.key || 'id';
      // Extraer el nombre de la tabla del modelo
      const tableName = typeof refModel === 'string' ? refModel : refModel.tableName || refModel.name;
      columnDef += `,
      references: {
        model: '${tableName}',
        key: '${refKey}'
      }`;
    }
    
    return {
      up: `await queryInterface.addColumn('${change.table}', '${change.column}', {
${columnDef}
    });`,
      down: `await queryInterface.removeColumn('${change.table}', '${change.column}');`
    };
  }

  generateRemoveColumnCommand(change) {
    return {
      up: `await queryInterface.removeColumn('${change.table}', '${change.column}');`,
      down: `// TODO: Restaurar columna ${change.column} - requiere definición manual`
    };
  }

  /**
   * Detecta si una conversión de tipo requiere SQL raw con USING en PostgreSQL
   * PostgreSQL no puede convertir automáticamente algunos tipos
   */
  requiresExplicitCast(fromType, toType) {
    const from = fromType.toUpperCase();
    const to = toType.toUpperCase();
    
    // Conversiones problemáticas que requieren USING explícito
    const problematicConversions = [
      // VARCHAR/STRING → tipos numéricos
      { from: 'VARCHAR', to: 'DOUBLE' },
      { from: 'VARCHAR', to: 'FLOAT' },
      { from: 'VARCHAR', to: 'REAL' },
      { from: 'VARCHAR', to: 'INTEGER' },
      { from: 'VARCHAR', to: 'BIGINT' },
      { from: 'VARCHAR', to: 'SMALLINT' },
      { from: 'VARCHAR', to: 'DECIMAL' },
      { from: 'VARCHAR', to: 'NUMERIC' },
      { from: 'CHARACTER VARYING', to: 'DOUBLE' },
      { from: 'CHARACTER VARYING', to: 'FLOAT' },
      { from: 'CHARACTER VARYING', to: 'INTEGER' },
      
      // VARCHAR/STRING → booleano
      { from: 'VARCHAR', to: 'BOOLEAN' },
      { from: 'CHARACTER VARYING', to: 'BOOLEAN' },
      
      // VARCHAR/STRING → fecha
      { from: 'VARCHAR', to: 'TIMESTAMP' },
      { from: 'VARCHAR', to: 'DATE' },
      { from: 'CHARACTER VARYING', to: 'TIMESTAMP' },
      { from: 'CHARACTER VARYING', to: 'DATE' },
    ];
    
    return problematicConversions.some(conversion => 
      from.includes(conversion.from) && to.includes(conversion.to)
    );
  }

  /**
   * Genera el SQL USING apropiado para la conversión de tipos
   */
  generateUsingClause(columnName, fromType, toType) {
    const to = toType.toUpperCase();
    
    // Para numéricos: manejar NULL y strings vacíos
    if (to.includes('DOUBLE') || to.includes('FLOAT') || to.includes('REAL')) {
      return `CASE 
        WHEN "${columnName}" IS NULL OR "${columnName}" = '' THEN NULL
        ELSE "${columnName}"::double precision 
      END`;
    }
    
    if (to.includes('INTEGER') || to.includes('BIGINT') || to.includes('SMALLINT')) {
      return `CASE 
        WHEN "${columnName}" IS NULL OR "${columnName}" = '' THEN NULL
        ELSE "${columnName}"::integer 
      END`;
    }
    
    if (to.includes('DECIMAL') || to.includes('NUMERIC')) {
      return `CASE 
        WHEN "${columnName}" IS NULL OR "${columnName}" = '' THEN NULL
        ELSE "${columnName}"::numeric 
      END`;
    }
    
    // Para booleanos
    if (to.includes('BOOLEAN')) {
      return `CASE 
        WHEN "${columnName}" = 'true' OR "${columnName}" = '1' OR "${columnName}" = 't' THEN true
        WHEN "${columnName}" = 'false' OR "${columnName}" = '0' OR "${columnName}" = 'f' THEN false
        ELSE NULL 
      END`;
    }
    
    // Para fechas
    if (to.includes('TIMESTAMP') || to.includes('DATE')) {
      return `CASE 
        WHEN "${columnName}" IS NULL OR "${columnName}" = '' THEN NULL
        ELSE "${columnName}"::timestamp 
      END`;
    }
    
    // Por defecto, conversión directa
    return `"${columnName}"::${this.getPostgresType(toType)}`;
  }

  /**
   * Mapea tipo normalizado a tipo PostgreSQL real
   */
  getPostgresType(normalizedType) {
    const type = normalizedType.toUpperCase();
    
    if (type === 'DOUBLE') return 'double precision';
    if (type === 'INTEGER') return 'integer';
    if (type === 'BIGINT') return 'bigint';
    if (type === 'SMALLINT') return 'smallint';
    if (type === 'BOOLEAN') return 'boolean';
    if (type === 'VARCHAR') return 'varchar(255)';
    if (type === 'TEXT') return 'text';
    if (type === 'TIMESTAMP') return 'timestamp';
    if (type === 'DECIMAL') return 'numeric';
    
    return type.toLowerCase();
  }

  generateChangeColumnCommand(change) {
    const isPrimaryKey = change.isPrimaryKey || false;
    const needsExplicitCast = this.requiresExplicitCast(change.from, change.to);
    
    // Si la conversión requiere USING explícito, generar SQL raw
    if (needsExplicitCast && !isPrimaryKey) {
      console.log(`🔧 Conversión ${change.from} → ${change.to} requiere SQL raw con USING`);
      
      const usingClause = this.generateUsingClause(change.column, change.from, change.to);
      const postgresType = this.getPostgresType(change.to);
      
      return {
        up: `// Conversión ${change.from} → ${change.to} requiere USING explícito
    await queryInterface.sequelize.query(\`
      ALTER TABLE "${change.table}" 
      ALTER COLUMN "${change.column}" TYPE ${postgresType} 
      USING ${usingClause};
    \`);`,
        down: `// Reversión ${change.to} → ${change.from}
    await queryInterface.changeColumn('${change.table}', '${change.column}', {
      type: Sequelize.${this.mapPostgresTypeToSequelize(change.from)},
      allowNull: true
    });`
      };
    }
    
    // Para claves primarias, usar changeColumn normal
    if (isPrimaryKey) {
      console.log(`⚠️ Columna ${change.column} es clave primaria, solo cambiando tipo`);
      return {
        up: `await queryInterface.changeColumn('${change.table}', '${change.column}', {
      type: Sequelize.${this.mapPostgresTypeToSequelize(change.to)},
      allowNull: false  // ⚠️ IMPORTANTE: Claves primarias siempre NOT NULL
    });`,
        down: `await queryInterface.changeColumn('${change.table}', '${change.column}', {
      type: Sequelize.${this.mapPostgresTypeToSequelize(change.from)},
      allowNull: false  // ⚠️ IMPORTANTE: Claves primarias siempre NOT NULL
    });`
      };
    }
    
    // Para conversiones normales, usar changeColumn
    return {
      up: `await queryInterface.changeColumn('${change.table}', '${change.column}', {
      type: Sequelize.${this.mapPostgresTypeToSequelize(change.to)},
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });`,
      down: `await queryInterface.changeColumn('${change.table}', '${change.column}', {
      type: Sequelize.${this.mapPostgresTypeToSequelize(change.from)},
      allowNull: true  // ⚠️ IMPORTANTE: Incluir allowNull para evitar errores
    });`
    };
  }
}

module.exports = { ModelDiffService };
