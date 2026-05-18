function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 6);
}

function randomPassword() {
  return `Lutente!${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-3)}`;
}

function pickBaseName(payload) {
  return (
    payload?.negocio ||
    payload?.empresa ||
    payload?.nombre ||
    payload?.correo ||
    payload?.email ||
    "demo"
  );
}

function generateTenantName(payload) {
  const slugBase = slugify(pickBaseName(payload)) || "demo";
  let candidate = `${slugBase}-${randomSuffix()}`;
  if (!/^[a-z]/.test(candidate)) {
    candidate = `t-${candidate}`.slice(0, 63);
  }
  return candidate;
}

module.exports = {
  slugify,
  randomSuffix,
  randomPassword,
  generateTenantName
};
