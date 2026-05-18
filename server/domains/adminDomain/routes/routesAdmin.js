const express = require("express")
const router = express.Router()

const {
  getUbicacion,
  getNegocio,
  getTipoEntidad,
  getUsuario,
  getParametrosGlobales,
  getIncluirImpuestos,
} = require("../controllers/adminController.js")

// rutas adminController (dominio admin)
router.get("/getUbicacion", getUbicacion)
router.get("/getNegocio", getNegocio)
router.get("/getTipoEntidad", getTipoEntidad)
router.get("/getUsuario", getUsuario)
router.post("/getParametrosGlobales", getParametrosGlobales)
router.get("/getIncluirImpuestos", getIncluirImpuestos)

module.exports = router
