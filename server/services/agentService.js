// server/services/agentService.js
// Service layer for agent operations

const { runAgent } = require("../agent/orchestrator");
const { listModes } = require("../agent/modes");

/**
 * Execute agent run request
 * @param {object} request - Agent request parameters
 * @returns {Promise<object>} Agent execution result
 */
async function executeAgentRun(request) {
  try {
    const result = await runAgent(request);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[AgentService] Agent execution failed:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get available agent modes
 * @returns {object} List of available modes
 */
function getAvailableModes() {
  const modes = listModes();
  return {
    success: true,
    data: { modes },
  };
}

module.exports = {
  executeAgentRun,
  getAvailableModes,
};
