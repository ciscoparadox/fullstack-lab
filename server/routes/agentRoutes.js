// server/routes/agentRoutes.js
// Express routes for unified agent framework

const express = require("express");
const { handleAgentRequest, getAgentInfo } = require("../services/agentService");

const router = express.Router();

/**
 * POST /agent/run
 *
 * Run agent with mode, message, and optional history
 *
 * Request body:
 * {
 *   "mode": "dev_ritual" | "code_architect" | "mood_analyst",
 *   "message": "your task or question",
 *   "history": [{"role": "user", "content": "..."}, ...],  // optional
 *   "provider": "openai" | "deepseek" | "qwen" | "kimi"    // optional override
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "steps": [
 *       {"type": "reasoning", "hidden": true, "content": "..."},
 *       {"type": "tool_execution", "toolName": "...", "input": {...}, "output": {...}},
 *       {"type": "final_answer", "content": "..."}
 *     ],
 *     "result": "final text response",
 *     "meta": {
 *       "mode": "dev_ritual",
 *       "provider": "openai",
 *       "model": "gpt-4o-mini",
 *       "totalTokens": 300,
 *       "estimatedCost": 0.000126,
 *       "llmCalls": 1,
 *       "toolExecutions": 0,
 *       "executionTimeMs": 1234
 *     }
 *   }
 * }
 */
router.post("/run", async (req, res) => {
  try {
    const result = await handleAgentRequest(req);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    console.error("[POST /agent/run] Unexpected error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * GET /agent/health
 *
 * Health check and system info
 *
 * Response:
 * {
 *   "status": "ok",
 *   "info": {
 *     "modes": [...],
 *     "providers": [...],
 *     "version": "1.0.0",
 *     "features": {...}
 *   }
 * }
 */
router.get("/health", (req, res) => {
  try {
    const info = getAgentInfo();

    res.json({
      status: "ok",
      info,
    });
  } catch (err) {
    console.error("[GET /agent/health] Error:", err);
    res.status(500).json({
      status: "error",
      error: err.message,
    });
  }
});

module.exports = router;
