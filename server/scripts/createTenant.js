/*
  Script placeholder para generación de tenant.
  Recibe un JSON por argv[2] y devuelve JSON por stdout.
  Más adelante aquí se conecta con el proceso real de aprovisionamiento.
*/

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomPassword() {
  return `Lutente!${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-3)}`;
}

function main() {
  const payloadRaw = process.argv[2];
  if (!payloadRaw) {
    throw new Error("Falta payload para crear tenant");
  }

  const payload = JSON.parse(payloadRaw);
  const baseName = payload.negocio || payload.empresa || payload.nombre || payload.email || "demo";
  const slugBase = slugify(baseName) || "demo";
  const uniqueSuffix = Math.random().toString(36).slice(2, 6);
  const tenant = `${slugBase}-${uniqueSuffix}`;

  const response = {
    tenant,
    url: `https://${tenant}.lutente.demo`,
    user: `admin@${tenant}.demo`,
    password: randomPassword()
  };

  process.stdout.write(JSON.stringify(response));
}

try {
  main();
} catch (error) {
  process.stderr.write(error.message);
  process.exit(1);
}
