// server/routes/agentRoutes.js
// Express routes for agent endpoint

const express = require("express");
const { runAgent } = require("../services/agentService");

const router = express.Router();

/**
 * POST /agent/run
 *
 * Run agent with specified mode, task, context, and constraints.
 *
 * Request body:
 * {
 *   "mode": "auto" | "analyze" | "plan" | "execute" | "search",  // optional, default: "auto"
 *   "task": "string (required)",
 *   "context": { ...arbitrary data... },                         // optional
 *   "constraints": {                                             // optional
 *     "max_steps": number,
 *     "max_tokens": number,
 *     "temperature": number
 *   }
 * }
 *
 * Response:
 * {
 *   "steps": ["step 1", "step 2", ...],
 *   "result": "final result text",
 *   "meta": {
 *     "model": "gpt-4o-mini",
 *     "tokens": { "input": 50, "output": 75, "total": 125 },
 *     "cost_usd": 0.00005
 *   }
 * }
 */
router.post("/run", async (req, res, next) => {
  try {
    // Validate request has body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body is required",
      });
    }

    // Run agent (normalizeRequest inside runAgent will validate)
    const response = await runAgent(req.body);

    // Return structured response
    res.json(response);
  } catch (err) {
    // Handle validation errors (400)
    if (
      err.message.includes("Missing required field") ||
      err.message.includes("Invalid")
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: err.message,
      });
    }

    // Handle LLM API errors (502)
    if (err.message.includes("LLM API")) {
      return res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to communicate with LLM service",
        details: err.message,
      });
    }

    // Handle timeout errors (504)
    if (err.message.includes("timeout")) {
      return res.status(504).json({
        error: "Gateway Timeout",
        message: "LLM request timed out",
        details: err.message,
      });
    }

    // Let Express error handler deal with unexpected errors
    next(err);
  }
});

/**
 * GET /agent/health
 *
 * Health check endpoint to verify agent service is available.
 *
 * Response:
 * {
 *   "status": "ok" | "degraded",
 *   "llm_configured": true | false,
 *   "timestamp": "2025-11-15T12:34:56.789Z"
 * }
 */
router.get("/health", (req, res) => {
  const { getLLMClient } = require("../services/agentService");

  try {
    const client = getLLMClient();
    const hasApiKey = !!client.apiKey;

    res.json({
      status: hasApiKey ? "ok" : "degraded",
      llm_configured: hasApiKey,
      model: client.defaultModel,
      timestamp: new Date().toISOString(),
      note: hasApiKey
        ? "LLM configured and ready"
        : "LLM not configured (stub responses only)",
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      llm_configured: false,
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

module.exports = router;
