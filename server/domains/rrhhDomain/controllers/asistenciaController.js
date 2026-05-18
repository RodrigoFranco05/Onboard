const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")

const ESTADOS_ASISTENCIA_VALIDOS = new Set([
  "PRESENTE",
  "TARDE",
  "AUSENTE",
  "INCOMPLETO",
  "LICENCIA",
  "FRANCO",
  "FERIADO",
  "SIN_TURNO",
])

const TIPOS_EVENTO_INGRESO = new Set(["INGRESO"])
const TIPOS_EVENTO_EGRESO = new Set(["EGRESO"])
const TIPOS_EVENTO_DESCANSO_INICIO = new Set(["INICIO_DESCANSO"])
const TIPOS_EVENTO_DESCANSO_FIN = new Set(["FIN_DESCANSO"])

// #########################################################################################################################
// SERVICES: FUNCIONES ATOMICAS
// #########################################################################################################################

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  return texto.length > 0 ? texto : null
}

const normalizarFecha = (fecha) => {
  const valor = limpiarTexto(fecha)
  if (!valor) return null

  const parsed = dayjs(valor)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null
}

const parsePositiveInteger = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null
  const parsed = Number.parseInt(valor, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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

const buildPagination = ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1)
  const rowsPerPage = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)

  return {
    currentPage,
    rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  }
}

const normalizarEstadoAsistencia = (estadoAsistencia) => {
  const estado = limpiarTexto(estadoAsistencia)
  if (!estado) return null
  const estadoUpper = estado.toUpperCase()
  return ESTADOS_ASISTENCIA_VALIDOS.has(estadoUpper) ? estadoUpper : null
}

const construirFechaHora = (fecha, hora) => {
  const horaNormalizada = limpiarTexto(hora)
  if (!fecha || !horaNormalizada) return null

  const candidate = dayjs(`${fecha}T${horaNormalizada}`)
  return candidate.isValid() ? candidate : null
}

const calcularMinutosEntre = (inicio, fin) => {
  if (!inicio || !fin || !inicio.isValid() || !fin.isValid()) return 0
  return Math.max(fin.diff(inicio, "minute"), 0)
}

const listarFechasEntre = (fechaDesde, fechaHasta) => {
  const inicio = dayjs(fechaDesde)
  const fin = dayjs(fechaHasta)

  if (!inicio.isValid() || !fin.isValid() || inicio.isAfter(fin)) return []

  const fechas = []
  let cursor = inicio

  while (cursor.isBefore(fin) || cursor.isSame(fin, "day")) {
    fechas.push(cursor.format("YYYY-MM-DD"))
    cursor = cursor.add(1, "day")
  }

  return fechas
}

const construirVentanaTurno = (fecha, turno) => {
  if (!turno?.horaEntrada || !turno?.horaSalida) {
    return {
      turnoInicio: null,
      turnoFin: null,
      minutosEsperados: 0,
    }
  }

  const turnoInicio = construirFechaHora(fecha, turno.horaEntrada)
  let turnoFin = construirFechaHora(fecha, turno.horaSalida)

  if (!turnoInicio || !turnoFin) {
    return {
      turnoInicio: null,
      turnoFin: null,
      minutosEsperados: 0,
    }
  }

  if (!turnoFin.isAfter(turnoInicio)) {
    turnoFin = turnoFin.add(1, "day")
  }

  const minutosPorDuracion = Math.max(
    calcularMinutosEntre(turnoInicio, turnoFin) - (Number(turno.minutosDescanso) || 0),
    0,
  )

  const minutosEsperados = turno.horasBaseDiarias
    ? Math.max(Math.round(Number(turno.horasBaseDiarias) * 60), 0)
    : minutosPorDuracion

  return {
    turnoInicio,
    turnoFin,
    minutosEsperados,
  }
}

const buildAsistenciaInclude = ({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion }) => [
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
    attributes: ["id", "codigo", "descripcion", "horaEntrada", "horaSalida", "minutosToleranciaIngreso", "minutosDescanso", "horasBaseDiarias"],
    required: false,
  },
  {
    model: Ubicacion,
    as: "ubicacion",
    attributes: ["id", "descripcion"],
    required: false,
  },
]

const findTurnoVigenteEmpleadoDB = async (sequelize, idEntidad, fecha, transaction = null) => {
  const { RrhhTurno, RrhhTurnoEmpleado } = rrhhModelInit(sequelize)

  return await RrhhTurnoEmpleado.findOne({
    where: {
      idEntidad,
      eliminado: false,
      fechaVigenciaDesde: {
        [Op.lte]: fecha,
      },
      [Op.or]: [
        { fechaVigenciaHasta: null },
        { fechaVigenciaHasta: { [Op.gte]: fecha } },
      ],
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
    transaction,
  })
}

const findAsistenciasDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Ubicacion } = adminModelInit(sequelize)
  const { RrhhEmpleado, RrhhTurno, RrhhAsistenciaDiaria } = rrhhModelInit(sequelize)
  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)

  const search = limpiarTexto(filtros.search)
  const fechaDesde = normalizarFecha(filtros.fechaDesde)
  const fechaHasta = normalizarFecha(filtros.fechaHasta)
  const idEntidad = parsePositiveInteger(filtros.idEntidad)
  const idUbicacion = parsePositiveInteger(filtros.idUbicacion)
  const idTurno = parsePositiveInteger(filtros.idTurno)
  const estadoAsistencia = normalizarEstadoAsistencia(filtros.estadoAsistencia)
  const cerrado = filtros.cerrado === undefined ? null : parseBoolean(filtros.cerrado, false)

  const where = {
    eliminado: false,
  }

  if (idEntidad) where.idEntidad = idEntidad
  if (idUbicacion) where.idUbicacion = idUbicacion
  if (idTurno) where.idTurno = idTurno
  if (estadoAsistencia) where.estadoAsistencia = estadoAsistencia
  if (cerrado !== null) where.cerrado = cerrado

  if (fechaDesde || fechaHasta) {
    where.fecha = {}
    if (fechaDesde) where.fecha[Op.gte] = fechaDesde
    if (fechaHasta) where.fecha[Op.lte] = fechaHasta
  }

  if (search) {
    where[Op.or] = [
      { "$entidad.descripcion$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.apellido$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.dniCuitCuil$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.rrhhEmpleado.legajo$": { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhAsistenciaDiaria.findAndCountAll({
    where,
    include: buildAsistenciaInclude({ Entidad, RrhhEmpleado, RrhhTurno, Ubicacion }),
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [
      ["fecha", "DESC"],
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
// POLICY: LOGICA DE NEGOCIO COMPARTIDA
// #########################################################################################################################

const recalcularAsistenciaParaFechaDB = async (
  sequelize,
  { idEntidad, fecha, transaction = null }
) => {
  const fechaNormalizada = normalizarFecha(fecha)

  if (!idEntidad || !fechaNormalizada) {
    throw new Error("idEntidad y fecha son requeridos para recalcular asistencia")
  }

  const { Entidad } = adminModelInit(sequelize)
  const {
    RrhhEmpleado,
    RrhhFichajeEvento,
    RrhhTurno,
    RrhhAsistenciaDiaria,
  } = rrhhModelInit(sequelize)

  const empleado = await RrhhEmpleado.findOne({
    where: {
      idEntidad,
      eliminado: false,
    },
    include: [
      {
        model: Entidad,
        as: "entidad",
        attributes: ["id", "descripcion", "apellido"],
        required: true,
      },
    ],
    transaction,
  })

  if (!empleado) {
    throw new Error(`Empleado RRHH no encontrado para idEntidad=${idEntidad}`)
  }

  const turnoAsignado = await findTurnoVigenteEmpleadoDB(sequelize, idEntidad, fechaNormalizada, transaction)
  const jornada = construirVentanaTurno(fechaNormalizada, turnoAsignado?.turno)
  const fechaInicio = dayjs(fechaNormalizada).startOf("day")
  const fechaFinBase = dayjs(fechaNormalizada).endOf("day")
  const fechaFin = jornada.turnoFin && jornada.turnoFin.isAfter(fechaFinBase)
    ? jornada.turnoFin.endOf("minute")
    : fechaFinBase

  const eventos = await RrhhFichajeEvento.findAll({
    where: {
      idEntidad,
      eliminado: false,
      fechaHoraServidor: {
        [Op.gte]: fechaInicio.toDate(),
        [Op.lte]: fechaFin.toDate(),
      },
    },
    order: [
      ["fechaHoraServidor", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  })

  const asistenciaActual = await RrhhAsistenciaDiaria.findOne({
    where: {
      idEntidad,
      fecha: fechaNormalizada,
      eliminado: false,
    },
    transaction,
  })

  if (!turnoAsignado && eventos.length === 0 && !asistenciaActual) {
    return {
      skipped: true,
      motivo: "SIN_DATOS_RELEVANTES",
    }
  }

  const primerIngresoAt = eventos.find((evento) => TIPOS_EVENTO_INGRESO.has(evento.tipoEvento))?.fechaHoraServidor || null
  const ultimoEgresoAt = [...eventos].reverse().find((evento) => TIPOS_EVENTO_EGRESO.has(evento.tipoEvento))?.fechaHoraServidor || null
  const ubicacionEvento = eventos.find((evento) => evento.idUbicacion)

  let ingresoAbierto = null
  let descansoAbierto = null
  let minutosBrutos = 0
  let minutosDescanso = 0
  let requiereRevision = false

  for (const evento of eventos) {
    const fechaEvento = dayjs(evento.fechaHoraServidor)

    if (TIPOS_EVENTO_INGRESO.has(evento.tipoEvento)) {
      if (ingresoAbierto) {
        requiereRevision = true
      }

      ingresoAbierto = fechaEvento
      continue
    }

    if (TIPOS_EVENTO_DESCANSO_INICIO.has(evento.tipoEvento)) {
      if (!ingresoAbierto || descansoAbierto) {
        requiereRevision = true
      } else {
        descansoAbierto = fechaEvento
      }

      continue
    }

    if (TIPOS_EVENTO_DESCANSO_FIN.has(evento.tipoEvento)) {
      if (!descansoAbierto) {
        requiereRevision = true
      } else {
        minutosDescanso += calcularMinutosEntre(descansoAbierto, fechaEvento)
        descansoAbierto = null
      }

      continue
    }

    if (TIPOS_EVENTO_EGRESO.has(evento.tipoEvento)) {
      if (descansoAbierto) {
        minutosDescanso += calcularMinutosEntre(descansoAbierto, fechaEvento)
        descansoAbierto = null
        requiereRevision = true
      }

      if (!ingresoAbierto) {
        requiereRevision = true
      } else {
        minutosBrutos += calcularMinutosEntre(ingresoAbierto, fechaEvento)
        ingresoAbierto = null
      }
    }
  }

  if (ingresoAbierto || descansoAbierto) {
    requiereRevision = true
  }

  const minutosTrabajados = Math.max(minutosBrutos - minutosDescanso, 0)
  const minutosEsperados = jornada.minutosEsperados || 0
  const tolerancia = Number(turnoAsignado?.turno?.minutosToleranciaIngreso) || 0
  let minutosTarde = 0
  if (jornada.turnoInicio && primerIngresoAt) {
    const inicioConTolerancia = jornada.turnoInicio.add(tolerancia, "minute")
    minutosTarde = Math.max(dayjs(primerIngresoAt).diff(inicioConTolerancia, "minute"), 0)
  }

  let minutosExtra = 0
  let minutosAusencia = 0

  if (minutosEsperados > 0) {
    minutosExtra = Math.max(minutosTrabajados - minutosEsperados, 0)
    minutosAusencia = eventos.length === 0
      ? minutosEsperados
      : Math.max(minutosEsperados - minutosTrabajados, 0)
  }

  let estadoAsistencia = "PRESENTE"

  if (eventos.length === 0) {
    estadoAsistencia = turnoAsignado ? "AUSENTE" : "SIN_TURNO"
  } else if (requiereRevision) {
    estadoAsistencia = "INCOMPLETO"
  } else if (minutosTarde > 0) {
    estadoAsistencia = "TARDE"
  } else if (!turnoAsignado) {
    estadoAsistencia = "SIN_TURNO"
  }

  const observacionesSistema = []
  if (!turnoAsignado && eventos.length > 0) {
    observacionesSistema.push("No existe turno asignado vigente para la fecha recalculada.")
  }
  if (eventos.length === 0 && turnoAsignado) {
    observacionesSistema.push("Ausencia detectada: no hay fichajes para un turno vigente.")
  }
  if (requiereRevision) {
    observacionesSistema.push("La secuencia de fichajes requiere revisión manual.")
  }

  const payload = {
    idTurno: turnoAsignado?.idTurno || turnoAsignado?.turno?.id || null,
    idUbicacion: ubicacionEvento?.idUbicacion || empleado.idUbicacionBase || null,
    primerFichajeAt: primerIngresoAt,
    ultimoFichajeAt: ultimoEgresoAt,
    cantidadEventos: eventos.length,
    minutosTrabajados,
    minutosDescanso,
    minutosTarde,
    minutosExtra,
    minutosAusencia,
    estadoAsistencia,
    requiereRevision,
    cerrado: asistenciaActual?.cerrado || false,
    origenCalculo: "AUTOMATICO",
    observaciones: observacionesSistema.length > 0 ? observacionesSistema.join(" ") : null,
  }

  if (asistenciaActual) {
    await asistenciaActual.update(payload, { transaction })
    return {
      skipped: false,
      created: false,
      updated: true,
      asistencia: asistenciaActual,
    }
  }

  const asistencia = await RrhhAsistenciaDiaria.create(
    {
      idEntidad,
      fecha: fechaNormalizada,
      ...payload,
    },
    { transaction }
  )

  return {
    skipped: false,
    created: true,
    updated: false,
    asistencia,
  }
}

// #########################################################################################################################
// CONTROLLER: ENDPOINTS
// #########################################################################################################################

const getAsistencias = async (req, res) => {
  try {
    const asistencias = await findAsistenciasDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(asistencias)
  } catch (error) {
    console.error("Error al obtener asistencias RRHH:", error)
    return res.status(500).json({ message: "Error al obtener asistencias RRHH", error })
  }
}

const updateAsistencia = async (req, res) => {
  const idAsistencia = parsePositiveInteger(req.params.idAsistencia)

  if (!idAsistencia) {
    return res.status(400).json({ message: "idAsistencia inválido" })
  }

  const estadoAsistencia = normalizarEstadoAsistencia(req.body?.asistencia?.estadoAsistencia)
  const observaciones = limpiarTexto(req.body?.asistencia?.observaciones)
  const cerrado = req.body?.asistencia?.cerrado
  const requiereRevision = req.body?.asistencia?.requiereRevision

  if (
    estadoAsistencia === null &&
    observaciones === null &&
    cerrado === undefined &&
    requiereRevision === undefined
  ) {
    return res.status(400).json({ message: "No hay cambios válidos para actualizar" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhAsistenciaDiaria } = rrhhModelInit(sequelize)

    const asistencia = await RrhhAsistenciaDiaria.findOne({
      where: {
        id: idAsistencia,
        eliminado: false,
      },
    })

    if (!asistencia) {
      return res.status(404).json({ message: "Asistencia RRHH no encontrada" })
    }

    const payload = {
      origenCalculo: "MANUAL",
    }

    if (estadoAsistencia) payload.estadoAsistencia = estadoAsistencia
    if (observaciones !== null) payload.observaciones = observaciones
    if (cerrado !== undefined) payload.cerrado = parseBoolean(cerrado, false)
    if (requiereRevision !== undefined) payload.requiereRevision = parseBoolean(requiereRevision, false)

    await asistencia.update(payload)
    return res.status(200).json(asistencia)
  } catch (error) {
    console.error("Error al actualizar asistencia RRHH:", error)
    return res.status(500).json({ message: "Error al actualizar asistencia RRHH", error })
  }
}

const postRecalcularAsistencia = async (req, res) => {
  const fechaDesde = normalizarFecha(req.body?.fechaDesde || req.body?.fecha)
  const fechaHasta = normalizarFecha(req.body?.fechaHasta || req.body?.fecha || req.body?.fechaDesde)
  const idEntidad = parsePositiveInteger(req.body?.idEntidad)

  if (!fechaDesde || !fechaHasta) {
    return res.status(400).json({ message: "fechaDesde y fechaHasta son requeridas" })
  }

  const rangoDias = dayjs(fechaHasta).diff(dayjs(fechaDesde), "day")
  if (rangoDias < 0) {
    return res.status(400).json({ message: "fechaHasta no puede ser menor que fechaDesde" })
  }

  if (rangoDias > 31) {
    return res.status(400).json({ message: "El rango máximo de recálculo es de 31 días" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const { RrhhEmpleado } = rrhhModelInit(sequelize)
    const fechas = listarFechasEntre(fechaDesde, fechaHasta)

    let empleadosObjetivo = []
    if (idEntidad) {
      empleadosObjetivo = [{ idEntidad }]
    } else {
      empleadosObjetivo = await RrhhEmpleado.findAll({
        where: {
          eliminado: false,
          estadoLaboral: "ACTIVO",
        },
        attributes: ["idEntidad"],
        order: [["idEntidad", "ASC"]],
      })
    }

    let creadas = 0
    let actualizadas = 0
    let omitidas = 0

    for (const empleado of empleadosObjetivo) {
      for (const fecha of fechas) {
        const resultado = await recalcularAsistenciaParaFechaDB(sequelize, {
          idEntidad: empleado.idEntidad,
          fecha,
        })

        if (resultado.skipped) {
          omitidas += 1
        } else if (resultado.created) {
          creadas += 1
        } else if (resultado.updated) {
          actualizadas += 1
        }
      }
    }

    return res.status(200).json({
      message: "Recálculo de asistencia completado",
      resumen: {
        empleadosProcesados: empleadosObjetivo.length,
        fechasProcesadas: fechas.length,
        creadas,
        actualizadas,
        omitidas,
      },
    })
  } catch (error) {
    console.error("Error al recalcular asistencia RRHH:", error)
    return res.status(500).json({ message: "Error al recalcular asistencia RRHH", error })
  }
}

module.exports = {
  getAsistencias,
  updateAsistencia,
  postRecalcularAsistencia,
  recalcularAsistenciaParaFechaDB,
  findTurnoVigenteEmpleadoDB,
}
