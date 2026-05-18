const express = require('express');
const router = express.Router();
const { postMoneda, getMoneda, updateMoneda, deleteMoneda, postTipoMedioDePago, getTipoMedioDePago, updateTipoMedioDePago, deleteTipoMedioDePago, postCategoriaTransaccion, getCategoriaTransaccion, updateCategoriaTransaccion, deleteCategoriaTransaccion, getSubCategoriaTransaccion, postSubCategoriaTransaccion, updateSubCategoriaTransaccion, deleteSubCategoriaTransaccion, postTipoTransaccion, getTipoTransaccion, gestionTipoTransaccionTabla, updateTipoTransaccion, deleteTipoTransaccion, postTransaccionItem, getTransaccionItem, getTransaccionItemID, postTransaccion, getTransaccion, putTransaccion, getTransaccionItemByTransactionAndItem,updateTransaccionItem, deleteTransaccionItemsNotInList, getTransaccionItemsByTransactionId, postTransaccionPago, postCrearPago, postMedioDePago, getMedioDePago, updateMedioDePago, deleteMedioDePago, getMedioDePagoConDescripcion, getMedioDePagoPorTipo, getCuentaCorriente, postCuentaCorrienteVenta, updateCuentaCorrienteVenta, getTransaccionTransformed,   getTransaccionTransformedVentas, getTransaccionTransformedVentasAllData, getTransaccionTransformedCompras,getTransaccionTransformedPresupuesto, getTransaccionTransformedPresupuestosAllData, getCuentaCorrienteTransformed, getFilteredTransacciones, getTransaccionFilter, postTransaccionDevolucion, postTransaccionItemDevolucion, getImpuestos,postImpuestos, postTransaccionImpuesto, updateImpuestoEstado, updateImpuestoContenido, getTiposFacturas, postTransaccionTipoFactura, getTransaccionFacturadaData, getTransaccionMontoTotalByTipoTransaccion, getTop10ItemVentas, enviarMail, enviarWhatsAppLink, guardarComprobante, guardarTicket, getTop3ItemsLast7Days, postListaMonto, getListaMontosByEntidad, getEntidadesUnicasByFilters, getValoresUnicosAtributo, updateAllPrices, updateFilteredPrices, updateItemPrecioListaId, updatePreciosListaMultiple, getListaMontosByIdItem, updateListaDeMonto, updateListaDeMontoBatch, getListaMontosByIdItemIdEntidad, postTransaccionCompraEstado, getEstadoCompra, postTransaccionCompraItem, getTransaccionItemIDEnCompras, updateTransaccionCompraItem, updateTransaccionCompraEstado, getTransaccionItemByTipoTransaccion, getTransaccionItemByTipoTransaccionAllData, deleteTransaccionItem,deleteTransaccionCompraItem, deleteTransaccionPago, getCuentaCorrienteByIdEntidad, updateDeleteTransaccion, postTransaccionAuditoria, getTransaccionAuditoria,copiarPreciosEntreEntidades, getCajaByMedioDePago, getSubCategoriaTransaccionByCategoria, getGastosTransacciones, updateTransaccionPago, getTransaccionesPagoFilter, getAndPostCajaDatos, recalcularCajaCompleta, resumenVentasN8N, postTransaccionImpuestoItem, updateTransaccionImpuestoItem, getTransaccionImpuestoItems, validarDevolucionCanje, getCondicionIvaByIdEntidad, getLotesDeTransaccion, revertirLotesDeTransaccion, updateMargenGananciaListaId, updateMargenGananciaFiltrado, getClientesConPreciosByFiltros, promoverProveedorReferente, actualizarPreciosClientesDesdeReferente } = require('../controllers/transaccionController.js');

// Rutas transacciones
router.post('/postMoneda', postMoneda);
router.get('/getMoneda', getMoneda);
router.put('/updateMoneda/:id', updateMoneda);
router.delete('/deleteMoneda/:id', deleteMoneda);

router.post('/postTipoMedioDePago', postTipoMedioDePago);
router.get('/getTipoMedioDePago', getTipoMedioDePago);
router.put('/updateTipoMedioDePago/:id', updateTipoMedioDePago);
router.delete('/deleteTipoMedioDePago/:id', deleteTipoMedioDePago);

router.post('/postMedioDePago', postMedioDePago);
router.get('/getMedioDePago', getMedioDePago);
router.put('/updateMedioDePago/:id', updateMedioDePago);
router.delete('/deleteMedioDePago/:id', deleteMedioDePago);
router.get('/getMedioDePagoConDescripcion', getMedioDePagoConDescripcion);
router.get('/getMedioDePagoConDescripcion/:idTipoMedioDePago', getMedioDePagoPorTipo);

router.get('/getMedioDePagoConDescripcion/:idTipoMedioDePago', getMedioDePagoPorTipo);
router.post('/getMedioDePagoConDescripcion/:idTipoMedioDePago', getMedioDePagoPorTipo);

router.get('/cuentaCorriente', getCuentaCorriente);
router.get('/getCuentaCorrienteByIdEntidad/:idEntidad', getCuentaCorrienteByIdEntidad);
router.post('/cuentaCorriente', postCuentaCorrienteVenta);
router.put('/cuentaCorriente/:idEntidad', updateCuentaCorrienteVenta);

router.post('/postCategoriaTransaccion', postCategoriaTransaccion);
router.get('/getCategoriaTransaccion', getCategoriaTransaccion);
router.put('/updateCategoriaTransaccion/:id', updateCategoriaTransaccion);
router.delete('/deleteCategoriaTransaccion/:id', deleteCategoriaTransaccion);

router.post('/postSubCategoriaTransaccion', postSubCategoriaTransaccion);
router.get('/getSubCategoriaTransaccion', getSubCategoriaTransaccion);
router.put('/updateSubCategoriaTransaccion/:id', updateSubCategoriaTransaccion);
router.delete('/deleteSubCategoriaTransaccion/:id', deleteSubCategoriaTransaccion);
router.get('/getSubCategoriaTransaccionByCategoria/:idSubCategoria', getSubCategoriaTransaccionByCategoria);
router.get('/getGastosTransacciones', getGastosTransacciones)


router.post('/postTipoTransaccion', postTipoTransaccion);
router.get('/getTipoTransaccion', getTipoTransaccion);
router.get('/gestionTipoTransaccionTabla', gestionTipoTransaccionTabla);
router.put('/updateTipoTransaccion/:id', updateTipoTransaccion);
router.delete('/deleteTipoTransaccion/:id', deleteTipoTransaccion);

router.post('/postTransaccionItem', postTransaccionItem);
router.get('/getTransaccionItem', getTransaccionItem);
router.get('/getTransaccionItemByTipoTransaccion', getTransaccionItemByTipoTransaccion);
router.get('/getTransaccionItemByTipoTransaccionAllData', getTransaccionItemByTipoTransaccionAllData);
router.get('/getTransaccionItemID/:transaccionId', getTransaccionItemID);
router.get('/getTransaccionItemIDEnCompras/:transaccionId', getTransaccionItemIDEnCompras);

router.put('/deleteTransaccionItem/:idTransaccion/:idItem', deleteTransaccionItem);
router.put('/deleteTransaccionCompraItem/:idTransaccion/:idItem', deleteTransaccionCompraItem);
router.put('/updateTransaccionCompraItem/', updateTransaccionCompraItem);
router.put('/updateTransaccionCompraEstado/', updateTransaccionCompraEstado);


router.post('/postTransaccion', postTransaccion);
router.get('/getTransaccion', getTransaccion);
router.put('/updateDeleteTransaccion/:id', updateDeleteTransaccion);
router.post('/postTransaccionAuditoria', postTransaccionAuditoria);
router.get('/getTransaccionAuditoria/:idTransaccion', getTransaccionAuditoria);

router.get('/getEstadoCompra', getEstadoCompra);
router.post('/postTransaccionCompraEstado', postTransaccionCompraEstado);
router.post('/postTransaccionCompraItem', postTransaccionCompraItem);

router.put('/updateTransaccionPago/', updateTransaccionPago);

router.get('/getTransaccionMontoTotalByTipoTransaccion/:idTipoTransaccion', getTransaccionMontoTotalByTipoTransaccion);

router.get('/getListaMontosByEntidad', getListaMontosByEntidad);
router.get('/getEntidadesUnicasByFilters', getEntidadesUnicasByFilters);
router.get('/getValoresUnicosAtributo', getValoresUnicosAtributo);
router.get('/getListaMontosByIdItem', getListaMontosByIdItem);
router.get('/getListaMontosByIdItemIdEntidad', getListaMontosByIdItemIdEntidad);

router.post('/copiarPreciosEntreEntidades', copiarPreciosEntreEntidades);
router.post('/updateListaDeMonto', updateListaDeMonto);
router.post('/updateListaDeMontoBatch', updateListaDeMontoBatch);
router.post('/updateAllPrices', updateAllPrices);
router.post('/updateFilteredPrices', updateFilteredPrices);
router.post('/updateItemPrecioListaId', updateItemPrecioListaId);
router.post('/updatePreciosListaMultiple', updatePreciosListaMultiple);
router.post('/updateMargenGananciaListaId', updateMargenGananciaListaId);
router.post('/updateMargenGananciaFiltrado', updateMargenGananciaFiltrado);
router.get('/getClientesConPreciosByFiltros', getClientesConPreciosByFiltros);
router.post('/promoverProveedorReferente', promoverProveedorReferente);
router.post('/actualizarPreciosClientesDesdeReferente', actualizarPreciosClientesDesdeReferente);

router.get('/getTop10ItemVentas', getTop10ItemVentas);
router.get('/getTop3ItemsLast7Days', getTop3ItemsLast7Days);

router.post('/postListaMonto', postListaMonto);

router.get('/getTransaccionFilter/:idTransaccion', getTransaccionFilter);

router.get('/getTiposFacturas', getTiposFacturas);
router.post('/postTransaccionTipoFactura', postTransaccionTipoFactura); 
router.get('/getTransaccionFacturadaData/:idTransaccion', getTransaccionFacturadaData); 

router.get('/getTransaccionTransformed', getTransaccionTransformed); 
router.get('/getTransaccionTransformedVentas/:tipoTransaccion', getTransaccionTransformedVentas); 
router.get('/getTransaccionTransformedVentasAllData/:tipoTransaccion', getTransaccionTransformedVentasAllData); 
router.get('/getTransaccionTransformedCompras/:tipoTransaccion', getTransaccionTransformedCompras);
router.get('/getTransaccionTransformedPresupuesto/:tipoTransaccion', getTransaccionTransformedPresupuesto);
router.get('/getTransaccionTransformedPresupuestosAllData/:tipoTransaccion', getTransaccionTransformedPresupuestosAllData); 
router.get('/transaccionesFiltered', getFilteredTransacciones); 

router.post('/postTransaccionPago', postTransaccionPago);
router.post('/postCrearPago', postCrearPago);

router.post('/postTransaccionDevolucion', postTransaccionDevolucion);
router.post('/postTransaccionItemDevolucion', postTransaccionItemDevolucion);
router.post('/validarDevolucionCanje', validarDevolucionCanje);

//Impuestos
router.get('/getImpuestos', getImpuestos);
router.post('/postImpuestos', postImpuestos);
router.post('/postTransaccionImpuesto', postTransaccionImpuesto);
router.put('/updateImpuestoEstado', updateImpuestoEstado);
router.put('/updateImpuestoContenido/:id', updateImpuestoContenido);
router.get('/getCondicionIvaByIdEntidad/:idEntidad', getCondicionIvaByIdEntidad);

// Impuestos por Item de Transacción
router.post('/postTransaccionImpuestoItem', postTransaccionImpuestoItem);
router.put('/updateTransaccionImpuestoItem/:idTransaccion/:idItem', updateTransaccionImpuestoItem);
router.get('/getTransaccionImpuestoItems/:idTransaccion', getTransaccionImpuestoItems);

//Caja
router.get("/getCajaByMedioDePago", getCajaByMedioDePago);
router.get("/getTransaccionesPagoFilter", getTransaccionesPagoFilter)
router.get("/getAndPostCajaDatos", getAndPostCajaDatos)
router.get("/caja/recalcular", recalcularCajaCompleta)




router.post('/enviarMail', enviarMail);
router.post('/guardarComprobante', guardarComprobante);
router.post('/guardarTicket', guardarTicket);
router.post('/enviarWhatsAppLink', enviarWhatsAppLink);


// TEST 8N8 ***********************************************************************
router.get("/resumenVentasN8N", resumenVentasN8N)



router.put('/putTransaccion/:id', putTransaccion);
// Ruta para obtener un transaccionItem por ID de transacción y ID de ítem
router.get('/getTransaccionItemByTransactionAndItem/:idTransaccion/:idItem', getTransaccionItemByTransactionAndItem);
// Ruta para actualizar un transaccionItem por su ID
router.put('/actualizarTransaccionExistente/:idTransaccion/:idItem', updateTransaccionItem);
router.delete('/transaccionItemDelete/:idTransaccion', deleteTransaccionItemsNotInList);
router.get('/transaccionItemsById/:idTransaccion', getTransaccionItemsByTransactionId);

// 🆕 Rutas para gestión de lotes en transacciones
router.get('/lotesDeTransaccion/:idTransaccion', getLotesDeTransaccion);
router.put('/revertirLotesDeTransaccion/:idTransaccion', revertirLotesDeTransaccion);

// 🆕 Ruta para eliminar lógicamente pagos de una transacción
router.put('/deleteTransaccionPago/:idTransaccion', deleteTransaccionPago);

router.get('/getCuentaCorrienteTransformed/:tipoTransaccion', getCuentaCorrienteTransformed); 



// Rutas para itemUbicacion
//router.post('/itemUbicacion', createItemUbicacion);
//router.get('/itemUbicacion', getItemUbicaciones);

module.exports = router;
