// itemController.js - Controller GENERAL del dominio Item
// Contiene lógica reutilizable de items/productos (búsqueda, scanner, balanza, etc.)

const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { itemModelInit } = require("../../../models/itemModel.js")
const legacyItemController = require("../../../controllers/itemController.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS
// Funciones puras, sin side effects, reutilizables

/**
 * Normalizar PLU eliminando ceros a la izquierda
 */
const normalizarPLU = (plu) => {
  return String(plu).replace(/^0+/, "")
}

/**
 * Detectar si el input es de tipo scanner (solo dígitos)
 */
const detectScannerInput = (search) => {
  return /^\d+$/.test(search)
}

/**
 * Parsear código de balanza (formato: 20 + 5 dígitos PLU + 5 dígitos peso)
 */
const parseCodigoBalanza = (search) => {
  if (!search.startsWith("20") || search.length < 12) {
    return null
  }

  const pluBalanza = search.substring(2, 7) // 5 dígitos del PLU
  const pesoEnGramos = parseInt(search.substring(7, 12)) // 5 dígitos del peso
  const pesoBalanza = pesoEnGramos / 1000 // Convertir gramos a kilogramos

  return {
    pluNormalizado: normalizarPLU(pluBalanza),
    pesoBalanza,
    pluOriginal: pluBalanza,
  }
}

/**
 * Construir whereConditions según el tipo de búsqueda
 */
const buildSearchWhereConditions = (search) => {
  const isScannerInput = detectScannerInput(search)

  let result = {
    whereConditions: {},
    metadata: {
      buscadoPorScanner: false,
      buscadoPorBalanza: false,
      pesoBalanza: null,
    },
  }

  if (isScannerInput) {
    // Verificar si es código de balanza
    const balanzaData = parseCodigoBalanza(search)

    if (balanzaData) {
      // ESCENARIO A: Código de balanza (20 + PLU + peso)
      result.whereConditions = {
        pluBalanza: balanzaData.pluNormalizado,
        eliminado: false,
      }
      result.metadata = {
        buscadoPorScanner: true,
        buscadoPorBalanza: true,
        pesoBalanza: balanzaData.pesoBalanza,
      }
    } else {
      // ESCENARIO B: Código de scanner normal
      result.whereConditions = {
        codigoScanner: search,
        eliminado: false,
      }
      result.metadata.buscadoPorScanner = true
    }
  } else if (search.startsWith("PLU:")) {
    // ESCENARIO C: Búsqueda directa por PLU (prefijo "PLU:")
    const pluBalanza = search.substring(4)
    result.whereConditions = {
      pluBalanza: normalizarPLU(pluBalanza),
      eliminado: false,
    }
    result.metadata.buscadoPorBalanza = true
  } else {
    // ESCENARIO D: Búsqueda libre (descripción o código)
    result.whereConditions = {
      [Op.or]: [
        { descripcion: { [Op.iLike]: `%${search}%` } },
        { codigo: { [Op.iLike]: `%${search}%` } },
      ],
      eliminado: false,
    }
  }

  return result
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
 * Buscar item por ID
 */
const findItemByIdDB = async (tenant, usuario, id) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Item } = itemModelInit(sequelize)

  return await Item.findByPk(id)
}

/**
 * Buscar items con whereConditions específicas
 */
const findItemsByConditionsDB = async (tenant, usuario, whereConditions) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Item } = itemModelInit(sequelize)

  return await Item.findAll({
    where: whereConditions,
    raw: true,
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
 * Obtener item por ID (endpoint público)
 */
const getItemById = async (req, res) => {
  const { id } = req.params

  try {
    // CONTROLLER: Buscar item
    const itemById = await findItemByIdDB(req.cookies.tenant, req.cookies.usuario, id)

    if (!itemById) {
      return res.status(404).json({ message: "Item no encontrado" })
    }

    res.status(200).json(itemById)
  } catch (error) {
    console.error("Error en getItemById:", error)
    res.status(500).json({ message: "Error al obtener item", error: error.message })
  }
}

/**
 * Buscar items por término (mínimo 3 letras) con detección de scanner/balanza (endpoint público)
 */
const getItemTresLetras = async (req, res) => {
  const { search } = req.query

  // Validación de entrada
  if (!search || search.length < 3) {
    return res.status(400).json({ message: "El termino de busqueda debe tener al menos 3 letras." })
  }

  try {
    // SERVICE: Construir whereConditions y metadata según tipo de búsqueda
    const { whereConditions, metadata } = buildSearchWhereConditions(search)

    // Log para debugging de códigos de balanza
    if (metadata.buscadoPorBalanza && metadata.pesoBalanza) {
      console.log(`Codigo de balanza detectado: Peso=${metadata.pesoBalanza}kg`)
    }

    // CONTROLLER: Buscar items en DB
    const items = await findItemsByConditionsDB(
      req.cookies.tenant,
      req.cookies.usuario,
      whereConditions
    )

    res.status(200).json({
      items,
      ...metadata,
    })
  } catch (error) {
    console.error("Error al buscar items:", error)
    res.status(500).json({ message: "Error al obtener items", error })
  }
}

/**
 * Wrappers de compatibilidad: reutilizan policies legacy mientras se migra a dominio
 */
const getItemUbicacionFilterByUbicacion = async (req, res) =>
  legacyItemController.getItemUbicacionFilterByUbicacion(req, res)
const getItemAtributoNoEliminados = async (req, res) =>
  legacyItemController.getItemAtributoNoEliminados(req, res)
const putItemUbicacion = async (req, res) => legacyItemController.putItemUbicacion(req, res)
const getImpuestoItem = async (req, res) => legacyItemController.getImpuestoItem(req, res)
const updateImpuestoItem = async (req, res) => legacyItemController.updateImpuestoItem(req, res)
const getLoteMasAntiguoConStock = async (req, res) =>
  legacyItemController.getLoteMasAntiguoConStock(req, res)
const descontarStockVenta = async (req, res) => legacyItemController.descontarStockVenta(req, res)
const getSugerenciaLotesVenta = async (req, res) =>
  legacyItemController.getSugerenciaLotesVenta(req, res)
const getLotesDisponiblesVenta = async (req, res) =>
  legacyItemController.getLotesDisponiblesVenta(req, res)

/**
 * Obtener valores únicos de un atributo de ítems, ordenados por recencia (últimos creados primero)
 * Útil para autocomplete con sugerencias recientes al enfocar el campo
 */
const getValoresUnicosAtributoRecientes = async (req, res) => {
  const { campo, searchText, limit } = req.query

  const atributosValidos = [
    "itemDatoAtributo1",
    "itemDatoAtributo2",
    "itemDatoAtributo3",
    "itemDatoAtributo4",
    "itemDatoAtributo5",
    "itemDatoAtributo6",
    "itemDatoAtributo7",
    "itemDatoAtributo8",
    "itemDatoAtributo9",
    "itemDatoAtributo10",
  ]

  if (!campo || !atributosValidos.includes(campo)) {
    return res.status(400).json({
      message: "Campo de atributo inválido",
      camposValidos: atributosValidos,
    })
  }

  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100)

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { Item } = itemModelInit(sequelize)

    const whereCondition = {
      eliminado: false,
      [campo]: { [Op.ne]: null },
    }

    if (searchText && searchText.trim() !== "") {
      whereCondition[campo] = {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.iLike]: `%${searchText.trim()}%` },
        ],
      }
    }

    const items = await Item.findAll({
      attributes: ["id", campo],
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      raw: true,
    })

    const seen = new Set()
    const valoresUnicos = []
    for (const item of items) {
      const valor = item[campo]
      if (valor && valor.trim() !== "" && !seen.has(valor)) {
        seen.add(valor)
        valoresUnicos.push(valor)
      }
    }

    return res.status(200).json({
      valores: valoresUnicos,
      count: valoresUnicos.length,
      campo,
    })
  } catch (error) {
    console.error("Error al obtener valores recientes de atributo:", error)
    return res.status(500).json({
      message: "Error al obtener valores recientes de atributo",
      error: error.message,
    })
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
  getItemById,
  getItemTresLetras,
  getItemUbicacionFilterByUbicacion,
  getItemAtributoNoEliminados,
  putItemUbicacion,
  getImpuestoItem,
  updateImpuestoItem,
  getLoteMasAntiguoConStock,
  descontarStockVenta,
  getSugerenciaLotesVenta,
  getLotesDisponiblesVenta,
  getValoresUnicosAtributoRecientes,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  findItemByIdDB,
  findItemsByConditionsDB,

  // SERVICES (para reutilizar en cualquier parte)
  normalizarPLU,
  detectScannerInput,
  parseCodigoBalanza,
  buildSearchWhereConditions,
}
