// server/agent/tools/registry.js
// Qwen-style tool registry with JSON Schema-style definitions

const tools = new Map();

/**
 * Register a tool
 * definition = {
 *   description: string,
 *   parameters: JSON-Schema-like object,
 *   handler: async (args) => any
 * }
 */
function registerTool(name, definition) {
  if (!definition || typeof definition !== "object") {
    throw new Error(`Tool ${name}: definition must be an object`);
  }

  const { description, parameters, handler } = definition;

  if (!description || typeof description !== "string") {
    throw new Error(`Tool ${name}: missing description`);
  }
  if (!parameters || typeof parameters !== "object") {
    throw new Error(`Tool ${name}: missing parameters schema`);
  }
  if (typeof handler !== "function") {
    throw new Error(`Tool ${name}: missing handler function`);
  }

  tools.set(name, {
    name,
    description,
    parameters,
    handler,
  });
}

/**
 * Get tools by their names.
 */
function getToolsByNames(names) {
  if (!Array.isArray(names)) return [];
  return names
    .map((n) => tools.get(n))
    .filter(Boolean);
}

/**
 * Execute a tool by name with args.
 * NOTE: This is where you'd plug in real JSON Schema validation (ajv, etc.)
 */
async function executeTool(name, args) {
  const tool = tools.get(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }

  // TODO: JSON Schema validation hook
  // validate(tool.parameters, args);

  const result = await tool.handler(args || {});
  return result;
}

/**
 * Convert internal tool defs to OpenAI-style tool definitions.
 */
function toOpenAIToolDefs(toolDefs) {
  return toolDefs.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

// ---------------------------------------------------------------------------
// Example tools
// ---------------------------------------------------------------------------

// 1) generate_tasks
registerTool("generate_tasks", {
  description: "Generate concrete development tasks from a project description.",
  parameters: {
    type: "object",
    properties: {
      context: {
        type: "string",
        description: "Description of the project or feature.",
      },
      num_tasks: {
        type: "integer",
        description: "Number of tasks to generate.",
        minimum: 1,
        maximum: 10,
      },
    },
    required: ["context"],
  },
  async handler({ context, num_tasks }) {
    const n = typeof num_tasks === "number" ? num_tasks : 5;
    const clamped = Math.min(Math.max(n, 1), 10);

    const tasks = Array.from({ length: clamped }, (_, i) => ({
      id: i + 1,
      title: `Task ${i + 1} for: ${context.slice(0, 80)}`,
      est_minutes: 30 + i * 15,
      priority: i === 0 ? "high" : i < 3 ? "medium" : "low",
    }));

    return {
      tasks,
    };
  },
});

// 2) mood_cluster
registerTool("mood_cluster", {
  description: "Cluster mood entries into coarse emotional groups.",
  parameters: {
    type: "object",
    properties: {
      moods: {
        type: "array",
        description: "List of mood entries",
        items: {
          type: "object",
          properties: {
            mood: { type: "string" },
            timestamp: { type: "string" },
          },
          required: ["mood"],
        },
      },
    },
    required: ["moods"],
  },
  async handler({ moods }) {
    const buckets = {
      positive: [],
      negative: [],
      neutral: [],
    };

    for (const entry of moods || []) {
      const m = (entry.mood || "").toLowerCase();
      if (["happy", "excited", "grateful", "calm"].some((k) => m.includes(k))) {
        buckets.positive.push(entry);
      } else if (
        ["sad", "anxious", "angry", "frustrated", "tired"].some((k) =>
          m.includes(k)
        )
      ) {
        buckets.negative.push(entry);
      } else {
        buckets.neutral.push(entry);
      }
    }

    return {
      summary: {
        positive: buckets.positive.length,
        negative: buckets.negative.length,
        neutral: buckets.neutral.length,
      },
      buckets,
    };
  },
});

// 3) code_summary
registerTool("code_summary", {
  description: "Produce a shallow structural summary for a code snippet.",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "Source code string.",
      },
      language: {
        type: "string",
        description: "Programming language name.",
      },
    },
    required: ["code"],
  },
  async handler({ code, language }) {
    const loc = code.split("\n").length;
    const numFunctions = (code.match(/function\s+|=>\s*\(/g) || []).length;
    const numClasses = (code.match(/class\s+/g) || []).length;

    return {
      language: language || "unknown",
      lines_of_code: loc,
      num_functions: numFunctions,
      num_classes: numClasses,
      preview: code.slice(0, 200),
    };
  },
});

module.exports = {
  registerTool,
  getToolsByNames,
  executeTool,
  toOpenAIToolDefs,
  tools,
};

