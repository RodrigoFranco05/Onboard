# Arquitectura de Dominios - ERP Lutente

Este documento describe la arquitectura por dominios implementada en el backend del ERP.

## Tabla de Contenido
- [Introducción](#introducción)
- [Conceptos Clave](#conceptos-clave)
- [Patrón de 3 Capas](#patrón-de-3-capas)
- [Controllers Generales vs Específicos](#controllers-generales-vs-específicos)
- [Index como Fachada](#index-como-fachada)
- [Estructura de Archivos](#estructura-de-archivos)
- [Ejemplos Completos](#ejemplos-completos)
- [Reglas y Mejores Prácticas](#reglas-y-mejores-prácticas)

---

## Introducción

El sistema se organiza en **dominios** independientes que encapsulan la lógica de negocio relacionada:
- **AdminDomain**: Ubicaciones, negocios, entidades (clientes, proveedores)
- **ItemDomain**: Productos/items, gestión de inventario
- **TransaccionDomain**: Transacciones (ventas, preventas, compras)

Cada dominio expone sus funcionalidades a través de:
1. **Index** (punto de entrada único)
2. **Controllers** (con 3 capas internas: Services, Controllers, Policies)
3. **Routes** (endpoints HTTP)

---

## Conceptos Clave

### 1. Separación por Dominios
Cada dominio es independiente y puede ser migrado/refactorizado sin afectar a otros.

### 2. Convivencia de Rutas
Las rutas nuevas (`/adminDomain`, `/itemDomain`, `/transaccionDomain`) conviven con las viejas (`/adminAPI`, `/itemAPI`, `/transaccionAPI`) para permitir migración gradual.

### 3. Reutilización Cross-Domain
Los dominios pueden usar funciones de otros dominios importando desde el **Index** correspondiente.

---

## Patrón de 3 Capas

Cada controller se organiza internamente en 3 capas claramente delimitadas:

```
┌─────────────────────────────────────────┐
│         SERVICES (Funciones Puras)       │
│  • Sin side effects                      │
│  • NO acceden a DB ni req/res            │
│  • Validaciones, parseos, cálculos       │
│  • Reutilizables en cualquier parte      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      CONTROLLERS (Acceso a Base)         │
│  • Funciones async                       │
│  • Reciben tenant/usuario                │
│  • NO reciben req/res                    │
│  • Retornan datos puros                  │
│  • Reutilizables cross-domain            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      POLICIES (Lógica de Negocio)        │
│  • Reciben req/res                       │
│  • Validan entrada                       │
│  • Orquestan services y controllers      │
│  • Manejan errores y respuestas HTTP     │
│  • Se exportan a las rutas               │
└─────────────────────────────────────────┘
```

### Ejemplo Práctico:

```javascript
// ============================================
// SERVICES: FUNCIONES ATOMICAS
// ============================================

const truncarMonto = (obj) => {
  if (obj && typeof obj.monto === "number") {
    obj.monto = Math.trunc(obj.monto * 100) / 100
  }
  return obj
}

// ============================================
// CONTROLLER: ACCESO A LA BASE
// ============================================

const findUbicacionesDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Ubicacion } = adminModelInit(sequelize)
  
  return await Ubicacion.findAll({
    where: { eliminado: false }
  })
}

// ============================================
// POLICY: LOGICA DE NEGOCIO
// ============================================

const getUbicacion = async (req, res) => {
  try {
    // CONTROLLER: Buscar ubicaciones
    const ubicacion = await findUbicacionesDB(
      req.cookies.tenant, 
      req.cookies.usuario
    )
    
    res.status(200).json(ubicacion)
  } catch (error) {
    res.status(500).json({ message: "Error", error })
  }
}
```

---

## Controllers Generales vs Específicos

### Controllers GENERALES

**Ubicación**: `adminController.js`, `entidadController.js`, `itemController.js`, `transaccionController.js`

**Características**:
- Contienen lógica **reutilizable** por múltiples componentes
- Son como "bibliotecas" del dominio
- **Exportan MUCHAS funciones** (policies + controllers + services)
- Otros controllers importan de ellos

**Exports típicos**:
```javascript
module.exports = {
  // POLICIES (para routes Y para controllers específicos)
  getUbicacion,
  getNegocio,
  
  // CONTROLLERS (para reutilizar en otros dominios)
  findUbicacionesDB,
  findNegociosDB,
  
  // SERVICES (para reutilizar en cualquier parte)
  validarEmail,
  normalizarTexto
}
```

### Controllers ESPECÍFICOS

**Ubicación**: `preventaController.js`, `ventaController.js`, `compraController.js` (futuros)

**Características**:
- Contienen lógica **específica** de un componente/feature
- **Importan desde Index** de otros dominios
- Tienen sus propias 3 capas internas
- **Solo exportan POLICIES** (para sus rutas específicas)

**Imports típicos**:
```javascript
// Imports base (conexionDB y modelos) - DIRECTAMENTE desde archivos
const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { transaccionModelInit } = require("../../../models/transaccionModel.js")

// Imports de funciones reutilizables - DESDE INDEX
const { 
  findUbicacionesDB, 
  findNegociosDB 
} = require("../../adminDomain/adminIndex.js")

const { 
  findItemByIdDB,
  normalizarPLU
} = require("../../itemDomain/itemIndex.js")
```

**Exports típicos**:
```javascript
module.exports = {
  // SOLO POLICIES (para routes específicas)
  crearPreventa,
  convertirPreventaAVenta,
  listarPreventasActivas
}
```

---

## Index como Fachada

Cada dominio tiene un **Index** que actúa como punto de entrada único:

```
┌─────────────────────────────────────────┐
│        preventaController.js             │
│         (Controller Específico)          │
└─────────────────────────────────────────┘
                ↓ importa
┌─────────────────────────────────────────┐
│         transaccionIndex.js              │
│            (FACHADA)                     │
│  • conexionDB, modelInit                 │
│  • createTransaccionDB                   │
│  • descontarStockLoteDB                  │
│  • validarLoteData                       │
└─────────────────────────────────────────┘
                ↑ re-exporta
┌─────────────────────────────────────────┐
│      transaccionController.js            │
│        (Controller General)              │
│  • Define todas las funciones            │
│  • Exporta policies + controllers +      │
│    services reutilizables                │
└─────────────────────────────────────────┘
```

### Ejemplo de Index:

```javascript
// transaccionIndex.js
const { conexionDB } = require("../../config/db.js")
const { transaccionModelInit } = require("../../models/transaccionModel.js")

// Importar funciones reutilizables del controller
const {
  createTransaccionDB,
  descontarStockLoteDB,
  validarLoteData,
  truncarMonto,
} = require("./controllers/transaccionController.js")

module.exports = {
  // Base (NOTA: conexionDB y modelos se re-exportan para otros dominios)
  conexionDB,
  transaccionModelInit,
  
  // CONTROLLERS (para otros dominios)
  createTransaccionDB,
  descontarStockLoteDB,
  
  // SERVICES (para cualquier parte)
  validarLoteData,
  truncarMonto,
}
```

**IMPORTANTE**: El controller NO debe importar `conexionDB` desde este index (causaría referencia circular). Los controllers importan directamente desde `../../config/db.js`.

### Ventajas del Index:

1. **Encapsulación**: La estructura interna puede cambiar sin afectar imports externos
2. **Documentación**: El Index muestra claramente qué es reutilizable
3. **Imports limpios**: No hay paths profundos
4. **Single source of truth**: Un solo lugar para todas las exportaciones
5. **Facilita refactorización**: Puedes mover funciones entre controllers sin romper imports

---

## Estructura de Archivos

```
server/domains/
  ├── adminDomain/
  │   ├── adminIndex.js                    (Fachada del dominio)
  │   ├── controllers/
  │   │   ├── adminController.js           (GENERAL - reutilizable)
  │   │   ├── entidadController.js         (GENERAL - reutilizable)
  │   │   └── zPlantillaController.js      (Template para nuevos)
  │   └── routes/
  │       ├── routesAdmin.js
  │       └── routesEntidad.js
  │
  ├── itemDomain/
  │   ├── itemIndex.js                     (Fachada del dominio)
  │   ├── controllers/
  │   │   ├── itemController.js            (GENERAL - reutilizable)
  │   │   └── zPlantillaController.js      (Template)
  │   └── routes/
  │       └── routesItem.js
  │
  ├── transaccionDomain/
  │   ├── transaccionIndex.js              (Fachada del dominio)
  │   ├── controllers/
  │   │   ├── transaccionController.js     (GENERAL - reutilizable)
  │   │   ├── preventaController.js        (ESPECÍFICO - futuro)
  │   │   ├── ventaController.js           (ESPECÍFICO - futuro)
  │   │   └── zPlantillaController.js      (Template)
  │   └── routes/
  │       ├── routesTransaccion.js         (usa transaccionController)
  │       ├── routesPreVentas.js           (usa preventaController)
  │       └── routesVentas.js              (usa ventaController)
  │
  └── ARCHITECTURE.md                      (Este documento)
```

---

## Ejemplos Completos

### Ejemplo 1: Controller General Simple (adminController.js)

```javascript
// adminController.js - Controller GENERAL del dominio Admin
const { Op, conexionDB, adminModelInit } = require("../adminIndex.js")

// ============================================
// SERVICES: FUNCIONES ATOMICAS
// ============================================
// (ninguno necesario por ahora)

// ============================================
// CONTROLLER: ACCESO A LA BASE
// ============================================

const findUbicacionesDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Ubicacion } = adminModelInit(sequelize)
  
  return await Ubicacion.findAll({
    where: { [Op.or]: [{ eliminado: false }, { eliminado: null }] }
  })
}

const findNegociosDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Negocio } = adminModelInit(sequelize)
  
  return await Negocio.findAll({
    where: { [Op.or]: [{ eliminado: false }, { eliminado: null }] }
  })
}

// ============================================
// POLICY: LOGICA DE NEGOCIO
// ============================================

const getUbicacion = async (req, res) => {
  try {
    const ubicacion = await findUbicacionesDB(
      req.cookies.tenant, 
      req.cookies.usuario
    )
    res.status(200).json(ubicacion)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener ubicacion", error })
  }
}

const getNegocio = async (req, res) => {
  try {
    const negocio = await findNegociosDB(
      req.cookies.tenant, 
      req.cookies.usuario
    )
    res.status(200).json(negocio)
  } catch (error) {
    res.status(500).json({ message: "Error al obtener Negocio", error })
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // POLICIES (para routes Y controllers específicos)
  getUbicacion,
  getNegocio,
  
  // CONTROLLERS (para otros dominios)
  findUbicacionesDB,
  findNegociosDB,
}
```

### Ejemplo 2: Controller General Complejo (transaccionController.js)

```javascript
// transaccionController.js - Controller GENERAL del dominio Transacción
const { Op } = require("sequelize")
const { conexionDB, transaccionModelInit } = require("../transaccionIndex.js")
const { adminModelInit } = require("../../adminDomain/adminIndex.js")
const { itemModelInit } = require("../../itemDomain/itemIndex.js")

// ============================================
// SERVICES: FUNCIONES ATOMICAS
// ============================================

const truncarMonto = (obj) => {
  if (obj && typeof obj.monto === "number") {
    obj.monto = Math.trunc(obj.monto * 100) / 100
  }
  return obj
}

const validarLoteData = (lote) => {
  const { idLote, cantidad } = lote
  return idLote && cantidad && !isNaN(parseInt(idLote)) && !isNaN(parseFloat(cantidad))
}

const parseLoteData = (lote) => ({
  idLote: parseInt(lote.idLote),
  cantidad: parseFloat(lote.cantidad),
})

// ============================================
// CONTROLLER: ACCESO A LA BASE
// ============================================

const createTransaccionDB = async (tenant, usuario, data) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion } = transaccionModelInit(sequelize)
  
  if (data.afectaCuentaCorriente === true && !data.operacionParaCuentaCorriente) {
    data.operacionParaCuentaCorriente = "operacionCC"
  }
  
  const transaccion = new Transaccion(data)
  await transaccion.save()
  return transaccion
}

const descontarStockLoteDB = async (tenant, usuario, idLote, idUbicacion, cantidad) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { LoteItemUbicacion } = itemModelInit(sequelize)
  
  const loteItemUbicacion = await LoteItemUbicacion.findOne({
    where: { idLote, idUbicacion, eliminado: false }
  })
  
  if (!loteItemUbicacion || loteItemUbicacion.stock < cantidad) {
    return { success: false }
  }
  
  await loteItemUbicacion.update({
    stock: parseFloat(loteItemUbicacion.stock) - parseFloat(cantidad)
  })
  
  return { success: true }
}

// ============================================
// POLICY: LOGICA DE NEGOCIO
// ============================================

const postTransaccion = async (req, res) => {
  try {
    const transaccion = await createTransaccionDB(
      req.cookies.tenant,
      req.cookies.usuario,
      req.body
    )
    res.status(201).json(transaccion)
  } catch (error) {
    console.error("Error al crear transaccion:", error)
    res.status(400).json({ message: "Error al crear transaccion", error })
  }
}

const postTransaccionItem = async (req, res) => {
  const { idItem, cantidad, lotes, idUbicacion } = req.body
  
  if (!idItem || !cantidad) {
    return res.status(400).json({ message: "idItem o cantidad incompletos" })
  }
  
  try {
    // ... lógica compleja usando services y controllers
    res.status(201).json(transaccionItem)
  } catch (error) {
    res.status(400).json({ message: "Error", error })
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // POLICIES
  postTransaccion,
  postTransaccionItem,
  
  // CONTROLLERS
  createTransaccionDB,
  descontarStockLoteDB,
  
  // SERVICES
  truncarMonto,
  validarLoteData,
  parseLoteData,
}
```

### Ejemplo 3: Controller Específico (preventaController.js - Futuro)

```javascript
// preventaController.js - Controller ESPECÍFICO para preventas

// Importar desde INDEX (no directamente de controllers)
const { 
  createTransaccionDB,
  descontarStockLoteDB,
  validarLoteData 
} = require("../transaccionIndex.js")

const { 
  findUbicacionesDB,
  findEntidadByIdDB 
} = require("../../adminDomain/adminIndex.js")

const { 
  findItemsByConditionsDB 
} = require("../../itemDomain/itemIndex.js")

// ============================================
// SERVICES: FUNCIONES ATOMICAS (específicas de preventa)
// ============================================

const calcularDescuentoPreventa = (precio, tipoCliente) => {
  if (tipoCliente === "mayorista") return precio * 0.15
  if (tipoCliente === "distribuidor") return precio * 0.20
  return 0
}

const validarFechaPreventa = (fecha) => {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  return new Date(fecha) <= maxDate
}

// ============================================
// CONTROLLER: ACCESO A LA BASE (específicos de preventa)
// ============================================

const findPreventasActivasDB = async (tenant, usuario, idUbicacion) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Transaccion } = transaccionModelInit(sequelize)
  
  return await Transaccion.findAll({
    where: {
      idTipoTransaccion: 3, // Preventa
      idUbicacion,
      estado: "activa",
      eliminado: false
    },
    order: [["fecha", "DESC"]]
  })
}

// ============================================
// POLICY: LOGICA DE NEGOCIO (específicas de preventa)
// ============================================

const crearPreventa = async (req, res) => {
  const { idEntidad, items, fechaEntrega } = req.body
  
  if (!validarFechaPreventa(fechaEntrega)) {
    return res.status(400).json({ 
      message: "Fecha de entrega no puede ser mayor a 30 días" 
    })
  }
  
  try {
    // Usar controllers generales
    const entidad = await findEntidadByIdDB(
      req.cookies.tenant, 
      req.cookies.usuario, 
      idEntidad
    )
    
    // Usar service específico
    const descuento = calcularDescuentoPreventa(total, entidad.tipoCliente)
    
    // Crear preventa
    const preventa = await createTransaccionDB(
      req.cookies.tenant,
      req.cookies.usuario,
      {
        ...req.body,
        idTipoTransaccion: 3, // Preventa
        montoDescuento: descuento,
        estado: "pendiente"
      }
    )
    
    res.status(201).json(preventa)
  } catch (error) {
    res.status(400).json({ message: "Error al crear preventa", error })
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // SOLO POLICIES (para routes específicas)
  crearPreventa,
  listarPreventasActivas,
  convertirPreventaAVenta,
}
```

---

## Reglas y Mejores Prácticas

### 1. Imports de conexionDB y modelos: SIEMPRE desde archivos originales

**CRÍTICO para evitar referencias circulares:**

```javascript
// ✅ CORRECTO - Importar conexionDB y modelos desde archivos
const { Op } = require("sequelize")
const { conexionDB } = require("../../../config/db.js")
const { adminModelInit } = require("../../../models/adminModel.js")

// ❌ INCORRECTO - Importar desde index causa referencia circular
const { Op, conexionDB, adminModelInit } = require("../adminIndex.js")
```

**Razón**: El index importa de los controllers, y si los controllers importan del index, se crea una referencia circular que rompe la carga de módulos.

### 2. Imports de funciones reutilizables: SIEMPRE desde Index

```javascript
// ✅ CORRECTO - Funciones de otros dominios desde Index
const { findUbicacionesDB } = require("../../adminDomain/adminIndex.js")

// ❌ INCORRECTO - Importar directamente de controllers
const { findUbicacionesDB } = require("../../adminDomain/controllers/adminController.js")
```

### 3. Controllers puros (sin req/res)

```javascript
// ✅ CORRECTO - Controller puro
const findUbicacionesDB = async (tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario)
  const { Ubicacion } = adminModelInit(sequelize)
  return await Ubicacion.findAll({ where: { eliminado: false } })
}

// ❌ INCORRECTO - Controller con req/res
const findUbicacionesDB = async (req, res) => {
  const sequelize = await conexionDB(req.cookies.tenant, req.cookies.usuario)
  // ...
  res.status(200).json(ubicaciones) // NO!
}
```

### 4. Services sin side effects

```javascript
// ✅ CORRECTO - Service puro
const truncarMonto = (obj) => {
  if (obj && typeof obj.monto === "number") {
    obj.monto = Math.trunc(obj.monto * 100) / 100
  }
  return obj
}

// ❌ INCORRECTO - Service con acceso a DB
const truncarMonto = async (obj, tenant, usuario) => {
  const sequelize = await conexionDB(tenant, usuario) // NO!
  // ...
}
```

### 5. Policies orquestan

```javascript
// ✅ CORRECTO - Policy que orquesta
const crearRegistro = async (req, res) => {
  // Validar entrada
  if (!req.body.email) {
    return res.status(400).json({ message: "Email requerido" })
  }
  
  // SERVICE: Validar formato
  if (!validarEmail(req.body.email)) {
    return res.status(400).json({ message: "Email inválido" })
  }
  
  // CONTROLLER: Crear en DB
  const registro = await createRegistroDB(
    req.cookies.tenant, 
    req.cookies.usuario, 
    req.body
  )
  
  res.status(201).json(registro)
}
```

### 6. Exports según tipo de controller

**Controller General**:
```javascript
module.exports = {
  // POLICIES (muchas)
  getUbicacion,
  getNegocio,
  postTransaccion,
  
  // CONTROLLERS (muchos)
  findUbicacionesDB,
  createTransaccionDB,
  
  // SERVICES (muchos)
  truncarMonto,
  validarEmail,
}
```

**Controller Específico**:
```javascript
module.exports = {
  // SOLO POLICIES
  crearPreventa,
  listarPreventas,
}
```

### 7. Index decide qué exportar

Solo funciones **verdaderamente reutilizables** deben estar en el Index:

```javascript
// adminIndex.js
module.exports = {
  // Base (siempre)
  Op,
  conexionDB,
  adminModelInit,
  
  // Controllers reutilizables ✅
  findUbicacionesDB,    // Sí - usado por muchos
  findEntidadByIdDB,    // Sí - usado por muchos
  
  // Services reutilizables ✅
  parseTiposEntidad,    // Sí - útil para otros dominios
  validarEmail,         // Sí - útil en cualquier parte
}
```

### 8. Comentarios descriptivos

Cada función debe tener un comentario JSDoc simple:

```javascript
/**
 * Buscar ubicaciones activas
 */
const findUbicacionesDB = async (tenant, usuario) => {
  // ...
}
```

### 9. Nombres consistentes

- **Services**: `validar*`, `parsear*`, `calcular*`, `formatear*`, `normalizar*`
- **Controllers DB**: `find*DB`, `create*DB`, `update*DB`, `delete*DB`
- **Policies**: `get*`, `post*`, `put*`, `delete*`, `listar*`, `crear*`

### 10. Controllers específicos NO se importan entre sí

```javascript
// ❌ INCORRECTO
const { crearPreventa } = require("./preventaController.js") // desde ventaController

// ✅ CORRECTO - usar controller general
const { createTransaccionDB } = require("../transaccionIndex.js")
```

### 11. Mantener todo en un archivo

Solo separar en archivos si:
- El controller supera ~500 líneas
- Múltiples controllers necesitan exactamente las mismas funciones
- Por defecto: **TODO en un archivo**

---

## Diagrama Completo

```
┌──────────────────────────────────────────────────────────┐
│           preventaController.js (ESPECÍFICO)              │
│                  TransaccionDomain                        │
├──────────────────────────────────────────────────────────┤
│  IMPORTS desde Index:                                    │
│    ├─ require("../transaccionIndex.js")                  │
│    ├─ require("../../adminDomain/adminIndex.js")         │
│    └─ require("../../itemDomain/itemIndex.js")           │
│                                                           │
│  SERVICES: calcularDescuentoPreventa() (específico)      │
│  CONTROLLERS: findPreventasActivasDB() (específico)      │
│  POLICIES: crearPreventa(), convertirPreventaAVenta()    │
│  EXPORTS: solo policies                                  │
└──────────────────────────────────────────────────────────┘
                        ↓ importa desde
    ┌─────────────────────────────────────────────────┐
    │      transaccionIndex.js (FACHADA)               │
    ├─────────────────────────────────────────────────┤
    │  Re-exporta:                                     │
    │   ├─ conexionDB, transaccionModelInit (base)    │
    │   ├─ createTransaccionDB (controller)           │
    │   ├─ descontarStockLoteDB (controller)          │
    │   └─ validarLoteData (service)                  │
    └─────────────────────────────────────────────────┘
                        ↑ importa de
    ┌─────────────────────────────────────────────────┐
    │  transaccionController.js (GENERAL)              │
    ├─────────────────────────────────────────────────┤
    │  SERVICES: validarLoteData(), truncarMonto()     │
    │  CONTROLLERS: createTransaccionDB(),             │
    │               descontarStockLoteDB()             │
    │  POLICIES: postTransaccion(),                    │
    │            postTransaccionItem()                 │
    │  EXPORTS: todo (policies + controllers + svcs)  │
    └─────────────────────────────────────────────────┘
```

---

## Checklist para Nuevos Controllers

Al crear un nuevo controller, verificar:

- [ ] ¿Es GENERAL o ESPECÍFICO?
- [ ] Imports desde Index (no directamente de controllers)
- [ ] Secciones claramente delimitadas (Services / Controllers / Policies)
- [ ] Services son funciones puras (sin DB ni req/res)
- [ ] Controllers reciben tenant/usuario (no req/res)
- [ ] Policies manejan req/res
- [ ] Exports apropiados según tipo de controller
- [ ] Si es GENERAL, actualizar domainIndex.js
- [ ] Comentarios JSDoc en funciones públicas
- [ ] Nombres consistentes (validar*, find*DB, get*)

---

## Migración de Controllers Antiguos

Para migrar un controller antiguo al nuevo patrón:

1. **Identificar funciones helper internas** → Mover a sección SERVICES
2. **Extraer queries de DB** → Crear funciones controller sin req/res
3. **Mantener endpoints principales** → Como POLICIES que orquestan
4. **Actualizar exports** → Según tipo de controller
5. **Si es GENERAL** → Actualizar domainIndex.js
6. **Probar que todo funciona** → Las rutas no deberían cambiar

---

## Conclusión

Esta arquitectura permite:
- ✅ Separación clara de responsabilidades
- ✅ Reutilización de código entre dominios
- ✅ Migración gradual sin breaking changes
- ✅ Testeo fácil (services y controllers son puros)
- ✅ Escalabilidad (agregar controllers específicos sin tocar generales)
- ✅ Mantenibilidad (cada capa tiene un propósito claro)

**Consultar `zPlantillaController.js` como template para nuevos controllers.**
