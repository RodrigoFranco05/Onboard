const express = require("express")
const router = express.Router()

const {
  getFichajes,
  postFichaje,
  updateFichaje,
} = require("../controllers/fichajeController.js")

router.get("/", getFichajes)
router.post("/", postFichaje)
router.put("/:id", updateFichaje)

module.exports = router
