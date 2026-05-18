const { adminModelInit } = require('../models/adminModel');

/**
 * Lista de menús de acceso y funcionalidades requeridos para el funcionamiento del sistema
 * 
 * ⚠️ IMPORTANTE PARA DESARROLLADORES:
 * Cuando agregues una nueva funcionalidad que requiera acceso controlado:
 * 1. Añade el nuevo menú a este array siguiendo las convenciones:
 *    - Menú principal: ID sin número (ej: "VENTAS", "COMPRAS")
 *    - Submenú: ID del padre + número secuencial (ej: "VENTAS1", "VENTAS2")
 * 2. Para control granular (botones, columnas, etc), añade array 'funcionalidades'
 * 3. El sistema automáticamente creará menús Y funcionalidades NUEVOS en todos los tenants
 * 4. Los administradores podrán asignar estos permisos en /gestionarAccesos
 * 
 * 🔒 POLÍTICA DE NO-SOBRESCRITURA:
 * - Los registros que YA EXISTEN en un tenant NO se modifican
 * - Solo se CREAN registros nuevos que no existen
 * - Esto respeta las configuraciones personalizadas de cada tenant
 * 
 * ESTRUCTURA:
 * - id: Identificador único del menú (STRING) - Usar MAYÚSCULAS
 * - descripcion: Texto descriptivo que se muestra en la UI
 * - eliminado: false para menús activos, true para menús deprecados
 * - funcionalidades: Array opcional de controles granulares dentro del menú
 *   └─ id: ID único de la funcionalidad (ej: "montoFinalCaja")
 *   └─ descripcion: Texto descriptivo de la funcionalidad
 *   └─ tipo: Tipo de control ('button', 'column', 'section', 'numero', 'input', etc)
 *   └─ defaultActive: (OPCIONAL) true/false - Si true, se activa automáticamente para TODOS los roles al detectarse como nueva
 *   └─ meta: Metadata adicional (objeto JSON con info extra)
 * 
 * 🔓 ACTIVACIÓN AUTOMÁTICA (defaultActive):
 * - defaultActive: true  → Al crearse, se activa automáticamente para TODOS los roles del tenant
 * - defaultActive: false o ausente → Requiere activación manual (comportamiento tradicional)
 * 
 * ⚠️ USA defaultActive: true SOLO PARA:
 * ✅ Funcionalidades de solo lectura (montos, columnas informativas)
 * ✅ Funcionalidades sin riesgo de seguridad
 * ✅ Funcionalidades que la mayoría de usuarios necesitarían
 * 
 * ❌ NO USES defaultActive: true PARA:
 * ❌ Botones de acciones críticas (eliminar, aprobar, cerrar caja)
 * ❌ Columnas con información sensible (costos, márgenes)
 * ❌ Funcionalidades exclusivas de ciertos roles
 */

/**
 * ℹ️ Referencia rápida sobre `tieneAccesoFuncionalidad`
 * - Vive en `client/src/context/ErpContext.js`
 * - Lee `user.accesosFuncionalidad` que se arma desde las relaciones rol ↔ funcionalidad creadas al sincronizar este archivo
 * - Retorna true cuando coinciden `idMenuAcceso` e `idSector` y la relación no está eliminada
 */
const MENUS_ACCESO_REQUERIDOS = [
// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                      DASHBOARD                                             ##
// ##                                                                                            ##
// ################################################################################################
// ################################################################################################

  {
    id: 'DASHBOARD',
    descripcion: 'Dashboard',
    eliminado: false,
    funcionalidades: [] // Dashboard no tiene funcionalidades granulares
  },

// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                       VENTAS                                               ##
// ##                                                                                            ##
// ################################################################################################
// ################################################################################################

  {
    id: 'VENTAS',
    descripcion: 'Ventas',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS_GRUPO_VENTAS',
    descripcion: 'Ventas',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS_GRUPO_PRESUPUESTO',
    descripcion: 'Presupuesto',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS1',
    descripcion: 'Crear Venta',
    eliminado: false,
    funcionalidades: [ 
    {
      id: 'precioEnVentaEditable',
      descripcion: 'Precio de venta editable',
      tipo: 'numero',
      defaultActive: false,  // 🔓 Información de solo lectura, segura para todos los roles
      meta: {
        ubicacion: 'Linea de detalle de venta',
        descripcionDetallada: 'Los usuarios pueden editar el precio de venta de un item'
      }
     }
    ]
  },
  {
    id: 'VENTAS2',
    descripcion: 'Ver Ventas',
    eliminado: false,
    funcionalidades: [
      {
        id: 'btnEditarVenta',
        descripcion: 'Botón editar venta',
        tipo: 'button',
        defaultActive: false,  // 🔒 Acción crítica, requiere activación manual
        meta: {
          ubicacion: 'ModalViewTablaVenta',
          descripcionDetallada: 'Permite editar ventas no facturadas desde el modal de visualización'
        }
      },
      {
        id: 'btnEliminarTransaccion',
        descripcion: 'Boton Eliminar Transacciones',
        tipo: 'button',
        defaultActive: false,  // 🔒 Acción crítica, requiere activación manual
        meta: {
          ubicacion: 'TablaVentasComponent',
          descripcionDetallada: 'Permite eliminar transacciones desde las tablas'
        }
      },
      {
        id: 'verVentasEliminadas',
        descripcion: 'El Usuario puede ver las ventas eliminadas',
        tipo: 'button',
        defaultActive: false,  // 🔒 Acción crítica, requiere activación manual
        meta: {
          ubicacion: 'TablaVentasComponent',
          descripcionDetallada: 'Permite al usuario ver ventas eliminadas'
        }
      }
    ]
  },
  {
    id: 'VENTAS3',
    descripcion: 'Crear Presupuesto',
    eliminado: false,
    funcionalidades: [
      {
        id: 'precioEnPresupuestoEditable',
        descripcion: 'Precio de presupuesto editable',
        tipo: 'numero',
        defaultActive: false,  // Requiere activación manual
        meta: {
          ubicacion: 'Linea de detalle de presupuesto',
          descripcionDetallada: 'Los usuarios pueden editar el precio de presupuesto de un item'
        }
      }
    ]
  },
  {
    id: 'VENTAS4',
    descripcion: 'Ver Presupuesto',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS5',
    descripcion: 'Ver Ventas Detalle',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS6',
    descripcion: 'Ver Presupuesto Detalle',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS7',
    descripcion: 'Ver Cliente ',
    eliminado: false,
    funcionalidades: []
  },
  // Lista Precio: en la app se muestra bajo Inventario; el id VENTAS8 no cambia (roles/BD históricos).
  {
    id: 'VENTAS8',
    descripcion: 'Lista Precio',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS9',
    descripcion: 'Pedidos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'VENTAS10',
    descripcion: 'Crear Venta (Nuevo)',
    eliminado: true,
    funcionalidades: []
  },
  {
    id: 'VENTAS11',
    descripcion: 'Crear Preventa',
    eliminado: true,
    funcionalidades: []
  },
  {
    id: 'VENTAS12',
    descripcion: 'Ver Preventas',
    eliminado: true,
    funcionalidades: []
  },

// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                     INVENTARIO                                             ##
// ##                                                                                            ##
// ################################################################################################
// ################################################################################################

  {
    id: 'INVENTARIO',
    descripcion: 'Inventario',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO_GRUPO_ITEMS',
    descripcion: 'Stock',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO_GRUPO_RECETA',
    descripcion: 'Receta',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO1',
    descripcion: 'Crear Item',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO2',
    descripcion: 'Crear Receta',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO3',
    descripcion: 'Stock',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO4',
    descripcion: 'Atributos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'INVENTARIO5',
    descripcion: 'Recetas',
    eliminado: false,
    funcionalidades: []
  },

// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                      COMPRAS                                               ##
// ##                                                                                            ##
// ################################################################################################
// ################################################################################################

  {
    id: 'COMPRAS',
    descripcion: 'Compras',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'COMPRAS_GRUPO_COMPRAS',
    descripcion: 'Compras',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'COMPRAS1',
    descripcion: 'Crear Compra',
    eliminado: false,
    funcionalidades: [
      {
        id: 'costoEnCompraEditable',
        descripcion: 'Costo de compra editable',
        tipo: 'numero',
        defaultActive: false,  // Requiere activación manual
        meta: {
          ubicacion: 'Linea de detalle de compra',
          descripcionDetallada: 'Los usuarios pueden editar el costo de compra de un item'
        }
      }
    ]
  },
  {
    id: 'COMPRAS2',
    descripcion: 'Ver Compras',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'COMPRAS3',
    descripcion: 'Ver Compra Detalle',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'COMPRAS4',
    descripcion: 'Proveedores',
    eliminado: false,
    funcionalidades: []
  },
  // Lista Costo: en la app se muestra bajo Inventario; el id COMPRAS5 no cambia (roles/BD históricos).
  {
    id: 'COMPRAS5',
    descripcion: 'Lista Costo',
    eliminado: false,
    funcionalidades: []
  },

// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                  ADMINISTRACIÓN                                            ##
// ##                    (id TRANSACCION; submenús TRANSACCIONES*)                               ##
// ################################################################################################
// ################################################################################################

  {
    id: 'TRANSACCION',
    descripcion: 'Administración',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES1',
    descripcion: 'Medios de pago',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES2',
    descripcion: 'Tipos de transaccion',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES3',
    descripcion: 'Crear Transaccion',
    eliminado: true, // ⚠️ Deprecado - mantener para histórico
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES4',
    descripcion: 'Crear Gastos',
    eliminado: true, // ⚠️ Deprecado: crear gastos queda bajo permiso Gastos (TRANSACCIONES9)
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES5',
    descripcion: 'Transacciones',
    eliminado: false,
    funcionalidades: [
      {
        id: 'btnEliminarTransaccionVerTransacciones',
        descripcion: 'Eliminar transacciones',
        tipo: 'boton',
        defaultActive: false,  // Requiere activación manual
        meta: {
          ubicacion: 'En Acciones',
          descripcionDetallada: 'Los usuarios pueden eliminar transacciones del menu ver transacciones'
        }
      },
      {
        id: 'verTransaccionesEliminadas',
        descripcion: 'El Usuario puede ver las transacciones eliminadas',
        tipo: 'button',
        defaultActive: false,  // 🔒 Acción crítica, requiere activación manual
        meta: {
          ubicacion: 'TablaVerTransaccionesComponent',
          descripcionDetallada: 'Permite al usuario ver transacciones eliminadas'
        }
      }
    ]
  },
  {
    id: 'TRANSACCIONES6',
    descripcion: 'Cuentas Corrientes',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES7',
    descripcion: 'Ventas ARCA',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES8',
    descripcion: 'Analíticos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'TRANSACCIONES9',
    descripcion: 'Gastos',
    eliminado: false,
    funcionalidades: [
      { id: 'montoTotalGastos', descripcion: 'Monto total gastos', tipo: 'section', defaultActive: false },
      { id: 'btnCrearGasto',    descripcion: 'Crear gasto',        tipo: 'button',  defaultActive: false },
      { id: 'btnEditarGasto',   descripcion: 'Editar gasto',       tipo: 'button',  defaultActive: false },
      { id: 'btnDuplicarGasto', descripcion: 'Duplicar gasto',     tipo: 'button',  defaultActive: false },
      { id: 'btnEliminarGasto', descripcion: 'Eliminar gasto',     tipo: 'button',  defaultActive: false },
    ]
  },

// ────────────────────────────────────────────────────────────────────────────────────────────────
// TRANSACCIONES10 — Caja (Administración; funcionalidades granulares)
// ────────────────────────────────────────────────────────────────────────────────────────────────

  {
    id: 'TRANSACCIONES10',
    descripcion: 'Caja',
    eliminado: false,
    funcionalidades: [
      {
        id: 'montoFinalCaja',
        descripcion: 'Monto final de caja',
        tipo: 'numero',
        defaultActive: true,  // 🔓 Información de solo lectura, segura para todos los roles
        meta: {
          ubicacion: 'CustomPagination',
          descripcionDetallada: 'Muestra el monto final calculado de la caja'
        }
      },
      {
        id: 'btnExportarCaja',
        descripcion: 'Botón exportar a Excel',
        tipo: 'button',
        defaultActive: true,  // 🔒 Acción de exportar, requiere activación manual por rol
        meta: {
          ubicacion: 'Toolbar',
          descripcionDetallada: 'Permite exportar los datos de caja a Excel'
        }
      },
      {
        id: 'colUsuarioCaja',
        descripcion: 'Columna Usuario',
        tipo: 'column',
        defaultActive: true,  // 🔓 Columna informativa, segura para todos los roles
        meta: {
          ubicacion: 'DataGrid',
          descripcionDetallada: 'Columna que muestra qué usuario realizó cada transacción'
        }
      },
      {
        id: 'btnAgregarTransaccion',
        descripcion: 'Botón agregar transacción',
        tipo: 'button',
        defaultActive: true,  // 🔒 Acción crítica, requiere activación manual por rol
        meta: {
          ubicacion: 'Toolbar',
          descripcionDetallada: 'Botón para agregar transacciones manuales'
        }
      },
      {
        id: 'filtrosMedioPago',
        descripcion: 'Filtros de medio de pago',
        tipo: 'section',
        defaultActive: true,  // 🔓 Sección de filtros, útil para todos los roles
        meta: {
          ubicacion: 'FilterPanel',
          descripcionDetallada: 'Sección de filtros por tipo de medio de pago'
        }
      },
      {
        id: 'montoInicialCaja',
        descripcion: 'Monto inicial de caja',
        tipo: 'numero',
        defaultActive: true,  // 🔓 Información de solo lectura, segura para todos los roles
        meta: {
          ubicacion: 'Header',
          descripcionDetallada: 'Muestra el monto inicial de apertura de caja'
        }
      },
      {
        id: 'verTransaccionesIngresoCaja',
        descripcion: 'Ver los ingresos de la caja',
        tipo: 'transaccion',
        defaultActive: true,  // 🔓 Visualización de transacciones, segura para todos los roles
        meta: {
          ubicacion: 'Tabla',
          descripcionDetallada: 'Ver las transacciones de ingresos de la caja'
        }
      },
      {
        id: 'verSoloMiUsuarioEnCaja',
        descripcion: 'Ver solo mi Usuario en Caja',
        tipo: 'filtro',
        defaultActive: false,  // 🔓 Visualización de transacciones, segura para todos los roles
        meta: {
          ubicacion: 'Tabla',
          descripcionDetallada: 'Ver solo mis transacciones'
        }
      },
      {
        id: 'agruparCaja',
        descripcion: 'Agrupar caja (por medio de pago y/o ubicación)',
        tipo: 'section',
        defaultActive: false, // Solo Gerencia debe tener este acceso
        meta: {
          ubicacion: 'FilterPanel',
          descripcionDetallada: 'Muestra checkboxes para agrupar la tabla de caja por medio de pago y/o ubicación'
        }
      }
    ]
  },

// ################################################################################################
// ################################################################################################
// ##                                                                                            ##
// ##                                  CONFIGURACIÓN                                             ##
// ##                         (id ADMINISTRACION en BD / roles)                                  ##
// ################################################################################################
// ################################################################################################

  {
    id: 'ADMINISTRACION',
    descripcion: 'Configuración',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION1',
    descripcion: 'Monedas',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION2',
    descripcion: 'Impuestos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION3',
    descripcion: 'Categoria Gastos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION4',
    descripcion: 'SubCategoria Transaccion',
    eliminado: true, // ⚠️ Deprecado: gestión de subcategorías no expuesta en UI
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION5',
    descripcion: 'General',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION6',
    descripcion: 'Entidad',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION7',
    descripcion: 'Usuarios',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'ADMINISTRACION8',
    descripcion: 'Gestion de accesos',
    eliminado: false,
    funcionalidades: []
  },

  // ################################################################################################
  // ################################################################################################
  // ##                                                                                            ##
  // ##                                           RRHH                                             ##
  // ##                                                                                            ##
  // ################################################################################################
  // ################################################################################################

  {
    id: 'RRHH',
    descripcion: 'Capital Humano',
    eliminado: true,
    funcionalidades: []
  },
  {
    id: 'RRHH1',
    descripcion: 'Empleados',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'RRHH2',
    descripcion: 'Turnos',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'RRHH3',
    descripcion: 'Fichajes',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'RRHH4',
    descripcion: 'Asistencia',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'RRHH5',
    descripcion: 'Liquidaciones',
    eliminado: false,
    funcionalidades: []
  },
  {
    id: 'RRHH6',
    descripcion: 'Reportes',
    eliminado: false,
    funcionalidades: []
  },
  
  // ################################################################################################
  // ################################################################################################
  // ##                                                                                            ##
  // ##                                      SOPORTE                                               ##
  // ##                                                                                            ##
  // ################################################################################################
  // ################################################################################################
  
    {
      id: 'SOPORTE',
      descripcion: 'Soporte Menu Principal',
      eliminado: false,
      funcionalidades: []
    },
    {
      id: 'SOPORTE1',
      descripcion: 'Crear Ticket',
      eliminado: false,
      funcionalidades: []
    },
    {
      id: 'SOPORTE2',
      descripcion: 'Mis Tickets',
      eliminado: false,
      funcionalidades: []
    },
    {
      id: 'SOPORTE3',
      descripcion: 'Bandejas (Agente)',
      eliminado: false,
      funcionalidades: []
    },
    {
      id: 'SOPORTE4',
      descripcion: 'Métricas Soporte',
      eliminado: false,
      funcionalidades: []
    },
    {
      id: 'SOPORTE5',
      descripcion: 'Configuración Soporte',
      eliminado: false,
      funcionalidades: []
    },
  ];

/**
 * Valida y crea menús de acceso y funcionalidades faltantes para un tenant
 *
 * - **Menús nuevos**: se insertan desde el catálogo `MENUS_ACCESO_REQUERIDOS`.
 * - **Menús ya existentes**: se sincronizan `descripcion` y `eliminado` con el catálogo
 *   para que renombres y deprecaciones (ej. TRANSACCIONES4) lleguen a cada tenant al
 *   conectar/reiniciar. El resto de personalización por tenant sigue en `rolAcceso`.
 * - **Funcionalidades**: solo altas nuevas (sin sobrescribir existentes).
 *
 * @param {Object} sequelize - Instancia de Sequelize del tenant
 * @param {string} tenantName - Nombre del tenant para logging
 * @returns {Object} Resultado con cantidad de menús y funcionalidades creados
 */
async function validarYCrearMenusAcceso(sequelize, tenantName = 'unknown') {
  try {
    const { MenuAcceso, MenuFuncionalidadAcceso, RolUsuario, RolFuncionalidadAcceso } = adminModelInit(sequelize);
    
    console.log(`🔍 [MenuAcceso] Validando menús de acceso y funcionalidades para tenant: ${tenantName}`);
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // PASO 1: SINCRONIZAR MENÚS (altas faltantes)
    // ═══════════════════════════════════════════════════════════════════════════════════
    // ⚠️ POLÍTICA DE NO-SOBRESCRITURA: Solo se crean registros que no existen.
    //    Los registros existentes no se modifican para respetar configuraciones
    //    personalizadas de cada tenant. Los ítems deprecados se ocultan en el
    //    cliente mediante IDS_MENU_OCULTOS_EN_SEGURIDAD en GestionarAccesosComponent.
    
    const menusExistentes = await MenuAcceso.findAll({
      attributes: ['id']
    });
    
    const idsExistentes = new Set(menusExistentes.map(m => m.id));
    
    const menusFaltantes = MENUS_ACCESO_REQUERIDOS.filter(
      menuRequerido => !idsExistentes.has(menuRequerido.id)
    );
    
    let resultado = {
      menusCreados: 0,
      funcionalidadesCreadas: 0,
      funcionalidadesAutoActivadas: 0,
      relacionesAutoCreadas: 0,
      menusListaCreados: []
    };
    
    // Crear menús faltantes
    if (menusFaltantes.length > 0) {
      console.log(`⚠️  [MenuAcceso] Encontrados ${menusFaltantes.length} menús faltantes para ${tenantName}:`);
      menusFaltantes.forEach(menu => {
        console.log(`   - ${menu.id}: ${menu.descripcion}`);
      });
      
      const menusACrear = menusFaltantes.map(menu => ({
        id: menu.id,
        descripcion: menu.descripcion,
        eliminado: menu.eliminado,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await MenuAcceso.bulkCreate(menusACrear);
      
      resultado.menusCreados = menusFaltantes.length;
      resultado.menusListaCreados = menusFaltantes.map(m => m.id);
      
      console.log(`✅ [MenuAcceso] Creados ${menusFaltantes.length} menús para ${tenantName}`);
    } else {
      console.log(`✅ [MenuAcceso] Todos los menús ya existen para ${tenantName}, respetando configuración del tenant`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // PASO 2: SINCRONIZAR FUNCIONALIDADES GRANULARES
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    const funcionalidadesExistentes = await MenuFuncionalidadAcceso.findAll({
      attributes: ['id']
    });
    
    const idsFuncionalidadesExistentes = new Set(
      funcionalidadesExistentes.map(f => f.id)
    );
    
    const funcionalidadesFaltantes = [];
    
    // Recorrer todos los menús que tienen funcionalidades
    for (const menuRequerido of MENUS_ACCESO_REQUERIDOS) {
      if (menuRequerido.funcionalidades && menuRequerido.funcionalidades.length > 0) {
        for (const funcRequerida of menuRequerido.funcionalidades) {
          // Solo agregar si NO existe
          if (!idsFuncionalidadesExistentes.has(funcRequerida.id)) {
            funcionalidadesFaltantes.push({
              ...funcRequerida,
              idMenuAcceso: menuRequerido.id
            });
          }
        }
      }
    }
    
    // Crear funcionalidades faltantes
    if (funcionalidadesFaltantes.length > 0) {
      console.log(`⚠️  [MenuFuncionalidadAcceso] Encontradas ${funcionalidadesFaltantes.length} funcionalidades faltantes para ${tenantName}:`);
      funcionalidadesFaltantes.forEach(func => {
        console.log(`   - ${func.id} (${func.idMenuAcceso}): ${func.descripcion}`);
      });
      
      const funcionalidadesACrear = funcionalidadesFaltantes.map(func => ({
        id: func.id,
        idMenuAcceso: func.idMenuAcceso,
        descripcion: func.descripcion,
        tipo: func.tipo,
        meta: func.meta || {},
        eliminado: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await MenuFuncionalidadAcceso.bulkCreate(funcionalidadesACrear);
      
      resultado.funcionalidadesCreadas = funcionalidadesFaltantes.length;
      
      console.log(`✅ [MenuFuncionalidadAcceso] Creadas ${funcionalidadesFaltantes.length} funcionalidades para ${tenantName}`);
    } else {
      console.log(`✅ [MenuFuncionalidadAcceso] Todas las funcionalidades ya existen para ${tenantName}, respetando configuración del tenant`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // PASO 3: ACTIVACIÓN AUTOMÁTICA DE FUNCIONALIDADES NUEVAS (defaultActive)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    // Solo activar automáticamente las funcionalidades que:
    // 1. Son NUEVAS (acaban de ser creadas en funcionalidadesFaltantes)
    // 2. Tienen la propiedad defaultActive: true
    if (funcionalidadesFaltantes.length > 0) {
      const funcionalidadesAutoActivar = funcionalidadesFaltantes.filter(f => f.defaultActive === true);
      
      if (funcionalidadesAutoActivar.length > 0) {
        console.log(`🔓 [AutoActivación] Detectadas ${funcionalidadesAutoActivar.length} funcionalidades con defaultActive: true para ${tenantName}`);
        
        // Obtener todos los roles activos del tenant
        const rolesDelTenant = await RolUsuario.findAll({
          where: { eliminado: false },
          attributes: ['id', 'descripcion']
        });
        
        if (rolesDelTenant.length === 0) {
          console.log(`⚠️  [AutoActivación] No hay roles en ${tenantName}, saltando activación automática`);
        } else {
          console.log(`🔓 [AutoActivación] Activando para ${rolesDelTenant.length} roles: ${rolesDelTenant.map(r => r.descripcion).join(', ')}`);
          
          // Crear relaciones para cada combinación rol × funcionalidad
          const relacionesACrear = [];
          
          for (const funcionalidad of funcionalidadesAutoActivar) {
            for (const rol of rolesDelTenant) {
              relacionesACrear.push({
                idRolUsuario: rol.id,
                idMenuAcceso: funcionalidad.idMenuAcceso,
                idSector: funcionalidad.id,
                eliminado: false,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
          
          console.log(`🔓 [AutoActivación] Creando ${relacionesACrear.length} relaciones automáticas (${funcionalidadesAutoActivar.length} funcionalidades × ${rolesDelTenant.length} roles)`);
          
          // Usar bulkCreate con ignoreDuplicates por si ya existen (por seguridad)
          const resultadoBulk = await RolFuncionalidadAcceso.bulkCreate(relacionesACrear, {
            ignoreDuplicates: true
          });
          
          resultado.funcionalidadesAutoActivadas = funcionalidadesAutoActivar.length;
          resultado.relacionesAutoCreadas = resultadoBulk.length;
          
          console.log(`✅ [AutoActivación] Activadas automáticamente ${funcionalidadesAutoActivar.length} funcionalidades para todos los roles de ${tenantName}`);
          funcionalidadesAutoActivar.forEach(func => {
            console.log(`   - ${func.id} (${func.idMenuAcceso}): ${func.descripcion}`);
          });
        }
      } else {
        console.log(`ℹ️  [AutoActivación] No hay funcionalidades con defaultActive: true en esta sincronización`);
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // RESUMEN FINAL
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    if (resultado.menusCreados === 0 && resultado.funcionalidadesCreadas === 0 && resultado.menusActualizados === 0) {
      console.log(`✅ [Sincronización] Catálogo de menús al día para ${tenantName}; sin altas ni actualizaciones de menú.`);
    } else {
      console.log(`✅ [Sincronización] Completada para ${tenantName}:`);
      console.log(`   - Menús actualizados (catálogo): ${resultado.menusActualizados}`);
      console.log(`   - Menús creados: ${resultado.menusCreados}`);
      console.log(`   - Funcionalidades creadas: ${resultado.funcionalidadesCreadas}`);
      console.log(`   - Funcionalidades auto-activadas: ${resultado.funcionalidadesAutoActivadas}`);
      console.log(`   - Relaciones creadas: ${resultado.relacionesAutoCreadas}`);
    }
    
    return resultado;
    
  } catch (error) {
    console.error(`❌ [MenuAcceso] Error validando menús y funcionalidades para ${tenantName}:`, error);
    throw error;
  }
}

/**
 * Agrega un nuevo menú a la lista de requeridos
 * Útil para desarrollo dinámico
 * @param {string} id - ID del menú (ej: "VENTAS10")
 * @param {string} descripcion - Descripción del menú
 * @param {boolean} eliminado - Estado del menú
 */
function agregarMenuRequerido(id, descripcion, eliminado = false) {
  const existe = MENUS_ACCESO_REQUERIDOS.find(m => m.id === id);
  if (existe) {
    console.warn(`⚠️  [MenuAcceso] El menú ${id} ya existe en la lista de requeridos`);
    return false;
  }
  
  MENUS_ACCESO_REQUERIDOS.push({
    id,
    descripcion,
    eliminado
  });
  
  console.log(`➕ [MenuAcceso] Agregado menú requerido: ${id} - ${descripcion}`);
  return true;
}

/**
 * Obtiene la lista actual de menús requeridos
 */
function getMenusRequeridos() {
  return [...MENUS_ACCESO_REQUERIDOS];
}

/**
 * Obtiene menús requeridos agrupados por categoría
 */
function getMenusAgrupadosPorCategoria() {
  const grupos = {};
  
  MENUS_ACCESO_REQUERIDOS.forEach(menu => {
    const categoria = menu.id.match(/^[A-Z]+/)?.[0] || 'OTROS';
    if (!grupos[categoria]) {
      grupos[categoria] = [];
    }
    grupos[categoria].push(menu);
  });
  
  return grupos;
}

module.exports = {
  validarYCrearMenusAcceso,
  agregarMenuRequerido,
  getMenusRequeridos,
  getMenusAgrupadosPorCategoria,
  MENUS_ACCESO_REQUERIDOS
};
