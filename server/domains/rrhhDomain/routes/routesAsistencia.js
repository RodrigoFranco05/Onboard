const express = require("express")
const router = express.Router()

const {
  getAsistencias,
  updateAsistencia,
  postRecalcularAsistencia,
} = require("../controllers/asistenciaController.js")

router.post("/recalcular", postRecalcularAsistencia)
router.get("/", getAsistencias)
router.put("/:idAsistencia", updateAsistencia)

module.exports = router
