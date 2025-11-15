// server/agent/modes.js
// Define available agent modes and their model configurations

const MODES = {
  dev_ritual: {
    name: "dev_ritual",
    description: "Daily dev ritual: suggests tasks to improve the codebase",
    model: {
      provider: "kimi",
      name: "moonshot-v1-8k",
      temperature: 0.7,
      maxTokens: 2000,
    },
    systemPrompt: `You are a helpful dev assistant. When asked for tasks, suggest 3-5 specific, actionable improvements for the codebase.
Format your response as a numbered list.`,
  },

  code_review: {
    name: "code_review",
    description: "Reviews code and suggests improvements",
    model: {
      provider: "openai",
      name: "gpt-4",
      temperature: 0.3,
      maxTokens: 3000,
    },
    systemPrompt: `You are a senior code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices.`,
  },

  general: {
    name: "general",
    description: "General-purpose assistant",
    model: {
      provider: "openai",
      name: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 2000,
    },
    systemPrompt: `You are a helpful assistant.`,
  },
};

/**
 * Get mode configuration by name
 * @param {string} modeName - Name of the mode
 * @returns {object} Mode configuration or throws error if not found
 */
function getMode(modeName) {
  const mode = MODES[modeName];
  if (!mode) {
    throw new Error(
      `Unknown mode "${modeName}". Available modes: ${Object.keys(MODES).join(", ")}`
    );
  }
  return mode;
}

/**
 * List all available modes
 * @returns {string[]} Array of mode names
 */
function listModes() {
  return Object.keys(MODES);
}

module.exports = {
  MODES,
  getMode,
  listModes,
};
