/**
 * Script para consultar un comprobante en AFIP usando datos del ERP.
 *
 * Se conecta a la DB del tenant, busca el comprobante por CAE (o por número),
 * luego consulta getVoucherInfo en AFIP para traer los datos completos.
 *
 * Uso:
 *   node server/scripts/ARCA/consultarComprobante.js <tenant> --cae <CAE>
 *   node server/scripts/ARCA/consultarComprobante.js <tenant> --numero <nro> --pv <puntoVenta> --tipo <cbteTipo>
 *
 * Ejemplos:
 *   node server/scripts/ARCA/consultarComprobante.js demo --cae 86130023721483
 *   node server/scripts/ARCA/consultarComprobante.js demo --numero 346 --pv 24 --tipo 6
 *   node server/scripts/ARCA/consultarComprobante.js lutente --cae 75089222742305
 */

const path = require('path');

const serverDir = path.join(__dirname, '..', '..');
const { conexionDB } = require(path.join(serverDir, 'config', 'db.js'));
const Afip = require('@afipsdk/afip.js');

// Mapeo idTipoFactura (ERP) → CbteTipo (AFIP)
const FACTURA_ID_TO_CBTE = { 1: 1, 2: 6, 3: 11, 7: 51 };
const CBTE_NOMBRES = {
  1: 'Factura A', 2: 'Nota de Débito A', 3: 'Nota de Crédito A',
  6: 'Factura B', 7: 'Nota de Débito B', 8: 'Nota de Crédito B',
  11: 'Factura C', 12: 'Nota de Débito C', 13: 'Nota de Crédito C',
  51: 'Factura M', 52: 'Nota de Débito M', 53: 'Nota de Crédito M',
};

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(`
Uso:
  node server/scripts/ARCA/consultarComprobante.js <tenant> --cae <CAE>
  node server/scripts/ARCA/consultarComprobante.js <tenant> --numero <nro> --pv <puntoVenta> --tipo <cbteTipo>

Ejemplos:
  node server/scripts/ARCA/consultarComprobante.js demo --cae 86130023721483
  node server/scripts/ARCA/consultarComprobante.js demo --numero 346 --pv 24 --tipo 6
`);
    process.exit(1);
  }

  const tenant = args[0];
  const params = {};
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    params[key] = args[i + 1];
  }
  return { tenant, ...params };
}

async function getAfipInstance(db) {
  const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';

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

  console.log(`\n[Config] Tenant: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'} | CUIT: ${taxId}\n`);

  return new Afip(afipConfig);
}

async function buscarPorCAE(db, cae) {
  console.log(`[DB] Buscando CAE: ${cae} en transaccionTipoFactura...\n`);

  const [results] = await db.query(`
    SELECT
      ttf."idTransaccion",
      ttf."idTipoFactura",
      ttf."CAE",
      ttf."vencimientoCAE",
      ttf."numeroFactura",
      ttf."puntoVenta",
      ttf."idCondicionIva",
      tf."descripcion" as "tipoFacturaDescripcion"
    FROM "transaccionTipoFactura" ttf
    LEFT JOIN "tipoFactura" tf ON tf."id" = ttf."idTipoFactura"
    WHERE ttf."CAE" = :cae AND ttf."eliminado" = false
  `, { replacements: { cae } });

  if (results.length === 0) {
    console.log(`❌ No se encontró ningún registro con CAE ${cae} en la base de datos.\n`);
    console.log('Tip: Verificá que el CAE sea correcto o que la factura se haya grabado.');
    return null;
  }

  const registro = results[0];
  console.log('--- Datos en nuestra DB ---');
  console.log(`  idTransaccion:   ${registro.idTransaccion}`);
  console.log(`  idTipoFactura:   ${registro.idTipoFactura} (${registro.tipoFacturaDescripcion || '?'})`);
  console.log(`  CAE:             ${registro.CAE}`);
  console.log(`  vencimientoCAE:  ${registro.vencimientoCAE}`);
  console.log(`  numeroFactura:   ${registro.numeroFactura}`);
  console.log(`  puntoVenta:      ${registro.puntoVenta || 'NULL (no grabado)'}`);
  console.log(`  idCondicionIva:  ${registro.idCondicionIva}`);
  console.log('');

  return registro;
}

async function consultarAfip(afip, numero, puntoVenta, cbteTipo) {
  const EB = afip.ElectronicBilling;
  const nombreTipo = CBTE_NOMBRES[cbteTipo] || `Tipo ${cbteTipo}`;

  console.log(`[AFIP] Consultando getVoucherInfo(${numero}, ${puntoVenta}, ${cbteTipo}) → ${nombreTipo}...\n`);

  try {
    const info = await EB.getVoucherInfo(Number(numero), Number(puntoVenta), Number(cbteTipo));

    if (!info) {
      console.log('❌ AFIP no devolvió datos para ese comprobante.\n');
      return null;
    }

    console.log('--- Datos desde AFIP ---');
    console.log(`  Resultado:         ${info.Resultado === 'A' ? '✅ Aprobado' : '❌ ' + info.Resultado}`);
    console.log(`  CAE:               ${info.CodAutorizacion}`);
    console.log(`  Vto CAE:           ${info.FchVto}`);
    console.log(`  Tipo Comprobante:  ${info.CbteTipo} (${CBTE_NOMBRES[info.CbteTipo] || '?'})`);
    console.log(`  Punto de Venta:    ${info.PtoVta}`);
    console.log(`  Número:            ${info.CbteDesde}${info.CbteDesde !== info.CbteHasta ? ' - ' + info.CbteHasta : ''}`);
    console.log(`  Fecha:             ${info.CbteFch}`);
    console.log(`  Doc Tipo:          ${info.DocTipo} (${info.DocTipo === 80 ? 'CUIT' : info.DocTipo === 96 ? 'DNI' : info.DocTipo === 99 ? 'Consumidor Final' : '?'})`);
    console.log(`  Doc Nro:           ${info.DocNro}`);
    console.log(`  Concepto:          ${info.Concepto} (${info.Concepto === 1 ? 'Productos' : info.Concepto === 2 ? 'Servicios' : 'Productos y Servicios'})`);
    console.log(`  Cond. IVA Recept.: ${info.CondicionIVAReceptorId || 'N/A'}`);
    console.log(`  Moneda:            ${info.MonId} (cotiz: ${info.MonCotiz})`);
    console.log('');
    console.log('  --- Importes ---');
    console.log(`  ImpTotal:    $${info.ImpTotal}`);
    console.log(`  ImpNeto:     $${info.ImpNeto}`);
    console.log(`  ImpIVA:      $${info.ImpIVA}`);
    console.log(`  ImpTotConc:  $${info.ImpTotConc}`);
    console.log(`  ImpOpEx:     $${info.ImpOpEx}`);
    console.log(`  ImpTrib:     $${info.ImpTrib}`);

    if (info.Iva && info.Iva.length > 0) {
      console.log('');
      console.log('  --- IVA Detalle ---');
      for (const iva of info.Iva) {
        const alicuota = iva.Id === 5 ? '21%' : iva.Id === 4 ? '10.5%' : iva.Id === 6 ? '27%' : `Id ${iva.Id}`;
        console.log(`  ${alicuota}: Base $${iva.BaseImp} → IVA $${iva.Importe}`);
      }
    }

    if (info.CbtesAsoc && info.CbtesAsoc.length > 0) {
      console.log('');
      console.log('  --- Comprobantes Asociados ---');
      for (const asoc of info.CbtesAsoc) {
        console.log(`  Tipo ${asoc.Tipo} | PV ${asoc.PtoVta} | Nro ${asoc.Nro}`);
      }
    }

    if (info.Observaciones && info.Observaciones.length > 0) {
      console.log('');
      console.log('  --- Observaciones ---');
      for (const obs of info.Observaciones) {
        console.log(`  [${obs.Code}] ${obs.Msg}`);
      }
    }

    console.log('');
    console.log(`  FchProceso:  ${info.FchProceso}`);
    console.log(`  EmisionTipo: ${info.EmisionTipo}`);

    console.log('\n--- JSON completo ---');
    console.log(JSON.stringify(info, null, 2));

    return info;
  } catch (error) {
    console.error(`❌ Error al consultar AFIP: ${error.message}`);
    if (error.code) console.error(`   Código: ${error.code}`);
    return null;
  }
}

async function main() {
  const params = parseArgs();

  try {
    // 1) Conectar a la DB del tenant
    const db = await conexionDB(params.tenant, 'script');

    // 2) Obtener instancia AFIP
    const afip = await getAfipInstance(db);

    let numero, puntoVenta, cbteTipo;

    if (params.cae) {
      // Modo CAE: buscar en DB primero
      const registro = await buscarPorCAE(db, params.cae);

      if (!registro) {
        process.exit(1);
      }

      numero = registro.numeroFactura;
      puntoVenta = registro.puntoVenta;
      cbteTipo = FACTURA_ID_TO_CBTE[registro.idTipoFactura];

      if (!numero) {
        console.log('❌ El registro no tiene numeroFactura. No se puede consultar AFIP.');
        process.exit(1);
      }

      if (!puntoVenta) {
        console.log('⚠️  El registro no tiene puntoVenta grabado (factura anterior al cambio).');
        console.log('   Intentando con PtoVta = 1 como fallback...\n');
        puntoVenta = 1;
      }

      if (!cbteTipo) {
        console.log(`❌ No se pudo mapear idTipoFactura=${registro.idTipoFactura} a CbteTipo AFIP.`);
        process.exit(1);
      }

    } else if (params.numero && params.pv && params.tipo) {
      // Modo directo: número + PV + tipo
      numero = params.numero;
      puntoVenta = params.pv;
      cbteTipo = params.tipo;
    } else {
      console.log('❌ Debés indicar --cae <CAE> o --numero <nro> --pv <pv> --tipo <tipo>');
      process.exit(1);
    }

    // 3) Consultar AFIP
    const info = await consultarAfip(afip, numero, puntoVenta, cbteTipo);

    // 4) Comparar si tenemos datos en DB y AFIP
    if (params.cae && info) {
      console.log('\n=== Comparación DB vs AFIP ===');
      const caeDB = params.cae;
      const caeAFIP = info.CodAutorizacion;
      const match = caeDB === caeAFIP;
      console.log(`  CAE DB:   ${caeDB}`);
      console.log(`  CAE AFIP: ${caeAFIP}`);
      console.log(`  Match:    ${match ? '✅ Coinciden' : '❌ NO coinciden'}`);
    }

  } catch (error) {
    console.error('Error fatal:', error.message);
    if (error.original) console.error('DB error:', error.original.message);
  }

  process.exit(0);
}

main();
