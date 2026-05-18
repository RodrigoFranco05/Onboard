const express = require("express")
const router = express.Router()

const { getEntidadByID, getEntidadClienteTresLetras } = require("../controllers/entidadController.js")

// rutas entidadController (dominio admin)
router.get("/getEntidadByID/:idEntidad", getEntidadByID)
router.get("/getEntidadClienteTresLetras", getEntidadClienteTresLetras)

module.exports = router
