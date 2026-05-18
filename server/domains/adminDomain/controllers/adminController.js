// adminController.js - Controller GENERAL del dominio Admin
// Contiene lógica reutilizable de administración (ubicaciones, negocios, etc.)

const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const legacyAdminController = require("../../../controllers/adminController.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS
// Funciones puras, sin side effects, reutilizables

// (No hay services necesarios por ahora en este controller)

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// CONTROLLER: ACCESO A LA BASE
// Funciones que acceden a DB, reciben tenant/usuario, retornan datos puros

/**
 * Buscar todas las ubicaciones activas
 */
const findUbicacionesDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Ubicacion } = adminModelInit(sequelize)

  return await Ubicacion.findAll({
    where: {
      [Op.or]: [{ eliminado: false }, { eliminado: null }],
    },
  })
}

/**
 * Buscar todos los negocios activos
 */
const findNegociosDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Negocio } = adminModelInit(sequelize)

  return await Negocio.findAll({
    where: {
      [Op.or]: [{ eliminado: false }, { eliminado: null }],
    },
  })
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// POLICY: LOGICA DE NEGOCIO
// Funciones que reciben req/res, orquestan services y controllers

/**
 * Obtener ubicaciones (endpoint público)
 */
const getUbicacion = async (req, res) => {
  try {
    // CONTROLLER: Buscar ubicaciones
    const ubicacion = await findUbicacionesDB(req.cookies.tenant, req.cookies.usuario)

    res.status(200).json(ubicacion)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ubicacion", error })
  }
}

/**
 * Obtener negocios (endpoint público)
 */
const getNegocio = async (req, res) => {
  try {
    // CONTROLLER: Buscar negocios
    const negocio = await findNegociosDB(req.cookies.tenant, req.cookies.usuario)

    res.status(200).json(negocio)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Negocio", error })
  }
}

/**
 * Wrappers de compatibilidad: reutilizan policies legacy mientras se migra a dominio
 */
const getTipoEntidad = async (req, res) => legacyAdminController.getTipoEntidad(req, res)
const getUsuario = async (req, res) => legacyAdminController.getUsuario(req, res)
const getParametrosGlobales = async (req, res) => legacyAdminController.getParametrosGlobales(req, res)
const getIncluirImpuestos = async (req, res) => legacyAdminController.getIncluirImpuestos(req, res)

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// EXPORTS
// Controller GENERAL: exporta policies, controllers y services reutilizables

module.exports = {
  // POLICIES (para routes Y para controllers específicos)
  getUbicacion,
  getNegocio,
  getTipoEntidad,
  getUsuario,
  getParametrosGlobales,
  getIncluirImpuestos,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  findUbicacionesDB,
  findNegociosDB,

  // SERVICES (para reutilizar en cualquier parte)
  // (ninguno por ahora)
}
