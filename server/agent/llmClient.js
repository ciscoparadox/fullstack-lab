// server/agent/llmClient.js
// LLM client for making API calls to various providers (OpenAI, Kimi, DeepSeek, Qwen)

const axios = require("axios");

/**
 * Resolve API key for a given provider
 * @param {string} provider - Provider name (openai, kimi, deepseek, qwen)
 * @param {object} explicitKeys - Explicitly passed API keys {provider: key}
 * @returns {string|null} Resolved API key or null if not found
 */
function resolveApiKey(provider, explicitKeys = {}) {
  const upper = provider.toUpperCase();

  // Highest priority: passed-in explicit keys
  if (explicitKeys[provider]) {
    return explicitKeys[provider];
  }

  // Provider-specific env var (e.g., KIMI_API_KEY, OPENAI_API_KEY)
  const providerKey = process.env[`${upper}_API_KEY`];
  if (providerKey) {
    return providerKey;
  }

  // Special-case kimi: allow MOONSHOT_API_KEY or OPENAI_API_KEY fallback
  if (provider === "kimi") {
    if (process.env.MOONSHOT_API_KEY) {
      return process.env.MOONSHOT_API_KEY;
    }
    if (process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY;
    }
  }

  // Generic fallback to OPENAI_API_KEY for all providers
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  return null;
}

/**
 * Get the API endpoint and headers for a given provider
 * @param {string} provider - Provider name
 * @param {string} apiKey - API key
 * @returns {object} { baseURL, headers }
 */
function getProviderConfig(provider, apiKey) {
  switch (provider) {
    case "openai":
      return {
        baseURL: "https://api.openai.com/v1",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

    case "kimi":
    case "moonshot":
      return {
        baseURL: "https://api.moonshot.cn/v1",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

    case "deepseek":
      return {
        baseURL: "https://api.deepseek.com/v1",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

    case "qwen":
      return {
        baseURL: "https://dashscope.aliyuncs.com/api/v1",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Call LLM API with chat completion
 * @param {object} options
 * @param {string} options.provider - Provider name
 * @param {string} options.model - Model name
 * @param {Array} options.messages - Chat messages
 * @param {number} options.temperature - Temperature (0-1)
 * @param {number} options.maxTokens - Max tokens to generate
 * @param {object} options.apiKeys - Explicit API keys map
 * @returns {Promise<object>} { content, usage }
 */
async function callLLM({
  provider,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2000,
  apiKeys = {},
}) {
  const apiKey = resolveApiKey(provider, apiKeys);

  if (!apiKey) {
    // Debug logging before throwing error
    console.warn("[AGENT DEBUG] Missing API key", {
      provider,
      hasProviderKey: !!process.env[`${provider.toUpperCase()}_API_KEY`],
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasMoonshotKey: !!process.env.MOONSHOT_API_KEY,
    });

    throw new Error(
      `Missing API key for provider "${provider}". Set it in .env or pass apiKeys.`
    );
  }

  const config = getProviderConfig(provider, apiKey);

  const requestBody = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  try {
    const response = await axios.post(
      `${config.baseURL}/chat/completions`,
      requestBody,
      { headers: config.headers, timeout: 30000 }
    );

    const choice = response.data.choices?.[0];
    if (!choice) {
      throw new Error("No choices returned from LLM API");
    }

    return {
      content: choice.message?.content || "",
      usage: response.data.usage || {},
    };
  } catch (error) {
    if (error.response) {
      // API returned an error response
      const status = error.response.status;
      const data = error.response.data;
      throw new Error(
        `LLM API error (${status}): ${JSON.stringify(data)}`
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(`LLM API request failed: ${error.message}`);
    } else {
      // Something else happened
      throw error;
    }
  }
}

module.exports = {
  resolveApiKey,
  getProviderConfig,
  callLLM,
};
