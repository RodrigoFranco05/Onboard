const express = require("express")
const router = express.Router()

const { getReporteResumen } = require("../controllers/reporteController.js")

router.get("/resumen", getReporteResumen)

module.exports = router
