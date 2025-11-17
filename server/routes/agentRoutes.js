// server/routes/agentRoutes.js
// Express routes for unified agent framework

const express = require("express");
const {
  handleAgentRequest,
  getAgentInfo,
} = require("../services/agentService");

const router = express.Router();

/**
 * POST /agent/run
 */
router.post("/run", async (req, res) => {
  const result = await handleAgentRequest(req);

  if (result.success) {
    return res.json(result);
  }

  return res.status(400).json(result);
});

/**
 * GET /agent/health
 */
router.get("/health", (req, res) => {
  const info = getAgentInfo();
  res.json({
    ok: true,
    ...info,
  });
});

module.exports = router;

