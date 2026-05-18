const express = require("express")
const router = express.Router()

// rutas venta (dominio transaccion)
const {
  postTransaccionTipoFactura,
  getCondicionIvaByIdEntidad,
  getLotesDeTransaccion,
  revertirLotesDeTransaccion,
} = require("../controllers/ventaController.js")

router.post("/postTransaccionTipoFactura", postTransaccionTipoFactura)
router.get("/getCondicionIvaByIdEntidad/:idEntidad", getCondicionIvaByIdEntidad)
router.get("/lotesDeTransaccion/:idTransaccion", getLotesDeTransaccion)
router.put("/revertirLotesDeTransaccion/:idTransaccion", revertirLotesDeTransaccion)

module.exports = router
