const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

function adminModelInit(sequelize){
const existingModels = sequelize.models || {}

if (
  existingModels.Ubicacion &&
  existingModels.Negocio &&
  existingModels.TipoEntidad &&
  existingModels.CanalEntidad &&
  existingModels.Entidad &&
  existingModels.EntidadAtributo &&
  existingModels.EntidadAtributoClasificacion &&
  existingModels.Usuario &&
  existingModels.ParametrosGlobales &&
  existingModels.RolUsuario &&
  existingModels.MenuAcceso &&
  existingModels.RolAcceso &&
  existingModels.MenuFuncionalidadAcceso &&
  existingModels.RolFuncionalidadAcceso &&
  existingModels.SesionesUsuario
) {
  return {
    Ubicacion: existingModels.Ubicacion,
    Negocio: existingModels.Negocio,
    TipoEntidad: existingModels.TipoEntidad,
    CanalEntidad: existingModels.CanalEntidad,
    Entidad: existingModels.Entidad,
    EntidadAtributo: existingModels.EntidadAtributo,
    EntidadAtributoClasificacion: existingModels.EntidadAtributoClasificacion,
    Usuario: existingModels.Usuario,
    ParametrosGlobales: existingModels.ParametrosGlobales,
    RolUsuario: existingModels.RolUsuario,
    MenuAcceso: existingModels.MenuAcceso,
    RolAcceso: existingModels.RolAcceso,
    MenuFuncionalidadAcceso: existingModels.MenuFuncionalidadAcceso,
    RolFuncionalidadAcceso: existingModels.RolFuncionalidadAcceso,
    SesionesUsuario: existingModels.SesionesUsuario,
  };
}

// UBICACION *******************************************************************************************************************************
const Ubicacion = sequelize.define('Ubicacion', {
    id: { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    destinoTransferenciaInternaCaja: { type: DataTypes.BOOLEAN, defaultValue: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
    tableName: 'ubicacion'
    });

// NEGOCIO *******************************************************************************************************************************
const Negocio = sequelize.define('Negocio', {
    id:          { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado:   { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
    tableName: 'negocio'
    });

// ENTIDAD *******************************************************************************************************************************
const TipoEntidad = sequelize.define('TipoEntidad', {
    id: { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    verEnCaja: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
    verEnGasto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
    tableName: 'tipoEntidad'
    });   

const CanalEntidad = sequelize.define(
  "CanalEntidad",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
    descripcion: { type: DataTypes.STRING, allowNull: false },
    eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: "canalEntidad",
  }
);

const EntidadAtributo = sequelize.define('EntidadAtributo', {
    idEntidadAtributo:    { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, validate: { min: 1, max: 10 } },
    idTipoEntidad:        { type: DataTypes.INTEGER, primaryKey: true, allowNull: false, references: { model: TipoEntidad, key: 'id' } },
    descripcion:          { type: DataTypes.STRING, allowNull: false },     
    eliminado:            { type: DataTypes.BOOLEAN,  defaultValue: false }
    },
    {    
    tableName: 'entidadAtributo'
});

// ENTIDAD ATRIBUTO CLASIFICACION *******************************************************************************************************************************
const EntidadAtributoClasificacion = sequelize.define('EntidadAtributoClasificacion', {
    id:                   { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
    idEntidadAtributo:    { type: DataTypes.INTEGER, allowNull: false }, // FK compuesta parte 1
    idTipoEntidad:        { type: DataTypes.INTEGER, allowNull: false }, // FK compuesta parte 2
    descripcion:          { type: DataTypes.STRING, allowNull: false },     
    eliminado:            { type: DataTypes.BOOLEAN,  defaultValue: false }
    },
    {    
    tableName: 'entidadAtributoClasificacion'
});

const Entidad = sequelize.define('Entidad', {
    id: { type: DataTypes.INTEGER, primaryKey: true , autoIncrement: true}, // ID secuencial
    descripcion:    { type: DataTypes.STRING, allowNull: false },
    apellido:       { type: DataTypes.STRING, allowNull: true },
    telefono:       { type: DataTypes.STRING, allowNull: true },
    email:          { type: DataTypes.STRING, allowNull: true },
    dniCuitCuil:    { type: DataTypes.STRING, allowNull: true },
    direccion:      { type: DataTypes.STRING, allowNull: true },
    localidad:      { type: DataTypes.STRING, allowNull: true },
    provincia:      { type: DataTypes.STRING, allowNull: true },
    idTipoEntidad:  { type: DataTypes.INTEGER, allowNull: false , references: { model: TipoEntidad, key: 'id' }},
    idCanal:        { type: DataTypes.INTEGER, allowNull: true , references: { model: CanalEntidad, key: 'id' }, defaultValue: null},
    entidadDatoAtributo1:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null },       
    entidadDatoAtributo2:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null },       
    entidadDatoAtributo3:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    entidadDatoAtributo4:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    entidadDatoAtributo5:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    entidadDatoAtributo6:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null },       
    entidadDatoAtributo7:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null },       
    entidadDatoAtributo8:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    entidadDatoAtributo9:    { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    entidadDatoAtributo10:   { type: DataTypes.INTEGER, allowNull: true, references: { model: 'entidadAtributoClasificacion', key: 'id' }, defaultValue: null }, 
    eliminado:      { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
    tableName: 'entidad'
    });    

    

    const RolUsuario = sequelize.define(
      "RolUsuario",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
        descripcion: { type: DataTypes.STRING, allowNull: false },
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        tableName: "rolUsuario",
      }
    );

    const Usuario = sequelize.define(
      "Usuario",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }, // ID secuencial
        usuario: { type: DataTypes.STRING, allowNull: false },
        nombre: { type: DataTypes.STRING, allowNull: true },
        apellido: { type: DataTypes.STRING, allowNull: true },
        telefono: { type: DataTypes.STRING, allowNull: true },
        email: { type: DataTypes.STRING, allowNull: true },
        dniCuitCuil: { type: DataTypes.STRING, allowNull: true },
        direccion: { type: DataTypes.STRING, allowNull: true },
        localidad: { type: DataTypes.STRING, allowNull: true },
        provincia: { type: DataTypes.STRING, allowNull: true },
        rol: { type: DataTypes.INTEGER, allowNull: true, references: { model: RolUsuario, key: "id" },},
        password: { type: DataTypes.STRING, allowNull: true }, //  ENCRIPTAR
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
      },
      {
        tableName: "usuario",
      }
    );

    // SESIONES *******************************************************************************************************************************
    const SesionesUsuario = sequelize.define(
      "SesionesUsuario",
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        idUsuario: { 
          type: DataTypes.INTEGER, 
          allowNull: false, 
          references: { model: Usuario, key: "id" } 
        },
        tokenHash: { 
          type: DataTypes.STRING(255), 
          allowNull: false,
          unique: true 
        }, // Hash SHA256 del token JWT para búsqueda rápida
        ipAddress: { 
          type: DataTypes.STRING(45), 
          allowNull: true 
        }, // IPv4 o IPv6
        userAgent: { 
          type: DataTypes.TEXT, 
          allowNull: true 
        }, // Navegador/dispositivo completo
        dispositivo: { 
          type: DataTypes.STRING(255), 
          allowNull: true 
        }, // "Desktop", "Mobile", "Tablet"
        navegador: { 
          type: DataTypes.STRING(100), 
          allowNull: true 
        }, // "Chrome", "Firefox", "Safari", etc.
        sistemaOperativo: { 
          type: DataTypes.STRING(100), 
          allowNull: true 
        }, // "Windows", "iOS", "Android", "Linux", etc.
        activa: { 
          type: DataTypes.BOOLEAN, 
          defaultValue: true 
        }, // false = sesión cerrada/revocada
        ultimaActividad: { 
          type: DataTypes.DATE, 
          defaultValue: DataTypes.NOW 
        },
        fechaCreacion: { 
          type: DataTypes.DATE, 
          defaultValue: DataTypes.NOW 
        },
        fechaExpiracion: { 
          type: DataTypes.DATE, 
          allowNull: false 
        }, // Calculado desde JWT exp
        cerradaPor: { 
          type: DataTypes.INTEGER, 
          allowNull: true, 
          references: { model: Usuario, key: "id" } 
        }, // Admin que cerró la sesión
        razonCierre: { 
          type: DataTypes.STRING(255), 
          allowNull: true 
        }, // "Cierre manual", "Suspicaz", "Usuario despedido", etc.
      },
      {
        tableName: "sesionesUsuario"
      }
    );
 
    // tabla mantenida por el equipo de desarrollo
    const MenuAcceso = sequelize.define('MenuAcceso', {
        id: { type: DataTypes.STRING, primaryKey: true }, // VENTAS
        descripcion: { type: DataTypes.STRING, allowNull: false }, // MENU PRINCIPAL VENTAS  
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
        tableName: 'menuAcceso'
    });
 
    const RolAcceso = sequelize.define('RolAcceso', {
        idRolUsuario:  { type: DataTypes.INTEGER,     allowNull: false,     references: { model: RolUsuario, key: 'id' },     primaryKey: true   }, // es FK y PK
        idMenuAcceso:  { type: DataTypes.STRING,     allowNull: false,     references: { model: MenuAcceso, key: 'id' },     primaryKey: true   },    // es FK y PK       
        eliminado: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {    
        tableName: 'rolAcceso'
    });

    const MenuFuncionalidadAcceso = sequelize.define('MenuFuncionalidadAcceso', {
      id: { type: DataTypes.STRING, primaryKey: true }, // Ej: "btnCancelar", "colCosto"
      idMenuAcceso: { 
        type: DataTypes.STRING,
        allowNull: false,
        references: { model: MenuAcceso, key: 'id' },
      },
      descripcion: { type: DataTypes.STRING, allowNull: false },
      tipo: { type: DataTypes.STRING, allowNull: false }, // 'button', 'column', 'tab', etc.
      meta: { type: DataTypes.JSONB, defaultValue: {} },
      eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
      tableName: 'menuFuncionalidadAcceso',
    });

    const RolFuncionalidadAcceso = sequelize.define('RolFuncionalidadAcceso', {
      idRolUsuario: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        references: { model: RolUsuario, key: 'id' }, 
        primaryKey: true 
      },
      idMenuAcceso: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        references: { model: MenuAcceso, key: 'id' }, 
        primaryKey: true 
      },
      idSector: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        references: { model: MenuFuncionalidadAcceso, key: 'id' },
        primaryKey: true 
      },
      eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
      tableName: 'rolFuncionalidadAcceso',
    });
    
 

     
// PARAMETROS GLOBALES *******************************************************************************************************************************
const ParametrosGlobales = sequelize.define('ParametrosGlobales', {
  nombreParametro:  { type: DataTypes.STRING, primaryKey: true}, // ID secuencial
  valorParametro:   { type: DataTypes.TEXT},
  verEnMenu:        { type: DataTypes.BOOLEAN, defaultValue: false },
  descripcion:      { type: DataTypes.STRING, allowNull: true}, 
  eliminado:        { type: DataTypes.BOOLEAN, defaultValue: false }
  },
  {    
  tableName: 'parametrosGlobales'
});

 // Relaciones
 TipoEntidad.hasMany(Entidad, { foreignKey: "idTipoEntidad", as: "entidades" });
 Entidad.belongsTo(TipoEntidad, { foreignKey: "idTipoEntidad", as: "tipoEntidad" });

 CanalEntidad.hasMany(Entidad, { foreignKey: "idCanal", as: "entidades" });
 Entidad.belongsTo(CanalEntidad, { foreignKey: "idCanal", as: "canalEntidad" });

 // Relaciones TipoEntidad con EntidadAtributo
 TipoEntidad.hasMany(EntidadAtributo, { foreignKey: "idTipoEntidad", as: "atributos" });
 EntidadAtributo.belongsTo(TipoEntidad, { foreignKey: "idTipoEntidad", as: "tipoEntidad" });

 // Relaciones EntidadAtributo con EntidadAtributoClasificacion (FK compuesta)
 // Nota: Sequelize no soporta bien hasMany con FK compuestas usando arrays
 // Se manejará manualmente en las consultas cuando sea necesario
 // EntidadAtributo.hasMany(EntidadAtributoClasificacion, { 
 //   foreignKey: ['idEntidadAtributo', 'idTipoEntidad'], 
 //   sourceKey: ['idEntidadAtributo', 'idTipoEntidad'], 
 //   as: "clasificaciones" 
 // });
 // 
 // Para consultas, usar where manual:
 // EntidadAtributoClasificacion.findAll({
 //   where: {
 //     idEntidadAtributo: atributo.idEntidadAtributo,
 //     idTipoEntidad: atributo.idTipoEntidad
 //   }
 // })

 // Relaciones Entidad con EntidadAtributoClasificacion (para los 10 atributos)
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo1", as: "opcionAtributo1" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo2", as: "opcionAtributo2" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo3", as: "opcionAtributo3" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo4", as: "opcionAtributo4" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo5", as: "opcionAtributo5" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo6", as: "opcionAtributo6" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo7", as: "opcionAtributo7" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo8", as: "opcionAtributo8" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo9", as: "opcionAtributo9" });
 Entidad.belongsTo(EntidadAtributoClasificacion, { foreignKey: "entidadDatoAtributo10", as: "opcionAtributo10" });

 MenuAcceso.hasMany(RolAcceso, { foreignKey: "idMenuAcceso", as: "rolAccesos" });
 RolAcceso.belongsTo(MenuAcceso, { foreignKey: "idMenuAcceso", as: "menuAcceso" });

// Relaciones de Usuario con RolUsuario
RolUsuario.hasMany(Usuario, { foreignKey: "rol", as: "usuarios" });
Usuario.belongsTo(RolUsuario, { foreignKey: "rol", as: "rolUsuario" });

// Relaciones de SesionesUsuario con Usuario
Usuario.hasMany(SesionesUsuario, { foreignKey: "idUsuario", as: "sesiones" });
SesionesUsuario.belongsTo(Usuario, { foreignKey: "idUsuario", as: "usuario" });

// Relación de SesionesUsuario con Usuario (quien cerró la sesión)
Usuario.hasMany(SesionesUsuario, { foreignKey: "cerradaPor", as: "sesionesCerradas" });
SesionesUsuario.belongsTo(Usuario, { foreignKey: "cerradaPor", as: "cerradaPorUsuario" });

// Relaciones de RolAcceso con RolUsuario
RolUsuario.hasMany(RolAcceso, { foreignKey: "idRolUsuario", as: "rolAccesos" });
RolAcceso.belongsTo(RolUsuario, { foreignKey: "idRolUsuario", as: "rolUsuario" });

// Relaciones de MenuFuncionalidadAcceso con MenuAcceso
MenuAcceso.hasMany(MenuFuncionalidadAcceso, { foreignKey: "idMenuAcceso", as: "componentesSector" });
MenuFuncionalidadAcceso.belongsTo(MenuAcceso, { foreignKey: "idMenuAcceso", as: "menuAcceso" });

// Relaciones de RolFuncionalidadAcceso
RolUsuario.hasMany(RolFuncionalidadAcceso, { foreignKey: "idRolUsuario", as: "rolFuncionalidadAcceso" });
RolFuncionalidadAcceso.belongsTo(RolUsuario, { foreignKey: "idRolUsuario", as: "rolUsuario" });

MenuAcceso.hasMany(RolFuncionalidadAcceso, { foreignKey: "idMenuAcceso", as: "rolFuncionalidadAcceso" });
RolFuncionalidadAcceso.belongsTo(MenuAcceso, { foreignKey: "idMenuAcceso", as: "menuAcceso" });

MenuFuncionalidadAcceso.hasMany(RolFuncionalidadAcceso, { foreignKey: "idSector", as: "rolFuncionalidadAcceso" });
RolFuncionalidadAcceso.belongsTo(MenuFuncionalidadAcceso, { foreignKey: "idSector", as: "menuFuncionalidadAcceso" });


return {Ubicacion, Negocio, TipoEntidad, CanalEntidad, Entidad, EntidadAtributo, EntidadAtributoClasificacion, Usuario, ParametrosGlobales, RolUsuario, MenuAcceso, RolAcceso, MenuFuncionalidadAcceso, RolFuncionalidadAcceso, SesionesUsuario};
}


// module.exports =   {Ubicacion, Negocio, TipoEntidad, Entidad};
module.exports =   { adminModelInit };
