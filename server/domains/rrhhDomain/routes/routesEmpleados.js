const express = require("express")
const router = express.Router()

const {
  getEmpleados,
  getEmpleadoById,
  postEmpleado,
  updateEmpleado,
  getContratosEmpleado,
  postContratoEmpleado,
} = require("../controllers/empleadoController.js")

router.get("/", getEmpleados)
router.get("/:idEntidad", getEmpleadoById)
router.post("/", postEmpleado)
router.put("/:idEntidad", updateEmpleado)
router.get("/:idEntidad/contratos", getContratosEmpleado)
router.post("/:idEntidad/contratos", postContratoEmpleado)

module.exports = router
