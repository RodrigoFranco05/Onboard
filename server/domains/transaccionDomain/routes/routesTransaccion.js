const express = require("express")
const router = express.Router()

const routesVentas = require("./routesVentas.js")
const routesPreVentas = require("./routesPreVentas.js")
const routesPedidos = require("./routesPedidos.js")
const {
  postTransaccion,
  postTransaccionItem,
  getListaMontosByIdItemIdEntidad,
  getTop10ItemVentas,
  postCrearPago,
  postTransaccionPago,
  postTransaccionImpuesto,
  postTransaccionImpuestoItem,
  putTransaccion,
  getTransaccionFilter,
  getTransaccionItemsByTransactionId,
  deleteTransaccionItem,
  deleteTransaccionPago,
  updateTransaccionItem,
  updateTransaccionImpuestoItem,
  getTipoMedioDePago,
  getMedioDePagoIdTipoEspecifico,
  getCuentaCorrienteByIdEntidad,
  postCuentaCorriente,
  updateCuentaCorriente,
  getImpuestos,
  getTiposFacturas,
  updateItemPrecioListaId,
} = require("../controllers/transaccionController.js")

// rutas generales de transaccion
router.post("/postTransaccion", postTransaccion)
router.post("/postTransaccionItem", postTransaccionItem)
router.get("/getListaMontosByIdItemIdEntidad", getListaMontosByIdItemIdEntidad)
router.get("/getTop10ItemVentas", getTop10ItemVentas)
router.post("/postCrearPago", postCrearPago)
router.post("/postTransaccionPago", postTransaccionPago)
router.post("/postTransaccionImpuesto", postTransaccionImpuesto)
router.post("/postTransaccionImpuestoItem", postTransaccionImpuestoItem)
router.put("/putTransaccion/:id", putTransaccion)
router.get("/getTransaccionFilter/:idTransaccion", getTransaccionFilter)
router.get("/transaccionItemsById/:idTransaccion", getTransaccionItemsByTransactionId)
router.put("/deleteTransaccionItem/:idTransaccion/:idItem", deleteTransaccionItem)
router.put("/deleteTransaccionPago/:idTransaccion", deleteTransaccionPago)
router.put("/actualizarTransaccionExistente/:idTransaccion/:idItem", updateTransaccionItem)
router.put("/updateTransaccionImpuestoItem/:idTransaccion/:idItem", updateTransaccionImpuestoItem)
router.get("/getTipoMedioDePago", getTipoMedioDePago)
router.get("/getMedioDePagoConDescripcion/:idTipoMedioDePago", getMedioDePagoIdTipoEspecifico)
router.get("/getCuentaCorrienteByIdEntidad/:idEntidad", getCuentaCorrienteByIdEntidad)
router.post("/cuentaCorriente", postCuentaCorriente)
router.put("/cuentaCorriente/:idEntidad", updateCuentaCorriente)
router.get("/getImpuestos", getImpuestos)
router.get("/getTiposFacturas", getTiposFacturas)
router.post("/updateItemPrecioListaId", updateItemPrecioListaId)

// rutas por dominio
router.use("/ventas", routesVentas)
router.use("/preventas", routesPreVentas)
router.use("/pedidos", routesPedidos)

module.exports = router
