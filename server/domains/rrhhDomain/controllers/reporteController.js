const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")
const { normalizarPeriodoMensual } = require("./rrhhController.js")

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

const roundCurrency = (valor) => {
  const parsed = Number(valor)
  if (!Number.isFinite(parsed)) return 0
  return Math.round(parsed * 100) / 100
}

const resolveReportFilters = (query = {}) => {
  const periodo = normalizarPeriodoMensual(query.periodo) || dayjs().format("YYYY-MM")
  const fechaDesde = normalizarFecha(query.fechaDesde) || `${periodo}-01`
  const fechaHasta = normalizarFecha(query.fechaHasta) || dayjs(`${periodo}-01`).endOf("month").format("YYYY-MM-DD")

  const desde = dayjs(fechaDesde)
  const hasta = dayjs(fechaHasta)

  if (!desde.isValid() || !hasta.isValid() || desde.isAfter(hasta)) {
    return null
  }

  return {
    periodo,
    fechaDesde,
    fechaHasta,
  }
}

const buildNombreEmpleado = (entidad = {}) => {
  const nombre = String(entidad.descripcion || "").trim()
  const apellido = String(entidad.apellido || "").trim()
  return [apellido, nombre].filter(Boolean).join(", ") || "Sin nombre"
}

const buildEmpleadoReportRow = (empleado) => ({
  id: empleado.idEntidad,
  idEntidad: empleado.idEntidad,
  legajo: empleado.legajo || "-",
  empleado: empleado.nombreCompleto,
  estadoLaboral: empleado.estadoLaboral || "ACTIVO",
  asistenciasCount: 0,
  presentes: 0,
  tardes: 0,
  ausentes: 0,
  incompletos: 0,
  licencias: 0,
  francos: 0,
  feriados: 0,
  sinTurno: 0,
  minutosTrabajados: 0,
  minutosExtra: 0,
  minutosTarde: 0,
  minutosAusencia: 0,
  requiereRevisionCount: 0,
  fichajesCount: 0,
  liquidacionEstado: null,
  liquidacionNeto: 0,
  novedadesMontoHaberes: 0,
  novedadesMontoDescuentos: 0,
  novedadesPendientes: 0,
})

const incrementEstadoAsistenciaEmpleado = (row, estado) => {
  switch (String(estado || "").toUpperCase()) {
    case "PRESENTE":
      row.presentes += 1
      break
    case "TARDE":
      row.tardes += 1
      break
    case "AUSENTE":
      row.ausentes += 1
      break
    case "INCOMPLETO":
      row.incompletos += 1
      break
    case "LICENCIA":
      row.licencias += 1
      break
    case "FRANCO":
      row.francos += 1
      break
    case "FERIADO":
      row.feriados += 1
      break
    case "SIN_TURNO":
      row.sinTurno += 1
      break
    default:
      break
  }
}

const incrementEstadoAsistenciaResumen = (resumen, estado) => {
  switch (String(estado || "").toUpperCase()) {
    case "PRESENTE":
      resumen.presentes += 1
      break
    case "TARDE":
      resumen.tardes += 1
      break
    case "AUSENTE":
      resumen.ausentes += 1
      break
    case "INCOMPLETO":
      resumen.incompletos += 1
      break
    case "LICENCIA":
      resumen.licencias += 1
      break
    case "FRANCO":
      resumen.francos += 1
      break
    case "FERIADO":
      resumen.feriados += 1
      break
    case "SIN_TURNO":
      resumen.sinTurno += 1
      break
    default:
      break
  }
}

// #########################################################################################################################
// CONTROLLER: ACCESO A LA BASE
// #########################################################################################################################

const buildReporteResumenDB = async (tenant, usuario, query = {}) => {
  const filtros = resolveReportFilters(query)
  if (!filtros) {
    const error = new Error("Parámetros de reporte inválidos")
    error.statusCode = 400
    throw error
  }

  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad } = adminModelInit(sequelize)
  const {
    RrhhEmpleado,
    RrhhFichajeEvento,
    RrhhAsistenciaDiaria,
    RrhhNovedadLiquidacion,
    RrhhLiquidacion,
  } = rrhhModelInit(sequelize)

  const [empleados, fichajes, asistencias, novedades, liquidaciones] = await Promise.all([
    RrhhEmpleado.findAll({
      where: { eliminado: false },
      include: [
        {
          model: Entidad,
          as: "entidad",
          attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
          required: true,
        },
      ],
      order: [["legajo", "ASC"]],
    }),
    RrhhFichajeEvento.findAll({
      where: {
        eliminado: false,
        fechaHoraServidor: {
          [Op.between]: [`${filtros.fechaDesde} 00:00:00`, `${filtros.fechaHasta} 23:59:59`],
        },
      },
      attributes: ["id", "idEntidad", "tipoEvento", "fuente"],
      order: [["fechaHoraServidor", "DESC"]],
    }),
    RrhhAsistenciaDiaria.findAll({
      where: {
        eliminado: false,
        fecha: {
          [Op.between]: [filtros.fechaDesde, filtros.fechaHasta],
        },
      },
      attributes: [
        "id",
        "idEntidad",
        "estadoAsistencia",
        "minutosTrabajados",
        "minutosExtra",
        "minutosTarde",
        "minutosAusencia",
        "requiereRevision",
      ],
      order: [["fecha", "DESC"]],
    }),
    RrhhNovedadLiquidacion.findAll({
      where: {
        eliminado: false,
        periodo: filtros.periodo,
      },
      attributes: [
        "id",
        "idEntidad",
        "fechaNovedad",
        "categoria",
        "tipoConcepto",
        "descripcion",
        "montoTotal",
        "aprobado",
      ],
      order: [
        ["fechaNovedad", "DESC"],
        ["id", "DESC"],
      ],
    }),
    RrhhLiquidacion.findAll({
      where: {
        eliminado: false,
        periodo: filtros.periodo,
      },
      attributes: [
        "id",
        "idEntidad",
        "estado",
        "fechaLiquidacion",
        "totalHaberes",
        "totalDescuentos",
        "totalNeto",
        "totalMinutosExtra",
        "totalMinutosTarde",
        "totalMinutosAusencia",
      ],
      order: [
        ["fechaLiquidacion", "DESC"],
        ["id", "DESC"],
      ],
    }),
  ])

  const empleadosResumen = {
    total: empleados.length,
    activos: 0,
    inactivos: 0,
    licencia: 0,
    baja: 0,
  }

  const empleadoMap = new Map()
  empleados.forEach((empleado) => {
    const plain = empleado.toJSON()
    const estadoLaboral = String(plain.estadoLaboral || "ACTIVO").toUpperCase()
    const empleadoBase = {
      idEntidad: plain.idEntidad,
      legajo: plain.legajo,
      estadoLaboral,
      nombreCompleto: buildNombreEmpleado(plain.entidad),
    }

    empleadoMap.set(plain.idEntidad, empleadoBase)

    if (estadoLaboral === "ACTIVO") empleadosResumen.activos += 1
    if (estadoLaboral === "INACTIVO") empleadosResumen.inactivos += 1
    if (estadoLaboral === "LICENCIA") empleadosResumen.licencia += 1
    if (estadoLaboral === "BAJA") empleadosResumen.baja += 1
  })

  const rowsByEmpleado = new Map(
    [...empleadoMap.values()].map((empleado) => [empleado.idEntidad, buildEmpleadoReportRow(empleado)])
  )

  const asistenciaResumen = {
    totalRegistros: asistencias.length,
    presentes: 0,
    tardes: 0,
    ausentes: 0,
    incompletos: 0,
    licencias: 0,
    francos: 0,
    feriados: 0,
    sinTurno: 0,
    minutosTrabajados: 0,
    minutosExtra: 0,
    minutosTarde: 0,
    minutosAusencia: 0,
    requiereRevision: 0,
  }

  asistencias.forEach((asistencia) => {
    const row = rowsByEmpleado.get(asistencia.idEntidad)
    if (!row) return

    row.asistenciasCount += 1
    row.minutosTrabajados += Number(asistencia.minutosTrabajados) || 0
    row.minutosExtra += Number(asistencia.minutosExtra) || 0
    row.minutosTarde += Number(asistencia.minutosTarde) || 0
    row.minutosAusencia += Number(asistencia.minutosAusencia) || 0
    if (asistencia.requiereRevision) row.requiereRevisionCount += 1

    incrementEstadoAsistenciaEmpleado(row, asistencia.estadoAsistencia)

    asistenciaResumen.minutosTrabajados += Number(asistencia.minutosTrabajados) || 0
    asistenciaResumen.minutosExtra += Number(asistencia.minutosExtra) || 0
    asistenciaResumen.minutosTarde += Number(asistencia.minutosTarde) || 0
    asistenciaResumen.minutosAusencia += Number(asistencia.minutosAusencia) || 0
    if (asistencia.requiereRevision) asistenciaResumen.requiereRevision += 1

    incrementEstadoAsistenciaResumen(asistenciaResumen, asistencia.estadoAsistencia)
  })

  const fichajesResumen = {
    totalEventos: fichajes.length,
    ingresos: 0,
    egresos: 0,
    inicioDescanso: 0,
    finDescanso: 0,
    porFuente: {},
  }

  fichajes.forEach((fichaje) => {
    const row = rowsByEmpleado.get(fichaje.idEntidad)
    if (row) row.fichajesCount += 1

    switch (String(fichaje.tipoEvento || "").toUpperCase()) {
      case "INGRESO":
        fichajesResumen.ingresos += 1
        break
      case "EGRESO":
        fichajesResumen.egresos += 1
        break
      case "INICIO_DESCANSO":
        fichajesResumen.inicioDescanso += 1
        break
      case "FIN_DESCANSO":
        fichajesResumen.finDescanso += 1
        break
      default:
        break
    }

    const fuente = String(fichaje.fuente || "SIN_FUENTE").toUpperCase()
    fichajesResumen.porFuente[fuente] = (fichajesResumen.porFuente[fuente] || 0) + 1
  })

  const novedadesResumen = {
    total: novedades.length,
    aprobadas: 0,
    pendientes: 0,
    montoHaberes: 0,
    montoDescuentos: 0,
  }

  const novedadesDetalle = novedades.map((novedad) => {
    const empleado = empleadoMap.get(novedad.idEntidad)
    const monto = roundCurrency(novedad.montoTotal)

    if (novedad.aprobado) novedadesResumen.aprobadas += 1
    else novedadesResumen.pendientes += 1

    if (String(novedad.tipoConcepto || "").toUpperCase() === "HABER") {
      novedadesResumen.montoHaberes += monto
    }
    if (String(novedad.tipoConcepto || "").toUpperCase() === "DESCUENTO") {
      novedadesResumen.montoDescuentos += monto
    }

    const row = rowsByEmpleado.get(novedad.idEntidad)
    if (row) {
      if (novedad.aprobado && String(novedad.tipoConcepto || "").toUpperCase() === "HABER") {
        row.novedadesMontoHaberes += monto
      }
      if (novedad.aprobado && String(novedad.tipoConcepto || "").toUpperCase() === "DESCUENTO") {
        row.novedadesMontoDescuentos += monto
      }
      if (!novedad.aprobado) row.novedadesPendientes += 1
    }

    return {
      id: novedad.id,
      idEntidad: novedad.idEntidad,
      empleado: empleado?.nombreCompleto || "Empleado no encontrado",
      legajo: empleado?.legajo || "-",
      fechaNovedad: novedad.fechaNovedad,
      categoria: novedad.categoria,
      tipoConcepto: novedad.tipoConcepto,
      descripcion: novedad.descripcion,
      montoTotal: monto,
      aprobado: novedad.aprobado === true,
    }
  })

  const liquidacionesResumen = {
    total: liquidaciones.length,
    borrador: 0,
    aprobada: 0,
    pagada: 0,
    totalHaberes: 0,
    totalDescuentos: 0,
    totalNeto: 0,
  }

  const liquidacionesDetalle = liquidaciones.map((liquidacion) => {
    const empleado = empleadoMap.get(liquidacion.idEntidad)
    const estado = String(liquidacion.estado || "").toUpperCase()

    if (estado === "BORRADOR") liquidacionesResumen.borrador += 1
    if (estado === "APROBADA") liquidacionesResumen.aprobada += 1
    if (estado === "PAGADA") liquidacionesResumen.pagada += 1

    liquidacionesResumen.totalHaberes += Number(liquidacion.totalHaberes) || 0
    liquidacionesResumen.totalDescuentos += Number(liquidacion.totalDescuentos) || 0
    liquidacionesResumen.totalNeto += Number(liquidacion.totalNeto) || 0

    const row = rowsByEmpleado.get(liquidacion.idEntidad)
    if (row) {
      row.liquidacionEstado = estado
      row.liquidacionNeto = roundCurrency(liquidacion.totalNeto)
    }

    return {
      id: liquidacion.id,
      idEntidad: liquidacion.idEntidad,
      empleado: empleado?.nombreCompleto || "Empleado no encontrado",
      legajo: empleado?.legajo || "-",
      estado,
      fechaLiquidacion: liquidacion.fechaLiquidacion,
      totalHaberes: roundCurrency(liquidacion.totalHaberes),
      totalDescuentos: roundCurrency(liquidacion.totalDescuentos),
      totalNeto: roundCurrency(liquidacion.totalNeto),
      totalMinutosExtra: Number(liquidacion.totalMinutosExtra) || 0,
      totalMinutosTarde: Number(liquidacion.totalMinutosTarde) || 0,
      totalMinutosAusencia: Number(liquidacion.totalMinutosAusencia) || 0,
    }
  })

  const asistenciaPorEmpleado = [...rowsByEmpleado.values()].sort((a, b) => {
    if (b.minutosTarde !== a.minutosTarde) return b.minutosTarde - a.minutosTarde
    if (b.minutosAusencia !== a.minutosAusencia) return b.minutosAusencia - a.minutosAusencia
    return a.empleado.localeCompare(b.empleado)
  })

  const topTardanzas = [...asistenciaPorEmpleado]
    .filter((row) => row.minutosTarde > 0)
    .sort((a, b) => b.minutosTarde - a.minutosTarde)
    .slice(0, 5)

  const topHorasExtra = [...asistenciaPorEmpleado]
    .filter((row) => row.minutosExtra > 0)
    .sort((a, b) => b.minutosExtra - a.minutosExtra)
    .slice(0, 5)

  const presentismoBase = asistenciaResumen.totalRegistros || 0
  const presentismoOperativo = presentismoBase > 0
    ? roundCurrency(((asistenciaResumen.presentes + asistenciaResumen.tardes) / presentismoBase) * 100)
    : 0

  return {
    filtros,
    resumen: {
      empleados: empleadosResumen,
      asistencias: {
        ...asistenciaResumen,
        presentismoOperativo,
      },
      fichajes: fichajesResumen,
      novedades: {
        ...novedadesResumen,
        montoHaberes: roundCurrency(novedadesResumen.montoHaberes),
        montoDescuentos: roundCurrency(novedadesResumen.montoDescuentos),
      },
      liquidaciones: {
        ...liquidacionesResumen,
        totalHaberes: roundCurrency(liquidacionesResumen.totalHaberes),
        totalDescuentos: roundCurrency(liquidacionesResumen.totalDescuentos),
        totalNeto: roundCurrency(liquidacionesResumen.totalNeto),
      },
    },
    topTardanzas,
    topHorasExtra,
    asistenciaPorEmpleado,
    liquidacionesDetalle,
    novedadesDetalle,
  }
}

// #########################################################################################################################
// POLICY: LOGICA DE NEGOCIO
// #########################################################################################################################

const getReporteResumen = async (req, res) => {
  try {
    const reporte = await buildReporteResumenDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(reporte)
  } catch (error) {
    console.error("Error al obtener reporte RRHH:", error)
    return res.status(error.statusCode || 500).json({
      message: error.message || "Error al obtener reporte RRHH",
      error,
    })
  }
}

module.exports = {
  getReporteResumen,
  buildReporteResumenDB,
}
