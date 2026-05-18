const { Client } = require("pg");

const TENANT_NAME_REGEX = /^[a-z][a-z0-9_-]{0,62}$/;

const RESERVED_NAMES = new Set([
  "postgres",
  "template0",
  "template1",
  "onboarding",
  "admin",
  "root"
]);

class TenantDbError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "TenantDbError";
    this.code = code;
  }
}

function assertValidTenantName(name) {
  if (typeof name !== "string") {
    throw new TenantDbError("El nombre del tenant debe ser un string.", "INVALID_TENANT_NAME");
  }
  if (!TENANT_NAME_REGEX.test(name)) {
    throw new TenantDbError(
      `Nombre de tenant invalido: "${name}". Solo se permiten minusculas, digitos, guion y guion bajo, comenzando con letra, hasta 63 caracteres.`,
      "INVALID_TENANT_NAME"
    );
  }
  if (RESERVED_NAMES.has(name)) {
    throw new TenantDbError(
      `El nombre "${name}" esta reservado y no puede usarse como tenant.`,
      "RESERVED_TENANT_NAME"
    );
  }
}

function buildAdminClient() {
  const host = process.env.PG_ADMIN_HOST;
  const port = process.env.PG_ADMIN_PORT;
  const user = process.env.PG_ADMIN_USER;
  const password = process.env.PG_ADMIN_PASSWORD;
  const database = process.env.PG_ADMIN_DATABASE || "postgres";

  if (!host || !port || !user || password === undefined) {
    throw new TenantDbError(
      "Faltan variables de entorno PG_ADMIN_HOST / PG_ADMIN_PORT / PG_ADMIN_USER / PG_ADMIN_PASSWORD.",
      "MISSING_PG_ADMIN_ENV"
    );
  }

  return new Client({
    host,
    port: Number(port),
    user,
    password,
    database
  });
}

async function tenantDatabaseExists(name) {
  assertValidTenantName(name);

  const client = buildAdminClient();
  await client.connect();
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    return result.rowCount > 0;
  } finally {
    await client.end();
  }
}

async function createTenantDatabase(name) {
  assertValidTenantName(name);

  const client = buildAdminClient();
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (existing.rowCount > 0) {
      throw new TenantDbError(
        `Ya existe una base de datos con el nombre "${name}".`,
        "TENANT_DB_ALREADY_EXISTS"
      );
    }

    await client.query(`CREATE DATABASE "${name}"`);
    return { tenant: name, created: true };
  } finally {
    await client.end();
  }
}

module.exports = {
  assertValidTenantName,
  tenantDatabaseExists,
  createTenantDatabase,
  TenantDbError
};
