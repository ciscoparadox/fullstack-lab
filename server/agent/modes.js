// server/agent/modes.js
// Define available agent modes and their model configurations

// We keep this minimal and aligned with the simple orchestrator
// that just calls the model once via callLLM().

const MODES = {
  /**
   * dev_ritual
   * - Fast, practical suggestions for improving your codebase / backend.
   * - Default provider: DeepSeek (cheap, good reasoning).
   */
  dev_ritual: {
    name: "dev_ritual",
    description: "Daily dev ritual: suggests tasks to improve the codebase",
    model: {
      provider: "deepseek",
      // Good general-purpose DeepSeek model:
      // if you have a different one, just change this string.
      name: "deepseek-chat",
      temperature: 0.3,
      maxTokens: 1024,
    },
    systemPrompt: `
You are a focused developer workflow assistant.

Given a short description of a Node.js / Express backend,
you will suggest 3–5 very concrete, actionable tasks that would improve it.

Guidelines:
- Be specific ("add rate limiting middleware to /auth routes", not "improve security").
- Prefer refactors, testing, and reliability over random ideas.
- Output as a numbered list.
`.trim(),
  },

  /**
   * code_architect
   * - Higher-level design, system architecture, tradeoffs.
   * - Deeper reasoning, more verbose output.
   * - Still uses DeepSeek provider.
   */
  code_architect: {
    name: "code_architect",
    description: "System design and architecture guidance with deeper reasoning",
    model: {
      provider: "deepseek",
      name: "deepseek-chat",
      temperature: 0.4,
      maxTokens: 2048,
    },
    systemPrompt: `
You are a senior system architect with deep expertise in backend and fullstack systems.

Your job is to reason thoroughly about architecture decisions:
- Identify bottlenecks, scalability concerns, and technical risks
- Propose concrete designs (API structures, data flows, service boundaries, database schemas)
- Explain tradeoffs clearly with pros/cons for each approach
- Consider both immediate implementation and long-term maintainability

Be verbose and thorough in your explanations. Structure your answer with clear sections:
1. Analysis of current state
2. Proposed architecture
3. Tradeoffs and considerations
4. Implementation recommendations

Use bullet points and examples liberally.
`.trim(),
  },

  /**
   * mood_analyst
   * - Analyzes mood logs and finds patterns.
   * - Uses mood analytics language.
   * - Still uses DeepSeek provider for consistency.
   */
  mood_analyst: {
    name: "mood_analyst",
    description: "Analyzes mood logs and identifies patterns using mood analytics language",
    model: {
      provider: "deepseek",
      name: "deepseek-chat",
      temperature: 0.5,
      maxTokens: 1500,
    },
    systemPrompt: `
You are a mood and behavior analyst specializing in emotional pattern recognition.

Given a list of timestamped mood entries, you:
- Identify patterns over time (daily cycles, weekly trends, seasonal variations)
- Describe likely triggers and contextual factors
- Highlight emotional progressions and recurring themes
- Suggest a few practical, evidence-based coping strategies

Use mood analytics terminology where appropriate (valence, affect, emotional regulation, mood trajectory).
Be empathetic but concise. Focus on actionable insights.

Structure your response:
1. Pattern Summary
2. Notable Triggers
3. Recommendations
`.trim(),
  },
};

/**
 * Get mode configuration by name.
 * Falls back to "dev_ritual" if modeName is falsy.
 *
 * @param {string} modeName
 * @returns {object} Mode configuration
 */
function getMode(modeName) {
  const key = modeName || "dev_ritual";
  const mode = MODES[key];

  if (!mode) {
    throw new Error(
      `Unknown mode "${modeName}". Available modes: ${Object.keys(MODES).join(
        ", "
      )}`
    );
  }

  return mode;
}

/**
 * List all available modes – used by /agent/modes
 * @returns {Array<{name:string, description:string, provider:string, model:string}>}
 */
function listModes() {
  return Object.values(MODES).map((m) => ({
    name: m.name,
    description: m.description,
    provider: m.model.provider,
    model: m.model.name,
  }));
}

module.exports = {
  MODES,
  getMode,
  listModes,
};
