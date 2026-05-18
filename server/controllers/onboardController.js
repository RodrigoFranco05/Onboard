const { z } = require("zod");

const { sendEmailConfirm } = require('../services/sendEmailConfirm');
const { sendTenantReadyEmail } = require("../services/emailService");
const tenantDbService = require("../services/tenantDbService");
const tenantNameGenerator = require("../services/tenantNameGenerator");
const { initializeTenantSchema } = require("../services/tenantInitService");
const registroModel = require("../models/registroModel");
const Modulos = require("../models/Modulos");
const { HttpError } = require("../utils/httpError");

const MAX_INTENTOS_TENANT = 3;

const requestEmailSchema = z.object({
  email: z.string().trim().email()
});

const verifyTokenSchema = z.object({
  token: z.string().trim().min(1)
});

const modulosSchema = z.object({
  email: z.string().trim().email(),
  modulos: z.object({
    ventas:     z.boolean(),
    compras:    z.boolean(),
    inventario: z.boolean(),
    caja:       z.boolean(),
    cuentas:    z.boolean(),
    rrhh:       z.boolean(),
    logistica:  z.boolean()
  })
});

const personalSchema = z.object({
  email: z.string().trim().email(),
  nombre: z.string().trim().min(1).max(200),
  apellido: z.string().trim().min(1).max(200),
  telefono: z.string().trim().min(6).max(40),
  empresa: z.string().trim().max(300).optional().default(""),
  pais: z.string().trim().min(1).max(50),
  provincia: z.string().trim().min(1).max(80),
  mensaje: z.string().trim().max(4000).optional().default("")
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function assertValidId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "ID invalido", "INVALID_ID");
  }
  return parsed;
}

function ensureEmailVerified(registro) {
  if (!registro?.emailVerifiedAt) {
    throw new HttpError(
      400,
      "El correo no esta verificado. Primero debes validar el mail.",
      "EMAIL_NOT_VERIFIED"
    );
  }
}

function buildTenantUrl(tenant) {
  const template = process.env.TENANT_URL_TEMPLATE || "http://localhost:3000/{tenant}/login";
  return template.replace("{tenant}", tenant);
}

async function createTenantWithRetries(payload) {
  let lastError = null;
  for (let intento = 1; intento <= MAX_INTENTOS_TENANT; intento++) {
    const tenant = tenantNameGenerator.generateTenantName(payload);
    try {
      await tenantDbService.createTenantDatabase(tenant);
      return tenant;
    } catch (err) {
      lastError = err;
      if (err.code !== "TENANT_DB_ALREADY_EXISTS") {
        throw err;
      }
    }
  }
  throw lastError || new Error("No se pudo generar un nombre de tenant unico");
}

async function getEmailsConfirmed(req, res) {
  const { email } = requestEmailSchema.parse(req.body);
  const correo = normalizeEmail(email);

  const registro = await registroModel.findByEmail(correo);

  if (!registro) {
    return res.status(200).json({
      ok: true,
      exists: false,
      ready: false,
      readyToContinue: false,
      status: "NOT_FOUND"
    });
  }

  if (registro.tenant) {
    return res.status(200).json({
      ok: true,
      exists: true,
      ready: false,
      readyToContinue: false,
      status: "TENANT_ALREADY_CREATED",
      message: "Este correo ya tiene un tenant creado."
    });
  }

  if (registro.emailVerifiedAt) {
    return res.status(200).json({
      ok: true,
      exists: true,
      ready: true,
      readyToContinue: true,
      status: "VERIFIED"
    });
  }

  return res.status(200).json({
    ok: true,
    exists: true,
    ready: false,
    readyToContinue: false,
    status: "PENDING_VERIFICATION"
  });
}

async function sendEmailConfirmation(req, res) {
  const email = req.body?.email;

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      message: "Se requiere el campo email con un correo válido.",
    });
  }

  const result = await sendEmailConfirm({ email: email.trim() });

  res.json({ ok: true, ...result });
}

async function verifyEmail(req, res) {
  const { token } = verifyTokenSchema.parse(req.query);

  const registro = await registroModel.findByVerificationToken(token);
  if (!registro) {
    throw new HttpError(404, "Token de verificacion invalido", "TOKEN_NOT_FOUND");
  }

  if (registro.emailVerifiedAt) {
    return res.status(200).json({
      ok: true,
      message: "El correo ya estaba verificado.",
      data: {
        correo: registro.correo,
        verifiedAt: registro.emailVerifiedAt
      }
    });
  }

  if (
    registro.verificationExpiresAt &&
    new Date(registro.verificationExpiresAt).getTime() < Date.now()
  ) {
    throw new HttpError(400, "El token esta vencido. Solicita uno nuevo.", "TOKEN_EXPIRED");
  }

  const updated = await registroModel.markEmailVerifiedByToken(token);
  if (!updated) {
    throw new HttpError(
      500,
      "No se pudo completar la verificacion. Reintenta o solicita un nuevo enlace.",
      "VERIFY_UPDATE_FAILED"
    );
  }

  const redirectUrl = process.env.FRONTEND_AFTER_VERIFY_URL;
  if (redirectUrl) {
    const nextUrl = `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}verified=1&email=${encodeURIComponent(updated.correo)}`;
    return res.redirect(302, nextUrl);
  }

  return res.status(200).json({
    ok: true,
    message: "Correo verificado correctamente.",
    data: {
      correo: updated.correo,
      verifiedAt: updated.emailVerifiedAt
    }
  });
}

async function personalDataPost(req, res) {
  const payload = personalSchema.parse(req.body);
  const correo = normalizeEmail(payload.email);

  const registro = await registroModel.findByEmail(correo);
  ensureEmailVerified(registro);

  const row = await registroModel.upsertPersonalByCorreo({
    correo,
    nombre: payload.nombre,
    apellido: payload.apellido,
    telefono: payload.telefono,
    negocio: payload.empresa || "",
    pais: payload.pais,
    provincia: payload.provincia,
    mensaje: payload.mensaje || "",
    estado: "pending_modules"
  });

  return res.status(200).json({
    ok: true,
    message: "Datos personales guardados.",
    data: row
  });
}

async function userModules(req, res) {
  const payload = modulosSchema.parse(req.body);
  const correo = normalizeEmail(payload.email);

  const registro = await registroModel.findByEmail(correo);

  if (!registro) {
    throw new HttpError(404, "No se encontro un registro con ese correo.", "REGISTRO_NOT_FOUND");
  }

  ensureEmailVerified(registro);

  const existing = await Modulos.findOne({ where: { registroId: registro.id } });

  let row;
  if (existing) {
    await existing.update(payload.modulos);
    row = existing.get({ plain: true });
  } else {
    const created = await Modulos.create({ registroId: registro.id, ...payload.modulos });
    row = created.get({ plain: true });
  }

  return res.status(200).json({
    ok: true,
    message: "Modulos guardados.",
    data: row
  });
}

async function generateTenant(req, res) {
  const id = assertValidId(req.params.id);
  const submission = await registroModel.findById(id);

  if (!submission) {
    throw new HttpError(404, "Registro no encontrado", "SUBMISSION_NOT_FOUND");
  }

  ensureEmailVerified(submission);

  if (submission.tenant && submission.url) {
    return res.status(200).json({
      ok: true,
      message: "El tenant ya fue creado para este registro.",
      data: submission
    });
  }

  const tenant = await createTenantWithRetries({
    email: submission.correo,
    correo: submission.correo,
    nombre: submission.nombre,
    apellido: submission.apellido,
    empresa: submission.negocio,
    negocio: submission.negocio
  });

  try {
    await initializeTenantSchema(tenant);
  } catch (initError) {
    console.error(`[generateTenant] Falla inicializando tenant "${tenant}":`, initError);
    throw new HttpError(
      500,
      `La base se creo pero fallo la inicializacion del tenant "${tenant}". Detalle: ${initError.message}`,
      "TENANT_INIT_FAILED"
    );
  }

  const url = buildTenantUrl(tenant);
  const password = tenantNameGenerator.randomPassword();
  const user = submission.correo;

  const updatedSubmission = await registroModel.updateTenantResult(submission.id, {
    tenant,
    url,
    estado: "tenant_created"
  });

  let mail = { mode: "not_sent" };
  try {
    mail = await sendTenantReadyEmail({
      email: updatedSubmission.correo,
      tenantUrl: url,
      user,
      password
    });
  } catch (mailError) {
    mail = {
      mode: "error",
      error: mailError.message
    };
    console.error("[mail] error al enviar credenciales", mailError);
  }

  return res.status(201).json({
    ok: true,
    message: "Tenant creado correctamente.",
    data: {
      submission: updatedSubmission,
      credentials: { url, user, password },
      mail
    }
  });
}

module.exports = {
  getEmailsConfirmed,
  sendEmailConfirmation,
  verifyEmail,
  personalDataPost,
  userModules,
  generateTenant,
};
