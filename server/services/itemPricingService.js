// server/services/itemPricingService.js
const { conexionDB } = require("../config/db.js");
const { transaccionModelInit } = require("../models/transaccionModel.js");
const { itemModelInit } = require("../models/itemModel.js");
const { definirAsociaciones, definirAsociacionesItemUbicaciones } = require('../models/associations.js');

async function getPrecioActualItem(idItem, cookies) {
	const sequelize = await conexionDB(cookies.tenant, cookies.usuario);
	const { Item , ItemUbicacion } = itemModelInit(sequelize);
	const { ListaDeMontos } = transaccionModelInit(sequelize);
	definirAsociaciones({ Item, ListaDeMontos });
	definirAsociacionesItemUbicaciones({ Item, ItemUbicacion });

	const rows = await Item.findAll({
		where: { eliminado: false, publicadoEcommerce: true, id: idItem },
		include: [{
			model: ListaDeMontos,
			as: "listaMontos",
			where: { eliminado: false, idUbicacion: 1, idEntidad: 1 },
			required: true,
			attributes: ['monto','fecha'],
		}],
		limit: 1
	});
	if (!rows.length) throw new Error(`Item ${idItem} no encontrado o sin montos`);
	const lista = rows[0].get({ plain: true }).listaMontos || [];
	if (!lista.length) throw new Error(`Item ${idItem} sin montos vigentes`);
	const precioActual = lista.sort((a,b) => new Date(b.fecha) - new Date(a.fecha))[0]?.monto ?? null;
	if (precioActual == null) throw new Error(`Item ${idItem} sin precio actual`);
	return Number(precioActual);
}

module.exports = { getPrecioActualItem };