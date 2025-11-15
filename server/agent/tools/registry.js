// server/agent/tools/registry.js
// Tool registry for agent capabilities

/**
 * Example tool: Get current timestamp
 */
const getCurrentTime = {
  name: "getCurrentTime",
  description: "Gets the current timestamp",
  parameters: {},
  execute: async () => {
    return { timestamp: new Date().toISOString() };
  },
};

/**
 * Example tool: Echo input
 */
const echo = {
  name: "echo",
  description: "Echoes back the input message",
  parameters: {
    message: { type: "string", required: true },
  },
  execute: async ({ message }) => {
    return { echo: message };
  },
};

// Registry of all available tools
const TOOLS = {
  getCurrentTime,
  echo,
};

/**
 * Get a tool by name
 * @param {string} toolName - Name of the tool
 * @returns {object} Tool definition or throws error
 */
function getTool(toolName) {
  const tool = TOOLS[toolName];
  if (!tool) {
    throw new Error(
      `Unknown tool "${toolName}". Available tools: ${Object.keys(TOOLS).join(", ")}`
    );
  }
  return tool;
}

/**
 * Execute a tool with given parameters
 * @param {string} toolName - Name of the tool
 * @param {object} params - Parameters for the tool
 * @returns {Promise<object>} Tool execution result
 */
async function executeTool(toolName, params = {}) {
  const tool = getTool(toolName);
  return await tool.execute(params);
}

module.exports = {
  TOOLS,
  getTool,
  executeTool,
};
