const express = require('express');
const router = express.Router();

const { login, usuarioRol } = require('../controllers/loginController.js');

router.post('/login', login);

router.get('/usuarioRol', usuarioRol);

module.exports = router;