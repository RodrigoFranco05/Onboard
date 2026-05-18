/**
 * Script para consultar TODOS los puntos de venta de un tenant desde ARCA
 * via automation del SDK @afipsdk/afip.js (list-sales-points).
 *
 * Lee las credenciales (CUIT, password) desde parametrosGlobales del tenant.
 * Consume 1 automation del plan AFIP SDK.
 *
 * Uso:
 *   node server/scripts/ARCA/checkPuntosVentaArca.js <tenant>
 *
 * Ejemplo:
 *   node server/scripts/ARCA/checkPuntosVentaArca.js demo
 */

const path = require('path');
const Afip = require('@afipsdk/afip.js');

const serverDir = path.join(__dirname, '..', '..');
const { conexionDB } = require(path.join(serverDir, 'config', 'db.js'));

const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`
Uso:
  node server/scripts/ARCA/checkPuntosVentaArca.js <tenant>

Ejemplo:
  node server/scripts/ARCA/checkPuntosVentaArca.js demo
`);
    process.exit(1);
  }
  return { tenant: args[0] };
}

async function getCredenciales(db) {
  const [[{ valorParametro: taxId }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cuit'`
  );
  const [[{ valorParametro: password }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_password'`
  );
  const [[{ valorParametro: afipsdk_prod }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_prod'`
  );

  return { taxId, password, isProd: afipsdk_prod !== '0' };
}

async function main() {
  const { tenant } = parseArgs();

  try {
    const db = await conexionDB(tenant, 'script');
    const { taxId, password, isProd } = await getCredenciales(db);

    console.log(`\n[Config] Tenant: ${tenant} | Ambiente: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'} | CUIT: ${taxId}`);
    console.log(`=== Consultando puntos de venta para CUIT ${taxId} ===\n`);

    const afipAuto = new Afip({ access_token });
    const result = await afipAuto.CreateAutomation("list-sales-points", {
      cuit: taxId,
      username: taxId,
      password: password,
    }, true);

    const puntos = result.data || [];
    console.log(`Total: ${puntos.length} puntos de venta\n`);

    // Tabla formateada
    console.log('N°'.padEnd(5) + 'Sistema'.padEnd(50) + 'Activo'.padEnd(10) + 'Usado'.padEnd(8) + 'Dirección');
    console.log('-'.repeat(130));

    for (const pv of puntos) {
      const activo = pv.deactivated ? '❌ Baja' : '✅ Activo';
      const usado = pv.used ? 'Sí' : 'No';
      console.log(
        String(pv.number).padEnd(5) +
        (pv.system || '').padEnd(50) +
        activo.padEnd(10) +
        usado.padEnd(8) +
        (pv.address || '')
      );
    }

    // Resumen
    const activos = puntos.filter(p => !p.deactivated);
    const wsfe = activos.filter(p => p.system && (p.system.includes('Web Service') || p.system.includes('WSFE')));
    const maxNum = puntos.reduce((max, p) => Math.max(max, Number(p.number) || 0), 0);

    console.log(`\n--- Resumen ---`);
    console.log(`Activos: ${activos.length}`);
    console.log(`Habilitados para Web Services (WSFE): ${wsfe.length}`);
    console.log(`Número máximo existente: ${maxNum}`);
    console.log(`Próximo número disponible: ${maxNum + 1}`);

    // JSON completo
    console.log('\n--- JSON completo ---');
    console.log(JSON.stringify(puntos, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    if (error.data) console.error('Data:', JSON.stringify(error.data, null, 2));
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

main();
