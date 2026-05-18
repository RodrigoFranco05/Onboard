const express = require('express');
const { getPreferencesMP, webhookNotification } = require('../services/mercadoPagoService');
const router = express.Router();

router.post('/preferences', getPreferencesMP);
router.post('/webhookNotificacion', webhookNotification);


module.exports = router;