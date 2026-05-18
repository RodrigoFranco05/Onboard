const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")
const { normalizarPeriodoMensual } = require("./rrhhController.js")

const ESTADOS_LIQUIDACION_VALIDOS = new Set(["BORRADOR", "APROBADA", "PAGADA"])
const TIPOS_CONCEPTO_VALIDOS = new Set(["HABER", "DESCUENTO", "INFORMATIVO"])
const CATEGORIAS_NOVEDAD_VALIDAS = new Set(["BONO", "ADELANTO", "AJUSTE", "LICENCIA", "COMISION", "OTRO"])

// #########################################################################################################################
// SERVICES: FUNCIONES ATOMICAS
// #########################################################################################################################

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  return texto.length > 0 ? texto : null
}

const parsePositiveInteger = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null
  const parsed = Number.parseInt(valor, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

const parseFloatNullable = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null
  const parsed = Number.parseFloat(valor)
  return Number.isFinite(parsed) ? parsed : null
}

const parseBoolean = (valor, fallback = false) => {
  if (valor === undefined || valor === null || valor === "") return fallback
  if (typeof valor === "boolean") return valor
  if (typeof valor === "number") return valor === 1
  const normalized = String(valor).trim().toLowerCase()
  if (["true", "1", "si", "sí"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  return fallback
}

const normalizarFecha = (fecha) => {
  const valor = limpiarTexto(fecha)
  if (!valor) return null

  const parsed = dayjs(valor)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null
}

const normalizarEstadoLiquidacion = (estado) => {
  const valor = limpiarTexto(estado)
  if (!valor) return null

  const estadoUpper = valor.toUpperCase()
  return ESTADOS_LIQUIDACION_VALIDOS.has(estadoUpper) ? estadoUpper : null
}

const normalizarTipoConcepto = (tipoConcepto) => {
  const valor = limpiarTexto(tipoConcepto)
  if (!valor) return "HABER"

  const tipoUpper = valor.toUpperCase()
  return TIPOS_CONCEPTO_VALIDOS.has(tipoUpper) ? tipoUpper : "HABER"
}

const normalizarCategoriaNovedad = (categoria) => {
  const valor = limpiarTexto(categoria)
  if (!valor) return "OTRO"

  const categoriaUpper = valor.toUpperCase()
  return CATEGORIAS_NOVEDAD_VALIDAS.has(categoriaUpper) ? categoriaUpper : "OTRO"
}

const buildPagination = ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1)
  const rowsPerPage = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)

  return {
    currentPage,
    rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  }
}

const buildManagedError = (message, statusCode = 400) => {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const roundCurrency = (valor) => {
  const parsed = Number(valor)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

const buildLiquidacionPayload = (payload = {}) => ({
  idEntidad: parsePositiveInteger(payload.idEntidad),
  periodo: normalizarPeriodoMensual(payload.periodo),
  observaciones: limpiarTexto(payload.observaciones),
})

const buildNovedadPayload = (payload = {}, idUsuario = null) => {
  const cantidad = parseFloatNullable(payload.cantidad)
  const montoUnitario = parseFloatNullable(payload.montoUnitario)
  const montoTotalRecibido = parseFloatNullable(payload.montoTotal)
  const montoCalculado = montoTotalRecibido ?? (
    cantidad !== null && montoUnitario !== null ? cantidad * montoUnitario : 0
  )

  return {
    idEntidad: parsePositiveInteger(payload.idEntidad),
    periodo: normalizarPeriodoMensual(payload.periodo),
    fechaNovedad: normalizarFecha(payload.fechaNovedad) || dayjs().format("YYYY-MM-DD"),
    categoria: normalizarCategoriaNovedad(payload.categoria),
    tipoConcepto: normalizarTipoConcepto(payload.tipoConcepto),
    descripcion: limpiarTexto(payload.descripcion),
    cantidad,
    montoUnitario,
    montoTotal: Math.abs(roundCurrency(montoCalculado)),
    aprobado: parseBoolean(payload.aprobado, false),
    observaciones: limpiarTexto(payload.observaciones),
    creadoPor: idUsuario,
  }
}

const resolvePeriodoRange = (periodo) => {
  const periodoNormalizado = normalizarPeriodoMensual(periodo)
  if (!periodoNormalizado) return null

  const inicio = dayjs(`${periodoNormalizado}-01`)
  if (!inicio.isValid()) return null

  return {
    fechaDesde: inicio.format("YYYY-MM-DD"),
    fechaHasta: inicio.endOf("month").format("YYYY-MM-DD"),
  }
}

const seleccionarContratoParaPeriodo = (contratos = [], periodo) => {
  const range = resolvePeriodoRange(periodo)
  if (!range) return contratos[0] || null

  const inicioPeriodo = dayjs(range.fechaDesde)
  const finPeriodo = dayjs(range.fechaHasta)

  return (
    contratos.find((contrato) => {
      const desde = dayjs(contrato.fechaVigenciaDesde)
      const hasta = contrato.fechaVigenciaHasta ? dayjs(contrato.fechaVigenciaHasta) : null

      if (!desde.isValid()) return false
      if (desde.isAfter(finPeriodo)) return false
      if (hasta && hasta.isBefore(inicioPeriodo)) return false

      return true
    }) ||
    contratos.find((contrato) => {
      const desde = dayjs(contrato.fechaVigenciaDesde)
      return desde.isValid() && (desde.isBefore(finPeriodo) || desde.isSame(finPeriodo, "day"))
    }) ||
    contratos[0] ||
    null
  )
}

const resolveMontoNovedad = (novedad) => {
  const montoTotal = parseFloatNullable(novedad?.montoTotal)
  const cantidad = parseFloatNullable(novedad?.cantidad)
  const montoUnitario = parseFloatNullable(novedad?.montoUnitario)

  if (montoTotal !== null) return Math.abs(roundCurrency(montoTotal))
  if (cantidad !== null && montoUnitario !== null) {
    return Math.abs(roundCurrency(cantidad * montoUnitario))
  }

  return 0
}

const sumField = (items = [], field) => {
  return items.reduce((acc, item) => acc + (Number(item?.[field]) || 0), 0)
}

const buildLiquidacionInclude = ({ Entidad, RrhhEmpleado, RrhhContratoHistorial, Usuario }) => [
  {
    model: Entidad,
    as: "entidad",
    attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
    required: true,
    include: [
      {
        model: RrhhEmpleado,
        as: "rrhhEmpleado",
        attributes: ["idEntidad", "legajo", "estadoLaboral"],
        required: false,
        where: { eliminado: false },
      },
    ],
  },
  {
    model: RrhhContratoHistorial,
    as: "contratoBase",
    attributes: [
      "id",
      "fechaVigenciaDesde",
      "fechaVigenciaHasta",
      "puesto",
      "tipoJornada",
      "sueldoBase",
      "pagoPorHora",
      "pagoPorHoraExtra",
      "categoria",
      "sindicatoGremio",
    ],
    required: false,
  },
  {
    model: Usuario,
    as: "usuarioCreador",
    attributes: ["id", "usuario", "nombre", "apellido"],
    required: false,
  },
]

const buildNovedadInclude = ({ Entidad, RrhhEmpleado, Usuario }) => [
  {
    model: Entidad,
    as: "entidad",
    attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
    required: true,
    include: [
      {
        model: RrhhEmpleado,
        as: "rrhhEmpleado",
        attributes: ["idEntidad", "legajo", "estadoLaboral"],
        required: false,
        where: { eliminado: false },
      },
    ],
  },
  {
    model: Usuario,
    as: "usuarioCreador",
    attributes: ["id", "usuario", "nombre", "apellido"],
    required: false,
  },
]

const buildDetallePayload = (detalles, payload = {}) => {
  const importe = roundCurrency(payload.importe)
  const tipoConcepto = normalizarTipoConcepto(payload.tipoConcepto)

  if (tipoConcepto !== "INFORMATIVO" && importe <= 0) return

  detalles.push({
    orden: detalles.length + 1,
    codigoConcepto: limpiarTexto(payload.codigoConcepto),
    descripcion: limpiarTexto(payload.descripcion) || "Concepto RRHH",
    tipoConcepto,
    origen: limpiarTexto(payload.origen)?.toUpperCase() || "MANUAL",
    cantidad: payload.cantidad !== undefined && payload.cantidad !== null ? Number(payload.cantidad) : null,
    baseCalculo: payload.baseCalculo !== undefined && payload.baseCalculo !== null ? roundCurrency(payload.baseCalculo) : null,
    importe,
    observaciones: limpiarTexto(payload.observaciones),
  })
}

// #########################################################################################################################
// CONTROLLER: ACCESO A LA BASE
// #########################################################################################################################

const construirLiquidacionCalculadaDB = async (sequelize, params = {}, transaction = null) => {
  const { Entidad } = adminModelInit(sequelize)
  const {
    RrhhEmpleado,
    RrhhContratoHistorial,
    RrhhAsistenciaDiaria,
    RrhhNovedadLiquidacion,
  } = rrhhModelInit(sequelize)

  const { idEntidad, periodo, observaciones = null, idUsuario = null } = params
  const range = resolvePeriodoRange(periodo)

  if (!idEntidad || !range) {
    throw buildManagedError("idEntidad y periodo son requeridos para liquidar.", 400)
  }

  const empleado = await RrhhEmpleado.findOne({
    where: {
      idEntidad,
      eliminado: false,
    },
    include: [
      {
        model: Entidad,
        as: "entidad",
        attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
        required: true,
      },
    ],
    transaction,
  })

  if (!empleado) {
    throw buildManagedError("Empleado RRHH no encontrado.", 404)
  }

  const contratos = await RrhhContratoHistorial.findAll({
    where: {
      idEntidad,
      eliminado: false,
    },
    order: [
      ["fechaVigenciaDesde", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  })

  if (contratos.length === 0) {
    throw buildManagedError("El empleado no tiene historial contractual cargado.", 400)
  }

  const contratoBase = seleccionarContratoParaPeriodo(contratos, periodo)
  if (!contratoBase) {
    throw buildManagedError("No se pudo resolver un contrato base para el período indicado.", 400)
  }

  const asistenciasAbiertas = await RrhhAsistenciaDiaria.count({
    where: {
      idEntidad,
      eliminado: false,
      cerrado: false,
      fecha: {
        [Op.between]: [range.fechaDesde, range.fechaHasta],
      },
    },
    transaction,
  })

  if (asistenciasAbiertas > 0) {
    throw buildManagedError("Hay asistencias abiertas en el período. Cerralas antes de liquidar.", 400)
  }

  const asistencias = await RrhhAsistenciaDiaria.findAll({
    where: {
      idEntidad,
      eliminado: false,
      cerrado: true,
      fecha: {
        [Op.between]: [range.fechaDesde, range.fechaHasta],
      },
    },
    order: [
      ["fecha", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  })

  const novedades = await RrhhNovedadLiquidacion.findAll({
    where: {
      idEntidad,
      periodo,
      eliminado: false,
      aprobado: true,
    },
    order: [
      ["fechaNovedad", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  })

  const totalMinutosTrabajados = sumField(asistencias, "minutosTrabajados")
  const totalMinutosExtra = Math.max(sumField(asistencias, "minutosExtra"), 0)
  const totalMinutosTarde = Math.max(sumField(asistencias, "minutosTarde"), 0)
  const totalMinutosAusencia = Math.max(sumField(asistencias, "minutosAusencia"), 0)

  const sueldoBase = Math.max(Number(contratoBase.sueldoBase) || 0, 0)
  const pagoPorHora = Math.max(Number(contratoBase.pagoPorHora) || 0, 0)
  const pagoPorHoraExtra = Math.max(Number(contratoBase.pagoPorHoraExtra) || pagoPorHora || 0, 0)

  const importeBasico = sueldoBase > 0
    ? roundCurrency(sueldoBase)
    : roundCurrency((totalMinutosTrabajados / 60) * pagoPorHora)

  const importeHorasExtra = pagoPorHoraExtra > 0
    ? roundCurrency((totalMinutosExtra / 60) * pagoPorHoraExtra)
    : 0

  const descuentoTarde = pagoPorHora > 0
    ? roundCurrency((totalMinutosTarde / 60) * pagoPorHora)
    : 0

  const descuentoAusencia = pagoPorHora > 0
    ? roundCurrency((totalMinutosAusencia / 60) * pagoPorHora)
    : 0

  const detalles = []

  buildDetallePayload(detalles, {
    codigoConcepto: "BASICO",
    descripcion: "Sueldo base del período",
    tipoConcepto: "HABER",
    origen: "CONTRATO",
    cantidad: sueldoBase > 0 ? 1 : roundCurrency(totalMinutosTrabajados / 60),
    baseCalculo: sueldoBase > 0 ? sueldoBase : pagoPorHora,
    importe: importeBasico,
  })

  buildDetallePayload(detalles, {
    codigoConcepto: "HORAS_EXTRA",
    descripcion: "Horas extra liquidadas",
    tipoConcepto: "HABER",
    origen: "ASISTENCIA",
    cantidad: roundCurrency(totalMinutosExtra / 60),
    baseCalculo: pagoPorHoraExtra,
    importe: importeHorasExtra,
  })

  buildDetallePayload(detalles, {
    codigoConcepto: "DESCUENTO_TARDE",
    descripcion: "Descuento por tardanzas",
    tipoConcepto: "DESCUENTO",
    origen: "ASISTENCIA",
    cantidad: roundCurrency(totalMinutosTarde / 60),
    baseCalculo: pagoPorHora,
    importe: descuentoTarde,
  })

  buildDetallePayload(detalles, {
    codigoConcepto: "DESCUENTO_AUSENCIA",
    descripcion: "Descuento por ausencias",
    tipoConcepto: "DESCUENTO",
    origen: "ASISTENCIA",
    cantidad: roundCurrency(totalMinutosAusencia / 60),
    baseCalculo: pagoPorHora,
    importe: descuentoAusencia,
  })

  let totalNovedades = 0
  novedades.forEach((novedad) => {
    const importe = resolveMontoNovedad(novedad)
    const tipoConcepto = normalizarTipoConcepto(novedad.tipoConcepto)

    if (tipoConcepto === "HABER") totalNovedades += importe
    if (tipoConcepto === "DESCUENTO") totalNovedades -= importe

    buildDetallePayload(detalles, {
      codigoConcepto: `NOV_${novedad.categoria}`,
      descripcion: novedad.descripcion,
      tipoConcepto,
      origen: "NOVEDAD",
      cantidad: novedad.cantidad,
      baseCalculo: novedad.montoUnitario,
      importe,
      observaciones: novedad.observaciones,
    })
  })

  if (detalles.length === 0) {
    buildDetallePayload(detalles, {
      codigoConcepto: "SIN_MOVIMIENTOS",
      descripcion: "Liquidación sin movimientos calculados para el período",
      tipoConcepto: "INFORMATIVO",
      origen: "SISTEMA",
      importe: 0,
    })
  }

  const totalHaberes = roundCurrency(
    detalles
      .filter((detalle) => detalle.tipoConcepto === "HABER")
      .reduce((acc, detalle) => acc + (Number(detalle.importe) || 0), 0)
  )

  const totalDescuentos = roundCurrency(
    detalles
      .filter((detalle) => detalle.tipoConcepto === "DESCUENTO")
      .reduce((acc, detalle) => acc + (Number(detalle.importe) || 0), 0)
  )

  return {
    empleado,
    contratoBase,
    asistencias,
    novedades,
    liquidacionPayload: {
      idEntidad,
      periodo,
      estado: "BORRADOR",
      fechaLiquidacion: dayjs().format("YYYY-MM-DD"),
      fechaAprobacion: null,
      fechaPago: null,
      idContratoHistorial: contratoBase.id,
      totalHaberes,
      totalDescuentos,
      totalNeto: roundCurrency(totalHaberes - totalDescuentos),
      totalNovedades: roundCurrency(totalNovedades),
      totalMinutosExtra,
      totalMinutosTarde,
      totalMinutosAusencia,
      totalAsistenciasConsideradas: asistencias.length,
      observaciones: limpiarTexto(observaciones),
      creadoPor: idUsuario,
      eliminado: false,
    },
    detallesPayload: detalles,
  }
}

const findLiquidacionesDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Usuario } = adminModelInit(sequelize)
  const { RrhhEmpleado, RrhhContratoHistorial, RrhhLiquidacion } = rrhhModelInit(sequelize)
  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)

  const search = limpiarTexto(filtros.search)
  const periodo = normalizarPeriodoMensual(filtros.periodo)
  const estado = normalizarEstadoLiquidacion(filtros.estado)
  const idEntidad = parsePositiveInteger(filtros.idEntidad)

  const where = {
    eliminado: false,
  }

  if (periodo) where.periodo = periodo
  if (estado) where.estado = estado
  if (idEntidad) where.idEntidad = idEntidad

  if (search) {
    where[Op.or] = [
      { periodo: { [Op.iLike]: `%${search}%` } },
      { "$entidad.descripcion$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.apellido$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.dniCuitCuil$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.rrhhEmpleado.legajo$": { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhLiquidacion.findAndCountAll({
    where,
    include: buildLiquidacionInclude({ Entidad, RrhhEmpleado, RrhhContratoHistorial, Usuario }),
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [
      ["periodo", "DESC"],
      ["id", "DESC"],
    ],
  })

  return {
    data: rows,
    currentPage,
    totalPages: Math.ceil(count / rowsPerPage) || 1,
    total: count,
  }
}

const findLiquidacionByIdDB = async (tenant, usuario, idLiquidacion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Usuario } = adminModelInit(sequelize)
  const {
    RrhhEmpleado,
    RrhhContratoHistorial,
    RrhhLiquidacion,
    RrhhLiquidacionDetalle,
    RrhhNovedadLiquidacion,
  } = rrhhModelInit(sequelize)

  const liquidacion = await RrhhLiquidacion.findOne({
    where: {
      id: idLiquidacion,
      eliminado: false,
    },
    include: buildLiquidacionInclude({ Entidad, RrhhEmpleado, RrhhContratoHistorial, Usuario }),
  })

  if (!liquidacion) return null

  const detalles = await RrhhLiquidacionDetalle.findAll({
    where: {
      idLiquidacion,
      eliminado: false,
    },
    order: [
      ["orden", "ASC"],
      ["id", "ASC"],
    ],
  })

  const novedades = await RrhhNovedadLiquidacion.findAll({
    where: {
      idEntidad: liquidacion.idEntidad,
      periodo: liquidacion.periodo,
      eliminado: false,
    },
    order: [
      ["fechaNovedad", "DESC"],
      ["id", "DESC"],
    ],
  })

  return {
    ...liquidacion.toJSON(),
    detalles,
    novedades,
  }
}

const findNovedadesLiquidacionDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Usuario } = adminModelInit(sequelize)
  const { RrhhEmpleado, RrhhNovedadLiquidacion } = rrhhModelInit(sequelize)
  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)

  const search = limpiarTexto(filtros.search)
  const periodo = normalizarPeriodoMensual(filtros.periodo)
  const idEntidad = parsePositiveInteger(filtros.idEntidad)
  const aprobado = filtros.aprobado === undefined ? null : parseBoolean(filtros.aprobado, false)

  const where = {
    eliminado: false,
  }

  if (periodo) where.periodo = periodo
  if (idEntidad) where.idEntidad = idEntidad
  if (aprobado !== null) where.aprobado = aprobado

  if (search) {
    where[Op.or] = [
      { descripcion: { [Op.iLike]: `%${search}%` } },
      { categoria: { [Op.iLike]: `%${search}%` } },
      { "$entidad.descripcion$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.apellido$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.rrhhEmpleado.legajo$": { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhNovedadLiquidacion.findAndCountAll({
    where,
    include: buildNovedadInclude({ Entidad, RrhhEmpleado, Usuario }),
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [
      ["fechaNovedad", "DESC"],
      ["id", "DESC"],
    ],
  })

  return {
    data: rows,
    currentPage,
    totalPages: Math.ceil(count / rowsPerPage) || 1,
    total: count,
  }
}

// #########################################################################################################################
// POLICY: LOGICA DE NEGOCIO
// #########################################################################################################################

const getLiquidaciones = async (req, res) => {
  try {
    const liquidaciones = await findLiquidacionesDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(liquidaciones)
  } catch (error) {
    console.error("Error al obtener liquidaciones RRHH:", error)
    return res.status(500).json({ message: "Error al obtener liquidaciones RRHH", error })
  }
}

const getLiquidacionById = async (req, res) => {
  const idLiquidacion = parsePositiveInteger(req.params.idLiquidacion)

  if (!idLiquidacion) {
    return res.status(400).json({ message: "idLiquidacion inválido" })
  }

  try {
    const liquidacion = await findLiquidacionByIdDB(req.cookies.tenant, req.cookies.usuario, idLiquidacion)

    if (!liquidacion) {
      return res.status(404).json({ message: "Liquidación RRHH no encontrada" })
    }

    return res.status(200).json(liquidacion)
  } catch (error) {
    console.error("Error al obtener liquidación RRHH:", error)
    return res.status(500).json({ message: "Error al obtener liquidación RRHH", error })
  }
}

const postLiquidacion = async (req, res) => {
  const idUsuario = parsePositiveInteger(req.cookies.usuario)
  const liquidacionPayload = buildLiquidacionPayload(req.body.liquidacion || {})

  if (!liquidacionPayload.idEntidad || !liquidacionPayload.periodo) {
    return res.status(400).json({ message: "idEntidad y periodo son requeridos" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhLiquidacion, RrhhLiquidacionDetalle } = rrhhModelInit(sequelize)

    let liquidacionCreadaId = null

    await sequelize.transaction(async (transaction) => {
      const existente = await RrhhLiquidacion.findOne({
        where: {
          idEntidad: liquidacionPayload.idEntidad,
          periodo: liquidacionPayload.periodo,
          eliminado: false,
        },
        transaction,
      })

      if (existente) {
        throw buildManagedError("Ya existe una liquidación para ese empleado y período.", 409)
      }

      const calculada = await construirLiquidacionCalculadaDB(
        sequelize,
        {
          ...liquidacionPayload,
          idUsuario,
        },
        transaction
      )

      const liquidacion = await RrhhLiquidacion.create(calculada.liquidacionPayload, { transaction })

      await RrhhLiquidacionDetalle.bulkCreate(
        calculada.detallesPayload.map((detalle) => ({
          ...detalle,
          idLiquidacion: liquidacion.id,
          eliminado: false,
        })),
        { transaction }
      )

      liquidacionCreadaId = liquidacion.id
    })

    const liquidacion = await findLiquidacionByIdDB(req.cookies.tenant, req.cookies.usuario, liquidacionCreadaId)
    return res.status(201).json(liquidacion)
  } catch (error) {
    console.error("Error al crear liquidación RRHH:", error)
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error al crear liquidación RRHH",
      error,
    })
  }
}

const updateLiquidacion = async (req, res) => {
  const idLiquidacion = parsePositiveInteger(req.params.idLiquidacion)
  const payload = req.body.liquidacion || {}

  if (!idLiquidacion) {
    return res.status(400).json({ message: "idLiquidacion inválido" })
  }

  const estadoRecibido = Object.prototype.hasOwnProperty.call(payload, "estado")
  const observacionesRecibidas = Object.prototype.hasOwnProperty.call(payload, "observaciones")
  const fechaPagoRecibida = Object.prototype.hasOwnProperty.call(payload, "fechaPago")

  const estado = estadoRecibido ? normalizarEstadoLiquidacion(payload.estado) : null
  const observaciones = observacionesRecibidas ? limpiarTexto(payload.observaciones) : undefined
  const fechaPago = fechaPagoRecibida ? normalizarFecha(payload.fechaPago) : undefined

  if (estadoRecibido && !estado) {
    return res.status(400).json({ message: "estado inválido" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhLiquidacion } = rrhhModelInit(sequelize)

    const liquidacion = await RrhhLiquidacion.findOne({
      where: {
        id: idLiquidacion,
        eliminado: false,
      },
    })

    if (!liquidacion) {
      return res.status(404).json({ message: "Liquidación RRHH no encontrada" })
    }

    if (fechaPagoRecibida && !estadoRecibido && liquidacion.estado !== "PAGADA") {
      return res.status(400).json({ message: "Solo podés informar fechaPago en liquidaciones pagadas." })
    }

    const updates = {}
    const hoy = dayjs().format("YYYY-MM-DD")

    if (observacionesRecibidas) updates.observaciones = observaciones

    if (estadoRecibido) {
      updates.estado = estado

      if (estado === "BORRADOR") {
        updates.fechaAprobacion = null
        updates.fechaPago = null
      }

      if (estado === "APROBADA") {
        updates.fechaAprobacion = liquidacion.fechaAprobacion || hoy
        updates.fechaPago = null
      }

      if (estado === "PAGADA") {
        updates.fechaAprobacion = liquidacion.fechaAprobacion || hoy
        updates.fechaPago = fechaPago || liquidacion.fechaPago || hoy
      }
    } else if (fechaPagoRecibida) {
      updates.fechaPago = fechaPago
    }

    await liquidacion.update(updates)

    const liquidacionActualizada = await findLiquidacionByIdDB(req.cookies.tenant, req.cookies.usuario, idLiquidacion)
    return res.status(200).json(liquidacionActualizada)
  } catch (error) {
    console.error("Error al actualizar liquidación RRHH:", error)
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error al actualizar liquidación RRHH",
      error,
    })
  }
}

const postRecalcularLiquidacion = async (req, res) => {
  const idLiquidacion = parsePositiveInteger(req.params.idLiquidacion)

  if (!idLiquidacion) {
    return res.status(400).json({ message: "idLiquidacion inválido" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhLiquidacion, RrhhLiquidacionDetalle } = rrhhModelInit(sequelize)

    await sequelize.transaction(async (transaction) => {
      const liquidacion = await RrhhLiquidacion.findOne({
        where: {
          id: idLiquidacion,
          eliminado: false,
        },
        transaction,
      })

      if (!liquidacion) {
        throw buildManagedError("Liquidación RRHH no encontrada.", 404)
      }

      if (liquidacion.estado !== "BORRADOR") {
        throw buildManagedError("Solo se pueden recalcular liquidaciones en estado borrador.", 400)
      }

      const calculada = await construirLiquidacionCalculadaDB(
        sequelize,
        {
          idEntidad: liquidacion.idEntidad,
          periodo: liquidacion.periodo,
          observaciones: liquidacion.observaciones,
          idUsuario: parsePositiveInteger(req.cookies.usuario),
        },
        transaction
      )

      await liquidacion.update(
        {
          idContratoHistorial: calculada.liquidacionPayload.idContratoHistorial,
          totalHaberes: calculada.liquidacionPayload.totalHaberes,
          totalDescuentos: calculada.liquidacionPayload.totalDescuentos,
          totalNeto: calculada.liquidacionPayload.totalNeto,
          totalNovedades: calculada.liquidacionPayload.totalNovedades,
          totalMinutosExtra: calculada.liquidacionPayload.totalMinutosExtra,
          totalMinutosTarde: calculada.liquidacionPayload.totalMinutosTarde,
          totalMinutosAusencia: calculada.liquidacionPayload.totalMinutosAusencia,
          totalAsistenciasConsideradas: calculada.liquidacionPayload.totalAsistenciasConsideradas,
          fechaLiquidacion: dayjs().format("YYYY-MM-DD"),
        },
        { transaction }
      )

      await RrhhLiquidacionDetalle.update(
        { eliminado: true },
        {
          where: {
            idLiquidacion,
            eliminado: false,
          },
          transaction,
        }
      )

      await RrhhLiquidacionDetalle.bulkCreate(
        calculada.detallesPayload.map((detalle) => ({
          ...detalle,
          idLiquidacion,
          eliminado: false,
        })),
        { transaction }
      )
    })

    const liquidacion = await findLiquidacionByIdDB(req.cookies.tenant, req.cookies.usuario, idLiquidacion)
    return res.status(200).json(liquidacion)
  } catch (error) {
    console.error("Error al recalcular liquidación RRHH:", error)
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error al recalcular liquidación RRHH",
      error,
    })
  }
}

const getNovedadesLiquidacion = async (req, res) => {
  try {
    const novedades = await findNovedadesLiquidacionDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(novedades)
  } catch (error) {
    console.error("Error al obtener novedades RRHH:", error)
    return res.status(500).json({ message: "Error al obtener novedades RRHH", error })
  }
}

const postNovedadLiquidacion = async (req, res) => {
  const payload = buildNovedadPayload(req.body.novedad || {}, parsePositiveInteger(req.cookies.usuario))

  if (!payload.idEntidad || !payload.periodo || !payload.descripcion) {
    return res.status(400).json({ message: "idEntidad, periodo y descripcion son requeridos" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhNovedadLiquidacion } = rrhhModelInit(sequelize)

    const novedad = await RrhhNovedadLiquidacion.create(payload)
    return res.status(201).json(novedad)
  } catch (error) {
    console.error("Error al crear novedad RRHH:", error)
    return res.status(500).json({ message: "Error al crear novedad RRHH", error })
  }
}

const updateNovedadLiquidacion = async (req, res) => {
  const idNovedad = parsePositiveInteger(req.params.idNovedad)
  const payload = req.body.novedad || {}

  if (!idNovedad) {
    return res.status(400).json({ message: "idNovedad inválido" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhNovedadLiquidacion } = rrhhModelInit(sequelize)

    const novedad = await RrhhNovedadLiquidacion.findOne({
      where: {
        id: idNovedad,
        eliminado: false,
      },
    })

    if (!novedad) {
      return res.status(404).json({ message: "Novedad RRHH no encontrada" })
    }

    const montoTotalRecibido = parseFloatNullable(payload.montoTotal)
    const cantidad = parseFloatNullable(payload.cantidad)
    const montoUnitario = parseFloatNullable(payload.montoUnitario)
    const updates = {}

    if (Object.prototype.hasOwnProperty.call(payload, "fechaNovedad")) {
      const fechaNovedad = normalizarFecha(payload.fechaNovedad)
      if (!fechaNovedad) {
        return res.status(400).json({ message: "fechaNovedad inválida" })
      }
      updates.fechaNovedad = fechaNovedad
    }

    if (Object.prototype.hasOwnProperty.call(payload, "categoria")) {
      updates.categoria = normalizarCategoriaNovedad(payload.categoria)
    }

    if (Object.prototype.hasOwnProperty.call(payload, "tipoConcepto")) {
      updates.tipoConcepto = normalizarTipoConcepto(payload.tipoConcepto)
    }

    if (Object.prototype.hasOwnProperty.call(payload, "descripcion")) {
      const descripcion = limpiarTexto(payload.descripcion)
      if (!descripcion) {
        return res.status(400).json({ message: "descripcion es requerida" })
      }
      updates.descripcion = descripcion
    }

    if (Object.prototype.hasOwnProperty.call(payload, "cantidad")) updates.cantidad = cantidad
    if (Object.prototype.hasOwnProperty.call(payload, "montoUnitario")) updates.montoUnitario = montoUnitario

    if (
      Object.prototype.hasOwnProperty.call(payload, "montoTotal") ||
      Object.prototype.hasOwnProperty.call(payload, "cantidad") ||
      Object.prototype.hasOwnProperty.call(payload, "montoUnitario")
    ) {
      const cantidadFinal = cantidad ?? novedad.cantidad
      const montoUnitarioFinal = montoUnitario ?? novedad.montoUnitario
      const montoTotalCalculado = montoTotalRecibido ?? (
        cantidadFinal !== null && cantidadFinal !== undefined && montoUnitarioFinal !== null && montoUnitarioFinal !== undefined
          ? cantidadFinal * montoUnitarioFinal
          : novedad.montoTotal
      )

      updates.montoTotal = Math.abs(roundCurrency(montoTotalCalculado || 0))
    }

    if (Object.prototype.hasOwnProperty.call(payload, "aprobado")) {
      updates.aprobado = parseBoolean(payload.aprobado, novedad.aprobado)
    }

    if (Object.prototype.hasOwnProperty.call(payload, "observaciones")) {
      updates.observaciones = limpiarTexto(payload.observaciones)
    }

    await novedad.update(updates)
    return res.status(200).json(novedad)
  } catch (error) {
    console.error("Error al actualizar novedad RRHH:", error)
    return res.status(500).json({ message: "Error al actualizar novedad RRHH", error })
  }
}

module.exports = {
  getLiquidaciones,
  getLiquidacionById,
  postLiquidacion,
  updateLiquidacion,
  postRecalcularLiquidacion,
  getNovedadesLiquidacion,
  postNovedadLiquidacion,
  updateNovedadLiquidacion,
  findLiquidacionesDB,
  findLiquidacionByIdDB,
  findNovedadesLiquidacionDB,
  construirLiquidacionCalculadaDB,
}
