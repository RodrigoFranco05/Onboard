const express = require("express")
const router = express.Router()

// rutas preventa (dominio transaccion)
const {
  getPreventasList,
  getPreventaDetail,
  convertirPreventaAVenta,
  deletePreventa,
} = require("../controllers/preventaController.js")

router.get("/list", getPreventasList)
router.get("/:idTransaccion/detail", getPreventaDetail)
router.put("/:idTransaccion/convertirAVenta", convertirPreventaAVenta)
router.delete("/:idTransaccion", deletePreventa)

module.exports = router
