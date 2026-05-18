// adminIndex.js - Punto de entrada del dominio Admin
// Exporta modelos, conexión y funciones reutilizables de controllers

const { Op } = require("sequelize")
const { conexionDB } = require("../../config/db.js")
const { adminModelInit } = require("../../models/adminModel.js")

// Importar funciones reutilizables de controllers generales
const {
  // Controllers DB
  findUbicacionesDB,
  findNegociosDB,
} = require("./controllers/adminController.js")

const {
  // Controllers DB
  findEntidadByIdDB,
  findEntidadesDB,
  // Services
  parseTiposEntidad,
  buildSearchWhereClause,
  buildAtributosIncludes,
  addTipoEntidadInclude,
} = require("./controllers/entidadController.js")

module.exports = {
  // Base (operadores Sequelize, conexión y modelos)
  Op,
  conexionDB,
  adminModelInit,

  // CONTROLLERS: Funciones de acceso a DB (para reutilizar en otros dominios/controllers)
  findUbicacionesDB,
  findNegociosDB,
  findEntidadByIdDB,
  findEntidadesDB,

  // SERVICES: Funciones puras (para reutilizar en cualquier parte)
  parseTiposEntidad,
  buildSearchWhereClause,
  buildAtributosIncludes,
  addTipoEntidadInclude,
}
