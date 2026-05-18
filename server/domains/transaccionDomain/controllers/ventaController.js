// ventaController.js - Controller ESPECIFICO del dominio Transacción (venta)
// Contiene lógica de venta/facturación/lotes usada principalmente por componentes de venta

const { conexionDB } = require("../../../config/db.js")
const { transaccionModelInit } = require("../../../models/transaccionModel.js")
const { itemModelInit } = require("../../../models/itemModel.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS

const parseId = (value) => parseInt(value, 10)

const mapLoteConUbicacion = (loteTransaccion, idUbicacion) => ({
  idLote: loteTransaccion.idLote,
  idItem: loteTransaccion.lote.idItem,
  numeroLote: loteTransaccion.lote.numeroLote,
  cantidad: parseFloat(loteTransaccion.cantidad),
  idUbicacion: idUbicacion || null,
  fechaVencimiento: loteTransaccion.lote.fechaVencimiento,
  fechaFabricacion: loteTransaccion.lote.fechaFabricacion,
})

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// CONTROLLER: ACCESO A LA BASE

const createTransaccionTipoFacturaDB = async (tenant, usuario, transaccionTipoFacturaData) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { TransaccionTipoFactura } = transaccionModelInit(sequelize)

  const transaccionTipoFactura = new TransaccionTipoFactura(transaccionTipoFacturaData)
  await transaccionTipoFactura.save()
  return transaccionTipoFactura
}

const findCondicionIvaByEntidadDB = async (tenant, usuario, idEntidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { CondicionIvaEntidad } = transaccionModelInit(sequelize)

  return CondicionIvaEntidad.findOne({
    where: { idEntidad, eliminado: false },
  })
}

const findLotesTransaccionWithLoteDB = async (tenant, usuario, idTransaccion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteTransaccion, Lote } = itemModelInit(sequelize)

  return LoteTransaccion.findAll({
    where: {
      idTransaccion,
      eliminado: false,
    },
    include: [
      {
        model: Lote,
        as: "lote",
        attributes: ["id", "idItem", "numeroLote", "fechaVencimiento", "fechaFabricacion"],
      },
    ],
  })
}

const findTransaccionItemUbicacionDB = async (tenant, usuario, idTransaccion, idItem) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { TransaccionItem } = transaccionModelInit(sequelize)

  return TransaccionItem.findOne({
    where: {
      idTransaccion,
      idItem,
      eliminado: false,
    },
    attributes: ["idUbicacion"],
  })
}

const findTransaccionByIdDB = async (tenant, usuario, idTransaccion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion } = transaccionModelInit(sequelize)

  return Transaccion.findByPk(idTransaccion)
}

const findLotesTransaccionActivosDB = async (tenant, usuario, idTransaccion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteTransaccion } = itemModelInit(sequelize)

  return LoteTransaccion.findAll({
    where: {
      idTransaccion,
      eliminado: false,
    },
  })
}

const findLoteItemUbicacionDB = async (tenant, usuario, idLote, idUbicacion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteItemUbicacion } = itemModelInit(sequelize)

  return LoteItemUbicacion.findOne({
    where: {
      idLote,
      idUbicacion,
      eliminado: false,
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

/**
 * Crear transacción-tipo factura
 */
const postTransaccionTipoFactura = async (req, res) => {
  try {
    const transaccionTipoFactura = await createTransaccionTipoFacturaDB(
      req.cookies.tenant,
      req.cookies.usuario,
      req.body,
    )
    res.status(201).json(transaccionTipoFactura)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener transaccionTipoFactura", error })
  }
}

/**
 * Obtener condición IVA por entidad
 */
const getCondicionIvaByIdEntidad = async (req, res) => {
  const idEntidad = parseId(req.params.idEntidad)

  try {
    const condicionIva = await findCondicionIvaByEntidadDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idEntidad,
    )

    if (!condicionIva) {
      return res.status(404).json({ message: "No se encontró condición de IVA para esta entidad" })
    }

    res.status(200).json(condicionIva)
  } catch (error) {
    console.error("Error al obtener la condición de IVA:", error)
    res.status(500).json({ message: "Error al obtener la condición de IVA", error: error.message })
  }
}

/**
 * Obtener lotes aplicados en una transacción
 */
const getLotesDeTransaccion = async (req, res) => {
  const idTransaccion = parseId(req.params.idTransaccion)

  try {
    const lotesTransaccion = await findLotesTransaccionWithLoteDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idTransaccion,
    )

    if (!lotesTransaccion || lotesTransaccion.length === 0) {
      return res.status(404).json({
        message: "No se encontraron lotes para esta transacción",
        lotes: [],
      })
    }

    const lotesConUbicacion = await Promise.all(
      lotesTransaccion.map(async (loteTransaccion) => {
        const transaccionItem = await findTransaccionItemUbicacionDB(
          req.cookies.tenant,
          req.cookies.usuario,
          idTransaccion,
          loteTransaccion.lote.idItem,
        )

        return mapLoteConUbicacion(loteTransaccion, transaccionItem?.idUbicacion)
      }),
    )

    res.status(200).json(lotesConUbicacion)
  } catch (error) {
    console.error("Error al obtener lotes de transacción:", error)
    res.status(500).json({
      message: "Error al obtener lotes de transacción",
      error: error.message,
    })
  }
}

/**
 * Revertir lotes aplicados en una transacción
 */
const revertirLotesDeTransaccion = async (req, res) => {
  const idTransaccion = parseId(req.params.idTransaccion)

  try {
    const transaccion = await findTransaccionByIdDB(req.cookies.tenant, req.cookies.usuario, idTransaccion)

    if (!transaccion) {
      return res.status(404).json({
        message: "Transacción no encontrada",
        lotesRevertidos: 0,
      })
    }

    const idUbicacion = transaccion.idUbicacion
    if (!idUbicacion) {
      return res.status(400).json({
        message: "La transacción no tiene una ubicación definida",
        lotesRevertidos: 0,
      })
    }

    const lotesTransaccion = await findLotesTransaccionActivosDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idTransaccion,
    )

    if (!lotesTransaccion || lotesTransaccion.length === 0) {
      return res.status(200).json({
        message: "No se encontraron lotes activos para revertir",
        lotesRevertidos: 0,
      })
    }

    let lotesRevertidos = 0
    for (const loteTransaccion of lotesTransaccion) {
      try {
        const loteItemUbicacion = await findLoteItemUbicacionDB(
          req.cookies.tenant,
          req.cookies.usuario,
          parseId(loteTransaccion.idLote),
          parseId(idUbicacion),
        )

        if (loteItemUbicacion) {
          const stockActual = parseFloat(loteItemUbicacion.stock || 0)
          const cantidadDevolver = parseFloat(loteTransaccion.cantidad)
          const nuevoStock = stockActual + cantidadDevolver
          await loteItemUbicacion.update({ stock: nuevoStock })
        }

        await loteTransaccion.update({ eliminado: true })
        lotesRevertidos++
      } catch (errorLote) {
        console.error(`Error revirtiendo lote ${loteTransaccion.idLote}:`, errorLote)
      }
    }

    res.status(200).json({
      message: "Lotes revertidos correctamente",
      lotesRevertidos,
    })
  } catch (error) {
    console.error("Error al revertir lotes de transacción:", error)
    res.status(500).json({
      message: "Error al revertir lotes de transacción",
      error: error.message,
    })
  }
}

module.exports = {
  postTransaccionTipoFactura,
  getCondicionIvaByIdEntidad,
  getLotesDeTransaccion,
  revertirLotesDeTransaccion,

  // CONTROLLERS (DB) para reutilización futura
  createTransaccionTipoFacturaDB,
  findCondicionIvaByEntidadDB,
  findLotesTransaccionWithLoteDB,
  findTransaccionItemUbicacionDB,
  findTransaccionByIdDB,
  findLotesTransaccionActivosDB,
  findLoteItemUbicacionDB,

  // SERVICES
  parseId,
  mapLoteConUbicacion,
}
