// server/agent/llmClient.js
// Provider-agnostic LLM client for Qwen, DeepSeek, Kimi, OpenAI

const PROVIDER_CONFIGS = {
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    models: {
      "qwen-plus": { ctx: 32768, good_for: "general", input: 0.5, output: 2.0 },
      "qwen-max": { ctx: 8192, good_for: "reasoning", input: 4.0, output: 12.0 },
      "qwen-turbo": { ctx: 8192, good_for: "fast", input: 0.3, output: 0.6 },
    },
  },
  deepseek: {
    baseURL: "https://api.deepseek.com/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    models: {
      "deepseek-chat": { ctx: 32768, good_for: "general", input: 0.27, output: 1.1 },
      "deepseek-reasoner": { ctx: 32768, good_for: "thinking", input: 0.55, output: 2.19 },
    },
  },
  kimi: {
    baseURL: "https://api.moonshot.cn/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    models: {
      "moonshot-v1-8k": { ctx: 8192, good_for: "general", input: 0.2, output: 0.6 },
      "moonshot-v1-32k": { ctx: 32768, good_for: "long_context", input: 0.4, output: 1.2 },
      "moonshot-v1-128k": { ctx: 131072, good_for: "very_long", input: 1.0, output: 3.0 },
    },
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    authHeader: "Authorization",
    authPrefix: "Bearer",
    models: {
      "gpt-4o-mini": { ctx: 128000, good_for: "fast", input: 0.15, output: 0.6 },
      "gpt-4o": { ctx: 128000, good_for: "general", input: 2.5, output: 10.0 },
      "gpt-4-turbo": { ctx: 128000, good_for: "reasoning", input: 10.0, output: 30.0 },
    },
  },
};

class LLMClient {
  constructor(providerName, apiKey, options = {}) {
    this.providerName = providerName;
    this.apiKey = apiKey;
    this.callCount = 0;
    this.maxCalls = options.maxCalls || 2;

    const config = PROVIDER_CONFIGS[providerName];
    if (!config) {
      throw new Error(`Unknown provider: ${providerName}. Valid: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`);
    }

    this.config = config;
    this.baseURL = options.baseURL || config.baseURL;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Call chat completion API (OpenAI-compatible)
   * @param {Object} params
   * @param {string} params.model - Model ID
   * @param {Array} params.messages - ChatML messages
   * @param {Array} [params.tools] - Tool definitions (OpenAI format)
   * @param {number} [params.temperature]
   * @param {number} [params.max_tokens]
   * @param {number} [params.top_p]
   * @returns {Promise<{response: Object, usage: Object}>}
   */
  async chat({ model, messages, tools, temperature, max_tokens, top_p }) {
    if (this.callCount >= this.maxCalls) {
      throw new Error(`LLM call limit exceeded (max ${this.maxCalls} per request)`);
    }

    this.callCount++;

    // Build request payload
    const payload = {
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1500,
    };

    if (top_p !== undefined) payload.top_p = top_p;
    if (tools && tools.length > 0) payload.tools = tools;

    // Make API call
    const url = `${this.baseURL}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      [this.config.authHeader]: `${this.config.authPrefix} ${this.apiKey}`,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${this.providerName} API error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      const data = await response.json();

      // Extract usage
      const usage = {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        estimatedCost: this._estimateCost(model, data.usage),
      };

      return { response: data, usage };
    } catch (err) {
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        throw new Error(`${this.providerName} API timeout after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  /**
   * Estimate cost in USD based on usage and pricing table
   * @private
   */
  _estimateCost(model, usage) {
    if (!usage) return 0;

    const modelPricing = this.config.models[model];
    if (!modelPricing) return 0;

    const inputCost = (usage.prompt_tokens / 1_000_000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * modelPricing.output;

    return parseFloat((inputCost + outputCost).toFixed(6));
  }

  /**
   * Reset call counter (for new request)
   */
  resetCallCount() {
    this.callCount = 0;
  }

  /**
   * Get available models for this provider
   */
  getModels() {
    return Object.keys(this.config.models);
  }
}

module.exports = {
  LLMClient,
  PROVIDER_CONFIGS,
};
