// server/services/agentService.js
// Service wrapper for agent orchestrator

const { runAgent } = require("../agent/orchestrator");
const { listModes } = require("../agent/modes");
const { PROVIDER_CONFIGS } = require("../agent/llmClient");

/**
 * Handle agent request from HTTP endpoint
 * @param {Object} req - Express request object
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function handleAgentRequest(req) {
  try {
    const { mode, message, history, provider } = req.body;

    // Validate required fields
    if (!message || typeof message !== "string") {
      return {
        success: false,
        error: "Missing or invalid 'message' field",
      };
    }

    // Collect API keys from environment
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      qwen: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY,
      kimi: process.env.KIMI_API_KEY || process.env.OPENAI_API_KEY,
    };

    // Run agent
    const result = await runAgent({
      mode: mode || "dev_ritual",
      message,
      history: history || [],
      provider,
      apiKeys,
    });

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    console.error("[AgentService] Error:", err);

    return {
      success: false,
      error: err.message || "Unknown error occurred",
    };
  }
}

/**
 * Get agent system info
 * @returns {Object} System information
 */
function getAgentInfo() {
  const modes = listModes();
  const providers = Object.keys(PROVIDER_CONFIGS);

  return {
    modes,
    providers,
    version: "1.0.0",
    features: {
      tool_calling: true,
      reasoning_models: true,
      multi_provider: true,
      max_calls_per_request: 2,
    },
  };
}

module.exports = {
  handleAgentRequest,
  getAgentInfo,
};
