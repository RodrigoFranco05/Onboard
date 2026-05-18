// #########################################################################################################################
// #########################################################################################################################
// PLANTILLA PARA CONTROLLERS RRHH
// #########################################################################################################################
// Este archivo sirve como template para crear nuevos controllers del dominio RRHH
// siguiendo el patrón de 3 capas: Services -> Controllers -> Policies
// #########################################################################################################################
// #########################################################################################################################

// nombreController.js - Controller GENERAL o ESPECIFICO del dominio RRHH

// Imports base (SIEMPRE desde archivos, NO desde index para evitar referencias circulares)
const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
// const { rrhhModelInit } = require("../models/rrhhModel.js")

// Si necesitas modelos de otros dominios, importar directamente
// const { adminModelInit } = require("../../../models/adminModel.js")
// const { transaccionModelInit } = require("../../../models/transaccionModel.js")

// Si es controller especifico, importar funciones desde Index de otros dominios
// const { findEntidadByIdDB } = require("../../adminDomain/adminIndex.js")
// const { createTransaccionDB } = require("../../transaccionDomain/transaccionIndex.js")

// SERVICES
const normalizarTexto = (valor) => String(valor || "").trim()

// CONTROLLERS DB
const pingDominioDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)

  return {
    conectado: Boolean(sequelize),
    dialect: sequelize.getDialect(),
  }
}

// POLICIES
const pingDominio = async (req, res) => {
  try {
    const resultado = await pingDominioDB(req.cookies.tenant, req.cookies.usuario)
    return res.status(200).json(resultado)
  } catch (error) {
    console.error("Error en pingDominio RRHH:", error)
    return res.status(500).json({ message: "Error en pingDominio RRHH", error })
  }
}

module.exports = {
  pingDominio,
  pingDominioDB,
  normalizarTexto,
  Op,
}
