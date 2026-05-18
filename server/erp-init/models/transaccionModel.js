const { DataTypes } = require("sequelize");
// const sequelize = require("../config/db");

const { adminModelInit } = require('../models/adminModel.js');
const { itemModelInit } = require('../models/itemModel.js');

const dayjs = require("dayjs");


// const {  Ubicacion,  Negocio,  TipoEntidad,  Entidad,  Usuario,} = require("./adminModel.js");
// const { Item } = require("./itemModel.js");

function transaccionModelInit(sequelize){
const existingModels = sequelize.models || {}
const adminModels = adminModelInit(sequelize)

if (
  existingModels.CategoriaTransaccion &&
  existingModels.SubCategoriaTransaccion &&
  existingModels.Moneda &&
  existingModels.tipoMedioDePago &&
  existingModels.MedioDePago &&
  existingModels.TipoTransaccion &&
  existingModels.Transaccion &&
  existingModels.Pago &&
  existingModels.TransaccionPago &&
  existingModels.TransaccionItem &&
  existingModels.TransaccionVentaUsuario &&
  existingModels.TransaccionAuditoria &&
  existingModels.Caja &&
  existingModels.CuentaCorriente &&
  existingModels.Impuesto &&
  existingModels.TransaccionImpuesto &&
  existingModels.ImpuestoItem &&
  existingModels.ImpuestoItemTransaccion &&
  existingModels.TipoFactura &&
  existingModels.CondicionIva &&
  existingModels.CondicionIvaEntidad &&
  existingModels.TransaccionTipoFactura &&
  existingModels.ListaDeMontos &&
  existingModels.EstadoCompra &&
  existingModels.TransaccionCompraEstado &&
  existingModels.TransaccionCompraItem
) {
  const itemModels = itemModelInit(sequelize)
  return {
    ...adminModels,
    ...itemModels,
    CategoriaTransaccion: existingModels.CategoriaTransaccion,
    SubCategoriaTransaccion: existingModels.SubCategoriaTransaccion,
    Moneda: existingModels.Moneda,
    TipoMedioDePago: existingModels.tipoMedioDePago,
    MedioDePago: existingModels.MedioDePago,
    TipoTransaccion: existingModels.TipoTransaccion,
    Transaccion: existingModels.Transaccion,
    TransaccionItem: existingModels.TransaccionItem,
    TransaccionVentaUsuario: existingModels.TransaccionVentaUsuario,
    TransaccionAuditoria: existingModels.TransaccionAuditoria,
    Pago: existingModels.Pago,
    TransaccionPago: existingModels.TransaccionPago,
    Caja: existingModels.Caja,
    CuentaCorriente: existingModels.CuentaCorriente,
    Impuesto: existingModels.Impuesto,
    TransaccionImpuesto: existingModels.TransaccionImpuesto,
    ImpuestoItem: existingModels.ImpuestoItem,
    ImpuestoItemTransaccion: existingModels.ImpuestoItemTransaccion,
    TipoFactura: existingModels.TipoFactura,
    CondicionIva: existingModels.CondicionIva,
    CondicionIvaEntidad: existingModels.CondicionIvaEntidad,
    TransaccionTipoFactura: existingModels.TransaccionTipoFactura,
    ListaDeMontos: existingModels.ListaDeMontos,
    EstadoCompra: existingModels.EstadoCompra,
    TransaccionCompraEstado: existingModels.TransaccionCompraEstado,
    TransaccionCompraItem: existingModels.TransaccionCompraItem,
  }
}

const {Ubicacion, Negocio, TipoEntidad, Entidad, Usuario,  } = adminModels
const itemModels = itemModelInit(sequelize)
const { Item, ItemEntidad } = itemModels

// CATEGORIA / SUB CATEGORIA   **************************************************************************************************************************************************************************************************************************************************************
const CategoriaTransaccion = sequelize.define(
  "CategoriaTransaccion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "categoriaTransaccion",
  }
);

const SubCategoriaTransaccion = sequelize.define(
  "SubCategoriaTransaccion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    idCategoriaTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: CategoriaTransaccion, key: "id" },
    },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "subCategoriaTransaccion",
  }
);

// MONEDA   **************************************************************************************************************************************************************************************************************************************************************
const Moneda = sequelize.define(
  "Moneda",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "moneda",
  }
);

// MEDIO DE PAGO   **************************************************************************************************************************************************************************************************************************************************************
const TipoMedioDePago = sequelize.define(
  "tipoMedioDePago",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    verEnCaja: { type: DataTypes.BOOLEAN, defaultValue: false },
    verEnTransaccion: { type: DataTypes.BOOLEAN, defaultValue: false },
    esMultiMoneda: { type: DataTypes.BOOLEAN, defaultValue: false },
    esPagoDiferido: { type: DataTypes.BOOLEAN, defaultValue: false },
    userSelect: { type: DataTypes.BOOLEAN, defaultValue: false },
    afectaCuentaCorriente: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "tipoMedioDePago",
  }
);

const MedioDePago = sequelize.define(
  "MedioDePago",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idTipoMedioDePago: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: TipoMedioDePago, key: "id" },
    },
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "medioDePago",
  }
);


// TRANSACCION **************************************************************************************************************************************************************************************************************************************************************
const TipoTransaccion = sequelize.define(
  "TipoTransaccion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    operacionCuentaCorriente: { type: DataTypes.STRING, allowNull: true },
    operacionCaja: { type: DataTypes.STRING, allowNull: true },
    verEnTransaccion: { type: DataTypes.BOOLEAN, allowNull: true },
    verEnCaja: { type: DataTypes.BOOLEAN, allowNull: true },
    verEnColumna: { type: DataTypes.STRING, allowNull: true },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "tipoTransaccion",
  }
);

const Transaccion = sequelize.define(
  "Transaccion",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    fecha: { type: DataTypes.DATE, allowNull: false }, // fecha donde el usuario indica que sucedio la transaccion. se pueden colocar fechas del pasado
    montoTotal: { type: DataTypes.FLOAT, allowNull: false },
    idTipoTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: TipoTransaccion, key: "id" },
    },
    idEntidad: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Entidad, key: "id" },
    },
    idCategorizacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: SubCategoriaTransaccion, key: "id" },
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Usuario, key: "id" },
    },
    idUbicacion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Ubicacion, key: "id" },
    },
    idNegocio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Negocio, key: "id" },
    },
    montoDescuento: { type: DataTypes.FLOAT, allowNull: true },
    porcentajeDescuento: { type: DataTypes.FLOAT, allowNull: true },
    transaccionAsociada: { type: DataTypes.INTEGER, allowNull: true },
    estado: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
    descripcion: { type: DataTypes.STRING, allowNull: true },
    fechaHoraCreacion: { type: DataTypes.DATE, allowNull: false },
    afectaCuentaCorriente: { type: DataTypes.BOOLEAN, defaultValue: false },
    operacionParaCuentaCorriente: { 
      type: DataTypes.STRING(20), 
      allowNull: true,
      defaultValue: null,
      comment: "Indica qué operación usar para CC: 'operacionCC' (operacionCuentaCorriente) o 'operacionCaja' (operacionCaja). Solo se usa cuando afectaCuentaCorriente = true"
    },
    archivosAdjuntos: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      defaultValue: null,
      comment: "Archivos adjuntos en formato Base64 (JSON string con array de objetos: {nombre, tipo, base64})"
    },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccion",
  }
);

const Pago = sequelize.define(
  "Pago",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    idMoneda: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Moneda, key: "id" },
    },
    cotizacion: { type: DataTypes.FLOAT, allowNull: false },
    idMedioDePago: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: MedioDePago, key: "id" },
    },
    montoTotal: { type: DataTypes.FLOAT, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "pago",
  }
);

const TransaccionPago = sequelize.define(
  "TransaccionPago",
  {
    idTransaccion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: { model: Transaccion, key: "id" },
    },
    idPago: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: { model: Pago, key: "id" },
    },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionPago",
  }
);



const TransaccionItem = sequelize.define(
  "TransaccionItem",
  {
    idTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Transaccion, key: "id" },
      primaryKey: true,
    }, // ID secuencial
    idItem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Item, key: "id" },
      primaryKey: true,
    }, // fecha donde el usuario indica que sucedio la transaccion. se pueden colocar fechas del pasado
    signo: { type: DataTypes.STRING, allowNull: true },
    cantidad: { type: DataTypes.FLOAT, allowNull: false },
    precio: { type: DataTypes.FLOAT, allowNull: false },
    porcentajeDescuento: { type: DataTypes.FLOAT, allowNull: true },
    porcentajeInteres: { type: DataTypes.FLOAT, allowNull: true },
    montoTotal: { type: DataTypes.FLOAT, allowNull: true },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionItem",
  }
);

const TransaccionVentaUsuario = sequelize.define(
  "TransaccionVentaUsuario",
  {
    idTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Transaccion, key: "id" },
      primaryKey: true,
    }, // ID secuencial
    idVendedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Usuario, key: "id" },
      primaryKey: true,
    }, // fecha donde el usuario indica que sucedio la transaccion. se pueden colocar fechas del pasado
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionVentaUsuario",
  }
);

// AUDITORIA TRANSACCION **************************************************************************************************************************************************************************************************************************************************************
const TransaccionAuditoria = sequelize.define(
  "TransaccionAuditoria",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Transaccion, key: "id" },
      primaryKey: true,
      field: "idTransaccion",
    },
    idUsuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Usuario, key: "id" },
      field: "idUsuario",
    },
    comentario: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    accion: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "eliminar",
    },
  },
  {
    tableName: "transaccionAuditoria",
    timestamps: true,
  }
);

// CAJA **************************************************************************************************************************************************************************************************************************************************************
const Caja = sequelize.define(
  "Caja",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    fecha: { type: DataTypes.DATE, allowNull: false },
    montoCierre: { type: DataTypes.FLOAT, allowNull: false },
    idUbicacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Ubicacion, key: "id" },
    },
    idNegocio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Negocio, key: "id" },
    },
    idMedioDePago: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: MedioDePago, key: "id" },
    },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "caja",
  }
);

// CUENTA CORRIENTE **************************************************************************************************************************************************************************************************************************************************************
const CuentaCorriente = sequelize.define(
  "CuentaCorriente",
  {
    idEntidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Entidad, key: "id" },
      primaryKey: true,
    }, // es FK y PK
    saldo: { type: DataTypes.FLOAT, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "cuentaCorriente",
  }
);




// IMPUESTOS **************************************************************************************************************************************************************************************************************************************************************
const Impuesto = sequelize.define(
  "Impuesto",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    porcentaje: { type: DataTypes.FLOAT, allowNull: false },
    incluidoEnPrecio: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "impuesto",
  }
);

const TransaccionImpuesto = sequelize.define(
  "TransaccionImpuesto",
  {
    idTransaccion:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Transaccion, key: 'id' },     primaryKey: true   }, // es FK y PK
    idImpuesto:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Impuesto, key: 'id' },     primaryKey: true   },
    porcentaje: { type: DataTypes.FLOAT, allowNull: false },
    montoTotal: { type: DataTypes.FLOAT, allowNull: true },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionImpuesto",
  }
);

// IMPUESTO ITEM  **************************************************************************************************************************************************************************************************************************************************************
const ImpuestoItem = sequelize.define(
  "ImpuestoItem",
  {
    idItem:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Item, key: 'id' },     primaryKey: true   }, // es FK y PK
    idImpuesto:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Impuesto, key: 'id' },     primaryKey: true   },// es FK y PK
    porcentaje: { type: DataTypes.FLOAT, allowNull: false },   
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "impuestoItem",
  }
);

// IMPUESTO item transaccion  **************************************************************************************************************************************************************************************************************************************************************
const ImpuestoItemTransaccion = sequelize.define(
  "ImpuestoItemTransaccion",
  {
    idTransaccion:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Transaccion, key: 'id' },     primaryKey: true   }, // es FK y PK
    idItem:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Item, key: 'id' },     primaryKey: true   }, // es FK y PK
    idImpuesto:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Impuesto, key: 'id' },     primaryKey: true   },// es FK y PK
    porcentaje: { type: DataTypes.FLOAT, allowNull: false },   
    montoTotal: { type: DataTypes.FLOAT, allowNull: true },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "impuestoItemTransaccion",
  }
);


// FACTURA / TIPO FACTURA  **************************************************************************************************************************************************************************************************************************************************************
const TipoFactura = sequelize.define(
  "TipoFactura",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "tipoFactura",
  }
);

const CondicionIva = sequelize.define(
  "CondicionIva",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "condicionIva",
  }
);

const CondicionIvaEntidad = sequelize.define(
  "CondicionIvaEntidad",
  {
    idCondicionIva: { type: DataTypes.INTEGER,     allowNull: false,     references: { model: CondicionIva, key: 'id' },     primaryKey: true   }, // es FK y PK
    idEntidad:      { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Entidad, key: 'id' },     primaryKey: true   }, // es FK y PK  
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "condicionIvaEntidad",
  }
);

const TransaccionTipoFactura = sequelize.define(
  "TransaccionTipoFactura",
  {
    idTransaccion:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Transaccion, key: 'id' },     primaryKey: true   }, // es FK y PK
    idTipoFactura:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: TipoFactura, key: 'id' },     primaryKey: true   },     // es FK y PK
    idCondicionIva:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: CondicionIva, key: 'id' },     primaryKey: true, defaultValue: 4   },    // es FK y PK
    CAE: { type: DataTypes.STRING, allowNull: true },
    vencimientoCAE: { type: DataTypes.DATE, allowNull: true  },
    numeroFactura: { type: DataTypes.STRING, allowNull: true  },
    puntoVenta: { type: DataTypes.INTEGER, allowNull: true  },
    fechaEmision: { type: DataTypes.STRING, allowNull: true  },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false  },
  },
  {
    tableName: "transaccionTipoFactura",
  }
);

//  LISTA DE MONTOS  **************************************************************************************************************************************************************************************************************************************************************
// las entidades pueden ser clientes o proveedores. la lista de precio o costos varia segun la combinacion de item ubicacion entidad.
// un cliente puede tener varios precios en diferentes sucursales. y un proveedor puede tener varios costos para diferentes sucursales.

const ListaDeMontos = sequelize.define(
  "ListaDeMontos",
  {
    fecha: { type: DataTypes.DATE, allowNull: false ,     primaryKey: true},
    idItem: { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Item, key: 'id', }, primaryKey: true }, // es FK y PK
    idUbicacion: { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Ubicacion, key: 'id' },  primaryKey: true   }, // es FK y PK
    idEntidad: { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Entidad, key: 'id' },  primaryKey: true   }, // es FK y PK     PROVEEDOR O CLIENTE.
    monto: { type: DataTypes.FLOAT, allowNull: true },
    margenGanancia: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null, comment: 'Margen de ganancia (%) asociado a este costo de proveedor' },
    esProveedorReferente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Indica que este costo es el referente para calcular precio por (item, ubicacion)' },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "listaDeMontos",
  }
);


// MODELOS PARA FLUJO TRANSACCION COMPRA: **************************************************************************************************************************************************************************************************************************************************************

const EstadoCompra = sequelize.define(
  "EstadoCompra",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "estadoCompra",
  }
);


const TransaccionCompraEstado = sequelize.define(
  "TransaccionCompraEstado",
  {
    idTransaccion:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Transaccion, key: 'id' },     primaryKey: true   }, // es FK y PK
    idEstado:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: EstadoCompra, key: 'id' }   },    
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionCompraEstado",
  }
);

const TransaccionCompraItem = sequelize.define(
  "TransaccionCompraItem",
  {
    fecha: { type: DataTypes.DATE, allowNull: false ,     primaryKey: true},
    idTransaccion:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Transaccion, key: 'id' },     primaryKey: true   }, // es FK y PK
    idItem:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Item, key: 'id' },     primaryKey: true   },    // es FK y PK
    cantidadRecibida: { type: DataTypes.FLOAT, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "transaccionCompraItem",
  }
);





// En el modelo Transaccion.js
// Transaccion

/*Se utiliza el modelo SEQUELIZE creando relaciones entre las entidades del sistema.  */


// Relación entre Transaccion y TransaccionPago (1 a muchos)
// Una transacción puede tener múltiples pagos relacionados.
// Transaccion ↔ TransaccionPago
Transaccion.hasMany(TransaccionPago, {
  as: "transaccionPago",
  foreignKey: "idTransaccion",
});
TransaccionPago.belongsTo(Transaccion, {
  as: "transaccion",
  foreignKey: "idTransaccion",
});

// Relación entre Transaccion y TipoTransaccion (1 a 1)
// Una transacción pertenece a un tipo específico (ej., Venta, Compra).
Transaccion.belongsTo(TipoTransaccion, {
  foreignKey: "idTipoTransaccion",  // Llave foránea en TransaccionPago que referencia a Transaccion.
  as: "tipoTransaccion", // Nombre del alias para acceder a los pagos de una transacción.
});

TipoTransaccion.hasMany(Transaccion, {
  foreignKey: "idTipoTransaccion",
  as: "transacciones",
});
// Pago
Pago.hasMany(TransaccionPago, { as: "transacciones", foreignKey: "idPago" });
TransaccionPago.belongsTo(Pago, { as: "pago", foreignKey: "idPago" });
Pago.belongsTo(MedioDePago, { as: "medioDePago", foreignKey: "idMedioDePago" });

// MedioDePago
MedioDePago.hasMany(Pago, { as: "pagos", foreignKey: "idMedioDePago" });
MedioDePago.belongsTo(TipoMedioDePago, {
  as: "tipoMedioDePago",
  foreignKey: "idTipoMedioDePago",
});

Caja.belongsTo(MedioDePago, { as: "medioDePago", foreignKey: "idMedioDePago" });
MedioDePago.hasMany(Caja, { as: "cajas", foreignKey: "idMedioDePago" });

// TipoMedioDePago
TipoMedioDePago.hasMany(MedioDePago, {
  as: "mediosDePago",
  foreignKey: "idTipoMedioDePago",
});

// Define la relación en el modelo
TipoMedioDePago.hasMany(MedioDePago, { foreignKey: "idTipoMedioDePago" });

// Define la relación en el modelo
MedioDePago.belongsTo(TipoMedioDePago, {
  foreignKey: "idTipoMedioDePago",
  as: "tipo",
});


// Relación
CuentaCorriente.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" });
Entidad.hasOne(CuentaCorriente, { foreignKey: "idEntidad", as: "cuentaCorriente" });

Transaccion.hasMany(TransaccionImpuesto, { foreignKey: 'idTransaccion', as: 'transaccionImpuesto' });
TransaccionImpuesto.belongsTo(Impuesto, { foreignKey: 'idImpuesto', as: 'impuesto' });

Transaccion.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" });
Entidad.hasMany(Transaccion, { foreignKey: 'idEntidad', as: 'Transacciones' });

Transaccion.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(Transaccion, { foreignKey: 'idUsuario', as: 'transacciones' });

// Relaciones para TransaccionAuditoria
Transaccion.hasMany(TransaccionAuditoria, { foreignKey: 'idTransaccion', as: 'auditorias' });
TransaccionAuditoria.belongsTo(Transaccion, { foreignKey: 'idTransaccion', as: 'transaccion' });
TransaccionAuditoria.belongsTo(Usuario, { foreignKey: 'idUsuario', as: 'usuario' });
Usuario.hasMany(TransaccionAuditoria, { foreignKey: 'idUsuario', as: 'transaccionesAuditoria' });

Transaccion.belongsTo(Ubicacion, { foreignKey: 'idUbicacion', as: 'ubicacion' });
Ubicacion.hasMany(Transaccion, { foreignKey: 'idUbicacion', as: 'transacciones' });

Transaccion.belongsTo(Negocio, { foreignKey: 'idNegocio', as: 'negocio' });
Negocio.hasMany(Transaccion, { foreignKey: 'idNegocio', as: 'transacciones' });


// RELACIONES ENTRE MODELOS PARA TRANSACCION **************************************************************************************************************************************************************************************************************************************************************
// En tu modelo TransaccionItem, luego de definir el modelo:
TransaccionItem.belongsTo(Item, {
  foreignKey: "idItem", // La columna que actúa como FK en TransaccionItem
  as: "item", // Alias que usás para incluir la información del Item
});

// Opcionalmente, en el modelo Item:
Item.hasMany(TransaccionItem, {
  foreignKey: "idItem",
  as: "transaccionItems",
});

Transaccion.hasOne(TransaccionTipoFactura, {
  as: 'transaccionTipoFactura',
  foreignKey: 'idTransaccion',
});

TransaccionItem.belongsTo(Transaccion, {
  foreignKey: 'idTransaccion',
  targetKey: 'id',
});

Transaccion.hasMany(TransaccionItem, { foreignKey: "idTransaccion", as: "TransaccionItems" });


TransaccionTipoFactura.belongsTo(Transaccion, {
  foreignKey: 'idTransaccion',
});

// Si quieres obtener los datos de TipoFactura:
TransaccionTipoFactura.belongsTo(TipoFactura, {
  as: 'tipoFactura',
  foreignKey: 'idTipoFactura',
});

TipoFactura.hasMany(TransaccionTipoFactura, {
  foreignKey: 'idTipoFactura',
});


// Asociación entre Item y ListaDeMontos
Item.hasMany(ListaDeMontos, { as: "listaMontos", foreignKey: "idItem" });
ListaDeMontos.belongsTo(Item, { as: "item", foreignKey: "idItem" });

// Asociación entre Ubicacion y ListaDeMontos
Ubicacion.hasMany(ListaDeMontos, { as: "listaMontos", foreignKey: "idUbicacion" });
ListaDeMontos.belongsTo(Ubicacion, { as: "ubicacion", foreignKey: "idUbicacion" });

// En transaccionModelInit (o donde definas la asociación)
ListaDeMontos.belongsTo(Entidad, {
  as: "entidad",
  foreignKey: "idEntidad",
});
Entidad.hasMany(ListaDeMontos, {
  as: "listaMontos",
  foreignKey: "idEntidad",
});

// Asociación: Una Transaccion tiene un registro en TransaccionCompraEstado
Transaccion.hasOne(TransaccionCompraEstado, { 
  as: 'transaccionCompraEstado', 
  foreignKey: 'idTransaccion' 
});

// Asociación: TransaccionCompraEstado pertenece a un EstadoCompra
TransaccionCompraEstado.belongsTo(EstadoCompra, { 
  as: 'estadoCompra', 
  foreignKey: 'idEstado' 
});


// 1. Una categoría tiene muchas subcategorías
CategoriaTransaccion.hasMany(SubCategoriaTransaccion, {
  foreignKey: "idCategoriaTransaccion",
  as: "subCategorias",
});

// 2. Cada subcategoría pertenece a una categoría
SubCategoriaTransaccion.belongsTo(CategoriaTransaccion, {
  foreignKey: "idCategoriaTransaccion",
  as: "categoria",
});

// 3. Cada Transaccion apunta a una SubCategoria (campo idCategorizacion)
Transaccion.belongsTo(SubCategoriaTransaccion, {
  foreignKey: "idCategorizacion",
  as: "subCategoria",
});

// Asociaciones para ImpuestoItem
ImpuestoItem.belongsTo(Item, {
  foreignKey: "idItem",
  as: "item",
});

Item.hasMany(ImpuestoItem, {
  foreignKey: "idItem",
  as: "impuestoItems",
});

ImpuestoItem.belongsTo(Impuesto, {
  foreignKey: "idImpuesto",
  as: "impuesto",
});

Impuesto.hasMany(ImpuestoItem, {
  foreignKey: "idImpuesto",
  as: "impuestoItems",
});

// Asociaciones para CondicionIvaEntidad
CondicionIvaEntidad.belongsTo(CondicionIva, {
  foreignKey: "idCondicionIva",
  as: "condicionIva",
});

CondicionIva.hasMany(CondicionIvaEntidad, {
  foreignKey: "idCondicionIva",
  as: "condicionIvaEntidades",
});

CondicionIvaEntidad.belongsTo(Entidad, {
  foreignKey: "idEntidad",
  as: "entidad",
});

Entidad.hasMany(CondicionIvaEntidad, {
  foreignKey: "idEntidad",
  as: "condicionIvaEntidades",
});



return {
  ...adminModels,
  ...itemModels,
  SubCategoriaTransaccion,
  CategoriaTransaccion,
  Moneda,
  TipoMedioDePago,
  MedioDePago,
  TipoTransaccion,
  Transaccion,
  TransaccionItem,
  TransaccionVentaUsuario,
  TransaccionAuditoria,
  Pago,
  TransaccionPago,
  Caja,
  CuentaCorriente,
  Impuesto,
  TransaccionImpuesto,
  ImpuestoItem,
  ImpuestoItemTransaccion,
  TipoFactura,
  CondicionIva,
  CondicionIvaEntidad,
  TransaccionTipoFactura,
  ListaDeMontos,
  EstadoCompra,
  TransaccionCompraEstado,
  TransaccionCompraItem,
};

}

// module.exports = {  SubCategoriaTransaccion,  CategoriaTransaccion,  Moneda,  TipoMedioDePago,  MedioDePago,  TipoTransaccion,  Transaccion,  TransaccionItem, TransaccionVentaUsuario,  Pago, TransaccionPago,  Caja,
//   CuentaCorriente,
//   Impuesto,
//   TransaccionImpuesto,
// };

module.exports = {transaccionModelInit}
