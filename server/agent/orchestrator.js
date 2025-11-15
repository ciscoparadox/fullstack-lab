// server/agent/orchestrator.js
// 6-stage inference pipeline combining Qwen, Kimi, and DeepSeek patterns

const { LLMClient } = require("./llmClient");
const { getMode, isThinkingMode } = require("./modes");
const { getToolsByMode, executeTool } = require("./tools/registry");

/**
 * Main agent orchestrator implementing 6-stage pipeline
 * @param {Object} request
 * @param {string} request.mode - Mode name (dev_ritual, code_architect, mood_analyst)
 * @param {string} request.message - User message/task
 * @param {Array} [request.history] - Conversation history
 * @param {string} [request.provider] - Override provider
 * @param {Object} [request.apiKeys] - API keys by provider
 * @returns {Promise<{steps: Array, result: string, meta: Object}>}
 */
async function runAgent(request) {
  const startTime = Date.now();

  // STAGE 1: initialize_model
  const { llmClient, modeConfig } = initializeModel(request);

  // STAGE 2: normalize_request
  const normalized = normalizeRequest(request, modeConfig);

  // STAGE 3: build_model_inputs
  const modelInputs = buildModelInputs(normalized, modeConfig);

  // STAGE 4: run_model (with Kimi-style tool-calling loop)
  const { rawResponses, totalUsage, toolExecutions } = await runModel(
    llmClient,
    modelInputs,
    modeConfig
  );

  // STAGE 5: decode_outputs
  const decoded = decodeOutputs(rawResponses, modeConfig);

  // STAGE 6: postprocess_and_structure_response
  const result = postprocessAndStructureResponse(
    decoded,
    toolExecutions,
    totalUsage,
    modeConfig,
    Date.now() - startTime
  );

  return result;
}

// ============================================================================
// STAGE 1: initialize_model
// ============================================================================

function initializeModel(request) {
  const modeConfig = getMode(request.mode || "dev_ritual");

  // Determine provider (allow override)
  const provider = request.provider || modeConfig.model.provider;

  // Get API key
  const apiKey = request.apiKeys?.[provider] || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(`No API key provided for provider: ${provider}`);
  }

  // Create LLM client
  const llmClient = new LLMClient(provider, apiKey, { maxCalls: 2 });

  return { llmClient, modeConfig };
}

// ============================================================================
// STAGE 2: normalize_request
// ============================================================================

function normalizeRequest(request, modeConfig) {
  const { message, history = [] } = request;

  if (!message || typeof message !== "string") {
    throw new Error("Missing or invalid 'message' field");
  }

  // Build messages array (ChatML format)
  const messages = [
    { role: "system", content: modeConfig.systemPrompt },
    ...history, // Array of {role, content}
    { role: "user", content: message },
  ];

  // Get tools for this mode
  const tools = getToolsByMode(modeConfig.name);

  return {
    messages,
    tools,
    model: modeConfig.model.id,
    temperature: modeConfig.model.temperature,
    maxTokens: modeConfig.model.maxTokens,
    topP: modeConfig.model.top_p,
  };
}

// ============================================================================
// STAGE 3: build_model_inputs
// ============================================================================

function buildModelInputs(normalized, modeConfig) {
  return {
    model: normalized.model,
    messages: normalized.messages,
    tools: normalized.tools.length > 0 ? normalized.tools : undefined,
    temperature: normalized.temperature,
    max_tokens: normalized.maxTokens,
    top_p: normalized.topP,
  };
}

// ============================================================================
// STAGE 4: run_model (Kimi-style tool-calling loop)
// ============================================================================

async function runModel(llmClient, modelInputs, modeConfig) {
  const rawResponses = [];
  const toolExecutions = [];
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };

  let messages = [...modelInputs.messages];
  let continueLoop = true;
  let loopCount = 0;

  while (continueLoop && loopCount < 2) {
    loopCount++;

    // Make LLM call
    const { response, usage } = await llmClient.chat({
      ...modelInputs,
      messages,
    });

    rawResponses.push(response);
    totalUsage.promptTokens += usage.promptTokens;
    totalUsage.completionTokens += usage.completionTokens;
    totalUsage.totalTokens += usage.totalTokens;
    totalUsage.estimatedCost += usage.estimatedCost;

    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error("No choices in LLM response");
    }

    const finishReason = choice.finish_reason;
    const assistantMessage = choice.message;

    // Append assistant message to conversation
    messages.push(assistantMessage);

    // Check if we need to execute tools
    if (finishReason === "tool_calls" && assistantMessage.tool_calls) {
      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs =
          typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

        try {
          const toolResult = await executeTool(toolName, toolArgs);

          toolExecutions.push({
            name: toolName,
            input: toolArgs,
            output: toolResult,
            success: true,
          });

          // Append tool result to messages (OpenAI format)
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (err) {
          toolExecutions.push({
            name: toolName,
            input: toolArgs,
            error: err.message,
            success: false,
          });

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: err.message }),
          });
        }
      }

      // Continue loop for another LLM call
      continueLoop = true;
    } else {
      // No more tool calls, exit loop
      continueLoop = false;
    }
  }

  return { rawResponses, totalUsage, toolExecutions };
}

// ============================================================================
// STAGE 5: decode_outputs
// ============================================================================

function decodeOutputs(rawResponses, modeConfig) {
  // Get final response
  const finalResponse = rawResponses[rawResponses.length - 1];
  const choice = finalResponse.choices?.[0];
  if (!choice) {
    throw new Error("No final choice in LLM response");
  }

  const message = choice.message;
  let text = message.content || "";
  let reasoning = null;

  // Handle DeepSeek-style <think> reasoning tokens
  if (isThinkingMode(modeConfig.name) && text.includes("<think>")) {
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      reasoning = thinkMatch[1].trim();
      // Strip thinking from final text
      text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    }
  }

  // Extract tool calls if present (for final response analysis)
  const toolCalls = message.tool_calls || null;

  return {
    text,
    reasoning,
    toolCalls,
    finishReason: choice.finish_reason,
  };
}

// ============================================================================
// STAGE 6: postprocess_and_structure_response
// ============================================================================

function postprocessAndStructureResponse(
  decoded,
  toolExecutions,
  totalUsage,
  modeConfig,
  executionTimeMs
) {
  const steps = [];

  // Add reasoning step (if present)
  if (decoded.reasoning) {
    steps.push({
      type: "reasoning",
      hidden: true,
      content: decoded.reasoning,
    });
  }

  // Add tool execution steps
  toolExecutions.forEach((execution) => {
    steps.push({
      type: "tool_execution",
      toolName: execution.name,
      input: execution.input,
      output: execution.success ? execution.output : { error: execution.error },
      success: execution.success,
    });
  });

  // Add final answer step
  steps.push({
    type: "final_answer",
    content: decoded.text,
  });

  // Build result
  const result = {
    steps,
    result: decoded.text,
    meta: {
      mode: modeConfig.name,
      provider: modeConfig.model.provider,
      model: modeConfig.model.id,
      totalTokens: totalUsage.totalTokens,
      promptTokens: totalUsage.promptTokens,
      completionTokens: totalUsage.completionTokens,
      estimatedCost: totalUsage.estimatedCost,
      llmCalls: toolExecutions.length + 1, // initial call + tool result calls
      toolExecutions: toolExecutions.length,
      executionTimeMs,
      finishReason: decoded.finishReason,
    },
  };

  return result;
}

module.exports = {
  runAgent,
};
