// rrhhIndex.js - Punto de entrada del dominio RRHH
// Exporta conexión y funciones reutilizables del dominio

const { Op } = require("sequelize")
const { conexionDB } = require("../../config/db.js")
const { rrhhModelInit } = require("./models/rrhhModel.js")

const {
  // Controllers DB
  resolveRrhhDomainDB,
  // Services
  buildRrhhModulesCatalog,
  normalizarPeriodoMensual,
} = require("./controllers/rrhhController.js")

const {
  findEmpleadoByIdDB,
  findEmpleadosDB,
  findContratosEmpleadoDB,
  buildLegajoDefault,
  seleccionarContratoVigente,
} = require("./controllers/empleadoController.js")

const {
  findTurnoByIdDB,
  findTurnosDB,
  findAsignacionesTurnoByEmpleadoDB,
} = require("./controllers/turnoController.js")

const {
  findLiquidacionesDB,
  findLiquidacionByIdDB,
  findNovedadesLiquidacionDB,
} = require("./controllers/liquidacionController.js")

const {
  buildReporteResumenDB,
} = require("./controllers/reporteController.js")

module.exports = {
  // Base (operadores y conexión)
  Op,
  conexionDB,
  rrhhModelInit,

  // CONTROLLERS: Funciones de acceso a DB (para reutilizar en otros dominios/controllers)
  resolveRrhhDomainDB,
  findEmpleadoByIdDB,
  findEmpleadosDB,
  findContratosEmpleadoDB,
  findTurnoByIdDB,
  findTurnosDB,
  findAsignacionesTurnoByEmpleadoDB,
  findLiquidacionesDB,
  findLiquidacionByIdDB,
  findNovedadesLiquidacionDB,
  buildReporteResumenDB,

  // SERVICES: Funciones puras (para reutilizar en cualquier parte)
  buildRrhhModulesCatalog,
  normalizarPeriodoMensual,
  buildLegajoDefault,
  seleccionarContratoVigente,
}
