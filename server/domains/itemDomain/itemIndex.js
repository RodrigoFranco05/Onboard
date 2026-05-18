// itemIndex.js - Punto de entrada del dominio Item
// Exporta modelos, conexión y funciones reutilizables de controllers

const { Op } = require("sequelize")
const { conexionDB } = require("../../config/db.js")
const { itemModelInit } = require("../../models/itemModel.js")

// Importar funciones reutilizables del controller general
const {
  // Controllers DB
  findItemByIdDB,
  findItemsByConditionsDB,
  // Services
  normalizarPLU,
  detectScannerInput,
  parseCodigoBalanza,
  buildSearchWhereConditions,
} = require("./controllers/itemController.js")

module.exports = {
  // Base (operadores Sequelize, conexión y modelos)
  Op,
  conexionDB,
  itemModelInit,

  // CONTROLLERS: Funciones de acceso a DB (para reutilizar en otros dominios/controllers)
  findItemByIdDB,
  findItemsByConditionsDB,

  // SERVICES: Funciones puras (para reutilizar en cualquier parte)
  normalizarPLU,
  detectScannerInput,
  parseCodigoBalanza,
  buildSearchWhereConditions,
}
