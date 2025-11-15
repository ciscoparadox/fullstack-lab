#!/bin/bash
# Quick test script for unified agent framework

BASE_URL="${BASE_URL:-http://localhost:4000}"

echo "🧪 Testing Unified Agent Framework"
echo "=================================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
curl -s "${BASE_URL}/agent/health" | jq '.'
echo ""
echo ""

# Test 2: Dev ritual mode (fast)
echo "2️⃣  Testing dev_ritual mode..."
curl -s -X POST "${BASE_URL}/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "dev_ritual",
    "message": "List 3 best practices for Node.js error handling"
  }' | jq '.data.result, .data.meta'
echo ""
echo ""

# Test 3: Code architect mode (with reasoning)
echo "3️⃣  Testing code_architect mode..."
curl -s -X POST "${BASE_URL}/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "code_architect",
    "message": "Design a simple rate limiter for an API"
  }' | jq '.data.steps[] | select(.type == "reasoning") | .content, .data.result, .data.meta'
echo ""
echo ""

# Test 4: With tool calling
echo "4️⃣  Testing tool calling (code_summary)..."
curl -s -X POST "${BASE_URL}/agent/run" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "dev_ritual",
    "message": "Analyze this code: function add(a,b) { return a+b; }"
  }' | jq '.data.steps, .data.meta.toolExecutions'
echo ""
echo ""

echo "✅ Tests complete!"
