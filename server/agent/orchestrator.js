// server/agent/orchestrator.js
// Orchestrates agent execution: mode resolution, LLM calls, (future) tool execution

const { getMode } = require("./modes");
const { callLLM } = require("./llmClient");
const { executeTool } = require("./tools/registry"); // not used yet, but kept for future

/**
 * Run agent with given mode and message
 * @param {object} request
 * @param {string} request.mode - Mode name (e.g., "dev_ritual")
 * @param {string} request.message - User message
 * @param {string} [request.provider] - Optional provider override
 * @param {object} [request.apiKeys] - Optional explicit API keys
 * @returns {Promise<object>} { steps, result, meta }
 */
async function runAgent(request) {
  const { mode: modeName, message, provider: providerOverride, apiKeys } = request || {};

  if (!modeName) {
    throw new Error("Missing required field: mode");
  }

  if (!message || !message.trim()) {
    throw new Error("Missing required field: message");
  }

  // Resolve mode configuration
  const mode = getMode(modeName);

  // Determine provider: request override > mode default > "openai"
  const provider = providerOverride || mode.model.provider || "openai";
  const model = mode.model.name || "gpt-3.5-turbo";
  const temperature = mode.model.temperature || 0.7;
  const maxTokens = mode.model.maxTokens || 2000;

  console.log(
    `[Orchestrator] Running agent in mode "${modeName}" with provider "${provider}" and model "${model}"`
  );

  const steps = [];

  // Step 1: Prepare messages
  const messages = [
    { role: "system", content: mode.systemPrompt },
    { role: "user", content: message },
  ];

  steps.push({
    step: "prepare_messages",
    description: "Prepared system and user messages",
    messages,
  });

  // Step 2: Call LLM
  let llmResponse;
  try {
    llmResponse = await callLLM({
      provider,
      model,
      messages,
      temperature,
      maxTokens,
      apiKeys,
    });

    steps.push({
      step: "call_llm",
      description: `Called ${provider} LLM (${model})`,
      response: {
        content: llmResponse.content,
        usage: llmResponse.usage,
      },
    });
  } catch (error) {
    console.error("[Orchestrator] LLM call failed:", error.message);
    throw error;
  }

  // Step 3: Process result (simple version: just wrap the text)
  const result = {
    answer: llmResponse.content,
  };

  steps.push({
    step: "process_result",
    description: "Processed LLM response",
    result,
  });

  const timestamp = new Date().toISOString();

  // Log agent-run summary on success
  console.log("[Agent Run]", {
    mode: modeName,
    provider,
    model,
    timestamp,
  });

  // Return structured response
  return {
    steps,
    result,
    meta: {
      mode: modeName,
      provider,
      model,
      timestamp,
    },
  };
}

module.exports = {
  runAgent,
};
