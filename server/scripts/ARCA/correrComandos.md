# Comandos ARCA — Scripts CLI

Scripts utilitarios para operar contra ARCA/AFIP fuera del flujo normal del ERP. Se corren todos desde la raíz del proyecto (`/Users/maxi/SISTEMAS/erp`) con `node`.

Ubicación: `server/scripts/ARCA/`

| Script | Propósito | Consume automation AFIP SDK | Lee DB del tenant |
|---|---|---|---|
| `consultarComprobante.js` | Consultar datos de un comprobante por CAE o por nro+pv+tipo | No | Sí |
| `checkPuntosVenta.js` | Listar TODOS los puntos de venta vía API directa de afipsdk.com | **Sí** (1 automation) | **Sí** |
| `checkPuntosVentaArca.js` | Listar TODOS los puntos de venta vía SDK `CreateAutomation("list-sales-points")` | **Sí** (1 automation) | **Sí** |
| `checkPuntosVentaWSFE.js` | Listar solo los PVs habilitados para WSFE (facturación electrónica por web service) | No | **Sí** |

> Todos los scripts reciben `<tenant>` como primer argumento y leen CUIT/password/certificados desde `parametrosGlobales` del tenant. Detectan DEV/PROD automáticamente vía `afipsdk_prod`.

---

## Requisitos generales

- Node instalado (usa el mismo runtime que el servidor)
- PostgreSQL corriendo con la DB del tenant accesible
- El servidor **NO** necesita estar corriendo — los scripts se conectan directo
- Credenciales AFIP del tenant cargadas en `parametrosGlobales`:
  - `afipsdk_prod` (`'0'` para DEV, cualquier otro valor para PROD)
  - `afipsdk_cuit`
  - `afipsdk_password` (para los scripts que usan automation: `checkPuntosVenta.js` y `checkPuntosVentaArca.js`)
  - `afipsdk_cert_dev` + `afipsdk_key_dev` (en DEV, para `checkPuntosVentaWSFE.js`)
  - `afipsdk_cert_prod` + `afipsdk_key_prod` (en PROD, para `checkPuntosVentaWSFE.js`)
- `access_token` de AFIP SDK: actualmente **hardcodeado** al tope de cada script (misma constante en los 4). Si rota, hay que actualizarlo en los 4 archivos.

---

## 1) `consultarComprobante.js`

Consulta un comprobante en AFIP. Se conecta a la DB del tenant, lee las credenciales AFIP de `parametrosGlobales` y llama `getVoucherInfo` para traer los datos completos desde AFIP.

### Modos de uso

**a) Por CAE** — busca en `transaccionTipoFactura` para obtener número, punto de venta y tipo:

```bash
node server/scripts/ARCA/consultarComprobante.js <tenant> --cae <CAE>
```

Ejemplos:
```bash
node server/scripts/ARCA/consultarComprobante.js demo --cae 86130023721483
node server/scripts/ARCA/consultarComprobante.js lutente --cae 75089222742305
```

**b) Por número + punto de venta + tipo** — consulta directa a AFIP, sin pasar por la DB. Útil cuando se conocen los datos o el registro no está en la base:

```bash
node server/scripts/ARCA/consultarComprobante.js <tenant> --numero <nro> --pv <puntoVenta> --tipo <cbteTipo>
```

Ejemplo:
```bash
node server/scripts/ARCA/consultarComprobante.js demo --numero 346 --pv 1 --tipo 6
```

### Tipos de comprobante (`cbteTipo`)

| Código | Descripción |
|---|---|
| 1 | Factura A |
| 2 | Nota de Débito A |
| 3 | Nota de Crédito A |
| 6 | Factura B |
| 7 | Nota de Débito B |
| 8 | Nota de Crédito B |
| 11 | Factura C |
| 12 | Nota de Débito C |
| 13 | Nota de Crédito C |
| 51 | Factura M |
| 52 | Nota de Débito M |
| 53 | Nota de Crédito M |

### Qué hace internamente

1. Se conecta a la DB del tenant usando `conexionDB(tenant, 'script')`
2. Lee de `parametrosGlobales`: `afipsdk_prod`, `afipsdk_cuit`, `afipsdk_cert_dev|prod`, `afipsdk_key_dev|prod`
3. Detecta ambiente DEV/PROD automáticamente (`afipsdk_prod === '0'` → DEV)
4. Si `--cae`: busca en `transaccionTipoFactura` el registro, extrae `numeroFactura`, `puntoVenta`, `idTipoFactura`
5. Mapea `idTipoFactura` (ERP) → `CbteTipo` (AFIP) vía `FACTURA_ID_TO_CBTE`: `{1→1, 2→6, 3→11, 7→51}`
6. Si `puntoVenta` es NULL (facturas históricas anteriores al cambio que agregó la columna), usa PV 1 como fallback
7. Llama `EB.getVoucherInfo(numero, puntoVenta, cbteTipo)`
8. Imprime importes, IVA detallado, comprobantes asociados y observaciones
9. Si se usó `--cae`, compara el CAE de la DB con el de AFIP para verificar consistencia

### Salida ejemplo

```
[Config] Tenant: DESARROLLO | CUIT: 20285678499

[DB] Buscando CAE: 86130023721483 en transaccionTipoFactura...

--- Datos en nuestra DB ---
  idTransaccion:   1459
  idTipoFactura:   2 (B)
  CAE:             86130023721483
  numeroFactura:   346
  puntoVenta:      NULL (no grabado)

[AFIP] Consultando getVoucherInfo(346, 1, 6) → Factura B...

--- Datos desde AFIP ---
  Resultado:         ✅ Aprobado
  CAE:               86130023721483
  Tipo Comprobante:  6 (Factura B)
  Punto de Venta:    1
  Número:            346
  ImpTotal:    $1405.42
  ImpNeto:     $1161.5
  ImpIVA:      $243.91

=== Comparación DB vs AFIP ===
  CAE DB:   86130023721483
  CAE AFIP: 86130023721483
  Match:    ✅ Coinciden
```

### Consumo de requests AFIP

- `getVoucherInfo`: 1 request por consulta (no es automation, cae dentro del plan WSFE normal)
- La búsqueda por CAE en la DB local no consume requests

### Notas

- En DEV no necesita `access_token` para `getVoucherInfo` (a diferencia de `getSalesPoints`)
- Para facturas históricas sin `puntoVenta` grabado, el fallback es PV 1

---

## 2) `checkPuntosVenta.js`

Lista **todos** los puntos de venta de un tenant en ARCA usando una llamada directa a la API REST de `app.afipsdk.com` (sin pasar por el SDK Node). Consume **1 automation**.

Lee CUIT + password desde `parametrosGlobales` del tenant.

### Uso

```bash
node server/scripts/ARCA/checkPuntosVenta.js <tenant>
```

Ejemplos:

```bash
node server/scripts/ARCA/checkPuntosVenta.js demo
node server/scripts/ARCA/checkPuntosVenta.js lutente
```

### Qué hace

1. Se conecta a la DB del tenant (`conexionDB(tenant, 'script')`)
2. Lee `afipsdk_cuit`, `afipsdk_password`, `afipsdk_prod` de `parametrosGlobales`
3. Hace `POST https://app.afipsdk.com/api/v1/automations` con `automation: 'list-sales-points'` y los params del tenant
4. Si la respuesta es `complete`, imprime resultados
5. Si no, hace polling cada 5 segundos hasta 30 intentos (~2.5 min) al endpoint `GET /automations/:id`
6. Imprime tabla con: número, activo, usado, sistema, dirección

### Salida ejemplo

```
[Config] Tenant: demo | Ambiente: DESARROLLO | CUIT: 20285678499
=== Consultando puntos de venta via API directa ===

Automation ID: abc123 Status: pending
  Intento 1: status=pending
  Intento 2: status=complete

Total: 5 puntos de venta

#    Activo  Usado  Sistema                                    Dirección
----------------------------------------------------------------------------------
1    SI      SI     RECE para aplicativo y web services        Av. Corrientes 1234
24   SI      NO     RECE para aplicativo y web services        -
```

### Cuándo usarlo

- Cuando querés ver **todos** los PVs que existen en ARCA (activos, inactivos, usados y no usados), no solo los habilitados para WSFE
- Si el SDK Node no está disponible o no querés agregarlo como dependencia

### Notas

- Consume 1 automation del plan AFIP SDK
- Es equivalente funcional a `checkPuntosVentaArca.js` pero usa HTTP directo en lugar del wrapper SDK

---

## 3) `checkPuntosVentaArca.js`

Lista **todos** los puntos de venta de un tenant usando el SDK `@afipsdk/afip.js` con `CreateAutomation("list-sales-points")`. Funcionalmente equivalente a `checkPuntosVenta.js` pero usa el SDK en lugar de llamadas HTTP directas. Consume **1 automation**.

Lee CUIT + password desde `parametrosGlobales` del tenant.

### Uso

```bash
node server/scripts/ARCA/checkPuntosVentaArca.js <tenant>
```

Ejemplo:

```bash
node server/scripts/ARCA/checkPuntosVentaArca.js demo
```

### Qué hace

1. Se conecta a la DB del tenant (`conexionDB(tenant, 'script')`)
2. Lee `afipsdk_cuit`, `afipsdk_password`, `afipsdk_prod` de `parametrosGlobales`
3. Crea instancia `new Afip({ access_token })` (sin CUIT/cert porque es una automation, no un web service)
4. Llama `afipAuto.CreateAutomation("list-sales-points", { cuit, username, password }, true)` — el tercer parámetro `true` hace polling automático
5. Imprime tabla con: número, sistema, estado (`✅ Activo` o `❌ Baja`), usado, dirección
6. Calcula resumen: total activos, habilitados para WSFE, número máximo existente, próximo disponible
7. Imprime JSON completo

### Salida ejemplo

```
[Config] Tenant: demo | Ambiente: DESARROLLO | CUIT: 20285678499
=== Consultando puntos de venta para CUIT 20285678499 ===

Total: 5 puntos de venta

N°   Sistema                                           Activo    Usado   Dirección
----------------------------------------------------------------------------------
1    RECE para aplicativo y web services               ✅ Activo Sí      Av. Corrientes 1234
24   RECE para aplicativo y web services               ✅ Activo No      -

--- Resumen ---
Activos: 5
Habilitados para Web Services (WSFE): 3
Número máximo existente: 24
Próximo número disponible: 25
```

### Cuándo usarlo

- Alternativa a `checkPuntosVenta.js` cuando ya tenés el SDK instalado
- Más robusto porque el SDK maneja el polling y errores automáticamente
- Útil para saber cuál es el próximo número libre antes de crear un PV nuevo

---

## 4) `checkPuntosVentaWSFE.js`

Lista **solo** los puntos de venta habilitados para WSFE (Web Service de Factura Electrónica) usando `EB.getSalesPoints()`. **No consume automation** — es una consulta directa al web service de ARCA.

Lee CUIT + certificado + clave privada desde `parametrosGlobales` del tenant, y detecta DEV/PROD automáticamente vía `afipsdk_prod`.

### Uso

```bash
node server/scripts/ARCA/checkPuntosVentaWSFE.js <tenant>
```

Ejemplo:

```bash
node server/scripts/ARCA/checkPuntosVentaWSFE.js demo
```

### Qué hace

1. Se conecta a la DB del tenant (`conexionDB(tenant, 'script')`)
2. Lee `afipsdk_prod`, `afipsdk_cuit`, y según DEV/PROD usa `afipsdk_cert_dev`+`afipsdk_key_dev` o `afipsdk_cert_prod`+`afipsdk_key_prod`
3. Crea instancia `new Afip({ CUIT, cert, key, access_token, production })`
4. Llama `EB.getSalesPoints()` — consulta el WSFE real
5. Imprime el JSON con los PVs habilitados
6. Para cada PV devuelto, hace smoke test con `getLastVoucher(nro, 1)` (Factura A) para verificar que el web service responde
7. Si `getSalesPoints()` tira error 602 (sin resultados), imprime un mensaje explicando las posibles causas:
   - El certificado no tiene autorizado el servicio wsfe
   - AFIP aún no propagó el PV (puede tardar horas)
   - Falta delegar/autorizar el web service wsfe para el CUIT+certificado

### Salida ejemplo (éxito)

```
[Config] Tenant: demo | Ambiente: PRODUCCIÓN | CUIT: 24247542511

=== Consultando puntos de venta WSFE para CUIT 24247542511 ===

Puntos de venta habilitados en WSFE:
[
  { "Nro": 1, "EmisionTipo": "CAE", "Bloqueado": "N", "FchBaja": "NULL" },
  { "Nro": 24, "EmisionTipo": "CAE", "Bloqueado": "N", "FchBaja": "NULL" }
]

=== Smoke test: getLastVoucher por PV (CbteTipo 1 = Factura A) ===
  PV 1: último Factura A = 342
  PV 24: último Factura A = 0
```

### Salida ejemplo (error 602)

```
Error 602: Sin resultados — NO hay puntos de venta habilitados para WSFE.

Esto significa que aunque el PV 24 existe en ARCA como "RECE para aplicativo y web services",
el web service WSFE no lo reconoce. Posibles causas:
  1) El certificado actual no tiene autorizado el servicio wsfe
  2) AFIP aún no propagó el PV (puede tardar horas)
  3) Falta delegar/autorizar el web service wsfe para este CUIT+certificado
```

### Cuándo usarlo

- Cuando necesitás confirmar que un PV está realmente habilitado para facturar por web service (no basta con que exista en ARCA)
- Para diagnosticar por qué el ERP no puede facturar contra un PV que "debería" estar habilitado
- Para verificar que el certificado tiene autorizado el servicio `wsfe`

### Diferencia clave con `checkPuntosVenta*.js`

| | `checkPuntosVenta[Arca].js` | `checkPuntosVentaWSFE.js` |
|---|---|---|
| Fuente | Scraping ARCA (portal web) vía automation | Web service WSFE real |
| Consume automation | **Sí** | No |
| Devuelve | TODOS los PVs registrados en ARCA | Solo los habilitados para WSFE |
| Requiere certificado | No (usa password del portal) | **Sí** (cert + key válidos) |
| Uso típico | Exploración / descubrimiento | Diagnóstico / verificación de habilitación |

Un PV puede existir en ARCA (y aparecer en los scripts de scraping) pero **no** estar habilitado para WSFE. Este último script es el que te dice si el ERP realmente va a poder facturar contra ese PV.

---

## Notas transversales

### Detección DEV/PROD

Los 4 scripts detectan automáticamente el ambiente leyendo `afipsdk_prod` de `parametrosGlobales`:
- `'0'` → DEV (usa `afipsdk_cert_dev` / `afipsdk_key_dev` cuando corresponde)
- cualquier otro valor (típicamente `'1'`) → PROD (usa `afipsdk_cert_prod` / `afipsdk_key_prod` cuando corresponde)

### Seguridad

✅ **Ningún script tiene CUIT, password ni certificados hardcodeados** — todo se lee de `parametrosGlobales` según el tenant que se pasa como argumento.

⚠️ El `access_token` del plan AFIP SDK **sigue hardcodeado** al tope de cada archivo (misma constante en los 4). Cuando rote, actualizarlo en los 4 scripts. Idealmente migrar a `parametrosGlobales` (`afipsdk_access_token`) o a variable de entorno.

### Tabla resumen por caso de uso

| Necesito... | Script |
|---|---|
| Ver qué datos tiene AFIP para un comprobante que ya emití | `consultarComprobante.js --cae` |
| Consultar un comprobante arbitrario sin pasar por la DB | `consultarComprobante.js --numero --pv --tipo` |
| Verificar si un CAE en la DB coincide con el de AFIP | `consultarComprobante.js --cae` |
| Ver todos los PVs de un CUIT (incluso los no habilitados para WSFE) | `checkPuntosVenta.js` o `checkPuntosVentaArca.js` |
| Saber el próximo número de PV libre antes de crear uno nuevo | `checkPuntosVentaArca.js` (ya calcula el resumen) |
| Confirmar que un PV está habilitado para facturar por web service | `checkPuntosVentaWSFE.js` |
| Diagnosticar por qué el ERP no puede facturar contra un PV | `checkPuntosVentaWSFE.js` |
