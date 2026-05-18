const { DataTypes } = require('sequelize');
// const sequelize = require('../config/db');
// const {Ubicacion, Negocio, TipoEntidad, Entidad, Usuario} = require('./adminModel.js');
const { adminModelInit } = require('../models/adminModel.js');

function itemModelInit(sequelize){
const existingModels = sequelize.models || {}
const adminModels = adminModelInit(sequelize)
const {Ubicacion, Negocio, TipoEntidad, Entidad, Usuario} = adminModels

if (
  existingModels.Item &&
  existingModels.ItemAtributo &&
  existingModels.ItemEntidad &&
  existingModels.ItemNegocio &&
  existingModels.ItemUbicacion &&
  existingModels.Bom &&
  existingModels.Lote &&
  existingModels.LoteItemUbicacion &&
  existingModels.LoteTransaccion
) {
  return {
    ...adminModels,
    Item: existingModels.Item,
    ItemAtributo: existingModels.ItemAtributo,
    ItemEntidad: existingModels.ItemEntidad,
    ItemNegocio: existingModels.ItemNegocio,
    ItemUbicacion: existingModels.ItemUbicacion,
    Bom: existingModels.Bom,
    Lote: existingModels.Lote,
    LoteItemUbicacion: existingModels.LoteItemUbicacion,
    LoteTransaccion: existingModels.LoteTransaccion,
  }
}
// ITEM *******************************************************************************************************************************
const Item = sequelize.define('Item', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
  codigo:               { type: DataTypes.STRING, allowNull: false },   
  descripcion:          { type: DataTypes.STRING, allowNull: false },     
  itemDatoAtributo1:    { type: DataTypes.STRING, allowNull: true },       
  itemDatoAtributo2:    { type: DataTypes.STRING, allowNull: true },       
  itemDatoAtributo3:    { type: DataTypes.STRING, allowNull: true }, 
  itemDatoAtributo4:    { type: DataTypes.STRING, allowNull: true }, 
  itemDatoAtributo5:    { type: DataTypes.STRING, allowNull: true }, 
  itemDatoAtributo6:    { type: DataTypes.STRING, allowNull: true },       
  itemDatoAtributo7:    { type: DataTypes.STRING, allowNull: true },       
  itemDatoAtributo8:    { type: DataTypes.STRING, allowNull: true }, 
  itemDatoAtributo9:    { type: DataTypes.STRING, allowNull: true }, 
  itemDatoAtributo10:   { type: DataTypes.STRING, allowNull: true }, 
  codigoScanner:        { type: DataTypes.STRING, allowNull: true }, 
  pluBalanza:           { type: DataTypes.STRING, allowNull: true }, 
  usaGestionLotes:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, comment: 'Indica si este item específico usa gestión de lotes' },
  publicadoEcommerce:   { type: DataTypes.BOOLEAN, defaultValue: false},
  eliminado:            { type: DataTypes.BOOLEAN,  defaultValue: false }
  },
  {    
  tableName: 'item'
});

const ItemAtributo = sequelize.define('ItemAtributo', {
  id:                   { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
  descripcion:          { type: DataTypes.STRING, allowNull: false },     
  eliminado:            { type: DataTypes.BOOLEAN,  defaultValue: false }
  },
  {    
  tableName: 'itemAtributo'
});
  


// ITEM ENTIDAD *******************************************************************************************************************************
const ItemEntidad = sequelize.define('ItemEntidad',{
  idItem:    { type: DataTypes.INTEGER , allowNull: false, references: { model: Item, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  idEntidad: { type: DataTypes.INTEGER, allowNull: false , references: { model: Entidad, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  leadTime:  { type: DataTypes.FLOAT, allowNull: true },
  costo:     { type: DataTypes.FLOAT, allowNull: true },
  eliminado: { type: DataTypes.BOOLEAN,  defaultValue: false }
  },
  {    
  tableName: 'itemEntidad'
  });

// ITEM NEGOCIO *******************************************************************************************************************************
const ItemNegocio = sequelize.define('ItemNegocio',{
  idItem:    { type: DataTypes.INTEGER , allowNull: false, references: { model: Item, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  idNegocio: { type: DataTypes.INTEGER, allowNull: false , references: { model: Negocio, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  eliminado: { type: DataTypes.BOOLEAN,  defaultValue: false }
  },
  {    
  tableName: 'itemNegocio'
});

// ITEM UBICACION
const ItemUbicacion = sequelize.define('ItemUbicacion', {
  idItem:               { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Item, key: 'id' },     primaryKey: true   }, // Clave foránea hacia la tabla Item
  idUbicacion:          { type: DataTypes.INTEGER,     allowNull: false,     references: { model: Ubicacion, key: 'id' },     primaryKey: true   }, // Clave foránea hacia la tabla Ubicacion  
  inventario:           { type: DataTypes.FLOAT,     allowNull: true   },
  //precio:               { type: DataTypes.FLOAT,     allowNull: true   },
  stockMinimo:          { type: DataTypes.FLOAT,     allowNull: true   }, // Campo adicional para stock mínimo
  eliminado:            { type: DataTypes.BOOLEAN,     defaultValue: false   } // Borrado lógico
}, 
{
  tableName: 'itemUbicacion'
});

// BOM / RECETA *******************************************************************************************************************************
const Bom = sequelize.define('Bom',{
  idProductoTerminado:    { type: DataTypes.INTEGER , allowNull: false, references: { model: Item, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  idMateriaPrima: { type: DataTypes.INTEGER, allowNull: false , references: { model: Item, key: 'id' }, primaryKey: true}, // clave foranea y parte de la clave primaria
  cantidad:  { type: DataTypes.FLOAT, allowNull: true },
  eliminado: { type: DataTypes.BOOLEAN,  defaultValue: false }
  },
  {    
  tableName: 'bom'
  });

// LOTE *******************************************************************************************************************************
const Lote = sequelize.define('Lote', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  idItem: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Item, key: 'id' },
    comment: 'Item al que pertenece este lote'
  },
  numeroLote: { 
    type: DataTypes.STRING, 
    allowNull: false,
    comment: 'Número o código del lote (ej: L-20251016-001)'
  },
  fechaFabricacion: { 
    type: DataTypes.DATEONLY, 
    allowNull: true,
    comment: 'Fecha de fabricación/recepción del lote'
  },
  fechaVencimiento: { 
    type: DataTypes.DATEONLY, 
    allowNull: true,
    comment: 'Fecha de vencimiento del lote'
  },
  observaciones: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  eliminado: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  }
}, {
  tableName: 'lote',
  indexes: [
    { fields: ['idItem', 'numeroLote'], unique: true }, // Único por item
    { fields: ['fechaVencimiento'] },
    { fields: ['idItem'] }
  ]
});

// LOTE UBICACION *******************************************************************************************************************************
// Ahora se llama LoteUbicacion ya que el lote ya tiene asociado un item específico
  const LoteItemUbicacion = sequelize.define('LoteItemUbicacion', {
    idLote: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Lote, key: 'id' },
      primaryKey: true
    },
    idUbicacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Ubicacion, key: 'id' },
      primaryKey: true
    },
    stock: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Stock disponible de este lote en esta ubicación'
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'loteItemUbicacion',
    indexes: [
      { fields: ['idLote'] },
      { fields: ['idUbicacion'] }
    ]
  });

  // 🆕 Modelo LoteTransaccion
  // Relaciona qué lotes se usaron en cada transacción
  const LoteTransaccion = sequelize.define('LoteTransaccion', {
    idLote: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Lote, key: 'id' },
      primaryKey: true,
      comment: 'Lote del cual se tomó stock'
    },
    idTransaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      comment: 'Transacción en la que se usó este lote'
    },
    cantidad: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: 'Cantidad vendida de este lote específico'
    },
    eliminado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'loteTransaccion',
    indexes: [
      { fields: ['idTransaccion'] },
      { fields: ['idLote'] }
    ]
  });
 

// Un Item puede ser usado como producto terminado en varias recetas
Item.hasMany(Bom, {
  foreignKey: 'idProductoTerminado',
  as: 'materiasPrimas' // Todas las materias primas que componen este producto
});



// Desde BOM, acceder al producto terminado
Bom.belongsTo(Item, {
  foreignKey: 'idProductoTerminado',
  as: 'productoTerminado'
});

// Desde BOM, acceder a la materia prima
Bom.belongsTo(Item, {
  foreignKey: 'idMateriaPrima',
  as: 'materiaPrima'
});


// Asociaciones
Item.hasMany(ItemEntidad, {
  foreignKey: "idItem",
  as: "itemEntidades", // Alias para la relación
});

ItemEntidad.belongsTo(Item, {
  foreignKey: "idItem",
  as: "item", // Alias para la relación
});

// Relación en el modelo ItemUbicacion
ItemUbicacion.belongsTo(Item, { foreignKey: 'idItem', as: 'item' });
ItemUbicacion.belongsTo(Ubicacion, { foreignKey: 'idUbicacion', as: 'ubicacion' });
// Relación en el modelo Item
Item.hasMany(ItemUbicacion, { foreignKey: 'idItem' });

// Relación en el modelo Ubicacion
Ubicacion.hasMany(ItemUbicacion, { foreignKey: 'idUbicacion' });

// Relaciones de Lote
// Un Item tiene muchos Lotes
Item.hasMany(Lote, { foreignKey: 'idItem', as: 'lotes' });
Lote.belongsTo(Item, { foreignKey: 'idItem', as: 'item' });

// Un Lote tiene stock en muchas Ubicaciones
Lote.hasMany(LoteItemUbicacion, { foreignKey: 'idLote', as: 'ubicaciones' });
LoteItemUbicacion.belongsTo(Lote, { foreignKey: 'idLote', as: 'lote' });

// Una Ubicacion tiene muchos Lotes con stock
Ubicacion.hasMany(LoteItemUbicacion, { foreignKey: 'idUbicacion', as: 'lotesUbicacion' });
LoteItemUbicacion.belongsTo(Ubicacion, { foreignKey: 'idUbicacion', as: 'ubicacion' });

// Relaciones de LoteTransaccion
// Un Lote puede estar en muchas Transacciones
Lote.hasMany(LoteTransaccion, { foreignKey: 'idLote', as: 'transacciones' });
LoteTransaccion.belongsTo(Lote, { foreignKey: 'idLote', as: 'lote' });

// Una Transacción puede usar muchos Lotes (se asociará desde transaccionModel)
// LoteTransaccion.belongsTo(Transaccion, { foreignKey: 'idTransaccion', as: 'transaccion' });

return {
  ...adminModels,
  Item,
  ItemUbicacion,
  ItemEntidad,
  ItemNegocio,
  ItemAtributo,
  Bom,
  Lote,
  LoteItemUbicacion,
  LoteTransaccion,
}
}

// module.exports =  { Item, ItemUbicacion, ItemEntidad, ItemNegocio, ItemAtributo };
module.exports = {itemModelInit}
