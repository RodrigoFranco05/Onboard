// const { Ubicacion, Negocio, TipoEntidad, Entidad }  = require('../models/adminModel.js');
const { Op, where } = require("sequelize");
const crypto = require("crypto");

const { conexionDB } = require("../config/db.js");
const { adminModelInit } = require("../models/adminModel.js");
const { transaccionModelInit } = require("../models/transaccionModel.js");

// Crear nueva ubicacion
const postUbicacion = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Ubicacion } = adminModelInit(sequelize);

    const { descripcion, destinoTransferenciaInternaCaja } = req.body;
    const ubicacion = await Ubicacion.create({
      descripcion: descripcion.trim(),
      destinoTransferenciaInternaCaja: destinoTransferenciaInternaCaja || false,
    });
    res.status(201).json(ubicacion);
  } catch (error) {
    res.status(400).json({ message: "Error al crear ubicacion", error });
  }
};

// Obtener ubicaciones
const getUbicacion = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Ubicacion } = adminModelInit(sequelize);

    const ubicacion = await Ubicacion.findAll({
      where: {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    });
    res.status(200).json(ubicacion);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ubicacion", error });
  }
};

// Actualizar ubicacion
const updateUbicacion = async (req, res) => {
  try {
    const { id, descripcion, destinoTransferenciaInternaCaja } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });
    if (!descripcion || String(descripcion).trim() === "") {
      return res.status(400).json({ message: "La descripción es requerida" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Ubicacion } = adminModelInit(sequelize);

    const ubicacion = await Ubicacion.findByPk(id);
    if (!ubicacion) {
      return res.status(404).json({ message: "Ubicación no encontrada" });
    }

    await ubicacion.update({ 
      descripcion: descripcion.trim(),
      destinoTransferenciaInternaCaja: destinoTransferenciaInternaCaja || false
    });
    return res.status(200).json(ubicacion);
  } catch (error) {
    console.error("Error al actualizar ubicación:", error);
    return res.status(500).json({ message: "Error al actualizar ubicación", error: error.message });
  }
};

// Eliminar ubicacion (soft delete)
const deleteUbicacion = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Ubicacion } = adminModelInit(sequelize);

    const ubicacion = await Ubicacion.findByPk(id);
    if (!ubicacion) {
      return res.status(404).json({ message: "Ubicación no encontrada" });
    }

    await ubicacion.update({ eliminado: true });
    return res.status(200).json({ message: "Ubicación eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar ubicación:", error);
    return res.status(500).json({ message: "Error al eliminar ubicación", error: error.message });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// Crear un nuevo Negocio
const postNegocio = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Negocio } = adminModelInit(sequelize);

    const negocio = new Negocio(req.body);
    await negocio.save();
    res.status(201).json(negocio);
  } catch (error) {
    res.status(400).json({ message: "Error al crear Negocio", error });
  }
};

// Obtener Negocio
const getNegocio = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Negocio } = adminModelInit(sequelize);

    const negocio = await Negocio.findAll({
      where: {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    });
    res.status(200).json(negocio);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Negocio", error });
  }
};

// Actualizar negocio
const updateNegocio = async (req, res) => {
  try {
    const { id, descripcion } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });
    if (!descripcion || String(descripcion).trim() === "") {
      return res.status(400).json({ message: "La descripción es requerida" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Negocio } = adminModelInit(sequelize);

    const negocio = await Negocio.findByPk(id);
    if (!negocio) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }

    await negocio.update({ descripcion: descripcion.trim() });
    return res.status(200).json(negocio);
  } catch (error) {
    console.error("Error al actualizar negocio:", error);
    return res.status(500).json({ message: "Error al actualizar negocio", error: error.message });
  }
};

// Eliminar negocio (soft delete)
const deleteNegocio = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Negocio } = adminModelInit(sequelize);

    const negocio = await Negocio.findByPk(id);
    if (!negocio) {
      return res.status(404).json({ message: "Negocio no encontrado" });
    }

    await negocio.update({ eliminado: true });
    return res.status(200).json({ message: "Negocio eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar negocio:", error);
    return res.status(500).json({ message: "Error al eliminar negocio", error: error.message });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// Crear un nuevo Tipo Entidad
const postTipoEntidad = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { TipoEntidad } = adminModelInit(sequelize);

    const tipoEntidad = new TipoEntidad(req.body);
    await tipoEntidad.save();
    res.status(201).json(tipoEntidad);
  } catch (error) {
    res.status(400).json({ message: "Error al crear Entidad", error });
  }
};

// Obtener Tipo Entidad
const getTipoEntidad = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { TipoEntidad } = adminModelInit(sequelize);

    const tipoEntidad = await TipoEntidad.findAll({
      where: {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    });
    res.status(200).json(tipoEntidad);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Entidad", error });
  }
};

// Actualizar tipo entidad
const updateTipoEntidad = async (req, res) => {
  try {
    const { id, descripcion } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });
    if (!descripcion || String(descripcion).trim() === "") {
      return res.status(400).json({ message: "La descripción es requerida" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { TipoEntidad } = adminModelInit(sequelize);

    const tipoEntidad = await TipoEntidad.findByPk(id);
    if (!tipoEntidad) {
      return res.status(404).json({ message: "Tipo de entidad no encontrado" });
    }

    await tipoEntidad.update({ descripcion: descripcion.trim() });
    return res.status(200).json(tipoEntidad);
  } catch (error) {
    console.error("Error al actualizar tipo de entidad:", error);
    return res.status(500).json({ message: "Error al actualizar tipo de entidad", error: error.message });
  }
};

// Eliminar tipo entidad (soft delete)
const deleteTipoEntidad = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "El id es requerido" });

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { TipoEntidad } = adminModelInit(sequelize);

    const tipoEntidad = await TipoEntidad.findByPk(id);
    if (!tipoEntidad) {
      return res.status(404).json({ message: "Tipo de entidad no encontrado" });
    }

    await tipoEntidad.update({ eliminado: true });
    return res.status(200).json({ message: "Tipo de entidad eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar tipo de entidad:", error);
    return res.status(500).json({ message: "Error al eliminar tipo de entidad", error: error.message });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// Obtener entidades
const getEntidad = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);

    // Obtener parámetros de paginación y filtrado
    const { page = "1", limit = "100", searchText = "", idTipoEntidad = "" } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    // Obtener filtros de atributos de la query
    const atributosFilters = {};
    for (let i = 1; i <= 10; i++) {
      const atributoValue = req.query[`atributoEntidad${i}`];
      if (atributoValue && atributoValue !== "null" && atributoValue !== "") {
        atributosFilters[`entidadDatoAtributo${i}`] = parseInt(atributoValue, 10);
      }
    }

    // Construir cláusula WHERE para filtrado
    const whereConditions = [
      {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    ];
    
    // Agregar filtro por tipo de entidad si se proporciona
    if (idTipoEntidad && idTipoEntidad !== "" && idTipoEntidad !== "null") {
      whereConditions.push({ idTipoEntidad: parseInt(idTipoEntidad, 10) });
    }
    
    if (searchText && searchText.trim() !== "") {
      whereConditions.push({
        [Op.or]: [
          { descripcion: { [Op.iLike]: `%${searchText}%` } },
          { apellido: { [Op.iLike]: `%${searchText}%` } },
          { dniCuitCuil: { [Op.iLike]: `%${searchText}%` } },
          { email: { [Op.iLike]: `%${searchText}%` } },
        ]
      });
    }

    // Agregar filtros de atributos
    Object.entries(atributosFilters).forEach(([campo, valor]) => {
      whereConditions.push({ [campo]: valor });
    });

    const whereClause = {
      [Op.and]: whereConditions
    };

    // Configurar includes para atributos
    const includeOptions = [];
    for (let i = 1; i <= 10; i++) {
      includeOptions.push({
        model: EntidadAtributoClasificacion,
        as: `opcionAtributo${i}`,
        attributes: ["id", "descripcion"],
        required: false
      });
    }

    // Contar total de registros
    const total = await Entidad.count({ where: whereClause });

    // Obtener entidades con paginación e includes
    const entidades = await Entidad.findAll({
      where: whereClause,
      include: includeOptions,
      limit: limitNumber,
      offset: offset,
      order: [["id", "DESC"]],
    });

    const totalPages = Math.ceil(total / limitNumber);

    res.status(200).json({
      data: entidades,
      currentPage: pageNumber,
      totalPages: totalPages,
      total: total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener entidad", error });
  }
};

// Obtener entidades
const getEntidadByTipoEntidad = async (req, res) => {
  const { idTipoEnt } = req.params;
// console.log("", idTipoEnt);
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad } = adminModelInit(sequelize);

    const entidadFilter = await Entidad.findAll({
      where: {
        idTipoEntidad: idTipoEnt, // Condición adicional
      },
    });
    if (!entidadFilter) {
// console.log("Entidad no encontrada.");
      return res.status(404).json({ message: "Entidad no encontrada" });
    }
    res.status(200).json(entidadFilter);
  } catch (error) {
    console.error("Error en la consulta de Entidad:", error);
    res.status(500).json({ message: "Error al obtener Entidad", error });
  }
};

// Obtener entidades
const getEntidadByDNI = async (req, res) => {
  const { dniEntidad } = req.params;
// console.log("DNI entidad recibido:", dniEntidad);
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad } = adminModelInit(sequelize);

    const entidadFilter = await Entidad.findOne({
      where: {
        dniCuitCuil: dniEntidad,
        idTipoEntidad: 1, // Condición adicional
      },
    });
    if (!entidadFilter) {
// console.log("Entidad no encontrada.");
      return res.status(404).json({ message: "Entidad no encontrada" });
    }
    res.status(200).json(entidadFilter);
  } catch (error) {
    console.error("Error en la consulta de Entidad:", error);
    res.status(500).json({ message: "Error al obtener Entidad", error });
  }
};

// Obtener entidades
const getEntidadByID = async (req, res) => {
  const { idEntidad } = req.params;
  // console.log("ID entidad recibido:", idEntidad);
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const entidadFilter = await Entidad.findOne({
      where: { id: idEntidad },
      include: [
        { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"] },
        { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"] },
      ]
    });
    if (!entidadFilter) {
// console.log("Entidad no encontrada.");
      return res.status(404).json({ message: "Entidad no encontrada" });
    }
    res.status(200).json(entidadFilter);
  } catch (error) {
    console.error("Error en la consulta de Entidad:", error);
    res.status(500).json({ message: "Error al obtener Entidad", error });
  }
};

// Crear Entidad
const postEntidad = async (req, res) => {
  try {
    // conexion
    // console.log("llegamos al back")
    // console.log(req.body)
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad } = adminModelInit(sequelize);
    const { CondicionIvaEntidad } = transaccionModelInit(sequelize);

    // Extraer idCondicionIva del body antes de crear la entidad
    const { idCondicionIva, ...entidadData } = req.body;

    // VALIDACIÓN: Verificar si ya existe una entidad con el mismo dniCuitCuil
    if (entidadData.dniCuitCuil && entidadData.dniCuitCuil.trim() !== "") {
      const entidadExistente = await Entidad.findOne({
        where: {
          dniCuitCuil: entidadData.dniCuitCuil,
          eliminado: false
        }
      });

      if (entidadExistente) {
        return res.status(409).json({ 
          message: `Ya existe una entidad con el DNI/CUIT/CUIL: ${entidadData.dniCuitCuil}. Por favor, búsquela en el sistema o use otro documento.`,
          entidadExistente: {
            id: entidadExistente.id,
            descripcion: entidadExistente.descripcion,
            apellido: entidadExistente.apellido,
            dniCuitCuil: entidadExistente.dniCuitCuil
          }
        });
      }
    }

    const entidad = new Entidad(entidadData);
    await entidad.save();

    // Si se seleccionó una condición IVA, crear la relación
    if (idCondicionIva) {
      await CondicionIvaEntidad.create({
        idCondicionIva: idCondicionIva,
        idEntidad: entidad.id,
        eliminado: false
      });
    }

    res.status(200).json(entidad);
  } catch (error) {
    console.error("Error al crear entidad:", error);
    res.status(500).json({ message: "Error al crear entidad", error });
  }
};

// Eliminar Entidad
const putEntidad = async (req, res) => {
  const { ids } = req.body;

  // conexion
  let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  const { Entidad } = adminModelInit(sequelize);

  try {
    // Actualiza la columna 'eliminado' de todas las entidades seleccionadas
    await Entidad.update({ eliminado: true }, { where: { id: ids } });
    res.status(200).json({ message: "Entidades eliminadas con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar entidades", error });
  }
};

// Devolver Entidad
const putEntidadDevolver = async (req, res) => {
  const { ids } = req.body;

  // conexion
  let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  const { Entidad } = adminModelInit(sequelize);

  try {
    // Actualiza la columna 'eliminado' de todas las entidades seleccionadas
    await Entidad.update({ eliminado: false }, { where: { id: ids } });
    res.status(200).json({ message: "Entidades eliminadas con éxito" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar entidades", error });
  }
};

const updateEntidad = async (req, res) => {
  const {
    idEntidad,
    descripcion,
    apellido,
    telefono,
    email,
    dniCuitCuil,
    direccion,
    localidad,
    provincia,
    idTipoEntidad,
    idCondicionIva,
  } = req.body;

  try {
    // Bloquear actualización de entidades genéricas (1 y 2)
    if (idEntidad === 1 || idEntidad === 2) {
      return res.status(400).json({ message: "No se puede actualizar entidades genéricas" });
    }

    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad } = adminModelInit(sequelize);
    const { CondicionIvaEntidad } = transaccionModelInit(sequelize);

    // Busca la entidad por ID y la actualiza
    const entidad = await Entidad.findByPk(idEntidad);

    if (!entidad) {
      return res.status(404).json({ message: "Entidad no encontrada" });
    }

    // VALIDACIÓN: Verificar si ya existe otra entidad con el mismo dniCuitCuil
    if (dniCuitCuil && dniCuitCuil.trim() !== "") {
      const entidadExistente = await Entidad.findOne({
        where: {
          dniCuitCuil: dniCuitCuil,
          eliminado: false,
          id: { [Op.ne]: idEntidad } // Excluir la entidad actual de la búsqueda
        }
      });

      if (entidadExistente) {
        return res.status(409).json({ 
          message: `Ya existe otra entidad con el DNI/CUIT/CUIL: ${dniCuitCuil}. Por favor, verifique los datos.`,
          entidadExistente: {
            id: entidadExistente.id,
            descripcion: entidadExistente.descripcion,
            apellido: entidadExistente.apellido,
            dniCuitCuil: entidadExistente.dniCuitCuil
          }
        });
      }
    }

    // Extraer atributos dinámicos del body (entidadDatoAtributo1 a entidadDatoAtributo10)
    const atributosDinamicos = {};
    for (let i = 1; i <= 10; i++) {
      const key = `entidadDatoAtributo${i}`;
      if (req.body[key] !== undefined) {
        atributosDinamicos[key] = req.body[key];
      }
    }

    // Actualiza los campos de la entidad
    await entidad.update({
      descripcion,
      apellido,
      telefono,
      email,
      dniCuitCuil,
      direccion,
      localidad,
      provincia,
      idTipoEntidad,
      ...atributosDinamicos,
    });

    // Manejar la relación CondicionIvaEntidad
    // Buscar si ya existe una relación (eliminada o no)
    const existingCondicionIvaEntidad = await CondicionIvaEntidad.findOne({
      where: { idEntidad: idEntidad }
    });

    if (idCondicionIva) {
      // Si se seleccionó una condición IVA
      if (existingCondicionIvaEntidad) {
        // Si ya existe un registro, verificar si necesita cambiar
        if (existingCondicionIvaEntidad.idCondicionIva !== idCondicionIva) {
          // Eliminar el registro anterior
          await existingCondicionIvaEntidad.destroy();
          // Crear nuevo registro con la nueva condición IVA
          await CondicionIvaEntidad.create({
            idCondicionIva: idCondicionIva,
            idEntidad: idEntidad,
            eliminado: false
          });
        } else {
          await existingCondicionIvaEntidad.update({ eliminado: false });
        }
      } else {
        // Si no existe ningún registro, crear nueva relación
        await CondicionIvaEntidad.create({
          idCondicionIva: idCondicionIva,
          idEntidad: idEntidad,
          eliminado: false
        });
      }
    } else {
      // Si no se seleccionó condición IVA, marcar como eliminado si existe
      if (existingCondicionIvaEntidad) {
        await existingCondicionIvaEntidad.update({ eliminado: true });
      }
    }

    res.status(200).json({ message: "Entidad actualizada con éxito", entidad });
  } catch (error) {
    console.error("Error al actualizar entidad:", error);
    res.status(500).json({ message: "Error al actualizar entidad", error });
  }
};

// Update only email for an Entidad
const updateEntidadEmail = async (req, res) => {
  try {
    const { idEntidad, email } = req.body;

    if (!idEntidad || typeof idEntidad !== 'number') {
      return res.status(400).json({ message: 'idEntidad inválido' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Block updates for generic entities (1 and 2)
    if (idEntidad === 1 || idEntidad === 2) {
      return res.status(400).json({ message: 'No se puede actualizar el email de entidades genéricas' });
    }

    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad } = adminModelInit(sequelize);

    const entidad = await Entidad.findByPk(idEntidad);
    if (!entidad) {
      return res.status(404).json({ message: 'Entidad no encontrada' });
    }

    await entidad.update({ email });
    return res.status(200).json({ message: 'Email actualizado con éxito', entidadId: idEntidad, email });
  } catch (error) {
    console.error('Error al actualizar email de entidad:', error);
    return res.status(500).json({ message: 'Error al actualizar email de entidad', error: error.toString() });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// ENTIDAD ATRIBUTO *******************************************************************************************************************************

// Obtener todos los atributos de entidad
const getEntidadAtributo = async (req, res) => {
  try {
    const { idTipoEntidad } = req.query;
    
    if (!idTipoEntidad) {
      return res.status(400).json({ 
        message: 'idTipoEntidad es requerido' 
      });
    }
    
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributo, TipoEntidad } = adminModelInit(sequelize);

    const entidadAtributo = await EntidadAtributo.findAll({
      where: { idTipoEntidad },
      include: [{ 
        model: TipoEntidad, 
        as: 'tipoEntidad',
        attributes: ['id', 'descripcion']
      }],
      order: [['idEntidadAtributo', 'ASC']]
    });
    
    res.status(200).json(entidadAtributo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener atributos de entidad', error });
  }
};

// Actualizar atributos de entidad (con auto-creación)
const updateEntidadAtributo = async (req, res) => {
  try {
    const { atributos, idTipoEntidad } = req.body;
    
    if (!idTipoEntidad) {
      return res.status(400).json({ 
        message: 'idTipoEntidad es requerido' 
      });
    }
    
    if (!Array.isArray(atributos)) {
      return res.status(400).json({ 
        message: 'atributos debe ser un array' 
      });
    }
    
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributo } = adminModelInit(sequelize);

    const t = await sequelize.transaction();
    
    try {
      // Procesar cada atributo (del 1 al 10)
      for (let i = 1; i <= 10; i++) {
        const atributoData = atributos.find(a => a.idEntidadAtributo === i);
        
        // Buscar si existe
        const existente = await EntidadAtributo.findOne({
          where: { 
            idEntidadAtributo: i,
            idTipoEntidad: idTipoEntidad
          },
          transaction: t
        });
        
        // Si hay datos del atributo, procesar
        if (atributoData) {
          // Si descripción está vacía o es solo espacios, usar 'Título' por defecto
          const descripcionFinal = (atributoData.descripcion || '').trim() || 'Título';
          const eliminadoFinal = atributoData.eliminado !== undefined ? atributoData.eliminado : (i > 3);
          
          if (existente) {
            // Actualizar
            await existente.update({
              descripcion: descripcionFinal,
              eliminado: eliminadoFinal
            }, { transaction: t });
          } else {
            // Crear
            await EntidadAtributo.create({
              idEntidadAtributo: i,
              idTipoEntidad: idTipoEntidad,
              descripcion: descripcionFinal,
              eliminado: eliminadoFinal
            }, { transaction: t });
          }
        } else if (!existente) {
          // Si no hay datos y no existe, crear con valores por defecto
          await EntidadAtributo.create({
            idEntidadAtributo: i,
            idTipoEntidad: idTipoEntidad,
            descripcion: 'Título',
            eliminado: i > 3  // Primeros 3 activos, resto inactivos
          }, { transaction: t });
        }
      }
      
      await t.commit();
      res.status(200).json({ 
        message: 'Atributos actualizados exitosamente' 
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar atributos:', error);
    res.status(500).json({ message: 'Error', error });
  }
};

// Obtener los atributos no eliminados de EntidadAtributo
const getEntidadAtributoNoEliminados = async (req, res) => {
  try {
    const { idTipoEntidad } = req.query;
    
    if (!idTipoEntidad) {
      return res.status(400).json({ 
        message: 'idTipoEntidad es requerido' 
      });
    }
    
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributo } = adminModelInit(sequelize);

    const atributos = await EntidadAtributo.findAll({
      where: { 
        eliminado: false,
        idTipoEntidad: idTipoEntidad
      },
      order: [['idEntidadAtributo', 'ASC']]
    });

    res.status(200).json(atributos);
  } catch (error) {
    console.error("Error al obtener atributos de entidad no eliminados:", error);
    res.status(500).json({ message: "Error al obtener atributos de entidad", error });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// ENTIDAD ATRIBUTO OPCION *******************************************************************************************************************************

// Obtener todas las opciones de atributos
const getEntidadAtributoClasificacion = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const opciones = await EntidadAtributoClasificacion.findAll({
      order: [['id', 'ASC']],
    });

    res.status(200).json(opciones);
  } catch (error) {
    console.error("Error al obtener opciones de atributos:", error);
    res.status(500).json({ message: "Error al obtener opciones de atributos", error });
  }
};

// Obtener opciones por idEntidadAtributo (no eliminadas)
const getEntidadAtributoClasificacionByIdAtributo = async (req, res) => {
  try {
    const { idAtributo, idTipoEntidad } = req.query;
    
    if (!idAtributo || !idTipoEntidad) {
      return res.status(400).json({ 
        message: 'idAtributo e idTipoEntidad son requeridos' 
      });
    }
    
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const opciones = await EntidadAtributoClasificacion.findAll({
      where: { 
        idEntidadAtributo: idAtributo,
        idTipoEntidad: idTipoEntidad,
        eliminado: false 
      },
      order: [['descripcion', 'ASC']],
    });

    res.status(200).json(opciones);
  } catch (error) {
    console.error("Error al obtener opciones por atributo:", error);
    res.status(500).json({ message: "Error al obtener opciones por atributo", error });
  }
};

// Crear una nueva opción de atributo
const postEntidadAtributoClasificacion = async (req, res) => {
  try {
    const { idEntidadAtributo, idTipoEntidad, descripcion } = req.body;

    if (!idEntidadAtributo || !idTipoEntidad || !descripcion) {
      return res.status(400).json({ message: "Todos los campos son requeridos" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const nuevaOpcion = await EntidadAtributoClasificacion.create({
      idEntidadAtributo,
      idTipoEntidad,
      descripcion,
      eliminado: false
    });

    res.status(200).json(nuevaOpcion);
  } catch (error) {
    console.error("Error al crear opción de atributo:", error);
    res.status(500).json({ message: "Error al crear opción de atributo", error });
  }
};

// Actualizar una opción de atributo
const updateEntidadAtributoClasificacion = async (req, res) => {
  try {
    const { id, descripcion, eliminado } = req.body;

    if (!id) {
      return res.status(400).json({ message: "id es requerido" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const opcion = await EntidadAtributoClasificacion.findByPk(id);

    if (!opcion) {
      return res.status(404).json({ message: "Opción no encontrada" });
    }

    await opcion.update({
      descripcion: descripcion !== undefined ? descripcion : opcion.descripcion,
      eliminado: eliminado !== undefined ? eliminado : opcion.eliminado
    });

    res.status(200).json({ message: "Opción actualizada con éxito", opcion });
  } catch (error) {
    console.error("Error al actualizar opción de atributo:", error);
    res.status(500).json({ message: "Error al actualizar opción de atributo", error });
  }
};

// Eliminar (soft delete) una opción de atributo
const deleteEntidadAtributoClasificacion = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ message: "id es requerido" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { EntidadAtributoClasificacion } = adminModelInit(sequelize);

    const opcion = await EntidadAtributoClasificacion.findByPk(id);

    if (!opcion) {
      return res.status(404).json({ message: "Opción no encontrada" });
    }

    await opcion.update({ eliminado: true });

    res.status(200).json({ message: "Opción eliminada con éxito" });
  } catch (error) {
    console.error("Error al eliminar opción de atributo:", error);
    res.status(500).json({ message: "Error al eliminar opción de atributo", error });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// Obtener entidades
const getUsuario = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario } = adminModelInit(sequelize);

    const usuario = await Usuario.findAll({
      where: {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    });
    res.status(200).json(usuario);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuario", error });
  }
};

// Crear Usuario
const postUsuario = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario } = adminModelInit(sequelize);

    // Procesar el campo rol si viene como objeto
    const userData = { ...req.body };
    if (userData.rol && typeof userData.rol === 'object' && userData.rol.id) {
      userData.rol = userData.rol.id;
    }
    
    const usuario = new Usuario(userData);
    await usuario.save();
    
    res.status(201).json(usuario);
  } catch (error) {
    res.status(500).json({ message: "Error al crear usuario", error: error.message });
  }
};

const updateUsuario = async (req, res) => {
  const {
    idUsuario,
    user,
    usuario: usuarioBody,
    nombre,
    apellido,
    telefono,
    email,
    dniCuitCuil,
    direccion,
    localidad,
    provincia,
    password,
    rol,
  } = req.body;

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario } = adminModelInit(sequelize);

    // Busca el usuario por ID
    const usuarioInstance = await Usuario.findByPk(idUsuario);

    if (!usuarioInstance) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Procesar rol si viene como objeto
    let rolValue = rol;
    if (rolValue && typeof rolValue === 'object' && rolValue.id) {
      rolValue = rolValue.id;
    }

    // Construir objeto de actualización. Password solo si viene no vacío
    const fieldsToUpdate = {
      usuario: usuarioBody || user, // aceptar ambas claves desde el front
      nombre,
      apellido,
      telefono,
      email,
      dniCuitCuil,
      direccion,
      localidad,
      provincia,
      rol: rolValue,
      idUsuario,
    };

    if (password && String(password).trim() !== "") {
      fieldsToUpdate.password = password;
    }

    await usuarioInstance.update(fieldsToUpdate);

    res.status(200).json({ message: "Usuario actualizado con éxito", usuario: usuarioInstance });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar usuario", error });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################

// Obtener entidades basadas en el término de búsqueda (mínimo 3 letras)
const getEntidadClienteTresLetras = async (req, res) => {
  const { search, tipoEntidad, verEnCaja, verEnGasto } = req.query;
  // console.log("Tipo de entidad recibido:", tipoEntidad);
  // console.log("Filtro verEnCaja recibido:", verEnCaja);
  // console.log("Filtro verEnGasto recibido:", verEnGasto);

  if (!search || search.length < 3) {
    return res.status(400).json({
      message: "El término de búsqueda debe tener al menos 3 letras.",
    });
  }

  try {
    // 1. Conexión
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad, TipoEntidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);

    // 2. Inicializar tipos y solo parsear si viene en la query
    let tipos = [];
    if (tipoEntidad) {
      tipos = Array.isArray(tipoEntidad)
        ? tipoEntidad.map(t => parseInt(t, 10))
        : tipoEntidad.split(',').map(t => parseInt(t.trim(), 10));
    }

    // 3. Construir cláusula WHERE dinámicamente
    const whereClause = {
      [Op.and]: [
        // filtro por idTipoEntidad solo si tipos no está vacío
        ...(tipos.length > 0
          ? [{ idTipoEntidad: { [Op.in]: tipos } }]
          : []),
        // siempre aplicamos la búsqueda por descripción/apellido/dni
        {
          [Op.or]: [
            { descripcion:   { [Op.iLike]: `%${search}%` } },
            { apellido:      { [Op.iLike]: `%${search}%` } },
            { dniCuitCuil:   { [Op.iLike]: `%${search}%` } },
          ],
        },
      ],
    };

    // 4. Configurar includes opcionales
    const includeOptions = [];
    
    // Agregar opciones de atributos
    for (let i = 1; i <= 10; i++) {
      includeOptions.push({
        model: EntidadAtributoClasificacion,
        as: `opcionAtributo${i}`,
        attributes: ["id", "descripcion"],
        required: false
      });
    }
    
    // Agregar filtro de TipoEntidad si se especifica verEnCaja o verEnGasto
    if (verEnCaja === 'true' || verEnGasto === 'true') {
      const whereCondition = {};
      
      if (verEnCaja === 'true') {
        whereCondition.verEnCaja = true;
      }
      
      if (verEnGasto === 'true') {
        whereCondition.verEnGasto = true;
      }
      
      includeOptions.push({
        model: TipoEntidad,
        as: "tipoEntidad",
        required: true, // INNER JOIN para asegurar que existe el tipo
        where: whereCondition,
        attributes: [] // No necesitamos traer los datos del tipo, solo filtrar
      });
    }

    // 5. Buscar entidades
    const entidades = await Entidad.findAll({ 
      where: whereClause,
      ...(includeOptions.length > 0 && { include: includeOptions })
    });
    return res.status(200).json(entidades);

  } catch (error) {
    console.error("Error al buscar entidades:", error);
    return res.status(500).json({ message: "Error al obtener entidades", error });
  }
};

const getEntidadFilterTipoEntidad = async (req, res) => {
  const { idTipoEntidad } = req.params;
  
  // Obtener parámetros de paginación y filtrado
  const { page = "1", limit = "100", searchText = "" } = req.query;
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const offset = (pageNumber - 1) * limitNumber;

  // Obtener filtros de atributos de la query
  const atributosFilters = {};
  for (let i = 1; i <= 10; i++) {
    const atributoValue = req.query[`atributoEntidad${i}`];
    if (atributoValue) {
      atributosFilters[`entidadDatoAtributo${i}`] = parseInt(atributoValue, 10);
    }
  }

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Entidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);

    // Construir cláusula WHERE
    const whereConditions = [
      { idTipoEntidad: idTipoEntidad },
      {
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      }
    ];

    // Agregar búsqueda de texto si existe
    if (searchText && searchText.trim() !== "") {
      whereConditions.push({
        [Op.or]: [
          { descripcion: { [Op.iLike]: `%${searchText}%` } },
          { apellido: { [Op.iLike]: `%${searchText}%` } },
          { dniCuitCuil: { [Op.iLike]: `%${searchText}%` } },
          { email: { [Op.iLike]: `%${searchText}%` } },
        ]
      });
    }

    // Agregar filtros de atributos
    Object.entries(atributosFilters).forEach(([campo, valor]) => {
      whereConditions.push({ [campo]: valor });
    });

    const whereClause = {
      [Op.and]: whereConditions
    };

    // Configurar includes para atributos
    const includeOptions = [];
    for (let i = 1; i <= 10; i++) {
      includeOptions.push({
        model: EntidadAtributoClasificacion,
        as: `opcionAtributo${i}`,
        attributes: ["id", "descripcion"],
        required: false
      });
    }

    // Contar total de registros
    const total = await Entidad.count({ 
      where: whereClause,
      include: includeOptions,
      distinct: true,
    });

    // Obtener entidades con paginación e includes
    const entidades = await Entidad.findAll({
      where: whereClause,
      include: includeOptions,
      limit: limitNumber,
      offset: offset,
      order: [["id", "DESC"]],
    });

    const totalPages = Math.ceil(total / limitNumber);

    // Si hay parámetros de paginación, devolver formato con paginación
    if (req.query.page || req.query.limit) {
      res.status(200).json({
        data: entidades,
        currentPage: pageNumber,
        totalPages: totalPages,
        total: total,
      });
    } else {
      // Retrocompatibilidad: devolver solo el array
      res.status(200).json(entidades);
    }
  } catch (error) {
    console.error("Error al buscar entidades:", error);
    res.status(500).json({ message: "Error al obtener entidades", error });
  }
};

const updateIncluirImpuestos = async (req, res) => {
  try {
    // Extraemos 'dato' desde el body (puede adaptarse a req.params si se desea)
    const dato = req.params.dato;

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ParametrosGlobales } = adminModelInit(sequelize);

    // Interpretamos el dato:
    // Si dato es 2 => true, de lo contrario (dato 1) => false.
    const incluirImpuestosFlag = Number(dato) === 2 ? "1" : "0";

    // Actualizamos el registro con id 1
    await ParametrosGlobales.update(
      { valorParametro: incluirImpuestosFlag },
      { where: { nombreParametro: "defaultN" } }
    );

    return res.json({
      message: "Bandera actualizada correctamente",
      incluirImpuestos: incluirImpuestosFlag,
    });
  } catch (error) {
    console.error("Error al actualizar la bandera:", error);
    return res.status(500).json({
      message: "Hubo un error al actualizar la bandera",
      error: error.message,
    });
  }
};

const logoURLbase64 = async (req, res) => {
  let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  const { ParametrosGlobales } = adminModelInit(sequelize);
  try {
    const logo = await ParametrosGlobales.findOne({
      where: { nombreParametro: "logoTenant" },
    });

    if (!logo) {
      return res.status(404).json({ message: "Logo no encontrado" });
    }

    // Retorna el logo en formato base64
    return res.status(200).json({ logoURL: logo });
  }
  catch (error) {
    console.error("Error al obtener el logo:", error);
    return res.status(500).json({
      message: "Hubo un error al obtener el logo",
      error: error.message,
    });
  }

};

const getRolUsuario = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolUsuario } = adminModelInit(sequelize);

    const roles = await RolUsuario.findAll({
      where: { eliminado: false }, // Filtra los menús que no están eliminados
    });
    res.status(200).json(roles);
  }
  catch (error) {
    console.error("Error al obtener los roles de usuario:", error);
    res.status(500).json({ message: "Error al obtener los roles de usuario", error });
  }
}

const postRolUsuario = async (req, res) => {
  try {
    const { descripcion } = req.body;
    if (!descripcion || String(descripcion).trim() === "") {
      return res.status(400).json({ message: "La descripción del rol es requerida" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolUsuario } = adminModelInit(sequelize);

    // Crear rol
    const nuevoRol = await RolUsuario.create({ descripcion: descripcion.trim(), eliminado: false });
    return res.status(201).json(nuevoRol);
  } catch (error) {
    console.error("Error al crear rol de usuario:", error);
    return res.status(500).json({ message: "Error al crear rol de usuario", error: error.message });
  }
}

const updateRolUsuario = async (req, res) => {
  try {
    const { id, descripcion } = req.body;
    if (!id) {
      return res.status(400).json({ message: "El id del rol es requerido" });
    }
    if (!descripcion || String(descripcion).trim() === "") {
      return res.status(400).json({ message: "La descripción es requerida" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolUsuario } = adminModelInit(sequelize);

    const rol = await RolUsuario.findByPk(id);
    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }

    await rol.update({ descripcion: descripcion.trim() });
    return res.status(200).json(rol);
  } catch (error) {
    console.error("Error al actualizar rol de usuario:", error);
    return res.status(500).json({ message: "Error al actualizar rol de usuario", error: error.message });
  }
}

const getUsuariosByRol = async (req, res) => {
  try {
    const { idRol } = req.params;
    if (!idRol) return res.status(400).json({ message: "idRol es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario } = adminModelInit(sequelize);
    const usuarios = await Usuario.findAll({ where: { rol: idRol, eliminado: false } });
    return res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al obtener usuarios por rol:", error);
    return res.status(500).json({ message: "Error al obtener usuarios por rol", error: error.message });
  }
}

const deleteRolYUsuarios = async (req, res) => {
  const transactionName = 'deleteRolYUsuarios';
  try {
    const { idRol } = req.body;
    if (!idRol) return res.status(400).json({ message: "idRol es requerido" });
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario, RolUsuario, RolAcceso } = adminModelInit(sequelize);

    const t = await sequelize.transaction({ name: transactionName });
    try {
      await Usuario.update({ eliminado: true }, { where: { rol: idRol }, transaction: t });
      await RolUsuario.update({ eliminado: true }, { where: { id: idRol }, transaction: t });
      // Marcar accesos del rol como eliminados también
      await RolAcceso.update({ eliminado: true }, { where: { idRolUsuario: idRol }, transaction: t });
      await t.commit();
      return res.status(200).json({ message: "Rol y usuarios asociados eliminados (soft-delete)" });
    } catch (inner) {
      await t.rollback();
      throw inner;
    }
  } catch (error) {
    console.error("Error al eliminar rol y usuarios:", error);
    return res.status(500).json({ message: "Error al eliminar rol y usuarios", error: error.message });
  }
}

const getMenuAcceso = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuAcceso } = adminModelInit(sequelize);

    const menuAcceso = await MenuAcceso.findAll({
      where: { eliminado: false }, // Filtra los menús que no están eliminados
      order: [['id', 'ASC']] // Ordena por id ascendente (orden visual lo aplica el cliente con menuAccesoOrden.js)
    });
    res.status(200).json(menuAcceso);

  } catch (error) {
    console.error("Error al obtener el menú de acceso:", error);
    return res.status(500).json({ 
      message: "Error al obtener el menú de acceso",
      error: {
        message: error.message,
        name: error.name
      }
    });
  }
}

const rolAcceso = async (req, res) => {
  const { idRol } = req.params; // Captura el parámetro 'idRol' de la URL
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolAcceso, MenuAcceso } = adminModelInit(sequelize);

    const rolAcceso = await RolAcceso.findAll(
      {
        where: { idRolUsuario: idRol, eliminado: false }, // Filtra por el ID del rol
        include: [
          {
            model: MenuAcceso, // Asegúrate de que MenuAcceso esté correctamente definido en tus modelos
            as: 'menuAcceso', // Este alias debe coincidir con el definido en tu modelo RolAcceso
            attributes: ['id', 'descripcion'], // Selecciona los campos que necesitas
          },
        ],
        order: [[{ model: MenuAcceso, as: 'menuAcceso' }, 'id', 'ASC']] // Ordena por el id del menuAcceso incluido (orden visual lo aplica el cliente con menuAccesoOrden.js)
      }
    );
    res.status(200).json(rolAcceso);

  } catch (error) {
    console.error("Error al obtener el menú de acceso:", error);
    return res.status(500).json({ 
      message: "Error al obtener el menú de acceso",
      error: {
        message: error.message,
        name: error.name
      }
    });
  }
}

const actualizarRolAccesos = async (req, res) => {
  const { idRolUsuario, accesos } = req.body; // accesos = [{ idMenuAcceso: 'VENTAS1', activo: true }, ...]

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolAcceso } = adminModelInit(sequelize);

    for (const acceso of accesos) {
      const existente = await RolAcceso.findOne({
        where: {
          idRolUsuario,
          idMenuAcceso: acceso.id,
        },
      });

      if (existente) {
        await existente.update({ eliminado: !acceso.activo });
      } else if (acceso.activo) {
        await RolAcceso.create({
          idRolUsuario,
          idMenuAcceso: acceso.id,
          eliminado: false,
        });
      }
    }

    res.json({ success: true});
  } catch (error) {
    console.error("Error al actualizar accesos:", error);
    res.status(500).json({ message: "Error al actualizar accesos." });
  }
};



// MenuFuncionalidadAcceso controllers
const getComponenteSector = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuFuncionalidadAcceso } = adminModelInit(sequelize);
    const { Op } = require('sequelize');
    const componentes = await MenuFuncionalidadAcceso.findAll({
      where: { 
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      },
      order: [['idMenuAcceso', 'ASC'], ['id', 'ASC']],
    });
    res.status(200).json(componentes);
  } catch (error) {
    console.error("Error al obtener componentes sector:", error);
    res.status(500).json({ message: "Error al obtener componentes sector", error: error.message });
  }
};

const getComponenteSectorByMenuAcceso = async (req, res) => {
  try {
    const { idMenuAcceso } = req.params;
    if (!idMenuAcceso) return res.status(400).json({ message: "idMenuAcceso es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuFuncionalidadAcceso } = adminModelInit(sequelize);
    const componentes = await MenuFuncionalidadAcceso.findAll({
      where: { idMenuAcceso, eliminado: false },
      order: [['id', 'ASC']],
    });
    res.status(200).json(componentes);
  } catch (error) {
    console.error("Error al obtener componentes sector por menú:", error);
    res.status(500).json({ message: "Error al obtener componentes sector por menú", error: error.message });
  }
};

const postComponenteSector = async (req, res) => {
  try {
    const { id, idMenuAcceso, descripcion, tipo, meta } = req.body;
    if (!id || !idMenuAcceso || !descripcion || !tipo) {
      return res.status(400).json({ message: "id, idMenuAcceso, descripcion y tipo son requeridos" });
    }
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuFuncionalidadAcceso } = adminModelInit(sequelize);
    const componente = await MenuFuncionalidadAcceso.create({
      id: id.trim(),
      idMenuAcceso: idMenuAcceso.trim(),
      descripcion: descripcion.trim(),
      tipo: tipo.trim(),
      meta: meta || {},
      eliminado: false,
    });
    res.status(201).json(componente);
  } catch (error) {
    console.error("Error al crear componente sector:", error);
    res.status(500).json({ message: "Error al crear componente sector", error: error.message });
  }
};

const updateComponenteSector = async (req, res) => {
  try {
    const { id, descripcion, tipo, meta } = req.body;
    if (!id) return res.status(400).json({ message: "id es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuFuncionalidadAcceso } = adminModelInit(sequelize);
    const componente = await MenuFuncionalidadAcceso.findByPk(id);
    if (!componente) return res.status(404).json({ message: "Componente sector no encontrado" });
    const updateData = {};
    if (descripcion !== undefined) updateData.descripcion = descripcion.trim();
    if (tipo !== undefined) updateData.tipo = tipo.trim();
    if (meta !== undefined) updateData.meta = meta;
    await componente.update(updateData);
    res.status(200).json(componente);
  } catch (error) {
    console.error("Error al actualizar componente sector:", error);
    res.status(500).json({ message: "Error al actualizar componente sector", error: error.message });
  }
};

const deleteComponenteSector = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: "id es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { MenuFuncionalidadAcceso } = adminModelInit(sequelize);
    const componente = await MenuFuncionalidadAcceso.findByPk(id);
    if (!componente) return res.status(404).json({ message: "Componente sector no encontrado" });
    await componente.update({ eliminado: true });
    res.status(200).json({ message: "Componente sector eliminado" });
  } catch (error) {
    console.error("Error al eliminar componente sector:", error);
    res.status(500).json({ message: "Error al eliminar componente sector", error: error.message });
  }
};

// RolFuncionalidadAcceso controllers
const getRolSectorAccesoByIdRol = async (req, res) => {
  try {
    const { idRol } = req.params;
    if (!idRol) return res.status(400).json({ message: "idRol es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolFuncionalidadAcceso } = adminModelInit(sequelize);
    const accesos = await RolFuncionalidadAcceso.findAll({
      where: { idRolUsuario: idRol, eliminado: false },
      order: [['idMenuAcceso', 'ASC'], ['idSector', 'ASC']],
      attributes: ['idRolUsuario', 'idMenuAcceso', 'idSector', 'eliminado'],
    });
    res.status(200).json(accesos);
  } catch (error) {
    console.error("Error al obtener accesos de sector del rol:", error);
    res.status(500).json({ message: "Error al obtener accesos de sector del rol", error: error.message });
  }
};

const actualizarRolSectorAccesos = async (req, res) => {
  const { idRolUsuario, accesos } = req.body; // accesos = [{ idSector: 'btnCancelar', idMenuAcceso: 'VENTAS', activo: true }, ...]

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { RolFuncionalidadAcceso } = adminModelInit(sequelize);

    for (const acceso of accesos) {
      const existente = await RolFuncionalidadAcceso.findOne({
        where: {
          idRolUsuario,
          idMenuAcceso: acceso.idMenuAcceso,
          idSector: acceso.idSector,
        },
      });

      if (existente) {
        await existente.update({ eliminado: !acceso.activo });
      } else if (acceso.activo) {
        await RolFuncionalidadAcceso.create({
          idRolUsuario,
          idMenuAcceso: acceso.idMenuAcceso,
          idSector: acceso.idSector,
          eliminado: false,
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar accesos de sector:", error);
    res.status(500).json({ message: "Error al actualizar accesos de sector." });
  }
};


const getIncluirImpuestos = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ParametrosGlobales } = adminModelInit(sequelize);

    const incluirImpuestos = await ParametrosGlobales.findOne({
      where: { nombreParametro: "defaultN" },
    });

    if (!incluirImpuestos) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }

    return res.status(200).json(incluirImpuestos);
  } catch (error) {
    console.error("Error al obtener la bandera:", error);
    return res.status(500).json({
      message: "Hubo un error al obtener la bandera",
      error: error.message,
    });
  }
};


const getParametrosGlobales = async (req, res) => {
  const { parametros } = req.body; // array de strings o undefined

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ParametrosGlobales } = adminModelInit(sequelize);
    const { Op } = require("sequelize");

    const usarFiltro = Array.isArray(parametros) && parametros.length > 0;

    const rows = await ParametrosGlobales.findAll({
      ...(usarFiltro && { where: { nombreParametro: { [Op.in]: parametros } } }),
      // Si querés solo estas columnas, descomenta:
      // attributes: ["nombreParametro", "valorParametro"],
    });

    // Mapeo a { [nombreParametro]: valorParametro }
    const resultado = {};
    for (const r of rows) {
      resultado[r.nombreParametro] = r.valorParametro;
    }

    // (Opcional) Si pediste algunos específicos y alguno no existe,
    // podés incluirlos como null para que el front lo sepa:
    if (usarFiltro) {
      for (const key of parametros) {
        if (!(key in resultado)) resultado[key] = null;
      }
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al obtener los parámetros globales:", error);
    // Serializar error de forma segura para evitar referencias circulares
    const errorResponse = {
      message: "Error al obtener los parámetros globales",
      error: {
        message: error.message,
        name: error.name,
        sql: error.sql || undefined
      }
    };
    return res.status(500).json(errorResponse);
  }
};

const getParametrosGlobalesMenu = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ParametrosGlobales } = adminModelInit(sequelize);

    const rows = await ParametrosGlobales.findAll({
      where: { 
        verEnMenu: true,
        eliminado: false 
      },
      attributes: ["nombreParametro", "valorParametro", "descripcion", "verEnMenu"],
      order: [["nombreParametro", "ASC"]]
    });

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los parámetros globales del menú:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener los parámetros globales del menú", error });
  }
};

const updateParametroGlobal = async (req, res) => {
  const { nombreParametro, valorParametro } = req.body;

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ParametrosGlobales } = adminModelInit(sequelize);

    // Buscar el parámetro
    const parametro = await ParametrosGlobales.findOne({
      where: { nombreParametro, eliminado: false }
    });

    if (!parametro) {
      return res.status(404).json({ 
        message: `Parámetro ${nombreParametro} no encontrado` 
      });
    }

    // Actualizar el valor
    await ParametrosGlobales.update(
      { valorParametro, updatedAt: new Date() },
      { where: { nombreParametro, eliminado: false } }
    );

    return res.status(200).json({ 
      message: "Parámetro actualizado exitosamente",
      nombreParametro,
      valorParametro
    });
  } catch (error) {
    console.error("Error al actualizar el parámetro global:", error);
    return res
      .status(500)
      .json({ message: "Error al actualizar el parámetro global", error: error.message });
  }
};

const getCanalEntidad = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { CanalEntidad } = adminModelInit(sequelize);

    const canalEntidad = await CanalEntidad.findAll();
    res.status(200).json(canalEntidad);
  }
  catch (error) {
    console.error("Error al obtener el canal de entidad:", error);
  }
}

// Eliminar lógicamente un usuario (eliminado = true)
const deleteUsuarioSoft = async (req, res) => {
  try {
    const { idUsuario } = req.body;
    if (!idUsuario) return res.status(400).json({ message: "idUsuario es requerido" });
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Usuario } = adminModelInit(sequelize);
    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
    await usuario.update({ eliminado: true });
    return res.status(200).json({ message: "Usuario eliminado" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return res.status(500).json({ message: "Error al eliminar usuario", error: error.message });
  }
}

// Obtener condicionIva
const getCondicionIva = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { CondicionIva } = transaccionModelInit(sequelize);
    const { Op } = require("sequelize");

    const condicionIva = await CondicionIva.findAll({
      where: { 
        [Op.or]: [
          { eliminado: false },
          { eliminado: null }
        ]
      },
      order: [["descripcion", "ASC"]]
    });
    res.status(200).json(condicionIva);
  } catch (error) {
    console.error("Error al obtener condicionIva:", error);
    res.status(500).json({ message: "Error al obtener condicionIva", error });
  }
};

// Obtener condicionIva por entidad
const getCondicionIvaByEntidad = async (req, res) => {
  const { idEntidad } = req.params;
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { CondicionIvaEntidad, CondicionIva } = transaccionModelInit(sequelize);

    const condicionIvaEntidad = await CondicionIvaEntidad.findOne({
      where: { 
        idEntidad: idEntidad, 
        eliminado: false 
      },
      include: [{
        model: CondicionIva,
        as: 'condicionIva',
        attributes: ['id', 'descripcion']
      }]
    });

    if (condicionIvaEntidad) {
      res.status(200).json({
        idCondicionIva: condicionIvaEntidad.idCondicionIva,
        condicionIva: condicionIvaEntidad.condicionIva
      });
    } else {
      res.status(200).json(null);
    }
  } catch (error) {
    console.error("Error al obtener condicionIva por entidad:", error);
    res.status(500).json({ message: "Error al obtener condicionIva por entidad", error });
  }
};

// Asegúrate de configurar las variables de entorno: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM_NUMBER
const enviarFacturaWhatsApp = async (req, res) => {
  try {
    const { phoneNumber, message } = req.body; // Por ejemplo, { phoneNumber: "+123456789", message: "hola Lutente!" }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const payload = new URLSearchParams();
    payload.append("To", `whatsapp:${phoneNumber}`);
    payload.append("From", `whatsapp:${process.env.TWILIO_FROM_NUMBER}`); // Número asignado en Twilio
    payload.append("Body", message);

    const response = await axios.post(whatsappApiUrl, payload.toString(), {
      auth: {
        username: accountSid,
        password: authToken,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error enviando factura por WhatsApp:", error);
    rese
      .status(500)
      .json({ message: "Error enviando factura por WhatsApp", error });
  }
};

// Obtener estadísticas de agentes y tickeadoras conectadas
const getTickeadoraStats = async (req, res) => {
  try {
    // Obtener wsServer desde app.locals (evita dependencias circulares)
    const wsServer = req.app.locals.wsServer;
    
    if (!wsServer) {
      return res.status(503).json({ 
        message: 'WebSocket server no está disponible',
        error: 'El servidor WebSocket no ha sido inicializado'
      });
    }

    const stats = wsServer.getStats();
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de tickeadora:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas de tickeadora', 
      error: error.message 
    });
  }
};

//########################################################################################################################
//########################################################################################################################
//########################################################################################################################
// SESIONES *******************************************************************************************************************************

/**
 * Función helper para parsear información del User-Agent
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent) {
    return {
      dispositivo: "Unknown",
      navegador: "Unknown",
      sistemaOperativo: "Unknown"
    };
  }

  const ua = userAgent.toLowerCase();
  let dispositivo = "Desktop";
  let navegador = "Unknown";
  let sistemaOperativo = "Unknown";

  // Detectar dispositivo
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    dispositivo = "Mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    dispositivo = "Tablet";
  }

  // Detectar navegador
  if (ua.includes("chrome") && !ua.includes("edg")) {
    navegador = "Chrome";
  } else if (ua.includes("firefox")) {
    navegador = "Firefox";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    navegador = "Safari";
  } else if (ua.includes("edg")) {
    navegador = "Edge";
  } else if (ua.includes("opera") || ua.includes("opr")) {
    navegador = "Opera";
  }

  // Detectar sistema operativo
  if (ua.includes("windows")) {
    sistemaOperativo = "Windows";
  } else if (ua.includes("mac os") || ua.includes("macintosh")) {
    sistemaOperativo = "macOS";
  } else if (ua.includes("linux") && !ua.includes("android")) {
    sistemaOperativo = "Linux";
  } else if (ua.includes("android")) {
    sistemaOperativo = "Android";
  } else if (ua.includes("ios") || ua.includes("iphone") || ua.includes("ipad")) {
    sistemaOperativo = "iOS";
  }

  return { dispositivo, navegador, sistemaOperativo };
};

/**
 * Genera hash SHA256 del token JWT
 */
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Obtiene la IP del cliente desde el request
 */
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "Unknown"
  );
};

/**
 * Registrar nueva sesión (llamado desde loginController)
 */
const registrarSesion = async (req, res) => {
  try {
    const { token, idUsuario, fechaExpiracion } = req.body;
    
    if (!token || !idUsuario || !fechaExpiracion) {
      return res.status(400).json({ 
        message: "Token, idUsuario y fechaExpiracion son requeridos" 
      });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { SesionesUsuario } = adminModelInit(sequelize);

    const tokenHash = hashToken(token);
    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIP(req);
    const { dispositivo, navegador, sistemaOperativo } = parseUserAgent(userAgent);

    // Verificar si ya existe una sesión con el mismo token hash (no debería pasar)
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
        fechaExpiracion: new Date(fechaExpiracion),
        cerradaPor: null,
        razonCierre: null
      });
      return res.status(200).json({ 
        id: sesionExistente.id,
        fechaExpiracion: sesionExistente.fechaExpiracion
      });
    }

    // Crear nueva sesión
    const nuevaSesion = await SesionesUsuario.create({
      idUsuario,
      tokenHash,
      ipAddress,
      userAgent,
      dispositivo,
      navegador,
      sistemaOperativo,
      activa: true,
      ultimaActividad: new Date(),
      fechaCreacion: new Date(),
      fechaExpiracion: new Date(fechaExpiracion)
    });

    res.status(201).json({
      id: nuevaSesion.id,
      fechaExpiracion: nuevaSesion.fechaExpiracion
    });
  } catch (error) {
    console.error("Error al registrar sesión:", error);
    res.status(500).json({ 
      message: "Error al registrar sesión", 
      error: error.message 
    });
  }
};

/**
 * Obtener usuarios en línea con sus sesiones activas
 */
const getUsuariosEnLinea = async (req, res) => {
  try {
    const { incluirInactivos = "false", limiteActividad = 30 } = req.query;
    
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { SesionesUsuario, Usuario, RolUsuario } = adminModelInit(sequelize);

    const minutosLimite = parseInt(limiteActividad, 10);
    const fechaLimite = new Date();
    fechaLimite.setMinutes(fechaLimite.getMinutes() - minutosLimite);

    // Obtener todas las sesiones activas con información del usuario
    const whereClause = {
      activa: true,
      fechaExpiracion: { [Op.gt]: new Date() } // No expiradas
    };

    if (incluirInactivos === "false") {
      whereClause.ultimaActividad = { [Op.gte]: fechaLimite };
    }

    const sesiones = await SesionesUsuario.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: "usuario",
          include: [
            {
              model: RolUsuario,
              as: "rolUsuario",
              attributes: ["id", "descripcion"]
            }
          ],
          attributes: ["id", "usuario", "nombre", "apellido", "email", "rol"]
        }
      ],
      order: [["ultimaActividad", "DESC"]]
    });

    // Agrupar sesiones por usuario
    const usuariosMap = new Map();

    sesiones.forEach((sesion) => {
      const usuarioId = sesion.idUsuario;
      if (!usuariosMap.has(usuarioId)) {
        const usuario = sesion.usuario;
        usuariosMap.set(usuarioId, {
          idUsuario: usuario.id,
          nombre: usuario.nombre || "",
          apellido: usuario.apellido || "",
          usuario: usuario.usuario,
          email: usuario.email || "",
          rol: usuario.rolUsuario?.descripcion || "Sin rol",
          idRol: usuario.rol,
          sesionesActivas: 0,
          ultimaActividad: null,
          estado: "activo",
          sesiones: []
        });
      }

      const usuarioData = usuariosMap.get(usuarioId);
      usuarioData.sesionesActivas++;
      
      // Calcular última actividad más reciente
      const sesionFecha = new Date(sesion.ultimaActividad);
      if (!usuarioData.ultimaActividad || sesionFecha > new Date(usuarioData.ultimaActividad)) {
        usuarioData.ultimaActividad = sesion.ultimaActividad;
      }

      // Agregar sesión al array
      usuarioData.sesiones.push({
        id: sesion.id,
        ipAddress: sesion.ipAddress,
        dispositivo: sesion.dispositivo,
        navegador: sesion.navegador,
        sistemaOperativo: sesion.sistemaOperativo,
        ultimaActividad: sesion.ultimaActividad,
        fechaCreacion: sesion.fechaCreacion,
        fechaExpiracion: sesion.fechaExpiracion
      });
    });

    // Convertir map a array y determinar estado
    const usuarios = Array.from(usuariosMap.values()).map((usuario) => {
      const minutosInactivo = Math.floor(
        (new Date() - new Date(usuario.ultimaActividad)) / (1000 * 60)
      );

      if (minutosInactivo < 5) {
        usuario.estado = "activo";
      } else if (minutosInactivo < 30) {
        usuario.estado = "inactivo";
      } else {
        usuario.estado = "muy_inactivo";
      }

      return usuario;
    });

    res.status(200).json({
      usuarios,
      totalUsuarios: usuarios.length,
      totalSesiones: sesiones.length,
      ultimaActualizacion: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error al obtener usuarios en línea:", error);
    res.status(500).json({ 
      message: "Error al obtener usuarios en línea", 
      error: error.message 
    });
  }
};

/**
 * Obtener sesiones de un usuario específico
 */
const getSesionesUsuario = async (req, res) => {
  try {
    const { idUsuario } = req.params;
    const { activas = "true" } = req.query;

    if (!idUsuario) {
      return res.status(400).json({ message: "idUsuario es requerido" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { SesionesUsuario, Usuario } = adminModelInit(sequelize);

    const whereClause = { idUsuario: parseInt(idUsuario, 10) };
    
    if (activas === "true") {
      whereClause.activa = true;
      whereClause.fechaExpiracion = { [Op.gt]: new Date() };
    }

    const sesiones = await SesionesUsuario.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: "cerradaPorUsuario",
          attributes: ["id", "usuario", "nombre", "apellido"]
        }
      ],
      order: [["ultimaActividad", "DESC"]]
    });

    const sesionesFormateadas = sesiones.map((sesion) => ({
      id: sesion.id,
      ipAddress: sesion.ipAddress,
      dispositivo: sesion.dispositivo,
      navegador: sesion.navegador,
      sistemaOperativo: sesion.sistemaOperativo,
      activa: sesion.activa,
      ultimaActividad: sesion.ultimaActividad,
      fechaCreacion: sesion.fechaCreacion,
      fechaExpiracion: sesion.fechaExpiracion,
      cerradaPor: sesion.cerradaPorUsuario
        ? {
            id: sesion.cerradaPorUsuario.id,
            nombre: `${sesion.cerradaPorUsuario.nombre || ""} ${sesion.cerradaPorUsuario.apellido || ""}`.trim() || sesion.cerradaPorUsuario.usuario
          }
        : null,
      razonCierre: sesion.razonCierre
    }));

    res.status(200).json({
      sesiones: sesionesFormateadas,
      total: sesionesFormateadas.length,
      activas: sesionesFormateadas.filter((s) => s.activa).length
    });
  } catch (error) {
    console.error("Error al obtener sesiones del usuario:", error);
    res.status(500).json({ 
      message: "Error al obtener sesiones del usuario", 
      error: error.message 
    });
  }
};

/**
 * Cerrar una sesión específica
 */
const cerrarSesion = async (req, res) => {
  try {
    const { idSesion } = req.params;
    const { razon = "Cierre manual por administrador" } = req.body;
    const idAdmin = req.cookies.idUsuario ? parseInt(req.cookies.idUsuario, 10) : null;

    if (!idSesion) {
      return res.status(400).json({ message: "idSesion es requerido" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { SesionesUsuario } = adminModelInit(sequelize);

    const sesion = await SesionesUsuario.findByPk(idSesion);
    
    if (!sesion) {
      return res.status(404).json({ message: "Sesión no encontrada" });
    }

    if (!sesion.activa) {
      return res.status(400).json({ message: "La sesión ya está cerrada" });
    }

    await sesion.update({
      activa: false,
      cerradaPor: idAdmin,
      razonCierre: razon
    });

    res.status(200).json({
      success: true,
      message: "Sesión cerrada exitosamente"
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    res.status(500).json({ 
      message: "Error al cerrar sesión", 
      error: error.message 
    });
  }
};

/**
 * Cerrar todas las sesiones de un usuario
 */
const cerrarTodasSesionesUsuario = async (req, res) => {
  try {
    const { idUsuario } = req.params;
    const { razon = "Cierre manual por administrador" } = req.body;
    const idAdmin = req.cookies.idUsuario ? parseInt(req.cookies.idUsuario, 10) : null;

    if (!idUsuario) {
      return res.status(400).json({ message: "idUsuario es requerido" });
    }

    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { SesionesUsuario } = adminModelInit(sequelize);

    const sesiones = await SesionesUsuario.findAll({
      where: {
        idUsuario: parseInt(idUsuario, 10),
        activa: true,
        fechaExpiracion: { [Op.gt]: new Date() }
      }
    });

    if (sesiones.length === 0) {
      return res.status(200).json({
        success: true,
        sesionesCerradas: 0,
        message: "No hay sesiones activas para cerrar"
      });
    }

    await SesionesUsuario.update(
      {
        activa: false,
        cerradaPor: idAdmin,
        razonCierre: razon
      },
      {
        where: {
          idUsuario: parseInt(idUsuario, 10),
          activa: true
        }
      }
    );

    res.status(200).json({
      success: true,
      sesionesCerradas: sesiones.length,
      message: `Se cerraron ${sesiones.length} sesión(es) exitosamente`
    });
  } catch (error) {
    console.error("Error al cerrar todas las sesiones:", error);
    res.status(500).json({ 
      message: "Error al cerrar todas las sesiones", 
      error: error.message 
    });
  }
};

/**
 * Actualizar última actividad de una sesión (middleware)
 */
const actualizarActividadSesion = async (tokenHash) => {
  try {
    // Necesitamos el tenant del token o de alguna manera obtenerlo
    // Por ahora, retornamos sin hacer nada si no hay contexto
    // Esto se llamará desde un middleware que tenga acceso al request
    return true;
  } catch (error) {
    console.error("Error al actualizar actividad de sesión:", error);
    return false;
  }
};

module.exports = {
  postUbicacion,
  getUbicacion,
  updateUbicacion,
  deleteUbicacion,
  getNegocio,
  postNegocio,
  updateNegocio,
  deleteNegocio,
  postTipoEntidad,
  getTipoEntidad,
  updateTipoEntidad,
  deleteTipoEntidad,
  getEntidad,
  postEntidad,
  putEntidad,
  updateEntidad,
  updateEntidadEmail,
  getUsuario,
  postUsuario,
  getEntidadClienteTresLetras,
  getEntidadByID,
  getEntidadFilterTipoEntidad,
  getEntidadByDNI,
  getEntidadByTipoEntidad,
  updateUsuario,
  putEntidadDevolver,
  enviarFacturaWhatsApp,
  updateIncluirImpuestos,
  getIncluirImpuestos,
  logoURLbase64,
  getRolUsuario,
  postRolUsuario,
  updateRolUsuario,
  getUsuariosByRol,
  deleteRolYUsuarios,
  getMenuAcceso,
  rolAcceso,
  actualizarRolAccesos,
  getComponenteSector,
  getComponenteSectorByMenuAcceso,
  postComponenteSector,
  updateComponenteSector,
  deleteComponenteSector,
  getRolSectorAccesoByIdRol,
  actualizarRolSectorAccesos,
  deleteUsuarioSoft,
  getParametrosGlobales,
  getParametrosGlobalesMenu,
  updateParametroGlobal,
  getCanalEntidad,
  getCondicionIva,
  getCondicionIvaByEntidad,
  getTickeadoraStats,
  // Sesiones
  registrarSesion,
  getUsuariosEnLinea,
  getSesionesUsuario,
  cerrarSesion,
  cerrarTodasSesionesUsuario,
  actualizarActividadSesion,
  // Helpers para sesiones (exportados para uso en otros controladores)
  hashToken,
  parseUserAgent,
  getClientIP,
  // Entidad Atributo
  getEntidadAtributo,
  updateEntidadAtributo,
  getEntidadAtributoNoEliminados,
  // Entidad Atributo Opcion
  getEntidadAtributoClasificacion,
  getEntidadAtributoClasificacionByIdAtributo,
  postEntidadAtributoClasificacion,
  updateEntidadAtributoClasificacion,
  deleteEntidadAtributoClasificacion,
};
