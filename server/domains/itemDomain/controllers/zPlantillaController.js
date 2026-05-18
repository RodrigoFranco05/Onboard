// #########################################################################################################################
// #########################################################################################################################
// PLANTILLA PARA CONTROLLERS
// #########################################################################################################################
// Este archivo sirve como template para crear nuevos controllers
// siguiendo el patrón de 3 capas: Services → Controllers → Policies
// #########################################################################################################################
// #########################################################################################################################

// nombreController.js - Controller GENERAL o ESPECÍFICO del dominio
// Descripción breve de la responsabilidad del controller

// Imports base (SIEMPRE desde archivos, NO desde index para evitar referencias circulares)
const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { itemModelInit } = require("../../../models/itemModel.js")

// Si necesitas modelos de otros dominios, importar directamente
// const { adminModelInit } = require("../../../models/adminModel.js")
// const { transaccionModelInit } = require("../../../models/transaccionModel.js")

// Si es controller específico, importar funciones desde Index de otros dominios
// const { findUbicacionesDB } = require("../../adminDomain/adminIndex.js")
// const { createTransaccionDB } = require("../../transaccionDomain/transaccionIndex.js")
// const { findItemByIdDB } = require("../itemIndex.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS
// Funciones puras, sin side effects, reutilizables
// - NO acceden a base de datos
// - NO reciben req/res
// - Validaciones, parseos, transformaciones, cálculos
// - Pueden ser exportadas para reutilización

/**
 * Ejemplo: Validar formato de código de barras
 */
const validarCodigoBarras = (codigo) => {
  return /^\d{12,13}$/.test(codigo)
}

/**
 * Ejemplo: Normalizar código (eliminar espacios y convertir a mayúsculas)
 */
const normalizarCodigo = (codigo) => {
  return String(codigo).trim().toUpperCase()
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// CONTROLLER: ACCESO A LA BASE
// Funciones que acceden a DB, reciben tenant/usuario, retornan datos puros
// - Funciones async que ejecutan queries
// - NO reciben req/res
// - Reciben tenant/usuario como parámetros
// - Retornan datos o null
// - Pueden ser exportadas para reutilización cross-domain

/**
 * Ejemplo: Buscar items activos
 */
const findItemsActivosDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Item } = itemModelInit(sequelize)

  return await Item.findAll({
    where: {
      eliminado: false,
    },
  })
}

/**
 * Ejemplo: Crear item
 */
const createItemDB = async (tenant, usuario, data) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Item } = itemModelInit(sequelize)

  const item = new Item(data)
  await item.save()
  return item
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// POLICY: LOGICA DE NEGOCIO
// Funciones que reciben req/res, orquestan services y controllers
// - Manejan request/response de Express
// - Validan entrada (req.body, req.params, req.query)
// - Llaman a services para transformaciones
// - Llaman a controllers para acceso a DB
// - Orquestan lógica de negocio compleja
// - Manejan errores y respuestas HTTP
// - Solo estas se exportan a las rutas

/**
 * Ejemplo: Endpoint para crear item
 */
const crearItem = async (req, res) => {
  const { codigo, descripcion } = req.body

  // Validación de entrada
  if (!codigo || !descripcion) {
    return res.status(400).json({ message: "Código y descripción son requeridos" })
  }

  // SERVICE: Validar y normalizar
  const codigoNormalizado = normalizarCodigo(codigo)

  try {
    // CONTROLLER: Crear en DB
    const item = await createItemDB(req.cookies.tenant, req.cookies.usuario, {
      ...req.body,
      codigo: codigoNormalizado,
    })

    res.status(201).json(item)
  } catch (error) {
    console.error("Error al crear item:", error)
    res.status(500).json({ message: "Error al crear item", error })
  }
}

/**
 * Ejemplo: Endpoint para listar items
 */
const listarItems = async (req, res) => {
  try {
    // CONTROLLER: Buscar en DB
    const items = await findItemsActivosDB(req.cookies.tenant, req.cookies.usuario)

    res.status(200).json(items)
  } catch (error) {
    console.error("Error al listar items:", error)
    res.status(500).json({ message: "Error al listar items", error })
  }
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// EXPORTS
// Qué exportar depende del tipo de controller:
//
// CONTROLLER GENERAL (reutilizable):
//   - POLICIES (para routes Y para controllers específicos)
//   - CONTROLLERS (para reutilizar en otros dominios/controllers)
//   - SERVICES (para reutilizar en cualquier parte)
//
// CONTROLLER ESPECÍFICO (feature específico):
//   - POLICIES (solo para sus rutas específicas)
//   - Opcionalmente CONTROLLERS/SERVICES si otro controller específico lo necesita

module.exports = {
  // POLICIES (para routes)
  crearItem,
  listarItems,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  findItemsActivosDB,
  createItemDB,

  // SERVICES (para reutilizar en cualquier parte)
  validarCodigoBarras,
  normalizarCodigo,
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// GUÍA RÁPIDA DE USO
//
// 1. Copiar este template
// 2. Renombrar archivo según feature (ej: categoriaController.js)
// 3. Definir si es GENERAL o ESPECÍFICO
// 4. Importar conexionDB y modelos DIRECTAMENTE desde config/models (NO desde index)
// 5. Si es específico, importar funciones cross-domain desde Index
// 6. Agregar SERVICES (funciones puras)
// 7. Agregar CONTROLLERS (acceso a DB sin req/res)
// 8. Agregar POLICIES (endpoints con req/res)
// 9. Exportar según el tipo de controller
// 10. Si es GENERAL, actualizar itemIndex.js para re-exportar