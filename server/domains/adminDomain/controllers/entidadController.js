// entidadController.js - Controller GENERAL del dominio Admin
// Contiene lógica reutilizable de entidades (clientes, proveedores, etc.)

const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS
// Funciones puras, sin side effects, reutilizables

/**
 * Parsear tipos de entidad desde query params
 */
const parseTiposEntidad = (tipoEntidad) => {
  if (!tipoEntidad) return []

  return Array.isArray(tipoEntidad)
    ? tipoEntidad.map((t) => parseInt(t, 10))
    : tipoEntidad.split(",").map((t) => parseInt(t.trim(), 10))
}

/**
 * Construir whereClause para búsqueda de entidades
 */
const buildSearchWhereClause = (search, tipos) => ({
  [Op.and]: [
    ...(tipos.length > 0 ? [{ idTipoEntidad: { [Op.in]: tipos } }] : []),
    {
      [Op.or]: [
        { descripcion: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { dniCuitCuil: { [Op.iLike]: `%${search}%` } },
      ],
    },
  ],
})

/**
 * Construir includes de atributos (1 a 10)
 */
const buildAtributosIncludes = (EntidadAtributoClasificacion) => {
  const includes = []
  for (let i = 1; i <= 10; i++) {
    includes.push({
      model: EntidadAtributoClasificacion,
      as: `opcionAtributo${i}`,
      attributes: ["id", "descripcion"],
      required: false,
    })
  }
  return includes
}

/**
 * Agregar include de TipoEntidad si aplican filtros verEnCaja/verEnGasto
 */
const addTipoEntidadInclude = (includes, TipoEntidad, verEnCaja, verEnGasto) => {
  if (verEnCaja !== "true" && verEnGasto !== "true") return includes

  const whereCondition = {}
  if (verEnCaja === "true") whereCondition.verEnCaja = true
  if (verEnGasto === "true") whereCondition.verEnGasto = true

  includes.push({
    model: TipoEntidad,
    as: "tipoEntidad",
    required: true,
    where: whereCondition,
    attributes: [],
  })

  return includes
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// CONTROLLER: ACCESO A LA BASE
// Funciones que acceden a DB, reciben tenant/usuario, retornan datos puros

/**
 * Buscar entidad por ID con todos sus atributos
 */
const findEntidadByIdDB = async (tenant, usuario, idEntidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, EntidadAtributoClasificacion } = adminModelInit(sequelize)

  return await Entidad.findOne({
    where: { id: idEntidad },
    include: [
      { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"] },
      { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"] },
    ],
  })
}

/**
 * Buscar entidades con whereClause e includes dinámicos
 */
const findEntidadesDB = async (tenant, usuario, whereClause, includeOptions) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad } = adminModelInit(sequelize)

  return await Entidad.findAll({
    where: whereClause,
    ...(includeOptions.length > 0 && { include: includeOptions }),
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
 * Obtener entidad por ID (endpoint público)
 */
const getEntidadByID = async (req, res) => {
  const { idEntidad } = req.params

  try {
    // CONTROLLER: Buscar entidad
    const entidadFilter = await findEntidadByIdDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idEntidad
    )

    if (!entidadFilter) {
      return res.status(404).json({ message: "Entidad no encontrada" })
    }

    return res.status(200).json(entidadFilter)
  } catch (error) {
    console.error("Error en la consulta de Entidad:", error)
    return res.status(500).json({ message: "Error al obtener Entidad", error })
  }
}

/**
 * Buscar entidades por término (mínimo 3 letras) (endpoint público)
 */
const getEntidadClienteTresLetras = async (req, res) => {
  const { search, tipoEntidad, verEnCaja, verEnGasto } = req.query

  // Validación de entrada
  if (!search || search.length < 3) {
    return res.status(400).json({
      message: "El término de búsqueda debe tener al menos 3 letras.",
    })
  }

  try {
    // Obtener modelos (necesarios para services)
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { EntidadAtributoClasificacion, TipoEntidad } = adminModelInit(sequelize)

    // SERVICE: Parsear tipos de entidad
    const tipos = parseTiposEntidad(tipoEntidad)

    // SERVICE: Construir whereClause
    const whereClause = buildSearchWhereClause(search, tipos)

    // SERVICE: Construir includes base (atributos 1-10)
    let includeOptions = buildAtributosIncludes(EntidadAtributoClasificacion)

    // SERVICE: Agregar include de TipoEntidad si aplica
    includeOptions = addTipoEntidadInclude(includeOptions, TipoEntidad, verEnCaja, verEnGasto)

    // CONTROLLER: Ejecutar búsqueda en DB
    const entidades = await findEntidadesDB(
      req.cookies.tenant,
      req.cookies.usuario,
      whereClause,
      includeOptions
    )

    return res.status(200).json(entidades)
  } catch (error) {
    console.error("Error al buscar entidades:", error)
    return res.status(500).json({ message: "Error al obtener entidades", error })
  }
}

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
  getEntidadByID,
  getEntidadClienteTresLetras,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  findEntidadByIdDB,
  findEntidadesDB,

  // SERVICES (para reutilizar en cualquier parte)
  parseTiposEntidad,
  buildSearchWhereClause,
  buildAtributosIncludes,
  addTipoEntidadInclude,
}
