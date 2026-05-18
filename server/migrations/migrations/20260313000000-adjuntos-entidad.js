'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Agregando columna adjuntos a la tabla entidad...');

    // Helper function para verificar si una columna existe
    const columnExists = async (tableName, columnName) => {
      const [columns] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND column_name = '${columnName}'
        AND table_schema = 'public'
      `);
      return columns.length > 0;
    };

    // Agregar columna adjuntos a entidad si no existe
    if (!(await columnExists('entidad', 'adjuntos'))) {
      await queryInterface.addColumn('entidad', 'adjuntos', {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Archivos adjuntos en Base64 (JSON string con array de objetos: {nombre, tipo, tamaño, base64})'
      });
      console.log('✅ Columna adjuntos agregada a entidad');
    } else {
      console.log('⏭️  Columna adjuntos ya existe en entidad');
    }

    console.log('✅ Migración completada exitosamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo: eliminando columna adjuntos de entidad...');
    await queryInterface.removeColumn('entidad', 'adjuntos');
    console.log('✅ Columna adjuntos eliminada de entidad');
  }
};
