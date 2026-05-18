const express = require('express');
const { getFiltrosECommerce, getItemEcommerceCategory, getItemEcommerce, getOneItemEcommerce, testFiltro, postContacto } = require('../controllers/ecommerceController');
const router = express.Router();

router.get('/getFiltrosECommerce', getFiltrosECommerce);
router.get('/getItemEcommerce', getItemEcommerce);
router.get('/getOneItemEcommerce/:id', getOneItemEcommerce);
router.get('/getItemEcommerceCategory', getItemEcommerceCategory);

router.post('/postContacto', postContacto);

router.get('/testFiltro', testFiltro);  //ruta api tests 

module.exports = router;