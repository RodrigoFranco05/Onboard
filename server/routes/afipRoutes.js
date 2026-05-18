const express = require('express');
const path    = require('path');
const ejs     = require('ejs');
const QRCode  = require('qrcode');
const { getTenantAfip, getLastVoucher, createVoucher, getSalesPoints, createSalesPoint } = require('../services/afipService');
const { conexionDB } = require('../config/db.js');
const router  = express.Router();
const pdf     = require('html-pdf');

router.post('/invoice', async (req, res) => {
  try {
      const {      
      PtoVta,
      CbteTipo,
      Concepto,
      DocTipo,
      DocNro,
      CbteFch,
      ImpTotal,
      ImpTotConc,
      ImpNeto,
      ImpOpEx,
      ImpIVA,
      ImpTrib,
      MonId,
      MonCotiz,
      CondicionIVAReceptorId,
      Iva,
      ItemsList = [],
      DniCuitCliente,
      ApellidoNombre,
      abrirPDF,
    } = req.body;

    // Hardcoded values for testing
    const cuit             = "20285678499";   // CUIT de prueba
    const cliente          = "Cliente Hardcoded";
    const pagos            = "Efectivo";

    const EB = await getTenantAfip(req.cookies.tenant, req.cookies.usuario)

    // 1) Próximo número de comprobante
    const last    = await getLastVoucher(EB, PtoVta, CbteTipo);
    const cbteNro = last + 1;

    


    // 3) Construcción de voucherData para AFIP
    const voucherData = {
      PtoVta:    PtoVta,       // Punto de Venta asignado en AFIP (p.ej. caja o sucursal)
      CbteTipo:  CbteTipo,  // Tipo de comprobante (6=Factura B, 1=Factura A, 11=Nota Crédito A, etc.)
      Concepto:  Concepto,         // Concepto de la operación (1=Productos y Servicios, 2=Mercaderías, 3=Servicios)
      DocTipo:   DocTipo,          // Tipo de documento del receptor (99=Consumidor Final, 80=CUIT, 86=CUIL, etc.)
      DocNro:    DocNro,           // Número de documento del receptor (DNI o CUIT según DocTipo)
      CbteDesde: cbteNro,          // Número de comprobante inicial (siempre igual a CbteHasta para un solo comprobante)
      CbteHasta: cbteNro,          // Número de comprobante final
      CbteFch:   CbteFch,          // Fecha del comprobante en formato YYYYMMDD
      ImpTotal:  ImpTotal,         // Importe total de la factura (suma de neto, IVA, tributos y exentas)
      ImpTotConc:ImpTotConc,       // Importe de operaciones no gravadas (conc., exentas)
      ImpNeto:    ImpNeto,         // Importe neto gravado (base imponible)
      ImpOpEx:    ImpOpEx,         // Importe de operaciones exentas
      ImpIVA:     ImpIVA,          // Importe de IVA
      ImpTrib:    ImpTrib,         // Importe de tributos internos
      MonId:     MonId,            // Código de moneda (p.ej. 'PES' para pesos argentinos)
      MonCotiz:  MonCotiz,         // Cotización de la moneda (1 si es moneda local)
      CondicionIVAReceptorId: CondicionIVAReceptorId, // ID de condición de IVA del receptor (1=Responsable Inscripto, 2=Monotributista, etc.)
      Iva:       Iva               // Array de objetos de IVA: [{ Id, BaseImp, Importe }, …]
  };

    // console.log('voucherData', voucherData)

    // 4) Llamada al SDK para crear voucher
    const result = await createVoucher(EB, voucherData, false);

    // console.log('result', result)

const qrPayload = {
  ver:           1,                     // Versión del esquema de QR
  fecha:         voucherData.CbteFch,   // Fecha del comprobante YYYYMMDD
  cuit:          Number(cuit),          // CUIT del emisor
  ptoVta:        voucherData.PtoVta,    // Punto de venta
  tipoCmp:       voucherData.CbteTipo,  // Tipo de comprobante
  nroCmp:        voucherData.CbteDesde, // Número de comprobante
  importe:       voucherData.ImpTotal,  // Total de la factura
  moneda:        voucherData.MonId,     // Moneda utilizada
  ctz:           voucherData.MonCotiz,  // Cotización de la moneda
  tipoDocRec:    voucherData.DocTipo,   // Tipo de documento receptor (80 o 99)
  nroDocRec:     voucherData.DocNro,    // Número de documento receptor
  cae:           result.CAE,            // CAE otorgado por AFIP
  fchVto:        result.CAEFchVto       // Fecha de vencimiento del CAE (YYYYMMDD)
};


// 2) Lo serializás y codificás en Base64
const p = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

// 3) Armás la URL oficial
const afipUrl = `https://servicioscf.afip.gob.ar/publico/comprobantes/cae.aspx?p=${p}`;

const qrCodeDataUrl = await QRCode.toDataURL(afipUrl);




    // 6) Renderizar factura EJS a HTML string
    const templatePath = path.join(__dirname, '../templates/factura.ejs');
    const invoiceHtml  = await ejs.renderFile(templatePath, {
      voucherData,
      cuit,
      cliente,
      pagos,
      DniCuitCliente,
      ApellidoNombre,
      ItemsList,
      cae: result.CAE,
      vto: result.CAEFchVto,
      qrCodeDataUrl
    });


    // 7) Devolver JSON con datos AFIP y HTML de la factura
    return res.json({
      success:    true,
      cae:        result.CAE,
      vto:        result.CAEFchVto,
      voucherNum: result.CbteDesde,
      cbteNro: cbteNro,
      fechaEmision: String(voucherData.CbteFch),
    });

  } catch (err) {
    console.error("AFIP error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para Notas de Crédito
router.post('/credit-note', async (req, res) => {
  try {
    const {      
      PtoVta,
      CbteTipo, // 3 = Nota de Crédito A, 8 = NC B, 13 = NC C, 53 = NC M
      Concepto,
      DocTipo,
      DocNro,
      CbteFch,
      ImpTotal,
      ImpTotConc,
      ImpNeto,
      ImpOpEx,
      ImpIVA,
      ImpTrib,
      MonId,
      MonCotiz,
      CondicionIVAReceptorId,
      Iva,
      ItemsList = [],
      DniCuitCliente,
      ApellidoNombre,
      abrirPDF,
      // Campos específicos para Nota de Crédito
      tipoFacturaOriginal,
      ptoVtaOriginal,
      nroFacturaOriginal
    } = req.body;

    // Hardcoded values for testing
    const cuit             = "20285678499";   // CUIT de prueba
    const cliente          = "Cliente Hardcoded";
    const pagos            = "Efectivo";

    const EB = await getTenantAfip(req.cookies.tenant, req.cookies.usuario)

    // 1) Próximo número de comprobante para la NC
    const last    = await getLastVoucher(EB, PtoVta, CbteTipo);
    const cbteNro = last + 1;

    // 2) Construcción de voucherData específico para Nota de Crédito
    const voucherData = {
      PtoVta:    PtoVta,
      CbteTipo:  CbteTipo,  // 3 = NC A, 8 = NC B, 13 = NC C, 53 = NC M
      Concepto:  Concepto,  // Debe ser igual al de la factura original
      DocTipo:   DocTipo,
      DocNro:    DocNro,
      CbteDesde: cbteNro,
      CbteHasta: cbteNro,
      CbteFch:   CbteFch,
      
      // Totales (todos en valores positivos para NC)
      ImpTotal:  ImpTotal,
      ImpTotConc: ImpTotConc || 0,  // Importe no gravado
      ImpNeto:   ImpNeto || 0,      // Neto gravado (base imponible)
      ImpOpEx:   ImpOpEx || 0,      // Importe exento
      ImpIVA:    ImpIVA || 0,       // Total de IVA
      ImpTrib:   ImpTrib || 0,      // Otros tributos
      
      MonId:     MonId || 'PES',    // Moneda
      MonCotiz:  MonCotiz || 1,     // Cotización de la moneda
      CondicionIVAReceptorId: CondicionIVAReceptorId,
      Iva:       Iva,               // Array de IVA discriminado
      
      // Asociación obligatoria a la factura original
      CbtesAsoc: [{
        Tipo:   tipoFacturaOriginal, // Tipo de la factura original (1=A, 6=B, 11=C, 51=M)
        PtoVta: ptoVtaOriginal,      // Punto de venta de la factura original
        Nro:    nroFacturaOriginal   // Número de la factura original
      }]
    };

    // console.log('voucherData NC:', voucherData)

    // 3) Llamada al SDK para crear voucher
    const result = await createVoucher(EB, voucherData, false);

    // console.log('result NC:', result)

    // 4) Generar QR para Nota de Crédito
    const qrPayload = {
      ver:           1,                     // Versión del esquema de QR
      fecha:         voucherData.CbteFch,   // Fecha del comprobante YYYYMMDD
      cuit:          Number(cuit),          // CUIT del emisor
      ptoVta:        voucherData.PtoVta,    // Punto de venta
      tipoCmp:       voucherData.CbteTipo,  // Tipo de comprobante (NC)
      nroCmp:        voucherData.CbteDesde, // Número de comprobante
      importe:       voucherData.ImpTotal,  // Total de la NC
      moneda:        voucherData.MonId,     // Moneda utilizada
      ctz:           voucherData.MonCotiz,  // Cotización de la moneda
      tipoDocRec:    voucherData.DocTipo,   // Tipo de documento receptor
      nroDocRec:     voucherData.DocNro,    // Número de documento receptor
      cae:           result.CAE,            // CAE otorgado por AFIP
      fchVto:        result.CAEFchVto       // Fecha de vencimiento del CAE
    };

    // Serializar y codificar en Base64
    const p = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

    // URL oficial de AFIP
    const afipUrl = `https://servicioscf.afip.gob.ar/publico/comprobantes/cae.aspx?p=${p}`;

    const qrCodeDataUrl = await QRCode.toDataURL(afipUrl);

    // 5) Renderizar Nota de Crédito EJS a HTML string
    const templatePath = path.join(__dirname, '../templates/factura.ejs');
    const invoiceHtml  = await ejs.renderFile(templatePath, {
      voucherData,
      cuit,
      cliente,
      pagos,
      DniCuitCliente,
      ApellidoNombre,
      ItemsList,
      cae: result.CAE,
      vto: result.CAEFchVto,
      qrCodeDataUrl,
      isCreditNote: true, // Flag para identificar que es una NC
      facturaOriginal: {
        tipo: tipoFacturaOriginal,
        ptoVta: ptoVtaOriginal,
        nro: nroFacturaOriginal
      }
    });

    // 6) Devolver JSON con datos AFIP y HTML de la Nota de Crédito
    return res.json({
      success:    true,
      cae:        result.CAE,
      vto:        result.CAEFchVto,
      voucherNum: result.CbteDesde,
      cbteNro:    cbteNro,
      isCreditNote: true,
      fechaEmision: String(voucherData.CbteFch),
    });

  } catch (err) {
    console.error("AFIP NC error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para obtener puntos de venta habilitados para WSFE
// Flujo: 1) Lee cache de parametrosGlobales → 2) Si vacío o refresh, consulta AFIP y guarda → 3) Devuelve
// En DEV devuelve PtoVta 1 hardcodeado sin consultar nada.
// Usar ?refresh=true para forzar re-consulta a AFIP y actualizar el cache.
router.get('/sales-points', async (req, res) => {
  try {
    const db = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const [[{ valorParametro: afipsdk_prod }]] = await db.query(
      `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_prod'`
    );

    // En DEV, AFIP siempre usa PtoVta 1 y no existen puntos de venta reales
    if (afipsdk_prod === '0') {
      return res.json({
        success: true,
        salesPoints: [{ Nro: 1, EmisionTipo: 'CAE', Bloqueado: 'N', FchBaja: null }],
        dev: true,
        cached: false
      });
    }

    // En PROD: primero intentar leer del cache (parametrosGlobales)
    const forceRefresh = req.query.refresh === 'true';

    // Leer cache siempre
    const [[{ valorParametro: cached }]] = await db.query(
      `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_punto_venta'`
    );

    // Si es refresh, verificar que el parámetro afipsdk_refresh_punto_venta lo permita
    if (forceRefresh) {
      const [[{ valorParametro: refreshPermitido }]] = await db.query(
        `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_refresh_punto_venta'`
      );
      if (refreshPermitido !== '1') {
        // Refresh no permitido: devolver cache si existe, o error
        if (cached) {
          try {
            const salesPoints = JSON.parse(cached);
            if (Array.isArray(salesPoints) && salesPoints.length > 0) {
              return res.json({ success: true, salesPoints, cached: true, refreshBlocked: true });
            }
          } catch (e) { /* continuar */ }
        }
        return res.status(403).json({
          success: false,
          error: 'El refresh de puntos de venta está deshabilitado. Activá el parámetro "afipsdk_refresh_punto_venta" en configuración.'
        });
      }
    }

    // Si no es refresh y hay cache válido, devolver directamente
    if (!forceRefresh && cached) {
      try {
        const salesPoints = JSON.parse(cached);
        if (Array.isArray(salesPoints) && salesPoints.length > 0) {
          return res.json({ success: true, salesPoints, cached: true });
        }
      } catch (e) {
        // JSON inválido, seguir a consultar AFIP
      }
    }

    // Cache vacío o refresh forzado y permitido: consultar AFIP (consume 1 request)
    const EB = await getTenantAfip(req.cookies.tenant, req.cookies.usuario);
    const salesPoints = await getSalesPoints(EB);

    // Guardar en parametrosGlobales como cache
    const salesPointsJson = JSON.stringify(salesPoints);
    await db.query(
      `UPDATE "parametrosGlobales" SET "valorParametro" = $1 WHERE "nombreParametro" = 'afipsdk_punto_venta'`,
      { bind: [salesPointsJson] }
    );

    return res.json({ success: true, salesPoints, cached: false });
  } catch (err) {
    console.error("AFIP getSalesPoints error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para crear un punto de venta en ARCA via automation
// Consume 1 automation del plan AFIP SDK (solo disponible en PROD)
router.post('/create-sales-point', async (req, res) => {
  try {
    // Verificar si estamos en DEV o PROD
    const db = await conexionDB(req.cookies.tenant, req.cookies.usuario);
    const [[{ valorParametro: afipsdk_prod }]] = await db.query(
      `SELECT "valorParametro" FROM "parametrosGlobales" WHERE "nombreParametro" = 'afipsdk_prod'`
    );

    // En DEV no se pueden crear puntos de venta reales
    if (afipsdk_prod === '0') {
      return res.status(400).json({
        success: false,
        error: 'No se pueden crear puntos de venta en ambiente de pruebas. En DEV se usa PtoVta 1 automáticamente.'
      });
    }

    const { nombreFantasia } = req.body;
    console.log('[AFIP createSalesPoint] Iniciando creación de punto de venta...');
    const { numero, response } = await createSalesPoint(req.cookies.tenant, req.cookies.usuario, nombreFantasia);
    console.log('[AFIP createSalesPoint] Número asignado:', numero);
    console.log('[AFIP createSalesPoint] Respuesta completa:', JSON.stringify(response, null, 2));

    // Invalidar cache de puntos de venta para que la próxima consulta traiga el nuevo
    await db.query(
      `UPDATE "parametrosGlobales" SET "valorParametro" = NULL WHERE "nombreParametro" = 'afipsdk_punto_venta'`
    );

    return res.json({ success: true, numero, result: response });
  } catch (err) {
    console.error("AFIP createSalesPoint error:", JSON.stringify(err?.response?.data || err.data || err.message, null, 2));
    return res.status(500).json({ success: false, error: err?.response?.data?.data?.message || err.message });
  }
});

module.exports = router;