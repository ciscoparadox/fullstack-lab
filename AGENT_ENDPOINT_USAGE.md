# Agent Endpoint Usage Guide

## Quick Start

### 1. Configure Environment

Add to `.env`:
```bash
# Required for production (optional for dev - uses stub responses)
OPENAI_API_KEY=sk-...

# Optional overrides
OPENAI_BASE_URL=https://api.openai.com/v1  # default
AGENT_MODEL=gpt-4o-mini                     # default
AGENT_TIMEOUT=30000                         # 30s default
```

### 2. Start Server

```bash
cd server
npm install
node index.js
```

### 3. Test Endpoints

**Health check:**
```bash
curl http://localhost:4000/agent/health
```

**Run agent:**
```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Analyze the top 3 mood clusters and suggest insights"
  }'
```

---

## API Reference

### `POST /agent/run`

Execute an agent task with optional context and constraints.

**Request Body:**
```json
{
  "mode": "analyze",           // optional: auto|analyze|plan|execute|search
  "task": "your task here",    // required
  "context": {                 // optional
    "moods": [...],
    "clusters": [...]
  },
  "constraints": {             // optional
    "max_steps": 5,            // default: 5
    "max_tokens": 1000,        // default: 1000
    "temperature": 0.7         // default: 0.7
  }
}
```

**Response:**
```json
{
  "steps": [
    "Load cluster metadata",
    "Identify top 3 clusters",
    "Generate insights"
  ],
  "result": "Top clusters are: Happy (45%), Anxious (30%), Neutral (25%). Insights: ...",
  "meta": {
    "model": "gpt-4o-mini",
    "tokens": {
      "input": 120,
      "output": 180,
      "total": 300
    },
    "cost_usd": 0.000126
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input (missing task, bad params)
- `502 Bad Gateway` - LLM API error
- `504 Gateway Timeout` - LLM request timed out
- `500 Internal Server Error` - Unexpected error

---

### `GET /agent/health`

Check agent service status.

**Response:**
```json
{
  "status": "ok",              // ok|degraded|error
  "llm_configured": true,
  "model": "gpt-4o-mini",
  "timestamp": "2025-11-15T12:34:56.789Z",
  "note": "LLM configured and ready"
}
```

---

## Usage Examples

### Example 1: Simple Task

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "task": "List 3 ideas for improving user engagement"
  }'
```

### Example 2: Analysis with Context

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "analyze",
    "task": "Summarize the mood trends from the provided data",
    "context": {
      "moods": [
        {"mood": "happy", "timestamp": "2025-11-15T10:00:00Z"},
        {"mood": "anxious", "timestamp": "2025-11-15T11:00:00Z"}
      ]
    },
    "constraints": {
      "max_steps": 3,
      "max_tokens": 500
    }
  }'
```

### Example 3: Planning Mode

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "plan",
    "task": "Design a feature to export mood data as CSV",
    "constraints": {
      "max_steps": 7
    }
  }'
```

### Example 4: Search/Research Mode

```bash
curl -X POST http://localhost:4000/agent/run \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "search",
    "task": "Find patterns in user mood submissions over the last week",
    "context": {
      "date_range": "2025-11-08 to 2025-11-15",
      "total_entries": 42
    }
  }'
```

---

## Development Notes

### Stub Mode (No API Key)

If `OPENAI_API_KEY` is not set, the agent will return **stub responses** for testing:

```json
{
  "steps": ["Parse task requirements", "Analyze available context", "Generate response"],
  "result": "[STUB] This is a simulated response for task: '...'",
  "meta": {
    "model": "stub-model",
    "tokens": { "input": 50, "output": 75, "total": 125 },
    "cost_usd": 0
  }
}
```

This allows you to develop and test the endpoint without incurring LLM costs.

### Cost Management

**Target**: <$0.001 per request (1-2 model calls, <500 total tokens)

**Tips**:
1. Keep `task` concise
2. Minimize `context` size (<2000 chars recommended)
3. Use `constraints.max_tokens` to cap output
4. Use `mode: "analyze"` for cheaper structured outputs
5. Monitor `meta.cost_usd` in responses

### Integration with Frontend

```javascript
// React example
async function runAgentTask(task, context = {}) {
  const response = await fetch('http://localhost:4000/agent/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, context })
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// Usage
const result = await runAgentTask(
  'Analyze mood trends',
  { moods: moodData }
);
console.log(result.result);
console.log('Cost:', result.meta.cost_usd);
```

---

## Architecture

This endpoint follows the **6-stage inference design pattern**:

1. **initialize_model** - LLM client config (server startup)
2. **normalize_request** - Validate/sanitize input
3. **build_model_inputs** - Construct minimal prompts
4. **run_model** - Single LLM API call
5. **decode_outputs** - Parse response
6. **postprocess_and_structure_response** - Format final output

See `AGENT_INFERENCE_TEMPLATE.md` for detailed architecture docs.

---

## Troubleshooting

**Error: "LLM client not initialized"**
- Ensure `initializeLLMClient()` is called in `server/index.js`

**Error: "LLM API error (401)"**
- Check `OPENAI_API_KEY` is correct

**Error: "LLM API timeout"**
- Increase `AGENT_TIMEOUT` in `.env`
- Reduce `constraints.max_tokens`

**Slow responses**
- Use smaller model (`gpt-4o-mini` vs `gpt-4`)
- Reduce `context` size
- Lower `constraints.max_tokens`

**High costs**
- Monitor `meta.cost_usd` in responses
- Use stub mode for development
- Keep prompts minimal
