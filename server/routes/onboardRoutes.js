const express = require("express");

const onboardController = require("../controllers/onboardController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/getemailsconfirmed", asyncHandler(onboardController.getEmailsConfirmed));
router.post("/sendEmailConfirmation", asyncHandler(onboardController.sendEmailConfirmation));
router.get("/email/verify", asyncHandler(onboardController.verifyEmail));
router.post("/personal", asyncHandler(onboardController.personalDataPost));
router.post("/modulos", asyncHandler(onboardController.userModules));
router.post("/submissions/:id/generate-tenant", asyncHandler(onboardController.generateTenant));

module.exports = router;
