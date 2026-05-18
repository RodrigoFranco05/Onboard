const { adminModelInit } = require("./adminModel.js")
const { itemModelInit } = require("./itemModel.js")
const { transaccionModelInit } = require("./transaccionModel.js")
const { soporteModelInit } = require("./soporteModel.js")
const { rrhhModelInit } = require("../domains/rrhhDomain/models/rrhhModel.js")

const MODEL_REGISTRY_FOR_MIGRATIONS = [
  {
    key: "admin",
    source: "server/models/adminModel.js",
    init: adminModelInit,
  },
  {
    key: "item",
    source: "server/models/itemModel.js",
    init: itemModelInit,
  },
  {
    key: "transaccion",
    source: "server/models/transaccionModel.js",
    init: transaccionModelInit,
  },
  {
    key: "soporte",
    source: "server/models/soporteModel.js",
    init: soporteModelInit,
  },
  {
    key: "rrhh",
    source: "server/domains/rrhhDomain/models/rrhhModel.js",
    init: rrhhModelInit,
  },
]

function registerAllModelsForMigrations(sequelize) {
  for (const entry of MODEL_REGISTRY_FOR_MIGRATIONS) {
    entry.init(sequelize)
  }

  return sequelize.models || {}
}

module.exports = {
  MODEL_REGISTRY_FOR_MIGRATIONS,
  registerAllModelsForMigrations,
}