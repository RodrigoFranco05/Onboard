/**
 * Seed de pedidos de prueba (mockup → datos reales)
 *
 * Uso:
 *   node server/scripts/seed-pedidos-mockup.js <tenant>
 *
 * Qué hace:
 *   1. Crea/reutiliza entidades (clientes) con los nombres del mockup
 *   2. Crea/reutiliza ubicaciones "Amazon" y "Mercado Libre"
 *   3. Reutiliza items ya existentes en la DB (si no hay, aborta)
 *   4. Genera 100 pedidos (Transaccion con idTipoTransaccion=13, estado, idEntidad, idUbicacion)
 *      + sus TransaccionItem correspondientes
 *
 * Idempotencia:
 *   - Entidades y ubicaciones: findOrCreate por descripción.
 *   - Pedidos: cada uno se marca con descripcion "[SEED-MOCKUP] ...".
 *     Al re-ejecutar el script, se borran los pedidos de seed previos (y sus items)
 *     y se generan 100 nuevos. Las entidades/ubicaciones se mantienen.
 */

const { Op } = require('sequelize');
const { conexionDB } = require('../config/db');

const TIPO_TRANSACCION_PEDIDO = 13;
const TIPO_TRANSACCION_VENTA = 1;
const TIPO_ENTIDAD_CLIENTE = 1;
const SEED_MARKER = '[SEED-MOCKUP]';
const TOTAL_PEDIDOS = 100;
const MAX_ITEMS_DISPONIBLES = 50;

const CLIENTES_MOCKUP = [
  { descripcion: 'Juan', apellido: 'Pérez', dniCuitCuil: '12345678', direccion: 'Av. Corrientes 1234, CABA' },
  { descripcion: 'Ana', apellido: 'Rodríguez', dniCuitCuil: '87654321', direccion: 'Calle Falsa 123, Palermo' },
  { descripcion: 'Roberto', apellido: 'Silva', dniCuitCuil: '11223344', direccion: 'San Martín 567, Belgrano' },
  { descripcion: 'Sofía', apellido: 'González', dniCuitCuil: '55667788', direccion: 'Rivadavia 890, Caballito' },
  { descripcion: 'Miguel', apellido: 'Torres', dniCuitCuil: '99887766', direccion: 'Libertador 2345, Núñez' },
  { descripcion: 'Carmen', apellido: 'Vega', dniCuitCuil: '44556677', direccion: 'Av. Santa Fe 1567, Recoleta' },
  { descripcion: 'Luis', apellido: 'Morales', dniCuitCuil: '33445566', direccion: 'Av. Cabildo 2890, Belgrano' },
  { descripcion: 'María', apellido: 'Fernández', dniCuitCuil: '22334455', direccion: 'Córdoba 3456, Palermo' },
  { descripcion: 'Diego', apellido: 'Ramírez', dniCuitCuil: '66778899', direccion: 'Callao 789, Recoleta' },
  { descripcion: 'Laura', apellido: 'Herrera', dniCuitCuil: '77889900', direccion: 'Pueyrredón 1234, Almagro' },
  { descripcion: 'Pablo', apellido: 'Navarro', dniCuitCuil: '88990011', direccion: 'Scalabrini Ortiz 567, Villa Crespo' },
  { descripcion: 'Carolina', apellido: 'Medina', dniCuitCuil: '99001122', direccion: 'Av. Warnes 890, Villa Crespo' },
  { descripcion: 'Fernando', apellido: 'Ortiz', dniCuitCuil: '10111213', direccion: 'Av. Juan B. Justo 2345, Palermo' },
  { descripcion: 'Patricia', apellido: 'Díaz', dniCuitCuil: '14151617', direccion: 'Honduras 4567, Palermo Soho' },
  { descripcion: 'Alejandro', apellido: 'Castro', dniCuitCuil: '18192021', direccion: 'Gorriti 5678, Palermo Hollywood' },
];

const UBICACIONES_MOCKUP = ['Amazon', 'Mercado Libre'];

// Distribución de estados (suma = 100 pero el método funciona con cualquier total)
const ESTADOS_DISTRIBUCION = [
  { estado: 'pendiente', peso: 30 },
  { estado: 'recibido', peso: 25 },
  { estado: 'despachado', peso: 25 },
  { estado: 'entregado', peso: 20 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(opciones) {
  const totalPeso = opciones.reduce((s, o) => s + o.peso, 0);
  let r = Math.random() * totalPeso;
  for (const opt of opciones) {
    r -= opt.peso;
    if (r <= 0) return opt.estado;
  }
  return opciones[opciones.length - 1].estado;
}

function randomFechaDiasAtras(maxDias) {
  const ahora = Date.now();
  const diasMs = randomInt(0, maxDias) * 24 * 60 * 60 * 1000;
  const horasMs = randomInt(0, 23) * 60 * 60 * 1000;
  const minutosMs = randomInt(0, 59) * 60 * 1000;
  return new Date(ahora - diasMs - horasMs - minutosMs);
}

function shuffleSlice(arr, n) {
  const copia = arr.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

async function main() {
  const tenant = process.argv[2];
  if (!tenant) {
    console.error('❌ Falta tenant.');
    console.error('   Uso: node server/scripts/seed-pedidos-mockup.js <tenant>');
    process.exit(1);
  }

  console.log(`🔌 Conectando a tenant "${tenant}"...`);
  const sequelize = await conexionDB(tenant);
  const { Entidad, Ubicacion } = sequelize.models;
  const { Transaccion, TransaccionItem, TransaccionPago, Pago, MedioDePago } = sequelize.models;
  const { Item } = sequelize.models;

  if (!Entidad || !Ubicacion || !Transaccion || !TransaccionItem || !Item || !TransaccionPago || !Pago || !MedioDePago) {
    throw new Error('No se cargaron todos los modelos requeridos.');
  }

  const t = await sequelize.transaction();
  try {
    // 1. LIMPIAR TODOS LOS PEDIDOS (idTipoTransaccion=13) EN CASCADA
    console.log('🧹 Eliminando todos los pedidos existentes (idTipoTransaccion=13)...');
    const previos = await Transaccion.findAll({
      where: { idTipoTransaccion: TIPO_TRANSACCION_PEDIDO },
      attributes: ['id'],
      transaction: t,
    });
    const previosIds = previos.map((p) => p.id);
    if (previosIds.length > 0) {
      // Ventas autogeneradas a partir de estos pedidos (link via transaccionAsociada)
      const ventasAsociadas = await Transaccion.findAll({
        where: {
          idTipoTransaccion: TIPO_TRANSACCION_VENTA,
          transaccionAsociada: { [Op.in]: previosIds },
        },
        attributes: ['id'],
        transaction: t,
      });
      const ventaIds = ventasAsociadas.map((v) => v.id);
      const transaccionIds = [...previosIds, ...ventaIds];

      // TransaccionPago → capturar idPago para luego borrar Pago huérfano
      const transaccionPagos = await TransaccionPago.findAll({
        where: { idTransaccion: { [Op.in]: transaccionIds } },
        attributes: ['idPago'],
        transaction: t,
      });
      const pagoIds = [...new Set(transaccionPagos.map((tp) => tp.idPago))];

      await TransaccionPago.destroy({
        where: { idTransaccion: { [Op.in]: transaccionIds } },
        transaction: t,
        force: true,
      });
      if (pagoIds.length > 0) {
        await Pago.destroy({
          where: { id: { [Op.in]: pagoIds } },
          transaction: t,
          force: true,
        });
      }
      await TransaccionItem.destroy({
        where: { idTransaccion: { [Op.in]: transaccionIds } },
        transaction: t,
        force: true,
      });
      await Transaccion.destroy({
        where: { id: { [Op.in]: transaccionIds } },
        transaction: t,
        force: true,
      });
      console.log(`   Eliminados ${previosIds.length} pedidos, ${ventaIds.length} ventas asociadas, ${pagoIds.length} pagos, y sus items/transaccionPagos.`);
    } else {
      console.log('   No había pedidos previos.');
    }

    // 2. ASEGURAR ENTIDADES (clientes)
    console.log('👤 Asegurando entidades...');
    const entidadIds = [];
    for (const cliente of CLIENTES_MOCKUP) {
      const [entidad, creada] = await Entidad.findOrCreate({
        where: {
          descripcion: cliente.descripcion,
          apellido: cliente.apellido,
          idTipoEntidad: TIPO_ENTIDAD_CLIENTE,
        },
        defaults: {
          ...cliente,
          idTipoEntidad: TIPO_ENTIDAD_CLIENTE,
          eliminado: false,
        },
        transaction: t,
      });
      entidadIds.push(entidad.id);
      if (creada) console.log(`   + Creada: ${cliente.descripcion} ${cliente.apellido} (id=${entidad.id})`);
    }
    console.log(`   Total: ${entidadIds.length} entidades disponibles.`);

    // 3. ASEGURAR UBICACIONES
    console.log('📍 Asegurando ubicaciones...');
    const ubicacionIds = [];
    for (const desc of UBICACIONES_MOCKUP) {
      const [ubicacion, creada] = await Ubicacion.findOrCreate({
        where: { descripcion: desc },
        defaults: { descripcion: desc, eliminado: false },
        transaction: t,
      });
      ubicacionIds.push(ubicacion.id);
      if (creada) console.log(`   + Creada: ${desc} (id=${ubicacion.id})`);
    }
    console.log(`   Total: ${ubicacionIds.length} ubicaciones disponibles.`);

    // 4. REUTILIZAR ITEMS EXISTENTES
    console.log('📦 Cargando items existentes...');
    const items = await Item.findAll({
      where: { eliminado: false },
      attributes: ['id', 'descripcion', 'codigo'],
      limit: MAX_ITEMS_DISPONIBLES,
      transaction: t,
    });
    if (items.length === 0) {
      throw new Error('No hay items en la DB. Crear al menos un item antes de correr el seed.');
    }
    console.log(`   ${items.length} items disponibles para armar pedidos.`);

    // 4b. REUTILIZAR MEDIOS DE PAGO EXISTENTES (para sembrar Pagos en estados != pendiente)
    console.log('💳 Cargando medios de pago existentes...');
    const mediosDePago = await MedioDePago.findAll({
      where: { eliminado: false },
      attributes: ['id'],
      transaction: t,
    });
    if (mediosDePago.length === 0) {
      throw new Error('No hay medios de pago en la DB. Crear al menos uno antes de correr el seed.');
    }
    console.log(`   ${mediosDePago.length} medios de pago disponibles.`);

    // 5. CREAR 100 PEDIDOS
    console.log(`🛒 Creando ${TOTAL_PEDIDOS} pedidos...`);
    let resumen = { pendiente: 0, recibido: 0, despachado: 0, entregado: 0 };
    for (let i = 1; i <= TOTAL_PEDIDOS; i++) {
      const estado = pickWeighted(ESTADOS_DISTRIBUCION);
      const fecha = randomFechaDiasAtras(30);
      const idEntidad = entidadIds[randomInt(0, entidadIds.length - 1)];
      const idUbicacion = ubicacionIds[randomInt(0, ubicacionIds.length - 1)];

      const cantidadItems = randomInt(1, Math.min(5, items.length));
      const itemsElegidos = shuffleSlice(items, cantidadItems);

      let montoTotal = 0;
      const lineas = itemsElegidos.map((it) => {
        const cantidad = randomInt(1, 5);
        const precio = randomInt(500, 15000);
        const monto = cantidad * precio;
        montoTotal += monto;
        return { idItem: it.id, cantidad, precio, montoTotal: monto };
      });

      const pedido = await Transaccion.create(
        {
          fecha,
          montoTotal,
          idTipoTransaccion: TIPO_TRANSACCION_PEDIDO,
          idEntidad,
          idUbicacion,
          estado,
          fechaHoraCreacion: fecha,
          descripcion: `${SEED_MARKER} Pedido mockup #${i}`,
          afectaCuentaCorriente: false,
          eliminado: false,
        },
        { transaction: t }
      );

      for (const linea of lineas) {
        await TransaccionItem.create(
          {
            idTransaccion: pedido.id,
            idItem: linea.idItem,
            cantidad: linea.cantidad,
            precio: linea.precio,
            montoTotal: linea.montoTotal,
            eliminado: false,
          },
          { transaction: t }
        );
      }

      // Para estados distintos de "pendiente" sembrar Pago + TransaccionPago
      if (estado !== 'pendiente') {
        const idMedioDePago = mediosDePago[randomInt(0, mediosDePago.length - 1)].id;
        const pago = await Pago.create(
          {
            idMoneda: 1,
            cotizacion: 1,
            idMedioDePago,
            montoTotal,
            eliminado: false,
          },
          { transaction: t }
        );
        await TransaccionPago.create(
          {
            idTransaccion: pedido.id,
            idPago: pago.id,
            eliminado: false,
          },
          { transaction: t }
        );
      }

      resumen[estado]++;
      if (i % 20 === 0) console.log(`   ${i}/${TOTAL_PEDIDOS} pedidos creados...`);
    }

    await t.commit();
    console.log('');
    console.log('✅ Seed finalizado.');
    console.log(`   Pendiente:  ${resumen.pendiente}`);
    console.log(`   Recibido:   ${resumen.recibido}`);
    console.log(`   Despachado: ${resumen.despachado}`);
    console.log(`   Entregado:  ${resumen.entregado}`);
    console.log(`   Total:      ${TOTAL_PEDIDOS}`);
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('');
    console.error('❌ Error ejecutando el seed:');
    console.error(error.message || error);
    if (error.sql) console.error('   SQL:', error.sql);
    process.exit(1);
  });
