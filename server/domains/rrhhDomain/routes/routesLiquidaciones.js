const express = require("express")
const router = express.Router()

const {
  getLiquidaciones,
  getLiquidacionById,
  postLiquidacion,
  updateLiquidacion,
  postRecalcularLiquidacion,
  getNovedadesLiquidacion,
  postNovedadLiquidacion,
  updateNovedadLiquidacion,
} = require("../controllers/liquidacionController.js")

router.get("/novedades", getNovedadesLiquidacion)
router.post("/novedades", postNovedadLiquidacion)
router.put("/novedades/:idNovedad", updateNovedadLiquidacion)

router.post("/:idLiquidacion/recalcular", postRecalcularLiquidacion)
router.get("/:idLiquidacion", getLiquidacionById)
router.put("/:idLiquidacion", updateLiquidacion)
router.get("/", getLiquidaciones)
router.post("/", postLiquidacion)

module.exports = router
