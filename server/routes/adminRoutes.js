const express = require('express');
const router = express.Router();
const { postUbicacion, getUbicacion, updateUbicacion, deleteUbicacion, getNegocio, postNegocio, updateNegocio, deleteNegocio, postTipoEntidad, getTipoEntidad, updateTipoEntidad, deleteTipoEntidad, postEntidad, getEntidad, putEntidad, updateEntidad, updateEntidadEmail, postUsuario, getUsuario, getEntidadClienteTresLetras, getEntidadByID, getEntidadFilterTipoEntidad, getEntidadByDNI, getEntidadByTipoEntidad, updateUsuario, putEntidadDevolver, enviarFacturaWhatsApp, updateIncluirImpuestos, getIncluirImpuestos, logoURLbase64, getRolUsuario, postRolUsuario, updateRolUsuario, getUsuariosByRol, deleteRolYUsuarios, getMenuAcceso, rolAcceso, actualizarRolAccesos, getComponenteSector, getComponenteSectorByMenuAcceso, postComponenteSector, updateComponenteSector, deleteComponenteSector, getRolSectorAccesoByIdRol, actualizarRolSectorAccesos,deleteUsuarioSoft, getParametrosGlobales, getParametrosGlobalesMenu, updateParametroGlobal, getCanalEntidad, getCondicionIva, getCondicionIvaByEntidad, getTickeadoraStats, registrarSesion, getUsuariosEnLinea, getSesionesUsuario, cerrarSesion, cerrarTodasSesionesUsuario, getEntidadAtributo, updateEntidadAtributo, getEntidadAtributoNoEliminados, getEntidadAtributoClasificacion, getEntidadAtributoClasificacionByIdAtributo, postEntidadAtributoClasificacion, updateEntidadAtributoClasificacion, deleteEntidadAtributoClasificacion } = require('../controllers/adminController.js');

// Rutas para ubicacion
router.post('/postUbicacion', postUbicacion);
router.get('/getUbicacion', getUbicacion);
router.put('/updateUbicacion', updateUbicacion);
router.post('/deleteUbicacion', deleteUbicacion);

// Rutas para negocio
router.post('/postNegocio', postNegocio);
router.get('/getNegocio', getNegocio);
router.put('/updateNegocio', updateNegocio);
router.post('/deleteNegocio', deleteNegocio);

// Rutas para TipoEntidad
router.post('/postTipoEntidad', postTipoEntidad);
router.get('/getTipoEntidad', getTipoEntidad);
router.put('/updateTipoEntidad', updateTipoEntidad);
router.post('/deleteTipoEntidad', deleteTipoEntidad);

// Rutas para Entidad
router.post('/postEntidad', postEntidad);
router.get('/getEntidad', getEntidad);
router.put('/putEntidad', putEntidad);
router.put('/putEntidadDevolver', putEntidadDevolver);
router.put('/updateEntidad', updateEntidad);
router.put('/updateEntidadEmail', updateEntidadEmail);
router.get('/getEntidadClienteTresLetras', getEntidadClienteTresLetras);

router.get('/getEntidadByID/:idEntidad', getEntidadByID);
router.get('/getEntidadByDNI/:dniEntidad', getEntidadByDNI);
router.get('/getEntidadByTipoEntidad/:idTipoEnt', getEntidadByTipoEntidad);

// Rutas para Entidad Atributo
router.put('/updateEntidadAtributo', updateEntidadAtributo);
router.get('/getEntidadAtributo', getEntidadAtributo);
router.get('/getEntidadAtributoNoEliminados', getEntidadAtributoNoEliminados);

// Rutas para Entidad Atributo Clasificacion
router.get('/getEntidadAtributoClasificacion', getEntidadAtributoClasificacion);
router.get('/getEntidadAtributoClasificacionByIdAtributo', getEntidadAtributoClasificacionByIdAtributo);
router.post('/postEntidadAtributoClasificacion', postEntidadAtributoClasificacion);
router.put('/updateEntidadAtributoClasificacion', updateEntidadAtributoClasificacion);
router.post('/deleteEntidadAtributoClasificacion', deleteEntidadAtributoClasificacion);

router.put('/updateUsuario', updateUsuario);
router.get('/getRolUsuario', getRolUsuario);
router.post('/postRolUsuario', postRolUsuario);
router.put('/updateRolUsuario', updateRolUsuario);
router.get('/getUsuariosByRol/:idRol', getUsuariosByRol);
router.post('/deleteRolYUsuarios', deleteRolYUsuarios);


router.get('/getEntidadFilterTipoEntidad/:idTipoEntidad', getEntidadFilterTipoEntidad);


router.post('/enviarFacturaWhatsApp', enviarFacturaWhatsApp);

//BASE 64
router.get('/logoURLbase64', logoURLbase64)


// Rutas para usuario
router.post('/postUsuario', postUsuario);
router.get('/getUsuario', getUsuario);
router.post('/deleteUsuarioSoft', deleteUsuarioSoft);

router.get('/getMenuAcceso', getMenuAcceso);
router.get('/rolAcceso/:idRol', rolAcceso);
router.post('/actualizarRolAccesos', actualizarRolAccesos);

// Rutas para ComponenteSector
router.get('/getComponenteSector', getComponenteSector);
router.get('/getComponenteSectorByMenuAcceso/:idMenuAcceso', getComponenteSectorByMenuAcceso);
router.post('/postComponenteSector', postComponenteSector);
router.put('/updateComponenteSector', updateComponenteSector);
router.post('/deleteComponenteSector', deleteComponenteSector);

// Rutas para RolSectorAcceso
router.get('/getRolSectorAccesoByIdRol/:idRol', getRolSectorAccesoByIdRol);
router.post('/actualizarRolSectorAccesos', actualizarRolSectorAccesos);

router.put('/updateIncluirImpuestos/:dato', updateIncluirImpuestos);
router.get('/getIncluirImpuestos', getIncluirImpuestos);

//Datos globales de configuracion
router.post('/getParametrosGlobales', getParametrosGlobales);
router.get('/getParametrosGlobalesMenu', getParametrosGlobalesMenu);
router.put('/updateParametroGlobal', updateParametroGlobal);
router.get('/getCanalEntidad', getCanalEntidad);

// Rutas para condicionIva
router.get('/getCondicionIva', getCondicionIva);
router.get('/getCondicionIvaByEntidad/:idEntidad', getCondicionIvaByEntidad);

// Rutas para tickeadora (estadísticas de agentes conectados)
router.get('/getTickeadoraStats', getTickeadoraStats);

// Rutas para Sesiones
router.post('/registrarSesion', registrarSesion);
router.get('/getUsuariosEnLinea', getUsuariosEnLinea);
router.get('/getSesionesUsuario/:idUsuario', getSesionesUsuario);
router.post('/cerrarSesion/:idSesion', cerrarSesion);
router.post('/cerrarTodasSesionesUsuario/:idUsuario', cerrarTodasSesionesUsuario);

// Rutas para itemUbicacion
//router.post('/itemUbicacion', createItemUbicacion);
//router.get('/itemUbicacion', getItemUbicaciones);

module.exports = router;
