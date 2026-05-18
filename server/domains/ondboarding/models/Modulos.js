const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Registro = require('./Registro');

const Modulos = sequelize.define('Modulos', {
  registroId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'registro_id',
    references: {
      model: 'registro',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  ventas:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  compras:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  inventario: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  caja:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cuentas:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  rrhh:       { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  logistica:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  tableName: 'modulos',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

Modulos.belongsTo(Registro, { foreignKey: 'registro_id', as: 'registro' });
Registro.hasOne(Modulos, { foreignKey: 'registro_id', as: 'modulosConfig' });

module.exports = Modulos;
