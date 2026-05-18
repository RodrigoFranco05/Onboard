/**
 * Script para consultar puntos de venta habilitados para WSFE (Web Service de
 * Factura Electrónica) de un tenant. A diferencia de checkPuntosVenta[Arca].js
 * (que usan automation y listan TODOS los PVs del portal), este usa
 * EB.getSalesPoints() — la consulta real al web service — que solo devuelve
 * los PVs que AFIP reconoce para facturación electrónica por web services.
 *
 * Lee CUIT + cert + key desde parametrosGlobales del tenant, detectando DEV/PROD
 * automáticamente según afipsdk_prod.
 *
 * NO consume automation.
 *
 * Uso:
 *   node server/scripts/ARCA/checkPuntosVentaWSFE.js <tenant>
 *
 * Ejemplo:
 *   node server/scripts/ARCA/checkPuntosVentaWSFE.js demo
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
  node server/scripts/ARCA/checkPuntosVentaWSFE.js <tenant>

Ejemplo:
  node server/scripts/ARCA/checkPuntosVentaWSFE.js demo
`);
    process.exit(1);
  }
  return { tenant: args[0] };
}

async function getAfipInstance(db) {
  const [[{ valorParametro: afipsdk_prod }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_prod'`
  );
  const [[{ valorParametro: taxId }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cuit'`
  );

  const isProd = afipsdk_prod !== '0';
  const certParam = isProd ? 'afipsdk_cert_prod' : 'afipsdk_cert_dev';
  const keyParam = isProd ? 'afipsdk_key_prod' : 'afipsdk_key_dev';

  const [[{ valorParametro: cert }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = '${certParam}'`
  );
  const [[{ valorParametro: key }]] = await db.query(
    `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = '${keyParam}'`
  );

  const afipConfig = { CUIT: Number(taxId), cert, key, access_token };
  if (isProd) afipConfig.production = true;

  return { afip: new Afip(afipConfig), taxId, isProd };
}

async function main() {
  const { tenant } = parseArgs();

  try {
    const db = await conexionDB(tenant, 'script');
    const { afip, taxId, isProd } = await getAfipInstance(db);

    console.log(`\n[Config] Tenant: ${tenant} | Ambiente: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'} | CUIT: ${taxId}`);
    console.log(`\n=== Consultando puntos de venta WSFE para CUIT ${taxId} ===\n`);

    const EB = afip.ElectronicBilling;

    try {
      const salesPoints = await EB.getSalesPoints();
      console.log('Puntos de venta habilitados en WSFE:');
      console.log(JSON.stringify(salesPoints, null, 2));

      // Smoke test adicional: último comprobante para cada PV con Factura A
      if (Array.isArray(salesPoints) && salesPoints.length > 0) {
        console.log('\n=== Smoke test: getLastVoucher por PV (CbteTipo 1 = Factura A) ===');
        for (const pv of salesPoints) {
          const nro = pv.Nro || pv.number || pv;
          try {
            const last = await EB.getLastVoucher(nro, 1);
            console.log(`  PV ${nro}: último Factura A = ${last}`);
          } catch (e) {
            console.log(`  PV ${nro}: ${e.message}${e.code ? ` (code: ${e.code})` : ''}`);
          }
        }
      }
    } catch (error) {
      if (error.code === 602) {
        console.log('Error 602: Sin resultados — NO hay puntos de venta habilitados para WSFE.');
        console.log('\nEsto significa que aunque existan PVs en ARCA como "RECE para aplicativo y web services",');
        console.log('el web service WSFE no los reconoce. Posibles causas:');
        console.log('  1) El certificado actual no tiene autorizado el servicio wsfe');
        console.log('  2) AFIP aún no propagó el PV (puede tardar horas)');
        console.log('  3) Falta delegar/autorizar el web service wsfe para este CUIT+certificado');
      } else {
        throw error;
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message || error);
    if (error.code) console.error('Código:', error.code);
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

main();
