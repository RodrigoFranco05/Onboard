/**
 * Allowlist de menús para tenants creados por Onboard.
 *
 * Mantener sincronizado con:
 *   lutenteERPcloud/server/services/onboardingModulosAllowlist.js
 *
 * No agregar estos parámetros al catálogo del ERP (parametrosGlobalesValidator):
 * se insertan solo en la BD del tenant desde tenantModulosService.
 */

const PARAM_CREADO_POR_ONBOARDING = "creadoPorOnboarding";
const PARAM_MODULOS_ONBOARDING = "modulosOnboarding";

const ALWAYS_ON_MENU_IDS = [
  "DASHBOARD",
  "ADMINISTRACION",
  "ADMINISTRACION1",
  "ADMINISTRACION2",
  "ADMINISTRACION3",
  "ADMINISTRACION5",
  "ADMINISTRACION6",
  "ADMINISTRACION7",
  "ADMINISTRACION8",
  "INVENTARIO4",
  "TRANSACCION",
  "TRANSACCIONES1",
  "TRANSACCIONES2",
  "TRANSACCIONES5",
  "TRANSACCIONES6",
  "TRANSACCIONES7",
  "TRANSACCIONES8",
  "TRANSACCIONES9",
  "TRANSACCIONES10",
];

const MODULE_MENU_IDS = {
  ventas: [
    "VENTAS",
    "VENTAS_GRUPO_VENTAS",
    "VENTAS_GRUPO_PRESUPUESTO",
    "VENTAS1",
    "VENTAS2",
    "VENTAS3",
    "VENTAS4",
    "VENTAS5",
    "VENTAS6",
    "VENTAS7",
    "VENTAS9",
  ],
  inventario: [
    "INVENTARIO",
    "INVENTARIO_GRUPO_ITEMS",
    "INVENTARIO_GRUPO_RECETA",
    "INVENTARIO1",
    "INVENTARIO2",
    "INVENTARIO3",
    "INVENTARIO4",
    "INVENTARIO5",
    "VENTAS8",
    "COMPRAS5",
  ],
  compras: [
    "COMPRAS",
    "COMPRAS_GRUPO_COMPRAS",
    "COMPRAS1",
    "COMPRAS2",
    "COMPRAS3",
    "COMPRAS4",
  ],
  rrhh: [
    "RRHH",
    "RRHH1",
    "RRHH2",
    "RRHH3",
    "RRHH4",
    "RRHH5",
    "RRHH6",
    "RRHH7",
    "RRHH8",
    "RRHH9",
    "RRHH10",
  ],
  caja: [],
  cuentas: [],
  logistica: [],
};

function normalizeModulosFlags(modulos) {
  const src = modulos && typeof modulos === "object" ? modulos : {};
  const flags = {
    ventas: Boolean(src.ventas),
    compras: Boolean(src.compras),
    inventario: Boolean(src.inventario),
    caja: Boolean(src.caja),
    cuentas: Boolean(src.cuentas),
    rrhh: Boolean(src.rrhh),
    logistica: false,
  };
  if (flags.ventas) {
    flags.inventario = true;
  }
  return flags;
}

function resolveAllowlist(modulos) {
  const flags = normalizeModulosFlags(modulos);
  const ids = new Set(ALWAYS_ON_MENU_IDS);
  for (const [key, menuIds] of Object.entries(MODULE_MENU_IDS)) {
    if (!flags[key]) {
      continue;
    }
    for (const id of menuIds) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

module.exports = {
  PARAM_CREADO_POR_ONBOARDING,
  PARAM_MODULOS_ONBOARDING,
  ALWAYS_ON_MENU_IDS,
  MODULE_MENU_IDS,
  normalizeModulosFlags,
  resolveAllowlist,
};
