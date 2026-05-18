const express = require("express");

const onboardingRoutes = require("./onboardingRoutes");
const onboardRoutes = require("./onboardRoutes");

const router = express.Router();

router.use("/onboarding", onboardingRoutes);
router.use("/onboard", onboardRoutes);

module.exports = router;
