const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Registro = sequelize.define('Registro', {
  correo:               { type: DataTypes.STRING,  unique: true },
  nombre:               { type: DataTypes.STRING },
  apellido:             { type: DataTypes.STRING },
  telefono:             { type: DataTypes.STRING },
  negocio:              { type: DataTypes.STRING },
  pais:                 { type: DataTypes.STRING },
  provincia:            { type: DataTypes.STRING },
  mensaje:              { type: DataTypes.TEXT },
  modulos:              { type: DataTypes.JSONB,   defaultValue: [] },
  tenant:               { type: DataTypes.STRING },
  url:                  { type: DataTypes.STRING },
  estado:               { type: DataTypes.STRING,  defaultValue: 'email_requested' },
  verificationToken:    { type: DataTypes.STRING,  field: 'verification_token' },
  verificationExpiresAt:{ type: DataTypes.DATE,    field: 'verification_expires_at' },
  verificationSentAt:   { type: DataTypes.DATE,    field: 'verification_sent_at' },
  emailVerifiedAt:      { type: DataTypes.DATE,    field: 'email_verified_at' }
}, {
  tableName: 'registro',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

module.exports = Registro;
