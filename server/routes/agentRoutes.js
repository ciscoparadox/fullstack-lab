// server/routes/agentRoutes.js
// Express routes for agent endpoints

const express = require("express");
const { executeAgentRun, getAvailableModes } = require("../services/agentService");

const router = express.Router();

/**
 * POST /agent/run
 * Run agent with specified mode and message
 *
 * Body:
 * {
 *   "mode": "dev_ritual",
 *   "message": "Give me 3 tasks to improve my Node backend",
 *   "provider": "kimi",  // optional
 *   "apiKeys": { "kimi": "sk-..." }  // optional
 * }
 */
router.post("/run", async (req, res) => {
  try {
    const result = await executeAgentRun(req.body);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("[AgentRoutes] Unhandled error in /agent/run:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /agent/modes
 * List available agent modes
 */
router.get("/modes", (req, res) => {
  try {
    const result = getAvailableModes();
    res.json(result);
  } catch (error) {
    console.error("[AgentRoutes] Error in /agent/modes:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
