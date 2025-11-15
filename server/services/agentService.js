// server/services/agentService.js
// 6-Stage Inference Pipeline for Agent Endpoint

/**
 * =============================================================================
 * STAGE 1: initialize_model
 * =============================================================================
 * Load LLM client configuration at server startup.
 * This happens once, not per request.
 */

let llmClient = null;

/**
 * Initialize the LLM client with config from environment
 * Call this once in server/index.js after app starts
 */
function initializeLLMClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const defaultModel = process.env.AGENT_MODEL || "gpt-4o-mini";
  const timeout = parseInt(process.env.AGENT_TIMEOUT || "30000", 10);

  if (!apiKey) {
    console.warn(
      "[Agent] OPENAI_API_KEY not set. Agent endpoint will use stub responses."
    );
  }

  llmClient = {
    apiKey,
    baseURL,
    defaultModel,
    timeout,
    initialized: true,
  };

  console.log(
    `[Agent] LLM client initialized (model: ${defaultModel}, stub: ${!apiKey})`
  );
}

/**
 * Get the initialized LLM client
 */
function getLLMClient() {
  if (!llmClient) {
    throw new Error(
      "LLM client not initialized. Call initializeLLMClient() first."
    );
  }
  return llmClient;
}

/**
 * =============================================================================
 * STAGE 2: normalize_request
 * =============================================================================
 * Validate and normalize incoming request body.
 * Input: raw request body from Express
 * Output: normalized { mode, task, context, constraints }
 * Throws: Error if validation fails
 */

function normalizeRequest(rawBody) {
  const { mode, task, context, constraints } = rawBody || {};

  // Validate required fields
  if (!task || typeof task !== "string" || !task.trim()) {
    throw new Error("Missing required field: task (must be non-empty string)");
  }

  // Normalize mode
  const validModes = ["auto", "analyze", "plan", "execute", "search"];
  const normalizedMode =
    mode && validModes.includes(mode) ? mode : "auto";

  // Normalize context (should be object or null)
  const normalizedContext =
    context && typeof context === "object" && !Array.isArray(context)
      ? context
      : {};

  // Normalize constraints
  const defaultConstraints = {
    max_steps: 5,
    max_tokens: 1000,
    temperature: 0.7,
  };

  const normalizedConstraints = {
    ...defaultConstraints,
    ...(constraints && typeof constraints === "object" ? constraints : {}),
  };

  // Sanitize: ensure numeric constraints are valid
  if (
    typeof normalizedConstraints.max_steps !== "number" ||
    normalizedConstraints.max_steps < 1
  ) {
    normalizedConstraints.max_steps = defaultConstraints.max_steps;
  }

  if (
    typeof normalizedConstraints.max_tokens !== "number" ||
    normalizedConstraints.max_tokens < 100
  ) {
    normalizedConstraints.max_tokens = defaultConstraints.max_tokens;
  }

  if (
    typeof normalizedConstraints.temperature !== "number" ||
    normalizedConstraints.temperature < 0 ||
    normalizedConstraints.temperature > 2
  ) {
    normalizedConstraints.temperature = defaultConstraints.temperature;
  }

  return {
    mode: normalizedMode,
    task: task.trim(),
    context: normalizedContext,
    constraints: normalizedConstraints,
  };
}

/**
 * =============================================================================
 * STAGE 3: build_model_inputs
 * =============================================================================
 * Construct focused system + user prompts from normalized input.
 * Keep prompts minimal to reduce token costs.
 * Input: normalized request
 * Output: ChatML-style messages array
 */

function buildModelInputs({ mode, task, context, constraints }) {
  // Build system message based on mode
  const systemPrompts = {
    auto: "You are a helpful agent. Analyze the task and respond concisely.",
    analyze:
      "You are an analytical agent. Break down the task into steps and provide insights.",
    plan: "You are a planning agent. Create a structured plan to accomplish the task.",
    execute:
      "You are an execution agent. Perform the requested action and report results.",
    search:
      "You are a search agent. Find relevant information and summarize findings.",
  };

  const systemMessage = {
    role: "system",
    content: systemPrompts[mode] || systemPrompts.auto,
  };

  // Build user message: task + context
  let userContent = `Task: ${task}`;

  // Only include context if it has data (cost-awareness)
  const contextKeys = Object.keys(context);
  if (contextKeys.length > 0) {
    // Serialize context compactly
    const contextStr = JSON.stringify(context);
    // Only include if context is reasonably sized (<2000 chars)
    if (contextStr.length < 2000) {
      userContent += `\n\nContext:\n${contextStr}`;
    } else {
      userContent += `\n\n[Context too large, omitted for cost efficiency]`;
    }
  }

  // Add constraints to guide output
  userContent += `\n\nConstraints:\n- Max steps: ${constraints.max_steps}\n- Be concise and focused`;

  const userMessage = {
    role: "user",
    content: userContent,
  };

  return [systemMessage, userMessage];
}

/**
 * =============================================================================
 * STAGE 4: run_model
 * =============================================================================
 * Call OpenAI-compatible chat completion API.
 * This is the expensive part - make exactly 1 call.
 * Input: messages array, constraints
 * Output: raw API response
 */

async function runModel(messages, constraints) {
  const client = getLLMClient();

  // If no API key, return stub response (for dev/testing)
  if (!client.apiKey) {
    console.log("[Agent] Using stub response (no API key configured)");
    return createStubResponse(messages, constraints);
  }

  // Build API request payload
  const payload = {
    model: client.defaultModel,
    messages: messages,
    max_tokens: constraints.max_tokens,
    temperature: constraints.temperature,
  };

  // Make HTTP request to OpenAI-compatible API
  try {
    const response = await fetch(`${client.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(client.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM API error (${response.status}): ${errorText.substring(0, 200)}`
      );
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error(`LLM API timeout after ${client.timeout}ms`);
    }
    throw err;
  }
}

/**
 * Stub response for development when no API key is configured
 */
function createStubResponse(messages, constraints) {
  const userMessage = messages.find((m) => m.role === "user");
  const task = userMessage?.content || "No task provided";

  return {
    id: "stub-response-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "stub-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            steps: [
              "Parse task requirements",
              "Analyze available context",
              "Generate response",
            ],
            result: `[STUB] This is a simulated response for task: "${task.substring(0, 100)}...". Configure OPENAI_API_KEY for real LLM responses.`,
            reasoning:
              "This is a stub response generated locally for development.",
          }),
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 75,
      total_tokens: 125,
    },
  };
}

/**
 * =============================================================================
 * STAGE 5: decode_outputs
 * =============================================================================
 * Extract content from API response JSON.
 * Handle both plain text and structured JSON responses.
 * Input: raw API response
 * Output: decoded content (string or object)
 */

function decodeOutputs(rawResponse) {
  if (!rawResponse || !rawResponse.choices || rawResponse.choices.length === 0) {
    throw new Error("Invalid LLM response: no choices returned");
  }

  const choice = rawResponse.choices[0];
  if (!choice.message || !choice.message.content) {
    throw new Error("Invalid LLM response: no message content");
  }

  const content = choice.message.content;

  // Try to parse as JSON (agent may return structured output)
  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    // Not JSON, return as plain text
    return content;
  }
}

/**
 * =============================================================================
 * STAGE 6: postprocess_and_structure_response
 * =============================================================================
 * Format decoded output into final { steps, result, meta } structure.
 * Input: decoded content, raw API response (for meta)
 * Output: { steps, result, meta }
 */

function postprocessAndStructureResponse(decoded, rawResponse) {
  // If decoded is already structured, use it
  if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
    const { steps, result, reasoning } = decoded;

    return {
      steps: Array.isArray(steps) ? steps : [],
      result: result || reasoning || "No result provided",
      meta: buildResponseMeta(rawResponse),
    };
  }

  // If decoded is plain text, parse it into steps + result
  const text = typeof decoded === "string" ? decoded : String(decoded);

  // Simple heuristic: split by numbered steps or newlines
  const lines = text.split("\n").filter((line) => line.trim());
  const steps = lines
    .filter((line) => /^\d+[\.)]\s/.test(line)) // Lines starting with "1. " or "1) "
    .map((line) => line.replace(/^\d+[\.)]\s/, "").trim())
    .slice(0, 10); // Cap at 10 steps

  return {
    steps: steps.length > 0 ? steps : ["Process task", "Generate response"],
    result: text.substring(0, 1000), // Cap result length
    meta: buildResponseMeta(rawResponse),
  };
}

/**
 * Build meta object with token usage and cost estimate
 */
function buildResponseMeta(rawResponse) {
  const usage = rawResponse.usage || {};
  const model = rawResponse.model || "unknown";

  // Rough cost estimate (based on gpt-4o-mini pricing as of 2024)
  // $0.15 / 1M input tokens, $0.60 / 1M output tokens
  const inputCost = (usage.prompt_tokens || 0) * 0.00000015;
  const outputCost = (usage.completion_tokens || 0) * 0.0000006;
  const totalCost = inputCost + outputCost;

  return {
    model: model,
    tokens: {
      input: usage.prompt_tokens || 0,
      output: usage.completion_tokens || 0,
      total: usage.total_tokens || 0,
    },
    cost_usd: parseFloat(totalCost.toFixed(6)),
  };
}

/**
 * =============================================================================
 * MAIN PIPELINE: runAgent
 * =============================================================================
 * Orchestrates all 6 stages.
 * Input: { mode, task, context, constraints } (raw or normalized)
 * Output: { steps, result, meta }
 */

async function runAgent(rawRequest) {
  // Stage 2: normalize_request
  const normalized = normalizeRequest(rawRequest);

  // Stage 3: build_model_inputs
  const messages = buildModelInputs(normalized);

  // Stage 4: run_model
  const rawResponse = await runModel(messages, normalized.constraints);

  // Stage 5: decode_outputs
  const decoded = decodeOutputs(rawResponse);

  // Stage 6: postprocess_and_structure_response
  const finalResponse = postprocessAndStructureResponse(decoded, rawResponse);

  return finalResponse;
}

/**
 * =============================================================================
 * EXPORTS
 * =============================================================================
 */

module.exports = {
  // Stage 1
  initializeLLMClient,
  getLLMClient,

  // Stage 2
  normalizeRequest,

  // Stage 3
  buildModelInputs,

  // Stage 4
  runModel,

  // Stage 5
  decodeOutputs,

  // Stage 6
  postprocessAndStructureResponse,

  // Main pipeline
  runAgent,
};
