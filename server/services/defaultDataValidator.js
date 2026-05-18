const { Sequelize } = require('sequelize');
const { transaccionModelInit } = require('../models/transaccionModel');
const { adminModelInit } = require('../models/adminModel');
const { itemModelInit } = require('../models/itemModel');
const { MENUS_ACCESO_REQUERIDOS } = require('./menuAccesoValidator');

/**
 * ====================================================================================================
 * SISTEMA DE VALIDACIÓN Y ACTUALIZACIÓN DE DATOS OBLIGATORIOS
 * ====================================================================================================
 * 
 * Este archivo define los datos que DEBEN existir y tener valores específicos en todas las bases de
 * datos de los tenants. Se ejecuta automáticamente al conectar cada tenant.
 * 
 * ⚠️ COMPORTAMIENTO:
 * 
 * 1. REGISTRO NO EXISTE → Se crea con todos los valores del archivo
 *    (útil para inicialización de nuevos tenants)
 * 
 * 2. REGISTRO YA EXISTE → Se respetan los valores existentes, EXCEPTO:
 *    - Si un campo está en NULL en la BD y el archivo tiene un valor NO-NULL → se actualiza
 *    - Si un campo tiene valor en la BD (cualquier valor, incluso diferente) → NO se toca
 *    
 *    Esto permite que cuando se agrega una columna nueva (migración), los registros existentes
 *    reciban el valor por defecto del archivo, sin sobrescribir configuraciones personalizadas.
 * 
 * - Se ejecuta DESPUÉS de las migraciones (las columnas ya deben existir)
 * 
 * ====================================================================================================
 */

/**
 * Configuración de datos requeridos por tabla
 * 
 * Estructura:
 * {
 *   nombreTabla: 'nombre_tabla_en_db',
 *   modelInit: funcionQueInicializaModelo,  // Función que retorna el modelo Sequelize
 *   registros: [
 *     {
 *       condicion: { campo: valor },  // Cómo identificar el registro (ej: { id: 1 })
 *       valores: {                    // Valores que DEBEN tener estos campos
 *         campo1: valor1,
 *         campo2: valor2
 *       },
 *       descripcionLog: 'Venta'       // Para los logs (opcional, usa condicion si no está)
 *     }
 *   ],
 *   valoresPorDefecto: {              // OPCIONAL: Valores que se aplicarán a TODOS los registros
 *     campo1: valor1,                 // que NO estén en la lista de 'registros' específicos
 *     campo2: valor2
 *   },
 *   condicionFiltro: {                // OPCIONAL: Condición para filtrar qué registros actualizar
 *     eliminado: false                 // con valoresPorDefecto (ej: solo los no eliminados)
 *   }
 * }
 */
const DATOS_REQUERIDOS = [

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                      ROL DE USUARIO                                                ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'rolUsuario',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Administrador',
          eliminado: false
        },
        descripcionLog: 'Administrador (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Vendedor',
          eliminado: false
        },
        descripcionLog: 'Vendedor (ID 2)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                         USUARIO                                                    ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'usuario',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          usuario: 'lutenteERP',
          nombre: null,
          apellido: null,
          telefono: null,
          email: null,
          dniCuitCuil: null,
          direccion: null,
          localidad: null,
          provincia: null,
          rol: 1,
          password: 'LutenteAdmin***',
          eliminado: false
        },
        descripcionLog: 'lutenteERP (ID 1)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       TIPO ENTIDAD                                                 ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'tipoEntidad',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Cliente',
          verEnCaja: true,
          verEnGasto: true,
          eliminado: false
        },
        descripcionLog: 'Cliente (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Proveedor',
          verEnCaja: true,
          verEnGasto: true,
          eliminado: false
        },
        descripcionLog: 'Proveedor (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Empleado',
          verEnCaja: true,
          verEnGasto: true,
          eliminado: false
        },
        descripcionLog: 'Empleado (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Banco',
          verEnCaja: false,
          verEnGasto: true,
          eliminado: false
        },
        descripcionLog: 'Banco (ID 4)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                          ENTIDAD                                                   ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'entidad',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Cliente Genérico',
          apellido: '',
          telefono: '',
          email: '',
          dniCuitCuil: '00000000',
          direccion: '',
          localidad: '',
          provincia: '',
          idTipoEntidad: 1,
          eliminado: false
        },
        descripcionLog: 'Cliente Genérico (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Proveedor Genérico',
          apellido: '',
          telefono: '',
          email: '',
          dniCuitCuil: '00000000',
          direccion: '',
          localidad: '',
          provincia: '',
          idTipoEntidad: 2,
          eliminado: false
        },
        descripcionLog: 'Proveedor Genérico (ID 2)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       CONDICION IVA                                                ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'condicionIva',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'IVA Responsable Inscripto',
          eliminado: false
        },
        descripcionLog: 'IVA Responsable Inscripto (ID 1)'
      },
      {
        condicion: { id: 6 },
        valores: {
          descripcion: 'Monotributo',
          eliminado: false
        },
        descripcionLog: 'Monotributo (ID 6)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Excento',
          eliminado: true
        },
        descripcionLog: 'Excento (ID 3)'
      },
      {
        condicion: { id: 5 },
        valores: {
          descripcion: 'Consumidor Final',
          eliminado: false
        },
        descripcionLog: 'Consumidor Final (ID 5)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                          MONEDA                                                    ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'moneda',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Peso',
          eliminado: false
        },
        descripcionLog: 'Peso (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Dolar',
          eliminado: false
        },
        descripcionLog: 'Dólar (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Real',
          eliminado: false
        },
        descripcionLog: 'Real (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Euro',
          eliminado: false
        },
        descripcionLog: 'Euro (ID 4)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                    TIPO MEDIO DE PAGO                                              ##
// ##   IDs 1-20: RESERVADOS PARA IMPLEMENTADORES (actualmente definidos: 1-8)                          ##
// ##   IDs 21+: Disponibles para tipos personalizados del usuario                                      ##
// ##   Nota: La secuencia se ajusta automáticamente a 21 después de crear los registros del sistema   ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'tipoMedioDePago',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Efectivo',
          verEnCaja: true,
          verEnTransaccion: true,
          esMultiMoneda: true,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Efectivo (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Debito',
          verEnCaja: true,
          verEnTransaccion: true,
          esMultiMoneda: false,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Debito (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Tarjeta de Credito',
          verEnCaja: false,
          verEnTransaccion: true,
          esMultiMoneda: false,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Tarjeta de Credito (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Billetera Virtual',
          verEnCaja: true,
          verEnTransaccion: true,
          esMultiMoneda: false,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Billetera Virtual (ID 4)'
      },
      {
        condicion: { id: 5 },
        valores: {
          descripcion: 'Cuenta Corriente',
          verEnCaja: false,
          verEnTransaccion: true,
          esMultiMoneda: false,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: true,
          eliminado: false
        },
        descripcionLog: 'Cuenta Corriente (ID 5)'
      },
      {
        condicion: { id: 6 },
        valores: {
          descripcion: 'Pago Diferido',
          verEnCaja: false,
          verEnTransaccion: true,
          esMultiMoneda: true,
          esPagoDiferido: true,
          userSelect: true,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Pago Diferido (ID 6)'
      },
      {
        condicion: { id: 7 },
        valores: {
          descripcion: 'Multiple',
          verEnCaja: false,
          verEnTransaccion: true,
          esMultiMoneda: false,
          esPagoDiferido: false,
          userSelect: false,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Multiple (ID 7)'
      },
      {
        condicion: { id: 8 },
        valores: {
          descripcion: 'Cheque',
          verEnCaja: false,
          verEnTransaccion: true,
          esMultiMoneda: true,
          esPagoDiferido: true,
          userSelect: true,
          afectaCuentaCorriente: false,
          eliminado: false
        },
        descripcionLog: 'Cheque (ID 8)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       MEDIO DE PAGO                                                ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'medioDePago',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          idTipoMedioDePago: 1,
          descripcion: 'Efectivo pesos',
          eliminado: false
        },
        descripcionLog: 'Efectivo pesos (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          idTipoMedioDePago: 2,
          descripcion: 'Debito',
          eliminado: false
        },
        descripcionLog: 'Debito (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          idTipoMedioDePago: 3,
          descripcion: 'Tarjeta de credito',
          eliminado: false
        },
        descripcionLog: 'Tarjeta de credito (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          idTipoMedioDePago: 5,
          descripcion: 'Cuenta Corriente',
          eliminado: false
        },
        descripcionLog: 'Cuenta Corriente (ID 4)'
      },
      {
        condicion: { id: 5 },
        valores: {
          idTipoMedioDePago: 3,
          descripcion: 'Visa Credito',
          eliminado: false
        },
        descripcionLog: 'Visa Credito (ID 5)'
      },
      {
        condicion: { id: 6 },
        valores: {
          idTipoMedioDePago: 1,
          descripcion: 'Efectivo Dolares',
          eliminado: false
        },
        descripcionLog: 'Efectivo Dolares (ID 6)'
      },
      {
        condicion: { id: 7 },
        valores: {
          idTipoMedioDePago: 3,
          descripcion: 'Master',
          eliminado: false
        },
        descripcionLog: 'Master (ID 7)'
      },
      {
        condicion: { id: 8 },
        valores: {
          idTipoMedioDePago: 4,
          descripcion: 'Modo',
          eliminado: false
        },
        descripcionLog: 'Modo (ID 8)'
      },
      {
        condicion: { id: 9 },
        valores: {
          idTipoMedioDePago: 4,
          descripcion: 'Naranja X',
          eliminado: false
        },
        descripcionLog: 'Naranja X (ID 9)'
      },
      {
        condicion: { id: 10 },
        valores: {
          idTipoMedioDePago: 4,
          descripcion: 'Mercado Pago',
          eliminado: false
        },
        descripcionLog: 'Mercado Pago (ID 10)'
      },
      {
        condicion: { id: 11 },
        valores: {
          idTipoMedioDePago: 4,
          descripcion: 'Billetera Santa Fe',
          eliminado: false
        },
        descripcionLog: 'Billetera Santa Fe (ID 11)'
      },
      {
        condicion: { id: 12 },
        valores: {
          idTipoMedioDePago: 8,
          descripcion: 'Cheque',
          eliminado: false
        },
        descripcionLog: 'Cheque (ID 12)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       TIPO FACTURA                                                 ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'tipoFactura',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'A',
          eliminado: false
        },
        descripcionLog: 'Factura A (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'B',
          eliminado: false
        },
        descripcionLog: 'Factura B (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'C',
          eliminado: true
        },
        descripcionLog: 'Factura C (ID 3)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       ESTADO COMPRA                                                ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'estadoCompra',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Abierta',
          eliminado: false
        },
        descripcionLog: 'Abierta (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Incompleta',
          eliminado: false
        },
        descripcionLog: 'Incompleta (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Cerrada',
          eliminado: false
        },
        descripcionLog: 'Cerrada (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Saldo Pendiente',
          eliminado: false
        },
        descripcionLog: 'Saldo Pendiente (ID 4)'
      },
      {
        condicion: { id: 5 },
        valores: {
          descripcion: 'Stock Pendiente',
          eliminado: false
        },
        descripcionLog: 'Stock Pendiente (ID 5)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                         IMPUESTO                                                   ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'impuesto',
    modelInit: transaccionModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'IVA',
          porcentaje: 21.0,
          incluidoEnPrecio: true,
          eliminado: false
        },
        descripcionLog: 'IVA 21% (ID 1)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                    TIPOS DE TRANSACCIÓN                                            ##
// ##   IDs 1-20: RESERVADOS PARA EL SISTEMA (actualmente definidos: 1-9)    client/src/components/transaccionComponent/TablaTipoTransaccionComponent.js                          ##
// ##   IDs 21+: Disponibles para tipos personalizados del usuario                                      ##
// ##   Nota: La secuencia se ajusta automáticamente a 21 después de crear los registros del sistema   ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'tipoTransaccion',
    modelInit: transaccionModelInit,
    // Valores por defecto para TODOS los registros que no estén en la lista específica
    // Se aplicará a tipos personalizados (ID >= 21) y cualquier otro que no esté definido arriba
    valoresPorDefecto: {
      // Estos campos se actualizarán en TODOS los registros que no estén en 'registros'
      // Si un registro ya tiene estos valores, no se toca
      verEnCaja: false,
      verEnColumna: null
    },
    // Solo actualizar registros no eliminados
    condicionFiltro: {
      eliminado: false
    },
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Venta',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: '-',
          operacionCaja: '+',
          verEnCaja: false,
          verEnColumna: 'Ingreso'
        },
        descripcionLog: 'Venta (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Compra',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: '+',
          operacionCaja: '-',
          verEnCaja: false,
          verEnColumna: 'Egreso'
        },
        descripcionLog: 'Compra (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Presupuesto',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: null,
          verEnCaja: false,
          verEnColumna: null
        },
        descripcionLog: 'Presupuesto (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Ingreso',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: '-',
          operacionCaja: '+',
          verEnCaja: true,
          verEnColumna: 'Ingreso'
        },
        descripcionLog: 'Ingreso (ID 4)'
      },
      {
        condicion: { id: 5 },
        valores: {
          descripcion: 'Egreso',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: '+',
          operacionCaja: '-',
          verEnCaja: true,
          verEnColumna: 'Egreso'
        },
        descripcionLog: 'Egreso (ID 5)'
      },
      {
        condicion: { id: 6 },
        valores: {
          descripcion: 'Devolución',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: null,
          verEnCaja: false,
          verEnColumna: null
        },
        descripcionLog: 'Devolución (ID 6)'
      },
      {
        condicion: { id: 7 },
        valores: {
          descripcion: 'Transferencia Interna OR',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: '-',
          verEnCaja: false, // No aparece en dropdown (se maneja por parámetro global)
          verEnColumna: 'Egreso'
        },
        descripcionLog: 'Transferencia Interna Origen (ID 7)'
      },
      {
        condicion: { id: 8 },
        valores: {
          descripcion: 'Transferencia Interna DE',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: '+',
          verEnCaja: false, // No aparece en dropdown (se maneja por parámetro global)
          verEnColumna: 'Ingreso'
        },
        descripcionLog: 'Transferencia Interna Destino (ID 8)'
      },
      {
        condicion: { id: 9 },
        valores: {
          descripcion: 'Cuenta Corriente',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: '+', // ✅ SIEMPRE '+' (genera deuda): se usa cuando el gasto afecta CC
          operacionCaja: null,            // ❌ NO afecta caja (no es movimiento de efectivo real)
          verEnCaja: false,               // ❌ NO aparece en dropdown de caja
          verEnColumna: null              // ❌ NO aparece en reportes de caja (filtrado automático) 
        },
        descripcionLog: 'Cuenta Corriente (ID 9)'
      },      
      {
        condicion: { id: 10 },
        valores: {
          descripcion: 'PreVenta',
          eliminado: false,
          verEnTransaccion: false,
          operacionCuentaCorriente: null, // 
          operacionCaja: null,            //
          verEnCaja: false,               // 
          verEnColumna: null              // 
        },
        descripcionLog: 'PreVenta (ID 10)'
      },
      {
        condicion: { id: 11 },
        valores: {
          descripcion: 'Factura Arca',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: null,
          verEnCaja: false,
          verEnColumna: null
        },
        descripcionLog: 'Factura Arca (ID 11)'
      },
      {
        condicion: { id: 12 },
        valores: {
          descripcion: 'Retención ARCA',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: null,
          verEnCaja: false,
          verEnColumna: null
        },
        descripcionLog: 'Retención ARCA (ID 12)'
      },
      {
        condicion: { id: 13 },
        valores: {
          descripcion: 'Pedido',
          eliminado: false,
          verEnTransaccion: true,
          operacionCuentaCorriente: null,
          operacionCaja: null,
          verEnCaja: false,
          verEnColumna: null
        },
        descripcionLog: 'Pedido'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                       ITEM ATRIBUTO                                                ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'itemAtributo',
    modelInit: itemModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Nombre',
          eliminado: false
        },
        descripcionLog: 'Atributo 1 (ID 1)'
      },
      {
        condicion: { id: 2 },
        valores: {
          descripcion: 'Nombre',
          eliminado: false
        },
        descripcionLog: 'Atributo 2 (ID 2)'
      },
      {
        condicion: { id: 3 },
        valores: {
          descripcion: 'Nombre',
          eliminado: false
        },
        descripcionLog: 'Atributo 3 (ID 3)'
      },
      {
        condicion: { id: 4 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 4 (ID 4) - eliminado'
      },
      {
        condicion: { id: 5 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 5 (ID 5) - eliminado'
      },
      {
        condicion: { id: 6 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 6 (ID 6) - eliminado'
      },
      {
        condicion: { id: 7 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 7 (ID 7) - eliminado'
      },
      {
        condicion: { id: 8 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 8 (ID 8) - eliminado'
      },
      {
        condicion: { id: 9 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 9 (ID 9) - eliminado'
      },
      {
        condicion: { id: 10 },
        valores: {
          descripcion: 'Nombre',
          eliminado: true
        },
        descripcionLog: 'Atributo 10 (ID 10) - eliminado'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                     ENTIDAD ATRIBUTO                                               ##
// ##     REMOVIDO - Se gestiona dinámicamente desde el componente GestionEntidadComponent             ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                         UBICACION                                                  ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'ubicacion',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Sucursal 1',
          eliminado: false
        },
        descripcionLog: 'Sucursal 1 (ID 1)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                          NEGOCIO                                                   ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'negocio',
    modelInit: adminModelInit,
    registros: [
      {
        condicion: { id: 1 },
        valores: {
          descripcion: 'Negocio 1',
          eliminado: false
        },
        descripcionLog: 'Negocio 1 (ID 1)'
      }
    ]
  },

// ########################################################################################################
// ########################################################################################################
// ##                                                                                                    ##
// ##                                        ROL ACCESO                                                  ##
// ##   Permisos del rol Administrador (ID 1) a todos los menús del sistema                             ##
// ##                                                                                                    ##
// ########################################################################################################
// ########################################################################################################

  {
    nombreTabla: 'rolAcceso',
    modelInit: adminModelInit,
    registros: [
      // ═══════════════════════════════════════════════════════════════════════════════════
      // DASHBOARD
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'DASHBOARD' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → DASHBOARD'
      },

      // ═══════════════════════════════════════════════════════════════════════════════════
      // VENTAS
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS1' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS1 (Crear Venta)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS2' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS2 (Ver Ventas)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS3' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS3 (Crear Presupuesto)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS4' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS4 (Ver Presupuesto)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS5' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS5 (Ver Ventas Detalle)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS6' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS6 (Ver Presupuesto Detalle)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS7' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS7 (Ver Cliente)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS8' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS8 (Lista Precio; navegación bajo Inventario)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS9' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → VENTAS9 (Pedidos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS10' },
        valores: { eliminado: true },
        descripcionLog: 'Admin → VENTAS10 (Crear Venta Nuevo)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS11' },
        valores: { eliminado: true },
        descripcionLog: 'Admin → VENTAS11 (Crear Preventa)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'VENTAS12' },
        valores: { eliminado: true },
        descripcionLog: 'Admin → VENTAS12 (Ver Preventa)'
      },

      // ═══════════════════════════════════════════════════════════════════════════════════
      // INVENTARIO
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO1' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO1 (Crear Item)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO2' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO2 (Crear Receta)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO3' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO3 (Stock)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO4' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO4 (Atributos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'INVENTARIO5' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → INVENTARIO5 (Recetas)'
      },

      // ═══════════════════════════════════════════════════════════════════════════════════
      // COMPRAS
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS_GRUPO_COMPRAS' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS_GRUPO_COMPRAS (nodo grupo crear/listado/detalle)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS1' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS1 (Crear Compra)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS2' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS2 (Ver Compras)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS3' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS3 (Ver Compra Detalle)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS4' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS4 (Proveedores)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'COMPRAS5' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → COMPRAS5 (Lista Costo; navegación bajo Inventario)'
      },

      // ═══════════════════════════════════════════════════════════════════════════════════
      // Administración (menú padre id TRANSACCION; submenús TRANSACCIONES*)
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCION' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCION (Administración)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES1' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES1 (Medios de pago)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES2' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES2 (Tipos de transaccion)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES3' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES3 (Crear Transaccion - deprecated)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES5' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES5 (Transacciones)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES6' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES6 (Cuentas Corrientes)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES7' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES7 (Ventas ARCA)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES8' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES8 (Analíticos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES9' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES9 (Gastos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES10' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → TRANSACCIONES10 (Caja)'
      },

      // ═══════════════════════════════════════════════════════════════════════════════════
      // Configuración (menú padre id ADMINISTRACION)
      // ═══════════════════════════════════════════════════════════════════════════════════
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION (Configuración)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION1' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION1 (Monedas)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION2' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION2 (Impuestos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION3' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION3 (Categoria Gastos)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION5' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION5 (General)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION6' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION6 (Entidad)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION7' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION7 (Usuarios)'
      },
      {
        condicion: { idRolUsuario: 1, idMenuAcceso: 'ADMINISTRACION8' },
        valores: { eliminado: false },
        descripcionLog: 'Admin → ADMINISTRACION8 (Gestion de accesos)'
      }
    ]
  }

];

/**
 * ====================================================================================================
 * FUNCIÓN PRINCIPAL: Valida y actualiza datos requeridos
 * ====================================================================================================
 * 
 * @param {Object} sequelize - Instancia de Sequelize del tenant
 * @param {string} tenantName - Nombre del tenant para logging
 * @returns {Object} Estadísticas de la operación
 */
async function validarYActualizarDatosRequeridos(sequelize, tenantName = 'unknown') {
  try {
    console.log(`🔍 [${tenantName}] Validando datos requeridos del sistema...`);
    
    let totalActualizados = 0;
    let totalCreados = 0;
    let totalValidados = 0;
    const detalles = [];
    
    // Procesar cada tabla configurada
    for (const configuracionTabla of DATOS_REQUERIDOS) {
      const { nombreTabla, modelInit, registros } = configuracionTabla;
      
      try {
        // Inicializar modelo
        const modelos = modelInit(sequelize);
        const Modelo = modelos[Object.keys(modelos).find(key => 
          modelos[key].tableName === nombreTabla || 
          modelos[key].name === nombreTabla ||
          key.toLowerCase() === nombreTabla.toLowerCase()
        )];
        
        if (!Modelo) {
          console.warn(`⚠️  [${tenantName}] No se encontró modelo para tabla: ${nombreTabla}`);
          continue;
        }
        
        const { valoresPorDefecto, condicionFiltro } = configuracionTabla;
        
        console.log(`📋 [${tenantName}] Validando tabla: ${nombreTabla} (${registros.length} registros específicos)`);
        if (valoresPorDefecto) {
          console.log(`   📌 Aplicando valores por defecto a registros adicionales`);
        }
        
        let actualizadosTabla = 0;
        let creadosTabla = 0;
        let validadosTabla = 0;
        let actualizadosPorDefecto = 0;
        
        // Obtener IDs de registros específicos para excluirlos del procesamiento por defecto
        const idsRegistrosEspecificos = new Set();
        registros.forEach(reg => {
          if (reg.condicion.id) {
            idsRegistrosEspecificos.add(reg.condicion.id);
          }
        });
        
        // Procesar cada registro requerido específico
        for (const registroConfig of registros) {
          const { condicion, valores, descripcionLog } = registroConfig;
          const logName = descripcionLog || JSON.stringify(condicion);
          
          try {
            // Buscar registro existente
            const registroExistente = await Modelo.findOne({ where: condicion });
            
            if (registroExistente) {
              // Registro existe - solo actualizar campos que estén en NULL y tengan valor no-null en el archivo
              const camposAActualizar = [];
              const valoresParaUpdate = {};
              
              for (const [campo, valorEsperado] of Object.entries(valores)) {
                const valorActual = registroExistente[campo];
                
                // Solo actualizar si: el campo está en NULL en la BD Y el archivo tiene valor NO-NULL
                if (esValorNulo(valorActual) && !esValorNulo(valorEsperado)) {
                  camposAActualizar.push({
                    campo,
                    actual: valorActual,
                    esperado: valorEsperado
                  });
                  valoresParaUpdate[campo] = valorEsperado;
                }
                // Si el campo tiene valor en la BD (no null), se respeta aunque difiera del archivo
              }
              
              if (camposAActualizar.length > 0) {
                // Actualizar solo los campos que estaban en null
                await registroExistente.update(valoresParaUpdate);
                actualizadosTabla++;
                
                console.log(`   🔧 [${tenantName}] Actualizado (campos null → valor): ${logName}`);
                camposAActualizar.forEach(({ campo, actual, esperado }) => {
                  console.log(`      • ${campo}: ${formatearValor(actual)} → ${formatearValor(esperado)}`);
                });
              } else {
                // Ya está correcto o tiene valores personalizados
                validadosTabla++;
              }
              
            } else {
              // Registro no existe - crear
              await Modelo.create({
                ...condicion,
                ...valores,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              creadosTabla++;
              
              console.log(`   ➕ [${tenantName}] Creado: ${logName}`);
            }
            
          } catch (error) {
            console.error(`   ❌ [${tenantName}] Error procesando ${logName}:`, error.message);
          }
        }
        
        // Procesar registros adicionales con valores por defecto (si está configurado)
        if (valoresPorDefecto && Object.keys(valoresPorDefecto).length > 0) {
          try {
            // Construir condición WHERE para buscar registros adicionales
            const whereCondicion = {
              ...condicionFiltro,
              // Excluir los registros específicos ya procesados
              ...(idsRegistrosEspecificos.size > 0 && {
                id: { [Sequelize.Op.notIn]: Array.from(idsRegistrosEspecificos) }
              })
            };
            
            // Buscar todos los registros que no están en la lista específica
            const registrosAdicionales = await Modelo.findAll({ where: whereCondicion });
            
            if (registrosAdicionales.length > 0) {
              console.log(`   🔍 [${tenantName}] Encontrados ${registrosAdicionales.length} registros adicionales para actualizar con valores por defecto`);
              
              for (const registro of registrosAdicionales) {
                const camposAActualizar = [];
                const valoresParaUpdate = {};
                
                // Solo actualizar campos que estén en NULL y tengan valor no-null en valoresPorDefecto
                for (const [campo, valorEsperado] of Object.entries(valoresPorDefecto)) {
                  const valorActual = registro[campo];
                  
                  // Solo actualizar si: el campo está en NULL en la BD Y el archivo tiene valor NO-NULL
                  if (esValorNulo(valorActual) && !esValorNulo(valorEsperado)) {
                    camposAActualizar.push({
                      campo,
                      actual: valorActual,
                      esperado: valorEsperado
                    });
                    valoresParaUpdate[campo] = valorEsperado;
                  }
                  // Si el campo tiene valor en la BD (no null), se respeta
                }
                
                if (camposAActualizar.length > 0) {
                  // Actualizar solo los campos que estaban en null
                  await registro.update(valoresParaUpdate);
                  actualizadosPorDefecto++;
                  
                  const logName = registro.descripcion || `ID ${registro.id}`;
                  console.log(`   🔧 [${tenantName}] Actualizado (por defecto, null → valor): ${logName}`);
                  camposAActualizar.forEach(({ campo, actual, esperado }) => {
                    console.log(`      • ${campo}: ${formatearValor(actual)} → ${formatearValor(esperado)}`);
                  });
                }
              }
              
              if (actualizadosPorDefecto === 0) {
                console.log(`   ✅ [${tenantName}] Todos los registros adicionales ya tienen los valores por defecto correctos`);
              }
            } else {
              console.log(`   ℹ️  [${tenantName}] No hay registros adicionales para actualizar`);
            }
            
          } catch (error) {
            console.error(`   ❌ [${tenantName}] Error procesando registros adicionales:`, error.message);
          }
        }
        
        // Resumen de la tabla
        totalActualizados += actualizadosTabla + actualizadosPorDefecto;
        totalCreados += creadosTabla;
        totalValidados += validadosTabla;
        
        if (actualizadosTabla > 0 || creadosTabla > 0 || actualizadosPorDefecto > 0) {
          let mensaje = `${nombreTabla}: ${creadosTabla} creados, ${actualizadosTabla} actualizados (específicos)`;
          if (actualizadosPorDefecto > 0) {
            mensaje += `, ${actualizadosPorDefecto} actualizados (por defecto)`;
          }
          mensaje += `, ${validadosTabla} correctos`;
          detalles.push(mensaje);
          console.log(`   ✅ [${tenantName}] ${mensaje}`);
        } else {
          console.log(`   ✅ [${tenantName}] ${nombreTabla}: Todos los registros (${validadosTabla}) están correctos`);
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════════
        // PROCESAMIENTO ESPECIAL: tipoTransaccion - Reservar IDs 1-20 para el sistema
        // ═══════════════════════════════════════════════════════════════════════════════════
        if (nombreTabla === 'tipoTransaccion') {
          try {
            console.log(`   🔢 [${tenantName}] Verificando secuencia de IDs para tipoTransaccion...`);
            
            // Obtener el valor actual de la secuencia
            const dialectName = sequelize.getDialect();
            let currentSequence = null;
            
            if (dialectName === 'postgres') {
              // PostgreSQL
              const [result] = await sequelize.query(
                `SELECT last_value FROM "tipoTransaccion_id_seq"`
              );
              currentSequence = parseInt(result[0]?.last_value || 0);
              
              if (currentSequence < 21) {
                await sequelize.query(
                  `ALTER SEQUENCE "tipoTransaccion_id_seq" RESTART WITH 21`
                );
                console.log(`   ✅ [${tenantName}] Secuencia ajustada: ${currentSequence} → 21 (IDs 1-20 reservados para el sistema)`);
              } else {
                console.log(`   ✅ [${tenantName}] Secuencia ya está en ${currentSequence} (IDs 1-20 reservados)`);
              }
              
            } else if (dialectName === 'mysql' || dialectName === 'mariadb') {
              // MySQL/MariaDB
              const [result] = await sequelize.query(
                `SELECT AUTO_INCREMENT FROM information_schema.TABLES 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipoTransaccion'`
              );
              currentSequence = parseInt(result[0]?.AUTO_INCREMENT || 0);
              
              if (currentSequence < 21) {
                await sequelize.query(
                  `ALTER TABLE tipoTransaccion AUTO_INCREMENT = 21`
                );
                console.log(`   ✅ [${tenantName}] AUTO_INCREMENT ajustado: ${currentSequence} → 21 (IDs 1-20 reservados para el sistema)`);
              } else {
                console.log(`   ✅ [${tenantName}] AUTO_INCREMENT ya está en ${currentSequence} (IDs 1-20 reservados)`);
              }
              
            } else {
              console.log(`   ⚠️  [${tenantName}] Dialect ${dialectName} no soportado para ajuste de secuencia`);
            }
            
          } catch (error) {
            // No es crítico si falla, solo loguear warning
            console.warn(`   ⚠️  [${tenantName}] No se pudo ajustar secuencia de tipoTransaccion:`, error.message);
          }
        }
        
        // ═══════════════════════════════════════════════════════════════════════════════════
        // PROCESAMIENTO ESPECIAL: tipoMedioDePago - Reservar IDs 1-20 para implementadores
        // ═══════════════════════════════════════════════════════════════════════════════════
        if (nombreTabla === 'tipoMedioDePago') {
          try {
            console.log(`   🔢 [${tenantName}] Verificando secuencia de IDs para tipoMedioDePago...`);
            
            // Obtener el valor actual de la secuencia
            const dialectName = sequelize.getDialect();
            let currentSequence = null;
            
            if (dialectName === 'postgres') {
              // PostgreSQL
              const [result] = await sequelize.query(
                `SELECT last_value FROM "tipoMedioDePago_id_seq"`
              );
              currentSequence = parseInt(result[0]?.last_value || 0);
              
              if (currentSequence < 21) {
                await sequelize.query(
                  `ALTER SEQUENCE "tipoMedioDePago_id_seq" RESTART WITH 21`
                );
                console.log(`   ✅ [${tenantName}] Secuencia ajustada: ${currentSequence} → 21 (IDs 1-20 reservados para implementadores)`);
              } else {
                console.log(`   ✅ [${tenantName}] Secuencia ya está en ${currentSequence} (IDs 1-20 reservados)`);
              }
              
            } else if (dialectName === 'mysql' || dialectName === 'mariadb') {
              // MySQL/MariaDB
              const [result] = await sequelize.query(
                `SELECT AUTO_INCREMENT FROM information_schema.TABLES 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipoMedioDePago'`
              );
              currentSequence = parseInt(result[0]?.AUTO_INCREMENT || 0);
              
              if (currentSequence < 21) {
                await sequelize.query(
                  `ALTER TABLE tipoMedioDePago AUTO_INCREMENT = 21`
                );
                console.log(`   ✅ [${tenantName}] AUTO_INCREMENT ajustado: ${currentSequence} → 21 (IDs 1-20 reservados para implementadores)`);
              } else {
                console.log(`   ✅ [${tenantName}] AUTO_INCREMENT ya está en ${currentSequence} (IDs 1-20 reservados)`);
              }
              
            } else {
              console.log(`   ⚠️  [${tenantName}] Dialect ${dialectName} no soportado para ajuste de secuencia`);
            }
            
          } catch (error) {
            // No es crítico si falla, solo loguear warning
            console.warn(`   ⚠️  [${tenantName}] No se pudo ajustar secuencia de tipoMedioDePago:`, error.message);
          }
        }
        
      } catch (error) {
        console.error(`❌ [${tenantName}] Error procesando tabla ${nombreTabla}:`, error.message);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // PROCESAMIENTO ESPECIAL: rolFuncionalidadAcceso
    // Crear permisos para el Administrador (ID 1) en todas las funcionalidades con defaultActive: true
    // ═══════════════════════════════════════════════════════════════════════════════════
    try {
      const modelos = adminModelInit(sequelize);
      const { RolFuncionalidadAcceso } = modelos;
      
      if (RolFuncionalidadAcceso) {
        console.log(`📋 [${tenantName}] Validando tabla: rolFuncionalidadAcceso (funcionalidades con defaultActive)`);
        
        // Obtener todas las funcionalidades con defaultActive: true de MENUS_ACCESO_REQUERIDOS
        const funcionalidadesDefaultActive = [];
        for (const menu of MENUS_ACCESO_REQUERIDOS) {
          if (menu.funcionalidades && menu.funcionalidades.length > 0) {
            for (const func of menu.funcionalidades) {
              if (func.defaultActive === true) {
                funcionalidadesDefaultActive.push({
                  idMenuAcceso: menu.id,
                  idSector: func.id,
                  descripcion: func.descripcion
                });
              }
            }
          }
        }
        
        if (funcionalidadesDefaultActive.length === 0) {
          console.log(`   ℹ️  [${tenantName}] No hay funcionalidades con defaultActive: true`);
        } else {
          // Verificar cuáles ya existen para el Administrador (ID 1)
          const permisosExistentes = await RolFuncionalidadAcceso.findAll({
            where: { idRolUsuario: 1 },
            attributes: ['idMenuAcceso', 'idSector', 'eliminado']
          });
          
          const mapPermisosExistentes = new Map(
            permisosExistentes.map(p => [`${p.idMenuAcceso}|${p.idSector}`, p])
          );
          
          // Crear los que no existen
          let creadosFuncionalidad = 0;
          for (const func of funcionalidadesDefaultActive) {
            const clave = `${func.idMenuAcceso}|${func.idSector}`;
            const permisoExistente = mapPermisosExistentes.get(clave);
            
            if (!permisoExistente) {
              // No existe, crear
              await RolFuncionalidadAcceso.create({
                idRolUsuario: 1,
                idMenuAcceso: func.idMenuAcceso,
                idSector: func.idSector,
                eliminado: false,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              creadosFuncionalidad++;
              console.log(`   ➕ [${tenantName}] Creado: Admin → ${func.idSector} (${func.descripcion})`);
            }
            // Si existe, se respeta (no se toca aunque esté eliminado)
          }
          
          totalCreados += creadosFuncionalidad;
          
          if (creadosFuncionalidad > 0) {
            console.log(`   ✅ [${tenantName}] rolFuncionalidadAcceso: ${creadosFuncionalidad} permisos creados para Administrador`);
          } else {
            console.log(`   ✅ [${tenantName}] rolFuncionalidadAcceso: Todos los permisos (${funcionalidadesDefaultActive.length}) ya existen`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [${tenantName}] Error procesando rolFuncionalidadAcceso:`, error.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // PROCESAMIENTO ESPECIAL: funcionalidades TRANSACCIONES9 (Gastos) para Administrador
    // Estas funcionalidades son defaultActive: false pero el admin debe tenerlas desde
    // el primer arranque para no perder acceso a las acciones básicas del módulo.
    // ═══════════════════════════════════════════════════════════════════════════════════
    try {
      const modelos = adminModelInit(sequelize);
      const { RolFuncionalidadAcceso } = modelos;

      if (RolFuncionalidadAcceso) {
        const funcionalidadesAdminGastos = [
          { idMenuAcceso: 'TRANSACCIONES9', idSector: 'montoTotalGastos', descripcion: 'Monto total gastos' },
          { idMenuAcceso: 'TRANSACCIONES9', idSector: 'btnCrearGasto',    descripcion: 'Crear gasto' },
          { idMenuAcceso: 'TRANSACCIONES9', idSector: 'btnEditarGasto',   descripcion: 'Editar gasto' },
          { idMenuAcceso: 'TRANSACCIONES9', idSector: 'btnDuplicarGasto', descripcion: 'Duplicar gasto' },
          { idMenuAcceso: 'TRANSACCIONES9', idSector: 'btnEliminarGasto', descripcion: 'Eliminar gasto' },
        ];

        const existentes = await RolFuncionalidadAcceso.findAll({
          where: { idRolUsuario: 1, idMenuAcceso: 'TRANSACCIONES9' },
          attributes: ['idSector']
        });
        const sectoresExistentes = new Set(existentes.map(e => e.idSector));

        let creados = 0;
        for (const func of funcionalidadesAdminGastos) {
          if (!sectoresExistentes.has(func.idSector)) {
            await RolFuncionalidadAcceso.create({
              idRolUsuario: 1,
              idMenuAcceso: func.idMenuAcceso,
              idSector: func.idSector,
              eliminado: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            creados++;
            console.log(`   ➕ [${tenantName}] Creado: Admin → ${func.idSector} (${func.descripcion})`);
          }
        }
        totalCreados += creados;
        if (creados > 0) {
          console.log(`   ✅ [${tenantName}] TRANSACCIONES9 funcionalidades: ${creados} permisos creados para Administrador`);
        } else {
          console.log(`   ✅ [${tenantName}] TRANSACCIONES9 funcionalidades: todos los permisos ya existen`);
        }
      }
    } catch (error) {
      console.error(`❌ [${tenantName}] Error procesando funcionalidades TRANSACCIONES9:`, error.message);
    }

    // Resumen final
    if (totalActualizados === 0 && totalCreados === 0) {
      console.log(`✅ [${tenantName}] Todos los datos requeridos están completos y actualizados`);
    } else {
      console.log(`✅ [${tenantName}] Validación completada: ${totalCreados} creados, ${totalActualizados} actualizados, ${totalValidados} correctos`);
    }
    
    return {
      creados: totalCreados,
      actualizados: totalActualizados,
      validados: totalValidados,
      detalles
    };
    
  } catch (error) {
    console.error(`❌ [${tenantName}] Error validando datos requeridos:`, error);
    throw error;
  }
}

/**
 * ====================================================================================================
 * FUNCIONES AUXILIARES
 * ====================================================================================================
 */

/**
 * Verifica si un valor es nulo (null o undefined)
 * Se usa para determinar si un campo necesita ser actualizado
 */
function esValorNulo(valor) {
  return valor === null || valor === undefined;
}

/**
 * Compara dos valores de forma flexible (maneja null, undefined, tipos, etc.)
 */
function valoresIguales(valor1, valor2) {
  // null y undefined se consideran iguales
  if ((valor1 === null || valor1 === undefined) && (valor2 === null || valor2 === undefined)) {
    return true;
  }
  
  // Si uno es null/undefined y el otro no, son diferentes
  if ((valor1 === null || valor1 === undefined) !== (valor2 === null || valor2 === undefined)) {
    return false;
  }
  
  // Comparación estricta
  return valor1 === valor2;
}

/**
 * Formatea un valor para mostrarlo en logs
 */
function formatearValor(valor) {
  if (valor === null) return 'null';
  if (valor === undefined) return 'undefined';
  if (typeof valor === 'string') return `"${valor}"`;
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  return String(valor);
}

/**
 * ====================================================================================================
 * FUNCIONES DE UTILIDAD PARA DESARROLLO
 * ====================================================================================================
 */

/**
 * Agrega un nuevo registro requerido a una tabla existente
 * Útil para desarrollo dinámico
 */
function agregarRegistroRequerido(nombreTabla, condicion, valores, descripcionLog = null) {
  const tabla = DATOS_REQUERIDOS.find(t => t.nombreTabla === nombreTabla);
  
  if (!tabla) {
    console.warn(`⚠️  Tabla ${nombreTabla} no encontrada en DATOS_REQUERIDOS`);
    return false;
  }
  
  const existe = tabla.registros.find(r => 
    JSON.stringify(r.condicion) === JSON.stringify(condicion)
  );
  
  if (existe) {
    console.warn(`⚠️  Registro con condición ${JSON.stringify(condicion)} ya existe en ${nombreTabla}`);
    return false;
  }
  
  tabla.registros.push({
    condicion,
    valores,
    descripcionLog
  });
  
  console.log(`➕ Agregado registro requerido a ${nombreTabla}: ${descripcionLog || JSON.stringify(condicion)}`);
  return true;
}

/**
 * Obtiene la lista actual de datos requeridos
 */
function getDatosRequeridos() {
  return JSON.parse(JSON.stringify(DATOS_REQUERIDOS)); // Deep copy
}

/**
 * Obtiene estadísticas de la configuración
 */
function getEstadisticas() {
  const stats = {
    totalTablas: DATOS_REQUERIDOS.length,
    totalRegistros: 0,
    tablas: []
  };
  
  DATOS_REQUERIDOS.forEach(tabla => {
    stats.totalRegistros += tabla.registros.length;
    stats.tablas.push({
      nombre: tabla.nombreTabla,
      registros: tabla.registros.length
    });
  });
  
  return stats;
}

module.exports = {
  validarYActualizarDatosRequeridos,
  agregarRegistroRequerido,
  getDatosRequeridos,
  getEstadisticas,
  DATOS_REQUERIDOS
};
