const { adminModelInit } = require('../models/adminModel');

/**
 * ============================================================================
 * PARÁMETROS GLOBALES DEL SISTEMA
 * ============================================================================
 * 
 * Este archivo gestiona los parámetros de configuración globales del sistema.
 * 
 * USO EN FRONTEND:
 * ----------------
 * Para obtener parámetros desde cualquier componente React:
 * 
 * 1. Importar la función del contexto:
 *    const { getParametrosGlobales } = useContext(ErpContext)
 * 
 * 2. Llamar con array de nombres de parámetros:
 *    const resultado = await getParametrosGlobales(["nombreParametro1", "nombreParametro2"])
 * 
 * 3. Resultado es un objeto con los parámetros solicitados:
 *    {
 *      nombreParametro1: "valor1",
 *      nombreParametro2: "valor2"
 *    }
 * 
 * EJEMPLO COMPLETO:
 * -----------------
 * const MiComponente = () => {
 *   const { getParametrosGlobales } = useContext(ErpContext)
 *   const [config, setConfig] = useState({})
 *   
 *   useEffect(() => {
 *     const cargarConfig = async () => {
 *       const params = await getParametrosGlobales(["usaTransferenciaInternaCaja", "formatoNumerico"])
 *       setConfig(params)
 *     }
 *     cargarConfig()
 *   }, [])
 *   
 *   if (config.usaTransferenciaInternaCaja === "1") {
 *     // Mostrar funcionalidad de transferencia interna
 *   }
 * }
 * 
 * AGREGAR NUEVOS PARÁMETROS:
 * --------------------------
 * 1. Agrega el parámetro a PARAMETROS_REQUERIDOS más abajo
 * 2. Define valorDefecto, explicacion, descripcion y verEnMenu
 * 3. El sistema lo creará automáticamente en todos los tenants al reiniciar
 * 
 * ============================================================================
 */

/**
 * Lista de parámetros globales requeridos para el funcionamiento del sistema
 * Cada vez que agregues una nueva funcionalidad, añade aquí los parámetros necesarios
 * 
 * Campos:
 * - nombreParametro: Nombre único del parámetro
 * - valorDefecto: Valor por defecto al crear el parámetro
 * - explicacion: Explicación técnica para desarrolladores
 * - descripcion: Descripción amigable para mostrar en la interfaz
 * - verEnMenu: true/false - Si el parámetro debe ser visible en el menú de configuración
 *              (Solo se aplica en la inicialización del tenant, no se actualiza posteriormente)
 */
const PARAMETROS_REQUERIDOS = [
  // CONFIGURACION REGIONAL /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'formatoNumerico',
    valorDefecto: 'es-AR',
    explicacion: 'Locale numérico preferido (ej: es-AR, es-ES, en-US). Dejar vacío para autodetección por navegador.',
    descripcion: 'Formato numérico para el sistema',
    verEnMenu: false  // Parámetro técnico
  },
  {
    nombreParametro: 'formatoFechas',
    valorDefecto: 'DD/MM/YYYY',
    explicacion: 'Formato de fechas para el sistema',
    descripcion: 'Formato de fechas para el sistema',
    verEnMenu: false  // Parámetro técnico
  },
    // VENTAS /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'ubicacionStockCarrito',
    valorDefecto: '0',
    explicacion: 'ID de ubicación para stock del carrito',
    descripcion: 'Ubicación de stock para Carrito',
    verEnMenu: false  // Parámetro técnico
  },
  {
    nombreParametro: 'ubicacionStockMeli',
    valorDefecto: '0',
    explicacion: 'ID de ubicación para stock de MercadoLibre',
    descripcion: 'Ubicación de stock para MercadoLibre',
    verEnMenu: false  // Parámetro técnico
  },
  {
    nombreParametro: 'defaultN',
    valorDefecto: '1',
    explicacion: 'Flag para incluir impuestos por defecto (1=true, 0=false)',
    descripcion: 'Incluir impuestos por defecto',
    verEnMenu: false  // Parámetro técnico
  },
  // {
  //   nombreParametro: 'precioVentaEditable',
  //   valorDefecto: 0,
  //   explicacion: 'Este parametro indica si el precio de venta es editable por el usuario',
  //   descripcion: 'Precio de venta editable',
  //   verEnMenu: false  // Configurable por usuario
  // },
  // LOGO /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'logoTenant',
    valorDefecto: null,
    explicacion: 'Logo del tenant en base64',
    descripcion: 'Logo de la empresa',
    verEnMenu: true  // Configurable por usuario
  },
  // AFIP /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'afipsdk_razon_social',
    valorDefecto: null,
    explicacion: 'Razon Social del tenant para facturar',
    descripcion: 'Razón Social',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_cuit',
    valorDefecto: '20409378472',
    explicacion: 'CUIT configurado en AFIP',
    descripcion: 'CUIT',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_condicion_iva',
    valorDefecto: null,
    explicacion: 'Condición IVA del tenant para facturar',
    descripcion: 'Condición IVA',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_domicilio',
    valorDefecto: null,
    explicacion: 'Domicilio del tenant para facturar',
    descripcion: 'Domicilio comercial',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_email',
    valorDefecto: null,
    explicacion: 'Email del tenant para facturar',
    descripcion: 'Email de facturación',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_inicio_actividades',
    valorDefecto: null,
    explicacion: 'Inicio actividades del tenant para facturar',
    descripcion: 'Fecha de inicio de actividades',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_telefono',
    valorDefecto: null,
    explicacion: 'Teléfono del tenant para facturar',
    descripcion: 'Teléfono de contacto',
    verEnMenu: true  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_username',
    valorDefecto: null,
    explicacion: 'CUIT con el que se hace login en ARCA. Normalmente coincide con afipsdk_cuit. Si la empresa es administrada por un representante legal (persona física), acá va el CUIT del representante y en afipsdk_cuit el de la empresa. Si queda vacío, se usa afipsdk_cuit.',
    descripcion: 'CUIT de login en ARCA (representante)',
    verEnMenu: false  // Parámetro técnico - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_password',
    valorDefecto: null,
    explicacion: 'Password de clave fiscal con el que se hace login en ARCA (corresponde al CUIT de afipsdk_username, o a afipsdk_cuit si aquel está vacío).',
    descripcion: 'Contraseña AFIP',
    verEnMenu: false  // Parámetro sensible - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_cert_dev',
    valorDefecto: null,
    explicacion: 'Certificado AFIP para SDK DEV',
    descripcion: 'Certificado AFIP (Desarrollo)',
    verEnMenu: false  // Parámetro técnico - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_key_dev', 
    valorDefecto: null,
    explicacion: 'Clave privada AFIP para SDK DEV',
    descripcion: 'Clave privada AFIP (Desarrollo)',
    verEnMenu: false  // Parámetro técnico - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_cert_prod',
    valorDefecto: null,
    explicacion: 'Certificado AFIP para SDK PROD',
    descripcion: 'Certificado AFIP (Producción)',
    verEnMenu: false  // Parámetro técnico - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_key_prod', 
    valorDefecto: null,
    explicacion: 'Clave privada AFIP para SDK PROD',
    descripcion: 'Clave privada AFIP (Producción)',
    verEnMenu: false  // Parámetro técnico - no mostrar en menú
  },
  {
    nombreParametro: 'afipsdk_prod',
    valorDefecto: 0,
    explicacion: 'AFIP SDK CONFIGURADO PARA PROD?',
    descripcion: 'Modo producción AFIP',
    verEnMenu: false  // Configurable por usuario
  },
  {
    nombreParametro: 'afipsdk_punto_venta',
    valorDefecto: null,
    explicacion: 'Cache JSON de puntos de venta AFIP habilitados para WSFE. Se auto-configura al consultar AFIP desde la pantalla de facturación.',
    descripcion: 'Punto de venta AFIP (WSFE)',
    verEnMenu: false  // Se gestiona desde TablaVentasAfip
  },
  {
    nombreParametro: 'afipsdk_refresh_punto_venta',
    valorDefecto: '0',
    explicacion: 'Si es 1, permite refrescar los puntos de venta consultando la API de AFIP SDK (consume 1 request). Si es 0, el botón de refresh está deshabilitado.',
    descripcion: 'Permitir refresh de puntos de venta AFIP',
    verEnMenu: true
  },
  // CANAL DE ENTIDAD /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'canalEntidad',
    valorDefecto: 0,
    explicacion: 'Usa Canal de entidad?',
    descripcion: 'Usar canal de entidad',
    verEnMenu: false  // Configurable por usuario
  },
   // BALANZA /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'pluBalanza',
    valorDefecto: 0,
    explicacion: 'Este parametro indica si el tenant usa balanzas, por ende, necesita este campo',
    descripcion: 'Usar balanza electrónica',
    verEnMenu: false  // Configurable por usuario
  },
  {
    nombreParametro: 'fabricanteBalanza',
    valorDefecto: null,
    explicacion: 'Este parametro indica el nombre del fabricante de la balanza: KRETZ tendra un formato especifico de export.',
    descripcion: 'Fabricante de la balanza',
    verEnMenu: false  // Configurable por usuario
    // kretz
  },

  // TICKEADORA /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'usaTickeadora',
    valorDefecto: 0,
    explicacion: 'Este parametro indica si el tenant usa tickeadora',
    descripcion: 'Usar tickeadora',
    verEnMenu: false  // Configurable por usuario
    // kretz
  },

  // GESTION DE LOTES /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'gestionDeLotes',
    valorDefecto: 0,
    explicacion: 'Activa la gestión de lotes por fecha de vencimiento (FIFO) para productos con control de lotes',
    descripcion: 'Gestión de lotes de productos',
    verEnMenu: true  // Configurable por usuario
  },
  
  // CREAR GASTOS /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'verCheckboxCrearGastoAfectaCuentaCorriente',
    valorDefecto: '1',
    explicacion: 'Controla la visibilidad del checkbox "Afecta cuenta corriente" en la creación de gastos (1=visible, 0=oculto)',
    descripcion: 'Mostrar checkbox "Afecta cuenta corriente" en gastos',
    verEnMenu: false  // Configurable por usuario
  },
  {
    nombreParametro: 'valorCheckboxCrearGastoAfectaCuentaCorriente',
    valorDefecto: '0',
    explicacion: 'Valor por defecto del checkbox "Afecta cuenta corriente" en la creación de gastos (1=activado, 0=desactivado)',
    descripcion: 'Activar por defecto "Afecta cuenta corriente" en gastos',
    verEnMenu: false  // Configurable por usuario
  },

  // CAJA /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-  
  {
    nombreParametro: 'usaTransferenciaInternaCaja',
    valorDefecto: '1',
    explicacion: 'Este parametro indica si el tenant usa transferencia interna en caja',
    descripcion: 'Usar transferencia interna en caja',
    verEnMenu: false  // Configurable por usuario
  },
  {
    nombreParametro: 'cajaCalcularMontoCierreParaMontoInicial',
    valorDefecto: '1',
    explicacion: 'Controla si el montoCierre del día anterior se muestra como monto inicial. Con valor "1" (default), el saldo se arrastra día a día (comportamiento estándar). Con valor "0", el monto inicial siempre se muestra como $0 en la UI y el PDF, sin necesidad de hacer retiros manuales. El backend sigue acumulando montoCierre normalmente.',
    descripcion: 'Caja: acumular saldo de cierre como monto inicial del día siguiente',
    verEnMenu: true
  },

  // PAQUETES / VIAJES /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  {
    nombreParametro: 'nochesCalculoAutomatico',
    valorDefecto: '0',
    explicacion: 'Si está en 1, en la creación de paquetes se reactiva la lógica bidireccional entre Fecha Fin y Noches. Si está en 0, Noches queda como input manual.',
    descripcion: 'Paquetes: cálculo automático de noches al crear',
    verEnMenu: true  // Configurable por usuario
  },

    // CREAR ITEMS /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*
    {
      nombreParametro: 'ubicacionDefaultCreacionItems',
      valorDefecto: '1',
      explicacion: 'Ubicacion default creacion items',
      descripcion: 'Ubicacion default creacion items',
      verEnMenu: false  // Configurable por usuario
    },
  
  // PDFs /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*
  {
    nombreParametro: 'leyendaPresupuestoPDF',
    valorDefecto: null,
    explicacion: 'Leyenda en el PDF de presupuesto',
    descripcion: 'Leyenda en el PDF de presupuesto',
    verEnMenu: true  // Configurable por usuario
  },

];

/**
 * Valida y crea parámetros globales faltantes para un tenant
 * También actualiza las descripciones si no existen
 * @param {Object} sequelize - Instancia de Sequelize del tenant
 * @param {string} tenantName - Nombre del tenant para logging
 */
async function validarYCrearParametrosGlobales(sequelize, tenantName = 'unknown') {
  try {
    const { ParametrosGlobales } = adminModelInit(sequelize);
    
    console.log(`🔍 Validando parámetros globales para tenant: ${tenantName}`);
    
    // Obtener todos los parámetros existentes de una vez (incluyendo descripcion)
    const parametrosExistentes = await ParametrosGlobales.findAll({
      attributes: ['nombreParametro', 'descripcion'],
      where: { eliminado: false }
    });
    
    const nombresExistentes = new Set(
      parametrosExistentes.map(p => p.nombreParametro)
    );
    
    // Identificar parámetros faltantes
    const parametrosFaltantes = PARAMETROS_REQUERIDOS.filter(
      param => !nombresExistentes.has(param.nombreParametro)
    );
    
    // Identificar parámetros sin descripción
    const parametrosSinDescripcion = parametrosExistentes.filter(paramExistente => {
      return !paramExistente.descripcion || paramExistente.descripcion.trim() === '';
    });
    
    let creados = 0;
    let actualizados = 0;
    
    // Crear parámetros faltantes en lote
    if (parametrosFaltantes.length > 0) {
      console.log(`⚠️  Encontrados ${parametrosFaltantes.length} parámetros faltantes para ${tenantName}:`);
      parametrosFaltantes.forEach(param => {
        console.log(`   - ${param.nombreParametro}: ${param.explicacion}`);
      });
      
      const parametrosACrear = parametrosFaltantes.map(param => ({
        nombreParametro: param.nombreParametro,
        valorParametro: param.valorDefecto,
        descripcion: param.descripcion,
        verEnMenu: param.verEnMenu || false, // Usar el valor definido o false por defecto
        eliminado: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await ParametrosGlobales.bulkCreate(parametrosACrear);
      creados = parametrosFaltantes.length;
      console.log(`✅ Creados ${creados} parámetros globales para ${tenantName}`);
    }
    
    // Actualizar descripciones faltantes
    if (parametrosSinDescripcion.length > 0) {
      console.log(`⚠️  Encontrados ${parametrosSinDescripcion.length} parámetros sin descripción para ${tenantName}`);
      
      for (const paramExistente of parametrosSinDescripcion) {
        const paramRequerido = PARAMETROS_REQUERIDOS.find(
          p => p.nombreParametro === paramExistente.nombreParametro
        );
        
        if (paramRequerido && paramRequerido.descripcion) {
          await ParametrosGlobales.update(
            { 
              descripcion: paramRequerido.descripcion,
              updatedAt: new Date()
            },
            { 
              where: { 
                nombreParametro: paramExistente.nombreParametro,
                eliminado: false
              }
            }
          );
          actualizados++;
          console.log(`   - ${paramExistente.nombreParametro}: agregada descripción "${paramRequerido.descripcion}"`);
        }
      }
      
      console.log(`✅ Actualizadas ${actualizados} descripciones para ${tenantName}`);
    }
    
    if (parametrosFaltantes.length === 0 && parametrosSinDescripcion.length === 0) {
      console.log(`✅ Todos los parámetros globales están completos para ${tenantName}`);
    }
    
    return {
      creados,
      actualizados,
      parametros: parametrosFaltantes.map(p => p.nombreParametro)
    };
    
  } catch (error) {
    console.error(`❌ Error validando parámetros globales para ${tenantName}:`, error);
    throw error;
  }
}

/**
 * Agrega un nuevo parámetro a la lista de requeridos
 * Útil para desarrollo dinámico
 * @param {string} nombreParametro - Nombre único del parámetro
 * @param {any} valorDefecto - Valor por defecto
 * @param {string} explicacion - Explicación técnica para desarrolladores
 * @param {string} descripcion - Descripción amigable para mostrar en la interfaz
 * @param {boolean} verEnMenu - Si el parámetro debe ser visible en el menú de configuración
 */
function agregarParametroRequerido(nombreParametro, valorDefecto, explicacion, descripcion = null, verEnMenu = false) {
  const existe = PARAMETROS_REQUERIDOS.find(p => p.nombreParametro === nombreParametro);
  if (existe) {
    console.warn(`⚠️  Parámetro ${nombreParametro} ya existe en la lista de requeridos`);
    return false;
  }
  
  PARAMETROS_REQUERIDOS.push({
    nombreParametro,
    valorDefecto,
    explicacion,
    descripcion: descripcion || explicacion, // Si no se proporciona descripcion, usar explicacion
    verEnMenu
  });
  
  console.log(`➕ Agregado parámetro requerido: ${nombreParametro}`);
  return true;
}

/**
 * Obtiene la lista actual de parámetros requeridos
 */
function getParametrosRequeridos() {
  return [...PARAMETROS_REQUERIDOS];
}

module.exports = {
  validarYCrearParametrosGlobales,
  agregarParametroRequerido,
  getParametrosRequeridos,
  PARAMETROS_REQUERIDOS
};
