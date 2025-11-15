// server/agent/modes.js
// Qwen-inspired mode presets with DeepSeek thinking/instruct distinction

const MODES = {
  dev_ritual: {
    name: "dev_ritual",
    description: "Developer workflow assistant for code review, debugging, and task planning",
    systemPrompt: `You are a developer workflow assistant. Help with:
- Code review and architecture decisions
- Debug assistance and error analysis
- Best practices and design patterns
- Task breakdown and implementation planning

Be technical, concise, and actionable. Use tools when helpful.`,
    tools: ["generate_tasks", "code_summary"],
    model: {
      provider: "openai",
      id: "gpt-4o-mini",
      temperature: 0.3,
      top_p: 0.9,
      maxTokens: 1500,
    },
    mode: "instruct", // fast, direct responses
  },

  code_architect: {
    name: "code_architect",
    description: "Senior software architect for deep system design and reasoning",
    systemPrompt: `You are a senior software architect. Analyze code structure, design patterns, and system architecture.

Focus on:
- Component design and modularity
- Performance and scalability considerations
- Security and error handling strategies
- Maintainability and testability

Provide detailed technical analysis with specific recommendations. Think through complex problems step by step.`,
    tools: ["code_summary", "generate_tasks"],
    model: {
      provider: "deepseek",
      id: "deepseek-reasoner",
      temperature: 0.4,
      top_p: 0.95,
      maxTokens: 2000,
    },
    mode: "thinking", // uses <think> reasoning tokens
  },

  mood_analyst: {
    name: "mood_analyst",
    description: "Empathetic mood data analyst for emotional pattern recognition",
    systemPrompt: `You are a mood data analyst. Analyze emotional patterns, trends, and insights from mood tracking data.

Capabilities:
- Identify patterns and clusters in mood data
- Generate insights and correlations
- Suggest actionable recommendations
- Summarize trends over time

Be empathetic but data-driven. Focus on actionable insights.`,
    tools: ["mood_cluster"],
    model: {
      provider: "qwen",
      id: "qwen-plus",
      temperature: 0.5,
      top_p: 0.9,
      maxTokens: 1500,
    },
    mode: "instruct",
  },
};

/**
 * Get mode configuration by name
 * @param {string} modeName - Mode identifier
 * @returns {Object} Mode configuration
 */
function getMode(modeName) {
  const mode = MODES[modeName];
  if (!mode) {
    // Default to dev_ritual if unknown
    console.warn(`Unknown mode: ${modeName}, defaulting to dev_ritual`);
    return MODES.dev_ritual;
  }
  return mode;
}

/**
 * List all available modes
 * @returns {Array} Array of mode metadata
 */
function listModes() {
  return Object.values(MODES).map((mode) => ({
    name: mode.name,
    description: mode.description,
    provider: mode.model.provider,
    model: mode.model.id,
    mode_type: mode.mode,
    num_tools: mode.tools.length,
  }));
}

/**
 * Check if a mode uses thinking/reasoning
 * @param {string} modeName
 * @returns {boolean}
 */
function isThinkingMode(modeName) {
  const mode = getMode(modeName);
  return mode.mode === "thinking";
}

module.exports = {
  MODES,
  getMode,
  listModes,
  isThinkingMode,
};
