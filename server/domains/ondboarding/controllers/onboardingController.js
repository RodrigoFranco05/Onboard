const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");

const registroModel = require("../models/registroModel");
const { sendTenantReadyEmail, sendVerificationEmail } = require("../services/emailService");
//const { runTenantScript } = require("../services/tenantService");
const { HttpError } = require("../utils/httpError");

const allowedModules = [
  "ventas",
  "compras",
  "inventario",
  "caja",
  "cuentas",
  "rrhh",
  "logistica"
];

const requestEmailSchema = z.object({
  email: z.string().trim().email()
});

const verifyTokenSchema = z.object({
  token: z.string().trim().min(1)
});

const submissionSchema = z.object({
  email: z.string().trim().email(),
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  telefono: z.string().trim().min(1),
  empresa: z.string().trim().optional().default(""),
  negocio: z.string().trim().optional(),
  pais: z.string().trim().min(1),
  provincia: z.string().trim().min(1),
  mensaje: z.string().trim().optional().default(""),
  modulos: z.array(z.enum(allowedModules)).min(1)
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

async function health(_req, res) {
  return res.status(200).json({
    ok: true,
    service: "onboarding-server"
  });
}

async function checkEmailStatus(req, res) {
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

async function requestEmailVerification(req, res) {
  const { email } = requestEmailSchema.parse(req.body);
  const correo = normalizeEmail(email);

  const existing = await registroModel.findByEmail(correo);
  if (existing?.tenant) {
    throw new HttpError(
      409,
      "Este correo ya tiene un tenant creado. No se puede generar otro tenant con el mismo correo.",
      "EMAIL_ALREADY_USED"
    );
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await registroModel.upsertEmailVerificationRequest({
    correo,
    token,
    expiresAt
  });

  const { verificationUrl, mailInfo } = await sendVerificationEmail({
    email: correo,
    token
  });

  return res.status(200).json({
    ok: true,
    message: "Se envio el mail de verificacion.",
    data: {
      correo,
      expiresAt,
      verificationUrl,
      mail: mailInfo
    }
  });
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

async function createSubmission(req, res) {
  const payload = submissionSchema.parse(req.body);
  const correo = normalizeEmail(payload.email);
  const existing = await registroModel.findByEmail(correo);

  ensureEmailVerified(existing);

  if (existing?.tenant) {
    throw new HttpError(
      409,
      "Este correo ya tiene un tenant creado. No se puede generar otro tenant con el mismo correo.",
      "EMAIL_ALREADY_USED"
    );
  }

  const submission = await registroModel.upsertSubmission({
    correo,
    nombre: payload.nombre,
    apellido: payload.apellido,
    telefono: payload.telefono,
    negocio: payload.empresa || payload.negocio || "",
    pais: payload.pais,
    provincia: payload.provincia,
    mensaje: payload.mensaje || "",
    modulos: payload.modulos,
    estado: "pending_tenant"
  });

  return res.status(existing ? 200 : 201).json({
    ok: true,
    message: existing ? "Registro actualizado." : "Registro creado.",
    data: submission
  });
}

async function listSubmissions(req, res) {
  const email = req.query.email ? normalizeEmail(req.query.email) : null;

  if (email) {
    const item = await registroModel.findByEmail(email);
    return res.status(200).json({
      ok: true,
      data: item ? [item] : []
    });
  }

  const items = await registroModel.listRecent(req.query.limit);
  return res.status(200).json({
    ok: true,
    data: items
  });
}

async function getSubmissionById(req, res) {
  const id = assertValidId(req.params.id);
  const submission = await registroModel.findById(id);

  if (!submission) {
    throw new HttpError(404, "Registro no encontrado", "SUBMISSION_NOT_FOUND");
  }

  return res.status(200).json({
    ok: true,
    data: submission
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

  const tenantResult = 1 //await runTenantScript({
  //   id: submission.id,
  //   email: submission.correo,
  //   nombre: submission.nombre,
  //   apellido: submission.apellido,
  //   empresa: submission.negocio,
  //   negocio: submission.negocio,
  //   modulos: submission.modulos
  // });

  const updatedSubmission = await registroModel.updateTenantResult(submission.id, {
    tenant: tenantResult.tenant,
    url: tenantResult.url,
    estado: "tenant_created"
  });

  let mail = { mode: "not_sent" };
  try {
    mail = await sendTenantReadyEmail({
      email: updatedSubmission.correo,
      tenantUrl: tenantResult.url,
      user: tenantResult.user,
      password: tenantResult.password
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
      credentials: {
        url: tenantResult.url,
        user: tenantResult.user,
        password: tenantResult.password
      },
      mail
    }
  });
}

module.exports = {
  health,
  checkEmailStatus,
  requestEmailVerification,
  verifyEmail,
  createSubmission,
  listSubmissions,
  getSubmissionById,
  generateTenant
};
