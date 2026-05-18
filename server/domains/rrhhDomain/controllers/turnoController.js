const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")

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

const normalizarHora = (hora) => {
  const valor = limpiarTexto(hora)
  if (!valor) return null

  const match = valor.match(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/)
  if (!match) return null

  return match[3] ? valor : `${valor}:00`
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

const buildTurnoPayload = (turnoPayload = {}, idUsuario = null) => ({
  codigo: limpiarTexto(turnoPayload.codigo),
  descripcion: limpiarTexto(turnoPayload.descripcion),
  horaEntrada: normalizarHora(turnoPayload.horaEntrada),
  horaSalida: normalizarHora(turnoPayload.horaSalida),
  minutosDescanso: parsePositiveInteger(turnoPayload.minutosDescanso) || 0,
  minutosToleranciaIngreso: parsePositiveInteger(turnoPayload.minutosToleranciaIngreso) || 0,
  horasBaseDiarias: parseFloatNullable(turnoPayload.horasBaseDiarias),
  observaciones: limpiarTexto(turnoPayload.observaciones),
  creadoPor: idUsuario,
})

const buildAsignacionPayload = (payload = {}) => ({
  idEntidad: parsePositiveInteger(payload.idEntidad),
  idTurno: parsePositiveInteger(payload.idTurno),
  fechaVigenciaDesde: normalizarFecha(payload.fechaVigenciaDesde),
  fechaVigenciaHasta: normalizarFecha(payload.fechaVigenciaHasta),
  observaciones: limpiarTexto(payload.observaciones),
})

// #########################################################################################################################
// CONTROLLER: ACCESO A LA BASE
// #########################################################################################################################

const findTurnoByIdDB = async (tenant, usuario, idTurno) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Usuario } = adminModelInit(sequelize)
  const { RrhhTurno } = rrhhModelInit(sequelize)

  return await RrhhTurno.findOne({
    where: {
      id: idTurno,
      eliminado: false,
    },
    include: [
      {
        model: Usuario,
        as: "usuarioCreador",
        attributes: ["id", "usuario", "nombre", "apellido"],
        required: false,
      },
    ],
  })
}

const findTurnosDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Usuario } = adminModelInit(sequelize)
  const { RrhhTurno } = rrhhModelInit(sequelize)
  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)
  const search = limpiarTexto(filtros.search)

  const where = {
    eliminado: false,
  }

  if (search) {
    where[Op.or] = [
      { descripcion: { [Op.iLike]: `%${search}%` } },
      { codigo: { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhTurno.findAndCountAll({
    where,
    include: [
      {
        model: Usuario,
        as: "usuarioCreador",
        attributes: ["id", "usuario", "nombre", "apellido"],
        required: false,
      },
    ],
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [["id", "DESC"]],
  })

  return {
    data: rows,
    currentPage,
    totalPages: Math.ceil(count / rowsPerPage) || 1,
    total: count,
  }
}

const findAsignacionesTurnoByEmpleadoDB = async (tenant, usuario, idEntidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { RrhhTurno, RrhhTurnoEmpleado } = rrhhModelInit(sequelize)

  return await RrhhTurnoEmpleado.findAll({
    where: {
      idEntidad,
      eliminado: false,
    },
    include: [
      {
        model: RrhhTurno,
        as: "turno",
        required: true,
        where: { eliminado: false },
      },
    ],
    order: [
      ["fechaVigenciaDesde", "DESC"],
      ["id", "DESC"],
    ],
  })
}

// #########################################################################################################################
// POLICY: LOGICA DE NEGOCIO
// #########################################################################################################################

const getTurnos = async (req, res) => {
  try {
    const turnos = await findTurnosDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(turnos)
  } catch (error) {
    console.error("Error al obtener turnos RRHH:", error)
    return res.status(500).json({ message: "Error al obtener turnos RRHH", error })
  }
}

const getTurnoById = async (req, res) => {
  const idTurno = parsePositiveInteger(req.params.idTurno)

  if (!idTurno) {
    return res.status(400).json({ message: "idTurno inválido" })
  }

  try {
    const turno = await findTurnoByIdDB(req.cookies.tenant, req.cookies.usuario, idTurno)

    if (!turno) {
      return res.status(404).json({ message: "Turno RRHH no encontrado" })
    }

    return res.status(200).json(turno)
  } catch (error) {
    console.error("Error al obtener turno RRHH:", error)
    return res.status(500).json({ message: "Error al obtener turno RRHH", error })
  }
}

const postTurno = async (req, res) => {
  const idUsuario = parsePositiveInteger(req.cookies.usuario)
  const turnoPayload = buildTurnoPayload(req.body.turno || {}, idUsuario)

  if (!turnoPayload.descripcion || !turnoPayload.horaEntrada || !turnoPayload.horaSalida) {
    return res.status(400).json({ message: "descripcion, horaEntrada y horaSalida son requeridas" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhTurno } = rrhhModelInit(sequelize)

    const turno = await RrhhTurno.create(turnoPayload)
    return res.status(201).json(turno)
  } catch (error) {
    console.error("Error al crear turno RRHH:", error)
    return res.status(500).json({ message: "Error al crear turno RRHH", error })
  }
}

const updateTurno = async (req, res) => {
  const idTurno = parsePositiveInteger(req.params.idTurno)
  const turnoPayload = buildTurnoPayload(req.body.turno || {}, parsePositiveInteger(req.cookies.usuario))
  delete turnoPayload.creadoPor

  if (!idTurno) {
    return res.status(400).json({ message: "idTurno inválido" })
  }

  if (!turnoPayload.descripcion || !turnoPayload.horaEntrada || !turnoPayload.horaSalida) {
    return res.status(400).json({ message: "descripcion, horaEntrada y horaSalida son requeridas" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhTurno } = rrhhModelInit(sequelize)

    const turno = await RrhhTurno.findOne({
      where: {
        id: idTurno,
        eliminado: false,
      },
    })

    if (!turno) {
      return res.status(404).json({ message: "Turno RRHH no encontrado" })
    }

    await turno.update(turnoPayload)
    return res.status(200).json(turno)
  } catch (error) {
    console.error("Error al actualizar turno RRHH:", error)
    return res.status(500).json({ message: "Error al actualizar turno RRHH", error })
  }
}

const getAsignacionesTurnoByEmpleado = async (req, res) => {
  const idEntidad = parsePositiveInteger(req.params.idEntidad)

  if (!idEntidad) {
    return res.status(400).json({ message: "idEntidad inválido" })
  }

  try {
    const asignaciones = await findAsignacionesTurnoByEmpleadoDB(req.cookies.tenant, req.cookies.usuario, idEntidad)
    return res.status(200).json({ data: asignaciones })
  } catch (error) {
    console.error("Error al obtener asignaciones de turno RRHH:", error)
    return res.status(500).json({ message: "Error al obtener asignaciones de turno RRHH", error })
  }
}

const postAsignacionTurno = async (req, res) => {
  const payload = buildAsignacionPayload(req.body.asignacion || {})
  const cerrarAsignacionAnterior = req.body.cerrarAsignacionAnterior === true

  if (!payload.idEntidad || !payload.idTurno || !payload.fechaVigenciaDesde) {
    return res.status(400).json({ message: "idEntidad, idTurno y fechaVigenciaDesde son requeridos" })
  }

  if (payload.fechaVigenciaHasta && dayjs(payload.fechaVigenciaHasta).isBefore(dayjs(payload.fechaVigenciaDesde))) {
    return res.status(400).json({ message: "La vigencia de la asignación es inválida" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { Entidad } = adminModelInit(sequelize)
      const { RrhhEmpleado, RrhhTurno, RrhhTurnoEmpleado } = rrhhModelInit(sequelize)

      const entidad = await Entidad.findOne({
        where: {
          id: payload.idEntidad,
          idTipoEntidad: 3,
          eliminado: false,
        },
        transaction,
      })

      if (!entidad) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado base no encontrado" })
      }

      const empleadoRrhh = await RrhhEmpleado.findOne({
        where: {
          idEntidad: payload.idEntidad,
          eliminado: false,
        },
        transaction,
      })

      if (!empleadoRrhh) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado RRHH no encontrado" })
      }

      const turno = await RrhhTurno.findOne({
        where: {
          id: payload.idTurno,
          eliminado: false,
        },
        transaction,
      })

      if (!turno) {
        await transaction.rollback()
        return res.status(404).json({ message: "Turno RRHH no encontrado" })
      }

      if (cerrarAsignacionAnterior) {
        const asignacionAbierta = await RrhhTurnoEmpleado.findOne({
          where: {
            idEntidad: payload.idEntidad,
            eliminado: false,
            fechaVigenciaHasta: null,
          },
          order: [["fechaVigenciaDesde", "DESC"]],
          transaction,
        })

        if (asignacionAbierta) {
          await asignacionAbierta.update(
            {
              fechaVigenciaHasta: dayjs(payload.fechaVigenciaDesde).subtract(1, "day").format("YYYY-MM-DD"),
            },
            { transaction }
          )
        }
      }

      const asignacion = await RrhhTurnoEmpleado.create(payload, { transaction })

      await transaction.commit()
      return res.status(201).json(asignacion)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error al crear asignación de turno RRHH:", error)
    return res.status(500).json({ message: "Error al crear asignación de turno RRHH", error })
  }
}

module.exports = {
  getTurnos,
  getTurnoById,
  postTurno,
  updateTurno,
  getAsignacionesTurnoByEmpleado,
  postAsignacionTurno,
  findTurnoByIdDB,
  findTurnosDB,
  findAsignacionesTurnoByEmpleadoDB,
}
