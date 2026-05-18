const utc = require("dayjs/plugin/utc");
const tz = require("dayjs/plugin/timezone");
const dayjs = require("dayjs");
dayjs.extend(utc);
dayjs.extend(tz);

const { Op, fn, col, where } = require("sequelize");
const { conexionDB } = require("../config/db.js");
const { transaccionModelInit } = require("../models/transaccionModel.js");
const { adminModelInit } = require("../models/adminModel.js");
const { itemModelInit } = require("../models/itemModel.js");
const { definirAsociaciones, definirAsociacionesItemUbicaciones } = require('../models/associations.js');

const nodemailer = require("nodemailer");

const { postTransaccion, postCrearPago, postTransaccionPago, postTransaccionItem, } = require("./transaccionController.js");
const { putItemUbicacion , getItemUbicacionFilterByUbicacion} = require("./itemController.js");
 
// Obtener todos los items (paginado en 20)
const getItemEcommerce = async (req, res) => {      
  try {
    let sequelize = await conexionDB(req.cookies.tenant,req.cookies.usuario); //Coneccion a BD
    const { Item , ItemUbicacion}  = itemModelInit(sequelize);
    const { ListaDeMontos } = transaccionModelInit(sequelize);
    definirAsociaciones({ Item, ListaDeMontos });
    definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });
    let totalItems = 0;
    let items = [];

    // Parámetros de paginación y filtros adicionales
    const { page = 1, limit = 20, texto, categoria, subcategoria, marca, precioMin,precioMax,descuento, orden='Predeterminado'} = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // CONDICIONES
    const whereConditionsItem ={
        eliminado: false,
        publicadoEcommerce: true
      };
    
    const whereConditionListaMontos ={
        eliminado: false,
        idUbicacion: 1,
        idEntidad: 1
      };
    
      const whereConditionItemUbicacion ={
        eliminado: false,
        idUbicacion: 1,                         //modificar para que sea varible
      };

    // Aplicacion de Filtros
    if (texto) whereConditionsItem.descripcion = { [Op.iLike]:  `%${texto}%` };
    if (categoria) whereConditionsItem.itemDatoAtributo2 = categoria;
    if (subcategoria) whereConditionsItem.itemDatoAtributo1 = subcategoria;
    if (marca) whereConditionsItem.itemDatoAtributo3 = { [Op.iLike]: marca };
    // if (color) params.append('color', color);
    // if (tamanio) params.append('tamanio', tamanio);
    // if (peso) params.append('peso', peso);
    // if (material) params.append('material', material);
    // if (acabado) params.append('acabado', acabado);
    // if (ubicacion) params.append('ubicacion', ubicacion);
    // if (nuevo) params.append('nuevo', nuevo); 
    // if (envioGratis) params.append('envioGratis', envioGratis);
    // if (descuento) params.append('descuento', descuento);
    if (precioMin && precioMax) {whereConditionListaMontos.monto = {[Op.between]: [parseFloat(precioMin), parseFloat(precioMax)]};}
    else if (precioMin) { whereConditionListaMontos.monto = {[Op.gte]: parseFloat(precioMin)};}
    else if (precioMax) {whereConditionListaMontos.monto = {[Op.lte]: parseFloat(precioMax)};}
    
 
    //subquery para ordenar precios de montos mas recientes
    const subquery = sequelize.literal(`(
      SELECT "listaDeMontos"."monto" 
      FROM "listaDeMontos" 
      WHERE "listaDeMontos"."idItem" = "Item"."id" 
      AND "listaDeMontos"."eliminado" = false 
      AND "listaDeMontos"."idUbicacion" = 1 
      AND "listaDeMontos"."idEntidad" = 1
      ORDER BY "listaDeMontos"."fecha" DESC
      LIMIT 1
    )`);

    // Configurar el orden dinámicamente
    let orderConfig = [['id', 'ASC']];
      switch (orden) {
        case "Menor precio":
          orderConfig = [[subquery,'ASC']];
          totalItems = await cantItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion)
          items = await getItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset)
          break;
        case "Mayor precio":
          orderConfig = [[subquery,'DESC']];
          totalItems = await cantItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion)
          items = await getItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset)
          break;
        case "A a Z": 
          orderConfig = [['descripcion', 'ASC']];
          totalItems = await cantItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion)
          items = await getItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset)
          break;
        case "Z a A":
          orderConfig = [['descripcion', 'DESC']];
          totalItems = await cantItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion)
          items = await getItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset)
          break;
        case "Predeterminado":
          totalItems = await cantItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion)
          items = await getItemBD(sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset)   
      }


    //aplanamos y procesamos los items
    const itemsProcesados = procesarItemsBD(items)
    const itemslength = procesarItemsBD(totalItems)

    let totalPages= itemslength.length / limit; // Calcular el total de páginas
    totalPages = Math.ceil(totalPages); // Redondear hacia arriba para obtener el número entero de páginas

  if (descuento== "true") {
      // Si hay filtro de descuento, filtrar los items procesados
     
      
      
      
      
      
      items =itemsProcesados.filter(item => {return item.discount !== null && item.discount > 0;});

      // respuesta con descuento
      
        res.status(200).json({
        total: items.length,
        totalPages: totalPages,
        totalItems: itemslength.length,
        currentPage: parseInt(page),
        data: items,
      });
      
    }else{

      // Si no hay filtro de descuento, devolver todos los items procesados
      console.log("items",itemsProcesados);
      console.log("page", page);
      console.log("totalitems",itemslength.length);
      console.log("limit", limit);
      console.log("offset", offset);
      console.log("usuario", req.cookies.usuario)
      console.log("tenant", req.cookies.tenant)

      res.status(200).json({
        total: itemsProcesados.length,
        totalPages: totalPages,
        totalItems: itemslength.length,
        currentPage: parseInt(page),
        data: itemsProcesados,
      });
  
    }
    
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items', error });
  }
  };

  const getFiltrosECommerce = async (req, res) => {
    try {
    let sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const { Item } = itemModelInit(sequelize);

    // Atributos de los que queremos extraer valores únicos
    const atributos = [
      'itemDatoAtributo1',
      'itemDatoAtributo2',
      'itemDatoAtributo3',
      'itemDatoAtributo4',
      'itemDatoAtributo5',
      'itemDatoAtributo6',
      'itemDatoAtributo7',
      'itemDatoAtributo8',
      'itemDatoAtributo9',
      'itemDatoAtributo10'
    ];

    const filtros = {};
    console.log('Conexión establecida, comenzando a buscar filtros...');

    // Por cada atributo, hacemos una consulta individual para obtener valores únicos
    for (const atributo of atributos) {
      console.log('Buscando valores distintos para:', atributo);

      const resultados = await Item.findAll({
        attributes: [
          [sequelize.fn('DISTINCT', sequelize.col(atributo)), atributo]
        ],
        where: {
          eliminado: false,
          publicadoEcommerce: true
        },
        order: [[atributo, 'ASC']],
        raw: true
      });

      // Extraer solo los valores y filtrarlos para que no sean nulos
      filtros[atributo] = resultados
        .map(r => r[atributo])
        .filter(val => val !== null && val !== '');
    }

    filtros.orden = ['Predeterminado', 'Menor precio', 'Mayor precio', 'A a Z', 'Z a A'];
    res.status(200).json({ filtros });

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener filtros', error });
  }
  }

  const getOneItemEcommerce = async (req, res) => {  
    console.log(req.cookies.tenant)   
    console.log(req.cookies.usuario)  
    try {
      let sequelize = await conexionDB(req.cookies.tenant,req.cookies.usuario); //Coneccion a BD
      console.log("e")   
      const { Item , ItemUbicacion}  = itemModelInit(sequelize);
      console.log("f")   
      const { ListaDeMontos } = transaccionModelInit(sequelize);
      definirAsociaciones({ Item, ListaDeMontos });
      definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });
      let item = undefined;
      console.log("d")   
      // Parámetros
      const {id} = req.params;
      
      const whereConditions ={
          eliminado: false,
          publicadoEcommerce: true,
          id: id,
        };
        
      const whereConditionListaMontos ={
          eliminado: false,
          idUbicacion: 1,
          idEntidad: 1
        };
        console.log("3");
        console.log(req.cookies.tenant)
        console.log(req.cookies.usuario)
        console.log(whereConditions)
        console.log(whereConditionListaMontos)
      items = await Item.findAll({
        where: whereConditions,
        include:[{
            model: ListaDeMontos,
            as: "listaMontos",
            where: whereConditionListaMontos,
            required: true,
            attributes: ['monto','fecha'],
            },
            {
            model: ItemUbicacion,
            as: "ItemUbicacion",
            where: { eliminado: false, idUbicacion: 1 , }, // Filtrar por ubicación
            required: true,
            attributes: ['inventario'],
            }]
      }); 
      
      console.log("4");
      const itemProcesado = procesarItemsBD(items)



      res.status(200).json({
        data: itemProcesado[0]
      });
      
    }
    catch (error) {
      res.status(500).json({ message: 'Error al obtener items', error });
    }
  };


const getItemEcommerceCategory = async (req, res) => {      
    try {
      let sequelize = await conexionDB(req.cookies.tenant,req.cookies.usuario); //Coneccion a BD
      const { Item , ItemUbicacion}  = itemModelInit(sequelize);
      const { ListaDeMontos } = transaccionModelInit(sequelize);
      definirAsociaciones({ Item, ListaDeMontos });
      definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });
      let totalItems = 0;
      let items = [];

      // Parámetros de paginación y filtros adicionales
      const {limit = 5,categoria, subcategoria, marca,descuento} = req.query;  // se plica el filtro para obtener los 5 items que quieras
      const offset = 0;
      
      // CONDICIONES
      const whereConditions ={
          eliminado: false,
          publicadoEcommerce: true
        };
      
      const whereConditionListaMontos ={
          eliminado: false,
          idUbicacion: 1,
          idEntidad: 1
        };

      
      if (categoria) whereConditions.itemDatoAtributo2 = categoria;
      if (subcategoria) whereConditions.itemDatoAtributo1 = subcategoria;
      if (marca) whereConditions.itemDatoAtributo3 = { [Op.iLike]: marca };
      // if (nuevo) params.append('nuevo', nuevo); 
      // if (descuento) params.append('descuento', descuento);

      /////////////////////////////////////////////////////////////////////////////
      ///////// CONSULTA
      items = await Item.findAll({
        where: whereConditions,
        limit: parseInt(limit),
        offset: offset,
        order: [['id', 'ASC']], 
        include:[{
            model: ListaDeMontos,
            as: "listaMontos",
            where: whereConditionListaMontos,
            required: true,
            attributes: ['monto','fecha'],
            },
            {
            model: ItemUbicacion,
            as: "ItemUbicacion",
            where: { eliminado: false, idUbicacion: 1 , }, // Filtrar por ubicación
            required: true,
            attributes: ['inventario'],
            }]
      });   

  
      /////////////////////////////////////////////////////////////////////////////
          // descuentos y precios 
  
        const itemsProcesados = procesarItemsBD(items)

    /////////////////////////////////////////////////////////////////////////////

        // Si no hay filtro de descuento, devolver todos los items procesados
        console.log("items",itemsProcesados);

        res.status(200).json({
          data: itemsProcesados,
        });
    
      
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener items', error });
    }
  };


  const postTransaccionEcommerce = async (req, res) => {
    try {
      let sequelize = await conexionDB(req.cookies.tenant,req.cookies.usuario); //Coneccion a BD
      const { Item , ItemUbicacion}  = itemModelInit(sequelize);
      const { ListaDeMontos , TipoMedioDePago, MedioDePago} = transaccionModelInit(sequelize);
      const { obtenerInfoPago } = require("../services/mercadoPagoService");
      definirAsociaciones({ Item, ListaDeMontos });
      definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });

      const idUbicacion =1;

      const {id} = req.body; //primero recibir el id del pago
      
      // Obtener información del pago desde MercadoPago
      const payment = await obtenerInfoPago(id); //llamar funcion payment para obtener la info del pago

      // Extraer datos del pago
      const montoTotal = payment.transaction_amount;
      const metadata = payment.metadata || {};
      const userData = payment.metadata.user_data || {};
      const itemsList = payment.additional_info.items;
      const tipoMedioPagoInfo = payment.payment_type_id|| {};
      const MedioDePagoInfo = payment.payment_method_id|| {};
      const payment_method_option_id= payment.payment_method_option_id|| {};
      const installments = payment.installments || {};
      const thisInstallement = payment.transaction_details.installment_amount|| {};
      const montoTotalPago= payment.metadata.total_price|| {};
      
      // definir el TIPO medio de pago, con el numero correspondiente en la base de datos
      let tipoMedioDePagoERP = "Efectivo"; // Valor por defecto
      if(tipoMedioPagoInfo == "credit_card") {
        tipoMedioDePagoERP = "Tarjeta de Credito";
      } else if(tipoMedioPagoInfo == "debit_card") {
        tipoMedioDePagoERP = "Tarjeta de Debito";
      } else if(tipoMedioPagoInfo == "bank_transfer") {
        tipoMedioDePagoERP = "Transferencia Bancaria";
      }

      const tipoMedioDePagoBD = await TipoMedioDePago.findAll({
        where:{
          descripcion: tipoMedioDePagoERP
        }
      })
      
      if(tipoMedioDePagoBD.length === 0) {
        console.log("⚠️ No se encontró tipo de medio de pago:", tipoMedioDePagoERP);
        return res.status(400).json({ message: "Tipo de medio de pago no encontrado" });
      }
      
      const idTipoMedioDePago = tipoMedioDePagoBD[0].id

      // definir el medio de pago, con el numero correspondiente en la base de datos
      let MedioDePagoERP = "Mercado Pago"; // Valor por defecto
      if(MedioDePagoInfo == "master") {
        MedioDePagoERP = "Mastercard";
      } else if(MedioDePagoInfo == "visa") {
        MedioDePagoERP = "Visa";
      } else if(MedioDePagoInfo == "amex") {
        MedioDePagoERP = "American Express";
      }

      const MedioDePagoBD = await MedioDePago.findAll({
        where:{
          descripcion: MedioDePagoERP
        }
      })
      
      if(MedioDePagoBD.length === 0) {
        console.log("⚠️ No se encontró medio de pago:", MedioDePagoERP);
        return res.status(400).json({ message: "Medio de pago no encontrado" });
      }
      
      const idTipoMedioPago = MedioDePagoBD[0].id

      /*// Configuración por defecto para transacciones de ecommerce
      const configuracionDefault = {
        tempPorcentajeDescuento: 0,
        tempValorDescuento: 0,
        dniCliente: { id: 1 }, // Cliente genérico para ecommerce
        usuarioSeleccionado: { id: 1 }, // Usuario sistema
        descripcionTransaccionReemplazo: `Venta Ecommerce - Pago MP: ${payment.id}`,
        selectedMedioDePago: { id: 1 }, // MercadoPago
        selectedUbicacion: { id: 1 }, // Ubicación principal
        selectedNegocio: { id: 1 }, // Negocio principal
        precioTotalModificado: montoTotal,
        itemList: [] // Se debe obtener de la metadata del pago
      };

      // Si hay datos en req.body, usarlos; si no, usar configuración por defecto
      const { 
        tempPorcentajeDescuento = configuracionDefault.tempPorcentajeDescuento, 
        tempValorDescuento = configuracionDefault.tempValorDescuento, 
        dniCliente = configuracionDefault.dniCliente, 
        usuarioSeleccionado = configuracionDefault.usuarioSeleccionado, 
        descripcionTransaccionReemplazo = configuracionDefault.descripcionTransaccionReemplazo, 
        selectedMedioDePago = configuracionDefault.selectedMedioDePago, 
        selectedUbicacion = configuracionDefault.selectedUbicacion, 
        selectedNegocio = configuracionDefault.selectedNegocio, 
        precioTotalModificado = configuracionDefault.precioTotalModificado, 
        itemList = configuracionDefault.itemList 
      } = req.body;*/

      
      // Crear objeto req simulado para postTransaccion
      const reqTransaccion = {
        body: {
          montoTotal: montoTotal,
          idTipoTransaccion: 1,
          idEntidad: 1, // Usuario genérico para ecommerce
          idSubCategoriaTransaccion: null,
          descripcion: `Venta Ecommerce - Pago MP: ${payment.id}`,
          idUsuario: 3, // Usuario ecommerce
          idUbicacion: idUbicacion,
          idNegocio: 1,
          tempValorDescuento: 0,
          tempPorcentajeDescuento: 0,
          transaccionAsociada: null,
          fecha: new Date(),
          fechaHoraCreacion: new Date()
        },
        cookies: req.cookies
      };

      let idTransaccion = 0;

      // Crear objeto res simulado para postTransaccion
      const resTransaccion = {
        status: (code) => ({
          json: (data) => {
            idTransaccion = data.dataValues.id  //Obtenemos el id de la transaccion para realizar el TransaccionPago
            console.log(`Respuesta de postTransaccion: ${code}`, data);
            return { statusCode: code, data };
          }
        })
      };

      const transaccionResponse = await postTransaccion(reqTransaccion, resTransaccion);

        /*{
          fecha: fechaTransaccion, // Fecha hardcodeada,
          montoTotal: montoTotal,
          idTipoTransaccion: idTipoTransaccion,
          idEntidad: idEntidad,
          idCategorizacion: idSubCategoriaTransaccion,
          descripcion: descripcion,
          fechaHoraCreacion: new Date(),
          idUsuario: idUsuario,
          idUbicacion: idUbicacion,
          idNegocio: idNegocio,
          transaccionAsociada: transaccionAsociada,
          montoDescuento: montoDescuento, // Enviar valor de descuento total
          porcentajeDescuento: porcentajeDescuento, // Enviar porcentaje de descuento
        }*/
     
     
      // Crear objeto req simulado para postCrearPago
      const reqCrearPago = {
        body: {
          idMoneda: 1,
          cotizacion: 1,
          idMedioDePago: idTipoMedioPago,
          montoTotal: montoTotal
        },
        cookies: req.cookies
      };

      let idTransaccionCrearPago = 0
      // Crear objeto res simulado para postCrearPago
      const resCrearPago = {
        status: (code) => ({
          json: (data) => {
            idTransaccionCrearPago = data.dataValues.id //Obtenemos el id del pago para realizar el TransaccionPago
            console.log(`Respuesta de postCrearPago: ${code}`, data);
            return { statusCode: code, data };
          }
        })
      };

      const transaccionCrearPago = await postCrearPago(reqCrearPago, resCrearPago); //Creamos el pago para la transaccion


      // TODO: Implementar postTransaccionPago o crear la asociación manualmente

      const reqTransaccionPago = {
        body: {
          idTransaccion: idTransaccion,
          idPago: idTransaccionCrearPago,
        },
        cookies: req.cookies
      };

      const resTransaccionPago = {
        status: (code) => ({
          json: (data) => {
            console.log(`Respuesta de postTransaccionPago: ${code}`, data);
            return { statusCode: code, data };
          }
        })
      };

      await postTransaccionPago(reqTransaccionPago, resTransaccionPago) //Asociamos el pago a la transaccion
      console.log("Asociando transacción", idTransaccion, "con pago", idTransaccionCrearPago);

      /*{
        idTransaccion: idTransaccion,
        idPago: idPago,
      }*/

      // Calcular el total base para distribuir descuentos de transacción
      // Calcular descuentos de transacción
      // Procesar items válidos
      
      for (const it of itemsList) {
        // Crear objeto req simulado para postTransaccionItem
        const reqTransaccionItem = {
          body: {
            idTransaccion: idTransaccion,
            idItem: it.id,
            cantidad: it.quantity,
            precio: it.unit_price,
            porcentajeDescuento: 0,
            signo: "-"
          },
          cookies: req.cookies
        };

        // Crear objeto res simulado para postTransaccionItem
        const resTransaccionItem = {
          status: (code) => ({
            json: (data) => {
              console.log(`Respuesta de postTransaccionItem: ${code}`, data);
              return { statusCode: code, data };
            }
          })
        };

        await postTransaccionItem(reqTransaccionItem, resTransaccionItem); // POST TransaccionItem para trazabilidad de items por transaccion

      /*{
        idTransaccion: idTransaccion,
        idItem: idItem,
        cantidad: cantidad,
        precio: precio,
        montoTotal: precio * cantidad * (1 - (porcentajeDescuento || 0) / 100),
        porcentajeDescuento: porcentajeDescuento, // Enviar descuento específico del ítem
      });*/

      // Crear objeto req simulado para getItemUbicacionFilterByUbicacion
      const reqGetUbicacion = {
        params: {
          itemID: it.id,
          ubicacionID: idUbicacion
        },
        cookies: req.cookies
      };

      // Crear objeto res simulado para getItemUbicacionFilterByUbicacion
      const resGetUbicacion = {
        status: (code) => ({
          json: (data) => {
            console.log(`Respuesta de getItemUbicacionFilterByUbicacion: ${code}`, data);
            return { statusCode: code, data };
          }
        })
      };

      const ubicacionItem = await getItemUbicacionFilterByUbicacion(reqGetUbicacion, resGetUbicacion);
      /*serverURL + `/itemAPI/getItemUbicacionFilterByUbicacion/${itemID}/${ubicacionID}                  ITEM */

      /* if (ubicacionItem && ubicacionItem.data) {
        const nuevoStock = it.quantity;

        if (nuevoStock < 0) {
          console.log(`Stock insuficiente para ${it.descripcion}`); // Como se prosigue?
          continue;
        } */

        // Crear objeto req simulado para putItemUbicacion
        const reqPutUbicacion = {
          body: {
            idItem: it.id,
            idUbicacion: idUbicacion,
            inventario: it.quantity,
            proviene: "venta"
          },
          cookies: req.cookies
        };

        // Crear objeto res simulado para putItemUbicacion
        const resPutUbicacion = {
          status: (code) => ({
            json: (data) => {
              console.log(`Respuesta de putItemUbicacion: ${code}`, data);
              return { statusCode: code, data };
            }
          })
        };

        await putItemUbicacion(reqPutUbicacion, resPutUbicacion); //descontar stock!
      } 
 
            /* {                   ITEM
                idItem: idItem,
                idUbicacion: idUbicacion,
                inventario: inventarioItem,
                proviene: proviene, // Enviamos 'proviene' al backend
              });*/
          
      

      // Enviar correo de confirmación al usuario
      try {
        const { enviarCorreosConfirmacionPago } = require('../services/procesar_form.js');
        
        const datosCorreo = {
          name: idTransaccion.toString(), // ID de la transacción como número de pedido
          number: tipoMedioDePagoERP, // Medio de pago
          email: userData.email,
          tenant: 'ceccone',
          items: itemsList,
          totalPrice: montoTotal
        };

        await enviarCorreosConfirmacionPago(datosCorreo);
        console.log('✅ Correo de confirmación enviado exitosamente');
      } catch (emailError) {
        console.error('⚠️ Error al enviar correo de confirmación:', emailError);
        // No fallar la transacción por error de email
      }

      // Respuesta exitosa
      return res.status(200).json({
        message: "Transacción de ecommerce procesada exitosamente",
        transaccionId: idTransaccion,
        pagoId: payment.id,
        monto: montoTotal
      });

    }
    catch (error){
      console.error("Error creating transaccion pago:", error);
      return res.status(500).json({
        message: "Error al procesar transacción de ecommerce",
        error: error.message
      });
    }
  }

  const cantItemBD = async (sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion) => {
    const { Item , ItemUbicacion}  = itemModelInit(sequelize);
    const { ListaDeMontos } = transaccionModelInit(sequelize);
    definirAsociaciones({ Item, ListaDeMontos });
    definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });
  try{
    totalItems = await Item.findAll({
      where: whereConditionsItem,
      order: orderConfig,
      include:[{
          model: ListaDeMontos,
          as: "listaMontos",
          where: whereConditionListaMontos,
          required: true,
          attributes: ['monto','fecha'],
          },
          {
          model: ItemUbicacion,
          as: "ItemUbicacion",
          where: whereConditionItemUbicacion, // Filtrar por ubicación
          required: true,
          attributes: ['inventario'],
          }]
    });

    return totalItems;
  }
  catch(error){
    console.error("Error al obtener cantidad de items:", error);
   }
}


const getItemBD = async (sequelize, orderConfig, whereConditionsItem, whereConditionListaMontos, whereConditionItemUbicacion, limit, offset) => {
  const { Item , ItemUbicacion}  = itemModelInit(sequelize);
  const { ListaDeMontos } = transaccionModelInit(sequelize);
  definirAsociaciones({ Item, ListaDeMontos });
  definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });
  try{ 
      // Consulta genérica única desde la tabla Item
      items = await Item.findAll({
        where: whereConditionsItem,
        limit: parseInt(limit),
        offset: offset,
        order: orderConfig, // Variable dinámica para el orden
        include: [{
            model: ListaDeMontos,
            as: "listaMontos",
            where: whereConditionListaMontos,
            required: true,
            attributes: ['monto', 'fecha'],
          },
          {
            model: ItemUbicacion,
            as: "ItemUbicacion",
            where: whereConditionItemUbicacion,
            required: true,
            attributes: ['inventario'],
          }]
        });

        return items;
   }
   catch(error){
    console.error("Error al obtener los items:", error);
   }
   }

  const procesarItemsBD = (items) => {
    return items.map(item => {
      const plainItem = item.get({ plain: true }); // Objeto plano
      const stock = plainItem.ItemUbicacion?.[0]?.inventario ?? 0;

      // Ordenar por fecha descendente
      const lista = plainItem.listaMontos || [];
      const listaOrdenada = lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      // Extraer últimos dos montos
      const precioActual = listaOrdenada[0]?.monto ?? null;
      const precioAnterior = listaOrdenada[1]?.monto ?? null;

      delete plainItem.listaMontos;
      delete plainItem.ItemUbicacion;
      // Crear nuevo objeto sin listaMontos, con los nuevos campos

      
      let discount = null; // Inicializar discount como null
      if(precioAnterior!=null && precioActual<precioAnterior ){
        discount = Math.round(((precioAnterior - precioActual) / precioAnterior) * 100);
      }


      if(precioActual < precioAnterior){
        return {
        ...plainItem,
        precioActual,
        precioAnterior,
        discount,
        stock,
      };
      }
      else{
        return {
        ...plainItem,
        precioActual,
        stock
      };
      }
      
    });
  }


  const postContacto = async (req, res) => {
    try {
      // Extraer datos del body
      const { name, company, number, email, comments, tenant } = req.body;
      //const tenant = req.cookies.tenant;
      const {enviarCorreosFormulario} = require('../services/procesar_form.js');

      // Preparar datos para el servicio de email
      const datosFormulario = {
          name,
          company,
          number,
          email,
          comments,
          tenant
      };

      // Llamar al servicio de email
      const resultado = await enviarCorreosFormulario(datosFormulario);

      // Responder al cliente
      return res.status(200).json({
          success: true,
          message: 'Formulario procesado correctamente',
          data: resultado
      });

  } catch (error) {
      console.error('Error en postContacto:', error);
      
      return res.status(500).json({
          success: false,
          message: 'Error al procesar el formulario',
          error: error.message
      });
  }
  }

  const testFiltro = async (req, res) => {      
    
  };

  module.exports = {
    getItemEcommerce,
    getFiltrosECommerce,
    getOneItemEcommerce,
    getItemEcommerceCategory,
    postTransaccionEcommerce,
    postContacto,
    testFiltro,
  }