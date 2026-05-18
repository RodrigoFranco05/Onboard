'use strict';

/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  BACKFILL: nodos grupo en rolAcceso para tenants legacy
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * CONTEXTO
 * --------
 * Después del merge de la rama branch_mauri (commit 7ef45bd, "merge con mauri 2.
 * reorg menus") los módulos VENTAS, INVENTARIO y COMPRAS pasaron a usar "nodos
 * grupo" intermedios que agrupan varios submenús bajo un único permiso:
 *
 *   VENTAS_GRUPO_VENTAS       ⊃ VENTAS1, VENTAS2, VENTAS5
 *   VENTAS_GRUPO_PRESUPUESTO  ⊃ VENTAS3, VENTAS4, VENTAS6
 *   INVENTARIO_GRUPO_ITEMS    ⊃ INVENTARIO1, INVENTARIO3
 *   INVENTARIO_GRUPO_RECETA   ⊃ INVENTARIO2, INVENTARIO5
 *   COMPRAS_GRUPO_COMPRAS     ⊃ COMPRAS1, COMPRAS2, COMPRAS3
 *
 * El validador `server/services/menuAccesoValidator.js` crea los `menuAcceso` de
 * los grupos al primer connect, pero por su política de NO-SOBRESCRITURA NO crea
 * entradas en `rolAcceso`. Esto deja a los tenants legacy con la sidebar rota
 * (los items "Ventas", "Presupuesto", "Stock", "Receta", "Compras" desaparecen
 * porque el filtro del NavBar exige acceso al grupo padre además del hijo) y
 * con `/crearCompra`, `/tablaCompra`, `/verCompraDetalle` bloqueadas por
 * `MENU_ACCESO_REQUIERE_GRUPO_PADRE` en `client/src/App.js`.
 *
 * QUÉ HACE ESTA MIGRACIÓN
 * -----------------------
 * 1. Crea (idempotentemente) los 5 nodos grupo en `menuAcceso`.
 * 2. Para cada nodo grupo, otorga `rolAcceso` a TODO rol que ya tenga acceso
 *    activo (`eliminado = false`) a alguna pantalla hija. Reproduce la intención
 *    legacy: "si el rol veía Crear Venta, debe seguir viendo Ventas en la
 *    sidebar".
 *
 * Es safe para tenants nuevos (no hay rolAcceso de hijos → backfill no inserta
 * nada) e idempotente (ON CONFLICT DO NOTHING en ambos pasos).
 *
 * ORDEN DE EJECUCIÓN
 * ------------------
 * Esta migración corre desde `runMigrationsForTenant` (umzug + SequelizeMeta),
 * ANTES de `validarYCrearMenusAcceso`. Por eso es indispensable que cree los
 * `menuAcceso` ella misma: si solo insertara `rolAcceso`, fallaría la FK.
 * Cuando el validador corra después, verá los grupos como existentes y los
 * saltará por su política de no-sobrescritura.
 *
 * TRAZABILIDAD
 * ------------
 * Documentación: `documentacion/seguridad y sesiones/SISTEMA-SEGURIDAD.md`,
 * sección "Migración de backfill — nodos grupo en tenants legacy".
 */

// Mapeo: debe coincidir con `GRUPOS_INTERMEDIOS` de
// `client/src/components/adminComponent/GestionarAccesosComponent.js` y con
// los `groupAccessIds` de `client/src/components/navBar/NavBar.js`.
const NODOS_GRUPO = [
  { id: 'VENTAS_GRUPO_VENTAS',      descripcion: 'Ventas',      hijos: ['VENTAS1', 'VENTAS2', 'VENTAS5'] },
  { id: 'VENTAS_GRUPO_PRESUPUESTO', descripcion: 'Presupuesto', hijos: ['VENTAS3', 'VENTAS4', 'VENTAS6'] },
  { id: 'INVENTARIO_GRUPO_ITEMS',   descripcion: 'Stock',       hijos: ['INVENTARIO1', 'INVENTARIO3'] },
  { id: 'INVENTARIO_GRUPO_RECETA',  descripcion: 'Receta',      hijos: ['INVENTARIO2', 'INVENTARIO5'] },
  { id: 'COMPRAS_GRUPO_COMPRAS',    descripcion: 'Compras',     hijos: ['COMPRAS1', 'COMPRAS2', 'COMPRAS3'] },
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(`
    SELECT 1
      FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = '${tableName}'
     LIMIT 1;
  `);
  return rows.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 [Backfill nodos grupo] Iniciando...');

    // ─── Prerrequisito: tabla menuAcceso debe existir ───
    if (!(await tableExists(queryInterface, 'menuAcceso'))) {
      console.log('ℹ️  [Backfill nodos grupo] La tabla menuAcceso no existe (tenant nuevo, sin esquema). Migración no aplicable.');
      return;
    }

    // ─── PASO 1: crear menuAcceso de los nodos grupo (idempotente) ───
    let menusCreados = 0;
    for (const grupo of NODOS_GRUPO) {
      const [insertedRows] = await queryInterface.sequelize.query(`
        INSERT INTO "menuAcceso" ("id", "descripcion", "eliminado", "createdAt", "updatedAt")
        VALUES ('${grupo.id}', '${grupo.descripcion}', false, NOW(), NOW())
        ON CONFLICT ("id") DO NOTHING
        RETURNING "id";
      `);

      if (insertedRows.length > 0) {
        menusCreados++;
        console.log(`   ✅ menuAcceso creado: ${grupo.id} ("${grupo.descripcion}")`);
      } else {
        console.log(`   ℹ️  menuAcceso ya existía: ${grupo.id}`);
      }
    }
    console.log(`📊 [Backfill nodos grupo] menuAcceso → creados: ${menusCreados}/${NODOS_GRUPO.length}`);

    // ─── PASO 2: backfill de rolAcceso ───
    if (!(await tableExists(queryInterface, 'rolAcceso'))) {
      console.log('ℹ️  [Backfill nodos grupo] La tabla rolAcceso no existe. Backfill de roles omitido.');
      return;
    }

    let totalAccesosCreados = 0;
    for (const grupo of NODOS_GRUPO) {
      const inClause = grupo.hijos.map(h => `'${h}'`).join(', ');

      const [insertedRows] = await queryInterface.sequelize.query(`
        INSERT INTO "rolAcceso" ("idRolUsuario", "idMenuAcceso", "eliminado", "createdAt", "updatedAt")
        SELECT DISTINCT ra."idRolUsuario", '${grupo.id}', false, NOW(), NOW()
          FROM "rolAcceso" ra
         WHERE ra."idMenuAcceso" IN (${inClause})
           AND ra."eliminado" = false
        ON CONFLICT ("idRolUsuario", "idMenuAcceso") DO NOTHING
        RETURNING "idRolUsuario";
      `);

      const creados = insertedRows.length;
      totalAccesosCreados += creados;

      if (creados > 0) {
        console.log(`   🔓 ${grupo.id}: otorgado a ${creados} rol(es) [hijos: ${grupo.hijos.join(', ')}]`);
      } else {
        console.log(`   ℹ️  ${grupo.id}: sin roles legacy elegibles (no hay rolAcceso activo en hijos, o ya estaban concedidos)`);
      }
    }

    console.log(`✅ [Backfill nodos grupo] Completado. Total accesos creados: ${totalAccesosCreados}`);
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 [Backfill nodos grupo] Revirtiendo...');
    console.log('⚠️  ATENCIÓN: este down elimina TODOS los rolAcceso de los 5 nodos grupo,');
    console.log('   incluyendo los creados manualmente desde /gestionarAccesos después de la migración.');

    const idsInClause = NODOS_GRUPO.map(g => `'${g.id}'`).join(', ');

    if (await tableExists(queryInterface, 'rolAcceso')) {
      const [, meta] = await queryInterface.sequelize.query(`
        DELETE FROM "rolAcceso" WHERE "idMenuAcceso" IN (${idsInClause});
      `);
      console.log(`   🗑️  rolAcceso eliminados: ${meta?.rowCount ?? 0}`);
    }

    if (await tableExists(queryInterface, 'menuAcceso')) {
      const [, meta] = await queryInterface.sequelize.query(`
        DELETE FROM "menuAcceso" WHERE "id" IN (${idsInClause});
      `);
      console.log(`   🗑️  menuAcceso eliminados: ${meta?.rowCount ?? 0}`);
    }

    console.log('✅ [Backfill nodos grupo] Reversión completada');
  },
};
