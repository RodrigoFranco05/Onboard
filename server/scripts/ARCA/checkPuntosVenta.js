/**
 * Script para consultar TODOS los puntos de venta de un tenant en ARCA
 * usando la API REST de afipsdk.com directamente (sin pasar por el SDK Node).
 *
 * Lee las credenciales (CUIT, password) desde parametrosGlobales del tenant.
 * Consume 1 automation del plan AFIP SDK.
 *
 * Uso:
 *   node server/scripts/ARCA/checkPuntosVenta.js <tenant>
 *
 * Ejemplo:
 *   node server/scripts/ARCA/checkPuntosVenta.js demo
 */

const path = require('path');
const axios = require('axios');

const serverDir = path.join(__dirname, '..', '..');
const { conexionDB } = require(path.join(serverDir, 'config', 'db.js'));

const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`
Uso:
  node server/scripts/ARCA/checkPuntosVenta.js <tenant>

Ejemplo:
  node server/scripts/ARCA/checkPuntosVenta.js demo
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
    console.log('=== Consultando puntos de venta via API directa ===\n');

    // 1) Crear automation
    const createRes = await axios.post('https://app.afipsdk.com/api/v1/automations', {
      automation: 'list-sales-points',
      params: { cuit: taxId, username: taxId, password }
    }, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const automationId = createRes.data.id;
    console.log('Automation ID:', automationId, 'Status:', createRes.data.status);

    if (createRes.data.status === 'complete') {
      printResults(createRes.data);
      process.exit(0);
    }

    // 2) Polling
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const detailRes = await axios.get(`https://app.afipsdk.com/api/v1/automations/${automationId}`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      console.log(`  Intento ${i+1}: status=${detailRes.data.status}`);
      if (detailRes.data.status === 'complete') {
        printResults(detailRes.data);
        process.exit(0);
      }
      if (detailRes.data.status === 'error') {
        console.error('Error:', JSON.stringify(detailRes.data.data, null, 2));
        process.exit(1);
      }
    }
    console.log('Timeout esperando resultado');
    process.exit(1);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

function printResults(result) {
  const data = result.data;
  console.log(`\nTotal: ${data.length} puntos de venta\n`);
  console.log('#\tActivo\tUsado\tSistema\t\t\t\t\t\tDirección');
  console.log('-'.repeat(130));
  for (const pv of data) {
    const activo = pv.deactivated ? 'NO' : 'SI';
    const usado = pv.used ? 'SI' : 'NO';
    console.log(`${pv.number}\t${activo}\t${usado}\t${(pv.system || '').padEnd(50)}\t${pv.address || '-'}`);
  }
}

main();
