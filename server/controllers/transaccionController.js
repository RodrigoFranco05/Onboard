  // const {
  //   Moneda,
  //   TipoMedioDePago,
  //   MedioDePago,
  //   CategoriaTransaccion,
  //   SubCategoriaTransaccion,
  //   TipoTransaccion,
  //   TransaccionItem,
  //   Transaccion,
  //   Pago,
  //   TransaccionPago,
  //   CuentaCorriente,
  //   Impuesto,
  //   TransaccionImpuesto,
  // } = require("../models/transaccionModel.js");
  
  // const { Ubicacion, Negocio, TipoEntidad, Entidad, Usuario }  = require('../models/adminModel.js');
  const utc = require("dayjs/plugin/utc");
  const tz = require("dayjs/plugin/timezone");
  const dayjs = require("dayjs");
  dayjs.extend(utc);
  dayjs.extend(tz);
  
  const { Op, fn, col, where, cast, QueryTypes } = require("sequelize");

  /**
   * Filtro tipo "contiene" sobre un id entero: p. ej. "16" encuentra transacción 1685.
   * Usa solo dígitos del criterio para armar el LIKE de forma segura.
   * @param {object} whereClause - objeto where de Sequelize (se añade Op.and si hace falta)
   * @param {string|number|null|undefined} idTransaccionSearch - valor desde query
   * @param {string} modelAlias - alias de tabla en el SQL (p. ej. "Transaccion", "TransaccionItem")
   * @param {string} column - columna (p. ej. "id", "idTransaccion")
   */
  const appendIdSubstringFilter = (whereClause, idTransaccionSearch, modelAlias, column) => {
    if (idTransaccionSearch == null || idTransaccionSearch === "") return;
    const raw = String(idTransaccionSearch).trim();
    if (!raw || raw === "null") return;
    const digitsOnly = raw.replace(/\D/g, "");
    if (!digitsOnly) return;

    const likePattern = `%${digitsOnly}%`;
    // En el where del modelo raíz del find, el prefijo "Modelo.columna" en col() puede no coincidir con el alias SQL y el LIKE no aplica. Usar solo `column` cuando no hay alias explícito.
    const colExpr =
      modelAlias != null && String(modelAlias).trim() !== ""
        ? col(`${modelAlias}.${column}`)
        : col(column);
    whereClause[Op.and] = whereClause[Op.and] || [];
    whereClause[Op.and].push(
      where(cast(colExpr, "TEXT"), { [Op.iLike]: likePattern }),
    );
  };
  const { conexionDB } = require("../config/db.js");
  const { transaccionModelInit } = require("../models/transaccionModel.js");
  const { adminModelInit } = require("../models/adminModel.js");
  const { itemModelInit } = require("../models/itemModel.js");
  
  const nodemailer = require("nodemailer");
  const fs = require("fs");
  const path = require("path");
  
  // Crear nueva moneda
  const postMoneda = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Moneda } = transaccionModelInit(sequelize);
  
      const moneda = new Moneda(req.body);
      await moneda.save();
      res.status(201).json(moneda);
    } catch (error) {
      res.status(400).json({ message: "Error al crear moneda", error });
    }
  };
  
  // Obtener moneda
  const getMoneda = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Moneda } = transaccionModelInit(sequelize);
  
      const moneda = await Moneda.findAll({
        where: { eliminado: false }
      });
      res.status(200).json(moneda);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener moneda", error });
    }
  };
  
  // Actualizar moneda
  const updateMoneda = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Moneda } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion } = req.body;
  
      const moneda = await Moneda.findByPk(id);
      if (!moneda) {
        return res.status(404).json({ message: "Moneda no encontrada" });
      }
  
      moneda.descripcion = descripcion;
      await moneda.save();
      res.status(200).json(moneda);
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar moneda", error });
    }
  };
  
  // Eliminar moneda (soft delete)
  const deleteMoneda = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Moneda } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
  
      const moneda = await Moneda.findByPk(id);
      if (!moneda) {
        return res.status(404).json({ message: "Moneda no encontrada" });
      }
  
      moneda.eliminado = true;
      await moneda.save();
      res.status(200).json({ message: "Moneda eliminada correctamente", moneda });
    } catch (error) {
      res.status(400).json({ message: "Error al eliminar moneda", error });
    }
  };
  
  // Crear nuevo tipo medio de pago
  const postTipoMedioDePago = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoMedioDePago } = transaccionModelInit(sequelize);
  
      const tipoMedioDePago = new TipoMedioDePago(req.body);
      await tipoMedioDePago.save();
      res.status(201).json(tipoMedioDePago);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al crear tipo medio de pago", error });
    }
  };
  
  const getTipoMedioDePago = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoMedioDePago } = transaccionModelInit(sequelize);
  
      // Por ejemplo, ?condicionExtra=verEnCaja=true
      const { condicionExtra } = req.query;
  
      // console.log("condicionExtra ", condicionExtra)
  
      let where = { eliminado: false };
  
      if (condicionExtra) {
        // Divide string tipo "verEnCaja=true" en clave y valor
        let [clave, valor] = condicionExtra.split("=");
        if (clave && valor) {
          // Si el valor es "true" o "false", convertilo a boolean
          if (valor === "true") valor = true;
          else if (valor === "false") valor = false;
          where[clave] = valor;
        }
      }
  
      const tipoMedioDePago = await TipoMedioDePago.findAll({
    where,
    order: [
      ['id', 'ASC']
    ]
  });
      res.status(200).json(tipoMedioDePago);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener tipo medio de pago", error });
    }
  };
  
  // Actualizar tipo medio de pago
  const updateTipoMedioDePago = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoMedioDePago } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion, verEnCaja, verEnTransaccion, esMultiMoneda, esPagoDiferido, userSelect, afectaCuentaCorriente } = req.body;
  
      const tipoMedioDePago = await TipoMedioDePago.findByPk(id);
      if (!tipoMedioDePago) {
        return res.status(404).json({ message: "Tipo medio de pago no encontrado" });
      }
  
      // Actualizar solo los campos que vienen en el body
      if (descripcion !== undefined) tipoMedioDePago.descripcion = descripcion;
      if (verEnCaja !== undefined) tipoMedioDePago.verEnCaja = verEnCaja;
      if (verEnTransaccion !== undefined) tipoMedioDePago.verEnTransaccion = verEnTransaccion;
      if (esMultiMoneda !== undefined) tipoMedioDePago.esMultiMoneda = esMultiMoneda;
      if (esPagoDiferido !== undefined) tipoMedioDePago.esPagoDiferido = esPagoDiferido;
      if (userSelect !== undefined) tipoMedioDePago.userSelect = userSelect;
      if (afectaCuentaCorriente !== undefined) tipoMedioDePago.afectaCuentaCorriente = afectaCuentaCorriente;
  
      await tipoMedioDePago.save();
      res.status(200).json(tipoMedioDePago);
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar tipo medio de pago", error });
    }
  };
  
  // Eliminar tipo medio de pago (soft delete)
  const deleteTipoMedioDePago = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoMedioDePago, MedioDePago } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
  
      const tipoMedioDePago = await TipoMedioDePago.findByPk(id);
      if (!tipoMedioDePago || tipoMedioDePago.eliminado) {
        return res.status(404).json({ message: "Tipo medio de pago no encontrado" });
      }
  
      // Validar si existen medios de pago asociados a este tipo
      const mediosAsociados = await MedioDePago.count({
        where: { 
          idTipoMedioDePago: id,
          eliminado: false 
        }
      });
  
      if (mediosAsociados > 0) {
        return res
          .status(400)
          .json({ 
            message: `No se puede eliminar el tipo porque tiene ${mediosAsociados} medio(s) de pago asociado(s)`,
            count: mediosAsociados 
          });
      }
  
      tipoMedioDePago.eliminado = true;
      await tipoMedioDePago.save();
      res.status(200).json({ message: "Tipo medio de pago eliminado correctamente", tipoMedioDePago });
    } catch (error) {
      res.status(400).json({ message: "Error al eliminar tipo medio de pago", error });
    }
  };
  
  // Crear nuevo medio de pago
  const postMedioDePago = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { MedioDePago } = transaccionModelInit(sequelize);
  
      const medioPago = new MedioDePago(req.body);
      await medioPago.save();
      res.status(201).json(medioPago);
    } catch (error) {
      res.status(400).json({ message: "Error al crear medio de pago", error });
    }
  };
  
  // Obtener medio de pago
  const getMedioDePago = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { MedioDePago } = transaccionModelInit(sequelize);
  
      const medioPago = await MedioDePago.findAll({
        where: { eliminado: false },
        order: [['id', 'ASC']]
      });
      res.status(200).json(medioPago);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener medio de pago", error });
    }
  };
  
  // Actualizar medio de pago
  const updateMedioDePago = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { MedioDePago } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion, idTipoMedioDePago } = req.body;
  
      const medioDePago = await MedioDePago.findByPk(id);
      if (!medioDePago) {
        return res.status(404).json({ message: "Medio de pago no encontrado" });
      }
  
      if (descripcion !== undefined) medioDePago.descripcion = descripcion;
      if (idTipoMedioDePago !== undefined) medioDePago.idTipoMedioDePago = idTipoMedioDePago;
  
      await medioDePago.save();
      res.status(200).json(medioDePago);
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar medio de pago", error });
    }
  };
  
  // Eliminar medio de pago (soft delete)
  const deleteMedioDePago = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { MedioDePago, Pago } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
  
      const medioDePago = await MedioDePago.findByPk(id);
      if (!medioDePago || medioDePago.eliminado) {
        return res.status(404).json({ message: "Medio de pago no encontrado" });
      }
  
      // Validar si existen pagos asociados a este medio de pago
      const pagosAsociados = await Pago.count({
        where: { 
          idMedioDePago: id,
          eliminado: false 
        }
      });
  
      if (pagosAsociados > 0) {
        return res
          .status(400)
          .json({ 
            message: `No se puede eliminar el medio de pago porque tiene ${pagosAsociados} pago(s) asociado(s)`,
            count: pagosAsociados 
          });
      }
  
      medioDePago.eliminado = true;
      await medioDePago.save();
      res.status(200).json({ message: "Medio de pago eliminado correctamente", medioDePago });
    } catch (error) {
      res.status(400).json({ message: "Error al eliminar medio de pago", error });
    }
  };
  
  const getMedioDePagoConDescripcion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoMedioDePago, MedioDePago } = transaccionModelInit(sequelize);
  
      const medioPago = await MedioDePago.findAll({
        include: [
          {
            model: TipoMedioDePago,
            as: "tipo", // Alias definido en la relación
            attributes: ["id", "descripcion"], // Trae id y descripcion del tipo
          },
        ],
        attributes: ["id", "descripcion", "idTipoMedioDePago", "eliminado"], // Incluye idTipoMedioDePago
        where: { eliminado: false },
        order: [['id', 'ASC']]
      });
      res.status(200).json(medioPago);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener medio de pago con descripción",
        error,
      });
    }
  };
  
  const getSubCategoriaTransaccionByCategoria = async (req, res) => {
    const { idSubCategoria } = req.params; // ← viene como parte de la URL
    const { idEntidad } = req.query; // ← viene como query param (?idEntidad=...)
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, TransaccionPago, Pago, MedioDePago, TipoMedioDePago, TipoTransaccion } =
        transaccionModelInit(sequelize);
      const { Entidad } = adminModelInit(sequelize);
  
      const whereCondition = { eliminado: false };
  
      // Armamos condiciones dinámicas
      if (
        idSubCategoria &&
        idSubCategoria !== "null" &&
        idSubCategoria !== "undefined"
      ) {
        whereCondition.idCategorizacion = parseInt(idSubCategoria);
      }
  
      if (idEntidad && idEntidad !== "null" && idEntidad !== "undefined") {
        whereCondition.idEntidad = parseInt(idEntidad);
      }
  
      const ultimaTransaccion = await Transaccion.findOne({
        where: whereCondition,
        order: [["id", "DESC"]],
        include: [
          {
            model: Entidad,
            as: "entidad",
            attributes: ["id", "descripcion", "apellido", "dniCuitCuil"],
          },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion", "id"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
        ],
      });
  
      res.status(200).json(ultimaTransaccion);
    } catch (error) {
      console.error("Error al buscar última transacción:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  };
  
  const getGastosTransacciones = async (req, res) => {
    const {
      page = 1,
      categoria,
      idSubCategoria,
      idEntidad,
      ubicacionId,
      idTipoTransaccion,
      idUsuario,
      limit = 100,
      startDate,
      endDate,
    } = req.query;
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TipoTransaccion,
        SubCategoriaTransaccion,
        CategoriaTransaccion,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Usuario, Negocio } = adminModelInit(sequelize);
  
      // ✅ Asegurar que `page` y `limit` sean valores numéricos válidos
      const pageNumber = parseInt(page, 10) || 1;
      const pageLimit = parseInt(limit, 10) || 100;
      const offset = (pageNumber - 1) * pageLimit; // Cálculo del offset correcto
  
      // console.log("idSubCategoria: ", idSubCategoria);
      // console.log("idEntidad: ", idEntidad);
      // Filtro dinámico: Egresos (tipo 5) + Cuenta Corriente (tipo 9)
      // Excluye pagos desde TablaCuentaCorriente (operacionParaCuentaCorriente = 'operacionCaja')
      const where = {
        eliminado: false,
        fecha: { [Op.between]: [startDate, endDate] },
        transaccionAsociada: null,
        [Op.or]: [
          { operacionParaCuentaCorriente: null },
          { operacionParaCuentaCorriente: { [Op.ne]: 'operacionCaja' } }
        ]
      };
  
      // idTipoTransaccion: si viene en query, filtra por ese tipo; si no, mantiene [5, 9]
      if (idTipoTransaccion) {
        where.idTipoTransaccion = parseInt(idTipoTransaccion, 10);
      } else {
        where.idTipoTransaccion = { [Op.in]: [5, 9] };
      }
  
      // 1) Si me pasaron idSubCategoria, uso ese filtro directo:
      if (idSubCategoria) {
        where.idCategorizacion = parseInt(idSubCategoria, 10);
  
        // 2) Si no, pero me pasaron categoria, busco todas las subcats de esa categoría:
      } else if (categoria) {
        // 2.1) obtengo solo los ids de SubCategoriaTransaccion que pertenezcan a la categoría
        const subcats = await SubCategoriaTransaccion.findAll({
          attributes: ["id"],
          where: {
            idCategoriaTransaccion: parseInt(categoria, 10),
            eliminado: false,
          },
        });
        const subcatIds = subcats.map((s) => s.id);
  
        // 2.2) si hay subcats, filtro con IN; si no, devuelvo nada (IN [])
        where.idCategorizacion = subcatIds.length
          ? { [Op.in]: subcatIds }
          : { [Op.in]: [] };
      }
  
      if (idEntidad) where.idEntidad = parseInt(idEntidad);
      if (ubicacionId) where.idUbicacion = parseInt(ubicacionId);
      if (idUsuario) where.idUsuario = parseInt(idUsuario);
  
      // Total para paginación
      const totalCount = await Transaccion.count({ where });
      const totalMontoGastos = Number((await Transaccion.sum("montoTotal", { where })) || 0);
  
      // Datos paginados con relaciones
      const data = await Transaccion.findAll({
        where,
        include: [
          {
            model: Entidad,
            as: "entidad",
            attributes: ["descripcion", "id", "dniCuitCuil"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion", "id"],
          },
          {
            model: Usuario,
            as: "usuario",
            attributes: ["usuario", "id"],
          },
          {
            model: Negocio,
            as: "negocio",
            attributes: ["descripcion"],
          },
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["id", "descripcion"],
          },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion", "id"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
          {
      model: SubCategoriaTransaccion,
      as: "subCategoria",
      attributes: ["id", "descripcion"],
      include: [
        {
          model: CategoriaTransaccion,
          as: "categoria",
          attributes: ["id", "descripcion"],
        },
      ],
    },
        ],
        order: [["fecha", "DESC"]],
        limit: pageLimit,
        offset,
      });
  
      return res.json({
        data,
        totalCount,
        totalMontoGastos,
        totalPages: Math.ceil(totalCount / pageLimit),
        currentPage: pageNumber,
      });
    } catch (error) {
      console.error("Error en getGastosTransacciones:", error);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  };
  
  // Crear nueva categoría de transacción
  const postCategoriaTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const categoriaTransaccion = new CategoriaTransaccion(req.body);
      await categoriaTransaccion.save();
      res.status(201).json(categoriaTransaccion);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al crear categoría de transacción", error });
    }
  };
  
  // Obtener subcategoría de transacción
  const getSubCategoriaTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { SubCategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const subCategoriaTransaccion = await SubCategoriaTransaccion.findAll({
        where: { eliminado: false },
        order: [["descripcion", "ASC"]],
      });
      res.status(200).json(subCategoriaTransaccion);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener subcategoría de transacción", error });
    }
  };
  
  // Crear nueva subcategoría de transacción
  const postSubCategoriaTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { SubCategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const subCategoriaTransaccion = new SubCategoriaTransaccion(req.body);
      await subCategoriaTransaccion.save();
      res.status(201).json(subCategoriaTransaccion);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al crear subcategoría de transacción", error });
    }
  };
  
  // Actualizar subcategoría de transacción
  const updateSubCategoriaTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { SubCategoriaTransaccion, CategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion, idCategoriaTransaccion } = req.body;
  
      const subCategoria = await SubCategoriaTransaccion.findByPk(id);
      if (!subCategoria || subCategoria.eliminado) {
        return res
          .status(404)
          .json({ message: "Subcategoría de transacción no encontrada" });
      }
  
      if (!descripcion || !descripcion.trim()) {
        return res
          .status(400)
          .json({ message: "La descripción es obligatoria" });
      }
  
      // Si se proporciona una nueva categoría padre, validar que existe
      if (idCategoriaTransaccion !== undefined && idCategoriaTransaccion !== null) {
        const categoriaExiste = await CategoriaTransaccion.findOne({
          where: { id: idCategoriaTransaccion, eliminado: false }
        });
        
        if (!categoriaExiste) {
          return res
            .status(400)
            .json({ message: "La categoría seleccionada no existe o está eliminada" });
        }
        
        subCategoria.idCategoriaTransaccion = idCategoriaTransaccion;
      }
  
      subCategoria.descripcion = descripcion.trim();
      await subCategoria.save();
  
      res.status(200).json(subCategoria);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al actualizar subcategoría de transacción", error });
    }
  };
  
  // Eliminar subcategoría de transacción (soft delete)
  const deleteSubCategoriaTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { SubCategoriaTransaccion, Transaccion } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const subCategoria = await SubCategoriaTransaccion.findByPk(id);
  
      if (!subCategoria || subCategoria.eliminado) {
        return res
          .status(404)
          .json({ message: "Subcategoría de transacción no encontrada" });
      }
  
      // Validar si existen transacciones asociadas a esta subcategoría
      const transaccionesAsociadas = await Transaccion.count({
        where: { 
          idCategorizacion: id,
          eliminado: false 
        }
      });
  
      if (transaccionesAsociadas > 0) {
        return res
          .status(400)
          .json({ 
            message: `No se puede eliminar la subcategoría porque tiene ${transaccionesAsociadas} transacción(es) asociada(s)`,
            count: transaccionesAsociadas 
          });
      }
  
      subCategoria.eliminado = true;
      await subCategoria.save();
  
      res
        .status(200)
        .json({ message: "Subcategoría eliminada correctamente", subCategoria });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al eliminar subcategoría de transacción", error });
    }
  };
  
  // Obtener categoría de transacción
  const getCategoriaTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const categoriaTransaccion = await CategoriaTransaccion.findAll({
        where: { eliminado: false },
        order: [["descripcion", "ASC"]],
      });
      res.status(200).json(categoriaTransaccion);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener categoría de transacción", error });
    }
  };
  
  // Actualizar categoría de transacción
  const updateCategoriaTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CategoriaTransaccion } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion } = req.body;
  
      const categoria = await CategoriaTransaccion.findByPk(id);
      if (!categoria || categoria.eliminado) {
        return res
          .status(404)
          .json({ message: "Categoría de transacción no encontrada" });
      }
  
      if (!descripcion || !descripcion.trim()) {
        return res.status(400).json({ message: "La descripción es obligatoria" });
      }
  
      categoria.descripcion = descripcion.trim();
      await categoria.save();
  
      res.status(200).json(categoria);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al actualizar categoría de transacción", error });
    }
  };
  
  // Eliminar categoría de transacción (soft delete)
  const deleteCategoriaTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CategoriaTransaccion, SubCategoriaTransaccion } =
        transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const categoria = await CategoriaTransaccion.findByPk(id);
  
      if (!categoria || categoria.eliminado) {
        return res
          .status(404)
          .json({ message: "Categoría de transacción no encontrada" });
      }
  
      categoria.eliminado = true;
      await categoria.save();
  
      await SubCategoriaTransaccion.update(
        { eliminado: true },
        { where: { idCategoriaTransaccion: id } },
      );
  
      res.status(200).json({
        message: "Categoría eliminada correctamente",
        categoria,
      });
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al eliminar categoría de transacción", error });
    }
  };
  
  // Crear nuevo tipo de transacción
  const postTipoTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoTransaccion } = transaccionModelInit(sequelize);
  
      const tipoTransaccion = new TipoTransaccion(req.body);
      await tipoTransaccion.save();
      res.status(201).json(tipoTransaccion);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al crear tipo de transacción", error });
    }
  };
  
  // Obtener tipo de transacción
  const getTipoTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoTransaccion } = transaccionModelInit(sequelize);
  
      // Filtrar solo los no eliminados, que se muestren en transacciones y ordenar por ID para consistencia
      const tipoTransaccion = await TipoTransaccion.findAll({
        where: { 
          eliminado: false,
          verEnTransaccion: true 
        },
        order: [['id', 'ASC']],
      });
      
      // Validar que se obtuvieron datos
      if (!Array.isArray(tipoTransaccion)) {
        return res.status(500).json({ 
          message: "Error: respuesta inválida del servidor",
          data: [] 
        });
      }
      
      res.status(200).json(tipoTransaccion);
    } catch (error) {
      console.error("Error en getTipoTransaccion:", error);
      // Retornar array vacío en caso de error para que el frontend no falle
      res.status(500).json({ 
        message: "Error al obtener tipo de transacción", 
        error: error.message,
        data: [] 
      });
    }
  };
  
  // Obtener tipo de transacción
  const gestionTipoTransaccionTabla = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoTransaccion } = transaccionModelInit(sequelize);
  
      // Filtrar solo los no eliminados, que se muestren en transacciones y ordenar por ID para consistencia
      const tipoTransaccion = await TipoTransaccion.findAll({
        where: { 
          eliminado: false,
          // verEnTransaccion: true 
        },
        order: [['id', 'ASC']],
      });
      
      // Validar que se obtuvieron datos
      if (!Array.isArray(tipoTransaccion)) {
        return res.status(500).json({ 
          message: "Error: respuesta inválida del servidor",
          data: [] 
        });
      }
      
      res.status(200).json(tipoTransaccion);
    } catch (error) {
      console.error("Error en getTipoTransaccion:", error);
      // Retornar array vacío en caso de error para que el frontend no falle
      res.status(500).json({ 
        message: "Error al obtener tipo de transacción", 
        error: error.message,
        data: [] 
      });
    }
  };
  
  // Actualizar tipo de transacción
  const updateTipoTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoTransaccion } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
      const { descripcion, verEnTransaccion, verEnCaja, verEnColumna } = req.body;
  
      // Validar que no se puedan editar tipos de transacción del sistema (id 1-6)
      if (id <= 6) {
        return res.status(403).json({ 
          message: "No se pueden editar los tipos de transacción del sistema (ID 1-6)" 
        });
      }
  
      const tipoTransaccion = await TipoTransaccion.findByPk(id);
      if (!tipoTransaccion) {
        return res.status(404).json({ message: "Tipo de transacción no encontrado" });
      }
  
      // Actualizar solo los campos que vienen en el body
      if (descripcion !== undefined) tipoTransaccion.descripcion = descripcion;
      if (verEnTransaccion !== undefined) tipoTransaccion.verEnTransaccion = verEnTransaccion;
      if (verEnCaja !== undefined) tipoTransaccion.verEnCaja = verEnCaja;
      if (verEnColumna !== undefined) tipoTransaccion.verEnColumna = verEnColumna;
  
      await tipoTransaccion.save();
      
      // Recargar todos los tipos para devolver la lista actualizada
      const tiposActualizados = await TipoTransaccion.findAll();
      res.status(200).json(tiposActualizados);
    } catch (error) {
      res.status(400).json({ message: "Error al actualizar tipo de transacción", error });
    }
  };
  
  // Eliminar tipo de transacción (soft delete)
  const deleteTipoTransaccion = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoTransaccion } = transaccionModelInit(sequelize);
  
      const { id } = req.params;
  
      // Validar que no se puedan eliminar tipos de transacción del sistema (id 1-6)
      if (id <= 6) {
        return res.status(403).json({ 
          message: "No se pueden eliminar los tipos de transacción del sistema (ID 1-6)" 
        });
      }
  
      const tipoTransaccion = await TipoTransaccion.findByPk(id);
      if (!tipoTransaccion) {
        return res.status(404).json({ message: "Tipo de transacción no encontrado" });
      }
  
      tipoTransaccion.eliminado = true;
      await tipoTransaccion.save();
      
      // Recargar todos los tipos para devolver la lista actualizada
      const tiposActualizados = await TipoTransaccion.findAll();
      res.status(200).json({ message: "Tipo de transacción eliminado correctamente", data: tiposActualizados });
    } catch (error) {
      res.status(400).json({ message: "Error al eliminar tipo de transacción", error });
    }
  };
  
  // Crear nuevo ítem de transacción
  const postTransaccionItem = async (req, res) => {
    const { idItem, cantidad, lotes, idUbicacion } = req.body; // 🆕 Agregar lotes y ubicación
  
    if (!idItem || !cantidad) {
      return res
        .status(400)
        .json({ message: "idItem o cantidad están incompletos." });
    }
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
      const { LoteTransaccion, LoteItemUbicacion, ItemUbicacion } = require('../models/itemModel.js').itemModelInit(sequelize);
  
      const transaccionItem = new TransaccionItem(req.body);
      await transaccionItem.save();
  
      // 🆕 Si el item tiene lotes, procesar el descuento y crear LoteTransaccion
      if (lotes && Array.isArray(lotes) && lotes.length > 0 && idUbicacion) {
        // Variable para acumular la cantidad total descontada de lotes
        let cantidadTotalDescontada = 0;
        
        for (const lote of lotes) {
          const { idLote, cantidad: cantidadLote } = lote;
          
          if (!idLote || !cantidadLote) {
            continue;
          }
  
          try {
            // 1. Descontar stock de LoteItemUbicacion
            const loteItemUbicacion = await LoteItemUbicacion.findOne({
              where: {
                idLote: parseInt(idLote),
                idUbicacion: parseInt(idUbicacion),
                eliminado: false
              }
            });
  
            if (!loteItemUbicacion) {
              continue;
            }
  
            if (loteItemUbicacion.stock < cantidadLote) {
              continue;
            }
  
            // Descontar stock del lote
            await loteItemUbicacion.update({
              stock: parseFloat(loteItemUbicacion.stock) - parseFloat(cantidadLote)
            });
  
            // Acumular cantidad descontada
            cantidadTotalDescontada += parseFloat(cantidadLote);
  
            // 2. Crear registro en LoteTransaccion
            await LoteTransaccion.create({
              idLote: parseInt(idLote),
              idTransaccion: parseInt(transaccionItem.idTransaccion),
              cantidad: parseFloat(cantidadLote),
              eliminado: false
            });
  
          } catch (errorLote) {
            // No fallar toda la transacción por un lote
            console.error("❌ Error procesando lote:", errorLote);
          }
        }
  
        // 3. Descontar stock total de ItemUbicacion (suma de todos los lotes descontados)
        if (cantidadTotalDescontada > 0) {
          try {
            const itemUbicacion = await ItemUbicacion.findOne({
              where: {
                idItem: parseInt(idItem),
                idUbicacion: parseInt(idUbicacion),
                eliminado: false
              }
            });
  
            if (itemUbicacion) {
              const nuevoInventario = parseFloat(itemUbicacion.inventario || 0) - cantidadTotalDescontada;
              await itemUbicacion.update({
                inventario: nuevoInventario >= 0 ? nuevoInventario : 0
              });
            }
          } catch (errorItemUbicacion) {
            console.error("❌ Error al descontar stock de ItemUbicacion:", errorItemUbicacion);
            // No fallar la transacción si falla el descuento de ItemUbicacion
          }
        }
      }
  
      res.status(201).json(transaccionItem);
    } catch (error) {
      console.error("❌ Error al crear ítem de transacción:", error);
      res
        .status(400)
        .json({ message: "Error al crear ítem de transacción", error });
    }
  };
  
  // Obtener ítems de transacción
  const getTransaccionItem = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      const transaccionItem = await TransaccionItem.findAll();
      res.status(200).json(transaccionItem);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener ítems de transacción", error });
    }
  };
  
  // Controlador para obtener los ítems de una transacción por su ID
  const getTransaccionItemID = async (req, res) => {
    const { transaccionId } = req.params;
    const { mostrarEliminados } = req.query; // ✅ Nuevo parámetro para mostrar eliminados
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
  
    // ✅ Filtrar según si se muestran eliminados o no
    const mostrarEliminadosBool = mostrarEliminados === 'true' || mostrarEliminados === true;
    
    // Si mostrarEliminados es true, traer TODOS los items (eliminados y no eliminados)
    // Si es false, traer solo los NO eliminados
    const whereClause = mostrarEliminadosBool 
      ? { idTransaccion: transaccionId } // ✅ Traer todos
      : { idTransaccion: transaccionId, eliminado: false }; // ✅ Solo no eliminados
    
    const items = await TransaccionItem.findAll({
      where: whereClause,
    });
  
      // console.log("items: ", items);
  
      // ✅ Si no hay items, retornar array vacío (NO 404)
      // El 404 es para cuando la transacción no existe, no cuando no tiene items
      res.json(items);
    } catch (error) {
      console.error("Error al obtener los ítems de la transacción:", error);
      res.status(500).json({ message: "Error interno del servidor." });
    }
  };
  
  // Controlador para obtener los ítems de una transacción por su ID
  // Controlador para obtener los ítems de una transacción por su ID
  const getTransaccionItemIDEnCompras = async (req, res) => {
    const { transaccionId } = req.params;
  
    try {
      // Conexión
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem, TransaccionCompraItem } =
        transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
  
      // Obtener los ítems de la transacción (por ejemplo, cantidad pedida)
      const items = await TransaccionItem.findAll({
        where: { idTransaccion: transaccionId, eliminado: false },
        // Si necesitas datos del Item, puedes incluirlo (descomenta y ajusta según corresponda)
        // include: [{
        //   model: Item,
        //   as: "item",
        //   attributes: ["id", "nombre", "otrasColumnas"]
        // }]
      });
  
      // Obtener los ítems de compra agrupados por idTransaccion e idItem,
      // obteniendo la fecha más reciente y la suma de todas las cantidades recibidas.
      const compraItems = await TransaccionCompraItem.findAll({
        where: { idTransaccion: transaccionId, eliminado: false },
        attributes: [
          "idTransaccion",
          "idItem",
          [sequelize.fn("MAX", sequelize.col("fecha")), "fechaMasReciente"], //BUSCA EL MAX PARA TRAER LOS DEMAS DATOS DEPENDIENDO DE LA FECHA MAXIMA
          [
            sequelize.fn("SUM", sequelize.col("cantidadRecibida")),
            "totalCantidadRecibida",
          ], //HACE LA QUERY PARA SUMAR TODAS LAS CANTIDADES CUANDO VA COMPARANDO LINEA POR LINEA
        ],
        group: ["idTransaccion", "idItem"],
      });
  
      // console.log("items: ", items); //DATOS DE LA TABLA TRANSACCION ITEMS
      // console.log("compraItems: ", compraItems); //DATOS DE LA TABLA TRANSACCION COMPRA ITEMS PARA PODES COMPARAR CON TABLA TRANSACCION ITEMS.
  
      if (!items.length && !compraItems.length) {
        return res
          .status(404)
          .json({ message: "No se encontraron ítems para esta transacción." });
      }
  
      // Devuelve ambos conjuntos de datos para poder compararlos o usarlos según lo requieras
      res.json({ items, compraItems });
    } catch (error) {
      console.error("Error al obtener los ítems de la transacción:", error);
      res.status(500).json({ message: "Error interno del servidor." });
    }
  };
  
  const updateTransaccionCompraItem = async (req, res) => {
    const { transaccionId, idItem, cantidadRecibida } = req.body;
  
    try {
      // Inicializa la conexión a la base de datos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  
      // Carga el modelo TransaccionCompraItem con la conexión inicializada
      const { TransaccionCompraItem } = transaccionModelInit(sequelize);
  
      // Buscar el registro que coincida con transaccionId e idItem
      const transaccionCompraItem = await TransaccionCompraItem.findOne({
        where: { idTransaccion: transaccionId, idItem: idItem },
      });
  
      // Si no se encuentra el registro, retorna error 404
      if (!transaccionCompraItem) {
        return res.status(404).json({ message: "Transacción no encontrada." });
      }
  
      // Si la cantidad recibida es la misma que la actual, no se actualiza
      if (transaccionCompraItem.cantidadRecibida === cantidadRecibida) {
        return res.status(200).json({
          message:
            "No se realizó actualización, la cantidad recibida es la misma.",
        });
      }
  
      // Si la cantidad es diferente, se actualiza y se guarda
      transaccionCompraItem.cantidadRecibida = cantidadRecibida;
      await transaccionCompraItem.save();
  
      return res.status(200).json({
        message: "Transacción actualizada correctamente.",
        transaccionCompraItem,
      });
    } catch (error) {
      console.error("Error al actualizar la transacción:", error);
      return res
        .status(400)
        .json({ message: "Error al actualizar la transacción", error });
    }
  };
  
  // Crear nueva transacción
  const postTransaccion = async (req, res) => {
    const {
      montoTotal,
      idNegocio,
      cotizacion,
      idMoneda,
      idTipoTransaccion,
      idMedioPago,
      idEntidad,
      idUsuario,
      idUbicacion,
      transaccionAsociada,
      clientOS, // Nuevo: SO del cliente para instrucciones de impresión
    } = req.body;
  
    // console.log(
    //   `transaccion llegando: montoTotal = ${montoTotal},idNegocio = ${idNegocio}, cotizacion = ${cotizacion}, idMoneda = ${idMoneda}, idTipoTransaccion = ${idTipoTransaccion}, idMedioPago = ${idMedioPago}, idEntidad = ${idEntidad}, idUsuario = ${idUsuario}, idUbicacion = ${idUbicacion}, clientOS = ${clientOS}`
    // );
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion } = transaccionModelInit(sequelize);
  
      // Si afectaCuentaCorriente = true y no se especifica operacionParaCuentaCorriente,
      // establecer 'operacionCC' por defecto (comportamiento normal)
      if (req.body.afectaCuentaCorriente === true && !req.body.operacionParaCuentaCorriente) {
        req.body.operacionParaCuentaCorriente = 'operacionCC';
      }
  
      const transaccion = new Transaccion(req.body);
      await transaccion.save();
  
      // IMPRESIÓN AUTOMÁTICA DESACTIVADA PARA PRODUCCIÓN
      // La impresión automática no funciona en producción porque:
      // - El backend está en VPS Linux en la nube
      // - La impresora está en la máquina local del tenant
      // - El servidor no puede acceder a hardware USB remoto
      // 
      // SOLUCIÓN: Usar el botón "Imprimir Ticket" en el modal de factura
      // que abre una nueva pestaña con HTML optimizado para impresión térmica
      //
      // if (idTipoTransaccion === 1) { // Solo para ventas
      //   const { printAfterSale } = require('../services/tickeadora/printAfterSaleService');
      //   setTimeout(async () => {
      //     try {
      //       await printAfterSale(transaccion.id, req.cookies, clientOS);
      //     } catch (error) {
      //       console.error('Error en impresión automática:', error);
      //     }
      //   }, 1000);
      // }
  
      res.status(201).json(transaccion);
    } catch (error) {
      console.error("Error al crear transacción:", error);
      res.status(400).json({ message: "Error al crear transacción", error });
    }
  };
  
  const getEstadoCompra = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { EstadoCompra } = transaccionModelInit(sequelize);
  
      const estadoCompra = await EstadoCompra.findAll();
      res.status(200).json(estadoCompra);
    } catch (error) {
      console.error("Error al obtener estado de compra:", error);
      res
        .status(500)
        .json({ message: "Error al obtener estado de compra", error });
    }
  };
  
  const postTransaccionCompraEstado = async (req, res) => {
    try {
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionCompraEstado } = transaccionModelInit(sequelize);
  
      // Crear la instancia con los datos del request
      const transaccionCompraEstado = new TransaccionCompraEstado(req.body);
  
      // Guardar la instancia en la base de datos
      await transaccionCompraEstado.save();
  
      res.status(201).json(transaccionCompraEstado);
    } catch (error) {
      console.error("Error al crear estado de compra:", error);
      res.status(400).json({ message: "Error al crear estado de compra", error });
    }
  };
  
  const postTransaccionCompraItem = async (req, res) => {
    try {
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionCompraItem } = transaccionModelInit(sequelize);
  
      // Crear la instancia con los datos del request
      const transaccionCompraItem = new TransaccionCompraItem(req.body);
  
      // Guardar la instancia en la base de datos
      await transaccionCompraItem.save();
  
      res.status(201).json(transaccionCompraItem);
    } catch (error) {
      console.error("Error al crear estado de compra:", error);
      res.status(400).json({ message: "Error al crear estado de compra", error });
    }
  };
  
  
  
  // ARREGLAR PORQUE NO SE USA "fechaHoraCreacion" , se usa "fecha"
  const getFilteredTransacciones = async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        medioDePagoId,
        tipoMedioDePagoId,
        tipoTransaccionId,
        idTransaccionSearch,
        idDni,
        idUbicacion,
        page = 1,
        limit = 100,
        incluirEliminados = false,
      } = req.query;
  
      // 1) Fechas - ✅ Usar Date objects directamente (patrón correcto según documentación)
      // Los Date objects se serializan como ISO strings en query params, los parseamos de vuelta
      let fechaInicio = null;
      let fechaFin = null;
      
      if (startDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaInicio = startDate instanceof Date ? startDate : new Date(startDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaInicio.getTime())) {
          fechaInicio = null;
        }
      }
      
      if (endDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaFin = endDate instanceof Date ? endDate : new Date(endDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaFin.getTime())) {
          fechaFin = null;
        }
      }
  
      // 2) WHERE principal
      // Usar 'fecha' (fecha indicada por el usuario) en lugar de 'fechaHoraCreacion' (cuando se creó el registro)
      // Esto permite filtrar correctamente transacciones con fechas del pasado
      // ✅ Si incluirEliminados es true, solo mostrar eliminados; si es false, solo mostrar no eliminados
      const whereTrans = {};
      if (incluirEliminados === 'true' || incluirEliminados === true) {
        whereTrans.eliminado = true; // Solo mostrar transacciones eliminadas
      } else {
        whereTrans.eliminado = false; // Solo mostrar transacciones NO eliminadas
      }
      
      if (fechaInicio && fechaFin) {
        whereTrans.fecha = { [Op.between]: [fechaInicio, fechaFin] };
      } else if (fechaInicio) {
        whereTrans.fecha = { [Op.gte]: fechaInicio };
      } else if (fechaFin) {
        whereTrans.fecha = { [Op.lte]: fechaFin };
      }
      appendIdSubstringFilter(whereTrans, idTransaccionSearch, "Transaccion", "id");
      if (idDni) whereTrans.idEntidad = idDni;
      if (tipoTransaccionId) whereTrans.idTipoTransaccion = tipoTransaccionId;
      const ubicacionId = parseInt(idUbicacion, 10);
      if (!isNaN(ubicacionId)) {
        whereTrans.idUbicacion = ubicacionId;
      }
  
      // 3) Filtro de medio/tipo de medio
      const medioId = parseInt(medioDePagoId, 10);
      const tipoMedioId = parseInt(tipoMedioDePagoId, 10);
      const filterByMedio = !isNaN(medioId) || !isNaN(tipoMedioId);
      const whereMedio = { eliminado: false };
      if (!isNaN(medioId)) whereMedio.id = medioId;
      if (!isNaN(tipoMedioId)) whereMedio.idTipoMedioDePago = tipoMedioId;
  
      // 4) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionTipoFactura,
        TipoFactura,
        TransaccionAuditoria,
        TransaccionCompraEstado,
        EstadoCompra,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // 4.1) Construir filtros de atributos de entidad desde req.query
      const whereEntidad = {};
      for (let i = 1; i <= 10; i++) {
        const atributoValue = req.query[`atributoEntidad${i}`];
        if (atributoValue && atributoValue !== "null" && atributoValue !== "") {
          whereEntidad[`entidadDatoAtributo${i}`] = Number(atributoValue);
        }
      }
      const tieneFiltrosAtributos = Object.keys(whereEntidad).length > 0;
  
      // 5) Paginación
      const pageNumber = parseInt(page, 10);
      const pageLimit = parseInt(limit, 10);
      const offset = (pageNumber - 1) * pageLimit;
  
      // 6) Includes compartidos
      const entidadInclude = {
        model: Entidad,
        as: "entidad",
        attributes: [
          "id",
          "descripcion",
          "apellido",
          "dniCuitCuil",
          "entidadDatoAtributo1",
          "entidadDatoAtributo2",
          "entidadDatoAtributo3",
          "entidadDatoAtributo4",
          "entidadDatoAtributo5",
          "entidadDatoAtributo6",
          "entidadDatoAtributo7",
          "entidadDatoAtributo8",
          "entidadDatoAtributo9",
          "entidadDatoAtributo10",
        ],
        required: tieneFiltrosAtributos, // Si hay filtros de atributos, hacer INNER JOIN
        where: tieneFiltrosAtributos ? whereEntidad : undefined,
        include: [
          { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
          { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
        ],
      };
  
      const baseIncludes = [
        {
          model: TipoTransaccion,
          as: "tipoTransaccion",
          attributes: ["id", "descripcion", "operacionCaja"],
        },
        entidadInclude,
        { model: Usuario, as: "usuario", attributes: ["usuario"] },
        { model: Ubicacion, as: "ubicacion", attributes: ["descripcion"] },
        { model: Negocio, as: "negocio", attributes: ["descripcion"] },
        {
          model: TransaccionImpuesto,
          as: "transaccionImpuesto",
          required: false,
          include: [
            {
              model: Impuesto,
              as: "impuesto",
              attributes: ["descripcion", "incluidoEnPrecio"],
            },
          ],
        },
        {
          model: TransaccionTipoFactura,
          as: "transaccionTipoFactura",
          required: false,
          include: [
            {
              model: TipoFactura,
              as: "tipoFactura",
              attributes: ["descripcion"],
            },
          ],
        },
        // ✅ Incluir auditoría solo cuando se muestran transacciones eliminadas
        ...((incluirEliminados === 'true' || incluirEliminados === true) ? [{
          model: TransaccionAuditoria,
          as: "auditorias",
          required: false,
          where: { accion: "eliminar" },
          order: [["createdAt", "DESC"]], 
          limit: 1,
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: ["usuario"],
            },
          ],
        }] : []),
        {
          model: TransaccionCompraEstado,
          as: "transaccionCompraEstado",
          required: false,
          include: [
            {
              model: EstadoCompra,
              as: "estadoCompra",
              attributes: ["id", "descripcion"],
              required: false,
            },
          ],
        },
      ];
  
      // 7) Query con o sin filtro de medio
      let count, rows;
  
      if (filterByMedio) {
        // INNER JOIN en pagos y medioDePago
        ({ count, rows } = await Transaccion.findAndCountAll({
          where: whereTrans,
          distinct: true,
          subQuery: false, // evita sub-select y alias faltantes
          limit: pageLimit,
          offset,
          order: [["id", "DESC"]],
          include: [
            {
              model: TransaccionPago,
              as: "transaccionPago",
              where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
              required: true,
              include: [
                {
                  model: Pago,
                  as: "pago",
                  required: true,
                  attributes: ["montoTotal", "cotizacion", "id"],
                  include: [
                    {
                      model: MedioDePago,
                      as: "medioDePago",
                      where: whereMedio,
                      required: true,
                      attributes: ["id", "descripcion"],
                      include: [
                        {
                          model: TipoMedioDePago,
                          as: "tipoMedioDePago",
                          attributes: ["descripcion"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            ...baseIncludes,
          ],
        }));
      } else {
        // LEFT JOIN en pagos y medioDePago
        ({ count, rows } = await Transaccion.findAndCountAll({
          where: whereTrans,
          distinct: true,
          subQuery: false,
          limit: pageLimit,
          offset,
          order: [["id", "DESC"]],
          include: [
            {
              model: TransaccionPago,
              as: "transaccionPago",
              where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
              required: false,
              include: [
                {
                  model: Pago,
                  as: "pago",
                  required: false,
                  attributes: ["montoTotal", "cotizacion", "id"],
                  include: [
                    {
                      model: MedioDePago,
                      as: "medioDePago",
                      required: false,
                      attributes: ["id", "descripcion"],
                      include: [
                        {
                          model: TipoMedioDePago,
                          as: "tipoMedioDePago",
                          attributes: ["descripcion", "id"],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            ...baseIncludes,
          ],
        }));
      }
  
      // 8) Calcular totales GLOBALES (sin paginación) para el footer
      // Query adicional para obtener TODAS las transacciones del período filtrado
      let allRows;
      
      if (filterByMedio) {
        allRows = await Transaccion.findAll({
          where: whereTrans,
          attributes: ["id", "montoTotal", "idTipoTransaccion"],
          include: [
            {
              model: TransaccionPago,
              as: "transaccionPago",
              where: { eliminado: false },
              required: true,
              attributes: [],
              include: [
                {
                  model: Pago,
                  as: "pago",
                  required: true,
                  attributes: [],
                  include: [
                    {
                      model: MedioDePago,
                      as: "medioDePago",
                      where: whereMedio,
                      required: true,
                      attributes: [],
                    },
                  ],
                },
              ],
            },
            {
              model: TipoTransaccion,
              as: "tipoTransaccion",
              attributes: ["descripcion"],
            },
            // Si hay filtros de atributos, incluir entidad
            ...(tieneFiltrosAtributos ? [{
              model: Entidad,
              as: "entidad",
              attributes: [],
              required: true,
              where: whereEntidad,
            }] : []),
          ],
        });
      } else {
        allRows = await Transaccion.findAll({
          where: whereTrans,
          attributes: ["id", "montoTotal", "idTipoTransaccion"],
          include: [
            {
              model: TipoTransaccion,
              as: "tipoTransaccion",
              attributes: ["descripcion"],
            },
            // Si hay filtros de atributos, incluir entidad
            ...(tieneFiltrosAtributos ? [{
              model: Entidad,
              as: "entidad",
              attributes: [],
              required: true,
              where: whereEntidad,
            }] : []),
          ],
        });
      }
  
      // Calcular totales globales por tipo de transacción
      const totalesGlobales = {
        Venta: 0,
        Presupuesto: 0,
        Compra: 0,
        Ingreso: 0,
        Egreso: 0,
      };
  
      allRows.forEach((transaccion) => {
        const tipo = transaccion.tipoTransaccion.descripcion;
        if (totalesGlobales[tipo] !== undefined) {
          totalesGlobales[tipo] += Math.abs(transaccion.montoTotal);
        }
      });
  
      // 9) Mapeo de resultados (página actual)
      const data = rows.map((item) => {
        const tx = item.toJSON();
  
        const pagos = (tx.transaccionPago || [])
          .map((tp) => tp.pago)
          .filter((p) => p && p.medioDePago)
          .map((p) => ({
            montoTotal: p.montoTotal,
            cotizacion: p.cotizacion,
            medioDePago: p.medioDePago.descripcion,
            idMedio: p.medioDePago.id,
            pagoId: p.id,
            tipoMedio: p.medioDePago.tipoMedioDePago.descripcion,
            idtipoMedio: p.medioDePago.tipoMedioDePago.id,
          }));
  
        const impuestos = (tx.transaccionImpuesto || []).map((i) => ({
          idImpuesto: i.idImpuesto,
          porcentaje: i.porcentaje,
          montoTotal: i.montoTotal,
          incluidoEnPrecio: i.impuesto?.incluidoEnPrecio,
          descripcion: i.impuesto?.descripcion,
        }));
        const descripcionImpuestos = impuestos
          .map((i) => `${i.descripcion} (${i.porcentaje}%): $${i.montoTotal}`)
          .join("; ");
  
        // ✅ Obtener información de eliminación si aplica
        const auditoria = tx.auditorias && tx.auditorias.length > 0 ? tx.auditorias[0] : null;
        const usuarioElimino = auditoria?.usuario?.usuario || null;
  
        return {
          id: tx.id,
          montoTotal: tx.montoTotal,
          idTipoTransaccion: tx.idTipoTransaccion,
          entidad: tx.entidad,
          tipoTransaccion: tx.tipoTransaccion,
          usuario: tx.usuario,
          ubicacion: tx.ubicacion,
          negocio: tx.negocio,
          descripcion: tx.descripcion,
          fechaHoraCreacion: tx.fechaHoraCreacion,
          fecha: tx.fecha, // Fecha indicada por el usuario (puede ser del pasado)
          pagos,
          tipoPago:
            pagos.length > 1
              ? "Múltiple"
              : pagos.length === 1
              ? "Individual"
              : "",
          impuestos,
          descripcionImpuestos,
          tipoFacturaDescripcion:
            tx.transaccionTipoFactura?.tipoFactura?.descripcion || "",
          archivosAdjuntos: tx.archivosAdjuntos || null, // Archivos adjuntos en Base64
          eliminado: tx.eliminado || false, // Estado de eliminado
          usuarioElimino: usuarioElimino, // Usuario que eliminó (solo si está eliminado)
          transaccionCompraEstado: tx.transaccionCompraEstado || null,
        };
      });
  
      // 10) Respuesta final con totales globales
      return res.status(200).json({
        currentPage: pageNumber,
        totalPages: Math.ceil(count / pageLimit),
        totalCount: count,
        data,
        // ✅ Nuevos campos para el footer (totales globales de todas las páginas)
        totalesGlobales,
      });
    } catch (error) {
      console.error("Error en getFilteredTransacciones:", error);
      return res.status(500).json({
        message: "Error al obtener transacciones",
        error: error.message,
      });
    }
  };
  // Crear nueva transacción
  const postTransaccionPago = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionPago } = transaccionModelInit(sequelize);
  
      const { fechaOriginal, ...transaccionPagoData } = req.body;
      
      // Si se proporciona fechaOriginal (edición de transacción), usar esa fecha para createdAt
      const transaccionPagoConfig = {
        ...transaccionPagoData,
        ...(fechaOriginal && {
          createdAt: new Date(fechaOriginal),
          updatedAt: new Date() // updatedAt siempre es la fecha actual
        })
      };
  
      const transaccionPago = new TransaccionPago(transaccionPagoConfig);
      await transaccionPago.save();
      
      console.log(`🔗 TransaccionPago creado con fecha: createdAt=${transaccionPago.createdAt}, updatedAt=${transaccionPago.updatedAt}`);
      
      res.status(201).json(transaccionPago);
    } catch (error) {
      console.error("Error al crear transaccionPago:", error);
      res.status(400).json({ message: "Error al crear transaccionPago", error });
    }
  };
  // Crear nueva transacción
  const postCrearPago = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Pago } = transaccionModelInit(sequelize);
  
      const { fechaOriginal, ...pagoData } = req.body;
      
      // Si se proporciona fechaOriginal (edición de venta), usar esa fecha para createdAt
      const pagoConfig = {
        ...pagoData,
        ...(fechaOriginal && {
          createdAt: new Date(fechaOriginal),
          updatedAt: new Date() // updatedAt siempre es la fecha actual
        })
      };
  
      const crearPago = await Pago.create(pagoConfig);
      
      console.log(`💳 Pago creado con fecha: createdAt=${crearPago.createdAt}, updatedAt=${crearPago.updatedAt}`);
      
      res.status(201).json(crearPago);
    } catch (error) {
      console.error("Error al crear crearPago:", error);
      res.status(400).json({ message: "Error al crear crearPago", error });
    }
  };
  
  const getMedioDePagoPorTipo = async (req, res) => {
    const { idTipoMedioDePago } = req.params; // Obtenemos el idTipoMedioDePago de los parámetros
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { MedioDePago } = transaccionModelInit(sequelize);
  
      // Verificamos si el idTipoMedioDePago es válido
      if (!idTipoMedioDePago) {
        return res
          .status(400)
          .json({ message: "El idTipoMedioDePago es requerido." });
      }
  
      // Realizamos una consulta para obtener los medios de pago dependientes de ese tipo
      const mediosDePago = await MedioDePago.findAll({
        where: { idTipoMedioDePago: idTipoMedioDePago }, // Filtramos por el idTipoMedioDePago
      });
  
      // Verificamos si encontramos medios de pago
      if (!mediosDePago || mediosDePago.length === 0) {
        return res
          .status(404)
          .json({ message: "No se encontraron medios de pago para este tipo." });
      }
  
      // Devolvemos los medios de pago encontrados
      return res.status(200).json(mediosDePago);
    } catch (error) {
      console.error("Error al obtener los medios de pago:", error);
      return res
        .status(500)
        .json({ message: "Hubo un error al obtener los medios de pago.", error });
    }
  };
  
  // Crear una nueva cuenta corriente
  const postCuentaCorrienteVenta = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CuentaCorriente, TipoTransaccion } = transaccionModelInit(sequelize);
  
      const { idEntidad, monto, idTipoTransaccion } = req.body;
      
      // Obtener operacionCuentaCorriente desde la BD
      let montoAjustado;
      if (idTipoTransaccion) {
        const tipoTransaccion = await TipoTransaccion.findByPk(idTipoTransaccion, {
          attributes: ["operacionCuentaCorriente"],
        });
        
        if (tipoTransaccion?.operacionCuentaCorriente) {
          // Usar la parametrización: "+" suma, "-" resta
          montoAjustado = tipoTransaccion.operacionCuentaCorriente === "+" 
            ? Math.abs(monto) 
            : -Math.abs(monto);
        } else {
          return res.status(400).json({ 
            message: "Tipo de transacción no válido para cuenta corriente" 
          });
        }
      } else {
        return res.status(400).json({ 
          message: "idTipoTransaccion es requerido" 
        });
      }
  
      // Normalizar -0 a 0
      const saldoNormalizado = Object.is(montoAjustado, -0) ? 0 : montoAjustado;
      
      const cuenta = new CuentaCorriente({
        idEntidad,
        saldo: saldoNormalizado,
      });
      await cuenta.save();
      res.status(201).json(cuenta);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al crear la cuenta corriente", error });
    }
  };
  
  // Actualizar saldo en una cuenta corriente
  const updateCuentaCorrienteVenta = async (req, res) => {
    const { idEntidad } = req.params;
    const { monto, idTipoTransaccion, usarOperacionCaja } = req.body;
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CuentaCorriente, TipoTransaccion } = transaccionModelInit(sequelize);
  
      const cuenta = await CuentaCorriente.findOne({
        where: { idEntidad, eliminado: false },
      });
  
      if (cuenta) {
        // Determinar qué operación usar según el flag
        let montoAjustado;
        if (idTipoTransaccion) {
          const tipoTransaccion = await TipoTransaccion.findByPk(idTipoTransaccion, {
            attributes: ["operacionCuentaCorriente", "operacionCaja"],
          });
          
          // Si usarOperacionCaja es true, usar operacionCaja; sino usar operacionCuentaCorriente
          const operacion = usarOperacionCaja 
            ? tipoTransaccion?.operacionCaja 
            : tipoTransaccion?.operacionCuentaCorriente;
          
          if (operacion) {
            // Usar la parametrización: "+" suma, "-" resta
            montoAjustado = operacion === "+" 
              ? Math.abs(monto) 
              : -Math.abs(monto);
          } else {
            return res.status(400).json({ 
              message: `Tipo de transacción no válido para cuenta corriente. operacion${usarOperacionCaja ? 'Caja' : 'CuentaCorriente'} no definida` 
            });
          }
        } else {
          return res.status(400).json({ 
            message: "idTipoTransaccion es requerido" 
          });
        }
        
        cuenta.saldo += montoAjustado;
        // Normalizar -0 a 0
        if (Object.is(cuenta.saldo, -0)) {
          cuenta.saldo = 0;
        }
        await cuenta.save();
        res.status(200).json(cuenta);
      } else {
        res.status(404).json({ message: "Cuenta corriente no encontrada" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al actualizar la cuenta corriente", error });
    }
  };
  
  const putTransaccion = async (req, res) => {
    const { id } = req.params;
    const { idUsuario, fechaHoraCreacion, ...otrosDatos } = req.body; // Extrae idUsuario y fechaHoraCreacion del body
  
    try {
      // Inicializa la conexión a la base de datos primero
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  
      // Carga los modelos con la conexión inicializada
      const { Usuario } = adminModelInit(sequelize);
      const { Transaccion } = transaccionModelInit(sequelize);
  
      // Verifica si el usuario existe o asigna null si es 0
      const usuarioValido =
        idUsuario && idUsuario > 0 ? await Usuario.findByPk(idUsuario) : null;
  
      if (idUsuario && !usuarioValido) {
        return res.status(400).json({ message: "Usuario no válido." });
      }
  
      // ✅ IMPORTANTE: Obtener la transacción existente para preservar fechaHoraCreacion
      const transaccionExistente = await Transaccion.findByPk(id);
      if (!transaccionExistente) {
        return res.status(404).json({ message: "Transacción no encontrada." });
      }
  
      // ✅ Preparar datos para actualización
      const datosActualizacion = {
        ...otrosDatos,
        idUsuario: usuarioValido ? idUsuario : null,
      };
  
      // ✅ PROTECCIÓN: Solo permitir actualizar fechaHoraCreacion si se envía explícitamente Y es una creación
      // En ediciones, SIEMPRE preservar la fechaHoraCreacion original
      // Esto evita que accidentalmente se sobrescriba la fecha de creación
      if (fechaHoraCreacion && !transaccionExistente.fechaHoraCreacion) {
        // Solo si la transacción no tiene fechaHoraCreacion (caso extremo)
        datosActualizacion.fechaHoraCreacion = fechaHoraCreacion;
      }
      // Si fechaHoraCreacion ya existe, NO la tocamos (preservar original)
  
      console.log(`📝 Actualizando transacción ${id}, preservando fechaHoraCreacion: ${transaccionExistente.fechaHoraCreacion}`);
  
      // Realiza la actualización
      const [updated] = await Transaccion.update(
        datosActualizacion,
        { where: { id: id } }
      );
  
      if (updated) {
        const transaccionActualizada = await Transaccion.findByPk(id);
        return res.status(200).json(transaccionActualizada);
      }
  
      return res.status(404).json({ message: "Transacción no encontrada." });
    } catch (error) {
      console.error("Error al actualizar la transacción:", error);
      return res
        .status(400)
        .json({ message: "Error al actualizar la transacción", error });
    }
  };
  
  // Obtener un transaccionItem por transaccionId y itemId
  const getTransaccionItemByTransactionAndItem = async (req, res) => {
    const { idTransaccion, idItem } = req.params;
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      const transaccionItem = await TransaccionItem.findOne({
        where: {
          idTransaccion: idTransaccion,
          idItem: idItem,
        },
      });
  
      if (!transaccionItem) {
        return res
          .status(404)
          .json({ message: "TransaccionItem no encontrado." });
      }
  
      res.status(200).json(transaccionItem);
    } catch (error) {
      console.error("Error al obtener transaccionItem:", error);
      res
        .status(500)
        .json({ message: "Error del servidor al obtener transaccionItem." });
    }
  };
  
  // Actualizar un transaccionItem
  const updateTransaccionItem = async (req, res) => {
    const { idTransaccion, idItem } = req.params; // Asegúrate de recibir ambos IDs en los parámetros
    const { cantidad, precio, porcentajeDescuento, porcentajeInteres } = req.body;
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
      const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize);
  
      // Buscar el registro de TransaccionItem con ambas claves primarias (incluyendo eliminados)
      const transaccionItem = await TransaccionItem.findOne({
        where: { idTransaccion, idItem },
      });
  
      if (!transaccionItem) {
        return res
          .status(404)
          .json({ message: "TransaccionItem no encontrado." });
      }
  
      // console.log(
      //   `cantidad: ${cantidad}, precio: ${precio}, porcentaje: ${porcentajeDescuento}`
      // );
  
      // Actualizar los campos deseados
      transaccionItem.cantidad = cantidad;
      transaccionItem.precio = precio;
      transaccionItem.porcentajeDescuento = porcentajeDescuento;
      if (porcentajeInteres !== undefined) {
        transaccionItem.porcentajeInteres = porcentajeInteres;
      }
      // ✅ Reactivar el item si estaba eliminado
      transaccionItem.eliminado = false;
  
      await transaccionItem.save(); // Guardar cambios en la base de datos
  
      res.status(200).json(transaccionItem);
    } catch (error) {
      console.error("Error al actualizar transaccionItem:", error);
      res
        .status(500)
        .json({ message: "Error del servidor al actualizar transaccionItem." });
    }
  };
  
  const updateDeleteTransaccion = async (req, res) => {
    const idTransaccion = req.params.id;
  
    try {
      // 1) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TransaccionItem,
        TransaccionPago,
        Pago,
        ImpuestoItemTransaccion,
        CuentaCorriente,
        TipoTransaccion,
        MedioDePago,
        TipoMedioDePago,
      } = transaccionModelInit(sequelize);
  
      // 2) Traer transacción con sus pagos y relaciones completas
      const trans = await Transaccion.findByPk(idTransaccion, {
        attributes: [
          "idTipoTransaccion",
          "idUbicacion",
          "idEntidad",
          "montoTotal",
          "afectaCuentaCorriente",
          "operacionParaCuentaCorriente",
        ],
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["operacionCuentaCorriente", "operacionCaja"],
          },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false,
            include: [
              {
                model: Pago,
                as: "pago",
                required: false,
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    required: false,
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        required: false,
                        attributes: ["id", "afectaCuentaCorriente"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
  
      if (!trans) {
        return res
          .status(404)
          .json({ message: "Transacción no encontrada o ya eliminada." });
      }
  
      const transData = trans.get({ plain: true });
      const {
        idTipoTransaccion,
        idUbicacion,
        idEntidad,
        montoTotal,
        afectaCuentaCorriente,
        tipoTransaccion,
        transaccionPago,
      } = transData;
      const esVenta = idTipoTransaccion === 1;
  
      // 3) Si es venta, obtenemos antes los detalles de item+ubicación+cantidad
      let itemsParaReponer = [];
      if (esVenta) {
        itemsParaReponer = await TransaccionItem.findAll({
          where: { idTransaccion, eliminado: false },
          attributes: ["idItem", "cantidad"],
          raw: true,
        });
      }
  
      // 4) Marcamos la transacción y sus detalles como eliminados
      await Transaccion.update(
        { eliminado: true },
        { where: { id: idTransaccion } }
      );
      await TransaccionItem.update(
        { eliminado: true },
        { where: { idTransaccion } }
      );
      await TransaccionPago.update(
        { eliminado: true },
        { where: { idTransaccion } }
      );
      await ImpuestoItemTransaccion.update(
        { eliminado: true },
        { where: { idTransaccion } }
      );
  
      // 5) Marcamos también cada Pago asociado
      const pagos = await TransaccionPago.findAll({
        where: { idTransaccion },
        attributes: ["idPago"],
        raw: true,
      });
      for (const { idPago } of pagos) {
        await Pago.update({ eliminado: true }, { where: { id: idPago } });
      }
  
      // 6) Si era venta, repone en ItemUbicacion
      if (esVenta && itemsParaReponer.length > 0) {
        const { ItemUbicacion } = itemModelInit(sequelize);
  
        for (const { idItem, cantidad } of itemsParaReponer) {
          // Cada transacción comparte la misma idUbicacion
          const registro = await ItemUbicacion.findOne({
            where: { idItem, idUbicacion },
          });
          if (registro) {
            // Sumamos la cantidad vendida
            const nuevoStock = (registro.inventario || 0) + cantidad;
            await registro.update({ inventario: nuevoStock });
          }
        }
      }
  
      // 6.b) Si era venta y hay lotes, reponer LoteItemUbicacion y marcar LoteTransaccion como eliminado
      if (esVenta && idUbicacion) {
        const { LoteTransaccion, LoteItemUbicacion } = itemModelInit(sequelize);
        
        const lotesTransaccion = await LoteTransaccion.findAll({
          where: {
            idTransaccion: parseInt(idTransaccion),
            eliminado: false,
          },
        });
  
        for (const lt of lotesTransaccion) {
          const loteItemUbicacion = await LoteItemUbicacion.findOne({
            where: {
              idLote: parseInt(lt.idLote),
              idUbicacion: parseInt(idUbicacion),
              eliminado: false,
            },
          });
  
          if (loteItemUbicacion) {
            const stockActual = parseFloat(loteItemUbicacion.stock || 0);
            const cantidadDevolver = parseFloat(lt.cantidad || 0);
            const nuevoStock = stockActual + cantidadDevolver;
            await loteItemUbicacion.update({ stock: nuevoStock });
          }
  
          await lt.update({ eliminado: true });
        }
      }
  
      // 7) Ajustar saldo en cuenta corriente
      if (idEntidad && tipoTransaccion) {
        let montoAjuste = 0;
  
        // CASO 1: Si la transacción tiene afectaCuentaCorriente = true
        // El flag de la transacción gobierna todo, usa el montoTotal completo
        if (afectaCuentaCorriente === true) {
          // Leer el campo que indica qué operación se usó al crear
          const operacionParaCC = transData.operacionParaCuentaCorriente;
          
          let operacionOriginal;
          if (operacionParaCC === 'operacionCaja' && tipoTransaccion.operacionCaja) {
            // Usar operacionCaja (transacción creada desde TablaCuentaCorriente)
            operacionOriginal = tipoTransaccion.operacionCaja;
          } else {
            // Usar operacionCuentaCorriente (comportamiento normal o default)
            operacionOriginal = tipoTransaccion.operacionCuentaCorriente;
          }
          
          // Invertir la operación: si sumaba (+), ahora restamos; si restaba (-), ahora sumamos
          montoAjuste = operacionOriginal === "-" 
            ? Math.abs(montoTotal || 0) 
            : -Math.abs(montoTotal || 0);
        } 
        // CASO 2: Si la transacción NO tiene el flag, revisar pagos individuales
        else {
          // Filtrar pagos que afectan cuenta corriente y sumar sus montos
          let montoTotalAfectaCC = 0;
          
          if (transaccionPago && Array.isArray(transaccionPago)) {
            // Procesar cada pago
            for (let index = 0; index < transaccionPago.length; index++) {
              const tp = transaccionPago[index];
              const pago = tp.pago;
              
              // Intentar obtener afectaCuentaCorriente del include primero
              let afecta = pago?.medioDePago?.tipoMedioDePago?.afectaCuentaCorriente;
              
              // Si no está disponible en el include, cargarlo directamente desde la BD
              if (afecta === undefined && pago?.medioDePago?.idTipoMedioDePago) {
                const tipoMedioDePago = await TipoMedioDePago.findByPk(
                  pago.medioDePago.idTipoMedioDePago,
                  { attributes: ["id", "afectaCuentaCorriente"] }
                );
                if (tipoMedioDePago) {
                  afecta = tipoMedioDePago.afectaCuentaCorriente;
                }
              }
              
              if (afecta === true) {
                montoTotalAfectaCC += pago.montoTotal || 0;
              }
            }
          }
  
          // Si hay monto que afecta CC, ajustar según operación del tipo transacción
          if (montoTotalAfectaCC > 0) {
            const operacionOriginal = tipoTransaccion.operacionCuentaCorriente;
            // Invertir la operación: si sumaba (+), ahora restamos; si restaba (-), ahora sumamos
            montoAjuste = operacionOriginal === "-" 
              ? Math.abs(montoTotalAfectaCC) 
              : -Math.abs(montoTotalAfectaCC);
          }
        }
  
        // Aplicar el ajuste si hay monto que afecta cuenta corriente
        if (montoAjuste !== 0) {
          const cuenta = await CuentaCorriente.findOne({
            where: { idEntidad },
          });
  
          if (cuenta) {
            const saldoActual = cuenta.saldo || 0;
            const nuevoSaldo = saldoActual + montoAjuste;
            // Normalizar -0 a 0
            const saldoNormalizado = Object.is(nuevoSaldo, -0) ? 0 : nuevoSaldo;
            await cuenta.update({ saldo: saldoNormalizado });
          }
        }
      }
  
      return res.json({
        message:
          "Transacción eliminada y, si era venta, el inventario ha sido repuesto.",
      });
    } catch (error) {
      console.error("Error en updateDeleteTransaccion:", error);
      return res.status(500).json({
        message: "Error eliminando transacción y actualizando stock",
        error: error.message || error,
      });
    }
  };
  
  // Obtener auditoría de eliminación de una transacción
  const getTransaccionAuditoria = async (req, res) => {
    const { idTransaccion } = req.params;
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionAuditoria } = transaccionModelInit(sequelize);
      const { Usuario } = adminModelInit(sequelize);
  
      // Buscar la auditoría de eliminación más reciente
      const auditoria = await TransaccionAuditoria.findOne({
        where: {
          idTransaccion: idTransaccion,
          accion: "eliminar",
        },
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["usuario", "id"],
          },
        ],
        order: [["id", "DESC"]],
        limit: 1,
      });
  
      if (!auditoria) {
        return res.status(200).json({
          message: "No se encontró auditoría de eliminación para esta transacción",
          data: null,
        });
      }
  
      return res.json({
        message: "Auditoría obtenida correctamente",
        data: auditoria,
      });
    } catch (error) {
      // console.error("Error en getTransaccionAuditoria:", error);
      return res.status(500).json({
        message: "Error al obtener registro de auditoría",
        error: error.message || error,
      });
    }
  };
  
  // Crear registro de auditoría para transacciones
  const postTransaccionAuditoria = async (req, res) => {
    const { idTransaccion, idUsuario, comentario, accion } = req.body;
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionAuditoria } = transaccionModelInit(sequelize);
  
      // Validar campos requeridos
      if (!idTransaccion || !idUsuario || !accion) {
        return res.status(400).json({
          message: "Faltan campos requeridos: idTransaccion, idUsuario, accion",
        });
      }
  
      // Crear el registro de auditoría
      const auditoria = await TransaccionAuditoria.create({
        idTransaccion,
        idUsuario,
        comentario: comentario || null,
        accion: accion || "eliminar",
      });
  
      return res.json({
        message: "Registro de auditoría creado correctamente",
        data: auditoria,
      });
    } catch (error) {
      // console.error("Error en postTransaccionAuditoria:", error);
      return res.status(500).json({
        message: "Error al crear registro de auditoría",
        error: error.message || error,
      });
    }
  };
  
  const updateTransaccionPago = async (req, res) => {
    const { idTransaccion, idMedioDePago, montoTotal } = req.body; // ← aquí
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionPago, Pago } = transaccionModelInit(sequelize);
  
      // Busco los pagos de esa transacción
      const pagos = await TransaccionPago.findAll({
        where: { idTransaccion },
        attributes: ["idPago"],
        raw: true,
      });
  
      // Actualizo cada Pago
      for (const { idPago } of pagos) {
        await Pago.update(
          { idMedioDePago, montoTotal },
          { where: { id: idPago } }
        );
      }
  
      return res.json({ success: true, updatedCount: pagos.length });
    } catch (error) {
      console.error("Error al actualizar transaccionPago:", error);
      return res
        .status(500)
        .json({ message: "Error del servidor al actualizar transaccionPago." });
    }
  };
  
  // Actualizar un TransaccionItem: solo se actualiza la columna 'eliminado' a true
  const deleteTransaccionItem = async (req, res) => {
    const { idTransaccion, idItem } = req.params;
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      // Actualizamos el campo eliminado a true para la combinación de idTransaccion e idItem
      await TransaccionItem.update(
        { eliminado: true },
        { where: { idTransaccion, idItem } }
      );
  
      return res.json({
        message: "TransaccionItem actualizado (eliminado: true) correctamente.",
      });
    } catch (error) {
      console.error("Error en deleteTransaccionItem:", error);
      return res.status(500).json({
        message: "Error eliminando TransaccionItem",
        error: error.message,
      });
    }
  };
  
  // Eliminar lógicamente TransaccionPago: marca como eliminado todos los pagos de una transacción
  const deleteTransaccionPago = async (req, res) => {
    const { idTransaccion } = req.params;
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionPago, Pago } = transaccionModelInit(sequelize);
  
      // 1️⃣ Obtener todos los TransaccionPago con sus idPago
      const transaccionPagos = await TransaccionPago.findAll({
        where: { idTransaccion, eliminado: false },
        attributes: ['idTransaccion', 'idPago']  // ✅ Clave compuesta: no existe columna 'id'
      });
  
      if (transaccionPagos.length === 0) {
        console.log(`⚠️ No se encontraron TransaccionPago activos para idTransaccion: ${idTransaccion}`);
        return res.status(200).json({ 
          message: "No se encontraron registros de TransaccionPago activos para esta transacción",
          affectedTransaccionPagos: 0,
          affectedPagos: 0
        });
      }
  
      // 2️⃣ Extraer los idPago para eliminarlos también
      const idsPago = transaccionPagos.map(tp => tp.idPago);
  
      // 3️⃣ Marcar TransaccionPago como eliminados
      const [affectedTransaccionPagos] = await TransaccionPago.update(
        { eliminado: true },
        { where: { idTransaccion } }
      );
  
      // 4️⃣ Marcar los Pago asociados como eliminados
      const [affectedPagos] = await Pago.update(
        { eliminado: true },
        { where: { id: idsPago } }
      );
  
      console.log(`✅ ${affectedTransaccionPagos} TransaccionPago y ${affectedPagos} Pago marcados como eliminados para idTransaccion: ${idTransaccion}`);
      
      return res.json({
        message: "TransaccionPago y Pago marcados como eliminados correctamente",
        affectedTransaccionPagos,
        affectedPagos
      });
    } catch (error) {
      console.error("❌ Error en deleteTransaccionPago:", error);
      return res.status(500).json({
        message: "Error al eliminar TransaccionPago y Pago",
        error: error.message,
      });
    }
  };
  
  const deleteTransaccionCompraItem = async (req, res) => {
    const { idTransaccion, idItem } = req.params;
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionCompraItem } = transaccionModelInit(sequelize);
  
      // Buscamos todos los registros que corresponden a la transacción y el ítem
      const items = await TransaccionCompraItem.findAll({
        where: { idTransaccion, idItem },
      });
  
      if (!items || items.length === 0) {
        return res
          .status(404)
          .json({ message: "No se encontraron registros para eliminar." });
      }
  
      // Para cada registro encontrado, se actualiza el campo 'eliminado' a true
      for (const item of items) {
        await item.update({ eliminado: true });
      }
  
      return res.json({
        message:
          "TransaccionCompraItems eliminados (actualizados a eliminado: true) correctamente.",
      });
    } catch (error) {
      console.error("Error en deleteTransaccionCompraItem:", error);
      return res.status(500).json({
        message: "Error eliminando TransaccionCompraItems",
        error: error.message,
      });
    }
  };
  
  const updateTransaccionCompraEstado = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionCompraEstado } = transaccionModelInit(sequelize);
  
      const { idTransaccion, idEstado } = req.body;
  
      const registro = await TransaccionCompraEstado.findOne({
        where: { idTransaccion },
      });
  
      if (registro) {
        registro.idEstado = idEstado; // Actualizamos el campo idEstado
        // Si existe, actualizamos el campo idEstado.
        await registro.save();
        return res
          .status(200)
          .json({ message: "Estado actualizado correctamente", registro });
      } else {
        //Este caso es raro de que suceda. Pero podria pasar en una falla de logicas a la hora del post. Dudo que pase.
        const nuevoRegistro = await TransaccionCompraEstado.create({
          idTransaccion,
          idEstado,
          eliminado: false,
        });
        return res
          .status(201)
          .json({ message: "Registro creado", registro: nuevoRegistro });
      }
    } catch (error) {
      console.error("Error al actualizar estado de compra:", error);
      return res
        .status(500)
        .json({ message: "Error al actualizar estado de compra", error });
    }
  };
  
  // Controlador para eliminar un transaccionItem
  const deleteTransaccionItemsNotInList = async (req, res) => {
    try {
      const { idTransaccion } = req.params;
      const { idItems } = req.body;
  
      if (!idItems || !Array.isArray(idItems)) {
        return res
          .status(400)
          .json({ message: "Debe proporcionar un array de idItems." });
      }
  
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      await TransaccionItem.destroy({
        where: {
          idTransaccion,
          idItem: { [Op.notIn]: idItems },
        },
      });
  
      res
        .status(200)
        .json({ message: "TransaccionItems eliminados exitosamente." });
    } catch (error) {
      console.error("Error eliminando transaccionItems:", error);
      res.status(500).json({ message: "Error eliminando transaccionItems." });
    }
  };
  
  // Controlador para obtener transaccionItems por idTransaccion
  const getTransaccionItemsByTransactionId = async (req, res) => {
    try {
      const { idTransaccion } = req.params;
  
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      // Obtener los transaccionItems asociados al idTransaccion
      const transaccionItems = await TransaccionItem.findAll({
        where: { idTransaccion },
      });
  
      if (!transaccionItems.length) {
        return res.status(404).json({
          message: "No se encontraron transaccionItems para esta transacción.",
        });
      }
  
      res.status(200).json(transaccionItems);
    } catch (error) {
      console.error("Error obteniendo transaccionItems:", error);
      res.status(500).json({ message: "Error al obtener transaccionItems." });
    }
  };
  
  // Obtener transacciones
  const getTransaccion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion } = transaccionModelInit(sequelize);
  
      const transaccion = await Transaccion.findAll();
      res.status(200).json(transaccion);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  const getTransaccionMontoTotalByTipoTransaccion = async (req, res) => {
    try {
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion } = transaccionModelInit(sequelize);
  
      // Leer el parámetro desde req.params
      const { idTipoTransaccion } = req.params;
  
      // Usamos la función max para obtener el máximo valor de montoTotal
      const maxMonto = await Transaccion.max("montoTotal", {
        where: {
          idTipoTransaccion: idTipoTransaccion,
        },
      });
  
      res.status(200).json({ maxMonto });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener el monto máximo", error });
    }
  };
  
  const getTransaccionFilter = async (req, res) => {
    const { idTransaccion } = req.params;
    // console.log("ID de transacción recibido:", idTransaccion);
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, TransaccionPago, Pago, MedioDePago, TipoMedioDePago, TipoTransaccion } =
        transaccionModelInit(sequelize);
  
      const transaccionFilter = await Transaccion.findOne({
        where: { id: idTransaccion },
        include: [
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion", "id", "afectaCuentaCorriente"], // ✅ Incluir afectaCuentaCorriente
                      },
                    ],
                    attributes: ["descripcion", "id", "idTipoMedioDePago"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion", "id"],
              },
            ],
          },
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["id", "descripcion", "operacionCuentaCorriente", "operacionCaja"],
          },
        ],
      });
      if (!transaccionFilter) {
        // console.log("Transacción no encontrada.");
        return res.status(404).json({ message: "Transacción no encontrada" });
      }
      res.status(200).json(transaccionFilter);
    } catch (error) {
      console.error("Error en la consulta de transacción:", error);
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  const getTransaccionTransformedVentas = async (req, res) => {
    const { tipoTransaccion } = req.params;
    const {
      fecha,
      page = 1, // Página por defecto 1
      limit = 100, // Límite por defecto 100
      formattedDate2, // Fecha hasta (opcional)
      dniCliente, // ID de la entidad cliente (opcional)
      selectedUbicacion, // ID de la ubicación (opcional)
      valorMin,
      valorMax, // Rango para filtrar (opcional)
      mostrarEliminados, // Mostrar eliminados (opcional)
      idTransaccionSearch, //buscar por id de la transaccion (opcional)
      traerDevolucion,
      buscarCAE,
      tipoTransaccionFiltro,
      canalEntidad, // ID del canal de entidad (opcional)
      soloFacturadas, // Filtrar solo ventas facturadas (opcional)
      idTipoMedioPago, // ID del tipo de medio de pago (opcional)
      idMedioPago, // ID del medio de pago (opcional)
      atributoEntidad1, // Filtro por atributo 1 de entidad (opcional)
      atributoEntidad2, // Filtro por atributo 2 de entidad (opcional)
      atributoEntidad3, // Filtro por atributo 3 de entidad (opcional)
      atributoEntidad4, // Filtro por atributo 4 de entidad (opcional)
      atributoEntidad5, // Filtro por atributo 5 de entidad (opcional)
      atributoEntidad6, // Filtro por atributo 6 de entidad (opcional)
      atributoEntidad7, // Filtro por atributo 7 de entidad (opcional)
      atributoEntidad8, // Filtro por atributo 8 de entidad (opcional)
      atributoEntidad9, // Filtro por atributo 9 de entidad (opcional)
      atributoEntidad10, // Filtro por atributo 10 de entidad (opcional)
    } = req.query;
  
  
  
    // ✅ Asegurar que `page` y `limit` sean valores numéricos válidos
    const pageNumber = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 100;
    const offset = (pageNumber - 1) * pageLimit; // Cálculo del offset correcto
  
    // ✅ Convertir mostrarEliminados a boolean (viene como string desde query)
    const mostrarEliminadosBool = mostrarEliminados === 'true' || mostrarEliminados === true;
  
    try {
      // ✅ Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionTipoFactura,
        TipoFactura,
        TransaccionAuditoria,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, CanalEntidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // console.log("Ejecutando consulta de transacciones paginadas...");
      // console.log("es true o false", mostrarEliminados);
      // ✅ Formateo correcto de fechas
      // ✅ Formateo correcto de fechas
      // const fechaInicio = `${fecha} 00:00:00`;
      // const fechaFin = formattedDate2
      //   ? `${formattedDate2} 23:59:59`
      //   : `${fecha} 23:59:59`;
  
      const fechaInicio = fecha;
      const fechaFin = formattedDate2;
  
      const tipos = [Number(tipoTransaccion)];
  
      let whereClause = {
        eliminado: mostrarEliminadosBool,
        fechaHoraCreacion: { [Op.between]: [fechaInicio, fechaFin] },
      };
  
      // Agregamos el filtro solo si no es "todos"
  if (tipoTransaccionFiltro === "ventas") {
    whereClause.idTipoTransaccion = 1;
  } else if (tipoTransaccionFiltro === "devoluciones") {
    whereClause.idTipoTransaccion = 6;
  }
  else {
    whereClause.idTipoTransaccion = { [Op.in]: tipos };
  }
  
      let whereCAE = {};
  
      // ✅ Filtros opcionales
      if (dniCliente) whereClause.idEntidad = dniCliente;
      if (selectedUbicacion) whereClause.idUbicacion = selectedUbicacion;
      if (
        valorMin &&
        valorMax &&
        valorMin != valorMax &&
        (valorMin != 0 || valorMax != 0)
      ) {
        whereClause.montoTotal = {
          [Op.between]: [parseFloat(valorMin), parseFloat(valorMax)],
        };
      }
  
      appendIdSubstringFilter(whereClause, idTransaccionSearch, "Transaccion", "id");
  
      if (buscarCAE != "") {
        whereCAE.CAE = buscarCAE;
      }
  
      // console.log("buscarCAE ", buscarCAE);
  
      // ✅ Configurar filtros para MedioDePago usando subquery
      if (idMedioPago || idTipoMedioPago) {
        const subQueryIncludes = [];
        const subQueryWhere = {};
        
        // Include de Pago
        const pagoInclude = {
          model: Pago,
          as: "pago",
          required: true,
          attributes: [],
          include: []
        };
        
        // Include de MedioDePago
        const medioDePagoInclude = {
          model: MedioDePago,
          as: "medioDePago",
          required: true,
          attributes: [],
          include: []
        };
        
        if (idMedioPago) {
          medioDePagoInclude.where = { id: Number(idMedioPago) };
        }
        
        // Include de TipoMedioDePago si es necesario
        if (idTipoMedioPago) {
          medioDePagoInclude.include.push({
            model: TipoMedioDePago,
            as: "tipoMedioDePago",
            required: true,
            attributes: [],
            where: { id: Number(idTipoMedioPago) }
          });
        }
        
        pagoInclude.include.push(medioDePagoInclude);
        
        // Agregar subquery al whereClause
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push(
          sequelize.literal(`EXISTS (
            SELECT 1 FROM "transaccionPago" tp
            INNER JOIN "pago" p ON tp."idPago" = p.id
            INNER JOIN "medioDePago" mp ON p."idMedioDePago" = mp.id
            ${idTipoMedioPago ? 'INNER JOIN "tipoMedioDePago" tmp ON mp."idTipoMedioDePago" = tmp.id' : ''}
            WHERE tp."idTransaccion" = "Transaccion".id
            ${idMedioPago ? `AND mp.id = ${Number(idMedioPago)}` : ''}
            ${idTipoMedioPago ? `AND tmp.id = ${Number(idTipoMedioPago)}` : ''}
          )`)
        );
      }
  
      // ✅ Obtener la suma total de `montoTotal` en todas las transacciones filtradas (sin paginación)
      const totalMontoVentas =
        (await Transaccion.sum("montoTotal", { where: whereClause })) || 0;
  
      if (traerDevolucion === "traerDevolucion") {
        tipos.push(6);
      }
  
      // ✅ Contar total de transacciones antes de aplicar paginación
      const countOptions = { 
        where: whereClause,
        distinct: true,
      };
      
      // Si se filtra por solo facturadas, incluir la relación en el conteo
      if (soloFacturadas === 'true' || soloFacturadas === true) {
        countOptions.include = [
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: true,
          }
        ];
      }
      
      const totalCount = await Transaccion.count(countOptions);
  
      // ✅ Obtener transacciones paginadas (solo la página actual)
      const transacciones = await Transaccion.findAll({
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
          "transaccionAsociada",
          "eliminado", // 🔒 Incluir campo eliminado para el frontend
        ],
        where: whereClause,
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",              // <-- aseguremos id
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
             "idCanal",         // <-- CLAVE: incluir la FK usada para joinear con canalEntidad
              "entidadDatoAtributo1",  // <-- CLAVE: incluir las FKs para los LEFT JOINs
              "entidadDatoAtributo2",
              "entidadDatoAtributo3",
              "entidadDatoAtributo4",
              "entidadDatoAtributo5",
              "entidadDatoAtributo6",
              "entidadDatoAtributo7",
              "entidadDatoAtributo8",
              "entidadDatoAtributo9",
              "entidadDatoAtributo10"
            ],
            where: {
              ...(atributoEntidad1 && { entidadDatoAtributo1: Number(atributoEntidad1) }),
              ...(atributoEntidad2 && { entidadDatoAtributo2: Number(atributoEntidad2) }),
              ...(atributoEntidad3 && { entidadDatoAtributo3: Number(atributoEntidad3) }),
              ...(atributoEntidad4 && { entidadDatoAtributo4: Number(atributoEntidad4) }),
              ...(atributoEntidad5 && { entidadDatoAtributo5: Number(atributoEntidad5) }),
              ...(atributoEntidad6 && { entidadDatoAtributo6: Number(atributoEntidad6) }),
              ...(atributoEntidad7 && { entidadDatoAtributo7: Number(atributoEntidad7) }),
              ...(atributoEntidad8 && { entidadDatoAtributo8: Number(atributoEntidad8) }),
              ...(atributoEntidad9 && { entidadDatoAtributo9: Number(atributoEntidad9) }),
              ...(atributoEntidad10 && { entidadDatoAtributo10: Number(atributoEntidad10) }),
            },
            include: [
              {
                model: CanalEntidad,
                as: "canalEntidad",
                required: !!canalEntidad,                     // inner join solo si filtrás
                attributes: ["id", "descripcion"],
                ...(canalEntidad && { where: { id: Number(canalEntidad) } })
              },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
            ]
          },
          { model: Usuario, as: "usuario", attributes: ["usuario"] },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion", "id"],
          },
          { model: Negocio, as: "negocio", attributes: ["descripcion"] },
          // Include de auditoría para obtener el usuario que eliminó (solo cuando se muestran eliminados)
          ...(mostrarEliminadosBool ? [{
            model: TransaccionAuditoria,
            as: "auditorias",
            required: false,
            where: { accion: "eliminar" },
            attributes: ["id", "idTransaccion", "idUsuario", "comentario", "accion"],
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: ["usuario", "id"],
              }
            ],
            limit: 1,
            order: [["id", "DESC"]],
          }] : []),
          {
            model: TransaccionPago,
            as: "transaccionPago",
            // ✅ Si mostrarEliminados es true, traer TODOS los pagos (sin filtro)
            // Si es false, traer solo los NO eliminados
            ...(mostrarEliminadosBool ? {} : { where: { eliminado: false } }),
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: Boolean(buscarCAE) || (soloFacturadas === 'true' || soloFacturadas === true),
            attributes: ["CAE", "vencimientoCAE", "idTipoFactura", "numeroFactura", "puntoVenta", "fechaEmision"],
            include: [
              {
                model: TipoFactura,
                as: "tipoFactura",
                attributes: ["descripcion"],
              },
            ],
            ...(buscarCAE ? { where: { CAE: buscarCAE } } : {}),
          },
        ],
        limit: pageLimit,
        offset,
        distinct: true, // Evita duplicados por los includes
        order: [["fechaHoraCreacion", "DESC"]],
      });
  
      // ✅ Obtener impuestos relacionados con transacciones
      const transaccionImpuestos = await TransaccionImpuesto.findAll({
        include: [
          {
            model: Impuesto,
            as: "impuesto",
            attributes: ["descripcion", "incluidoEnPrecio"],
          },
        ],
      });
  
      // ✅ Mapear transacciones y agregar impuestos
      const result = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
  
        // Obtener impuestos relacionados con la transacción
        const impuestosRelacionados = transaccionImpuestos
          .filter((imp) => imp.idTransaccion === transaccionData.id)
          .map((imp) => ({
            idImpuesto: imp.idImpuesto,
            porcentaje: imp.porcentaje,
            montoTotal: imp.montoTotal,
            incluidoEnPrecio: imp.impuesto?.incluidoEnPrecio,
            descripcion: imp.impuesto?.descripcion || "",
          }));
  
        // Descripción de impuestos concatenada
        const descripcionImpuestos = impuestosRelacionados
          .map(
            (imp) =>
              `${imp.descripcion} (${
                imp.porcentaje
              }%): $${imp.montoTotal?.toLocaleString("es-AR")}`
          )
          .join("; ");
  
        // Transformar pagos
        // console.log("transaccionData.transaccionPago ", transaccionData.transaccionPago)
        const pagosTransformados = transaccionData.transaccionPago.map((tp) => {
          const pago = tp.pago || {};
          return {
            montoTotal: pago.montoTotal || 0,
            cotizacion: pago.cotizacion || 1,
            medioDePago: pago.medioDePago?.descripcion || "",
            id: pago.medioDePago?.id || "",
            tipoMedio: pago.medioDePago?.tipoMedioDePago?.descripcion || "",
          };
        });
  
        // Extraer descripción del tipo de factura si existe
        const tipoFacturaDescripcion =
          transaccionData.transaccionTipoFactura?.tipoFactura?.descripcion || "";
  
          const idTipoFacturaTransaccion =
          transaccionData.transaccionTipoFactura?.idTipoFactura || "";
  
           // Obtener el usuario que eliminó la transacción (si existe)
        // console.log("transaccionData.auditorias ", transaccionData.auditorias)
        const usuarioElimino = 
        transaccionData.auditorias && transaccionData.auditorias.length > 0 && transaccionData.auditorias[0].usuario
          ? transaccionData.auditorias[0].usuario.usuario
          : null;
  
        return {
          ...transaccionData,
          tipoFacturaDescripcion,
          idTipoFacturaTransaccion,
          pagos: pagosTransformados,
          tipoPago: pagosTransformados.length > 1 ? "Múltiple" : "Individual",
          impuestos: impuestosRelacionados,
          descripcionImpuestos,
          usuarioElimino, // Usuario que eliminó la transacción
        };
      });
  
      // ✅ Calcular total de páginas y enviar respuesta
      res.status(200).json({
        total: totalCount,
        totalMontoVentas, // ✅ Nueva variable con la suma de todas las ventas filtradas
        totalPages: Math.ceil(totalCount / pageLimit),
        currentPage: pageNumber,
        data: result,
      });
    } catch (error) {
      console.error("Error en getTransaccionTransformedVentas:", error);
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  // Nueva función sin paginado para las gráficas
  const getTransaccionTransformedVentasAllData = async (req, res) => {
    const { tipoTransaccion } = req.params;
    const {
      fecha,
      formattedDate2, // Fecha hasta (opcional)
      dniCliente, // ID de la entidad cliente (opcional)
      selectedUbicacion, // ID de la ubicación (opcional)
      valorMin,
      valorMax, // Rango para filtrar (opcional)
      mostrarEliminados, // Mostrar eliminados (opcional)
      idTransaccionSearch, //buscar por id de la transaccion (opcional)
      traerDevolucion,
      buscarCAE,
      tipoTransaccionFiltro,
      canalEntidad, // ID del canal de entidad (opcional)
      atributoEntidad1,
      atributoEntidad2,
      atributoEntidad3,
      atributoEntidad4,
      atributoEntidad5,
      atributoEntidad6,
      atributoEntidad7,
      atributoEntidad8,
      atributoEntidad9,
      atributoEntidad10,
    } = req.query;
  
    try {
      // ✅ Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionTipoFactura,
        TipoFactura,
        TransaccionAuditoria,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, CanalEntidad, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // console.log("Ejecutando consulta de transacciones SIN PAGINADO para gráficas...");
      // console.log("es true o false", mostrarEliminados);
  
      const fechaInicio = fecha;
      const fechaFin = formattedDate2;
  
      const tipos = [Number(tipoTransaccion)];
  
      let whereClause = {
        eliminado: mostrarEliminados,
        fechaHoraCreacion: { [Op.between]: [fechaInicio, fechaFin] },
      };
  
      // Agregamos el filtro solo si no es "todos"
      if (tipoTransaccionFiltro === "ventas") {
        whereClause.idTipoTransaccion = 1;
      } else if (tipoTransaccionFiltro === "devoluciones") {
        whereClause.idTipoTransaccion = 6;
      } else {
        whereClause.idTipoTransaccion = { [Op.in]: tipos };
      }
  
      let whereCAE = {};
  
      // ✅ Filtros opcionales (con validación para evitar 'null' strings)
      if (dniCliente && dniCliente !== 'null' && dniCliente !== '') {
        whereClause.idEntidad = dniCliente;
      }
      if (selectedUbicacion && selectedUbicacion !== 'null' && selectedUbicacion !== '') {
        whereClause.idUbicacion = selectedUbicacion;
      }
   
      if (
        valorMin &&
        valorMax &&
        valorMin !== 'null' &&
        valorMax !== 'null' &&
        valorMin != valorMax &&
        (valorMin != 0 || valorMax != 0)
      ) {
        whereClause.montoTotal = {
          [Op.between]: [parseFloat(valorMin), parseFloat(valorMax)],
        };
      }
  
      appendIdSubstringFilter(whereClause, idTransaccionSearch, "Transaccion", "id");
  
      if (buscarCAE && buscarCAE !== "" && buscarCAE !== 'null') {
        whereCAE.CAE = buscarCAE;
      }
  
      // console.log("buscarCAE ", buscarCAE);
  
      // ✅ Obtener la suma total de `montoTotal` en todas las transacciones filtradas
      const totalMontoVentas =
        (await Transaccion.sum("montoTotal", { where: whereClause })) || 0;
  
      if (traerDevolucion === "traerDevolucion") {
        tipos.push(6);
      }
  
      // ✅ Contar total de transacciones
      const totalCount = await Transaccion.count({ where: whereClause });
  
      // ✅ Obtener TODAS las transacciones filtradas (SIN PAGINADO)
      const transacciones = await Transaccion.findAll({
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
          "transaccionAsociada",
        ],
        where: whereClause,
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
              "idCanal",
              "entidadDatoAtributo1",
              "entidadDatoAtributo2",
              "entidadDatoAtributo3",
              "entidadDatoAtributo4",
              "entidadDatoAtributo5",
              "entidadDatoAtributo6",
              "entidadDatoAtributo7",
              "entidadDatoAtributo8",
              "entidadDatoAtributo9",
              "entidadDatoAtributo10",
            ],
            where: {
              ...(canalEntidad && canalEntidad !== "null" && { idCanal: Number(canalEntidad) }),
              ...(atributoEntidad1 && atributoEntidad1 !== "null" && { entidadDatoAtributo1: Number(atributoEntidad1) }),
              ...(atributoEntidad2 && atributoEntidad2 !== "null" && { entidadDatoAtributo2: Number(atributoEntidad2) }),
              ...(atributoEntidad3 && atributoEntidad3 !== "null" && { entidadDatoAtributo3: Number(atributoEntidad3) }),
              ...(atributoEntidad4 && atributoEntidad4 !== "null" && { entidadDatoAtributo4: Number(atributoEntidad4) }),
              ...(atributoEntidad5 && atributoEntidad5 !== "null" && { entidadDatoAtributo5: Number(atributoEntidad5) }),
              ...(atributoEntidad6 && atributoEntidad6 !== "null" && { entidadDatoAtributo6: Number(atributoEntidad6) }),
              ...(atributoEntidad7 && atributoEntidad7 !== "null" && { entidadDatoAtributo7: Number(atributoEntidad7) }),
              ...(atributoEntidad8 && atributoEntidad8 !== "null" && { entidadDatoAtributo8: Number(atributoEntidad8) }),
              ...(atributoEntidad9 && atributoEntidad9 !== "null" && { entidadDatoAtributo9: Number(atributoEntidad9) }),
              ...(atributoEntidad10 && atributoEntidad10 !== "null" && { entidadDatoAtributo10: Number(atributoEntidad10) }),
            },
              include: [
                {
                  model: CanalEntidad,
                  as: "canalEntidad",
                  required: false,
                  attributes: ["id", "descripcion"]
              },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
              ],
          },
          { model: Usuario, as: "usuario", attributes: ["usuario"] },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion", "id"],
          },
          { model: Negocio, as: "negocio", attributes: ["descripcion"] },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: Boolean(buscarCAE),
            attributes: ["CAE", "vencimientoCAE", "idTipoFactura", "numeroFactura", "puntoVenta", "fechaEmision"],
            include: [
              {
                model: TipoFactura,
                as: "tipoFactura",
                attributes: ["descripcion"],
              },
            ],
            ...(buscarCAE ? { where: { CAE: buscarCAE } } : {}),
          },
        ],
        // ✅ SIN limit ni offset - traemos todos los datos
        distinct: true, // Evita duplicados por los includes
        order: [["id", "DESC"]],
      });
  
      // ✅ Obtener impuestos relacionados con transacciones
      const transaccionImpuestos = await TransaccionImpuesto.findAll({
        include: [
          {
            model: Impuesto,
            as: "impuesto",
            attributes: ["descripcion", "incluidoEnPrecio"],
          },
        ],
      });
  
      // ✅ Mapear transacciones y agregar impuestos
      const result = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
  
        // Obtener impuestos relacionados con la transacción
        const impuestosRelacionados = transaccionImpuestos
          .filter((imp) => imp.idTransaccion === transaccionData.id)
          .map((imp) => ({
            idImpuesto: imp.idImpuesto,
            porcentaje: imp.porcentaje,
            montoTotal: imp.montoTotal,
            incluidoEnPrecio: imp.impuesto?.incluidoEnPrecio,
            descripcion: imp.impuesto?.descripcion || "",
          }));
  
        // Descripción de impuestos concatenada
        const descripcionImpuestos = impuestosRelacionados
          .map(
            (imp) =>
              `${imp.descripcion} (${
                imp.porcentaje
              }%): $${imp.montoTotal?.toLocaleString("es-AR")}`
          )
          .join("; ");
  
        // Transformar pagos
        const pagosTransformados = transaccionData.transaccionPago.map((tp) => {
          const pago = tp.pago || {};
          return {
            montoTotal: pago.montoTotal || 0,
            cotizacion: pago.cotizacion || 1,
            medioDePago: pago.medioDePago?.descripcion || "",
            id: pago.medioDePago?.id || "",
            tipoMedio: pago.medioDePago?.tipoMedioDePago?.descripcion || "",
          };
        });
  
        // Extraer descripción del tipo de factura si existe
        const tipoFacturaDescripcion =
          transaccionData.transaccionTipoFactura?.tipoFactura?.descripcion || "";
  
        const idTipoFacturaTransaccion =
          transaccionData.transaccionTipoFactura?.idTipoFactura || "";
  
        return {
          ...transaccionData,
          tipoFacturaDescripcion,
          idTipoFacturaTransaccion,
          pagos: pagosTransformados,
          tipoPago: pagosTransformados.length > 1 ? "Múltiple" : "Individual",
          impuestos: impuestosRelacionados,
          descripcionImpuestos,
        };
      });
  
      // ✅ Respuesta sin paginado
      res.status(200).json({
        total: totalCount,
        totalMontoVentas,
        data: result, // Todos los datos filtrados
      });
    } catch (error) {
      console.error("Error en getTransaccionTransformedVentasAllData:", error);
      res.status(500).json({ message: "Error al obtener transacciones para gráficas", error });
    }
  };
  
  const getTransaccionTransformedCompras = async (req, res) => {
    const { tipoTransaccion } = req.params;
    const {
      startDate,
      endDate,
      page = "1",
      limit = "100",
      idProveedor,
      idUbicacion,
      valorMin,
      valorMax,
      idEstado, // nuevo parámetro de filtro
      mostrarDeletes,
      idTransaccionSearch,
      atributoEntidad1,
      atributoEntidad2,
      atributoEntidad3,
      atributoEntidad4,
      atributoEntidad5,
      atributoEntidad6,
      atributoEntidad7,
      atributoEntidad8,
      atributoEntidad9,
      atributoEntidad10,
    } = req.query;
  
    const numericPage = Number(page);
    const numericLimit = Number(limit);
    const offset = (numericPage - 1) * numericLimit;
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionCompraEstado,
        EstadoCompra,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // Ajustamos la fecha final para incluir todo el día.
      const adjustedEndDate = endDate ? new Date(endDate + "T23:59:59") : null;
  
      const montoFilter =
        valorMin !== undefined &&
        valorMin !== "" &&
        valorMax !== undefined &&
        valorMax !== "" &&
        (Number(valorMin) !== 0 || Number(valorMax) !== 0)
          ? { montoTotal: { [Op.between]: [Number(valorMin), Number(valorMax)] } }
          : {};
  
      const idTxNum = parseInt(idTransaccionSearch, 10);
  
      // Armamos el whereClause sin incluir el filtro de estado, ya que lo aplicamos en el include.
      const whereClause = {
        idTipoTransaccion: tipoTransaccion,
        eliminado: mostrarDeletes,
        ...(startDate &&
          endDate && {
            fechaHoraCreacion: {
              [Op.between]: [new Date(startDate), adjustedEndDate],
            },
          }),
        ...(idProveedor && { idEntidad: idProveedor }),
        ...(idUbicacion && { idUbicacion: idUbicacion }),
        ...montoFilter,
        ...(!isNaN(idTxNum) ? { id: idTxNum } : {}),
      };
  
      // Contar el total de registros para la paginación
      const total = await Transaccion.count({ where: whereClause });
  
      const totalMontoVentas =
        (await Transaccion.sum("montoTotal", { where: whereClause })) || 0;
  
      const transacciones = await Transaccion.findAll({
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "idCategorizacion",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
        ],
        where: whereClause,
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
              "entidadDatoAtributo1",
              "entidadDatoAtributo2",
              "entidadDatoAtributo3",
              "entidadDatoAtributo4",
              "entidadDatoAtributo5",
              "entidadDatoAtributo6",
              "entidadDatoAtributo7",
              "entidadDatoAtributo8",
              "entidadDatoAtributo9",
              "entidadDatoAtributo10",
            ],
            where: {
              ...(atributoEntidad1 && { entidadDatoAtributo1: Number(atributoEntidad1) }),
              ...(atributoEntidad2 && { entidadDatoAtributo2: Number(atributoEntidad2) }),
              ...(atributoEntidad3 && { entidadDatoAtributo3: Number(atributoEntidad3) }),
              ...(atributoEntidad4 && { entidadDatoAtributo4: Number(atributoEntidad4) }),
              ...(atributoEntidad5 && { entidadDatoAtributo5: Number(atributoEntidad5) }),
              ...(atributoEntidad6 && { entidadDatoAtributo6: Number(atributoEntidad6) }),
              ...(atributoEntidad7 && { entidadDatoAtributo7: Number(atributoEntidad7) }),
              ...(atributoEntidad8 && { entidadDatoAtributo8: Number(atributoEntidad8) }),
              ...(atributoEntidad9 && { entidadDatoAtributo9: Number(atributoEntidad9) }),
              ...(atributoEntidad10 && { entidadDatoAtributo10: Number(atributoEntidad10) }),
            },
            include: [
              { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
            ],
          },
          {
            model: Usuario,
            as: "usuario",
            attributes: ["usuario"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion"],
          },
          {
            model: Negocio,
            as: "negocio",
            attributes: ["descripcion"],
          },
          {
            model: TransaccionCompraEstado,
            as: "transaccionCompraEstado",
            required: idEstado ? true : false,
            include: [
              {
                model: EstadoCompra,
                as: "estadoCompra",
                attributes: ["id", "descripcion"],
                // Si se pasa idEstado, se filtra por él:
                where: idEstado ? { id: idEstado } : undefined,
                required: idEstado ? true : false,
              },
            ],
          },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
        ],
        offset,
        limit: numericLimit,
      });
  
      const transaccionImpuestos = await TransaccionImpuesto.findAll({
        include: [
          {
            model: Impuesto,
            as: "impuesto",
            attributes: ["descripcion"],
          },
        ],
      });
  
      const result = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
  
        const impuestosRelacionados = transaccionImpuestos
          .filter((imp) => imp.idTransaccion === transaccionData.id)
          .map((imp) => ({
            idImpuesto: imp.idImpuesto,
            porcentaje: imp.porcentaje,
            montoTotal: imp.montoTotal,
            descripcion: imp.impuesto?.descripcion || "",
          }));
  
        const descripcionImpuestos = impuestosRelacionados
          .map(
            (imp) =>
              `${imp.descripcion} (${
                imp.porcentaje
              }%): $${imp.montoTotal?.toLocaleString("es-AR")}`
          )
          .join("; ");
  
        const pagosTransformados = transaccionData.transaccionPago.map((tp) => {
          const pago = tp.pago || {};
          return {
            montoTotal: pago.montoTotal || 0,
            cotizacion: pago.cotizacion || 1,
            medioDePago: pago.medioDePago?.descripcion || "",
            id: pago.medioDePago?.id || "",
            tipoMedio: pago.medioDePago?.tipoMedioDePago?.descripcion || "",
          };
        });
  
        const estadoCompra = transaccionData.transaccionCompraEstado
          ? transaccionData.transaccionCompraEstado.estadoCompra
          : null;
  
        return {
          ...transaccionData,
          estadoCompra,
          pagos: pagosTransformados,
          tipoPago: pagosTransformados.length > 1 ? "Múltiple" : "Individual",
          impuestos: impuestosRelacionados,
          descripcionImpuestos,
        };
      });
  
      const totalPages = Math.ceil(total / numericLimit);
  
      res.status(200).json({
        data: result,
        totalMontoVentas, // ✅ Nueva variable con la suma de todas las ventas filtradas
        currentPage: numericPage,
        totalPages,
        total,
      });
    } catch (error) {
      console.error("Error en getTransaccionTransformedCompras:", error);
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  const getTransaccionItemByTipoTransaccion = async (req, res) => {
    try {
      // Se valida que se reciba el parámetro obligatorio idTipoTransaccion
      const idTipoTransaccion = req.query.idTipoTransaccion;
      const idEntidad = req.query.idEntidad;
      const idItem = req.query.idItem;
      const idUbicacion = req.query.idUbicacion;
      const idTransaccionSearch = req.query.idTransaccionSearch;
      const canalEntidad = req.query.canalEntidad;
  
      if (!idTipoTransaccion) {
        return res.status(400).json({
          message: "El parámetro idTipoTransaccion es requerido.",
        });
      }
  
      // Parámetros para la paginación
      const page = req.query.page ? parseInt(req.query.page, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const offset = (page - 1) * limit;
  
      // Filtro opcional por código del item (si se proporciona en la query)
      let itemWhere = { eliminado: false };
  
      if (idItem) {
        itemWhere.id = idItem;
      }
  
      // ✅ Filtros por atributos de item (itemDatoAtributo1, itemDatoAtributo2, etc.)
      // Los atributos de item son campos de texto, así que usamos iLike para búsqueda parcial case-insensitive
      for (let i = 1; i <= 10; i++) {
        const atributoValue = req.query[`itemDatoAtributo${i}`];
        if (atributoValue && atributoValue !== "null" && atributoValue.trim() !== "") {
          itemWhere[`itemDatoAtributo${i}`] = {
            [Op.iLike]: `%${atributoValue.trim()}%` // Búsqueda case-insensitive con LIKE
          };
        }
      }
  
      // ✅ Filtros por atributos de entidad (entidadDatoAtributo1, entidadDatoAtributo2, etc.)
      const whereEntidad = {};
      for (let i = 1; i <= 10; i++) {
        const atributoValue = req.query[`atributoEntidad${i}`];
        if (atributoValue && atributoValue !== "null" && atributoValue !== "") {
          whereEntidad[`entidadDatoAtributo${i}`] = Number(atributoValue);
        }
      }
      const tieneFiltrosAtributos = Object.keys(whereEntidad).length > 0;
  
      // Filtro opcional para un rango de fechas en la Transacción - ✅ Usar Date objects directamente (patrón correcto)
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      let fechaInicio = null;
      let fechaFin = null;
      
      if (startDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaInicio = startDate instanceof Date ? startDate : new Date(startDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaInicio.getTime())) {
          fechaInicio = null;
        }
      }
      
      if (endDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaFin = endDate instanceof Date ? endDate : new Date(endDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaFin.getTime())) {
          fechaFin = null;
        }
      }
      
      let transaccionWhere = {
        idTipoTransaccion: idTipoTransaccion,
        eliminado: false,
      };
      let itemTransaccionWhere = { eliminado: false };
  
      if (fechaInicio && fechaFin) {
        transaccionWhere.fecha = { [Op.between]: [fechaInicio, fechaFin] };
      }
      if (idEntidad) {
        transaccionWhere.idEntidad = idEntidad;
      }
      if (idUbicacion) {
        transaccionWhere.idUbicacion = idUbicacion;
      }
      appendIdSubstringFilter(itemTransaccionWhere, idTransaccionSearch, null, "idTransaccion");
  
      // Inicializamos la conexión y los modelos
      
      if (!req.cookies.tenant) {
        return res.status(400).json({
          ok: false,
          message: "Cookie tenant no encontrada. Por favor, inicie sesión nuevamente.",
        });
      }
      
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      
      // Se obtienen Transaccion y TransaccionItem (y en este mismo init se definen las asociaciones)
      const { Transaccion, TransaccionItem } = transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      // Se obtienen los modelos de adminModelInit
      const { Entidad, Ubicacion, Negocio, Usuario, CanalEntidad } = adminModelInit(sequelize);
  
      // Se realiza la consulta empleando findAndCountAll para obtener el total y los rows paginados
      
      const result = await TransaccionItem.findAndCountAll({
        where: itemTransaccionWhere,
        include: [
          {
            model: Transaccion,
            as: "Transaccion",
            where: transaccionWhere,
            required: true,
            include: [
              { 
                model: Entidad, 
                as: "entidad", 
                required: tieneFiltrosAtributos || (canalEntidad && canalEntidad !== "null"),
                where: {
                  ...(tieneFiltrosAtributos ? whereEntidad : {}),
                  ...(canalEntidad && canalEntidad !== "null" ? { idCanal: Number(canalEntidad) } : {})
                },
                include: [
                  {
                    model: CanalEntidad,
                    as: "canalEntidad",
                    required: false,
                    attributes: ["id", "descripcion"]
                  }
                ],
              },
              { model: Usuario, as: "usuario", required: false },
              { model: Ubicacion, as: "ubicacion", required: false },
              { model: Negocio, as: "negocio", required: false },
            ],
          },
          {
            model: Item,
            as: "item",
            where: itemWhere,
            required: true, //Los requiered sirven para decirle si un modelo o una busqueda de relaciones esta a nivel bajo. Es decir, es hijo de un modelo o algo similar, se hace un where en ese modelo y si no se encuentra, no se devuelve nada.
            attributes: [
              "id",
              "codigo",
              "descripcion",
              "codigoScanner",
              "itemDatoAtributo1",
              "itemDatoAtributo2",
              "itemDatoAtributo3",
              "itemDatoAtributo4",
              "itemDatoAtributo5",
              "itemDatoAtributo6",
              "itemDatoAtributo7",
              "itemDatoAtributo8",
              "itemDatoAtributo9",
              "itemDatoAtributo10",
            ],
          },
        ],
        order: [[{ model: Transaccion, as: "Transaccion" }, "fechaHoraCreacion", "DESC"]],
        limit,
        offset,
      });
      
      // ✅ Transformar los datos para incluir activeAttributes (atributos del item agrupados)
      const transformedData = result.rows.map((row) => {
        const rowData = row.toJSON();
        
        // Agrupar atributos del item en activeAttributes
        if (rowData.item) {
          rowData.item.activeAttributes = {
            itemDatoAtributo1: rowData.item.itemDatoAtributo1 || null,
            itemDatoAtributo2: rowData.item.itemDatoAtributo2 || null,
            itemDatoAtributo3: rowData.item.itemDatoAtributo3 || null,
            itemDatoAtributo4: rowData.item.itemDatoAtributo4 || null,
            itemDatoAtributo5: rowData.item.itemDatoAtributo5 || null,
            itemDatoAtributo6: rowData.item.itemDatoAtributo6 || null,
            itemDatoAtributo7: rowData.item.itemDatoAtributo7 || null,
            itemDatoAtributo8: rowData.item.itemDatoAtributo8 || null,
            itemDatoAtributo9: rowData.item.itemDatoAtributo9 || null,
            itemDatoAtributo10: rowData.item.itemDatoAtributo10 || null,
          };
        }
        
        return rowData;
      });
      
      // Se construye la respuesta con la data paginada y metadatos de paginación
      return res.json({
        total: result.count,
        totalPages: Math.ceil(result.count / limit),
        currentPage: page,
        data: transformedData,
      });
    } catch (error) {
      console.error("Error en getTransaccionItemByTipoTransaccion:", error);
      return res.status(500).json({
        ok: false,
        message: "Hubo un error al obtener las transacciones",
        error: error.message,
      });
    }
  };
  
  const getTransaccionItemByTipoTransaccionAllData = async (req, res) => {
    try {
      // console.log("Ejecutando consulta de detalles de transacciones SIN PAGINADO para gráficas...");
      
      // Se valida que se reciba el parámetro obligatorio idTipoTransaccion
      const idTipoTransaccion = req.query.idTipoTransaccion;
      const idEntidad = req.query.idEntidad;
      const idItem = req.query.idItem;
      const idUbicacion = req.query.idUbicacion;
      const idTransaccionSearch = req.query.idTransaccionSearch;
      const canalEntidad = req.query.canalEntidad;
  
      if (!idTipoTransaccion) {
        return res.status(400).json({
          message: "El parámetro idTipoTransaccion es requerido.",
        });
      }
  
      // Filtro opcional por código del item (si se proporciona en la query)
      let itemWhere = { eliminado: false };
  
      if (idItem) {
        itemWhere.id = idItem;
      }
  
      // ✅ Filtros por atributos de item (itemDatoAtributo1, itemDatoAtributo2, etc.)
      // Los atributos de item son campos de texto, así que usamos iLike para búsqueda parcial case-insensitive
      for (let i = 1; i <= 10; i++) {
        const atributoValue = req.query[`itemDatoAtributo${i}`];
        if (atributoValue && atributoValue !== "null" && atributoValue.trim() !== "") {
          itemWhere[`itemDatoAtributo${i}`] = {
            [Op.iLike]: `%${atributoValue.trim()}%` // Búsqueda case-insensitive con LIKE
          };
        }
      }
  
      // ✅ Filtros por atributos de entidad (entidadDatoAtributo1, entidadDatoAtributo2, etc.)
      const whereEntidad = {};
      for (let i = 1; i <= 10; i++) {
        const atributoValue = req.query[`atributoEntidad${i}`];
        if (atributoValue && atributoValue !== "null" && atributoValue !== "") {
          whereEntidad[`entidadDatoAtributo${i}`] = Number(atributoValue);
        }
      }
      const tieneFiltrosAtributos = Object.keys(whereEntidad).length > 0;
  
      // Filtro opcional para un rango de fechas en la Transacción - ✅ Usar Date objects directamente (patrón correcto)
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      let fechaInicio = null;
      let fechaFin = null;
      
      if (startDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaInicio = startDate instanceof Date ? startDate : new Date(startDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaInicio.getTime())) {
          fechaInicio = null;
        }
      }
      
      if (endDate) {
        // Si viene como ISO string (de Date object), parsearlo directamente
        fechaFin = endDate instanceof Date ? endDate : new Date(endDate);
        // Validar que sea una fecha válida
        if (isNaN(fechaFin.getTime())) {
          fechaFin = null;
        }
      }
      
      let transaccionWhere = {
        idTipoTransaccion: idTipoTransaccion,
        eliminado: false,
      };
      let itemTransaccionWhere = { eliminado: false };
  
      if (fechaInicio && fechaFin) {
        transaccionWhere.fecha = { [Op.between]: [fechaInicio, fechaFin] };
      }
      
      // ✅ Validaciones para evitar 'null' strings (igual que en getTransaccionTransformedVentasAllData)
      if (idEntidad && idEntidad !== 'null' && idEntidad !== '') {
        transaccionWhere.idEntidad = idEntidad;
      }
      if (idUbicacion && idUbicacion !== 'null' && idUbicacion !== '') {
        transaccionWhere.idUbicacion = idUbicacion;
      }
      appendIdSubstringFilter(itemTransaccionWhere, idTransaccionSearch, null, "idTransaccion");
  
      // Inicializamos la conexión y los modelos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, TransaccionItem, TransaccionPago, Pago, MedioDePago, TipoMedioDePago } = transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, CanalEntidad } = adminModelInit(sequelize);
  
      // ✅ Consulta SIN PAGINADO - se remueven limit y offset
      const result = await TransaccionItem.findAll({
        where: itemTransaccionWhere,
        include: [
          {
            model: Transaccion,
            as: "Transaccion",
            where: transaccionWhere,
            required: true,
            include: [
              { 
                model: Entidad, 
                as: "entidad", 
                required: tieneFiltrosAtributos || (canalEntidad && canalEntidad !== "null"),
                where: {
                  ...(tieneFiltrosAtributos ? whereEntidad : {}),
                  ...(canalEntidad && canalEntidad !== "null" ? { idCanal: Number(canalEntidad) } : {})
                },
                include: [
                  {
                    model: CanalEntidad,
                    as: "canalEntidad",
                    required: false,
                    attributes: ["id", "descripcion"]
                  }
                ],
              },
              { model: Usuario, as: "usuario", required: false },
              { model: Ubicacion, as: "ubicacion", required: false },
              { model: Negocio, as: "negocio", required: false },
              {
                model: TransaccionPago,
                as: "transaccionPago",
                where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
                required: false,
                include: [
                  {
                    model: Pago,
                    as: "pago",
                    required: false,
                    include: [
                      {
                        model: MedioDePago,
                        as: "medioDePago",
                        required: false,
                        include: [
                          {
                            model: TipoMedioDePago,
                            as: "tipoMedioDePago",
                            attributes: ["descripcion"],
                            required: false,
                          },
                        ],
                        attributes: ["descripcion", "id"],
                      },
                    ],
                    attributes: ["montoTotal", "cotizacion", "id"],
                  },
                ],
              },
            ],
          },
          {
            model: Item,
            as: "item",
            where: itemWhere,
            required: true,
            attributes: [
              "id",
              "codigo",
              "descripcion",
              "codigoScanner",
              "itemDatoAtributo1",
              "itemDatoAtributo2",
              "itemDatoAtributo3",
              "itemDatoAtributo4",
              "itemDatoAtributo5",
              "itemDatoAtributo6",
              "itemDatoAtributo7",
              "itemDatoAtributo8",
              "itemDatoAtributo9",
              "itemDatoAtributo10",
            ],
          },
        ],
        order: [[{ model: Transaccion, as: "Transaccion" }, "fechaHoraCreacion", "DESC"]],
      });
  
      // ✅ Transformar los datos para incluir activeAttributes (atributos del item agrupados)
      const transformedData = result.map((row) => {
        const rowData = row.toJSON();
        
        // Agrupar atributos del item en activeAttributes
        if (rowData.item) {
          rowData.item.activeAttributes = {
            itemDatoAtributo1: rowData.item.itemDatoAtributo1 || null,
            itemDatoAtributo2: rowData.item.itemDatoAtributo2 || null,
            itemDatoAtributo3: rowData.item.itemDatoAtributo3 || null,
            itemDatoAtributo4: rowData.item.itemDatoAtributo4 || null,
            itemDatoAtributo5: rowData.item.itemDatoAtributo5 || null,
            itemDatoAtributo6: rowData.item.itemDatoAtributo6 || null,
            itemDatoAtributo7: rowData.item.itemDatoAtributo7 || null,
            itemDatoAtributo8: rowData.item.itemDatoAtributo8 || null,
            itemDatoAtributo9: rowData.item.itemDatoAtributo9 || null,
            itemDatoAtributo10: rowData.item.itemDatoAtributo10 || null,
          };
        }
        
        return rowData;
      });
  
      // ✅ Contar total de registros
      const totalCount = transformedData.length;
  
      // ✅ Calcular suma total de montoTotal
      const totalMontoDetalles = transformedData.reduce((sum, item) => sum + (item.montoTotal || 0), 0);
  
      // ✅ Respuesta sin paginado
      res.status(200).json({
        total: totalCount,
        totalMontoDetalles,
        data: transformedData, // Todos los datos filtrados con activeAttributes
      });
    } catch (error) {
      console.error("Error en getTransaccionItemByTipoTransaccionAllData:", error);
      res.status(500).json({ message: "Error al obtener detalles de transacciones para gráficas", error });
    }
  };
  
  const getTransaccionTransformedPresupuesto = async (req, res) => {
    const { tipoTransaccion } = req.params;
    const {
      fecha,
      page = 1,
      limit = 100,
      formattedDate2, // Fecha hasta (opcional)
      dniCliente, // ID de la entidad cliente (opcional)
      selectedUbicacion, // ID de la ubicación (opcional)
      valorMin,
      valorMax, // Rango para filtrar (opcional)
      mostrarEliminados = false, // Mostrar eliminados (opcional)
      idTransaccionSearch, //buscar por id de la transaccion (opcional)
      traerDevolucion,
      buscarCAE,
      tipoTransaccionFiltro,
      canalEntidad, // ID del canal de entidad (opcional)
      atributoEntidad1,
      atributoEntidad2,
      atributoEntidad3,
      atributoEntidad4,
      atributoEntidad5,
      atributoEntidad6,
      atributoEntidad7,
      atributoEntidad8,
      atributoEntidad9,
      atributoEntidad10,
    } = req.query;
  
    
  
    // ✅ Asegurar que `page` y `limit` sean valores numéricos válidos
    const pageNumber = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 100;
    const offset = (pageNumber - 1) * pageLimit; // Cálculo del offset correcto
  
    try {
      // ✅ Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionTipoFactura,
        TipoFactura,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // console.log("Ejecutando consulta de presupuestos con paginado...");
      // console.log("es true o false", mostrarEliminados);
  
      const fechaInicio = fecha;
      const fechaFin = formattedDate2;
  
      const tipos = [Number(tipoTransaccion)];
  
      let whereClause = {
        eliminado: mostrarEliminados,
        fechaHoraCreacion: { [Op.between]: [fechaInicio, fechaFin] },
      };
  
      // Agregamos el filtro solo si no es "todos"
      if (tipoTransaccionFiltro === "presupuestos") {
        whereClause.idTipoTransaccion = 3; // 3 = presupuestos
      } else {
        whereClause.idTipoTransaccion = { [Op.in]: tipos };
      }
  
      let whereCAE = {};
  
      // ✅ Filtros opcionales (con validación para evitar 'null' strings)
      if (dniCliente && dniCliente !== 'null' && dniCliente !== '') {
        whereClause.idEntidad = dniCliente;
      }
      if (selectedUbicacion && selectedUbicacion !== 'null' && selectedUbicacion !== '') {
        whereClause.idUbicacion = selectedUbicacion;
      }
  
      if (
        valorMin &&
        valorMax &&
        valorMin !== 'null' &&
        valorMax !== 'null' &&
        valorMin !== '' &&
        valorMax !== '' &&
        valorMin != valorMax &&
        (valorMin != 0 || valorMax != 0)
      ) {
        whereClause.montoTotal = {
          [Op.between]: [parseFloat(valorMin), parseFloat(valorMax)],
        };
      }
  
      appendIdSubstringFilter(whereClause, idTransaccionSearch, "Transaccion", "id");
  
      if (buscarCAE && buscarCAE !== 'null' && buscarCAE !== '') {
        whereCAE.CAE = buscarCAE;
      }
  
      // ✅ Contar total de transacciones
      const totalCount = await Transaccion.count({ where: whereClause });
  
      // ✅ Obtener transacciones paginadas
      const transacciones = await Transaccion.findAll({
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
          "transaccionAsociada",
        ],
        where: whereClause,
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
              "idCanal",
              "entidadDatoAtributo1",
              "entidadDatoAtributo2",
              "entidadDatoAtributo3",
              "entidadDatoAtributo4",
              "entidadDatoAtributo5",
              "entidadDatoAtributo6",
              "entidadDatoAtributo7",
              "entidadDatoAtributo8",
              "entidadDatoAtributo9",
              "entidadDatoAtributo10",
            ],
            where: {
              ...(canalEntidad && canalEntidad !== "null" && { idCanal: Number(canalEntidad) }),
              ...(atributoEntidad1 && atributoEntidad1 !== "null" && { entidadDatoAtributo1: Number(atributoEntidad1) }),
              ...(atributoEntidad2 && atributoEntidad2 !== "null" && { entidadDatoAtributo2: Number(atributoEntidad2) }),
              ...(atributoEntidad3 && atributoEntidad3 !== "null" && { entidadDatoAtributo3: Number(atributoEntidad3) }),
              ...(atributoEntidad4 && atributoEntidad4 !== "null" && { entidadDatoAtributo4: Number(atributoEntidad4) }),
              ...(atributoEntidad5 && atributoEntidad5 !== "null" && { entidadDatoAtributo5: Number(atributoEntidad5) }),
              ...(atributoEntidad6 && atributoEntidad6 !== "null" && { entidadDatoAtributo6: Number(atributoEntidad6) }),
              ...(atributoEntidad7 && atributoEntidad7 !== "null" && { entidadDatoAtributo7: Number(atributoEntidad7) }),
              ...(atributoEntidad8 && atributoEntidad8 !== "null" && { entidadDatoAtributo8: Number(atributoEntidad8) }),
              ...(atributoEntidad9 && atributoEntidad9 !== "null" && { entidadDatoAtributo9: Number(atributoEntidad9) }),
              ...(atributoEntidad10 && atributoEntidad10 !== "null" && { entidadDatoAtributo10: Number(atributoEntidad10) }),
            },
            include: [
              { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
            ],
          },
          { model: Usuario, as: "usuario", attributes: ["usuario"] },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion", "id"],
          },
          { model: Negocio, as: "negocio", attributes: ["descripcion"] },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: Boolean(buscarCAE),
            attributes: ["CAE", "vencimientoCAE", "idTipoFactura", "numeroFactura", "puntoVenta", "fechaEmision"],
            include: [
              {
                model: TipoFactura,
                as: "tipoFactura",
                attributes: ["descripcion"],
              },
            ],
            ...(buscarCAE ? { where: whereCAE } : {}),
          },
        ],
        distinct: true,
        order: [["fechaHoraCreacion", "DESC"]],
        limit: pageLimit,
        offset: offset,
      });
  
      // ✅ Procesar datos para el formato esperado por el frontend
      const data = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
  
        const pagosTransformados = (transaccionData.transaccionPago || [])
          .map((tp) => tp.pago)
          .filter((p) => p && p.medioDePago)
          .map((p) => ({
            montoTotal: p.montoTotal,
            cotizacion: p.cotizacion,
            medioDePago: p.medioDePago.descripcion,
            idMedio: p.medioDePago.id,
            pagoId: p.id,
            tipoMedio: p.medioDePago.tipoMedioDePago.descripcion,
            idtipoMedio: p.medioDePago.tipoMedioDePago.id,
          }));
  
        // Extraer descripción del tipo de factura si existe
        const tipoFacturaDescripcion =
          transaccionData.transaccionTipoFactura?.tipoFactura?.descripcion;
  
        return {
          id: transaccionData.id,
          montoTotal: transaccionData.montoTotal,
          idTipoTransaccion: transaccionData.idTipoTransaccion,
          entidad: transaccionData.entidad,
          idEntidad: transaccionData.idEntidad,
          tipoTransaccion: transaccionData.tipoTransaccion,
          usuario: transaccionData.usuario,
          ubicacion: transaccionData.ubicacion,
          negocio: transaccionData.negocio,
          descripcion: transaccionData.descripcion,
          fechaHoraCreacion: transaccionData.fechaHoraCreacion,
          pagos: pagosTransformados,
          tipoPago:
            pagosTransformados.length > 1
              ? "Múltiple"
              : pagosTransformados.length === 1
              ? "Individual"
              : "",
          tipoFacturaDescripcion: tipoFacturaDescripcion || "",
        };
      });
  
      // ✅ Respuesta final con paginado
      const totalPages = Math.ceil(totalCount / pageLimit);
      return res.status(200).json({
        totalCount: totalCount,
        totalPages: totalPages,
        currentPage: pageNumber,
        data,
      });
    } catch (error) {
      console.error("Error en getTransaccionTransformed:", error);
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  const getTransaccionTransformed = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario } = adminModelInit(sequelize);
  
      // Consulta optimizada utilizando asociaciones de Sequelize
      const transacciones = await Transaccion.findAll({
        where: { eliminado: false },
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "idCategorizacion",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
        ],
        include: [
          // Relación con TipoTransaccion
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          // Relación con Entidad
          {
            model: Entidad,
            as: "entidad",
            attributes: ["descripcion", "apellido", "dniCuitCuil"], // Ajusta según las columnas necesarias
          },
          // Relación con Usuario
          {
            model: Usuario,
            as: "usuario",
            attributes: ["usuario"], // Ajusta según las columnas necesarias
          },
          // Relación con Ubicacion
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion"],
          },
          // Relación con Negocio
          {
            model: Negocio,
            as: "negocio",
            attributes: ["descripcion"],
          },
          // Relación con pagos y medios de pago
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                     {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      }, 
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
        ],
      });
  
      // Transformación para incluir el tipo de pago
      const result = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
        const pagosTransformados = transaccionData.transaccionPago.map((tp) => {
          const pago = tp.pago || {};
          return {
            montoTotal: pago.montoTotal || 0,
            cotizacion: pago.cotizacion || 1,
            id: pago.medioDePago?.id || "",
            medioDePago: pago.medioDePago?.descripcion || "",
            tipoMedio: pago.medioDePago?.tipoMedioDePago?.descripcion || "",
          };
        });
  
        return {
          ...transaccionData,
          pagos: pagosTransformados,
          // *HARDCODED*
          tipoPago: pagosTransformados.length > 1 ? "Múltiple" : "Individual",
        };
      });
  
      res.status(200).json(result);
    } catch (error) {
      console.error("Error en getTransaccionTransformed:", error);
      res.status(500).json({ message: "Error al obtener transacciones", error });
    }
  };
  
  // Obtener todas las cuentas corrientes
  const getCuentaCorriente = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CuentaCorriente } = transaccionModelInit(sequelize);
  
      const cuentas = await CuentaCorriente.findAll({
        where: { eliminado: false },
      });
      res.json(cuentas);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener las cuentas corrientes", error });
    }
  };
  
  const getCuentaCorrienteByIdEntidad = async (req, res) => {
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CuentaCorriente } = transaccionModelInit(sequelize);
      const { idEntidad } = req.params;
      
      // Validar que idEntidad sea numérico
      if (!idEntidad || isNaN(Number(idEntidad))) {
        return res.status(400).json({ 
          message: "idEntidad debe ser un número válido" 
        });
      }
      
      // Se busca la cuenta corriente por idEntidad
      const cuentaCorriente = await CuentaCorriente.findAll({
        where: { idEntidad: Number(idEntidad), eliminado: false },
      });
      
      // Validar correctamente si el array está vacío
      if (!cuentaCorriente || cuentaCorriente.length === 0) {
        return res.status(404).json({ 
          message: "Cuenta corriente no encontrada para esta entidad" 
        });
      }
      
      // Se retorna la cuenta corriente encontrada
      res.status(200).json(cuentaCorriente);
    } catch (error) {
      console.error("Error al obtener cuentas corrientes:", error);
      res.status(500).json({ 
        message: "Error al obtener las cuentas corrientes",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
  
  const getCuentaCorrienteTransformed = async (req, res) => {
    // ✏️ dejamos los query params para futura extensión, pero por ahora los ignoramos:
    const {
      fecha,
      page = 1,
      limit = 100,
      formattedDate2,
      dniCliente,
      selectedUbicacion,
      valorMin,
      valorMax,
      mostrarEliminados,
      idTransaccionSearch,
    } = req.query;
  
    // ✅ Asegurar que `page` y `limit` sean valores numéricos válidos
    const pageNumber = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 100;
    const offset = (pageNumber - 1) * pageLimit; // Cálculo del offset correcto
  
    try {
      // 1) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoEntidad, Entidad } = adminModelInit(sequelize);
      const {
        CuentaCorriente,
        Transaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionItem,
      } = transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
  
      // ✅ Formateo correcto de fechas - usar Date objects directamente (igual que getTransaccionTransformedVentas)
      const fechaInicio = fecha;  // Date object con timezone incluido
      const fechaFin = formattedDate2 || fecha;  // Date object con timezone incluido
  
      let whereClause = {
        eliminado: mostrarEliminados,
        updatedAt: { [Op.between]: [fechaInicio, fechaFin] },
      };
  
      let whereCAE = {};
  
      // ✅ Filtros opcionales
      if (dniCliente) whereClause.idEntidad = dniCliente;
      //if (selectedUbicacion) whereClause.idUbicacion = selectedUbicacion;
      if (
        valorMin &&
        valorMax &&
        valorMin != valorMax &&
        (valorMin != 0 || valorMax != 0)
      ) {
        whereClause.saldo = {
          [Op.between]: [parseFloat(valorMin), parseFloat(valorMax)],
        };
      }
      /*
      if (idTransaccionSearch) {
        whereClause.id = idTransaccionSearch;
      }
  
      if (buscarCAE != "") {
        whereCAE.CAE = buscarCAE;
      }
  
      console.log("buscarCAE ", buscarCAE);
  
      // ✅ Obtener la suma total de `montoTotal` en todas las transacciones filtradas (sin paginación)
      const totalMontoVentas =
        (await Transaccion.sum("montoTotal", { where: whereClause })) || 0;
  
      if (traerDevolucion === "traerDevolucion") {
        tipos.push(6);
      }
  
      // ✅ Contar total de transacciones antes de aplicar paginación*/
      const totalCount = await CuentaCorriente.count({ where: whereClause });
  
      // 2) Traer todas las cuentas corrientes con su entidad
      const cuentas = await CuentaCorriente.findAll({
        where: whereClause,
        include: [
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "telefono",
              "email",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
              "idTipoEntidad",
            ],
            include: [
              {
                model: TipoEntidad,
                as: "tipoEntidad",
                attributes: ["descripcion"],
              },
            ],
          },
        ],
        limit: pageLimit,
        offset,
        distinct: true, // Evita duplicados por los includes
        order: [["idEntidad", "DESC"]],
      });
  
      // 3) Si no hay cuentas, devolvemos array vacío
      if (cuentas.length === 0) {
        return res.json({ success: true, data: [] });
      }
  
      // 4) Sacar todos los idEntidad de las cuentas corrientes
      const entidadesIds = cuentas.map((cc) => cc.idEntidad);
  
      // 5) Traer todas las transacciones cuya idEntidad esté en ese listado
      const transacciones = await Transaccion.findAll({
        where: {
          idEntidad: { [Op.in]: entidadesIds },
          afectaCuentaCorriente: true,
          eliminado: false,
        },
        order: [["fechaHoraCreacion", "DESC"]],
      });
  
      const transaccionesItem = await Transaccion.findAll({
        where: {
          idEntidad: { [Op.in]: entidadesIds },
          eliminado: false,
        },
        order: [["fechaHoraCreacion", "DESC"]],
        include: [
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: true, // INNER JOIN con pagos
            include: [
              {
                model: Pago,
                as: "pago",
                required: true, // y aquí
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    required: true, // INNER JOIN con medioDePago
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        required: true,
                        where: { afectaCuentaCorriente: true },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: TransaccionItem,
            as: "TransaccionItems",
            required: true, // INNER JOIN con items
            where: {
              idItem: { [Op.ne]: null },
              eliminado: false,
            },
            include: [
              {
                model: Item,
                as: "item",
                attributes: ["descripcion"],
              },
            ],
          },
        ],
      });
  
      // 5) Agrupar transacciones de cuenta corriente por entidad
      const txPorEntidad = transacciones.reduce((acc, tx) => {
        (acc[tx.idEntidad] = acc[tx.idEntidad] || []).push(tx.toJSON());
        return acc;
      }, {});
  
      // 6) Agrupar CC-Items por entidad
      const txItemPorEntidad = transaccionesItem.reduce((acc, tx) => {
        (acc[tx.idEntidad] = acc[tx.idEntidad] || []).push(tx.toJSON());
        return acc;
      }, {});
  
      // 7) Armar resultado
      const result = cuentas.map((cc) => {
        const base = cc.toJSON();
        return {
          ...base,
          transacciones: txPorEntidad[base.idEntidad] || [],
          transaccionesItems: txItemPorEntidad[base.idEntidad] || [],
        };
      });
  
      // 8) Responder
      return res.status(200).json({
        success: true,
        data: result,
        total: totalCount,
  
        totalPages: Math.ceil(totalCount / pageLimit),
        currentPage: pageNumber,
      });
    } catch (error) {
      console.error("Error al obtener cuentas corrientes:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener las cuentas corrientes",
        error: error.message,
      });
    }
  };
  
  const postTransaccionDevolucion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion } = transaccionModelInit(sequelize);
  
      const transaccion = new Transaccion(req.body);
      await transaccion.save();
      res.status(201).json(transaccion);
    } catch (error) {
      console.error("Error al crear transacción:", error);
      res.status(400).json({ message: "Error al crear transacción", error });
    }
  };
  
  const postTransaccionItemDevolucion = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      const transaccionItem = new TransaccionItem(req.body);
      await transaccionItem.save();
      res.status(201).json(transaccionItem);
    } catch (error) {
      console.error("Error al crear transacción:", error);
      res.status(400).json({ message: "Error al crear transacción", error });
    }
  };
  
  const postListaMonto = async (req, res) => {
    try {
      // Extraer los datos enviados en el body
      const { newItemId, idUbicacion, entidad, precio_costo, margenGanancia, esProveedorReferente } = req.body;
  
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      const idItemInt = parseInt(newItemId, 10);
      const idUbicacionInt = parseInt(idUbicacion, 10);
      const esReferente = esProveedorReferente === true || esProveedorReferente === "true";
  
      // Si el nuevo proveedor va a ser referente, desasignar el referente anterior para (idItem, idUbicacion)
      if (esReferente) {
        const referenteActual = await ListaDeMontos.findOne({
          where: {
            idItem: idItemInt,
            idUbicacion: idUbicacionInt,
            esProveedorReferente: true,
            eliminado: false,
          },
          order: [["fecha", "DESC"]],
        });
        if (referenteActual) {
          await referenteActual.update({ esProveedorReferente: false });
        }
      }
  
      // Crear el nuevo registro en ListaDeMontos, asignando por defecto la fecha actual
      const montoVal = (precio_costo !== "" && precio_costo != null && !isNaN(parseFloat(precio_costo)))
        ? parseFloat(precio_costo)
        : 0;
      const listaMonto = await ListaDeMontos.create({
        fecha: new Date(),
        idItem: idItemInt,
        idUbicacion: idUbicacionInt,
        idEntidad: parseInt(entidad, 10),
        monto: montoVal,
        margenGanancia: margenGanancia !== undefined && margenGanancia !== null && margenGanancia !== ""
          ? parseFloat(margenGanancia) : null,
        esProveedorReferente: esReferente,
      });
  
      res.status(201).json(listaMonto);
    } catch (error) {
      console.error("Error al crear lista de montos:", error);
      res.status(400).json({ message: "Error al crear lista de montos", error });
    }
  };
  //IMPUESTOS
  const postImpuestos = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Impuesto } = transaccionModelInit(sequelize);
  
      const impuesto = new Impuesto(req.body);
      await impuesto.save();
      res.status(201).json(impuesto);
    } catch (error) {
      res.status(400).json({ message: "Error al crear impuesto", error });
    }
  };
  
  // Obtener moneda
  const getImpuestos = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Impuesto } = transaccionModelInit(sequelize);
  
      const impuesto = await Impuesto.findAll({where: {eliminado: false}});
      res.status(200).json(impuesto);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener impuesto", error });
    }
  };
  
  const postTransaccionImpuesto = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionImpuesto } = transaccionModelInit(sequelize);
  
      const impuestoTrans = new TransaccionImpuesto(req.body);
  
      await impuestoTrans.save();
      res.status(201).json(impuestoTrans);
    } catch (error) {
      res
        .status(400)
        .json({ message: "Error al crear impuesto transaccion", error });
    }
  };
  
  const updateImpuestoEstado = async (req, res) => {
    const { impuestosEliminados } = req.body; // Array de objetos con el id y otros datos de los impuestos
  
    // console.log("impuestosEliminados:", impuestosEliminados);
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Impuesto } = transaccionModelInit(sequelize);
  
      // Obtener todos los impuestos en la base de datos
      const allImpuestos = await Impuesto.findAll();
      // console.log("allImpuestos:", allImpuestos);
  
      // Crear un array con los ids de los impuestos eliminados para comparación
      const impuestosEliminadosIds = impuestosEliminados.map(
        (impuesto) => impuesto.id
      );
  
      // Primero, actualizamos los impuestos que están en 'impuestosEliminados' a 'eliminado: true'
      for (let impuestoEliminado of impuestosEliminados) {
        // Buscar el impuesto en la base de datos por ID (asegurándonos de acceder a dataValues)
        const impuesto = allImpuestos.find(
          (imp) => imp.dataValues.id === impuestoEliminado.id
        );
        // console.log("impuesto encontrado:", impuesto);
  
        if (impuesto) {
          // Si se encuentra, actualizamos el estado a "eliminado"
          await Impuesto.update(
            { eliminado: true },
            { where: { id: impuesto.dataValues.id } }
          );
        }
      }
  
      // Luego, actualizamos los impuestos que **no están en 'impuestosEliminados'** a 'eliminado: false'
      for (let impuesto of allImpuestos) {
        if (!impuestosEliminadosIds.includes(impuesto.dataValues.id)) {
          await Impuesto.update(
            { eliminado: false },
            { where: { id: impuesto.dataValues.id } }
          );
        }
      }
  
      res.status(200).json({
        message: "Estados de los impuestos actualizados correctamente.",
      });
    } catch (error) {
      console.error("Error al actualizar los estados de los impuestos:", error);
      res.status(500).json({ message: "Error interno del servidor." });
    }
  };
  
  const updateImpuestoContenido = async (req, res) => {
    const { id } = req.params; // ID del impuesto a actualizar
    const { descripcion, porcentaje, checkedState } = req.body; // Nuevos valores
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Impuesto } = transaccionModelInit(sequelize);
  
      // Buscar el impuesto en la base de datos
      const impuesto = await Impuesto.findByPk(id);
  
      if (!impuesto) {
        return res.status(404).json({ message: "Impuesto no encontrado" });
      }
  
      // Actualizar los valores
      impuesto.descripcion = descripcion;
      impuesto.porcentaje = porcentaje;
      impuesto.incluidoEnPrecio = checkedState;
  
      // Guardar los cambios
      await impuesto.save();
  
      res
        .status(200)
        .json({ message: "Impuesto actualizado correctamente", impuesto });
    } catch (error) {
      console.error("Error al actualizar el impuesto:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  };
  
  // Obtener todas las cuentas corrientes
  const getTiposFacturas = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TipoFactura } = transaccionModelInit(sequelize);
  
      const tiposFacturas = await TipoFactura.findAll({
        where: { eliminado: false },
      });
      res.json(tiposFacturas);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener las tipos Facturas", error });
    }
  };
  
  // Obtener todas las cuentas corrientes
  const postTransaccionTipoFactura = async (req, res) => {
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionTipoFactura } = transaccionModelInit(sequelize);
  
      const transaccionTipoFactura = new TransaccionTipoFactura(req.body);
  
      await transaccionTipoFactura.save();
      res.status(201).json(transaccionTipoFactura);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener transaccionTipoFactura", error });
    }
  };
  
  // Función para verificar si una transacción fue facturada y obtener datos de la factura original
  const getTransaccionFacturadaData = async (req, res) => {
    try {
      const { idTransaccion } = req.params;
      
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, TransaccionTipoFactura, TipoFactura } = transaccionModelInit(sequelize);
      const { Ubicacion } = adminModelInit(sequelize);
  
      // Buscar la transacción con sus datos de facturación
      const transaccion = await Transaccion.findOne({
        where: { id: idTransaccion, eliminado: false },
        include: [
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: false,
            include: [
              {
                model: TipoFactura,
                as: "tipoFactura",
                attributes: ["descripcion"]
              }
            ],
            attributes: ["CAE", "vencimientoCAE", "numeroFactura", "idTipoFactura"]
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["id", "descripcion"]
          }
        ],
        attributes: ["id", "idUbicacion", "montoTotal"]
      });
  
      if (!transaccion) {
        return res.status(404).json({ 
          message: "Transacción no encontrada",
          fueFacturada: false 
        });
      }
  
      const fueFacturada = transaccion.transaccionTipoFactura && 
                          transaccion.transaccionTipoFactura.CAE && 
                          transaccion.transaccionTipoFactura.numeroFactura;
  
      if (!fueFacturada) {
        return res.status(200).json({ 
          message: "La transacción no fue facturada",
          fueFacturada: false,
          transaccion: {
            id: transaccion.id,
            montoTotal: transaccion.montoTotal,
            idUbicacion: transaccion.idUbicacion
          }
        });
      }
  
      // Mapear el tipo de factura a los códigos de AFIP
      const tipoFacturaDescripcion = transaccion.transaccionTipoFactura.tipoFactura?.descripcion || "";
      let tipoFacturaAFIP = null;
      
      if (tipoFacturaDescripcion.includes("A")) {
        tipoFacturaAFIP = 1;
      } else if (tipoFacturaDescripcion.includes("B")) {
        tipoFacturaAFIP = 6;
      } else if (tipoFacturaDescripcion.includes("C")) {
        tipoFacturaAFIP = 11;
      }
  
      const datosFacturaOriginal = {
        fueFacturada: true,
        transaccion: {
          id: transaccion.id,
          montoTotal: transaccion.montoTotal,
          idUbicacion: transaccion.idUbicacion,
          ubicacion: transaccion.ubicacion
        },
        facturaOriginal: {
          CAE: transaccion.transaccionTipoFactura.CAE,
          vencimientoCAE: transaccion.transaccionTipoFactura.vencimientoCAE,
          numeroFactura: transaccion.transaccionTipoFactura.numeroFactura,
          tipoFacturaDescripcion: tipoFacturaDescripcion,
          tipoFacturaAFIP: tipoFacturaAFIP,
          ptoVta: transaccion.idUbicacion, // El punto de venta es la ubicación
          nroFactura: transaccion.transaccionTipoFactura.numeroFactura
        }
      };
  
      res.status(200).json(datosFacturaOriginal);
  
    } catch (error) {
      console.error("Error al obtener datos de facturación:", error);
      res.status(500).json({ 
        message: "Error al verificar si la transacción fue facturada", 
        error: error.message 
      });
    }
  };
  
  const getListaMontosByIdItem = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      const { idItem } = req.query; // Obtener desde query params
  
      const whereCondition = {
        eliminado: false,
        idItem,
      };
  
      const listaMontos = await ListaDeMontos.findAll({
        where: whereCondition,
        include: [
          {
            model: Item,
            as: "item",
            attributes: ["id", "descripcion", "codigo", "codigoScanner"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["id", "descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "email",
              "idTipoEntidad",
            ],
          },
        ],
      });
  
      if (!listaMontos || listaMontos.length === 0) {
        return res.status(404).json({
          message: "No se encontraron registros con los filtros aplicados",
        });
      }
  
      // Convertir a objeto plano para trabajar con los datos sin metadatos
      const registros = listaMontos.map((record) => record.get({ plain: true }));
  
      // Agrupar por combinación: idItem-idEntidad-idUbicacion
      const grupos = {};
      registros.forEach((data) => {
        const key = `${data.idItem}-${data.idEntidad}-${data.ubicacion.id}`;
        // Si no existe el grupo o si el registro actual tiene una fecha (createdAt) mayor, se reemplaza
        if (
          !grupos[key] ||
          new Date(data.createdAt) > new Date(grupos[key].createdAt)
        ) {
          grupos[key] = data;
        }
      });
  
      const listaAgrupada = Object.values(grupos);
  
      // Formatear fechas (por ejemplo, createdAt y updatedAt) antes de devolver los datos
      const listaMontosFormateados = listaAgrupada.map((data) => {
        if (data.fecha) {
          data.fechaComun = dayjs(data.createdAt).format("DD/MM/YYYY HH:mm:ss");
        }
        if (data.createdAt) {
          data.createdAt = dayjs(data.createdAt).format("DD/MM/YYYY");
        }
        if (data.updatedAt) {
          data.updatedAt = dayjs(data.updatedAt).format("DD/MM/YYYY");
        }
        return data;
      });
  
      res.status(200).json(listaMontosFormateados);
    } catch (error) {
      console.error("Error al obtener la lista de montos:", error);
      res
        .status(500)
        .json({ message: "Error al obtener la lista de montos", error });
    }
  };
  
  const getListaMontosByIdItemIdEntidad = async (req, res) => {
    const { idEntidad, idItem, idUbicacion } = req.query;
  
    try {
      // 1) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // 2) Función para truncar monto a 2 decimales (sin redondear)
      const truncarMonto = (obj) => {
        if (obj && typeof obj.monto === 'number') {
          obj.monto = Math.trunc(obj.monto * 100) / 100;
        }
        return obj;
      };
  
      // 3) Intento con entidad específica
      let record = await ListaDeMontos.findOne({
        where: { idEntidad, idItem, idUbicacion },
        include: [
          {
            model: Entidad,
            as: "entidad",
            attributes: ["id", "descripcion", "apellido", "dniCuitCuil", "email"],
          },
          {
            model: Item,
            as: "item",
            attributes: ["id", "descripcion", "codigo", "codigoScanner"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["id", "descripcion"],
          },
        ],
        order: [["fecha", "DESC"]],
      });
  
      // 4) Si no existe, busco con entidad genérica (idEntidad = 1)
      if (!record) {
        record = await ListaDeMontos.findOne({
          where: { idEntidad: 1, idItem, idUbicacion },
          include: [
            {
              model: Entidad,
              as: "entidad",
              attributes: ["id", "descripcion", "apellido", "dniCuitCuil", "email"],
            },
            {
              model: Item,
              as: "item",
              attributes: ["id", "descripcion", "codigo", "codigoScanner"],
            },
            {
              model: Ubicacion,
              as: "ubicacion",
              attributes: ["id", "descripcion"],
            },
          ],
          order: [["fecha", "DESC"]],
        });
  
        if (!record) {
          return res.status(404).json({
            message:
              "No se encontró un precio de lista para esta combinación de entidad, artículo y ubicación.",
          });
        }
      }
  
      // 5) Convierto a objeto plano y truncar el monto
      const resultado = truncarMonto(record.get({ plain: true }));
  
      // 6) Devuelvo la respuesta
      return res.status(200).json(resultado);
    } catch (error) {
      console.error("Error al obtener las listas de montos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener las listas de montos", error });
    }
  };
  
  const updateListaDeMonto = async (req, res) => {
    try {
      // Extraer los parámetros necesarios del body
      const { idItem, idUbicacion, idEntidad, monto } = req.body;
      if (!idItem || !idUbicacion || !idEntidad || monto === undefined) {
        return res.status(400).json({
          message:
            "Todos los campos (idItem, idUbicacion, idEntidad y monto) son obligatorios.",
        });
      }
  
      // Convertir a tipos numéricos
      const idItemInt = parseInt(idItem, 10);
      const idUbicacionInt = parseInt(idUbicacion, 10);
      const idEntidadInt = parseInt(idEntidad, 10);
      const montoFloat = parseFloat(monto);
  
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Buscar el registro con la fecha más reciente para la combinación dada
      const latestRecord = await ListaDeMontos.findOne({
        where: {
          idItem: idItemInt,
          idUbicacion: idUbicacionInt,
          idEntidad: idEntidadInt,
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
      });
  
      // Si existe un registro y su monto es igual al valor enviado, no se crea nada
      if (latestRecord && parseFloat(latestRecord.monto) === montoFloat) {
        return res.status(200).json({
          message: "No hay cambios en el monto, no se creó un nuevo registro.",
        });
      }
  
      // Si no existe registro o el monto es distinto, se crea un nuevo registro con la fecha actual
      // Heredar margenGanancia y esProveedorReferente del registro anterior si existe
      const newRecord = await ListaDeMontos.create({
        fecha: new Date(), // Nueva fecha (nueva PK)
        idItem: idItemInt,
        idUbicacion: idUbicacionInt,
        idEntidad: idEntidadInt,
        monto: montoFloat,
        margenGanancia: latestRecord?.margenGanancia ?? null,
        esProveedorReferente: latestRecord?.esProveedorReferente ?? false,
        eliminado: false,
      });
  
      return res.status(200).json({
        message: "Nuevo registro creado correctamente.",
        newRecord,
      });
    } catch (error) {
      console.error("Error al crear el nuevo registro:", error);
      return res.status(500).json({
        message: "Error al crear el registro.",
        error,
      });
    }
  };
  
  // Actualizar múltiples precios en batch para mejorar performance
  const updateListaDeMontoBatch = async (req, res) => {
    try {
      const { updates } = req.body;
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          message: "El campo 'updates' debe ser un array no vacío.",
        });
      }
  
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      const results = {
        created: 0,
        skipped: 0,
        errors: []
      };
  
      // Preparar todas las consultas para buscar registros existentes
      const searchPromises = updates.map(update => {
        const idItemInt = parseInt(update.idItem, 10);
        const idUbicacionInt = parseInt(update.idUbicacion, 10);
        const idEntidadInt = parseInt(update.idEntidad, 10);
        
        return ListaDeMontos.findOne({
          where: {
            idItem: idItemInt,
            idUbicacion: idUbicacionInt,
            idEntidad: idEntidadInt,
            eliminado: false,
          },
          order: [["fecha", "DESC"]],
        }).then(record => ({
          update,
          existingRecord: record,
          idItemInt,
          idUbicacionInt,
          idEntidadInt,
          montoFloat: parseFloat(update.monto)
        }));
      });
  
      // Ejecutar todas las búsquedas en paralelo
      const searchResults = await Promise.all(searchPromises);
  
      // Filtrar solo los que necesitan actualización
      const recordsToCreate = searchResults.filter(result => {
        if (!result.existingRecord) return true;
        return parseFloat(result.existingRecord.monto) !== result.montoFloat;
      });
  
      // Crear todos los registros necesarios en batch, heredando margen y referente del anterior
      if (recordsToCreate.length > 0) {
        const createData = recordsToCreate.map(result => ({
          fecha: new Date(),
          idItem: result.idItemInt,
          idUbicacion: result.idUbicacionInt,
          idEntidad: result.idEntidadInt,
          monto: result.montoFloat,
          margenGanancia: result.existingRecord?.margenGanancia ?? null,
          esProveedorReferente: result.existingRecord?.esProveedorReferente ?? false,
          eliminado: false,
        }));
  
        await ListaDeMontos.bulkCreate(createData);
        results.created = recordsToCreate.length;
      }
  
      results.skipped = updates.length - recordsToCreate.length;
  
      return res.status(200).json({
        message: `Batch completado: ${results.created} creados, ${results.skipped} omitidos.`,
        results,
      });
    } catch (error) {
      console.error("Error en batch de actualización:", error);
      return res.status(500).json({
        message: "Error al procesar el batch de actualizaciones.",
        error: error.message,
      });
    }
  };
  
  const copiarPreciosEntreEntidades = async (req, res) => {
    const { idCopiar, idPegar } = req.body;
    
    // Validar que idCopiar existe y que idPegar es un array con al menos un elemento
    if (!idCopiar) {
      return res
        .status(400)
        .json({ message: "Debe enviar idCopiar en el body." });
    }
  
    // Convertir idPegar a array si viene como un solo valor (retrocompatibilidad)
    const idsPegar = Array.isArray(idPegar) ? idPegar : [idPegar];
    
    if (!idsPegar || idsPegar.length === 0) {
      return res
        .status(400)
        .json({ message: "Debe enviar al menos un idPegar en el body." });
    }
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Traemos todos los registros de la entidad origen, ordenados por fecha descendente
      const preciosOrigen = await ListaDeMontos.findAll({
        where: {
          idEntidad: idCopiar,
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
        attributes: ["idItem", "idUbicacion", "fecha", "monto"],
      });
  
      // Agrupamos en JS para quedarnos solo con el primero de cada par item+ubicación
      const grupos = {};
      preciosOrigen.forEach((rec) => {
        const key = `${rec.idItem}-${rec.idUbicacion}`;
        if (!(key in grupos)) {
          grupos[key] = rec; // al venir ordenado desc, el primer encuentro es el más reciente
        }
      });
      const ultimos = Object.values(grupos);
  
      // Preparamos los nuevos registros para TODAS las entidades destino
      const todosLosNuevos = [];
      idsPegar.forEach((idDestino) => {
        const nuevosParaDestino = ultimos.map(({ idItem, idUbicacion, fecha, monto }) => ({
          idItem,
          idUbicacion,
          idEntidad: idDestino,
          fecha,
          monto,
          eliminado: false,
        }));
        todosLosNuevos.push(...nuevosParaDestino);
      });
  
      // Insertamos/actualizamos todos en bloque
      // Si ya existe un registro con la misma combinación (fecha, idItem, idUbicacion, idEntidad),
      // se actualiza el monto en lugar de fallar
      if (todosLosNuevos.length > 0) {
        await ListaDeMontos.bulkCreate(todosLosNuevos, {
          updateOnDuplicate: ['monto', 'eliminado', 'updatedAt']
        });
      }
  
      return res.json({
        message: `Precios copiados exitosamente a ${idsPegar.length} ${idsPegar.length === 1 ? 'entidad' : 'entidades'}.`,
        count: todosLosNuevos.length,
        entidadesAfectadas: idsPegar.length,
        preciosPorEntidad: ultimos.length,
      });
    } catch (error) {
      console.error("Error al copiar precios entre entidades:", error);
      return res.status(500).json({
        message: "Error al copiar precios entre entidades.",
        error: error.message || error,
      });
    }
  };
  
  const getListaMontosByEntidad = async (req, res) => {
    const {
      idEntidad,
      idItem,
      idUbicacion,
      idTipoEntidad,
      page,
      limit,
      soloUltimos,
      incluirItemsSinPrecio, // Nuevo parámetro para incluir items sin precio
      searchText, // Nuevo parámetro para búsqueda múltiple por descripción
      filtrosAtributos // NUEVO: Filtros por atributos dinámicos
    } = req.query;
  
    try {
      // Parsear filtros de atributos si vienen como string JSON
      let atributosFilters = {};
      if (filtrosAtributos) {
        try {
          atributosFilters = typeof filtrosAtributos === 'string' ? JSON.parse(filtrosAtributos) : filtrosAtributos;
        } catch (e) {
          console.error("Error parseando filtros de atributos:", e);
        }
      }
      
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
  
      // Obtén la conexión y la instancia de Sequelize
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Construcción de la condición where dinámica
      const whereCondition = { eliminado: false };
      const whereConditionEntidad = { eliminado: false };
      const whereConditionItem = { eliminado: false }; // Nueva condición para filtrar items
  
      if (idEntidad && idEntidad !== "null") {
        whereCondition.idEntidad = idEntidad;
      }
      if (idItem && idItem !== "null") {
        whereCondition.idItem = idItem;
      }
      if (idUbicacion && idUbicacion !== "null") {
        whereCondition.idUbicacion = idUbicacion;
      }
      if (idTipoEntidad && idTipoEntidad !== "null") {
        whereConditionEntidad.idTipoEntidad = idTipoEntidad;
      }
      
      // Nueva funcionalidad: búsqueda múltiple por descripción de item
      // Solo aplica cuando hay searchText pero NO hay idItem específico
      if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
        const { Op } = require('sequelize');
        const searchTermLower = searchText.trim().toLowerCase();
        whereConditionItem[Op.or] = [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item.descripcion')),
            { [Op.like]: `%${searchTermLower}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item.codigo')),
            { [Op.like]: `%${searchTermLower}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item."codigoScanner"')),
            { [Op.like]: `%${searchTermLower}%` }
          )
        ];
      }
  
        // NUEVO: Aplicar filtros de atributos dinámicos
        if (atributosFilters && Object.keys(atributosFilters).length > 0) {
          const { Op } = require('sequelize');
          Object.entries(atributosFilters).forEach(([campo, valor]) => {
            if (valor && valor.trim() !== '') {
              // Agregar filtro ILIKE para cada atributo
              whereConditionItem[campo] = {
                [Op.iLike]: `%${valor.trim()}%`
              };
            }
          });
        }
  
      let listaMontos;
      let totalCount;
      let totalPages;
  
      // Normalizar valores para comparación
      const incluirSinPrecio = incluirItemsSinPrecio === "true" || incluirItemsSinPrecio === true;
      const soloUltimosActivo = soloUltimos === "true" || soloUltimos === true;
  
      // CASO 1: Incluir items sin precio (excluyente - solo items que NO tienen registros en listaDeMontos)
      if (incluirSinPrecio) {
        
        // Construir condiciones de búsqueda
        let searchCondition = '';
        let replacements = {};
        
        if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
          const searchTermLower = searchText.trim().toLowerCase();
          searchCondition = `AND (
            LOWER(i.descripcion) LIKE :searchTerm OR 
            LOWER(i.codigo) LIKE :searchTerm OR 
            LOWER(i."codigoScanner") LIKE :searchTerm
          )`;
          replacements.searchTerm = `%${searchTermLower}%`;
        }
  
        // NUEVO: Construir condiciones de atributos
        let atributosCondition = '';
        if (atributosFilters && Object.keys(atributosFilters).length > 0) {
          Object.entries(atributosFilters).forEach(([campo, valor]) => {
            if (valor && valor.trim() !== '') {
              const paramName = campo.replace(/\./g, '_');
              atributosCondition += ` AND LOWER(i."${campo}") LIKE :${paramName}`;
              replacements[paramName] = `%${valor.trim().toLowerCase()}%`;
            }
          });
        }
        
        if (idEntidad && idEntidad !== "null") {
          replacements.idEntidad = parseInt(idEntidad, 10);
        }
        if (idItem && idItem !== "null") {
          replacements.idItem = parseInt(idItem, 10);
        }
        if (idUbicacion && idUbicacion !== "null") {
          replacements.idUbicacion = parseInt(idUbicacion, 10);
        }
        
        // Consulta SQL para obtener items que NO tienen registros en listaDeMontos
        const query = `
          SELECT 
            i.id as "idItem",
            i.descripcion,
            i.codigo,
            i."codigoScanner",
            i."itemDatoAtributo1",
            i."itemDatoAtributo2",
            i."itemDatoAtributo3",
            i."itemDatoAtributo4",
            i."itemDatoAtributo5",
            i."itemDatoAtributo6",
            i."itemDatoAtributo7",
            i."itemDatoAtributo8",
            i."itemDatoAtributo9",
            i."itemDatoAtributo10"
          FROM item i
          WHERE i.eliminado = false
            ${idItem && idItem !== "null" ? 'AND i.id = :idItem' : ''}
            ${searchCondition}
            ${atributosCondition}
            AND NOT EXISTS (
              SELECT 1 FROM "listaDeMontos" ldm 
              WHERE ldm."idItem" = i.id 
                AND ldm.eliminado = false
                ${idEntidad && idEntidad !== "null" ? 'AND ldm."idEntidad" = :idEntidad' : ''}
                ${idUbicacion && idUbicacion !== "null" ? 'AND ldm."idUbicacion" = :idUbicacion' : ''}
            )
          ORDER BY i.descripcion
        `;
        
        // console.log("Query SQL para items sin precio:", query);
        // console.log("Replacements:", replacements);
        
        const resultados = await sequelize.query(query, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        });
        
        // console.log("Items sin precio encontrados:", resultados.length);
        
        // Procesar resultados - todos son items sin precio
        const itemsProcesados = resultados.map((row) => ({
          id: `sin-precio-${row.idItem}`,
          fecha: "-",
          idItem: row.idItem,
          idEntidad: null,
          idUbicacion: null,
          costo: null,
          descripcionEntidad: "-",
          ubicacion: "-",
          descripcion: row.descripcion,
          codigo: row.codigo,
          codigoScanner: row.codigoScanner,
          itemDatoAtributo1: row.itemDatoAtributo1 || null,
          itemDatoAtributo2: row.itemDatoAtributo2 || null,
          itemDatoAtributo3: row.itemDatoAtributo3 || null,
          itemDatoAtributo4: row.itemDatoAtributo4 || null,
          itemDatoAtributo5: row.itemDatoAtributo5 || null,
          itemDatoAtributo6: row.itemDatoAtributo6 || null,
          itemDatoAtributo7: row.itemDatoAtributo7 || null,
          itemDatoAtributo8: row.itemDatoAtributo8 || null,
          itemDatoAtributo9: row.itemDatoAtributo9 || null,
          itemDatoAtributo10: row.itemDatoAtributo10 || null,
          leadTime: null,
          eliminado: false,
          createdAt: "-",
          updatedAt: "-",
        }));
        
        // Aplicar paginación
        const offset = (page - 1) * limit;
        const itemsPaginados = itemsProcesados.slice(offset, offset + parseInt(limit, 10));
        
        totalCount = itemsProcesados.length;
        totalPages = Math.ceil(totalCount / limit);
        
        return res.status(200).json({
          items: itemsPaginados,
          totalPages,
          totalCount,
        });
      }
  
      // CASO 2: Solo últimos precios (comportamiento normal)
      if (soloUltimosActivo) {
        // Traemos TODOS los registros que cumplan con el filtro (sin paginación)
        
        // PASO 1: Construir consulta SQL para obtener últimos precios por combinación
        let searchCondition = '';
        let replacements = {};
        
        // Si hay texto de búsqueda y NO hay item específico seleccionado
        if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
          const searchTermLower = searchText.trim().toLowerCase();
          searchCondition = `AND (
            LOWER(i.descripcion) LIKE :searchTerm OR 
            LOWER(i.codigo) LIKE :searchTerm OR 
            LOWER(i."codigoScanner") LIKE :searchTerm
          )`;
          replacements.searchTerm = `%${searchTermLower}%`;
          // console.log("Filtro de búsqueda aplicado:", searchTermLower);
        }
  
        // NUEVO: Construir condiciones de atributos
        let atributosCondition = '';
        if (atributosFilters && Object.keys(atributosFilters).length > 0) {
          Object.entries(atributosFilters).forEach(([campo, valor]) => {
            if (valor && valor.trim() !== '') {
              const paramName = campo.replace(/\./g, '_');
              atributosCondition += ` AND LOWER(i."${campo}") LIKE :${paramName}`;
              replacements[paramName] = `%${valor.trim().toLowerCase()}%`;
            }
          });
        }
        
        // Construir condiciones WHERE para ListaDeMontos
        let ldmWhereConditions = ['ldm.eliminado = false'];
        if (idEntidad && idEntidad !== "null") {
          ldmWhereConditions.push('ldm."idEntidad" = :idEntidad');
          replacements.idEntidad = parseInt(idEntidad, 10);
        }
        if (idItem && idItem !== "null") {
          ldmWhereConditions.push('ldm."idItem" = :idItem');
          replacements.idItem = parseInt(idItem, 10);
        }
        if (idUbicacion && idUbicacion !== "null") {
          ldmWhereConditions.push('ldm."idUbicacion" = :idUbicacion');
          replacements.idUbicacion = parseInt(idUbicacion, 10);
        }
        
        // Construir condiciones WHERE para Entidad
        let entidadWhereConditions = ['e.eliminado = false'];
        if (idTipoEntidad && idTipoEntidad !== "null") {
          entidadWhereConditions.push('e."idTipoEntidad" = :idTipoEntidad');
          replacements.idTipoEntidad = parseInt(idTipoEntidad, 10);
        }
        
        // PASO 2: Consulta SQL para obtener últimos precios por combinación
        // Estrategia: Obtener solo items que tienen precios usando INNER JOIN
        const query = `
          SELECT 
            i.id as "idItem",
            i.descripcion,
            i.codigo,
            i."codigoScanner",
            i."itemDatoAtributo1",
            i."itemDatoAtributo2",
            i."itemDatoAtributo3",
            i."itemDatoAtributo4",
            i."itemDatoAtributo5",
            i."itemDatoAtributo6",
            i."itemDatoAtributo7",
            i."itemDatoAtributo8",
            i."itemDatoAtributo9",
            i."itemDatoAtributo10",
            ldm.fecha,
            ldm."idEntidad",
            ldm."idUbicacion",
            ldm.monto,
            ldm."margenGanancia",
            ldm."esProveedorReferente",
            e.descripcion as "descripcionEntidad",
            e.apellido,
            u.descripcion as "ubicacionDescripcion"
          FROM item i
          INNER JOIN "listaDeMontos" ldm ON i.id = ldm."idItem" 
            AND ldm.eliminado = false
            ${idEntidad && idEntidad !== "null" ? 'AND ldm."idEntidad" = :idEntidad' : ''}
            ${idUbicacion && idUbicacion !== "null" ? 'AND ldm."idUbicacion" = :idUbicacion' : ''}
          INNER JOIN entidad e ON ldm."idEntidad" = e.id 
            AND e.eliminado = false
            ${idTipoEntidad && idTipoEntidad !== "null" ? 'AND e."idTipoEntidad" = :idTipoEntidad' : ''}
          INNER JOIN ubicacion u ON ldm."idUbicacion" = u.id AND u.eliminado = false
          WHERE i.eliminado = false
            ${idItem && idItem !== "null" ? 'AND i.id = :idItem' : ''}
            ${searchCondition}
             ${atributosCondition}
          ORDER BY i.descripcion, ldm.fecha DESC
        `;
        // margenGanancia y esProveedorReferente incluidos en SELECT arriba
        
        // console.log("Ejecutando consulta para obtener últimos precios...");
        // console.log("Query SQL:", query);
        // console.log("Replacements:", replacements);
        
        const resultados = await sequelize.query(query, {
          replacements,
          type: sequelize.QueryTypes.SELECT
        });
        // console.log("Registros obtenidos:", resultados.length);
        // console.log("Primeros 3 resultados:", JSON.stringify(resultados.slice(0, 3), null, 2));
  
        // console.log("Total registros de la consulta SQL:", resultados.length);
  
        // PASO 5: Procesar resultados según si es "solo últimos" o no
        let itemsProcesados = [];
        
        // Agrupar por combinación (item-entidad-ubicación) para obtener solo el último precio
        // console.log("Agrupando por combinación item-entidad-ubicación...");
        const gruposPorCombinacion = {};
        
        resultados.forEach((row) => {
          const claveCombinacion = `${row.idItem}-${row.idEntidad}-${row.idUbicacion}`;
          
          if (!gruposPorCombinacion[claveCombinacion]) {
            gruposPorCombinacion[claveCombinacion] = {
              item: row,
              ultimoPrecio: null
            };
          }
          
          // Si es más reciente, actualizar
          if (!gruposPorCombinacion[claveCombinacion].ultimoPrecio || 
              new Date(row.fecha) > new Date(gruposPorCombinacion[claveCombinacion].ultimoPrecio.fecha)) {
            gruposPorCombinacion[claveCombinacion].ultimoPrecio = row;
          }
        });
        
        // console.log("Combinaciones encontradas:", Object.keys(gruposPorCombinacion).length);
          
        // Procesar resultados - solo items con último precio por combinación
        itemsProcesados = Object.values(gruposPorCombinacion).map((grupo) => {
          const row = grupo.ultimoPrecio;
          const fechaComun = dayjs(row.fecha).format("DD/MM/YYYY HH:mm:ss");
          const fechaFormateada = dayjs(row.fecha).format("DD/MM/YYYY HH:mm:ss:SSS");
          
          return {
            id: `${row.idItem}-${row.idEntidad}-${row.idUbicacion}-${fechaFormateada}`,
            fecha: fechaComun,
            idItem: row.idItem,
            idEntidad: row.idEntidad,
            idUbicacion: row.idUbicacion,
            costo: row.monto,
            margenGanancia: row.margenGanancia != null ? parseFloat(row.margenGanancia) : null,
            esProveedorReferente: row.esProveedorReferente ?? false,
            descripcionEntidad: `${row.descripcionEntidad || ''} ${row.apellido || ''}`.trim() || "Sin descripción",
            ubicacion: row.ubicacionDescripcion || "Sin ubicación",
            descripcion: row.descripcion,
            codigo: row.codigo,
            codigoScanner: row.codigoScanner,
            itemDatoAtributo1: row.itemDatoAtributo1 || null,
            itemDatoAtributo2: row.itemDatoAtributo2 || null,
            itemDatoAtributo3: row.itemDatoAtributo3 || null,
            itemDatoAtributo4: row.itemDatoAtributo4 || null,
            itemDatoAtributo5: row.itemDatoAtributo5 || null,
            itemDatoAtributo6: row.itemDatoAtributo6 || null,
            itemDatoAtributo7: row.itemDatoAtributo7 || null,
            itemDatoAtributo8: row.itemDatoAtributo8 || null,
            itemDatoAtributo9: row.itemDatoAtributo9 || null,
            itemDatoAtributo10: row.itemDatoAtributo10 || null,
            leadTime: null,
            eliminado: false,
            createdAt: row.fecha ? dayjs(row.fecha).format("DD/MM/YYYY HH:mm:ss") : "-",
            updatedAt: row.fecha ? dayjs(row.fecha).format("DD/MM/YYYY HH:mm:ss") : "-",
          };
        });
  
        // console.log("Items procesados:", itemsProcesados.length);
        // console.log("Primeros 3 items procesados:", JSON.stringify(itemsProcesados.slice(0, 3), null, 2));
        
        // PASO 6: Aplicar paginación a los items procesados
        const offset = (page - 1) * limit;
        const itemsPaginados = itemsProcesados.slice(offset, offset + parseInt(limit, 10));
        
        // Recalcular totales basado en items procesados
        totalCount = itemsProcesados.length;
        totalPages = Math.ceil(totalCount / limit);
        
        return res.status(200).json({
          items: itemsPaginados,
          totalPages,
          totalCount,
        });
      }
  
      // CASO 3: Mostrar todos los registros de listaDeMontos (comportamiento normal sin filtros especiales)
      if (!incluirSinPrecio && !soloUltimosActivo) {
        
        // Usar la lógica estándar de Sequelize con paginación
        listaMontos = await ListaDeMontos.findAll({
          where: whereCondition,
          include: [
            {
              model: Item,
              as: "item",
              where: whereConditionItem,
              attributes: ["id", "descripcion", "codigo", "codigoScanner", 
                "itemDatoAtributo1", "itemDatoAtributo2", "itemDatoAtributo3",
                "itemDatoAtributo4", "itemDatoAtributo5", "itemDatoAtributo6",
                "itemDatoAtributo7", "itemDatoAtributo8", "itemDatoAtributo9",
                "itemDatoAtributo10"],
            },
            {
              model: Ubicacion,
              as: "ubicacion",
              attributes: ["id", "descripcion"],
            },
            {
              model: Entidad,
              as: "entidad",
              where: whereConditionEntidad,
              attributes: [
                "id",
                "descripcion",
                "apellido",
                "dniCuitCuil",
                "email",
              ],
            },
          ],
          order: [["fecha", "DESC"]], // Ordenar por fecha descendente
          offset: (page - 1) * limit,
          limit: parseInt(limit, 10),
        });
  
        totalCount = await ListaDeMontos.count({
          where: whereCondition,
          include: [
            { model: Item, as: "item", where: whereConditionItem },
            { model: Entidad, as: "entidad", where: whereConditionEntidad },
          ],
        });
        totalPages = Math.ceil(totalCount / limit);
  
        if (!listaMontos || listaMontos.length === 0) {
          return res.status(404).json({
            message: "No se encontraron registros con los filtros aplicados",
            totalPages,
            totalCount,
          });
        }
  
        // Formatear resultados - misma estructura que CASO 2
        const listaMontosFormateados = listaMontos.map((record) => {
          const data = record.get({ plain: true });
          const fechaComun = dayjs(data.fecha).format("DD/MM/YYYY HH:mm:ss");
          const fechaFormateada = dayjs(data.fecha).format("DD/MM/YYYY HH:mm:ss:SSS");
          
          return {
            id: `${data.idItem}-${data.idEntidad}-${data.idUbicacion}-${fechaFormateada}`,
            fecha: fechaComun,
            idItem: data.idItem,
            idEntidad: data.idEntidad,
            idUbicacion: data.idUbicacion,
            costo: data.monto,
            descripcionEntidad: `${data.entidad?.descripcion || ''} ${data.entidad?.apellido || ''}`.trim() || "Sin descripción",
            ubicacion: data.ubicacion?.descripcion || "Sin ubicación",
            descripcion: data.item?.descripcion || "Sin descripción",
            codigo: data.item?.codigo || "Sin código",
            codigoScanner: data.item?.codigoScanner || "Sin código scanner",
            itemDatoAtributo1: data.item?.itemDatoAtributo1 || null,
            itemDatoAtributo2: data.item?.itemDatoAtributo2 || null,
            itemDatoAtributo3: data.item?.itemDatoAtributo3 || null,
            itemDatoAtributo4: data.item?.itemDatoAtributo4 || null,
            itemDatoAtributo5: data.item?.itemDatoAtributo5 || null,
            itemDatoAtributo6: data.item?.itemDatoAtributo6 || null,
            itemDatoAtributo7: data.item?.itemDatoAtributo7 || null,
            itemDatoAtributo8: data.item?.itemDatoAtributo8 || null,
            itemDatoAtributo9: data.item?.itemDatoAtributo9 || null,
            itemDatoAtributo10: data.item?.itemDatoAtributo10 || null,
            leadTime: null,
            eliminado: false,
            createdAt: data.fecha ? dayjs(data.fecha).format("DD/MM/YYYY HH:mm:ss") : "-",
            updatedAt: data.fecha ? dayjs(data.fecha).format("DD/MM/YYYY HH:mm:ss") : "-",
          };
        });
  
        return res.status(200).json({
          items: listaMontosFormateados,
          totalPages,
          totalCount,
        });
      }
  
        // Traemos TODOS los registros que cumplan con el filtro (sin paginación)
        listaMontos = await ListaDeMontos.findAll({
          where: whereCondition,
          include: [
            {
              model: Item,
              as: "item",
              where: whereConditionItem, // Aplicar filtro de búsqueda en items
              attributes: ["id", "descripcion", "codigo", "codigoScanner"],
            },
            {
              model: Ubicacion,
              as: "ubicacion",
              attributes: ["id", "descripcion"],
            },
            {
              model: Entidad,
              as: "entidad",
              where: whereConditionEntidad,
              attributes: [
                "id",
                "descripcion",
                "apellido",
                "dniCuitCuil",
                "email",
              ],
            },
          ],
        });
  
        if (!listaMontos || listaMontos.length === 0) {
          return res.status(404).json({
            message: "No se encontraron registros con los filtros aplicados",
            totalPages: 0,
            totalCount: 0,
          });
        }
  
      // CASO POR DEFECTO: Si no se ejecutó ningún caso anterior
      return res.status(400).json({
        message: "Configuración de parámetros inválida",
        debug: {
          incluirItemsSinPrecio,
          soloUltimos,
          casos_evaluados: {
            caso1: incluirItemsSinPrecio === "true",
            caso2: soloUltimos === "true", 
            caso3: !incluirItemsSinPrecio && soloUltimos === "false"
          }
        }
      });
  
    } catch (error) {
      console.error("Error al obtener la lista de montos:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener la lista de montos", error });
    }
  };
  
  const getEntidadesUnicasByFilters = async (req, res) => {
    const {
      idEntidad,
      idItem,
      idUbicacion,
      idTipoEntidad,
      soloUltimos,
      incluirItemsSinPrecio,
      searchText,
      filtrosAtributos
    } = req.query;
  
    try {
      // Parsear filtros de atributos si vienen como string JSON
      let atributosFilters = {};
      if (filtrosAtributos) {
        try {
          atributosFilters = typeof filtrosAtributos === 'string' ? JSON.parse(filtrosAtributos) : filtrosAtributos;
        } catch (e) {
          console.error("Error parseando filtros de atributos:", e);
        }
      }
      
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Construcción de la condición where dinámica (igual que getListaMontosByEntidad)
      const whereCondition = { eliminado: false };
      const whereConditionEntidad = { eliminado: false };
      const whereConditionItem = { eliminado: false };
  
      if (idEntidad && idEntidad !== "null") {
        whereCondition.idEntidad = idEntidad;
      }
      if (idItem && idItem !== "null") {
        whereCondition.idItem = idItem;
      }
      if (idUbicacion && idUbicacion !== "null") {
        whereCondition.idUbicacion = idUbicacion;
      }
      if (idTipoEntidad && idTipoEntidad !== "null") {
        whereConditionEntidad.idTipoEntidad = idTipoEntidad;
      }
      
      // Búsqueda múltiple por descripción de item
      if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
        const { Op } = require('sequelize');
        const searchTermLower = searchText.trim().toLowerCase();
        whereConditionItem[Op.or] = [
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item.descripcion')),
            { [Op.like]: `%${searchTermLower}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item.codigo')),
            { [Op.like]: `%${searchTermLower}%` }
          ),
          sequelize.where(
            sequelize.fn('LOWER', sequelize.col('item."codigoScanner"')),
            { [Op.like]: `%${searchTermLower}%` }
          )
        ];
      }
  
      // Aplicar filtros de atributos dinámicos
      if (atributosFilters && Object.keys(atributosFilters).length > 0) {
        const { Op } = require('sequelize');
        Object.entries(atributosFilters).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== '') {
            whereConditionItem[campo] = {
              [Op.iLike]: `%${valor.trim()}%`
            };
          }
        });
      }
  
      // Normalizar valores
      const incluirSinPrecio = incluirItemsSinPrecio === "true" || incluirItemsSinPrecio === true;
      const soloUltimosActivo = soloUltimos === "true" || soloUltimos === true;
  
      let entidadesUnicas;
  
      // Si se solicitan items sin precio, no hay entidades asociadas (no tienen registros)
      if (incluirSinPrecio) {
        return res.status(200).json({
          entidades: [],
          message: "No hay entidades asociadas a items sin precio"
        });
      }
  
      // CASO NORMAL: Obtener entidades únicas de los registros filtrados
      if (soloUltimosActivo) {
        // Consulta SQL para obtener entidades únicas considerando solo últimos registros
        const query = `
          WITH ultimos_registros AS (
            SELECT DISTINCT ON (ldm."idItem", ldm."idUbicacion", ldm."idEntidad") 
              ldm."idEntidad"
            FROM "listaDeMontos" ldm
            INNER JOIN item i ON ldm."idItem" = i.id
            INNER JOIN entidad e ON ldm."idEntidad" = e.id
            WHERE ldm.eliminado = false
              AND i.eliminado = false
              AND e.eliminado = false
              ${idItem && idItem !== "null" ? 'AND ldm."idItem" = :idItem' : ''}
              ${idUbicacion && idUbicacion !== "null" ? 'AND ldm."idUbicacion" = :idUbicacion' : ''}
              ${idEntidad && idEntidad !== "null" ? 'AND ldm."idEntidad" = :idEntidad' : ''}
              ${idTipoEntidad && idTipoEntidad !== "null" ? 'AND e."idTipoEntidad" = :idTipoEntidad' : ''}
              ${searchText && searchText.trim() !== "" && (!idItem || idItem === "null") ? `
                AND (
                  LOWER(i.descripcion) LIKE :searchTerm OR 
                  LOWER(i.codigo) LIKE :searchTerm OR 
                  LOWER(i."codigoScanner") LIKE :searchTerm
                )
              ` : ''}
              ${Object.entries(atributosFilters).map(([campo, valor]) => 
                valor && valor.trim() !== '' ? `AND LOWER(i."${campo}") LIKE :${campo.replace(/\./g, '_')}` : ''
              ).filter(Boolean).join(' ')}
            ORDER BY ldm."idItem", ldm."idUbicacion", ldm."idEntidad", ldm.fecha DESC
          )
          SELECT DISTINCT e.*
          FROM entidad e
          INNER JOIN ultimos_registros ur ON e.id = ur."idEntidad"
          WHERE e.eliminado = false
          ORDER BY e.descripcion, e.apellido
        `;
  
        const replacements = {};
        if (idItem && idItem !== "null") replacements.idItem = parseInt(idItem, 10);
        if (idUbicacion && idUbicacion !== "null") replacements.idUbicacion = parseInt(idUbicacion, 10);
        if (idEntidad && idEntidad !== "null") replacements.idEntidad = parseInt(idEntidad, 10);
        if (idTipoEntidad && idTipoEntidad !== "null") replacements.idTipoEntidad = parseInt(idTipoEntidad, 10);
        if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
          replacements.searchTerm = `%${searchText.trim().toLowerCase()}%`;
        }
        
        // Agregar replacements para atributos
        Object.entries(atributosFilters).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== '') {
            const paramName = campo.replace(/\./g, '_');
            replacements[paramName] = `%${valor.trim().toLowerCase()}%`;
          }
        });
  
        entidadesUnicas = await sequelize.query(query, {
          replacements,
          type: sequelize.QueryTypes.SELECT,
          model: Entidad,
          mapToModel: true
        });
      } else {
        // Sin filtro de solo últimos: obtener todas las entidades únicas que tienen registros
        entidadesUnicas = await Entidad.findAll({
          attributes: [
            'id', 'descripcion', 'apellido', 'cuit', 'domicilio', 
            'telefono', 'email', 'idTipoEntidad', 'eliminado'
          ],
          include: [{
            model: ListaDeMontos,
            as: 'listaDeMontosEntidad',
            attributes: [],
            where: whereCondition,
            required: true,
            include: [{
              model: Item,
              as: 'item',
              attributes: [],
              where: whereConditionItem,
              required: true
            }]
          }],
          where: whereConditionEntidad,
          group: ['Entidad.id'],
          order: [
            ['descripcion', 'ASC'],
            ['apellido', 'ASC']
          ]
        });
      }
  
      return res.status(200).json({
        entidades: entidadesUnicas,
        count: entidadesUnicas.length
      });
  
    } catch (error) {
      console.error("Error al obtener entidades únicas:", error);
      return res.status(500).json({ 
        message: "Error al obtener entidades únicas", 
        error: error.message 
      });
    }
  };
  
  const getValoresUnicosAtributo = async (req, res) => {
    const { campo, searchText } = req.query;
  
    try {
      // Validar que el campo sea uno de los atributos válidos
      const atributosValidos = [
        'itemDatoAtributo1', 'itemDatoAtributo2', 'itemDatoAtributo3',
        'itemDatoAtributo4', 'itemDatoAtributo5', 'itemDatoAtributo6',
        'itemDatoAtributo7', 'itemDatoAtributo8', 'itemDatoAtributo9',
        'itemDatoAtributo10'
      ];
  
      if (!campo || !atributosValidos.includes(campo)) {
        return res.status(400).json({ 
          message: "Campo de atributo inválido",
          camposValidos: atributosValidos
        });
      }
  
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Item } = itemModelInit(sequelize);
  
      // Construir la consulta para obtener valores únicos
      let whereCondition = {
        eliminado: false,
        [campo]: { [require('sequelize').Op.ne]: null } // No incluir valores null
      };
  
      // Si hay texto de búsqueda, filtrar por él
      if (searchText && searchText.trim() !== '') {
        whereCondition[campo] = {
          [require('sequelize').Op.and]: [
            { [require('sequelize').Op.ne]: null },
            { [require('sequelize').Op.iLike]: `%${searchText.trim()}%` }
          ]
        };
      }
  
      // Obtener valores únicos, ordenados y limitados a 50 para performance
      const valores = await Item.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col(campo)), 'valor']
        ],
        where: whereCondition,
        order: [[sequelize.literal('valor'), 'ASC']],
        limit: 50,
        raw: true
      });
  
      // Extraer solo los valores (sin el wrapper de objeto)
      const valoresUnicos = valores
        .map(v => v.valor)
        .filter(v => v && v.trim() !== ''); // Filtrar valores vacíos
  
      return res.status(200).json({
        valores: valoresUnicos,
        count: valoresUnicos.length,
        campo: campo
      });
  
    } catch (error) {
      console.error("Error al obtener valores únicos de atributo:", error);
      return res.status(500).json({ 
        message: "Error al obtener valores únicos de atributo", 
        error: error.message 
      });
    }
  };
  
  const updateAllPrices = async (req, res) => {
    const { tipoAjuste, valor } = req.body;
  
    if (!valor) {
      return res
        .status(400)
        .json({ message: "El valor de ajuste es requerido." });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
      const { Entidad } = adminModelInit(sequelize);
  
      // Obtener las entidades de tipo 1 (clientes)
      const entidadesClientes = await Entidad.findAll({
        where: { idTipoEntidad: 1 },
        attributes: ["id"],
      });
      const idsEntidades = entidadesClientes.map((e) => e.id);
  
      // Buscar todos los registros activos de esas entidades
      const registros = await ListaDeMontos.findAll({
        where: {
          idEntidad: idsEntidades,
          eliminado: false,
        },
      });
  
      // Agrupar los registros por la combinación idItem-idEntidad-idUbicacion
      let grupos = {};
      registros.forEach((registro) => {
        const key = `${registro.idItem}-${registro.idEntidad}-${registro.idUbicacion}`;
        if (!grupos[key]) {
          grupos[key] = [];
        }
        grupos[key].push(registro);
      });
  
      let nuevosRegistros = [];
  
      // Para cada grupo, seleccionar el registro con la fecha más reciente y calcular el nuevo monto
      for (const key in grupos) {
        let grupo = grupos[key];
        let latest = grupo.reduce((prev, curr) => {
          return new Date(curr.fecha) > new Date(prev.fecha) ? curr : prev;
        });
  
        let newMonto;
        if (tipoAjuste === "porcentaje") {
          const porcentaje = parseFloat(valor) / 100;
          newMonto = latest.monto * (1 + porcentaje);
        } else if (tipoAjuste === "valor") {
          newMonto = latest.monto + parseFloat(valor);
        } else {
          return res.status(400).json({
            message: "Tipo de ajuste inválido. Debe ser 'porcentaje' o 'valor'.",
          });
        }
  
        // Crear un nuevo registro para ese grupo con la fecha actual
        const nuevoRegistro = await ListaDeMontos.create({
          fecha: new Date(), // Nueva fecha que forma parte de la PK
          idItem: latest.idItem,
          idEntidad: latest.idEntidad,
          idUbicacion: latest.idUbicacion,
          monto: newMonto,
          eliminado: false,
        });
        nuevosRegistros.push(nuevoRegistro);
      }
  
      res.status(200).json({
        message: `Se crearon nuevos registros para ${nuevosRegistros.length} grupos.`,
        nuevosRegistros,
      });
    } catch (error) {
      console.error("Error al crear nuevos registros:", error);
      res
        .status(500)
        .json({ message: "Error al actualizar los precios.", error });
    }
  };
  
  // Nueva función para actualizar precios respetando filtros de búsqueda
  const updateFilteredPrices = async (req, res) => {
    const { 
      tipoAjuste, 
      valor, 
      idEntidad, 
      idItem, 
      idUbicacion, 
      idTipoEntidad, 
      soloUltimos, 
      searchText, 
      incluirItemsSinPrecio,
      filtrosAtributos, // NUEVO: Filtros por atributos dinámicos
      actualizarPrecios, // NUEVO: Si true, recalcula precios de clientes
      idEntidadesCliente, // NUEVO: Array de IDs de entidades cliente a actualizar
      soloProveedoresReferentes, // Si true, solo afecta registros con esProveedorReferente
    } = req.body;
  
    if (!valor) {
      return res
        .status(400)
        .json({ message: "El valor de ajuste es requerido." });
    }
  
    try {
      // Parsear filtros de atributos si vienen como string JSON
      let atributosFilters = {};
      if (filtrosAtributos) {
        try {
          atributosFilters = typeof filtrosAtributos === 'string' ? JSON.parse(filtrosAtributos) : filtrosAtributos;
        } catch (e) {
          console.error("Error parseando filtros de atributos:", e);
        }
      }
      
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Reutilizar la misma lógica de getListaMontosByEntidad para obtener los registros filtrados
      const whereCondition = { eliminado: false };
      const whereConditionEntidad = { eliminado: false };
      const whereConditionItem = { eliminado: false };
  
      if (idEntidad && idEntidad !== "null") {
        whereCondition.idEntidad = idEntidad;
      }
      if (idItem && idItem !== "null") {
        whereCondition.idItem = idItem;
      }
      if (idUbicacion && idUbicacion !== "null") {
        whereCondition.idUbicacion = idUbicacion;
      }
      if (idTipoEntidad && idTipoEntidad !== "null") {
        whereConditionEntidad.idTipoEntidad = idTipoEntidad;
      }
  
      // Búsqueda múltiple por descripción de item
      if (searchText && searchText.trim() !== "" && searchText.trim() !== "null") {
        const searchTerms = searchText.trim().split(/\s+/);
        const searchConditions = searchTerms.map(term => ({
          descripcion: {
            [sequelize.Sequelize.Op.iLike]: `%${term}%`
          }
        }));
        whereConditionItem[sequelize.Sequelize.Op.and] = searchConditions;
      }
  
       // NUEVO: Aplicar filtros de atributos dinámicos
       if (atributosFilters && Object.keys(atributosFilters).length > 0) {
        const { Op } = require('sequelize');
        Object.entries(atributosFilters).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== '') {
            whereConditionItem[campo] = {
              [Op.iLike]: `%${valor.trim()}%`
            };
          }
        });
        // console.log("whereConditionItem con filtros de atributos:", whereConditionItem);
      }
  
      // Obtener registros que coinciden con los filtros (Sequelize ORM)
      const registros = await ListaDeMontos.findAll({
        where: whereCondition,
        include: [
          {
            model: Item,
            as: "item",
            where: whereConditionItem,
            required: true,
            attributes: ["id", "descripcion", "codigo", "codigoScanner"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            required: true,
            attributes: ["id", "descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            where: whereConditionEntidad,
            required: true,
            attributes: ["id", "descripcion", "apellido", "dniCuitCuil", "email", "idTipoEntidad"],
          },
        ],
        order: [["fecha", "DESC"]],
      });
  
      // Convertir a formato plano y agrupar por (idItem, idEntidad, idUbicacion) tomando el más reciente
      const grupos = {};
      registros.forEach((record) => {
        const plain = record.get({ plain: true });
        const item = {
          idItem: plain.idItem,
          idEntidad: plain.idEntidad,
          idUbicacion: plain.idUbicacion,
          monto: plain.monto,
          fecha: plain.fecha,
          margenGanancia: plain.margenGanancia ?? null,
          esProveedorReferente: plain.esProveedorReferente ?? false,
        };
        const key = `${item.idItem}-${item.idEntidad}-${item.idUbicacion}`;
        if (!grupos[key] || new Date(item.fecha) > new Date(grupos[key].fecha)) {
          grupos[key] = item;
        }
      });
  
      let registrosFiltrados = Object.values(grupos);
  
      if (soloProveedoresReferentes) {
        registrosFiltrados = registrosFiltrados.filter((r) => r.esProveedorReferente === true);
      }
  
      if (!registrosFiltrados || registrosFiltrados.length === 0) {
        return res.status(404).json({
          message: soloProveedoresReferentes
            ? "No se encontraron registros de proveedores referentes para actualizar con los filtros aplicados"
            : "No se encontraron registros para actualizar con los filtros aplicados"
        });
      }
  
      let nuevosRegistros = [];
  
      // Cada registro en registrosFiltrados es ya el más reciente por (idItem, idEntidad, idUbicacion)
      for (const latest of registrosFiltrados) {
        let newMonto;
        if (tipoAjuste === "porcentaje") {
          const porcentaje = parseFloat(valor) / 100;
          newMonto = latest.monto * (1 + porcentaje);
        } else if (tipoAjuste === "valor") {
          newMonto = parseFloat(valor); // Valor fijo reemplaza el costo, no suma
        } else {
          return res.status(400).json({
            message: "Tipo de ajuste inválido. Debe ser 'porcentaje' o 'valor'.",
          });
        }
  
        // Crear un nuevo registro para ese grupo con la fecha actual, heredando margen y referente
        const nuevoRegistro = await ListaDeMontos.create({
          fecha: new Date(),
          idItem: latest.idItem,
          idEntidad: latest.idEntidad,
          idUbicacion: latest.idUbicacion,
          monto: newMonto,
          margenGanancia: latest.margenGanancia ?? null,
          esProveedorReferente: latest.esProveedorReferente ?? false,
          eliminado: false,
        });
        nuevosRegistros.push(nuevoRegistro);
      }
  
      // Recalcular precios de clientes si se solicitó
      let preciosActualizados = 0;
      if (actualizarPrecios && Array.isArray(idEntidadesCliente) && idEntidadesCliente.length > 0) {
        for (const registro of nuevosRegistros) {
          if (!registro.esProveedorReferente || registro.margenGanancia == null) continue;
          const nuevoPrecio = registro.monto * (1 + parseFloat(registro.margenGanancia) / 100);
          for (const idEntidadCliente of idEntidadesCliente) {
            await ListaDeMontos.create({
              fecha: new Date(),
              idItem: registro.idItem,
              idUbicacion: registro.idUbicacion,
              idEntidad: parseInt(idEntidadCliente, 10),
              monto: nuevoPrecio,
              margenGanancia: null,
              esProveedorReferente: false,
              eliminado: false,
            });
            preciosActualizados++;
          }
        }
      }
  
      res.status(200).json({
        message: `Se actualizaron ${nuevosRegistros.length} registros que coinciden con los filtros aplicados.${preciosActualizados > 0 ? ` Se recalcularon ${preciosActualizados} precios de clientes.` : ''}`,
        nuevosRegistros,
        preciosActualizados,
      });
    } catch (error) {
      console.error("Error al actualizar precios filtrados:", error);
      res
        .status(500)
        .json({ message: "Error al actualizar los precios filtrados.", error });
    }
  };
  
  const updateItemPrecioListaId = async (req, res) => {
    const { idItem, idEntidad, idUbicacion, monto, tipoAjuste } = req.body;
  
  
  
    // Validación de datos
    if (
      !idItem ||
      !idEntidad ||
      !idUbicacion ||
      monto === undefined ||
      !tipoAjuste
    ) {
      return res.status(400).json({ success: false });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Buscamos el último registro para esa combinación, para calcular el nuevo monto basado en el último valor
      const latestRecord = await ListaDeMontos.findOne({
        where: {
          idItem: parseInt(idItem, 10),
          idEntidad: parseInt(idEntidad, 10),
          idUbicacion: parseInt(idUbicacion, 10),
        },
        order: [["fecha", "DESC"]],
      });
  
      // Verificar si ya existe y el monto es igual
      if (latestRecord) {
        const monto1 = Math.round(latestRecord.monto * 100) / 100;
        const monto2 = Math.round(monto * 100) / 100;
        
        // Si los montos son iguales, no hacer nada y retornar éxito silenciosamente
        if (monto1 === monto2) {
          return res.status(200).json({ success: true });
        }
      }
  
      let newMonto;
      if (latestRecord) {
        // Si existe registro previo, aplicar el tipo de ajuste
        if (tipoAjuste === "porcentaje") {
          const porcentaje = parseFloat(monto) / 100;
          newMonto = latestRecord.monto * (1 + porcentaje);
        } else if (tipoAjuste === "valor") {
          newMonto = parseFloat(monto);
        } else {
          return res.status(400).json({ success: false });
        }
  
        // Crear un nuevo registro heredando margenGanancia y esProveedorReferente del registro anterior
        const nuevoRegistro = await ListaDeMontos.create({
          fecha: new Date(),
          idItem: parseInt(idItem, 10),
          idEntidad: parseInt(idEntidad, 10),
          idUbicacion: parseInt(idUbicacion, 10),
          monto: newMonto,
          margenGanancia: latestRecord.margenGanancia ?? null,
          esProveedorReferente: latestRecord.esProveedorReferente ?? false,
          eliminado: false,
        });
      } else {
        // Si no hay registro previo, crear el primer registro como postListaMonto
        // Solo permitir tipoAjuste "valor" para el primer registro
        if (tipoAjuste !== "valor") {
          return res.status(400).json({ success: false });
        }
  
        newMonto = parseFloat(monto);
        
        // Crear el primer registro
        const nuevoRegistro = await ListaDeMontos.create({
          fecha: new Date(),
          idItem: parseInt(idItem, 10),
          idUbicacion: parseInt(idUbicacion, 10),
          idEntidad: parseInt(idEntidad, 10),
          monto: newMonto,
          eliminado: false,
        });
      }
  
      // Retornar éxito sin mensaje para evitar notificaciones por cada item
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error al crear el registro:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  
  // Actualizar margen de ganancia de un registro individual (por combinación item+entidad+ubicación)
  const updateMargenGananciaListaId = async (req, res) => {
    const { idItem, idEntidad, idUbicacion, margenGanancia } = req.body;
  
    if (!idItem || !idEntidad || !idUbicacion) {
      return res.status(400).json({ success: false, message: "idItem, idEntidad e idUbicacion son requeridos." });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      // Buscar el último registro para esa combinación
      const latestRecord = await ListaDeMontos.findOne({
        where: {
          idItem: parseInt(idItem, 10),
          idEntidad: parseInt(idEntidad, 10),
          idUbicacion: parseInt(idUbicacion, 10),
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
      });
  
      if (!latestRecord) {
        return res.status(404).json({ success: false, message: "No se encontró registro para la combinación dada." });
      }
  
      const nuevoMargen = margenGanancia !== undefined && margenGanancia !== null && margenGanancia !== ""
        ? parseFloat(margenGanancia)
        : null;
  
      await latestRecord.update({ margenGanancia: nuevoMargen });
  
      return res.status(200).json({ success: true, margenGanancia: nuevoMargen });
    } catch (error) {
      console.error("Error al actualizar margenGanancia:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };
  
  // Actualizar margen de ganancia de forma masiva según filtros activos
  const updateMargenGananciaFiltrado = async (req, res) => {
    const {
      margenGanancia,
      tipoAjusteMargen, // "valor" (reemplazar) o "sumar" (sumar al actual)
      idEntidad,
      idItem,
      idUbicacion,
      idTipoEntidad,
      soloUltimos,
      searchText,
      incluirItemsSinPrecio,
      filtrosAtributos,
      actualizarPrecios,
      idEntidadesCliente,
      soloProveedoresReferentes,
    } = req.body;
  
    if (margenGanancia === undefined || margenGanancia === null || margenGanancia === "") {
      return res.status(400).json({ success: false, message: "margenGanancia es requerido." });
    }
  
    const nuevoMargenValor = parseFloat(margenGanancia);
    if (isNaN(nuevoMargenValor)) {
      return res.status(400).json({ success: false, message: "margenGanancia debe ser un número válido." });
    }
  
    const ajuste = tipoAjusteMargen || "valor";
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      let atributosFilters = {};
      if (filtrosAtributos) {
        try {
          atributosFilters = typeof filtrosAtributos === "string" ? JSON.parse(filtrosAtributos) : filtrosAtributos;
        } catch (e) {}
      }
  
      const whereCondition = { eliminado: false };
      const whereConditionEntidad = { eliminado: false };
      const whereConditionItem = { eliminado: false };
  
      if (idEntidad && idEntidad !== "null") whereCondition.idEntidad = idEntidad;
      if (idItem && idItem !== "null") whereCondition.idItem = idItem;
      if (idUbicacion && idUbicacion !== "null") whereCondition.idUbicacion = idUbicacion;
      if (idTipoEntidad && idTipoEntidad !== "null") whereConditionEntidad.idTipoEntidad = idTipoEntidad;
  
      if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
        const searchTerm = searchText.trim();
        whereConditionItem[Op.or] = [
          { descripcion: { [Op.iLike]: `%${searchTerm}%` } },
          { codigo: { [Op.iLike]: `%${searchTerm}%` } },
          { codigoScanner: { [Op.iLike]: `%${searchTerm}%` } },
        ];
      }
  
      if (atributosFilters && Object.keys(atributosFilters).length > 0) {
        Object.entries(atributosFilters).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== "") {
            whereConditionItem[campo] = { [Op.iLike]: `%${valor.trim()}%` };
          }
        });
      }
  
      const registros = await ListaDeMontos.findAll({
        where: whereCondition,
        include: [
          {
            model: Item,
            as: "item",
            where: whereConditionItem,
            required: true,
            attributes: ["id", "descripcion", "codigo", "codigoScanner"],
          },
          {
            model: Ubicacion,
            as: "ubicacion",
            required: true,
            attributes: ["id", "descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            where: whereConditionEntidad,
            required: true,
            attributes: ["id", "descripcion", "apellido", "dniCuitCuil", "email", "idTipoEntidad"],
          },
        ],
        order: [["fecha", "DESC"]],
      });
  
      const grupos = {};
      registros.forEach((record) => {
        const plain = record.get({ plain: true });
        const item = {
          idItem: plain.idItem,
          idEntidad: plain.idEntidad,
          idUbicacion: plain.idUbicacion,
          monto: plain.monto,
          fecha: plain.fecha,
          margenGanancia: plain.margenGanancia ?? null,
          esProveedorReferente: plain.esProveedorReferente ?? false,
        };
        const key = `${item.idItem}-${item.idEntidad}-${item.idUbicacion}`;
        if (!grupos[key] || new Date(item.fecha) > new Date(grupos[key].fecha)) {
          grupos[key] = item;
        }
      });
  
      let registrosFiltrados = Object.values(grupos);
  
      if (soloProveedoresReferentes) {
        registrosFiltrados = registrosFiltrados.filter((r) => r.esProveedorReferente === true);
      }
  
      if (registrosFiltrados.length === 0) {
        return res.status(404).json({
          success: false,
          message: soloProveedoresReferentes
            ? "No se encontraron registros de proveedores referentes para actualizar con los filtros aplicados"
            : "No se encontraron registros para actualizar con los filtros aplicados",
        });
      }
  
      let actualizados = 0;
      for (const reg of registrosFiltrados) {
        const margenActual = reg.margenGanancia != null ? parseFloat(reg.margenGanancia) : null;
        let margenFinal;
  
        if (ajuste === "sumar") {
          margenFinal = (margenActual !== null ? margenActual : 0) + nuevoMargenValor;
        } else {
          margenFinal = nuevoMargenValor;
        }
  
        // UPDATE del último registro de la combinación
        const updated = await ListaDeMontos.update(
          { margenGanancia: margenFinal },
          {
            where: {
              idItem: reg.idItem,
              idEntidad: reg.idEntidad,
              idUbicacion: reg.idUbicacion,
              fecha: reg.fecha,
              eliminado: false,
            },
          }
        );
        actualizados += updated[0] || 0;
  
        // Recalcular precios de clientes si se solicitó y es proveedor referente
        if (
          actualizarPrecios &&
          Array.isArray(idEntidadesCliente) &&
          idEntidadesCliente.length > 0 &&
          reg.esProveedorReferente &&
          reg.monto != null
        ) {
          const nuevoPrecio = parseFloat(reg.monto) * (1 + margenFinal / 100);
          for (const idEntidadCliente of idEntidadesCliente) {
            await ListaDeMontos.create({
              fecha: new Date(),
              idItem: reg.idItem,
              idUbicacion: reg.idUbicacion,
              idEntidad: parseInt(idEntidadCliente, 10),
              monto: nuevoPrecio,
              margenGanancia: null,
              esProveedorReferente: false,
              eliminado: false,
            });
          }
        }
      }
  
      return res.status(200).json({
        success: true,
        message: `Margen de ganancia actualizado en ${actualizados} registro(s).`,
        actualizados,
      });
    } catch (error) {
      console.error("Error al actualizar margenGanancia masivamente:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };
  
  const updatePreciosListaMultiple = async (req, res) => {
    const { idEntidades, monto, tipoAjuste, filtros } = req.body;
  
    if (
      !idEntidades ||
      idEntidades.length === 0 ||
      monto === undefined ||
      !tipoAjuste
    ) {
      return res.status(400).json({
        message: "Debe proporcionar al menos una entidad y un monto válido.",
      });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Item } = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
      const { Op } = require('sequelize');
  
      // Construcción de whereCondition base para ListaDeMontos
      const whereCondition = {
        idEntidad: idEntidades,
        eliminado: false,
      };
  
      // Si hay filtros activos, aplicarlos
      let includeItem = null;
      if (filtros && filtros.hayFiltrosActivos) {
        // Construcción de whereConditionItem similar a getListaMontosByEntidad
        const whereConditionItem = { eliminado: false };
        let hayFiltrosItem = false; // Flag para saber si hay filtros de Item
  
        // Filtro por item específico
        if (filtros.idItem && filtros.idItem !== "null") {
          whereCondition.idItem = filtros.idItem;
        }
  
        // Filtro por ubicación
        if (filtros.idUbicacion && filtros.idUbicacion !== "null") {
          whereCondition.idUbicacion = filtros.idUbicacion;
        }
  
        // Búsqueda múltiple por texto (descripción, código, codigoScanner)
        if (filtros.searchTextForMultiple && filtros.searchTextForMultiple.trim() !== "" && (!filtros.idItem || filtros.idItem === "null")) {
          const searchTermLower = filtros.searchTextForMultiple.trim().toLowerCase();
          // En includes, necesitamos usar Op.or con condiciones directas
          whereConditionItem[Op.or] = [
            { descripcion: { [Op.iLike]: `%${searchTermLower}%` } },
            { codigo: { [Op.iLike]: `%${searchTermLower}%` } },
            { codigoScanner: { [Op.iLike]: `%${searchTermLower}%` } }
          ];
          hayFiltrosItem = true;
        }
  
        // Filtros de atributos dinámicos
        if (filtros.atributosFilters && Object.keys(filtros.atributosFilters).length > 0) {
          Object.entries(filtros.atributosFilters).forEach(([campo, valor]) => {
            if (valor && valor.trim() !== '') {
              whereConditionItem[campo] = {
                [Op.iLike]: `%${valor.trim()}%`
              };
              hayFiltrosItem = true;
            }
          });
        }
  
        // Incluir el join con Item si hay filtros de item (búsqueda o atributos)
        if (hayFiltrosItem) {
          includeItem = {
            model: Item,
            as: 'item',
            where: whereConditionItem,
            attributes: [], // No necesitamos los datos del item, solo para filtrar
          };
        }
      }
  
      // Buscar los registros activos para las entidades seleccionadas (con filtros aplicados)
      const findOptions = {
        where: whereCondition,
      };
  
      if (includeItem) {
        findOptions.include = [includeItem];
      }
  
      const registros = await ListaDeMontos.findAll(findOptions);
  
      // Agrupar por idItem-idEntidad-idUbicacion
      let grupos = {};
      registros.forEach((registro) => {
        const key = `${registro.idItem}-${registro.idEntidad}-${registro.idUbicacion}`;
        if (!grupos[key]) {
          grupos[key] = [];
        }
        grupos[key].push(registro);
      });
  
      let nuevosRegistros = [];
  
      // Para cada grupo, tomar el registro más reciente y calcular el nuevo monto
      for (const key in grupos) {
        let grupo = grupos[key];
        let latest = grupo.reduce((prev, curr) => {
          return new Date(curr.fecha) > new Date(prev.fecha) ? curr : prev;
        });
  
        let newMonto;
        if (tipoAjuste === "porcentaje") {
          const porcentaje = parseFloat(monto) / 100;
          newMonto = latest.monto * (1 + porcentaje);
        } else if (tipoAjuste === "valor") {
          newMonto = latest.monto + parseFloat(monto);
        } else {
          return res.status(400).json({
            message: "Tipo de ajuste inválido. Debe ser 'porcentaje' o 'valor'.",
          });
        }
  
        // Crear el nuevo registro para el grupo, heredando margen y referente del anterior
        const nuevoRegistro = await ListaDeMontos.create({
          fecha: new Date(),
          idItem: latest.idItem,
          idEntidad: latest.idEntidad,
          idUbicacion: latest.idUbicacion,
          monto: newMonto,
          margenGanancia: latest.margenGanancia ?? null,
          esProveedorReferente: latest.esProveedorReferente ?? false,
          eliminado: false,
        });
        nuevosRegistros.push(nuevoRegistro);
      }
  
      const mensaje = filtros && filtros.hayFiltrosActivos
        ? `Se actualizaron los precios de ${nuevosRegistros.length} productos filtrados para las entidades seleccionadas.`
        : `Se actualizaron los precios de ${nuevosRegistros.length} productos para las entidades seleccionadas.`;
  
      res.status(200).json({
        message: mensaje,
        nuevosRegistros,
        filtrosAplicados: filtros?.hayFiltrosActivos || false,
      });
    } catch (error) {
      console.error("Error al crear nuevos registros:", error);
      res
        .status(500)
        .json({ message: "Error al actualizar los precios.", error });
    }
  };
  
  
  /** Lista de IDs enteros positivos desde query CSV (p.ej. "1,2,3") */
  const parseIdListFromQuery = (raw) => {
    if (raw == null || raw === "") return [];
    return String(raw)
      .split(",")
      .map((s) => parseInt(String(s).trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
  };
  
  const getTransaccionesPagoFilter = async (req, res) => {
    try {
      // 1) Leer query params
      const {
        startDate,       // YYYY-MM-DD
        endDate,         // opcional: fin de rango
        page,            // número de página
        idTipoMedioPago, // opcional: id de TipoMedioDePago
        idMedioPago,     // opcional: id de MedioDePago
        idUbicacion,     // opcional: id de Ubicacion (uno)
        idUbicaciones,   // opcional: varios IDs separados por coma
        idUsuario,       // opcional: id de Usuario
        idTipoTransaccion, // opcional: id de TipoTransaccion (uno)
        idTiposTransaccion, // opcional: varios IDs separados por coma
        zona
      } = req.query;
  
      const dayjs = require("dayjs");
      const utc = require("dayjs/plugin/utc");
      const tz = require("dayjs/plugin/timezone");
      dayjs.extend(utc);
      dayjs.extend(tz);
  
      if (!startDate || !zona) {
        return res.status(400).json({ message: "Faltan startDate o zona." });
      }
  
      const fechaBaseInicio = dayjs(startDate).tz(zona);
      if (!fechaBaseInicio.isValid()) {
        return res.status(400).json({ message: "startDate inválido." });
      }
  
      const fechaBaseFin = endDate ? dayjs(endDate).tz(zona) : fechaBaseInicio;
      if (!fechaBaseFin.isValid()) {
        return res.status(400).json({ message: "endDate inválido." });
      }
  
      const fechaFinReferencia = fechaBaseFin.isBefore(fechaBaseInicio, "day")
        ? fechaBaseInicio
        : fechaBaseFin;
  
      // 2) Armo los límites del rango (convertidos automáticamente a UTC al hacer .toDate())
      const fechaInicio = fechaBaseInicio.startOf("day").toDate();
      const fechaFin    = fechaFinReferencia.endOf("day").toDate();
  
      // 3) WHERE para Transaccion
      const { Op } = require("sequelize");
  
      const whereTrans = {
        eliminado: false,
        idTipoTransaccion: { [Op.ne]: 6 }, // *HARDCODED*
        fecha: { [Op.between]: [fechaInicio, fechaFin] }
      };
  
      // Filtro por ubicación (varios o uno)
      const ubicacionIdsList = parseIdListFromQuery(idUbicaciones);
      if (ubicacionIdsList.length > 0) {
        whereTrans.idUbicacion = { [Op.in]: ubicacionIdsList };
      } else {
        const ubicacionId = Number(idUbicacion);
        if (!isNaN(ubicacionId)) {
          whereTrans.idUbicacion = ubicacionId;
        }
      }
  
      // Filtro por usuario si se proporciona
      const usuarioId = Number(idUsuario);
      if (!isNaN(usuarioId)) {
        whereTrans.idUsuario = usuarioId;
      }
  
      // Filtro por tipo de transacción (varios o uno)
      const tiposTransaccionList = parseIdListFromQuery(idTiposTransaccion);
      if (tiposTransaccionList.length > 0) {
        whereTrans.idTipoTransaccion = { [Op.in]: tiposTransaccionList };
      } else {
        const tipoTransaccionId = Number(idTipoTransaccion);
        if (!isNaN(tipoTransaccionId)) {
          whereTrans.idTipoTransaccion = tipoTransaccionId;
        }
      }
  
      // 4) WHERE para MedioDePago
      const medioId     = Number(idMedioPago);
      const tipoMedioId = Number(idTipoMedioPago);
      const whereMedio  = { eliminado: false };
      if (!isNaN(medioId)) {
        whereMedio.id = medioId;
      }
      if (!isNaN(tipoMedioId)) {
        whereMedio.idTipoMedioDePago = tipoMedioId;
      }
  
      // 5) Paginación
      const pageNum  = parseInt(page, 10) || 1;
      const pageSize = parseInt(req.query.limit, 10) || 100;
      const offset   = (pageNum - 1) * pageSize;
  
      // 6) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TipoTransaccion
      } = transaccionModelInit(sequelize);
      const { adminModelInit } = require("../models/adminModel");
      const { Ubicacion, Usuario } = adminModelInit(sequelize);
  
      // 7) Query principal
      const { count, rows } = await TransaccionPago.findAndCountAll({
        where: { eliminado: false },
        distinct: true,
        limit: pageSize,
        offset,
        order: [[sequelize.col("transaccion.fecha"), "ASC"]],
        include: [
          {
            model: Transaccion,
            as: "transaccion",
            where: whereTrans,
            required: true,
            attributes: ["fechaHoraCreacion", "fecha", "idTipoTransaccion", "transaccionAsociada"],
            include: [
              {
                model: TipoTransaccion,
                as: "tipoTransaccion",
                attributes: ["descripcion", "operacionCaja", "verEnCaja", "verEnColumna"],
                where: { 
                  verEnColumna: { [Op.in]: ['Ingreso', 'Egreso'] }
                }
              },
              {
                model: Ubicacion,
                as: "ubicacion",
                attributes: ["descripcion", "id"]
              },
              {
                model: Usuario,
                as: "usuario",
                attributes: ["usuario", "id"]
              }
            ]
          },
          {
            model: Pago,
            as: "pago",
            required: true,
            attributes: ["montoTotal", "cotizacion", "id"],
            include: [
              {
                model: MedioDePago,
                as: "medioDePago",
                where: whereMedio,
                required: true,
                attributes: ["id", "descripcion"],
                include: [
                  {
                    model: TipoMedioDePago,
                    as: "tipoMedioDePago",
                    attributes: ["descripcion"],
                    where: { verEnCaja: true }
                  }
                ]
              }
            ]
          }
        ]
      });
  
      // 8) Calcular totales GLOBALES (sin paginación) para el footer
      // Necesitamos hacer una query adicional para obtener TODAS las transacciones del día
      const allTransacciones = await TransaccionPago.findAll({
        where: { eliminado: false },
        include: [
          {
            model: Transaccion,
            as: "transaccion",
            where: whereTrans,
            required: true,
            attributes: ["idTipoTransaccion", "idUbicacion"],
            include: [
              {
                model: TipoTransaccion,
                as: "tipoTransaccion",
                attributes: ["operacionCaja", "verEnColumna"],
                where: { 
                  verEnColumna: { [Op.in]: ['Ingreso', 'Egreso'] }
                }
              },
              {
                model: Ubicacion,
                as: "ubicacion",
                attributes: ["id", "descripcion"]
              }
            ]
          },
          {
            model: Pago,
            as: "pago",
            required: true,
            attributes: ["montoTotal", "cotizacion"],
            include: [
              {
                model: MedioDePago,
                as: "medioDePago",
                where: whereMedio,
                required: true,
                attributes: ["id", "descripcion"],
                include: [
                  {
                    model: TipoMedioDePago,
                    as: "tipoMedioDePago",
                    attributes: ["id"],
                    where: { verEnCaja: true }
                  }
                ]
              }
            ]
          }
        ]
      });
  
      // Calcular totales globales y agrupaciones en un único loop
      let totalIngresosGlobal = 0;
      let totalEgresosGlobal = 0;
      const agrupadoPorMedioPago = {};
      const agrupadoPorUbicacion = {};
      const agrupadoCombinado = {};
  
      allTransacciones.forEach((tp) => {
        const monto = tp.pago.montoTotal * tp.pago.cotizacion;
        const operacionCaja = tp.transaccion.tipoTransaccion.operacionCaja;
        const montoAbs = Math.abs(monto);
  
        // Totales globales
        if (operacionCaja === "+") {
          totalIngresosGlobal += montoAbs;
        } else if (operacionCaja === "-") {
          totalEgresosGlobal += montoAbs;
        }
  
        // Agrupado por medio de pago
        const medioPagoId = tp.pago.medioDePago.id;
        const medioPagoDesc = tp.pago.medioDePago.descripcion;
        if (!agrupadoPorMedioPago[medioPagoId]) {
          agrupadoPorMedioPago[medioPagoId] = { medioDePago: medioPagoDesc, totalIngresos: 0, totalEgresos: 0 };
        }
        if (operacionCaja === "+") agrupadoPorMedioPago[medioPagoId].totalIngresos += montoAbs;
        else if (operacionCaja === "-") agrupadoPorMedioPago[medioPagoId].totalEgresos += montoAbs;
  
        // Agrupado por ubicación
        const ubicacionId = tp.transaccion.ubicacion?.id || 0;
        const ubicacionDesc = tp.transaccion.ubicacion?.descripcion || "Sin ubicación";
        if (!agrupadoPorUbicacion[ubicacionId]) {
          agrupadoPorUbicacion[ubicacionId] = { ubicacion: ubicacionDesc, totalIngresos: 0, totalEgresos: 0 };
        }
        if (operacionCaja === "+") agrupadoPorUbicacion[ubicacionId].totalIngresos += montoAbs;
        else if (operacionCaja === "-") agrupadoPorUbicacion[ubicacionId].totalEgresos += montoAbs;
  
        // Agrupado combinado: ubicación + medio de pago
        const claveCombo = `${ubicacionId}_${medioPagoId}`;
        if (!agrupadoCombinado[claveCombo]) {
          agrupadoCombinado[claveCombo] = { ubicacion: ubicacionDesc, medioDePago: medioPagoDesc, totalIngresos: 0, totalEgresos: 0 };
        }
        if (operacionCaja === "+") agrupadoCombinado[claveCombo].totalIngresos += montoAbs;
        else if (operacionCaja === "-") agrupadoCombinado[claveCombo].totalEgresos += montoAbs;
      });
  
      // Convertir a arrays y calcular montoNeto
      const mediosDePagoAgrupados = Object.values(agrupadoPorMedioPago).map((item) => ({
        ...item,
        montoNeto: item.totalIngresos - item.totalEgresos
      }));
      const ubicacionesAgrupadas = Object.values(agrupadoPorUbicacion).map((item) => ({
        ...item,
        montoNeto: item.totalIngresos - item.totalEgresos
      }));
      const combinadoAgrupado = Object.values(agrupadoCombinado).map((item) => ({
        ...item,
        montoNeto: item.totalIngresos - item.totalEgresos
      }));
  
      // 9) Calcular total de la página actual (para la fila "totales" dentro de la tabla)
      const montoTotalTransacciones = rows.reduce((sum, tp) => {
        const { montoTotal, cotizacion } = tp.pago;
        return sum + (montoTotal * cotizacion);
      }, 0);
  
      // 10) Total de páginas
      const totalPages = Math.ceil(count / pageSize);
  
      // 11) Respuesta con totales globales, agrupaciones y datos de página
      return res.json({
        results: rows,
        currentPage: pageNum,
        totalPages,
        total: count,
        montoTotalTransacciones,
        totalesGlobales: {
          totalIngresos: totalIngresosGlobal,
          totalEgresos: totalEgresosGlobal,
          montoNeto: totalIngresosGlobal - totalEgresosGlobal
        },
        mediosDePagoAgrupados,
        ubicacionesAgrupadas,
        combinadoAgrupado
      });
  
    } catch (error) {
      console.error("getTransaccionesPagoFilter error:", error);
      return res.status(500).json({
        message: "Error al obtener transacciones con filtro",
        error: error.message
      });
    }
  };
  
  const parseCajaNumberFilter = (value) => {
    if (value === undefined || value === null || value === "" || value === "null" || value === "todas") {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  
  const getMediosDePagoCaja = async ({ MedioDePago, TipoMedioDePago, idMedioPago, idTipoMedioPago }) => {
    const whereMedio = { eliminado: false };
    const medioId = parseCajaNumberFilter(idMedioPago);
    const tipoMedioId = parseCajaNumberFilter(idTipoMedioPago);
  
    if (medioId !== null) whereMedio.id = medioId;
    if (tipoMedioId !== null) whereMedio.idTipoMedioDePago = tipoMedioId;
  
    return MedioDePago.findAll({
      where: whereMedio,
      include: [
        {
          model: TipoMedioDePago,
          as: "tipoMedioDePago",
          required: true,
          attributes: ["id", "descripcion"],
          where: { verEnCaja: true },
        },
      ],
      order: [["id", "ASC"]],
    });
  };
  
  const getUbicacionesCaja = async ({ Ubicacion, idUbicacion, idUbicaciones }) => {
    const baseWhere = { eliminado: false };
  
    if (idUbicaciones) {
      const ids = String(idUbicaciones).split(",").map(Number).filter(Number.isFinite);
      if (ids.length > 0) {
        return Ubicacion.findAll({
          where: { ...baseWhere, id: { [Op.in]: ids } },
          order: [["id", "ASC"]],
        });
      }
    }
  
    const ubicacionId = parseCajaNumberFilter(idUbicacion);
    if (ubicacionId !== null) {
      const ubicacion = await Ubicacion.findOne({
        where: { ...baseWhere, id: ubicacionId },
      });
      return ubicacion ? [ubicacion] : [];
    }
  
    return Ubicacion.findAll({
      where: baseWhere,
      order: [["id", "ASC"]],
    });
  };
  
  const calcularMovimientoCajaDiaPorMedio = async ({
    Transaccion,
    TipoTransaccion,
    TransaccionPago,
    Pago,
    MedioDePago,
    TipoMedioDePago,
    idUbicacion,
    idMedioDePago,
    inicioDia,
    finDia,
  }) => {
    const transacciones = await Transaccion.findAll({
      where: {
        eliminado: false,
        idTipoTransaccion: { [Op.ne]: 6 },
        idUbicacion,
        fecha: { [Op.between]: [inicioDia.toDate(), finDia.toDate()] },
      },
      include: [
        {
          model: TransaccionPago,
          as: "transaccionPago",
          where: { eliminado: false },
          required: true,
          include: [
            {
              model: Pago,
              as: "pago",
              attributes: ["montoTotal", "cotizacion"],
              required: true,
              where: { eliminado: false },
              include: [
                {
                  model: MedioDePago,
                  as: "medioDePago",
                  required: true,
                  where: { id: idMedioDePago, eliminado: false },
                  include: [
                    {
                      model: TipoMedioDePago,
                      as: "tipoMedioDePago",
                      required: true,
                      where: { verEnCaja: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: TipoTransaccion,
          as: "tipoTransaccion",
          attributes: ["operacionCaja"],
          where: { operacionCaja: { [Op.in]: ["+", "-"] } },
          required: true,
        },
      ],
    });
  
    return transacciones.reduce((total, transaccion) => {
      const operacionCaja = transaccion.tipoTransaccion?.operacionCaja;
      const totalTransaccion = (transaccion.transaccionPago || []).reduce((sum, tp) => {
        const pago = tp.pago || {};
        return sum + Math.abs((Number(pago.montoTotal) || 0) * (Number(pago.cotizacion) || 1));
      }, 0);
  
      if (operacionCaja === "+") return total + totalTransaccion;
      if (operacionCaja === "-") return total - totalTransaccion;
      return total;
    }, 0);
  };
  
  const guardarCajaDiaPorMedio = async ({
    Caja,
    fechaCaja,
    montoCierre,
    idUbicacion,
    idNegocio,
    idMedioDePago,
    reutilizarLegacy = true,
  }) => {
    const fecha = fechaCaja.startOf("day").toDate();
  
    let cajaDia = await Caja.findOne({
      where: {
        eliminado: false,
        idUbicacion,
        idMedioDePago,
        fecha,
      },
    });
  
    let created = false;
    let reusedLegacy = false;
  
    if (!cajaDia && reutilizarLegacy) {
      cajaDia = await Caja.findOne({
        where: {
          eliminado: false,
          idUbicacion,
          idMedioDePago: { [Op.is]: null },
          fecha,
        },
        order: [["id", "ASC"]],
      });
      reusedLegacy = Boolean(cajaDia);
    }
  
    if (cajaDia) {
      cajaDia.montoCierre = montoCierre;
      cajaDia.idNegocio = idNegocio;
      cajaDia.idMedioDePago = idMedioDePago;
      cajaDia.eliminado = false;
      await cajaDia.save();
      return { caja: cajaDia, created, reusedLegacy };
    }
  
    cajaDia = await Caja.create({
      fecha,
      montoCierre,
      idUbicacion,
      idNegocio,
      idMedioDePago,
      eliminado: false,
    });
    created = true;
  
    return { caja: cajaDia, created, reusedLegacy };
  };
  
  const getPrimeraFechaCajaPorMedio = async ({
    Caja,
    Transaccion,
    idUbicacion,
    idMedioDePago,
    zona,
    fallback,
  }) => {
    const primeraCaja = await Caja.findOne({
      where: {
        eliminado: false,
        idUbicacion,
        [Op.or]: [
          { idMedioDePago },
          { idMedioDePago: { [Op.is]: null } },
        ],
      },
      order: [["fecha", "ASC"]],
    });
  
    const [primeraTransaccion] = await Transaccion.sequelize.query(
      `
        SELECT MIN(t.fecha) AS fecha
        FROM "transaccion" t
        INNER JOIN "transaccionPago" tp
          ON tp."idTransaccion" = t.id
          AND tp.eliminado = false
        INNER JOIN "pago" p
          ON p.id = tp."idPago"
          AND p.eliminado = false
        INNER JOIN "medioDePago" mp
          ON mp.id = p."idMedioDePago"
          AND mp.eliminado = false
          AND mp.id = :idMedioDePago
        INNER JOIN "tipoMedioDePago" tmp
          ON tmp.id = mp."idTipoMedioDePago"
          AND tmp."verEnCaja" = true
        INNER JOIN "tipoTransaccion" tt
          ON tt.id = t."idTipoTransaccion"
          AND tt."operacionCaja" IN ('+', '-')
        WHERE t.eliminado = false
          AND t."idTipoTransaccion" != 6
          AND t."idUbicacion" = :idUbicacion
      `,
      {
        replacements: { idUbicacion, idMedioDePago },
        type: QueryTypes.SELECT,
      }
    );
  
    const fechas = [primeraCaja?.fecha, primeraTransaccion?.fecha].filter(Boolean);
    if (fechas.length === 0) return fallback.startOf("day");
  
    const primeraFecha = fechas.reduce((min, fecha) => {
      return new Date(fecha).getTime() < new Date(min).getTime() ? fecha : min;
    });
  
    return dayjs(primeraFecha).tz(zona).startOf("day");
  };
  
  const procesarCajaPorMedio = async ({
    Caja,
    Transaccion,
    TipoTransaccion,
    TransaccionPago,
    Pago,
    MedioDePago,
    TipoMedioDePago,
    idUbicacion,
    idNegocio,
    medio,
    zona,
    fechaInicio,
    fechaLimite,
    createOrUpdate,
    recalculoCompleto = false,
  }) => {
    const idMedioDePago = medio.id;
    const limiteBusqueda = createOrUpdate === "create"
      ? fechaInicio.toDate()
      : fechaInicio.add(-1, "day").toDate();
  
    let ultimaCaja = recalculoCompleto
      ? null
      : await Caja.findOne({
          where: {
            eliminado: false,
            idUbicacion,
            idMedioDePago,
            fecha: { [Op.lte]: limiteBusqueda },
          },
          order: [["fecha", "DESC"]],
        });
  
    let fechaProcesar;
    let saldoAcumulado;
    let cajaInicialCreada = null;
  
    if (recalculoCompleto) {
      fechaProcesar = await getPrimeraFechaCajaPorMedio({
        Caja,
        Transaccion,
        idUbicacion,
        idMedioDePago,
        zona,
        fallback: fechaInicio,
      });
      saldoAcumulado = 0;
    } else if (ultimaCaja) {
      fechaProcesar = createOrUpdate === "create"
        ? dayjs(ultimaCaja.fecha).tz(zona).add(1, "day")
        : fechaInicio;
      saldoAcumulado = Number(ultimaCaja.montoCierre) || 0;
    } else {
      const fechaSemilla = await getPrimeraFechaCajaPorMedio({
        Caja,
        Transaccion,
        idUbicacion,
        idMedioDePago,
        zona,
        fallback: fechaInicio.add(-1, "day"),
      });
      const fechaInicial = fechaSemilla.isBefore(fechaInicio, "day")
        ? fechaSemilla.add(-1, "day").startOf("day")
        : fechaInicio.add(-1, "day").startOf("day");
  
      const inicial = await guardarCajaDiaPorMedio({
        Caja,
        fechaCaja: fechaInicial,
        montoCierre: 0,
        idUbicacion,
        idNegocio,
        idMedioDePago,
        reutilizarLegacy: true,
      });
  
      cajaInicialCreada = inicial.caja;
      ultimaCaja = inicial.caja;
      fechaProcesar = createOrUpdate === "create"
        ? dayjs(ultimaCaja.fecha).tz(zona).add(1, "day")
        : fechaInicio;
      saldoAcumulado = Number(ultimaCaja.montoCierre) || 0;
    }
  
    const cajasAjustadas = [];
    let creadas = cajaInicialCreada ? 1 : 0;
    let actualizadas = 0;
    let reutilizadasLegacy = 0;
  
    while (fechaProcesar.toDate() <= fechaLimite.toDate()) {
      const ini = fechaProcesar.startOf("day");
      const fin = fechaProcesar.endOf("day");
      const totalDelDia = await calcularMovimientoCajaDiaPorMedio({
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        idUbicacion,
        idMedioDePago,
        inicioDia: ini,
        finDia: fin,
      });
  
      saldoAcumulado += totalDelDia;
  
      const resultadoCaja = await guardarCajaDiaPorMedio({
        Caja,
        fechaCaja: ini,
        montoCierre: saldoAcumulado,
        idUbicacion,
        idNegocio,
        idMedioDePago,
        reutilizarLegacy: true,
      });
  
      if (resultadoCaja.created) creadas += 1;
      else actualizadas += 1;
      if (resultadoCaja.reusedLegacy) reutilizadasLegacy += 1;
  
      cajasAjustadas.push(resultadoCaja.caja);
      ultimaCaja = resultadoCaja.caja;
      fechaProcesar = fechaProcesar.add(1, "day");
    }
  
    return {
      medioDePago: {
        id: medio.id,
        descripcion: medio.descripcion,
        tipoMedioDePago: medio.tipoMedioDePago?.descripcion || null,
      },
      saldoFinal: saldoAcumulado,
      ultimaCaja,
      cajasAjustadas,
      creadas,
      actualizadas,
      reutilizadasLegacy,
    };
  };
  
  // MODELO BASE DE USO DE FECHAS CON ZONA ENTRE FRONT Y BACK. ##################################################
  const getAndPostCajaDatos = async (req, res) => {
    const {
      startDate,
      zona,
      idUbicacion,
      idUbicaciones,
      createOrUpdate = "create",
      idMedioPago,
      medioDePagoId,
      idTipoMedioPago,
      tipoMedioDePagoId,
    } = req.query;
  
    if (!startDate || !zona) {
      return res.status(400).json({ message: "Debe enviar startDate y zona en query." });
    }
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Caja,
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
      } = transaccionModelInit(sequelize);
      const { Ubicacion, Negocio } = adminModelInit(sequelize);
  
      const fechaReferencia = dayjs(startDate).tz(zona);
      if (!fechaReferencia.isValid()) {
        return res.status(400).json({ message: "startDate inválido." });
      }
  
      let inicioDia = fechaReferencia.startOf("day");
      const ubicacionesAProcesar = await getUbicacionesCaja({ Ubicacion, idUbicacion, idUbicaciones });
      if (ubicacionesAProcesar.length === 0) {
        return res.status(404).json({ message: "No se encontraron ubicaciones activas." });
      }
  
      // Clamp: no generar registros de caja anteriores a la primera transacción real
      {
        const whereClamp = {
          eliminado: false,
          idUbicacion: { [Op.in]: ubicacionesAProcesar.map((u) => u.id) },
        };
        const primeraTransaccion = await Transaccion.findOne({
          where: whereClamp,
          include: [{
            model: TipoTransaccion,
            as: "tipoTransaccion",
            where: { operacionCaja: { [Op.in]: ["+", "-"] } },
            required: true,
            attributes: [],
          }],
          order: [["fecha", "ASC"]],
          attributes: ["fecha"],
        });
        if (primeraTransaccion) {
          const fechaMinima = dayjs(primeraTransaccion.fecha).tz(zona).startOf("day");
          if (inicioDia.isBefore(fechaMinima, "day")) {
            inicioDia = fechaMinima;
          }
        }
      }
  
      const mediosAProcesar = await getMediosDePagoCaja({
        MedioDePago,
        TipoMedioDePago,
        idMedioPago: idMedioPago ?? medioDePagoId,
        idTipoMedioPago: idTipoMedioPago ?? tipoMedioDePagoId,
      });
  
      if (mediosAProcesar.length === 0) {
        return res.status(200).json({
          message: "No hay medios de pago visibles en caja para los filtros indicados.",
          ubicaciones: ubicacionesAProcesar.map((ubicacion) => ({
            idUbicacion: ubicacion.id,
            descripcionUbicacion: ubicacion.descripcion,
            saldoFinal: 0,
            ultimaCaja: { montoCierre: 0, idUbicacion: ubicacion.id },
            cajasPorMedioDePago: [],
            mensaje: "Sin medios de pago para procesar.",
          })),
          totalUbicaciones: ubicacionesAProcesar.length,
        });
      }
  
      const negocioDefault = await Negocio.findOne({ where: { id: 1 } });
      const idNegocio = negocioDefault ? negocioDefault.id : 1;
      const fechaLimite = createOrUpdate === "create"
        ? inicioDia
        : dayjs().tz(zona).endOf("day");
  
      const resultadosPorUbicacion = [];
  
      for (const ubicacion of ubicacionesAProcesar) {
        const resultadosMedios = [];
        let saldoFinalUbicacion = 0;
        let creadas = 0;
        let actualizadas = 0;
        let reutilizadasLegacy = 0;
  
        for (const medio of mediosAProcesar) {
          const resultadoMedio = await procesarCajaPorMedio({
            Caja,
            Transaccion,
            TipoTransaccion,
            TransaccionPago,
            Pago,
            MedioDePago,
            TipoMedioDePago,
            idUbicacion: ubicacion.id,
            idNegocio,
            medio,
            zona,
            fechaInicio: inicioDia,
            fechaLimite,
            createOrUpdate,
          });
  
          saldoFinalUbicacion += Number(resultadoMedio.ultimaCaja?.montoCierre || 0);
          creadas += resultadoMedio.creadas;
          actualizadas += resultadoMedio.actualizadas;
          reutilizadasLegacy += resultadoMedio.reutilizadasLegacy;
          resultadosMedios.push(resultadoMedio);
        }
  
        resultadosPorUbicacion.push({
          idUbicacion: ubicacion.id,
          descripcionUbicacion: ubicacion.descripcion,
          saldoFinal: saldoFinalUbicacion,
          ultimaCaja: {
            fecha: inicioDia.toDate(),
            montoCierre: saldoFinalUbicacion,
            idUbicacion: ubicacion.id,
            descripcion: ubicacion.descripcion,
          },
          cajasPorMedioDePago: resultadosMedios.map((r) => ({
            medioDePago: r.medioDePago,
            ultimaCaja: r.ultimaCaja,
            saldoFinal: r.saldoFinal,
          })),
          estadisticas: { creadas, actualizadas, reutilizadasLegacy },
          mensaje: createOrUpdate === "create"
            ? "Caja actualizada por medio de pago hasta la fecha indicada."
            : "Caja recalculada por medio de pago desde la fecha indicada hasta hoy.",
        });
      }
  
      return res.status(200).json({
        message: "Proceso completado exitosamente.",
        ubicaciones: resultadosPorUbicacion,
        totalUbicaciones: resultadosPorUbicacion.length,
        totalMediosDePago: mediosAProcesar.length,
      });
    } catch (error) {
      console.error("❌ Error al recalcular cajas:", error);
      return res.status(500).json({
        message: "Error al recalcular cajas.",
        error: error.message,
      });
    }
  };
  
  const recalcularCajaCompleta = async (req, res) => {
    const zona = req.query.zona || "America/Argentina/Buenos_Aires";
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Caja,
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
      } = transaccionModelInit(sequelize);
      const { Ubicacion, Negocio } = adminModelInit(sequelize);
  
      const ubicacionesAProcesar = await getUbicacionesCaja({ Ubicacion, idUbicacion: "todas" });
      const mediosAProcesar = await getMediosDePagoCaja({ MedioDePago, TipoMedioDePago });
      const negocioDefault = await Negocio.findOne({ where: { id: 1 } });
      const idNegocio = negocioDefault ? negocioDefault.id : 1;
      const hoy = dayjs().tz(zona).startOf("day");
  
      const resultadosPorUbicacion = [];
      let totalCreadas = 0;
      let totalActualizadas = 0;
      let totalReutilizadasLegacy = 0;
  
      for (const ubicacion of ubicacionesAProcesar) {
        const resultadosMedios = [];
  
        for (const medio of mediosAProcesar) {
          const resultadoMedio = await procesarCajaPorMedio({
            Caja,
            Transaccion,
            TipoTransaccion,
            TransaccionPago,
            Pago,
            MedioDePago,
            TipoMedioDePago,
            idUbicacion: ubicacion.id,
            idNegocio,
            medio,
            zona,
            fechaInicio: hoy,
            fechaLimite: hoy,
            createOrUpdate: "update",
            recalculoCompleto: true,
          });
  
          totalCreadas += resultadoMedio.creadas;
          totalActualizadas += resultadoMedio.actualizadas;
          totalReutilizadasLegacy += resultadoMedio.reutilizadasLegacy;
  
          resultadosMedios.push({
            medioDePago: resultadoMedio.medioDePago,
            saldoFinal: resultadoMedio.saldoFinal,
            ultimaCaja: resultadoMedio.ultimaCaja,
            diasProcesados: resultadoMedio.cajasAjustadas.length,
            creadas: resultadoMedio.creadas,
            actualizadas: resultadoMedio.actualizadas,
            reutilizadasLegacy: resultadoMedio.reutilizadasLegacy,
          });
        }
  
        resultadosPorUbicacion.push({
          idUbicacion: ubicacion.id,
          descripcionUbicacion: ubicacion.descripcion,
          mediosDePago: resultadosMedios,
        });
      }
  
      return res.status(200).json({
        message: "Caja completa recalculada por ubicación y medio de pago.",
        totalUbicaciones: ubicacionesAProcesar.length,
        totalMediosDePago: mediosAProcesar.length,
        estadisticas: {
          creadas: totalCreadas,
          actualizadas: totalActualizadas,
          reutilizadasLegacy: totalReutilizadasLegacy,
        },
        ubicaciones: resultadosPorUbicacion,
      });
    } catch (error) {
      console.error("❌ Error al recalcular caja completa:", error);
      return res.status(500).json({
        message: "Error al recalcular caja completa.",
        error: error.message,
      });
    }
  };
  
  
  
  
  // 🔄 ACTUALIZADO: Análisis Financiero normalizado a Ventas + Gastos
  // Ventas: tipo 1 (Venta)
  // Gastos: misma lógica de TablaGastosComponent (tipos 5 y 9, excluye pagos desde CC)
  // ✅ CUMPLE CON: documentacion/configuracion regional/FILTROS-FECHAS-Y-TIMEZONE.md
  const getCajaByMedioDePago = async (req, res) => {
    try {
      // 1) Parámetros de query
      const {
        startDate, // Date object o ISO string con timezone
        endDate, // Date object o ISO string con timezone
        medioDePagoId, // id de MedioDePago
        tipoMedioDePagoId, // opcional: id de TipoMedioDePago
        ubicacionId, // opcional: id de Ubicacion (single, legacy)
        ubicacionIds, // opcional: array de IDs de Ubicacion (multiple)
        tiposTransaccionIds, // opcional: array de IDs de tipos de transacción
        entidadesIds, // opcional: array de IDs de entidades
        itemUbicacionPairs, // opcional: "idItem_idUbicacion,idItem2_idUbicacion2" (líneas de venta/compra)
      } = req.query;
  
      /** Pares (idItem, idUbicacion) para filtrar transacciones que contengan ese ítem en esa ubicación */
      const parsedItemUbicacionPairs = (() => {
        const raw = itemUbicacionPairs;
        if (!raw || !String(raw).trim()) return [];
        return String(raw)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((pair) => {
            const parts = pair.split("_");
            if (parts.length < 2) return null;
            const idItem = parseInt(parts[0], 10);
            const idUbicacion = parseInt(parts[1], 10);
            if (Number.isNaN(idItem) || Number.isNaN(idUbicacion)) return null;
            return { idItem, idUbicacion };
          })
          .filter(Boolean);
      })();
  
      // 2) ✅ Parsear fechas correctamente (según FILTROS-FECHAS-Y-TIMEZONE.md)
      // El frontend envía Date objects que se serializan como ISO strings en query params
      let fechaInicio = null;
      let fechaFin = null;
      
      if (startDate) {
        fechaInicio = startDate instanceof Date ? startDate : new Date(startDate);
        if (isNaN(fechaInicio.getTime())) {
          console.error('❌ [getCajaByMedioDePago] startDate inválido:', startDate);
          return res.status(400).json({ message: "Fecha de inicio inválida" });
        }
      }
      
      if (endDate) {
        fechaFin = endDate instanceof Date ? endDate : new Date(endDate);
        if (isNaN(fechaFin.getTime())) {
          console.error('❌ [getCajaByMedioDePago] endDate inválido:', endDate);
          return res.status(400).json({ message: "Fecha de fin inválida" });
        }
      }
      
      // console.log('✅ [getCajaByMedioDePago] Fechas parseadas:', {
      //   startDate: startDate,
      //   endDate: endDate,
      //   fechaInicio: fechaInicio,
      //   fechaFin: fechaFin
      // });
  
      const parseIdsParam = (value) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return [];
        const rawValues = Array.isArray(value) ? value : String(value).split(",");
        return rawValues
          .map((id) => Number(String(id).trim()))
          .filter((id) => !Number.isNaN(id));
      };
  
      // 3) WHERE base de Transaccion - USANDO CAMPO 'fecha' (fecha contable)
      const whereTrans = { eliminado: false };
      
      // ✅ Usar Date objects directamente (Sequelize maneja la conversión a timestamptz)
      if (fechaInicio && fechaFin) {
        whereTrans.fecha = { [Op.between]: [fechaInicio, fechaFin] };
      } else if (fechaInicio) {
        whereTrans.fecha = { [Op.gte]: fechaInicio };
      } else if (fechaFin) {
        whereTrans.fecha = { [Op.lte]: fechaFin };
      }
      
       // 3.1) Filtro por ubicación (ubicacionIds tiene prioridad sobre ubicacionId)
       if (ubicacionIds && (Array.isArray(ubicacionIds) ? ubicacionIds.length > 0 : ubicacionIds)) {
         const idsArray = Array.isArray(ubicacionIds)
           ? ubicacionIds.map(id => Number(id))
           : ubicacionIds.split(',').map(id => Number(id.trim()));
         const validIds = idsArray.filter(id => !isNaN(id));
         if (validIds.length > 0) {
           whereTrans.idUbicacion = { [Op.in]: validIds };
         }
       } else {
         const ubicId = Number(ubicacionId);
         if (ubicacionId != null && !isNaN(ubicId)) {
           whereTrans.idUbicacion = ubicId;
         }
       }
  
         // 3.2) Filtro por tipos de transacción (se interpreta dentro del universo analítico)
         const tiposTransaccionIdsArray = parseIdsParam(tiposTransaccionIds);
  
         // 3.3) Filtro por entidades (si viene el parámetro)
         if (entidadesIds && entidadesIds.length > 0) {
           const idsArray = parseIdsParam(entidadesIds);
           whereTrans.idEntidad = { [Op.in]: idsArray };
         }
  
      // 4) WHERE para MedioDePago, sólo filtramos si viene valor válido
      const mid = Number(medioDePagoId);
      const tmid = Number(tipoMedioDePagoId);
      const whereMedio = { eliminado: false };
  
      if (medioDePagoId != null && !isNaN(mid)) {
        whereMedio.id = mid;
      }
      if (tipoMedioDePagoId != null && !isNaN(tmid)) {
        whereMedio.idTipoMedioDePago = tmid;
      }
  
      // 5) Conexión y modelos
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TipoTransaccion,
      } = transaccionModelInit(sequelize);
  
      // Filtro por ítem + ubicación de la transacción (líneas en transaccionItem)
      let finalWhereTrans = whereTrans;
      if (parsedItemUbicacionPairs.length > 0) {
        const pairOr = parsedItemUbicacionPairs.map(({ idItem, idUbicacion }) => ({
          [Op.and]: [
            { idUbicacion },
            sequelize.where(
              sequelize.literal(
                `(SELECT COUNT(*)::int FROM "transaccionItem" AS ti WHERE ti."idTransaccion" = "Transaccion"."id" AND ti."idItem" = ${idItem} AND (ti."eliminado" IS NOT TRUE))`
              ),
              Op.gt,
              0
            ),
          ],
        }));
        finalWhereTrans = { [Op.and]: [whereTrans, { [Op.or]: pairOr }] };
      }
  
      const TIPO_VENTA = 1;
      const TIPOS_GASTO = [5, 9];
      const TIPOS_ANALITICOS = [TIPO_VENTA, ...TIPOS_GASTO];
      const tiposAnaliticosSeleccionados = tiposTransaccionIdsArray.length > 0
        ? TIPOS_ANALITICOS.filter((id) => tiposTransaccionIdsArray.includes(id))
        : TIPOS_ANALITICOS;
  
      const condicionesAnaliticas = [];
  
      if (tiposAnaliticosSeleccionados.includes(TIPO_VENTA)) {
        condicionesAnaliticas.push({ idTipoTransaccion: TIPO_VENTA });
      }
  
      const tiposGastoSeleccionados = TIPOS_GASTO.filter((id) =>
        tiposAnaliticosSeleccionados.includes(id)
      );
  
      if (tiposGastoSeleccionados.length > 0) {
        condicionesAnaliticas.push({
          idTipoTransaccion: { [Op.in]: tiposGastoSeleccionados },
          transaccionAsociada: null,
          [Op.or]: [
            { operacionParaCuentaCorriente: null },
            { operacionParaCuentaCorriente: { [Op.ne]: "operacionCaja" } },
          ],
        });
      }
  
      if (condicionesAnaliticas.length === 0) {
        return res.status(200).json({ movimientos: [], caja: [] });
      }
  
      const finalWhereAnalitico = { [Op.and]: [finalWhereTrans, { [Op.or]: condicionesAnaliticas }] };
      const filtrosMedioActivos =
        (medioDePagoId != null && !isNaN(mid)) ||
        (tipoMedioDePagoId != null && !isNaN(tmid));
  
      // 6) Query: INNER JOIN - movimientos analíticos basados en ventas y gastos reales
      const transacciones = await Transaccion.findAll({
        where: finalWhereAnalitico,
        attributes: ["id", "fecha", "montoTotal"],
        include: [
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false },
            required: true,
            include: [
              {
                model: Pago,
                as: "pago",
                required: true,
                attributes: ["montoTotal", "cotizacion", "id"],
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    where: whereMedio,
                    required: true,
                    attributes: ["id", "descripcion"],
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                        // ❌ REMOVIDO: where: { verEnCaja: true } - Ahora incluye TODOS los medios de pago
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["id", "descripcion"],
          },
        ],
        order: [
          ["fecha", "ASC"],
          ["id", "ASC"],
        ],
      });
  
      // 7) Transformación a movimientos analíticos normalizados
      const uniqueLabels = (values) =>
        Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
  
      const movimientos = transacciones
        .map((tx) => {
          const montoTransaccion = Number(tx.montoTotal) || 0;
          const montoPagosFiltrados = tx.transaccionPago.reduce((sum, tp) => {
            const pago = tp?.pago;
            if (!pago) return sum;
            const montoPago = Number(pago.montoTotal) || 0;
            const cotizacionPago = Number(pago.cotizacion) || 1;
            return sum + (montoPago * cotizacionPago);
          }, 0);
  
          const medios = uniqueLabels(
            tx.transaccionPago.map((tp) => tp?.pago?.medioDePago?.descripcion)
          );
          const tiposMedio = uniqueLabels(
            tx.transaccionPago.map((tp) => tp?.pago?.medioDePago?.tipoMedioDePago?.descripcion)
          );
          const categoriaAnalitica =
            tx.tipoTransaccion.id === TIPO_VENTA ? "venta" : "gasto";
          const montoBase = filtrosMedioActivos ? montoPagosFiltrados : montoTransaccion;
          const monto = categoriaAnalitica === "venta"
            ? Math.abs(montoBase)
            : montoBase;
  
          return {
            id: `${categoriaAnalitica}-${tx.id}`,
            idTransaccion: tx.id,
            fecha: tx.fecha.toISOString().slice(0, 10),
            tipoTransaccion: tx.tipoTransaccion.descripcion,
            categoriaAnalitica,
            medioDePago: medios.join(", "),
            tipoMedio: tiposMedio.join(", "),
            monto,
          };
        })
        .filter((movimiento) => movimiento.monto !== 0);
  
      // 8) Agrupar por fecha y sumar montos analíticos
      const caja = Object.values(
        movimientos.reduce((acc, mv) => {
          if (!acc[mv.fecha]) {
            acc[mv.fecha] = {
              fecha: mv.fecha,
              ventas: 0,
              gastos: 0,
              montoNeto: 0,
              transacciones: 0,
            };
          }
          if (mv.categoriaAnalitica === "venta") {
            acc[mv.fecha].ventas += mv.monto;
          } else {
            acc[mv.fecha].gastos += mv.monto;
          }
          acc[mv.fecha].montoNeto = acc[mv.fecha].ventas - acc[mv.fecha].gastos;
          acc[mv.fecha].transacciones += 1;
          return acc;
        }, {})
      );
  
      // 9) Respuesta
      return res.status(200).json({ movimientos, caja });
    } catch (error) {
      console.error("getCajaByMedioDePago:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener caja", error: error.message });
    }
  };
  
  const getTop10ItemVentas = async (req, res) => {
    try {
      // Conexión
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
      const { Item } = itemModelInit(sequelize);
  
      // Calcula la fecha de hace 2 meses a partir de hoy
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  
      // Consulta: contar cuántas veces aparece cada idItem en TransaccionItem,
      // agrupar por idItem, ordenar de mayor a menor y limitar a 10,
      // filtrando solo las transacciones de los últimos 2 meses e items no eliminados
      const top10 = await TransaccionItem.findAll({
        attributes: [
          "idItem",
          [sequelize.fn("count", sequelize.col("idItem")), "ventas"],
        ],
        where: {
          createdAt: {
            [Op.gte]: twoMonthsAgo,
          },
          eliminado: false, // ✅ Filtrar solo items no eliminados
        },
        include: [
          {
            model: Item,
            as: "item",
            attributes: [
              "id",
              "codigo",
              "descripcion",
              "usaGestionLotes",
              "itemDatoAtributo1",
              "itemDatoAtributo2",
              "itemDatoAtributo3",
              "itemDatoAtributo4",
              "itemDatoAtributo5",
              "itemDatoAtributo6",
              "itemDatoAtributo7",
              "itemDatoAtributo8",
              "itemDatoAtributo9",
              "itemDatoAtributo10",
              "codigoScanner",
            ],
            where: {
              eliminado: false, // ✅ Filtrar solo items no eliminados
            },
            required: true, // INNER JOIN para asegurar que el item existe y no está eliminado
          },
        ],
        // Al incluir un join, debemos agrupar por la(s) columna(s) de la tabla principal y la columna de la asociación:
        group: ["TransaccionItem.idItem", "item.id"],
        order: [[sequelize.literal("ventas"), "DESC"]],
        limit: 10,
      });
  
      res.status(200).json(top10);
    } catch (error) {
      console.error("Error en getTop10ItemVentas:", error);
      res
        .status(500)
        .json({ message: "Error al obtener los 10 items más vendidos", error });
    }
  };
  
  // Configura el transporter de nodemailer con tus credenciales de Hostinger
  let transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", // Reemplaza con el host SMTP de Hostinger (por ejemplo, smtp.hostinger.com)
    port: 465, // Usualmente 465 para conexión segura o 587 para STARTTLS
    secure: true, // true si usas el puerto 465
    auth: {
      user: "admin@lutente.com", // Tu correo configurado en Hostinger
      pass: "AdminTestLutente1*", // La contraseña de tu correo
    },
    tls: {
      // No rechazar certificados no autorizados (solo para pruebas)
      rejectUnauthorized: false,
    },
  });
  //AdminTestLutente1* Contraseña lutente
  
  //mailto: admin@lutente.com  mail
  
  //smpt: SMTP.GOOGLE.COM
  
  // API para enviar email
  const enviarMail = async (req, res) => {
    const { idFactura, pdfBase64, toEmail, tipo } = req.body; // tipo: 'factura' | 'presupuesto'
  
    try {
      // Debug: incoming payload info
      const contentLength = req.headers['content-length'];
      // console.log(`[enviarMail] START idFactura=${idFactura} content-length=${contentLength || 'n/a'}`);
      if (pdfBase64) {
        // console.log(`[enviarMail] pdfBase64 length=${pdfBase64.length}`);
        const hasPdfPrefix = /^data:application\/pdf;base64,/i.test(pdfBase64);
        // console.log(`[enviarMail] hasPdfPrefix=${hasPdfPrefix}`);
      } else {
        console.warn('[enviarMail] pdfBase64 not provided');
      }
  
      // obtener email remitente desde parámetros globales
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ParametrosGlobales } = adminModelInit(sequelize);
      const queryRemitente = await ParametrosGlobales.findOne({
        where: {
          nombreParametro: "afipsdk_razon_social",
          eliminado: false,
        },
      });
  
      //const emailRemitente = emailParam?.valorParametro || "admin@lutente.com";
      const emailRemitente = "admin@lutente.com";
      const remitente = queryRemitente?.valorParametro
  
      // validar destinatario dinámico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const destinatario = typeof toEmail === 'string' && emailRegex.test(toEmail.trim()) ? toEmail.trim() : null;
      if (!destinatario) {
        console.warn('[enviarMail] destinatario inválido o no provisto');
        return res.status(400).json({ error: 'Destinatario de email inválido' });
      }
  
      const tenant = req.cookies.tenant || "tenant";
      const usuario = req.cookies.usuario || "usuario";
      const fecha = dayjs().tz("America/Argentina/Buenos_Aires").format("YYYYMMDD");
      const hora = dayjs().tz("America/Argentina/Buenos_Aires").format("HHmmss");
  
      const tipoComprobante = (typeof tipo === 'string' && tipo.toLowerCase() === 'presupuesto') ? 'presupuesto' : 'factura';
      // Save presupuestos under the updated folder name
      const subdir = tipoComprobante === 'presupuesto' ? 'presupuestos' : 'facturas';
      const fileName = `${tenant}_${usuario}_${fecha}_${hora}_${tipoComprobante}_${idFactura}.pdf`;
      const dirPath = path.join(__dirname, "..", "..", "client", "src", "comprobantes", subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const filePath = path.join(dirPath, fileName);
  
      if (pdfBase64) {
        try {
          // Normalize data URI variations like: data:application/pdf;filename=...;base64,<data>
          let base64Data = pdfBase64;
          if (/^data:application\/pdf/i.test(base64Data)) {
            const commaIdx = base64Data.indexOf(',');
            base64Data = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
          }
          // Trim whitespace/newlines just in case
          base64Data = base64Data.replace(/\s+/g, '');
  
          // console.log(`[enviarMail] writing PDF to ${filePath}`);
          fs.writeFileSync(filePath, base64Data, "base64");
  
          const stats = fs.statSync(filePath);
          // console.log(`[enviarMail] file saved ok size=${stats.size} bytes`);
  
          // Quick magic header check
          const fd = fs.openSync(filePath, 'r');
          const headerBuf = Buffer.alloc(5);
          fs.readSync(fd, headerBuf, 0, 5, 0);
          fs.closeSync(fd);
          // console.log(`[enviarMail] file header: ${headerBuf.toString()}`); // should start with %PDF-
        } catch (writeErr) {
          console.error('[enviarMail] Error writing PDF file:', writeErr);
          return res.status(500).json({ error: 'Failed to persist PDF file', details: writeErr.toString() });
        }
      } else {
        console.warn('[enviarMail] Skipping file write since no pdfBase64');
      }
  
      // Puedes extraer datos desde req.body si lo deseas, o dejarlo hardcoded para pruebas
      const mailOptions = {
        from: `"${remitente}" <${emailRemitente}>`,
        to: destinatario, // Destinatario dinámico
        subject: tipoComprobante === 'presupuesto' ? "Presupuesto adjunto" : "Factura Adjunta",
        text: tipoComprobante === 'presupuesto' ? "Presupuesto adjunto." : "Gracias por su compra !",
        //html: "<p>Este es un mensaje de prueba enviado desde la API de Nodemailer</p>",
        attachments: [
          {
            filename: fileName, // Nombre que verá el destinatario
            path: filePath, // Ruta del archivo en el servidor
            contentType: 'application/pdf',
          },
        ],
      };
  
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error al enviar email:", error);
          return res.status(500).json({ error: error.toString() });
        }
        // console.log("Email enviado:", info.response);
        res.status(200).json({ message: "Email enviado con éxito" });
      });
    } catch (error) {
      console.error("[enviarMail] Unexpected error:", error);
      res.status(500).json({ error: error.toString() });
    }
  };
  
  // API para generar link público del comprobante para compartir por WhatsApp
  // Crea/guarda el PDF local si viene en base64 y devuelve URL pública + wa.me
  const enviarWhatsAppLink = async (req, res) => {
    try {
      const { idFactura, pdfBase64, phoneNumber, tipo } = req.body; // tipo: 'factura' | 'presupuesto'
  
      if (!idFactura) {
        return res.status(400).json({ error: 'idFactura es requerido' });
      }
      // Validación simple de teléfono (acepta + y dígitos)
      const phone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';
      if (!phone || !/^\+?\d{7,15}$/.test(phone)) {
        return res.status(400).json({ error: 'phoneNumber inválido' });
      }
  
      const tenant = req.cookies.tenant || 'tenant';
      const usuario = req.cookies.usuario || 'usuario';
      // Usar fecha/hora estables por transacción (createdAt)
      let fecha = dayjs().tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
      let hora = dayjs().tz('America/Argentina/Buenos_Aires').format('HHmmss');
      try {
        const sequelize2 = await conexionDB(req.cookies.tenant, req.cookies.usuario);
        const { Transaccion } = transaccionModelInit(sequelize2);
        const trx = await Transaccion.findOne({ where: { id: idFactura } });
        if (trx?.createdAt) {
          fecha = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
          hora = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('HHmmss');
        }
      } catch (e) {
        console.warn('[enviarWhatsAppLink] No se pudo cargar Transaccion, uso fecha/hora actuales');
      }
      const tipoLower = typeof tipo === 'string' ? tipo.toLowerCase() : '';
      let tipoComprobante, subdir;
      
      if (tipoLower === 'presupuesto') {
        tipoComprobante = 'presupuesto';
        subdir = 'presupuestos';
      } else if (tipoLower === 'devolucion') {
        tipoComprobante = 'devolucion';
        subdir = 'devoluciones';
      } else {
        tipoComprobante = 'factura';
        subdir = 'facturas';
      }
      const fileName = `${tenant}_${usuario}_${fecha}_${hora}_${tipoComprobante}_${idFactura}.pdf`;
      const dirPath = path.join(__dirname, '..', '..', 'client', 'src', 'comprobantes', subdir);
      const publicDirPath = path.join(__dirname, '..', 'public', 'comprobantesWhatsapp', subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      if (!fs.existsSync(publicDirPath)) {
        fs.mkdirSync(publicDirPath, { recursive: true });
      }
  
      const filePath = path.join(dirPath, fileName);
      const publicFilePath = path.join(publicDirPath, fileName);
  
      if (pdfBase64) {
        try {
          if (fs.existsSync(filePath)) {
            // console.log(`[enviarWhatsAppLink] file already exists, skipping write: ${filePath}`);
          } else {
            let base64Data = pdfBase64;
            if (/^data:application\/pdf/i.test(base64Data)) {
              const commaIdx = base64Data.indexOf(',');
              base64Data = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
            }
            base64Data = base64Data.replace(/\s+/g, '');
            fs.writeFileSync(filePath, base64Data, 'base64');
          }
        } catch (err) {
          console.error('[enviarWhatsAppLink] Error writing PDF:', err);
          return res.status(500).json({ error: 'Error guardando el PDF' });
        }
      } else {
        // Si no viene base64, no creamos archivo. Se espera que exista previamente si se quiere compartir.
        // No devolvemos error: aún podemos construir el link para buscar luego si ya existía.
      }
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'No se encontró el comprobante solicitado' });
      }
  
      try {
        fs.copyFileSync(filePath, publicFilePath);
      } catch (error) {
        console.error('[enviarWhatsAppLink] Error copying PDF to public directory:', error);
        return res.status(500).json({ error: 'Error preparando el comprobante público' });
      }
  
      const basePublic = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const publicUrl = `${basePublic}/comprobantesWhatsapp/${encodeURIComponent(subdir)}/${encodeURIComponent(fileName)}`;
      const msg = `Hola! Aquí tiene su ${tipoComprobante} (ID ${idFactura}). Disponible durante 24 horas:\n${publicUrl}`;
      const waLink = `https://wa.me/${phone.replace(/^\+/, '')}?text=${encodeURIComponent(msg)}`;
  
      // Solo devolvemos el link para que el frontend lo abra
      return res.status(200).json({ ok: true, fileName, subdir, url: publicUrl, waLink });
    } catch (error) {
      console.error('[enviarWhatsAppLink] Unexpected error:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  };
  
  // Guardar ticket de venta como archivo de texto
  const guardarTicket = async (req, res) => {
    try {
      const { idVenta, ticketContent } = req.body;
      if (!idVenta) return res.status(400).json({ error: 'idVenta es requerido' });
      if (!ticketContent) return res.status(400).json({ error: 'ticketContent es requerido' });
  
      const tenant = req.cookies.tenant || 'tenant';
      const usuario = req.cookies.usuario || 'usuario';
      let fecha = dayjs().tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
      let hora = dayjs().tz('America/Argentina/Buenos_Aires').format('HHmmss');
      
      // Intentar obtener fecha de la transacción
      try {
        const sequelize2 = await conexionDB(req.cookies.tenant, req.cookies.usuario);
        const { Transaccion } = transaccionModelInit(sequelize2);
        const trx = await Transaccion.findOne({ where: { id: idVenta } });
        if (trx?.createdAt) {
          fecha = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
          hora = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('HHmmss');
        }
      } catch (e) {
        console.warn('[guardarTicket] No se pudo cargar Transaccion, uso fecha/hora actuales');
      }
  
      // Generar nombre de archivo: tenant_usuario_fecha_hora_ticketId.txt
      const fileName = `${tenant}_${usuario}_${fecha}_${hora}_ticket_${idVenta}.txt`;
      const dirPath = path.join(__dirname, '..', '..', 'client', 'src', 'comprobantes', 'tickets');
      
      // Crear directorio si no existe
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const filePath = path.join(dirPath, fileName);
  
      // Guardar solo si no existe
      if (!fs.existsSync(filePath)) {
        try {
          fs.writeFileSync(filePath, ticketContent, 'utf8');
          // console.log(`✅ Ticket guardado: ${fileName}`);
        } catch (err) {
          console.error('[guardarTicket] Error writing ticket:', err);
          return res.status(500).json({ error: 'Error guardando el ticket' });
        }
      }
  
      const basePublic = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const publicUrl = `${basePublic}/comprobantes/tickets/${encodeURIComponent(fileName)}`;
      return res.status(200).json({ ok: true, fileName, url: publicUrl });
    } catch (error) {
      console.error('[guardarTicket] Unexpected error:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  };
  
  // Guardar comprobante si no existe (factura, presupuesto o remito) y devolver URL pública
  const guardarComprobante = async (req, res) => {
    try {
      const { idFactura, pdfBase64, tipo } = req.body; // tipo: 'factura' | 'presupuesto' | 'remito'
      if (!idFactura) return res.status(400).json({ error: 'idFactura es requerido' });
      if (!pdfBase64) return res.status(400).json({ error: 'pdfBase64 es requerido' });
  
      const tenant = req.cookies.tenant || 'tenant';
      const usuario = req.cookies.usuario || 'usuario';
      let fecha = dayjs().tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
      let hora = dayjs().tz('America/Argentina/Buenos_Aires').format('HHmmss');
      try {
        const sequelize2 = await conexionDB(req.cookies.tenant, req.cookies.usuario);
        const { Transaccion } = transaccionModelInit(sequelize2);
        const trx = await Transaccion.findOne({ where: { id: idFactura } });
        if (trx?.createdAt) {
          fecha = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('YYYYMMDD');
          hora = dayjs(trx.createdAt).tz('America/Argentina/Buenos_Aires').format('HHmmss');
        }
      } catch (e) {
        console.warn('[guardarComprobante] No se pudo cargar Transaccion, uso fecha/hora actuales');
      }
  
      const tipoComprobante = (typeof tipo === 'string' && tipo.toLowerCase() === 'presupuesto') ? 'presupuesto'
                          : (typeof tipo === 'string' && tipo.toLowerCase() === 'remito') ? 'remito'
                          : (typeof tipo === 'string' && tipo.toLowerCase() === 'notacredito') ? 'notaCredito'
                          : (typeof tipo === 'string' && tipo.toLowerCase() === 'devolucion') ? 'devolucion'
                          : 'factura';
      const subdir = tipoComprobante === 'presupuesto' ? 'presupuestos' 
                   : tipoComprobante === 'remito' ? 'remitos'
                   : tipoComprobante === 'notaCredito' ? 'devoluciones'
                   : tipoComprobante === 'devolucion' ? 'devoluciones'
                   : 'facturas';
      const fileName = `${tenant}_${usuario}_${fecha}_${hora}_${tipoComprobante}_${idFactura}.pdf`;
      const dirPath = path.join(__dirname, '..', '..', 'client', 'src', 'comprobantes', subdir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      const filePath = path.join(dirPath, fileName);
  
      if (!fs.existsSync(filePath)) {
        try {
          let base64Data = pdfBase64;
          if (/^data:application\/pdf/i.test(base64Data)) {
            const commaIdx = base64Data.indexOf(',');
            base64Data = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
          }
          base64Data = base64Data.replace(/\s+/g, '');
          fs.writeFileSync(filePath, base64Data, 'base64');
        } catch (err) {
          console.error('[guardarComprobante] Error writing PDF:', err);
          return res.status(500).json({ error: 'Error guardando el PDF' });
        }
      }
  
      const basePublic = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const publicUrl = `${basePublic}/comprobantes/${encodeURIComponent(subdir)}/${encodeURIComponent(fileName)}`;
      return res.status(200).json({ ok: true, fileName, subdir, url: publicUrl });
    } catch (error) {
      console.error('[guardarComprobante] Unexpected error:', error);
      return res.status(500).json({ error: 'Error interno' });
    }
  };
  
  const getTop3ItemsLast7Days = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { TransaccionItem } = transaccionModelInit(sequelize);
  
      // Definir rango: últimos 7 días (incluyendo hoy)
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
  
      // Formatear fecha a "YYYY-MM-DD"
      const formatDate = (d) => d.toISOString().slice(0, 10);
      const startStr = formatDate(startDate);
      const endStr = formatDate(endDate) + " 23:59:59";
  
      // 1. Obtener los 3 items con mayor suma de "cantidad"
      const topItems = await TransaccionItem.findAll({
        attributes: ["idItem", [fn("SUM", col("cantidad")), "cantidad"]],
        where: {
          createdAt: { [Op.between]: [startStr, endStr] },
        },
        group: ["idItem"],
        order: [[sequelize.literal("cantidad"), "DESC"]],
        limit: 3,
        raw: true,
      });
  
      // console.log("topItems del backend: ", topItems);
  
      // 2. Crear un arreglo de fechas para los últimos 7 días
      const days = [];
      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        days.push(formatDate(new Date(d)));
      }
  
      // console.log("days del backend: ", days);
  
      // 3. Para cada item, obtener el desglose diario de ventas (SUM de "cantidad")
      const result = [];
      for (const item of topItems) {
        const idItem = item.idItem;
  
        const dailySalesData = await TransaccionItem.findAll({
          attributes: [
            [fn("DATE", col("createdAt")), "saleDate"],
            [fn("SUM", col("cantidad")), "dailySales"],
          ],
          where: {
            idItem,
            createdAt: { [Op.between]: [startStr, endStr] },
          },
          group: [fn("DATE", col("createdAt"))],
          order: [[fn("DATE", col("createdAt")), "ASC"]],
          raw: true,
        });
  
        // Convertir el resultado en un objeto: { saleDate: dailySales }
        const salesByDay = {};
        dailySalesData.forEach((row) => {
          salesByDay[row.saleDate] = parseFloat(row.dailySales);
        });
        // console.log("salesByDay del backend: ", salesByDay);
  
        // Armar el arreglo de ventas diarias para cada día (rellenar con 0 si no hay datos)
        const dailySalesArray = days.map((day) => salesByDay[day] || 0);
  
        result.push({
          idItem,
          totalSales: parseFloat(item.cantidad),
          days, // Arreglo de fechas (últimos 7 días)
          dailySales: dailySalesArray, // Ventas diarias correspondientes
        });
      }
  
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error en getTop3ItemsLast7Days:", error);
      return res
        .status(500)
        .json({ message: "Error al obtener los items", error });
    }
  };
  
  
      // TEST 8N8 ***********************************************************************
  const resumenVentasN8N = async (req, res) => {
      const { fecha } = req.query;
  
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, Entidad } = transaccionModelInit(sequelize);
      const { Op } = require("sequelize");
  
      const fechaInicio = new Date(`${fecha}T00:00:00`);
      const fechaFin = new Date(`${fecha}T23:59:59`);
  
      const ventas = await Transaccion.findAll({
        where: {
          eliminado: false,
          idTipoTransaccion: 1, // o el ID que uses para 'venta'
          fecha: {
            [Op.between]: [fechaInicio, fechaFin],
          },
        },
        include: [
          { model: Entidad, as: "entidad" },
        ],
      });
  
      const total = ventas.reduce((acc, v) => acc + v.montoTotal, 0);
  
      res.json({
        fecha,
        cantidad: ventas.length,
        total,
        resumen: ventas.map((v) => ({
          id: v.id,
          cliente: v.entidad?.descripcion,
          total: v.montoTotal,
        })),
      });
    } catch (error) {
      console.error("Error al obtener ventas:", error);
      res.status(500).json({ message: "Error interno." });
    }
  }
  
  // Nueva función sin paginado para presupuestos (para gráficas)
  const getTransaccionTransformedPresupuestosAllData = async (req, res) => {
    const { tipoTransaccion } = req.params;
    const {
      fecha,
      formattedDate2, // Fecha hasta (opcional)
      dniCliente, // ID de la entidad cliente (opcional)
      selectedUbicacion, // ID de la ubicación (opcional)
      valorMin,
      valorMax, // Rango para filtrar (opcional)
      mostrarEliminados, // Mostrar eliminados (opcional)
      idTransaccionSearch, //buscar por id de la transaccion (opcional)
      traerDevolucion,
      buscarCAE,
      tipoTransaccionFiltro,
      canalEntidad, // ID del canal de entidad (opcional)
      atributoEntidad1,
      atributoEntidad2,
      atributoEntidad3,
      atributoEntidad4,
      atributoEntidad5,
      atributoEntidad6,
      atributoEntidad7,
      atributoEntidad8,
      atributoEntidad9,
      atributoEntidad10,
    } = req.query;
  
  
    try {
      // ✅ Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const {
        Transaccion,
        TipoTransaccion,
        TransaccionPago,
        Pago,
        MedioDePago,
        TipoMedioDePago,
        TransaccionImpuesto,
        Impuesto,
        TransaccionTipoFactura,
        TipoFactura,
      } = transaccionModelInit(sequelize);
      const { Entidad, Ubicacion, Negocio, Usuario, EntidadAtributoClasificacion } = adminModelInit(sequelize);
  
      // console.log("Ejecutando consulta de presupuestos SIN PAGINADO para gráficas...");
      // console.log("es true o false", mostrarEliminados);
  
      const fechaInicio = fecha;
      const fechaFin = formattedDate2;
  
      const tipos = [Number(tipoTransaccion)];
  
      let whereClause = {
        eliminado: mostrarEliminados,
        fechaHoraCreacion: { [Op.between]: [fechaInicio, fechaFin] },
      };
  
      // Agregamos el filtro solo si no es "todos"
      if (tipoTransaccionFiltro === "presupuestos") {
        whereClause.idTipoTransaccion = 3; // 3 = presupuestos
      } else {
        whereClause.idTipoTransaccion = { [Op.in]: tipos };
      }
  
      let whereCAE = {};
  
      // ✅ Filtros opcionales (con validación para evitar 'null' strings)
      if (dniCliente && dniCliente !== 'null' && dniCliente !== '') {
        whereClause.idEntidad = dniCliente;
      }
      if (selectedUbicacion && selectedUbicacion !== 'null' && selectedUbicacion !== '') {
        whereClause.idUbicacion = selectedUbicacion;
      }
  
      if (
        valorMin &&
        valorMax &&
        valorMin !== 'null' &&
        valorMax !== 'null' &&
        valorMin !== '' &&
        valorMax !== '' &&
        valorMin != valorMax &&
        (valorMin != 0 || valorMax != 0)
      ) {
        whereClause.montoTotal = {
          [Op.between]: [parseFloat(valorMin), parseFloat(valorMax)],
        };
      }
  
      appendIdSubstringFilter(whereClause, idTransaccionSearch, "Transaccion", "id");
  
      if (buscarCAE && buscarCAE !== 'null' && buscarCAE !== '') {
        whereCAE.CAE = buscarCAE;
      }
  
      // ✅ Contar total de transacciones
      const totalCount = await Transaccion.count({ where: whereClause });
  
      // ✅ Obtener TODAS las transacciones filtradas (SIN PAGINADO)
      const transacciones = await Transaccion.findAll({
        attributes: [
          "id",
          "montoTotal",
          "idTipoTransaccion",
          "idEntidad",
          "descripcion",
          "fechaHoraCreacion",
          "idUsuario",
          "idUbicacion",
          "idNegocio",
          "montoDescuento",
          "porcentajeDescuento",
          "transaccionAsociada",
        ],
        where: whereClause,
        include: [
          {
            model: TipoTransaccion,
            as: "tipoTransaccion",
            attributes: ["descripcion"],
          },
          {
            model: Entidad,
            as: "entidad",
            attributes: [
              "id",
              "descripcion",
              "apellido",
              "dniCuitCuil",
              "direccion",
              "localidad",
              "provincia",
              "idCanal",
              "entidadDatoAtributo1",
              "entidadDatoAtributo2",
              "entidadDatoAtributo3",
              "entidadDatoAtributo4",
              "entidadDatoAtributo5",
              "entidadDatoAtributo6",
              "entidadDatoAtributo7",
              "entidadDatoAtributo8",
              "entidadDatoAtributo9",
              "entidadDatoAtributo10",
            ],
            where: {
              ...(canalEntidad && canalEntidad !== "null" && { idCanal: Number(canalEntidad) }),
              ...(atributoEntidad1 && atributoEntidad1 !== "null" && { entidadDatoAtributo1: Number(atributoEntidad1) }),
              ...(atributoEntidad2 && atributoEntidad2 !== "null" && { entidadDatoAtributo2: Number(atributoEntidad2) }),
              ...(atributoEntidad3 && atributoEntidad3 !== "null" && { entidadDatoAtributo3: Number(atributoEntidad3) }),
              ...(atributoEntidad4 && atributoEntidad4 !== "null" && { entidadDatoAtributo4: Number(atributoEntidad4) }),
              ...(atributoEntidad5 && atributoEntidad5 !== "null" && { entidadDatoAtributo5: Number(atributoEntidad5) }),
              ...(atributoEntidad6 && atributoEntidad6 !== "null" && { entidadDatoAtributo6: Number(atributoEntidad6) }),
              ...(atributoEntidad7 && atributoEntidad7 !== "null" && { entidadDatoAtributo7: Number(atributoEntidad7) }),
              ...(atributoEntidad8 && atributoEntidad8 !== "null" && { entidadDatoAtributo8: Number(atributoEntidad8) }),
              ...(atributoEntidad9 && atributoEntidad9 !== "null" && { entidadDatoAtributo9: Number(atributoEntidad9) }),
              ...(atributoEntidad10 && atributoEntidad10 !== "null" && { entidadDatoAtributo10: Number(atributoEntidad10) }),
            },
            include: [
              { model: EntidadAtributoClasificacion, as: "opcionAtributo1", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo2", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo3", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo4", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo5", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo6", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo7", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo8", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo9", attributes: ["id", "descripcion"], required: false },
              { model: EntidadAtributoClasificacion, as: "opcionAtributo10", attributes: ["id", "descripcion"], required: false },
            ],
          },
          { model: Usuario, as: "usuario", attributes: ["usuario"] },
          {
            model: Ubicacion,
            as: "ubicacion",
            attributes: ["descripcion", "id"],
          },
          { model: Negocio, as: "negocio", attributes: ["descripcion"] },
          {
            model: TransaccionPago,
            as: "transaccionPago",
            where: { eliminado: false }, // ✅ Filtrar solo pagos no eliminados
            required: false, // LEFT JOIN para no excluir transacciones sin pagos activos
            include: [
              {
                model: Pago,
                as: "pago",
                include: [
                  {
                    model: MedioDePago,
                    as: "medioDePago",
                    include: [
                      {
                        model: TipoMedioDePago,
                        as: "tipoMedioDePago",
                        attributes: ["descripcion"],
                      },
                    ],
                    attributes: ["descripcion", "id"],
                  },
                ],
                attributes: ["montoTotal", "cotizacion"],
              },
            ],
          },
          {
            model: TransaccionTipoFactura,
            as: "transaccionTipoFactura",
            required: Boolean(buscarCAE),
            attributes: ["CAE", "vencimientoCAE", "idTipoFactura", "numeroFactura", "puntoVenta", "fechaEmision"],
            include: [
              {
                model: TipoFactura,
                as: "tipoFactura",
                attributes: ["descripcion"],
              },
            ],
            ...(buscarCAE ? { where: whereCAE } : {}),
          },
        ],
        distinct: true,
        order: [["fechaHoraCreacion", "DESC"]],
      });
  
      // ✅ Procesar datos para el formato esperado por el frontend
      const data = transacciones.map((transaccion) => {
        const transaccionData = transaccion.toJSON();
  
        const pagosTransformados = (transaccionData.transaccionPago || [])
          .map((tp) => tp.pago)
          .filter((p) => p && p.medioDePago)
          .map((p) => ({
            montoTotal: p.montoTotal,
            cotizacion: p.cotizacion,
            medioDePago: p.medioDePago.descripcion,
            idMedio: p.medioDePago.id,
            pagoId: p.id,
            tipoMedio: p.medioDePago.tipoMedioDePago.descripcion,
            idtipoMedio: p.medioDePago.tipoMedioDePago.id,
          }));
  
        // Extraer descripción del tipo de factura si existe
        const tipoFacturaDescripcion =
          transaccionData.transaccionTipoFactura?.tipoFactura?.descripcion;
  
        return {
          id: transaccionData.id,
          montoTotal: transaccionData.montoTotal,
          idTipoTransaccion: transaccionData.idTipoTransaccion,
          entidad: transaccionData.entidad,
          tipoTransaccion: transaccionData.tipoTransaccion,
          usuario: transaccionData.usuario,
          ubicacion: transaccionData.ubicacion,
          negocio: transaccionData.negocio,
          descripcion: transaccionData.descripcion,
          fechaHoraCreacion: transaccionData.fechaHoraCreacion,
          pagos: pagosTransformados,
          tipoPago:
            pagosTransformados.length > 1
              ? "Múltiple"
              : pagosTransformados.length === 1
              ? "Individual"
              : "",
          tipoFacturaDescripcion: tipoFacturaDescripcion || "",
        };
      });
  
      // ✅ Respuesta final SIN PAGINADO
      return res.status(200).json({
        totalCount: totalCount,
        data,
      });
    } catch (error) {
      console.error("Error al obtener presupuestos para gráficas:", error);
      res.status(500).json({ message: "Error al obtener presupuestos", error });
    }
  };
  
  // Crear nuevo impuesto de item de transacción
  const postTransaccionImpuestoItem = async (req, res) => {
    const { idTransaccion, idItem, idImpuesto, porcentaje, montoTotal } = req.body;
    // console.log(`impuesto item llegando: idTransaccion = ${idTransaccion}, idItem = ${idItem}, idImpuesto = ${idImpuesto}, porcentaje = ${porcentaje}`);
  
    if (!idTransaccion || !idItem || !idImpuesto || !porcentaje) {
      return res
        .status(400)
        .json({ message: "idTransaccion, idItem, idImpuesto o porcentaje están incompletos." });
    }
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize);
  
      const transaccionImpuestoItem = new ImpuestoItemTransaccion({
        idTransaccion,
        idItem,
        idImpuesto,
        porcentaje,
        montoTotal: montoTotal || null,
        eliminado: false
      });
      
      await transaccionImpuestoItem.save();
      res.status(201).json(transaccionImpuestoItem);
    } catch (error) {
      console.error("Error al crear impuesto de item de transacción:", error);
      res
        .status(400)
        .json({ message: "Error al crear impuesto de item de transacción", error: error.message });
    }
  };
  
  // Actualizar impuesto de item de transacción
  const updateTransaccionImpuestoItem = async (req, res) => {
    const { idTransaccion, idItem } = req.params;
    const { idImpuesto, porcentaje, montoTotal } = req.body;
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize);
  
      // Buscar el registro de ImpuestoItemTransaccion con las claves primarias
      const transaccionImpuestoItem = await ImpuestoItemTransaccion.findOne({
        where: { idTransaccion, idItem },
      });
  
      if (!transaccionImpuestoItem) {
        return res
          .status(404)
          .json({ message: "ImpuestoItemTransaccion no encontrado." });
      }
  
      // console.log(
      //   `Actualizando impuesto: idImpuesto = ${idImpuesto}, porcentaje = ${porcentaje}, montoTotal = ${montoTotal}`
      // );
  
      // Actualizar los campos deseados
      transaccionImpuestoItem.idImpuesto = idImpuesto;
      transaccionImpuestoItem.porcentaje = porcentaje;
      transaccionImpuestoItem.montoTotal = montoTotal || null;
  
      await transaccionImpuestoItem.save();
  
      res.status(200).json(transaccionImpuestoItem);
    } catch (error) {
      console.error("Error al actualizar impuesto de item de transacción:", error);
      res
        .status(500)
        .json({ message: "Error del servidor al actualizar impuesto de item de transacción." });
    }
  };
  
  // Obtener impuestos de items de una transacción
  const getTransaccionImpuestoItems = async (req, res) => {
    const { idTransaccion } = req.params;
  
    try {
      // conexion
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ImpuestoItemTransaccion } = transaccionModelInit(sequelize);
  
      const impuestoItems = await ImpuestoItemTransaccion.findAll({
        where: { idTransaccion, eliminado: false },
      });
  
      res.status(200).json(impuestoItems);
    } catch (error) {
      console.error("Error al obtener impuestos de items de transacción:", error);
      res
        .status(500)
        .json({ message: "Error al obtener impuestos de items de transacción", error: error.message });
    }
  };
  
  // Validar devolución/canje antes de procesar
  const validarDevolucionCanje = async (req, res) => {
    try {
      const { idTransaccionOriginal, itemsDevolucion } = req.body;
      
      // Validar que los datos requeridos estén presentes
      if (!idTransaccionOriginal) {
        return res.status(400).json({
          valido: false,
          mensaje: "ID de transacción original es requerido"
        });
      }
      
      if (!itemsDevolucion || !Array.isArray(itemsDevolucion)) {
        return res.status(400).json({
          valido: false,
          mensaje: "Items de devolución es requerido y debe ser un array"
        });
      }
      
      // Conexión a la base de datos
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Transaccion, TransaccionItem } = transaccionModelInit(sequelize);
  
      // 1. Buscar todas las transacciones asociadas a la transacción original
      const transaccionesAsociadas = await Transaccion.findAll({
        where: {
          transaccionAsociada: idTransaccionOriginal,
          eliminado: false
        },
        attributes: ['id']
      });
  
      const idsTransaccionesAsociadas = transaccionesAsociadas.map(t => t.id);
  
      // 2. Si no hay transacciones asociadas, la validación pasa
      if (idsTransaccionesAsociadas.length === 0) {
        return res.status(200).json({
          valido: true,
          mensaje: "No hay devoluciones previas"
        });
      }
  
      // 3. Obtener todos los items de devolución (signo "-") de las transacciones asociadas
      const itemsDevueltos = await TransaccionItem.findAll({
        where: {
          idTransaccion: idsTransaccionesAsociadas,
          signo: "-", // *HARDCODED*
          eliminado: false
        },
        attributes: [
          'idItem',
          [sequelize.fn('SUM', sequelize.col('cantidad')), 'totalDevuelto']
        ],
        group: ['idItem']
      });
  
      // 4. Crear un mapa de items ya devueltos
      const itemsYaDevueltos = {};
      itemsDevueltos.forEach(item => {
        itemsYaDevueltos[item.idItem] = parseFloat(item.dataValues.totalDevuelto);
      });
  
      // 5. Validar cada item de la devolución actual
      const errores = [];
      
      for (const item of itemsDevolucion) {
        // Validar que el item tenga la estructura esperada
        if (!item.idItem || item.cantidad === undefined) {
          console.error("Item con estructura inválida:", item);
          continue;
        }
        
        const idItem = item.idItem;
        const cantidadOriginal = item.cantidad;
        const cantidadADevolver = item.cantidadDevolver || 0;
        const cantidadYaDevuelta = itemsYaDevueltos[idItem] || 0;
        
        const totalADevolver = cantidadYaDevuelta + cantidadADevolver;
        
        if (totalADevolver > cantidadOriginal) {
          errores.push({
            idItem: idItem,
            descripcion: item.descripcion,
            cantidadOriginal: cantidadOriginal,
            cantidadYaDevuelta: cantidadYaDevuelta,
            cantidadADevolver: cantidadADevolver,
            totalADevolver: totalADevolver,
            exceso: totalADevolver - cantidadOriginal
          });
        }
      }
  
      // 6. Retornar resultado de validación
      if (errores.length > 0) {
        return res.status(400).json({
          valido: false,
          mensaje: "No es posible realizar devoluciones por una cantidad mayor a la comprada",
          errores: errores
        });
      }
  
      res.status(200).json({
        valido: true,
        mensaje: "Validación exitosa"
      });
  
    } catch (error) {
      console.error("Error en validación de devolución:", error);
      res.status(500).json({
        valido: false,
        mensaje: "Error interno del servidor",
        error: error.message
      });
    }
  };
  
  const getCondicionIvaByIdEntidad = async (req, res) => {
    const { idEntidad } = req.params;
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { CondicionIvaEntidad } = transaccionModelInit(sequelize);
      const condicionIva = await CondicionIvaEntidad.findOne({
        where: { idEntidad: idEntidad, eliminado: false },
      });
      
      if (!condicionIva) {
        return res.status(404).json({ message: "No se encontró condición de IVA para esta entidad" });
      }
      
      res.status(200).json(condicionIva);
    }
    catch (error) {
      console.error("Error al obtener la condición de IVA:", error);
      res.status(500).json({ message: "Error al obtener la condición de IVA", error: error.message });
    }
  };
  
  /**
   * 🆕 Obtener todos los lotes utilizados en una transacción específica
   * Retorna información completa de los lotes y sus cantidades
   */
  const getLotesDeTransaccion = async (req, res) => {
    const { idTransaccion } = req.params;
    
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { LoteTransaccion, Lote } = require('../models/itemModel.js').itemModelInit(sequelize);
      const { TransaccionItem } = transaccionModelInit(sequelize);
      
      // Obtener todos los lotes de esta transacción (incluyendo eliminados para poder revertirlos)
      const lotesTransaccion = await LoteTransaccion.findAll({
        where: { 
          idTransaccion: parseInt(idTransaccion),
          eliminado: false // Solo lotes activos
        },
        include: [
          {
            model: Lote,
            as: 'lote',
            attributes: ['id', 'idItem', 'numeroLote', 'fechaVencimiento', 'fechaFabricacion']
          }
        ]
      });
      
      if (!lotesTransaccion || lotesTransaccion.length === 0) {
        return res.status(404).json({ 
          message: "No se encontraron lotes para esta transacción",
          lotes: []
        });
      }
      
      // Obtener información de ubicación desde TransaccionItem para cada lote
      const lotesConUbicacion = await Promise.all(
        lotesTransaccion.map(async (lt) => {
          const transaccionItem = await TransaccionItem.findOne({
            where: {
              idTransaccion: parseInt(idTransaccion),
              idItem: lt.lote.idItem,
              eliminado: false
            },
            attributes: ['idUbicacion']
          });
          
          return {
            idLote: lt.idLote,
            idItem: lt.lote.idItem,
            numeroLote: lt.lote.numeroLote,
            cantidad: parseFloat(lt.cantidad),
            idUbicacion: transaccionItem?.idUbicacion || null,
            fechaVencimiento: lt.lote.fechaVencimiento,
            fechaFabricacion: lt.lote.fechaFabricacion
          };
        })
      );
      
      console.log(`✅ Lotes de transacción ${idTransaccion} obtenidos:`, lotesConUbicacion.length);
      res.status(200).json(lotesConUbicacion);
      
    } catch (error) {
      console.error("❌ Error al obtener lotes de transacción:", error);
      res.status(500).json({ 
        message: "Error al obtener lotes de transacción", 
        error: error.message 
      });
    }
  };
  
  /**
   * 🆕 Revertir stock de lotes de una transacción
   * Devuelve el stock a LoteItemUbicacion y marca LoteTransaccion como eliminado
   */
  const revertirLotesDeTransaccion = async (req, res) => {
    const { idTransaccion } = req.params;
    
    try {
      const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { LoteTransaccion, LoteItemUbicacion } = require('../models/itemModel.js').itemModelInit(sequelize);
      const { Transaccion } = transaccionModelInit(sequelize);
      
      // Obtener la transacción para obtener su ubicación
      const transaccion = await Transaccion.findByPk(parseInt(idTransaccion));
      
      if (!transaccion) {
        return res.status(404).json({ 
          message: "Transacción no encontrada",
          lotesRevertidos: 0
        });
      }
      
      const idUbicacion = transaccion.idUbicacion;
      
      if (!idUbicacion) {
        console.warn(`⚠️ Transacción ${idTransaccion} no tiene ubicación definida`);
        return res.status(400).json({ 
          message: "La transacción no tiene una ubicación definida",
          lotesRevertidos: 0
        });
      }
      
      // Obtener todos los lotes activos de esta transacción
      const lotesTransaccion = await LoteTransaccion.findAll({
        where: { 
          idTransaccion: parseInt(idTransaccion),
          eliminado: false
        }
      });
      
      if (!lotesTransaccion || lotesTransaccion.length === 0) {
        return res.status(200).json({ 
          message: "No se encontraron lotes activos para revertir",
          lotesRevertidos: 0
        });
      }
      
      let lotesRevertidos = 0;
      
      // Para cada lote, devolver el stock y marcarlo como eliminado
      for (const lt of lotesTransaccion) {
        try {
          // Devolver stock al lote usando la ubicación de la transacción
          const loteItemUbicacion = await LoteItemUbicacion.findOne({
            where: {
              idLote: parseInt(lt.idLote),
              idUbicacion: parseInt(idUbicacion),
              eliminado: false
            }
          });
          
          if (loteItemUbicacion) {
            const stockActual = parseFloat(loteItemUbicacion.stock || 0);
            const cantidadDevolver = parseFloat(lt.cantidad);
            const nuevoStock = stockActual + cantidadDevolver;
            
            await loteItemUbicacion.update({ stock: nuevoStock });
            console.log(`✅ Stock devuelto a lote ${lt.idLote}: ${stockActual} + ${cantidadDevolver} = ${nuevoStock}`);
          }
          
          // Marcar LoteTransaccion como eliminado
          await lt.update({ eliminado: true });
          lotesRevertidos++;
          
        } catch (errorLote) {
          console.error(`❌ Error revirtiendo lote ${lt.idLote}:`, errorLote);
        }
      }
      
      console.log(`✅ ${lotesRevertidos} lotes revertidos para transacción ${idTransaccion}`);
      res.status(200).json({
        message: "Lotes revertidos correctamente",
        lotesRevertidos
      });
      
    } catch (error) {
      console.error("❌ Error al revertir lotes de transacción:", error);
      res.status(500).json({ 
        message: "Error al revertir lotes de transacción", 
        error: error.message 
      });
    }
  };
  
  const getClientesConPreciosByFiltros = async (req, res) => {
    const {
      idEntidad,
      idItem,
      idUbicacion,
      idTipoEntidad,
      soloUltimos,
      searchText,
      filtrosAtributos,
    } = req.query;
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { Ubicacion, Entidad } = adminModelInit(sequelize);
  
      let atributosFilters = {};
      if (filtrosAtributos) {
        try {
          atributosFilters = typeof filtrosAtributos === "string" ? JSON.parse(filtrosAtributos) : filtrosAtributos;
        } catch (e) {}
      }
  
      let searchCondition = "";
      let atributosCondition = "";
      let replacements = {};
  
      if (searchText && searchText.trim() !== "" && (!idItem || idItem === "null")) {
        const searchTermLower = searchText.trim().toLowerCase();
        searchCondition = `AND (
          LOWER(i.descripcion) LIKE :searchTerm OR
          LOWER(i.codigo) LIKE :searchTerm OR
          LOWER(i."codigoScanner") LIKE :searchTerm
        )`;
        replacements.searchTerm = `%${searchTermLower}%`;
      }
  
      if (atributosFilters && Object.keys(atributosFilters).length > 0) {
        Object.entries(atributosFilters).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== "") {
            const paramName = campo.replace(/\./g, "_");
            atributosCondition += ` AND LOWER(i."${campo}") LIKE :${paramName}`;
            replacements[paramName] = `%${valor.trim().toLowerCase()}%`;
          }
        });
      }
  
      if (idEntidad && idEntidad !== "null") replacements.idProveedorFiltro = parseInt(idEntidad, 10);
      if (idItem && idItem !== "null") replacements.idItem = parseInt(idItem, 10);
      if (idUbicacion && idUbicacion !== "null") replacements.idUbicacion = parseInt(idUbicacion, 10);
      // idTipoEntidad here refers to the provider filter (=2), clients are idTipoEntidad=1
      if (idTipoEntidad && idTipoEntidad !== "null") replacements.idTipoEntidadProveedor = parseInt(idTipoEntidad, 10);
  
      // First get the (idItem, idUbicacion) pairs from proveedores matching filters
      const queryPairs = `
        SELECT DISTINCT ldm."idItem", ldm."idUbicacion"
        FROM "listaDeMontos" ldm
        INNER JOIN item i ON ldm."idItem" = i.id AND i.eliminado = false
        INNER JOIN entidad e ON ldm."idEntidad" = e.id AND e.eliminado = false
        WHERE ldm.eliminado = false
          ${idEntidad && idEntidad !== "null" ? 'AND ldm."idEntidad" = :idProveedorFiltro' : ''}
          ${idItem && idItem !== "null" ? 'AND ldm."idItem" = :idItem' : ''}
          ${idUbicacion && idUbicacion !== "null" ? 'AND ldm."idUbicacion" = :idUbicacion' : ''}
          ${idTipoEntidad && idTipoEntidad !== "null" ? 'AND e."idTipoEntidad" = :idTipoEntidadProveedor' : ''}
          ${searchCondition}
          ${atributosCondition}
      `;
  
      const pairs = await sequelize.query(queryPairs, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
  
      if (!pairs || pairs.length === 0) {
        return res.status(200).json({ clientes: [] });
      }
  
      // Build conditions for clients having prices for those pairs
      const pairConditions = pairs.map((_, idx) => `(ldm."idItem" = :pairItem${idx} AND ldm."idUbicacion" = :pairUbicacion${idx})`).join(" OR ");
      pairs.forEach((p, idx) => {
        replacements[`pairItem${idx}`] = p.idItem;
        replacements[`pairUbicacion${idx}`] = p.idUbicacion;
      });
  
      const queryClientes = `
        SELECT DISTINCT e.id, e.descripcion, e.apellido
        FROM "listaDeMontos" ldm
        INNER JOIN entidad e ON ldm."idEntidad" = e.id AND e.eliminado = false
        WHERE ldm.eliminado = false
          AND e."idTipoEntidad" = 1
          AND (${pairConditions})
        ORDER BY e.descripcion ASC
      `;
  
      const clientes = await sequelize.query(queryClientes, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      });
  
      const clientesFormateados = clientes.map(c => ({
        id: c.id,
        label: `${c.descripcion || ''} ${c.apellido || ''}`.trim() || `Cliente #${c.id}`,
      }));
  
      return res.status(200).json({ clientes: clientesFormateados });
    } catch (error) {
      console.error("Error al obtener clientes con precios por filtros:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };
  
  const promoverProveedorReferente = async (req, res) => {
    const { idItem, idEntidad, idUbicacion, monto, tipoAjuste, margenGanancia, idEntidadesCliente } = req.body;
  
    if (!idItem || !idEntidad || !idUbicacion || monto === undefined || !tipoAjuste) {
      return res.status(400).json({ success: false, message: "idItem, idEntidad, idUbicacion, monto y tipoAjuste son requeridos." });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      const idItemInt = parseInt(idItem, 10);
      const idEntidadInt = parseInt(idEntidad, 10);
      const idUbicacionInt = parseInt(idUbicacion, 10);
  
      // 1. Quitar esProveedorReferente al referente actual para (idItem, idUbicacion)
      const referenteActual = await ListaDeMontos.findOne({
        where: {
          idItem: idItemInt,
          idUbicacion: idUbicacionInt,
          esProveedorReferente: true,
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
      });
  
      if (referenteActual) {
        await referenteActual.update({ esProveedorReferente: false });
      }
  
      // 2. Calcular el nuevo monto desde el último registro del proveedor a promover
      const ultimoRegistro = await ListaDeMontos.findOne({
        where: {
          idItem: idItemInt,
          idEntidad: idEntidadInt,
          idUbicacion: idUbicacionInt,
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
      });
  
      let newMonto;
      if (tipoAjuste === "porcentaje") {
        const base = ultimoRegistro ? parseFloat(ultimoRegistro.monto) : 0;
        newMonto = base * (1 + parseFloat(monto) / 100);
      } else {
        newMonto = parseFloat(monto);
      }
  
      const nuevoMargen = margenGanancia !== undefined && margenGanancia !== null && margenGanancia !== ""
        ? parseFloat(margenGanancia)
        : (ultimoRegistro?.margenGanancia ?? null);
  
      // 3. Crear nuevo registro con esProveedorReferente=true
      await ListaDeMontos.create({
        fecha: new Date(),
        idItem: idItemInt,
        idEntidad: idEntidadInt,
        idUbicacion: idUbicacionInt,
        monto: newMonto,
        margenGanancia: nuevoMargen,
        esProveedorReferente: true,
        eliminado: false,
      });
  
      // 4. Crear registros de precio para los clientes seleccionados (solo si hay margen)
      let preciosActualizados = 0;
      if (Array.isArray(idEntidadesCliente) && idEntidadesCliente.length > 0 && nuevoMargen != null) {
        const nuevoPrecio = newMonto * (1 + nuevoMargen / 100);
        for (const idEntidadCliente of idEntidadesCliente) {
          await ListaDeMontos.create({
            fecha: new Date(),
            idItem: idItemInt,
            idUbicacion: idUbicacionInt,
            idEntidad: parseInt(idEntidadCliente, 10),
            monto: nuevoPrecio,
            margenGanancia: null,
            esProveedorReferente: false,
            eliminado: false,
          });
          preciosActualizados++;
        }
      }
  
      return res.status(200).json({
        success: true,
        message: `Proveedor promovido como referente correctamente.${preciosActualizados > 0 ? ` Se actualizaron precios para ${preciosActualizados} cliente(s).` : ""}`,
        preciosActualizados,
      });
    } catch (error) {
      console.error("Error al promover proveedor referente:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };
  
  const actualizarPreciosClientesDesdeReferente = async (req, res) => {
    const { idItem, idEntidad, idUbicacion, idEntidadesCliente } = req.body;
  
    if (!idItem || !idEntidad || !idUbicacion || !Array.isArray(idEntidadesCliente) || idEntidadesCliente.length === 0) {
      return res.status(400).json({ success: false, message: "idItem, idEntidad, idUbicacion e idEntidadesCliente son requeridos." });
    }
  
    try {
      let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
  
      const idItemInt = parseInt(idItem, 10);
      const idEntidadInt = parseInt(idEntidad, 10);
      const idUbicacionInt = parseInt(idUbicacion, 10);
  
      const ultimoRegistro = await ListaDeMontos.findOne({
        where: {
          idItem: idItemInt,
          idEntidad: idEntidadInt,
          idUbicacion: idUbicacionInt,
          eliminado: false,
        },
        order: [["fecha", "DESC"]],
      });
  
      if (!ultimoRegistro || !ultimoRegistro.esProveedorReferente || ultimoRegistro.margenGanancia == null) {
        return res.status(400).json({
          success: false,
          message: "El proveedor debe ser referente y tener margen definido para actualizar precios de clientes.",
        });
      }
  
      const costo = parseFloat(ultimoRegistro.monto);
      const margen = parseFloat(ultimoRegistro.margenGanancia);
      const nuevoPrecio = costo * (1 + margen / 100);
  
      let preciosActualizados = 0;
      for (const idEntidadCliente of idEntidadesCliente) {
        await ListaDeMontos.create({
          fecha: new Date(),
          idItem: idItemInt,
          idUbicacion: idUbicacionInt,
          idEntidad: parseInt(idEntidadCliente, 10),
          monto: nuevoPrecio,
          margenGanancia: null,
          esProveedorReferente: false,
          eliminado: false,
        });
        preciosActualizados++;
      }
  
      return res.status(200).json({
        success: true,
        message: `Se actualizaron precios para ${preciosActualizados} cliente(s).`,
        preciosActualizados,
      });
    } catch (error) {
      console.error("Error al actualizar precios de clientes desde referente:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };
  
  module.exports = {
    postMoneda,
    getMoneda,
    updateMoneda,
    deleteMoneda,
    postTipoMedioDePago,
    getTipoMedioDePago,
    updateTipoMedioDePago,
    deleteTipoMedioDePago,
    postMedioDePago,
    getMedioDePago,
    updateMedioDePago,
    deleteMedioDePago,
    postCategoriaTransaccion,
    getCategoriaTransaccion,
    updateCategoriaTransaccion,
    deleteCategoriaTransaccion,
    getSubCategoriaTransaccion,
    postSubCategoriaTransaccion,
    updateSubCategoriaTransaccion,
    deleteSubCategoriaTransaccion,
    postTipoTransaccion,
    getTipoTransaccion,
    gestionTipoTransaccionTabla,
    updateTipoTransaccion,
    deleteTipoTransaccion,
    postTransaccionItem,
    getTransaccionItem,
    getTransaccionItemID, // Asegúrate de que este esté incluido
    postTransaccion,
    getTransaccion,
    putTransaccion,
    getTransaccionItemByTransactionAndItem,
    updateTransaccionItem,
    deleteTransaccionItemsNotInList,
    getTransaccionItemsByTransactionId,
    postTransaccionPago,
    postCrearPago,
    postMedioDePago,
    getMedioDePago,
    getMedioDePagoConDescripcion,
    getMedioDePagoPorTipo,
    getCuentaCorriente,
    postCuentaCorrienteVenta,
    updateCuentaCorrienteVenta,
    getTransaccionTransformed,
    getTransaccionTransformedVentas,
    getTransaccionTransformedVentasAllData,
    getTransaccionTransformedCompras,
    getTransaccionTransformedPresupuesto,
    getCuentaCorrienteTransformed,
    getFilteredTransacciones,
    getTransaccionFilter,
    postTransaccionDevolucion,
    postTransaccionItemDevolucion,
    postImpuestos,
    getImpuestos,
    postTransaccionImpuesto,
    updateImpuestoEstado,
    updateImpuestoContenido,
    getTiposFacturas,
    postTransaccionTipoFactura,
    getTransaccionFacturadaData,
    getTransaccionMontoTotalByTipoTransaccion,
    getTop10ItemVentas,
    enviarMail, 
    enviarWhatsAppLink,
    guardarComprobante,
    guardarTicket,
    getTop3ItemsLast7Days,
    postListaMonto,
    getListaMontosByEntidad,
    getEntidadesUnicasByFilters,
    getValoresUnicosAtributo,
    updateAllPrices,
    updateFilteredPrices,
    updateItemPrecioListaId,
    updatePreciosListaMultiple,
    getListaMontosByIdItem,
    updateListaDeMonto,
    updateListaDeMontoBatch,
    getListaMontosByIdItemIdEntidad,
    postTransaccionCompraEstado,
    getEstadoCompra,
    postTransaccionCompraItem,
    getTransaccionItemIDEnCompras,
    updateTransaccionCompraItem,
    updateTransaccionCompraEstado,
    getTransaccionItemByTipoTransaccion,
    getTransaccionItemByTipoTransaccionAllData,
    deleteTransaccionItem,
    deleteTransaccionCompraItem,
    deleteTransaccionPago,
    getCuentaCorrienteByIdEntidad,
    updateDeleteTransaccion,
    postTransaccionAuditoria,
    getTransaccionAuditoria,
    copiarPreciosEntreEntidades,
    getCajaByMedioDePago,
    getSubCategoriaTransaccionByCategoria,
    getGastosTransacciones,
    updateTransaccionPago,
    getTransaccionesPagoFilter,
    getAndPostCajaDatos,
    recalcularCajaCompleta,
    resumenVentasN8N,
    getTransaccionTransformedPresupuestosAllData,
    postTransaccionImpuestoItem,
    updateTransaccionImpuestoItem,
    getTransaccionImpuestoItems,
    validarDevolucionCanje,
    getCondicionIvaByIdEntidad,
    getLotesDeTransaccion,
    revertirLotesDeTransaccion,
    updateMargenGananciaListaId,
    updateMargenGananciaFiltrado,
    getClientesConPreciosByFiltros,
    promoverProveedorReferente,
    actualizarPreciosClientesDesdeReferente,
  };
  