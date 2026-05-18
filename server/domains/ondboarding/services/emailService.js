const nodemailer = require("nodemailer");

let transporter;

function isTruthy(value) {
  return String(value).toLowerCase() === "true";
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = isTruthy(process.env.SMTP_SECURE);

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });

  return transporter;
}

function buildVerificationUrl(token) {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:4000";
  return `${appBaseUrl}/api/onboarding/email/verify?token=${encodeURIComponent(token)}`;
}

async function sendMail({ to, subject, html, text }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.log("[mail:mock]", { to, subject, text });
    return {
      mode: "mock",
      accepted: [to]
    };
  }

  const from = process.env.SMTP_FROM || "no-reply@lutente.com";
  const info = await activeTransporter.sendMail({ from, to, subject, html, text });

  return {
    mode: "smtp",
    messageId: info.messageId,
    accepted: info.accepted || []
  };
}

async function sendVerificationEmail({ email, token }) {
  const verificationUrl = buildVerificationUrl(token);
  const subject = "Verifica tu correo para continuar con tu demo de Lutente";
  const text = [
    "Hola,",
    "",
    "Para continuar con tu onboarding, verifica tu correo con este enlace:",
    verificationUrl,
    "",
    "Si no solicitaste este acceso, ignora este mensaje."
  ].join("\n");

  const html = `
    <p>Hola,</p>
    <p>Para continuar con tu onboarding, verifica tu correo con este enlace:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>Si no solicitaste este acceso, ignora este mensaje.</p>
  `;

  const mailInfo = await sendMail({
    to: email,
    subject,
    text,
    html
  });

  return {
    verificationUrl,
    mailInfo
  };
}

async function sendTenantReadyEmail({ email, tenantUrl, user, password }) {
  const subject = "Tu ambiente demo de Lutente está listo";
  const text = [
    "Hola,",
    "",
    "Tu ambiente fue creado correctamente.",
    `URL: ${tenantUrl}`,
    `Usuario: ${user}`,
    `Contraseña: ${password}`,
    "",
    "Gracias por probar Lutente ERP."
  ].join("\n");

  const html = `
    <p>Hola,</p>
    <p>Tu ambiente fue creado correctamente.</p>
    <ul>
      <li><strong>URL:</strong> <a href="${tenantUrl}">${tenantUrl}</a></li>
      <li><strong>Usuario:</strong> ${user}</li>
      <li><strong>Contraseña:</strong> ${password}</li>
    </ul>
    <p>Gracias por probar Lutente ERP.</p>
  `;

  return sendMail({
    to: email,
    subject,
    text,
    html
  });
}

module.exports = {
  sendVerificationEmail,
  sendTenantReadyEmail
};
