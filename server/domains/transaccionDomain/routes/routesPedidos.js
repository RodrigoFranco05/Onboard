const express = require("express")
const router = express.Router()

const {
  getPedidosList,
  getPedidoDetail,
  postPedido,
  cambiarEstadoPedido,
  convertirPedidoAVenta,
  deletePedido,
} = require("../controllers/pedidoController.js")

router.get("/list", getPedidosList)
router.get("/:id/detail", getPedidoDetail)
router.post("/", postPedido)
router.put("/:id/estado", cambiarEstadoPedido)
router.put("/:id/convertirAVenta", convertirPedidoAVenta)
router.delete("/:id", deletePedido)

module.exports = router
