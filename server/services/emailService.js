const nodemailer = require("nodemailer");

let transporter;

function isTruthy(value) {
  return String(value).toLowerCase() === "true";
}

function getAppBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:4000";
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
  return `${getAppBaseUrl()}/api/onboard/email/verify?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapCorporateEmail({ preheader, eyebrow, title, bodyHtml, noticeHtml, ctaLabel, ctaUrl }) {
  const safePreheader = escapeHtml(preheader);
  const safeEyebrow = escapeHtml(eyebrow);
  const safeTitle = escapeHtml(title);
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);

  const noticeBlock = noticeHtml
    ? `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
                    <tr>
                      <td width="4" bgcolor="#f4b10e" style="width:4px;background:#f4b10e;font-size:0;line-height:0;">&nbsp;</td>
                      <td bgcolor="#f8f8f8" style="background:#f8f8f8;padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#555555;">
                        ${noticeHtml}
                      </td>
                    </tr>
                  </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#ececec;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ececec;">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;">
          <tr>
            <td bgcolor="#1a1a1a" style="background:#1a1a1a;padding:22px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" width="12" height="12" bgcolor="#f4b10e" style="width:12px;height:12px;background:#f4b10e;border-radius:12px;font-size:0;line-height:0;">&nbsp;</td>
                  <td width="10" style="width:10px;font-size:0;line-height:0;">&nbsp;</td>
                  <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">lutente</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td height="4" bgcolor="#f4b10e" style="height:4px;background:#f4b10e;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 28px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#9a8d7c;font-weight:700;">${safeEyebrow}</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:#1a1a1a;">${safeTitle}</h1>
              ${bodyHtml}
              ${noticeBlock}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td bgcolor="#f4b10e" style="background:#f4b10e;border-radius:4px;">
                    <a href="${safeCtaUrl}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#1a1a1a;text-decoration:none;">${safeCtaLabel}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#9a8d7c;word-break:break-all;">
                Si el botón no funciona, copiá este enlace:<br />
                <a href="${safeCtaUrl}" style="color:#9a8d7c;">${safeCtaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 32px 20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a8d7c;border-top:1px solid #eeeeee;">
              © Lutente ERP · Este es un mail automático.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    "Confirmá tu correo electrónico",
    "",
    "Para continuar con la creación de tu ambiente, necesitamos verificar que este mail te pertenece.",
    "",
    verificationUrl,
    "",
    "El enlace vence en 24 horas. Si no fuiste vos, no hace falta hacer nada."
  ].join("\n");

  const html = wrapCorporateEmail({
    preheader: "Confirmá tu correo para continuar con tu demo de Lutente.",
    eyebrow: "Onboarding demo",
    title: "Confirmá tu correo electrónico",
    bodyHtml: `
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#4a4a4a;">
                Para continuar con la creación de tu ambiente, necesitamos verificar que este mail te pertenece.
              </p>`,
    noticeHtml: "El enlace vence en 24 horas. Si no fuiste vos, no hace falta hacer nada.",
    ctaLabel: "Verificar ahora",
    ctaUrl: verificationUrl
  });

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
    "Tu demo de Lutente ya está creada",
    "",
    "Tu ambiente fue creado correctamente. Guardá estos datos de acceso:",
    `URL: ${tenantUrl}`,
    `Usuario: ${user}`,
    `Contraseña: ${password}`,
    "",
    "Gracias por probar Lutente ERP."
  ].join("\n");

  const safeUrl = escapeHtml(tenantUrl);
  const safeUser = escapeHtml(user);
  const safePassword = escapeHtml(password);

  const html = wrapCorporateEmail({
    preheader: "Tu ambiente demo ya está listo. Encontrá acá la URL y tus credenciales.",
    eyebrow: "Ambiente listo",
    title: "Tu demo de Lutente ya está creada",
    bodyHtml: `
              <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#4a4a4a;">
                Tu ambiente fue creado correctamente. Guardá estos datos de acceso:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:#f8f8f8;">
                <tr>
                  <td width="4" bgcolor="#f4b10e" style="width:4px;background:#f4b10e;font-size:0;line-height:0;">&nbsp;</td>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;">
                      <tr>
                        <td style="padding:0 0 10px;color:#9a8d7c;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">URL</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;word-break:break-all;">
                          <a href="${safeUrl}" style="color:#1a1a1a;font-weight:700;text-decoration:none;">${safeUrl}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 10px;color:#9a8d7c;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Usuario</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;font-family:Consolas,Monaco,monospace;">${safeUser}</td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 10px;color:#9a8d7c;font-size:12px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">Contraseña</td>
                      </tr>
                      <tr>
                        <td style="font-family:Consolas,Monaco,monospace;">${safePassword}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4a4a4a;">
                Gracias por probar Lutente ERP.
              </p>`,
    ctaLabel: "Abrir ambiente",
    ctaUrl: tenantUrl
  });

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
