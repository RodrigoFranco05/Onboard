/**
 * Transporter de email reutilizado para notificaciones de soporte.
 * Usa el mismo transporter SMTP que procesar_form.js (misma "oficina de correo").
 */

const nodemailer = require('nodemailer');

// Reutilizar la misma configuracion SMTP que ya existe en el sistema
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Enviar un email de soporte.
 *
 * @param {Object} options
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.html - Cuerpo HTML
 * @returns {Promise<Object>} - Resultado de nodemailer sendMail
 */
const enviarMailSoporte = async ({ to, subject, html }) => {
  const mailOptions = {
    from: '"Lutente ERP Soporte" <admin@lutente.com>',
    to,
    subject,
    html
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  enviarMailSoporte
};
