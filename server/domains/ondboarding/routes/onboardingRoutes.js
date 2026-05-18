const express = require("express");

const onboardingController = require("../controllers/onboardingController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/health", asyncHandler(onboardingController.health));
router.post("/email/check", asyncHandler(onboardingController.checkEmailStatus));
router.post("/email/request", asyncHandler(onboardingController.requestEmailVerification));
router.get("/email/verify", asyncHandler(onboardingController.verifyEmail));

router.post("/submissions", asyncHandler(onboardingController.createSubmission));
router.get("/submissions", asyncHandler(onboardingController.listSubmissions));
router.get("/submissions/:id", asyncHandler(onboardingController.getSubmissionById));
router.post("/submissions/:id/generate-tenant", asyncHandler(onboardingController.generateTenant));

module.exports = router;
