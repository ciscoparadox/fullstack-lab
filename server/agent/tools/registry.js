// server/agent/tools/registry.js
// Qwen-inspired tool registry with JSON Schema validation

// Tool storage
const tools = new Map();

/**
 * Register a tool in the registry
 * @param {string} name - Tool name
 * @param {Object} definition - Tool definition with schema and handler
 */
function registerTool(name, definition) {
  const { description, parameters, handler } = definition;

  if (!description || !parameters || !handler) {
    throw new Error(`Tool ${name} missing required fields: description, parameters, handler`);
  }

  tools.set(name, {
    name,
    description,
    parameters,
    handler,
  });
}

/**
 * Get tools by mode name (MoE-style "few experts only")
 * @param {string} modeName - Mode identifier
 * @returns {Array} Array of tool definitions in OpenAI format
 */
function getToolsByMode(modeName) {
  // Mode -> tool mapping (defined in modes.js, but we return all matching)
  const modeToolMap = {
    dev_ritual: ["generate_tasks", "code_summary"],
    code_architect: ["code_summary", "generate_tasks"],
    mood_analyst: ["mood_cluster"],
  };

  const toolNames = modeToolMap[modeName] || [];
  return toolNames
    .map((name) => {
      const tool = tools.get(name);
      if (!tool) return null;

      // Return in OpenAI function calling format
      return {
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      };
    })
    .filter(Boolean);
}

/**
 * Execute a tool by name with given arguments
 * @param {string} name - Tool name
 * @param {Object} args - Tool arguments (already parsed JSON)
 * @returns {Promise<Object>} Tool execution result
 */
async function executeTool(name, args) {
  const tool = tools.get(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  // TODO: Add JSON Schema validation here using ajv or similar
  // const Ajv = require('ajv');
  // const ajv = new Ajv();
  // const validate = ajv.compile(tool.parameters);
  // if (!validate(args)) {
  //   throw new Error(`Invalid args for ${name}: ${JSON.stringify(validate.errors)}`);
  // }

  try {
    const result = await tool.handler(args);
    return result;
  } catch (err) {
    throw new Error(`Tool ${name} execution failed: ${err.message}`);
  }
}

/**
 * Get all registered tools
 */
function getAllTools() {
  return Array.from(tools.values());
}

// ============================================================================
// EXAMPLE TOOLS
// ============================================================================

registerTool("generate_tasks", {
  description: "Break down a complex task into smaller, actionable steps",
  parameters: {
    type: "object",
    properties: {
      task_description: {
        type: "string",
        description: "High-level description of the task to break down",
      },
      max_steps: {
        type: "number",
        description: "Maximum number of steps to generate (default 5)",
        default: 5,
      },
    },
    required: ["task_description"],
  },
  handler: async ({ task_description, max_steps = 5 }) => {
    // Stub implementation - in real scenario, this might call another LLM or logic
    const steps = [];
    const taskWords = task_description.split(" ");
    const numSteps = Math.min(max_steps, 5);

    for (let i = 1; i <= numSteps; i++) {
      steps.push(`Step ${i}: Process "${taskWords.slice(0, 2).join(" ")}..."`);
    }

    return {
      steps,
      estimated_time: numSteps * 10, // minutes
      task: task_description,
    };
  },
});

registerTool("mood_cluster", {
  description: "Analyze mood data and identify clusters or patterns",
  parameters: {
    type: "object",
    properties: {
      moods: {
        type: "array",
        description: "Array of mood entries with text and timestamp",
        items: {
          type: "object",
          properties: {
            mood: { type: "string" },
            timestamp: { type: "string" },
          },
        },
      },
      num_clusters: {
        type: "number",
        description: "Number of clusters to identify (default 3)",
        default: 3,
      },
    },
    required: ["moods"],
  },
  handler: async ({ moods, num_clusters = 3 }) => {
    // Stub implementation - in real scenario, call ML clustering service
    if (!moods || moods.length === 0) {
      return { clusters: [], message: "No mood data provided" };
    }

    // Simple frequency-based clustering
    const moodCounts = {};
    moods.forEach((entry) => {
      const mood = entry.mood.toLowerCase();
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const sortedMoods = Object.entries(moodCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, num_clusters);

    const clusters = sortedMoods.map(([mood, count], idx) => ({
      cluster_id: idx,
      label: mood,
      count,
      percentage: ((count / moods.length) * 100).toFixed(1),
    }));

    return {
      clusters,
      total_entries: moods.length,
      analysis: `Identified ${clusters.length} primary mood patterns`,
    };
  },
});

registerTool("code_summary", {
  description: "Analyze code and generate a summary of its structure and purpose",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Code snippet to analyze",
      },
      language: {
        type: "string",
        description: "Programming language (e.g., 'javascript', 'python')",
        default: "javascript",
      },
    },
    required: ["code"],
  },
  handler: async ({ code, language = "javascript" }) => {
    // Stub implementation - in real scenario, use AST parser or code analysis tool
    const lines = code.split("\n").filter((line) => line.trim());
    const functions = lines.filter((line) => line.includes("function") || line.includes("=>"));
    const imports = lines.filter((line) => line.includes("import") || line.includes("require"));

    return {
      language,
      lines_of_code: lines.length,
      num_functions: functions.length,
      num_imports: imports.length,
      summary: `${language} code with ${functions.length} function(s) and ${lines.length} lines`,
      complexity: lines.length > 100 ? "high" : lines.length > 50 ? "medium" : "low",
    };
  },
});

module.exports = {
  registerTool,
  getToolsByMode,
  executeTool,
  getAllTools,
  tools,
};
