// pedidoController.js - Controller ESPECÍFICO para pedidos
// Gestiona el ciclo de vida de pedidos (pendiente → recibido → despachado → entregado)
// y su conversión final a venta al llegar al estado "entregado".

const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { transaccionModelInit } = require("../../../models/transaccionModel.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { itemModelInit } = require("../../../models/itemModel.js")

// ############################################################################
// SERVICES: FUNCIONES ATÓMICAS
// ############################################################################

const PEDIDO_TIPO_ID = 13
const VENTA_TIPO_ID = 1

const ESTADOS = {
  pendiente:  { nextStates: ["recibido"] },
  recibido:   { nextStates: ["despachado"] },
  despachado: { nextStates: ["entregado"] },
  entregado:  { nextStates: [] },
}

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

const canChangeToState = (currentState, newState) => {
  const config = ESTADOS[currentState]
  return config ? config.nextStates.includes(newState) : false
}

const mapPedidoRow = (transaccion) => {
  const transaccionPagos = transaccion.transaccionPago || []
  const primerPago = transaccionPagos.find((tp) => !tp.eliminado && tp.pago && !tp.pago.eliminado)
  const medioDePago = primerPago?.pago?.medioDePago || null
  const tipoMedioDePago = medioDePago?.tipoMedioDePago || null

  const medioPagoLabel = medioDePago
    ? tipoMedioDePago
      ? `${tipoMedioDePago.descripcion} - ${medioDePago.descripcion}`
      : medioDePago.descripcion
    : null

  return {
    id: transaccion.id,
    montoTotal: transaccion.montoTotal,
    descripcion: transaccion.descripcion,
    estado: transaccion.estado,
    fechaHoraCreacion: transaccion.fechaHoraCreacion,
    createdAt: transaccion.createdAt,
    eliminado: transaccion.eliminado,
    idTipoTransaccion: transaccion.idTipoTransaccion,
    idEntidad: transaccion.idEntidad,
    descripcionEntidad: transaccion.entidad?.descripcion || "",
    apellido: transaccion.entidad?.apellido || "",
    dniCuitCuil: transaccion.entidad?.dniCuitCuil || "",
    usuario: transaccion.usuario?.usuario || "",
    ubicacion: transaccion.ubicacion?.descripcion || "",
    idUbicacion: transaccion.idUbicacion,
    negocio: transaccion.negocio?.descripcion || "",
    idNegocio: transaccion.idNegocio,
    montoDescuento: transaccion.montoDescuento || 0,
    porcentajeDescuento: transaccion.porcentajeDescuento || 0,
    transaccionAsociada: transaccion.transaccionAsociada,
    medioPago: medioPagoLabel,
    idMedioDePago: medioDePago?.id || null,
    idTipoMedioDePago: tipoMedioDePago?.id || null,
  }
}

// ############################################################################
// CONTROLLERS: ACCESO A LA BASE
// ############################################################################

const findPedidosDB = async (tenant, usuario, filters) => {
  const sequelize = await conexionDB(tenant, usuario)
  const {
    Transaccion,
    TipoTransaccion,
    TransaccionPago,
    Pago,
    MedioDePago,
    TipoMedioDePago,
  } = transaccionModelInit(sequelize)
  const { Entidad, Usuario, Ubicacion, Negocio } = adminModelInit(sequelize)

  const page = parsePositiveInteger(filters.page, 1)
  const limit = parsePositiveInteger(filters.limit, 50)
  const offset = (page - 1) * limit
  const includeEliminados = parseBoolean(filters.mostrarEliminados, false)

  const where = { idTipoTransaccion: PEDIDO_TIPO_ID }
  if (!includeEliminados) where.eliminado = false

  const idSearch = parsePositiveInteger(filters.idTransaccionSearch)
  if (idSearch) where.id = idSearch

  const idEntidad = parsePositiveInteger(filters.idEntidad)
  if (idEntidad) where.idEntidad = idEntidad

  const idUbicacion = parsePositiveInteger(filters.idUbicacion)
  if (idUbicacion) where.idUbicacion = idUbicacion

  if (filters.estado && ESTADOS[filters.estado]) where.estado = filters.estado

  if (filters.fecha || filters.formattedDate2) {
    const startDate = filters.fecha ? new Date(filters.fecha) : null
    const endDate = filters.formattedDate2 ? new Date(filters.formattedDate2) : null
    if (startDate && endDate && !isNaN(startDate) && !isNaN(endDate)) {
      where.fechaHoraCreacion = { [Op.between]: [startDate, endDate] }
    } else if (startDate && !isNaN(startDate)) {
      where.fechaHoraCreacion = { [Op.gte]: startDate }
    } else if (endDate && !isNaN(endDate)) {
      where.fechaHoraCreacion = { [Op.lte]: endDate }
    }
  }

  return Transaccion.findAndCountAll({
    attributes: [
      "id", "montoTotal", "descripcion", "estado", "fechaHoraCreacion",
      "idTipoTransaccion", "idEntidad", "idUbicacion", "idNegocio", "idUsuario",
      "montoDescuento", "porcentajeDescuento", "eliminado", "createdAt", "transaccionAsociada",
    ],
    where,
    include: [
      { model: TipoTransaccion, as: "tipoTransaccion", attributes: ["id", "descripcion"] },
      { model: Entidad, as: "entidad", attributes: ["id", "descripcion", "apellido", "dniCuitCuil"], required: false },
      { model: Usuario, as: "usuario", attributes: ["id", "usuario"], required: false },
      { model: Ubicacion, as: "ubicacion", attributes: ["id", "descripcion"], required: false },
      { model: Negocio, as: "negocio", attributes: ["id", "descripcion"], required: false },
      {
        model: TransaccionPago,
        as: "transaccionPago",
        required: false,
        where: { eliminado: false },
        include: [
          {
            model: Pago,
            as: "pago",
            required: false,
            where: { eliminado: false },
            include: [
              {
                model: MedioDePago,
                as: "medioDePago",
                attributes: ["id", "descripcion", "idTipoMedioDePago"],
                required: false,
                include: [
                  {
                    model: TipoMedioDePago,
                    as: "tipoMedioDePago",
                    attributes: ["id", "descripcion"],
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [["id", "DESC"]],
    limit,
    offset,
    distinct: true,
  })
}

const findPedidoByIdDB = async (tenant, usuario, id, includeEliminados = false) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TipoTransaccion, TransaccionItem } = transaccionModelInit(sequelize)
  const { Entidad, Usuario, Ubicacion, Negocio } = adminModelInit(sequelize)
  const { Item } = itemModelInit(sequelize)

  const transaccion = await Transaccion.findOne({
    where: { id, idTipoTransaccion: PEDIDO_TIPO_ID },
    include: [
      { model: TipoTransaccion, as: "tipoTransaccion", attributes: ["id", "descripcion"] },
      { model: Entidad, as: "entidad", attributes: ["id", "descripcion", "apellido", "dniCuitCuil"], required: false },
      { model: Usuario, as: "usuario", attributes: ["id", "usuario"], required: false },
      { model: Ubicacion, as: "ubicacion", attributes: ["id", "descripcion"], required: false },
      { model: Negocio, as: "negocio", attributes: ["id", "descripcion"], required: false },
    ],
  })

  if (!transaccion) return null

  const whereItems = { idTransaccion: id }
  if (!includeEliminados) whereItems.eliminado = false

  const items = await TransaccionItem.findAll({
    where: whereItems,
    include: [{ model: Item, as: "item", attributes: ["id", "codigo", "descripcion"], required: false }],
    order: [["idItem", "ASC"]],
  })

  return { transaccion, items }
}

const createPedidoDB = async (tenant, usuario, data) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion } = transaccionModelInit(sequelize)

  return Transaccion.create({
    fecha: data.fecha ? new Date(data.fecha) : new Date(),
    montoTotal: data.montoTotal,
    idTipoTransaccion: PEDIDO_TIPO_ID,
    estado: "pendiente",
    idEntidad: parsePositiveInteger(data.idEntidad) || null,
    idUsuario: parsePositiveInteger(data.idUsuario) || null,
    idUbicacion: parsePositiveInteger(data.idUbicacion) || null,
    idNegocio: parsePositiveInteger(data.idNegocio) || null,
    montoDescuento: data.montoDescuento ?? null,
    porcentajeDescuento: data.porcentajeDescuento ?? null,
    descripcion: data.descripcion || null,
    fechaHoraCreacion: new Date(),
    eliminado: false,
  })
}

// Cambia el estado del pedido siguiendo la máquina de estados.
// pendiente → recibido requiere idMedioDePago (crea Pago + TransaccionPago).
const updatePedidoEstadoDB = async (tenant, usuario, id, newEstado, idMedioDePago = null) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, Pago, TransaccionPago } = transaccionModelInit(sequelize)

  const pedido = await Transaccion.findOne({
    where: { id, idTipoTransaccion: PEDIDO_TIPO_ID, eliminado: false },
  })
  if (!pedido) return { error: "not_found" }

  if (!canChangeToState(pedido.estado, newEstado)) {
    return { error: "invalid_transition", from: pedido.estado, to: newEstado }
  }

  if (pedido.estado === "pendiente" && newEstado === "recibido") {
    if (!idMedioDePago) return { error: "medioPago_required" }

    const pago = await Pago.create({
      idMoneda: 1,
      cotizacion: 1,
      idMedioDePago,
      montoTotal: pedido.montoTotal,
      eliminado: false,
    })
    await TransaccionPago.create({ idTransaccion: id, idPago: pago.id, eliminado: false })
  }

  await pedido.update({ estado: newEstado })

  // Al llegar a "entregado" generar la venta asociada automáticamente.
  let ventaGenerada = null
  if (newEstado === "entregado" && !pedido.transaccionAsociada) {
    const conv = await convertPedidoToVentaDB(tenant, usuario, id)
    if (conv.error) return { error: "conversion_failed", detail: conv }
    ventaGenerada = { idVenta: conv.venta.id, itemsCopiados: conv.itemsCount }
    await pedido.reload()
  }

  return { updated: pedido, ventaGenerada }
}

// Crea una Venta (idTipoTransaccion=1) a partir del pedido entregado.
// Copia items y pagos. Linkea ambos registros via transaccionAsociada.
const convertPedidoToVentaDB = async (tenant, usuario, id) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TransaccionItem, TransaccionPago } = transaccionModelInit(sequelize)

  const pedido = await Transaccion.findOne({
    where: { id, idTipoTransaccion: PEDIDO_TIPO_ID, eliminado: false },
  })
  if (!pedido) return { error: "not_found" }
  if (pedido.estado !== "entregado") return { error: "invalid_state", currentState: pedido.estado }
  if (pedido.transaccionAsociada) return { error: "already_converted", idVenta: pedido.transaccionAsociada }

  const now = new Date()

  const venta = await Transaccion.create({
    fecha: now,
    montoTotal: pedido.montoTotal,
    idTipoTransaccion: VENTA_TIPO_ID,
    estado: null,
    idEntidad: pedido.idEntidad,
    idUsuario: pedido.idUsuario,
    idUbicacion: pedido.idUbicacion,
    idNegocio: pedido.idNegocio,
    montoDescuento: pedido.montoDescuento,
    porcentajeDescuento: pedido.porcentajeDescuento,
    descripcion: pedido.descripcion,
    transaccionAsociada: pedido.id,
    fechaHoraCreacion: now,
    eliminado: false,
  })

  const itemsPedido = await TransaccionItem.findAll({
    where: { idTransaccion: id, eliminado: false },
  })
  for (const item of itemsPedido) {
    await TransaccionItem.create({
      idTransaccion: venta.id,
      idItem: item.idItem,
      cantidad: item.cantidad,
      precio: item.precio,
      porcentajeDescuento: item.porcentajeDescuento,
      porcentajeInteres: item.porcentajeInteres,
      montoTotal: item.montoTotal,
      eliminado: false,
    })
  }

  const pagosPedido = await TransaccionPago.findAll({
    where: { idTransaccion: id, eliminado: false },
  })
  for (const tp of pagosPedido) {
    await TransaccionPago.create({ idTransaccion: venta.id, idPago: tp.idPago, eliminado: false })
  }

  // Marcar el pedido como ya convertido
  await pedido.update({ transaccionAsociada: venta.id })

  return { venta, itemsCount: itemsPedido.length }
}

const deletePedidoDB = async (tenant, usuario, id) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion, TransaccionItem } = transaccionModelInit(sequelize)

  const pedido = await Transaccion.findOne({ where: { id, idTipoTransaccion: PEDIDO_TIPO_ID } })
  if (!pedido) return { error: "not_found" }
  if (pedido.eliminado) return { error: "already_deleted" }
  if (pedido.transaccionAsociada) return { error: "already_converted" }

  await Transaccion.update({ eliminado: true }, { where: { id } })
  await TransaccionItem.update({ eliminado: true }, { where: { idTransaccion: id } })

  return { success: true }
}

// ############################################################################
// POLICIES: LÓGICA DE NEGOCIO
// ############################################################################

const getPedidosList = async (req, res) => {
  try {
    const result = await findPedidosDB(req.cookies.tenant, req.cookies.usuario, req.query)
    const page = parsePositiveInteger(req.query.page, 1)
    const limit = parsePositiveInteger(req.query.limit, 50)
    return res.status(200).json({
      data: result.rows.map(mapPedidoRow),
      totalCount: result.count,
      page,
      totalPages: Math.ceil(result.count / limit),
      limit,
    })
  } catch (error) {
    console.error("Error al listar pedidos:", error)
    return res.status(500).json({ message: "Error al listar pedidos", error: error.message })
  }
}

const getPedidoDetail = async (req, res) => {
  const id = parsePositiveInteger(req.params.id)
  if (!id) return res.status(400).json({ message: "id inválido" })

  try {
    const detail = await findPedidoByIdDB(
      req.cookies.tenant,
      req.cookies.usuario,
      id,
      parseBoolean(req.query.incluirEliminados, false),
    )
    if (!detail) return res.status(404).json({ message: "Pedido no encontrado" })
    return res.status(200).json({ transaccion: mapPedidoRow(detail.transaccion), items: detail.items })
  } catch (error) {
    console.error("Error al obtener pedido:", error)
    return res.status(500).json({ message: "Error al obtener pedido", error: error.message })
  }
}

const postPedido = async (req, res) => {
  const { montoTotal, idEntidad } = req.body
  if (!montoTotal || !idEntidad) {
    return res.status(400).json({ message: "montoTotal e idEntidad son requeridos" })
  }

  try {
    const pedido = await createPedidoDB(req.cookies.tenant, req.cookies.usuario, req.body)
    return res.status(201).json(pedido)
  } catch (error) {
    console.error("Error al crear pedido:", error)
    return res.status(500).json({ message: "Error al crear pedido", error: error.message })
  }
}

const cambiarEstadoPedido = async (req, res) => {
  const id = parsePositiveInteger(req.params.id)
  const { estado, idMedioDePago } = req.body

  if (!id) return res.status(400).json({ message: "id inválido" })
  if (!estado || !ESTADOS[estado]) {
    return res.status(400).json({ message: `estado inválido. Valores permitidos: ${Object.keys(ESTADOS).join(", ")}` })
  }

  try {
    const result = await updatePedidoEstadoDB(
      req.cookies.tenant,
      req.cookies.usuario,
      id,
      estado,
      parsePositiveInteger(idMedioDePago),
    )

    if (result.error === "not_found") return res.status(404).json({ message: "Pedido no encontrado" })
    if (result.error === "medioPago_required") {
      return res.status(400).json({ message: "idMedioDePago es requerido para pasar a 'recibido'" })
    }
    if (result.error === "invalid_transition") {
      return res.status(400).json({
        message: `Transición inválida: "${result.from}" → "${result.to}". Flujo: pendiente → recibido → despachado → entregado`,
      })
    }
    if (result.error === "conversion_failed") {
      return res.status(500).json({ message: "Error al convertir pedido a venta", detail: result.detail })
    }

    return res.status(200).json({
      message: `Pedido #${id} actualizado a "${estado}"`,
      pedido: mapPedidoRow(result.updated),
      ventaGenerada: result.ventaGenerada || null,
    })
  } catch (error) {
    console.error("Error al cambiar estado de pedido:", error)
    return res.status(500).json({ message: "Error al cambiar estado", error: error.message })
  }
}

const convertirPedidoAVenta = async (req, res) => {
  const id = parsePositiveInteger(req.params.id)
  if (!id) return res.status(400).json({ message: "id inválido" })

  try {
    const result = await convertPedidoToVentaDB(req.cookies.tenant, req.cookies.usuario, id)

    if (result.error === "not_found") return res.status(404).json({ message: "Pedido no encontrado" })
    if (result.error === "invalid_state") {
      return res.status(400).json({
        message: `El pedido debe estar en estado "entregado" para convertirse en venta. Estado actual: "${result.currentState}"`,
      })
    }
    if (result.error === "already_converted") {
      return res.status(409).json({ message: "El pedido ya fue convertido a venta", idVenta: result.idVenta })
    }

    return res.status(201).json({
      message: "Pedido convertido a venta correctamente",
      idVenta: result.venta.id,
      itemsCopiados: result.itemsCount,
    })
  } catch (error) {
    console.error("Error al convertir pedido a venta:", error)
    return res.status(500).json({ message: "Error al convertir pedido a venta", error: error.message })
  }
}

const deletePedido = async (req, res) => {
  const id = parsePositiveInteger(req.params.id)
  if (!id) return res.status(400).json({ message: "id inválido" })

  try {
    const result = await deletePedidoDB(req.cookies.tenant, req.cookies.usuario, id)

    if (result.error === "not_found") return res.status(404).json({ message: "Pedido no encontrado" })
    if (result.error === "already_deleted") return res.status(400).json({ message: "El pedido ya está eliminado" })
    if (result.error === "already_converted") {
      return res.status(400).json({ message: "No se puede eliminar un pedido que ya fue convertido a venta" })
    }

    return res.status(200).json({ message: "Pedido eliminado correctamente", success: true })
  } catch (error) {
    console.error("Error al eliminar pedido:", error)
    return res.status(500).json({ message: "Error al eliminar pedido", error: error.message })
  }
}

// ############################################################################
// EXPORTS
// ############################################################################

module.exports = {
  // POLICIES
  getPedidosList,
  getPedidoDetail,
  postPedido,
  cambiarEstadoPedido,
  convertirPedidoAVenta,
  deletePedido,

  // CONTROLLERS DB (reutilizables desde otros controllers vía transaccionIndex si se exponen)
  findPedidosDB,
  findPedidoByIdDB,
  createPedidoDB,
  updatePedidoEstadoDB,
  convertPedidoToVentaDB,
  deletePedidoDB,

  // SERVICES
  parseInteger,
  parsePositiveInteger,
  parseBoolean,
  canChangeToState,
  mapPedidoRow,
  PEDIDO_TIPO_ID,
  ESTADOS,
}
