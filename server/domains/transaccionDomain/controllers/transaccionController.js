// transaccionController.js - Controller GENERAL del dominio
// Contiene lógica reutilizable de transacciones para múltiples componentes

const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { transaccionModelInit } = require("../../../models/transaccionModel.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { itemModelInit } = require("../../../models/itemModel.js")

// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################
// #########################################################################################################################

// SERVICES: FUNCIONES ATOMICAS
// Funciones puras, sin side effects, reutilizables

/**
 * Truncar monto a 2 decimales (sin redondear)
 */
const truncarMonto = (obj) => {
  if (obj && typeof obj.monto === "number") {
    obj.monto = Math.trunc(obj.monto * 100) / 100
  }
  return obj
}

/**
 * Validar si los datos del lote son correctos
 */
const validarLoteData = (lote) => {
  const { idLote, cantidad } = lote
  return idLote && cantidad && !isNaN(parseInt(idLote)) && !isNaN(parseFloat(cantidad))
}

/**
 * Parsear datos del lote a tipos correctos
 */
const parseLoteData = (lote) => ({
  idLote: parseInt(lote.idLote),
  cantidad: parseFloat(lote.cantidad),
})


/**
 * Calcular nuevo inventario asegurando que no sea negativo
 */
const calcularNuevoInventario = (inventarioActual, cantidadDescontada) => {
  const nuevoInventario = parseFloat(inventarioActual || 0) - cantidadDescontada
  return nuevoInventario >= 0 ? nuevoInventario : 0
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
 * Crear transacción en la base de datos
 */
const createTransaccionDB = async (tenant, usuario, transaccionData) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion } = transaccionModelInit(sequelize)

  // Aplicar default para operacionParaCuentaCorriente si aplica
  if (transaccionData.afectaCuentaCorriente === true && !transaccionData.operacionParaCuentaCorriente) {
    transaccionData.operacionParaCuentaCorriente = "operacionCC"
  }

  const transaccion = new Transaccion(transaccionData)
  await transaccion.save()
  return transaccion
}

/**
 * Crear item de transacción en la base de datos
 */
const createTransaccionItemDB = async (tenant, usuario, itemData) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { TransaccionItem } = transaccionModelInit(sequelize)

  const transaccionItem = new TransaccionItem(itemData)
  await transaccionItem.save()
  return transaccionItem
}

/**
 * Buscar lote por ID y ubicación
 */
const findLoteItemUbicacionDB = async (tenant, usuario, idLote, idUbicacion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteItemUbicacion } = itemModelInit(sequelize)

  return await LoteItemUbicacion.findOne({
    where: {
      idLote: parseInt(idLote),
      idUbicacion: parseInt(idUbicacion),
      eliminado: false,
    },
  })
}

/**
 * Descontar stock de un lote específico
 */
const descontarStockLoteDB = async (tenant, usuario, idLote, idUbicacion, cantidad) => {
  const loteItemUbicacion = await findLoteItemUbicacionDB(tenant, usuario, idLote, idUbicacion)

  if (!loteItemUbicacion) {
    return { success: false, message: "Lote no encontrado" }
  }

  if (loteItemUbicacion.stock < cantidad) {
    return { success: false, message: "Stock insuficiente" }
  }

  await loteItemUbicacion.update({
    stock: parseFloat(loteItemUbicacion.stock) - parseFloat(cantidad),
  })

  return { success: true, loteItemUbicacion }
}

/**
 * Crear registro en LoteTransaccion
 */
const createLoteTransaccionDB = async (tenant, usuario, loteData) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteTransaccion } = itemModelInit(sequelize)

  return await LoteTransaccion.create({
    idLote: parseInt(loteData.idLote),
    idTransaccion: parseInt(loteData.idTransaccion),
    cantidad: parseFloat(loteData.cantidad),
    eliminado: false,
  })
}

/**
 * Descontar inventario total de ItemUbicacion
 */
const descontarInventarioTotalDB = async (tenant, usuario, idItem, idUbicacion, cantidadTotal) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { ItemUbicacion } = itemModelInit(sequelize)

  const itemUbicacion = await ItemUbicacion.findOne({
    where: {
      idItem: parseInt(idItem),
      idUbicacion: parseInt(idUbicacion),
      eliminado: false,
    },
  })

  if (itemUbicacion) {
    const nuevoInventario = calcularNuevoInventario(itemUbicacion.inventario, cantidadTotal)
    await itemUbicacion.update({ inventario: nuevoInventario })
  }
}

/**
 * Buscar lista de montos por IDs (con fallback a entidad genérica)
 */
const findListaMontosByIdsDB = async (tenant, usuario, idEntidad, idItem, idUbicacion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Ubicacion, Entidad } = adminModelInit(sequelize)
  const { Item } = itemModelInit(sequelize)
  const { ListaDeMontos } = transaccionModelInit(sequelize)

  const includeOptions = [
    {
      model: Entidad,
      as: "entidad",
      attributes: ["id", "descripcion", "apellido", "dniCuitCuil", "email"],
    },
    {
      model: Item,
      as: "item",
      attributes: ["id", "descripcion", "codigo", "codigoScanner"],
    },
    {
      model: Ubicacion,
      as: "ubicacion",
      attributes: ["id", "descripcion"],
    },
  ]

  // Intento con entidad específica
  let record = await ListaDeMontos.findOne({
    where: { idEntidad, idItem, idUbicacion },
    include: includeOptions,
    order: [["fecha", "DESC"]],
  })

  // Si no existe, buscar con entidad genérica (idEntidad = 1)
  if (!record) {
    record = await ListaDeMontos.findOne({
      where: { idEntidad: 1, idItem, idUbicacion },
      include: includeOptions,
      order: [["fecha", "DESC"]],
    })
  }

  return record
}

/**
 * Buscar top 10 items más vendidos (últimos 2 meses)
 */
const findTop10ItemsVentasDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { TransaccionItem } = transaccionModelInit(sequelize)
  const { Item } = itemModelInit(sequelize)

  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

  return await TransaccionItem.findAll({
    attributes: ["idItem", [sequelize.fn("count", sequelize.col("idItem")), "ventas"]],
    where: {
      createdAt: {
        [Op.gte]: twoMonthsAgo,
      },
      eliminado: false,
    },
    include: [
      {
        model: Item,
        as: "item",
        attributes: [
          "id",
          "codigo",
          "descripcion",
          "usaGestionLotes",
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
          "codigoScanner",
        ],
        where: {
          eliminado: false,
        },
        required: true,
      },
    ],
    group: ["TransaccionItem.idItem", "item.id"],
    order: [[sequelize.literal("ventas"), "DESC"]],
    limit: 10,
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
 * Crear nueva transacción (endpoint público)
 */
const postTransaccion = async (req, res) => {
  try {
    // CONTROLLER: Crear transacción
    const transaccion = await createTransaccionDB(
      req.cookies.tenant,
      req.cookies.usuario,
      req.body
    )

    res.status(201).json(transaccion)
  } catch (error) {
    console.error("Error al crear transaccion:", error)
    res.status(400).json({ message: "Error al crear transaccion", error })
  }
}

/**
 * Crear item de transacción con manejo de lotes (endpoint público)
 */
const postTransaccionItem = async (req, res) => {
  const { idItem, cantidad, lotes, idUbicacion } = req.body

  // Validación de entrada
  if (!idItem || !cantidad) {
    return res.status(400).json({ message: "idItem o cantidad estan incompletos." })
  }

  try {
    // CONTROLLER: Crear item de transacción
    const transaccionItem = await createTransaccionItemDB(
      req.cookies.tenant,
      req.cookies.usuario,
      req.body
    )

    // POLICY: Procesar lotes si existen
    if (lotes && Array.isArray(lotes) && lotes.length > 0 && idUbicacion) {
      let cantidadTotalDescontada = 0

      for (const lote of lotes) {
        // SERVICE: Validar datos del lote
        if (!validarLoteData(lote)) {
          continue
        }

        // SERVICE: Parsear datos del lote
        const { idLote, cantidad: cantidadLote } = parseLoteData(lote)

        try {
          // CONTROLLER: Descontar stock del lote
          const { success } = await descontarStockLoteDB(
            req.cookies.tenant,
            req.cookies.usuario,
            idLote,
            idUbicacion,
            cantidadLote
          )

          if (!success) {
            continue
          }

          // Acumular cantidad descontada
          cantidadTotalDescontada += cantidadLote

          // CONTROLLER: Crear registro en LoteTransaccion
          await createLoteTransaccionDB(
            req.cookies.tenant,
            req.cookies.usuario,
            {
              idLote,
              idTransaccion: transaccionItem.idTransaccion,
              cantidad: cantidadLote,
            }
          )
        } catch (errorLote) {
          // No fallar toda la transacción por un lote
          console.error("Error procesando lote:", errorLote)
        }
      }

      // CONTROLLER: Descontar inventario total de ItemUbicacion
      if (cantidadTotalDescontada > 0) {
        try {
          await descontarInventarioTotalDB(
            req.cookies.tenant,
            req.cookies.usuario,
            idItem,
            idUbicacion,
            cantidadTotalDescontada
          )
        } catch (errorItemUbicacion) {
          console.error("Error al descontar stock de ItemUbicacion:", errorItemUbicacion)
          // No fallar la transacción si falla el descuento
        }
      }
    }

    res.status(201).json(transaccionItem)
  } catch (error) {
    console.error("Error al crear item de transaccion:", error)
    res.status(400).json({ message: "Error al crear item de transaccion", error })
  }
}

/**
 * Obtener lista de montos por IDs (endpoint público)
 */
const getListaMontosByIdItemIdEntidad = async (req, res) => {
  const { idEntidad, idItem, idUbicacion } = req.query

  try {
    // CONTROLLER: Buscar lista de montos
    const record = await findListaMontosByIdsDB(
      req.cookies.tenant,
      req.cookies.usuario,
      idEntidad,
      idItem,
      idUbicacion
    )

    if (!record) {
      return res.status(404).json({
        message:
          "No se encontro un precio de lista para esta combinacion de entidad, articulo y ubicacion.",
      })
    }

    // SERVICE: Truncar monto y convertir a objeto plano
    const resultado = truncarMonto(record.get({ plain: true }))

    return res.status(200).json(resultado)
  } catch (error) {
    console.error("Error al obtener las listas de montos:", error)
    return res.status(500).json({ message: "Error al obtener las listas de montos", error })
  }
}

/**
 * Obtener top 10 items más vendidos (endpoint público)
 */
const getTop10ItemVentas = async (req, res) => {
  try {
    // CONTROLLER: Buscar top 10 items
    const top10 = await findTop10ItemsVentasDB(req.cookies.tenant, req.cookies.usuario)

    res.status(200).json(top10)
  } catch (error) {
    console.error("Error en getTop10ItemVentas:", error)
    res.status(500).json({ message: "Error al obtener los 10 items mas vendidos", error })
  }
}

/**
 * Crear nueva relación transacción-pago
 */
const postTransaccionPago = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionPago } = transaccionModelInit(sequelize)

    const { fechaOriginal, ...transaccionPagoData } = req.body
    const transaccionPagoConfig = {
      ...transaccionPagoData,
      ...(fechaOriginal && {
        createdAt: new Date(fechaOriginal),
        updatedAt: new Date(),
      }),
    }

    const transaccionPago = new TransaccionPago(transaccionPagoConfig)
    await transaccionPago.save()

    console.log(
      `TransaccionPago creado con fecha: createdAt=${transaccionPago.createdAt}, updatedAt=${transaccionPago.updatedAt}`,
    )
    res.status(201).json(transaccionPago)
  } catch (error) {
    console.error("Error al crear transaccionPago:", error)
    res.status(400).json({ message: "Error al crear transaccionPago", error })
  }
}

/**
 * Crear pago
 */
const postCrearPago = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { Pago } = transaccionModelInit(sequelize)

    const { fechaOriginal, ...pagoData } = req.body
    const pagoConfig = {
      ...pagoData,
      ...(fechaOriginal && {
        createdAt: new Date(fechaOriginal),
        updatedAt: new Date(),
      }),
    }

    const crearPago = await Pago.create(pagoConfig)
    console.log(`Pago creado con fecha: createdAt=${crearPago.createdAt}, updatedAt=${crearPago.updatedAt}`)
    res.status(201).json(crearPago)
  } catch (error) {
    console.error("Error al crear crearPago:", error)
    res.status(400).json({ message: "Error al crear crearPago", error })
  }
}

/**
 * Obtener medios de pago por tipo
 */
const getMedioDePagoIdTipoEspecifico = async (req, res) => {
  const { idTipoMedioDePago } = req.params

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { MedioDePago } = transaccionModelInit(sequelize)

    if (!idTipoMedioDePago) {
      return res.status(400).json({ message: "El idTipoMedioDePago es requerido." })
    }

    const mediosDePago = await MedioDePago.findAll({
      where: { idTipoMedioDePago: idTipoMedioDePago },
    })

    if (!mediosDePago || mediosDePago.length === 0) {
      return res.status(404).json({ message: "No se encontraron medios de pago para este tipo." })
    }

    return res.status(200).json(mediosDePago)
  } catch (error) {
    console.error("Error al obtener los medios de pago:", error)
    return res.status(500).json({ message: "Hubo un error al obtener los medios de pago.", error })
  }
}

/**
 * Crear cuenta corriente
 */
const postCuentaCorriente = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { CuentaCorriente, TipoTransaccion } = transaccionModelInit(sequelize)

    const { idEntidad, monto, idTipoTransaccion } = req.body

    let montoAjustado
    if (idTipoTransaccion) {
      const tipoTransaccion = await TipoTransaccion.findByPk(idTipoTransaccion, {
        attributes: ["operacionCuentaCorriente"],
      })

      if (tipoTransaccion?.operacionCuentaCorriente) {
        montoAjustado =
          tipoTransaccion.operacionCuentaCorriente === "+" ? Math.abs(monto) : -Math.abs(monto)
      } else {
        return res.status(400).json({
          message: "Tipo de transacción no válido para cuenta corriente",
        })
      }
    } else {
      return res.status(400).json({
        message: "idTipoTransaccion es requerido",
      })
    }

    const saldoNormalizado = Object.is(montoAjustado, -0) ? 0 : montoAjustado
    const cuenta = new CuentaCorriente({
      idEntidad,
      saldo: saldoNormalizado,
    })
    await cuenta.save()
    res.status(201).json(cuenta)
  } catch (error) {
    res.status(500).json({ message: "Error al crear la cuenta corriente", error })
  }
}

/**
 * Actualizar cuenta corriente
 */
const updateCuentaCorriente = async (req, res) => {
  const { idEntidad } = req.params
  const { monto, idTipoTransaccion, usarOperacionCaja } = req.body

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { CuentaCorriente, TipoTransaccion } = transaccionModelInit(sequelize)

    const cuenta = await CuentaCorriente.findOne({
      where: { idEntidad, eliminado: false },
    })

    if (cuenta) {
      let montoAjustado
      if (idTipoTransaccion) {
        const tipoTransaccion = await TipoTransaccion.findByPk(idTipoTransaccion, {
          attributes: ["operacionCuentaCorriente", "operacionCaja"],
        })

        const operacion = usarOperacionCaja
          ? tipoTransaccion?.operacionCaja
          : tipoTransaccion?.operacionCuentaCorriente

        if (operacion) {
          montoAjustado = operacion === "+" ? Math.abs(monto) : -Math.abs(monto)
        } else {
          return res.status(400).json({
            message: `Tipo de transacción no válido para cuenta corriente. operacion${
              usarOperacionCaja ? "Caja" : "CuentaCorriente"
            } no definida`,
          })
        }
      } else {
        return res.status(400).json({
          message: "idTipoTransaccion es requerido",
        })
      }

      cuenta.saldo += montoAjustado
      if (Object.is(cuenta.saldo, -0)) {
        cuenta.saldo = 0
      }
      await cuenta.save()
      res.status(200).json(cuenta)
    } else {
      res.status(404).json({ message: "Cuenta corriente no encontrada" })
    }
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la cuenta corriente", error })
  }
}

/**
 * Actualizar transacción
 */
const putTransaccion = async (req, res) => {
  const { id } = req.params
  const { idUsuario, fechaHoraCreacion, ...otrosDatos } = req.body

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { Usuario } = adminModelInit(sequelize)
    const { Transaccion } = transaccionModelInit(sequelize)

    const usuarioValido = idUsuario && idUsuario > 0 ? await Usuario.findByPk(idUsuario) : null

    if (idUsuario && !usuarioValido) {
      return res.status(400).json({ message: "Usuario no válido." })
    }

    const transaccionExistente = await Transaccion.findByPk(id)
    if (!transaccionExistente) {
      return res.status(404).json({ message: "Transacción no encontrada." })
    }

    const datosActualizacion = {
      ...otrosDatos,
      idUsuario: usuarioValido ? idUsuario : null,
    }

    if (fechaHoraCreacion && !transaccionExistente.fechaHoraCreacion) {
      datosActualizacion.fechaHoraCreacion = fechaHoraCreacion
    }

    const [updated] = await Transaccion.update(datosActualizacion, { where: { id: id } })

    if (updated) {
      const transaccionActualizada = await Transaccion.findByPk(id)
      return res.status(200).json(transaccionActualizada)
    }

    return res.status(404).json({ message: "Transacción no encontrada." })
  } catch (error) {
    console.error("Error al actualizar la transacción:", error)
    return res.status(400).json({ message: "Error al actualizar la transacción", error })
  }
}

/**
 * Actualizar item de transacción
 */
const updateTransaccionItem = async (req, res) => {
  const { idTransaccion, idItem } = req.params
  const { cantidad, precio, porcentajeDescuento, porcentajeInteres } = req.body

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionItem } = transaccionModelInit(sequelize)

    const transaccionItem = await TransaccionItem.findOne({
      where: { idTransaccion, idItem },
    })

    if (!transaccionItem) {
      return res.status(404).json({ message: "TransaccionItem no encontrado." })
    }

    transaccionItem.cantidad = cantidad
    transaccionItem.precio = precio
    transaccionItem.porcentajeDescuento = porcentajeDescuento
    if (porcentajeInteres !== undefined) {
      transaccionItem.porcentajeInteres = porcentajeInteres
    }
    transaccionItem.eliminado = false
    await transaccionItem.save()

    res.status(200).json(transaccionItem)
  } catch (error) {
    console.error("Error al actualizar transaccionItem:", error)
    res.status(500).json({ message: "Error del servidor al actualizar transaccionItem." })
  }
}

/**
 * Eliminar (soft delete) item de transacción
 */
const deleteTransaccionItem = async (req, res) => {
  const { idTransaccion, idItem } = req.params
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionItem } = transaccionModelInit(sequelize)

    await TransaccionItem.update({ eliminado: true }, { where: { idTransaccion, idItem } })

    return res.json({
      message: "TransaccionItem actualizado (eliminado: true) correctamente.",
    })
  } catch (error) {
    console.error("Error en deleteTransaccionItem:", error)
    return res.status(500).json({
      message: "Error eliminando TransaccionItem",
      error: error.message,
    })
  }
}

/**
 * Eliminar (soft delete) pagos de una transacción
 */
const deleteTransaccionPago = async (req, res) => {
  const { idTransaccion } = req.params
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionPago, Pago } = transaccionModelInit(sequelize)

    const transaccionPagos = await TransaccionPago.findAll({
      where: { idTransaccion, eliminado: false },
      attributes: ["idTransaccion", "idPago"],
    })

    if (transaccionPagos.length === 0) {
      return res.status(200).json({
        message: "No se encontraron registros de TransaccionPago activos para esta transacción",
        affectedTransaccionPagos: 0,
        affectedPagos: 0,
      })
    }

    const idsPago = transaccionPagos.map((tp) => tp.idPago)
    const [affectedTransaccionPagos] = await TransaccionPago.update(
      { eliminado: true },
      { where: { idTransaccion } },
    )
    const [affectedPagos] = await Pago.update({ eliminado: true }, { where: { id: idsPago } })

    return res.json({
      message: "TransaccionPago y Pago marcados como eliminados correctamente",
      affectedTransaccionPagos,
      affectedPagos,
    })
  } catch (error) {
    console.error("Error en deleteTransaccionPago:", error)
    return res.status(500).json({
      message: "Error al eliminar TransaccionPago y Pago",
      error: error.message,
    })
  }
}

/**
 * Obtener items de una transacción
 */
const getTransaccionItemsByTransactionId = async (req, res) => {
  try {
    const { idTransaccion } = req.params
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionItem } = transaccionModelInit(sequelize)

    const transaccionItems = await TransaccionItem.findAll({
      where: { idTransaccion },
    })

    if (!transaccionItems.length) {
      return res.status(404).json({
        message: "No se encontraron transaccionItems para esta transacción.",
      })
    }

    res.status(200).json(transaccionItems)
  } catch (error) {
    console.error("Error obteniendo transaccionItems:", error)
    res.status(500).json({ message: "Error al obtener transaccionItems." })
  }
}

/**
 * Obtener transacción con pagos
 */
const getTransaccionFilter = async (req, res) => {
  const { idTransaccion } = req.params
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { Transaccion, TransaccionPago, Pago, MedioDePago, TipoMedioDePago, TipoTransaccion } =
      transaccionModelInit(sequelize)

    const transaccionFilter = await Transaccion.findOne({
      where: { id: idTransaccion },
      include: [
        {
          model: TransaccionPago,
          as: "transaccionPago",
          where: { eliminado: false },
          required: false,
          include: [
            {
              model: Pago,
              as: "pago",
              include: [
                {
                  model: MedioDePago,
                  as: "medioDePago",
                  include: [
                    {
                      model: TipoMedioDePago,
                      as: "tipoMedioDePago",
                      attributes: ["descripcion", "id", "afectaCuentaCorriente"],
                    },
                  ],
                  attributes: ["descripcion", "id", "idTipoMedioDePago"],
                },
              ],
              attributes: ["montoTotal", "cotizacion", "id"],
            },
          ],
        },
        {
          model: TipoTransaccion,
          as: "tipoTransaccion",
          attributes: ["id", "descripcion", "operacionCuentaCorriente", "operacionCaja"],
        },
      ],
    })
    if (!transaccionFilter) {
      return res.status(404).json({ message: "Transacción no encontrada" })
    }
    res.status(200).json(transaccionFilter)
  } catch (error) {
    console.error("Error en la consulta de transacción:", error)
    res.status(500).json({ message: "Error al obtener transacciones", error })
  }
}

/**
 * Obtener tipos de medio de pago
 */
const getTipoMedioDePago = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TipoMedioDePago } = transaccionModelInit(sequelize)
    const { condicionExtra } = req.query
    const where = { eliminado: false }

    if (condicionExtra) {
      let [clave, valor] = condicionExtra.split("=")
      if (clave && valor) {
        if (valor === "true") valor = true
        else if (valor === "false") valor = false
        where[clave] = valor
      }
    }

    const tipoMedioDePago = await TipoMedioDePago.findAll({
      where,
      order: [["id", "ASC"]],
    })
    res.status(200).json(tipoMedioDePago)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener tipo medio de pago", error })
  }
}

/**
 * Obtener cuentas corrientes por entidad
 */
const getCuentaCorrienteByIdEntidad = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { CuentaCorriente } = transaccionModelInit(sequelize)
    const { idEntidad } = req.params

    if (!idEntidad || isNaN(Number(idEntidad))) {
      return res.status(400).json({
        message: "idEntidad debe ser un número válido",
      })
    }

    const cuentaCorriente = await CuentaCorriente.findAll({
      where: { idEntidad: Number(idEntidad), eliminado: false },
    })

    if (!cuentaCorriente || cuentaCorriente.length === 0) {
      return res.status(404).json({
        message: "Cuenta corriente no encontrada para esta entidad",
      })
    }

    res.status(200).json(cuentaCorriente)
  } catch (error) {
    console.error("Error al obtener cuentas corrientes:", error)
    res.status(500).json({
      message: "Error al obtener las cuentas corrientes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * Obtener impuestos
 */
const getImpuestos = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { Impuesto } = transaccionModelInit(sequelize)
    const impuesto = await Impuesto.findAll({ where: { eliminado: false } })
    res.status(200).json(impuesto)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener impuesto", error })
  }
}

/**
 * Crear impuesto de transacción
 */
const postTransaccionImpuesto = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TransaccionImpuesto } = transaccionModelInit(sequelize)
    const impuestoTrans = new TransaccionImpuesto(req.body)
    await impuestoTrans.save()
    res.status(201).json(impuestoTrans)
  } catch (error) {
    res.status(400).json({ message: "Error al crear impuesto transaccion", error })
  }
}

/**
 * Obtener tipos de factura
 */
const getTiposFacturas = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { TipoFactura } = transaccionModelInit(sequelize)
    const tiposFacturas = await TipoFactura.findAll({
      where: { eliminado: false },
    })
    res.json(tiposFacturas)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las tipos Facturas", error })
  }
}

/**
 * Crear impuesto de item de transacción
 */
const postTransaccionImpuestoItem = async (req, res) => {
  const { idTransaccion, idItem, idImpuesto, porcentaje, montoTotal } = req.body

  if (!idTransaccion || !idItem || !idImpuesto || !porcentaje) {
    return res.status(400).json({
      message: "idTransaccion, idItem, idImpuesto o porcentaje están incompletos.",
    })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize)

    const transaccionImpuestoItem = new ImpuestoItemTransaccion({
      idTransaccion,
      idItem,
      idImpuesto,
      porcentaje,
      montoTotal: montoTotal || null,
      eliminado: false,
    })

    await transaccionImpuestoItem.save()
    res.status(201).json(transaccionImpuestoItem)
  } catch (error) {
    console.error("Error al crear impuesto de item de transacción:", error)
    res
      .status(400)
      .json({ message: "Error al crear impuesto de item de transacción", error: error.message })
  }
}

/**
 * Actualizar impuesto de item de transacción
 */
const updateTransaccionImpuestoItem = async (req, res) => {
  const { idTransaccion, idItem } = req.params
  const { idImpuesto, porcentaje, montoTotal } = req.body

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize)

    const transaccionImpuestoItem = await ImpuestoItemTransaccion.findOne({
      where: { idTransaccion, idItem },
    })

    if (!transaccionImpuestoItem) {
      return res.status(404).json({ message: "ImpuestoItemTransaccion no encontrado." })
    }

    transaccionImpuestoItem.idImpuesto = idImpuesto
    transaccionImpuestoItem.porcentaje = porcentaje
    transaccionImpuestoItem.montoTotal = montoTotal || null

    await transaccionImpuestoItem.save()
    res.status(200).json(transaccionImpuestoItem)
  } catch (error) {
    console.error("Error al actualizar impuesto de item de transacción:", error)
    res.status(500).json({ message: "Error del servidor al actualizar impuesto de item de transacción." })
  }
}

/**
 * Actualizar precio de lista por item/entidad/ubicación
 */
const updateItemPrecioListaId = async (req, res) => {
  const { idItem, idEntidad, idUbicacion, monto, tipoAjuste } = req.body

  if (!idItem || !idEntidad || !idUbicacion || monto === undefined || !tipoAjuste) {
    return res.status(400).json({ success: false })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { ListaDeMontos } = transaccionModelInit(sequelize)

    const latestRecord = await ListaDeMontos.findOne({
      where: {
        idItem: parseInt(idItem, 10),
        idEntidad: parseInt(idEntidad, 10),
        idUbicacion: parseInt(idUbicacion, 10),
      },
      order: [["fecha", "DESC"]],
    })

    if (latestRecord) {
      const monto1 = Math.round(latestRecord.monto * 100) / 100
      const monto2 = Math.round(monto * 100) / 100
      if (monto1 === monto2) {
        return res.status(200).json({ success: true })
      }
    }

    let newMonto
    if (latestRecord) {
      if (tipoAjuste === "porcentaje") {
        const porcentaje = parseFloat(monto) / 100
        newMonto = latestRecord.monto * (1 + porcentaje)
      } else if (tipoAjuste === "valor") {
        newMonto = parseFloat(monto)
      } else {
        return res.status(400).json({ success: false })
      }

      await ListaDeMontos.create({
        fecha: new Date(),
        idItem: parseInt(idItem, 10),
        idEntidad: parseInt(idEntidad, 10),
        idUbicacion: parseInt(idUbicacion, 10),
        monto: newMonto,
        eliminado: false,
      })
    } else {
      if (tipoAjuste !== "valor") {
        return res.status(400).json({ success: false })
      }

      newMonto = parseFloat(monto)
      await ListaDeMontos.create({
        fecha: new Date(),
        idItem: parseInt(idItem, 10),
        idUbicacion: parseInt(idUbicacion, 10),
        idEntidad: parseInt(idEntidad, 10),
        monto: newMonto,
        eliminado: false,
      })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error("Error al crear el registro:", error)
    res.status(500).json({ success: false, error: error.message })
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
  postTransaccion,
  postTransaccionItem,
  getListaMontosByIdItemIdEntidad,
  getTop10ItemVentas,
  postCrearPago,
  postTransaccionPago,
  postTransaccionImpuesto,
  postTransaccionImpuestoItem,
  putTransaccion,
  getTransaccionFilter,
  getTransaccionItemsByTransactionId,
  deleteTransaccionItem,
  deleteTransaccionPago,
  updateTransaccionItem,
  updateTransaccionImpuestoItem,
  getTipoMedioDePago,
  getMedioDePagoIdTipoEspecifico,
  getCuentaCorrienteByIdEntidad,
  postCuentaCorriente,
  updateCuentaCorriente,
  getImpuestos,
  getTiposFacturas,
  updateItemPrecioListaId,

  // CONTROLLERS (para reutilizar en controllers específicos o de otros dominios)
  createTransaccionDB,
  createTransaccionItemDB,
  descontarStockLoteDB,
  createLoteTransaccionDB,
  descontarInventarioTotalDB,
  findListaMontosByIdsDB,
  findTop10ItemsVentasDB,
  findLoteItemUbicacionDB,

  // SERVICES (para reutilizar en cualquier parte)
  truncarMonto,
  validarLoteData,
  parseLoteData,
  calcularNuevoInventario,
}
