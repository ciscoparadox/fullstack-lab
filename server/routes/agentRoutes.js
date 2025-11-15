// server/routes/agentRoutes.js
// Express routes for agent endpoint with multi-provider support

const express = require("express");
const { runAgent, getAvailableModes, getLLMClient } = require("../services/agentService");

const router = express.Router();

/**
 * POST /agent/run
 *
 * Run agent with specified mode, task, context, and constraints.
 * Supports multiple LLM providers (openai, deepseek, qwen, kimi).
 *
 * Request body:
 * {
 *   "mode": "dev_ritual" | "code_architect" | "mood_analyst" | "auto" | ...,
 *   "task": "string (required)",
 *   "context": { ...arbitrary data... },
 *   "constraints": {
 *     "max_steps": number,
 *     "max_tokens": number,
 *     "temperature": number,
 *     "allow_tool_execution": boolean
 *   },
 *   "tools": [ ...OpenAI-format tool definitions... ]  // optional
 * }
 *
 * Response:
 * {
 *   "steps": ["step 1", "step 2", ...],
 *   "result": "final result text",
 *   "meta": {
 *     "provider": "openai",
 *     "model": "gpt-4o-mini",
 *     "mode": "dev_ritual",
 *     "tokens": { "input": 120, "output": 180, "total": 300 },
 *     "cost_usd": 0.000126,
 *     "cost_breakdown": { "input_usd": 0.000018, "output_usd": 0.000108 },
 *     "finish_reason": "stop",
 *     "calls_made": 1,
 *     "reasoning": "...",      // optional, if model provides reasoning
 *     "tool_calls": [...]       // optional, if model requests tool calls
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
        hint: "Expected: { task: string, mode?: string, context?: object, constraints?: object }",
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
      err.message.includes("Invalid") ||
      err.message.includes("not initialized")
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message: err.message,
        hint: "Check your request format. See GET /agent/modes for available modes.",
      });
    }

    // Handle LLM API errors (502)
    if (err.message.includes("LLM API")) {
      return res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to communicate with LLM service",
        details: err.message,
        hint: "Check LLM_PROVIDER and OPENAI_API_KEY configuration.",
      });
    }

    // Handle timeout errors (504)
    if (err.message.includes("timeout")) {
      return res.status(504).json({
        error: "Gateway Timeout",
        message: "LLM request timed out",
        details: err.message,
        hint: "Try reducing constraints.max_tokens or increase AGENT_TIMEOUT env var.",
      });
    }

    // Let Express error handler deal with unexpected errors
    next(err);
  }
});

/**
 * GET /agent/modes
 *
 * List all available agent modes with their configurations.
 *
 * Response:
 * [
 *   {
 *     "mode": "dev_ritual",
 *     "description": "You are a developer workflow assistant...",
 *     "temperature": 0.3,
 *     "maxSteps": 5,
 *     "outputStyle": "structured"
 *   },
 *   ...
 * ]
 */
router.get("/modes", (req, res) => {
  try {
    const modes = getAvailableModes();
    res.json({
      total: modes.length,
      modes: modes,
      hint: "Use any of these mode values in POST /agent/run",
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve modes",
      details: err.message,
    });
  }
});

/**
 * GET /agent/health
 *
 * Health check endpoint to verify agent service is available.
 *
 * Response:
 * {
 *   "status": "ok" | "degraded" | "error",
 *   "provider": "openai",
 *   "llm_configured": true | false,
 *   "model": "gpt-4o-mini",
 *   "available_modes": 8,
 *   "timestamp": "2025-11-15T12:34:56.789Z"
 * }
 */
router.get("/health", (req, res) => {
  try {
    const client = getLLMClient();
    const hasApiKey = !!client.apiKey;
    const modes = getAvailableModes();

    res.json({
      status: hasApiKey ? "ok" : "degraded",
      provider: client.provider,
      llm_configured: hasApiKey,
      model: client.defaultModel,
      base_url: client.baseURL,
      available_modes: modes.length,
      timestamp: new Date().toISOString(),
      note: hasApiKey
        ? `LLM configured and ready (${client.provider})`
        : "LLM not configured (stub responses only)",
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      llm_configured: false,
      timestamp: new Date().toISOString(),
      error: err.message,
      hint: "Agent service may not be initialized. Check server logs.",
    });
  }
});

/**
 * GET /agent/providers
 *
 * List supported LLM providers and their configurations.
 *
 * Response:
 * {
 *   "current": "openai",
 *   "providers": {
 *     "openai": { "baseURL": "...", "defaultModel": "...", ... },
 *     "deepseek": { ... },
 *     ...
 *   }
 * }
 */
router.get("/providers", (req, res) => {
  try {
    const client = getLLMClient();
    const { PROVIDER_CONFIG } = require("../services/agentService");

    // Sanitize pricing info (convert to user-friendly format)
    const providers = {};
    Object.keys(PROVIDER_CONFIG).forEach((key) => {
      const config = PROVIDER_CONFIG[key];
      providers[key] = {
        baseURL: config.baseURL,
        defaultModel: config.defaultModel,
        format: config.format,
        models: Object.keys(config.pricing),
      };
    });

    res.json({
      current: client.provider,
      providers: providers,
      hint: "Set LLM_PROVIDER env var to switch providers (e.g., LLM_PROVIDER=deepseek)",
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to retrieve provider info",
      details: err.message,
    });
  }
});

module.exports = router;
