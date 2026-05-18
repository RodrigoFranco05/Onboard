// rrhhController.js - Controller GENERAL del dominio RRHH
// Contiene lógica base del dominio y deja el módulo listo para crecer

const { conexionDB } = require("../../../config/db.js")

const RRHH_MODULES = [
  { id: "empleados", descripcion: "Maestro de empleados y ficha laboral" },
  { id: "turnos", descripcion: "Configuración y asignación de turnos" },
  { id: "fichajes", descripcion: "Eventos de fichaje y validaciones" },
  { id: "asistencia", descripcion: "Consolidado diario e incidencias" },
  { id: "liquidaciones", descripcion: "Liquidación de sueldos y pagos" },
]

// #########################################################################################################################
// #########################################################################################################################
// SERVICES: FUNCIONES ATOMICAS
// #########################################################################################################################
// #########################################################################################################################

/**
 * Normalizar período mensual a formato YYYY-MM
 */
const normalizarPeriodoMensual = (periodo) => {
  if (!periodo) return null

  const valor = String(periodo).trim()
  const match = valor.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  const [, anio, mes] = match
  const mesNumero = Number(mes)

  if (mesNumero < 1 || mesNumero > 12) return null

  return `${anio}-${mes}`
}

/**
 * Catálogo base del dominio RRHH
 */
const buildRrhhModulesCatalog = () => RRHH_MODULES.map((module) => ({ ...module }))

// #########################################################################################################################
// #########################################################################################################################
// CONTROLLER: ACCESO A LA BASE
// #########################################################################################################################
// #########################################################################################################################

/**
 * Verificar que el dominio RRHH puede resolver conexión del tenant actual
 */
const resolveRrhhDomainDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)

  return {
    tenant,
    conectado: Boolean(sequelize),
    dialect: sequelize.getDialect(),
  }
}

// #########################################################################################################################
// #########################################################################################################################
// POLICY: LOGICA DE NEGOCIO
// #########################################################################################################################
// #########################################################################################################################

/**
 * Endpoint base para confirmar que el dominio RRHH quedó montado
 */
const getEstadoRrhh = async (req, res) => {
  try {
    const contexto = await resolveRrhhDomainDB(req.cookies.tenant, req.cookies.usuario)

    return res.status(200).json({
      dominio: "rrhhDomain",
      estado: "ready",
      routePrefix: "/rrhhDomain",
      contexto,
      submodulos: buildRrhhModulesCatalog(),
    })
  } catch (error) {
    console.error("Error al obtener estado del dominio RRHH:", error)
    return res.status(500).json({
      message: "Error al obtener estado del dominio RRHH",
      error: error.message || error,
    })
  }
}

module.exports = {
  // POLICIES (para routes)
  getEstadoRrhh,

  // CONTROLLERS (para reutilizar en otros dominios/controllers)
  resolveRrhhDomainDB,

  // SERVICES (para reutilizar en cualquier parte)
  buildRrhhModulesCatalog,
  normalizarPeriodoMensual,
}
