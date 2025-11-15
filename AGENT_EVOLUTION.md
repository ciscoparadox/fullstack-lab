# Agent System Evolution: DeepSeek V3 + Qwen + Kimi K2

## Overview

This document describes the evolution of the `/agent/run` endpoint from a basic 6-stage
inference pipeline to a multi-provider, mode-aware agent system inspired by:

- **DeepSeek V3**: 6-stage inference architecture
- **Qwen-Agent**: Mode-based agent presets and tool calling
- **Kimi K2**: Multi-provider compatibility and cost-aware deployment

---

## Architecture Changes

### 1. Multi-Provider LLM Client (Kimi K2 Pattern)

**Before**: Single OpenAI client hardcoded
**After**: Provider abstraction supporting 4+ providers

```javascript
// Supported providers (all OpenAI-compatible APIs)
- openai (default)
- deepseek (DeepSeek V3, chat + reasoner models)
- qwen (Qwen-Plus, Qwen-Max, via DashScope)
- kimi (Moonshot/Kimi, 8k/32k/128k context)
```

**Configuration**:
```bash
# .env
LLM_PROVIDER=deepseek              # openai|deepseek|qwen|kimi
OPENAI_API_KEY=sk-...              # Generic key (works for all providers)

# Optional provider-specific overrides
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

**Benefits**:
- Switch providers without code changes
- Provider-specific pricing models
- Fallback to stub mode for dev

---

### 2. Mode-Aware Prompts (Qwen-Agent Pattern)

**Before**: Generic system prompts, mode just changed temperature
**After**: 8 specialized agent personas with tuned behavior

| Mode | Use Case | Temp | Steps | Output Style |
|------|----------|------|-------|--------------|
| `dev_ritual` | Code review, debugging, architecture | 0.3 | 5 | structured |
| `code_architect` | System design, patterns, scalability | 0.4 | 7 | detailed |
| `mood_analyst` | Mood data insights (app-specific) | 0.5 | 5 | insights |
| `analyze` | General analysis tasks | 0.4 | 5 | structured |
| `plan` | Task planning and breakdown | 0.3 | 8 | structured |
| `execute` | Direct task execution | 0.2 | 3 | direct |
| `search` | Research and information gathering | 0.6 | 4 | summary |
| `auto` | Adaptive (default) | 0.5 | 5 | adaptive |

**Example**:
```bash
# Dev workflow assistant
curl -X POST http://localhost:4000/agent/run \
  -d '{"mode": "dev_ritual", "task": "Review this API design"}'

# Mood insights
curl -X POST http://localhost:4000/agent/run \
  -d '{"mode": "mood_analyst", "task": "Analyze weekly mood trends", "context": {...}}'
```

---

### 3. Enhanced Output Handling

**Before**: Simple JSON or text parsing
**After**: Handles multiple output formats while maintaining consistent structure

**Supported formats**:
- Plain text responses
- Structured JSON (`{ steps, result, reasoning }`)
- Tool calls (OpenAI/Anthropic format)
- Reasoning blocks (o1/deepthink style)

**Always returns**:
```json
{
  "steps": ["step 1", "step 2", ...],
  "result": "main answer/output",
  "meta": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "mode": "dev_ritual",
    "tokens": { "input": 120, "output": 180, "total": 300 },
    "cost_usd": 0.000051,
    "cost_breakdown": { "input_usd": 0.000032, "output_usd": 0.000198 },
    "finish_reason": "stop",
    "calls_made": 1,
    "reasoning": "...",         // optional
    "tool_calls": [...]          // optional
  }
}
```

---

### 4. Provider-Aware Cost Tracking

**Pricing database** (per 1M tokens):

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| OpenAI | gpt-4o | $2.50 | $10.00 |
| DeepSeek | deepseek-chat | $0.27 | $1.10 |
| DeepSeek | deepseek-reasoner | $0.55 | $2.19 |
| Qwen | qwen-plus | $0.50 | $2.00 |
| Qwen | qwen-turbo | $0.30 | $0.60 |
| Kimi | moonshot-v1-8k | $0.20 | $0.60 |

**Cost breakdown in response**:
```json
"meta": {
  "cost_usd": 0.000126,
  "cost_breakdown": {
    "input_usd": 0.000018,
    "output_usd": 0.000108
  }
}
```

---

## 6-Stage Pipeline (Enhanced)

### Stage 1: initialize_model
**Enhancement**: Multi-provider support with pricing tables

```javascript
initializeLLMClient() {
  provider = LLM_PROVIDER || 'openai'
  config = PROVIDER_CONFIG[provider]
  llmClient = { provider, baseURL, model, pricing, ... }
}
```

### Stage 2: normalize_request
**Enhancement**: Mode-aware defaults from MODE_PRESETS

```javascript
normalizeRequest(rawBody) {
  mode = validModes.includes(mode) ? mode : 'auto'
  modePreset = MODE_PRESETS[mode]
  constraints = { ...modePreset.defaults, ...userConstraints }
  return { mode, modePreset, task, context, constraints, tools }
}
```

### Stage 3: build_model_inputs
**Enhancement**: Mode-specific system prompts and output guidance

```javascript
buildModelInputs({ modePreset, task, context }) {
  systemMessage = { role: 'system', content: modePreset.systemPrompt }
  userMessage = buildUserMessage(task, context, modePreset.outputStyle)
  return { messages: [systemMessage, userMessage], tools, temperature, ... }
}
```

### Stage 4: run_model
**Enhancement**: Provider-agnostic API call with metadata tracking

```javascript
runModel(payload, provider, model) {
  response = fetch(`${baseURL}/chat/completions`, payload)
  response._provider = provider
  response._requestedModel = model
  return response
}
```

### Stage 5: decode_outputs
**Enhancement**: Multi-format parsing (JSON, text, tool_calls, reasoning)

```javascript
decodeOutputs(rawResponse) {
  content = parseContent(message.content)  // JSON or text
  toolCalls = parseToolCalls(message.tool_calls)
  reasoning = message.reasoning || extractReasoning(content)
  return { content, toolCalls, reasoning, finishReason }
}
```

### Stage 6: postprocess_and_structure_response
**Enhancement**: Provider-aware cost calculation and consistent output

```javascript
postprocessAndStructureResponse(decoded, rawResponse, requestPayload) {
  steps = extractSteps(decoded)
  result = extractResult(decoded)
  meta = buildMetaWithCost(rawResponse, provider, pricing)
  return { steps, result, meta }
}
```

---

## New API Endpoints

### GET /agent/modes
List all available modes:
```json
{
  "total": 8,
  "modes": [
    {
      "mode": "dev_ritual",
      "description": "You are a developer workflow assistant...",
      "temperature": 0.3,
      "maxSteps": 5,
      "outputStyle": "structured"
    },
    ...
  ]
}
```

### GET /agent/providers
List supported providers:
```json
{
  "current": "deepseek",
  "providers": {
    "openai": {
      "baseURL": "https://api.openai.com/v1",
      "defaultModel": "gpt-4o-mini",
      "models": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]
    },
    "deepseek": { ... },
    ...
  }
}
```

### GET /agent/health
Enhanced health check:
```json
{
  "status": "ok",
  "provider": "deepseek",
  "llm_configured": true,
  "model": "deepseek-chat",
  "available_modes": 8,
  "timestamp": "2025-11-15T12:34:56.789Z"
}
```

---

## Cost-Awareness Strategy

### Goal: 1-2 LLM Calls Per Request

**Single-call flow** (90% of requests):
```
1. normalize_request → validate input
2. build_model_inputs → construct prompt
3. run_model → CALL LLM ONCE
4. decode_outputs → parse response
5. postprocess → format output
→ meta.calls_made = 1
```

**Two-call flow** (tool execution, when enabled):
```
1-3. Same as above
4. decode_outputs → detect tool_calls
5. execute_tools → run requested tools
6. run_model → CALL LLM AGAIN with tool results
7. decode_outputs → parse final response
8. postprocess → format output
→ meta.calls_made = 2
```

**Note**: Tool execution currently requires `constraints.allow_tool_execution: true`
(not yet implemented, placeholder in code).

### Context Size Limits

**Cost-aware context handling**:
- Context < 3000 chars → included in full
- Context > 3000 chars → only keys listed, with warning
- Prevents token explosion on large datasets

### Token Budget

**Target per request**:
- Input: 150-300 tokens (system + user + context)
- Output: 200-500 tokens (based on constraints.max_tokens)
- **Total: <800 tokens** = ~$0.0005 with gpt-4o-mini

**Mode-specific budgets**:
- `dev_ritual`: max_tokens=1500 (medium)
- `execute`: max_tokens=1000 (short)
- `code_architect`: max_tokens=2000 (detailed)

---

## Usage Examples

### Example 1: DeepSeek Code Review
```bash
# Use DeepSeek V3 for cost-effective code review
export LLM_PROVIDER=deepseek
export OPENAI_API_KEY=sk-deepseek-...

curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "dev_ritual",
    "task": "Review this function for performance issues",
    "context": {
      "code": "function processData(data) { ... }"
    }
  }'
```

**Response**:
```json
{
  "steps": [
    "Analyze function signature and inputs",
    "Identify nested loops and complexity",
    "Check for unnecessary memory allocations"
  ],
  "result": "Function has O(n²) complexity due to nested loops. Recommend...",
  "meta": {
    "provider": "deepseek",
    "model": "deepseek-chat",
    "cost_usd": 0.000051
  }
}
```

### Example 2: Qwen Mood Analysis
```bash
export LLM_PROVIDER=qwen
export OPENAI_API_KEY=sk-qwen-...

curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "mood_analyst",
    "task": "What patterns do you see in the last 7 days?",
    "context": {
      "moods": [
        {"mood": "happy", "timestamp": "..."},
        {"mood": "anxious", "timestamp": "..."}
      ]
    }
  }'
```

### Example 3: OpenAI Architecture Planning
```bash
export LLM_PROVIDER=openai  # or omit (default)

curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "code_architect",
    "task": "Design a caching layer for the mood API",
    "constraints": {
      "max_steps": 7,
      "max_tokens": 2000
    }
  }'
```

### Example 4: Kimi Long-Context Research
```bash
export LLM_PROVIDER=kimi
export KIMI_MODEL=moonshot-v1-128k  # 128k context

curl -X POST http://localhost:4000/agent/run \
  -d '{
    "mode": "search",
    "task": "Summarize all mood entries from the past month",
    "context": {
      "entries": [ ...large dataset... ]
    }
  }'
```

---

## Provider Selection Guide

| Provider | Best For | Cost | Speed |
|----------|----------|------|-------|
| **OpenAI** | Production, reliability | $$$ | Fast |
| **DeepSeek** | Cost-effective reasoning | $ | Medium |
| **Qwen** | Chinese lang, agent tasks | $$ | Fast |
| **Kimi** | Long context (128k) | $$ | Medium |

**Recommendations**:
- **Dev**: Use stub mode (no API key) or DeepSeek (cheapest)
- **Production**: OpenAI gpt-4o-mini (reliable + fast)
- **Analysis**: DeepSeek-chat (good reasoning, low cost)
- **Long docs**: Kimi moonshot-v1-128k

---

## Migration Notes

### From Previous Version

**No breaking changes** - old requests still work:
```bash
# Old format (still works)
curl -X POST http://localhost:4000/agent/run \
  -d '{"task": "Do something"}'

# Uses mode: "auto", provider: from LLM_PROVIDER env
```

**New features are opt-in**:
- Set `mode` to use specialized agents
- Set `LLM_PROVIDER` env to switch providers
- Check `meta.cost_usd` for cost tracking

### Environment Variables

**Required**:
- `OPENAI_API_KEY` (or run in stub mode)

**Optional**:
- `LLM_PROVIDER` (default: `openai`)
- `AGENT_TIMEOUT` (default: `30000` ms)
- `{PROVIDER}_BASE_URL` (override base URL)
- `{PROVIDER}_MODEL` (override default model)

---

## Future Enhancements

1. **Tool Execution**: Implement actual tool calling (placeholder exists)
2. **Streaming**: Support SSE for real-time responses
3. **Caching**: Implement prompt caching (DeepSeek, Anthropic)
4. **Multi-turn**: Support conversation history
5. **Fine-tuning**: Custom modes per user/team
6. **Rate Limiting**: Per-user quotas and cost tracking

---

## Performance Metrics

**Target SLAs**:
- Latency: <2s for gpt-4o-mini, <5s for reasoning models
- Cost: <$0.001 per request (avg)
- Success rate: >99%
- Calls per request: 1-2 max

**Monitoring**:
```bash
# Check health
curl http://localhost:4000/agent/health

# List modes
curl http://localhost:4000/agent/modes

# Check providers
curl http://localhost:4000/agent/providers
```

---

## Troubleshooting

### High Costs
- Use DeepSeek instead of OpenAI
- Reduce `constraints.max_tokens`
- Filter context to <3000 chars
- Use stub mode for dev

### Slow Responses
- Use faster models (gpt-4o-mini, qwen-turbo)
- Reduce max_tokens
- Increase AGENT_TIMEOUT
- Check provider status

### Poor Quality
- Try higher-end models (gpt-4o, qwen-max)
- Increase temperature for creative tasks
- Use mode-specific presets
- Provide more context

---

## References

- **DeepSeek V3**: [arxiv.org/abs/2412.19437](https://arxiv.org/abs/2412.19437)
- **Qwen-Agent**: [github.com/QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent)
- **Kimi K2**: moonshot.cn documentation
- **Original template**: `AGENT_INFERENCE_TEMPLATE.md`
