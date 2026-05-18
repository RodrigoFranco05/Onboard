const { DataTypes } = require("sequelize")
const { adminModelInit } = require("../../../models/adminModel.js")

function rrhhModelInit(sequelize) {
  const existingModels = sequelize.models || {}
  const adminModels = adminModelInit(sequelize)
  const { Entidad, Ubicacion, Negocio, Usuario } = adminModels

  if (
    existingModels.RrhhEmpleado &&
    existingModels.RrhhContratoHistorial &&
    existingModels.RrhhTurno &&
    existingModels.RrhhTurnoEmpleado &&
    existingModels.RrhhFichajeEvento &&
    existingModels.RrhhAsistenciaDiaria &&
    existingModels.RrhhNovedadLiquidacion &&
    existingModels.RrhhLiquidacion &&
    existingModels.RrhhLiquidacionDetalle
  ) {
    return {
      ...adminModels,
      RrhhEmpleado: existingModels.RrhhEmpleado,
      RrhhContratoHistorial: existingModels.RrhhContratoHistorial,
      RrhhTurno: existingModels.RrhhTurno,
      RrhhTurnoEmpleado: existingModels.RrhhTurnoEmpleado,
      RrhhFichajeEvento: existingModels.RrhhFichajeEvento,
      RrhhAsistenciaDiaria: existingModels.RrhhAsistenciaDiaria,
      RrhhNovedadLiquidacion: existingModels.RrhhNovedadLiquidacion,
      RrhhLiquidacion: existingModels.RrhhLiquidacion,
      RrhhLiquidacionDetalle: existingModels.RrhhLiquidacionDetalle,
    }
  }

  const RrhhEmpleado = sequelize.define(
    "RrhhEmpleado",
    {
      idEntidad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      legajo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fechaIngreso: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      fechaEgreso: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      estadoLaboral: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "ACTIVO",
      },
      idSupervisorEntidad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Entidad, key: "id" },
      },
      idNegocio: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Negocio, key: "id" },
      },
      idUbicacionBase: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Ubicacion, key: "id" },
      },
      cbu: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhEmpleado",
      indexes: [
        { unique: true, fields: ["legajo"] },
        { fields: ["estadoLaboral"] },
        { fields: ["idNegocio"] },
        { fields: ["idUbicacionBase"] },
      ],
    }
  )

  const RrhhContratoHistorial = sequelize.define(
    "RrhhContratoHistorial",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      fechaVigenciaDesde: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      fechaVigenciaHasta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      puesto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tipoJornada: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sueldoBase: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      pagoPorHora: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      pagoPorHoraExtra: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      sindicatoGremio: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      categoria: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhContratoHistorial",
      indexes: [
        { fields: ["idEntidad"] },
        { fields: ["fechaVigenciaDesde"] },
        { fields: ["fechaVigenciaHasta"] },
      ],
    }
  )

  const RrhhTurno = sequelize.define(
    "RrhhTurno",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      codigo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      horaEntrada: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      horaSalida: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      minutosDescanso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosToleranciaIngreso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      horasBaseDiarias: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Usuario, key: "id" },
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhTurno",
      indexes: [
        { unique: true, fields: ["codigo"] },
        { fields: ["descripcion"] },
      ],
    }
  )

  const RrhhTurnoEmpleado = sequelize.define(
    "RrhhTurnoEmpleado",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      idTurno: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: RrhhTurno, key: "id" },
      },
      fechaVigenciaDesde: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      fechaVigenciaHasta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhTurnoEmpleado",
      indexes: [
        { fields: ["idEntidad"] },
        { fields: ["idTurno"] },
        { fields: ["fechaVigenciaDesde"] },
      ],
    }
  )

  const RrhhFichajeEvento = sequelize.define(
    "RrhhFichajeEvento",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      idTurno: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: RrhhTurno, key: "id" },
      },
      idUbicacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Ubicacion, key: "id" },
      },
      tipoEvento: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fechaHoraServidor: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      fechaHoraCliente: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      latitud: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      longitud: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      precisionGps: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      fuente: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "WEB",
      },
      metodoValidacion: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "SIN_VALIDACION",
      },
      deviceIdLogico: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Usuario, key: "id" },
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhFichajeEvento",
      indexes: [
        { fields: ["idEntidad"] },
        { fields: ["idTurno"] },
        { fields: ["idUbicacion"] },
        { fields: ["tipoEvento"] },
        { fields: ["fechaHoraServidor"] },
      ],
    }
  )

  const RrhhAsistenciaDiaria = sequelize.define(
    "RrhhAsistenciaDiaria",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      idTurno: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: RrhhTurno, key: "id" },
      },
      idUbicacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Ubicacion, key: "id" },
      },
      primerFichajeAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      ultimoFichajeAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cantidadEventos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosTrabajados: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosDescanso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosTarde: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosExtra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      minutosAusencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      estadoAsistencia: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "PRESENTE",
      },
      requiereRevision: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      cerrado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      origenCalculo: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "AUTOMATICO",
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhAsistenciaDiaria",
      indexes: [
        { unique: true, fields: ["idEntidad", "fecha"] },
        { fields: ["fecha"] },
        { fields: ["idTurno"] },
        { fields: ["idUbicacion"] },
        { fields: ["estadoAsistencia"] },
        { fields: ["cerrado"] },
      ],
    }
  )

  const RrhhNovedadLiquidacion = sequelize.define(
    "RrhhNovedadLiquidacion",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      periodo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fechaNovedad: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      categoria: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "OTRO",
      },
      tipoConcepto: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "HABER",
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cantidad: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      montoUnitario: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      montoTotal: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      aprobado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Usuario, key: "id" },
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhNovedadLiquidacion",
      indexes: [
        { fields: ["idEntidad"] },
        { fields: ["periodo"] },
        { fields: ["aprobado"] },
        { fields: ["tipoConcepto"] },
      ],
    }
  )

  const RrhhLiquidacion = sequelize.define(
    "RrhhLiquidacion",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idEntidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Entidad, key: "id" },
      },
      periodo: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      estado: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "BORRADOR",
      },
      fechaLiquidacion: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      fechaAprobacion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      fechaPago: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      idContratoHistorial: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: RrhhContratoHistorial, key: "id" },
      },
      totalHaberes: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      totalDescuentos: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      totalNeto: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      totalNovedades: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      totalMinutosExtra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalMinutosTarde: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalMinutosAusencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      totalAsistenciasConsideradas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creadoPor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: Usuario, key: "id" },
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhLiquidacion",
      indexes: [
        { unique: true, fields: ["idEntidad", "periodo"] },
        { fields: ["periodo"] },
        { fields: ["estado"] },
        { fields: ["fechaLiquidacion"] },
      ],
    }
  )

  const RrhhLiquidacionDetalle = sequelize.define(
    "RrhhLiquidacionDetalle",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      idLiquidacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: RrhhLiquidacion, key: "id" },
      },
      orden: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      codigoConcepto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      descripcion: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tipoConcepto: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "HABER",
      },
      origen: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "MANUAL",
      },
      cantidad: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      baseCalculo: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      importe: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eliminado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "rrhhLiquidacionDetalle",
      indexes: [
        { fields: ["idLiquidacion"] },
        { fields: ["tipoConcepto"] },
        { fields: ["origen"] },
        { fields: ["orden"] },
      ],
    }
  )

  Entidad.hasOne(RrhhEmpleado, { foreignKey: "idEntidad", as: "rrhhEmpleado" })
  RrhhEmpleado.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  Entidad.hasMany(RrhhEmpleado, { foreignKey: "idSupervisorEntidad", as: "rrhhEmpleadosSupervisados" })
  RrhhEmpleado.belongsTo(Entidad, { foreignKey: "idSupervisorEntidad", as: "supervisor" })

  Negocio.hasMany(RrhhEmpleado, { foreignKey: "idNegocio", as: "rrhhEmpleados" })
  RrhhEmpleado.belongsTo(Negocio, { foreignKey: "idNegocio", as: "negocio" })

  Ubicacion.hasMany(RrhhEmpleado, { foreignKey: "idUbicacionBase", as: "rrhhEmpleados" })
  RrhhEmpleado.belongsTo(Ubicacion, { foreignKey: "idUbicacionBase", as: "ubicacionBase" })

  Entidad.hasMany(RrhhContratoHistorial, { foreignKey: "idEntidad", as: "rrhhContratos" })
  RrhhContratoHistorial.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  Usuario.hasMany(RrhhTurno, { foreignKey: "creadoPor", as: "rrhhTurnosCreados" })
  RrhhTurno.belongsTo(Usuario, { foreignKey: "creadoPor", as: "usuarioCreador" })

  Entidad.hasMany(RrhhTurnoEmpleado, { foreignKey: "idEntidad", as: "rrhhAsignacionesTurno" })
  RrhhTurnoEmpleado.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  RrhhTurno.hasMany(RrhhTurnoEmpleado, { foreignKey: "idTurno", as: "empleadosAsignados" })
  RrhhTurnoEmpleado.belongsTo(RrhhTurno, { foreignKey: "idTurno", as: "turno" })

  Entidad.hasMany(RrhhFichajeEvento, { foreignKey: "idEntidad", as: "rrhhFichajes" })
  RrhhFichajeEvento.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  RrhhTurno.hasMany(RrhhFichajeEvento, { foreignKey: "idTurno", as: "fichajes" })
  RrhhFichajeEvento.belongsTo(RrhhTurno, { foreignKey: "idTurno", as: "turno" })

  Ubicacion.hasMany(RrhhFichajeEvento, { foreignKey: "idUbicacion", as: "rrhhFichajes" })
  RrhhFichajeEvento.belongsTo(Ubicacion, { foreignKey: "idUbicacion", as: "ubicacion" })

  Usuario.hasMany(RrhhFichajeEvento, { foreignKey: "creadoPor", as: "rrhhFichajesCreados" })
  RrhhFichajeEvento.belongsTo(Usuario, { foreignKey: "creadoPor", as: "usuarioCreador" })

  Entidad.hasMany(RrhhAsistenciaDiaria, { foreignKey: "idEntidad", as: "rrhhAsistencias" })
  RrhhAsistenciaDiaria.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  RrhhTurno.hasMany(RrhhAsistenciaDiaria, { foreignKey: "idTurno", as: "asistenciasDiarias" })
  RrhhAsistenciaDiaria.belongsTo(RrhhTurno, { foreignKey: "idTurno", as: "turno" })

  Ubicacion.hasMany(RrhhAsistenciaDiaria, { foreignKey: "idUbicacion", as: "rrhhAsistencias" })
  RrhhAsistenciaDiaria.belongsTo(Ubicacion, { foreignKey: "idUbicacion", as: "ubicacion" })

  Entidad.hasMany(RrhhNovedadLiquidacion, { foreignKey: "idEntidad", as: "rrhhNovedadesLiquidacion" })
  RrhhNovedadLiquidacion.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  Usuario.hasMany(RrhhNovedadLiquidacion, { foreignKey: "creadoPor", as: "rrhhNovedadesLiquidacionCreadas" })
  RrhhNovedadLiquidacion.belongsTo(Usuario, { foreignKey: "creadoPor", as: "usuarioCreador" })

  Entidad.hasMany(RrhhLiquidacion, { foreignKey: "idEntidad", as: "rrhhLiquidaciones" })
  RrhhLiquidacion.belongsTo(Entidad, { foreignKey: "idEntidad", as: "entidad" })

  RrhhContratoHistorial.hasMany(RrhhLiquidacion, { foreignKey: "idContratoHistorial", as: "liquidacionesBase" })
  RrhhLiquidacion.belongsTo(RrhhContratoHistorial, { foreignKey: "idContratoHistorial", as: "contratoBase" })

  Usuario.hasMany(RrhhLiquidacion, { foreignKey: "creadoPor", as: "rrhhLiquidacionesCreadas" })
  RrhhLiquidacion.belongsTo(Usuario, { foreignKey: "creadoPor", as: "usuarioCreador" })

  RrhhLiquidacion.hasMany(RrhhLiquidacionDetalle, { foreignKey: "idLiquidacion", as: "detalles" })
  RrhhLiquidacionDetalle.belongsTo(RrhhLiquidacion, { foreignKey: "idLiquidacion", as: "liquidacion" })

  return {
    ...adminModels,
    RrhhEmpleado,
    RrhhContratoHistorial,
    RrhhTurno,
    RrhhTurnoEmpleado,
    RrhhFichajeEvento,
    RrhhAsistenciaDiaria,
    RrhhNovedadLiquidacion,
    RrhhLiquidacion,
    RrhhLiquidacionDetalle,
  }
}

module.exports = { rrhhModelInit }
