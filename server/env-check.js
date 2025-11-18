// server/env-check.js
require("dotenv").config();

console.log("KIMI_API_KEY present?", !!process.env.KIMI_API_KEY);
console.log(
  "KIMI_API_KEY value (first 10 chars):",
  process.env.KIMI_API_KEY ? process.env.KIMI_API_KEY.slice(0, 10) : null
);

console.log("DEEPSEEK_API_KEY present?", !!process.env.DEEPSEEK_API_KEY);
console.log(
  "DEEPSEEK_API_KEY value (first 10 chars):",
  process.env.DEEPSEEK_API_KEY
    ? process.env.DEEPSEEK_API_KEY.slice(0, 10)
    : null
);

