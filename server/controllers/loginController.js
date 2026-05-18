// const { Sequelize } = require('sequelize');
const { DataTypes, Op } = require("sequelize");
// const { Usuario } = require('../models/loginModel.js');
const { adminModelInit } = require("../models/adminModel.js");
const { conexionDB } = require("../config/db.js");
const { hashToken, parseUserAgent, getClientIP } = require("./adminController.js");

// authController.js
const bcrypt = require("bcrypt"); //sirve para detectar contraseñas cifradas. En el caso de la base de datos.
const jwt = require("jsonwebtoken");
const secretKey = process.env.SECRET_KEY || "clave_secreta"; // Usa variables de entorno en producción

const login = async (req, res) => {
  const { usuario, password, tenant } = req.body;
  // console.log(tenant)

  let sequelize = await conexionDB(tenant);
  const { Usuario } = adminModelInit(sequelize);
  try {
    // await sequelize.authenticate();
    console.log("Conexión a DB exitosa.");

    // Aquí llamas a la función Usuario con la instancia de sequelize para obtener el modelo
    // const UserModel = Usuario(sequelize);

    const user = await Usuario.findOne({ 
      where: { 
        usuario,
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      } 
    });
    if (!user) {
      // console.log("Usuario no encontrado o eliminado:", usuario);
      return res.status(404).json({ message: "Usuario no encontrado o ha sido eliminado" });
    }

    // Comparar la contraseña ingresada con la cifrada
    if (!(password === user.password)) {
      // console.log(
      //   "Contraseña incorrecta para el usuario:",
      //   usuario,
      //   user.password,
      //   password
      // );
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Genera el token JWT
    // Duración: 24 horas para coincidir con la cookie de sesión
    const token = jwt.sign({ id: user.id, rol: user.rol }, secretKey, {
      expiresIn: "24h",
    });

    // Decodificar token para obtener fecha de expiración
    const decoded = jwt.decode(token);
    const fechaExpiracion = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Registrar sesión en la base de datos
    try {
      const { SesionesUsuario } = adminModelInit(sequelize);
      const tokenHash = hashToken(token);
      const userAgent = req.headers["user-agent"] || "";
      const ipAddress = getClientIP(req);
      const { dispositivo, navegador, sistemaOperativo } = parseUserAgent(userAgent);

      // Verificar si ya existe una sesión con el mismo token hash
      const sesionExistente = await SesionesUsuario.findOne({
        where: { tokenHash }
      });

      if (sesionExistente) {
        // Si existe, actualizar en lugar de crear duplicado
        await sesionExistente.update({
          ipAddress,
          userAgent,
          dispositivo,
          navegador,
          sistemaOperativo,
          activa: true,
          ultimaActividad: new Date(),
          fechaExpiracion: fechaExpiracion,
          cerradaPor: null,
          razonCierre: null
        });
      } else {
        // Crear nueva sesión
        await SesionesUsuario.create({
          idUsuario: user.id,
          tokenHash,
          ipAddress,
          userAgent,
          dispositivo,
          navegador,
          sistemaOperativo,
          activa: true,
          ultimaActividad: new Date(),
          fechaCreacion: new Date(),
          fechaExpiracion: fechaExpiracion
        });
      }
    } catch (errorSesion) {
      // No fallar el login si hay error al registrar sesión, solo loguear
      console.error("Error al registrar sesión (no crítico):", errorSesion);
    }

    res.json({
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error en el servidor:", error.message || error);
    res.status(500).json({ 
      message: "Error de servidor", 
      error: error.message || "Error desconocido" 
    });
  }
};

const usuarioRol = async (req, res) => {
const { idRol } = req.query;

  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolUsuario } = adminModelInit(sequelize);

    const rol = await RolUsuario.findOne({
  where: { id: idRol },
    });
    if (!rol) {
      // console.log("Usuario no encontrado:", idRol);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(rol);
  } catch (error) {}
};

module.exports = { login, usuarioRol };

// const { Sequelize } = require('sequelize');
// const { DataTypes } = require('sequelize');
// const { Usuario } = require('../models/loginModel.js');

// const login = async (req, res) => {
//     const { usuario, password, tenant } = req.body;
//     console.log(tenant)

//     const sequelize = new Sequelize(tenant, 'postgres', 'admin', {
//         host: '127.0.0.1',
//         port: '5432',
//         dialect: 'postgres'
//     });

//     try {

//       await sequelize.authenticate();
//       console.log('Conexión a DB exitosa.');

//       const user = await Usuario.findOne({ where: { usuario } });
//       if (!user) {
//         console.log('Usuario no encontrado:', usuario);
//         return res.status(404).json({ message: 'Usuario no encontrado' });
//       }

//       // Comparar la contraseña ingresada con la cifrada
//       //const passwordMatch = await bcrypt.compare(password, user.password);
//       if (!(password === user.password)) {
//         console.log('Contraseña incorrecta para el usuario:', usuario, user.password, password);
//         return res.status(401).json({ message: 'Contraseña incorrecta' });
//       }

//       // Genera el token JWT
//       const token = jwt.sign({ id: user.id, rol: user.rol }, secretKey, { expiresIn: '1h' });
//       res.json({ token, user: { id: user.id, usuario: user.usuario, nombre: user.nombre, apellido: user.apellido, rol: user.rol, email: user.email } });
//     } catch (error) {
//       console.error('Error en el servidor:', error);
//       res.status(500).json({ message: 'Error de servidor', error });
//     }
//   };

// module.exports = { login };
