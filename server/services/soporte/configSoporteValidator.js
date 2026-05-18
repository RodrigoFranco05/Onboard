/**
 * Validador de configuración inicial de soporte por tenant
 * 
 * Este servicio asegura que cada tenant tenga:
 * - Configuración de soporte (Soporte_Config)
 * - Categorías por defecto (10 categorías)
 * - Prioridades por defecto (5 prioridades)
 * 
 * Similar a menuAccesoValidator.js en funcionalidad
 * 
 * Referencia: sistema-tickets-backend.md Sección 6.1
 */

async function validarYCrearConfigSoporte(sequelize, tenant) {
  const { Soporte_Config, Soporte_Categoria, Soporte_Prioridad } = 
    require('../../models/soporteModel').soporteModelInit(sequelize);

  try {
    console.log(`🔍 [Soporte_Config] Validando configuración para tenant: ${tenant}`);

    // 1. Crear o verificar configuración
    const prefijo = tenant.substring(0, 4).toUpperCase();
    
    const [config, created] = await Soporte_Config.findOrCreate({
      where: { tenant },
      defaults: {
        prefijoTicket: prefijo,
        maxAttachmentSizeMb: 50,
        maxAttachmentsPerMessage: 5,
        diasAutocierreResuelto: 30,
        diasAutocierrePendienteValidacion: 7,
        tituloObligatorio: true,
        descripcionObligatoria: true,
        categoriaObligatoria: true,
        visualizacionEstadisticas: 'solo_agentes'
      }
    });

    if (created) {
      console.log(`✅ [Soporte_Config] Configuración creada para ${tenant}`);
    }

    // 2. Verificar y crear categorías si no existen
    const categoriasCount = await Soporte_Categoria.count({ where: { eliminado: false } });
    
    if (categoriasCount === 0) {
      console.log(`📝 [Soporte_Config] Creando categorías por defecto para ${tenant}`);
      
      const categorias = [
        { nombre: 'Ventas', modulo: 'ventas', descripcion: 'Problemas y consultas sobre ventas', orden: 1 },
        { nombre: 'Compras', modulo: 'compras', descripcion: 'Problemas y consultas sobre compras', orden: 2 },
        { nombre: 'Inventario', modulo: 'inventario', descripcion: 'Gestión de stock, items y lotes', orden: 3 },
        { nombre: 'Facturación', modulo: 'facturacion', descripcion: 'AFIP, comprobantes y facturas', orden: 4 },
        { nombre: 'Reportes/Analíticos', modulo: 'analiticos', descripcion: 'Reportes, dashboards y métricas', orden: 5 },
        { nombre: 'Caja/Transacciones', modulo: 'transacciones', descripcion: 'Movimientos de caja y pagos', orden: 6 },
        { nombre: 'Administración', modulo: 'administracion', descripcion: 'Usuarios, roles y permisos', orden: 7 },
        { nombre: 'Bug/Error', modulo: 'sistema', descripcion: 'Errores del sistema', orden: 8 },
        { nombre: 'Consulta General', modulo: 'general', descripcion: 'Consultas generales', orden: 9 },
        { nombre: 'Otro', modulo: 'general', descripcion: 'Otros temas', orden: 10 }
      ];

      await Soporte_Categoria.bulkCreate(categorias.map(cat => ({
        ...cat,
        activa: true,
        eliminado: false
      })));

      console.log(`✅ [Soporte_Config] ${categorias.length} categorías creadas para ${tenant}`);
    }

    // 3. Verificar y crear prioridades si no existen
    const prioridadesCount = await Soporte_Prioridad.count({ where: { eliminado: false } });
    
    if (prioridadesCount === 0) {
      console.log(`📝 [Soporte_Config] Creando prioridades por defecto para ${tenant}`);
      
      const prioridades = [
        { nombre: 'Muy Bajo', firstResponseHours: 48, resolutionHours: 240, color: '#9E9E9E', orden: 5 },
        { nombre: 'Bajo', firstResponseHours: 24, resolutionHours: 120, color: '#2196F3', orden: 4 },
        { nombre: 'Medio', firstResponseHours: 8, resolutionHours: 72, color: '#FFC107', orden: 3 },
        { nombre: 'Alto', firstResponseHours: 4, resolutionHours: 48, color: '#FF9800', orden: 2 },
        { nombre: 'Urgente', firstResponseHours: 2, resolutionHours: 24, color: '#F44336', orden: 1 }
      ];

      await Soporte_Prioridad.bulkCreate(prioridades.map(pri => ({
        ...pri,
        activa: true,
        eliminado: false
      })));

      console.log(`✅ [Soporte_Config] ${prioridades.length} prioridades creadas para ${tenant}`);
    }

    console.log(`✅ [Soporte_Config] Validación completada para ${tenant}`);
    return config;

  } catch (error) {
    console.error(`❌ [Soporte_Config] Error validando configuración para ${tenant}:`, error);
    throw error;
  }
}

module.exports = { validarYCrearConfigSoporte };
