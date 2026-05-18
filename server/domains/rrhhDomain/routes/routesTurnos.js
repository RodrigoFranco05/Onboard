const express = require("express")
const router = express.Router()

const {
  getTurnos,
  getTurnoById,
  postTurno,
  updateTurno,
  getAsignacionesTurnoByEmpleado,
  postAsignacionTurno,
} = require("../controllers/turnoController.js")

router.get("/empleados/:idEntidad/asignaciones", getAsignacionesTurnoByEmpleado)
router.post("/asignaciones", postAsignacionTurno)
router.get("/", getTurnos)
router.get("/:idTurno", getTurnoById)
router.post("/", postTurno)
router.put("/:idTurno", updateTurno)

module.exports = router
