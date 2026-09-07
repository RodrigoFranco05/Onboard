/**
 * Inicializa un tenant nuevo despues de que tenantDbService creo la BD vacia.
 *
 * 1. Corre el init-new-tenant del ERP (LUTENTE_ERP_INIT_SCRIPT): sync actual
 *    y sella SequelizeMeta para no replayar migraciones viejas.
 * 2. Pisa el admin seed (lutenteERP) con el usuario/password del onboarding.
 * 3. Si hay datos de onboarding, apaga todos los menús y prende la allowlist.
 *
 * No usa erp-init: un segundo sync con modelos desactualizados romperia el paso 1.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { DataTypes, Sequelize } = require("sequelize");

const { applyTenantModules } = require("./tenantModulosService");

const ERP_INIT_TIMEOUT_MS = Number(process.env.LUTENTE_ERP_INIT_TIMEOUT_MS) || 10 * 60 * 1000;

function normalizeAdminUser(adminUser) {
  if (!adminUser || typeof adminUser !== "object") {
    throw new Error("initializeTenantSchema requiere los datos del usuario admin");
  }

  const login = String(adminUser.usuario || adminUser.email || "").trim();
  const password = String(adminUser.password || "");

  if (!login) {
    throw new Error("El usuario admin del tenant requiere usuario o email");
  }
  if (!password) {
    throw new Error("El usuario admin del tenant requiere password");
  }

  return {
    usuario: login,
    email: String(adminUser.email || login).trim() || login,
    nombre: adminUser.nombre ? String(adminUser.nombre).trim() : null,
    apellido: adminUser.apellido ? String(adminUser.apellido).trim() : null,
    telefono: adminUser.telefono ? String(adminUser.telefono).trim() : null,
    password,
    rol: 1,
    eliminado: false
  };
}

function getErpInitScriptPath() {
  const raw = String(process.env.LUTENTE_ERP_INIT_SCRIPT || "").trim();
  if (!raw) {
    throw new Error(
      "Falta LUTENTE_ERP_INIT_SCRIPT. Debe apuntar al init-new-tenant.js del ERP."
    );
  }

  const scriptPath = path.resolve(raw);
  if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
    throw new Error(`No se encontro el script de init del ERP: ${scriptPath}`);
  }

  return scriptPath;
}

/** .../server/migrations/scripts/init-new-tenant.js → .../server (node_modules + db.js). */
function getErpServerCwd(scriptPath) {
  return path.resolve(path.dirname(scriptPath), "..", "..");
}

function runErpInitScript(tenant) {
  const scriptPath = getErpInitScriptPath();
  const cwd = getErpServerCwd(scriptPath);

  console.log(`[tenantInitService] Ejecutando init del ERP: ${scriptPath} ${tenant}`);
  console.log(`[tenantInitService] cwd ERP server: ${cwd}`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, tenant], {
      cwd,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (buf) => {
      const text = buf.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (buf) => {
      const text = buf.toString();
      stderr += text;
      process.stderr.write(text);
    });

    const timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          `Timeout inicializando tenant "${tenant}" con el script del ERP (${ERP_INIT_TIMEOUT_MS}ms)`
        )
      );
    }, ERP_INIT_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const detail = (stderr || stdout).trim().slice(-2000);
      reject(
        new Error(
          `El init del ERP salio con codigo ${code}${detail ? `. ${detail}` : ""}`
        )
      );
    });
  });
}

function buildTenantSequelize(tenant) {
  const host = process.env.PG_ADMIN_HOST;
  const port = process.env.PG_ADMIN_PORT;
  const user = process.env.PG_ADMIN_USER;
  const password = process.env.PG_ADMIN_PASSWORD;

  if (!host || !port || !user || password === undefined) {
    throw new Error(
      "Faltan variables de entorno PG_ADMIN_HOST / PG_ADMIN_PORT / PG_ADMIN_USER / PG_ADMIN_PASSWORD."
    );
  }

  return new Sequelize(tenant, user, password, {
    host,
    port: Number(port),
    dialect: "postgres",
    logging: false,
    define: { timestamps: true }
  });
}

function defineUsuario(sequelize) {
  return sequelize.define(
    "Usuario",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      usuario: { type: DataTypes.STRING, allowNull: false },
      nombre: { type: DataTypes.STRING, allowNull: true },
      apellido: { type: DataTypes.STRING, allowNull: true },
      telefono: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true },
      rol: { type: DataTypes.INTEGER, allowNull: true },
      password: { type: DataTypes.STRING, allowNull: true },
      eliminado: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {
      tableName: "usuario"
    }
  );
}

async function applyTenantAdminUser(sequelize, adminUser) {
  const values = normalizeAdminUser(adminUser);
  const Usuario = sequelize.models.Usuario || defineUsuario(sequelize);

  const existing = await Usuario.findByPk(1);
  if (existing) {
    await existing.update(values);
  } else {
    await Usuario.create({ id: 1, ...values });
  }
}

async function initializeTenantSchema(tenant, adminUser, onboarding) {
  if (!tenant || typeof tenant !== "string") {
    throw new Error("initializeTenantSchema requiere un nombre de tenant valido");
  }

  const adminValues = normalizeAdminUser(adminUser);
  const startedAt = Date.now();
  let sequelize = null;

  try {
    await runErpInitScript(tenant);

    sequelize = buildTenantSequelize(tenant);
    await sequelize.authenticate();
    await applyTenantAdminUser(sequelize, adminValues);

    if (onboarding && onboarding.registroId && onboarding.modulos) {
      await applyTenantModules(sequelize, {
        registroId: onboarding.registroId,
        modulos: onboarding.modulos
      });
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[tenantInitService] Tenant "${tenant}" inicializado en ${elapsedMs}ms`);
    return { tenant, initialized: true, elapsedMs };
  } finally {
    if (sequelize) {
      try {
        await sequelize.close();
      } catch (closeErr) {
        console.warn(`[tenantInitService] No se pudo cerrar la conexion: ${closeErr.message}`);
      }
    }
  }
}

module.exports = { initializeTenantSchema, applyTenantAdminUser };
