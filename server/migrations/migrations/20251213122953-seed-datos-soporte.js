'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Insertando datos iniciales del módulo de Soporte...');

    // Verificar si ya existen datos para evitar duplicados
    const prioridadesExistentes = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM prioridad',
      { type: Sequelize.QueryTypes.SELECT }
    );

    const categoriasExistentes = await queryInterface.sequelize.query(
      'SELECT COUNT(*) as count FROM categoria',
      { type: Sequelize.QueryTypes.SELECT }
    );

    // 1. Insertar prioridades (solo si no existen)
    if (prioridadesExistentes[0].count === '0') {
      const prioridades = [
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Muy Bajo',
          first_response_hours: 48,
          resolution_hours: 240,
          color: '#9E9E9E',
          orden: 5,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Bajo',
          first_response_hours: 24,
          resolution_hours: 120,
          color: '#2196F3',
          orden: 4,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Medio',
          first_response_hours: 8,
          resolution_hours: 72,
          color: '#FFC107',
          orden: 3,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Alto',
          first_response_hours: 4,
          resolution_hours: 48,
          color: '#FF9800',
          orden: 2,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Urgente',
          first_response_hours: 2,
          resolution_hours: 24,
          color: '#F44336',
          orden: 1,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await queryInterface.bulkInsert('prioridad', prioridades);
      console.log('✅ 5 prioridades insertadas');
    } else {
      console.log('⚠️  Prioridades ya existen, omitiendo inserción');
    }

    // 2. Insertar categorías (solo si no existen)
    if (categoriasExistentes[0].count === '0') {
      const categorias = [
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Ventas',
          modulo: 'ventas',
          descripcion: 'Problemas y consultas sobre ventas',
          orden: 1,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Compras',
          modulo: 'compras',
          descripcion: 'Problemas y consultas sobre compras',
          orden: 2,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Inventario',
          modulo: 'inventario',
          descripcion: 'Gestión de stock, items y lotes',
          orden: 3,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Facturación',
          modulo: 'facturacion',
          descripcion: 'AFIP, comprobantes y facturas',
          orden: 4,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Reportes/Analíticos',
          modulo: 'analiticos',
          descripcion: 'Reportes, dashboards y métricas',
          orden: 5,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Caja/Transacciones',
          modulo: 'transacciones',
          descripcion: 'Movimientos de caja y pagos',
          orden: 6,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Administración',
          modulo: 'administracion',
          descripcion: 'Usuarios, roles y permisos',
          orden: 7,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Bug/Error',
          modulo: 'sistema',
          descripcion: 'Errores del sistema',
          orden: 8,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Consulta General',
          modulo: 'general',
          descripcion: 'Consultas generales',
          orden: 9,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: Sequelize.literal('gen_random_uuid()'),
          nombre: 'Otro',
          modulo: 'general',
          descripcion: 'Otros temas',
          orden: 10,
          activa: true,
          eliminado: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      await queryInterface.bulkInsert('categoria', categorias);
      console.log('✅ 10 categorías insertadas');
    } else {
      console.log('⚠️  Categorías ya existen, omitiendo inserción');
    }

    console.log('✅ Datos iniciales del módulo de Soporte insertados correctamente');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Revirtiendo seeds del módulo de Soporte...');

    // Eliminar solo los datos por defecto (identificados por nombre)
    await queryInterface.bulkDelete('categoria', {
      nombre: {
        [Sequelize.Op.in]: [
          'Ventas', 'Compras', 'Inventario', 'Facturación', 'Reportes/Analíticos',
          'Caja/Transacciones', 'Administración', 'Bug/Error', 'Consulta General', 'Otro'
        ]
      }
    });

    await queryInterface.bulkDelete('prioridad', {
      nombre: {
        [Sequelize.Op.in]: ['Muy Bajo', 'Bajo', 'Medio', 'Alto', 'Urgente']
      }
    });

    console.log('✅ Seeds revertidos correctamente');
  }
};

