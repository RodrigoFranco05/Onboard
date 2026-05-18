const Registro = require('./Registro');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convierte una instancia de Sequelize (o null) al objeto plano que espera
 * el resto de la aplicación. Mantiene compatibilidad con la interfaz anterior.
 */
function toPlain(instance) {
  if (!instance) return null;
  return instance.get({ plain: true });
}

// ---------------------------------------------------------------------------
// Consultas de lectura
// ---------------------------------------------------------------------------

async function findByEmail(correo) {
  const row = await Registro.findOne({ where: { correo } });
  return toPlain(row);
}

async function findByVerificationToken(token) {
  const row = await Registro.findOne({ where: { verificationToken: token } });
  return toPlain(row);
}

async function findById(id) {
  const row = await Registro.findByPk(id);
  return toPlain(row);
}

async function listRecent(limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const rows = await Registro.findAll({
    order: [['id', 'DESC']],
    limit: safeLimit
  });
  return rows.map(toPlain);
}

// ---------------------------------------------------------------------------
// Verificación de email
// ---------------------------------------------------------------------------

/**
 * INSERT del correo con token de verificación, o UPDATE si ya existe.
 * La lógica del CASE original:
 *   - Si NO tiene tenant → estado = 'email_requested'
 *   - Si ya tiene tenant → mantiene el estado actual
 */
async function upsertEmailVerificationRequest({ correo, token, expiresAt }) {
  const existing = await Registro.findOne({ where: { correo } });

  if (existing) {
    const nuevoEstado = existing.tenant ? existing.estado : 'email_requested';
    await existing.update({
      verificationToken: token,
      verificationExpiresAt: expiresAt,
      verificationSentAt: new Date(),
      estado: nuevoEstado
    });
    return toPlain(existing);
  }

  const created = await Registro.create({
    correo,
    estado: 'email_requested',
    verificationToken: token,
    verificationExpiresAt: expiresAt,
    verificationSentAt: new Date()
  });
  return toPlain(created);
}

/**
 * Marca el email como verificado buscando por token.
 * La lógica del CASE original:
 *   - Si estado era 'email_requested' → pasa a 'email_verified'
 *   - Cualquier otro estado → se mantiene
 */
async function markEmailVerifiedByToken(token) {
  const row = await Registro.findOne({ where: { verificationToken: token } });
  if (!row) return null;

  const nuevoEstado = row.estado === 'email_requested' ? 'email_verified' : row.estado;

  await row.update({
    emailVerifiedAt: new Date(),
    verificationToken: null,
    verificationExpiresAt: null,
    estado: nuevoEstado
  });

  return toPlain(row);
}

// ---------------------------------------------------------------------------
// Submission completo (datos personales + módulos)
// ---------------------------------------------------------------------------

async function upsertSubmission(data) {
  const [row] = await Registro.upsert({
    correo: data.correo,
    nombre: data.nombre,
    apellido: data.apellido,
    telefono: data.telefono,
    negocio: data.negocio,
    pais: data.pais,
    provincia: data.provincia,
    mensaje: data.mensaje,
    modulos: data.modulos || [],
    estado: data.estado || 'pending_tenant'
  }, {
    returning: true
  });
  return toPlain(row);
}

// ---------------------------------------------------------------------------
// Solo datos personales (no toca módulos ni tenant)
// ---------------------------------------------------------------------------

async function upsertPersonalByCorreo(data) {
  const existing = await Registro.findOne({ where: { correo: data.correo } });

  if (existing) {
    await existing.update({
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      negocio: data.negocio,
      pais: data.pais,
      provincia: data.provincia,
      mensaje: data.mensaje
    });
    return toPlain(existing);
  }

  const created = await Registro.create({
    correo: data.correo,
    nombre: data.nombre,
    apellido: data.apellido,
    telefono: data.telefono,
    negocio: data.negocio,
    pais: data.pais,
    provincia: data.provincia,
    mensaje: data.mensaje || '',
    modulos: [],
    estado: data.estado || 'pending_modules'
  });
  return toPlain(created);
}

// ---------------------------------------------------------------------------
// Resultado de creación de tenant
// ---------------------------------------------------------------------------

async function updateTenantResult(id, tenantData) {
  await Registro.update(
    {
      tenant: tenantData.tenant,
      url: tenantData.url,
      estado: tenantData.estado || 'tenant_created'
    },
    { where: { id } }
  );
  return findById(id);
}

// ---------------------------------------------------------------------------

module.exports = {
  findByEmail,
  findByVerificationToken,
  findById,
  listRecent,
  upsertEmailVerificationRequest,
  markEmailVerifiedByToken,
  upsertSubmission,
  upsertPersonalByCorreo,
  updateTenantResult
};
