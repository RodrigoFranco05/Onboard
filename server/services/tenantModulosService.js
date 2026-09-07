/**
 * Aplica módulos contratados en la BD del tenant (después del init del ERP).
 * Sequelize only — no raw SQL.
 */

const { DataTypes, Op } = require("sequelize");
const {
  PARAM_CREADO_POR_ONBOARDING,
  PARAM_MODULOS_ONBOARDING,
  normalizeModulosFlags,
  resolveAllowlist,
} = require("./onboardingModulosAllowlist");

function defineParametrosGlobales(sequelize) {
  return (
    sequelize.models.ParametrosGlobales ||
    sequelize.define(
      "ParametrosGlobales",
      {
        nombreParametro: { type: DataTypes.STRING, primaryKey: true },
        valorParametro: { type: DataTypes.TEXT },
        verEnMenu: { type: DataTypes.BOOLEAN, defaultValue: false },
        descripcion: { type: DataTypes.STRING, allowNull: true },
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      { tableName: "parametrosGlobales" }
    )
  );
}

function defineMenuAcceso(sequelize) {
  return (
    sequelize.models.MenuAcceso ||
    sequelize.define(
      "MenuAcceso",
      {
        id: { type: DataTypes.STRING, primaryKey: true },
        descripcion: { type: DataTypes.STRING, allowNull: false },
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      { tableName: "menuAcceso" }
    )
  );
}

function defineRolAcceso(sequelize) {
  return (
    sequelize.models.RolAcceso ||
    sequelize.define(
      "RolAcceso",
      {
        idRolUsuario: { type: DataTypes.INTEGER, primaryKey: true },
        idMenuAcceso: { type: DataTypes.STRING, primaryKey: true },
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      { tableName: "rolAcceso" }
    )
  );
}

function defineRolUsuario(sequelize) {
  return (
    sequelize.models.RolUsuario ||
    sequelize.define(
      "RolUsuario",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        descripcion: { type: DataTypes.STRING },
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      { tableName: "rolUsuario" }
    )
  );
}

async function upsertParametro(ParametrosGlobales, values) {
  const existing = await ParametrosGlobales.findByPk(values.nombreParametro);
  if (existing) {
    await existing.update(values);
    return;
  }
  await ParametrosGlobales.create(values);
}

async function applyTenantModules(sequelize, { registroId, modulos }) {
  if (!registroId) {
    throw new Error("applyTenantModules requiere registroId");
  }

  const flags = normalizeModulosFlags(modulos);
  const allowlist = resolveAllowlist(flags);

  if (allowlist.length === 0) {
    throw new Error("La allowlist de módulos Onboard no puede quedar vacía");
  }

  const ParametrosGlobales = defineParametrosGlobales(sequelize);
  const MenuAcceso = defineMenuAcceso(sequelize);
  const RolAcceso = defineRolAcceso(sequelize);
  const RolUsuario = defineRolUsuario(sequelize);

  await upsertParametro(ParametrosGlobales, {
    nombreParametro: PARAM_CREADO_POR_ONBOARDING,
    valorParametro: String(registroId),
    verEnMenu: false,
    descripcion: "Id de registro Onboard que creo este tenant",
    eliminado: false,
  });

  await upsertParametro(ParametrosGlobales, {
    nombreParametro: PARAM_MODULOS_ONBOARDING,
    valorParametro: JSON.stringify(flags),
    verEnMenu: false,
    descripcion: "Snapshot de módulos contratados en Onboard",
    eliminado: false,
  });

  await MenuAcceso.update({ eliminado: true }, { where: { id: { [Op.ne]: "" } } });
  await MenuAcceso.update(
    { eliminado: false },
    { where: { id: { [Op.in]: allowlist } } }
  );

  await RolAcceso.update({ eliminado: true }, { where: { idRolUsuario: { [Op.gte]: 1 } } });

  const menusExistentes = await MenuAcceso.findAll({ attributes: ["id"] });
  const idsExistentes = new Set(menusExistentes.map((m) => m.id));
  const idsActivos = allowlist.filter((id) => idsExistentes.has(id));

  const roles = await RolUsuario.findAll({
    where: { eliminado: false },
    attributes: ["id"],
  });

  for (const rol of roles) {
    for (const menuId of idsActivos) {
      const [row, created] = await RolAcceso.findOrCreate({
        where: { idRolUsuario: rol.id, idMenuAcceso: menuId },
        defaults: { eliminado: false },
      });
      if (!created && row.eliminado) {
        await row.update({ eliminado: false });
      }
    }
  }

  console.log(
    `[tenantModulosService] registro ${registroId}: ${idsActivos.length} menús activos (${Object.entries(flags)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(", ") || "solo nucleo"})`
  );

  return { allowlist: idsActivos, flags };
}

module.exports = { applyTenantModules };
