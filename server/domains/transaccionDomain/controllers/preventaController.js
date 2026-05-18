const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { transaccionModelInit } = require("../../../models/transaccionModel.js")
const { adminModelInit } = require("../../../models/adminModel.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS

const PREVENTA_TIPO_ID = 10
const VENTA_TIPO_ID = 1

const parseInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parsePositiveInteger = (value, fallback = null) => {
  const parsed = parseInteger(value, fallback)
  return parsed !== null && parsed > 0 ? parsed : fallback
}

const parseBoolean = (value, fallback = false) => {
  if (value === true || value === "true") return true
  if (value === false || value === "false") return false
  return fallback
}

const normalizeItemPayload = (item, idUbicacionFallback) => {
  const idItem = parseInteger(item?.idItem)
  const cantidad = Number.parseFloat(item?.cantidad)
  const precio = Number.parseFloat(item?.precio)
  const porcentajeDescuento = Number.parseFloat(item?.porcentajeDescuento || 0)
  const idUbicacion = parseInteger(item?.idUbicacion, idUbicacionFallback)

  if (!idItem || Number.isNaN(cantidad) || Number.isNaN(precio)) {
    return null
  }

  return {
    idItem,
    cantidad,
    precio,
    porcentajeDescuento: Number.isNaN(porcentajeDescuento) ? 0 : porcentajeDescuento,
    idUbicacion,
  }
}

const mapPreventaRow = (transaccion) => ({
  id: transaccion.id,
  montoTotal: transaccion.montoTotal,
  descripcion: transaccion.descripcion,
  fechaHoraCreacion: transaccion.fechaHoraCreacion,
  createdAt: transaccion.createdAt,
  eliminado: transaccion.eliminado,
  idTipoTransaccionID: transaccion.idTipoTransaccion,
  idTipoTransaccion: transaccion.tipoTransaccion?.descripcion || "PreVenta",
  idEntidadNumero: transaccion.idEntidad,
  descripcionEntidad: transaccion.entidad?.descripcion || "",
  apellido: transaccion.entidad?.apellido || "",
  usuario: transaccion.usuario?.usuario || "",
  ubicacion: transaccion.ubicacion?.descripcion || "",
  negocio: transaccion.negocio?.descripcion || "",
  idNegocio: transaccion.idNegocio,
  idUbicacion: transaccion.idUbicacion,
  montoDescuento: transaccion.montoDescuento || 0,
  porcentajeDescuento: transaccion.porcentajeDescuento || 0,
})

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// CONTROLLER: ACCESO A LA BASE

const findPreventasDB = async (tenant, usuario, filters) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TipoTransaccion } = transaccionModelInit(sequelize)
  const { Entidad, Usuario, Ubicacion, Negocio } = adminModelInit(sequelize)

  const page = parsePositiveInteger(filters.page, 1)
  const limit = parsePositiveInteger(filters.limit, 50)
  const offset = (page - 1) * limit
  const includeEliminados = parseBoolean(filters.mostrarEliminados, false)

  const where = {
    idTipoTransaccion: PREVENTA_TIPO_ID,
  }

  // Solo filtrar por eliminado si includeEliminados es false
  if (!includeEliminados) {
    where.eliminado = false
  }

  const idTransaccionSearch = parsePositiveInteger(filters.idTransaccionSearch)
  if (idTransaccionSearch) {
    where.id = idTransaccionSearch
  }

  const idEntidad = parsePositiveInteger(filters.idEntidad || filters.dniCliente)
  if (idEntidad) {
    where.idEntidad = idEntidad
  }

  const idUbicacion = parsePositiveInteger(filters.idUbicacion || filters.selectedUbicacion)
  if (idUbicacion) {
    where.idUbicacion = idUbicacion
  }

  // Filtros de fecha
  if (filters.fecha || filters.formattedDate2) {
    const startDate = filters.fecha ? new Date(filters.fecha) : null
    const endDate = filters.formattedDate2 ? new Date(filters.formattedDate2) : null

    if (startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      where.fechaHoraCreacion = {
        [Op.between]: [startDate, endDate],
      }
    } else if (startDate && !Number.isNaN(startDate.getTime())) {
      where.fechaHoraCreacion = {
        [Op.gte]: startDate,
      }
    } else if (endDate && !Number.isNaN(endDate.getTime())) {
      where.fechaHoraCreacion = {
        [Op.lte]: endDate,
      }
    }
  }

  return Transaccion.findAndCountAll({
    attributes: [
      "id",
      "montoTotal",
      "descripcion",
      "fechaHoraCreacion",
      "idTipoTransaccion",
      "idEntidad",
      "idUbicacion",
      "idNegocio",
      "idUsuario",
      "montoDescuento",
      "porcentajeDescuento",
      "eliminado",
      "createdAt",
    ],
    where,
    include: [
      { model: TipoTransaccion, as: "tipoTransaccion", attributes: ["id", "descripcion"] },
      { model: Entidad, as: "entidad", attributes: ["id", "descripcion", "apellido"] },
      { model: Usuario, as: "usuario", attributes: ["id", "usuario"], required: false },
      { model: Ubicacion, as: "ubicacion", attributes: ["id", "descripcion"], required: false },
      { model: Negocio, as: "negocio", attributes: ["id", "descripcion"], required: false },
    ],
    order: [["id", "ASC"]], // ✅ Orden ascendente: más antiguos primero (cola FIFO)
    limit,
    offset,
    distinct: true,
  })
}

const findPreventaByIdDB = async (
  tenant,
  usuario,
  idTransaccion,
  includeEliminados = false,
  expectedTipoTransaccion = PREVENTA_TIPO_ID,
) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TipoTransaccion, TransaccionItem } = transaccionModelInit(sequelize)
  const { Entidad, Usuario, Ubicacion, Negocio } = adminModelInit(sequelize)

  const whereTransaccion = { id: idTransaccion }
  if (expectedTipoTransaccion !== null && expectedTipoTransaccion !== undefined) {
    whereTransaccion.idTipoTransaccion = expectedTipoTransaccion
  }

  const transaccion = await Transaccion.findOne({
    where: whereTransaccion,
    include: [
      { model: TipoTransaccion, as: "tipoTransaccion", attributes: ["id", "descripcion"] },
      { model: Entidad, as: "entidad", attributes: ["id", "descripcion", "apellido", "dniCuitCuil"] },
      { model: Usuario, as: "usuario", attributes: ["id", "usuario"], required: false },
      { model: Ubicacion, as: "ubicacion", attributes: ["id", "descripcion"], required: false },
      { model: Negocio, as: "negocio", attributes: ["id", "descripcion"], required: false },
    ],
  })

  if (!transaccion) {
    return null
  }

  const whereItems = { idTransaccion }
  if (!includeEliminados) {
    whereItems.eliminado = false
  }

  const items = await TransaccionItem.findAll({
    where: whereItems,
    order: [["idItem", "ASC"]],
  })

  return { transaccion, items }
}

const convertPreventaToVentaDB = async (tenant, usuario, idTransaccion, updateData, itemsPayload) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TransaccionItem } = transaccionModelInit(sequelize)

  const preventa = await Transaccion.findByPk(idTransaccion)
  if (!preventa) {
    return { error: "not_found" }
  }

  if (preventa.idTipoTransaccion !== PREVENTA_TIPO_ID) {
    return { error: "invalid_type", currentType: preventa.idTipoTransaccion }
  }

  const payload = {
    idTipoTransaccion: VENTA_TIPO_ID,
    fechaHoraCreacion: new Date(), // ✅ Actualizar fecha al momento de la conversión
    ...(updateData.idEntidad && { idEntidad: updateData.idEntidad }),
    ...(updateData.idUsuario && { idUsuario: updateData.idUsuario }),
    ...(updateData.idUbicacion && { idUbicacion: updateData.idUbicacion }),
    ...(updateData.idNegocio && { idNegocio: updateData.idNegocio }),
    ...(typeof updateData.montoTotal === "number" && { montoTotal: updateData.montoTotal }),
    ...(typeof updateData.montoDescuento === "number" && { montoDescuento: updateData.montoDescuento }),
    ...(typeof updateData.porcentajeDescuento === "number" && {
      porcentajeDescuento: updateData.porcentajeDescuento,
    }),
    ...(typeof updateData.descripcion === "string" && { descripcion: updateData.descripcion }),
  }

  await preventa.update(payload)

  if (Array.isArray(itemsPayload)) {
    const normalizedItems = itemsPayload
      .map((item) => normalizeItemPayload(item, payload.idUbicacion || preventa.idUbicacion))
      .filter(Boolean)

    const existingItems = await TransaccionItem.findAll({ where: { idTransaccion } })
    const existingByItemId = new Map(existingItems.map((item) => [item.idItem, item]))
    const incomingIds = new Set(normalizedItems.map((item) => item.idItem))

    for (const existingItem of existingItems) {
      if (!incomingIds.has(existingItem.idItem) && !existingItem.eliminado) {
        await existingItem.update({ eliminado: true })
      }
    }

    for (const item of normalizedItems) {
      const existingItem = existingByItemId.get(item.idItem)
      if (existingItem) {
        await existingItem.update({
          cantidad: item.cantidad,
          precio: item.precio,
          porcentajeDescuento: item.porcentajeDescuento,
          idUbicacion: item.idUbicacion,
          eliminado: false,
        })
      } else {
        await TransaccionItem.create({
          idTransaccion,
          idItem: item.idItem,
          cantidad: item.cantidad,
          precio: item.precio,
          porcentajeDescuento: item.porcentajeDescuento,
          idUbicacion: item.idUbicacion,
          eliminado: false,
        })
      }
    }
  }

  const updated = await findPreventaByIdDB(tenant, usuario, idTransaccion, true, null)
  if (!updated) {
    return { error: "not_found_after_update" }
  }
  return { updated }
}

/**
 * 🗑️ ELIMINADO LÓGICO DE PREVENTA
 * 
 * Marca como eliminado:
 * - La transacción (Transaccion.eliminado = true)
 * - Todos sus items (TransaccionItem.eliminado = true)
 * 
 * ⚠️ NO repone stock porque las preventas no afectan el inventario
 * ⚠️ NO ajusta cuenta corriente porque las preventas no afectan cuentas corrientes
 * 
 * @param {string} tenant - Tenant de la base de datos
 * @param {string} usuario - Usuario de la base de datos
 * @param {number} idTransaccion - ID de la preventa a eliminar
 * @returns {Object} { success: true } o { error: string }
 */
const deletePreventaDB = async (tenant, usuario, idTransaccion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TransaccionItem } = transaccionModelInit(sequelize)

  // Verificar que existe y es preventa
  const preventa = await Transaccion.findByPk(idTransaccion)
  if (!preventa) {
    return { error: "not_found" }
  }

  if (preventa.idTipoTransaccion !== PREVENTA_TIPO_ID) {
    return { error: "invalid_type", currentType: preventa.idTipoTransaccion }
  }

  // Verificar que no esté ya eliminada
  if (preventa.eliminado) {
    return { error: "already_deleted" }
  }

  // Marcar transacción como eliminada
  await Transaccion.update({ eliminado: true }, { where: { id: idTransaccion } })

  // Marcar todos los items como eliminados
  await TransaccionItem.update({ eliminado: true }, { where: { idTransaccion } })

  return { success: true }
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// POLICY: LOGICA DE NEGOCIO

const getPreventasList = async (req, res) => {
  try {
    const result = await findPreventasDB(req.cookies.tenant, req.cookies.usuario, req.query)
    const page = parsePositiveInteger(req.query.page, 1)
    const limit = parsePositiveInteger(req.query.limit, 50)

    return res.status(200).json({
      data: result.rows.map(mapPreventaRow),
      totalCount: result.count,
      page,
      totalPages: Math.ceil(result.count / limit),
      limit,
    })
  } catch (error) {
    console.error("Error al listar preventas:", error)
    return res.status(500).json({ message: "Error al listar preventas", error: error.message })
  }
}

const getPreventaDetail = async (req, res) => {
  const idTransaccion = parsePositiveInteger(req.params.idTransaccion)
  const incluirEliminados = parseBoolean(req.query.incluirEliminados, false)

  if (!idTransaccion) {
    return res.status(400).json({ message: "idTransaccion inválido" })
  }

  try {
    const detail = await findPreventaByIdDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idTransaccion,
      incluirEliminados,
    )

    if (!detail) {
      return res.status(404).json({ message: "Preventa no encontrada" })
    }

    return res.status(200).json({
      transaccion: mapPreventaRow(detail.transaccion),
      items: detail.items,
    })
  } catch (error) {
    console.error("Error al obtener detalle de preventa:", error)
    return res.status(500).json({ message: "Error al obtener detalle de preventa", error: error.message })
  }
}

const convertirPreventaAVenta = async (req, res) => {
  const idTransaccion = parsePositiveInteger(req.params.idTransaccion)
  if (!idTransaccion) {
    return res.status(400).json({ message: "idTransaccion inválido" })
  }

  const updateData = {
    idEntidad: parsePositiveInteger(req.body.idEntidad),
    idUsuario: parsePositiveInteger(req.body.idUsuario),
    idUbicacion: parsePositiveInteger(req.body.idUbicacion),
    idNegocio: parsePositiveInteger(req.body.idNegocio),
    montoTotal:
      req.body.montoTotal !== undefined ? Number.parseFloat(req.body.montoTotal) : undefined,
    montoDescuento:
      req.body.montoDescuento !== undefined ? Number.parseFloat(req.body.montoDescuento) : undefined,
    porcentajeDescuento:
      req.body.porcentajeDescuento !== undefined
        ? Number.parseFloat(req.body.porcentajeDescuento)
        : undefined,
    descripcion: req.body.descripcion,
  }

  try {
    const result = await convertPreventaToVentaDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idTransaccion,
      updateData,
      req.body.items,
    )

    if (result.error === "not_found" || result.error === "not_found_after_update") {
      return res.status(404).json({ message: "Preventa no encontrada" })
    }

    if (result.error === "invalid_type") {
      return res.status(400).json({
        message: "La transacción indicada no es una preventa",
        idTipoTransaccionActual: result.currentType,
      })
    }

    return res.status(200).json({
      message: "Preventa convertida a venta correctamente",
      transaccion: mapPreventaRow(result.updated.transaccion),
      items: result.updated.items,
    })
  } catch (error) {
    console.error("Error al convertir preventa a venta:", error)
    return res.status(500).json({ message: "Error al convertir preventa a venta", error: error.message })
  }
}

/**
 * 🗑️ POLICY: Eliminar preventa (eliminado lógico)
 * 
 * Endpoint: DELETE /transaccionDomain/preventas/:idTransaccion
 * 
 * Marca la preventa y todos sus items como eliminados.
 * No afecta inventario ni cuenta corriente.
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deletePreventa = async (req, res) => {
  const idTransaccion = parsePositiveInteger(req.params.idTransaccion)

  if (!idTransaccion) {
    return res.status(400).json({ message: "idTransaccion inválido" })
  }

  try {
    const result = await deletePreventaDB(req.cookies.tenant, req.cookies.usuario, idTransaccion)

    if (result.error === "not_found") {
      return res.status(404).json({ message: "Preventa no encontrada" })
    }

    if (result.error === "invalid_type") {
      return res.status(400).json({
        message: "La transacción no es una preventa",
        currentType: result.currentType,
      })
    }

    if (result.error === "already_deleted") {
      return res.status(400).json({ message: "La preventa ya está eliminada" })
    }

    return res.status(200).json({
      message: "Preventa eliminada exitosamente",
      success: true,
    })
  } catch (error) {
    console.error("Error al eliminar preventa:", error)
    return res.status(500).json({ message: "Error al eliminar preventa", error: error.message })
  }
}

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// EXPORTS

module.exports = {
  // Policies
  getPreventasList,
  getPreventaDetail,
  convertirPreventaAVenta,
  deletePreventa,
  // Controllers DB
  findPreventasDB,
  findPreventaByIdDB,
  convertPreventaToVentaDB,
  deletePreventaDB,
  // Services
  parseInteger,
  parsePositiveInteger,
  parseBoolean,
  normalizeItemPayload,
  mapPreventaRow,
}
