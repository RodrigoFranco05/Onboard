const { Op } = require("sequelize")
const dayjs = require("dayjs")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")
const { rrhhModelInit } = require("../models/rrhhModel.js")

const EMPLEADO_TIPO_ENTIDAD_ID = 3
const ESTADOS_LABORALES_VALIDOS = new Set(["ACTIVO", "INACTIVO", "LICENCIA", "BAJA"])

// #########################################################################################################################
// SERVICES: FUNCIONES ATOMICAS
// #########################################################################################################################

const limpiarTexto = (valor) => {
  if (valor === undefined || valor === null) return null
  const texto = String(valor).trim()
  return texto.length > 0 ? texto : null
}

const extraerAtributosDinamicosEntidad = (entidadPayload = {}) => {
  const atributos = {}

  for (let i = 1; i <= 10; i++) {
    const key = `entidadDatoAtributo${i}`
    if (Object.prototype.hasOwnProperty.call(entidadPayload, key)) {
      atributos[key] = entidadPayload[key] || null
    }
  }

  return atributos
}

const normalizarEstadoLaboral = (estadoLaboral) => {
  const estado = limpiarTexto(estadoLaboral)
  if (!estado) return "ACTIVO"

  const estadoUpper = estado.toUpperCase()
  return ESTADOS_LABORALES_VALIDOS.has(estadoUpper) ? estadoUpper : "ACTIVO"
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

const parseFloatNullable = (valor) => {
  if (valor === undefined || valor === null || valor === "") return null
  const parsed = Number.parseFloat(valor)
  return Number.isFinite(parsed) ? parsed : null
}

const buildLegajoDefault = (idEntidad) => `EMP-${String(idEntidad).padStart(6, "0")}`

const buildPagination = ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1)
  const rowsPerPage = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)

  return {
    currentPage,
    rowsPerPage,
    offset: (currentPage - 1) * rowsPerPage,
  }
}

const buildEmpleadoCorePayload = (empleadoPayload = {}) => ({
  legajo: limpiarTexto(empleadoPayload.legajo),
  fechaIngreso: normalizarFecha(empleadoPayload.fechaIngreso),
  fechaEgreso: normalizarFecha(empleadoPayload.fechaEgreso),
  estadoLaboral: normalizarEstadoLaboral(empleadoPayload.estadoLaboral),
  idSupervisorEntidad: parsePositiveInteger(empleadoPayload.idSupervisorEntidad),
  idNegocio: parsePositiveInteger(empleadoPayload.idNegocio),
  idUbicacionBase: parsePositiveInteger(empleadoPayload.idUbicacionBase),
  cbu: limpiarTexto(empleadoPayload.cbu),
  observaciones: limpiarTexto(empleadoPayload.observaciones),
})

const buildEntidadPayload = (entidadPayload = {}) => ({
  descripcion: limpiarTexto(entidadPayload.descripcion),
  apellido: limpiarTexto(entidadPayload.apellido),
  telefono: limpiarTexto(entidadPayload.telefono),
  email: limpiarTexto(entidadPayload.email),
  dniCuitCuil: limpiarTexto(entidadPayload.dniCuitCuil),
  direccion: limpiarTexto(entidadPayload.direccion),
  localidad: limpiarTexto(entidadPayload.localidad),
  provincia: limpiarTexto(entidadPayload.provincia),
  idTipoEntidad: EMPLEADO_TIPO_ENTIDAD_ID,
  ...extraerAtributosDinamicosEntidad(entidadPayload),
})

const buildContratoPayload = (contratoPayload = {}) => ({
  fechaVigenciaDesde: normalizarFecha(contratoPayload.fechaVigenciaDesde),
  fechaVigenciaHasta: normalizarFecha(contratoPayload.fechaVigenciaHasta),
  puesto: limpiarTexto(contratoPayload.puesto),
  tipoJornada: limpiarTexto(contratoPayload.tipoJornada),
  sueldoBase: parseFloatNullable(contratoPayload.sueldoBase),
  pagoPorHora: parseFloatNullable(contratoPayload.pagoPorHora),
  pagoPorHoraExtra: parseFloatNullable(contratoPayload.pagoPorHoraExtra),
  sindicatoGremio: limpiarTexto(contratoPayload.sindicatoGremio),
  categoria: limpiarTexto(contratoPayload.categoria),
  observaciones: limpiarTexto(contratoPayload.observaciones),
})

const seleccionarContratoVigente = (contratos = [], fechaReferencia = dayjs().format("YYYY-MM-DD")) => {
  const fechaRef = dayjs(fechaReferencia)

  return (
    contratos.find((contrato) => {
      const desde = dayjs(contrato.fechaVigenciaDesde)
      const hasta = contrato.fechaVigenciaHasta ? dayjs(contrato.fechaVigenciaHasta) : null

      if (!desde.isValid()) return false
      if (desde.isAfter(fechaRef)) return false
      if (hasta && hasta.isBefore(fechaRef)) return false

      return true
    }) || contratos[0] || null
  )
}

const buildEmpleadoInclude = ({ Entidad, Negocio, Ubicacion }) => [
  {
    model: Entidad,
    as: "entidad",
    attributes: [
      "id",
      "descripcion",
      "apellido",
      "telefono",
      "email",
      "dniCuitCuil",
      "direccion",
      "localidad",
      "provincia",
      "idTipoEntidad",
      "entidadDatoAtributo1",
      "entidadDatoAtributo2",
      "entidadDatoAtributo3",
      "entidadDatoAtributo4",
      "entidadDatoAtributo5",
      "entidadDatoAtributo6",
      "entidadDatoAtributo7",
      "entidadDatoAtributo8",
      "entidadDatoAtributo9",
      "entidadDatoAtributo10",
    ],
    required: true,
  },
  {
    model: Entidad,
    as: "supervisor",
    attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
    required: false,
  },
  {
    model: Negocio,
    as: "negocio",
    attributes: ["id", "descripcion"],
    required: false,
  },
  {
    model: Ubicacion,
    as: "ubicacionBase",
    attributes: ["id", "descripcion"],
    required: false,
  },
]

// #########################################################################################################################
// CONTROLLER: ACCESO A LA BASE
// #########################################################################################################################

const findEmpleadoByIdDB = async (tenant, usuario, idEntidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Negocio, Ubicacion } = adminModelInit(sequelize)
  const { RrhhEmpleado, RrhhContratoHistorial } = rrhhModelInit(sequelize)

  const empleado = await RrhhEmpleado.findOne({
    where: {
      idEntidad,
      eliminado: false,
    },
    include: buildEmpleadoInclude({ Entidad, Negocio, Ubicacion }),
  })

  if (!empleado) return null

  const contratos = await RrhhContratoHistorial.findAll({
    where: {
      idEntidad,
      eliminado: false,
    },
    order: [
      ["fechaVigenciaDesde", "DESC"],
      ["id", "DESC"],
    ],
  })

  return {
    empleado,
    contratos,
    contratoVigente: seleccionarContratoVigente(contratos),
  }
}

const findContratosEmpleadoDB = async (tenant, usuario, idEntidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { RrhhContratoHistorial } = rrhhModelInit(sequelize)

  return await RrhhContratoHistorial.findAll({
    where: {
      idEntidad,
      eliminado: false,
    },
    order: [
      ["fechaVigenciaDesde", "DESC"],
      ["id", "DESC"],
    ],
  })
}

const findEmpleadosDB = async (tenant, usuario, filtros = {}) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Entidad, Negocio, Ubicacion } = adminModelInit(sequelize)
  const { RrhhEmpleado } = rrhhModelInit(sequelize)

  const { currentPage, rowsPerPage, offset } = buildPagination(filtros)
  const search = limpiarTexto(filtros.search)
  const estadoLaboral = limpiarTexto(filtros.estadoLaboral)
  const idNegocio = parsePositiveInteger(filtros.idNegocio)
  const idUbicacionBase = parsePositiveInteger(filtros.idUbicacionBase)

  const where = {
    eliminado: false,
  }

  if (estadoLaboral) where.estadoLaboral = estadoLaboral.toUpperCase()
  if (idNegocio) where.idNegocio = idNegocio
  if (idUbicacionBase) where.idUbicacionBase = idUbicacionBase

  if (search) {
    where[Op.or] = [
      { legajo: { [Op.iLike]: `%${search}%` } },
      { "$entidad.descripcion$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.apellido$": { [Op.iLike]: `%${search}%` } },
      { "$entidad.dniCuitCuil$": { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { count, rows } = await RrhhEmpleado.findAndCountAll({
    where,
    include: buildEmpleadoInclude({ Entidad, Negocio, Ubicacion }),
    distinct: true,
    limit: rowsPerPage,
    offset,
    order: [["idEntidad", "DESC"]],
  })

  return {
    data: rows,
    currentPage,
    totalPages: Math.ceil(count / rowsPerPage) || 1,
    total: count,
  }
}

const createContratoHistorialDB = async (sequelize, payload, transaction) => {
  const { RrhhContratoHistorial } = rrhhModelInit(sequelize)
  return await RrhhContratoHistorial.create(payload, { transaction })
}

// #########################################################################################################################
// POLICY: LOGICA DE NEGOCIO
// #########################################################################################################################

const getEmpleados = async (req, res) => {
  try {
    const data = await findEmpleadosDB(req.cookies.tenant, req.cookies.usuario, req.query)
    return res.status(200).json(data)
  } catch (error) {
    console.error("Error al obtener empleados RRHH:", error)
    return res.status(500).json({ message: "Error al obtener empleados RRHH", error })
  }
}

const getEmpleadoById = async (req, res) => {
  const idEntidad = parsePositiveInteger(req.params.idEntidad)

  if (!idEntidad) {
    return res.status(400).json({ message: "idEntidad inválido" })
  }

  try {
    const empleado = await findEmpleadoByIdDB(req.cookies.tenant, req.cookies.usuario, idEntidad)

    if (!empleado) {
      return res.status(404).json({ message: "Empleado RRHH no encontrado" })
    }

    return res.status(200).json(empleado)
  } catch (error) {
    console.error("Error al obtener empleado RRHH:", error)
    return res.status(500).json({ message: "Error al obtener empleado RRHH", error })
  }
}

const postEmpleado = async (req, res) => {
  const entidadPayload = buildEntidadPayload(req.body.entidad || {})
  const empleadoPayload = buildEmpleadoCorePayload(req.body.empleado || {})
  const contratoPayload = buildContratoPayload(req.body.contrato || {})

  if (!entidadPayload.descripcion) {
    return res.status(400).json({ message: "El nombre del empleado es requerido" })
  }

  if (!empleadoPayload.fechaIngreso) {
    return res.status(400).json({ message: "fechaIngreso es requerida" })
  }

  if (
    contratoPayload.fechaVigenciaHasta &&
    contratoPayload.fechaVigenciaDesde &&
    dayjs(contratoPayload.fechaVigenciaHasta).isBefore(dayjs(contratoPayload.fechaVigenciaDesde))
  ) {
    return res.status(400).json({ message: "La vigencia del contrato es inválida" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { Entidad } = adminModelInit(sequelize)
      const { RrhhEmpleado } = rrhhModelInit(sequelize)

      if (entidadPayload.dniCuitCuil) {
        const entidadExistente = await Entidad.findOne({
          where: {
            dniCuitCuil: entidadPayload.dniCuitCuil,
            eliminado: false,
          },
          transaction,
        })

        if (entidadExistente) {
          await transaction.rollback()
          return res.status(409).json({
            message: `Ya existe una entidad con el DNI/CUIT/CUIL: ${entidadPayload.dniCuitCuil}`,
            entidadExistente: {
              id: entidadExistente.id,
              descripcion: entidadExistente.descripcion,
              apellido: entidadExistente.apellido,
              dniCuitCuil: entidadExistente.dniCuitCuil,
            },
          })
        }
      }

      const entidad = await Entidad.create(entidadPayload, { transaction })

      const nuevoEmpleado = await RrhhEmpleado.create(
        {
          idEntidad: entidad.id,
          legajo: empleadoPayload.legajo || buildLegajoDefault(entidad.id),
          fechaIngreso: empleadoPayload.fechaIngreso,
          fechaEgreso: empleadoPayload.fechaEgreso,
          estadoLaboral: empleadoPayload.estadoLaboral,
          idSupervisorEntidad: empleadoPayload.idSupervisorEntidad,
          idNegocio: empleadoPayload.idNegocio,
          idUbicacionBase: empleadoPayload.idUbicacionBase,
          cbu: empleadoPayload.cbu,
          observaciones: empleadoPayload.observaciones,
        },
        { transaction }
      )

      if (contratoPayload.fechaVigenciaDesde || contratoPayload.puesto || contratoPayload.sueldoBase !== null) {
        await createContratoHistorialDB(
          sequelize,
          {
            idEntidad: entidad.id,
            fechaVigenciaDesde: contratoPayload.fechaVigenciaDesde || empleadoPayload.fechaIngreso,
            fechaVigenciaHasta: contratoPayload.fechaVigenciaHasta,
            puesto: contratoPayload.puesto,
            tipoJornada: contratoPayload.tipoJornada,
            sueldoBase: contratoPayload.sueldoBase,
            pagoPorHora: contratoPayload.pagoPorHora,
            pagoPorHoraExtra: contratoPayload.pagoPorHoraExtra,
            sindicatoGremio: contratoPayload.sindicatoGremio,
            categoria: contratoPayload.categoria,
            observaciones: contratoPayload.observaciones,
          },
          transaction
        )
      }

      await transaction.commit()

      const empleadoCreado = await findEmpleadoByIdDB(req.cookies.tenant, req.cookies.usuario, nuevoEmpleado.idEntidad)
      return res.status(201).json(empleadoCreado)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error al crear empleado RRHH:", error)
    return res.status(500).json({ message: "Error al crear empleado RRHH", error })
  }
}

const updateEmpleado = async (req, res) => {
  const idEntidad = parsePositiveInteger(req.params.idEntidad)

  if (!idEntidad) {
    return res.status(400).json({ message: "idEntidad inválido" })
  }

  const entidadPayload = buildEntidadPayload(req.body.entidad || {})
  const empleadoPayload = buildEmpleadoCorePayload(req.body.empleado || {})

  if (!entidadPayload.descripcion) {
    return res.status(400).json({ message: "El nombre del empleado es requerido" })
  }

  if (!empleadoPayload.fechaIngreso) {
    return res.status(400).json({ message: "fechaIngreso es requerida" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { Entidad } = adminModelInit(sequelize)
      const { RrhhEmpleado } = rrhhModelInit(sequelize)

      const empleado = await RrhhEmpleado.findOne({
        where: { idEntidad, eliminado: false },
        transaction,
      })

      if (!empleado) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado RRHH no encontrado" })
      }

      const entidad = await Entidad.findByPk(idEntidad, { transaction })

      if (!entidad) {
        await transaction.rollback()
        return res.status(404).json({ message: "Entidad base no encontrada" })
      }

      if (entidadPayload.dniCuitCuil) {
        const entidadExistente = await Entidad.findOne({
          where: {
            dniCuitCuil: entidadPayload.dniCuitCuil,
            eliminado: false,
            id: { [Op.ne]: idEntidad },
          },
          transaction,
        })

        if (entidadExistente) {
          await transaction.rollback()
          return res.status(409).json({
            message: `Ya existe otra entidad con el DNI/CUIT/CUIL: ${entidadPayload.dniCuitCuil}`,
            entidadExistente: {
              id: entidadExistente.id,
              descripcion: entidadExistente.descripcion,
              apellido: entidadExistente.apellido,
              dniCuitCuil: entidadExistente.dniCuitCuil,
            },
          })
        }
      }

      await entidad.update(entidadPayload, { transaction })
      await empleado.update(
        {
          legajo: empleadoPayload.legajo || empleado.legajo,
          fechaIngreso: empleadoPayload.fechaIngreso,
          fechaEgreso: empleadoPayload.fechaEgreso,
          estadoLaboral: empleadoPayload.estadoLaboral,
          idSupervisorEntidad: empleadoPayload.idSupervisorEntidad,
          idNegocio: empleadoPayload.idNegocio,
          idUbicacionBase: empleadoPayload.idUbicacionBase,
          cbu: empleadoPayload.cbu,
          observaciones: empleadoPayload.observaciones,
        },
        { transaction }
      )

      await transaction.commit()

      const empleadoActualizado = await findEmpleadoByIdDB(req.cookies.tenant, req.cookies.usuario, idEntidad)
      return res.status(200).json(empleadoActualizado)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error al actualizar empleado RRHH:", error)
    return res.status(500).json({ message: "Error al actualizar empleado RRHH", error })
  }
}

const getContratosEmpleado = async (req, res) => {
  const idEntidad = parsePositiveInteger(req.params.idEntidad)

  if (!idEntidad) {
    return res.status(400).json({ message: "idEntidad inválido" })
  }

  try {
    const contratos = await findContratosEmpleadoDB(req.cookies.tenant, req.cookies.usuario, idEntidad)
    return res.status(200).json({
      data: contratos,
      contratoVigente: seleccionarContratoVigente(contratos),
    })
  } catch (error) {
    console.error("Error al obtener contratos RRHH:", error)
    return res.status(500).json({ message: "Error al obtener contratos RRHH", error })
  }
}

const postContratoEmpleado = async (req, res) => {
  const idEntidad = parsePositiveInteger(req.params.idEntidad)
  const contratoPayload = buildContratoPayload(req.body.contrato || {})
  const cerrarContratoAnterior = req.body.cerrarContratoAnterior === true

  if (!idEntidad) {
    return res.status(400).json({ message: "idEntidad inválido" })
  }

  if (!contratoPayload.fechaVigenciaDesde) {
    return res.status(400).json({ message: "fechaVigenciaDesde es requerida" })
  }

  if (
    contratoPayload.fechaVigenciaHasta &&
    dayjs(contratoPayload.fechaVigenciaHasta).isBefore(dayjs(contratoPayload.fechaVigenciaDesde))
  ) {
    return res.status(400).json({ message: "La vigencia del contrato es inválida" })
  }

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
    const transaction = await sequelize.transaction()

    try {
      const { RrhhEmpleado, RrhhContratoHistorial } = rrhhModelInit(sequelize)

      const empleado = await RrhhEmpleado.findOne({
        where: { idEntidad, eliminado: false },
        transaction,
      })

      if (!empleado) {
        await transaction.rollback()
        return res.status(404).json({ message: "Empleado RRHH no encontrado" })
      }

      if (cerrarContratoAnterior) {
        const contratoAbierto = await RrhhContratoHistorial.findOne({
          where: {
            idEntidad,
            eliminado: false,
            fechaVigenciaHasta: null,
          },
          order: [["fechaVigenciaDesde", "DESC"]],
          transaction,
        })

        if (contratoAbierto) {
          await contratoAbierto.update(
            {
              fechaVigenciaHasta: dayjs(contratoPayload.fechaVigenciaDesde).subtract(1, "day").format("YYYY-MM-DD"),
            },
            { transaction }
          )
        }
      }

      const contrato = await createContratoHistorialDB(
        sequelize,
        {
          idEntidad,
          ...contratoPayload,
        },
        transaction
      )

      await transaction.commit()
      return res.status(201).json(contrato)
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  } catch (error) {
    console.error("Error al crear contrato RRHH:", error)
    return res.status(500).json({ message: "Error al crear contrato RRHH", error })
  }
}

module.exports = {
  getEmpleados,
  getEmpleadoById,
  postEmpleado,
  updateEmpleado,
  getContratosEmpleado,
  postContratoEmpleado,
  findEmpleadoByIdDB,
  findEmpleadosDB,
  findContratosEmpleadoDB,
  buildLegajoDefault,
  seleccionarContratoVigente,
}
