# Agent Inference Template: 6-Stage Design

## Overview
This document maps the 6-stage inference design pattern from DeepSeek-V3 to our Node/Express agent endpoint.

The goal: **cost-aware, single-pass LLM inference** for agent tasks.

---

## Stage Mapping: DeepSeek → Node/Express Agent

### 1. **initialize_model**
**DeepSeek**: Load model weights, configure device, set model to eval mode.
**Agent Endpoint**: Initialize LLM client configuration at server startup.

**Implementation**:
- Load OpenAI API key from environment (`OPENAI_API_KEY`)
- Configure client settings (base URL, timeout, default model)
- Store in module-level singleton (`llmClient`)
- Happens once when `server/index.js` starts

**Cost Impact**: Zero. One-time setup.

---

### 2. **normalize_request**
**DeepSeek**: Parse and validate raw HTTP request body, extract generation params.
**Agent Endpoint**: Validate and normalize `{ mode, task, context, constraints }`.

**Implementation**:
- Validate required fields (`task` is mandatory)
- Set defaults for optional fields (`mode` defaults to `"auto"`)
- Sanitize inputs (trim strings, validate types)
- Return normalized object or throw validation error

**Cost Impact**: Zero. Pure validation logic.

---

### 3. **build_model_inputs**
**DeepSeek**: Convert text into token IDs, attention masks, position IDs.
**Agent Endpoint**: Construct a focused system + user prompt from normalized input.

**Implementation**:
- Build system message defining agent behavior based on `mode`
- Construct user message from `task` + `context`
- Apply `constraints` to limit scope (e.g., max steps, tools allowed)
- **Critical**: Keep prompts minimal to reduce token costs
- Return ChatML-style messages array

**Cost Impact**: Low. Smart prompt engineering = fewer tokens = lower cost.

---

### 4. **run_model**
**DeepSeek**: Forward pass through transformer, get logits.
**Agent Endpoint**: Call OpenAI-compatible chat completion API.

**Implementation**:
- POST to `/v1/chat/completions` (or compatible endpoint)
- Pass messages array + generation params (temperature, max_tokens)
- **Critical**: Make exactly 1 call (or at most 2 if tool use requires iteration)
- Handle errors (timeout, rate limit, invalid response)
- Return raw API response

**Cost Impact**: **HIGH**. This is the expensive part. Minimize calls.

---

### 5. **decode_outputs**
**DeepSeek**: Decode token IDs back into text, handle special tokens.
**Agent Endpoint**: Extract content from API response JSON.

**Implementation**:
- Parse `response.choices[0].message.content`
- Handle structured output if model returned JSON
- Extract tool calls if present
- Return decoded text/structured data

**Cost Impact**: Zero. Simple parsing.

---

### 6. **postprocess_and_structure_response**
**DeepSeek**: Apply stop strings, strip special tokens, format output.
**Agent Endpoint**: Format decoded output into `{ steps, result, meta }`.

**Implementation**:
- Parse agent reasoning into discrete `steps` array
- Extract final `result` (answer, action, or error)
- Add `meta` (model used, token count, cost estimate)
- Apply output constraints (max length, sanitization)
- Return final structured response

**Cost Impact**: Zero. Pure formatting logic.

---

## File Layout

```
server/
├── index.js              # Main Express app (wires in routes)
├── services/
│   └── agentService.js   # Core agent logic (6-stage pipeline)
└── routes/
    └── agentRoutes.js    # Express route: POST /agent/run
```

---

## Cost-Awareness Strategy

1. **Single-pass inference**: Design prompts so agent completes task in 1 model call
2. **Minimal context**: Only include relevant data in `context` field
3. **Short constraints**: Use `constraints.max_steps` to limit agent verbosity
4. **Smart caching**: (Future) Cache common system prompts, reuse across requests
5. **Streaming**: (Future) Stream responses to reduce perceived latency

**Target**: 90% of requests use **1 model call**, <500 tokens total.

---

## Usage Example

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "analyze",
    "task": "Summarize the top 3 mood clusters",
    "context": { "clusters": [...] },
    "constraints": { "max_steps": 3 }
  }'
```

**Response**:
```json
{
  "steps": [
    "Load cluster metadata",
    "Identify top 3 by size",
    "Generate summaries"
  ],
  "result": "Top clusters: Happy (45%), Anxious (30%), Neutral (25%)",
  "meta": {
    "model": "gpt-4o-mini",
    "tokens": 287,
    "cost_usd": 0.00043
  }
}
```
