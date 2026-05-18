
const fs   = require('fs');
const path = require('path');
const Afip = require('@afipsdk/afip.js');
const { conexionDB } = require('../config/db.js');

// Leemos cert y key (ajusta rutas si hace falta)
//const cert = fs.readFileSync(path.join(__dirname, './ceccone/ceccone.crt'), 'utf8');
//const key  = fs.readFileSync(path.join(__dirname, './ceccone/ceccone.key'),  'utf8');

// Tu CUIT real
//const taxId = 20285678499;


async function getTenantAfip(tenant, usuario) {
  //console.log('tenant: ', tenant,  'usuario', usuario)
  const db = await conexionDB(tenant, usuario);

  const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';
  // ambiente facturando prod o dev?
  const [[{ valorParametro: afipsdk_prod }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_prod'`);

  // cuit cliente
  const [[{ valorParametro: taxId }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cuit'`);
  const [[{ valorParametro: afipsdk_password }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_password'`);


  // Variables elevadas para poder usarlas al final
  let certStr = null;
  let keyStr  = null;

  // DEV /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // DEV /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // DEV /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // DEV /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  if(afipsdk_prod == '0'){ 
    const [[{ valorParametro: certFromDB }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cert_dev'`);
    const [[{ valorParametro: keyFromDB }]]  = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_key_dev'`);
    
    // si no hay cert o key, se crean para dev
    if (!certFromDB || !keyFromDB) {
      //console.log("null cert o key");
      const afipAutorizaciones = new Afip({ access_token: access_token });

      const data = {
        "cuit": taxId,
        "username": taxId,
        "password": afipsdk_password,
        "alias": "afipsdk",
        "service": "wsfe"  
      };
      
      try {
          // Ejecutamos la automatizacion y creamos el certificado 
          const response = await afipAutorizaciones.CreateAutomation("create-cert-dev", data, true);

          // Mostramos la respuesta por consola
          //console.log(response);

          // 1) Extraer cert y key
          const { data: { cert, key } } = response;

          // 2) Guardar con placeholders (?)
          await db.query(
            `UPDATE "parametrosGlobales" SET "valorParametro" = $1
            WHERE "nombreParametro" = 'afipsdk_cert_dev'`,
            { bind: [cert] }
          );
          
          await db.query(
            `UPDATE "parametrosGlobales" SET "valorParametro" = $1
            WHERE "nombreParametro" = 'afipsdk_key_dev'`,
            { bind: [key] }
          );

          certStr = cert;
          keyStr  = key;
          
          // habilitamos este servicio con estos certificados.
          const responseService = await afipAutorizaciones.CreateAutomation("auth-web-service-dev", data, true)
          // console.log(responseService);

      }catch (error) {
        console.error('AFIP error al crear cert/key y habilitar servicio DEV:', error);
        throw error;
      }   
    }else {
      certStr = certFromDB;
      keyStr  = keyFromDB;
    }
  }

  // PROD  /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // PROD  /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // PROD  /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  // PROD  /*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-/*-
  else{ 
    const [[{ valorParametro: certFromDB }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cert_prod'`);
    const [[{ valorParametro: keyFromDB }]]  = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_key_prod'`);
    
    // si no hay cert o key, se crean para dev
    if (!certFromDB || !keyFromDB) {
      //console.log("null cert o key");
      const afipAutorizaciones = new Afip({ access_token: access_token });

      const data = {
        "cuit": taxId,
        "username": taxId,
        "password": afipsdk_password,
        "alias": "afipsdk",
        "service": "wsfe"  
      };
      
      try {
          // Ejecutamos la automatizacion y creamos el certificado 
          const response = await afipAutorizaciones.CreateAutomation("create-cert-prod", data, true);

          // Mostramos la respuesta por consola
          //console.log(response);

          // 1) Extraer cert y key
          const { data: { cert, key } } = response;

          // 2) Guardar con placeholders (?)
          await db.query(
            `UPDATE "parametrosGlobales" SET "valorParametro" = $1
            WHERE "nombreParametro" = 'afipsdk_cert_prod'`,
            { bind: [cert] }
          );
          
          await db.query(
            `UPDATE "parametrosGlobales" SET "valorParametro" = $1
            WHERE "nombreParametro" = 'afipsdk_key_prod'`,
            { bind: [key] }
          );

          certStr = cert;
          keyStr  = key;
          
          // habilitamos este servicio con estos certificados.
          const responseService = await afipAutorizaciones.CreateAutomation("auth-web-service-prod", data, true)
          // console.log(responseService);

      }catch (error) {
        console.error('AFIP error al crear cert/key y habilitar servicio PROD:', error);
        throw error;
      }   
    }else {
      certStr = certFromDB;
      keyStr  = keyFromDB;
    }
  }

  // Chequeos rápidos
  if (!certStr || !keyStr) {
    throw new Error('No hay cert/key configurados para el ambiente actual');
  }

  // Inicializamos SDK
  // console.log('console taxID: ', taxId)
  // console.log('console taxID: ', certStr)
  // console.log('console taxID: ', keyStr)

  if(afipsdk_prod == '0'){ // DEV
    const afip = new Afip({ CUIT: Number(taxId), cert: certStr, key: keyStr, access_token: access_token });
    const EB   = afip.ElectronicBilling;
    // console.log('EN DEV AFIP');
    return EB;
  }
  
  else{ // PROD
    const afip = new Afip({ CUIT: Number(taxId), cert: certStr, key: keyStr, access_token: access_token, production: true });    
    const EB   = afip.ElectronicBilling;
    //console.log('resultado EB ', EB)
    return EB;
  }

}

/**
 * Obtiene el último número de comprobante
 */
async function getLastVoucher(EB, ptoVta, cbteTipo) {
  return EB.getLastVoucher(ptoVta, cbteTipo);
}

/**
 * Crea un comprobante y devuelve { CAE, CAEFchVto, CbteDesde, ... }
 */
async function createVoucher(EB, data, returnFull = false) {
  // returnFull=false devuelve sólo { CAE, CAEFchVto, voucherNumber }
  return EB.createVoucher(data, returnFull);
}

/**
 * Obtiene los puntos de venta habilitados para WSFE via ElectronicBilling.getSalesPoints()
 * Consume 1 request del plan AFIP SDK.
 * Devuelve array de { Nro, EmisionTipo, Bloqueado, FchBaja } o [] si no hay ninguno (error 602).
 */
async function getSalesPoints(EB) {
  try {
    return await EB.getSalesPoints();
  } catch (error) {
    // Error 602 = "Sin Resultados" → el tenant no tiene puntos de venta habilitados para WSFE
    if (error.code === 602) {
      return [];
    }
    throw error;
  }
}

/**
 * Lista TODOS los puntos de venta del tenant desde el portal ARCA via automation.
 * Incluye todos los sistemas (Factuweb, Factura en Línea, WSFE, etc), activos y dados de baja.
 * Consume 1 automation del plan AFIP SDK.
 * Se usa para saber el número máximo existente antes de crear uno nuevo.
 */
async function listAllSalesPoints(tenant, usuario) {
  const db = await conexionDB(tenant, usuario);
  const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';

  const [[{ valorParametro: taxId }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cuit'`);
  const [[{ valorParametro: afipsdk_password }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_password'`);

  const afipAuto = new Afip({ access_token });
  const response = await afipAuto.CreateAutomation("list-sales-points", {
    cuit: String(taxId),
    username: String(taxId),
    password: afipsdk_password,
  }, true);

  return response.data || [];
}

/**
 * Crea un punto de venta en ARCA via automation (browser automation).
 * Consume 1 automation (list) + 1 automation (create) del plan AFIP SDK.
 * Calcula automáticamente el próximo número disponible listando TODOS los puntos existentes.
 * @param {string} tenant - nombre del tenant
 * @param {string} usuario - usuario para conexion DB
 * @param {string} nombreFantasia - nombre visible del punto de venta
 * @returns {object} { numero, response } - número asignado y respuesta de la automation
 */
async function createSalesPoint(tenant, usuario, nombreFantasia) {
  const db = await conexionDB(tenant, usuario);
  const access_token = 'CdopXOUJnMCShqJcOUAFiQr6barOL8XTW3ABayBxplFgIB9oYTMNDcX6YpGhiidC';

  const [[{ valorParametro: taxId }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_cuit'`);
  const [[{ valorParametro: afipsdk_password }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_password'`);
  const [[{ valorParametro: afipsdk_condicion_iva }]] = await db.query(`SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_condicion_iva'`);

  const afipAuto = new Afip({ access_token });

  // 1) Listar TODOS los puntos de venta existentes para calcular el próximo número
  const todosLosPV = await listAllSalesPoints(tenant, usuario);
  console.log('[AFIP createSalesPoint] Puntos de venta existentes:', todosLosPV.length);
  console.log('[AFIP createSalesPoint] Detalle:', JSON.stringify(todosLosPV.map(pv => ({ number: pv.number, system: pv.system, deactivated: pv.deactivated })), null, 2));
  const maxExistente = todosLosPV.reduce((max, pv) => Math.max(max, Number(pv.number) || 0), 0);
  const numero = maxExistente + 1;
  console.log('[AFIP createSalesPoint] Máximo existente:', maxExistente, '→ Próximo número:', numero);

  // 2) Determinar sistema según condición IVA del emisor
  const condicionLower = (afipsdk_condicion_iva || '').toLowerCase();
  const isMonotributista = condicionLower.includes('monotribut');
  const sistema = isMonotributista ? 'MAW' : 'FEEWS';

  // 3) Crear el punto de venta
  const data = {
    cuit: String(taxId),
    username: String(taxId),
    password: afipsdk_password,
    numero: numero,
    sistema: sistema,
    nombreFantasia: nombreFantasia || 'Punto de Venta ERP'
  };

  const response = await afipAuto.CreateAutomation("create-sales-point", data, true);
  return { numero, response };
}

module.exports = {
  getTenantAfip,
  getLastVoucher,
  createVoucher,
  getSalesPoints,
  createSalesPoint,
};