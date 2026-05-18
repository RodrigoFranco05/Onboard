require('dotenv').config(); // Si usás variables de entorno desde .env
const { MercadoPagoConfig, Preference , Payment } = require('mercadopago');
const crypto = require('crypto');
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }); // Agrega credenciales  // ENV

const {postTransaccionEcommerce} =require("../controllers/ecommerceController")

// Función para validar la firma del webhook de MercadoPago
const validarFirmaWebhook = (req) => {
  try {
      console.log('🔍 Iniciando validación de firma webhook...');
      
      // 1. Obtener headers requeridos
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];
      
      console.log('📋 Headers recibidos:');
      console.log('x-signature:', xSignature);
      console.log('x-request-id:', xRequestId);
      
      if (!xSignature || !xRequestId) {
          console.log('❌ Headers faltantes');
          return false;
      }

      // 2. Obtener el ID según el tipo de notificación
      let dataID = null;
      let tipoNotificacion = 'unknown';
      
      console.log('📦 Analizando tipo de notificación...');
      console.log('Query params:', req.query);
      console.log('Body:', req.body);

      // ESTRATEGIA MÚLTIPLE PARA OBTENER EL ID
      
      // Caso 1: Notificación de payment (simulada y real)
      if (req.query['data.id']) {
          dataID = req.query['data.id'];
          tipoNotificacion = 'payment (query data.id)';
      }
      // Caso 2: Notificación de merchant_order
      else if (req.query.id && req.query.topic === 'merchant_order') {
          dataID = req.query.id;
          tipoNotificacion = 'merchant_order (query id)';
      }
      // Caso 3: Notificación de payment en body
      else if (req.query.id && req.query.topic === 'payment') {
          dataID = req.query.id;
          tipoNotificacion = 'payment (query id)';
      }
      // Caso 4: Cualquier ID en query params
      else if (req.query.id) {
          dataID = req.query.id;
          tipoNotificacion = 'generic (query id)';
      }
      // Caso 5: data.id en el body
      else if (req.body && req.body.data && req.body.data.id) {
          dataID = req.body.data.id;
          tipoNotificacion = 'payment (body data.id)';
      }
      // Caso 6: id directo en el body
      else if (req.body && req.body.id) {
          dataID = req.body.id;
          tipoNotificacion = 'generic (body id)';
      }

      console.log('📍 Tipo de notificación detectado:', tipoNotificacion);
      console.log('📍 ID extraído:', dataID);

      if (!dataID) {
          console.log('❌ No se pudo obtener el ID de la notificación');
          return false;
      }

      // 3. Parsear la firma
      const signatureParts = {};
      xSignature.split(',').forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) {
              signatureParts[key.trim()] = value.trim();
          }
      });

      const ts = signatureParts.ts;
      const receivedSignature = signatureParts.v1;

      console.log('🔑 Partes de la firma:');
      console.log('ts:', ts);
      console.log('v1:', receivedSignature);

      if (!ts || !receivedSignature) {
          console.log('❌ Firma malformada');
          return false;
      }

      // 4. Generar manifests según el tipo de notificación
      const manifests = [
          // Formato estándar para todos los tipos
          `id:${dataID};request-id:${xRequestId};ts:${ts};`,
          // Formato alternativo sin punto y coma final
          `id:${dataID};request-id:${xRequestId};ts:${ts}`,
          // Formato con orden diferente
          `ts:${ts};id:${dataID};request-id:${xRequestId};`,
          // Formato simplificado (algunos tipos de notificación)
          `id:${dataID};ts:${ts};`,
          // Para merchant_order específicamente (si usa formato diferente)
          `resource:${dataID};request-id:${xRequestId};ts:${ts};`,
          // Formato con topic (para merchant_order)
          `id:${dataID};topic:${req.query.topic || req.body.topic || ''};request-id:${xRequestId};ts:${ts};`,
      ];

      console.log('📝 Probando múltiples formatos de manifest...');

      // 5. Obtener clave secreta
      const secret = process.env.MP_WEBHOOK_SECRET;
      if (!secret) {
          console.log('❌ MP_WEBHOOK_SECRET no configurado');
          return false;
      }

      console.log('🔐 Clave secreta configurada (primeros 10 chars):', secret.substring(0, 10) + '...');

      // 6. Probar cada formato de manifest
      for (let i = 0; i < manifests.length; i++) {
          const manifest = manifests[i];
          console.log(`\n🧪 Probando formato ${i + 1}:`, JSON.stringify(manifest));

          // Generar HMAC
          const hmac = crypto.createHmac('sha256', secret);
          hmac.update(manifest, 'utf8');
          const generatedSignature = hmac.digest('hex');

          console.log('Firma generada:', generatedSignature);
          console.log('Firma recibida :', receivedSignature);
          
          const isValid = generatedSignature === receivedSignature;
          console.log('¿Coinciden?:', isValid);

          if (isValid) {
              console.log(`✅ Validación exitosa con formato ${i + 1} para ${tipoNotificacion}`);
              return true;
          }
      }

      console.log('❌ Todas las validaciones fallaron para', tipoNotificacion);
      return false;

  } catch (error) {
      console.log('💥 Error en validación de firma:', error.message);
      return false;
  }
};


// Función auxiliar para procesar pagos aprobados
const procesarPagoAprobado = async (payment) => {
    try {
        console.log("🔄 Iniciando procesamiento del pago aprobado...");
        
        // Crear un objeto req simulado para la función postTransaccionEcommerce
        const reqSimulado = {
            body: {
                id: payment.id
            },
            cookies: {
                tenant: 'ceccone', // Ajusta según tu configuración
                usuario: "ecommerce"  // Ajusta según tu configuración
            }
        };
        
        // Crear un objeto res simulado
        const resSimulado = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Respuesta del procesamiento: ${code}`, data);
                    return { statusCode: code, data };
                }
            })
        };
        
        // Llamar a la función postTransaccionEcommerce
        await postTransaccionEcommerce(reqSimulado, resSimulado);
        console.log("✅ Pago procesado exitosamente en el ERP");
        
    } catch (error) {
        console.error("❌ Error al procesar el pago en el ERP:", error);
        throw error;
    }
};





const getPreferencesMP = async (req, res) => {
    // Se necesita crear las preferencias 
    // Tambien se encesita que si el pago es exitoso, se impacte en ERP y si es pendiente, también se impacte en ERP -- weebhook??
    // descontarstock y ver como manejar esta venta, es otro mundo
    const {getPrecioActualItem} = require('../services/itemPricingService')
    const { cart, totalPrice, userData } = req.body; // Obtenemos el texto del mensaje del cuerpo de la solicitud

    
    try {
        console.log(userData)
        // Traer precios vigentes en paralelo
        const items = await Promise.all(cart.map(async (it) => {
            const precioActual = await getPrecioActualItem(it.id, req.cookies);
            return {
                id: it.id,
                title: it.descripcion,
                unit_price: precioActual,
                quantity: it.amount
            };
        }));

        // Total recalculado según precios actuales
        const totalPrice = items.reduce((acc, it) => acc + (it.unit_price * it.quantity), 0);

       /*  const items = cart.map(item => ({
        id: item.id,
        title: item.descripcion, // Titulo del producto
        unit_price: item.precioActual, // Precio del producto
        quantity: item.amount, // Cantidad del producto
        })); */

        /* const queryParams = new URLSearchParams({  //para el redirect url 
        status: "failure",
        nombre: userData.nombre,
        apellido: userData.apellido,
        email: userData.email
        }).toString(); */

        // Construir las URLs de retorno ANTES del objeto JSON
        const frontBase = process.env.FRONTEND_BASE_URL || req.headers.origin || 'http://localhost:5173';
        const baseResultUrl = `${frontBase}/cart/result`;
        

        console.log(frontBase)
        console.log("Items para la preferencia de Mercado Pago:", items);
      // Creamos la preferencia incluyendo el precio, titulo y metadata. La información de `items` es standard de Mercado Pago. La información que nosotros necesitamos para nuestra DB debería vivir en `metadata`.
      const preference = await new Preference(client).create({
        body: {
          notification_url: 'https://dl4s924v-5000.brs.devtunnels.ms/api/mercadopago/webhookNotificacion?source_news=webhooks',
          items: items,
          metadata: {
            totalPrice: totalPrice, // Precio total del carrito
            userData: {
                nombre: userData.nombre,
                apellido: userData.apellido,
                email: userData.email,
                telefono: userData.telefono,
                dni: userData.dni,
                ciudad: userData.ciudad,
                pais: userData.pais,
                calle: userData.calle,
                numero: userData.numero,
                piso: userData.piso,
                codigoPostal: userData.codigoPostal,
            },
            items,
          },
        payer: {
            name: userData.nombre,
            surname: userData.apellido,
            email: userData.email,
            phone: {
            // area_code: ,
            number: userData.telefono
            },
            identification: {
            type: "DNI",
            number: userData.dni
            },
            address: {
            zip_code: userData.codigoPostal,
            street_name: userData.calle,
            street_number: userData.numero,
            },
            date_created: new Date().toISOString(),
        },
        payment_methods: {
            excluded_payment_types: [
            {
                id: "ticket"
            }
            ],
            installments: 1,
        },
        back_urls: {                                             
             success: `${baseResultUrl}/success`,
             failure: `${baseResultUrl}/failure`,
             pending: `${baseResultUrl}/pending`
         },
         auto_return: "approved",
        }
      });


      if(!preference || !preference.init_point) {
        return res.status(500).json({ message: "Error al crear la preferencia de pago" });
      }

      console.log("Preferencia de Mercado Pago creada:", preference);

      const preferenceID = preference.id; // Guardamos el ID de la preferencia para poder verificar mediante comparacion con el id de la noticacion del whebhook

      // Devolvemos el init point (url de pago) para que el usuario pueda pagar
      return res.status(200).json({ init_point: preference.init_point });


      // Aquí puedes construir la preferencia de Mercado Pago según tus necesidades
    }
    catch (error) {
      console.error("Error al obtener preferencias de Mercado Pago:", error);
      return res.status(500).json({ message: "Error al obtener preferencias", error });
    }
};

const webhookNotification = async (req, res) => {
    try {
        // Validar la firma del webhook antes de procesar
        const firmaValida = validarFirmaWebhook(req);
        
        if (!firmaValida) {
            console.log("❌ Webhook rechazado: firma inválida");
            return res.status(401).json({ 
                message: "Webhook rechazado: firma inválida" 
            });
        }
        
        // Obtenemos el cuerpo de la petición que incluye información sobre la notificación
        const body = req.body;
        
        console.log("=== WEBHOOK NOTIFICATION RECIBIDA ===");
        console.log("Datos completos del webhook:", JSON.stringify(body, null, 2));
        
        // Verificamos si tenemos el ID del pago en el body
        if (body.data && body.data.id) {
            const paymentId = body.data.id;
            console.log("ID del pago recibido:", paymentId);
            
            // Obtenemos la información completa del pago
            const payment = await new Payment(client).get({ id: paymentId });
            
            console.log("=== INFORMACIÓN DEL PAGO ===");
            console.log("ID del pago:", payment.id);
            console.log("Estado del pago:", payment.status);
            console.log("Monto:", payment.transaction_amount);
            console.log("Moneda:", payment.currency_id);
            console.log("Fecha de creación:", payment.date_created);
            console.log("Fecha de aprobación:", payment.date_approved);
            console.log("Método de pago:", payment.payment_method_id);
            console.log("Tipo de pago:", payment.payment_type_id);
            console.log("Descripción:", payment.description);
            console.log("Metadata:", payment.metadata);
            console.log("Payer info:", payment.payer);
            
            // Aquí puedes agregar lógica adicional según el estado del pago
            if (payment.status === "approved") {
                console.log("✅ PAGO APROBADO - Procesando...");
                // Llamar a la función de procesamiento de transacción
                await procesarPagoAprobado(payment);
            } else if (payment.status === "pending") {
                console.log("⏳ PAGO PENDIENTE");
            } else if (payment.status === "rejected") {
                console.log("❌ PAGO RECHAZADO");
            } else {
                console.log("ℹ️ Estado del pago:", payment.status);
            }

        } else {
            console.log("⚠️ No se encontró ID de pago en la notificación");
            console.log("Estructura del body recibido:", Object.keys(body));
        }
        
        // Respondemos con un estado 200 para indicar que la notificación fue recibida correctamente
        return res.status(200).json({ message: "Webhook recibido correctamente" });
        
    } catch (error) {
        console.error("❌ Error al procesar webhook de MercadoPago:", error);
        return res.status(500).json({ 
            message: "Error al procesar webhook", 
            error: error.message 
        });
    }
}

// Función auxiliar para obtener información del pago
const obtenerInfoPago = async (paymentId) => {
    try {
        const infoPayment = await new Payment(client).get({ id: paymentId });
        return infoPayment;
    } catch (error) {
        console.error("Error al obtener información del pago:", error);
        throw error;
    }
};

// Función para obtener información del pago (endpoint)
const paymentInfo = async (req, res) => {
    const{id}= req.body

    const infoPayment= await new Payment(client).get({ id })

    return res.status(200).json(infoPayment)
}

module.exports = {
  getPreferencesMP,
  webhookNotification,
  paymentInfo,
  obtenerInfoPago
};