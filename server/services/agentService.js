// server/services/agentService.js
// Service wrapper around the unified agent orchestrator

const { runAgent } = require("../agent/orchestrator");
const { listModes } = require("../agent/modes");
const { PROVIDER_CONFIGS } = require("../agent/llmClient");

/**
 * Handle POST /agent/run
 */
async function handleAgentRequest(req) {
  try {
    const body = req.body || {};
    const { mode, message, history, provider } = body;

    const apiKeys = {
      default: process.env.OPENAI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY,
      qwen: process.env.QWEN_API_KEY,
      kimi: process.env.KIMI_API_KEY,
    };

    const data = await runAgent({
      mode,
      message,
      history,
      provider,
      apiKeys,
    });

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err && err.message ? err.message : "Agent error",
    };
  }
}

/**
 * Info for /agent/health
 */
function getAgentInfo() {
  const providers = Object.keys(PROVIDER_CONFIGS);
  const modes = listModes();
  return {
    providers,
    modes,
  };
}

module.exports = {
  handleAgentRequest,
  getAgentInfo,
};

