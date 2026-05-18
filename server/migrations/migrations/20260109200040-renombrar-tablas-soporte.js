'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('🔄 Renombrando tablas del módulo de soporte...');
    
    // Renombrar tablas del módulo de soporte agregando prefijo 'soporte_'
    // Solo renombrar si la tabla antigua existe y la nueva no existe
    
    const renameIfExists = async (oldName, newName) => {
      try {
        // Verificar si la tabla antigua existe
        const [results] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${oldName}'
          );`
        );
        
        const oldTableExists = results[0].exists;
        
        // Verificar si la tabla nueva ya existe
        const [newResults] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${newName}'
          );`
        );
        
        const newTableExists = newResults[0].exists;
        
        if (oldTableExists && !newTableExists) {
          console.log(`  ✅ Renombrando: ${oldName} → ${newName}`);
          await queryInterface.renameTable(oldName, newName);
        } else if (newTableExists) {
          console.log(`  ⏭️  Tabla ${newName} ya existe, omitiendo renombrado`);
        } else {
          console.log(`  ⏭️  Tabla ${oldName} no existe, omitiendo renombrado`);
        }
      } catch (error) {
        console.error(`  ❌ Error al renombrar ${oldName} → ${newName}:`, error.message);
        throw error;
      }
    };
    
    // Renombrar todas las tablas del módulo de soporte
    await renameIfExists('prioridad', 'soporte_Prioridad');
    await renameIfExists('categoria', 'soporte_Categoria');
    await renameIfExists('ticket', 'soporte_Ticket');
    await renameIfExists('ticketMensaje', 'soporte_TicketMensaje');
    await renameIfExists('ticketEvento', 'soporte_TicketEvento');
    await renameIfExists('ticketAdjunto', 'soporte_TicketAdjunto');
    await renameIfExists('configSoporte', 'soporte_ConfigSoporte');
    await renameIfExists('plantillaRespuesta', 'soporte_PlantillaRespuesta');
    await renameIfExists('ticketSecuencia', 'soporte_TicketSecuencia');
    
    console.log('✅ Renombrado de tablas completado');
  },

  async down (queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo renombrado de tablas del módulo de soporte...');
    
    // Revertir renombrado: volver a los nombres originales sin prefijo
    const renameIfExists = async (newName, oldName) => {
      try {
        // Verificar si la tabla nueva existe
        const [results] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${newName}'
          );`
        );
        
        const newTableExists = results[0].exists;
        
        // Verificar si la tabla antigua ya existe
        const [oldResults] = await queryInterface.sequelize.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${oldName}'
          );`
        );
        
        const oldTableExists = oldResults[0].exists;
        
        if (newTableExists && !oldTableExists) {
          console.log(`  ✅ Revirtiendo: ${newName} → ${oldName}`);
          await queryInterface.renameTable(newName, oldName);
        } else if (oldTableExists) {
          console.log(`  ⏭️  Tabla ${oldName} ya existe, omitiendo reversión`);
        } else {
          console.log(`  ⏭️  Tabla ${newName} no existe, omitiendo reversión`);
        }
      } catch (error) {
        console.error(`  ❌ Error al revertir ${newName} → ${oldName}:`, error.message);
        throw error;
      }
    };
    
    // Revertir renombrado de todas las tablas
    await renameIfExists('soporte_Prioridad', 'prioridad');
    await renameIfExists('soporte_Categoria', 'categoria');
    await renameIfExists('soporte_Ticket', 'ticket');
    await renameIfExists('soporte_TicketMensaje', 'ticketMensaje');
    await renameIfExists('soporte_TicketEvento', 'ticketEvento');
    await renameIfExists('soporte_TicketAdjunto', 'ticketAdjunto');
    await renameIfExists('soporte_ConfigSoporte', 'configSoporte');
    await renameIfExists('soporte_PlantillaRespuesta', 'plantillaRespuesta');
    await renameIfExists('soporte_TicketSecuencia', 'ticketSecuencia');
    
    console.log('✅ Reversión de renombrado completada');
  }
};
