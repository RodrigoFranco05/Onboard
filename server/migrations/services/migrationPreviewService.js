const fs = require('fs').promises;
const path = require('path');

class MigrationPreviewService {
  constructor() {
    this.previewDir = path.join(__dirname, '../previews');
    this.sqlCommands = [];
    this.migrationDetails = [];
  }

  /**
   * Genera preview completo de migraciones pendientes
   */
  async generatePreview(sequelize, tenantName, specificMigration = null) {
    try {
      console.log(`🔍 Generando preview para tenant: ${tenantName}`);
      
      // Asegurar directorio de previews
      await fs.mkdir(this.previewDir, { recursive: true });
      
      // Obtener migraciones pendientes
      const migrationsToAnalyze = await this.getPendingMigrations(sequelize, specificMigration);
      
      if (migrationsToAnalyze.length === 0) {
        console.log('✅ No hay migraciones pendientes para preview');
        return { previewFile: null, migrations: [] };
      }
      
      const previewResults = [];
      
      for (const migration of migrationsToAnalyze) {
        console.log(`🔍 Analizando: ${migration.name}`);
        
        const migrationResult = await this.analyzeMigration(sequelize, migration);
        previewResults.push(migrationResult);
      }
      
      // Generar archivo de preview
      const previewFile = await this.generatePreviewFile(tenantName, previewResults);
      
      console.log(`📄 Preview generado: ${previewFile.markdownFile}`);
      
      return {
        previewFile,
        migrations: previewResults,
        totalCommands: previewResults.reduce((sum, m) => sum + m.commandCount, 0)
      };
      
    } catch (error) {
      console.error('❌ Error generando preview:');
      console.error(`   💥 ${error.message || error}`);
      if (error.sql) {
        console.error(`   📝 SQL: ${error.sql}`);
      }
      throw error;
    }
  }

  /**
   * Analiza una migración específica sin ejecutarla
   */
  async analyzeMigration(sequelize, migration) {
    // Reiniciar capturas
    this.sqlCommands = [];
    this.migrationDetails = [];
    
    try {
      // Crear interceptores para capturar comandos
      const { originalQuery, originalMethods } = this.setupInterceptors(sequelize, migration.name);
      
      // Cargar y analizar la migración
      const migrationPath = path.join(__dirname, '../migrations', migration.name);
      delete require.cache[require.resolve(migrationPath)]; // Limpiar cache
      const migrationModule = require(migrationPath);
      
      if (migrationModule.up) {
        await migrationModule.up(sequelize.getQueryInterface(), sequelize.constructor);
      }
      
      // Restaurar interceptores
      this.restoreOriginalMethods(sequelize, originalQuery, originalMethods);
      
      return {
        migration: migration.name,
        status: 'success',
        sqlCommands: [...this.sqlCommands],
        migrationDetails: [...this.migrationDetails],
        commandCount: this.sqlCommands.length + this.migrationDetails.length,
        estimatedTime: this.estimateExecutionTime()
      };
      
    } catch (error) {
      return {
        migration: migration.name,
        status: 'error',
        error: error.message,
        sqlCommands: [...this.sqlCommands],
        migrationDetails: [...this.migrationDetails],
        commandCount: 0
      };
    }
  }

  /**
   * Configura interceptores para capturar comandos SQL
   */
  setupInterceptors(sequelize, migrationName) {
    // Interceptar sequelize.query
    const originalQuery = sequelize.query.bind(sequelize);
    sequelize.query = (sql, options = {}) => {
      const formattedSQL = this.formatSQL(sql);
      console.log(`🔍 SQL interceptado: ${formattedSQL}`);
      
      this.sqlCommands.push({
        sql: formattedSQL,
        timestamp: new Date().toISOString(),
        type: options.type || 'RAW',
        migration: migrationName
      });
      
      // Simular respuesta exitosa
      return Promise.resolve({ 
        success: true, 
        preview: true,
        rowsAffected: 0 
      });
    };

    // Interceptar QueryInterface methods
    const qi = sequelize.getQueryInterface();
    const originalMethods = {};
    
    const methodsToIntercept = [
      'createTable', 'dropTable', 'addColumn', 'removeColumn', 
      'changeColumn', 'addIndex', 'removeIndex', 'addConstraint', 
      'removeConstraint', 'renameTable', 'renameColumn',
      'bulkInsert', 'bulkUpdate', 'bulkDelete'
    ];
    
    methodsToIntercept.forEach(method => {
      if (qi[method]) {
        originalMethods[method] = qi[method].bind(qi);
        qi[method] = (...args) => {
          console.log(`🔍 Método interceptado: ${method}(${this.serializeArgs(args).join(', ')})`);
          
          this.migrationDetails.push({
            method,
            args: this.serializeArgs(args),
            timestamp: new Date().toISOString(),
            migration: migrationName
          });
          
          // Generar SQL aproximado para métodos de alto nivel
          const estimatedSQL = this.estimateSQLForMethod(method, args);
          if (estimatedSQL) {
            this.sqlCommands.push({
              sql: estimatedSQL,
              timestamp: new Date().toISOString(),
              type: 'ESTIMATED',
              migration: migrationName
            });
          }
          
          return Promise.resolve({ success: true, preview: true });
        };
      }
    });

    return { originalQuery, originalMethods };
  }

  /**
   * Restaura métodos originales
   */
  restoreOriginalMethods(sequelize, originalQuery, originalMethods) {
    sequelize.query = originalQuery;
    
    const qi = sequelize.getQueryInterface();
    Object.keys(originalMethods).forEach(method => {
      qi[method] = originalMethods[method];
    });
  }

  /**
   * Obtiene migraciones pendientes
   */
  async getPendingMigrations(sequelize, specificMigration) {
    const migrationsDir = path.join(__dirname, '../migrations');
    const allFiles = await fs.readdir(migrationsDir);
    const migrationFiles = allFiles
      .filter(f => f.endsWith('.js'))
      .sort();

    if (specificMigration) {
      return migrationFiles.includes(specificMigration) 
        ? [{ name: specificMigration }]
        : [];
    }

    // Obtener migraciones ya aplicadas
    try {
      const [results] = await sequelize.query(
        'SELECT name FROM "SequelizeMeta" ORDER BY name',
        { type: sequelize.QueryTypes.SELECT }
      );
      
      const appliedMigrations = new Set(results.map(r => r.name));
      
      return migrationFiles
        .filter(f => !appliedMigrations.has(f))
        .map(name => ({ name }));
        
    } catch (error) {
      // Tabla no existe, todas las migraciones están pendientes
      return migrationFiles.map(name => ({ name }));
    }
  }

  /**
   * Genera archivo de preview legible
   */
  async generatePreviewFile(tenantName, previewResults) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const previewFile = path.join(this.previewDir, `${tenantName}-preview-${timestamp}.md`);
    
    let content = this.generateMarkdownContent(tenantName, previewResults);
    
    await fs.writeFile(previewFile, content);
    
    // También generar archivo SQL puro
    const sqlFile = path.join(this.previewDir, `${tenantName}-preview-${timestamp}.sql`);
    const sqlContent = this.generateSQLContent(previewResults);
    await fs.writeFile(sqlFile, sqlContent);
    
    return { markdownFile: previewFile, sqlFile };
  }

  /**
   * Genera contenido Markdown del preview
   */
  generateMarkdownContent(tenantName, previewResults) {
    let content = `# 🔍 Preview de Migraciones - ${tenantName}\n\n`;
    content += `**Fecha:** ${new Date().toLocaleString()}\n`;
    content += `**Tenant:** ${tenantName}\n`;
    content += `**Migraciones analizadas:** ${previewResults.length}\n`;
    content += `**Total comandos SQL:** ${previewResults.reduce((sum, m) => sum + m.sqlCommands.length, 0)}\n\n`;
    
    // Resumen ejecutivo
    content += `## 📊 Resumen Ejecutivo\n\n`;
    content += `| Migración | Estado | Comandos | Tiempo Estimado |\n`;
    content += `|-----------|--------|----------|----------------|\n`;
    
    for (const result of previewResults) {
      const status = result.status === 'success' ? '✅' : '❌';
      const time = result.estimatedTime ? `${result.estimatedTime}ms` : 'N/A';
      content += `| ${result.migration} | ${status} | ${result.commandCount} | ${time} |\n`;
    }
    content += '\n';

    // Detalle por migración
    for (const result of previewResults) {
      content += `## 📋 ${result.migration}\n\n`;
      
      if (result.status === 'error') {
        content += `❌ **ERROR:** ${result.error}\n\n`;
        continue;
      }
      
      content += `✅ **Estado:** Análisis exitoso\n`;
      content += `📊 **Comandos SQL:** ${result.sqlCommands.length}\n`;
      content += `📊 **Comandos de alto nivel:** ${result.migrationDetails.length}\n`;
      content += `⏱️ **Tiempo estimado:** ${result.estimatedTime || 'N/A'}ms\n\n`;
      
      if (result.migrationDetails.length > 0) {
        content += `### 🔧 Operaciones de Alto Nivel\n\n`;
        result.migrationDetails.forEach((detail, i) => {
          content += `${i + 1}. **${detail.method}**(${detail.args.join(', ')})\n`;
        });
        content += '\n';
      }
      
      if (result.sqlCommands.length > 0) {
        content += `### 💾 Comandos SQL que se Ejecutarán\n\n`;
        result.sqlCommands.forEach((cmd, i) => {
          content += `${i + 1}. \`\`\`sql\n${cmd.sql}\n\`\`\`\n\n`;
        });
      }
      
      content += `---\n\n`;
    }
    
    return content;
  }

  /**
   * Genera archivo SQL puro para revisión
   */
  generateSQLContent(previewResults) {
    let content = `-- ===================================================\n`;
    content += `-- PREVIEW DE MIGRACIONES - ${new Date().toLocaleString()}\n`;
    content += `-- ===================================================\n\n`;
    
    for (const result of previewResults) {
      if (result.status === 'error') continue;
      
      content += `-- ---------------------------------------------------\n`;
      content += `-- MIGRACIÓN: ${result.migration}\n`;
      content += `-- COMANDOS: ${result.sqlCommands.length}\n`;
      content += `-- ---------------------------------------------------\n\n`;
      
      result.sqlCommands.forEach((cmd, i) => {
        content += `-- Comando ${i + 1}\n`;
        content += `${cmd.sql};\n\n`;
      });
    }
    
    return content;
  }

  /**
   * Utilidades de formato
   */
  formatSQL(sql) {
    if (typeof sql === 'string') {
      return sql.trim().replace(/\s+/g, ' ');
    }
    return String(sql);
  }

  serializeArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg, null, 0);
      }
      return String(arg);
    });
  }

  estimateExecutionTime() {
    // Estimación simple basada en tipo de comandos
    const baseTime = 50; // ms base por comando
    const complexCommands = ['CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX'];
    
    let estimatedTime = 0;
    for (const cmd of this.sqlCommands) {
      if (complexCommands.some(complex => cmd.sql.includes(complex))) {
        estimatedTime += baseTime * 3;
      } else {
        estimatedTime += baseTime;
      }
    }
    
    return estimatedTime;
  }

  /**
   * Genera SQL aproximado para métodos de QueryInterface
   */
  estimateSQLForMethod(method, args) {
    try {
      switch (method) {
        case 'addColumn':
          const [tableName, columnName, columnDef] = args;
          return `ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${this.formatColumnDefinition(columnDef)}`;
        
        case 'removeColumn':
          const [table, column] = args;
          return `ALTER TABLE "${table}" DROP COLUMN "${column}"`;
        
        case 'changeColumn':
          const [tbl, col, colDef] = args;
          return `ALTER TABLE "${tbl}" ALTER COLUMN "${col}" TYPE ${this.formatColumnDefinition(colDef)}`;
        
        case 'addIndex':
          const [tblName, indexName, indexFields, indexOptions] = args;
          const fields = Array.isArray(indexFields) ? indexFields.join(', ') : indexFields;
          return `CREATE INDEX "${indexName}" ON "${tblName}" (${fields})`;
        
        case 'removeIndex':
          const [tableName2, indexName2] = args;
          return `DROP INDEX "${indexName2}"`;
        
        case 'createTable':
          const [tblName2, attributes, options] = args;
          return `CREATE TABLE "${tblName2}" (/* columnas definidas en el modelo */)`;
        
        case 'dropTable':
          const [tableName3] = args;
          return `DROP TABLE "${tableName3}"`;
        
        default:
          return null;
      }
    } catch (error) {
      console.log(`⚠️ Error generando SQL para ${method}:`, error.message);
      return null;
    }
  }

  /**
   * Formatea definición de columna para SQL
   */
  formatColumnDefinition(columnDef) {
    if (!columnDef || typeof columnDef !== 'object') return 'TEXT';
    
    const type = columnDef.type || 'TEXT';
    const allowNull = columnDef.allowNull !== false ? 'NULL' : 'NOT NULL';
    const defaultValue = columnDef.defaultValue !== undefined ? `DEFAULT ${columnDef.defaultValue}` : '';
    
    let sqlType = 'TEXT';
    if (type.key) {
      switch (type.key) {
        case 'STRING': sqlType = 'VARCHAR(255)'; break;
        case 'INTEGER': sqlType = 'INTEGER'; break;
        case 'FLOAT': sqlType = 'DOUBLE PRECISION'; break;
        case 'BOOLEAN': sqlType = 'BOOLEAN'; break;
        case 'DATE': sqlType = 'TIMESTAMP'; break;
        case 'TEXT': sqlType = 'TEXT'; break;
        default: sqlType = 'TEXT';
      }
    }
    
    return `${sqlType} ${allowNull} ${defaultValue}`.trim();
  }
}

module.exports = new MigrationPreviewService();
