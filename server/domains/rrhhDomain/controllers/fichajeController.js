const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")
const { findTurnoVigenteEmpleadoDB, recalcularAsistenciaParaFechaDB } = require("./asistenciaController.js")

const TIPOS_EVENTO_VALIDOS = new Set(["INGRESO", "EGRESO", "INICIO_DESCANSO", "FIN_DESCANSO"])
const FUENTES_FICHAJE_VALIDAS = new Set(["WEB", "MANUAL", "KIOSCO"])
const METODOS_VALIDACION_VALIDOS = new Set(["GEOLOCALIZACION", "MANUAL", "SIN_VALIDACION"])

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

const normalizarFecha = (fecha) => {
  const valor = limpiarTexto(fecha)
  if (!valor) return null
  const parsed = dayjs(valor)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null
}

const normalizarFechaHora = (fechaHora) => {
  const valor = limpiarTexto(fechaHora)
  if (!valor) return null

  const parsed = dayjs(valor)
  return parsed.isValid() ? parsed.toDate() : null
}

const normalizarTipoEvento = (tipoEvento) => {
  const tipo = limpiarTexto(tipoEvento)
  if (!tipo) return null
  const normalized = tipo.toUpperCase()
  return TIPOS_EVENTO_VALIDOS.has(normalized) ? normalized : null
}

const normalizarFuente = (fuente, fallback = "WEB") => {
  const valor = limpiarTexto(fuente)
  if (!valor) return fallback
  const normalized = valor.toUpperCase()
  return FUENTES_FICHAJE_VALIDAS.has(normalized) ? normalized : fallback
}

const normalizarMetodoValidacion = (metodoValidacion, fallback = "SIN_VALIDACION") => {
  const valor = limpiarTexto(metodoValidacion)
  if (!valor) return fallback
  const normalized = valor.toUpperCase()
  return METODOS_VALIDACION_VALIDOS.has(normalized) ? normalized : fallback
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

const buildFichajePayload = (payload = {}, idUsuario = null) => {
  const latitud = parseFloatNullable(payload.latitud)
  const longitud = parseFloatNullable(payload.longitud)

  return {
    idEntidad: parsePositiveInteger(payload.idEntidad),
    idTurno: parsePositiveInteger(payload.idTurno),
    idUbicacion: parsePositiveInteger(payload.idUbicacion),
    tipoEvento: normalizarTipoEvento(payload.tipoEvento),
    fechaHoraServidor: normalizarFechaHora(payload.fechaHoraEvento) || new Date(),
    fechaHoraCliente: normalizarFechaHora(payload.fechaHoraCliente),
    latitud,
    longitud,
    precisionGps: parseFloatNullable(payload.precisionGps),
    fuente: normalizarFuente(payload.fuente, "WEB"),
    metodoValidacion: normalizarMetodoValidacion(
      payload.metodoValidacion,
      latitud !== null && longitud !== null ? "GEOLOCALIZACION" : "SIN_VALIDACION"
    ),
    deviceIdLogico: limpiarTexto(payload.deviceIdLogico),
    observaciones: limpiarTexto(payload.observaciones),
    creadoPor: idUsuario,
  }
}

const buildFichajeInclude = ({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion, Usuario }) => [
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
    model: RrhhTurno,
    as: "turno",
    attributes: ["id", "codigo", "descripcion"],
    required: false,
  },
  {
    model: Ubicacion,
    as: "ubicacion",
    attributes: ["id", "descripcion"],
    required: false,
  },
  {
    model: Usuario,
    as: "usuarioCreador",
    attributes: ["id", "usuario", "nombre", "apellido"],
    required: false,
  },
]

// #########################################################################################################################
// CONTROLLER: ACCESO A DATOS
// #########################################################################################################################

const findFichajesDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Ubicacion, Usuario } = adminModelInit(sequelize)
  const { RrhhEmpleado, RrhhTurno, RrhhFichajeEvento } = rrhhModelInit(sequelize)
  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)

  const search = limpiarTexto(filtros.search)
  const fechaDesde = normalizarFecha(filtros.fechaDesde)
  const fechaHasta = normalizarFecha(filtros.fechaHasta)
  const idEntidad = parsePositiveInteger(filtros.idEntidad)
  const idUbicacion = parsePositiveInteger(filtros.idUbicacion)
  const idTurno = parsePositiveInteger(filtros.idTurno)
  const tipoEvento = normalizarTipoEvento(filtros.tipoEvento)

  const where = {
    eliminado: false,
  }

  if (idEntidad) where.idEntidad = idEntidad
  if (idUbicacion) where.idUbicacion = idUbicacion
  if (idTurno) where.idTurno = idTurno
  if (tipoEvento) where.tipoEvento = tipoEvento

  if (fechaDesde || fechaHasta) {
    where.fechaHoraServidor = {}
    if (fechaDesde) where.fechaHoraServidor[Op.gte] = dayjs(fechaDesde).startOf("day").toDate()
    if (fechaHasta) where.fechaHoraServidor[Op.lte] = dayjs(fechaHasta).endOf("day").toDate()
  }

  if (search) {
    where[Op.or] = [
      { "$entidad.descripcion$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.apellido$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.dniCuitCuil$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.rrhhEmpleado.legajo$": { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhFichajeEvento.findAndCountAll({
    where,
    include: buildFichajeInclude({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion, Usuario }),
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [
      ["fechaHoraServidor", "DESC"],
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

const getFichajes = async (req, res) => {
  try {
    const fichajes = await findFichajesDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(fichajes)
  } catch (error) {
    console.error("Error al obtener fichajes RRHH:", error)
    return res.status(500).json({ message: "Error al obtener fichajes RRHH", error })
  }
}

const postFichaje = async (req, res) => {
  const idUsuario = parsePositiveInteger(req.cookies.usuario)
  const payload = buildFichajePayload(req.body?.fichaje || {}, idUsuario)

  if (!payload.idEntidad || !payload.tipoEvento) {
    return res.status(400).json({ message: "idEntidad y tipoEvento son requeridos" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { Entidad, Ubicacion, Usuario } = adminModelInit(sequelize)
      const { RrhhEmpleado, RrhhTurno, RrhhFichajeEvento } = rrhhModelInit(sequelize)

      const empleado = await RrhhEmpleado.findOne({
        where: {
          idEntidad: payload.idEntidad,
          eliminado: false,
        },
        transaction,
      })

      if (!empleado) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado RRHH no encontrado" })
      }

      if (!payload.idTurno) {
        const fechaFichaje = dayjs(payload.fechaHoraServidor).format("YYYY-MM-DD")
        const turnoAsignado = await findTurnoVigenteEmpleadoDB(
          sequelize,
          payload.idEntidad,
          fechaFichaje,
          transaction
        )
        payload.idTurno = turnoAsignado?.idTurno || turnoAsignado?.turno?.id || null
      }

      if (!payload.idUbicacion) {
        payload.idUbicacion = empleado.idUbicacionBase || null
      }

      const fichaje = await RrhhFichajeEvento.create(payload, { transaction })
      const fechaAsistencia = dayjs(payload.fechaHoraServidor).format("YYYY-MM-DD")
      const resultadoAsistencia = await recalcularAsistenciaParaFechaDB(sequelize, {
        idEntidad: payload.idEntidad,
        fecha: fechaAsistencia,
        transaction,
      })

      await transaction.commit()

      const fichajeCreado = await RrhhFichajeEvento.findOne({
        where: { id: fichaje.id },
        include: buildFichajeInclude({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion, Usuario }),
      })

      return res.status(201).json({
        fichaje: fichajeCreado,
        asistencia: resultadoAsistencia?.asistencia || null,
      })
    } catch (innerError) {
      await transaction.rollback()
      throw innerError
    }
  } catch (error) {
    console.error("Error al crear fichaje RRHH:", error)
    return res.status(500).json({ message: "Error al crear fichaje RRHH", error })
  }
}

const updateFichaje = async (req, res) => {
  const idFichaje = parsePositiveInteger(req.params.id)
  const payload = buildFichajePayload(req.body?.fichaje || {}, null)

  if (!idFichaje) {
    return res.status(400).json({ message: "id de fichaje invalido" })
  }

  if (!payload.idEntidad || !payload.tipoEvento) {
    return res.status(400).json({ message: "idEntidad y tipoEvento son requeridos" })
  }

  delete payload.creadoPor

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { Entidad, Ubicacion, Usuario } = adminModelInit(sequelize)
      const { RrhhEmpleado, RrhhTurno, RrhhFichajeEvento } = rrhhModelInit(sequelize)

      const fichaje = await RrhhFichajeEvento.findOne({
        where: { id: idFichaje, eliminado: false },
        transaction,
      })

      if (!fichaje) {
        await transaction.rollback()
        return res.status(404).json({ message: "Fichaje RRHH no encontrado" })
      }

      const fechaAnterior = dayjs(fichaje.fechaHoraServidor).format("YYYY-MM-DD")
      const idEntidadAnterior = fichaje.idEntidad

      const empleado = await RrhhEmpleado.findOne({
        where: {
          idEntidad: payload.idEntidad,
          eliminado: false,
        },
        transaction,
      })

      if (!empleado) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado RRHH no encontrado" })
      }

      if (!payload.idTurno) {
        const fechaFichaje = dayjs(payload.fechaHoraServidor).format("YYYY-MM-DD")
        const turnoAsignado = await findTurnoVigenteEmpleadoDB(
          sequelize,
          payload.idEntidad,
          fechaFichaje,
          transaction
        )
        payload.idTurno = turnoAsignado?.idTurno || turnoAsignado?.turno?.id || null
      }

      if (!payload.idUbicacion) {
        payload.idUbicacion = empleado.idUbicacionBase || null
      }

      await fichaje.update(payload, { transaction })

      const fechaNueva = dayjs(payload.fechaHoraServidor).format("YYYY-MM-DD")
      const resultadoAsistencia = await recalcularAsistenciaParaFechaDB(sequelize, {
        idEntidad: payload.idEntidad,
        fecha: fechaNueva,
        transaction,
      })

      if (idEntidadAnterior !== payload.idEntidad || fechaAnterior !== fechaNueva) {
        await recalcularAsistenciaParaFechaDB(sequelize, {
          idEntidad: idEntidadAnterior,
          fecha: fechaAnterior,
          transaction,
        })
      }

      await transaction.commit()

      const fichajeActualizado = await RrhhFichajeEvento.findOne({
        where: { id: idFichaje },
        include: buildFichajeInclude({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion, Usuario }),
      })

      return res.status(200).json({
        fichaje: fichajeActualizado,
        asistencia: resultadoAsistencia?.asistencia || null,
      })
    } catch (innerError) {
      await transaction.rollback()
      throw innerError
    }
  } catch (error) {
    console.error("Error al actualizar fichaje RRHH:", error)
    return res.status(500).json({ message: "Error al actualizar fichaje RRHH", error })
  }
}

module.exports = {
  getFichajes,
  postFichaje,
  updateFichaje,
}
