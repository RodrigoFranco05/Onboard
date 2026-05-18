const { Sequelize } = require('sequelize');

// Conexiones establecidas por tenant
const connectionsPool = {};
// Promesas de conexión en vuelo para evitar carreras de creación
const connectionsInFlight = {};
// Marcar si ya se sincronizó el esquema por tenant (si se usa sync)
const hasSynced = {};

async function conexionDB(tenant, usuario) {
  
  // Validar tenant
  if (!tenant || typeof tenant !== 'string' || tenant.trim().length === 0) {
    throw new Error('Tenant inválido o ausente al solicitar conexión a la base de datos.');
  }

  // Usar un pool por tenant (no por usuario) para evitar explosión de conexiones
  const index = tenant;

  // Reutilizar conexión ya creada
  if (connectionsPool[index]) {
    return connectionsPool[index];
  }

  // Si hay una creación en curso, esperar esa
  if (connectionsInFlight[index]) {
    return connectionsInFlight[index];
  }

  // Crear la conexión (y modelos) una sola vez por tenant
  connectionsInFlight[index] = (async () => {
    const sequelize = new Sequelize(tenant, 'postgres', 'admin', {
      host: '127.0.0.1',
      port: '5432',
      dialect: 'postgres',
      logging: console.log,
      define: {
        // Desactivar timestamps en todos los modelos por defecto
        timestamps: true,
      },
      pool: {
        max: 15,
        min: 0,
        acquire: 30000,
        idle: 10000,
        evict: 15000,
      },
      retry: { max: 3 },
    });

    try {
      await sequelize.authenticate();
      console.log(`Nueva conexión a DB ${index} establecida con éxito.`);

      // Inicialización de modelos
      const { adminModelInit } = require('../models/adminModel.js');
      const { transaccionModelInit } = require('../models/transaccionModel.js');
      const { itemModelInit } = require('../models/itemModel.js');

	//   const {Ubicacion, Negocio, TipoEntidad, Entidad, Usuario, ParametrosGlobales, RolUsuario, MenuAcceso, RolAcceso} = adminModelInit(sequelize)
	//   const {  SubCategoriaTransaccion,  CategoriaTransaccion,  Moneda,  TipoMedioDePago,  MedioDePago,  TipoTransaccion,  Transaccion,  TransaccionItem, TransaccionVentaUsuario,  Pago, TransaccionPago,  Caja,
	// 		CuentaCorriente,Impuesto,TransaccionImpuesto, TipoFactura, TransaccionTipoFactura, ListaDeMontos,EstadoCompra,
	// 		  TransaccionCompraEstado,TransaccionCompraItem } = transaccionModelInit(sequelize)
	//   const { Item, ItemUbicacion, ItemEntidad, ItemNegocio, ItemAtributom, Bom }= itemModelInit(sequelize)

      adminModelInit(sequelize);
      transaccionModelInit(sequelize);
      itemModelInit(sequelize);

      // Sincronización: evitamos alter en caliente. Si la necesitas, hazlo solo una vez controlada.
      if (!hasSynced[index]) {
        await sequelize.sync({ alter: false });
        hasSynced[index] = true;
        console.log('Tablas sincronizadas ');
        
        // 🔍 VALIDACIÓN AUTOMÁTICA DE PARÁMETROS GLOBALES
        const { validarYCrearParametrosGlobales } = require('../services/parametrosGlobalesValidator');
        await validarYCrearParametrosGlobales(sequelize, tenant);
      }

      // Publicar en el pool y devolver
      connectionsPool[index] = sequelize;
      return sequelize;
    } catch (error) {
      console.error(`Error al conectar a la base de datos ${index}:`, error);
      throw error;
    } finally {
      // Libera la promesa en vuelo para este tenant
      delete connectionsInFlight[index];
    }
  })();

  return connectionsInFlight[index];
}

module.exports = { conexionDB };


// ## DB EN SERVER:
/*
const { Sequelize } = require('sequelize');


const connectionsPool = {};

async function conexionDB(tenant,usuario) {
	// pool de conexiones
	let index = tenant + usuario
	if (connectionsPool[index]) {
		try {
		  // Verificamos si la conexión sigue siendo válida
		  await connectionsPool[index].authenticate();
		  console.log(`Conexión existente para ${index} reutilizada.`);
		  return connectionsPool[index];
		} catch (error) {
		  // Si la conexión no es válida, la eliminamos y creamos una nueva
		  delete connectionsPool[index];
		}
	  }

    const sequelize = new Sequelize(tenant, 'postgres', 'LutentePostgres2050*', {
        host: '147.93.12.15',
        port: '5432',
        dialect: 'postgres'
    });

    try {
		await sequelize.authenticate();
		console.log(`Nueva conexión a DB ${index} establecida con éxito.`);
		// Almacenamos la nueva conexión en el pool
		connectionsPool[index] = sequelize;

// INICIALIZACION / SINCRONIZACION DE LA BASE DE DATOS  ******************************************************************

		const { adminModelInit } = require('../models/adminModel.js');
		const { transaccionModelInit } = require('../models/transaccionModel.js');
		const { itemModelInit } = require('../models/itemModel.js');

		const {Ubicacion, Negocio, TipoEntidad, Entidad, Usuario, ParametrosGlobales, RolUsuario, MenuAcceso, RolAcceso} = adminModelInit(sequelize)
		const {  SubCategoriaTransaccion,  CategoriaTransaccion,  Moneda,  TipoMedioDePago,  MedioDePago,  TipoTransaccion,  Transaccion,  TransaccionItem, TransaccionVentaUsuario,  Pago, TransaccionPago,  Caja,
			CuentaCorriente,Impuesto,TransaccionImpuesto, TipoFactura, TransaccionTipoFactura, ListaDeMontos,EstadoCompra,
			  TransaccionCompraEstado,TransaccionCompraItem } = transaccionModelInit(sequelize)
		const { Item, ItemUbicacion, ItemEntidad, ItemNegocio, ItemAtributom, Bom }= itemModelInit(sequelize)
	

		// // SINCRONIZAR TABLAS
		sequelize.sync({ alter: true })
		// //sequelize.sync({ force: true })
		.then(() => {
		console.log('Tablas sincronizadas.');
		});

// INICIALIZACION / SINCRONIZACION DE LA BASE DE DATOS ******************************************************************

		return sequelize; // Retorna la nueva instancia de Sequelize
	  } catch (error) {
		console.error(`Error al conectar a la base de datos ${index}:`, error);
		throw error; // Propaga el error para que pueda ser manejado en el controlador
	  }
}
module.exports = { conexionDB };

*/


