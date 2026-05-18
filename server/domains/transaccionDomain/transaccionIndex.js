// transaccionIndex.js - Punto de entrada del dominio Transacción
// Exporta modelos, conexión y funciones reutilizables de controllers

const { conexionDB } = require("../../config/db.js")
const { transaccionModelInit } = require("../../models/transaccionModel.js")

// Importar funciones reutilizables del controller general
const {
  // Controllers DB
  createTransaccionDB,
  createTransaccionItemDB,
  descontarStockLoteDB,
  createLoteTransaccionDB,
  descontarInventarioTotalDB,
  findListaMontosByIdsDB,
  findTop10ItemsVentasDB,
  findLoteItemUbicacionDB,
  // Services
  truncarMonto,
  validarLoteData,
  parseLoteData,
  calcularNuevoInventario,
} = require("./controllers/transaccionController.js")

module.exports = {
  // Base (modelos y conexión)
  conexionDB,
  transaccionModelInit,

  // CONTROLLERS: Funciones de acceso a DB (para reutilizar en otros dominios/controllers)
  createTransaccionDB,
  createTransaccionItemDB,
  descontarStockLoteDB,
  createLoteTransaccionDB,
  descontarInventarioTotalDB,
  findListaMontosByIdsDB,
  findTop10ItemsVentasDB,
  findLoteItemUbicacionDB,

  // SERVICES: Funciones puras (para reutilizar en cualquier parte)
  truncarMonto,
  validarLoteData,
  parseLoteData,
  calcularNuevoInventario,
}
