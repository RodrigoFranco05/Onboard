const { z } = require("zod");

const { sendEmailConfirm } = require('../services/sendEmailConfirm');
const registroModel = require("../models/registroModel");
const Modulos = require("../models/Modulos");
const { HttpError } = require("../utils/httpError");

const requestEmailSchema = z.object({
  email: z.string().trim().email()
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

function ensureEmailVerified(registro) {
  if (!registro?.emailVerifiedAt) {
    throw new HttpError(
      400,
      "El correo no esta verificado. Primero debes validar el mail.",
      "EMAIL_NOT_VERIFIED"
    );
  }
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

module.exports = {
  getEmailsConfirmed,
  sendEmailConfirmation,
  personalDataPost,
  userModules,
};
