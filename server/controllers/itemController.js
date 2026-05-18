// const { Item, ItemUbicacion, ItemCategoria, ItemSubCategoria, ItemAtributo, ItemEntidad  } = require('../models/itemModel.js');
const { Op, Sequelize, where } = require('sequelize'); //Op es un objeto en Sequelize que contiene los operadores que te permiten realizar consultas avanzadas en la base de datos. Estos operadores se utilizan dentro de las consultas para definir condiciones específicas, como coincidencias parciales, comparaciones, y otros criterios.

const { conexionDB } = require('../config/db.js');
const { itemModelInit } = require('../models/itemModel.js');
const { adminModelInit } = require('../models/adminModel.js');
const { transaccionModelInit } = require('../models/transaccionModel.js');

// Ejemplos op: 
/*Op.eq: Igual a (=).
Op.ne: No igual a (!=).
Op.like: Coincidencia parcial con un patrón (equivalente a LIKE en SQL).
Op.in: Coincidencia con cualquier valor en un array.
Op.gt: Mayor que (>).
Op.gte: Mayor o igual que (>=).
Op.or: Operador lógico OR.
[Op.lte] → less than or equal → menor o igual que (≤)
[Op.lt] → less than → estrictamente menor que (<)
*/

// Crear un nuevo Item con atributos dinámicos
const postItem = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    const { descripcion, codigo, atributos, codigoScanner, pluBalanza, usaGestionLotes } = req.body; // Recibimos atributos adicionales del frontend

    // Crear el objeto base del item
    const itemData = {
      descripcion,
      codigo,
      codigoScanner,
    };

    if (pluBalanza) {
      itemData.pluBalanza = pluBalanza;
    }

    if (usaGestionLotes !== undefined) {
      itemData.usaGestionLotes = usaGestionLotes;
    }

    // Mapear los atributos dinámicos al formato esperado en la tabla Item
    atributos.forEach((atributo, index) => {
      const key = `itemDatoAtributo${index + 1}`;
      itemData[key] = atributo.valor || null; // Asigna el valor del atributo si existe
    });

    // Crear y guardar el Item
    const newItem = await Item.create(itemData);

    res.status(201).json({ id: newItem.id, message: 'Item creado exitosamente' });
  } catch (error) {
    console.error("Error al crear el item:", error);
    res.status(400).json({ message: 'Error al crear el item', error });
  }
};
/*
const getItem = async (req, res) => {
    try {
        const item = await Item.find();
        res.status(200).json(item);    
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener items', error });
    }
};*/

// Obtener todos los items
const getItem = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    const items = await Item.findAll({
      where: { eliminado: false }  // Filtrar solo items no eliminados
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items', error });
  }
};

// Controlador para obtener un item por ID
const getItemById = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    const { id } = req.params;  // Asegúrate de que el parámetro sea `id`
    const itemById = await Item.findByPk(id);  // Busca por clave primaria

    if (!itemById) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }

    res.status(200).json(itemById);  // Devuelve el item encontrado
  } catch (error) {
    console.error("Error en getItemById:", error);  // Log en el servidor para depuración
    res.status(500).json({ message: 'Error al obtener item', error: error.message });
  }
};

const getItemByCodigoItem = async (req, res) => {
  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    // Extrae el parámetro de la URL
    const { codigoItem } = req.params;

    // Realiza la consulta utilizando el where por codigoItem
    const itemEncontrado = await Item.findOne({
      where: { 
        codigo: codigoItem,
        eliminado: false  // Solo items no eliminados
      }
    });

    if (!itemEncontrado) {
      // Para validación en frontend, "no existe" no se considera error HTTP.
      return res.status(200).json(null);
    }

    res.status(200).json(itemEncontrado);
  } catch (error) {
    console.error("Error en getItemByCodigoItem:", error);
    res.status(500).json({ message: 'Error al obtener item', error: error.message });
  }
};

/**
 * Obtener los últimos 5 ítems que coincidan con un campo especificado
 */
const getItemByIdentity = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);
    const { codigo = '', descripcion = '', codigoScanner = '' } = req.query;

    if (!codigo?.trim() || !descripcion?.trim() || !codigoScanner?.trim()) {
      return res.status(400).json({ message: 'codigo, descripcion y codigoScanner son requeridos' });
    }

    const itemEncontrado = await Item.findOne({
      where: {
        codigo: codigo.trim(),
        descripcion: descripcion.trim(),
        codigoScanner: codigoScanner.trim(),
        eliminado: false,
      },
      attributes: ['id', 'codigo', 'descripcion', 'codigoScanner'],
    });

    res.status(200).json({ exists: !!itemEncontrado, item: itemEncontrado || null });
  } catch (error) {
    console.error("Error en getItemByIdentity:", error);
    res.status(500).json({ message: 'Error al validar identidad de item', error: error.message });
  }
};
const getItemSuggestions = async (req, res) => {
  const { field = "descripcion", search = "" } = req.query;
  const searchValue = search.trim();

  if (!searchValue) {
    return res.status(400).json({ message: "El término de búsqueda es requerido." });
  }

  const validFields = {
    descripcion: "descripcion",
    codigo: "codigo",
    codigoScanner: "codigoScanner",
  };

  if (!validFields[field]) {
    return res.status(400).json({ message: "Campo de búsqueda inválido." });
  }

  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    const items = await Item.findAll({
      where: {
        [validFields[field]]: { [Op.iLike]: `%${searchValue}%` },
        eliminado: false,
      },
      attributes: ["id", "descripcion", "codigo", "codigoScanner", "createdAt"],
      order: [["createdAt", "DESC"]],
      limit: 5,
    });

    res.status(200).json({ items });
  } catch (error) {
    console.error("Error en getItemSuggestions:", error);
    res.status(500).json({ message: "Error al obtener sugerencias de ítems", error: error.message });
  }
};


/**
 * Obtener los items basados en el término de búsqueda (mínimo 3 letras)
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * 1. Búsqueda por descripción y código (búsqueda libre)
 * 2. Búsqueda por código de scanner (coincidencia exacta) - codigoScanner
 * 3. Búsqueda por código de balanza (formato 2-5-5 + 1 dígito de control) - pluBalanza
 * 
 * FUNCIONALIDADES COEXISTENTES:
 * 
 * A) PRODUCTOS NORMALES (codigoScanner):
 *    - Códigos de barras normales (no empiezan con "20")
 *    - Se busca en el campo codigoScanner
 *    - Cantidad = 1 (se edita manualmente)
 *    - Ejemplo: Lata de arvejas, cajas, productos envasados
 * 
 * B) PRODUCTOS DE BALANZA (pluBalanza):
 *    - Códigos que empiezan con "20" + 12+ dígitos
 *    - Se busca en el campo pluBalanza
 *    - Cantidad = peso en kg (se establece automáticamente)
 *    - Ejemplo: Bizcochos, frutas, productos a granel
 * 
 * DETECCIÓN AUTOMÁTICA:
 * - Si empieza con "20" y tiene 12+ dígitos = código de balanza
 * - Si no empieza con "20" = código de scanner normal
 * - Ambas funcionalidades funcionan simultáneamente
 * 
 
* NORMALIZACIÓN DE PLUs:
 * - Los PLUs se normalizan automáticamente eliminando ceros a la izquierda
 * - Esto permite que "45" en BD coincida con "00045" en el ticket
 * - Ejemplo: PLU "00045" del ticket → normalizado a "45" → búsqueda exitosa
 * 
 * @param {Object} req - Request con query parameter 'search'
 * @param {Object} res - Response object
 */
const getItemTresLetras = async (req, res) => {
  const { search } = req.query;  // Captura el parámetro 'search' de la query string
  //const { idUbicacion } = req.body; // Recibimos atributos adicionales del frontend
  if (!search || search.length < 3) {
    return res.status(400).json({ message: 'El término de búsqueda debe tener al menos 3 letras.' });
  }

  try {
    // Conexion a la base de datos
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item, ItemAtributo } = itemModelInit(sequelize);



    // Detecta si 'search' tiene más de 10 dígitos y son todos números
    const isScannerInput = /^\d+$/.test(search)   // por ejemplo, solo dígitos

    // Función auxiliar para normalizar PLUs (eliminar ceros a la izquierda)
    const normalizarPLU = (plu) => {
      // Convertir a string y eliminar ceros a la izquierda
      return String(plu).replace(/^0+/, '');
    };

    let whereConditions;
    let buscadoPorScanner = false
    let buscadoPorBalanza = false
    let pesoBalanza = null

    if (isScannerInput) {
      // PASO 1: Verificar si es un código de balanza (empieza con "20")
      if (search.startsWith('20') && search.length >= 12) {
        /**
         * ESCENARIO A: CÓDIGO DE BALANZA DETECTADO
         * 
         * FORMATO: 2-5-5 + 1 dígito de control
         * Ejemplo: 20012340050001
         * - Prefijo: 20 (indica que es código de balanza)
         * - PLU: 01234 (5 dígitos del código del producto en la balanza)
         * - Peso: 00500 (5 dígitos del peso en gramos = 0.5kg)
         * - Control: 1 (dígito verificador)
         * 
         * IMPORTANTE: Los PLUs en la BD NO tienen ceros a la izquierda,
         * pero en el código de barras SÍ los tienen.
         * 
         * PRODUCTOS: Bizcochos, frutas, productos a granel, etc.
         */
        const pluBalanza = search.substring(2, 7);  // 5 dígitos del PLU
        const pesoEnGramos = parseInt(search.substring(7, 12)); // 5 dígitos del peso
        pesoBalanza = pesoEnGramos / 1000; // Convertir gramos a kilogramos
        
        // Normalizar el PLU extraído del código escaneado (eliminar ceros a la izquierda)
        const pluNormalizado = normalizarPLU(pluBalanza);
        console.log(`Código de balanza detectado: PLU=${pluBalanza}, Peso=${pesoBalanza}kg`);
        console.log(`PLU normalizado para búsqueda: "${pluNormalizado}" (original: "${pluBalanza}")`);
        
        // Buscar por PLU de balanza normalizado en la base de datos
        whereConditions = { 
          pluBalanza: pluNormalizado,
          eliminado: false
        };
        buscadoPorScanner = true
        buscadoPorBalanza = true
      } else {
        /**
         * ESCENARIO B: CÓDIGO DE SCANNER NORMAL
         * 
         * PRODUCTOS: Lata de arvejas, cajas, productos envasados, etc.
         * CANTIDAD: 1 (se edita manualmente si se compran más)
         * BÚSQUEDA: Campo codigoScanner (funcionalidad existente)
         */
        whereConditions = { 
          codigoScanner: search,
          eliminado: false
        };
        buscadoPorScanner = true
      }
    } else {
      // PASO 2: Verificar si es una búsqueda por PLU de balanza (prefijo "PLU:")
      if (search.startsWith('PLU:')) {
        /**
         * ESCENARIO C: BÚSQUEDA DIRECTA POR PLU DE BALANZA
         * 
         * USO: Cuando se escribe manualmente un código de balanza
         * FORMATO: "PLU:45678" (solo el PLU, sin el código completo)
         * 
         * PRODUCTOS: Bizcochos, frutas, productos a granel, etc.
         */
        const pluBalanza = search.substring(4); // Extraer el PLU después de "PLU:"
        
        // Normalizar el PLU ingresado manualmente (eliminar ceros a la izquierda)
        const pluNormalizado = normalizarPLU(pluBalanza);
        console.log(`Búsqueda directa por PLU de balanza: ${pluBalanza}`);
        console.log(`PLU normalizado para búsqueda: "${pluNormalizado}" (original: "${pluBalanza}")`);
        
        whereConditions = { 
          pluBalanza: pluNormalizado,
          eliminado: false
        };
        buscadoPorScanner = false
        buscadoPorBalanza = true
        pesoBalanza = null // No tenemos el peso en este caso
      } else {
        /**
         * ESCENARIO D: BÚSQUEDA LIBRE (no es código escaneado ni PLU)
         * 
         * BÚSQUEDA: Por descripción y código del producto
         * USO: Búsqueda manual de productos
         */
        whereConditions = {
          [Op.or]: [
            { descripcion: { [Op.iLike]: `%${search}%` } },
            { codigo: { [Op.iLike]: `%${search}%` } },
          ],
          eliminado: false
        };
      }
    }


    // Buscar los items en la base de datos que coincidan con la búsqueda
    const items = await Item.findAll({
      where: whereConditions,
      raw: true
    });

    /**
     * RESPUESTA DEL CONTROLADOR
     * 
     * ESCENARIOS POSIBLES:
     * 
     * 1) PRODUCTOS DE BALANZA ESCANEADOS:
     *    - items: Array de productos encontrados
     *    - buscadoPorScanner: true (fue escaneado)
     *    - buscadoPorBalanza: true (es producto de balanza)
     *    - pesoBalanza: peso en kg extraído del código (ej: 0.5)
     * 
     * 2) PRODUCTOS ESCANEADOS NORMALES:
     *    - items: Array de productos encontrados
     *    - buscadoPorScanner: true (fue escaneado)
     *    - buscadoPorBalanza: false (no es producto de balanza)
     *    - pesoBalanza: null
     * 
     * 3) BÚSQUEDA DIRECTA POR PLU DE BALANZA:
     *    - items: Array de productos encontrados
     *    - buscadoPorScanner: false (no fue escaneado)
     *    - buscadoPorBalanza: true (es producto de balanza)
     *    - pesoBalanza: null (no tenemos el peso del código)
     * 
     * 4) BÚSQUEDAS MANUALES LIBRES:
     *    - items: Array de productos encontrados
     *    - buscadoPorScanner: false
     *    - buscadoPorBalanza: false
     *    - pesoBalanza: null
     */
    res.status(200).json({
      items,
      buscadoPorScanner,
      buscadoPorBalanza,
      pesoBalanza
    });
  } catch (error) {
    console.error("Error al buscar items:", error);
    res.status(500).json({ message: 'Error al obtener items', error });
  }
};

const postItemUbicacion = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    const itemUbicacion = new ItemUbicacion(req.body);
    await itemUbicacion.save();
    res.status(201).json(itemUbicacion);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el item', error });
  }
};

const getItemUbicacion = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    const itemUbicacion = await ItemUbicacion.findAll({
      where: { eliminado: false }, // Filtra solo los no eliminados
    });
    res.status(200).json(itemUbicacion);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items activos', error });
  }
};

const getDeletedItemUbicacion = async (req, res) => {
  try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item, ItemUbicacion } = itemModelInit(sequelize);
    const { Ubicacion } = adminModelInit(sequelize);

    const itemUbicaciones = await ItemUbicacion.findAll({
      where: { eliminado: true }, // Filtra solo los eliminados
      include: [
        {
          model: Item,
          as: "item",
          required: true,
          attributes: ['id', 'codigo', 'descripcion', 'itemDatoAtributo1', 'itemDatoAtributo2', 'itemDatoAtributo3', 'itemDatoAtributo4', 'itemDatoAtributo5', 'itemDatoAtributo6', 'itemDatoAtributo7', 'itemDatoAtributo8', 'itemDatoAtributo9', 'itemDatoAtributo10', 'usaGestionLotes', 'codigoScanner', 'pluBalanza']
        },
        {
          model: Ubicacion,
          as: "ubicacion",
          required: true,
          attributes: ['id', 'descripcion']
        }
      ],

    });

    const response = itemUbicaciones.map((itemUbicacion) => {
      // Log de cada itemUbicacion
      if (index < 100) { // Mostrar solo los primeros 100 logs
        console.log("Procesando itemUbicacion:", itemUbicacion.ubicacion.id);
        console.log("Procesando item.id:", itemUbicacion.item.id);
        console.log("Procesando ubicacion descripcion:", itemUbicacion.ubicacion.descripcion);
        console.log("eliminado:", itemUbicacion.eliminado);
      }

      const formattedUpdatedAt = itemUbicacion.updatedAt
        ? new Intl.DateTimeFormat("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(itemUbicacion.updatedAt))
        : null;

      const uniqueId = `${itemUbicacion.item.id}-${itemUbicacion.ubicacion.id}`;


      return {
        id: uniqueId, // ID generado dinámicamente
        idItem: itemUbicacion.item.id, // ID del Item
        codigo: itemUbicacion.item.codigo, // Código del Item
        descripcion: itemUbicacion.item.descripcion, // Descripción del Item
        codigoScanner: itemUbicacion.item.codigoScanner, // Código de scanner
        pluBalanza: itemUbicacion.item.pluBalanza, // PLU de balanza
        usaGestionLotes: itemUbicacion.item.usaGestionLotes, // Usa gestión de lotes
        idUbicacion: itemUbicacion.ubicacion.id, // ID de Ubicación
        ubicacion: itemUbicacion.ubicacion.descripcion, // Nombre de Ubicación
        inventario: itemUbicacion.inventario,
        precio: itemUbicacion.precio,
        stockMinimo: itemUbicacion.stockMinimo,
        updatedAt: itemUbicacion.updatedAt,
        eliminado: itemUbicacion.eliminado,
        lowStock: itemUbicacion.inventario <= itemUbicacion.stockMinimo, // Alerta de stock


        // Agrupando todos los atributos dinámicos en activeAttributes
        activeAttributes: {
          itemDatoAtributo1: itemUbicacion.item.itemDatoAtributo1,
          itemDatoAtributo2: itemUbicacion.item.itemDatoAtributo2,
          itemDatoAtributo3: itemUbicacion.item.itemDatoAtributo3,
          itemDatoAtributo4: itemUbicacion.item.itemDatoAtributo4,
          itemDatoAtributo5: itemUbicacion.item.itemDatoAtributo5,
          itemDatoAtributo6: itemUbicacion.item.itemDatoAtributo6,
          itemDatoAtributo7: itemUbicacion.item.itemDatoAtributo7,
          itemDatoAtributo8: itemUbicacion.item.itemDatoAtributo8,
          itemDatoAtributo9: itemUbicacion.item.itemDatoAtributo9,
          itemDatoAtributo10: itemUbicacion.item.itemDatoAtributo10,
        }
      };
    });

    res.status(200).json(response);

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items', error });
  }
};

// Obtener todos los items con filtrado de ID ITEM

const getItemUbicacionFilterByUbicacion = async (req, res) => {
  const { itemID, ubicacionID } = req.params; // Captura el parámetro de ruta 'itemID'

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    const itemsUbicaciones = await ItemUbicacion.findAll({
      where: {
        idItem: itemID,
        idUbicacion: ubicacionID,
        eliminado: false, // Filtra solo las ubicaciones activas relacionadas al itemID
      },
    });
    res.status(200).json(itemsUbicaciones);
  } catch (error) {
    console.error("Error al buscar items:", error);
    res.status(500).json({ message: 'Error al obtener items filtrados', error });
  }
};

const getItemUbicacionFilter = async (req, res) => {
  const { itemID } = req.params; // Captura el parámetro de ruta 'itemID'

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    const itemsUbicaciones = await ItemUbicacion.findAll({
      where: {
        idItem: itemID,
        eliminado: false, // Filtra solo las ubicaciones activas relacionadas al itemID
      },
    });
    res.status(200).json(itemsUbicaciones);
  } catch (error) {
    console.error("Error al buscar items:", error);
    res.status(500).json({ message: 'Error al obtener items filtrados', error });
  }
};

// Actualizar un itemUbicacion por idItem y idUbicacion
const putItemUbicacion = async (req, res) => {
  const { idItem, idUbicacion, inventario, proviene } = req.body;

  // console.log(`Transacción llegando: idItem = ${idItem}, idUbicacion = ${idUbicacion}, inventario = ${inventario}, proviene = ${proviene}`);

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    // Verificar que los parámetros necesarios estén presentes
    if (!idItem || !idUbicacion || proviene === undefined) {
      return res.status(400).json({
        message: "Los parámetros idItem, idUbicacion y proviene son requeridos",
      });
    }

    // Buscar el registro de ItemUbicacion por idItem y idUbicacion
    const itemUbicacion = await ItemUbicacion.findOne({
      where: { idItem: idItem, idUbicacion: idUbicacion },
    });

    // Verificar si el ítem existe
    if (!itemUbicacion) {
      return res.status(404).json({
        message: "ItemUbicacion no encontrado",
      });
    }

    // Actualizar inventario según el tipo de "proviene"
    let nuevoInventario = itemUbicacion.inventario;

    if (proviene === 'compra') {
      nuevoInventario = nuevoInventario + inventario; // Si es compra, sumamos el inventario
    } else if (proviene === 'venta') {
      nuevoInventario = nuevoInventario - inventario; // Si es venta, restamos el inventario
    } else {
      return res.status(400).json({
        message: "El valor de 'proviene' es inválido. Debe ser 'compra' o 'venta'.",
      });
    }

    // Actualizar el inventario y precio del ítem
    await itemUbicacion.update({
      inventario: nuevoInventario,
    });

    res.status(200).json({
      message: "ItemUbicacion actualizado correctamente",
      itemUbicacion,
    });
  } catch (error) {
    console.error("Error al actualizar ItemUbicacion:", error);
    res.status(500).json({
      message: "Error al actualizar el ItemUbicacion",
      error,
    });
  }
};


const updateItem = async (req, res) => {
  const { id } = req.params;
  const { descripcion, codigo, codigoScannerItem, atributos, eliminado, pluBalanza, usaGestionLotes } = req.body;

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Item no encontrado' });

    // Actualizar campos básicos
    item.descripcion = descripcion;
    item.codigo = codigo;
    item.codigoScanner = codigoScannerItem;

    if (pluBalanza !== undefined) {
      const valorNormalizado = typeof pluBalanza === 'string' ? pluBalanza.trim() : pluBalanza;
      item.pluBalanza = valorNormalizado ? valorNormalizado : null;
    }
    
    // Actualizar campo eliminado si se proporciona
    if (eliminado !== undefined) {
      item.eliminado = eliminado;
    }

    // Actualizar campo usaGestionLotes si se proporciona
    if (usaGestionLotes !== undefined) {
      item.usaGestionLotes = usaGestionLotes;
    }

    // Actualizar atributos dinámicos
    if (Array.isArray(atributos)) {
      atributos.forEach((atributo, index) => {
        const key = `itemDatoAtributo${index + 1}`;
        item[key] = atributo.valor || null; // Asegurarse de que sea un valor válido
      });
    }

    await item.save();

    // 🔄 Si el item usa gestión de lotes, recalcular stock desde los lotes
    if (item.usaGestionLotes) {
      try {
        await recalcularStockDesdeTablaLotes(item.id, sequelize);
      } catch (errorLotes) {
        console.error(`⚠️  Error al recalcular stock de lotes para item ${item.id}:`, errorLotes);
        // No fallar toda la operación por esto, solo advertir
      }
    }

    res.json({ message: 'Item actualizado correctamente', item });
  } catch (error) {
    console.error("Error al actualizar el item:", error);
    res.status(500).json({ message: 'Error al actualizar el item', error });
  }
};
// Actualizar ubicaciones de un item
const updateItemUbicaciones = async (req, res) => {
  const { itemId } = req.params;
  const { ubicaciones } = req.body;

  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion, Item, Lote, LoteItemUbicacion } = itemModelInit(sequelize);

    // Verificar si el item usa gestión de lotes
    const item = await Item.findByPk(itemId);
    const usaGestionLotes = item?.usaGestionLotes || false;

    // Obtener todas las ubicaciones actuales del item
    const existingUbicaciones = await ItemUbicacion.findAll({ where: { idItem: itemId } });

    // Crear un conjunto con los ids de las ubicaciones seleccionadas
    const newUbicacionIds = ubicaciones.map(u => u.idUbicacion);

    // 🆕 Si usa gestión de lotes, obtener ubicaciones con stock en lotes
    let ubicacionesConStockDeLotes = [];
    if (usaGestionLotes) {
      const lotesConStock = await LoteItemUbicacion.findAll({
        include: [
          {
            model: Lote,
            as: 'lote',
            where: { 
              idItem: parseInt(itemId), 
              eliminado: false 
            },
            attributes: []
          }
        ],
        where: { 
          stock: { [Op.gt]: 0 },
          eliminado: false 
        },
        attributes: ['idUbicacion'],
        group: ['idUbicacion'],
        raw: true
      });
      ubicacionesConStockDeLotes = lotesConStock.map(l => l.idUbicacion);
    }

    // Manejar eliminación lógica: marcar como eliminado si no está en las nuevas ubicaciones
    // PERO: Si usa gestión de lotes, NO eliminar ubicaciones con stock de lotes
    for (const existing of existingUbicaciones) {
      if (!newUbicacionIds.includes(existing.idUbicacion)) {
        // 🛡️ Proteger ubicaciones con stock de lotes
        if (usaGestionLotes && ubicacionesConStockDeLotes.includes(existing.idUbicacion)) {
          continue; // No eliminar esta ubicación
        }
        
        existing.eliminado = true;
        await existing.save();  // Guardar cambio en la base de datos
      }
    }

    // 🆕 Si usa gestión de lotes, reactivar automáticamente ubicaciones con stock de lotes
    if (usaGestionLotes && ubicacionesConStockDeLotes.length > 0) {
      const ubicacionesEliminadas = await ItemUbicacion.findAll({
        where: {
          idItem: itemId,
          idUbicacion: { [Op.in]: ubicacionesConStockDeLotes },
          eliminado: true
        }
      });

      for (const ubicacion of ubicacionesEliminadas) {
        ubicacion.eliminado = false;
        await ubicacion.save();
      }
    }

    // Manejar actualización e inserción
    for (const ubicacion of ubicaciones) {
      const existingUbicacion = await ItemUbicacion.findOne({
        where: { idItem: itemId, idUbicacion: ubicacion.idUbicacion },
      });

      if (existingUbicacion) {
        // Si el item usa gestión de lotes, NO actualizar inventario (se calcula desde lotes)
        if (usaGestionLotes) {
          existingUbicacion.stockMinimo = ubicacion.stockMinimo;
          existingUbicacion.eliminado = false;
        } else {
          // Gestión manual: actualizar inventario y stockMinimo
          existingUbicacion.inventario = ubicacion.inventario;
          existingUbicacion.stockMinimo = ubicacion.stockMinimo;
          existingUbicacion.eliminado = false;
        }
        existingUbicacion.eliminado = false;
        await existingUbicacion.save();
      } else {
        // Insertar nueva ubicación
        // Si usa lotes, el inventario se calculará desde los lotes (iniciar en 0)
        const inventarioInicial = usaGestionLotes ? 0 : ubicacion.inventario;
        await ItemUbicacion.create({
          idItem: itemId,
          idUbicacion: ubicacion.idUbicacion,
          inventario: inventarioInicial,
          stockMinimo: ubicacion.stockMinimo,
          eliminado: false,
        });
      }
    }

    res.json({ message: 'Ubicaciones actualizadas correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar las ubicaciones', error });
  }
};

// ITEM ATRIBUTO
const getItemAtributo = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemAtributo } = itemModelInit(sequelize);

    const itemAtributo = await ItemAtributo.findAll();  // Cambiado de `find()` a `findAll()` (usualmente se usa `findAll` en Sequelize)
    res.status(200).json(itemAtributo);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items', error });
  }
};

const updateItemAtributo = async (req, res) => {
  let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);

  const { atributos } = req.body; // Recibe un array de objetos con { id, descripcion, eliminado }
  const { ItemAtributo } = itemModelInit(sequelize);

  const t = await ItemAtributo.sequelize.transaction();
  try {
    // Iteramos sobre el array para actualizar cada atributo
    const updatePromises = atributos.map((atributo) => {
      const { id, descripcion, eliminado } = atributo;

      return ItemAtributo.update(
        { descripcion, eliminado }, // Actualizamos ambas columnas
        { where: { id }, transaction: t }
      );
    });

    await Promise.all(updatePromises); // Ejecutamos todas las promesas en paralelo

    await t.commit(); // Confirmamos la transacción
    res.status(200).json({ message: 'Atributos actualizados correctamente.' });
  } catch (error) {
    await t.rollback(); // Revertimos en caso de error
    console.error('Error al actualizar los atributos:', error);
    res.status(500).json({ error: 'Ocurrió un error al actualizar los atributos.' });
  }
};

// Obtener los atributos no eliminados de ItemAtributo
const getItemAtributoNoEliminados = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemAtributo } = itemModelInit(sequelize);

    const atributos = await ItemAtributo.findAll({
      where: { eliminado: false }, // Solo atributos no eliminados
      attributes: ['id', 'descripcion'],
    });

    res.status(200).json(atributos);
  } catch (error) {
    console.error("Error al obtener atributos no eliminados:", error);
    res.status(500).json({ message: "Error al obtener atributos", error });
  }
};


// Proveedores
const getItemProveedor = async (req, res) => {
  const { idItem, idEntidad } = req.params;
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemEntidad } = itemModelInit(sequelize);

    const itemEntidad = await ItemEntidad.findOne({
      where: { eliminado: false, idItem: idItem, idEntidad: idEntidad },
    });

    res.status(200).json(itemEntidad);
  } catch (error) {
    console.error("Error al obtener item proveedores no eliminados:", error);
    res.status(500).json({ message: "Error al obtener atributos", error });
  }
};

const postItemProveedor = async (req, res) => {
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemEntidad } = itemModelInit(sequelize);

    const itemEntidad = new ItemEntidad(req.body);
    await itemEntidad.save();
    res.status(201).json(itemEntidad);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el item entidad', error });
  }
};

const updateItemProveedor = async (req, res) => {
  const { idItem, idEntidad } = req.params;
  const { costo } = req.body;
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemEntidad } = itemModelInit(sequelize);

    const itemEntidad = await ItemEntidad.findOne({
      where: { eliminado: false, idItem: idItem, idEntidad: idEntidad },
    });

    if (!itemEntidad) {
      return res.status(404).json({ message: "Item proveedor no encontrado" });
    }

    itemEntidad.costo = costo; // Actualiza el costo
    await itemEntidad.save();

    res.status(200).json(itemEntidad);
  } catch (error) {
    console.error("Error al actualizar item proveedor:", error);
    res.status(500).json({ message: "Error al actualizar item proveedor", error });
  }
};

const crearReceta = async (req, res) => {
  const { idProductoTerminado, ingredientes, existeReceta } = req.body;

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Bom, Item } = itemModelInit(sequelize);

    const baseItem = await Item.findByPk(idProductoTerminado);
    if (!baseItem) {
      return res.status(404).json({ message: 'Item base no encontrado' });
    }

    // Preparar nueva lista de ingredientes
    const nuevosRegistros = ingredientes.map(ing => ({
      idProductoTerminado,
      idMateriaPrima: ing.idItem,
      cantidad: parseFloat(ing.cantidad.toString().replace(',', '.')),
    }));

    if (existeReceta) {
      // Obtener los ingredientes actuales en la base de datos
      const existentes = await Bom.findAll({
        where: { idProductoTerminado },
      });

      const idsNuevos = nuevosRegistros.map(r => r.idMateriaPrima);

      for (const reg of nuevosRegistros) {
        const existe = existentes.find(e => e.idMateriaPrima === reg.idMateriaPrima);
        if (existe) {
          // Si existe y está eliminado, lo reactivamos y actualizamos cantidad
          await Bom.update(
            { cantidad: reg.cantidad, eliminado: false },
            {
              where: {
                idProductoTerminado,
                idMateriaPrima: reg.idMateriaPrima,
              },
            }
          );
        } else {
          // Si no existe, lo insertamos
          await Bom.create({ ...reg, eliminado: false });
        }
      }

      // Eliminar los que no están más
      for (const actual of existentes) {
        if (!idsNuevos.includes(actual.idMateriaPrima)) {
          await Bom.update(
            { eliminado: true },
            {
              where: {
                idProductoTerminado,
                idMateriaPrima: actual.idMateriaPrima,
              },
            }
          );
        }
      }

      return res.status(200).json({ message: 'Receta actualizada correctamente' });
    } else {
      // Si no existía, simplemente creamos todos los registros nuevos
      await Bom.bulkCreate(nuevosRegistros);
      return res.status(201).json({ message: 'Receta creada correctamente' });
    }
  } catch (error) {
    console.error("Error al crear o actualizar la receta:", error);
    return res.status(500).json({ message: 'Error al crear o actualizar la receta', error });
  }
};

const getBomByIdItem = async (req, res) => {
  const { idItem } = req.params; // Captura el parámetro de ruta 'idItem'
  try {
    // conexion
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Bom, Item } = itemModelInit(sequelize);

    // Buscar los registros de BOM para el idItem dado
    const bomItems = await Bom.findAll({
      where: {
        idProductoTerminado: idItem,
        eliminado: false
      },
      include: [
        {
          model: Item,
          as: "materiaPrima",
          required: true,
          attributes: ['id', 'codigo', 'descripcion', 'itemDatoAtributo1', 'itemDatoAtributo2', 'itemDatoAtributo3', 'itemDatoAtributo4', 'itemDatoAtributo5', 'itemDatoAtributo6', 'itemDatoAtributo7', 'itemDatoAtributo8', 'itemDatoAtributo9', 'itemDatoAtributo10']
        }
      ]
    });

    // Devolver array vacío en lugar de 404 si no hay receta
    res.status(200).json(bomItems);
  }
  catch (error) {
    console.error("Error al obtener BOM por idItem:", error);
    res.status(500).json({ message: 'Error al obtener BOM', error });
  }
}


const getRecetas = async (req, res) => {
  const { startDate, endDate, idReceta, idMateriaPrima } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Bom, Item } = itemModelInit(sequelize);

    const whereBom = { eliminado: false };

    if (startDate && endDate) {
      // Ajustar endDate para incluir todo el día (hasta 23:59:59)
      const adjustedEndDate = new Date(endDate + "T23:59:59");
      whereBom.createdAt = {
        [Op.between]: [new Date(startDate), adjustedEndDate],
      };
    }

    if (idReceta) whereBom.idProductoTerminado = idReceta;
    if (idMateriaPrima) whereBom.idMateriaPrima = idMateriaPrima;

    const { rows, count } = await Bom.findAndCountAll({
      where: whereBom,
      offset,
      limit,
      include: [
        {
          model: Item,
          as: "materiaPrima",
          where: { eliminado: false },
          required: true,
          attributes: [
            "id", "codigo", "descripcion",
            "itemDatoAtributo1", "itemDatoAtributo2",
            "itemDatoAtributo3", "itemDatoAtributo4",
            "itemDatoAtributo5", "itemDatoAtributo6",
            "itemDatoAtributo7", "itemDatoAtributo8",
            "itemDatoAtributo9", "itemDatoAtributo10"
          ]
        },
        {
          model: Item,
          as: "productoTerminado",
          where: { eliminado: false },
          required: true,
          attributes: [
            "id", "codigo", "descripcion",
            "itemDatoAtributo1", "itemDatoAtributo2",
            "itemDatoAtributo3", "itemDatoAtributo4",
            "itemDatoAtributo5", "itemDatoAtributo6",
            "itemDatoAtributo7", "itemDatoAtributo8",
            "itemDatoAtributo9", "itemDatoAtributo10"
          ]
        }
      ]
    });

    // Agrupar por receta
    const recetasMap = {};

    rows.forEach(entry => {
      const id = entry.idProductoTerminado;
      if (!recetasMap[id]) {
        recetasMap[id] = {
          id: id,
          idProductoTerminado: id,
          descripcionProductoTerminado: entry.productoTerminado.descripcion,
          codigoProductoTerminado: entry.productoTerminado.codigo,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          ingredientes: []
        };
      }

      recetasMap[id].ingredientes.push({
        idMateriaPrima: entry.idMateriaPrima,
        cantidad: entry.cantidad,
        eliminado: entry.eliminado,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        materiaPrima: entry.materiaPrima
      });
    });

    const recetas = Object.values(recetasMap);

    res.status(200).json({
      data: recetas,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error("Error al obtener recetas:", error);
    res.status(500).json({ message: "Error al obtener recetas", error });
  }
};


const getItemAndItemUbicacion = async (req, res) => {
  try {
    // 1. CONEXIÓN A LA BASE DE DATOS
    // Establece conexión usando el tenant y usuario desde las cookies
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    
    // 2. INICIALIZACIÓN DE MODELOS CON ASOCIACIONES
    // Es crucial hacer esto en orden para que las asociaciones se definan correctamente
    const itemModels = itemModelInit(sequelize);        // Inicializa modelos de items
    const adminModels = adminModelInit(sequelize);      // Inicializa modelos administrativos  
    const transaccionModels = transaccionModelInit(sequelize); // Inicializa modelos de transacciones Y sus asociaciones
    
    // 3. EXTRACCIÓN DE MODELOS ESPECÍFICOS
    // Obtenemos los modelos que necesitamos desde cada inicializador
    const { ItemUbicacion, Bom } = itemModels;          // ItemUbicacion: tabla intermedia item-ubicación, Bom: recetas
    const { Ubicacion } = adminModels;                  // Ubicacion: tabla de ubicaciones/almacenes
    const { ListaDeMontos } = transaccionModels;        // ListaDeMontos: tabla de precios por proveedor
    const { Op } = require('sequelize');                // Operadores de Sequelize (like, in, etc.)
    
    // 4. OBTENCIÓN DEL MODELO ITEM CON TODAS LAS ASOCIACIONES
    // Usamos sequelize.models.Item porque ya tiene TODAS las asociaciones definidas
    // (incluyendo la asociación con ListaDeMontos que se define en transaccionModelInit)
    const Item = sequelize.models.Item;

    // 5. EXTRACCIÓN Y VALIDACIÓN DE PARÁMETROS DE LA REQUEST
    // Destructuring de query parameters con valores por defecto
    const {
      page = 1, limit = 100,                           // Paginación: página actual y cantidad por página
      ubicacionId, itemId, precio,                     // Filtros específicos
      soloStockBajo, mostrarUltimosCreados, mostrarRecetas, proveedorId, // Filtros booleanos y de proveedor
      searchText, // Nuevo parámetro para búsqueda múltiple por descripción
      soloItemsConPLU,
      filtrosAtributos, // NUEVO: Filtros dinámicos por atributos (viene como JSON string)
      sortField,
      sortDirection,
    } = req.query;
    
    // 6. CONVERSIÓN Y CÁLCULO DE PARÁMETROS DE PAGINACIÓN
    const pageNumber = parseInt(page, 10);             // Convertir página a número entero
    const limitNumber = parseInt(limit, 10);           // Convertir límite a número entero
    const offset = (pageNumber - 1) * limitNumber;     // Calcular offset para SQL (cuántos registros saltar)

    // 7. CONSTRUCCIÓN DE CONDICIONES WHERE PARA ITEMUBICACION
    // Objeto base con condición de no eliminados
    const whereIU = { eliminado: false };              
    // Agregar filtros condicionalmente si vienen en la request
    if (ubicacionId) whereIU.idUbicacion = parseInt(ubicacionId, 10);  // Filtrar por ubicación específica
    if (itemId) whereIU.idItem = parseInt(itemId, 10);                 // Filtrar por item específico
    if (soloStockBajo === "true") {                                     // Filtrar solo items con stock bajo
      // Op.lte = "less than or equal" - inventario <= stockMinimo
      whereIU.inventario = { [Op.lte]: Sequelize.col("stockMinimo") };
    }

    // 8. CONFIGURACIÓN DEL INCLUDE PARA ITEM
    // Define cómo hacer JOIN con la tabla Item y qué campos traer
    const itemWhereCondition = { eliminado: false };   // Condición base: solo items no eliminados
    
    // Nueva funcionalidad: búsqueda múltiple por descripción de item
    // Solo aplica cuando hay searchText pero NO hay itemId específico
    if (searchText && searchText.trim() !== "" && (!itemId || itemId === "null")) {
      const searchTermLower = searchText.trim().toLowerCase();
      itemWhereCondition[Op.or] = [
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('item.descripcion')),
          { [Op.like]: `%${searchTermLower}%` }
        ),
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('item.codigo')),
          { [Op.like]: `%${searchTermLower}%` }
        ),
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('item.codigoScanner')),
          { [Op.like]: `%${searchTermLower}%` }
        )
      ];
    }
    // Filtro: solo items con PLU de balanza configurado
    if (soloItemsConPLU === "true") {
      itemWhereCondition.pluBalanza = { [Op.not]: null };
    }
    
    // 8.5 NUEVO: Aplicar filtros dinámicos de atributos
    // Los filtros vienen como JSON string y necesitan parsearse
    if (filtrosAtributos) {
      try {
        // Parsear JSON si viene como string
        const atributos = typeof filtrosAtributos === 'string' 
          ? JSON.parse(filtrosAtributos) 
          : filtrosAtributos;
        
        console.log('📊 Filtros de atributos recibidos:', atributos);
        
        // Agregar condiciones para cada atributo con valor
        Object.entries(atributos).forEach(([campo, valor]) => {
          if (valor && valor.trim() !== "") {
            // Usar búsqueda LIKE case-insensitive
            // Sequelize.where permite usar funciones SQL como LOWER
            itemWhereCondition[campo] = sequelize.where(
              sequelize.fn('LOWER', sequelize.col(`item.${campo}`)),
              { [Op.like]: `%${valor.trim().toLowerCase()}%` }
            );
            console.log(`✅ Filtro agregado: ${campo} LIKE '%${valor.trim().toLowerCase()}%'`);
          }
        });
      } catch (error) {
        console.error("❌ Error al procesar filtros de atributos:", error);
        // No lanzar error, simplemente continuar sin los filtros
      }
    }

    const itemInclude = {
      model: Item,                                      // Modelo a incluir
      as: "item",                                       // Alias para la relación (definido en las asociaciones)
      required: true,                                   // INNER JOIN (obligatorio que exista el item)
      where: itemWhereCondition,                        // Aplicar condiciones de búsqueda
      attributes: [                                     // Campos específicos que queremos traer del item
        "id", "codigo", "descripcion",                 // Campos básicos
        "itemDatoAtributo1", "itemDatoAtributo2", "itemDatoAtributo3",  // Atributos dinámicos 1-3
        "itemDatoAtributo4", "itemDatoAtributo5", "itemDatoAtributo6",  // Atributos dinámicos 4-6
        "itemDatoAtributo7", "itemDatoAtributo8", "itemDatoAtributo9",  // Atributos dinámicos 7-9
        "itemDatoAtributo10", "codigoScanner", "eliminado",             // Atributo 10, código de scanner y eliminado
        "pluBalanza", "usaGestionLotes"                 // Código PLU de balanza y gestión de lotes
      ],
      include: []                                       // Array para includes anidados (se llena condicionalmente)
    };

    // 9. INCLUDE CONDICIONAL PARA RECETAS/BOM
    // Si se solicita mostrar solo items que tienen recetas
    if (mostrarRecetas === "true") {
      itemInclude.include.push({
        model: Bom,                                     // Modelo de Bill of Materials (recetas)
        as: "materiasPrimas",                           // Alias para la relación
        required: true,                                 // INNER JOIN - solo items QUE TIENEN recetas
        where: { eliminado: false },                    // Solo recetas activas
        attributes: []                                  // No traemos campos de BOM, solo usamos para filtrar
      });
    }

    // 10. CONFIGURACIÓN DEL INCLUDE PARA UBICACIÓN
    // Define cómo hacer JOIN con la tabla Ubicacion
    const ubicInclude = {
      model: Ubicacion,                                 // Modelo Ubicacion
      as: "ubicacion",                                  // Alias para la relación
      required: true,                                   // INNER JOIN obligatorio
      attributes: ["id", "descripcion"]                 // Solo traemos id y descripción de ubicación
    };

    // 11. INCLUDE CONDICIONAL PARA PRECIOS DE PROVEEDOR
    // Si hay filtro de proveedor, agregamos JOIN con ListaDeMontos
    if (proveedorId) {
      itemInclude.include.push({
        model: ListaDeMontos,                           // Modelo de precios
        as: "listaMontos",                              // Alias para la relación Item -> ListaDeMontos
        required: true,                                 // INNER JOIN - solo items CON precios de este proveedor
        where: {
          idEntidad: parseInt(proveedorId, 10),         // Filtrar por proveedor específico
          eliminado: false,                             // Solo precios activos
          // Si también hay filtro de ubicación, incluirlo en el where de precios
          ...(ubicacionId && { idUbicacion: parseInt(ubicacionId, 10) })
        },
        attributes: ["monto", "fecha", "idUbicacion"],  // Campos de precio que necesitamos
        order: [["fecha", "DESC"]]                      // Ordenar por fecha descendente (más reciente primero)
      });
    }

    // 12. ARRAY FINAL DE INCLUDES
    // Combina todos los includes que se van a usar en la consulta
    const includes = [itemInclude, ubicInclude];

    // 12.5 ORDENAMIENTO SERVER-SIDE
    // Se aplica antes de la paginación para ordenar sobre todo el conjunto filtrado.
    const normalizedSortDirection =
      String(sortDirection || "").toLowerCase() === "desc" ? "DESC" : "ASC";

    const sortableFieldMap = {
      codigo: () => [Sequelize.col("item.codigo"), normalizedSortDirection],
      codigoScanner: () => [Sequelize.col("item.codigoScanner"), normalizedSortDirection],
      descripcion: () => [Sequelize.col("item.descripcion"), normalizedSortDirection],
      itemDatoAtributo1: () => [Sequelize.col("item.itemDatoAtributo1"), normalizedSortDirection],
      itemDatoAtributo2: () => [Sequelize.col("item.itemDatoAtributo2"), normalizedSortDirection],
      itemDatoAtributo3: () => [Sequelize.col("item.itemDatoAtributo3"), normalizedSortDirection],
      itemDatoAtributo4: () => [Sequelize.col("item.itemDatoAtributo4"), normalizedSortDirection],
      itemDatoAtributo5: () => [Sequelize.col("item.itemDatoAtributo5"), normalizedSortDirection],
      itemDatoAtributo6: () => [Sequelize.col("item.itemDatoAtributo6"), normalizedSortDirection],
      itemDatoAtributo7: () => [Sequelize.col("item.itemDatoAtributo7"), normalizedSortDirection],
      itemDatoAtributo8: () => [Sequelize.col("item.itemDatoAtributo8"), normalizedSortDirection],
      itemDatoAtributo9: () => [Sequelize.col("item.itemDatoAtributo9"), normalizedSortDirection],
      itemDatoAtributo10: () => [Sequelize.col("item.itemDatoAtributo10"), normalizedSortDirection],
      ubicacion: () => [Sequelize.col("ubicacion.descripcion"), normalizedSortDirection],
      inventario: () => ["inventario", normalizedSortDirection],
      stockMinimo: () => ["stockMinimo", normalizedSortDirection],
      updatedAt: () => ["updatedAt", normalizedSortDirection],
    };

    const defaultOrder =
      mostrarUltimosCreados === "true"
        ? [["createdAt", "DESC"], ["idItem", "ASC"], ["idUbicacion", "ASC"]]
        : [["idItem", "ASC"], ["idUbicacion", "ASC"]];

    const order = sortableFieldMap[sortField]
      ? [
          sortableFieldMap[sortField](),
          ["idItem", "ASC"],
          ["idUbicacion", "ASC"],
        ]
      : defaultOrder;

    // 13. CONSULTA PRINCIPAL PAGINADA
    // Obtiene los registros paginados con todos los joins
    const itemUbicaciones = await ItemUbicacion.findAll({
      where: whereIU,                                   // Mismas condiciones WHERE
      include: includes,                                // Mismos includes
      subQuery: false,                                  // Sin subconsultas
      order,                                            // Ordenamiento global antes de paginar
      limit: limitNumber,                               // Límite de registros por página
      offset,                                           // Cuántos registros saltar
      distinct: true                                    // Evitar duplicados
    });

    // 14. CONTEO TOTAL DE REGISTROS SIN PAGINACIÓN
    // Cuenta cuántos registros hay en total (para paginación)
    // Nota: Hacemos una consulta sin limit/offset para obtener el conteo exacto de registros que coincide con lo que se muestra
    const allItemUbicaciones = await ItemUbicacion.findAll({
      where: whereIU,                                   // Mismas condiciones WHERE
      include: includes,                                // Mismos includes
      subQuery: false,                                  // Sin subconsultas
      distinct: true,                                   // Evitar duplicados
      attributes: ['idItem', 'idUbicacion']             // Solo traemos las PKs para optimizar (ItemUbicacion tiene PK compuesta)
    });
    const totalCount = allItemUbicaciones.length;       // Contar los registros obtenidos

    // 15. OBTENCIÓN DE PRECIOS CUANDO NO HAY FILTRO DE PROVEEDOR
    // Si no se filtró por proveedor pero queremos mostrar precios disponibles
    let preciosProveedor = {};                          // Objeto para almacenar precios por item-ubicación
    if (!proveedorId && itemUbicaciones.length > 0) {  // Solo si no hay filtro de proveedor Y hay resultados
      // 16. EXTRACCIÓN DE IDS PARA CONSULTA DE PRECIOS
      const itemIds = itemUbicaciones.map(iu => iu.item.id);        // Array de IDs de items encontrados
      const ubicacionIds = itemUbicaciones.map(iu => iu.idUbicacion); // Array de IDs de ubicaciones

      // 17. CONSULTA DE PRECIOS POR SEPARADO
      const precios = await ListaDeMontos.findAll({
        where: {
          idItem: { [Op.in]: itemIds },                 // Solo precios de los items encontrados
          idUbicacion: { [Op.in]: ubicacionIds },       // Solo precios de las ubicaciones encontradas
          eliminado: false                              // Solo precios activos
        },
        order: [["fecha", "DESC"]],                     // Más recientes primero
        attributes: ["idItem", "idUbicacion", "idEntidad", "monto", "fecha"] // Campos necesarios
      });

      // 18. AGRUPACIÓN DE PRECIOS POR ITEM-UBICACIÓN
      // Procesa los precios para quedarse solo con el más reciente de cada item-ubicación
      precios.forEach(precio => {
        const key = `${precio.idItem}-${precio.idUbicacion}`;  // Clave única item-ubicación
        if (!preciosProveedor[key]) {                   // Si no existe precio para esta combinación
          preciosProveedor[key] = {                     // Guardar el precio (el primero es el más reciente por el ORDER BY)
            monto: precio.monto,
            idEntidad: precio.idEntidad,                // ID del proveedor
            fecha: precio.fecha
          };
        }
      });
    }

    // 19. FORMATEO DE RESPUESTA
    // Transforma los datos de Sequelize al formato que espera el frontend
    const data = itemUbicaciones.map(iu => {
      // 20. PREPARACIÓN DE VARIABLES PARA CADA REGISTRO
      const precioKey = `${iu.item.id}-${iu.idUbicacion}`;     // Clave para buscar precio
      let precioProveedor = null;                              // Variable para el precio final

      // 21. OBTENCIÓN DEL PRECIO SEGÚN EL CONTEXTO
      // Si hay filtro de proveedor, usar precios del JOIN
      if (proveedorId && iu.item.listaMontos && iu.item.listaMontos.length > 0) {
        // Buscar el precio específico para esta ubicación dentro de los precios del item
        const precioUbicacion = iu.item.listaMontos.find(precio => precio.idUbicacion === iu.idUbicacion);
        if (precioUbicacion) {
          precioProveedor = precioUbicacion.monto;      // Usar el monto encontrado
        }
      } 
      // Si no hay filtro de proveedor, usar los precios obtenidos por separado
      else if (!proveedorId && preciosProveedor[precioKey]) {
        precioProveedor = preciosProveedor[precioKey].monto;
      }

      // 22. CONSTRUCCIÓN DEL OBJETO DE RESPUESTA
      return {
        // IDs y identificadores
        id: `${iu.item.id}-${iu.ubicacion.id}`,         // ID compuesto único para el frontend
        idItem: iu.item.id,                             // ID del item
        idUbicacion: iu.ubicacion.id,                   // ID de la ubicación
        
        // Información básica del item
        codigo: iu.item.codigo,                         // Código del item
        descripcion: iu.item.descripcion,               // Descripción del item
        codigoScanner: iu.item.codigoScanner,           // Código de barras/scanner
        pluBalanza: iu.item.pluBalanza,                 // Código de balanza (si aplica)
        usaGestionLotes: iu.item.usaGestionLotes,       // Usa gestión de lotes (FIFO)
        
        // Información de la ubicación
        ubicacion: iu.ubicacion.descripcion,            // Nombre de la ubicación
        
        // Información de inventario
        inventario: iu.inventario,                      // Cantidad en stock
        stockMinimo: iu.stockMinimo,                    // Stock mínimo configurado
        lowStock: iu.inventario <= iu.stockMinimo,      // Boolean: ¿está en stock bajo?
        
        // Información de precio
        precioProveedor: precioProveedor,               // Precio del proveedor (si existe)
        
        // Metadatos
        eliminado: iu.eliminado,                        // Estado de eliminación
        updatedAt: iu.updatedAt || null,                // Fecha de última actualización (Date object/ISO string - formateo en frontend)
        
        // Atributos dinámicos del item agrupados
        activeAttributes: {
          itemDatoAtributo1: iu.item.itemDatoAtributo1,   // Atributo dinámico 1
          itemDatoAtributo2: iu.item.itemDatoAtributo2,   // Atributo dinámico 2
          itemDatoAtributo3: iu.item.itemDatoAtributo3,   // Atributo dinámico 3
          itemDatoAtributo4: iu.item.itemDatoAtributo4,   // Atributo dinámico 4
          itemDatoAtributo5: iu.item.itemDatoAtributo5,   // Atributo dinámico 5
          itemDatoAtributo6: iu.item.itemDatoAtributo6,   // Atributo dinámico 6
          itemDatoAtributo7: iu.item.itemDatoAtributo7,   // Atributo dinámico 7
          itemDatoAtributo8: iu.item.itemDatoAtributo8,   // Atributo dinámico 8
          itemDatoAtributo9: iu.item.itemDatoAtributo9,   // Atributo dinámico 9
          itemDatoAtributo10: iu.item.itemDatoAtributo10, // Atributo dinámico 10
        }
      };
    });

    // 23. RESPUESTA FINAL AL CLIENTE
    res.status(200).json({
      total: totalCount,                                // Total de registros (para paginación)
      totalPages: Math.ceil(totalCount / limitNumber),  // Total de páginas
      currentPage: pageNumber,                          // Página actual
      data                                              // Array de datos formateados
    });

  } catch (error) {
    // 24. MANEJO DE ERRORES
    console.error("Error al obtener items:", error);   // Log del error en servidor
    res.status(500).json({ message: "Error al obtener items", error }); // Respuesta de error al cliente
  }
};

// Obtener el impuesto de un item específico
const getImpuestoItem = async (req, res) => {
  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);
    const { Impuesto, ImpuestoItem } = transaccionModelInit(sequelize);

    const { idItem } = req.params;

    // Buscar el impuesto asociado al item
    const impuestoItem = await ImpuestoItem.findOne({
      where: {
        idItem: parseInt(idItem),
        eliminado: false
      }
    });

    if (!impuestoItem) {
      return res.status(200).json({
        idItem: parseInt(idItem),
        idImpuesto: null,
        porcentaje: 21, // Valor por defecto
        descripcionImpuesto: "IVA General"
      });
    }

    // Buscar la información del impuesto
    const impuesto = await Impuesto.findOne({
      where: {
        id: impuestoItem.idImpuesto,
        eliminado: false
      }
    });

    res.status(200).json({
      idItem: impuestoItem.idItem,
      idImpuesto: impuestoItem.idImpuesto,
      porcentaje: impuestoItem.porcentaje,
      descripcionImpuesto: impuesto ? impuesto.descripcion : "IVA General"
    });

  } catch (error) {
    console.error("Error al obtener impuesto del item:", error);
    res.status(500).json({ message: 'Error al obtener impuesto del item', error: error.message });
  }
};

// Actualizar el impuesto de un item
const updateImpuestoItem = async (req, res) => {
  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ImpuestoItem } = transaccionModelInit(sequelize);

    const { idItem } = req.params;
    const { idImpuesto, porcentaje } = req.body;

    // Verificar si ya existe un registro para este item
    const existingImpuestoItem = await ImpuestoItem.findOne({
      where: {
        idItem: parseInt(idItem),
        eliminado: false
      }
    });

    if (existingImpuestoItem) {
      // Actualizar el registro existente
      await existingImpuestoItem.update({
        idImpuesto: parseInt(idImpuesto),
        porcentaje: parseFloat(porcentaje)
      });
    } else {
      // Crear un nuevo registro
      await ImpuestoItem.create({
        idItem: parseInt(idItem),
        idImpuesto: parseInt(idImpuesto),
        porcentaje: parseFloat(porcentaje),
        eliminado: false
      });
    }

    res.status(200).json({ 
      message: 'Impuesto del item actualizado exitosamente',
      idItem: parseInt(idItem),
      idImpuesto: parseInt(idImpuesto),
      porcentaje: parseFloat(porcentaje)
    });

  } catch (error) {
    console.error("Error al actualizar impuesto del item:", error);
    res.status(500).json({ message: 'Error al actualizar impuesto del item', error: error.message });
  }
};

// Obtener todos los impuestos disponibles
const getImpuestosDisponibles = async (req, res) => {
  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Impuesto } = transaccionModelInit(sequelize);

    const impuestos = await Impuesto.findAll({
      where: {
        eliminado: false
      },
      attributes: ['id', 'descripcion', 'porcentaje'],
      order: [['descripcion', 'ASC']]
    });

    res.status(200).json(impuestos);

  } catch (error) {
    console.error("Error al obtener impuestos disponibles:", error);
    res.status(500).json({ message: 'Error al obtener impuestos disponibles', error: error.message });
  }
};

/**
 * EXPORTAR PLUs DE BALANZA EN FORMATO CSV
 * 
 * FORMATO DEL ARCHIVO CSV (separado por punto y coma):
 * - NUMERO DE PLU: 6 dígitos (pluBalanza)
 * - CODIGO DE PLU: 13 dígitos (pluBalanza)
 * - NOMBRE DE PLU: 26 caracteres (descripcion)
 * - CODIGO DE DEPARTAMENTO: 3 dígitos (default: 001)
 * - PRECIO: 6 dígitos (4 enteros + 2 decimales, sin separador)
 * - TIPO DE PLU: 1 carácter (default: P para pesable)
 * - CODIGO DE ETIQUETA: 2 dígitos (default: 01)
 * 
 * @param {Object} req - Request con query parameters: ubicacion, tenant
 * @param {Object} res - Response object
 */
const exportarPLUsBalanza = async (req, res) => {
  try {
    console.log('🚀 Iniciando exportación de PLUs de balanza...');
    console.log('📋 Query params:', req.query);
    console.log('🍪 Cookies:', req.cookies);
    
    const { ubicacion } = req.query;
    
    if (!ubicacion) {
      console.log('❌ Ubicación no proporcionada');
      return res.status(400).json({ 
        message: 'El parámetro ubicacion es requerido para exportar PLUs de balanza' 
      });
    }
    
    console.log('📍 Ubicación recibida:', ubicacion);

    // Conexión a la base de datos
    console.log('🔌 Conectando a la base de datos...');
    console.log('🏢 Tenant:', req.cookies.tenant);
    console.log('👤 Usuario:', req.cookies.usuario);
    
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    console.log('✅ Conexión a BD establecida');
    
    // Inicializar todos los modelos y sus asociaciones
    const { Item } = itemModelInit(sequelize);
    const { Entidad } = adminModelInit(sequelize);
    const { ListaDeMontos } = transaccionModelInit(sequelize);
    
    // Las asociaciones ya se configuran automáticamente en transaccionModelInit
    console.log('📦 Modelos y asociaciones cargados');

    // Verificar parámetros globales
    console.log('🔍 Verificando parámetros globales...');
    const { ParametrosGlobales } = adminModelInit(sequelize);
    
    const [pluBalanzaParam, fabricanteBalanzaParam] = await Promise.all([
      ParametrosGlobales.findOne({
        where: { 
          nombreParametro: 'pluBalanza',
          eliminado: false
        }
      }),
      ParametrosGlobales.findOne({
        where: { 
          nombreParametro: 'fabricanteBalanza',
          eliminado: false
        }
      })
    ]);
    
    console.log('📊 Parámetro pluBalanza:', pluBalanzaParam?.valorParametro);
    console.log('🏭 Parámetro fabricanteBalanza:', fabricanteBalanzaParam?.valorParametro);

    // Validar que los parámetros estén configurados
    if (!pluBalanzaParam || pluBalanzaParam.valorParametro !== '1') {
      return res.status(400).json({ 
        message: 'La funcionalidad de PLUs de balanza no está habilitada para este tenant' 
      });
    }

    if (!fabricanteBalanzaParam || !fabricanteBalanzaParam.valorParametro) {
      return res.status(400).json({ 
        message: 'El fabricante de balanza no está configurado para este tenant' 
      });
    }

    // Obtener cliente genérico (entidad id = 1)
    const clienteGenerico = await Entidad.findOne({
      where: { id: 1, eliminado: false }
    });

    if (!clienteGenerico) {
      return res.status(400).json({ 
        message: 'No se encontró el cliente genérico (entidad id = 1)' 
      });
    }

    // Buscar items con pluBalanza configurado
    const items = await Item.findAll({
      where: {
        pluBalanza: { [Op.not]: null },
        eliminado: false
      }
    });
    
    console.log(`📦 Items con PLU de balanza encontrados: ${items.length}`);
    
    // Para cada item, buscar el precio más reciente
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Buscar el precio más reciente para este item en la ubicación especificada
      const precio = await ListaDeMontos.findOne({
        where: {
          idItem: item.id,
          idUbicacion: parseInt(ubicacion),
          idEntidad: 1, // Cliente genérico
          eliminado: false
        },
        order: [['fecha', 'DESC']] // Más reciente primero
      });
      
      // Agregar el precio al item (simular la asociación)
      item.dataValues.listaMontos = precio ? [precio] : [];
    }

    if (items.length === 0) {
      return res.status(404).json({ 
        message: 'No se encontraron items con PLU de balanza configurado en la ubicación especificada' 
      });
    }

    // Generar CSV según el fabricante
    let csvContent = '';
    
    if (fabricanteBalanzaParam.valorParametro.toLowerCase() === 'kretz') {
      // Formato específico para Kretz
      csvContent = 'NUMERO DE PLU;CODIGO DE PLU;NOMBRE DE PLU;CODIGO DE DEPARTAMENTO;PRECIO;TIPO DE PLU;CODIGO DE ETIQUETA\n';
      
      items.forEach(item => {
        // Normalizar PLU (eliminar ceros a la izquierda)
        const pluNormalizado = String(item.pluBalanza).replace(/^0+/, '') || '0';
        
        // NUMERO DE PLU: máximo 6 dígitos (sin relleno)
        const numeroPLU = pluNormalizado;
        
        // CODIGO DE PLU: máximo 13 dígitos (sin relleno)
        const codigoPLU = pluNormalizado;
        
        // NOMBRE DE PLU: máximo 26 caracteres (sin relleno)
        const nombrePLU = (item.descripcion || '').substring(0, 26);
        
        // CODIGO DE DEPARTAMENTO: máximo 3 dígitos (default 1)
        const codigoDepartamento = '1';
        
        // Obtener precio más reciente
        let precio = 0;
        if (item.dataValues.listaMontos && item.dataValues.listaMontos.length > 0) {
          precio = item.dataValues.listaMontos[0].monto || 0;
        }
        
        // PRECIO: formato natural con coma como separador decimal (sin relleno de ceros)
        const precioFormateado = precio.toFixed(2).replace('.', ',');
        
        // TIPO DE PLU: 1 carácter (P = pesable)
        const tipoPLU = 'P';
        
        // CODIGO DE ETIQUETA: máximo 2 dígitos (default 1)
        const codigoEtiqueta = '1';
        
        // Construir línea CSV
        const linea = `${numeroPLU};${codigoPLU};${nombrePLU};${codigoDepartamento};${precioFormateado};${tipoPLU};${codigoEtiqueta}`;
        csvContent += linea + '\n';
      });
    } else {
      // Formato genérico para otros fabricantes
      csvContent = 'PLU;DESCRIPCION;PRECIO;UBICACION\n';
      
      items.forEach(item => {
        let precio = 0;
        if (item.dataValues.listaMontos && item.dataValues.listaMontos.length > 0) {
          precio = item.dataValues.listaMontos[0].monto || 0;
        }
        
        const linea = `${item.pluBalanza};${item.descripcion || ''};${precio};${ubicacion}`;
        csvContent += linea + '\n';
      });
    }

    // Configurar headers para descarga
    const nombreArchivo = `plus_balanza_ubicacion_${ubicacion}_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    res.status(200).send(csvContent);
    
  } catch (error) {
    console.error("Error al exportar PLUs de balanza:", error);
    res.status(500).json({ 
      message: 'Error al exportar PLUs de balanza', 
      error: error.message 
    });
  }
};


// ================================================================================
// NUEVAS FUNCIONES PARA ELIMINACIÓN MASIVA
// ================================================================================

/**
 * Actualizar el estado eliminado de un itemUbicacion específico
 * PUT /itemAPI/itemUbicacion/:id/eliminado
 * Body: { eliminado: true/false }
 */
const updateItemUbicacionEliminado = async (req, res) => {
  const { id } = req.params;
  const { eliminado } = req.body;

  console.log(`📍 updateItemUbicacionEliminado: id=${id}, eliminado=${eliminado}`);

  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);

    // Validar parámetros
    if (!id || eliminado === undefined) {
      return res.status(400).json({
        message: "Los parámetros id y eliminado son requeridos",
      });
    }

    // Buscar el registro de ItemUbicacion por id
    const itemUbicacion = await ItemUbicacion.findByPk(id);

    // Verificar si existe
    if (!itemUbicacion) {
      return res.status(404).json({
        message: "ItemUbicacion no encontrado",
      });
    }

    // Actualizar el estado eliminado
    await itemUbicacion.update({ eliminado });

    console.log(`✅ ItemUbicacion actualizado: ${id}`);

    res.status(200).json({
      message: "ItemUbicacion actualizado correctamente",
      itemUbicacion,
    });
  } catch (error) {
    console.error("❌ Error al actualizar ItemUbicacion:", error);
    res.status(500).json({
      message: "Error al actualizar el ItemUbicacion",
      error: error.message,
    });
  }
};

/**
 * Obtener todas las itemUbicaciones de un item específico
 * GET /itemAPI/itemUbicaciones/byItem/:itemId
 */
const getItemUbicacionesByItemId = async (req, res) => {
  const { itemId } = req.params;

  console.log(`📍 getItemUbicacionesByItemId: itemId=${itemId}`);

  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { ItemUbicacion } = itemModelInit(sequelize);
    const { Ubicacion } = adminModelInit(sequelize);

    // Buscar todas las itemUbicaciones del item (incluyendo eliminadas)
    const itemUbicaciones = await ItemUbicacion.findAll({
      where: { idItem: itemId },
      include: [
        {
          model: Ubicacion,
          as: 'ubicacion',
          attributes: ['id', 'descripcion'],
        },
      ],
    });

    console.log(`✅ Encontradas ${itemUbicaciones.length} ubicaciones para item ${itemId}`);

    res.status(200).json(itemUbicaciones);
  } catch (error) {
    console.error("❌ Error al obtener itemUbicaciones:", error);
    res.status(500).json({
      message: "Error al obtener itemUbicaciones",
      error: error.message,
    });
  }
};

/**
 * Eliminar múltiples items y sus ubicaciones (soft delete)
 * POST /itemAPI/items/bulk-delete
 * Body: { 
 *   itemIds: [1, 2, 3],
 *   ubicacionId: 5 (opcional - si existe solo elimina itemUbicacion específico)
 * }
 */
const bulkDeleteItems = async (req, res) => {
  const { itemIds, ubicacionId } = req.body;

  console.log(`📍 bulkDeleteItems: itemIds=${itemIds?.length}, ubicacionId=${ubicacionId}`);

  try {
    // Conexión
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item, ItemUbicacion } = itemModelInit(sequelize);

    // Validar parámetros
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        message: "Se requiere un array de itemIds no vacío",
      });
    }

    let eliminados = 0;

    if (ubicacionId) {
      // CASO 1: Eliminar solo itemUbicaciones específicas de una ubicación
      console.log(`🔄 Eliminando itemUbicaciones para ubicación ${ubicacionId}...`);
      
      for (const itemId of itemIds) {
        const result = await ItemUbicacion.update(
          { eliminado: true },
          {
            where: {
              idItem: itemId,
              idUbicacion: ubicacionId,
            },
          }
        );
        eliminados += result[0]; // result[0] contiene el número de filas actualizadas
      }

      console.log(`✅ ${eliminados} itemUbicaciones eliminadas`);

      res.status(200).json({
        message: `Se eliminaron ${eliminados} ubicaciones de items`,
        tipo: "itemUbicacion",
        eliminados,
      });
    } else {
      // CASO 2: Eliminar items completos y todas sus ubicaciones
      console.log(`🔄 Eliminando items completos...`);

      // Iniciar transacción para garantizar consistencia
      const transaction = await sequelize.transaction();

      try {
        // Primero eliminar todas las itemUbicaciones de estos items
        const ubicacionesEliminadas = await ItemUbicacion.update(
          { eliminado: true },
          {
            where: { idItem: itemIds },
            transaction,
          }
        );

        // Luego eliminar los items
        const itemsEliminados = await Item.update(
          { eliminado: true },
          {
            where: { id: itemIds },
            transaction,
          }
        );

        // Commit de la transacción
        await transaction.commit();

        eliminados = itemsEliminados[0]; // Número de items eliminados

        console.log(`✅ ${eliminados} items eliminados con ${ubicacionesEliminadas[0]} ubicaciones`);

        res.status(200).json({
          message: `Se eliminaron ${eliminados} items y sus ubicaciones`,
          tipo: "itemCompleto",
          itemsEliminados: eliminados,
          ubicacionesEliminadas: ubicacionesEliminadas[0],
        });
      } catch (error) {
        // Rollback en caso de error
        await transaction.rollback();
        throw error;
      }
    }
  } catch (error) {
    console.error("❌ Error al eliminar items en lote:", error);
    res.status(500).json({
      message: "Error al eliminar items",
      error: error.message,
    });
  }
};

// ================================================================================
// GESTIÓN DE LOTES - CONTROLLERS
// ================================================================================

/**
 * Crear un nuevo lote
 * POST /itemAPI/lotes
 * Body: { numeroLote, fechaFabricacion, fechaVencimiento, observaciones }
 */
const postLote = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote } = itemModelInit(sequelize);

    const { idItem, numeroLote, fechaFabricacion, fechaVencimiento, observaciones } = req.body;

    // Validar que idItem y numeroLote estén presentes
    if (!idItem || !numeroLote) {
      return res.status(400).json({ message: 'El idItem y número de lote son requeridos' });
    }

    // Verificar que no exista un lote con el mismo número para este item
    const loteExistente = await Lote.findOne({
      where: { 
        idItem: parseInt(idItem),
        numeroLote, 
        eliminado: false 
      }
    });

    if (loteExistente) {
      return res.status(400).json({ message: 'Ya existe un lote con este número para este item' });
    }

    const nuevoLote = await Lote.create({
      idItem: parseInt(idItem),
      numeroLote,
      fechaFabricacion,
      fechaVencimiento,
      observaciones,
      eliminado: false
    });

    console.log(`✅ Lote creado: ${numeroLote} para item ${idItem} (ID: ${nuevoLote.id})`);

    res.status(201).json({ 
      message: 'Lote creado exitosamente', 
      lote: nuevoLote 
    });
  } catch (error) {
    console.error("❌ Error al crear lote:", error);
    res.status(500).json({ message: 'Error al crear lote', error: error.message });
  }
};

/**
 * Obtener todos los lotes
 * GET /itemAPI/lotes
 */
const getLotes = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote } = itemModelInit(sequelize);

    const lotes = await Lote.findAll({
      where: { eliminado: false },
      order: [
        ['fechaFabricacion', 'ASC'],
        ['fechaVencimiento', 'ASC']
      ]
    });

    res.status(200).json(lotes);
  } catch (error) {
    console.error("❌ Error al obtener lotes:", error);
    res.status(500).json({ message: 'Error al obtener lotes', error: error.message });
  }
};

/**
 * Obtener un lote por ID
 * GET /itemAPI/lotes/:id
 */
const getLoteById = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote } = itemModelInit(sequelize);

    const { id } = req.params;

    const lote = await Lote.findOne({
      where: { id, eliminado: false }
    });

    if (!lote) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    res.status(200).json(lote);
  } catch (error) {
    console.error("❌ Error al obtener lote:", error);
    res.status(500).json({ message: 'Error al obtener lote', error: error.message });
  }
};

/**
 * Obtener lotes de un item específico
 * GET /itemAPI/lotes/item/:idItem
 */
const getLotesByItem = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote } = itemModelInit(sequelize);

    const { idItem } = req.params;

    // Obtener todos los lotes de este item específico
    const lotes = await Lote.findAll({
      where: { 
        idItem: parseInt(idItem),
        eliminado: false 
      },
      order: [
        ['fechaFabricacion', 'ASC'],
        ['fechaVencimiento', 'ASC']
      ]
    });

    res.status(200).json(lotes);
  } catch (error) {
    console.error("❌ Error al obtener lotes por item:", error);
    res.status(500).json({ message: 'Error al obtener lotes', error: error.message });
  }
};

/**
 * Actualizar un lote
 * PUT /itemAPI/lotes/:id
 * Body: { numeroLote, fechaFabricacion, fechaVencimiento, observaciones }
 */
const updateLote = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote } = itemModelInit(sequelize);

    const { id } = req.params;
    const { numeroLote, fechaFabricacion, fechaVencimiento, observaciones } = req.body;

    const lote = await Lote.findOne({
      where: { id, eliminado: false }
    });

    if (!lote) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    // Verificar que el nuevo número de lote no exista para este item (si se está cambiando)
    if (numeroLote && numeroLote !== lote.numeroLote) {
      const loteExistente = await Lote.findOne({
        where: { 
          idItem: lote.idItem,
          numeroLote, 
          eliminado: false,
          id: { [Op.ne]: id }
        }
      });

      if (loteExistente) {
        return res.status(400).json({ message: 'Ya existe un lote con este número para este item' });
      }
    }

    await lote.update({
      numeroLote: numeroLote || lote.numeroLote,
      fechaFabricacion: fechaFabricacion !== undefined ? fechaFabricacion : lote.fechaFabricacion,
      fechaVencimiento: fechaVencimiento !== undefined ? fechaVencimiento : lote.fechaVencimiento,
      observaciones: observaciones !== undefined ? observaciones : lote.observaciones
    });

    console.log(`✅ Lote actualizado: ${lote.numeroLote} (ID: ${id})`);

    res.status(200).json({ 
      message: 'Lote actualizado exitosamente', 
      lote 
    });
  } catch (error) {
    console.error("❌ Error al actualizar lote:", error);
    res.status(500).json({ message: 'Error al actualizar lote', error: error.message });
  }
};

/**
 * Eliminar un lote (soft delete)
 * DELETE /itemAPI/lotes/:id
 */
const deleteLote = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion } = itemModelInit(sequelize);

    const { id } = req.params;

    const lote = await Lote.findOne({
      where: { id, eliminado: false }
    });

    if (!lote) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    // Eliminar el lote y todas sus relaciones
    const transaction = await sequelize.transaction();

    try {
      // Eliminar relaciones loteItemUbicacion
      await LoteItemUbicacion.update(
        { eliminado: true },
        {
          where: { idLote: id },
          transaction
        }
      );

      // Eliminar el lote
      await lote.update({ eliminado: true }, { transaction });

      await transaction.commit();

      // 🔄 Recalcular el stock total después de eliminar el lote
      try {
        await recalcularStockDesdeTablaLotes(lote.idItem, sequelize);
      } catch (errorRecalculo) {
        console.error(`⚠️  Error al recalcular stock después de eliminar lote:`, errorRecalculo);
      }

      res.status(200).json({ message: 'Lote eliminado exitosamente' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error al eliminar lote:", error);
    res.status(500).json({ message: 'Error al eliminar lote', error: error.message });
  }
};

/**
 * Obtener stock de un lote por ubicaciones
 * GET /itemAPI/lotes/:idLote/item/:idItem/stock
 */
const getLoteItemUbicacionStock = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { LoteItemUbicacion } = itemModelInit(sequelize);
    const { Ubicacion } = adminModelInit(sequelize);

    const { idLote } = req.params;

    const stockPorUbicacion = await LoteItemUbicacion.findAll({
      where: {
        idLote: parseInt(idLote),
        eliminado: false
      },
      include: [
        {
          model: Ubicacion,
          as: 'ubicacion',
          attributes: ['id', 'descripcion']
        }
      ]
    });

    res.status(200).json(stockPorUbicacion);
  } catch (error) {
    console.error("❌ Error al obtener stock de lote:", error);
    res.status(500).json({ message: 'Error al obtener stock', error: error.message });
  }
};

/**
 * Actualizar stock de lote en una ubicación
 * PUT /itemAPI/lotes/stock
 * Body: { idLote, idItem, idUbicacion, stock }
 */
const updateLoteItemUbicacionStock = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { LoteItemUbicacion, Lote, ItemUbicacion } = itemModelInit(sequelize);

    const { idLote, idUbicacion, stock } = req.body;

    // Validar parámetros
    if (!idLote || !idUbicacion || stock === undefined) {
      return res.status(400).json({
        message: 'Los parámetros idLote, idUbicacion y stock son requeridos'
      });
    }

    // Verificar que el lote existe
    const lote = await Lote.findByPk(parseInt(idLote));
    if (!lote) {
      return res.status(404).json({ message: 'Lote no encontrado' });
    }

    // 🆕 Verificar/crear ItemUbicacion si no existe o está eliminada
    let itemUbicacion = await ItemUbicacion.findOne({
      where: {
        idItem: lote.idItem,
        idUbicacion: parseInt(idUbicacion)
      }
    });

    if (!itemUbicacion) {
      // Crear registro en ItemUbicacion si no existe
      itemUbicacion = await ItemUbicacion.create({
        idItem: lote.idItem,
        idUbicacion: parseInt(idUbicacion),
        inventario: 0, // El recalculo posterior lo actualizará
        stockMinimo: 0,
        eliminado: false
      });
    } else if (itemUbicacion.eliminado) {
      // Reactivar si estaba eliminada
      await itemUbicacion.update({ eliminado: false });
    }

    // Buscar o crear el registro en LoteItemUbicacion
    let loteItemUbicacion = await LoteItemUbicacion.findOne({
      where: {
        idLote: parseInt(idLote),
        idUbicacion: parseInt(idUbicacion)
      }
    });

    if (loteItemUbicacion) {
      // Actualizar si existe
      await loteItemUbicacion.update({
        stock: parseFloat(stock),
        eliminado: false
      });
    } else {
      // Crear si no existe
      loteItemUbicacion = await LoteItemUbicacion.create({
        idLote: parseInt(idLote),
        idUbicacion: parseInt(idUbicacion),
        stock: parseFloat(stock),
        eliminado: false
      });
    }

    // 🔄 Recalcular el stock total en ItemUbicacion para este item
    try {
      await recalcularStockDesdeTablaLotes(lote.idItem, sequelize);
    } catch (errorRecalculo) {
      console.error(`⚠️  Error al recalcular stock total:`, errorRecalculo);
      // No fallar la operación principal
    }

    res.status(200).json({
      message: 'Stock actualizado exitosamente',
      loteItemUbicacion
    });
  } catch (error) {
    console.error("❌ Error al actualizar stock de lote:", error);
    res.status(500).json({ message: 'Error al actualizar stock', error: error.message });
  }
};

/**
 * Obtener lote más antiguo con stock (FIFO)
 * GET /itemAPI/lotes/fifo/:idItem/:idUbicacion
 */
const getLoteMasAntiguoConStock = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion } = itemModelInit(sequelize);

    const { idItem, idUbicacion } = req.params;

    // Buscar el lote más antiguo con stock disponible para este item
    const lote = await Lote.findOne({
      where: { 
        idItem: parseInt(idItem),
        eliminado: false 
      },
      include: [
        {
          model: LoteItemUbicacion,
          as: 'ubicaciones',
          where: {
            idUbicacion: parseInt(idUbicacion),
            stock: { [Op.gt]: 0 },
            eliminado: false
          },
          required: true
        }
      ],
      order: [
        ['fechaFabricacion', 'ASC'],
        ['fechaVencimiento', 'ASC']
      ]
    });

    if (!lote) {
      return res.status(404).json({ 
        message: 'No hay lotes con stock disponible para este item en esta ubicación' 
      });
    }

    res.status(200).json({
      lote,
      stock: lote.ubicaciones[0].stock
    });
  } catch (error) {
    console.error("❌ Error al obtener lote FIFO:", error);
    res.status(500).json({ message: 'Error al obtener lote', error: error.message });
  }
};

/**
 * Descontar stock de venta (FIFO automático + descuento dual)
 * POST /itemAPI/lotes/descontar-venta
 * Body: { idItem, idUbicacion, cantidad }
 */
const descontarStockVenta = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion, ItemUbicacion } = itemModelInit(sequelize);

    const { idItem, idUbicacion, cantidad } = req.body;

    // Validar parámetros
    if (!idItem || !idUbicacion || !cantidad) {
      return res.status(400).json({
        message: 'Los parámetros idItem, idUbicacion y cantidad son requeridos'
      });
    }

    const cantidadADescontar = parseFloat(cantidad);

    // Obtener el lote más antiguo con stock para este item
    const lote = await Lote.findOne({
      where: { 
        idItem: parseInt(idItem),
        eliminado: false 
      },
      include: [
        {
          model: LoteItemUbicacion,
          as: 'ubicaciones',
          where: {
            idUbicacion: parseInt(idUbicacion),
            stock: { [Op.gt]: 0 },
            eliminado: false
          },
          required: true
        }
      ],
      order: [
        ['fechaFabricacion', 'ASC'],
        ['fechaVencimiento', 'ASC']
      ]
    });

    if (!lote) {
      return res.status(404).json({ 
        message: 'No hay lotes con stock disponible para este item' 
      });
    }

    const loteItemUbicacion = lote.ubicaciones[0];
    const stockDisponible = loteItemUbicacion.stock;

    // Verificar que haya suficiente stock
    if (stockDisponible < cantidadADescontar) {
      return res.status(400).json({
        message: `Stock insuficiente en el lote. Disponible: ${stockDisponible}, Solicitado: ${cantidadADescontar}`
      });
    }

    // Iniciar transacción para descuento dual
    const transaction = await sequelize.transaction();

    try {
      // 1. Descontar de LoteItemUbicacion
      const nuevoStockLote = stockDisponible - cantidadADescontar;
      await loteItemUbicacion.update(
        { stock: nuevoStockLote },
        { transaction }
      );

      // 2. Descontar de ItemUbicacion (stock total)
      const itemUbicacion = await ItemUbicacion.findOne({
        where: {
          idItem: parseInt(idItem),
          idUbicacion: parseInt(idUbicacion)
        },
        transaction
      });

      if (itemUbicacion) {
        const nuevoInventarioTotal = itemUbicacion.inventario - cantidadADescontar;
        await itemUbicacion.update(
          { inventario: nuevoInventarioTotal },
          { transaction }
        );
      }

      await transaction.commit();

      console.log(`✅ Stock descontado: Lote ${lote.numeroLote}, Cantidad: ${cantidadADescontar}`);

      res.status(200).json({
        message: 'Stock descontado exitosamente',
        lote: {
          id: lote.id,
          numeroLote: lote.numeroLote,
          fechaFabricacion: lote.fechaFabricacion,
          fechaVencimiento: lote.fechaVencimiento,
          stockAnterior: stockDisponible,
          stockActual: nuevoStockLote,
          cantidadDescontada: cantidadADescontar
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error("❌ Error al descontar stock de venta:", error);
    res.status(500).json({ message: 'Error al descontar stock', error: error.message });
  }
};

/**
 * Obtener lotes próximos a vencer
 * GET /itemAPI/lotes/alertas/:diasAntes
 */
const getLotesProximosVencer = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion, Item } = itemModelInit(sequelize);
    const { Ubicacion } = adminModelInit(sequelize);

    const { diasAntes = 30 } = req.params;

    // Calcular fecha límite
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(diasAntes));

    const lotes = await Lote.findAll({
      where: {
        fechaVencimiento: {
          [Op.between]: [new Date(), fechaLimite]
        },
        eliminado: false
      },
      include: [
        {
          model: LoteItemUbicacion,
          as: 'loteItemUbicaciones',
          where: {
            stock: { [Op.gt]: 0 },
            eliminado: false
          },
          required: true,
          include: [
            {
              model: Item,
              as: 'item',
              attributes: ['id', 'codigo', 'descripcion']
            },
            {
              model: Ubicacion,
              as: 'ubicacion',
              attributes: ['id', 'descripcion']
            }
          ]
        }
      ],
      order: [['fechaVencimiento', 'ASC']]
    });

    res.status(200).json(lotes);
  } catch (error) {
    console.error("❌ Error al obtener lotes próximos a vencer:", error);
    res.status(500).json({ message: 'Error al obtener alertas', error: error.message });
  }
};

/**
 * Función helper: Recalcular stock de ItemUbicacion desde LoteItemUbicacion
 * Se usa cuando un item tiene gestión de lotes activa
 * Suma todo el stock de todos los lotes por ubicación y actualiza ItemUbicacion
 * @param {number} idItem - ID del item a recalcular
 * @param {object} sequelize - Instancia de Sequelize
 */
const recalcularStockDesdeTablaLotes = async (idItem, sequelize) => {
  try {
    const { Lote, LoteItemUbicacion, ItemUbicacion } = itemModelInit(sequelize);

    // 1. Verificar si existen lotes para este item
    const lotesExistentes = await Lote.findAll({
      where: { 
        idItem: parseInt(idItem), 
        eliminado: false 
      }
    });

    if (lotesExistentes.length === 0) {
      return { recalculado: false, motivo: 'sin_lotes' };
    }

    // 2. Obtener todos los stocks de lotes agrupados por ubicación
    const stockPorUbicacion = await LoteItemUbicacion.findAll({
      include: [
        {
          model: Lote,
          as: 'lote',
          where: { 
            idItem: parseInt(idItem), 
            eliminado: false 
          },
          attributes: []
        }
      ],
      where: { eliminado: false },
      attributes: [
        'idUbicacion',
        [sequelize.fn('SUM', sequelize.col('stock')), 'stockTotal']
      ],
      group: ['idUbicacion'],
      raw: true
    });

    // 3. Actualizar ItemUbicacion con los stocks calculados
    for (const ubicacion of stockPorUbicacion) {
      const stockTotal = parseFloat(ubicacion.stockTotal) || 0;

      await ItemUbicacion.update(
        { inventario: stockTotal },
        {
          where: {
            idItem: parseInt(idItem),
            idUbicacion: ubicacion.idUbicacion
          }
        }
      );
    }

    // 4. Poner en 0 las ubicaciones que no tienen lotes con stock
    const ubicacionesConStock = stockPorUbicacion.map(u => u.idUbicacion);
    const todasUbicaciones = await ItemUbicacion.findAll({
      where: {
        idItem: parseInt(idItem),
        eliminado: false
      }
    });

    for (const itemUbicacion of todasUbicaciones) {
      if (!ubicacionesConStock.includes(itemUbicacion.idUbicacion)) {
        await itemUbicacion.update({ inventario: 0 });
      }
    }

    return { recalculado: true, ubicacionesActualizadas: stockPorUbicacion.length };

  } catch (error) {
    console.error(`❌ Error al recalcular stock para item ${idItem}:`, error);
    throw error;
  }
};

// 🆕 ENDPOINT: Obtener sugerencia FIFO de lotes para una venta
// GET /itemAPI/lotes/sugerencia-venta?idItem=X&idUbicacion=Y&cantidad=Z
const getSugerenciaLotesVenta = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion } = itemModelInit(sequelize);

    const { idItem, idUbicacion, cantidad } = req.query;

    if (!idItem || !idUbicacion || !cantidad) {
      return res.status(400).json({ 
        message: 'Parámetros requeridos: idItem, idUbicacion, cantidad' 
      });
    }

    const cantidadRequerida = parseFloat(cantidad);

    // Buscar todos los lotes con stock > 0, ordenados por FIFO
    const lotesDisponibles = await Lote.findAll({
      where: {
        idItem: parseInt(idItem),
        eliminado: false
      },
      include: [
        {
          model: LoteItemUbicacion,
          as: 'ubicaciones',
          where: {
            idUbicacion: parseInt(idUbicacion),
            stock: { [Op.gt]: 0 },
            eliminado: false
          },
          required: true,
          attributes: ['stock']
        }
      ],
      order: [
        ['fechaVencimiento', 'ASC'],
        ['fechaFabricacion', 'ASC'],
        ['id', 'ASC']
      ]
    });

    if (lotesDisponibles.length === 0) {
      return res.status(400).json({ 
        message: 'No hay lotes con stock disponible para este item en esta ubicación' 
      });
    }

    // Calcular stock total disponible
    const stockTotal = lotesDisponibles.reduce((sum, lote) => {
      return sum + parseFloat(lote.ubicaciones[0].stock);
    }, 0);

    // 🆕 Ya no rechazamos si hay stock insuficiente, asignamos todo lo disponible
    // El frontend mostrará la advertencia de stock insuficiente
    
    // Asignar cantidades usando FIFO (hasta donde alcance el stock)
    const sugerencia = [];
    let cantidadPendiente = cantidadRequerida;

    for (const lote of lotesDisponibles) {
      // 🔧 Parar cuando ya cubrimos la cantidad requerida
      if (cantidadPendiente <= 0) break;

      const stockDisponible = parseFloat(lote.ubicaciones[0].stock);
      const cantidadAsignada = Math.min(stockDisponible, cantidadPendiente);

      // 🔧 Solo incluir lotes que realmente tienen cantidad asignada
      if (cantidadAsignada > 0) {
        sugerencia.push({
          idLote: lote.id,
          numeroLote: lote.numeroLote,
          fechaFabricacion: lote.fechaFabricacion,
          fechaVencimiento: lote.fechaVencimiento,
          cantidadAsignada: cantidadAsignada,
          stockDisponible: stockDisponible
        });
      }

      cantidadPendiente -= cantidadAsignada;
    }

    // 🆕 Incluir información de stock en la respuesta
    res.status(200).json({
      lotes: sugerencia,
      stockTotal: stockTotal,
      cantidadRequerida: cantidadRequerida,
      stockSuficiente: stockTotal >= cantidadRequerida
    });
  } catch (error) {
    console.error("❌ Error al obtener sugerencia de lotes:", error);
    res.status(500).json({ 
      message: 'Error al obtener sugerencia de lotes', 
      error: error.message 
    });
  }
};

// 🆕 ENDPOINT: Obtener todos los lotes disponibles para venta
// GET /itemAPI/lotes/disponibles-venta?idItem=X&idUbicacion=Y
const getLotesDisponiblesVenta = async (req, res) => {
  try {
    const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Lote, LoteItemUbicacion } = itemModelInit(sequelize);

    const { idItem, idUbicacion } = req.query;

    if (!idItem || !idUbicacion) {
      return res.status(400).json({ 
        message: 'Parámetros requeridos: idItem, idUbicacion' 
      });
    }

    const lotesDisponibles = await Lote.findAll({
      where: {
        idItem: parseInt(idItem),
        eliminado: false
      },
      include: [
        {
          model: LoteItemUbicacion,
          as: 'ubicaciones',
          where: {
            idUbicacion: parseInt(idUbicacion),
            stock: { [Op.gt]: 0 },
            eliminado: false
          },
          required: true,
          attributes: ['stock']
        }
      ],
      order: [
        ['fechaVencimiento', 'ASC'],
        ['fechaFabricacion', 'ASC'],
        ['id', 'ASC']
      ]
    });

    const lotes = lotesDisponibles.map(lote => ({
      idLote: lote.id,
      numeroLote: lote.numeroLote,
      fechaFabricacion: lote.fechaFabricacion,
      fechaVencimiento: lote.fechaVencimiento,
      stockDisponible: parseFloat(lote.ubicaciones[0].stock),
      observaciones: lote.observaciones
    }));

    res.status(200).json(lotes);
  } catch (error) {
    console.error("❌ Error al obtener lotes disponibles:", error);
    res.status(500).json({ 
      message: 'Error al obtener lotes disponibles', 
      error: error.message 
    });
  }
};

module.exports = {
  postItem, getItem, getItemTresLetras, postItemUbicacion, getItemUbicacion, putItemUbicacion, getItemUbicacionFilter, updateItem, updateItemUbicaciones, getDeletedItemUbicacion, getItemById, getItemAtributo, updateItemAtributo, getItemAtributoNoEliminados, getItemProveedor, postItemProveedor, updateItemProveedor, getItemAndItemUbicacion, getItemUbicacionFilterByUbicacion, getItemByCodigoItem, getItemByIdentity, getItemSuggestions, crearReceta, getBomByIdItem, getRecetas, getImpuestoItem, updateImpuestoItem, getImpuestosDisponibles, exportarPLUsBalanza,
  // Funciones para eliminación masiva
  updateItemUbicacionEliminado,
  getItemUbicacionesByItemId,
  bulkDeleteItems,
  // Funciones para gestión de lotes
  postLote,
  getLotes,
  getLoteById,
  getLotesByItem,
  updateLote,
  deleteLote,
  getLoteItemUbicacionStock,
  updateLoteItemUbicacionStock,
  getLoteMasAntiguoConStock,
  descontarStockVenta,
  getLotesProximosVencer,
  // Funciones para ventas con lotes
  getSugerenciaLotesVenta,
  getLotesDisponiblesVenta
};
