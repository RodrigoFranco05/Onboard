/**
 * Registry de tenants para soporte cross-tenant.
 *
 * Lee server/config/tenants.json al boot y lo cachea en memoria.
 * Usa fs.watch para invalidar la caché cuando el archivo cambia.
 * Si un reload trae JSON inválido, se mantiene la versión anterior y se loguea el error.
 *
 * Schema esperado:
 *   [{ tenant: string, displayName?: string, isMainSupport?: boolean }]
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', 'config', 'tenants.json');

let registry = [];
let loadedOk = false;
let watcherInitialized = false;

function parseAndValidate(raw) {
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('tenants.json debe ser un array');
  }
  const seen = new Set();
  const result = [];
  data.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Entrada ${idx} no es un objeto`);
    }
    // Permitir entradas-comentario: { "_comment": "..." } se ignoran (JSON no soporta // nativos)
    if (entry._comment !== undefined && entry.tenant === undefined) {
      return;
    }
    const tenant = (entry.tenant || '').toString().trim();
    if (!tenant) {
      throw new Error(`Entrada ${idx} sin campo "tenant"`);
    }
    if (seen.has(tenant)) {
      throw new Error(`Tenant duplicado: ${tenant}`);
    }
    seen.add(tenant);
    result.push({
      tenant,
      displayName: entry.displayName ? String(entry.displayName) : tenant,
      isMainSupport: entry.isMainSupport === true
    });
  });
  return result;
}

function loadRegistrySync() {
  try {
    const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const parsed = parseAndValidate(raw);
    registry = parsed;
    loadedOk = true;
    console.log(`[tenantsRegistry] Cargados ${registry.length} tenants desde ${REGISTRY_PATH}`);
  } catch (err) {
    if (loadedOk) {
      console.error(`[tenantsRegistry] Error recargando ${REGISTRY_PATH}, manteniendo versión anterior:`, err.message);
    } else {
      console.error(`[tenantsRegistry] No se pudo cargar ${REGISTRY_PATH}:`, err.message);
      console.error(`[tenantsRegistry] El módulo de soporte cross-tenant queda deshabilitado hasta que el archivo sea válido.`);
      registry = [];
    }
  }
}

function initWatcher() {
  if (watcherInitialized) return;
  try {
    let reloadTimer = null;
    fs.watch(REGISTRY_PATH, () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => {
        console.log('[tenantsRegistry] Cambio detectado en tenants.json, recargando...');
        loadRegistrySync();
      }, 100);
    });
    watcherInitialized = true;
    console.log(`[tenantsRegistry] fs.watch activo sobre ${REGISTRY_PATH}`);
  } catch (err) {
    console.error('[tenantsRegistry] No se pudo iniciar fs.watch:', err.message);
  }
}

loadRegistrySync();
initWatcher();

function getRegistry() {
  return registry.slice();
}

function findTenant(name) {
  if (!name) return null;
  return registry.find((t) => t.tenant === name) || null;
}

function isMainSupport(tenantName) {
  const t = findTenant(tenantName);
  return !!(t && t.isMainSupport);
}

function getMainSupportTenants() {
  return registry.filter((t) => t.isMainSupport);
}

module.exports = {
  getRegistry,
  findTenant,
  isMainSupport,
  getMainSupportTenants
};
