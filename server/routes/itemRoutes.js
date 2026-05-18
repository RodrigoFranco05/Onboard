const express = require('express');
const router = express.Router();
const { postItem, getItem, getItemTresLetras, postItemUbicacion, getItemUbicacion, putItemUbicacion, getItemUbicacionFilter, updateItem, updateItemUbicaciones, getDeletedItemUbicacion, getItemById, updateItemAtributo, getItemAtributo, getItemAtributoNoEliminados, getItemProveedor, postItemProveedor, updateItemProveedor, getItemAndItemUbicacion, getItemUbicacionFilterByUbicacion, getItemByCodigoItem, getItemByIdentity, getItemSuggestions, crearReceta, getBomByIdItem, getRecetas, getImpuestoItem, updateImpuestoItem, getImpuestosDisponibles, exportarPLUsBalanza, updateItemUbicacionEliminado, getItemUbicacionesByItemId, bulkDeleteItems, postLote, getLotes, getLoteById, getLotesByItem, updateLote, deleteLote, getLoteItemUbicacionStock, updateLoteItemUbicacionStock, getLoteMasAntiguoConStock, descontarStockVenta, getLotesProximosVencer, getSugerenciaLotesVenta, getLotesDisponiblesVenta } = require('../controllers/itemController.js');

// Rutas para items
router.post('/postItem', postItem);
router.get('/getItem', getItem); 
router.get('/getItemById/:id', getItemById);
router.get('/getItemTresLetras', getItemTresLetras);
router.get('/getItemByCodigoItem/:codigoItem', getItemByCodigoItem);
router.get('/getItemByIdentity', getItemByIdentity);
router.get('/getItemSuggestions', getItemSuggestions);


router.post('/postItemUbicacion', postItemUbicacion);
router.get('/getItemUbicacion', getItemUbicacion);
router.get('/getDeletedItemUbicacion', getDeletedItemUbicacion);
router.put('/putItemUbicacion', putItemUbicacion);

router.get('/getItemUbicacionFilterByUbicacion/:itemID/:ubicacionID', getItemUbicacionFilterByUbicacion);
router.get('/getItemUbicacionFilter/:itemID', getItemUbicacionFilter);

router.put('/itemsUpdate/:id', updateItem);
router.put('/itemUbicacionUpdate/:itemId', updateItemUbicaciones);

//Recetas:
router.post('/crearReceta', crearReceta);
router.get('/getBomByIdItem/:idItem', getBomByIdItem); // Asumiendo que getItemById puede manejar recetas
router.get('/getRecetasCreadas/:idItem', getBomByIdItem); // Asumiendo que getBomByIdItem puede manejar recetas
router.get('/getRecetas', getRecetas); // Asumiendo que getBomByIdItem puede manejar recetas

// item atributo
router.put('/updateItemAtributo', updateItemAtributo);
router.get('/getItemAtributo', getItemAtributo);
router.get('/getItemAtributoNoEliminados', getItemAtributoNoEliminados);

// item proveedor
router.post('/postItemProveedor', postItemProveedor);
router.get('/getItemProveedor/:idItem/:idEntidad', getItemProveedor);
router.put('/uptdateItemProveedor/:idItem/:idEntidad', updateItemProveedor );


router.get('/getItemAndItemUbicacion', getItemAndItemUbicacion);

// Exportar PLUs de balanza
router.get('/exportarPLUsBalanza', exportarPLUsBalanza);

// Rutas para impuestos de items
router.get('/getImpuestoItem/:idItem', getImpuestoItem);
router.put('/updateImpuestoItem/:idItem', updateImpuestoItem);
router.get('/getImpuestosDisponibles', getImpuestosDisponibles);

// Rutas para itemUbicacion
//router.post('/itemUbicacion', createItemUbicacion);
//router.get('/itemUbicacion', getItemUbicaciones);

// === RUTAS PARA ELIMINACIÓN MASIVA ===
// Actualizar estado eliminado de un itemUbicacion específico
router.put('/itemUbicacion/:id/eliminado', updateItemUbicacionEliminado);

// Obtener todas las itemUbicaciones de un item
router.get('/itemUbicaciones/byItem/:itemId', getItemUbicacionesByItemId);

// Eliminar múltiples items en lote (soft delete)
router.post('/items/bulk-delete', bulkDeleteItems);

// === RUTAS PARA GESTIÓN DE LOTES ===
// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

// Operaciones especiales (rutas específicas primero)
router.get('/lotes/sugerencia-venta', getSugerenciaLotesVenta);         // 🆕 Sugerencia FIFO para venta
router.get('/lotes/disponibles-venta', getLotesDisponiblesVenta);       // 🆕 Lotes disponibles para venta
router.put('/lotes/stock', updateLoteItemUbicacionStock);               // Actualizar stock de lote en ubicación
router.post('/lotes/descontar-venta', descontarStockVenta);             // Descontar stock en venta (FIFO + descuento dual)
router.get('/lotes/alertas/:diasAntes', getLotesProximosVencer);        // Lotes próximos a vencer
router.get('/lotes/fifo/:idItem/:idUbicacion', getLoteMasAntiguoConStock);  // Obtener lote más antiguo (FIFO)
router.get('/lotes/item/:idItem', getLotesByItem);                      // Obtener lotes de un item
router.get('/lotes/:idLote/stock', getLoteItemUbicacionStock);          // Obtener stock de lote por ubicaciones

// CRUD de lotes (rutas con :id al final)
router.post('/lotes', postLote);                                        // Crear lote
router.get('/lotes', getLotes);                                         // Obtener todos los lotes
router.get('/lotes/:id', getLoteById);                                  // Obtener lote por ID
router.put('/lotes/:id', updateLote);                                   // Actualizar lote
router.delete('/lotes/:id', deleteLote);                                // Eliminar lote

module.exports = router;