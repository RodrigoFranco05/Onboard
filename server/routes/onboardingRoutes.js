const express = require("express");

const onboardingController = require("../controllers/onboardingController");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.get("/health", asyncHandler(onboardingController.health));
router.post("/email/check", asyncHandler(onboardingController.checkEmailStatus));
router.post("/email/request", asyncHandler(onboardingController.requestEmailVerification));
router.get("/email/verify", (req, res) => {
  const raw = req.query.token;
  const token = typeof raw === "string" ? raw : "";
  res.redirect(302, `/api/onboard/email/verify?token=${encodeURIComponent(token)}`);
});

router.post("/submissions", asyncHandler(onboardingController.createSubmission));
router.get("/submissions", asyncHandler(onboardingController.listSubmissions));
router.get("/submissions/:id", asyncHandler(onboardingController.getSubmissionById));

module.exports = router;
