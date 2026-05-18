const { v4: uuidv4 } = require('uuid');

const registroModel = require('../models/registroModel');
const { sendVerificationEmail } = require('./emailService');

// ---------------------------------------------------------------------------
// Genera un token de verificación, lo persiste en la BD y envía el correo
// con el enlace que al ser clickeado marca el email como verificado y
// redirige al frontend (email_confirm.html).
// ---------------------------------------------------------------------------
async function sendEmailConfirm({ email }) {
  if (!email || typeof email !== 'string') {
    throw new Error('Se requiere un email válido');
  }

  const correo = email.trim().toLowerCase();
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // expira en 24 h

  await registroModel.upsertEmailVerificationRequest({ correo, token, expiresAt });

  const { verificationUrl, mailInfo } = await sendVerificationEmail({ email: correo, token });

  console.log('✅ Correo de confirmación enviado a:', correo);

  return { verificationUrl, mailInfo };
}

module.exports = { sendEmailConfirm };
