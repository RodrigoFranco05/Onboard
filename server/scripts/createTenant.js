/*
  Script CLI para generacion de tenant.
  Recibe un JSON por argv[2] y devuelve JSON por stdout.

  Flujo:
    1. Genera un nombre de tenant a partir del payload.
    2. Crea fisicamente la base de datos en Postgres.
    3. Devuelve { tenant, url, user, password }.

  Notas:
    - El script consume el mismo servicio que usa el controller, asi que la logica
      de creacion de BD vive en services/tenantDbService.js.
    - Si el nombre generado choca con una BD existente, se reintenta con sufijo
      nuevo hasta MAX_INTENTOS veces.
*/

require("dotenv").config();

const tenantDbService = require("../services/tenantDbService");
const tenantNameGenerator = require("../services/tenantNameGenerator");

const MAX_INTENTOS = 3;

function buildTenantUrl(tenant) {
  const template = process.env.TENANT_URL_TEMPLATE || "http://localhost:3000/{tenant}/login";
  return template.replace("{tenant}", tenant);
}

async function createTenantWithRetries(payload) {
  let lastError = null;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
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

async function main() {
  const payloadRaw = process.argv[2];
  if (!payloadRaw) {
    throw new Error("Falta payload para crear tenant");
  }

  const payload = JSON.parse(payloadRaw);
  const tenant = await createTenantWithRetries(payload);

  const response = {
    tenant,
    url: buildTenantUrl(tenant),
    user: payload.email || payload.correo || `admin@${tenant}.demo`,
    password: tenantNameGenerator.randomPassword()
  };

  process.stdout.write(JSON.stringify(response));
}

main().catch((error) => {
  process.stderr.write(error?.message || String(error));
  process.exit(1);
});
