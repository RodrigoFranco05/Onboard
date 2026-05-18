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
const { transaccionModelInit } = require("../../../models/transaccionModel.js")

// Si necesitas modelos de otros dominios, importar directamente
// const { adminModelInit } = require("../../../models/adminModel.js")
// const { itemModelInit } = require("../../../models/itemModel.js")

// Si es controller específico, importar funciones desde Index de otros dominios
// const { findUbicacionesDB } = require("../../adminDomain/adminIndex.js")
// const { findItemByIdDB } = require("../../itemDomain/itemIndex.js")
// const { createTransaccionDB } = require("../transaccionIndex.js")

// ============================================
// SERVICES: FUNCIONES ATOMICAS
// ============================================
// Funciones puras, sin side effects, reutilizables
// - NO acceden a base de datos
// - NO reciben req/res
// - Validaciones, parseos, transformaciones, cálculos
// - Pueden ser exportadas para reutilización

/**
 * Ejemplo: Validar formato de email
 */
const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Ejemplo: Formatear monto a 2 decimales
 */
const formatearMonto = (monto) => {
  return Math.round(monto * 100) / 100
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
 * Ejemplo: Buscar registros activos
 */
const findRegistrosActivosDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Modelo } = modelInit(sequelize)

  return await Modelo.findAll({
    where: {
      [Op.or]: [{ eliminado: false }, { eliminado: null }],
    },
  })
}

/**
 * Ejemplo: Crear registro
 */
const createRegistroDB = async (tenant, usuario, data) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Modelo } = modelInit(sequelize)

  const registro = new Modelo(data)
  await registro.save()
  return registro
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
 * Ejemplo: Endpoint para crear registro
 */
const crearRegistro = async (req, res) => {
  const { nombre, email } = req.body

  // Validación de entrada
  if (!nombre || !email) {
    return res.status(400).json({ message: "Nombre y email son requeridos" })
  }

  // SERVICE: Validar formato
  if (!validarEmail(email)) {
    return res.status(400).json({ message: "Email inválido" })
  }

  try {
    // CONTROLLER: Crear en DB
    const registro = await createRegistroDB(req.cookies.tenant, req.cookies.usuario, req.body)

    res.status(201).json(registro)
  } catch (error) {
    console.error("Error al crear registro:", error)
    res.status(500).json({ message: "Error al crear registro", error })
  }
}

/**
 * Ejemplo: Endpoint para listar registros
 */
const listarRegistros = async (req, res) => {
  try {
    // CONTROLLER: Buscar en DB
    const registros = await findRegistrosActivosDB(req.cookies.tenant, req.cookies.usuario)

    res.status(200).json(registros)
  } catch (error) {
    console.error("Error al listar registros:", error)
    res.status(500).json({ message: "Error al listar registros", error })
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
  crearRegistro,
  listarRegistros,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  findRegistrosActivosDB,
  createRegistroDB,

  // SERVICES (para reutilizar en cualquier parte)
  validarEmail,
  formatearMonto,
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
// 2. Renombrar archivo según feature (ej: ventaController.js)
// 3. Definir si es GENERAL o ESPECÍFICO
// 4. Agregar imports necesarios (desde Index si es cross-domain)
// 5. Agregar SERVICES (funciones puras)
// 6. Agregar CONTROLLERS (acceso a DB sin req/res)
// 7. Agregar POLICIES (endpoints con req/res)
// 8. Exportar según el tipo de controller
// 9. Si es GENERAL, actualizar domainIndex.js para re-exportar