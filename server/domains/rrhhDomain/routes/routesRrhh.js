const express = require("express")
const router = express.Router()

const { getEstadoRrhh } = require("../controllers/rrhhController.js")
const routesEmpleados = require("./routesEmpleados.js")
const routesTurnos = require("./routesTurnos.js")
const routesFichajes = require("./routesFichajes.js")
const routesAsistencia = require("./routesAsistencia.js")
const routesLiquidaciones = require("./routesLiquidaciones.js")
const routesReportes = require("./routesReportes.js")

// rutas rrhhController (dominio rrhh)
router.get("/getEstadoRrhh", getEstadoRrhh)
router.use("/empleados", routesEmpleados)
router.use("/turnos", routesTurnos)
router.use("/fichajes", routesFichajes)
router.use("/asistencia", routesAsistencia)
router.use("/liquidaciones", routesLiquidaciones)
router.use("/reportes", routesReportes)

module.exports = router
