// server/services/agentService.js
// 6-Stage Inference Pipeline with Multi-Provider Support
// Inspired by: DeepSeek V3, Qwen-Agent, Kimi K2

/**
 * =============================================================================
 * PROVIDER ADAPTERS & PRICING
 * =============================================================================
 */

const PROVIDER_CONFIG = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    format: "openai",
    pricing: {
      "gpt-4o-mini": { input: 0.15, output: 0.60 }, // per 1M tokens
      "gpt-4o": { input: 2.5, output: 10.0 },
      "gpt-4-turbo": { input: 10.0, output: 30.0 },
    },
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    format: "openai", // DeepSeek uses OpenAI-compatible API
    pricing: {
      "deepseek-chat": { input: 0.27, output: 1.1 }, // per 1M tokens (cache miss)
      "deepseek-reasoner": { input: 0.55, output: 2.19 },
    },
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    format: "openai", // Qwen uses OpenAI-compatible mode
    pricing: {
      "qwen-plus": { input: 0.5, output: 2.0 }, // approximate
      "qwen-max": { input: 4.0, output: 12.0 },
      "qwen-turbo": { input: 0.3, output: 0.6 },
    },
  },
  kimi: {
    baseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    format: "openai", // Kimi uses OpenAI-compatible API
    pricing: {
      "moonshot-v1-8k": { input: 0.2, output: 0.6 }, // approximate
      "moonshot-v1-32k": { input: 0.4, output: 1.2 },
      "moonshot-v1-128k": { input: 1.0, output: 3.0 },
    },
  },
};

/**
 * =============================================================================
 * MODE PRESETS (Qwen-Agent inspired)
 * =============================================================================
 */

const MODE_PRESETS = {
  // Development workflow assistant
  dev_ritual: {
    systemPrompt: `You are a developer workflow assistant. Help with:
- Code review and architecture decisions
- Debug assistance and error analysis
- Best practices and design patterns
- Task breakdown and implementation planning

Be technical, concise, and actionable. Format responses with clear steps.`,
    temperature: 0.3,
    maxSteps: 5,
    outputStyle: "structured",
  },

  // System architect
  code_architect: {
    systemPrompt: `You are a senior software architect. Analyze code structure, design patterns, and system architecture.

Focus on:
- Component design and modularity
- Performance and scalability
- Security and error handling
- Maintainability and testability

Provide detailed technical analysis with specific recommendations.`,
    temperature: 0.4,
    maxSteps: 7,
    outputStyle: "detailed",
  },

  // Mood data analyst (specific to this app)
  mood_analyst: {
    systemPrompt: `You are a mood data analyst. Analyze emotional patterns, trends, and insights from mood tracking data.

Capabilities:
- Identify patterns and clusters in mood data
- Generate insights and correlations
- Suggest actionable recommendations
- Summarize trends over time

Be empathetic but data-driven. Focus on actionable insights.`,
    temperature: 0.5,
    maxSteps: 5,
    outputStyle: "insights",
  },

  // General analysis (original)
  analyze: {
    systemPrompt: `You are an analytical agent. Break down the task into steps and provide insights.

Be systematic, thorough, and structured in your analysis.`,
    temperature: 0.4,
    maxSteps: 5,
    outputStyle: "structured",
  },

  // Planning mode (original)
  plan: {
    systemPrompt: `You are a planning agent. Create a structured plan to accomplish the task.

Break complex tasks into clear, actionable steps with priorities and dependencies.`,
    temperature: 0.3,
    maxSteps: 8,
    outputStyle: "structured",
  },

  // Execution mode (original)
  execute: {
    systemPrompt: `You are an execution agent. Perform the requested action and report results.

Be direct, efficient, and focus on completing the task.`,
    temperature: 0.2,
    maxSteps: 3,
    outputStyle: "direct",
  },

  // Search/research mode (original)
  search: {
    systemPrompt: `You are a search agent. Find relevant information and summarize findings.

Be comprehensive but concise. Focus on the most relevant information.`,
    temperature: 0.6,
    maxSteps: 4,
    outputStyle: "summary",
  },

  // Auto mode (default)
  auto: {
    systemPrompt: `You are a helpful agent. Analyze the task and respond concisely.

Adapt your approach based on the task requirements.`,
    temperature: 0.5,
    maxSteps: 5,
    outputStyle: "adaptive",
  },
};

/**
 * =============================================================================
 * STAGE 1: initialize_model
 * =============================================================================
 */

let llmClient = null;

/**
 * Initialize the LLM client with multi-provider support
 */
function initializeLLMClient() {
  const provider = process.env.LLM_PROVIDER || "openai";
  const apiKey = process.env.OPENAI_API_KEY; // Generic key env var
  const timeout = parseInt(process.env.AGENT_TIMEOUT || "30000", 10);

  // Get provider config
  const providerConfig = PROVIDER_CONFIG[provider];
  if (!providerConfig) {
    console.warn(
      `[Agent] Unknown provider: ${provider}. Defaulting to openai.`
    );
    provider = "openai";
    providerConfig = PROVIDER_CONFIG.openai;
  }

  // Allow provider-specific overrides
  const baseURL =
    process.env[`${provider.toUpperCase()}_BASE_URL`] ||
    providerConfig.baseURL;
  const defaultModel =
    process.env[`${provider.toUpperCase()}_MODEL`] ||
    providerConfig.defaultModel;

  if (!apiKey) {
    console.warn(
      "[Agent] OPENAI_API_KEY not set. Agent endpoint will use stub responses."
    );
  }

  llmClient = {
    provider,
    apiKey,
    baseURL,
    defaultModel,
    timeout,
    format: providerConfig.format,
    pricing: providerConfig.pricing,
    initialized: true,
  };

  console.log(
    `[Agent] LLM client initialized (provider: ${provider}, model: ${defaultModel}, stub: ${!apiKey})`
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
 */

function normalizeRequest(rawBody) {
  const { mode, task, context, constraints, tools } = rawBody || {};

  // Validate required fields
  if (!task || typeof task !== "string" || !task.trim()) {
    throw new Error("Missing required field: task (must be non-empty string)");
  }

  // Normalize mode - check against MODE_PRESETS
  const validModes = Object.keys(MODE_PRESETS);
  const normalizedMode = mode && validModes.includes(mode) ? mode : "auto";

  // Get mode preset
  const modePreset = MODE_PRESETS[normalizedMode];

  // Normalize context (should be object or null)
  const normalizedContext =
    context && typeof context === "object" && !Array.isArray(context)
      ? context
      : {};

  // Normalize constraints (merge with mode preset defaults)
  const defaultConstraints = {
    max_steps: modePreset.maxSteps,
    max_tokens: 1500,
    temperature: modePreset.temperature,
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

  // Normalize tools (optional array of tool definitions)
  const normalizedTools =
    tools && Array.isArray(tools) && tools.length > 0 ? tools : null;

  return {
    mode: normalizedMode,
    modePreset,
    task: task.trim(),
    context: normalizedContext,
    constraints: normalizedConstraints,
    tools: normalizedTools,
  };
}

/**
 * =============================================================================
 * STAGE 3: build_model_inputs
 * =============================================================================
 */

function buildModelInputs({ mode, modePreset, task, context, constraints, tools }) {
  // Use mode preset's system prompt
  const systemMessage = {
    role: "system",
    content: modePreset.systemPrompt,
  };

  // Build user message: task + context
  let userContent = `Task: ${task}`;

  // Include context if present and reasonably sized
  const contextKeys = Object.keys(context);
  if (contextKeys.length > 0) {
    const contextStr = JSON.stringify(context, null, 2);
    // Only include if context is <3000 chars (cost-awareness)
    if (contextStr.length < 3000) {
      userContent += `\n\nContext:\n${contextStr}`;
    } else {
      // Include just the keys to indicate what's available
      userContent += `\n\nContext available (${contextStr.length} chars, keys: ${contextKeys.join(", ")})`;
      userContent += `\n[Context too large for prompt - consider filtering]`;
    }
  }

  // Add constraints guidance based on output style
  const outputStyleGuidance = {
    structured: `Return your response as JSON with this structure:
{
  "steps": ["step 1", "step 2", ...],
  "result": "your main result/answer",
  "reasoning": "brief explanation of your approach"
}`,
    detailed: `Provide detailed analysis with clear sections. Use numbered steps for multi-part answers.`,
    insights: `Focus on actionable insights. Start with key findings, then supporting details.`,
    direct: `Be direct and concise. Focus on the essential answer.`,
    summary: `Summarize findings clearly with bullet points for key information.`,
    adaptive: `Choose the best format for this task.`,
  };

  const guidance = outputStyleGuidance[modePreset.outputStyle] || "";
  if (guidance) {
    userContent += `\n\n${guidance}`;
  }

  userContent += `\n\nConstraints:\n- Max steps: ${constraints.max_steps}\n- Be focused and cost-efficient`;

  const userMessage = {
    role: "user",
    content: userContent,
  };

  const messages = [systemMessage, userMessage];

  // Build request payload
  const payload = {
    messages,
    tools: tools || undefined,
    temperature: constraints.temperature,
    max_tokens: constraints.max_tokens,
  };

  return payload;
}

/**
 * =============================================================================
 * STAGE 4: run_model
 * =============================================================================
 */

async function runModel(payload, provider, model) {
  const client = getLLMClient();

  // Use provider/model from args or fall back to client defaults
  const activeProvider = provider || client.provider;
  const activeModel = model || client.defaultModel;
  const baseURL = client.baseURL;

  // If no API key, return stub response
  if (!client.apiKey) {
    console.log("[Agent] Using stub response (no API key configured)");
    return createStubResponse(payload, activeModel);
  }

  // Build final payload with model
  const requestPayload = {
    model: activeModel,
    ...payload,
  };

  // Remove undefined fields
  Object.keys(requestPayload).forEach((key) => {
    if (requestPayload[key] === undefined) {
      delete requestPayload[key];
    }
  });

  // Make HTTP request
  try {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(client.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `LLM API error (${response.status}): ${errorText.substring(0, 200)}`
      );
    }

    const data = await response.json();

    // Attach provider/model metadata
    data._provider = activeProvider;
    data._requestedModel = activeModel;

    return data;
  } catch (err) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      throw new Error(`LLM API timeout after ${client.timeout}ms`);
    }
    throw err;
  }
}

/**
 * Stub response for development
 */
function createStubResponse(payload, model) {
  const userMessage = payload.messages.find((m) => m.role === "user");
  const task = userMessage?.content || "No task provided";
  const hasTools = payload.tools && payload.tools.length > 0;

  const stubContent = {
    steps: [
      "Parse task requirements",
      "Analyze available context",
      "Generate response",
    ],
    result: `[STUB] Simulated response for: "${task.substring(0, 100)}...". Configure OPENAI_API_KEY for real LLM.`,
    reasoning:
      "This is a stub response generated locally for development purposes.",
  };

  const response = {
    id: "stub-" + Date.now(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model || "stub-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify(stubContent, null, 2),
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 80,
      completion_tokens: 120,
      total_tokens: 200,
    },
    _provider: "stub",
    _requestedModel: model,
  };

  // Add stub tool calls if tools were requested
  if (hasTools) {
    response.choices[0].message.tool_calls = [
      {
        id: "stub-tool-call-1",
        type: "function",
        function: {
          name: "stub_function",
          arguments: JSON.stringify({ note: "Stub tool call" }),
        },
      },
    ];
  }

  return response;
}

/**
 * =============================================================================
 * STAGE 5: decode_outputs
 * =============================================================================
 * Enhanced to handle:
 * - Plain text responses
 * - Structured JSON responses
 * - Tool calls (OpenAI/Anthropic format)
 * - Reasoning content blocks (o1/deepthink style)
 */

function decodeOutputs(rawResponse) {
  if (!rawResponse || !rawResponse.choices || rawResponse.choices.length === 0) {
    throw new Error("Invalid LLM response: no choices returned");
  }

  const choice = rawResponse.choices[0];
  if (!choice.message) {
    throw new Error("Invalid LLM response: no message");
  }

  const message = choice.message;
  const decoded = {
    content: null,
    toolCalls: null,
    reasoning: null,
    finishReason: choice.finish_reason,
  };

  // Extract main content
  if (message.content) {
    // Try to parse as JSON first
    try {
      decoded.content = JSON.parse(message.content);
    } catch (err) {
      // Not JSON, keep as plain text
      decoded.content = message.content;
    }
  }

  // Extract tool calls (OpenAI format)
  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    decoded.toolCalls = message.tool_calls.map((tc) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments:
          typeof tc.function.arguments === "string"
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments,
      },
    }));
  }

  // Extract reasoning (if present, e.g., from o1/deepthink models)
  // Some models include reasoning in a separate field or as metadata
  if (message.reasoning || message.reasoning_content) {
    decoded.reasoning = message.reasoning || message.reasoning_content;
  }

  // Check for reasoning in content if it's structured
  if (
    decoded.content &&
    typeof decoded.content === "object" &&
    decoded.content.reasoning
  ) {
    decoded.reasoning = decoded.content.reasoning;
  }

  return decoded;
}

/**
 * =============================================================================
 * STAGE 6: postprocess_and_structure_response
 * =============================================================================
 * Always returns { steps, result, meta } regardless of input format
 */

function postprocessAndStructureResponse(decoded, rawResponse, requestPayload) {
  const client = getLLMClient();

  // Extract steps, result, reasoning from decoded content
  let steps = [];
  let result = "";
  let reasoning = decoded.reasoning || "";

  // Handle structured content (JSON)
  if (decoded.content && typeof decoded.content === "object") {
    steps = Array.isArray(decoded.content.steps)
      ? decoded.content.steps
      : [];
    result = decoded.content.result || decoded.content.answer || "";
    reasoning = decoded.content.reasoning || reasoning;
  }
  // Handle plain text content
  else if (typeof decoded.content === "string") {
    const text = decoded.content;

    // Try to extract numbered steps from text
    const lines = text.split("\n").filter((line) => line.trim());
    const extractedSteps = lines
      .filter((line) => /^\d+[\.)]\s/.test(line))
      .map((line) => line.replace(/^\d+[\.)]\s/, "").trim())
      .slice(0, 10);

    if (extractedSteps.length > 0) {
      steps = extractedSteps;
      // Remove steps from result to avoid duplication
      result = text;
    } else {
      // No clear steps, use heuristic
      steps = ["Analyze task", "Process information", "Generate response"];
      result = text;
    }
  }

  // Handle tool calls if present
  if (decoded.toolCalls && decoded.toolCalls.length > 0) {
    steps.push(
      `Execute ${decoded.toolCalls.length} tool call(s): ${decoded.toolCalls.map((tc) => tc.function.name).join(", ")}`
    );

    // Add tool call details to result
    if (!result) {
      result = `Requested tool execution: ${decoded.toolCalls.map((tc) => tc.function.name).join(", ")}`;
    }
  }

  // Build meta with cost estimation
  const meta = buildResponseMeta(
    rawResponse,
    client,
    requestPayload
  );

  // Add reasoning to meta if present
  if (reasoning) {
    meta.reasoning = reasoning;
  }

  // Add tool calls to meta if present
  if (decoded.toolCalls) {
    meta.tool_calls = decoded.toolCalls;
  }

  // Cap result length for safety
  if (typeof result === "string" && result.length > 5000) {
    result = result.substring(0, 5000) + "\n... [truncated]";
  }

  return {
    steps: steps.length > 0 ? steps : ["Process request"],
    result: result || "No result generated",
    meta,
  };
}

/**
 * Build meta object with provider-aware cost estimation
 */
function buildResponseMeta(rawResponse, client, requestPayload) {
  const usage = rawResponse.usage || {};
  const model = rawResponse.model || rawResponse._requestedModel || "unknown";
  const provider = rawResponse._provider || client.provider;

  const inputTokens = usage.prompt_tokens || 0;
  const outputTokens = usage.completion_tokens || 0;
  const totalTokens = usage.total_tokens || inputTokens + outputTokens;

  // Get pricing for this provider/model
  const providerPricing = client.pricing || {};
  const modelPricing = providerPricing[model] || { input: 0, output: 0 };

  // Calculate cost (pricing is per 1M tokens)
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;
  const totalCost = inputCost + outputCost;

  // Extract mode from request
  const mode =
    requestPayload?.messages?.find((m) => m.role === "system")?.content ||
    "unknown";
  const modeKey = Object.keys(MODE_PRESETS).find(
    (key) => MODE_PRESETS[key].systemPrompt === mode
  );

  return {
    provider,
    model,
    mode: modeKey || "unknown",
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: totalTokens,
    },
    cost_usd: parseFloat(totalCost.toFixed(6)),
    cost_breakdown: {
      input_usd: parseFloat(inputCost.toFixed(6)),
      output_usd: parseFloat(outputCost.toFixed(6)),
    },
    finish_reason: rawResponse.choices?.[0]?.finish_reason || "unknown",
  };
}

/**
 * =============================================================================
 * MAIN PIPELINE: runAgent
 * =============================================================================
 * Orchestrates all 6 stages with cost-awareness (1-2 calls max)
 */

async function runAgent(rawRequest) {
  // Stage 2: normalize_request
  const normalized = normalizeRequest(rawRequest);

  // Stage 3: build_model_inputs
  const payload = buildModelInputs(normalized);

  // Stage 4: run_model (FIRST CALL - always happens)
  const rawResponse = await runModel(
    payload,
    normalized.provider,
    normalized.model
  );

  // Stage 5: decode_outputs
  const decoded = decodeOutputs(rawResponse);

  // Cost-aware decision: Should we make a second call?
  // Only if:
  // 1. Tool calls were requested AND
  // 2. We got tool calls back AND
  // 3. User explicitly allowed multi-turn (via constraints.allow_tool_execution)
  let secondCallMade = false;
  if (
    decoded.toolCalls &&
    normalized.constraints.allow_tool_execution === true
  ) {
    // In a real implementation, you'd execute the tools here
    // For now, we just note that a second call would be made
    console.log(
      `[Agent] Tool calls detected but allow_tool_execution not implemented yet`
    );
    // Placeholder for future tool execution + second LLM call
    secondCallMade = false;
  }

  // Stage 6: postprocess_and_structure_response
  const finalResponse = postprocessAndStructureResponse(
    decoded,
    rawResponse,
    payload
  );

  // Add call count to meta
  finalResponse.meta.calls_made = secondCallMade ? 2 : 1;

  return finalResponse;
}

/**
 * =============================================================================
 * UTILITY: Get Available Modes
 * =============================================================================
 */

function getAvailableModes() {
  return Object.keys(MODE_PRESETS).map((key) => ({
    mode: key,
    description: MODE_PRESETS[key].systemPrompt.split("\n")[0],
    temperature: MODE_PRESETS[key].temperature,
    maxSteps: MODE_PRESETS[key].maxSteps,
    outputStyle: MODE_PRESETS[key].outputStyle,
  }));
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

  // Utilities
  getAvailableModes,
  MODE_PRESETS,
  PROVIDER_CONFIG,
};
