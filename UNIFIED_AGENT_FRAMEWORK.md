# Unified Agent Framework

A minimal but powerful agent framework combining patterns from **Qwen**, **Kimi K2**, and **DeepSeek V3**.

## Architecture

### Core Principles

- **Qwen patterns**: Tool registry, JSON Schema tools, config-driven modes, stateless agents
- **Kimi K2 patterns**: OpenAI-compatible API, tool-calling loop (`finish_reason == "tool_calls"`), streaming-ready
- **DeepSeek patterns**: 6-stage inference pipeline, reasoning-token handling (`<think>...</think>`), MoE-inspired tool selection

### 6-Stage Pipeline

```
1. initialize_model       → Create LLMClient based on mode's provider
2. normalize_request      → Build ChatML messages array, resolve mode
3. build_model_inputs     → Attach tools + model-level options
4. run_model              → Kimi-style tool-calling loop (max 2 calls)
5. decode_outputs         → Handle tool_calls and reasoning tokens
6. postprocess_response   → Build { steps, result, meta }
```

## File Structure

```
server/
├── agent/
│   ├── llmClient.js           # Provider-agnostic LLM client
│   ├── modes.js               # Mode presets (dev_ritual, code_architect, mood_analyst)
│   ├── orchestrator.js        # 6-stage pipeline implementation
│   └── tools/
│       └── registry.js        # Tool registry + example tools
├── services/
│   └── agentService.js        # HTTP request wrapper
└── routes/
    └── agentRoutes.js         # Express routes
```

## Environment Setup

```bash
# .env

# At least one API key required (generic key works for all providers)
OPENAI_API_KEY=sk-...

# Optional: provider-specific keys
DEEPSEEK_API_KEY=sk-...
QWEN_API_KEY=sk-...
KIMI_API_KEY=sk-...
```

## API Usage

### POST /agent/run

Run agent with a task:

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "dev_ritual",
    "message": "Review this code for bugs",
    "history": [],
    "provider": "openai"
  }'
```

**Request:**
```json
{
  "mode": "dev_ritual",           // dev_ritual | code_architect | mood_analyst
  "message": "your task here",    // required
  "history": [                     // optional
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "provider": "openai"             // optional: openai | deepseek | qwen | kimi
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "steps": [
      {
        "type": "reasoning",
        "hidden": true,
        "content": "Let me analyze this code systematically..."
      },
      {
        "type": "tool_execution",
        "toolName": "code_summary",
        "input": {"code": "...", "language": "javascript"},
        "output": {"lines_of_code": 42, "num_functions": 3, ...},
        "success": true
      },
      {
        "type": "final_answer",
        "content": "Based on the analysis, here are the key issues..."
      }
    ],
    "result": "Based on the analysis, here are the key issues...",
    "meta": {
      "mode": "dev_ritual",
      "provider": "openai",
      "model": "gpt-4o-mini",
      "totalTokens": 342,
      "promptTokens": 120,
      "completionTokens": 222,
      "estimatedCost": 0.000151,
      "llmCalls": 2,
      "toolExecutions": 1,
      "executionTimeMs": 1834,
      "finishReason": "stop"
    }
  }
}
```

### GET /agent/health

Check system status:

```bash
curl http://localhost:4000/agent/health
```

**Response:**
```json
{
  "status": "ok",
  "info": {
    "modes": [
      {
        "name": "dev_ritual",
        "description": "Developer workflow assistant",
        "provider": "openai",
        "model": "gpt-4o-mini",
        "mode_type": "instruct",
        "num_tools": 2
      },
      {
        "name": "code_architect",
        "description": "Senior software architect",
        "provider": "deepseek",
        "model": "deepseek-reasoner",
        "mode_type": "thinking",
        "num_tools": 2
      },
      {
        "name": "mood_analyst",
        "description": "Empathetic mood data analyst",
        "provider": "qwen",
        "model": "qwen-plus",
        "mode_type": "instruct",
        "num_tools": 1
      }
    ],
    "providers": ["qwen", "deepseek", "kimi", "openai"],
    "version": "1.0.0",
    "features": {
      "tool_calling": true,
      "reasoning_models": true,
      "multi_provider": true,
      "max_calls_per_request": 2
    }
  }
}
```

## Modes

### dev_ritual
- **Purpose**: Fast developer workflow assistant
- **Provider**: OpenAI (gpt-4o-mini)
- **Type**: Instruct (direct responses)
- **Tools**: `generate_tasks`, `code_summary`
- **Use cases**: Code review, debugging, task planning

### code_architect
- **Purpose**: Deep system design and reasoning
- **Provider**: DeepSeek (deepseek-reasoner)
- **Type**: Thinking (uses `<think>` reasoning)
- **Tools**: `code_summary`, `generate_tasks`
- **Use cases**: Architecture design, complex analysis

### mood_analyst
- **Purpose**: Empathetic mood data analysis
- **Provider**: Qwen (qwen-plus)
- **Type**: Instruct
- **Tools**: `mood_cluster`
- **Use cases**: Mood trend analysis, emotional insights

## Tools

### Built-in Tools

**generate_tasks**
```json
{
  "name": "generate_tasks",
  "description": "Break down a complex task into smaller steps",
  "parameters": {
    "task_description": "string (required)",
    "max_steps": "number (default: 5)"
  }
}
```

**mood_cluster**
```json
{
  "name": "mood_cluster",
  "description": "Analyze mood data and identify patterns",
  "parameters": {
    "moods": "array (required)",
    "num_clusters": "number (default: 3)"
  }
}
```

**code_summary**
```json
{
  "name": "code_summary",
  "description": "Analyze code structure and generate summary",
  "parameters": {
    "code": "string (required)",
    "language": "string (default: 'javascript')"
  }
}
```

### Adding Custom Tools

Edit `server/agent/tools/registry.js`:

```javascript
registerTool("my_custom_tool", {
  description: "Does something useful",
  parameters: {
    type: "object",
    properties: {
      input: { type: "string", description: "Input data" }
    },
    required: ["input"]
  },
  handler: async ({ input }) => {
    // Your implementation
    return { result: "processed: " + input };
  }
});
```

Then add to mode's tool list in `server/agent/modes.js`:

```javascript
my_mode: {
  name: "my_mode",
  tools: ["my_custom_tool", "generate_tasks"],
  // ...
}
```

## Provider Configuration

### Supported Providers

| Provider | Base URL | Auth Header | Models |
|----------|----------|-------------|--------|
| **OpenAI** | `https://api.openai.com/v1` | `Authorization: Bearer` | gpt-4o-mini, gpt-4o, gpt-4-turbo |
| **DeepSeek** | `https://api.deepseek.com/v1` | `Authorization: Bearer` | deepseek-chat, deepseek-reasoner |
| **Qwen** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `Authorization: Bearer` | qwen-plus, qwen-max, qwen-turbo |
| **Kimi** | `https://api.moonshot.cn/v1` | `Authorization: Bearer` | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k |

### Pricing (per 1M tokens)

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| OpenAI | gpt-4o | $2.50 | $10.00 |
| DeepSeek | deepseek-chat | $0.27 | $1.10 |
| DeepSeek | deepseek-reasoner | $0.55 | $2.19 |
| Qwen | qwen-plus | $0.50 | $2.00 |
| Qwen | qwen-turbo | $0.30 | $0.60 |
| Kimi | moonshot-v1-8k | $0.20 | $0.60 |
| Kimi | moonshot-v1-128k | $1.00 | $3.00 |

## Cost Management

### Limits

- **Max 2 LLM calls per request**
- Enforced at `LLMClient` level
- Tool-calling loop automatically stops after 2 calls

### Tracking

Every response includes detailed cost breakdown:

```json
"meta": {
  "totalTokens": 342,
  "promptTokens": 120,
  "completionTokens": 222,
  "estimatedCost": 0.000151,  // USD
  "llmCalls": 2,
  "toolExecutions": 1
}
```

### Optimization Tips

1. Use `dev_ritual` (OpenAI gpt-4o-mini) for fast, cheap responses
2. Use `code_architect` (DeepSeek reasoner) for complex reasoning at 50% cost vs GPT-4
3. Keep `history` array minimal (context is expensive)
4. Use tool calling sparingly (each tool call = 1 extra LLM call)

## Reasoning Models (DeepSeek Pattern)

### How It Works

Models like `deepseek-reasoner` output thinking tokens:

```
<think>
Let me analyze this systematically:
1. First, I need to understand the code structure
2. Then identify potential issues
3. Finally, provide recommendations
</think>

Here's my analysis: ...
```

The framework automatically:
- Extracts reasoning into `steps[0].type = "reasoning"`
- Strips `<think>` tags from final result
- Marks reasoning as `hidden: true` (UI can toggle visibility)

### Modes with Reasoning

Set `mode: "thinking"` in mode config:

```javascript
{
  mode: "thinking",  // enables <think> extraction
  model: {
    provider: "deepseek",
    id: "deepseek-reasoner"
  }
}
```

## Tool-Calling Loop (Kimi K2 Pattern)

### Flow

```
1. User sends message
2. LLM returns finish_reason: "tool_calls"
3. Framework executes tools
4. Framework sends tool results back to LLM
5. LLM returns finish_reason: "stop" with final answer
```

### Example

**Request:**
```json
{
  "mode": "dev_ritual",
  "message": "Analyze this code: function add(a,b) { return a+b; }"
}
```

**Internal Flow:**

1. **LLM Call 1** → Returns `tool_calls: [{"name": "code_summary", ...}]`
2. **Execute Tool** → `code_summary` analyzes code
3. **LLM Call 2** → Receives tool result, returns final answer

**Response:**
```json
{
  "steps": [
    {
      "type": "tool_execution",
      "toolName": "code_summary",
      "input": {"code": "...", "language": "javascript"},
      "output": {"lines_of_code": 1, "num_functions": 1, ...}
    },
    {
      "type": "final_answer",
      "content": "This is a simple addition function..."
    }
  ],
  "result": "This is a simple addition function...",
  "meta": {
    "llmCalls": 2,
    "toolExecutions": 1
  }
}
```

## Example Workflows

### 1. Code Review

```bash
curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "dev_ritual",
    "message": "Review this API endpoint for security issues",
    "provider": "openai"
  }'
```

**Cost:** ~$0.0002 (gpt-4o-mini, 1-2 calls)

### 2. Architecture Design

```bash
curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "code_architect",
    "message": "Design a caching layer for a high-traffic API",
    "provider": "deepseek"
  }'
```

**Cost:** ~$0.0004 (deepseek-reasoner with reasoning, 1 call)

### 3. Mood Analysis

```bash
curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "mood_analyst",
    "message": "What patterns do you see in my mood data?",
    "provider": "qwen"
  }'
```

**Cost:** ~$0.0003 (qwen-plus + mood_cluster tool, 2 calls)

## Error Handling

### Common Errors

**No API key:**
```json
{
  "success": false,
  "error": "No API key provided for provider: openai"
}
```

**Call limit exceeded:**
```json
{
  "success": false,
  "error": "LLM call limit exceeded (max 2 per request)"
}
```

**Invalid mode:**
```json
{
  "success": false,
  "error": "Unknown mode: invalid_mode"
}
```

**Tool execution failed:**
```json
{
  "steps": [
    {
      "type": "tool_execution",
      "toolName": "mood_cluster",
      "success": false,
      "error": "Tool mood_cluster execution failed: ..."
    }
  ]
}
```

## Development

### Testing Without API Keys

The framework requires at least one API key to function. For testing without API costs:

1. Use the cheapest provider (DeepSeek or Qwen)
2. Set small `max_tokens` in mode configs
3. Use simple tasks that don't trigger tool calls

### Adding a New Mode

1. Edit `server/agent/modes.js`:

```javascript
MODES.my_new_mode = {
  name: "my_new_mode",
  description: "What this mode does",
  systemPrompt: "You are a...",
  tools: ["tool1", "tool2"],
  model: {
    provider: "openai",
    id: "gpt-4o-mini",
    temperature: 0.5,
    maxTokens: 1500
  },
  mode: "instruct"  // or "thinking"
};
```

2. Restart server
3. Test: `curl -d '{"mode": "my_new_mode", "message": "test"}' http://localhost:4000/agent/run`

### Extending LLMClient

To add a new provider, edit `server/agent/llmClient.js`:

```javascript
PROVIDER_CONFIGS.my_provider = {
  baseURL: "https://api.myprovider.com/v1",
  authHeader: "Authorization",
  authPrefix: "Bearer",
  models: {
    "my-model": { ctx: 8192, good_for: "general", input: 0.5, output: 1.0 }
  }
};
```

## Troubleshooting

**Provider API errors:**
- Check API key is correct
- Verify provider base URL is accessible
- Check model ID is valid for provider

**High costs:**
- Reduce `maxTokens` in mode configs
- Avoid long conversation histories
- Use cheaper providers (DeepSeek, Qwen)

**Slow responses:**
- Use faster models (gpt-4o-mini, qwen-turbo)
- Reduce number of tools per mode
- Avoid complex tool chains

## Comparison to Original Implementation

| Feature | Original (AGENT_EVOLUTION.md) | Unified Framework |
|---------|-------------------------------|-------------------|
| **Pipeline** | 6 stages (same foundation) | 6 stages (same foundation) |
| **Providers** | 4 providers | 4 providers (same) |
| **Modes** | 8 generic modes | 3 specialized modes |
| **Tools** | No tool calling | Qwen-style tool registry |
| **Reasoning** | Basic handling | DeepSeek `<think>` extraction |
| **Tool Loop** | Placeholder | Kimi-style 2-call loop |
| **API** | Generic `task` field | Structured `message` + `history` |
| **Response** | Generic `steps` array | Typed steps (reasoning, tool, answer) |

## Next Steps

1. **Add more tools**: Implement domain-specific tools for your use case
2. **Add streaming**: Implement SSE for real-time responses
3. **Add caching**: Use provider-specific caching (DeepSeek, Anthropic)
4. **Add validation**: Use `ajv` for JSON Schema validation in tools
5. **Add monitoring**: Log costs, latencies, and errors to analytics

---

**Framework Version:** 1.0.0
**Compatible Providers:** OpenAI, DeepSeek, Qwen, Kimi (OpenAI-compatible APIs)
**Max Calls Per Request:** 2
**License:** MIT
