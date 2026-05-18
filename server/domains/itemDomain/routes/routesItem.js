const express = require("express")
const router = express.Router()

const {
  getItemTresLetras,
  getItemById,
  getItemUbicacionFilterByUbicacion,
  getItemAtributoNoEliminados,
  putItemUbicacion,
  getImpuestoItem,
  updateImpuestoItem,
  getLoteMasAntiguoConStock,
  descontarStockVenta,
  getSugerenciaLotesVenta,
  getLotesDisponiblesVenta,
  getValoresUnicosAtributoRecientes,
} = require("../controllers/itemController.js")

// rutas itemController (dominio item)
router.get("/getItemTresLetras", getItemTresLetras)
router.get("/getItemById/:id", getItemById)
router.get("/getItemUbicacionFilterByUbicacion/:itemID/:ubicacionID", getItemUbicacionFilterByUbicacion)
router.get("/getItemAtributoNoEliminados", getItemAtributoNoEliminados)
router.put("/putItemUbicacion", putItemUbicacion)
router.get("/getImpuestoItem/:idItem", getImpuestoItem)
router.put("/updateImpuestoItem/:idItem", updateImpuestoItem)
router.get("/lotes/fifo/:idItem/:idUbicacion", getLoteMasAntiguoConStock)
router.post("/lotes/descontar-venta", descontarStockVenta)
router.get("/lotes/sugerencia-venta", getSugerenciaLotesVenta)
router.get("/lotes/disponibles-venta", getLotesDisponiblesVenta)
router.get("/getValoresUnicosAtributoRecientes", getValoresUnicosAtributoRecientes)

module.exports = router
