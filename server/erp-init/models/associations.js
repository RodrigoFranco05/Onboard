function definirAsociaciones({ Item, ListaDeMontos }) {
  console.log("Definiendo asociaciones entre Item y ListaDeMontos");
  Item.hasMany(ListaDeMontos, { foreignKey: 'idItem', as: 'listaMontos' });
  console.log("Item associations after hasMany:", Item.associations);
}

function definirAsociacionesItemUbicaciones({ Item, ItemUbicacion }) {
  // Relación en el modelo ItemUbicacion
  //ItemUbicacion.belongsTo(Item, { foreignKey: 'idItem', as: 'item' });
  // Relación en el modelo Item
  console.log("Definiendo asociaciones entre Item y ItemUbicacion");
  Item.hasMany(ItemUbicacion, { foreignKey: 'idItem', as : 'ItemUbicacion' });  //np lee esta linea en item comtroler, pero la linea anterior si, no se por que, pro eso de define nuevamente aca.
  console.log("Item associations after hasMany:", Item.associations);
}

module.exports = { definirAsociaciones,definirAsociacionesItemUbicaciones };